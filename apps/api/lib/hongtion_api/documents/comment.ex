defmodule HongtionApi.Documents.Comment do
  use Ecto.Schema

  import Ecto.Changeset

  alias HongtionApi.Documents.Block
  alias HongtionApi.Documents.Page

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "comments" do
    belongs_to :page, Page
    belongs_to :block, Block
    field :user_id, :binary_id
    field :content, :string
    field :resolved_at, :utc_datetime
    field :resolved_by, :binary_id

    timestamps(inserted_at: :created_at, type: :utc_datetime)
  end

  def changeset(comment, attrs) do
    comment
    |> cast(attrs, [:page_id, :block_id, :content])
    |> validate_required([:page_id, :content])
    |> validate_length(:content, min: 1, max: 4_000)
  end

  def resolve_changeset(comment, user_id) do
    change(comment, resolved_at: DateTime.utc_now(:second), resolved_by: user_id)
  end
end
