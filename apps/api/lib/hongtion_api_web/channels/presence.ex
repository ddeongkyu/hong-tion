defmodule HongtionApiWeb.Presence do
  use Phoenix.Presence,
    otp_app: :hongtion_api,
    pubsub_server: HongtionApi.PubSub
end
