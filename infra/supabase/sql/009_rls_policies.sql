grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

create or replace function public.workspace_role_rank(input_role public.workspace_role)
returns integer
language sql
immutable
as $$
  select case input_role
    when 'viewer' then 10
    when 'editor' then 20
    when 'owner' then 30
    else 0
  end;
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(
  target_workspace_id uuid,
  minimum_role public.workspace_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(public.workspace_role_rank(wm.role)), 0) >= public.workspace_role_rank(minimum_role)
  from public.workspace_members wm
  where wm.workspace_id = target_workspace_id
    and wm.user_id = auth.uid();
$$;

create or replace function public.shares_workspace_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    or exists (
      select 1
      from public.workspace_members mine
      join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
      where mine.user_id = auth.uid()
        and theirs.user_id = target_user_id
    );
$$;

create or replace function public.can_access_page(target_page_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pages p
    where p.id = target_page_id
      and public.is_workspace_member(p.workspace_id)
  );
$$;

create or replace function public.can_edit_page(target_page_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pages p
    where p.id = target_page_id
      and public.has_workspace_role(p.workspace_id, 'editor')
  );
$$;

create or replace function public.can_access_database(target_database_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.document_databases d
    where d.id = target_database_id
      and public.is_workspace_member(d.workspace_id)
  );
$$;

create or replace function public.can_edit_database(target_database_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.document_databases d
    where d.id = target_database_id
      and public.has_workspace_role(d.workspace_id, 'editor')
  );
$$;

create or replace function public.can_access_database_property(target_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.database_properties p
    where p.id = target_property_id
      and public.can_access_database(p.database_id)
  );
$$;

create or replace function public.can_edit_database_property(target_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.database_properties p
    where p.id = target_property_id
      and public.can_edit_database(p.database_id)
  );
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.pages enable row level security;
alter table public.page_favorites enable row level security;
alter table public.page_shares enable row level security;
alter table public.blocks enable row level security;
alter table public.file_assets enable row level security;
alter table public.document_databases enable row level security;
alter table public.database_properties enable row level security;
alter table public.database_records enable row level security;
alter table public.database_property_values enable row level security;
alter table public.database_views enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.page_versions enable row level security;
alter table public.page_events enable row level security;

drop policy if exists "Profiles are visible to shared workspace members" on public.profiles;
create policy "Profiles are visible to shared workspace members"
on public.profiles for select to authenticated
using (public.shares_workspace_with(id));

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert to authenticated
with check (id = auth.uid());

drop policy if exists "Members can view workspaces" on public.workspaces;
create policy "Members can view workspaces"
on public.workspaces for select to authenticated
using (public.is_workspace_member(id));

drop policy if exists "Users can create owned workspaces" on public.workspaces;
create policy "Users can create owned workspaces"
on public.workspaces for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Owners can update workspaces" on public.workspaces;
create policy "Owners can update workspaces"
on public.workspaces for update to authenticated
using (public.has_workspace_role(id, 'owner'))
with check (public.has_workspace_role(id, 'owner'));

drop policy if exists "Owners can delete workspaces" on public.workspaces;
create policy "Owners can delete workspaces"
on public.workspaces for delete to authenticated
using (public.has_workspace_role(id, 'owner'));

drop policy if exists "Members can view memberships" on public.workspace_members;
create policy "Members can view memberships"
on public.workspace_members for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Owners can manage memberships" on public.workspace_members;
create policy "Owners can manage memberships"
on public.workspace_members for all to authenticated
using (public.has_workspace_role(workspace_id, 'owner'))
with check (public.has_workspace_role(workspace_id, 'owner'));

drop policy if exists "Users can leave workspaces" on public.workspace_members;
create policy "Users can leave workspaces"
on public.workspace_members for delete to authenticated
using (user_id = auth.uid() and role <> 'owner');

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

drop policy if exists "Members can view pages" on public.pages;
create policy "Members can view pages"
on public.pages for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Editors can create pages" on public.pages;
create policy "Editors can create pages"
on public.pages for insert to authenticated
with check (public.has_workspace_role(workspace_id, 'editor') and created_by = auth.uid());

drop policy if exists "Editors can update pages" on public.pages;
create policy "Editors can update pages"
on public.pages for update to authenticated
using (public.has_workspace_role(workspace_id, 'editor'))
with check (public.has_workspace_role(workspace_id, 'editor'));

drop policy if exists "Owners can delete pages" on public.pages;
create policy "Owners can delete pages"
on public.pages for delete to authenticated
using (public.has_workspace_role(workspace_id, 'owner'));

drop policy if exists "Users can view own favorites" on public.page_favorites;
create policy "Users can view own favorites"
on public.page_favorites for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create own favorites" on public.page_favorites;
create policy "Users can create own favorites"
on public.page_favorites for insert to authenticated
with check (user_id = auth.uid() and public.can_access_page(page_id));

drop policy if exists "Users can manage own favorites" on public.page_favorites;
create policy "Users can manage own favorites"
on public.page_favorites for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own favorites" on public.page_favorites;
create policy "Users can delete own favorites"
on public.page_favorites for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Editors can manage page shares" on public.page_shares;
create policy "Editors can manage page shares"
on public.page_shares for all to authenticated
using (public.can_edit_page(page_id))
with check (public.can_edit_page(page_id));

drop policy if exists "Members can view page shares" on public.page_shares;
create policy "Members can view page shares"
on public.page_shares for select to authenticated
using (public.can_access_page(page_id));

drop policy if exists "Members can view blocks" on public.blocks;
create policy "Members can view blocks"
on public.blocks for select to authenticated
using (public.can_access_page(page_id));

drop policy if exists "Editors can create blocks" on public.blocks;
create policy "Editors can create blocks"
on public.blocks for insert to authenticated
with check (public.can_edit_page(page_id));

drop policy if exists "Editors can update blocks" on public.blocks;
create policy "Editors can update blocks"
on public.blocks for update to authenticated
using (public.can_edit_page(page_id))
with check (public.can_edit_page(page_id));

drop policy if exists "Editors can delete blocks" on public.blocks;
create policy "Editors can delete blocks"
on public.blocks for delete to authenticated
using (public.can_edit_page(page_id));

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

drop policy if exists "Members can view document databases" on public.document_databases;
create policy "Members can view document databases"
on public.document_databases for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Editors can manage document databases" on public.document_databases;
create policy "Editors can manage document databases"
on public.document_databases for all to authenticated
using (public.has_workspace_role(workspace_id, 'editor'))
with check (public.has_workspace_role(workspace_id, 'editor'));

drop policy if exists "Members can view database properties" on public.database_properties;
create policy "Members can view database properties"
on public.database_properties for select to authenticated
using (public.can_access_database(database_id));

drop policy if exists "Editors can manage database properties" on public.database_properties;
create policy "Editors can manage database properties"
on public.database_properties for all to authenticated
using (public.can_edit_database(database_id))
with check (public.can_edit_database(database_id));

drop policy if exists "Members can view database records" on public.database_records;
create policy "Members can view database records"
on public.database_records for select to authenticated
using (public.can_access_database(database_id));

drop policy if exists "Editors can manage database records" on public.database_records;
create policy "Editors can manage database records"
on public.database_records for all to authenticated
using (public.can_edit_database(database_id))
with check (public.can_edit_database(database_id));

drop policy if exists "Members can view property values" on public.database_property_values;
create policy "Members can view property values"
on public.database_property_values for select to authenticated
using (public.can_access_database_property(property_id));

drop policy if exists "Editors can manage property values" on public.database_property_values;
create policy "Editors can manage property values"
on public.database_property_values for all to authenticated
using (public.can_edit_database_property(property_id))
with check (public.can_edit_database_property(property_id));

drop policy if exists "Members can view database views" on public.database_views;
create policy "Members can view database views"
on public.database_views for select to authenticated
using (public.can_access_database(database_id));

drop policy if exists "Editors can manage database views" on public.database_views;
create policy "Editors can manage database views"
on public.database_views for all to authenticated
using (public.can_edit_database(database_id))
with check (public.can_edit_database(database_id));

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

drop policy if exists "Authors and editors can delete comments" on public.comments;
create policy "Authors and editors can delete comments"
on public.comments for delete to authenticated
using (user_id = auth.uid() or public.can_edit_page(page_id));

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
on public.notifications for select to authenticated
using (recipient_id = auth.uid());

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications for update to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
on public.notifications for delete to authenticated
using (recipient_id = auth.uid());

drop policy if exists "Authenticated users can create actor notifications" on public.notifications;
create policy "Authenticated users can create actor notifications"
on public.notifications for insert to authenticated
with check (actor_id = auth.uid());

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
