import Config

if config_env() in [:dev, :test] do
  env_paths = [
    Path.expand("../.env", __DIR__),
    Path.expand("../../web/.env", __DIR__)
  ]

  Enum.each(env_paths, fn env_path ->
    if File.exists?(env_path) do
      env_path
      |> File.read!()
      |> String.split("\n")
      |> Enum.each(fn line ->
        line = String.trim(line)

        if line != "" and not String.starts_with?(line, "#") do
          case String.split(line, "=", parts: 2) do
            [key, value] ->
              key = String.trim(key)
              value = value |> String.trim() |> String.trim(~s(")) |> String.trim("'")

              if key != "" and is_nil(System.get_env(key)) do
                System.put_env(key, value)
              end

            _ ->
              :ok
          end
        end
      end)
    end
  end)
end

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.
# The block below contains prod specific runtime configuration.

# ## Using releases
#
# If you use `mix release`, you need to explicitly enable the server
# by passing the PHX_SERVER=true when you start it:
#
#     PHX_SERVER=true bin/hongtion_api start
#
# Alternatively, you can use `mix phx.gen.release` to generate a `bin/server`
# script that automatically sets the env var above.
if System.get_env("PHX_SERVER") do
  config :hongtion_api, HongtionApiWeb.Endpoint, server: true
end

config :hongtion_api, HongtionApiWeb.Endpoint,
  http: [port: String.to_integer(System.get_env("PORT", "4000"))]

allow_dev_user_header =
  case System.get_env("ALLOW_DEV_USER_HEADER") do
    nil -> config_env() in [:dev, :test]
    value -> value in ~w(true 1 yes)
  end

if config_env() == :prod and allow_dev_user_header do
  raise """
  ALLOW_DEV_USER_HEADER must not be enabled in production.
  Production API requests must use Supabase Bearer tokens.
  """
end

cors_origins =
  (System.get_env("CORS_ORIGINS") ||
     System.get_env("NEXT_PUBLIC_APP_URL") ||
     if(config_env() in [:dev, :test],
       do: "http://localhost:3000,http://127.0.0.1:3000",
       else: ""
     ))
  |> String.split(",", trim: true)
  |> Enum.map(&String.trim/1)
  |> Enum.reject(&(&1 == ""))

if config_env() == :prod and cors_origins == [] do
  raise """
  environment variable CORS_ORIGINS is missing.
  Set it to the deployed web origin, for example: https://app.example.com
  """
end

supabase_jwks_url =
  case System.get_env("SUPABASE_URL") do
    nil -> nil
    url -> String.trim_trailing(url, "/") <> "/auth/v1/.well-known/jwks.json"
  end

config :hongtion_api,
  allow_dev_user_header: allow_dev_user_header,
  cors_origins: cors_origins,
  supabase_url: System.get_env("SUPABASE_URL"),
  supabase_publishable_key:
    System.get_env("SUPABASE_PUBLISHABLE_KEY") ||
      System.get_env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabase_jwks_url: supabase_jwks_url

database_ssl_options = fn ->
  if System.get_env("DATABASE_SSL", "true") in ~w(true 1) do
    [
      verify:
        if(System.get_env("DATABASE_SSL_VERIFY", "none") == "peer",
          do: :verify_peer,
          else: :verify_none
        )
    ]
  else
    false
  end
end

if config_env() == :dev and System.get_env("DATABASE_URL") do
  config :hongtion_api, HongtionApi.Repo,
    url: System.fetch_env!("DATABASE_URL"),
    ssl: database_ssl_options.(),
    pool_size: String.to_integer(System.get_env("POOL_SIZE", "5"))
end

if config_env() == :prod do
  database_url =
    System.get_env("DATABASE_URL") ||
      raise """
      environment variable DATABASE_URL is missing.
      For example: ecto://USER:PASS@HOST/DATABASE
      """

  maybe_ipv6 = if System.get_env("ECTO_IPV6") in ~w(true 1), do: [:inet6], else: []

  config :hongtion_api, HongtionApi.Repo,
    url: database_url,
    ssl: database_ssl_options.(),
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    # For machines with several cores, consider starting multiple pools of `pool_size`
    # pool_count: 4,
    socket_options: maybe_ipv6

  # The secret key base is used to sign/encrypt cookies and other secrets.
  # A default value is used in config/dev.exs and config/test.exs but you
  # want to use a different value for prod and you most likely don't want
  # to check this value into version control, so we use an environment
  # variable instead.
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  host =
    System.get_env("PHX_HOST") ||
      raise """
      environment variable PHX_HOST is missing.
      Set it to the production API host, for example: api.example.com
      """

  unless System.get_env("SUPABASE_URL") do
    raise """
    environment variable SUPABASE_URL is missing.
    """
  end

  unless System.get_env("SUPABASE_PUBLISHABLE_KEY") ||
           System.get_env("NEXT_PUBLIC_SUPABASE_ANON_KEY") do
    raise """
    environment variable SUPABASE_PUBLISHABLE_KEY is missing.
    Use the same Supabase Publishable key as the frontend anon key.
    """
  end

  config :hongtion_api, :dns_cluster_query, System.get_env("DNS_CLUSTER_QUERY")

  config :hongtion_api, HongtionApiWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [
      # Enable IPv6 and bind on all interfaces.
      # Set it to  {0, 0, 0, 0, 0, 0, 0, 1} for local network only access.
      # See the documentation on https://hexdocs.pm/bandit/Bandit.html#t:options/0
      # for details about using IPv6 vs IPv4 and loopback vs public addresses.
      ip: {0, 0, 0, 0, 0, 0, 0, 0}
    ],
    secret_key_base: secret_key_base

  # ## SSL Support
  #
  # To get SSL working, you will need to add the `https` key
  # to your endpoint configuration:
  #
  #     config :hongtion_api, HongtionApiWeb.Endpoint,
  #       https: [
  #         ...,
  #         port: 443,
  #         cipher_suite: :strong,
  #         keyfile: System.get_env("SOME_APP_SSL_KEY_PATH"),
  #         certfile: System.get_env("SOME_APP_SSL_CERT_PATH")
  #       ]
  #
  # The `cipher_suite` is set to `:strong` to support only the
  # latest and more secure SSL ciphers. This means old browsers
  # and clients may not be supported. You can set it to
  # `:compatible` for wider support.
  #
  # `:keyfile` and `:certfile` expect an absolute path to the key
  # and cert in disk or a relative path inside priv, for example
  # "priv/ssl/server.key". For all supported SSL configuration
  # options, see https://hexdocs.pm/plug/Plug.SSL.html#configure/1
  #
  # We also recommend setting `force_ssl` in your config/prod.exs,
  # ensuring no data is ever sent via http, always redirecting to https:
  #
  #     config :hongtion_api, HongtionApiWeb.Endpoint,
  #       force_ssl: [hsts: true]
  #
  # Check `Plug.SSL` for all available options in `force_ssl`.
end
