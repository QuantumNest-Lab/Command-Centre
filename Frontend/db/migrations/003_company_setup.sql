alter table workspaces add column if not exists company_setup_completed boolean not null default true;
alter table workspaces add column if not exists business_email text;
alter table workspaces add column if not exists business_phone text;
alter table workspaces add column if not exists business_address text;

-- Existing workspaces remain usable; only newly self-created workspaces require setup.
