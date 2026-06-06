defmodule HongtionApiWeb.SearchController do
  use HongtionApiWeb, :controller

  alias HongtionApi.Documents
  alias HongtionApiWeb.DocumentJSON

  def index(conn, %{"workspace_id" => workspace_id} = params) do
    results =
      Documents.search_workspace(
        workspace_id,
        Map.get(params, "q", ""),
        conn.assigns.current_user_id
      )

    json(conn, %{data: Enum.map(results, &DocumentJSON.search_result/1)})
  end
end
