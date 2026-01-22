# Ralph Course Builder Methodology

> **This is NOT a translation job.** You are building a pedagogical structure where
> every phrase serves a specific learning purpose. The learner acquires language
> through CONTRAST and BUILD-UP, never through explanation.

---

## The Core Philosophy

### Grammar is INFERRED, Never Taught

Learners infer grammar from seeing pairs in contrast. Components are NEVER grammatical explanations.

```
WRONG: "了 is a completed action marker"
RIGHT: do → 做, done → 做了 (learner INFERS the grammar)

WRONG: "-o is first person conjugation"
RIGHT: to speak → falar, I speak → eu falo (learner INFERS conjugation)
```

**Rule: If you can't translate it to a single English WORD, don't make it a component.**

### The Unit of Communication is the LEGO

Components break down M-LEGOs for DISPLAY ONLY - they show internal structure.
Components are NEVER practiced as audio. Only LEGOs (A or M) are practiced.

---

## LEGO Types

### A-LEGO (Atomic)
Single meaningful word. No components needed.

```json
{
  "type": "A",
  "known": "Chinese",
  "target": "中文"
}
```

### M-LEGO (Molecular)
Multi-word phrase. MUST have components for display.

```json
{
  "type": "M",
  "known": "after you finish",
  "target": "despues de que termines",
  "components": [
    {"known": "after", "target": "despues de"},
    {"known": "that", "target": "que"},
    {"known": "you finish", "target": "termines"}
  ]
}
```

**Component translations can be literal** - they help learners see internal structure.
They're for comprehension, not production.

---

## Phrase Roles: BUILD vs USE

### BUILD Phrases (4 required)
**Purpose:** Lock in the pattern. Get the LEGO "in."

- Fragments OK (don't need to be complete sentences)
- SHORT → MEDIUM length
- Must contain the LEGO (exact character match)
- NOT eternal-eligible

```
BUILD examples for "after you finish" → "despues de que termines":

1. after you finish                    → despues de que termines
2. after you finish working            → despues de que termines de trabajar
3. after you finish eating             → despues de que termines de comer
4. come over after you finish          → ven despues de que termines
```

### USE Phrases (6 required)
**Purpose:** Natural production. Put the LEGO "out."

- MUST be complete sentences (complete thought, subject + verb)
- MEDIUM → LONG length
- Must contain the LEGO (exact character match)
- ALL are eternal-eligible (go into spaced repetition)

```
USE examples for "after you finish" → "despues de que termines":

5. Do you want to come over after you finish?
   → ¿Quieres venir despues de que termines?

6. Please come over after you finish
   → Por favor ven despues de que termines

7. It would be good to see you after you finish
   → Sería bueno verte despues de que termines

8. I want to practice Spanish with you after you finish working
   → Quiero practicar español contigo despues de que termines de trabajar

9. Can you help me after you finish eating?
   → ¿Puedes ayudarme despues de que termines de comer?

10. I'm going to call you after you finish
    → Voy a llamarte despues de que termines
```

### Length Requirements

| Role | Count | Length | Complete Sentence? | Eternal? |
|------|-------|--------|-------------------|----------|
| BUILD | 4 | 2 SHORT, 2 MEDIUM | No (fragments OK) | No |
| USE | 6 | 3 MEDIUM, 3 LONG | Yes (required) | Yes |

**Length definitions (by syllables):**
- SHORT: 3-5 syllables
- MEDIUM: 6-9 syllables
- LONG: 10+ syllables

---

## USE Phrase Scoring (1-9)

Every USE phrase MUST have a self-assessed quality score. USE phrases go into eternal rotation - learners hear them hundreds of times. Quality matters.

### Score Scale

| Score | Meaning |
|-------|---------|
| **9** | Grammatically perfect, semantically excellent, high value in both languages |
| **7-8** | Strong phrase, minor stylistic preferences possible |
| **5-6** | Solid, functional, no issues but not remarkable |
| **3-4** | Grammatically OK, but awkward/textbook-ish |
| **1-2** | Grammatically OK, semantically questionable, low value |
| **0** | Grammatical error → **REWRITE, don't submit** |

### Scoring Rules

1. **Score 0 = Rewrite**: If you assess a phrase as 0, don't submit it. Fix the grammar and resubmit.
2. **Be honest**: Your scores will be sampled by QA. Consistent over-rating will be flagged.
3. **Score before submitting**: Rate each USE phrase immediately after writing it.

### What Makes a High Score?

**9 (Excellent):**
- Native speakers would actually say this in both languages
- Teaches something transferable and useful
- Flows naturally when spoken aloud

**5-6 (Functional):**
- Grammatically correct in both languages
- Makes sense but might sound slightly formal/textbook
- Gets the job done

**1-2 (Marginal):**
- Technically correct but no one would say this
- Awkward in one or both languages
- Low pedagogical value

---

## Complete LEGO Submission Format

```json
{
  "idx": 1,
  "type": "M",
  "known": "after you finish",
  "target": "despues de que termines",
  "components": [
    {"known": "after", "target": "despues de"},
    {"known": "that", "target": "que"},
    {"known": "you finish", "target": "termines"}
  ],
  "build": [
    {"known": "after you finish", "target": "despues de que termines"},
    {"known": "after you finish working", "target": "despues de que termines de trabajar"},
    {"known": "after you finish eating", "target": "despues de que termines de comer"},
    {"known": "come over after you finish", "target": "ven despues de que termines"}
  ],
  "use": [
    {"known": "Do you want to come over after you finish?", "target": "¿Quieres venir despues de que termines?", "score": 8},
    {"known": "Please come over after you finish", "target": "Por favor ven despues de que termines", "score": 7},
    {"known": "It would be good to see you after you finish", "target": "Sería bueno verte despues de que termines", "score": 7},
    {"known": "I want to practice Spanish with you after you finish working", "target": "Quiero practicar español contigo despues de que termines de trabajar", "score": 8},
    {"known": "Can you help me after you finish eating?", "target": "¿Puedes ayudarme despues de que termines de comer?", "score": 8},
    {"known": "I'm going to call you after you finish", "target": "Voy a llamarte despues de que termines", "score": 7}
  ]
}
```

---

## Seed Decomposition

### Tiling Requirement

Every seed must be FULLY TILEABLE from its LEGOs. No part can be missing.

```
Seed: "I want to speak Chinese with you now"
Target: "我现在想和你说中文"

LEGOs must cover:
- 我想 (I want) ✓
- 说 (speak) ✓
- 中文 (Chinese) ✓
- 和你 (with you) ✓
- 现在 (now) ✓

Full reconstruction: 我 + 现在 + 想 + 和 + 你 + 说 + 中文 ✓
```

**If any part is missing, add a LEGO for it.**

### Pedagogical Ordering (NOT Sentence Order)

Order LEGOs so phrases build naturally. Temporal markers and particles come LAST.

**BAD** (follows sentence order):
```
1. I → 我
2. now → 现在  ← TOO EARLY! Nothing to combine with
3. want → 想
```

**GOOD** (pedagogical):
```
1. I want → 我想 [M-LEGO, immediately useful]
2. to speak → 说
3. Chinese → 中文
4. with you → 和你
5. now → 现在  ← LAST! Now combines with everything
```

---

## ZUT (Zero Uncertainty Test)

Same English → same target. Always.

### Violation Example
```
Seed 10: "know" → 알다
Seed 45: "know" → 알고 있다  ← REJECTED! Conflicts with seed 10
```

### Fix: Upchunk to Disambiguate
```
Seed 10: "know (fact)" → 알다
Seed 45: "know (state)" → 알고 있다  ✓ Different English = OK
```

Or use synonyms: "know" vs "be aware of" vs "understand"

### Common Problem Verbs (check your translation analysis)
- remember (retain vs recall)
- know (fact vs state vs skill)
- think (opinion vs deliberate)
- see (visual vs meet)
- feel (physical vs intuition)

---

## Vocabulary Constraints

For LEGO N in seed S, phrases can ONLY use:
- This LEGO (N) itself
- All LEGOs from seeds 1 through S-1
- LEGOs 1 through N-1 from current seed S
- M-LEGO components from above

**You CANNOT use vocabulary not yet introduced!**

---

## Multi-Language Examples

### Chinese (Sinitic)
```
M-LEGO: "I want" → "我想"
Components: [I→我, want→想]

BUILD:
- I want → 我想
- I want to speak → 我想说
- I want to learn → 我想学
- I want to try → 我想试

USE:
- I want to speak Chinese → 我想说中文
- I want to learn Chinese with you → 我想和你学中文
- Now I want to try to speak Chinese → 我现在想试着说中文
- I want to learn how to speak Chinese → 我想学怎么说中文
- I want to try to learn Chinese with you → 我想试着和你学中文
- Do you want to speak Chinese with me? → 你想和我说中文吗?
```

### Portuguese (Romance)
```
M-LEGO: "I have been learning" → "tenho aprendido"
Components: [I have→tenho, learned→aprendido]

BUILD:
- I have been learning → tenho aprendido
- I have been learning Portuguese → tenho aprendido português
- I have been learning to speak → tenho aprendido a falar
- I have been learning with you → tenho aprendido contigo

USE:
- I have been learning Portuguese with you → tenho aprendido português contigo
- I have been learning to speak Portuguese → tenho aprendido a falar português
- I have been learning how to speak Portuguese well → tenho aprendido a falar português bem
- I have been learning Portuguese because I want to travel → tenho aprendido português porque quero viajar
- Have you been learning Portuguese? → Você tem aprendido português?
- I have been learning Portuguese for three months → tenho aprendido português há três meses
```

### German (Germanic)
```
M-LEGO: "I would like to" → "ich möchte"
Components: [I→ich, would like→möchte]

BUILD:
- I would like to → ich möchte
- I would like to speak → ich möchte sprechen
- I would like to learn → ich möchte lernen
- I would like to try → ich möchte versuchen

USE:
- I would like to speak German → ich möchte Deutsch sprechen
- I would like to learn German with you → ich möchte Deutsch mit dir lernen
- I would like to try to speak German → ich möchte versuchen Deutsch zu sprechen
- I would like to learn how to speak German well → ich möchte lernen gut Deutsch zu sprechen
- Would you like to speak German with me? → Möchtest du Deutsch mit mir sprechen?
- I would like to practice German every day → ich möchte jeden Tag Deutsch üben
```

### Korean (Koreanic)
```
M-LEGO: "I want to" → "하고 싶어요"
Components: [do→하다, want→싶다]

BUILD:
- I want to → 하고 싶어요
- I want to speak → 말하고 싶어요
- I want to learn → 배우고 싶어요
- I want to try → 해보고 싶어요

USE:
- I want to speak Korean → 한국어를 말하고 싶어요
- I want to learn Korean with you → 당신과 한국어를 배우고 싶어요
- I want to try to speak Korean → 한국어를 말해보고 싶어요
- I want to learn how to speak Korean well → 한국어를 잘 말하는 법을 배우고 싶어요
- Do you want to speak Korean with me? → 저와 한국어를 말하고 싶어요?
- I want to practice Korean every day → 매일 한국어를 연습하고 싶어요
```

---

## Error Handling

### Errors Are Data, Not Failures

When the API rejects your submission, the error message tells you EXACTLY what to fix.

```
Error: "ZUT violation: 'know' already maps to '알다'"
Action: Upchunk to "know (state)" or use synonym "be aware of"

Error: "Vocabulary violation: '내일' not yet introduced"
Action: Remove phrase using '내일' or reorder LEGOs

Error: "USE phrases need 6, got 4"
Action: Add 2 more complete sentences

Error: "BUILD phrase 'I want' missing LEGO target '하고 싶어요'"
Action: Ensure phrase contains exact LEGO target text
```

### Self-Correction Pattern

```
For each seed:
1. POST to /api/seed/complete
2. If rejected:
   - Read the error message carefully
   - It tells you EXACTLY what's wrong
   - Apply the fix
   - Retry (max 3 attempts)
3. If still failing after 3 attempts:
   - Note the blocker in progress
   - Move to next seed
   - Return to blocked seeds later
```

---

## Workflow

### Starting Each Iteration

```
1. GET /api/resume/{course_code}
   → Returns: next_seed, completed_count, calibration_feedback

2. Read the response to understand:
   - Which seed to work on next
   - Any calibration feedback from QA checkpoints
   - Drift warnings if your self-scores don't match QA scores

3. Work on the next incomplete seed
```

---

## QA Checkpoints

The build process has **three QA checkpoints** where a QA agent independently verifies quality:

| Checkpoint | After Seed | Purpose |
|------------|------------|---------|
| **1** | 10 | Early catch - is methodology correct? |
| **2** | 50 | Drift check - is calibration holding? |
| **3** | 150 | Sustained quality - past halfway, still good? |

### What Happens at Checkpoints

1. Build pauses with `CHECKPOINT_REACHED` status
2. QA agent spawns automatically
3. QA samples ~50 phrases and re-scores them independently
4. QA evaluates 4 gates:
   - **Gate 1**: Absolute quality (QA avg >= 7.0)
   - **Gate 2**: USE > BUILD (USE phrases must outscore BUILD)
   - **Gate 3**: Vocabulary (no forbidden words)
   - **Gate 4**: Drift (your scores vs QA scores)
5. If all gates pass → auto-approve, build continues
6. If gates fail → REJECT, build halts

### Calibration Feedback

After each checkpoint, `/api/resume` includes feedback:

```json
{
  "calibration_feedback": {
    "last_checkpoint": 50,
    "your_avg_score": 7.9,
    "qa_avg_score": 7.3,
    "drift": 0.6,
    "drift_trend": "increasing",
    "message": "Your scores are 0.6 higher than QA. Be more critical."
  }
}
```

**Use this feedback!** If QA consistently scores lower than you:
- You may be overconfident
- Be more critical of your USE phrases
- Check for textbook-ish phrasing

### Auto-Stop Triggers

The build will HALT if:
- QA average < 7.0 (quality too low)
- USE avg <= BUILD avg (methodology inverted)
- Vocabulary violations found (learner can't say unknown words)
- Drift > 1.5 points (calibration broken)
- Drift increasing for 2+ consecutive checkpoints (agent drifting)

### Submitting a Seed

```
POST /api/seed/complete
{
  "course_code": "kor_for_eng",
  "seed_number": 47,
  "known_text": "I want to speak Korean",
  "target_text": "한국어를 말하고 싶어요",
  "legos": [
    {
      "idx": 1,
      "type": "M",
      "known": "I want to",
      "target": "하고 싶어요",
      "components": [...],
      "build": [...],  // 4 phrases
      "use": [...]     // 6 phrases
    },
    {
      "idx": 2,
      "type": "A",
      "known": "to speak",
      "target": "말하다",
      "build": [...],
      "use": [...]
    },
    ...
  ]
}
```

### Completion

When all seeds pass validation:

```
<promise>COURSE_BUILD_COMPLETE</promise>
```

---

## Checklist Before Submitting Each Seed

- [ ] Seed fully tiles from LEGOs (no missing parts)
- [ ] LEGOs in pedagogical order (temporal/particles LAST)
- [ ] M-LEGOs have components (real words only, no grammar explanations)
- [ ] Each LEGO has 4 BUILD phrases (fragments OK, SHORT→MEDIUM)
- [ ] Each LEGO has 6 USE phrases (complete sentences, MEDIUM→LONG)
- [ ] All phrases contain LEGO target (exact match)
- [ ] All phrases use only introduced vocabulary
- [ ] No ZUT violations (same English → same target)

---

## Early Seeds (1-5): Relaxed Requirements

Seeds 1-5 have limited vocabulary. Requirements are relaxed:

- Seed 1, LEGO 1: 0-2 BUILD, 0-2 USE (almost nothing to combine)
- Seed 1, LEGO 2: 2 BUILD, 2 USE (can use L1)
- Seeds 2-5: 3 BUILD, 4 USE minimum
- Seeds 6+: Full requirements (4 BUILD, 6 USE)

---

## Remember

1. **You are not translating** - you are building a pedagogical structure
2. **Components are for display** - never practiced as audio
3. **Grammar is inferred** - from contrast, never explained
4. **BUILD locks it in** - fragments OK, get the pattern in
5. **USE produces naturally** - complete sentences, eternal-eligible
6. **Errors are information** - they tell you exactly what to fix
7. **The database is truth** - query it to see your progress

---

*Output `<promise>COURSE_BUILD_COMPLETE</promise>` when all seeds pass.*
