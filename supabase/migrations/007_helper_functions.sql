-- =============================================================================
-- 007: HELPER FUNCTIONS
-- =============================================================================

-- Get missing audio for a course
-- Usage: SELECT * FROM get_missing_audio('spa_for_eng', '[{"text":"hello","language":"eng","role":"known"},...]'::jsonb)
CREATE OR REPLACE FUNCTION get_missing_audio(
  p_course_code TEXT,
  p_needed JSONB
)
RETURNS TABLE (
  text TEXT,
  language TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n->>'text' as text,
    n->>'language' as language,
    n->>'role' as role
  FROM jsonb_array_elements(p_needed) n
  WHERE NOT EXISTS (
    SELECT 1 FROM course_audio ca
    WHERE ca.course_code = p_course_code
      AND ca.text_normalized = normalize_text(n->>'text')
      AND ca.language = n->>'language'
      AND ca.role = n->>'role'
  );
END;
$$ LANGUAGE plpgsql;

-- Get audio inventory summary for a course
CREATE OR REPLACE FUNCTION get_course_audio_summary(p_course_code TEXT)
RETURNS TABLE (
  role TEXT,
  origin TEXT,
  count BIGINT,
  voice_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ca.role,
    ca.origin,
    COUNT(*)::BIGINT as count,
    COUNT(DISTINCT ca.voice_id)::BIGINT as voice_count
  FROM course_audio ca
  WHERE ca.course_code = p_course_code
  GROUP BY ca.role, ca.origin
  ORDER BY ca.role, ca.origin;
END;
$$ LANGUAGE plpgsql;
