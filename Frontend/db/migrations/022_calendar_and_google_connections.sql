-- Calendar records are derived from tasks and meetings; reminders are durable and independently deliverable.
alter type integration_provider add value if not exists 'GOOGLE_CALENDAR';
alter type integration_provider add value if not exists 'MICROSOFT_CALENDAR';

create table if not exists integration_credentials (
  id uuid primary key default gen_random_uuid(),
  integration_connection_id uuid not null unique references integration_connections(id) on delete cascade,
  encrypted_payload text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger integration_credentials_updated_at before update on integration_credentials for each row execute function set_updated_at();

create table if not exists calendar_reminders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  entity_type text not null check (entity_type in ('task', 'meeting')),
  entity_id uuid not null,
  recipient_user_id uuid not null references users(id) on delete cascade,
  remind_at timestamptz not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'FAILED', 'CANCELED')),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (workspace_id, entity_type, entity_id, recipient_user_id, remind_at)
);
create index if not exists calendar_reminders_due_idx on calendar_reminders(remind_at) where status = 'PENDING';

insert into integration_connections(workspace_id, provider, display_name)
select id, 'GOOGLE_CALENDAR'::integration_provider, 'Google Calendar' from workspaces
on conflict (workspace_id, provider) do nothing;
insert into integration_connections(workspace_id, provider, display_name)
select id, 'MICROSOFT_CALENDAR'::integration_provider, 'Microsoft 365 Calendar' from workspaces
on conflict (workspace_id, provider) do nothing;
