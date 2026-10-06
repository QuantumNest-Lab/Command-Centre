-- A client-generated request ID makes project creation safe to retry.
alter table projects add column if not exists create_request_id uuid;
create unique index if not exists projects_workspace_create_request_id_idx
  on projects(workspace_id, create_request_id)
  where create_request_id is not null;
