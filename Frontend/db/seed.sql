-- Development-only seed. Apply only to a local database after 001_foundation.sql.
-- Operational code never depends on these rows.
insert into workspaces (id, name, slug) values ('00000000-0000-4000-8000-000000000001', 'QNL Development', 'qnl-development') on conflict do nothing;
