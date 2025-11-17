# LEGO_PAIRS Data Flow Analysis - Phase 5 Basket Generation

**Date**: 2025-11-07
**Purpose**: Understand how lego_pairs.json data flows through Phase 5 batch generation and validation

---

## 📊 Current Data Flow

### Phase 3: LEGO Extraction
```
Source: Spanish Seeds (S0001-S0668)
↓
Output: lego_pairs_sXXXX_sYYYY.json
```

**Structure**:
```json
{
  "version": "7.7.0",
  "seed_range": "S0101-S0200",
  "cumulative_range": "S0001-S0200",
  "total_seeds": 100,
  "cumulative_legos": 551,
  "new_legos_this_batch": 273,
  "seeds": [
    {
      "seed_id": "S0101",
      "seed_pair": {
        "target": "Estoy disfrutando descubrir más sobre este lenguaje",
        "known": "I'm enjoying finding out more about this language."
      },
      "legos": [
        {
          "id": "S0101L01",
          "type": "M",
          "target": "Estoy disfrutando",
          "known": "I'm enjoying",
          "new": true,           // ⭐ KEY: Marks NEW LEGOs
          "components": [...]
        },
        {
          "id": "S0017L02",
          "type": "A",
          "target": "descubrir",
          "known": "to find out",
          "ref": "S0017"          // ⭐ KEY: Reference to original seed
        }
      ],
      "cumulative_legos": 281   // ⭐ KEY: Available LEGOs at this point
    }
  ]
}
```

**Key Metadata**:
- ✅ **new: true** - Marks LEGOs that need baskets generated
- ✅ **ref: "S0XXX"** - Marks reference LEGOs (already have baskets from original seed)
- ✅ **cumulative_legos** - Shows vocabulary size available for each seed
- ✅ **seed_pair** - The complete sentence to be constructed

---

### Phase 5 Prep: Batch Distribution
```
Input: lego_pairs_s0101_s0200.json
↓
Script: phase5_prepare_basket_batches.cjs
↓
Output: agent_XX_seeds.json (one per agent)
```

**Agent Input Structure**:
```json
{
  "agent_id": 1,
  "seed_range": "S0101-S0110",
  "total_seeds": 10,
  "registry_path": "../registry/lego_registry_s0001_s0300.json",
  "spec_path": "../docs/phase_intelligence/phase_5_conversational_baskets_v3_ACTIVE.md",
  "seeds": [
    {
      "seed_id": "S0101",
      "seed_pair": {...},
      "legos": [
        {
          "id": "S0101L01",
          "type": "M",
          "target": "Estoy disfrutando",
          "known": "I'm enjoying",
          "new": true,              // ⭐ PRESERVED
          "components": [...]
        },
        {
          "id": "S0017L02",
          "ref": "S0017"            // ⭐ PRESERVED
        }
      ],
      "cumulative_legos": 281       // ⭐ PRESERVED
    }
  ]
}
```

**What's Preserved**:
- ✅ All seed metadata (seed_pair, cumulative_legos)
- ✅ All LEGO metadata (id, type, target, known, new, ref, components)
- ✅ Structural relationships (which LEGOs belong to which seeds)

**What's Added**:
- ✅ Agent assignment info (agent_id, seed_range)
- ✅ Resource paths (registry_path, spec_path)

---

### Phase 5: Basket Generation (Current State)

**Agent Input** → **Agent Process** → **Agent Output**

**Problem: lego_pairs metadata is IMPLICIT, not EXPLICIT**

Agents currently:
1. ✅ Read agent_XX_seeds.json (has all lego_pairs data)
2. ✅ Read lego_registry for whitelist building
3. ✅ Generate 10 phrases per LEGO
4. ❌ **Don't explicitly validate against lego_pairs structure**

**Current v4.0 Validation**:
```javascript
// GATE 2 checks:
- ✅ Word-by-word GATE compliance (whitelist checking)
- ✅ Distribution 2-2-2-4
- ✅ Final phrase = complete seed sentence
- ❌ NEW vs REF LEGO awareness
- ❌ Cumulative LEGO count tracking
- ❌ Component LEGO awareness (for Molecular LEGOs)
```

---

## 🎯 Key Insights

### 1. NEW vs REF Distinction is Critical

**Current State**: Agents generate baskets for ALL LEGOs in their input

**Problem**:
- Reference LEGOs (ref: "S0017") **already have baskets** from original seeds
- Generating duplicate baskets is **wasted effort**
- Validators can't tell if an agent **intentionally skipped** REF LEGOs or **failed**

**Impact on Batch 1**:
- 273 NEW LEGOs need baskets
- ~278 REF LEGOs don't need baskets (S0001-S0100)
- Initial analysis counted REF LEGOs as "missing" = false negative

**Solution**: Make agents aware of NEW vs REF distinction

---

### 2. Cumulative LEGO Context Enables Better Validation

**What cumulative_legos Tells Us**:
```json
{
  "seed_id": "S0101",
  "cumulative_legos": 281,   // This seed has 281 LEGOs available
  "legos": [
    {
      "id": "S0101L01",      // This is LEGO #279 (if 3 new LEGOs in seed)
      "available_legos": 278  // Can use 278 previous LEGOs
    }
  ]
}
```

**Validator Can Check**:
- ✅ Does phrase vocabulary come from available_legos set?
- ✅ Is vocabulary usage proportional to recency? (5 previous seeds = 20-30% usage)
- ✅ Does final LEGO properly use full vocabulary set?

**Current v4.0**: Uses registry but **doesn't track cumulative_legos metadata**

---

### 3. Molecular LEGO Components Enable Quality Checks

**Component Structure**:
```json
{
  "id": "S0101L01",
  "type": "M",
  "target": "Estoy disfrutando",
  "known": "I'm enjoying",
  "components": [
    ["Estoy", "I'm"],
    ["disfrutando", "enjoying"]
  ]
}
```

**Validator Can Check**:
- ✅ Do phrases progressively build from components → full LEGO?
- ✅ Phrase 1-2: Could use just "disfrutando" or just "Estoy"
- ✅ Phrase 3+: Should use full "Estoy disfrutando"
- ✅ Are components taught before being combined?

**Current v4.0**: Treats all LEGOs the same, **ignores component structure**

---

### 4. Seed Pair is the Target Outcome

**Every seed has a target sentence**:
```json
{
  "seed_pair": {
    "known": "I'm enjoying finding out more about this language.",
    "target": "Estoy disfrutando descubrir más sobre este lenguaje"
  }
}
```

**Current v4.0**: Checks final phrase = seed sentence ✅

**Could Also Check**:
- ✅ Do intermediate phrases **build toward** the seed?
- ✅ Are LEGO combinations **relevant to seed context**?
- ✅ Does vocabulary selection **fit seed's theme**?

---

## 🔧 Proposed Enhancements

### Enhancement 1: NEW-Only Basket Generation

**Change**: Agents should ONLY generate baskets for `new: true` LEGOs

**Implementation**:

#### In v4.0 Prompt (Generation Phase):
```markdown
## LEGO SELECTION

**CRITICAL**: Only generate baskets for NEW LEGOs.

Your input file marks LEGOs with:
- `"new": true` - Generate 10 practice phrases ✅
- `"ref": "S0XXX"` - Skip (already has basket from original seed) ⏭️

**Workflow**:
1. Read agent_XX_seeds.json
2. For each seed:
   - Filter LEGOs: `legos.filter(l => l.new === true)`
   - Generate baskets ONLY for filtered LEGOs
   - Skip all reference LEGOs
3. Output contains ONLY new LEGO baskets

**Example**:
```json
// Input seed S0101 has 5 LEGOs total
{
  "seed_id": "S0101",
  "legos": [
    {"id": "S0101L01", "new": true},      // ✅ Generate basket
    {"id": "S0017L02", "ref": "S0017"},   // ⏭️ Skip
    {"id": "S0023L02", "ref": "S0023"},   // ⏭️ Skip
    {"id": "S0101L02", "new": true},      // ✅ Generate basket
    {"id": "S0101L03", "new": true}       // ✅ Generate basket
  ]
}

// Output should have 3 baskets (not 5)
{
  "seeds": {
    "S0101": {
      "legos": {
        "S0101L01": {...},  // Generated
        "S0101L02": {...},  // Generated
        "S0101L03": {...}   // Generated
        // S0017L02 and S0023L02 NOT included
      }
    }
  }
}
```

**Validation Enhancement**:
```javascript
// NEW: Check that agent only generated NEW LEGOs
const inputSeeds = JSON.parse(fs.readFileSync(inputPath, 'utf8')).seeds;

for (const seed of inputSeeds) {
  const expectedNewLegos = seed.legos.filter(l => l.new === true).map(l => l.id);
  const generatedLegoIds = Object.keys(outputData.seeds[seed.seed_id].legos);

  // Check: All generated LEGOs should be NEW
  const incorrectlyGenerated = generatedLegoIds.filter(id => {
    const inputLego = seed.legos.find(l => l.id === id);
    return !inputLego || !inputLego.new;
  });

  if (incorrectlyGenerated.length > 0) {
    console.error(`❌ Agent generated baskets for reference LEGOs: ${incorrectlyGenerated.join(', ')}`);
  }

  // Check: All expected NEW LEGOs are present
  const missing = expectedNewLegos.filter(id => !generatedLegoIds.includes(id));

  if (missing.length > 0) {
    console.error(`❌ Agent missed NEW LEGOs: ${missing.join(', ')}`);
  }
}
```

**Benefits**:
- ✅ Agents skip ~50% of LEGOs (references don't need baskets)
- ✅ Faster execution (less work per agent)
- ✅ Clearer validation (exactly X NEW LEGOs expected)
- ✅ No duplicate basket generation

---

### Enhancement 2: Cumulative Context Awareness

**Change**: Validate vocabulary usage against available_legos count

**Implementation**:

#### In v4.0 Prompt (Quality Checking):
```markdown
## VOCABULARY RECENCY PRIORITY

**Context Awareness**: Each LEGO has a `cumulative_legos` number showing how many LEGOs were taught before it.

**Recency Rules**:
1. **Recent vocabulary (last 5 seeds) = 30-50% of phrases**
   - Makes content feel fresh and relevant
   - Reinforces recently learned material

2. **Mid-range vocabulary (6-20 seeds back) = 30-40% of phrases**
   - Maintains connection to earlier content
   - Provides variety

3. **Early vocabulary (20+ seeds back) = 10-20% of phrases**
   - Keeps foundational LEGOs active
   - Prevents forgetting

**Example**:
```json
// Generating basket for S0101L01 (LEGO #279 out of 281 total)
{
  "cumulative_legos": 281,
  "available_legos": 278
}

// Recent seeds: S0096-S0100 (LEGOs ~250-278) = 28 LEGOs
// Mid-range: S0076-S0095 (LEGOs ~150-249) = ~100 LEGOs
// Early: S0001-S0075 (LEGOs 1-149) = ~149 LEGOs

// In 10 phrases:
// - 3-5 phrases use vocabulary from LEGOs 250-278 ✅ Recent
// - 3-4 phrases use vocabulary from LEGOs 150-249 ✅ Mid-range
// - 1-2 phrases use vocabulary from LEGOs 1-149 ✅ Early
```

**Validation Enhancement**:
```javascript
// NEW: Track vocabulary source for each phrase
const vocabularyDistribution = {
  recent: 0,    // Last 50 LEGOs
  mid: 0,       // 51-150 LEGOs back
  early: 0      // 150+ LEGOs back
};

for (const phrase of lego.practice_phrases) {
  const spanish = phrase[1];
  const words = tokenize(spanish);

  for (const word of words) {
    // Find which LEGO taught this word
    const teachingLegoNum = findTeachingLEGO(word, registry);
    const currentLegoNum = extractLegoNumber(legoId);
    const distance = currentLegoNum - teachingLegoNum;

    if (distance <= 50) vocabularyDistribution.recent++;
    else if (distance <= 150) vocabularyDistribution.mid++;
    else vocabularyDistribution.early++;
  }
}

// Report distribution
console.log(`Recency distribution: Recent=${vocabularyDistribution.recent}, Mid=${vocabularyDistribution.mid}, Early=${vocabularyDistribution.early}`);

// Warning if too much old vocabulary
const totalWords = Object.values(vocabularyDistribution).reduce((a, b) => a + b, 0);
const earlyPercent = (vocabularyDistribution.early / totalWords) * 100;

if (earlyPercent > 30) {
  console.warn(`⚠️  ${legoId}: ${earlyPercent.toFixed(0)}% early vocabulary (target <20%)`);
}
```

**Benefits**:
- ✅ Measurable quality metric (vocabulary recency)
- ✅ Ensures content feels fresh as course progresses
- ✅ Balances practice of new vs old material
- ✅ Validates against pedagogical best practices

---

### Enhancement 3: Molecular LEGO Component Progression

**Change**: Validate that Molecular LEGOs show component progression

**Implementation**:

#### In v4.0 Prompt (Molecular LEGO Guidelines):
```markdown
## MOLECULAR LEGO PROGRESSION

**Definition**: Molecular LEGOs (type: "M") combine 2+ words into meaningful units.

**Component Structure**:
```json
{
  "id": "S0101L01",
  "type": "M",
  "target": "Estoy disfrutando",
  "known": "I'm enjoying",
  "components": [
    ["Estoy", "I'm"],
    ["disfrutando", "enjoying"]
  ]
}
```

**Progression Rules**:
1. **Phrase 1-2**: Can use individual components
   - "disfrutando" (enjoying) ✅
   - "Estoy" (I'm) ✅

2. **Phrase 3-4**: Should introduce combined form
   - "Estoy disfrutando" (I'm enjoying) ✅

3. **Phrase 5-10**: Use full molecular LEGO naturally
   - "Estoy disfrutando hablar español" ✅

**Example Good Progression**:
```javascript
[
  ["enjoying", "disfrutando", null, 1],                              // Component only
  ["I'm enjoying", "Estoy disfrutando", null, 2],                    // Full LEGO introduced
  ["I'm enjoying Spanish", "Estoy disfrutando español", null, 3],    // Full LEGO + context
  ["I'm enjoying learning something new", "Estoy disfrutando aprender algo nuevo", null, 5],
  ...
]
```

**Why This Matters**:
- Shows learner how components combine
- Provides scaffolding from parts → whole
- Matches SSi's "build-up" methodology
```

**Validation Enhancement**:
```javascript
// NEW: Check Molecular LEGO progression
if (lego.type === 'M' && lego.components) {
  const componentWords = lego.components.map(c => c[0].toLowerCase());
  const fullLEGO = lego.target.toLowerCase();

  let usedComponents = false;
  let usedFull = false;

  for (let i = 0; i < lego.practice_phrases.length; i++) {
    const spanish = lego.practice_phrases[i][1].toLowerCase();

    // Check if phrase uses individual components
    const hasComponent = componentWords.some(comp => spanish.includes(comp) && !spanish.includes(fullLEGO));
    if (hasComponent && i < 3) usedComponents = true;

    // Check if phrase uses full LEGO
    if (spanish.includes(fullLEGO)) usedFull = true;
  }

  if (!usedComponents) {
    console.warn(`⚠️  ${legoId}: Molecular LEGO doesn't show component progression in early phrases`);
  }

  if (!usedFull) {
    console.error(`❌ ${legoId}: Molecular LEGO never uses full combined form`);
  }
}
```

**Benefits**:
- ✅ Validates pedagogical progression
- ✅ Ensures learners understand part-whole relationships
- ✅ Matches SSi methodology
- ✅ Catches phrases that skip important learning steps

---

### Enhancement 4: Seed Context Awareness

**Change**: Validate phrases build toward seed sentence context

**Implementation**:

#### In v4.0 Prompt (Seed Context):
```markdown
## SEED SENTENCE CONTEXT

**Each seed introduces a complete conversational sentence**:
```json
{
  "seed_pair": {
    "known": "I'm enjoying finding out more about this language.",
    "target": "Estoy disfrutando descubrir más sobre este lenguaje"
  }
}
```

**Context Awareness**:
1. Early LEGOs in seed: Build toward the theme
2. Middle LEGOs: Explore variations on theme
3. Final LEGO: Culminate in complete seed sentence

**Example - S0101**:
```javascript
// Theme: "enjoying learning about language"
// LEGOs: "I'm enjoying" + "to find out" + "more" + "about" + "this language"

// S0101L01 "I'm enjoying" phrases should trend toward:
- "I'm enjoying learning" ✅
- "I'm enjoying finding out" ✅
- "I'm enjoying Spanish" ✅

// Not random disconnected phrases:
- "I'm enjoying when you speak" ❌ (doesn't build toward seed)
```

**Benefits**:
- Phrases feel coherent within each seed
- Learners see logical progression
- Final sentence feels earned, not arbitrary
```

**Validation Enhancement**:
```javascript
// NEW: Check thematic coherence
const seedWords = extractKeyWords(seed.seed_pair.known);  // ["enjoying", "finding", "language"]

for (const legoId in seed.legos) {
  const lego = seed.legos[legoId];
  const finalLEGOIndex = Object.keys(seed.legos).length - 1;
  const isLastLEGO = Object.keys(seed.legos).indexOf(legoId) === finalLEGOIndex;

  if (!isLastLEGO) {
    // Check if phrases reference seed theme
    let thematicPhrases = 0;

    for (const phrase of lego.practice_phrases) {
      const english = phrase[0].toLowerCase();
      const hasThematicWord = seedWords.some(word => english.includes(word));
      if (hasThematicWord) thematicPhrases++;
    }

    const thematicPercent = (thematicPhrases / lego.practice_phrases.length) * 100;

    if (thematicPercent < 30) {
      console.warn(`⚠️  ${legoId}: Only ${thematicPercent.toFixed(0)}% phrases relate to seed theme (target 30%+)`);
    }
  }
}
```

**Benefits**:
- ✅ Ensures phrases feel purposeful, not random
- ✅ Creates narrative arc within each seed
- ✅ Validates against "conversational gold" quality standard

---

## 📋 Summary of Enhancements

| Enhancement | Current v4.0 | Proposed | Impact |
|-------------|--------------|----------|--------|
| **NEW vs REF awareness** | Generates all LEGOs | Only NEW LEGOs | 50% less work, clearer validation |
| **Cumulative context** | Uses registry only | Tracks recency | Measurable quality metric |
| **Molecular progression** | Treats all LEGOs same | Component scaffolding | Matches SSi methodology |
| **Seed context** | Final phrase only | Thematic coherence | "Conversational gold" quality |

---

## 🎯 Recommended Implementation Order

### Phase 1: NEW-Only Generation (CRITICAL) ⭐
**Why First**: Biggest immediate impact
- Reduces agent work by ~50%
- Fixes false-negative validation errors
- Clarifies expectations

**Implementation**: 1-2 hours
- Update v4.0 prompt (Generation section)
- Add NEW-filtering validation
- Test with 1 agent

---

### Phase 2: Cumulative Context Validation (HIGH VALUE) ⭐
**Why Second**: Adds measurable quality metric
- Objective recency measurement
- Catches vocabulary staleness
- Aligns with pedagogical goals

**Implementation**: 2-3 hours
- Add recency tracking to GATE 2
- Create vocabulary distribution report
- Set warning thresholds

---

### Phase 3: Molecular Progression (MEDIUM VALUE)
**Why Third**: Improves pedagogy for ~40% of LEGOs
- Validates part-whole learning
- Catches missing scaffolding
- Matches SSi methodology

**Implementation**: 2-3 hours
- Add component detection logic
- Check early-phrase components
- Validate full LEGO usage

---

### Phase 4: Seed Context (POLISH)
**Why Last**: Adds final quality layer
- Subjective/harder to measure
- Requires thematic keyword extraction
- Nice-to-have vs must-have

**Implementation**: 3-4 hours
- Extract seed themes
- Track thematic coherence
- Add warnings (not errors)

---

## 📁 Files That Need Updates

### 1. Agent Prompt (v4.0 → v4.1)
**File**: `docs/phase_intelligence/AGENT_PROMPT_phase5_basket_generation_v4_VALIDATED.md`

**Changes**:
- Add NEW-only generation instructions
- Add recency priority details
- Add Molecular LEGO progression rules
- Update validation logic examples

---

### 2. Analysis Scripts
**Files**:
- `scripts/analyze_new_lego_coverage.cjs` ✅ Already filters NEW
- `scripts/analyze_agent_coverage.cjs` - Update to use lego_pairs metadata

**New Scripts Needed**:
- `scripts/validate_basket_quality.cjs` - Implement GATE 2 validation logic
- `scripts/check_vocabulary_recency.cjs` - Analyze recency distribution

---

### 3. Batch Preparation
**File**: `scripts/phase5_prepare_basket_batches.cjs`

**Changes**:
- Ensure `new` and `ref` fields preserved in agent input
- Add validation that agent inputs have all required metadata

---

## 🚦 Recommendation

**Implement Phase 1 (NEW-only) immediately** before any Batch 2 testing.

This is a **critical fix** that:
- Prevents wasted agent work (~50% time savings)
- Fixes validation false negatives
- Makes expectations crystal clear

**Timeline**: 1-2 hours to update v4.0 prompt and test

**Then**: Run 1-agent test (Agent 07) with NEW-only v4.1 prompt before proceeding to Phases 2-4.

---

**Status**: 🎯 Ready to implement Phase 1 enhancement
