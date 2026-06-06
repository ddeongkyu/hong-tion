defmodule HongtionApiWeb.CommentController do
  use HongtionApiWeb, :controller

  alias HongtionApi.Documents
  alias HongtionApiWeb.DocumentJSON
  alias HongtionApiWeb.ErrorHelpers

  def index(conn, %{"page_id" => page_id}) do
    comments = Documents.list_comments(page_id, conn.assigns.current_user_id)
    json(conn, %{data: Enum.map(comments, &DocumentJSON.comment/1)})
  end

  def create(conn, %{"page_id" => page_id} = params) do
    attrs =
      params
      |> Map.get("comment", params)
      |> Map.put("page_id", page_id)

    case Documents.create_comment(attrs, conn.assigns.current_user_id) do
      {:ok, comment} ->
        conn
        |> put_status(:created)
        |> json(%{data: DocumentJSON.comment(comment)})

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

  def resolve(conn, %{"id" => id}) do
    case Documents.resolve_comment(id, conn.assigns.current_user_id) do
      {:ok, comment} ->
        json(conn, %{data: DocumentJSON.comment(comment)})

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

  defp not_found(conn) do
    conn
    |> put_status(:not_found)
    |> json(%{errors: %{detail: "Not found"}})
  end
end
