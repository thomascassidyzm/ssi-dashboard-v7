# Ralph Course Builder Methodology

> **This is NOT a translation job.** You are building a pedagogical structure where
> every phrase serves a specific learning purpose. The learner acquires language
> through CONTRAST and BUILD-UP, never through explanation.

---

## The Core Philosophy

### Grammar is INFERRED, Never Taught

Learners infer grammar from seeing pairs in contrast. Grammar is NEVER explained.

```
WRONG: "了 is a completed action marker"
RIGHT: do → 做, done → 做了 (learner INFERS the grammar)

WRONG: "-o is first person conjugation"
RIGHT: to speak → falar, I speak → eu falo (learner INFERS conjugation)
```

### The Unit of Communication is the LEGO

LEGOs are the building blocks of learning. Every LEGO (A or M) is practiced as audio.
Patterns are inferred through **overlapping LEGOs** - the learner sees a word alone, then sees it inside a phrase.

---

## LEGO Types

### A-LEGO (Atomic)
Single meaningful word. These often appear inside M-LEGOs to create overlaps.

```json
{
  "type": "A",
  "known": "Chinese",
  "target": "中文"
}
```

### M-LEGO (Molecular)
Multi-word phrase. Patterns are inferred through overlap with related A-LEGOs.

```json
{
  "type": "M",
  "known": "it's important",
  "target": "es importante"
}
```

### Overlapping LEGOs (The Teaching Mechanism)

LEGOs do NOT have to tile perfectly to make the SEED. Instead, create **overlapping LEGOs** where A-LEGOs also appear as parts of M-LEGOs. The overlap IS the teaching.

```
SEED: "it's important to practice speaking as often as possible"
      "es importante practicar hablar lo más frecuentemente posible"

LEGOs (with overlaps allowed):
- importante = important           (A-LEGO)
- es importante = it's important   (M-LEGO, overlaps with "importante")
- practicar = to practice          (A-LEGO)
- hablar = to speak                (A-LEGO)
- practicar hablar = to practise speaking (M-LEGO, overlaps with practicar and hablar)
- frecuentemente = often           (A-LEGO)
- posible = possible               (A-LEGO)
- lo más frecuentemente posible = as often as possible (M-LEGO)
```

The learner sees "importante" alone, then sees it inside "es importante" - the overlap lets them infer the pattern without explanation.

---

## Phrase Roles: BUILD vs USE

### BUILD Phrases (flexible quantity)
**Purpose:** Show how the new LEGO "plugs in" to what the learner already knows.

BUILD phrases combine the **new LEGO** with **previously introduced LEGOs**. This is how the learner sees the new piece connecting to their existing vocabulary. Each BUILD phrase must contain the **entire LEGO** plus content from LEGOs the learner already knows.

- **The new LEGO + previously introduced LEGOs** (keep it tight, minimal cognitive load)
- Used ONLY in the **debut round** for that LEGO
- Never seen again - not in CONSOLIDATE, not in REVIEW
- Fragments OK (don't need to be complete sentences)
- No capitalisation, no trailing periods (spoken fragments, not written sentences)
- Must contain the **entire LEGO** (exact character match)
- NOT eternal-eligible

**Quantity is flexible based on LEGO length.** If the LEGO itself is already long (high syllable count), you add almost nothing. The constraint is cognitive load, not an arbitrary phrase count.

```
Welsh example - Seed 1, LEGO 2: "to speak" → "siarad"
(Learner already knows L1: "I want" → "dw i isio")

BUILD:
1. I want to speak → dw i isio siarad    ← new LEGO "siarad" + known L1 "dw i isio"

Welsh example - Seed 1, LEGO 3: "Welsh" → "cymraeg"
(Learner already knows L1: "I want" → "dw i isio", L2: "to speak" → "siarad")

BUILD:
1. to speak Welsh → siarad cymraeg       ← new LEGO "cymraeg" + known L2 "siarad"

Spanish example - "after you finish" → "despues de que termines":
(Learner already knows "working" and "eating" from earlier seeds)

BUILD:
1. after you finish working → despues de que termines de trabajar
2. after you finish eating  → despues de que termines de comer
```

**Key point:** BUILD phrases are NOT random extensions. They show the learner how their new LEGO combines with LEGOs they already know. This is what makes each new piece immediately useful.

### USE Phrases (minimum 5)
**Purpose:** Natural production. Put the LEGO "out."

- **Mix of lengths required** to create smooth progression:
  - **MEDIUM (2-3 phrases):** LEGO + 4-6 syllables - shorter complete sentences
  - **LONG (2-3 phrases):** LEGO + 7-10 syllables - fuller, richer sentences
- **Minimum 5 per LEGO** - these get reused in CONSOLIDATE, REVIEW, and listening exercises
- **MUST be complete, natural sentences** - NEVER fragments
- No capitalisation, no trailing periods (spoken phrases, not written sentences)
- A USE phrase is something a learner would ACTUALLY SAY in conversation
- Must contain the LEGO (exact character match)
- ALL are eternal-eligible (go into spaced repetition)

**Why the mix matters:** The ~7 practice phrases per LEGO should form a progression:
1. **BUILD (short):** LEGO + 1-3 syllables - lock in the pattern (fragments OK)
2. **USE medium:** LEGO + 4-6 syllables - bridge to production (complete sentences)
3. **USE long:** LEGO + 7-10 syllables - natural, fluent production

Without MEDIUM phrases, learners jump from short fragments to long sentences - a cognitive cliff. The medium phrases are the bridge.

These are the "eternal" phrases that come back throughout the course. Quality matters more than quantity.

> ⚠️ **CRITICAL**: Even with limited vocabulary in early seeds, a USE phrase must be a complete sentence. If you can't form enough complete sentences with available vocabulary, **reduce the USE count** rather than submitting fragments. "想说。" or "Speak." is NEVER acceptable as a USE phrase.

```
USE examples for "after you finish" → "despues de que termines":

1. Do you want to come over after you finish?
   → ¿Quieres venir despues de que termines?

2. Please come over after you finish
   → Por favor ven despues de que termines

3. It would be good to see you after you finish
   → Sería bueno verte despues de que termines

4. I want to practice Spanish with you after you finish working
   → Quiero practicar español contigo despues de que termines de trabajar

5. Can you help me after you finish eating?
   → ¿Puedes ayudarme despues de que termines de comer?
```

### Round Structure for a New LEGO

1. **Intro** - LEGO introduced
2. **Debut** - the LEGO itself
3. **Practice** - ~7 phrases total (all BUILD + enough USE to reach ~7)
4. **Review** - USE phrases from previous LEGOs (spaced repetition)
5. **Consolidate** - 2x USE phrases from this LEGO

### Syllable Guidelines

| Role | Syllables | Complete Sentence? | Reused? | Eternal? |
|------|-----------|-------------------|---------|----------|
| BUILD | LEGO + 1-3 | No (fragments OK) | No (debut only) | No |
| USE (medium) | LEGO + 4-6 | Yes (required) | Yes (consolidate, review) | Yes |
| USE (long) | LEGO + 7-10 | Yes (required) | Yes (consolidate, review) | Yes |

**Key principle:** Syllable count is the proxy for cognitive load. The progression SHORT → MEDIUM → LONG creates a smooth ramp, not a cliff.

---

## USE Phrase Scoring (5-9)

Every USE phrase MUST have a self-assessed quality score. USE phrases go into eternal rotation - learners hear them hundreds of times. Quality matters.

### Score Scale

| Score | Meaning |
|-------|---------|
| **9** | Excellent - native speakers would actually say this in both languages, high pedagogical value |
| **7-8** | Strong - minor stylistic preferences possible |
| **5-6** | Functional - grammatically correct, gets the job done |
| **4 or below** | Hard reject - rewrite, don't submit |

### Scoring Rules

1. **4 or below = Rewrite**: If you assess a phrase as 4 or below, don't submit it. Rewrite and resubmit.
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

---

## Complete LEGO Submission Format

Below shows how overlapping LEGOs work in practice. Note that "importante" appears both as its own A-LEGO and inside the M-LEGO "es importante":

```json
[
  {
    "idx": 1,
    "type": "A",
    "known": "important",
    "target": "importante",
    "build": [
      {"known": "important", "target": "importante"},
      {"known": "very important", "target": "muy importante"},
      {"known": "more important", "target": "más importante"},
      {"known": "not important", "target": "no importante"}
    ],
    "use": [
      {"known": "This is important", "target": "Esto es importante", "score": 8},
      {"known": "It's very important to me", "target": "Es muy importante para mí", "score": 8},
      {"known": "Is it important?", "target": "¿Es importante?", "score": 7},
      {"known": "That isn't important now", "target": "Eso no es importante ahora", "score": 7},
      {"known": "I think it's important", "target": "Creo que es importante", "score": 8},
      {"known": "Why is it important?", "target": "¿Por qué es importante?", "score": 7}
    ]
  },
  {
    "idx": 2,
    "type": "M",
    "known": "it's important",
    "target": "es importante",
    "build": [
      {"known": "it's important", "target": "es importante"},
      {"known": "it's important to practice", "target": "es importante practicar"},
      {"known": "it's important to speak", "target": "es importante hablar"},
      {"known": "it's important to learn", "target": "es importante aprender"}
    ],
    "use": [
      {"known": "It's important to practice every day", "target": "Es importante practicar cada día", "score": 8},
      {"known": "It's important to speak Spanish with you", "target": "Es importante hablar español contigo", "score": 8},
      {"known": "I think it's important to learn this", "target": "Creo que es importante aprender esto", "score": 8},
      {"known": "It's important to try", "target": "Es importante intentar", "score": 7},
      {"known": "Why is it important to practice?", "target": "¿Por qué es importante practicar?", "score": 8},
      {"known": "It's important to me", "target": "Es importante para mí", "score": 7}
    ]
  }
]
```

**Key insight:** The learner first sees "importante" alone (A-LEGO), then sees it inside "es importante" (M-LEGO). The overlap lets them infer the pattern without any explanation.

---

## Seed Decomposition

### Seeds Are Vehicles for LEGOs

**Seeds are NOT first-class citizens.** The seed is just a vehicle for delivering LEGOs to the learner. LEGOs are the real value - they're the building blocks learners use for skilful recombination.

When you decompose a seed, you're asking: "What LEGOs does this seed let me teach?" The seed exists to provide context for introducing those LEGOs.

### Tiling Requirement (Sanity Check)

Tiling is a **sanity check**, not a rigid constraint. It means: the seed CAN be recomposed from its LEGOs - at least one valid way.

**What tiling checks:**
- No words missed (every part of the seed is covered)
- No words added (LEGOs don't introduce unrelated vocabulary)

**What tiling allows:**
- Multiple valid tilings when using overlapping LEGOs (different combinations might work)
- Overlaps between LEGOs are expected and encouraged
- Late-course seeds can be very short (as few as 2-3 LEGOs)

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

Note: If you also had A-LEGOs for 我 (I) and 想 (want) that overlap
with the M-LEGO 我想 (I want), there would be multiple valid tilings.
That's fine - overlapping LEGOs are the teaching mechanism!
```

**If any part is missing, add a LEGO for it.**

### Pedagogical Ordering (NOT Sentence Order)

**Principle: Order LEGOs to maximize useful phrases at each stage.**

The goal is combinability - each new LEGO should combine meaningfully with what came before. This matters more early in the course when vocabulary is sparse.

**Early seeds (1-10):** Ordering matters more because there's limited prior vocabulary to combine with. Be thoughtful about which LEGOs come first - prioritize high-utility items that combine well.

**After ~10 seeds:** There's enough accumulated material that almost any LEGO order works. You have a rich pool of prior vocabulary, so new LEGOs can combine with many existing items regardless of introduction order.

**Non-greedy introduction:** If an A-LEGO is contained within an M-LEGO, introduce the A-LEGO first. When the M-LEGO arrives, the learner already knows part of it - reducing uncertainty and cognitive load.

```
1. importante = important (A-LEGO) ← introduce first
2. es importante = it's important (M-LEGO) ← learner recognizes "importante"
```

The learner only processes "es" as new. This is how overlapping LEGOs reduce cognitive load.

**Use good judgment, not rigid rules.** Be skilful - don't be arbitrary, but also don't over-constrain yourself.

**Example (illustrative, not prescriptive):**

Early in a course, this ordering maximizes useful combinations:
```
1. I want → 我想 [M-LEGO, immediately useful]
2. to speak → 说
3. Chinese → 中文
4. with you → 和你
5. now → 现在  [combines with everything above]
```

Introducing "now" (现在) early when there's nothing to combine with would be less effective. But in seed 50? It wouldn't matter - there's plenty of existing vocabulary to pair it with.

---

## ZUT (Zero Uncertainty Test)

Same KNOWN → same TARGET. Always.

### Violation Example
```
Seed 10: "know" → 알다
Seed 45: "know" → 알고 있다  ← REJECTED! Conflicts with seed 10
```

### Fix: Use Different Natural Phrases
```
Seed 10: "I know" → 알아요
Seed 45: "I know about it" → 알고 있어요  ✓ Different KNOWN = OK
```

The context disambiguates - no explanations needed. The learner infers the distinction.

Other options: use synonyms like "understand" or "be aware of" for one meaning.

### Problem Verbs to Watch
These verbs often have multiple translations. Disambiguate through natural phrasing:
- remember / recall / keep in mind
- know / understand / be aware of
- think / believe / consider
- see / meet / notice
- feel / sense / seem

---

## Vocabulary Constraints

For LEGO N in seed S, phrases can ONLY use:
- This LEGO (N) itself
- All LEGOs from seeds 1 through S-1
- LEGOs 1 through N-1 from current seed S
- Overlapping A-LEGOs that appear within M-LEGOs above

**You CANNOT use vocabulary not yet introduced!**

---

## Multi-Language Examples (Overlapping LEGOs)

### Chinese (Sinitic)
```
SEED: "I want to speak Chinese" → "我想说中文"

Overlapping LEGOs:
- 我 = I                    (A-LEGO)
- 想 = want                 (A-LEGO)
- 我想 = I want             (M-LEGO, overlaps with 我 and 想)
- 说 = speak                (A-LEGO)
- 中文 = Chinese            (A-LEGO)

The learner sees 我 alone, then 想 alone, then sees them combined in 我想.
The pattern is inferred from the overlap, never explained.

BUILD for 我想:
- I want → 我想
- I want to speak → 我想说
- I want to learn → 我想学
- I want to try → 我想试

USE for 我想:
- I want to speak Chinese → 我想说中文
- I want to learn Chinese with you → 我想和你学中文
- Now I want to try to speak Chinese → 我现在想试着说中文
- I want to learn how to speak Chinese → 我想学怎么说中文
- I want to try to learn Chinese with you → 我想试着和你学中文
- Do you want to speak Chinese with me? → 你想和我说中文吗?
```

### Portuguese (Romance)
```
SEED: "I have been learning Portuguese" → "tenho aprendido português"

Overlapping LEGOs:
- aprender = to learn                (A-LEGO - infinitive)
- aprendido = learned               (A-LEGO - past participle)
- tenho aprendido = I have been learning  (M-LEGO, overlaps with aprendido)
- português = Portuguese            (A-LEGO)

The learner sees "aprendido" alone, then sees it inside "tenho aprendido".
The pattern is inferred from the overlap.

BUILD for tenho aprendido:
- I have been learning → tenho aprendido
- I have been learning Portuguese → tenho aprendido português
- I have been learning to speak → tenho aprendido a falar
- I have been learning with you → tenho aprendido contigo

USE for tenho aprendido:
- I have been learning Portuguese with you → tenho aprendido português contigo
- I have been learning to speak Portuguese → tenho aprendido a falar português
- I have been learning how to speak Portuguese well → tenho aprendido a falar português bem
- I have been learning Portuguese because I want to travel → tenho aprendido português porque quero viajar
- Have you been learning Portuguese? → Você tem aprendido português?
- I have been learning Portuguese for three months → tenho aprendido português há três meses
```

### German (Germanic)
```
SEED: "I would like to speak German" → "ich möchte Deutsch sprechen"

Overlapping LEGOs:
- ich = I                   (A-LEGO)
- möchte = would like       (A-LEGO)
- ich möchte = I would like (M-LEGO, overlaps with ich and möchte)
- sprechen = to speak       (A-LEGO)
- Deutsch = German          (A-LEGO)

The learner sees "ich" alone, then "möchte" alone, then sees "ich möchte".
The pattern is inferred from seeing the combinations.

BUILD for ich möchte:
- I would like to → ich möchte
- I would like to speak → ich möchte sprechen
- I would like to learn → ich möchte lernen
- I would like to try → ich möchte versuchen

USE for ich möchte:
- I would like to speak German → ich möchte Deutsch sprechen
- I would like to learn German with you → ich möchte Deutsch mit dir lernen
- I would like to try to speak German → ich möchte versuchen Deutsch zu sprechen
- I would like to learn how to speak German well → ich möchte lernen gut Deutsch zu sprechen
- Would you like to speak German with me? → Möchtest du Deutsch mit mir sprechen?
- I would like to practice German every day → ich möchte jeden Tag Deutsch üben
```

### Korean (Koreanic)
```
SEED: "I want to speak Korean" → "한국어를 말하고 싶어요"

Overlapping LEGOs:
- 말하다 = to speak         (A-LEGO - dictionary form)
- 싶다 = to want            (A-LEGO - dictionary form)
- 하고 싶어요 = I want to   (M-LEGO, overlaps with 싶다)
- 한국어 = Korean           (A-LEGO)

The learner sees 싶다 alone, then sees it inside 하고 싶어요.
The pattern is inferred from observing these overlaps.

BUILD for 하고 싶어요:
- I want to → 하고 싶어요
- I want to speak → 말하고 싶어요
- I want to learn → 배우고 싶어요
- I want to try → 해보고 싶어요

USE for 하고 싶어요:
- I want to speak Korean → 한국어를 말하고 싶어요
- I want to learn Korean with you → 당신과 한국어를 배우고 싶어요
- I want to try to speak Korean → 한국어를 말해보고 싶어요
- I want to learn how to speak Korean well → 한국어를 잘 말하는 법을 배우고 싶어요
- Do you want to speak Korean with me? → 저와 한국어를 말하고 싶어요?
- I want to practice Korean every day → 매일 한국어를 연습하고 싶어요
```

---

## Audio-First Doctrine

> *We minimise early variation and maximise perceptual clarity so learners can speak immediately. Once speaking begins, interaction itself supplies the variation and refinement. Grammar is a rudder, not an engine.*

### The Distinction Ladder

Language learning is the progressive reduction of perceptual uncertainty. The learner's real task is **to stabilise sound-based distinctions under uncertainty**. Each layer has different failure modes:

| Layer | Learner's Question | Design Response |
|-------|-------------------|-----------------|
| 0. Sound vs nothing | "Is this language?" | Rhythm, repetition, predictable prosody |
| 1. Target vs other languages | "Is this Chinese, not English?" | Phonotactics, tonal contour, stable timing |
| 2. Words vs other words | "Where does one thing end?" | Multi-syllable anchors, rhythmic verbs, sentence frames |
| 3. Similar sounds (non-native ears) | "q vs ch vs zh?" | Over-distinctness, redundancy, doubling |
| 4. Similar sounds (native ears) | "These sound different to natives?" | Delay minimal pairs, delay register contrasts |
| 5. Homophones | "Same sound, different meaning?" | Context networks must exist first — postpone |

**Every design choice is evaluated by how much uncertainty it removes at the learner's current perceptual layer.**

### Operational Principles

- Choose **one form per intention** (no variation until speaking begins)
- Choose the **most audible form** (longer > shorter early on)
- Accept **provisional meaning** early (refine through conversation later)
- Attach confidence to **being understood**, not to correctness
- **Move first, steer later** — grammar is a rudder, not an engine

### Chinese-Specific Application

- **Doubles as perceptual anchors**: 试试, 看看, 说说 — two beats, rhythmically distinct, easy to parse
- **Longer connectors**: 但是, 所以, 然后 — audible discourse markers that manufacture edges
- **Multi-syllable M-LEGOs by default**: 我想, 和你, 我在试试 — not isolated monosyllables
- **Boring syntax is cognitive mercy**: predictable sentence frames reduce layer-2 uncertainty
- **Delayed compression**: full forms early (一起 not bare verbs), compressed forms much later
- **No homophone disambiguation early**: context networks must exist first

---

## Error Handling

### Errors Are Data, Not Failures

When the API rejects your submission, the error message tells you EXACTLY what to fix.

```
Error: "ZUT violation: 'know' already maps to '알다'"
Action: Use a different natural phrase like "I know about it" or synonym "be aware of"

Error: "Vocabulary violation: '내일' not yet introduced"
Action: Remove phrase using '내일' or reorder LEGOs

Error: "USE phrases need minimum 5, got 3"
Action: Add more complete sentences

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

Note: LEGOs overlap - the A-LEGO "싶다" (want) also appears inside the M-LEGO "하고 싶어요" (I want to).

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
      "type": "A",
      "known": "want",
      "target": "싶다",
      "build": [...],  // flexible quantity
      "use": [...]     // minimum 5
    },
    {
      "idx": 2,
      "type": "M",
      "known": "I want to",
      "target": "하고 싶어요",
      "build": [...],  // flexible - learner sees 싶다 inside 하고 싶어요
      "use": [...]     // minimum 5
    },
    {
      "idx": 3,
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

- [ ] Seed can be reconstructed from LEGOs (sanity check: no words missed, no words added)
- [ ] LEGOs in pedagogical order (maximize combinability, especially in early seeds)
- [ ] M-LEGOs have corresponding A-LEGOs for key vocabulary (overlapping LEGOs)
- [ ] Overlaps let patterns be inferred - learner sees word alone, then inside phrase
- [ ] Each LEGO has BUILD phrases (LEGO + 1-3 syllables, fragments OK, debut only)
- [ ] Each LEGO has minimum 5 USE phrases with a mix of lengths (2-3 medium at LEGO + 4-6 syl, 2-3 long at LEGO + 7-10 syl)
- [ ] All phrases contain LEGO target (exact match)
- [ ] All phrases use only introduced vocabulary
- [ ] No ZUT violations (same KNOWN → same TARGET)

---

## Early Seeds (1-5): Relaxed Requirements

Seeds 1-5 have limited vocabulary. Requirements are relaxed:

- Seed 1, LEGO 1: 0-2 BUILD, 0-2 USE (almost nothing to combine)
- Seed 1, LEGO 2: 2 BUILD, 2 USE (can use L1)
- Seeds 2-5: BUILD as needed (flexible), minimum 3 USE
- Seeds 6+: BUILD as needed (flexible), minimum 5 USE

The BUILD quantity is always flexible based on LEGO length and cognitive load. USE minimums ensure enough eternal phrases for spaced repetition.

---

## Remember

1. **You are not translating** - you are building a pedagogical structure
2. **Overlapping LEGOs enable inference** - word alone, then word inside phrase
3. **Grammar is inferred** - from contrast, never explained
4. **BUILD plugs the new LEGO into prior vocabulary** - fragments OK, shows connections
5. **USE produces naturally** - complete sentences, eternal-eligible
6. **Errors are information** - they tell you exactly what to fix
7. **The database is truth** - query it to see your progress

---

*Output `<promise>COURSE_BUILD_COMPLETE</promise>` when all seeds pass.*

---

## Lessons Learned (Ralph Loop)

This section captures hard-won insights from QA checkpoints and production issues. **Read before each build.**

### 2026-01-26: USE Phrases Must Be Complete Sentences

**Issue:** QA found USE phrases like "想说。" (2 chars) and "Speak." scoring 5 - these are fragments, not sentences.

**Root Cause:** Early seed vocabulary constraints led to accepting incomplete phrases rather than reducing count.

**Fix:**
- USE phrases must ALWAYS be complete sentences regardless of seed position
- If vocabulary limits prevent complete sentences, reduce USE count
- Minimum practical lengths: Chinese 4+ chars, other languages 3+ words
- Score 4 or below = rewrite, don't submit

**Validation Added:** Agent self-check before submission - if USE phrase would score 4 or below, rewrite it.

### 2026-02-05: BUILD Phrases Must Show LEGO Plugging Into Prior Vocabulary

**Issue:** Agent repeatedly confused BUILD phrases with: (a) listing the LEGO by itself, (b) M-LEGO component build-up, (c) random word extensions. Produced BUILD phrases like "how → hoe" or "to speak → 说" which are just the LEGO in isolation — not BUILD phrases at all.

**Root Cause:** Guidance said "LEGO + 1-3 extra syllables" without making clear that the extra content must be **previously introduced LEGOs**. The purpose of BUILD is to show the learner how the new piece connects to what they already know.

**Fix:**
- BUILD = the **entire new LEGO** combined with **LEGOs the learner already knows**
- BUILD shows "plugging in" — e.g., for new LEGO "Chinese" → "中文", a BUILD phrase is "speak Chinese → 说中文" because the learner already knows "说" (to speak)
- BUILD is NOT the LEGO by itself, NOT component build-up, NOT random extensions
- If there's nothing to combine with yet (L1 of Seed 1), that's OK — early seeds are honestly sparse

**Updated:** ralph-methodology.md, calibrate.md, spawn-course-builder.cjs all clarified.

---

### 2026-02-05: Decomposition Should Be Driven by Phrase Quality

**Issue:** Agent decomposed Dutch "how to speak as often as possible" → "hoe je zo vaak mogelijk spreekt" into separate A-LEGO "how" → "hoe" — but standalone "hoe" can't make useful BUILD phrases because Dutch subordinate clauses require conjugated verbs that haven't been introduced yet.

**Root Cause:** Decomposition was driven by tiling logic ("what pieces cover the target?") rather than by asking "what LEGOs produce good BUILD and USE phrases?"

**Fix:**
- Always check: can this LEGO make meaningful BUILD phrases with existing vocabulary?
- If not, the decomposition is wrong — try bundling differently
- Order LEGOs by combination richness: put LEGOs that combine well with existing vocab first
- Structural mismatches between languages get absorbed into M-LEGOs (e.g., English "how to speak" → Dutch "hoe je spreekt" bundles the subordinate clause structure)

---

### 2026-02-16: Two-Mode Build Workflow (Collaborative → Parallel)

**Issue:** Building 300 seeds sequentially with one agent is slow. But parallel agents from seed 1 produce poor foundations because the first 10 seeds establish every pattern the rest of the course depends on.

**Root Cause:** Seeds 1-10 are qualitatively different from seeds 11+. They bootstrap the core vocabulary and grammatical patterns that all subsequent seeds recombine. Getting these wrong cascades through the entire course.

**Fix — Two-mode workflow:**

**Mode 1: Human + Single Agent (Seeds 1-10)**
- One seed at a time, human reviews each before submission
- Human watches for: natural target language, useful LEGOs, good pedagogical ordering
- These seeds establish the "golden keys" (highest-ROI patterns like desire forms, progressive, intention)
- Stop at seed 10 checkpoint for QA before proceeding

**Mode 2: Parallel Agents (Seeds 11-50+)**
- After checkpoint 10 approved, launch 4-8 parallel Sonnet agents
- Each agent gets a batch (e.g., 11-15, 16-20, 21-25...)
- Each agent MUST pull vocab before EVERY seed (`GET /api/vocab/{course}`) — other agents may have added words since last check
- Agents work sequentially within their batch (S11 before S12)
- API validates atomically — agents fix and retry on failure
- Human spot-checks periodically
- Stop at seed 50 for checkpoint QA

**Why this works:** Mode 1 ensures the foundation is solid. Mode 2 leverages the fact that by seed 11+, there's enough vocabulary that decomposition becomes more mechanical and quality is easier to maintain.

---

### 2026-02-16: Vocab Bootstrapping Curve

**Issue:** Early seeds have sparse USE phrases because there's almost no prior vocabulary to recombine with. Agents sometimes force low-quality phrases to hit minimum counts.

**Root Cause:** The vocab constraint means L1 of S1 has ZERO prior vocabulary. L1 can only produce the LEGO itself as a BUILD phrase and maybe 1 USE phrase. This is fundamentally different from S10+ where rich recombination is possible.

**Fix — Accept the bootstrapping curve:**

| Seed | Typical vocab available | USE phrases per LEGO |
|------|------------------------|---------------------|
| S1 | 0 prior words | 1-3 (sparse is OK) |
| S2-3 | 5-15 prior words | 3-5 |
| S4-5 | 15-30 prior words | 5-8 |
| S6-10 | 30-60 prior words | 5-8 (standard) |
| S11+ | 60+ prior words | 8+ (rich recombination) |

**Never sacrifice quality for quantity.** If you can only make 3 good USE phrases for L1 of S2, submit 3 good ones — don't pad with garbage.

---

### 2026-02-16: Markdown Submission Format

**Issue:** Agents using JSON submission format produce more validation errors than agents using markdown format. The markdown format is more natural for linguistic content and easier to review.

**Fix — Prefer markdown submission:**

```markdown
# Seed N
Known: [source language sentence]
Target: [target language sentence]

## L1 [A] "known_chunk" → "target_chunk"

BUILD:
- known_chunk → target_chunk
- known_chunk + prior_vocab → target phrase fragment

USE:
- Full known sentence。 → Full target sentence. [score]
- Another sentence。 → Another sentence. [score]

## L2 [M] "known_chunk" → "target_chunk"
Components: comp1_known → comp1_target, comp2_known → comp2_target

BUILD:
- known_chunk → target_chunk
- Combination → Combination

USE:
- Sentence。 → Sentence. [score]
```

**Format rules:**
- BUILD: `- known → target` (no periods, no scores, fragments OK)
- USE: `- known。 → target. [score]` (periods, scores 5-9, complete sentences)
- Components line for M-LEGOs only
- Submit: `curl -s -X POST "http://localhost:3471/api/seed/complete?course={code}" -H "Content-Type: text/markdown" --data-binary @/tmp/seedN.md`

---

### 2026-02-16: Parallel Agent Coordination

**Issue:** When multiple agents build seeds in parallel, they can create ZUT collisions if they don't see each other's vocab additions.

**Root Cause:** Agent A submits S15 with "tomorrow" → "morgen" while Agent B simultaneously submits S18 with "tomorrow" → "morgens". Both pass individual validation but create a ZUT conflict.

**Fix — Coordination protocol for parallel agents:**
1. **Pull vocab before EVERY seed** — not just at batch start. The API is the single source of truth.
2. **Heartbeat** — `POST /api/heartbeat/{course}` with `{"status":"working","current_seed":N}` so other agents (and humans) know what's in flight
3. **Sequential within batch** — each agent works its assigned range in order (S11→S12→S13)
4. **Retry on ZUT** — if another agent's submission created a collision, upchunk the conflicting piece into a larger M-LEGO and retry
5. **Don't guess vocab** — always check the API, never assume you know what's been introduced

---

*Add new lessons above this line. Format: Date, Issue, Root Cause, Fix.*
