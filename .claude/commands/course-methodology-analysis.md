# Course Methodology Analysis

Run this skill after Pass 1 completes to capture language-pair specific guidance. This documents what worked, what didn't, and saves insights to `courses.quality_rules` for future agents.

## When to Run

- After all seeds are translated with phrases (Pass 1 complete)
- Before major refinement passes
- After significant phrase QA / Opus Polish runs

## Core Principles to Capture

### 1. Known Language Priority

```
Known language quality > Target language quality

Bad known = "What is this nonsense?" = Lost learner trust
```

The learner KNOWS this language. It must be natural, idiomatic, trustworthy. The target language can have pedagogical structure (it's what they're learning), but the known language must never sound "AI weird."

### 2. ZUT Asymmetry

ZUT (Zero Unprompted Thinking) direction depends on course type:

| Course Type | ZUT Direction | Constraint |
|-------------|---------------|------------|
| `fra_for_eng` | FR → EN | Same French = same English |
| `eng_for_fra` | EN → FR | Same English = same French |

**Key insight:**
- `known → target`: **STRICT** (same known = same target, always)
- `target → known`: **FLEXIBLE** (multiple known can map to one target)

**Cannot swap columns between course types.** The directional constraint is fundamental.

### 3. Opus Polish Handles Known-Language Quality

Phrase QA already has Opus Polish for known-language refinement. This analysis skill captures insights for that process, not duplicating it.

---

## What This Skill Does

1. Fetches all seeds and phrases for the course
2. Analyzes patterns (awkward constructions, what worked)
3. Documents language-specific insights
4. Saves to `courses.quality_rules` JSONB column

---

## Analysis Process

### Step 1: Fetch Course Data

```sql
-- Get course metadata
SELECT * FROM courses WHERE code = $1;

-- Get all seeds with translations
SELECT seed_number, known_text, target_text
FROM course_seeds
WHERE course_code = $1
ORDER BY seed_number;

-- Get all practice phrases
SELECT seed_number, lego_index, known_text, target_text, role
FROM course_practice_phrases
WHERE course_code = $1
ORDER BY seed_number, lego_index, position;
```

### Step 2: Analyze Known Language Patterns

Look for patterns that sound unnatural in the known language:

**Common issues to flag:**
- Contraction weirdness: "I'd not like" instead of "I wouldn't like"
- Gerund/infinitive confusion: "trying to try" (redundant nesting)
- Article problems: "a little of Spanish" instead of "a little Spanish"
- Awkward conditionals: "If I would have known" instead of "If I had known"
- Register mixing: mixing formal/casual inappropriately

**Trust test:** Would a native speaker say this naturally?

### Step 3: Analyze Target Language Patterns

Document structural insights discovered during translation:

- How do X concepts map (gerunds, infinitives, modals)?
- What grammatical particles are tricky?
- What common constructions work well?

### Step 4: Document Early Seed Guidance

Seeds 1-20 have limited vocabulary. Capture what constraints apply:

- Accept some repetition over awkward novelty
- Max nesting levels before phrases get confusing
- Which time words are available when

### Step 5: Capture Methodology Insights

General learnings about this language pair:

- What phrase structures worked well?
- What constructions should be avoided?
- What translation patterns emerged?

---

## Output Schema: quality_rules

Save this to `courses.quality_rules`:

```json
{
  "course_code": "ara_for_eng",
  "known_language": "eng",
  "target_language": "ara",
  "analysis_date": "2026-01-29",
  "analysis_version": "1.0",

  "known_language_guidance": {
    "quality_bar": "Natural, idiomatic English - learner knows this language",
    "trust_test": "Would a native speaker say this naturally?",
    "avoid_patterns": [
      {
        "pattern": "I'd not like",
        "use_instead": "I wouldn't like",
        "reason": "Uncommon contraction form"
      },
      {
        "pattern": "a little of [language]",
        "use_instead": "a little [language]",
        "reason": "Sounds formal/stilted"
      },
      {
        "pattern": "trying to try",
        "reason": "Redundant nesting"
      }
    ],
    "register_notes": [
      "Keep casual-friendly tone",
      "Avoid overly formal constructions"
    ]
  },

  "target_language_guidance": {
    "quality_bar": "Correct and learnable - can have pedagogical structure",
    "structural_notes": [
      "Arabic masdar (verbal nouns) map awkwardly to English gerunds",
      "Use MSA with casual register markers",
      "Verbs change form based on who is speaking (I/you/he/she patterns)"
    ],
    "common_patterns": [
      {
        "english_pattern": "want to V",
        "target_form": "أريد أن + subjunctive",
        "frequency_rank": 1
      }
    ]
  },

  "zut_direction": "eng → ara",
  "zut_note": "Same English must always produce same Arabic. Multiple English phrases can map to one Arabic phrase.",

  "early_seed_guidance": {
    "applies_to_seeds": [1, 20],
    "vocabulary_constraints": [
      "Limited time words: 'now', 'today' only after seed 15",
      "Future time patterns (will/going to) not available until seed 10"
    ],
    "phrase_tips": [
      "Accept some repetition over awkward novelty",
      "Max 2 nesting levels (e.g., 'I want to try to learn' is border)",
      "Max 1 time word per phrase"
    ]
  },

  "methodology_insights": [
    "BUILD phrases must be speakable in isolation",
    "USE phrases should be complete, natural sentences",
    "Shorter phrases teach pronunciation, longer phrases teach flow",
    "Avoid 'teaching grammar' in known text - demonstrate by example"
  ],

  "opus_polish_guidance": [
    "Priority: fix unnatural English over perfect Arabic coverage",
    "Flag any phrase where known_text sounds 'AI-generated'",
    "Prefer common contractions: 'I'm', 'don't', 'can't'"
  ]
}
```

---

## Saving to Database

After generating the analysis, save via the Course Builder API:

```bash
POST http://localhost:3471/api/course/{courseCode}/quality-rules
Content-Type: application/json

{
  "quality_rules": {
    "course_code": "ara_for_eng",
    "known_language": "eng",
    "target_language": "ara",
    "analysis_date": "2026-01-29",
    "known_language_guidance": { ... },
    "target_language_guidance": { ... },
    "zut_direction": "eng → ara",
    "early_seed_guidance": { ... },
    "methodology_insights": [ ... ]
  }
}
```

---

## Database Schema Requirement

The `courses` table needs a `quality_rules` JSONB column. Add it with:

```sql
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS quality_rules JSONB DEFAULT NULL;

COMMENT ON COLUMN courses.quality_rules IS
'Language-pair specific methodology guidance discovered during Pass 1.
Includes known-language quality patterns, target-language structural notes,
ZUT direction, and early seed constraints. Populated by /course-methodology-analysis.';
```

---

## Usage

After Pass 1 is complete:

```
/course-methodology-analysis ara_for_eng
```

This will:
1. Query all course data from Supabase
2. Analyze patterns in both languages
3. Generate the quality_rules JSON
4. POST to `/api/course/{courseCode}/quality-rules`

---

## Loading Guidance in Future Sessions

Future agents automatically receive `quality_rules` via the `/api/resume` endpoint:

```bash
GET http://localhost:3471/api/resume/ara_for_eng
```

Response includes:
```json
{
  "ACTION": { ... },
  "translation_analysis": { ... },
  "quality_rules": {
    "known_language_guidance": { ... },
    "zut_direction": "eng → ara",
    ...
  },
  ...
}
```

Or fetch directly:
```bash
GET http://localhost:3471/api/course/ara_for_eng/quality-rules
```

---

## Example: Arabic for English Speakers

After analyzing ara_for_eng:

```json
{
  "course_code": "ara_for_eng",
  "known_language": "eng",
  "target_language": "ara",
  "analysis_date": "2026-01-29",

  "known_language_guidance": {
    "quality_bar": "Natural, conversational English",
    "avoid_patterns": [
      {"pattern": "I desire to", "use_instead": "I want to"},
      {"pattern": "at this moment", "use_instead": "right now"}
    ]
  },

  "target_language_guidance": {
    "structural_notes": [
      "MSA with Egyptian-influenced vocabulary",
      "Use أريد أن for 'want to' consistently",
      "When 'I' is the speaker, verbs start with أ- sound"
    ]
  },

  "zut_direction": "eng → ara",

  "early_seed_guidance": {
    "applies_to_seeds": [1, 20],
    "phrase_tips": [
      "Limited pronouns available - just 'I' until seed 5",
      "No negation until seed 8"
    ]
  },

  "methodology_insights": [
    "Arabic script renders well in the app",
    "Keep MSA but avoid overly formal vocabulary"
  ]
}
```

---

## Workflow Position

```
New Course Started
       ↓
Pass 1: Translation (668 seeds)
       ↓
Pass 1: LEGO decomposition
       ↓
Pass 1: Phrase generation
       ↓
Opus Polish (phrase QA) ← handles known-language quality
       ↓
/course-methodology-analysis ← YOU ARE HERE - captures insights
       ↓
Guidance saved to courses.quality_rules
       ↓
Future passes/agents load guidance into context
```

---

## Related Skills

- `/translation-analysis` - Pass 1 pattern discovery (feeds into this)
- `/phrase-monitor` - Real-time phrase quality checking
- `/phrase-fixer` - Opus correction agent for phrase issues
- `/course-audit` - Comprehensive quality audit
- `/course-resume` - Recovery after context compaction (should include quality_rules)
