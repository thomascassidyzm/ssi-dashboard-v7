-- Job #914: deleting any courses row failed — forget_recordist_emails() read old.language, a column
-- courses does not have (plpgsql resolves the record field even in the untaken CASE branch).
-- Branch on the table first so each arm only names its own column.
create or replace function public.forget_recordist_emails() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_table_name = 'courses' then
    delete from public.recordist_emails where source = 'courses' and row_key = old.course_code;
  else
    delete from public.recordist_emails where source = tg_table_name and row_key = old.language;
  end if;
  return old;
end
$$;
revoke all on function public.forget_recordist_emails() from public, anon, authenticated;
