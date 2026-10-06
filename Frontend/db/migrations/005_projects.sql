create type project_status as enum ('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
create type project_priority as enum ('LOW', 'NORMAL', 'HIGH', 'URGENT');

create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete restrict,
  client_id uuid not null references clients(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 180),
  project_code text,
  project_type text,
  description text,
  start_date date not null,
  target_end_date date not null check (target_end_date >= start_date),
  estimated_duration text,
  status project_status not null default 'PLANNED',
  owner_user_id uuid not null references users(id) on delete restrict,
  priority project_priority not null default 'NORMAL',
  tags text[] not null default '{}',
  budget numeric(14,2),
  currency text not null default 'INR',
  notes text,
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name),
  unique (workspace_id, project_code)
);
create index projects_workspace_active_idx on projects(workspace_id, updated_at desc) where archived_at is null;
create trigger projects_updated_at before update on projects for each row execute function set_updated_at();
