defmodule HongtionApi.Documents do
  alias Ecto.Adapters.SQL

  import Ecto.Query

  alias HongtionApi.Documents.Block
  alias HongtionApi.Documents.Comment
  alias HongtionApi.Documents.FileAsset
  alias HongtionApi.Documents.Notification
  alias HongtionApi.Documents.Page
  alias HongtionApi.Documents.PageVersion
  alias HongtionApi.Documents.Workspace
  alias HongtionApi.Documents.WorkspaceInvitation
  alias HongtionApi.Documents.WorkspaceMember
  alias HongtionApi.Repo

  @editor_roles [:editor, :owner]
  @manageable_roles [:viewer, :editor]

  def list_workspaces(user_id) do
    Workspace
    |> join(:inner, [w], wm in WorkspaceMember, on: wm.workspace_id == w.id)
    |> where([_w, wm], wm.user_id == ^user_id)
    |> order_by([w], desc: w.updated_at)
    |> Repo.all()
  end

  def get_workspace(user_id, id) do
    Workspace
    |> join(:inner, [w], wm in WorkspaceMember, on: wm.workspace_id == w.id)
    |> where([w, wm], w.id == ^id and wm.user_id == ^user_id)
    |> Repo.one()
  end

  def create_workspace(attrs, owner_id) do
    %Workspace{}
    |> Workspace.changeset(attrs)
    |> Ecto.Changeset.put_change(:owner_id, owner_id)
    |> Repo.insert()
  end

  def list_workspace_members(workspace_id, user_id) do
    if workspace_member?(workspace_id, user_id) do
      %{rows: rows} =
        SQL.query!(
          Repo,
          """
          select
            wm.workspace_id::text,
            wm.user_id::text,
            wm.role::text,
            wm.joined_at,
            au.email,
            p.display_name,
            p.avatar_url
          from public.workspace_members wm
          left join auth.users au on au.id = wm.user_id
          left join public.profiles p on p.id = wm.user_id
          where wm.workspace_id = $1
          order by
            case wm.role when 'owner' then 1 when 'editor' then 2 else 3 end,
            coalesce(p.display_name, au.email, wm.user_id::text)
          """,
          [Ecto.UUID.dump!(workspace_id)]
        )

      Enum.map(rows, fn [workspace_id, user_id, role, joined_at, email, display_name, avatar_url] ->
        %{
          workspace_id: workspace_id,
          user_id: user_id,
          role: role,
          joined_at: joined_at,
          email: email,
          display_name: display_name,
          avatar_url: avatar_url
        }
      end)
    else
      []
    end
  end

  def list_workspace_invitations(workspace_id, user_id) do
    with :ok <- ensure_workspace_editor(workspace_id, user_id) do
      WorkspaceInvitation
      |> where([i], i.workspace_id == ^workspace_id)
      |> order_by([i], desc: i.created_at)
      |> Repo.all()
    else
      _ -> []
    end
  end

  def invite_workspace_member(workspace_id, attrs, inviter_id) do
    role = normalize_role(Map.get(attrs, "role") || Map.get(attrs, :role) || :viewer)

    email =
      attrs
      |> Map.get("email", Map.get(attrs, :email, ""))
      |> String.trim()
      |> String.downcase()

    with :ok <- ensure_workspace_editor(workspace_id, inviter_id),
         {:ok, role} <- ensure_manageable_role(role),
         {:ok, invitation} <-
           %WorkspaceInvitation{}
           |> WorkspaceInvitation.changeset(%{
             "workspace_id" => workspace_id,
             "email" => email,
             "role" => role,
             "invited_by" => inviter_id,
             "expires_at" => DateTime.add(DateTime.utc_now(:second), 14, :day)
           })
           |> Repo.insert(),
         {:ok, invitation} <- maybe_attach_existing_user(invitation, inviter_id) do
      {:ok, invitation}
    else
      {:error, :forbidden} = error -> error
      {:error, :invalid_role} = error -> error
      {:error, %Ecto.Changeset{}} = error -> error
      error -> error
    end
  end

  def accept_workspace_invitation(invite_token, user_id) do
    invitation =
      WorkspaceInvitation
      |> where(
        [i],
        i.invite_token == ^invite_token and i.status == :pending and
          (is_nil(i.expires_at) or i.expires_at > ^DateTime.utc_now(:second))
      )
      |> Repo.one()

    with %WorkspaceInvitation{} = invitation <- invitation,
         {:ok, email} <- auth_user_email(user_id),
         true <- String.downcase(email) == String.downcase(invitation.email),
         :ok <- add_workspace_member(invitation.workspace_id, user_id, invitation.role),
         {:ok, invitation} <-
           invitation
           |> WorkspaceInvitation.accept_changeset(user_id)
           |> Repo.update() do
      {:ok, invitation}
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      error -> error
    end
  end

  def update_workspace_member_role(workspace_id, member_user_id, role, actor_id) do
    role = normalize_role(role)

    with :ok <- ensure_workspace_owner(workspace_id, actor_id),
         {:ok, role} <- ensure_manageable_role(role),
         %WorkspaceMember{} = member <-
           Repo.get_by(WorkspaceMember, workspace_id: workspace_id, user_id: member_user_id),
         true <- member.role != :owner do
      member
      |> Ecto.Changeset.change(role: role)
      |> Repo.update()
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, :forbidden} = error -> error
      {:error, :invalid_role} = error -> error
      error -> error
    end
  end

  def remove_workspace_member(workspace_id, member_user_id, actor_id) do
    with :ok <- ensure_workspace_owner(workspace_id, actor_id),
         %WorkspaceMember{} = member <-
           Repo.get_by(WorkspaceMember, workspace_id: workspace_id, user_id: member_user_id),
         true <- member.role != :owner do
      Repo.delete(member)
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      error -> error
    end
  end

  def list_pages(workspace_id, user_id) do
    if workspace_member?(workspace_id, user_id) do
      Page
      |> where([p], p.workspace_id == ^workspace_id and p.is_deleted == false)
      |> order_by([p], asc: p.parent_id, asc: p.position, asc: p.created_at)
      |> Repo.all()
    else
      []
    end
  end

  def list_deleted_pages(workspace_id, user_id) do
    if workspace_member?(workspace_id, user_id) do
      Page
      |> where([p], p.workspace_id == ^workspace_id and p.is_deleted == true)
      |> order_by([p], desc: p.deleted_at, desc: p.updated_at)
      |> Repo.all()
    else
      []
    end
  end

  def search_workspace(workspace_id, query, user_id) when is_binary(query) do
    trimmed_query =
      query
      |> String.trim()
      |> String.slice(0, 120)

    cond do
      trimmed_query == "" ->
        []

      not workspace_member?(workspace_id, user_id) ->
        []

      true ->
        %{rows: rows} =
          SQL.query!(
            Repo,
            """
            with search_query as (
              select websearch_to_tsquery('simple', $2) as value
            ),
            page_results as (
              select
                'page'::text as kind,
                p.id::text as page_id,
                null::text as block_id,
                p.title,
                p.title as excerpt,
                ts_rank(p.search_vector, search_query.value) as rank,
                p.updated_at
              from public.pages p, search_query
              where p.workspace_id = $1
                and p.is_deleted = false
                and p.search_vector @@ search_query.value
            ),
            block_results as (
              select
                'block'::text as kind,
                p.id::text as page_id,
                b.id::text as block_id,
                p.title,
                left(public.block_plain_text(b.content), 240) as excerpt,
                ts_rank(b.search_vector, search_query.value) as rank,
                b.updated_at
              from public.blocks b
              join public.pages p on p.id = b.page_id,
              search_query
              where p.workspace_id = $1
                and p.is_deleted = false
                and b.search_vector @@ search_query.value
            )
            select kind, page_id, block_id, title, excerpt, rank, updated_at
            from (
              select * from page_results
              union all
              select * from block_results
            ) results
            order by rank desc, updated_at desc
            limit 30
            """,
            [Ecto.UUID.dump!(workspace_id), trimmed_query]
          )

        Enum.map(rows, fn [kind, page_id, block_id, title, excerpt, rank, updated_at] ->
          %{
            kind: kind,
            page_id: page_id,
            block_id: block_id,
            title: title,
            excerpt: excerpt,
            rank: rank,
            updated_at: updated_at
          }
        end)
    end
  end

  def search_workspace(_workspace_id, _query, _user_id), do: []

  def get_page(id, user_id) do
    Page
    |> join(:inner, [p], wm in WorkspaceMember, on: wm.workspace_id == p.workspace_id)
    |> where([p, wm], p.id == ^id and p.is_deleted == false and wm.user_id == ^user_id)
    |> preload([p], blocks: ^blocks_query())
    |> Repo.one()
  end

  def create_page(attrs, user_id) do
    workspace_id = Map.get(attrs, "workspace_id") || Map.get(attrs, :workspace_id)

    with :ok <- ensure_workspace_editor(workspace_id, user_id) do
      %Page{}
      |> Page.changeset(attrs)
      |> Ecto.Changeset.put_change(:created_by, user_id)
      |> Ecto.Changeset.put_change(:updated_by, user_id)
      |> Repo.insert()
      |> with_page_version(user_id, "page_create")
    end
  end

  def update_page(id, attrs, user_id) do
    with %Page{} = page <- get_page(id, user_id),
         :ok <- ensure_workspace_editor(page.workspace_id, user_id) do
      page
      |> Page.changeset(attrs)
      |> Ecto.Changeset.put_change(:updated_by, user_id)
      |> Repo.update()
      |> with_page_version(user_id, "page_update")
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def delete_page(id, user_id) do
    with %Page{} = page <- get_page(id, user_id),
         :ok <- ensure_workspace_editor(page.workspace_id, user_id),
         {:ok, _version} <- record_page_version(page.id, user_id, "page_delete") do
      page
      |> Page.soft_delete_changeset(user_id)
      |> Repo.update()
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def restore_page(id, user_id) do
    with %Page{} = page <- get_deleted_page(id, user_id),
         :ok <- ensure_workspace_editor(page.workspace_id, user_id) do
      page
      |> Page.restore_changeset(user_id)
      |> Repo.update()
      |> with_page_version(user_id, "page_restore")
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def list_page_versions(page_id, user_id) do
    case get_page(page_id, user_id) do
      %Page{} ->
        PageVersion
        |> where([v], v.page_id == ^page_id)
        |> order_by([v], desc: v.created_at)
        |> limit(50)
        |> Repo.all()

      nil ->
        []
    end
  end

  def restore_page_version(page_id, version_id, user_id) do
    with %Page{} = page <- get_page(page_id, user_id),
         :ok <- ensure_workspace_editor(page.workspace_id, user_id),
         %PageVersion{} = version <- get_page_version(page_id, version_id, user_id) do
      restore_snapshot(page, version.snapshot, user_id)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def list_blocks(page_id, user_id) do
    case get_page(page_id, user_id) do
      %Page{} ->
        blocks_query()
        |> where([b], b.page_id == ^page_id)
        |> Repo.all()

      nil ->
        []
    end
  end

  def create_block(attrs, user_id) do
    page_id = Map.get(attrs, "page_id") || Map.get(attrs, :page_id)

    with %Page{} = page <- get_page(page_id, user_id),
         :ok <- ensure_workspace_editor(page.workspace_id, user_id) do
      %Block{}
      |> Block.changeset(attrs)
      |> Ecto.Changeset.put_change(:created_by, user_id)
      |> Ecto.Changeset.put_change(:updated_by, user_id)
      |> Repo.insert()
      |> with_page_version(page.id, user_id, "block_create")
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def update_block(id, attrs, user_id) do
    with %Block{} = block <- get_block(id, user_id),
         %Page{} = page <- get_page(block.page_id, user_id),
         :ok <- ensure_workspace_editor(page.workspace_id, user_id) do
      block
      |> Block.changeset(attrs)
      |> Ecto.Changeset.put_change(:updated_by, user_id)
      |> Repo.update()
      |> with_page_version(page.id, user_id, "block_update")
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def delete_block(id, user_id) do
    with %Block{} = block <- get_block(id, user_id),
         %Page{} = page <- get_page(block.page_id, user_id),
         :ok <- ensure_workspace_editor(page.workspace_id, user_id) do
      block
      |> Repo.delete()
      |> with_page_version(page.id, user_id, "block_delete")
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def list_comments(page_id, user_id) do
    case get_page(page_id, user_id) do
      %Page{} ->
        Comment
        |> where([c], c.page_id == ^page_id)
        |> order_by([c], asc: c.created_at)
        |> Repo.all()

      nil ->
        []
    end
  end

  def create_comment(attrs, user_id) do
    page_id = Map.get(attrs, "page_id") || Map.get(attrs, :page_id)

    with %Page{} = page <- get_page(page_id, user_id),
         :ok <- ensure_workspace_member(page.workspace_id, user_id),
         {:ok, comment} <-
           %Comment{}
           |> Comment.changeset(attrs)
           |> Ecto.Changeset.put_change(:user_id, user_id)
           |> Repo.insert() do
      create_comment_notifications(comment, page, user_id)
      {:ok, comment}
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def resolve_comment(id, user_id) do
    with %Comment{} = comment <- get_comment(id, user_id),
         %Page{} = page <- get_page(comment.page_id, user_id),
         :ok <- ensure_workspace_editor(page.workspace_id, user_id) do
      comment
      |> Comment.resolve_changeset(user_id)
      |> Repo.update()
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def list_notifications(user_id) do
    Notification
    |> where([n], n.recipient_id == ^user_id)
    |> order_by([n], desc: n.created_at)
    |> limit(50)
    |> Repo.all()
  end

  def mark_notifications_read(user_id) do
    now = DateTime.utc_now(:second)

    {count, _} =
      Notification
      |> where([n], n.recipient_id == ^user_id and is_nil(n.read_at))
      |> Repo.update_all(set: [read_at: now])

    {:ok, count}
  end

  def mark_notification_read(id, user_id) do
    Notification
    |> where([n], n.id == ^id and n.recipient_id == ^user_id)
    |> Repo.one()
    |> case do
      nil -> {:error, :not_found}
      notification -> notification |> Notification.read_changeset() |> Repo.update()
    end
  end

  def list_file_assets(workspace_id, user_id) do
    if workspace_member?(workspace_id, user_id) do
      FileAsset
      |> where([f], f.workspace_id == ^workspace_id and f.status != :deleted)
      |> order_by([f], desc: f.created_at)
      |> Repo.all()
    else
      []
    end
  end

  def create_file_asset(attrs, user_id) do
    workspace_id = Map.get(attrs, "workspace_id") || Map.get(attrs, :workspace_id)

    with :ok <- ensure_workspace_editor(workspace_id, user_id) do
      %FileAsset{}
      |> FileAsset.changeset(attrs)
      |> Ecto.Changeset.put_change(:uploaded_by, user_id)
      |> Repo.insert()
    end
  end

  defp get_deleted_page(id, user_id) do
    Page
    |> join(:inner, [p], wm in WorkspaceMember, on: wm.workspace_id == p.workspace_id)
    |> where([p, wm], p.id == ^id and p.is_deleted == true and wm.user_id == ^user_id)
    |> preload([p], blocks: ^blocks_query())
    |> Repo.one()
  end

  defp get_page_version(page_id, version_id, user_id) do
    PageVersion
    |> join(:inner, [v], p in Page, on: p.id == v.page_id)
    |> join(:inner, [_v, p], wm in WorkspaceMember, on: wm.workspace_id == p.workspace_id)
    |> where(
      [v, p, wm],
      v.id == ^version_id and v.page_id == ^page_id and p.is_deleted == false and
        wm.user_id == ^user_id
    )
    |> Repo.one()
  end

  defp with_page_version({:ok, %Page{} = page}, user_id, reason) do
    with {:ok, _version} <- record_page_version(page.id, user_id, reason) do
      {:ok, page}
    end
  end

  defp with_page_version(error, _user_id, _reason), do: error

  defp with_page_version({:ok, result}, page_id, user_id, reason) do
    with {:ok, _version} <- record_page_version(page_id, user_id, reason) do
      {:ok, result}
    end
  end

  defp with_page_version(error, _page_id, _user_id, _reason), do: error

  defp record_page_version(page_id, user_id, reason) do
    case page_snapshot(page_id, reason) do
      nil ->
        {:error, :not_found}

      snapshot ->
        %PageVersion{}
        |> PageVersion.changeset(%{
          "created_by" => user_id,
          "page_id" => page_id,
          "snapshot" => snapshot
        })
        |> Repo.insert()
    end
  end

  defp page_snapshot(page_id, reason) do
    Page
    |> where([p], p.id == ^page_id)
    |> preload([p], blocks: ^blocks_query())
    |> Repo.one()
    |> case do
      nil ->
        nil

      %Page{} = page ->
        %{
          "reason" => reason,
          "page" => %{
            "cover_url" => page.cover_url,
            "created_by" => page.created_by,
            "icon" => page.icon,
            "id" => page.id,
            "is_deleted" => page.is_deleted,
            "parent_id" => page.parent_id,
            "position" => page.position,
            "share_scope" => enum_to_string(page.share_scope),
            "title" => page.title,
            "updated_by" => page.updated_by,
            "workspace_id" => page.workspace_id
          },
          "blocks" =>
            Enum.map(page.blocks, fn block ->
              %{
                "content" => block.content,
                "created_by" => block.created_by,
                "id" => block.id,
                "page_id" => block.page_id,
                "parent_block_id" => block.parent_block_id,
                "position" => block.position,
                "type" => enum_to_string(block.type),
                "updated_by" => block.updated_by
              }
            end)
        }
    end
  end

  defp restore_snapshot(%Page{} = page, snapshot, user_id) when is_map(snapshot) do
    Repo.transaction(fn ->
      with {:ok, restored_page} <- restore_page_fields(page, snapshot, user_id),
           :ok <- restore_snapshot_blocks(restored_page.id, snapshot, user_id),
           {:ok, _version} <- record_page_version(restored_page.id, user_id, "version_restore"),
           %Page{} = hydrated_page <- get_page(restored_page.id, user_id) do
        hydrated_page
      else
        nil -> Repo.rollback(:not_found)
        {:error, error} -> Repo.rollback(error)
        error -> Repo.rollback(error)
      end
    end)
    |> case do
      {:ok, page} -> {:ok, page}
      {:error, error} -> {:error, error}
    end
  end

  defp restore_snapshot(_page, _snapshot, _user_id), do: {:error, :not_found}

  defp restore_page_fields(page, snapshot, user_id) do
    page_attrs =
      snapshot
      |> Map.get("page", %{})
      |> Map.take(["cover_url", "icon", "parent_id", "position", "share_scope", "title"])

    page
    |> Page.changeset(page_attrs)
    |> Ecto.Changeset.put_change(:updated_by, user_id)
    |> Repo.update()
  end

  defp restore_snapshot_blocks(page_id, snapshot, user_id) do
    snapshot_blocks = Map.get(snapshot, "blocks", [])
    snapshot_block_ids = snapshot_blocks |> Enum.map(&Map.get(&1, "id")) |> Enum.reject(&is_nil/1)
    snapshot_block_id_set = MapSet.new(snapshot_block_ids)

    existing_blocks =
      Block
      |> where([b], b.page_id == ^page_id)
      |> Repo.all()
      |> Map.new(fn block -> {block.id, block} end)

    with :ok <-
           upsert_snapshot_blocks(
             page_id,
             snapshot_blocks,
             snapshot_block_id_set,
             existing_blocks,
             user_id
           ) do
      delete_stale_blocks(page_id, snapshot_block_ids)
      :ok
    end
  end

  defp upsert_snapshot_blocks(
         page_id,
         snapshot_blocks,
         snapshot_block_id_set,
         existing_blocks,
         user_id
       ) do
    Enum.reduce_while(snapshot_blocks, :ok, fn snapshot_block, :ok ->
      block_id = Map.get(snapshot_block, "id")
      parent_block_id = Map.get(snapshot_block, "parent_block_id")

      attrs = %{
        "content" => Map.get(snapshot_block, "content", %{}),
        "page_id" => page_id,
        "parent_block_id" =>
          if(parent_block_id in snapshot_block_id_set, do: parent_block_id, else: nil),
        "position" => Map.get(snapshot_block, "position"),
        "type" => Map.get(snapshot_block, "type", "paragraph")
      }

      result =
        case Map.get(existing_blocks, block_id) do
          %Block{} = existing_block ->
            existing_block
            |> Block.changeset(attrs)
            |> Ecto.Changeset.put_change(:updated_by, user_id)
            |> Repo.update()

          nil ->
            %Block{id: block_id}
            |> Block.changeset(attrs)
            |> Ecto.Changeset.put_change(
              :created_by,
              Map.get(snapshot_block, "created_by") || user_id
            )
            |> Ecto.Changeset.put_change(:updated_by, user_id)
            |> Repo.insert()
        end

      case result do
        {:ok, _block} -> {:cont, :ok}
        {:error, error} -> {:halt, {:error, error}}
      end
    end)
  end

  defp delete_stale_blocks(page_id, []),
    do: from(b in Block, where: b.page_id == ^page_id) |> Repo.delete_all()

  defp delete_stale_blocks(page_id, snapshot_block_ids) do
    Block
    |> where([b], b.page_id == ^page_id and b.id not in ^snapshot_block_ids)
    |> Repo.delete_all()
  end

  defp get_block(id, user_id) do
    Block
    |> join(:inner, [b], p in Page, on: p.id == b.page_id)
    |> join(:inner, [_b, p], wm in WorkspaceMember, on: wm.workspace_id == p.workspace_id)
    |> where([b, p, wm], b.id == ^id and p.is_deleted == false and wm.user_id == ^user_id)
    |> Repo.one()
  end

  defp get_comment(id, user_id) do
    Comment
    |> join(:inner, [c], p in Page, on: p.id == c.page_id)
    |> join(:inner, [_c, p], wm in WorkspaceMember, on: wm.workspace_id == p.workspace_id)
    |> where([c, p, wm], c.id == ^id and p.is_deleted == false and wm.user_id == ^user_id)
    |> Repo.one()
  end

  defp workspace_member?(workspace_id, user_id) do
    Repo.exists?(
      from wm in WorkspaceMember,
        where: wm.workspace_id == ^workspace_id and wm.user_id == ^user_id
    )
  end

  defp ensure_workspace_member(nil, _user_id), do: {:error, :not_found}

  defp ensure_workspace_member(workspace_id, user_id) do
    if workspace_member?(workspace_id, user_id), do: :ok, else: {:error, :forbidden}
  end

  defp ensure_workspace_editor(nil, _user_id), do: {:error, :not_found}

  defp ensure_workspace_editor(workspace_id, user_id) do
    query =
      from wm in WorkspaceMember,
        where:
          wm.workspace_id == ^workspace_id and wm.user_id == ^user_id and
            wm.role in ^@editor_roles

    if Repo.exists?(query), do: :ok, else: {:error, :forbidden}
  end

  defp ensure_workspace_owner(workspace_id, user_id) do
    query =
      from wm in WorkspaceMember,
        where: wm.workspace_id == ^workspace_id and wm.user_id == ^user_id and wm.role == :owner

    if Repo.exists?(query), do: :ok, else: {:error, :forbidden}
  end

  defp add_workspace_member(workspace_id, user_id, role) do
    %WorkspaceMember{
      workspace_id: workspace_id,
      user_id: user_id,
      role: role,
      joined_at: DateTime.utc_now(:second)
    }
    |> Repo.insert(
      on_conflict: [set: [role: role, joined_at: DateTime.utc_now(:second)]],
      conflict_target: [:workspace_id, :user_id]
    )
    |> case do
      {:ok, _member} -> :ok
      error -> error
    end
  end

  defp maybe_attach_existing_user(%WorkspaceInvitation{} = invitation, actor_id) do
    case auth_user_id_by_email(invitation.email) do
      {:ok, user_id} ->
        with :ok <- add_workspace_member(invitation.workspace_id, user_id, invitation.role),
             {:ok, accepted} <-
               invitation
               |> WorkspaceInvitation.accept_changeset(user_id)
               |> Repo.update() do
          create_notification(%{
            actor_id: actor_id,
            recipient_id: user_id,
            type: "workspace_invite",
            payload: %{
              workspace_id: invitation.workspace_id,
              invitation_id: invitation.id,
              role: Atom.to_string(invitation.role)
            }
          })

          {:ok, accepted}
        end

      :error ->
        {:ok, invitation}
    end
  end

  defp create_comment_notifications(comment, page, actor_id) do
    comment.content
    |> notification_recipients(page)
    |> Enum.reject(&(&1 == actor_id))
    |> Enum.uniq()
    |> Enum.each(fn recipient_id ->
      type =
        if mentioned_user?(comment.content, recipient_id) do
          "mention"
        else
          "comment"
        end

      create_notification(%{
        actor_id: actor_id,
        recipient_id: recipient_id,
        type: type,
        payload: %{
          block_id: comment.block_id,
          comment_id: comment.id,
          content: comment.content,
          page_id: page.id,
          page_title: page.title
        }
      })
    end)
  end

  defp notification_recipients(content, page) do
    [page.created_by | mentioned_user_ids(content)]
    |> Enum.reject(&is_nil/1)
  end

  defp mentioned_user?(content, user_id) do
    user_id in mentioned_user_ids(content)
  end

  defp mentioned_user_ids(content) do
    content
    |> mentioned_emails()
    |> Enum.flat_map(fn email ->
      case auth_user_id_by_email(email) do
        {:ok, user_id} -> [user_id]
        :error -> []
      end
    end)
  end

  defp mentioned_emails(content) when is_binary(content) do
    ~r/(?:^|\s)@([^\s@]+@[^\s@]+\.[^\s@.,;:]+)/u
    |> Regex.scan(content)
    |> Enum.map(fn [_match, email] -> String.downcase(email) end)
  end

  defp mentioned_emails(_content), do: []

  defp create_notification(attrs) do
    %Notification{}
    |> Notification.changeset(attrs)
    |> Repo.insert()
  end

  defp auth_user_id_by_email(email) do
    %{rows: rows} =
      SQL.query!(
        Repo,
        "select id::text from auth.users where lower(email) = lower($1) limit 1",
        [email]
      )

    case rows do
      [[id]] -> {:ok, id}
      _ -> :error
    end
  end

  defp auth_user_email(user_id) do
    %{rows: rows} =
      SQL.query!(
        Repo,
        "select email from auth.users where id = $1 limit 1",
        [Ecto.UUID.dump!(user_id)]
      )

    case rows do
      [[email]] when is_binary(email) -> {:ok, email}
      _ -> :error
    end
  end

  defp normalize_role(role) when is_atom(role), do: role

  defp normalize_role(role) when is_binary(role) do
    case role do
      "viewer" -> :viewer
      "editor" -> :editor
      "owner" -> :owner
      _ -> :invalid
    end
  end

  defp ensure_manageable_role(role) when role in @manageable_roles, do: {:ok, role}
  defp ensure_manageable_role(_role), do: {:error, :invalid_role}

  defp enum_to_string(value) when is_atom(value), do: Atom.to_string(value)
  defp enum_to_string(value), do: value

  defp blocks_query do
    from b in Block,
      order_by: [asc: b.parent_block_id, asc: b.position, asc: b.created_at]
  end
end
