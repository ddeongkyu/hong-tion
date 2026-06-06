defmodule HongtionApiWeb.PageVersionController do
  use HongtionApiWeb, :controller

  alias HongtionApi.Documents
  alias HongtionApiWeb.DocumentJSON
  alias HongtionApiWeb.ErrorHelpers

  def index(conn, %{"page_id" => page_id}) do
    versions = Documents.list_page_versions(page_id, conn.assigns.current_user_id)
    json(conn, %{data: Enum.map(versions, &DocumentJSON.page_version/1)})
  end

  def restore(conn, %{"page_id" => page_id, "version_id" => version_id}) do
    case Documents.restore_page_version(page_id, version_id, conn.assigns.current_user_id) do
      {:ok, page} ->
        json(conn, %{data: DocumentJSON.page(page)})

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
