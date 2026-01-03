-- =============================================================================
-- 005: VIEWS
-- =============================================================================

-- Quick summary of audio per course/role
CREATE OR REPLACE VIEW course_audio_inventory AS
SELECT
  course_code,
  role,
  origin,
  COUNT(*) as count,
  COUNT(DISTINCT voice_id) as voice_count
FROM course_audio
GROUP BY course_code, role, origin
ORDER BY course_code, role, origin;

-- Voice breakdown per course/role
CREATE OR REPLACE VIEW course_voice_breakdown AS
SELECT
  course_code,
  role,
  voice_id,
  origin,
  COUNT(*) as count
FROM course_audio
GROUP BY course_code, role, voice_id, origin
ORDER BY course_code, role, count DESC;

COMMENT ON VIEW course_audio_inventory IS 'Quick summary of audio per course/role';
COMMENT ON VIEW course_voice_breakdown IS 'Voice usage breakdown per course/role';
