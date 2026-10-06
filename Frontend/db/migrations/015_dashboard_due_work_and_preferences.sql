-- Dashboard operational-work foundation. These dates are explicit commitments,
-- not inferred from updated_at or created_at.
alter table requirements add column if not exists due_at timestamptz;
alter table documents add column if not exists due_at timestamptz;
alter table finance_records add column if not exists due_at timestamptz;
alter table approvals add column if not exists due_at timestamptz;

create index if not exists requirements_due_active_idx on requirements(workspace_id, due_at) where archived_at is null and due_at is not null;
create index if not exists documents_due_active_idx on documents(workspace_id, due_at) where archived_at is null and due_at is not null;
create index if not exists finance_records_due_active_idx on finance_records(workspace_id, due_at) where archived_at is null and due_at is not null;
create index if not exists approvals_due_active_idx on approvals(workspace_id, due_at) where archived_at is null and due_at is not null;

create table if not exists dashboard_preferences (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  scope text not null default 'WORKSPACE' check (scope in ('WORKSPACE', 'MINE')),
  panel_order jsonb not null default '["attention", "activity", "due"]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

drop trigger if exists dashboard_preferences_updated_at on dashboard_preferences;
create trigger dashboard_preferences_updated_at before update on dashboard_preferences for each row execute function set_updated_at();
