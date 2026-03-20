-- Fix RLS: course_audio blocked from anon reads (dashboard can't show audio stats)
-- and dashboard_users blocked from authenticated reads (auth can't look up own email)

-- course_audio: it's course content, let everyone read it
CREATE POLICY "anon_read_course_audio"
  ON course_audio FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "authenticated_read_course_audio"
  ON course_audio FOR SELECT
  TO authenticated
  USING (true);

-- dashboard_users: authenticated users can read their own row by email
-- OTP already verified the email, this just lets them fetch their role/courses
CREATE POLICY "authenticated_read_own_dashboard_user"
  ON dashboard_users FOR SELECT
  TO authenticated
  USING (email = auth.jwt()->>'email');
