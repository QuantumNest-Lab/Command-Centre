-- Database-backed workspace access control. Safe to apply after 001_foundation.sql.
do $$ begin create type account_status as enum ('ACTIVE', 'DISABLED'); exception when duplicate_object then null; end $$;
do $$ begin create type membership_status as enum ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED'); exception when duplicate_object then null; end $$;

alter table users add column if not exists first_name text;
alter table users add column if not exists last_name text;
alter table users add column if not exists display_name text;
alter table users add column if not exists avatar_url text;
alter table users add column if not exists account_status account_status not null default 'ACTIVE';
alter table users add column if not exists last_login_at timestamptz;

alter table workspace_memberships add column if not exists id uuid default gen_random_uuid();
alter table workspace_memberships add column if not exists status membership_status not null default 'ACTIVE';
alter table workspace_memberships add column if not exists joined_at timestamptz;
alter table workspace_memberships add column if not exists invited_at timestamptz;
alter table workspace_memberships add column if not exists invited_by_user_id uuid references users(id) on delete set null;
alter table workspace_memberships add column if not exists updated_at timestamptz not null default now();
update workspace_memberships set id = gen_random_uuid() where id is null;
update workspace_memberships set joined_at = coalesce(joined_at, created_at) where status = 'ACTIVE';
alter table workspace_memberships alter column id set not null;
create unique index if not exists workspace_memberships_id_unique on workspace_memberships(id);
create index if not exists workspace_memberships_workspace_status_idx on workspace_memberships(workspace_id, status);
drop trigger if exists workspace_memberships_updated_at on workspace_memberships;
create trigger workspace_memberships_updated_at before update on workspace_memberships for each row execute function set_updated_at();

create table if not exists workspace_invitations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null, role workspace_role not null, token_hash text not null unique,
  invited_by_user_id uuid not null references users(id) on delete restrict,
  expires_at timestamptz not null, accepted_at timestamptz, revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists workspace_invitations_lookup_idx on workspace_invitations(workspace_id, lower(email)) where accepted_at is null and revoked_at is null;
