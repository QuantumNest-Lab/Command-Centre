create sequence if not exists project_code_sequence;

do $$
declare
  highest_code bigint;
begin
  select max((substring(project_code from '([0-9]+)$'))::bigint)
    into highest_code
    from projects
   where project_code ~ '^PROJ-[0-9]+$';

  if highest_code is null then
    perform setval('project_code_sequence', 1, false);
  else
    perform setval('project_code_sequence', highest_code, true);
  end if;
end $$;

alter table projects
  alter column project_code set default ('PROJ-' || lpad(nextval('project_code_sequence')::text, 4, '0'));
