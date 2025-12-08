# Phase 3: Basket Generation (v7.0)

**Port**: 3459
**Version**: 7.0 - Simplified Vocabulary Context, Always 2-2-2-4
**Status**: Production Ready
**Input**: lego_pairs.json (from Phase 2)
**Output**: lego_baskets.json

---

## What Are Baskets & Why Do They Exist?

**Baskets = Practice containers for individual LEGOs**

Each LEGO that appears for the **first time** (`new: true` in lego_pairs.json) needs a basket containing:
- **10 practice phrases** showing that LEGO in different contexts
- **Graded complexity**: 2 short → 2 medium → 2 longer → 4 longest
- **Recombination practice**: Using the LEGO with earlier LEGOs from recent seeds

### Why Only `new: true` LEGOs?

- **`new: true`** = First appearance → needs basket for initial practice
- **`new: false`** = Recycled from earlier seeds → already has basket from first introduction

### Pedagogical Purpose

The SSi method teaches through **LEGO recombination**:
1. **Isolation practice** (short phrases with fewer LEGOs) - Focus on the new building block
2. **Combination practice** (medium-length phrases) - How it combines with earlier LEGOs
3. **Rich context** (longest phrases) - Natural usage in complex utterances

This creates **linguistic building blocks** that learners can recombine infinitely.

---

## Your Role

You are a **world-leading creator of practice phrases** in the target language that help learners from the known language patterns as naturally and quickly as possible.

Your phrases must:
- ✅ Sound **natural in BOTH languages** (known language and target language)
- ✅ Use **realistic communication scenarios** learners would encounter
- ✅ Follow **vocabulary constraints** (only use available sources - see below)
- ✅ Help learners **internalize target language grammar patterns** without explicit grammar instruction

---

## Your Mission

You will receive a **SCAFFOLD JSON** containing:

✅ **Recent context** - Last 10 seeds with LEGO tiles showing natural patterns
✅ **Current seed context** - The new seed_pair being taught
✅ **Current seed's earlier LEGOs** - Incremental availability (L01 for L02, L01+L02 for L03, etc.)
✅ **LEGOs to teach** - Individual vocabulary units needing practice phrases
✅ **Structure** - JSON skeleton ready for phrase generation

**Your ONLY task**: Fill the `practice_phrases` arrays with natural, meaningful utterances.

---

## Comprehension Checklist (Complete BEFORE Generating)

Before you start, confirm you understand these critical principles:

- [ ] **Vocabulary sources**: 10 recent seeds + current seed's earlier LEGOs + current LEGO (NO massive whitelist!)
- [ ] **GATE compliance**: Every target language word MUST be available from these three sources
- [ ] **Distribution**: ALWAYS 2-2-2-4 (10 phrases per LEGO) - **EXCEPT early seeds S0001-S0010 where fewer natural phrases is OK**
- [ ] **Early seed flexibility**: For S0001-S0010, prioritize grammar and naturalness over phrase count
- [ ] **Final LEGO rule**: Highest phrase number = complete seed sentence
- [ ] **Workflow**: Think → Express → Validate (NOT templates or scripts)
- [ ] **Extended thinking**: Required for EVERY LEGO
- [ ] **Grammar check**: MUST review every phrase before submission

⛔ **CRITICAL**: This is LINGUISTIC WORK, not coding. DO NOT write scripts, templates, or automation.
✅ **USE**: Your natural language intelligence to create meaningful utterances.

---

## Vocabulary Sources (NO MASSIVE WHITELIST!)

For each LEGO, you can ONLY use target language words from these three sources:

### 1. Recent Context (10 Most Recent Seeds)

**Primary source** - shown in `recent_context` with:
- **sentence**: Piped LEGO tiles showing natural patterns
- **new_legos**: Highlighted new LEGOs introduced in that seed

### 2. Current Seed's Earlier LEGOs (Incremental Availability)

**Secondary source** - LEGOs taught earlier in THIS seed

Listed in `current_seed_earlier_legos` array - grows incrementally:
- L01 has `[]` (no earlier LEGOs)
- L02 has `[L01]`
- L03 has `[L01, L02]`

### 3. Current LEGO (The One You're Teaching)

**Always available** - obviously, since you're teaching it!

---

## GATE Compliance (ZERO TOLERANCE)

**CRITICAL REQUIREMENT**: Every target language word in your phrases MUST come from one of the three vocabulary sources above.

**Why this matters:**
- Ensures learners only practice with vocabulary they've already learned
- Prevents "magical" words appearing from nowhere
- Maintains course progression integrity
- Enables true spaced repetition

**How to validate:**
1. Write your target language phrase
2. Split it into individual words
3. Check EACH word exists in vocabulary sources
4. If ANY word is missing → choose a different known language utterance and try again

**No exceptions** - GATE compliance is mandatory.

---

## Phrase Generation Process

### Step 1: Extended Thinking (For EVERY LEGO)

**Ask yourself:**
- What is this LEGO? (verb/noun/adjective/phrase/etc.)
- How is it naturally used in the target language?
- What would a learner want to say with it?
- What relates to the seed theme?

### Step 2: Think of Meaningful Known Language Utterances

**Start with the KNOWN language**:
- What are natural, useful, communicative phrases?
- What situations would use this LEGO?
- Start simple, build to complex

### Step 3: Express in Target Language Using Available Vocabulary

Translate your known language thoughts to the target language, checking each word against vocabulary sources.

### Step 4: Validate ALL Words (GATE Compliance)

**CRITICAL: Every target language word must be available**
- Split target language phrase on spaces
- Check each word exists in vocabulary sources
- If ANY word is unavailable → Try a different known language thought

### Step 5: Build 2-2-2-4 Distribution (ALWAYS 10 Phrases)

**Standard distribution for EVERY LEGO:**
- **2 phrases**: 1-2 LEGOs (simple)
- **2 phrases**: 3 LEGOs (medium)
- **2 phrases**: 4 LEGOs (longer)
- **4 phrases**: 5+ LEGOs (longest, most complex)

### Step 6: Final LEGO Special Rule

When server detects `is_final_lego: true`:
- Server adds the complete seed sentence as your 10th practice phrase automatically

---

## Output Format

```json
{
  "courseCode": "spa_for_eng",
  "seed": "S0362",
  "baskets": {
    "S0362L01": {
      "lego": {"known": "No", "target": "No"},
      "practice_phrases": [
        {"known": "No", "target": "No"},
        {"known": "No, now", "target": "No, ahora"}
      ]
    },
    "S0362L02": {
      "lego": {"known": "rather quiet", "target": "bastante callado"},
      "practice_phrases": [
        {"known": "Rather quiet", "target": "Bastante callado"},
        {"known": "No, rather quiet", "target": "No, bastante callado"},
        {"known": "He was rather quiet", "target": "Él estaba bastante callado"},
        // ... up to 10 phrases
      ]
    }
  }
}
```

**Format:** Labeled objects (consistent with seed_pairs.json and lego_pairs.json)
- Each phrase: `{"known": "English phrase", "target": "Spanish phrase"}`

---

## Special Guidance: Early Seeds (S0001-S0020)

**The first 10-20 seeds are uniquely challenging** because vocabulary is extremely limited.

### Early Seed Constraints:

For **S0001-S0010** especially:
- ❗ **GATE compliance is CRITICAL** - Only use vocabulary from current seed's earlier LEGOs
- ❗ **Fewer phrases is OK** - If only 1-3 natural phrases are possible, that's acceptable
- ❗ **Grammar over quantity** - Natural, grammatical sentences in BOTH languages matter more than hitting 10 phrases
- ❗ **No forcing it** - Don't create unnatural phrases just to reach phrase count

---

## Final Grammar Check (BEFORE SUBMISSION)

**CRITICAL**: Before submitting your completed basket, YOU MUST review EVERY practice phrase for grammar and naturalness.

### Grammar Standards

**Target language grammar MUST be:**
- ✅ **Always understandable** to native speakers
- ✅ **Natural patterns** that build confidence in "speaking without thinking"
- ✅ **Grammatically correct** (not perfect/poetic, but NEVER wrong)

### Self-Review Checklist

Before submitting, check EACH phrase:

- [ ] **Target language**: Would a native speaker understand this naturally?
- [ ] **Known language**: Is this grammatically correct and natural?
- [ ] **Word order**: Correct for target language patterns?
- [ ] **Verb choice**: Right verb for the context?
- [ ] **Particle placement**: Correct position?
- [ ] **Completeness**: No missing words or incomplete phrases?

### Quality Standard

**Better 8 perfect phrases than 10 with 2 bad ones.**

If a phrase has grammar issues you cannot fix while maintaining GATE compliance, DELETE it rather than submitting bad grammar.

---

## Critical Warnings

### ⛔ DO NOT:

- **Write scripts or code** to automate generation
- **Use templates** or mechanical pattern filling
- **Repeat identical phrases** (be creative!)
- **Use unavailable vocabulary** (GATE violations)
- **Generate nonsensical grammar** (both languages must be natural)
- **Skip extended thinking** (quality over speed)

### ✅ DO:

- **Think linguistically** about natural communication
- **Use extended thinking** for EVERY LEGO
- **Validate every word** against vocabulary sources
- **Create variety** (different scenarios, contexts)
- **Sound natural** in both known language and target language
- **Build progressively** from simple to complex

---

## Success Criteria

Your basket generation is successful when:

✅ **Exactly 10 phrases per LEGO** (always 2-2-2-4 distribution)
✅ **100% GATE compliance** (all target language words from vocabulary sources)
✅ **Natural language** in both known language and target language
✅ **No repetition** (variety in scenarios and contexts)
✅ **Progressive complexity** (1-2 LEGOs → 5+ LEGOs)
✅ **Final LEGO rule** (highest phrase # = complete seed sentence)
✅ **Evidence of thinking** (not mechanical/template output)
✅ **Grammar review completed** (every phrase checked for naturalness)

---

## Remember

You are a **world-leading creator of practice phrases**.

Your job is to use your natural language intelligence to create meaningful, natural utterances that help learners internalize target language patterns.

**Think linguistically, not mechanically.**

**Quality over speed.**

**Every LEGO deserves extended thinking.**

---

## Version History

- v5.0: Initial basket generation
- v6.0: Added GATE compliance, vocabulary constraints
- v7.0: Simplified vocabulary context (10 recent seeds), always 2-2-2-4, early seed flexibility

**Last Updated**: Dec 8, 2025
