# Course Resume - After Context Compaction

Use this skill when resuming course building after a context compaction or interruption.

## FIRST: Understand the Methodology

**CRITICAL**: Before building ANY content, you MUST understand what the learner experiences.

Run `/ssi-learner-pattern` NOW to load the full methodology brief. This is non-negotiable - without understanding how learners experience the content, you'll create unusable material.

Key principles you MUST internalize:
- **Learners only know what's been introduced** - never use vocabulary they haven't seen
- **Phrases build from SHORT to LONG** - start simple, add complexity
- **Grammar emerges from context** - never explain, let patterns reveal meaning
- **M-LEGOs teach components first** - "I" then "want" then "I want"

## SECOND: Get Your Bearings

**IMMEDIATELY** call the resume endpoint:

```
GET http://localhost:3471/api/resume/{course_code}
```

Replace `{course_code}` with your course (e.g., `zho_for_eng`, `deu_for_eng`).

This returns:
- `next_seed`: The EXACT seed number and known_text to work on
- `recent_seeds`: Last 5 completed seeds (for style reference)
- `recent_legos`: Last 20 new LEGOs (recently introduced)
- `recency.patterns_to_avoid`: Patterns that are overused - don't repeat these
- `recency.vocab_to_reinforce`: Vocabulary needing practice - try to include these
- `progress`: How far along you are
- `vocab_size`: Current vocabulary count

**TRUST THE API**: You don't need the full vocabulary list. The API validates ZUT automatically - if you create a LEGO that conflicts with existing vocabulary, it will tell you and suggest fixes. Just decompose naturally as a language teacher would.

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

## Translation Analysis Recovery

The `/api/resume` response includes your `translation_analysis` if Pass 1 is complete:

```json
{
  "translation_analysis": {
    "problem_verbs": [...],   // Disambiguation rules you discovered
    "golden_keys": [...],     // High-frequency patterns
    "zut_concerns": [...],    // Seeds needing English rewording
    "register": {...}         // Your chosen register
  }
}
```

**If `translation_analysis` is null:**
- Pass 1 is not complete - finish translating all 260 seeds first
- After translations are done, POST your analysis to `/api/course/{code}/analysis`
- See `/translation-analysis` for guidance on what to track

**If `translation_analysis` exists:**
- You're in Pass 2 - use the disambiguation rules for problem verbs
- Apply suggested rewordings for ZUT concerns
- Continue decomposing seeds into LEGOs

---

## Other Useful Skills

- `/translation-analysis` - Two-pass workflow guide
- `/jpn-analysis-example` - Example analysis output (Japanese)
- `/ssi-decompose-seed` - How to break seeds into LEGOs
- `/ssi-build-phrases` - How to generate practice phrases
- `/ssi-phrase-variety` - Phrase tier requirements
- `/ssi-learner-pattern` - The SSi methodology
