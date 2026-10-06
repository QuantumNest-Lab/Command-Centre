-- A requirement created in the last 24 hours retains its original Created activity,
-- even if it is subsequently edited during that window.
update activities a
set action = 'CREATED'::activity_action
from requirements r
where a.entity_type = 'requirement'
  and a.entity_id = r.id
  and a.workspace_id = r.workspace_id
  and a.action = 'UPDATED'::activity_action
  and r.created_at >= now() - interval '24 hours'
  and a.created_at >= now() - interval '24 hours';
