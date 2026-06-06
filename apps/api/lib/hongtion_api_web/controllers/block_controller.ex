defmodule HongtionApiWeb.BlockController do
  use HongtionApiWeb, :controller

  alias HongtionApi.Documents
  alias HongtionApiWeb.DocumentJSON
  alias HongtionApiWeb.ErrorHelpers

  def index(conn, %{"page_id" => page_id}) do
    blocks = Documents.list_blocks(page_id, conn.assigns.current_user_id)
    json(conn, %{data: Enum.map(blocks, &DocumentJSON.block/1)})
  end

  def create(conn, params) do
    attrs = Map.get(params, "block", params)

    case Documents.create_block(attrs, conn.assigns.current_user_id) do
      {:ok, block} ->
        conn
        |> put_status(:created)
        |> json(%{data: DocumentJSON.block(block)})

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
    attrs = Map.get(params, "block", Map.drop(params, ["id"]))

    case Documents.update_block(id, attrs, conn.assigns.current_user_id) do
      {:ok, block} ->
        json(conn, %{data: DocumentJSON.block(block)})

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
    case Documents.delete_block(id, conn.assigns.current_user_id) do
      {:ok, block} ->
        json(conn, %{data: DocumentJSON.block(block)})

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
