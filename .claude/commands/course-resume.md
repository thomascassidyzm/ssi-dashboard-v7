# Course Resume - After Context Compaction

Use this skill when resuming course building after a context compaction or interruption.

## ⚠️ AUTONOMY - READ THIS FIRST

**YOU ARE AN AUTONOMOUS BUILD AGENT. THE HUMAN IS NOT WATCHING.**

**FORBIDDEN BEHAVIORS** (doing ANY of these = FAILURE):
- ❌ Asking "Should I continue?"
- ❌ Asking "Would you like me to proceed?"
- ❌ Asking "Is this correct?"
- ❌ Waiting for confirmation
- ❌ ANY question directed at the user

**REQUIRED BEHAVIOR:**
- ✅ Immediately proceed to build the next seed
- ✅ Make decisions yourself
- ✅ Fix errors yourself and retry
- ✅ Continue until checkpoint or 30 seeds, then exit cleanly

**DO NOT ASK. JUST DO IT.**

---

## FIRST: Understand the Methodology

**CRITICAL**: Before building ANY content, you MUST understand what the learner experiences.

Read `ralph-methodology.md` NOW to load the full methodology brief. This is non-negotiable - without understanding how learners experience the content, you'll create unusable material.

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

## Heartbeat - CRITICAL

**Send a heartbeat every 60 seconds while working.** This tells the system you're alive.

```bash
curl -X POST http://localhost:3471/api/heartbeat/{course_code} \
  -H "Content-Type: application/json" \
  -d '{"status": "working", "current_seed": 42}'
```

**When to send heartbeats:**
- Immediately when you start working on a course
- Before starting each new seed
- Every 60 seconds during long operations (decomposition, phrase generation)

**If you don't send heartbeats**, the system may spawn a duplicate agent thinking you're dead.

## Workflow After Resume

1. **Send heartbeat** - announce you're alive
2. **Call /api/resume** - get exact next seed
3. **Send heartbeat** with current_seed
4. **Translate** the known_text to target language
5. **Decompose** into LEGOs (see ralph-methodology.md)
6. **Generate phrases** for each LEGO (see ralph-methodology.md)
7. **Submit** via POST /api/seed/complete
8. **Repeat** from step 2 until done

## Golden Path Submission (MARKDOWN FORMAT)

Submit in **markdown format** - it's cleaner and uses fewer tokens:

```bash
curl -X POST "http://localhost:3471/api/seed/complete?course=zho_for_eng" \
  -H "Content-Type: text/markdown" \
  -d '# Seed 107
Known: We hoped to see what you were doing.
Target: 我们希望看到你在做什么。

## L1 [M] "we hoped" → "我们希望"
Components: we → 我们, hoped → 希望

BUILD:
- we hoped → 我们希望

USE:
- we hoped to see → 我们希望看到 [7]

## L2 [A] "to see" → "看到"

BUILD:
- to see → 看到

USE:
- we hoped to see you → 我们希望看到你 [7]
- I hoped to see → 我希望看到 [6]

## L3 [M] "what you were doing" → "你在做什么"
Components: what → 什么, you → 你, doing → 做

BUILD:
- what → 什么
- you were doing → 你在做
- what you were doing → 你在做什么

USE:
- we hoped to see what you were doing → 我们希望看到你在做什么 [8]
- I want to see what you are doing → 我想看你在做什么 [7]
'
```

**Format notes:**
- `## L1 [M]` or `## L2 [A]` - LEGO header with type
- `Components:` line for M-type LEGOs
- `BUILD:` phrases for drilling (flexible)
- `USE:` standalone-sayable phrases with scores [5-9] (full sentences preferred, not required)

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

## Language-Pair Learnings (CRITICAL)

The `/api/resume` response includes a `LEARNINGS` section with insights discovered from previous course builds and QA. **YOU MUST APPLY THESE.**

```json
{
  "LEARNINGS": {
    "_WARNING": "APPLY THESE 3 LEARNINGS - they were discovered from previous QA",
    "components": [
      "Arabic definite 'al-' should never map to English indefinite 'a'",
      "Never list components that don't actually exist in the phrase text"
    ],
    "grammar": [
      "Chinese aspect marker 着 is NOT equivalent to English 'to'"
    ]
  }
}
```

**These are hard-won insights.** Previous agents made these mistakes and QA caught them. Don't repeat them.

- If `LEARNINGS` is null: No language-specific learnings recorded yet
- If `LEARNINGS` has content: **Read each one. Apply them to your work.**

---

## Quality Rules Recovery

The `/api/resume` response also includes `quality_rules` if methodology analysis has been run:

```json
{
  "quality_rules": {
    "known_language_guidance": {
      "avoid_patterns": [
        {"pattern": "I'd not like", "use_instead": "I wouldn't like"}
      ],
      "trust_test": "Would a native speaker say this naturally?"
    },
    "zut_direction": "eng → ara",
    "early_seed_guidance": {
      "applies_to_seeds": [1, 20],
      "phrase_tips": ["Max 2 nesting levels", "Max 1 time word per phrase"]
    },
    "methodology_insights": [...]
  }
}
```

**Key guidance from quality_rules:**
- `known_language_guidance.avoid_patterns`: DON'T use these known-text patterns
- `zut_direction`: The ZUT constraint direction for this course
- `early_seed_guidance`: Special constraints for early seeds
- `methodology_insights`: General learnings about this language pair

**If `quality_rules` is null:**
- Run `/course-methodology-analysis {course_code}` after Pass 1 to generate it
- Future agents will then have this guidance automatically

---

## Other Useful Skills

- `/translation-analysis` - Two-pass workflow guide
- `/course-methodology-analysis` - Generate quality_rules after Pass 1
- `/jpn-analysis-example` - Example analysis output (Japanese)
- `ralph-methodology.md` - Complete course building methodology (decomposition, phrases, learner pattern)
