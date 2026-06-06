defmodule HongtionApi.Documents.Page do
  use Ecto.Schema

  import Ecto.Changeset

  alias HongtionApi.Documents.Block
  alias HongtionApi.Documents.Workspace

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "pages" do
    belongs_to :workspace, Workspace
    field :parent_id, :binary_id
    field :title, :string, default: ""
    field :icon, :string
    field :cover_url, :string
    field :position, :string
    field :share_scope, Ecto.Enum, values: [:private, :workspace, :link], default: :private
    field :is_deleted, :boolean, default: false
    field :deleted_at, :utc_datetime
    field :created_by, :binary_id
    field :updated_by, :binary_id

    has_many :blocks, Block

    timestamps(inserted_at: :created_at, type: :utc_datetime)
  end

  def changeset(page, attrs) do
    page
    |> cast(attrs, [:workspace_id, :parent_id, :title, :icon, :cover_url, :position, :share_scope])
    |> validate_required([:workspace_id])
  end

  def soft_delete_changeset(page, user_id) do
    page
    |> change(is_deleted: true, deleted_at: DateTime.utc_now(:second), updated_by: user_id)
  end

  def restore_changeset(page, user_id) do
    page
    |> change(is_deleted: false, deleted_at: nil, updated_by: user_id)
  end
end
