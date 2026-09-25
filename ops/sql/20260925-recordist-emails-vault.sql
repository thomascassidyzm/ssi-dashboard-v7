-- Recordist emails get a home the public key cannot read (Tom, 2026-09-25:
-- "fix that"). ADDITIVE ONLY: this creates the vault and copies the emails in;
-- nothing is removed from courses / language_recording_policy here. The scrub
-- is 20260925-recordist-emails-scrub.sql, run only after Popty's server reads
-- the vault (services/shared/recordist-email-vault.cjs).
--
-- Where the emails were: any JSON key named "email" or "assignedEmail" inside
--   courses.voice_config                 (voices.<slot>.assignedEmail,
--                                         voices.<slot>.humanVoice.assignedEmail,
--                                         podCast.<speaker>.email)
--   language_recording_policy.voices     (<slot>.email)
-- Both tables are SELECT-able by anon, and the learner app reads voice_config
-- with the anon key. The learner app reads no email key, so removing ONLY the
-- email keys leaves every key it reads in place.
--
-- The vault is keyed by the key's full JSON path, so Popty's service-role
-- client can put each email back exactly where it was (hydration) and every
-- piece of booth/casting logic keeps seeing the shape it always saw.

begin;

create table if not exists public.recordist_emails (
  source     text        not null check (source in ('courses', 'language_recording_policy')),
  row_key    text        not null,          -- courses.course_code | language_recording_policy.language
  path       text[]      not null,          -- full JSON path to the email key, e.g. {podCast,Anna,email}
  voice_id   text,                          -- the voiceId beside the email when it was written
  email      text        not null,
  updated_at timestamptz not null default now(),
  primary key (source, row_key, path)
);

-- New tables arrive grant-open to anon on this project: close it explicitly.
-- RLS on with NO policy = nobody but service_role (which bypasses RLS).
revoke all on public.recordist_emails from public, anon, authenticated;
grant all on public.recordist_emails to service_role;
alter table public.recordist_emails enable row level security;

-- Every email-bearing key in a JSON document: its path, its value (string or
-- null) and the object that holds it.
create or replace function public.recordist_email_paths(j jsonb)
returns table (path text[], val jsonb, parent jsonb)
language sql immutable set search_path = public, pg_temp as $$
  with recursive walk(path, val) as (
    select array[]::text[], j
    union all
    select w.path || c.k, c.v
    from walk w
    cross join lateral (
      select e.key as k, e.value as v
        from jsonb_each(case when jsonb_typeof(w.val) = 'object' then w.val else '{}'::jsonb end) e
      union all
      select (a.ord - 1)::text, a.value
        from jsonb_array_elements(case when jsonb_typeof(w.val) = 'array' then w.val else '[]'::jsonb end)
             with ordinality as a(value, ord)
    ) c
  )
  select w.path, w.val, j #> w.path[1:cardinality(w.path) - 1]
  from walk w
  where cardinality(w.path) > 0
    and w.path[cardinality(w.path)] in ('email', 'assignedEmail')
    and jsonb_typeof(w.val) in ('string', 'null')
    and jsonb_typeof(j #> w.path[1:cardinality(w.path) - 1]) = 'object'
$$;
revoke all on function public.recordist_email_paths(jsonb) from public, anon, authenticated;

-- Moves every email in p_doc into the vault and returns p_doc without them.
-- A key holding a non-empty string is upserted; a key holding null/"" is an
-- explicit clear and deletes the vault row; an ABSENT key leaves the vault
-- alone (a writer that read the scrubbed JSON and wrote it back must not wipe
-- the email). A vault row is dropped when the object that held it is gone, or
-- now names a different voiceId (the slot was recast without an email).
create or replace function public.vault_recordist_emails(p_source text, p_key text, p_doc jsonb)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r record;
  touched text[] := '{}';
  out_doc jsonb := p_doc;
begin
  if p_doc is null or p_key is null then return p_doc; end if;
  for r in select * from public.recordist_email_paths(p_doc) loop
    if jsonb_typeof(r.val) = 'string' and btrim(r.val #>> '{}') <> '' then
      insert into public.recordist_emails (source, row_key, path, voice_id, email, updated_at)
      values (p_source, p_key, r.path, r.parent ->> 'voiceId', btrim(r.val #>> '{}'), now())
      on conflict (source, row_key, path)
        do update set voice_id = excluded.voice_id, email = excluded.email, updated_at = now();
    else
      delete from public.recordist_emails
       where source = p_source and row_key = p_key and path = r.path;
    end if;
    out_doc := out_doc #- r.path;
    touched := touched || array_to_string(r.path, chr(31));
  end loop;

  delete from public.recordist_emails e
   where e.source = p_source and e.row_key = p_key
     and not (array_to_string(e.path, chr(31)) = any (touched))
     and (
       jsonb_typeof(out_doc #> e.path[1:cardinality(e.path) - 1]) is distinct from 'object'
       or (e.voice_id is not null
           and (out_doc #> e.path[1:cardinality(e.path) - 1]) ? 'voiceId'
           and (out_doc #> e.path[1:cardinality(e.path) - 1]) ->> 'voiceId' is distinct from e.voice_id)
     );
  return out_doc;
end
$$;
revoke all on function public.vault_recordist_emails(text, text, jsonb) from public, anon, authenticated;

-- Backfill: copy (not move) every email that is there now.
insert into public.recordist_emails (source, row_key, path, voice_id, email)
select 'courses', c.course_code, p.path, p.parent ->> 'voiceId', btrim(p.val #>> '{}')
  from public.courses c, public.recordist_email_paths(c.voice_config) p
 where jsonb_typeof(p.val) = 'string' and btrim(p.val #>> '{}') <> ''
on conflict (source, row_key, path) do update set voice_id = excluded.voice_id, email = excluded.email, updated_at = now();

insert into public.recordist_emails (source, row_key, path, voice_id, email)
select 'language_recording_policy', l.language, p.path, p.parent ->> 'voiceId', btrim(p.val #>> '{}')
  from public.language_recording_policy l, public.recordist_email_paths(l.voices) p
 where jsonb_typeof(p.val) = 'string' and btrim(p.val #>> '{}') <> ''
on conflict (source, row_key, path) do update set voice_id = excluded.voice_id, email = excluded.email, updated_at = now();

commit;
