defmodule HongtionApi.Documents.WorkspaceInvitation do
  use Ecto.Schema

  import Ecto.Changeset

  alias HongtionApi.Documents.Workspace

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "workspace_invitations" do
    belongs_to :workspace, Workspace
    field :email, :string
    field :role, Ecto.Enum, values: [:viewer, :editor, :owner], default: :viewer
    field :status, Ecto.Enum, values: [:pending, :accepted, :revoked, :expired], default: :pending
    field :invite_token, :string
    field :invited_by, :binary_id
    field :accepted_by, :binary_id
    field :expires_at, :utc_datetime

    timestamps(inserted_at: :created_at, type: :utc_datetime)
  end

  def changeset(invitation, attrs) do
    invitation
    |> cast(attrs, [
      :workspace_id,
      :email,
      :role,
      :status,
      :invite_token,
      :invited_by,
      :accepted_by,
      :expires_at
    ])
    |> put_invite_token()
    |> validate_required([:workspace_id, :email, :role, :invite_token, :invited_by])
    |> validate_format(:email, ~r/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    |> update_change(:email, &String.downcase/1)
    |> unique_constraint(:invite_token)
  end

  def accept_changeset(invitation, user_id) do
    invitation
    |> change(status: :accepted, accepted_by: user_id)
  end

  defp put_invite_token(changeset) do
    case get_field(changeset, :invite_token) do
      token when is_binary(token) and token != "" -> changeset
      _ -> put_change(changeset, :invite_token, generate_invite_token())
    end
  end

  defp generate_invite_token do
    24
    |> :crypto.strong_rand_bytes()
    |> Base.url_encode64(padding: false)
  end
end
