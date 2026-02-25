/**
 * Brief: TRANSLATE — Single Opus agent translates all 668 seeds.
 * Extracted from generateTranslationBrief() in course-builder-api.cjs.
 */

const { getSupabase, getLanguageName, getKnownLanguageName } = require('./shared.cjs');

async function generateTranslateBrief(courseCode) {
  const supabase = getSupabase();
  const targetLanguageName = getLanguageName(courseCode);
  const knownName = getKnownLanguageName(courseCode);

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules')
    .eq('course_code', courseCode)
    .single();

  const displayName = courseInfo?.display_name || courseCode;
  const translateCount = 668;

  return `# Seed Translation Agent — ${courseCode}

You are translating ALL ${translateCount} canonical seed sentences into ${targetLanguageName}.
Your goal is learner confidence, not native perfection.

## Translation Doctrine

# SEED Translation Doctrine v1.0
## Confidence-First, Hardest-Working Vocabulary Method

### Purpose
This document defines the canonical method for translating the **668 SEED sentences**
into any target language in a way that:

- maximises learner confidence
- minimises decision paralysis
- enables early spoken production
- stays portable across unrelated language families
- supports audio-first, grammar-implicit learning

This doctrine is language-agnostic and has been validated across:
- Italian
- Spanish
- French (full 668)
- Arabic (MSA)
- Mandarin Chinese

---

## Core Principle
At any given stage, each English intention should map to the fewest possible
target-language forms that remain natural and understandable.

**Clarity beats nuance.**
**Predictability beats elegance.**
**Confidence beats completeness.**

---

## Structural Phases

### Phase 1 — Stabilisation (SEEDs 1–150)
**Goal:** Enable learners to *say things* without hesitation.

Rules:
- Aggressively minimise variation.
- Prefer a single "hardest-working" verb/structure per function.
- Avoid synonym drift.
- Prefer transparent, spoken constructions over idioms.
- Grammar appears only when structurally unavoidable, never explained.

Avoid:
- register switching
- stylistic upgrades
- native-speaker optimisation

---

### Phase 2 — Controlled Flexibility (SEEDs 151–300)
**Goal:** Expand expressive range *without introducing uncertainty*.

Rules:
- Phase 1 mappings remain valid.
- Limited variation is allowed **only when it does not create choice anxiety**.
- New forms may appear if high-frequency and non-competing.
- Variation is additive, not substitutive.

---

### Phase 3 — Natural Range (SEEDs 301–668)
**Goal:** Support real-world conversational range.

Rules:
- Natural variation and idioms may appear.
- Earlier mappings are never contradicted or invalidated.
- The learner's mental model **expands**, not fragments.

---

## Language-Agnostic Design Rules
- Choose **hardest-working vocabulary** (broad, reusable, forgiving).
- Prefer predictable syntax over clever idiomatic choices.
- Avoid early register/politeness/stylistic decisions.
- Grammar remains implicit and experiential.
- Output must work spoken, even when imperfectly produced.

---

## Success Criteria
A translation is correct **if and only if** it:
- enables productive reuse by a beginner
- reduces hesitation
- avoids forcing early "which one should I use?" decisions

Native-speaker perfection is not the metric.
Learner momentum is.

---

## Agent Prompt

SEED TRANSLATION AGENT PROMPT v1.0

You are translating a fixed set of ${translateCount} SEED sentences for language learning.
Your goal is learner confidence, not native perfection.

CORE RULE
At any given stage, each English intention must map to the fewest possible
target-language forms that remain natural and understandable.

Clarity > nuance
Predictability > elegance
Confidence > completeness

PHASES

Phase 1 (1–150): Stabilisation
- Aggressively minimise variation
- One "hardest-working" form per function
- No synonym drift
- Spoken, transparent constructions
- Grammar only when unavoidable (never explained)

Phase 2 (151–300): Controlled Flexibility
- Phase-1 mappings remain valid
- Limited variation only if it does not create choice anxiety
- Variation is additive, never substitutive

Phase 3 (301–668): Natural Range
- Natural variation/idioms allowed
- Earlier forms never invalidated

GLOBAL RULES
- Hardest-working vocabulary
- Predictable syntax
- Avoid early register/politeness decisions
- Audio-first robustness

SUCCESS TEST
A translation is correct if it reduces hesitation and enables reuse.

## API Workflow

1. Fetch seeds needing translation in batches of 50 (NOT all at once):
   curl -s "http://localhost:3471/api/course/${courseCode}/translate?limit=50&offset=0"
   Increment offset by 50 each time: offset=0, offset=50, offset=100, etc.

2. Translate each batch of 50 and submit:
   curl -X POST "http://localhost:3471/api/course/${courseCode}/translate" \\
     -H "Content-Type: application/json" \\
     -d '{ "translations": [{ "seed_number": 1, "target_text": "..." }, ...] }'

3. Fetch the next batch (offset += 50) and repeat until all ${translateCount} seeds are translated.
   Keep your output concise — do NOT print every seed back. Just translate, submit, move on.

4. Write a translation analysis and submit:
   curl -X POST "http://localhost:3471/api/course/${courseCode}/analysis" \\
     -H "Content-Type: application/json" \\
     -d '{ "analysis": {
       "generated_at": "<ISO timestamp>",
       "seeds_analyzed": ${translateCount},
       "register": { "choice": "...", "markers": ["..."] },
       "problem_verbs": ["..."],
       "golden_keys": ["..."],
       "zut_concerns": ["..."]
     }}'

## Key Context
- Course: ${courseCode} (${displayName})
- Known language: ${knownName} (already populated in course_seeds)
- Target language: ${targetLanguageName} (you provide these translations)
- Work through ALL phases: 1-150 (Stabilisation), 151-300 (Controlled Flexibility), 301-${translateCount} (Natural Range)
- Same concept = same word throughout. Build a glossary as you go.
- The analysis at the end captures register decisions, tricky verbs, and ZUT concerns for course-building agents.

## IMPORTANT
You are running unattended. NEVER ask questions. Process everything and submit results.
Do NOT spawn sub-agents — translate all seeds yourself sequentially.
Work SLOWLY AND STEADILY — quality over speed.
`;
}

module.exports = generateTranslateBrief;
