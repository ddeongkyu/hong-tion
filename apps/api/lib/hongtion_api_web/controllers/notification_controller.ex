defmodule HongtionApiWeb.NotificationController do
  use HongtionApiWeb, :controller

  alias HongtionApi.Documents
  alias HongtionApiWeb.DocumentJSON

  def index(conn, _params) do
    notifications = Documents.list_notifications(conn.assigns.current_user_id)
    json(conn, %{data: Enum.map(notifications, &DocumentJSON.notification/1)})
  end

  def mark_all_read(conn, _params) do
    {:ok, count} = Documents.mark_notifications_read(conn.assigns.current_user_id)
    json(conn, %{data: %{count: count}})
  end

  def mark_read(conn, %{"id" => id}) do
    case Documents.mark_notification_read(id, conn.assigns.current_user_id) do
      {:ok, notification} ->
        json(conn, %{data: DocumentJSON.notification(notification)})

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{errors: %{detail: "Not found"}})
    end
  end
end
