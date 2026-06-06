-- Hong-tion MVP collaboration patch.
-- Safe to rerun after 001-010; fills in the tables/policies used by the current app UI.

begin;

do $$
begin
  create type public.workspace_invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.file_asset_status as enum ('uploading', 'uploaded', 'failed', 'deleted');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'viewer',
  status public.workspace_invitation_status not null default 'pending',
  invite_token text not null default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invite_token)
);

create table if not exists public.file_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  page_id uuid references public.pages(id) on delete set null,
  block_id uuid references public.blocks(id) on delete set null,
  storage_bucket text not null,
  storage_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  status public.file_asset_status not null default 'uploaded',
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

alter table public.comments
add column if not exists search_vector tsvector generated always as (
  to_tsvector('simple', coalesce(content, ''))
) stored;

create index if not exists workspace_invitations_workspace_status_idx
on public.workspace_invitations (workspace_id, status);

create index if not exists workspace_invitations_email_idx
on public.workspace_invitations (lower(email));

create index if not exists file_assets_workspace_idx
on public.file_assets (workspace_id, page_id, block_id);

create index if not exists comments_page_block_idx
on public.comments (page_id, block_id);

create index if not exists comments_unresolved_idx
on public.comments (page_id)
where resolved_at is null;

create index if not exists comments_search_vector_idx
on public.comments using gin (search_vector);

create index if not exists notifications_recipient_unread_idx
on public.notifications (recipient_id, created_at desc)
where read_at is null;

alter table public.workspace_invitations enable row level security;
alter table public.file_assets enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Editors can view invitations" on public.workspace_invitations;
create policy "Editors can view invitations"
on public.workspace_invitations for select to authenticated
using (public.has_workspace_role(workspace_id, 'editor'));

drop policy if exists "Editors can create invitations" on public.workspace_invitations;
create policy "Editors can create invitations"
on public.workspace_invitations for insert to authenticated
with check (public.has_workspace_role(workspace_id, 'editor') and invited_by = auth.uid());

drop policy if exists "Editors can update invitations" on public.workspace_invitations;
create policy "Editors can update invitations"
on public.workspace_invitations for update to authenticated
using (public.has_workspace_role(workspace_id, 'editor'))
with check (public.has_workspace_role(workspace_id, 'editor'));

drop policy if exists "Members can view files" on public.file_assets;
create policy "Members can view files"
on public.file_assets for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Editors can create files" on public.file_assets;
create policy "Editors can create files"
on public.file_assets for insert to authenticated
with check (public.has_workspace_role(workspace_id, 'editor') and uploaded_by = auth.uid());

drop policy if exists "Editors can update files" on public.file_assets;
create policy "Editors can update files"
on public.file_assets for update to authenticated
using (public.has_workspace_role(workspace_id, 'editor'))
with check (public.has_workspace_role(workspace_id, 'editor'));

drop policy if exists "Editors can delete files" on public.file_assets;
create policy "Editors can delete files"
on public.file_assets for delete to authenticated
using (public.has_workspace_role(workspace_id, 'editor'));

drop policy if exists "Members can view comments" on public.comments;
create policy "Members can view comments"
on public.comments for select to authenticated
using (public.can_access_page(page_id));

drop policy if exists "Members can create comments" on public.comments;
create policy "Members can create comments"
on public.comments for insert to authenticated
with check (public.can_access_page(page_id) and user_id = auth.uid());

drop policy if exists "Authors and editors can update comments" on public.comments;
create policy "Authors and editors can update comments"
on public.comments for update to authenticated
using (user_id = auth.uid() or public.can_edit_page(page_id))
with check (user_id = auth.uid() or public.can_edit_page(page_id));

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
on public.notifications for select to authenticated
using (recipient_id = auth.uid());

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications for update to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

commit;
