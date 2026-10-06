-- Keep one current activity entry per requirement for create/update events in the last 24 hours.
-- The latest event remains so its displayed title and timestamp reflect the most recent change.
with ranked as (
  select id,
    row_number() over (
      partition by workspace_id, entity_id
      order by created_at desc, id desc
    ) as position
  from activities
  where entity_type = 'requirement'
    and action in ('CREATED'::activity_action, 'UPDATED'::activity_action)
    and created_at >= now() - interval '24 hours'
)
delete from activities
where id in (select id from ranked where position > 1);
