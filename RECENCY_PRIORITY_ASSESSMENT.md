# Recency Priority Assessment - Phase 5 v4.1

**Date**: 2025-11-08
**Question**: Does the v4.1 prompt have strong emphasis on using recent vocabulary (from last 5 seeds)?
**Context**: Recency creates rolling window of topics/patterns/vocab, helps ensure pattern diversity

---

## 🎯 Executive Summary

**Finding**: **NO - Recency priority has WEAK emphasis in v4.1**

**Evidence**:
- ⚠️ Recency mentioned ONCE in prompt (2 bullet points, 2 lines of text)
- ❌ NO examples demonstrating recency in action
- ❌ NO scaffold support (no "recent vocabulary" lists)
- ❌ NO metadata about which words/LEGOs are from last 5 seeds
- ⚠️ Positioned as minor "special rule" (not core principle)

**Recommendation**: **STRENGTHEN recency emphasis** to ensure the rolling window benefit.

---

## 📊 Current State Analysis

### What the v4.1 Prompt Says

**Location**: `docs/phase_intelligence/AGENT_PROMPT_phase5_v4.1_STAGED_SCAFFOLD.md:236-238`

```markdown
#### Recency Priority
- Prioritize vocabulary from 5 previous seeds (more recent = more usage)
- Makes content feel fresh and reinforces recent learning
```

**That's it.** 2 bullet points, 2 lines of text.

**Context in prompt**:
- Appears under "Step 4: SPECIAL RULES" section
- Listed alongside "Final LEGO Rule" and "Conjunction Usage"
- Positioned at line 236 out of 470 total lines (~50% through prompt)

---

### Strength Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| **Frequency of mention** | ⚠️ WEAK | Only mentioned once in entire prompt |
| **Level of detail** | ⚠️ WEAK | Just 2 lines, no elaboration |
| **Examples provided** | ❌ NONE | No example phrases showing recency |
| **Scaffold support** | ❌ NONE | No "recent_vocabulary" lists provided |
| **Metadata support** | ❌ NONE | No seed introduction tracking |
| **Positioning** | ⚠️ WEAK | Listed as "special rule", not core principle |
| **Enforcement** | ❌ NONE | No validation, no quality check |

**Overall strength**: ⚠️ **WEAK** (1.5/5)

---

### What's Missing from v4.1

**No Examples**:
```markdown
# What SHOULD be in prompt (but isn't):

**Example: Recency Priority in Action**

LEGO: "to show you" / "mostrarte" (S0301)

Recent seeds (S0296-S0300) introduced:
- "necesitar" (to need) - S0298
- "podría" (could) - S0297
- "importante" (important) - S0299
- "pensar" (to think) - S0296

✅ GOOD - Uses recent vocabulary:
1. "Necesito mostrarte" (uses S0298 word)
2. "Podría mostrarte algo importante" (uses S0297, S0299)
3. "Pienso que quiero mostrarte esto" (uses S0296)

❌ AVOID - Only uses old vocabulary:
1. "Quiero mostrarte" (S0001 word)
2. "Voy a mostrarte" (S0005 word)
3. "Estoy intentando mostrarte" (S0002 word)
```

**No Scaffold Support**:
```json
// What scaffolds SHOULD provide (but don't):
{
  "S0301L05": {
    "lego": ["to show you", "mostrarte"],
    "whitelist": [...],  // ← Current: all 567 words (no recency info)
    "recent_vocabulary": [  // ← Missing: words from last 5 seeds
      "necesitar", "podría", "importante", "pensar", "mostrar", ...
    ],
    "recent_legos": [  // ← Missing: LEGOs from last 5 seeds
      {"id": "S0298L02", "target": "necesitar", "known": "to need"},
      {"id": "S0297L01", "target": "podría", "known": "could"},
      ...
    ]
  }
}
```

**No Detailed Guidance**:
```markdown
# What SHOULD be in prompt (but isn't):

### How to Apply Recency Priority

1. **First, identify recent vocabulary**
   - Check seeds S0296-S0300 (5 previous)
   - Note which words/LEGOs were introduced

2. **Then, build phrases using recent vocabulary**
   - Target: 60-80% of phrases use ≥1 recent word
   - Especially prioritize words from S0299-S0300 (most recent)

3. **Balance with established vocabulary**
   - OK to use older words (S0001-S0295) for structure
   - But feature recent words as the "content"

4. **Check your work**
   - Count: How many phrases use recent vocabulary?
   - If <50%, revise to add more recent words
```

---

## 🔍 Scaffold Analysis

### Current Scaffold Structure

**From `create_basket_scaffolds.cjs`**:

```javascript
// What it builds:
{
  "whitelist": [...],  // ALL words up to current seed (567+ words)
  "available_legos": 839,
  "_metadata": {
    "spanish_words": ["mostrarte"],
    "whitelist_size": 567,
    "seed_context": { ... }
  }
}
```

**What's missing**:
- ❌ No `recent_vocabulary` array (words from last 5 seeds)
- ❌ No `recent_legos` array (LEGOs from last 5 seeds)
- ❌ No seed introduction metadata (which seed introduced each word)
- ❌ No recency scores or timestamps

**Impact**: Agent must manually determine which words are "recent" by:
1. Reading the seed ID (S0301)
2. Mentally calculating S0296-S0300 range
3. Guessing which words in the 567-word whitelist came from those seeds
4. No way to verify correctness

**This is cognitively difficult and error-prone.**

---

## 📈 Comparison to Other Priorities

Let's compare recency priority to other requirements in v4.1:

| Requirement | Mention Count | Detail Level | Examples | Scaffold Support | Enforcement |
|-------------|---------------|--------------|----------|------------------|-------------|
| **GATE Compliance** | 8+ mentions | 🔥 HIGH (60+ lines) | ✅ Multiple | ✅ Whitelist | ✅ Validation |
| **Distribution (2-2-2-4)** | 5+ mentions | 🔥 HIGH (30+ lines) | ✅ Multiple | ✅ Template | ✅ Validation |
| **Word Class Recognition** | 4+ mentions | 🔥 HIGH (80+ lines) | ✅ Multiple | ❌ None | ❌ None |
| **Anti-Template** | 3+ mentions | 🔥 MEDIUM (40+ lines) | ✅ Multiple | ❌ None | ⚠️ Quality check |
| **Progressive Complexity** | 3+ mentions | 🔥 MEDIUM (20+ lines) | ✅ In examples | ❌ None | ❌ None |
| **Thematic Coherence** | 2+ mentions | ⚠️ LOW (10+ lines) | ⚠️ Brief | ✅ seed_context | ❌ None |
| **Recency Priority** | 1 mention | ⚠️ **WEAK (2 lines)** | ❌ **None** | ❌ **None** | ❌ **None** |

**Recency is the WEAKEST emphasized requirement** in the entire v4.1 prompt.

---

## 💡 Why Recency Matters (User's Insight)

### The Rolling Window Benefit

**User's hypothesis**:
> "This is also another way of making sure we get pattern diversity because we are necessarily having a rolling window of topics and patterns and vocab as we keep looking back five sentences for key vocabulary rather than just using any vocabulary from the whitelist"

**Why this is valuable**:

1. **Prevents Stale Vocabulary Ruts**
   - Without recency: Agent might default to S0001-S0020 basics ("quiero", "hablar", "estoy")
   - With recency: Agent forced to use fresh vocabulary from S0296-S0300

2. **Natural Topic Progression**
   - Seed S0296: "meeting people"
   - Seed S0297: "could/might" conditionals
   - Seed S0298: "needs and necessities"
   - Seed S0299: "importance/priority"
   - Seed S0300: "thinking and opinions"
   - **Rolling window ensures baskets feel thematically connected**

3. **Pattern Diversity Through Context Shift**
   - Recent seeds introduce new patterns naturally
   - Using recent vocab → using recent patterns
   - Creates variety without explicit pattern tracking

4. **Spaced Repetition Benefit**
   - Recent vocabulary needs reinforcement
   - Prioritizing recent words = immediate practice
   - Better learning outcomes

**This is pedagogically sound reasoning.**

---

## 🧪 Evidence from Our Test

### Did Recency Actually Happen?

**Sample phrases for "mostrarte" (S0301L05)**:

From `/tmp/agent01_complete_baskets_fixed.json`:

```
1. "Mostrarte"
2. "Quiero mostrarte"          ← "quiero" from S0001 (old)
3. "Mostrarte algo"            ← "algo" from S0004 (old)
4. "Necesito mostrarte"        ← "necesito" unknown seed
5. "Él quiere mostrarte esto"  ← "quiere" unknown, "esto" unknown
6. "Creo que quiero mostrarte" ← "creo" from S0014 (old)
7. "Él dijo que quiere mostrarte" ← "dijo" from S0008 (old)
8. "Quieres que mostrarme algo"   ← "quieres" unknown
9. "Podría mostrarte si quieres"  ← "podría" unknown
10. "Ella dijo que quiere mostrarte" ← "dijo" from S0008 (old)
```

**Analysis**:
- Heavy use of S0001-S0020 vocabulary ("quiero", "algo", "creo", "dijo")
- Some potentially recent words ("necesito", "podría", "quieres")
- But NO clear pattern of prioritizing seeds S0296-S0300

**Conclusion**: Weak recency guidance → weak recency application.

---

## 🎯 Recommendations

### Option 1: Strengthen Prompt Guidance (Low Cost)

**Add to v4.1 prompt**:

```markdown
#### Recency Priority ⭐ IMPORTANT

**Goal**: Create a rolling window of fresh vocabulary and patterns.

**Rule**: 60-80% of phrases should use at least one word from the 5 previous seeds.

**How to apply**:

1. **Identify the current seed number**
   - Example: You're generating for S0301
   - Previous 5 seeds: S0296, S0297, S0298, S0299, S0300

2. **Scan the whitelist for recent patterns**
   - Look for words you haven't seen before
   - Recent words feel "new" compared to S0001-S0020 basics

3. **Build phrases featuring recent vocabulary**
   - Use recent words as the "content"
   - OK to use old words for structure (quiero, creo, etc.)

4. **Self-check**
   - Read your 10 phrases
   - Count: How many use recent vocabulary?
   - Target: 6-8 out of 10

**Example (S0301 - "to show you" / "mostrarte")**:

If S0296-S0300 introduced: "necesitar", "podría", "importante", "pensar"

✅ GOOD - Features recent vocabulary:
- "Necesito mostrarte esto" (uses S0298 "necesitar")
- "Podría mostrarte algo importante" (uses S0297 "podría", S0299 "importante")
- "Pienso que quiero mostrarte" (uses S0296 "pensar")

❌ AVOID - Only uses very old vocabulary:
- "Quiero mostrarte" (S0001)
- "Voy a mostrarte algo" (S0005)
- "Estoy intentando mostrarte" (S0002)

**Why this matters**:
- Prevents vocabulary ruts (defaulting to S0001-S0020)
- Creates natural topic progression
- Ensures pattern diversity through context shifts
- Reinforces recent learning (spaced repetition)
```

**Cost**: Low (add ~30 lines to prompt)
**Benefit**: Medium (clearer guidance, more likely to be followed)
**Limitation**: Still requires agent to manually identify recent words

---

### Option 2: Add Scaffold Support (Medium Cost)

**Modify `create_basket_scaffolds.cjs` to provide recent vocabulary lists**:

```javascript
/**
 * Build list of Spanish words from last N seeds
 * @param {object} registry - LEGO registry
 * @param {number} currentSeedNum - Current seed number
 * @param {number} windowSize - How many previous seeds (default 5)
 * @returns {string[]} - Array of recent Spanish words
 */
function buildRecentVocabulary(registry, currentSeedNum, windowSize = 5) {
  const recentWords = new Set();
  const startSeed = Math.max(1, currentSeedNum - windowSize);
  const endSeed = currentSeedNum - 1;

  for (const legoId in registry.legos) {
    const legoSeedNum = extractLegoSeedNum(legoId);

    // Only include LEGOs from the recent window
    if (legoSeedNum >= startSeed && legoSeedNum <= endSeed) {
      const lego = registry.legos[legoId];
      if (lego.spanish_words && Array.isArray(lego.spanish_words)) {
        lego.spanish_words.forEach(word => recentWords.add(word));
      }
    }
  }

  return Array.from(recentWords).sort();
}

// Then in generateScaffold():
const recentVocab = buildRecentVocabulary(registry, seedNum, 5);

scaffold.seeds[seedId].legos[legoId]._metadata.recent_vocabulary = recentVocab;
scaffold.seeds[seedId].legos[legoId]._metadata.recent_window = `S${String(seedNum - 5).padStart(4, '0')}-S${String(seedNum - 1).padStart(4, '0')}`;
```

**Example output**:
```json
{
  "S0301L05": {
    "lego": ["to show you", "mostrarte"],
    "whitelist": [...567 words...],
    "_metadata": {
      "spanish_words": ["mostrarte"],
      "whitelist_size": 567,
      "recent_vocabulary": [
        "ayudar", "importante", "necesitar", "pensar", "podría", ...
      ],
      "recent_window": "S0296-S0300",
      "seed_context": {...}
    }
  }
}
```

**Cost**: Medium (modify scaffold script, ~50 lines of code)
**Benefit**: High (explicit list, easy for agent to use)
**Validation**: Could add check for "% phrases using recent vocabulary"

---

### Option 3: Add Validation (Medium Cost)

**Add recency check to `validate_agent_baskets.cjs`**:

```javascript
/**
 * Check if phrases use recent vocabulary
 * @param {array} phrases - Practice phrases
 * @param {array} recentVocab - Recent vocabulary list
 * @returns {object} - Recency stats
 */
function checkRecencyUsage(phrases, recentVocab) {
  const recentSet = new Set(recentVocab);
  let phrasesUsingRecent = 0;

  for (const phrase of phrases) {
    const spanish = phrase[1].toLowerCase();
    const words = tokenizeSpanish(spanish);

    // Check if phrase uses any recent vocabulary
    const usesRecent = words.some(word => recentSet.has(word));
    if (usesRecent) phrasesUsingRecent++;
  }

  const percentage = (phrasesUsingRecent / phrases.length) * 100;

  return {
    phrases_using_recent: phrasesUsingRecent,
    total_phrases: phrases.length,
    percentage: percentage,
    target: 60,  // Target: 60% of phrases use recent vocab
    meets_target: percentage >= 60
  };
}
```

**Validation output**:
```json
{
  "recency_check": {
    "phrases_using_recent": 7,
    "total_phrases": 10,
    "percentage": 70.0,
    "target": 60,
    "meets_target": true
  }
}
```

**Cost**: Medium (add validation function, ~40 lines)
**Benefit**: High (measurable, enforceable)
**Type**: Warning (not error) - encourage but don't block

---

## 📋 Recommended Approach

### Immediate (Next Iteration)

**Option 1 + Option 2: Strengthen Prompt + Add Scaffold Support**

**Why both**:
1. **Prompt strengthening** (Option 1) gives agents clear guidance
2. **Scaffold support** (Option 2) makes it easy to follow
3. Together: Strong emphasis + easy execution = high compliance

**Implementation**:
1. ✅ Update v4.1 prompt with expanded recency section (~30 lines)
2. ✅ Modify `create_basket_scaffolds.cjs` to add `recent_vocabulary` (~50 lines)
3. ✅ Update prompt to reference the `recent_vocabulary` field
4. ⚠️ Test with 6 LEGOs to verify recency actually happens
5. ⚠️ Optional: Add validation (Option 3) if test shows low compliance

---

### Medium-Term (Next Batch)

**Option 3: Add Recency Validation**

**After implementing Options 1+2**:
- Add recency check to validation script
- Report % of phrases using recent vocabulary
- Set target: 60% (warning if below)
- Track over time to ensure consistency

---

## 🏆 Expected Impact

### Current State (v4.1 weak recency)

**Predicted behavior**:
- Agents default to familiar S0001-S0050 vocabulary
- Heavy use of "quiero", "hablar", "estoy", "algo", "creo"
- Vocabulary feels stale and repetitive
- Pattern diversity OK (62.8%) but could be better
- Learning reinforcement: suboptimal (old words over-practiced)

### After Strengthening (Options 1+2)

**Predicted behavior**:
- Agents actively use S(N-5) to S(N-1) vocabulary
- Fresh vocabulary in 60-80% of phrases
- Content feels progressive and thematic
- Pattern diversity: excellent (rolling window forces variety)
- Learning reinforcement: optimal (recent words get immediate practice)

**Quality improvement**: ⬆️ +0.5 to +1.0 points (from 4.5/5 to 5.0/5)

---

## 📊 Summary Table

| Aspect | Current State | After Options 1+2 |
|--------|---------------|-------------------|
| **Prompt emphasis** | ⚠️ Weak (2 lines) | ✅ Strong (30+ lines) |
| **Examples** | ❌ None | ✅ Multiple |
| **Scaffold support** | ❌ None | ✅ recent_vocabulary list |
| **Agent effort** | 🔴 High (manual) | 🟢 Low (explicit list) |
| **Compliance** | ⚠️ ~20-40% | ✅ ~60-80% |
| **Validation** | ❌ None | ⚠️ Optional |
| **Pattern diversity** | ✅ 62.8% | ✅✅ ~70-80% (predicted) |
| **Quality** | ✅ 4.5/5 | ✅✅ 5.0/5 (predicted) |

---

## 💡 Key Insights

### User's Insight is Correct

> "Recency creates a rolling window of topics/patterns/vocab... another way of making sure we get pattern diversity"

**This is pedagogically sound.**

**Why it works**:
1. Recent seeds introduce new topics → recent vocab = new contexts
2. New contexts → naturally different sentence patterns
3. Rolling window → content feels progressive, not stale
4. Spaced repetition → reinforces recent learning

**Current v4.1 fails to leverage this insight** due to weak emphasis.

---

### Recency vs. Pattern Extraction

**Earlier finding**: Pattern extraction (P01, P02) not needed - diversity emerges naturally.

**Recency is DIFFERENT**:
- Pattern extraction = explicit taxonomy (mechanical)
- Recency priority = contextual freshness (pedagogical)

**Recency should be strengthened** because:
- ✅ Has clear pedagogical benefit (spaced repetition)
- ✅ Easy to implement (just add recent_vocabulary list)
- ✅ Easy to measure (% phrases using recent words)
- ✅ Complements natural pattern diversity
- ✅ Low cost, high benefit

**Pattern extraction should stay as-is** (documentation only).

---

## 🎯 Final Answer to User's Question

### Question: Does v4.1 have strong emphasis on recency priority?

**Answer**: **NO - emphasis is WEAK**

**Evidence**:
- ⚠️ Mentioned only once (2 lines)
- ❌ No examples
- ❌ No scaffold support
- ❌ No validation
- ⚠️ Positioned as minor "special rule"

**Impact**: Likely low compliance (20-40% recency usage)

---

### Recommendation: STRENGTHEN recency emphasis

**Why**:
1. ✅ User's insight is correct (rolling window → pattern diversity)
2. ✅ Pedagogically sound (spaced repetition benefit)
3. ✅ Easy to implement (add recent_vocabulary to scaffolds)
4. ✅ Easy to measure (validation check)
5. ✅ High benefit-to-cost ratio

**How** (Options 1+2):
1. Expand recency section in v4.1 prompt (30+ lines with examples)
2. Add `recent_vocabulary` list to scaffolds (50 lines of code)
3. Update prompt to reference the new field
4. Test with 6 LEGOs to verify
5. Optional: Add validation check

**Expected improvement**: Quality +0.5 to +1.0, diversity +5-15%

---

**Analysis completed**: 2025-11-08
**Current recency emphasis**: ⚠️ WEAK (1.5/5)
**Recommended emphasis**: ✅ STRONG (4.5/5)
**Implementation complexity**: 🟢 LOW-MEDIUM
**Expected benefit**: ⬆️ HIGH
