-- Restores the pre-#914 body (which cannot delete a courses row; kept only for exact reversal).
create or replace function public.forget_recordist_emails() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.recordist_emails
   where source = tg_table_name
     and row_key = case tg_table_name when 'courses' then old.course_code else old.language end;
  return old;
end
$$;
revoke all on function public.forget_recordist_emails() from public, anon, authenticated;
