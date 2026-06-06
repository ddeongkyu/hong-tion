defmodule HongtionApiWeb.PageChannel do
  use HongtionApiWeb, :channel

  alias HongtionApi.Documents
  alias HongtionApiWeb.Presence

  @impl true
  def join("page:" <> page_id, _payload, socket) do
    if authorized_page?(socket, page_id) do
      user_id = socket.assigns.user_id

      send(self(), :after_join)

      {:ok, %{page_id: page_id, user_id: user_id}, assign(socket, :page_id, page_id)}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    {:ok, _meta} =
      Presence.track(socket, socket.assigns.user_id, %{
        online_at: DateTime.utc_now() |> DateTime.to_iso8601()
      })

    push(socket, "presence_state", Presence.list(socket))

    broadcast_from!(socket, "presence:sync", %{
      "page_id" => socket.assigns.page_id,
      "user_id" => socket.assigns.user_id,
      "status" => "online"
    })

    {:noreply, socket}
  end

  @impl true
  def handle_in("cursor:move", payload, socket) do
    broadcast_from!(socket, "cursor:move", attach_actor(payload, socket))
    {:noreply, socket}
  end

  def handle_in(event, payload, socket)
      when event in ["block:insert", "block:update", "block:delete"] do
    broadcast_from!(socket, event, attach_actor(payload, socket))
    {:reply, {:ok, %{accepted: true}}, socket}
  end

  defp attach_actor(payload, socket) do
    payload
    |> Map.put("page_id", socket.assigns[:page_id])
    |> Map.put("user_id", socket.assigns[:user_id])
  end

  defp authorized_page?(socket, page_id) do
    case Ecto.UUID.cast(page_id) do
      {:ok, page_id} -> Documents.get_page(page_id, socket.assigns.user_id) != nil
      :error -> false
    end
  end
end
