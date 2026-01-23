-- Migration: Build Lessons table for Ralph loop methodology improvements
-- Date: 2026-01-23
-- Purpose: Track methodology lessons learned during course builds
--
-- This implements the "Ralph Wiggum" pattern where:
-- 1. Agent hits an error during build
-- 2. We identify the fix and add it as a lesson
-- 3. Future builds automatically get the lesson in their prompt
-- 4. Methodology improves iteratively

CREATE TABLE IF NOT EXISTS build_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Scope: which languages does this lesson apply to?
  language_family TEXT NOT NULL,  -- 'japanese', 'korean', 'cjk', 'germanic', 'romance', '*' (all)
  lesson_type TEXT NOT NULL,      -- 'tiling', 'vocabulary', 'components', 'phrases', 'quality'

  -- The lesson itself
  trigger TEXT,                   -- What error/issue triggered this discovery
  lesson TEXT NOT NULL,           -- The guidance to follow
  example_wrong TEXT,             -- What NOT to do
  example_right TEXT,             -- What TO do

  -- Lifecycle
  active BOOLEAN DEFAULT true,
  superseded_by UUID REFERENCES build_lessons(id),

  -- Metadata: where did we learn this?
  discovered_in_course TEXT,      -- e.g., 'jpn_for_eng'
  discovered_at_seed INT
);

-- Index for efficient lookup by language family
CREATE INDEX IF NOT EXISTS idx_build_lessons_family
ON build_lessons(language_family)
WHERE active = true;

-- Seed with lessons already learned from jpn_for_eng rebuild
INSERT INTO build_lessons (language_family, lesson_type, trigger, lesson, example_wrong, example_right, discovered_in_course, discovered_at_seed)
VALUES
  ('japanese', 'tiling', 'TILING FAILED - untiled: [を]',
   'Include particles WITH their noun, not separately',
   '日本語 + を as separate LEGOs',
   '日本語を as one LEGO target',
   'jpn_for_eng', 1),

  ('korean', 'tiling', 'Korean particles must be included for tiling',
   'Include particles WITH their noun, not separately',
   '한국어 + 를 as separate LEGOs',
   '한국어를 as one LEGO target',
   NULL, NULL),

  ('*', 'phrases', 'Phrase insert failed: violates check constraint',
   'Use phrase_role values: component, practice, build, use, eternal_eligible',
   'phrase_role: "drilling"',
   'phrase_role: "build" or "use"',
   'jpn_for_eng', 1);
