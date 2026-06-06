defmodule HongtionApi.Fixtures do
  alias Ecto.Adapters.SQL
  alias HongtionApi.Documents
  alias HongtionApi.Repo

  def user_fixture(attrs \\ %{}) do
    attrs = Map.new(attrs)
    id = Map.get(attrs, :id, Ecto.UUID.generate())
    email = Map.get(attrs, :email, "user-#{System.unique_integer([:positive])}@example.com")

    SQL.query!(
      Repo,
      "insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing",
      [Ecto.UUID.dump!(id), email]
    )

    id
  end

  def workspace_fixture(user_id, attrs \\ %{}) do
    attrs =
      Map.merge(
        %{
          "default_locale" => "ko",
          "icon" => "H",
          "name" => "Test workspace"
        },
        stringify_keys(attrs)
      )

    {:ok, workspace} = Documents.create_workspace(attrs, user_id)
    workspace
  end

  def page_fixture(user_id, workspace_id, attrs \\ %{}) do
    attrs =
      Map.merge(
        %{
          "icon" => "문",
          "position" => "000100",
          "title" => "Test page",
          "workspace_id" => workspace_id
        },
        stringify_keys(attrs)
      )

    {:ok, page} = Documents.create_page(attrs, user_id)
    page
  end

  def block_fixture(user_id, page_id, attrs \\ %{}) do
    attrs =
      Map.merge(
        %{
          "content" => %{"text" => "Hello"},
          "page_id" => page_id,
          "position" => "000100",
          "type" => "paragraph"
        },
        stringify_keys(attrs)
      )

    {:ok, block} = Documents.create_block(attrs, user_id)
    block
  end

  defp stringify_keys(attrs) do
    Map.new(attrs, fn
      {key, value} when is_atom(key) -> {Atom.to_string(key), value}
      pair -> pair
    end)
  end
end
