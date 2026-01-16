# Course Resume - After Context Compaction

Use this skill when resuming course building after a context compaction or interruption.

## FIRST: Get Your Bearings

**IMMEDIATELY** call the resume endpoint:

```
GET http://localhost:3471/api/resume/{course_code}
```

Replace `{course_code}` with your course (e.g., `zho_for_eng`, `deu_for_eng`).

This returns:
- `next_seed`: The EXACT seed number and known_text to work on
- `recent_seeds`: Last 5 completed seeds (for style reference)
- `recent_legos`: Last 20 new LEGOs (for phrase vocabulary)
- `progress`: How far along you are
- `vocab_size`: Current vocabulary count

## DO NOT:
- Guess what seed comes next
- Invent seed text from memory
- Assume you know where you left off

## Workflow After Resume

1. **Call /api/resume** - get exact next seed
2. **Translate** the known_text to target language
3. **Decompose** into LEGOs (see /ssi-decompose-seed)
4. **Generate phrases** for each LEGO (see /ssi-build-phrases)
5. **Submit** via POST /api/seed/complete
6. **Repeat** until done

## Golden Path Submission

```json
POST http://localhost:3471/api/seed/complete
{
  "course_code": "zho_for_eng",
  "seed_number": 107,
  "known_text": "We hoped to see what you were doing.",
  "target_text": "[your translation]",
  "legos": [
    {
      "idx": 1,
      "type": "A",
      "known": "...",
      "target": "...",
      "phrases": [{"known": "...", "target": "..."}, ...]
    }
  ]
}
```

## Quality Requirements

- **Phrases per LEGO**: Target 10-13, minimum 7 for seeds 21+
- **Phrase tiers**: Mix of SHORT (3-5 words), MEDIUM (6-9), LONG (10+)
- **ZUT principle**: Only use vocabulary that's been introduced
- **Tiling**: Seed must reconstruct from LEGO targets

## If Validation Fails

Read the error message carefully - it tells you exactly what's wrong:
- `CANONICAL MISMATCH`: Your seed text is wrong - call /api/resume
- `ZUT violation`: Same known maps to different target - upchunk or synonym
- `PHRASE TIERS`: Need more SHORT/MEDIUM/LONG phrases
- `Vocabulary violation`: Using words not yet introduced

## Other Useful Skills

- `/ssi-decompose-seed` - How to break seeds into LEGOs
- `/ssi-build-phrases` - How to generate practice phrases
- `/ssi-phrase-variety` - Phrase tier requirements
- `/ssi-learner-pattern` - The SSi methodology
