defmodule HongtionApi.Accounts do
  alias HongtionApi.Accounts.Profile
  alias HongtionApi.Repo

  def get_profile(id) do
    Repo.get(Profile, id)
  end

  def ensure_profile(id) do
    case get_profile(id) do
      %Profile{} = profile ->
        {:ok, profile}

      nil ->
        %Profile{}
        |> Ecto.Changeset.change(%{
          id: id,
          locale: "ko",
          timezone: "Asia/Seoul"
        })
        |> Ecto.Changeset.foreign_key_constraint(:id)
        |> Repo.insert(on_conflict: :nothing)
        |> case do
          {:ok, %Profile{} = profile} -> {:ok, profile}
          {:error, _changeset} -> :error
        end
    end
  end

  def update_profile(id, attrs) do
    with {:ok, profile} <- ensure_profile(id) do
      profile
      |> Profile.changeset(attrs)
      |> Repo.update()
    end
  end
end
