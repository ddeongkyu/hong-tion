defmodule HongtionApiWeb.FileAssetController do
  use HongtionApiWeb, :controller

  alias HongtionApi.Documents
  alias HongtionApiWeb.DocumentJSON
  alias HongtionApiWeb.ErrorHelpers

  def index(conn, %{"workspace_id" => workspace_id}) do
    files = Documents.list_file_assets(workspace_id, conn.assigns.current_user_id)
    json(conn, %{data: Enum.map(files, &DocumentJSON.file_asset/1)})
  end

  def create(conn, %{"workspace_id" => workspace_id} = params) do
    attrs =
      params
      |> Map.get("file", params)
      |> Map.put("workspace_id", workspace_id)

    case Documents.create_file_asset(attrs, conn.assigns.current_user_id) do
      {:ok, file_asset} ->
        conn
        |> put_status(:created)
        |> json(%{data: DocumentJSON.file_asset(file_asset)})

      {:error, :forbidden} ->
        forbidden(conn)

      {:error, :not_found} ->
        not_found(conn)

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: ErrorHelpers.changeset_errors(changeset)})
    end
  end

  defp forbidden(conn) do
    conn
    |> put_status(:forbidden)
    |> json(%{errors: %{detail: "Forbidden"}})
  end

  defp not_found(conn) do
    conn
    |> put_status(:not_found)
    |> json(%{errors: %{detail: "Not found"}})
  end
end
