defmodule HongtionApi.Repo.Migrations.AddAlphaSafetyGuards do
  use Ecto.Migration

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

  def up do
    execute("""
    do $$
    begin
      if not exists (
        select 1 from pg_constraint where conname = 'file_assets_size_limit_check'
      ) then
        alter table public.file_assets
        add constraint file_assets_size_limit_check
        check (size_bytes is null or size_bytes <= #{@max_file_size});
      end if;

      if not exists (
        select 1 from pg_constraint where conname = 'file_assets_mime_type_check'
      ) then
        alter table public.file_assets
        add constraint file_assets_mime_type_check
        check (
          mime_type is null or mime_type = any (
            array[#{allowed_mime_sql()}]::text[]
          )
        );
      end if;
    end $$
    """)
  end

  def down do
    execute(
      "alter table public.file_assets drop constraint if exists file_assets_mime_type_check"
    )

    execute(
      "alter table public.file_assets drop constraint if exists file_assets_size_limit_check"
    )
  end

  defp allowed_mime_sql do
    @allowed_mime_types
    |> Enum.map(&"'#{&1}'")
    |> Enum.join(", ")
  end
end
