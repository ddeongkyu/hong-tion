defmodule HongtionApiWeb.CORS do
  @moduledoc false

  @local_origins ["http://localhost:3000", "http://127.0.0.1:3000"]

  def allowed_origins(_conn) do
    Application.get_env(:hongtion_api, :cors_origins, @local_origins)
  end
end
