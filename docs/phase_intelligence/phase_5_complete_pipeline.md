# Phase 5: Complete Pipeline v6.0 (2025-11-11)

**Status**: Production Ready
**Purpose**: End-to-end process for generating high-quality practice phrase baskets

---

## 🎯 Overview

Phase 5 generates practice phrase baskets for each LEGO using a **sliding window approach** with recent seed context. The pipeline ensures **100% vocabulary compliance** while producing **linguistically natural phrases**.

---

## 📊 Pipeline Steps

### Step 1: Generate Scaffolds
**Script**: `generate_scaffolds_v3.cjs`
**Input**: `lego_pairs.json` (from Phase 3)
**Output**: `phase5_scaffolds/seed_sXXXX.json`

Builds scaffold JSON files containing:
- **Recent seed_pairs**: Last 10 seeds as complete sentences (sliding window)
- **Current seed context**: The seed_pair being taught
- **LEGOs to teach**: Only new LEGOs (`new: true` from deduplication)
- **Incremental availability**: Each LEGO has access to previous LEGOs from current seed

**Key Logic**:
```javascript
// Build recent_seed_pairs from last 10 seeds
const recentSeedPairs = {};
const startIdx = Math.max(0, seedIdx - 10);
for (let i = startIdx; i < seedIdx; i++) {
  const prevSeed = legoPairs.seeds[i];
  recentSeedPairs[prevSeed.seed_id] = [
    prevSeed.seed_pair[0],  // Target (Spanish)
    prevSeed.seed_pair[1]   // Known (English)
  ];
}

// Track LEGOs accumulated within current seed
const currentSeedLegosAvailable = [];

// For each LEGO, set current_seed_legos_available
legosObj[legoId] = {
  lego: [lego.known, lego.target],
  type: lego.type,
  current_seed_legos_available: [...currentSeedLegosAvailable],
  is_final_lego: isLastLego,
  practice_phrases: [],  // Agent fills this
  // ...
};

// Add this LEGO to available list for next LEGOs
currentSeedLegosAvailable.push([lego.known, lego.target]);
```

**Run**:
```bash
cd public/vfs/courses/spa_for_eng_sXXXX-XXXX
node generate_scaffolds_v3.cjs
```

---

### Step 2: Generate Practice Phrases
**Agent**: Claude Sonnet 4.5 via Claude Code Task tool
**Prompt**: `docs/phase_intelligence/phase_5_lego_baskets.md`
**Input**: `phase5_scaffolds/seed_sXXXX.json`
**Output**: `phase5_outputs/seed_sXXXX.json` (with `generation_stage: "PHRASE_GENERATION_COMPLETE"`)

**Approach**: Pattern-Guided Natural Language Generation

1. **Think** → What would a learner want to say with this LEGO?
2. **Express** → Say it in Spanish using available vocabulary
3. **Validate** → Check all words are available

**Vocabulary Sources**:
- Words from `recent_seed_pairs` (split Spanish sentences on spaces)
- Words from `current_seed_legos_available`
- Words from current LEGO being taught

**Distribution Target**: 12-15 phrases per LEGO
- 2 phrases: 1-2 LEGOs (really_short)
- 2 phrases: 3 LEGOs (quite_short)
- 2 phrases: 4-5 LEGOs (longer)
- 4-6 phrases: 6+ LEGOs (long_6_plus)

**Phrase Format**: `["English phrase", "Spanish phrase", null, lego_count]`

**Run** (parallel agents):
```javascript
// Spawn 3 agents in parallel for seeds 1-9
Task({
  subagent_type: "general-purpose",
  prompt: `Generate Phase 5 baskets for S0001, S0002, S0003...
  Read scaffold from phase5_scaffolds/seed_sXXXX.json
  Read instructions from docs/phase_intelligence/phase_5_lego_baskets.md
  Write output to phase5_outputs/seed_sXXXX.json`
});
```

---

### Step 3: GATE Validation (Vocabulary Compliance)
**Script**: `gate_validator.cjs`
**Input**: `phase5_outputs/seed_sXXXX.json`
**Output**: Console report

Validates that **every Spanish word** in practice phrases is available from:
1. `recent_seed_pairs` vocabulary (any word in those 10 sentences)
2. `current_seed_legos_available` vocabulary
3. Current LEGO being taught

**Logic**:
```javascript
function extractAvailableVocabulary(basket, legoId) {
  const availableWords = new Set();

  // 1. Extract ALL words from recent_seed_pairs (sliding window)
  basket.recent_seed_pairs.forEach(([spanish, english]) => {
    spanish.split(/\s+/).forEach(word => {
      const normalized = word.trim().toLowerCase().replace(/[.,;:¿?¡!]/g, '');
      if (normalized) availableWords.add(normalized);
    });
  });

  // 2. Extract words from current_seed_legos_available
  currentLego.current_seed_legos_available.forEach(([english, spanish]) => {
    // ... normalize and add
  });

  // 3. Add current LEGO words
  // ... normalize and add

  return availableWords;
}
```

**Run**:
```bash
node gate_validator.cjs
```

**Target**: 100% vocabulary compliance

---

### Step 4: Remove GATE Violations
**Script**: `remove_gate_violations.cjs`
**Input**: `phase5_outputs/seed_sXXXX.json`
**Output**: Updated `phase5_outputs/seed_sXXXX.json` (with `generation_stage: "GATE_VIOLATIONS_REMOVED"`)

Automatically removes phrases that use unavailable vocabulary:
- Filters out violating phrases
- Updates `phrase_distribution` counts
- Preserves phrase quality while ensuring compliance

**Run**:
```bash
node remove_gate_violations.cjs
```

**Result**: 100% GATE-compliant baskets with ~98% phrase retention

---

### Step 5: Manual Quality Review (Optional)
**Target**: First 50 seeds (~1,500 phrases)
**Purpose**: Perfect first impression for new learners

Manually review for:
- Collocation naturalness (e.g., "say Spanish" vs "speak Spanish")
- Pedagogical usefulness
- Semantic clarity

**Note**: Automated filters were tested but rejected for being too strict/inconsistent. Human review provides better balance of quality and pedagogical value.

---

## 📁 File Structure

```
spa_for_eng_sXXXX-XXXX/
├── lego_pairs.json                    # Input from Phase 3
├── generate_scaffolds_v3.cjs          # Step 1: Scaffold generator
├── phase5_scaffolds/                  # Step 1 output
│   ├── seed_s0001.json
│   ├── seed_s0002.json
│   └── ...
├── phase5_outputs/                    # Step 2 output (agent-generated)
│   ├── seed_s0001.json
│   ├── seed_s0002.json
│   └── ...
├── gate_validator.cjs                 # Step 3: Validation
└── remove_gate_violations.cjs         # Step 4: Auto-fix
```

---

## 🎯 Success Metrics (S0001-S0010)

- **Seeds processed**: 10
- **LEGOs**: 29 (5 duplicates skipped)
- **Phrases generated**: 366
- **GATE violations**: 7 (2% - auto-removed)
- **Final phrases**: 359
- **GATE compliance**: 100%
- **Average phrases per LEGO**: 12.4
- **Quality**: Linguistically natural, pedagogically useful

---

## 🔑 Key Innovations in v6.0

### 1. Sliding Window Context
- Replaces massive cumulative whitelists
- Last 10 seed_pairs provide natural pattern examples
- Forces curriculum progression (can't always use earliest vocabulary)
- Scales to 668 seeds without exponential growth

### 2. Pattern-Guided Generation
- Agents think linguistically, not mechanically
- Start with "what would a learner want to say?"
- Use patterns as **inspiration**, not rigid templates
- Produces natural, communicative phrases

### 3. Vocabulary Sources are Explicit
- `recent_seed_pairs`: Complete Spanish sentences
- `current_seed_legos_available`: LEGOs from this seed
- `current LEGO`: The LEGO being taught
- Clear, unambiguous for both agents and validators

### 4. Incremental Build Within Seed
- L01 has access to recent seeds only
- L02 has access to recent seeds + L01
- L03 has access to recent seeds + L01 + L02
- Final LEGO culminates in complete seed sentence

### 5. GATE Validation Post-Generation
- Agents generate freely (12-15 phrases)
- GATE validator catches vocabulary violations
- Auto-removal script fixes issues
- ~98% phrase retention, 100% compliance

### 6. No Automated Grammar Filter
- Tested Haiku 4.5 for grammar/collocation filtering
- Found too strict and inconsistent
- Better to rely on human review for edge cases
- Accepts pedagogically useful phrases even if slightly stilted

---

## 🚀 Scaling to Full Course (668 Seeds)

### Parallel Generation Strategy

For 668 seeds with ~2,000 LEGOs:

1. **Scaffold Generation**: ~1 minute (single script)
2. **Phrase Generation**: ~3-4 hours (20 parallel agents, 30-35 seeds each)
3. **GATE Validation**: ~2 minutes (single script)
4. **GATE Violation Removal**: ~1 minute (single script)

**Total pipeline time**: ~4 hours for full course

### Agent Distribution (20 parallel agents)
- Agent 1: S0001-S0035
- Agent 2: S0036-S0070
- Agent 3: S0071-S0105
- ...
- Agent 20: S0631-S0668

### Expected Output
- ~24,000-28,000 practice phrases total
- ~98% GATE compliance pre-removal
- 100% compliance post-removal
- High linguistic quality throughout

---

## 📝 Lessons Learned

### What Works
✅ Sliding window with complete sentences (not fragmented whitelists)
✅ Pattern-guided generation (meaningful utterances first)
✅ GATE validation post-generation (agents generate freely)
✅ Incremental LEGO availability within seed
✅ Parallel agent processing

### What Doesn't Work
❌ Mechanical pattern filling (produces nonsense)
❌ Cumulative whitelists (exponential growth)
❌ Automated grammar filters (too strict/inconsistent)
❌ Asking agents to self-validate during generation (slows down, reduces quality)

### Critical Success Factors
1. **Clear vocabulary sources** in scaffold (explicit, not implicit)
2. **Agent freedom** to think linguistically
3. **Post-generation validation** (not during)
4. **A-before-M ordering** (from Phase 3)
5. **Deduplication** before basket generation (saves work)

---

## 🔄 Version History

- **v6.0** (2025-11-11): Sliding window with recent seed_pairs, GATE validation post-generation
- **v5.0** (2025-11-09): Staged pipeline with 3-category whitelist logic (deprecated)
- **v4.1**: Staged scaffold approach (deprecated)
- **v4.0**: Self-validating agent with gates (deprecated)

---

**Next**: Manual review of first 50 seeds for perfect first impression! 🎯
