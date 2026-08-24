# Layered Decomposition Brief — jpn_for_eng

> **This brief supplements ralph-methodology.md with specific guidance on decomposing seeds whose TARGET is Japanese into overlapping, layered LEGOs.**
>
> ⚠️ **This is the `jpn_for_eng` direction — English known, Japanese target.** Every LEGO
> below is a Japanese chunk with an English gloss, because Japanese is the *target* here.
> The file was previously headed `eng_for_jpn`, which inverted it: in `eng_for_jpn` the
> Japanese is the *known* side and must never be the thing decomposed.
>
> **Decompositions always preserve TARGET word order** (Tom's ruling, 2026-08-12) — the
> chunk sequence follows the target sentence and the known glosses are segmented to sit
> underneath it, reading deliberately out of order where the two languages differ. That is
> why this brief's overlapping-LEGO advice is about revealing *Japanese* order: Japanese is
> the target. **For `eng_for_jpn`, read `.claude/commands/eng-for-jpn-build.md` instead** —
> there English is the target, so English order governs and these examples are backwards.

---

## The #1 Anti-Pattern: Giant Single M-LEGOs

**THIS IS WHAT BAD DECOMPOSITION LOOKS LIKE:**

```
SEED: "But I don't worry about making mistakes."
BAD:
  L1 [M] "間違えることを心配しない" → "I don't worry about making mistakes"
  → ONE giant LEGO wrapping the entire sentence
  → Learner gets ONE opaque blob, ZERO recombination
```

**The learner can't do ANYTHING with this.** They can't say "I don't worry about the answer" or "making mistakes is good" because they never learned the parts.

---

## When to Use Overlapping LEGOs

**Overlapping LEGOs exist to reveal things the learner can't figure out from simple tiling.** Use them when there's something non-obvious happening between the small piece and the big piece. Don't use them when the composition is transparent.

### Overlap WHEN:

**1. Grammatical transformation (conjugation, morphology)**
The target language changes the word form when combining pieces:
```
戻る (to come back) → 戻りたい (want to come back)
  Stem changes: 戻る → 戻り + たい
  Without overlap: learner knows 戻る but can't produce 戻りたい
  With overlap: sees 戻る alone, then 戻りたい — infers the たい conjugation
```

**2. Word order differences**
The target language puts pieces in a different order than the known language:
```
English: "speak later on" (verb + time)
Japanese: 後で話す (time + verb — REVERSED)
  Without overlap: learner might guess 話す後で
  With overlap: sees 後で alone, sees 話す alone, then sees 後で話す — infers the order
```

**3. Particle/glue insertion**
Pieces need connective tissue that isn't obvious:
```
間違える (mistakes) + 心配する (worry) → 間違えることを心配する
  Particle を and nominaliser こと appear between them
  Without overlap: learner has no way to know about こと or を
  With overlap: sees the connected form, infers the glue
```

### DON'T overlap when:

**The composition is transparent.** If the learner could correctly guess the combined form from knowing the pieces, an overlapping LEGO adds nothing — it's just boring repetition.

```
English: "with you now" → あなたと今
  If learner knows "with you" → あなたと and "now" → 今
  Combined form is just あなたと + 今 = obvious
  No hidden grammar, no reordering, no particles
  → DON'T create an overlapping LEGO for this
```

**The art is knowing the difference.** Japanese has a LOT of hidden grammar and reordering compared to English, so overlapping LEGOs will be common. But not universal.

---

## The Decomposition Algorithm (Revised)

For each seed, work **bottom-up**:

### Step 1: Identify New Concepts
What does this seed introduce that the learner hasn't seen?

### Step 2: Ask "What's Hidden?"
For each pair of concepts that combine in the seed, ask:
- Does the word form change? (conjugation → overlap)
- Does the order flip? (word order → overlap)
- Do particles/connectors appear? (glue → overlap)
- Or is it just concatenation in the expected order? (→ no overlap needed)

### Step 3: Build the LEGO Stack
Create LEGOs bottom-up. For every "hidden" combination, create an overlapping M-LEGO that shows the learner how the pieces actually combine.

### Step 4: The Recombination Test
For each LEGO: **"Can this piece appear naturally in 3+ other sentences?"**
If not, it's too big or too specific. Redraw boundaries.

---

## Worked Example: Seed 16

```
SEED 16: 彼は後でみんなと一緒に戻りたいです。
Target: He wants to come back with everyone else later on.
```

### Analysis — What's Hidden?

| Combination | What happens? | Overlap? |
|---|---|---|
| 戻る → 戻りたい | Verb stem changes for desire form | YES — conjugation |
| 後で + 戻りたい | Time goes BEFORE verb (English: after) | YES — word order |
| 彼は + 戻りたい | Subject marked with は particle | YES — particle |
| みんなと一緒に + 戻りたい | Phrase order reversal from English | YES — word order |

### Resulting Decomposition:

```
L1 [A] "後で" → "later on"
  Standalone time word, recombines freely

L2 [M] "戻りたい" → "to come back"
  Verb in desire form. Recombines: "I want to come back", "come back tomorrow"

L3 [M] "後で戻りたい" → "to come back later on"
  ← OVERLAPPING: contains L1 + L2
  ← REVEALS: time-before-verb order (English says "come back later", Japanese says "later come back")

L4 [M] "みんなと一緒に" → "with everyone else"
  Particle と absorbed. Recombines freely.

L5 [M] "彼は" → "he wants"
  Subject + は particle. Recombines: "he wants to speak", "he wants to learn"

L6 [M] "彼は戻りたい" → "he wants to come back"
  ← OVERLAPPING: contains L2 + L5
  ← REVEALS: how subject attaches to verb (は particle placement)
```

**6 LEGOs, 3 overlapping pairs.** The learner sees 後で alone, 戻りたい alone, then 後で戻りたい — and infers that Japanese puts time BEFORE the verb. That's the teaching.

---

## Japanese-Specific Patterns

### Verb Conjugation = Always Overlap

Japanese verb conjugations are non-obvious to English speakers. Whenever a verb changes form, the learner needs to see the base form AND the conjugated form:

```
戻る → 戻りたい     (desire: stem + たい)
やめる → やめたくない  (negative desire: stem + たくない)
話す → 話している    (progressive: stem + ている)
覚える → 覚えられる   (potential: stem + られる)
```

Each of these is an opportunity for an overlapping LEGO that reveals the conjugation pattern.

### Word Order = Usually Overlap

Japanese is SOV, English is SVO. Almost any multi-word combination will have a different order:
- "speak English" = 英語を話す (object before verb)
- "come back tomorrow" = 明日戻る (time before verb)
- "speak with everyone" = みんなと話す (companion before verb)

These order differences are worth revealing through overlapping LEGOs, especially in early seeds when the learner hasn't yet internalised Japanese word order.

### Particles = Always Bundle

は, が, を, に, で, と are never standalone LEGOs. Always absorbed into M-LEGOs that show them in context.

---

## Don't Overdo It

**Not every seed needs maximum overlap.** The goal is to reveal patterns, not to bore the learner with redundant drilling when the composition IS obvious.

As the course progresses (seeds 50+), the learner has already internalised:
- Time goes before verbs
- Objects go before verbs
- Basic conjugation patterns (たい, ている, etc.)

At that point, overlapping LEGOs for those patterns add less value. Save overlaps for genuinely NEW grammatical patterns the learner hasn't encountered yet.

**The test: "Would the learner be surprised by how these pieces combine?"**
- Yes → overlap to reveal
- No → just tile

---

## Pre-Submission Checklist

Before submitting ANY seed, verify:

- [ ] **No single-LEGO seeds** for seeds with 5+ English words
- [ ] **Recombination test**: Each LEGO can appear in 3+ other sentences
- [ ] **Hidden grammar revealed**: Conjugation changes, word order flips, and particle insertion get overlapping LEGOs
- [ ] **No boring overlaps**: Transparent concatenations don't get unnecessary overlapping LEGOs
- [ ] **Target LEGOs**: 3-5 per seed (more for longer seeds)
- [ ] **Particles bundled**: を, に, と, で are inside M-LEGOs, not standalone
- [ ] **Substring containment**: Every phrase contains its LEGO target as exact substring
- [ ] **Vocab constraint**: Only use vocabulary from prior seeds + earlier LEGOs in this seed

---

*This brief is a supplement to ralph-methodology.md. Read both before building.*
