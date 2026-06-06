create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (workspace_id, user_id) do update set role = 'owner';

  return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
after insert on public.workspaces
for each row execute function public.handle_new_workspace();

create or replace function public.ensure_page_parent_workspace()
returns trigger
language plpgsql
as $$
declare
  parent_workspace_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'A page cannot be its own parent.';
  end if;

  select workspace_id into parent_workspace_id
  from public.pages
  where id = new.parent_id;

  if parent_workspace_id is distinct from new.workspace_id then
    raise exception 'Parent page must belong to the same workspace.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_page_parent_workspace on public.pages;
create trigger ensure_page_parent_workspace
before insert or update of parent_id, workspace_id on public.pages
for each row execute function public.ensure_page_parent_workspace();

create or replace function public.ensure_block_parent_page()
returns trigger
language plpgsql
as $$
declare
  parent_page_id uuid;
begin
  if new.parent_block_id is null then
    return new;
  end if;

  if new.parent_block_id = new.id then
    raise exception 'A block cannot be its own parent.';
  end if;

  select page_id into parent_page_id
  from public.blocks
  where id = new.parent_block_id;

  if parent_page_id is distinct from new.page_id then
    raise exception 'Parent block must belong to the same page.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_block_parent_page on public.blocks;
create trigger ensure_block_parent_page
before insert or update of parent_block_id, page_id on public.blocks
for each row execute function public.ensure_block_parent_page();

create or replace function public.ensure_comment_block_page()
returns trigger
language plpgsql
as $$
declare
  block_page_id uuid;
begin
  if new.block_id is null then
    return new;
  end if;

  select page_id into block_page_id
  from public.blocks
  where id = new.block_id;

  if block_page_id is distinct from new.page_id then
    raise exception 'Comment block must belong to the same page.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_comment_block_page on public.comments;
create trigger ensure_comment_block_page
before insert or update of block_id, page_id on public.comments
for each row execute function public.ensure_comment_block_page();

create or replace function public.ensure_database_source_page()
returns trigger
language plpgsql
as $$
declare
  source_workspace_id uuid;
begin
  if new.source_page_id is null then
    return new;
  end if;

  select workspace_id into source_workspace_id
  from public.pages
  where id = new.source_page_id;

  if source_workspace_id is distinct from new.workspace_id then
    raise exception 'Database source page must belong to the same workspace.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_database_source_page on public.document_databases;
create trigger ensure_database_source_page
before insert or update of source_page_id, workspace_id on public.document_databases
for each row execute function public.ensure_database_source_page();

create or replace function public.ensure_database_record_page()
returns trigger
language plpgsql
as $$
declare
  database_workspace_id uuid;
  page_workspace_id uuid;
begin
  if new.page_id is null then
    return new;
  end if;

  select workspace_id into database_workspace_id
  from public.document_databases
  where id = new.database_id;

  select workspace_id into page_workspace_id
  from public.pages
  where id = new.page_id;

  if page_workspace_id is distinct from database_workspace_id then
    raise exception 'Database record page must belong to the same workspace.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_database_record_page on public.database_records;
create trigger ensure_database_record_page
before insert or update of database_id, page_id on public.database_records
for each row execute function public.ensure_database_record_page();

create or replace function public.ensure_property_value_database()
returns trigger
language plpgsql
as $$
declare
  record_database_id uuid;
  property_database_id uuid;
begin
  select database_id into record_database_id
  from public.database_records
  where id = new.record_id;

  select database_id into property_database_id
  from public.database_properties
  where id = new.property_id;

  if property_database_id is distinct from record_database_id then
    raise exception 'Property value must use a property from the same database as the record.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_property_value_database on public.database_property_values;
create trigger ensure_property_value_database
before insert or update of record_id, property_id on public.database_property_values
for each row execute function public.ensure_property_value_database();

create or replace function public.ensure_file_asset_scope()
returns trigger
language plpgsql
as $$
declare
  linked_page_workspace_id uuid;
  linked_block_workspace_id uuid;
begin
  if new.page_id is not null then
    select workspace_id into linked_page_workspace_id
    from public.pages
    where id = new.page_id;

    if linked_page_workspace_id is distinct from new.workspace_id then
      raise exception 'File page must belong to the same workspace.';
    end if;
  end if;

  if new.block_id is not null then
    select p.workspace_id into linked_block_workspace_id
    from public.blocks b
    join public.pages p on p.id = b.page_id
    where b.id = new.block_id;

    if linked_block_workspace_id is distinct from new.workspace_id then
      raise exception 'File block must belong to the same workspace.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_file_asset_scope on public.file_assets;
create trigger ensure_file_asset_scope
before insert or update of workspace_id, page_id, block_id on public.file_assets
for each row execute function public.ensure_file_asset_scope();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'workspaces',
    'workspace_invitations',
    'pages',
    'page_shares',
    'blocks',
    'file_assets',
    'document_databases',
    'database_properties',
    'database_records',
    'database_property_values',
    'database_views',
    'comments'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', 'set_' || table_name || '_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      'set_' || table_name || '_updated_at',
      table_name
    );
  end loop;
end $$;
