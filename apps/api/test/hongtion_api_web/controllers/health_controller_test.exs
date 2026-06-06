defmodule HongtionApiWeb.HealthControllerTest do
  use ExUnit.Case, async: true

  import Phoenix.ConnTest

  @endpoint HongtionApiWeb.Endpoint

  test "renders health status" do
    conn = get(build_conn(), "/api/health")

    assert json_response(conn, 200) == %{
             "service" => "hongtion_api",
             "status" => "ok",
             "version" => "0.1.0"
           }
  end
end
