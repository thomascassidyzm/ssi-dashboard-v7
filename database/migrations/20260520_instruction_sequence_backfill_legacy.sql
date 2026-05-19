-- Backfill course_audio.sequence for legacy-imported English-known courses
-- that the previous migration missed.
--
-- The first migration (20260520_instruction_canonical_sequence.sql) joined
-- on text_normalized, expecting both sides to be byte-equal. They weren't
-- for older imports — fra_for_eng / spa_for_eng / ita_for_eng / jpn_for_eng
-- / kor_for_eng / zho_for_eng / etc. preserved typographic characters in
-- text_normalized:
--
--   course_audio (legacy):   "now, what you’re doing here…brain—that’s how"
--   shared_audio:            "now, what you're doing here…brain - that's how"
--
-- Curly apostrophe ≠ straight, em-dash ≠ spaced hyphen, so the equality
-- join silently skipped those rows. The newer imports (~45 courses incl.
-- eng_for_*, *_for_jpn, *_for_zho, hrv_for_eng, etc.) match cleanly and
-- were already sequenced.
--
-- This migration re-runs the join with a tolerant normalisation: curly
-- quotes flatten to straight, em/en-dashes collapse to a single hyphen,
-- and whitespace around dashes collapses too. Only rows still NULL get
-- touched, so it's safe to re-run.

BEGIN;

-- Helper: tolerant normalisation for matching only. Not stored anywhere;
-- just used inline below. SQL chain rather than a function so the
-- migration is self-contained and doesn't introduce a function the rest
-- of the codebase doesn't know about.
--
-- Replacements (in order):
--   ’ ‘  → ' (curly single quotes → straight apostrophe)
--   “ ”  → " (curly double quotes → straight)
--   — –  → - (em/en dashes → hyphen)
--   …    → ... (ellipsis → three dots)
-- Then regexp_replace collapses any whitespace around hyphens so
--   "brain - that" and "brain-that" both become "brain-that".

UPDATE course_audio ca
SET sequence = sa.sequence
FROM shared_audio sa
WHERE ca.sequence IS NULL
  AND sa.sequence IS NOT NULL
  AND ca.role = 'instruction'
  AND sa.audio_type = 'instruction'
  AND ca.language = sa.language
  AND regexp_replace(
        replace(replace(replace(replace(replace(replace(replace(ca.text_normalized,
          '’', ''''), '‘', ''''), '“', '"'), '”', '"'), '—', '-'), '–', '-'), '…', '...'),
        '\s*-\s*', '-', 'g'
      )
    = regexp_replace(
        replace(replace(replace(replace(replace(replace(replace(sa.text_normalized,
          '’', ''''), '‘', ''''), '“', '"'), '”', '"'), '—', '-'), '–', '-'), '…', '...'),
        '\s*-\s*', '-', 'g'
      );

COMMIT;

NOTIFY pgrst, 'reload schema';
