-- fra_for_eng known-layer repoint (2026-08-09).
--
-- The 2026-08-07 known-voice recast (Eve -> Tom's clone) rendered the clone
-- clips and moved the LEGO holders, but left build/use practice-phrase rows
-- whose known_text duplicates a LEGO's text still pointing at the 2026-08-03
-- Eve clip. Pure pointer move: no TTS, nothing deleted, nothing overwritten.
-- The Eve rows and their S3 objects stay exactly where they are, so this is
-- reversible by replaying the log backwards.
--
-- Scope: course fra_for_eng only, phrase_role in (build, use), known_audio_id
-- only. Components are runtime-skipped and out of scope; other courses need
-- actual regeneration and are untouched.
--
-- Run: psql "$DATABASE_URL" -f scripts/fra-known-repoint-apply.sql
\set ON_ERROR_STOP on

create temp table ca as
select id::text as id, role,
       regexp_replace(voice_id,'^xai_','') as voice,
       lower(regexp_replace(btrim(text),'\.$','')) as ntext, created_at
from course_audio where course_code='fra_for_eng';
create index on ca(id);
create index on ca(role, ntext, voice);

-- Winner per (role, normalised text) on the clone voice: newest row.
-- Voice match is on the bare id, because `eve`/`xai_eve` and
-- `gfzdpspr5fdp`/`xai_gfzdpspr5fdp` are each one voice spelled two ways.
create temp table clone_win as
select distinct on (role, ntext) role, ntext, id
from ca where voice='gfzdpspr5fdp'
order by role, ntext, created_at desc;
create index on clone_win(role, ntext);
analyze ca; analyze clone_win;

create temp table work as
select p.id as row_id, p.phrase_role,
       p.known_audio_id::text as old_id, w.id as new_id
from course_practice_phrases p
join ca c on c.id = p.known_audio_id::text
join clone_win w on w.role = c.role and w.ntext = c.ntext
where p.course_code='fra_for_eng'
  and p.phrase_role in ('build','use')
  and c.voice <> 'gfzdpspr5fdp';
analyze work;

\echo '== rows to repoint =='
select count(*) from work;

begin;

-- Before-state assertion rides on the update itself: a row is written only if
-- it still holds the id we planned against, so a concurrent change by another
-- agent skips that row instead of being overwritten.
create temp table applied as
with u as (
update course_practice_phrases p
   set known_audio_id = w.new_id::uuid
  from work w
 where p.id = w.row_id
   and p.course_code = 'fra_for_eng'
   and p.known_audio_id::text = w.old_id
returning p.id as row_id, w.old_id, w.new_id
) select * from u;

\echo '== applied =='
select count(*) from applied;
\echo '== drifted (planned but not written) =='
select count(*) from work w where not exists (select 1 from applied a where a.row_id = w.row_id);

-- Installed devices key cached scripts on this stamp.
update courses set audio_stamp = now() where course_code='fra_for_eng';

commit;

\echo '== log =='
\copy (select json_agg(row_to_json(a)) from applied a) to 'docs/audio-repair-2026-08-09/fra_for_eng-known-repoint-applied-log.json'
