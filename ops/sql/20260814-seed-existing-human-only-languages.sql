-- Bring the languages already ruled human-voice-only onto the new surface.
--
-- services/shared/human-voice-courses.cjs is the HARD FLOOR: Welsh, Breton and
-- Pennsylvania Dutch are human-voiced only by explicit owner rulings
-- (2026-07-25 cym, 2026-07-27 bre, 2026-08-13 cym restated as permanent,
-- 2026-08-14 pdc), and that file deliberately has no runtime bypass.
--
-- language_recording_policy is ADDITIVE to that floor, never subtractive — the
-- phase8 gate unions the two and the floor always wins. So these rows do not
-- grant anything; they make the three languages VISIBLE on the recordist surface
-- and the coverage bar, which is the whole point of Tom asking for one control
-- surface plus one coverage view.
--
-- cym is already seeded (Aran + Catrin) by 20260814-language-recording-policy.sql.
-- bre and pdc have NO podCast in their courses, so they have no voices to name.
-- They are inserted with an empty voices object rather than a guessed one: an
-- invented voice id would attach real recordings to a person who does not exist.
-- They will show on Tom's surface as human-only with no recordist assigned,
-- which is the true state and the thing worth him seeing.

INSERT INTO language_recording_policy (language, human_only, voices, notes) VALUES
  ('bre', true, '{}'::jsonb,
   'Human-voiced only (Tom 2026-07-27): Azure has no Breton voice. NO RECORDIST CAST YET — bre_for_fra has no podCast, so there is no queue to send anyone.'),
  ('pdc', true, '{}'::jsonb,
   'Human-voiced only (Tom 2026-08-14): no synthetic voice anywhere; a German voice reading Pennsylvania Dutch is the defect this prevents. Doug and Erik are recording the community. NO RECORDIST CAST YET — pdc_for_eng has no podCast.')
ON CONFLICT (language) DO UPDATE
  SET human_only = true,
      notes      = EXCLUDED.notes;
