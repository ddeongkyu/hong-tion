defmodule HongtionApiWeb.UserSocket do
  use Phoenix.Socket

  alias HongtionApi.Auth.SupabaseToken

  channel "page:*", HongtionApiWeb.PageChannel

  @impl true
  def connect(%{"token" => token}, socket, _connect_info)
      when is_binary(token) and byte_size(token) > 0 do
    case SupabaseToken.verify(token) do
      {:ok, user_id, _claims} ->
        {:ok, socket |> assign(:access_token, token) |> assign(:user_id, user_id)}

      _error ->
        :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket) do
    case socket.assigns[:user_id] do
      nil -> nil
      user_id -> "user_socket:#{user_id}"
    end
  end
end
