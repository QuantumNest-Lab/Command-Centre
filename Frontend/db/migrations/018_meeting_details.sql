-- Provider-ready meeting metadata. Provider credentials and tokens remain outside this table.
alter table meetings
  add column if not exists provider text not null default 'MANUAL' check (provider in ('MANUAL', 'GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS', 'EXTERNAL')),
  add column if not exists meeting_url text,
  add column if not exists duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 1440),
  add column if not exists timezone text not null default 'UTC',
  add column if not exists attendees jsonb not null default '[]'::jsonb,
  add column if not exists agenda text,
  add column if not exists notes text,
  add column if not exists outcome text,
  add column if not exists provider_event_id text,
  add column if not exists sync_state text not null default 'NOT_CONNECTED' check (sync_state in ('NOT_CONNECTED', 'PENDING', 'SYNCED', 'ERROR'));
create index if not exists meetings_workspace_provider_start_idx on meetings(workspace_id, provider, starts_at) where archived_at is null;
create index if not exists meetings_workspace_status_start_idx on meetings(workspace_id, status, starts_at) where archived_at is null;
