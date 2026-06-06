defmodule HongtionApiWeb.DocumentJSON do
  alias HongtionApi.Accounts.Profile
  alias HongtionApi.Documents.Block
  alias HongtionApi.Documents.Comment
  alias HongtionApi.Documents.FileAsset
  alias HongtionApi.Documents.Notification
  alias HongtionApi.Documents.Page
  alias HongtionApi.Documents.PageVersion
  alias HongtionApi.Documents.Workspace
  alias HongtionApi.Documents.WorkspaceInvitation

  def workspace(%Workspace{} = workspace) do
    %{
      id: workspace.id,
      name: workspace.name,
      icon: workspace.icon,
      owner_id: workspace.owner_id,
      default_locale: workspace.default_locale,
      created_at: iso(workspace.created_at),
      updated_at: iso(workspace.updated_at)
    }
  end

  def profile(%Profile{} = profile) do
    %{
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      locale: profile.locale,
      timezone: profile.timezone,
      created_at: iso(profile.created_at),
      updated_at: iso(profile.updated_at)
    }
  end

  def page(%Page{} = page) do
    %{
      id: page.id,
      workspace_id: page.workspace_id,
      parent_id: page.parent_id,
      title: page.title,
      icon: page.icon,
      cover_url: page.cover_url,
      position: page.position,
      share_scope: enum(page.share_scope),
      is_deleted: page.is_deleted,
      created_by: page.created_by,
      updated_by: page.updated_by,
      created_at: iso(page.created_at),
      updated_at: iso(page.updated_at),
      blocks: maybe_blocks(page)
    }
  end

  def block(%Block{} = block) do
    %{
      id: block.id,
      page_id: block.page_id,
      parent_block_id: block.parent_block_id,
      type: enum(block.type),
      content: block.content,
      position: block.position,
      created_by: block.created_by,
      updated_by: block.updated_by,
      created_at: iso(block.created_at),
      updated_at: iso(block.updated_at)
    }
  end

  def member(%{} = member) do
    %{
      workspace_id: member.workspace_id,
      user_id: member.user_id,
      role: member.role,
      joined_at: iso(member.joined_at),
      email: member.email,
      display_name: member.display_name,
      avatar_url: member.avatar_url
    }
  end

  def invitation(%WorkspaceInvitation{} = invitation) do
    %{
      id: invitation.id,
      workspace_id: invitation.workspace_id,
      email: invitation.email,
      role: enum(invitation.role),
      status: enum(invitation.status),
      invite_token: invitation.invite_token,
      invited_by: invitation.invited_by,
      accepted_by: invitation.accepted_by,
      expires_at: iso(invitation.expires_at),
      created_at: iso(invitation.created_at),
      updated_at: iso(invitation.updated_at)
    }
  end

  def comment(%Comment{} = comment) do
    %{
      id: comment.id,
      page_id: comment.page_id,
      block_id: comment.block_id,
      user_id: comment.user_id,
      content: comment.content,
      resolved_at: iso(comment.resolved_at),
      resolved_by: comment.resolved_by,
      created_at: iso(comment.created_at),
      updated_at: iso(comment.updated_at)
    }
  end

  def notification(%Notification{} = notification) do
    %{
      id: notification.id,
      recipient_id: notification.recipient_id,
      actor_id: notification.actor_id,
      type: notification.type,
      payload: notification.payload,
      read_at: iso(notification.read_at),
      created_at: iso(notification.created_at)
    }
  end

  def file_asset(%FileAsset{} = file_asset) do
    %{
      id: file_asset.id,
      workspace_id: file_asset.workspace_id,
      page_id: file_asset.page_id,
      block_id: file_asset.block_id,
      storage_bucket: file_asset.storage_bucket,
      storage_path: file_asset.storage_path,
      original_name: file_asset.original_name,
      mime_type: file_asset.mime_type,
      size_bytes: file_asset.size_bytes,
      status: enum(file_asset.status),
      uploaded_by: file_asset.uploaded_by,
      created_at: iso(file_asset.created_at),
      updated_at: iso(file_asset.updated_at)
    }
  end

  def page_version(%PageVersion{} = page_version) do
    snapshot = page_version.snapshot || %{}
    page_snapshot = Map.get(snapshot, "page", %{})
    blocks = Map.get(snapshot, "blocks", [])

    %{
      id: page_version.id,
      page_id: page_version.page_id,
      created_by: page_version.created_by,
      created_at: iso(page_version.created_at),
      reason: Map.get(snapshot, "reason"),
      title: Map.get(page_snapshot, "title"),
      block_count: length(blocks)
    }
  end

  def search_result(%{} = result) do
    %{
      kind: result.kind,
      page_id: result.page_id,
      block_id: result.block_id,
      title: result.title,
      excerpt: result.excerpt,
      rank: result.rank,
      updated_at: iso(result.updated_at)
    }
  end

  defp maybe_blocks(%Page{blocks: blocks}) when is_list(blocks), do: Enum.map(blocks, &block/1)
  defp maybe_blocks(_page), do: nil

  defp enum(value) when is_atom(value), do: Atom.to_string(value)
  defp enum(value), do: value

  defp iso(nil), do: nil
  defp iso(%DateTime{} = value), do: DateTime.to_iso8601(value)
  defp iso(%NaiveDateTime{} = value), do: NaiveDateTime.to_iso8601(value)
end
