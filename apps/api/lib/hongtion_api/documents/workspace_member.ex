defmodule HongtionApi.Documents.WorkspaceMember do
  use Ecto.Schema

  alias HongtionApi.Documents.Workspace

  @primary_key false
  @foreign_key_type :binary_id

  schema "workspace_members" do
    belongs_to :workspace, Workspace, primary_key: true
    field :user_id, :binary_id, primary_key: true
    field :role, Ecto.Enum, values: [:viewer, :editor, :owner], default: :viewer
    field :joined_at, :utc_datetime
  end
end
