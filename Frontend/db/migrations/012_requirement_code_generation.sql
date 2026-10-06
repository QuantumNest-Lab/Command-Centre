create sequence if not exists requirement_code_sequence;

alter table requirements add column if not exists requirement_code text;

do $$
declare
  highest_code bigint;
begin
  select max((substring(requirement_code from '([0-9]+)$'))::bigint)
    into highest_code
    from requirements
   where requirement_code ~ '^REQ-[0-9]+$';
  if highest_code is null then
    perform setval('requirement_code_sequence', 1, false);
  else
    perform setval('requirement_code_sequence', highest_code, true);
  end if;
end $$;

update requirements
   set requirement_code = 'REQ-' || lpad(nextval('requirement_code_sequence')::text, 4, '0')
 where requirement_code is null;

alter table requirements
  alter column requirement_code set default ('REQ-' || lpad(nextval('requirement_code_sequence')::text, 4, '0')),
  alter column requirement_code set not null;

create unique index if not exists requirements_workspace_code_unique_idx on requirements(workspace_id, requirement_code);
