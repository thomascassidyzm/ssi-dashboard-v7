-- =============================================================================
-- 006: ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_audio ENABLE ROW LEVEL SECURITY;

-- Service role has full access (backend)
CREATE POLICY courses_service_policy ON courses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY course_audio_service_policy ON course_audio
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY shared_audio_service_policy ON shared_audio
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read released/beta courses
CREATE POLICY courses_read_policy ON courses
  FOR SELECT TO authenticated
  USING (status IN ('beta', 'released'));

-- Authenticated users can read audio for released/beta courses
CREATE POLICY course_audio_read_policy ON course_audio
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.code = course_code
      AND c.status IN ('beta', 'released')
    )
  );

-- Shared audio is readable by all authenticated users
CREATE POLICY shared_audio_read_policy ON shared_audio
  FOR SELECT TO authenticated USING (true);
