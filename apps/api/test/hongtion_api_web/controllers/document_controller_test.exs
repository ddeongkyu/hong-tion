defmodule HongtionApiWeb.DocumentControllerTest do
  use HongtionApiWeb.ConnCase, async: true

  test "profile endpoint exposes and updates display name" do
    user_id = user_fixture(email: "profile@example.com")

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", user_id)
      |> get("/api/profile")

    assert %{"data" => %{"id" => ^user_id, "display_name" => nil}} = json_response(conn, 200)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", user_id)
      |> patch("/api/profile", %{profile: %{display_name: "  Hong Tester  "}})

    assert %{"data" => %{"display_name" => "Hong Tester"}} = json_response(conn, 200)
  end

  test "profile display name has a length guard" do
    user_id = user_fixture(email: "profile-long@example.com")

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", user_id)
      |> patch("/api/profile", %{profile: %{display_name: String.duplicate("a", 81)}})

    assert %{"errors" => %{"display_name" => [_message]}} = json_response(conn, 422)
  end

  test "workspace, page, and block endpoints run with dev header auth", %{conn: conn} do
    user_id = user_fixture()
    conn = put_req_header(conn, "x-hongtion-user-id", user_id)

    conn =
      post(conn, "/api/workspaces", %{
        workspace: %{default_locale: "ko", icon: "H", name: "API workspace"}
      })

    assert %{"data" => %{"id" => workspace_id}} = json_response(conn, 201)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", user_id)
      |> post("/api/pages", %{
        page: %{
          icon: "문",
          position: "000100",
          title: "API page",
          workspace_id: workspace_id
        }
      })

    assert %{"data" => %{"id" => page_id, "title" => "API page"}} = json_response(conn, 201)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", user_id)
      |> post("/api/blocks", %{
        block: %{
          content: %{text: "API block"},
          page_id: page_id,
          position: "000100",
          type: "paragraph"
        }
      })

    assert %{"data" => %{"id" => block_id}} = json_response(conn, 201)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", user_id)
      |> patch("/api/blocks/#{block_id}", %{
        block: %{content: %{text: "Updated"}, position: "000050"}
      })

    assert %{"data" => %{"content" => %{"text" => "Updated"}, "position" => "000050"}} =
             json_response(conn, 200)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", user_id)
      |> get("/api/workspaces/#{workspace_id}/search?q=Updated")

    assert %{"data" => search_results} = json_response(conn, 200)
    assert Enum.any?(search_results, &(&1["kind"] == "block" and &1["page_id"] == page_id))

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", user_id)
      |> get("/api/pages/#{page_id}/versions")

    assert %{"data" => [version | _]} = json_response(conn, 200)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", user_id)
      |> post("/api/pages/#{page_id}/versions/#{version["id"]}/restore")

    assert %{"data" => %{"id" => ^page_id, "blocks" => blocks}} = json_response(conn, 200)
    assert is_list(blocks)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", user_id)
      |> delete("/api/pages/#{page_id}")

    assert %{"data" => %{"is_deleted" => true}} = json_response(conn, 200)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", user_id)
      |> get("/api/workspaces/#{workspace_id}/trash")

    assert %{"data" => [%{"id" => ^page_id}]} = json_response(conn, 200)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", user_id)
      |> patch("/api/pages/#{page_id}/restore")

    assert %{"data" => %{"id" => ^page_id, "is_deleted" => false}} = json_response(conn, 200)
  end

  test "collaboration endpoints expose members, invitations, comments, notifications, and files" do
    owner_id = user_fixture(email: "api-owner@example.com")
    editor_id = user_fixture(email: "api-editor@example.com")
    workspace = workspace_fixture(owner_id)
    page = page_fixture(owner_id, workspace.id)
    block = block_fixture(owner_id, page.id)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", owner_id)
      |> get("/api/workspaces/#{workspace.id}/members")

    assert %{"data" => [%{"role" => "owner"}]} = json_response(conn, 200)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", owner_id)
      |> post("/api/workspaces/#{workspace.id}/invitations", %{
        invitation: %{email: "api-editor@example.com", role: "editor"}
      })

    assert %{"data" => %{"status" => "accepted"}} = json_response(conn, 201)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", editor_id)
      |> post("/api/pages/#{page.id}/comments", %{
        comment: %{
          block_id: block.id,
          content: "Mentioning @api-owner@example.com"
        }
      })

    assert %{"data" => %{"id" => comment_id}} = json_response(conn, 201)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", owner_id)
      |> get("/api/notifications")

    assert %{"data" => [%{"type" => "mention"}]} = json_response(conn, 200)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", owner_id)
      |> patch("/api/notifications/read")

    assert %{"data" => %{"count" => 1}} = json_response(conn, 200)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", owner_id)
      |> patch("/api/comments/#{comment_id}/resolve")

    assert %{"data" => %{"resolved_at" => resolved_at}} = json_response(conn, 200)
    assert is_binary(resolved_at)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", owner_id)
      |> post("/api/workspaces/#{workspace.id}/files", %{
        file: %{
          block_id: block.id,
          mime_type: "text/plain",
          original_name: "notes.txt",
          page_id: page.id,
          size_bytes: 42,
          storage_bucket: "workspace-files",
          storage_path: "#{workspace.id}/#{page.id}/notes.txt"
        }
      })

    assert %{"data" => %{"original_name" => "notes.txt"}} = json_response(conn, 201)
  end

  test "member management endpoints are owner-only" do
    owner_id = user_fixture(email: "owner-role@example.com")
    editor_id = user_fixture(email: "editor-role@example.com")
    viewer_id = user_fixture(email: "viewer-role@example.com")
    workspace = workspace_fixture(owner_id)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", owner_id)
      |> post("/api/workspaces/#{workspace.id}/invitations", %{
        invitation: %{email: "editor-role@example.com", role: "editor"}
      })

    assert %{"data" => %{"status" => "accepted"}} = json_response(conn, 201)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", owner_id)
      |> post("/api/workspaces/#{workspace.id}/invitations", %{
        invitation: %{email: "viewer-role@example.com", role: "viewer"}
      })

    assert %{"data" => %{"status" => "accepted"}} = json_response(conn, 201)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", owner_id)
      |> patch("/api/workspaces/#{workspace.id}/members/#{viewer_id}", %{
        member: %{role: "editor"}
      })

    assert %{"data" => members} = json_response(conn, 200)
    assert Enum.any?(members, &(&1["user_id"] == viewer_id and &1["role"] == "editor"))

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", editor_id)
      |> patch("/api/workspaces/#{workspace.id}/members/#{viewer_id}", %{
        member: %{role: "viewer"}
      })

    assert %{"errors" => %{"detail" => "Forbidden"}} = json_response(conn, 403)

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", owner_id)
      |> delete("/api/workspaces/#{workspace.id}/members/#{editor_id}")

    assert %{"data" => members} = json_response(conn, 200)
    refute Enum.any?(members, &(&1["user_id"] == editor_id))

    conn =
      build_conn()
      |> put_req_header("x-hongtion-user-id", owner_id)
      |> patch("/api/workspaces/#{workspace.id}/members/#{owner_id}", %{
        member: %{role: "viewer"}
      })

    assert %{"errors" => %{"detail" => "Forbidden"}} = json_response(conn, 403)
  end
end
