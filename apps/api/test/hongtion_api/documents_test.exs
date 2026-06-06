defmodule HongtionApi.DocumentsTest do
  use HongtionApi.DataCase, async: true

  alias HongtionApi.Documents
  alias HongtionApi.Documents.Page
  alias HongtionApi.Documents.WorkspaceMember

  test "create_workspace creates an owner membership through the database trigger" do
    user_id = user_fixture()

    workspace = workspace_fixture(user_id, name: "Product")

    member = Repo.get_by!(WorkspaceMember, workspace_id: workspace.id, user_id: user_id)
    assert member.role == :owner
  end

  test "pages and blocks are scoped to workspace membership" do
    owner_id = user_fixture()
    stranger_id = user_fixture()
    workspace = workspace_fixture(owner_id)
    page = page_fixture(owner_id, workspace.id)
    block = block_fixture(owner_id, page.id, content: %{"text" => "First"})
    page_id = page.id

    assert %Page{id: ^page_id, blocks: [loaded_block]} = Documents.get_page(page.id, owner_id)
    assert loaded_block.id == block.id
    assert Documents.get_page(page.id, stranger_id) == nil
    assert Documents.list_blocks(page.id, stranger_id) == []
  end

  test "editors can update page metadata and reorder blocks" do
    owner_id = user_fixture()
    workspace = workspace_fixture(owner_id)
    root = page_fixture(owner_id, workspace.id, title: "Root", position: "000100")

    child =
      page_fixture(owner_id, workspace.id, parent_id: root.id, title: "Child", position: "000200")

    first = block_fixture(owner_id, child.id, content: %{"text" => "A"}, position: "000100")
    second = block_fixture(owner_id, child.id, content: %{"text" => "B"}, position: "000200")

    assert {:ok, updated_page} =
             Documents.update_page(child.id, %{"parent_id" => nil, "title" => "Moved"}, owner_id)

    assert updated_page.parent_id == nil
    assert updated_page.title == "Moved"

    assert {:ok, moved_block} =
             Documents.update_block(second.id, %{"position" => "000050"}, owner_id)

    assert moved_block.position == "000050"

    assert [second.id, first.id] ==
             child.id
             |> Documents.list_blocks(owner_id)
             |> Enum.map(& &1.id)
  end

  test "delete_page is soft delete and hides blocks through page access" do
    owner_id = user_fixture()
    workspace = workspace_fixture(owner_id)
    page = page_fixture(owner_id, workspace.id)
    block_fixture(owner_id, page.id)

    assert {:ok, deleted_page} = Documents.delete_page(page.id, owner_id)
    assert deleted_page.is_deleted
    assert [trashed_page] = Documents.list_deleted_pages(workspace.id, owner_id)
    assert trashed_page.id == page.id
    assert Documents.get_page(page.id, owner_id) == nil
    assert Documents.list_blocks(page.id, owner_id) == []

    assert {:ok, restored_page} = Documents.restore_page(page.id, owner_id)
    refute restored_page.is_deleted
    assert %Page{id: restored_page_id} = Documents.get_page(page.id, owner_id)
    assert restored_page_id == page.id
  end

  test "workspace search finds page titles and block text" do
    owner_id = user_fixture()
    stranger_id = user_fixture()
    workspace = workspace_fixture(owner_id)
    page = page_fixture(owner_id, workspace.id, title: "Quarterly Search Plan")
    block_fixture(owner_id, page.id, content: %{"text" => "Needle phrase in a paragraph"})

    owner_results = Documents.search_workspace(workspace.id, "Needle", owner_id)

    assert Enum.any?(owner_results, &(&1.kind == "block" and &1.page_id == page.id))
    assert [] = Documents.search_workspace(workspace.id, "Needle", stranger_id)
  end

  test "page versions can restore an earlier block snapshot" do
    owner_id = user_fixture()
    workspace = workspace_fixture(owner_id)
    page = page_fixture(owner_id, workspace.id, title: "Versioned page")
    block = block_fixture(owner_id, page.id, content: %{"text" => "Before"})

    assert {:ok, _updated_block} =
             Documents.update_block(block.id, %{"content" => %{"text" => "After"}}, owner_id)

    versions = Documents.list_page_versions(page.id, owner_id)
    before_version = Enum.find(versions, &(&1.snapshot["reason"] == "block_create"))

    assert before_version

    assert {:ok, restored_page} =
             Documents.restore_page_version(page.id, before_version.id, owner_id)

    assert [restored_block] = restored_page.blocks
    assert restored_block.content["text"] == "Before"
  end

  test "inviting an existing user creates membership and notification" do
    owner_id = user_fixture(email: "owner@example.com")
    invited_id = user_fixture(email: "editor@example.com")
    workspace = workspace_fixture(owner_id)

    assert {:ok, invitation} =
             Documents.invite_workspace_member(
               workspace.id,
               %{"email" => "editor@example.com", "role" => "editor"},
               owner_id
             )

    assert invitation.status == :accepted
    assert invitation.accepted_by == invited_id

    member = Repo.get_by!(WorkspaceMember, workspace_id: workspace.id, user_id: invited_id)
    assert member.role == :editor

    assert [%{type: "workspace_invite"}] = Documents.list_notifications(invited_id)
  end

  test "pending invitations can be accepted after the invited user signs up" do
    owner_id = user_fixture(email: "pending-owner@example.com")
    workspace = workspace_fixture(owner_id)

    assert {:ok, invitation} =
             Documents.invite_workspace_member(
               workspace.id,
               %{"email" => "pending@example.com", "role" => "viewer"},
               owner_id
             )

    assert invitation.status == :pending

    invited_id = user_fixture(email: "pending@example.com")

    assert {:ok, accepted} =
             Documents.accept_workspace_invitation(invitation.invite_token, invited_id)

    assert accepted.status == :accepted
    assert accepted.accepted_by == invited_id

    member = Repo.get_by!(WorkspaceMember, workspace_id: workspace.id, user_id: invited_id)
    assert member.role == :viewer
  end

  test "comments can mention workspace users and create notifications" do
    owner_id = user_fixture(email: "comment-owner@example.com")
    editor_id = user_fixture(email: "comment-editor@example.com")
    workspace = workspace_fixture(owner_id)
    page = page_fixture(owner_id, workspace.id)
    block = block_fixture(owner_id, page.id)

    assert {:ok, _invitation} =
             Documents.invite_workspace_member(
               workspace.id,
               %{"email" => "comment-editor@example.com", "role" => "editor"},
               owner_id
             )

    assert {:ok, comment} =
             Documents.create_comment(
               %{
                 "block_id" => block.id,
                 "content" => "Please check this @comment-owner@example.com",
                 "page_id" => page.id
               },
               editor_id
             )

    assert comment.user_id == editor_id
    assert [loaded_comment] = Documents.list_comments(page.id, owner_id)
    assert loaded_comment.content =~ "Please check"

    assert [notification] = Documents.list_notifications(owner_id)
    assert notification.type == "mention"
    assert notification.payload["comment_id"] == comment.id

    assert {:ok, 1} = Documents.mark_notifications_read(owner_id)
    assert [%{read_at: %DateTime{}}] = Documents.list_notifications(owner_id)
  end

  test "file assets are scoped to workspace editors" do
    owner_id = user_fixture()
    stranger_id = user_fixture()
    workspace = workspace_fixture(owner_id)
    page = page_fixture(owner_id, workspace.id)
    block = block_fixture(owner_id, page.id)

    assert {:ok, file_asset} =
             Documents.create_file_asset(
               %{
                 "block_id" => block.id,
                 "mime_type" => "image/png",
                 "original_name" => "cover.png",
                 "page_id" => page.id,
                 "size_bytes" => 1234,
                 "storage_bucket" => "workspace-files",
                 "storage_path" => "#{workspace.id}/#{page.id}/cover.png",
                 "workspace_id" => workspace.id
               },
               owner_id
             )

    assert file_asset.uploaded_by == owner_id
    assert [loaded_file] = Documents.list_file_assets(workspace.id, owner_id)
    assert loaded_file.id == file_asset.id
    assert Documents.list_file_assets(workspace.id, stranger_id) == []

    assert {:error, changeset} =
             Documents.create_file_asset(
               %{
                 "mime_type" => "application/x-msdownload",
                 "original_name" => "unsafe.exe",
                 "size_bytes" => 10,
                 "storage_bucket" => "workspace-files",
                 "storage_path" => "#{workspace.id}/unsafe.exe",
                 "workspace_id" => workspace.id
               },
               owner_id
             )

    assert %{mime_type: [_ | _]} = errors_on(changeset)
  end
end
