-- =============================================================================
-- Add 'pod_explainer' to the allowed values of course_audio.role.
--
-- The Stage-1 pod explainer (mixed-language narration, e.g.
-- "buona means good, sera means afternoon, come stai means how are you doing")
-- is semantically distinct from the existing roles (known, target1, target2,
-- presentation) and deserves its own label so future queries can filter
-- explainer audio cleanly without conflating it with course-intro
-- presentations.
--
-- Tonight's batch run uses role='presentation' as a temporary workaround
-- (the texts don't collide with course-intro narration so dedupe is safe),
-- but the proper labelling lands here. After this migration is applied,
-- run a one-time UPDATE to relabel existing explainer audio:
--
--   UPDATE course_audio
--     SET role = 'pod_explainer'
--     WHERE id IN (
--       SELECT explainer_audio_id FROM listening_pod_sentences
--       WHERE explainer_audio_id IS NOT NULL
--     );
--
-- Rollback (restores the pre-pod_explainer allow-list, which still includes
-- the full set of legitimately-existing roles in the live table):
--   ALTER TABLE course_audio
--     DROP CONSTRAINT IF EXISTS course_audio_role_check,
--     ADD CONSTRAINT course_audio_role_check
--       CHECK (role IN (
--         'known', 'target1', 'target2', 'presentation',
--         'welcome', 'encouragement', 'instruction',
--         'bookend_listen_intro', 'bookend_listen_outro'
--       ));
-- =============================================================================

-- NOTE: the old constraint's allow-list claimed 4 roles, but the live table
-- actually carries 6 more from older code paths (welcome / encouragement /
-- instruction / bookend_listen_intro / bookend_listen_outro). The recreated
-- constraint must enumerate every existing role plus the new pod_explainer,
-- otherwise the ADD fails with 23514 against the existing rows.
ALTER TABLE course_audio
  DROP CONSTRAINT IF EXISTS course_audio_role_check;

ALTER TABLE course_audio
  ADD CONSTRAINT course_audio_role_check
    CHECK (role IN (
      'known',
      'target1',
      'target2',
      'presentation',
      'welcome',
      'encouragement',
      'instruction',
      'bookend_listen_intro',
      'bookend_listen_outro',
      'pod_explainer'
    ));

NOTIFY pgrst, 'reload schema';
