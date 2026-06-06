defmodule HongtionApi.Documents.Notification do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "notifications" do
    field :recipient_id, :binary_id
    field :actor_id, :binary_id
    field :type, :string
    field :payload, :map, default: %{}
    field :read_at, :utc_datetime
    field :created_at, :utc_datetime
  end

  def changeset(notification, attrs) do
    notification
    |> cast(attrs, [:recipient_id, :actor_id, :type, :payload, :read_at])
    |> validate_required([:recipient_id, :type, :payload])
  end

  def read_changeset(notification) do
    change(notification, read_at: DateTime.utc_now(:second))
  end
end
