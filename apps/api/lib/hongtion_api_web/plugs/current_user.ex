defmodule HongtionApiWeb.Plugs.CurrentUser do
  import Plug.Conn
  import Phoenix.Controller

  alias HongtionApi.Accounts
  alias HongtionApi.Auth.SupabaseToken

  def init(opts), do: opts

  def call(conn, _opts) do
    with {:ok, user_id} <- fetch_user_id(conn),
         {:ok, profile} <- Accounts.ensure_profile(user_id) do
      conn
      |> assign(:current_user_id, user_id)
      |> assign(:current_profile, profile)
    else
      _ ->
        conn
        |> put_status(:unauthorized)
        |> json(%{errors: %{detail: "Authentication required"}})
        |> halt()
    end
  end

  defp fetch_user_id(conn) do
    case get_bearer_token(conn) do
      {:ok, token} ->
        case SupabaseToken.verify(token) do
          {:ok, user_id, _claims} -> {:ok, user_id}
          error -> error
        end

      :error ->
        fetch_dev_user_id(conn)
    end
  end

  defp get_bearer_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token | _] when byte_size(token) > 0 -> {:ok, token}
      ["bearer " <> token | _] when byte_size(token) > 0 -> {:ok, token}
      _ -> :error
    end
  end

  defp fetch_dev_user_id(conn) do
    if Application.get_env(:hongtion_api, :allow_dev_user_header, false) do
      case get_req_header(conn, "x-hongtion-user-id") do
        [user_id | _] -> cast_uuid(user_id)
        [] -> :error
      end
    else
      :error
    end
  end

  defp cast_uuid(user_id) do
    case Ecto.UUID.cast(user_id) do
      {:ok, uuid} -> {:ok, uuid}
      :error -> :error
    end
  end
end
