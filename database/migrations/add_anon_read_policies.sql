-- Add read policies for anon role to allow learning app to access v12 audio tables
-- This is required because the learning app uses the anon key, not service key

-- texts table - allow anonymous read
CREATE POLICY "Anon can read texts" ON texts
    FOR SELECT TO anon
    USING (true);

-- audio_files table - allow anonymous read
CREATE POLICY "Anon can read audio_files" ON audio_files
    FOR SELECT TO anon
    USING (true);

-- course_audio table - allow anonymous read
CREATE POLICY "Anon can read course_audio" ON course_audio
    FOR SELECT TO anon
    USING (true);
