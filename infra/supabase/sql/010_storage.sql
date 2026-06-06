insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('workspace-files', 'workspace-files', false, 52428800, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.workspace_id_from_storage_name(object_name text)
returns uuid
language sql
immutable
as $$
  select public.try_uuid((storage.foldername(object_name))[1]);
$$;

create or replace function public.user_id_from_storage_name(object_name text)
returns uuid
language sql
immutable
as $$
  select public.try_uuid((storage.foldername(object_name))[1]);
$$;

drop policy if exists "Anyone can read avatars" on storage.objects;
create policy "Anyone can read avatars"
on storage.objects for select to anon, authenticated
using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and public.user_id_from_storage_name(name) = auth.uid()
);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and public.user_id_from_storage_name(name) = auth.uid()
)
with check (
  bucket_id = 'avatars'
  and public.user_id_from_storage_name(name) = auth.uid()
);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and public.user_id_from_storage_name(name) = auth.uid()
);

drop policy if exists "Workspace members can read workspace files" on storage.objects;
create policy "Workspace members can read workspace files"
on storage.objects for select to authenticated
using (
  bucket_id = 'workspace-files'
  and public.is_workspace_member(public.workspace_id_from_storage_name(name))
);

drop policy if exists "Workspace editors can upload workspace files" on storage.objects;
create policy "Workspace editors can upload workspace files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'workspace-files'
  and public.has_workspace_role(public.workspace_id_from_storage_name(name), 'editor')
);

drop policy if exists "Workspace editors can update workspace files" on storage.objects;
create policy "Workspace editors can update workspace files"
on storage.objects for update to authenticated
using (
  bucket_id = 'workspace-files'
  and public.has_workspace_role(public.workspace_id_from_storage_name(name), 'editor')
)
with check (
  bucket_id = 'workspace-files'
  and public.has_workspace_role(public.workspace_id_from_storage_name(name), 'editor')
);

drop policy if exists "Workspace editors can delete workspace files" on storage.objects;
create policy "Workspace editors can delete workspace files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'workspace-files'
  and public.has_workspace_role(public.workspace_id_from_storage_name(name), 'editor')
);
