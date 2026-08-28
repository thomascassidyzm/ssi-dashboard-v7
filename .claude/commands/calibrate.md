# Calibrate - Create Golden Decompositions for a Language Pair

Create **golden decompositions** for golden seeds (configurable per course, default 10) through human+agent collaboration. These become canonical examples that all future build agents follow.

## Prerequisites

1. **Pass 1 complete** - Golden seeds must have translations (target_text)
2. **Human present** - This is interactive, not autonomous

---

## CORE PRINCIPLES - Read This First

### Principle 1: ZUT (Zero Uncertainty Test)

**The learner hears/sees the known text and must produce the target with ZERO hesitation.**

If there's ANY doubt about what to say, the LEGO fails ZUT.

**Example - ZUT FAILURE:**
```
"I" → "je"
```
Learner thinks: "Wait... je? moi? me?"
- "I want" = "je veux" (subject)
- "with me" = "avec moi" (after preposition)
- "he sees me" = "il me voit" (object)

**Result:** Hesitation. Confidence destroyed.

**Example - ZUT PASS:**
```
"I want" → "je veux"
```
Learner hears "I want" → produces "je veux" with zero hesitation.

---

### Principle 2: Chunk Up to Disambiguate

When an atom fails ZUT, bundle it with context that resolves the ambiguity.

| Fails ZUT | Passes ZUT | Why |
|-----------|------------|-----|
| "I" → "je" | "I want" → "je veux" | Verb determines pronoun form |
| "you" → "toi" | "with you" → "avec toi" | Preposition determines form (toi not tu) |
| "a" → "un" | "a word" → "un mot" | Noun determines gender |
| "to" → "de" | "to learn" → "d'apprendre" | Preceding verb determines preposition |

---

### Principle 3: Preposition Enclosure

Prepositions should be absorbed into M-LEGOs, ideally not at the edges.

**Problem:** If you teach "with" → "avec" AND "you" → "tu" separately:
- Learner assembles: "avec tu" ❌
- Correct: "avec toi" (pronoun form changes after preposition)

**Solution:** Bundle them: "with you" → "avec toi"

---

### Principle 4: Speakable Confidence

Every LEGO should be something the learner can confidently SAY - a real, usable chunk.

Articles bundled with nouns:
- "a word" → "un mot" (not "a" → "un", "word" → "mot")
- "a sentence" → "une phrase" (gender absorbed into chunk)

The learner never has to think about gender - they learn speakable units.

---

### Principle 5: LEGO Ordering & Vocabulary Accumulation

**Phrases can use ALL previously introduced vocabulary:**
- This LEGO's components
- Prior LEGOs from this seed
- **All LEGOs from ALL prior seeds**

By Seed 6, the learner knows ~25 LEGOs from Seeds 1-5. USE phrases can combine ANY of them.

**Example - Seed 6 L3 "a word" USE phrases:**
```
to remember a word → me souvenir d'un mot          (Seed 6 vocab)
I'm trying to remember a word → j'essaie de me souvenir d'un mot  (Seed 2+6)
to say a word → dire un mot                        (Seed 4 "to say"!)
a word in French → un mot en français              (Seed 4 "in" + Seed 1 "French"!)
I want to learn a word → je veux apprendre un mot  (Seeds 1+2+6 combined!)
```

This is how cumulative confidence builds - each new LEGO multiplies combinations with everything before.

---

### Principle 6: BUILD vs USE Phrases

**BUILD phrases** — show how the new LEGO "plugs in" to what the learner already knows:
- The **entire new LEGO** combined with **previously introduced LEGOs**
- Used **ONCE** in the opening round when LEGO debuts, then **never revisited**
- **Fragments are OK** — the point is showing connections, not complete thoughts
- **3-4 phrases per LEGO**

**USE phrases** — the phrases the learner will practise for weeks:
- Used **REPEATEDLY** in spaced repetition reviews
- **Must be standalone-sayable** — something a learner could say on its own in a conversation, clear and unambiguous for the rest of the course. A full sentence is **preferred but not required** (Kai's ruling, 2026-08-17); a shorter phrase needs more careful checking, not prohibition
- Average: LEGO + 10-12 syllables
- **Minimum 5 phrases per new LEGO**
- Scored 5-9 (4 or below = rewrite)

**Example:**
```
BUILD for "with you" → "avec toi":
(Learner already knows: "je veux" (I want), "parler" (to speak), "français" (French))

  to speak with you → parler avec toi           ← plugs into known "parler"
  to speak French with you → parler français avec toi  ← plugs into "parler" + "français"

USE for "with you" → "avec toi":
  I want to speak with you → je veux parler avec toi [7]
  I want to speak French with you → je veux parler français avec toi [8]
```

**The difference:** BUILD shows the new LEGO connecting to existing vocabulary (disposable scaffolding). USE phrases are the real content — complete sentences worth saying 50 times.

---

## Workflow Overview

For each golden seed:
1. Agent proposes decomposition
2. Human reviews, corrects if needed
3. Agent generates BUILD + USE phrases
4. Human spot-checks
5. Move to next seed

Target: ~1 minute per seed once you're in flow.

---

## Step 1: Fetch Existing Calibrations

Check what calibrations exist for reference:

```bash
curl -s "http://localhost:3471/api/calibrations/patterns" | jq '.'
```

Patterns often transfer across language pairs.

---

## Step 2: Fetch Golden Seeds

First check the golden seed count (default 10, configurable per course):
```bash
curl -s "http://localhost:3471/api/course/{course_code}/calibration" | jq '.golden_seed_count // 10'
```

Then fetch:
```bash
curl -s "http://localhost:3471/api/seeds/{course_code}?start=1&end={golden_seed_count}" | jq '.seeds[] | "\(.seed_number): \(.known_text) → \(.target_text)"'
```

---

## Step 3: For Each Seed

### A. Present the Seed

```
═══════════════════════════════════════════════════════════
SEED 1 of N
═══════════════════════════════════════════════════════════
Known:  I want to speak French with you now.
Target: Je veux parler français avec toi maintenant.
═══════════════════════════════════════════════════════════
```

### B. Propose Decomposition

Apply ZUT test to each potential LEGO:
- **Passes ZUT?** → Can be A-LEGO
- **Fails ZUT?** → Must chunk up into M-LEGO

```markdown
## L1 [M] "I want" → "je veux"
Components: I → je, want → veux
Reasoning: "I" alone fails ZUT (je/moi/me). Bundled with verb.

## L2 [A] "to speak" → "parler"
Reasoning: Infinitive verb, unambiguous standalone.

## L3 [A] "French" → "français"
Reasoning: Language name, zero ambiguity.

## L4 [M] "with you" → "avec toi"
Components: with → avec, you → toi
Reasoning: "you" alone fails ZUT (tu/toi/te/vous). After preposition = toi.

## L5 [A] "now" → "maintenant"
Reasoning: Time adverb, unambiguous.
```

### C. Human Reviews

Human responds:
- ✓ **Good** - move to phrases
- **Fix needed** - explains the issue

### D. Generate BUILD + USE Phrases

For each LEGO:

```markdown
## L1 [M] "I want" → "je veux"
Components: I → je, want → veux

BUILD (3-4 short phrases, fragments OK):
- I want to speak → je veux parler
- I want now → je veux maintenant
- I want French → je veux français

USE (5+ standalone-sayable phrases, full sentences preferred, averaging LEGO + 10-12 syllables):
- I want to speak French → je veux parler français [7]
- I want to speak with you now → je veux parler avec toi maintenant [9]
- I want to speak French with you → je veux parler français avec toi [8]
- I want to learn French → je veux apprendre le français [8]
- I want to try now → je veux essayer maintenant [7]
```

**Remember:**
- BUILD: LEGO + 1 word minimum, ~5 syllables max extra, 3-4 phrases
- USE: standalone-sayable (full sentences preferred, not required), 5+ phrases, can use ALL prior vocabulary

### E. Capture Contrastive Notes

After each seed, note what NOT to do:

```markdown
CONTRASTIVE:
❌ "I" → "je" alone (fails ZUT - could be moi/me)
❌ "you" → "toi" alone (fails ZUT - could be tu/te/vous)
✅ "I want" → "je veux" (verb provides context)
✅ "with you" → "avec toi" (preposition determines form)

KEY INSIGHT: French pronouns change form by position. Bundle with context.
```

---

## Step 4: Save Calibration

After all golden seeds:

```bash
curl -X POST "http://localhost:3471/api/course/{course_code}/calibration" \
  -H "Content-Type: application/json" \
  -d @calibration.json
```

See existing calibrations for JSON format, or submit in markdown.

---

## Quick Reference: ZUT Failures (NEVER A-LEGO)

| Category | Examples | Why |
|----------|----------|-----|
| Pronouns | I, you, he, me, him | Form changes by position |
| Articles | a, the, an | Gender/case dependent |
| Prepositions | with, to, in, for, at | Meaning varies by context |
| Conjunctions | and, but, or | Multiple forms in some languages |

---

## Quick Reference: Usually OK as A-LEGO

| Category | Examples | Why |
|----------|----------|-----|
| Language names | French, Spanish, Chinese | Zero ambiguity |
| Clear infinitives | to speak, to learn, to say | Unambiguous verbs |
| Time adverbs | now, today, tomorrow | Clear standalone meaning |
| Question words | how, what, where, when | Usually unambiguous |

---

## Verification

```bash
# Check calibration saved
curl -s "http://localhost:3471/api/course/{course_code}/calibration" | jq '.summary'

# Verify in /api/resume
curl -s "http://localhost:3471/api/resume/{course_code}" | jq '.GOLDEN_DECOMPOSITIONS'
```
