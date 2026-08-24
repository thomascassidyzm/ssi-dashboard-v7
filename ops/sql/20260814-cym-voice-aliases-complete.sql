-- Complete the Welsh alias sets — North AND South, and Catrin's anthem work.
--
-- The first alias pass only carried the spellings cym_n_for_eng's podCastAliases
-- knew about. Enumerating every human voice id across all four Welsh courses and
-- all Welsh audio rows shows that was incomplete in two ways that both cost a
-- recordist their own work:
--
--   * Aran and Catrin each have a SEPARATE voice id for South Welsh
--     (human_aran_cym_s, human_catrinlliar_cym_s). The queue is by language now,
--     and 'cym' spans North and South, so without these the South half of each
--     person's history detaches.
--
--   * Catrin's 35 recorded clips in cym_anthem_for_jpn are stored under
--     `catrin_human`, a spelling nothing else uses. Without it she reads as
--     ZERO recorded and is asked to record work she has already done. That is
--     precisely the failure mode this alias mechanism exists to prevent.
--
--   * Two clips are filed under the bare capitalised name `Aran`.
--
-- Every id here was read off the live estate, not invented. 'human' and
-- 'human_recording' are deliberately NOT aliases of either person: they are
-- shared per-course buckets with no per-actor tag, and clip-identity.cjs
-- refuses them as sentinels precisely because guessing an owner is how a clip
-- gets filed under the wrong voice.

UPDATE language_recording_policy
   SET voices = jsonb_set(
         jsonb_set(
           voices,
           '{m,aliases}',
           '["human_aran_cym_n_2", "human_aranv3_cym_n", "human_aran_cym_s", "Aran"]'::jsonb,
           true),
         '{f,aliases}',
         '["human_catrinv2_cym_n", "human_catrinlliar_cym_s", "catrin_human"]'::jsonb,
         true)
 WHERE language = 'cym';
