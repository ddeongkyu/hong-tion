defmodule HongtionApiWeb.PageController do
  use HongtionApiWeb, :controller

  alias HongtionApi.Documents
  alias HongtionApiWeb.DocumentJSON
  alias HongtionApiWeb.ErrorHelpers

  def index(conn, %{"workspace_id" => workspace_id}) do
    pages = Documents.list_pages(workspace_id, conn.assigns.current_user_id)
    json(conn, %{data: Enum.map(pages, &DocumentJSON.page/1)})
  end

  def trash(conn, %{"workspace_id" => workspace_id}) do
    pages = Documents.list_deleted_pages(workspace_id, conn.assigns.current_user_id)
    json(conn, %{data: Enum.map(pages, &DocumentJSON.page/1)})
  end

  def show(conn, %{"id" => id}) do
    case Documents.get_page(id, conn.assigns.current_user_id) do
      nil -> not_found(conn)
      page -> json(conn, %{data: DocumentJSON.page(page)})
    end
  end

  def create(conn, params) do
    attrs = Map.get(params, "page", params)

    case Documents.create_page(attrs, conn.assigns.current_user_id) do
      {:ok, page} ->
        conn
        |> put_status(:created)
        |> json(%{data: DocumentJSON.page(page)})

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

  def update(conn, %{"id" => id} = params) do
    attrs = Map.get(params, "page", Map.drop(params, ["id"]))

    case Documents.update_page(id, attrs, conn.assigns.current_user_id) do
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

  def delete(conn, %{"id" => id}) do
    case Documents.delete_page(id, conn.assigns.current_user_id) do
      {:ok, page} ->
        json(conn, %{data: DocumentJSON.page(page)})

      {:error, :forbidden} ->
        forbidden(conn)

      {:error, :not_found} ->
        not_found(conn)
    end
  end

  def restore(conn, %{"id" => id}) do
    case Documents.restore_page(id, conn.assigns.current_user_id) do
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
