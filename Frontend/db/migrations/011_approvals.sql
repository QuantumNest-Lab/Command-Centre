create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete restrict,
  client_id uuid not null references clients(id) on delete restrict,
  project_id uuid references projects(id) on delete set null,
  title text not null check (char_length(title) between 2 and 240),
  status text not null default 'REQUESTED' check (status in ('DRAFT', 'REQUESTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'CANCELLED')),
  requested_by_user_id uuid not null references users(id) on delete restrict,
  decided_by_user_id uuid references users(id) on delete set null,
  decided_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists approvals_workspace_active_idx on approvals(workspace_id, updated_at desc) where archived_at is null;
drop trigger if exists approvals_updated_at on approvals;
create trigger approvals_updated_at before update on approvals for each row execute function set_updated_at();
