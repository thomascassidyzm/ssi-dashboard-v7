-- Migration 008: Lego Introductions Table
--
-- Clean mapping table that links LEGOs to their introduction audio.
-- The app queries this to get all audio needed for a LEGO introduction.

CREATE TABLE IF NOT EXISTS lego_introductions (
    -- Primary key is the LEGO ID (e.g., 'S0001L01')
    lego_id TEXT PRIMARY KEY,

    -- Course this belongs to
    course_code TEXT NOT NULL REFERENCES courses(code) ON DELETE CASCADE,

    -- The presentation audio (known language intro ending with "is:")
    presentation_audio_id UUID REFERENCES course_audio(id) ON DELETE SET NULL,

    -- Target language audio (the LEGO word/phrase)
    target1_audio_id UUID REFERENCES course_audio(id) ON DELETE SET NULL,
    target2_audio_id UUID REFERENCES course_audio(id) ON DELETE SET NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for course lookups
CREATE INDEX IF NOT EXISTS idx_lego_introductions_course ON lego_introductions(course_code);

-- Add RLS policy for anon read access
ALTER TABLE lego_introductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read lego_introductions" ON lego_introductions
    FOR SELECT TO anon USING (true);

CREATE POLICY "Service can manage lego_introductions" ON lego_introductions
    FOR ALL TO service_role USING (true);

-- Verify
SELECT 'lego_introductions table created' AS status;
