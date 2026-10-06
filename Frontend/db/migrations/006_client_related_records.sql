create table requirements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete restrict,
  client_id uuid not null references clients(id) on delete restrict,
  project_id uuid references projects(id) on delete set null,
  title text not null check (char_length(title) between 2 and 240),
  status text not null default 'REQUESTED',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete restrict,
  client_id uuid not null references clients(id) on delete restrict,
  project_id uuid references projects(id) on delete set null,
  title text not null check (char_length(title) between 2 and 240),
  status text not null default 'TODO',
  due_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete restrict,
  client_id uuid not null references clients(id) on delete restrict,
  project_id uuid references projects(id) on delete set null,
  title text not null check (char_length(title) between 2 and 240),
  status text not null default 'SCHEDULED',
  starts_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete restrict,
  client_id uuid not null references clients(id) on delete restrict,
  project_id uuid references projects(id) on delete set null,
  title text not null check (char_length(title) between 2 and 240),
  document_type text not null,
  status text not null default 'DRAFT',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table finance_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete restrict,
  client_id uuid not null references clients(id) on delete restrict,
  project_id uuid references projects(id) on delete set null,
  title text not null check (char_length(title) between 2 and 240),
  record_type text not null,
  status text not null default 'DRAFT',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index requirements_client_active_idx on requirements(workspace_id, client_id, updated_at desc) where archived_at is null;
create index tasks_client_active_idx on tasks(workspace_id, client_id, updated_at desc) where archived_at is null;
create index meetings_client_active_idx on meetings(workspace_id, client_id, starts_at desc) where archived_at is null;
create index documents_client_active_idx on documents(workspace_id, client_id, updated_at desc) where archived_at is null;
create index finance_records_client_active_idx on finance_records(workspace_id, client_id, updated_at desc) where archived_at is null;

create trigger requirements_updated_at before update on requirements for each row execute function set_updated_at();
create trigger tasks_updated_at before update on tasks for each row execute function set_updated_at();
create trigger meetings_updated_at before update on meetings for each row execute function set_updated_at();
create trigger documents_updated_at before update on documents for each row execute function set_updated_at();
create trigger finance_records_updated_at before update on finance_records for each row execute function set_updated_at();
