defmodule HongtionApiWeb.WorkspaceController do
  use HongtionApiWeb, :controller

  alias HongtionApi.Documents
  alias HongtionApiWeb.DocumentJSON
  alias HongtionApiWeb.ErrorHelpers

  def index(conn, _params) do
    workspaces = Documents.list_workspaces(conn.assigns.current_user_id)
    json(conn, %{data: Enum.map(workspaces, &DocumentJSON.workspace/1)})
  end

  def show(conn, %{"id" => id}) do
    case Documents.get_workspace(conn.assigns.current_user_id, id) do
      nil -> not_found(conn)
      workspace -> json(conn, %{data: DocumentJSON.workspace(workspace)})
    end
  end

  def create(conn, params) do
    attrs = Map.get(params, "workspace", params)

    case Documents.create_workspace(attrs, conn.assigns.current_user_id) do
      {:ok, workspace} ->
        conn
        |> put_status(:created)
        |> json(%{data: DocumentJSON.workspace(workspace)})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: ErrorHelpers.changeset_errors(changeset)})
    end
  end

  defp not_found(conn) do
    conn
    |> put_status(:not_found)
    |> json(%{errors: %{detail: "Not found"}})
  end
end
