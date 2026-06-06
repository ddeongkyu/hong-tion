defmodule HongtionApi.Documents.FileAsset do
  use Ecto.Schema

  import Ecto.Changeset

  alias HongtionApi.Documents.Block
  alias HongtionApi.Documents.Page
  alias HongtionApi.Documents.Workspace

  @max_file_size 10 * 1024 * 1024
  @allowed_mime_types [
    "application/json",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/csv",
    "text/markdown",
    "text/plain"
  ]

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "file_assets" do
    belongs_to :workspace, Workspace
    belongs_to :page, Page
    belongs_to :block, Block
    field :storage_bucket, :string
    field :storage_path, :string
    field :original_name, :string
    field :mime_type, :string
    field :size_bytes, :integer

    field :status, Ecto.Enum,
      values: [:uploading, :uploaded, :failed, :deleted],
      default: :uploaded

    field :uploaded_by, :binary_id

    timestamps(inserted_at: :created_at, type: :utc_datetime)
  end

  def changeset(file_asset, attrs) do
    file_asset
    |> cast(attrs, [
      :workspace_id,
      :page_id,
      :block_id,
      :storage_bucket,
      :storage_path,
      :original_name,
      :mime_type,
      :size_bytes,
      :status
    ])
    |> validate_required([:workspace_id, :storage_bucket, :storage_path, :original_name])
    |> validate_number(:size_bytes,
      greater_than_or_equal_to: 0,
      less_than_or_equal_to: @max_file_size
    )
    |> validate_inclusion(:mime_type, @allowed_mime_types)
  end
end
