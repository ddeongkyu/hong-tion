do $$
begin
  create type public.workspace_role as enum ('viewer', 'editor', 'owner');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.workspace_invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.page_share_scope as enum ('private', 'workspace', 'link');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.page_share_role as enum ('viewer', 'editor');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.block_type as enum (
    'paragraph',
    'heading_1',
    'heading_2',
    'heading_3',
    'bulleted_list',
    'numbered_list',
    'checklist',
    'quote',
    'code',
    'image',
    'file',
    'divider',
    'callout',
    'toggle',
    'equation',
    'embed',
    'database'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.database_view_type as enum ('table', 'board', 'gallery', 'calendar', 'list');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.database_property_type as enum (
    'text',
    'number',
    'date',
    'checkbox',
    'select',
    'multi_select',
    'relation',
    'formula',
    'file',
    'user',
    'url',
    'email',
    'phone'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.file_asset_status as enum ('uploading', 'uploaded', 'failed', 'deleted');
exception
  when duplicate_object then null;
end $$;
