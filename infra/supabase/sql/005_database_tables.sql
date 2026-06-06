create table if not exists public.document_databases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_page_id uuid references public.pages(id) on delete set null,
  name text not null default '',
  icon text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.database_properties (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.document_databases(id) on delete cascade,
  name text not null,
  type public.database_property_type not null,
  config jsonb not null default '{}'::jsonb,
  position text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.database_records (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.document_databases(id) on delete cascade,
  page_id uuid references public.pages(id) on delete set null,
  title text not null default '',
  position text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title, ''))
  ) stored
);

create table if not exists public.database_property_values (
  record_id uuid not null references public.database_records(id) on delete cascade,
  property_id uuid not null references public.database_properties(id) on delete cascade,
  value jsonb not null default 'null'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (record_id, property_id)
);

create table if not exists public.database_views (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.document_databases(id) on delete cascade,
  name text not null,
  type public.database_view_type not null default 'table',
  config jsonb not null default '{}'::jsonb,
  position text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
