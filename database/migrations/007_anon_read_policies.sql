-- Add anon read policy for courses (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'Anon can read courses'
  ) THEN
    CREATE POLICY "Anon can read courses" ON courses FOR SELECT TO anon USING (status IN ('beta', 'released'));
  END IF;
END $$;

-- Add anon read policy for course_audio (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'course_audio' AND policyname = 'Anon can read course_audio'
  ) THEN
    CREATE POLICY "Anon can read course_audio" ON course_audio FOR SELECT TO anon
    USING (EXISTS (SELECT 1 FROM courses c WHERE c.code = course_code AND c.status IN ('beta', 'released')));
  END IF;
END $$;

-- Add anon read policy for shared_audio (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shared_audio' AND policyname = 'Anon can read shared_audio'
  ) THEN
    CREATE POLICY "Anon can read shared_audio" ON shared_audio FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Add anon read for course_legos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'course_legos' AND policyname = 'Anon can read course_legos'
  ) THEN
    CREATE POLICY "Anon can read course_legos" ON course_legos FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Add anon read for course_practice_phrases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'course_practice_phrases' AND policyname = 'Anon can read course_practice_phrases'
  ) THEN
    CREATE POLICY "Anon can read course_practice_phrases" ON course_practice_phrases FOR SELECT TO anon USING (true);
  END IF;
END $$;
