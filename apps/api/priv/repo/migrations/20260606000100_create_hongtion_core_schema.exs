defmodule HongtionApi.Repo.Migrations.CreateHongtionCoreSchema do
  use Ecto.Migration

  def up do
    Enum.each(up_statements(), &execute/1)
  end

  def down do
    Enum.each(down_statements(), &execute/1)
  end

  defp up_statements do
    [
      "create extension if not exists pgcrypto",
      "create schema if not exists auth",
      """
      do $$
      begin
        create table if not exists auth.users (
          id uuid primary key default gen_random_uuid(),
          email text unique,
          created_at timestamptz not null default now()
        );
      exception
        when insufficient_privilege then null;
      end $$
      """,
      """
      do $$
      begin
        create type public.workspace_role as enum ('viewer', 'editor', 'owner');
      exception
        when duplicate_object then null;
      end $$
      """,
      """
      do $$
      begin
        create type public.page_share_scope as enum ('private', 'workspace', 'link');
      exception
        when duplicate_object then null;
      end $$
      """,
      """
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
      end $$
      """,
      """
      create or replace function public.block_plain_text(content jsonb)
      returns text
      language sql
      immutable
      as $$
        select coalesce(content->>'text', '');
      $$
      """,
      """
      create table if not exists public.profiles (
        id uuid primary key references auth.users(id) on delete cascade,
        display_name text,
        avatar_url text,
        locale text not null default 'ko' check (locale in ('ko', 'en', 'fr')),
        timezone text not null default 'Asia/Seoul',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
      """,
      """
      create table if not exists public.workspaces (
        id uuid primary key default gen_random_uuid(),
        name text not null check (char_length(name) between 1 and 120),
        icon text,
        owner_id uuid not null references auth.users(id) on delete restrict,
        default_locale text not null default 'ko' check (default_locale in ('ko', 'en', 'fr')),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
      """,
      """
      create table if not exists public.workspace_members (
        workspace_id uuid not null references public.workspaces(id) on delete cascade,
        user_id uuid not null references auth.users(id) on delete cascade,
        role public.workspace_role not null default 'viewer',
        joined_at timestamptz not null default now(),
        primary key (workspace_id, user_id)
      )
      """,
      """
      create table if not exists public.pages (
        id uuid primary key default gen_random_uuid(),
        workspace_id uuid not null references public.workspaces(id) on delete cascade,
        parent_id uuid references public.pages(id) on delete set null,
        title text not null default '',
        icon text,
        cover_url text,
        position text,
        share_scope public.page_share_scope not null default 'private',
        is_deleted boolean not null default false,
        deleted_at timestamptz,
        created_by uuid not null references auth.users(id) on delete restrict,
        updated_by uuid references auth.users(id) on delete set null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        search_vector tsvector generated always as (
          to_tsvector('simple', coalesce(title, ''))
        ) stored,
        check ((is_deleted = false and deleted_at is null) or (is_deleted = true and deleted_at is not null))
      )
      """,
      """
      create table if not exists public.blocks (
        id uuid primary key default gen_random_uuid(),
        page_id uuid not null references public.pages(id) on delete cascade,
        parent_block_id uuid references public.blocks(id) on delete cascade,
        type public.block_type not null default 'paragraph',
        content jsonb not null default '{}'::jsonb,
        position text,
        created_by uuid references auth.users(id) on delete set null,
        updated_by uuid references auth.users(id) on delete set null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        search_vector tsvector generated always as (
          to_tsvector('simple', public.block_plain_text(content))
        ) stored
      )
      """,
      """
      create table if not exists public.comments (
        id uuid primary key default gen_random_uuid(),
        page_id uuid not null references public.pages(id) on delete cascade,
        block_id uuid references public.blocks(id) on delete cascade,
        user_id uuid not null references auth.users(id) on delete cascade,
        content text not null,
        resolved_at timestamptz,
        resolved_by uuid references auth.users(id) on delete set null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
      """,
      """
      create table if not exists public.notifications (
        id uuid primary key default gen_random_uuid(),
        recipient_id uuid not null references auth.users(id) on delete cascade,
        actor_id uuid references auth.users(id) on delete set null,
        type text not null,
        payload jsonb not null default '{}'::jsonb,
        read_at timestamptz,
        created_at timestamptz not null default now()
      )
      """,
      """
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
      $$
      """,
      "drop trigger if exists on_workspace_created on public.workspaces",
      """
      create trigger on_workspace_created
      after insert on public.workspaces
      for each row execute function public.handle_new_workspace()
      """,
      """
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

        select workspace_id into parent_workspace_id
        from public.pages
        where id = new.parent_id;

        if parent_workspace_id is distinct from new.workspace_id then
          raise exception 'Parent page must belong to the same workspace.';
        end if;

        return new;
      end;
      $$
      """,
      "drop trigger if exists ensure_page_parent_workspace on public.pages",
      """
      create trigger ensure_page_parent_workspace
      before insert or update of parent_id, workspace_id on public.pages
      for each row execute function public.ensure_page_parent_workspace()
      """,
      "create index if not exists workspaces_owner_id_idx on public.workspaces(owner_id)",
      "create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id)",
      "create index if not exists pages_workspace_parent_position_idx on public.pages(workspace_id, parent_id, position)",
      "create index if not exists blocks_page_position_idx on public.blocks(page_id, parent_block_id, position)"
    ]
  end

  defp down_statements do
    [
      "drop trigger if exists ensure_page_parent_workspace on public.pages",
      "drop function if exists public.ensure_page_parent_workspace()",
      "drop trigger if exists on_workspace_created on public.workspaces",
      "drop function if exists public.handle_new_workspace()",
      "drop table if exists public.notifications",
      "drop table if exists public.comments",
      "drop table if exists public.blocks",
      "drop table if exists public.pages",
      "drop table if exists public.workspace_members",
      "drop table if exists public.workspaces",
      "drop table if exists public.profiles",
      "drop function if exists public.block_plain_text(jsonb)",
      "drop type if exists public.block_type",
      "drop type if exists public.page_share_scope",
      "drop type if exists public.workspace_role",
      "drop table if exists auth.users",
      "drop schema if exists auth"
    ]
  end
end
