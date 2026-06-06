defmodule HongtionApi.Repo do
  use Ecto.Repo,
    otp_app: :hongtion_api,
    adapter: Ecto.Adapters.Postgres
end
