alter table requirements add column if not exists source text not null default 'INTERNAL' check (source in ('MEETING','CALL','EMAIL','WHATSAPP','CLIENT_MESSAGE','INTERNAL','OTHER'));
create index if not exists requirements_workspace_source_idx on requirements(workspace_id, source) where archived_at is null;
