defmodule HongtionApi.Documents.PageVersion do
  use Ecto.Schema

  import Ecto.Changeset

  alias HongtionApi.Documents.Page

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "page_versions" do
    belongs_to :page, Page
    field :snapshot, :map
    field :created_by, :binary_id

    timestamps(inserted_at: :created_at, updated_at: false, type: :utc_datetime)
  end

  def changeset(page_version, attrs) do
    page_version
    |> cast(attrs, [:page_id, :snapshot, :created_by])
    |> validate_required([:page_id, :snapshot])
  end
end
