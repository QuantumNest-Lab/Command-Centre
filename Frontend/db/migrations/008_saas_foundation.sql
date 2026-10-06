-- Multi-tenant SaaS configuration and integration foundation.

alter table workspaces
  add column if not exists legal_name text,
  add column if not exists tax_id text,
  add column if not exists website text,
  add column if not exists timezone text not null default 'UTC',
  add column if not exists locale text not null default 'en',
  add column if not exists currency text not null default 'INR',
  add column if not exists logo_file_id uuid,
  add column if not exists onboarding_version integer not null default 1,
  add column if not exists onboarding_completed_at timestamptz;

create type integration_provider as enum (
  'GOOGLE_DRIVE', 'MICROSOFT_ONEDRIVE', 'S3_COMPATIBLE',
  'GOOGLE_GMAIL', 'MICROSOFT_OUTLOOK', 'SMTP',
  'WHATSAPP_CLOUD', 'TWILIO_WHATSAPP',
  'STRIPE', 'RAZORPAY'
);
create type integration_status as enum ('NOT_CONFIGURED', 'PENDING', 'CONNECTED', 'ERROR', 'DISCONNECTED');

create table integration_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider integration_provider not null,
  status integration_status not null default 'NOT_CONFIGURED',
  display_name text not null,
  configuration jsonb not null default '{}'::jsonb,
  credential_reference text,
  connected_by_user_id uuid references users(id) on delete set null,
  connected_at timestamptz,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider)
);
create index integration_connections_workspace_idx on integration_connections(workspace_id, status);
create trigger integration_connections_updated_at before update on integration_connections for each row execute function set_updated_at();

create table storage_locations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  integration_connection_id uuid references integration_connections(id) on delete set null,
  name text not null check (char_length(name) between 2 and 160),
  provider_path text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);
create unique index storage_locations_one_default_idx on storage_locations(workspace_id) where is_default;
create trigger storage_locations_updated_at before update on storage_locations for each row execute function set_updated_at();

create table file_objects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  storage_location_id uuid references storage_locations(id) on delete set null,
  uploaded_by_user_id uuid references users(id) on delete set null,
  parent_file_id uuid references file_objects(id) on delete set null,
  name text not null check (char_length(name) between 1 and 500),
  media_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  external_key text,
  external_url text,
  checksum text,
  is_folder boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index file_objects_workspace_parent_idx on file_objects(workspace_id, parent_file_id, name) where archived_at is null;
create trigger file_objects_updated_at before update on file_objects for each row execute function set_updated_at();

create type subscription_status as enum ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'PAUSED');
create table workspace_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references workspaces(id) on delete cascade,
  provider integration_provider,
  provider_customer_id text,
  provider_subscription_id text,
  plan_code text not null default 'FREE',
  status subscription_status not null default 'TRIALING',
  seat_limit integer not null default 5 check (seat_limit > 0),
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger workspace_subscriptions_updated_at before update on workspace_subscriptions for each row execute function set_updated_at();

create table notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (char_length(type) between 2 and 100),
  title text not null check (char_length(title) between 2 and 240),
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on notifications(workspace_id, user_id, created_at desc) where read_at is null;

create table webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  integration_connection_id uuid references integration_connections(id) on delete set null,
  provider integration_provider not null,
  event_type text not null,
  idempotency_key text not null,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique (provider, idempotency_key)
);
