create unique index if not exists file_objects_workspace_external_key_idx on file_objects(workspace_id, external_key) where external_key is not null;
