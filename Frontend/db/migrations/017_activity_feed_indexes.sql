-- Supports cursor pagination and common audit-feed filters without scanning a workspace's entire history.
create index if not exists activities_workspace_actor_created_idx on activities(workspace_id, actor_user_id, created_at desc, id desc);
create index if not exists activities_workspace_entity_created_idx on activities(workspace_id, entity_type, created_at desc, id desc);
create index if not exists activities_workspace_action_created_idx on activities(workspace_id, action, created_at desc, id desc);
