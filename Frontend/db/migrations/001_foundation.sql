create extension if not exists pgcrypto;

create type workspace_role as enum ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER');
create type client_kind as enum ('ORGANIZATION', 'INDIVIDUAL');
create type client_status as enum ('ACTIVE', 'REVIEWING', 'INACTIVE');
create type activity_action as enum ('CREATED', 'UPDATED', 'ARCHIVED', 'STATUS_CHANGED');

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table workspace_memberships (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role workspace_role not null default 'MEMBER',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create table clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 180),
  kind client_kind not null default 'ORGANIZATION',
  email text,
  phone text,
  website text,
  status client_status not null default 'ACTIVE',
  owner_user_id uuid references users(id) on delete set null,
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);
create table activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete restrict,
  actor_user_id uuid references users(id) on delete set null,
  entity_type text not null check (char_length(entity_type) <= 64),
  entity_id uuid not null,
  action activity_action not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index clients_workspace_active_name_idx on clients(workspace_id, name) where archived_at is null;
create index activities_workspace_created_idx on activities(workspace_id, created_at desc);
create index workspace_memberships_user_idx on workspace_memberships(user_id);

create or replace function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger workspaces_updated_at before update on workspaces for each row execute function set_updated_at();
create trigger users_updated_at before update on users for each row execute function set_updated_at();
create trigger clients_updated_at before update on clients for each row execute function set_updated_at();
