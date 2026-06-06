create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  locale text not null default 'ko' check (locale in ('ko', 'en', 'fr')),
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  icon text,
  owner_id uuid not null references auth.users(id) on delete restrict,
  default_locale text not null default 'ko' check (default_locale in ('ko', 'en', 'fr')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'viewer',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email citext not null,
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
);

create table if not exists public.page_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id uuid not null references public.pages(id) on delete cascade,
  position text,
  created_at timestamptz not null default now(),
  primary key (user_id, page_id)
);

create table if not exists public.page_shares (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  role public.page_share_role not null default 'viewer',
  token text not null default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token)
);

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
