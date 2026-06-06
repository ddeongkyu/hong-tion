defmodule HongtionApiWeb.WorkspaceInvitationController do
  use HongtionApiWeb, :controller

  alias HongtionApi.Documents
  alias HongtionApiWeb.DocumentJSON
  alias HongtionApiWeb.ErrorHelpers

  def index(conn, %{"workspace_id" => workspace_id}) do
    invitations = Documents.list_workspace_invitations(workspace_id, conn.assigns.current_user_id)
    json(conn, %{data: Enum.map(invitations, &DocumentJSON.invitation/1)})
  end

  def create(conn, %{"workspace_id" => workspace_id} = params) do
    attrs = Map.get(params, "invitation", params)

    case Documents.invite_workspace_member(workspace_id, attrs, conn.assigns.current_user_id) do
      {:ok, invitation} ->
        conn
        |> put_status(:created)
        |> json(%{data: DocumentJSON.invitation(invitation)})

      {:error, :forbidden} ->
        forbidden(conn)

      {:error, :invalid_role} ->
        invalid_role(conn)

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: ErrorHelpers.changeset_errors(changeset)})
    end
  end

  def accept(conn, %{"token" => token}) do
    case Documents.accept_workspace_invitation(token, conn.assigns.current_user_id) do
      {:ok, invitation} ->
        json(conn, %{data: DocumentJSON.invitation(invitation)})

      {:error, :forbidden} ->
        forbidden(conn)

      {:error, :not_found} ->
        not_found(conn)
    end
  end

  defp forbidden(conn) do
    conn
    |> put_status(:forbidden)
    |> json(%{errors: %{detail: "Forbidden"}})
  end

  defp invalid_role(conn) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: %{role: ["is invalid"]}})
  end

  defp not_found(conn) do
    conn
    |> put_status(:not_found)
    |> json(%{errors: %{detail: "Not found"}})
  end
end
