defmodule HongtionApi.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      HongtionApiWeb.Telemetry,
      HongtionApi.Repo,
      {DNSCluster, query: Application.get_env(:hongtion_api, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: HongtionApi.PubSub},
      HongtionApiWeb.Presence,
      # Start a worker by calling: HongtionApi.Worker.start_link(arg)
      # {HongtionApi.Worker, arg},
      # Start to serve requests, typically the last entry
      HongtionApiWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: HongtionApi.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    HongtionApiWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
