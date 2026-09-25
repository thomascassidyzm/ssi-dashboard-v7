-- Recordist emails OUT of the anon-readable JSON (Tom, 2026-09-25: "fix that").
-- Run only after 20260925-recordist-emails-vault.sql AND after Popty's server
-- reads the vault (services/shared/recordist-email-vault.cjs is live), or the
-- booth stops finding recordists by email.
--
-- From here on a trigger moves any "email"/"assignedEmail" key into
-- public.recordist_emails on every write, whoever writes it, so no writer can
-- put one back where anon can read it. The same trigger then performs the
-- scrub: touching each row that still carries an email routes it through.
-- Every other key — everything the learner app reads — is left as it was.

begin;

create or replace function public.courses_vault_recordist_emails() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  new.voice_config := public.vault_recordist_emails('courses', new.course_code, new.voice_config);
  return new;
end
$$;

create or replace function public.policy_vault_recordist_emails() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  new.voices := public.vault_recordist_emails('language_recording_policy', new.language, new.voices);
  return new;
end
$$;

create or replace function public.forget_recordist_emails() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.recordist_emails
   where source = tg_table_name
     and row_key = case tg_table_name when 'courses' then old.course_code else old.language end;
  return old;
end
$$;

revoke all on function public.courses_vault_recordist_emails() from public, anon, authenticated;
revoke all on function public.policy_vault_recordist_emails() from public, anon, authenticated;
revoke all on function public.forget_recordist_emails() from public, anon, authenticated;

drop trigger if exists courses_vault_recordist_emails on public.courses;
create trigger courses_vault_recordist_emails
  before insert or update of voice_config on public.courses
  for each row execute function public.courses_vault_recordist_emails();

drop trigger if exists policy_vault_recordist_emails on public.language_recording_policy;
create trigger policy_vault_recordist_emails
  before insert or update of voices on public.language_recording_policy
  for each row execute function public.policy_vault_recordist_emails();

drop trigger if exists courses_forget_recordist_emails on public.courses;
create trigger courses_forget_recordist_emails
  after delete on public.courses
  for each row execute function public.forget_recordist_emails();

drop trigger if exists policy_forget_recordist_emails on public.language_recording_policy;
create trigger policy_forget_recordist_emails
  after delete on public.language_recording_policy
  for each row execute function public.forget_recordist_emails();

-- The scrub: only rows that still carry an email key.
update public.courses c set voice_config = c.voice_config
 where exists (select 1 from public.recordist_email_paths(c.voice_config));
update public.language_recording_policy l set voices = l.voices
 where exists (select 1 from public.recordist_email_paths(l.voices));

commit;
