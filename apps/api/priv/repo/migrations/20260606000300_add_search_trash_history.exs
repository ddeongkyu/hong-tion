defmodule HongtionApi.Repo.Migrations.AddSearchTrashHistory do
  use Ecto.Migration

  def up do
    Enum.each(up_statements(), &execute/1)
  end

  def down do
    Enum.each(down_statements(), &execute/1)
  end

  defp up_statements do
    [
      """
      create table if not exists public.page_versions (
        id uuid primary key default gen_random_uuid(),
        page_id uuid not null references public.pages(id) on delete cascade,
        snapshot jsonb not null,
        created_by uuid references auth.users(id) on delete set null,
        created_at timestamptz not null default now()
      )
      """,
      """
      create table if not exists public.page_events (
        id uuid primary key default gen_random_uuid(),
        page_id uuid not null references public.pages(id) on delete cascade,
        actor_id uuid references auth.users(id) on delete set null,
        event_type text not null,
        payload jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      )
      """,
      "create index if not exists pages_workspace_deleted_idx on public.pages(workspace_id, is_deleted, deleted_at)",
      "create index if not exists pages_search_vector_idx on public.pages using gin(search_vector)",
      "create index if not exists blocks_search_vector_idx on public.blocks using gin(search_vector)",
      "create index if not exists page_versions_page_created_idx on public.page_versions(page_id, created_at desc)",
      "create index if not exists page_events_page_created_idx on public.page_events(page_id, created_at desc)"
    ]
  end

  defp down_statements do
    [
      "drop table if exists public.page_events",
      "drop table if exists public.page_versions"
    ]
  end
end
