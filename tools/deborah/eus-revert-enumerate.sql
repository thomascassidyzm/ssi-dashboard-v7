-- eus-revert-enumerate.sql — enumerate EVERY eus_for_eng round where Deborah's
-- regeneration was followed by a reversion, not just R95.
--
-- Kai's addendum, 2026-08-17 item 3: "enumerate ALL rounds where content_audit /
-- audio history shows her regeneration followed by reversion".
--
-- WHY THIS IS NARROW ON PURPOSE. Tom's lane already ran these detectors over the
-- WHOLE audit reach (2026-07-03 → 2026-08-14 19:40Z) and got zero on every one:
--   docs/eus-audio-revert-forensics-2026-08-14/findings.md §2
--   - no eus clip's s3_key ever returned to a value it previously held (0 repeats
--     in 362 states)
--   - no phrase pointer ever moved back to a clip it previously held (0 rows)
--   - all 182 old S3 objects still present, so a stale URL serves old bytes for ever
-- So the enumeration for everything up to 08-14 19:40Z is DONE and the answer is
-- ZERO. What is genuinely unaudited is 2026-08-14 19:40Z → now, which is exactly
-- the window in which Deborah says she is redoing audio by hand.
--
-- These are HIS detectors, re-parameterised on that window and reported per ROUND
-- so the output is in the units she and Kai speak. Read-only: no writes.
--
-- Run: node scripts/deborah/q.cjs "" tools/deborah/eus-revert-enumerate.sql
-- (or paste into any psql session)

\set course 'eus_for_eng'
\set since '2026-08-14 19:40:00+00'

-- ---------------------------------------------------------------------------
-- 0. Did anything at all touch this course since the last audit closed?
--    If these are all zero, nothing has happened since 08-14 and Deborah is
--    re-doing work that does not need re-doing. That is the headline either way.
-- ---------------------------------------------------------------------------
select 'activity since last audit' as detector,
       table_name, change_type, count(*) as rows,
       min(changed_at) as first, max(changed_at) as last
from content_audit_log
where changed_at >= :'since'
  and old_row->>'course_code' = :'course'
group by table_name, change_type
order by table_name, change_type;

-- New clips are INVISIBLE to content_audit_log (it records UPDATE/DELETE only),
-- so count them by created_at instead — her regenerations of EDITED text mint a
-- new row rather than colliding, and that whole population is otherwise unseen.
select 'new clips since last audit' as detector,
       date_trunc('hour', created_at) as hour, count(*) as new_rows
from course_audio
where course_code = :'course' and created_at >= :'since'
group by 1 order by 1;

-- ---------------------------------------------------------------------------
-- 1. DETECTOR A — did any clip's s3_key RETURN to a value it previously held?
--    This is the definition of a byte-level reversion. Value chain per clip =
--    every old_row->>'s3_key' in audit order, plus the current row as terminal
--    state. Deliberately over the WHOLE history of any clip touched in the
--    window, so a pre-window value coming back is still caught.
-- ---------------------------------------------------------------------------
with touched as (
  select distinct primary_key::uuid as cid
  from content_audit_log
  where table_name = 'course_audio'
    and old_row->>'course_code' = :'course'
    and changed_at >= :'since'
),
h as (
  select primary_key::uuid as cid, changed_at, old_row->>'s3_key' as k
  from content_audit_log
  where table_name = 'course_audio'
    and primary_key::uuid in (select cid from touched)
),
seq as (
  select cid, changed_at, k from h
  union all
  select ca.id, now(), ca.s3_key from course_audio ca
  where ca.id in (select cid from touched)
),
dup as (
  select cid, k, count(*) as times from seq
  where k is not null group by cid, k having count(*) > 1
)
select 'A: s3_key returned to a previous value' as detector,
       d.cid as audio_id, d.times, ca.text, ca.role, ca.voice_id,
       ca.audio_revision
from dup d join course_audio ca on ca.id = d.cid
order by d.times desc, ca.text;

-- ---------------------------------------------------------------------------
-- 2. DETECTOR B — did any PHRASE or LEGO pointer move BACK to a clip it had
--    previously held? Reported per round via course_round_index, because
--    neither content table carries a round number.
-- ---------------------------------------------------------------------------
with u as (
  select primary_key as pk, changed_at, table_name, r.role,
         case r.role
           when 'known'   then old_row->>'known_audio_id'
           when 'target1' then old_row->>'target1_audio_id'
           when 'target2' then old_row->>'target2_audio_id'
         end as val
  from content_audit_log
  cross join (values ('known'),('target1'),('target2')) as r(role)
  where table_name in ('course_practice_phrases','course_legos')
    and old_row->>'course_code' = :'course'
),
dd as (
  select pk, table_name, role, changed_at, val,
         lag(val) over (partition by pk, role order by changed_at) as prev
  from u
),
ch as (select * from dd where prev is distinct from val and val is not null),
back as (
  select pk, table_name, role, val, count(*) as arrivals,
         min(changed_at) as first_arrival, max(changed_at) as last_arrival
  from ch group by pk, table_name, role, val having count(*) > 1
)
select 'B: pointer returned to a previous clip' as detector,
       b.*, cri.round_index
from back b
left join course_legos cl
       on cl.course_code = :'course'
      and (cl.lego_id = b.pk or b.pk like cl.lego_id || '%')
left join course_round_index cri
       on cri.course_code = :'course' and cri.lego_id = cl.lego_id
order by b.last_arrival desc;

-- ---------------------------------------------------------------------------
-- 3. DETECTOR C — in-place byte swaps that did NOT version.
--    This is the STORAGE mechanism Tom's lane proved (phase8 upsert-on-conflict
--    updates s3_key in place; 182 swaps, 0 revision bumps). It is not itself a
--    reversion, but it is what makes one invisible AND it defeats every
--    downstream cache that is keyed on `<uuid>.vN` — buildAudioRef() only emits
--    a version suffix when audio_revision > 1 (ssi-learning-app
--    api/_utils/audioAccess.ts:129-131, fetchRevisedAudioRefs .gt('audio_revision',1)).
--    Any row here is a clip whose bytes changed while its cache ref did not.
-- ---------------------------------------------------------------------------
with h as (
  select changed_at, primary_key as pk, old_row
  from content_audit_log
  where table_name = 'course_audio'
    and old_row->>'course_code' = :'course'
    and changed_at >= :'since'
)
select 'C: bytes swapped in place, revision not bumped' as detector,
       count(*) as updates,
       count(*) filter (where h.old_row->>'s3_key' is distinct from ca.s3_key) as key_changed,
       count(*) filter (where (h.old_row->>'audio_revision')::int
                              is distinct from ca.audio_revision) as revision_bumped,
       count(*) filter (where h.old_row->>'text' is distinct from ca.text) as text_changed
from h join course_audio ca on ca.id::text = h.pk;

-- ---------------------------------------------------------------------------
-- 4. HER ITEMS, current state — text vs what the bound clip claims, per round.
--    A row where clip_text differs from the content text is a text-vs-voiced
--    mismatch of exactly the kind she reports ("text right, audio wrong").
--    word_boundaries is the only witness to what the TTS actually SPOKE.
-- ---------------------------------------------------------------------------
select 'D: bound clip disagrees with LEGO text' as detector,
       cri.round_index, cl.lego_id, cl.seed_number,
       cl.target_text as lego_target_text,
       t1.text as target1_clip_text, t1.audio_revision as t1_rev,
       t1.created_at as t1_created,
       t2.text as target2_clip_text, t2.created_at as t2_created
from course_legos cl
left join course_round_index cri
       on cri.course_code = cl.course_code and cri.lego_id = cl.lego_id
left join course_audio t1 on t1.id = cl.target1_audio_id
left join course_audio t2 on t2.id = cl.target2_audio_id
where cl.course_code = :'course'
  and cl.seed_number in (6,7,11,17,21,25,26,27,28,29,33,34,52,55,115,126)
  and (
    (t1.id is not null and rtrim(lower(btrim(t1.text)),   '.?!¿¡。？！')
                        is distinct from rtrim(lower(btrim(cl.target_text)), '.?!¿¡。？！'))
 or (t2.id is not null and rtrim(lower(btrim(t2.text)),   '.?!¿¡。？！')
                        is distinct from rtrim(lower(btrim(cl.target_text)), '.?!¿¡。？！'))
  )
order by cri.round_index nulls last;

-- ---------------------------------------------------------------------------
-- 5. R95 seed 33 — is her Build work recoverable from a redo snapshot?
--    The 2026-08-11 snapshot fix IS on origin/main (build.cjs calls
--    snapshotSeeds) and the migration is applied live, so if a redo destroyed
--    her corrected Builds they are restorable via POST /api/build/redo-undo
--    {seed: 33} — no TTS, no regeneration.
-- ---------------------------------------------------------------------------
select 'E: redo snapshots (recoverable Builds)' as detector,
       id, batch_id, seed_number, created_at
from seed_redo_snapshots
where course_code = :'course'
order by created_at desc;
