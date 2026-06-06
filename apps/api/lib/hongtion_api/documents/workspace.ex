defmodule HongtionApi.Documents.Workspace do
  use Ecto.Schema

  import Ecto.Changeset

  alias HongtionApi.Documents.Page
  alias HongtionApi.Documents.WorkspaceMember

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "workspaces" do
    field :name, :string
    field :icon, :string
    field :owner_id, :binary_id
    field :default_locale, :string, default: "ko"

    has_many :members, WorkspaceMember
    has_many :pages, Page

    timestamps(inserted_at: :created_at, type: :utc_datetime)
  end

  def changeset(workspace, attrs) do
    workspace
    |> cast(attrs, [:name, :icon, :default_locale])
    |> validate_required([:name])
    |> validate_length(:name, min: 1, max: 120)
    |> validate_inclusion(:default_locale, ["ko", "en", "fr"])
  end
end
