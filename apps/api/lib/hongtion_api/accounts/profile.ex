defmodule HongtionApi.Accounts.Profile do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: false}
  @foreign_key_type :binary_id

  schema "profiles" do
    field :display_name, :string
    field :avatar_url, :string
    field :locale, :string
    field :timezone, :string

    timestamps(inserted_at: :created_at, type: :utc_datetime)
  end

  def changeset(profile, attrs) do
    profile
    |> cast(attrs, [:display_name, :avatar_url, :locale, :timezone])
    |> update_change(:display_name, &trim_to_nil/1)
    |> validate_length(:display_name, max: 80)
    |> validate_length(:avatar_url, max: 500)
    |> validate_length(:locale, max: 12)
    |> validate_length(:timezone, max: 80)
  end

  defp trim_to_nil(value) when is_binary(value) do
    case String.trim(value) do
      "" -> nil
      trimmed -> trimmed
    end
  end

  defp trim_to_nil(value), do: value
end
