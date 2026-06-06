defmodule HongtionApi.Repo.Migrations.AddCollaborationInvitesAndFiles do
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
      do $$
      begin
        create type public.workspace_invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
      exception
        when duplicate_object then null;
      end $$
      """,
      """
      do $$
      begin
        create type public.file_asset_status as enum ('uploading', 'uploaded', 'failed', 'deleted');
      exception
        when duplicate_object then null;
      end $$
      """,
      """
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
      )
      """,
      """
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
      )
      """,
      """
      alter table public.comments
      add column if not exists search_vector tsvector generated always as (
        to_tsvector('simple', coalesce(content, ''))
      ) stored
      """,
      """
      create or replace function public.set_updated_at()
      returns trigger
      language plpgsql
      as $$
      begin
        new.updated_at = now();
        return new;
      end;
      $$
      """,
      """
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
      $$
      """,
      "drop trigger if exists ensure_comment_block_page on public.comments",
      """
      create trigger ensure_comment_block_page
      before insert or update of block_id, page_id on public.comments
      for each row execute function public.ensure_comment_block_page()
      """,
      """
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
      $$
      """,
      "drop trigger if exists ensure_file_asset_scope on public.file_assets",
      """
      create trigger ensure_file_asset_scope
      before insert or update of workspace_id, page_id, block_id on public.file_assets
      for each row execute function public.ensure_file_asset_scope()
      """,
      """
      do $$
      declare
        table_name text;
      begin
        foreach table_name in array array[
          'profiles',
          'workspaces',
          'workspace_invitations',
          'pages',
          'blocks',
          'file_assets',
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
      end $$
      """,
      "create index if not exists workspace_invitations_workspace_status_idx on public.workspace_invitations(workspace_id, status)",
      "create index if not exists workspace_invitations_email_idx on public.workspace_invitations(lower(email))",
      "create index if not exists file_assets_workspace_idx on public.file_assets(workspace_id, page_id, block_id)",
      "create index if not exists comments_page_block_idx on public.comments(page_id, block_id)",
      "create index if not exists comments_unresolved_idx on public.comments(page_id) where resolved_at is null",
      "create index if not exists comments_search_vector_idx on public.comments using gin(search_vector)",
      "create index if not exists notifications_recipient_unread_idx on public.notifications(recipient_id, created_at desc) where read_at is null"
    ]
  end

  defp down_statements do
    [
      "drop trigger if exists ensure_file_asset_scope on public.file_assets",
      "drop function if exists public.ensure_file_asset_scope()",
      "drop trigger if exists ensure_comment_block_page on public.comments",
      "drop function if exists public.ensure_comment_block_page()",
      "drop table if exists public.file_assets",
      "drop table if exists public.workspace_invitations",
      "drop type if exists public.file_asset_status",
      "drop type if exists public.workspace_invitation_status"
    ]
  end
end
