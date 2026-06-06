create table if not exists public.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.page_events (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pages_workspace_deleted_idx
on public.pages (workspace_id, is_deleted, deleted_at);

create index if not exists pages_search_vector_idx
on public.pages using gin (search_vector);

create index if not exists blocks_search_vector_idx
on public.blocks using gin (search_vector);

create index if not exists page_versions_page_created_idx
on public.page_versions (page_id, created_at desc);

create index if not exists page_events_page_created_idx
on public.page_events (page_id, created_at desc);

alter table public.page_versions enable row level security;
alter table public.page_events enable row level security;

drop policy if exists "Members can view page versions" on public.page_versions;
create policy "Members can view page versions"
on public.page_versions for select to authenticated
using (public.can_access_page(page_id));

drop policy if exists "Editors can create page versions" on public.page_versions;
create policy "Editors can create page versions"
on public.page_versions for insert to authenticated
with check (public.can_edit_page(page_id));

drop policy if exists "Members can view page events" on public.page_events;
create policy "Members can view page events"
on public.page_events for select to authenticated
using (public.can_access_page(page_id));

drop policy if exists "Editors can create page events" on public.page_events;
create policy "Editors can create page events"
on public.page_events for insert to authenticated
with check (public.can_edit_page(page_id));
