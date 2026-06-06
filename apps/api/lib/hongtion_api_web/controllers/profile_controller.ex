defmodule HongtionApiWeb.ProfileController do
  use HongtionApiWeb, :controller

  alias HongtionApi.Accounts
  alias HongtionApiWeb.DocumentJSON
  alias HongtionApiWeb.ErrorHelpers

  def show(conn, _params) do
    json(conn, %{data: DocumentJSON.profile(conn.assigns.current_profile)})
  end

  def update(conn, params) do
    attrs = Map.get(params, "profile", params)

    case Accounts.update_profile(conn.assigns.current_user_id, attrs) do
      {:ok, profile} ->
        json(conn, %{data: DocumentJSON.profile(profile)})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: ErrorHelpers.changeset_errors(changeset)})
    end
  end
end
