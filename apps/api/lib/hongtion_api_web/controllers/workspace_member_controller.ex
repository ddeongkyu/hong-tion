defmodule HongtionApiWeb.WorkspaceMemberController do
  use HongtionApiWeb, :controller

  alias HongtionApi.Documents
  alias HongtionApiWeb.DocumentJSON

  def index(conn, %{"workspace_id" => workspace_id}) do
    members = Documents.list_workspace_members(workspace_id, conn.assigns.current_user_id)
    json(conn, %{data: Enum.map(members, &DocumentJSON.member/1)})
  end

  def update(conn, %{"workspace_id" => workspace_id, "user_id" => user_id} = params) do
    role = get_in(params, ["member", "role"]) || Map.get(params, "role")

    case Documents.update_workspace_member_role(
           workspace_id,
           user_id,
           role,
           conn.assigns.current_user_id
         ) do
      {:ok, _member} ->
        members = Documents.list_workspace_members(workspace_id, conn.assigns.current_user_id)
        json(conn, %{data: Enum.map(members, &DocumentJSON.member/1)})

      {:error, :forbidden} ->
        forbidden(conn)

      {:error, :invalid_role} ->
        invalid_role(conn)

      {:error, :not_found} ->
        not_found(conn)
    end
  end

  def delete(conn, %{"workspace_id" => workspace_id, "user_id" => user_id}) do
    case Documents.remove_workspace_member(workspace_id, user_id, conn.assigns.current_user_id) do
      {:ok, _member} ->
        members = Documents.list_workspace_members(workspace_id, conn.assigns.current_user_id)
        json(conn, %{data: Enum.map(members, &DocumentJSON.member/1)})

      {:error, :forbidden} ->
        forbidden(conn)

      {:error, :not_found} ->
        not_found(conn)
    end
  end

  defp forbidden(conn) do
    conn
    |> put_status(:forbidden)
    |> json(%{errors: %{detail: "Forbidden"}})
  end

  defp invalid_role(conn) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: %{role: ["is invalid"]}})
  end

  defp not_found(conn) do
    conn
    |> put_status(:not_found)
    |> json(%{errors: %{detail: "Not found"}})
  end
end
