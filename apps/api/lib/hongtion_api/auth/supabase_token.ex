defmodule HongtionApi.Auth.SupabaseToken do
  @moduledoc false

  @jwks_cache_key {__MODULE__, :jwks}
  @jwks_cache_ttl_ms :timer.minutes(10)

  def verify(token) when is_binary(token) do
    with {:ok, claims} <- verify_with_jwks(token),
         {:ok, user_id} <- fetch_subject(claims) do
      {:ok, user_id, claims}
    else
      {:error, :jwks_unavailable} ->
        verify_with_auth_server(token)

      {:error, :jwks_key_not_found} ->
        verify_with_auth_server(token)

      {:error, :jwks_empty} ->
        verify_with_auth_server(token)

      {:error, :invalid_token} ->
        verify_with_auth_server(token)

      error ->
        error
    end
  end

  def verify(_token), do: {:error, :invalid_token}

  defp verify_with_jwks(token) do
    with jwks_url when is_binary(jwks_url) <-
           Application.get_env(:hongtion_api, :supabase_jwks_url),
         {:ok, header} <- decode_header(token),
         {:ok, jwks} <- fetch_jwks(jwks_url),
         {:ok, jwk} <- find_jwk(jwks, header),
         {:ok, claims} <- verify_signature(token, jwk, header),
         :ok <- validate_claims(claims) do
      {:ok, claims}
    else
      nil -> {:error, :jwks_unavailable}
      error -> error
    end
  end

  defp decode_header(token) do
    token
    |> JOSE.JWT.peek_protected()
    |> case do
      %{} = header -> {:ok, header}
      _ -> {:error, :invalid_token}
    end
  rescue
    _ -> {:error, :invalid_token}
  end

  defp fetch_jwks(jwks_url) do
    case Process.get(@jwks_cache_key) do
      {jwks, expires_at} ->
        if expires_at > System.monotonic_time(:millisecond) do
          {:ok, jwks}
        else
          request_jwks(jwks_url)
        end

      _ ->
        request_jwks(jwks_url)
    end
  end

  defp request_jwks(jwks_url) do
    case Req.get(jwks_url, receive_timeout: 5_000) do
      {:ok, %{status: 200, body: %{"keys" => keys} = jwks}} when is_list(keys) ->
        Process.put(
          @jwks_cache_key,
          {jwks, System.monotonic_time(:millisecond) + @jwks_cache_ttl_ms}
        )

        {:ok, jwks}

      {:ok, %{status: 200, body: %{"keys" => []}}} ->
        {:error, :jwks_empty}

      _ ->
        {:error, :jwks_unavailable}
    end
  end

  defp find_jwk(%{"keys" => keys}, %{"kid" => kid}) when is_list(keys) and is_binary(kid) do
    case Enum.find(keys, &(&1["kid"] == kid)) do
      nil -> {:error, :jwks_key_not_found}
      jwk -> {:ok, jwk}
    end
  end

  defp find_jwk(%{"keys" => keys}, _header) when is_list(keys) do
    case keys do
      [jwk] -> {:ok, jwk}
      [] -> {:error, :jwks_empty}
      _ -> {:error, :jwks_key_not_found}
    end
  end

  defp find_jwk(_jwks, _header), do: {:error, :jwks_unavailable}

  defp verify_signature(token, jwk, %{"alg" => alg}) when is_binary(alg) do
    jwk
    |> JOSE.JWK.from_map()
    |> JOSE.JWT.verify_strict([alg], token)
    |> case do
      {true, %JOSE.JWT{fields: claims}, _jws} -> {:ok, claims}
      _ -> {:error, :invalid_token}
    end
  rescue
    _ -> {:error, :invalid_token}
  end

  defp verify_signature(_token, _jwk, _header), do: {:error, :invalid_token}

  defp validate_claims(claims) do
    now = System.system_time(:second)
    supabase_url = Application.get_env(:hongtion_api, :supabase_url)
    issuer = claims["iss"]

    cond do
      not is_binary(claims["sub"]) ->
        {:error, :invalid_token}

      is_integer(claims["exp"]) and claims["exp"] <= now ->
        {:error, :token_expired}

      is_binary(supabase_url) and is_binary(issuer) and
          issuer != String.trim_trailing(supabase_url, "/") <> "/auth/v1" ->
        {:error, :invalid_issuer}

      true ->
        :ok
    end
  end

  defp fetch_subject(%{"sub" => user_id}) do
    case Ecto.UUID.cast(user_id) do
      {:ok, uuid} -> {:ok, uuid}
      :error -> {:error, :invalid_token}
    end
  end

  defp verify_with_auth_server(token) do
    supabase_url = Application.get_env(:hongtion_api, :supabase_url)
    publishable_key = Application.get_env(:hongtion_api, :supabase_publishable_key)

    if is_binary(supabase_url) and is_binary(publishable_key) do
      url = String.trim_trailing(supabase_url, "/") <> "/auth/v1/user"

      case Req.get(url,
             headers: [
               {"apikey", publishable_key},
               {"authorization", "Bearer " <> token}
             ],
             receive_timeout: 5_000
           ) do
        {:ok, %{status: 200, body: %{"id" => user_id} = claims}} ->
          with {:ok, uuid} <- Ecto.UUID.cast(user_id) do
            {:ok, uuid, claims}
          else
            :error -> {:error, :invalid_token}
          end

        _ ->
          {:error, :invalid_token}
      end
    else
      {:error, :jwks_unavailable}
    end
  end
end
