defmodule HongtionApiWeb.HealthController do
  use HongtionApiWeb, :controller

  alias HongtionApi.Repo

  def show(conn, _params) do
    json(conn, %{
      status: "ok",
      service: "hongtion_api",
      version: "0.1.0"
    })
  end

  def db(conn, _params) do
    case Repo.query("select current_database(), current_schema(), now()", [], timeout: 5_000) do
      {:ok, %{rows: [[database, schema, checked_at]]}} ->
        json(conn, %{
          status: "ok",
          database: database,
          schema: schema,
          checked_at: checked_at |> NaiveDateTime.to_iso8601()
        })

      {:error, error} ->
        conn
        |> put_status(:service_unavailable)
        |> json(%{
          status: "error",
          reason: Exception.message(error)
        })
    end
  end
end
