defmodule HongtionApi.Documents.Block do
  use Ecto.Schema

  import Ecto.Changeset

  alias HongtionApi.Documents.Page

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @block_types [
    :paragraph,
    :heading_1,
    :heading_2,
    :heading_3,
    :bulleted_list,
    :numbered_list,
    :checklist,
    :quote,
    :code,
    :image,
    :file,
    :divider,
    :callout,
    :toggle,
    :equation,
    :embed,
    :database
  ]

  schema "blocks" do
    belongs_to :page, Page
    field :parent_block_id, :binary_id
    field :type, Ecto.Enum, values: @block_types, default: :paragraph
    field :content, :map, default: %{}
    field :position, :string
    field :created_by, :binary_id
    field :updated_by, :binary_id

    timestamps(inserted_at: :created_at, type: :utc_datetime)
  end

  def changeset(block, attrs) do
    block
    |> cast(attrs, [:page_id, :parent_block_id, :type, :content, :position])
    |> validate_required([:page_id, :type, :content])
  end
end
