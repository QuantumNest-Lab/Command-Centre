-- Distinct document-workflow data shared by quotations, proposals, contracts, invoices, bills, and supporting documents.
alter table documents
  add column if not exists reference_number text,
  add column if not exists currency text not null default 'INR',
  add column if not exists subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  add column if not exists discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  add column if not exists tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  add column if not exists total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  add column if not exists issue_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists notes text,
  add column if not exists terms text,
  add column if not exists template_id uuid,
  add column if not exists sent_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists signed_at timestamptz;
create unique index if not exists documents_workspace_reference_active_idx on documents(workspace_id, reference_number) where archived_at is null and reference_number is not null;
create index if not exists documents_workspace_type_status_idx on documents(workspace_id, document_type, status, updated_at desc) where archived_at is null;

create table if not exists document_line_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  position integer not null check (position >= 0),
  description text not null check (char_length(description) between 1 and 1000),
  quantity numeric(14,3) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  tax_rate numeric(7,4) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  line_total numeric(14,2) not null default 0 check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, position)
);
create index if not exists document_line_items_workspace_document_idx on document_line_items(workspace_id, document_id, position);
create trigger document_line_items_updated_at before update on document_line_items for each row execute function set_updated_at();

create table if not exists document_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_type text not null,
  name text not null check (char_length(name) between 2 and 160),
  is_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, document_type, name)
);
create unique index if not exists document_templates_one_default_idx on document_templates(workspace_id, document_type) where is_default and archived_at is null;
create trigger document_templates_updated_at before update on document_templates for each row execute function set_updated_at();

create table if not exists document_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references document_templates(id) on delete cascade,
  version integer not null check (version > 0),
  body jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);
