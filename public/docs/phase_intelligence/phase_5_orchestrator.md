# Phase 5: Practice Basket Generation Orchestration

**Version**: v6.0 - Sliding Window Pipeline (2025-11-11)
**Purpose**: Generate natural, vocabulary-compliant practice phrases for each LEGO

---

## 🎯 Overview

Phase 5 generates practice phrase baskets using a **sliding window approach** with recent seed context. The pipeline ensures **100% vocabulary compliance** while producing **linguistically natural phrases**.

**Input**: Deduplicated LEGO pairs (Phase 3/4 output)
**Output**: Practice phrase baskets with GATE validation
**Agent Intelligence**: `docs/phase_intelligence/phase_5_lego_baskets.md`

---

## 📋 Pipeline Steps

### Step 1: Generate Scaffolds

**What happens**: Build scaffold JSON files for each seed containing:
- **recent_seed_pairs**: Last 10 seeds as complete sentences (sliding window)
- **current seed context**: The seed_pair being taught
- **LEGOs to teach**: Only new LEGOs (`new: true` from deduplication)
- **Incremental availability**: Each LEGO has access to previous LEGOs from current seed

**Script**: `generate_scaffolds_v3.cjs`
**Location**: `vfs/courses/{course}/generate_scaffolds_v3.cjs`

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

// For each new LEGO, set available context
legosObj[legoId] = {
  lego: [lego.known, lego.target],
  type: lego.type,
  current_seed_legos_available: [...currentSeedLegosAvailable],
  is_final_lego: isLastLego,
  practice_phrases: [],  // Agent fills this
};

// Add this LEGO to available list for next LEGOs
currentSeedLegosAvailable.push([lego.known, lego.target]);
```

**Run command**:
```bash
cd /path/to/vfs/courses/{course}
node generate_scaffolds_v3.cjs
```

**Output**: `phase5_scaffolds/seed_sXXXX.json` for each seed
**Expected time**: ~1 minute for 134 seeds

---

### Step 2: Generate Practice Phrases

**What happens**: Agents create 12-15 natural, linguistically sound practice phrases per LEGO

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

**Example Good Phrases**:
```json
["if I want to learn", "si quiero aprender", null, 4]
["I'm trying to speak Spanish now", "estoy intentando hablar español ahora", null, 5]
["I can remember what I want to say", "puedo recordar lo que quiero decir", null, 6]
```

**Quality Standards**:
- Semantically meaningful (not nonsense)
- Syntactically correct in both languages
- Pedagogically useful for learners
- Natural utterances (not mechanical slot-filling)

**Agent reads**:
- Prompt intelligence: `docs/phase_intelligence/phase_5_lego_baskets.md`
- Scaffold data: `phase5_scaffolds/seed_sXXXX.json` (for assigned range)

**Agent writes**:
- Output: `phase5_outputs/seed_sXXXX.json` (with `generation_stage: "PHRASE_GENERATION_COMPLETE"`)

**Expected output**: ~1,600-2,000 practice phrases total (~12-15 per LEGO × ~134 LEGOs)

---

### Step 3: GATE Validation (Vocabulary Compliance)

**What happens**: Validate that **every Spanish word** in practice phrases is available

**Script**: `gate_validator.cjs`
**Location**: `vfs/courses/{course}/gate_validator.cjs`

**Vocabulary sources checked**:
1. `recent_seed_pairs` vocabulary (any word in those 10 sentences)
2. `current_seed_legos_available` vocabulary
3. Current LEGO being taught

**Key Logic**:
```javascript
// Extract vocabulary from sliding window
// If "ahora" appears in any of the 10 recent seed_pairs, it's available
Object.values(basket.recent_seed_pairs).forEach(([spanish, english]) => {
  spanish.split(/\s+/).forEach(word => {
    const normalized = word.trim().toLowerCase().replace(/[.,;:¿?¡!]/g, '');
    if (normalized) availableWords.add(normalized);
  });
});
```

**Run command**:
```bash
cd /path/to/vfs/courses/{course}
node gate_validator.cjs
```

**Expected result**: ~98% vocabulary compliance (2% violations are normal and acceptable)

---

### Step 4: Remove GATE Violations

**What happens**: Automatically remove phrases that use unavailable vocabulary

**Script**: `remove_gate_violations.cjs`
**Location**: `scripts/remove_gate_violations.cjs`

**Process**:
- Filters out violating phrases
- Updates `phrase_distribution` counts
- Sets `generation_stage: "GATE_VIOLATIONS_REMOVED"`
- Preserves phrase quality while ensuring compliance

**Run command**:
```bash
node scripts/remove_gate_violations.cjs public/vfs/courses/{course}
```

**Expected result**: 100% GATE-compliant baskets with ~98% phrase retention

---

### Step 5: Grammar Review (Seeds 1-100 ONLY)

**What happens**: Remove grammatically incorrect phrases using AI-assisted review

**Script**: `grammar_review.cjs`
**Location**: `scripts/grammar_review.cjs`
**Applies to**: Seeds 1-100 only (foundation material)

**Why only seeds 1-100?**
- Foundation seeds get 10-20 repetitions per phrase = 40,000-80,000 total encounters
- Early errors embed incorrect patterns deeply
- After 100 seeds, learners have pattern recognition to self-correct
- Seeds 101-668 skip this step (GATE compliance sufficient)

**Process**:
- AI reviews phrases for grammatical correctness in BOTH languages
- Removes phrases with grammar errors (missing words, agreement errors, etc.)
- Keeps unnatural but correct phrases (pedagogical value)
- Updates `generation_stage: "GRAMMAR_REVIEWED"`

**Run command**:
```bash
node scripts/grammar_review.cjs public/vfs/courses/{course}_s0001-0100
```

**Expected result**: 100% grammatically correct phrases, ~2-5% removal rate

**See**: `docs/phase_intelligence/phase_5.5_grammar_review.md` for full criteria

---

## 📦 Output Format

Final baskets in `phase5_outputs/seed_sXXXX.json`:

```json
{
  "version": "curated_v7_spanish",
  "seed_id": "S0010",
  "generation_stage": "GATE_VIOLATIONS_REMOVED",
  "seed_pair": {
    "target": "No estoy seguro si puedo recordar toda la oración.",
    "known": "I'm not sure if I can remember the whole sentence."
  },
  "recent_seed_pairs": {
    "S0001": ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
    "S0002": ["Estoy intentando aprender.", "I'm trying to learn."]
  },
  "legos": {
    "S0010L01": {
      "lego": ["if", "si"],
      "type": "A",
      "current_seed_legos_available": [],
      "practice_phrases": [
        ["if I want", "si quiero", null, 2],
        ["if I speak Spanish", "si hablo español", null, 3]
      ],
      "phrase_distribution": {
        "really_short_1_2": 2,
        "quite_short_3": 2,
        "longer_4_5": 4,
        "long_6_plus": 3
      }
    }
  }
}
```

---

## 🎯 Success Criteria

**All seeds (1-668)**:
- ✅ All seeds processed (scaffolds → baskets → validation → cleanup)
- ✅ Only new LEGOs have baskets (`new: true` only)
- ✅ 12-15 phrases per LEGO average (after filtering)
- ✅ **100% GATE compliance** (no unavailable vocabulary)
- ✅ **Pedagogically useful** (semantically meaningful)
- ✅ Proper phrase distribution (mix of lengths)

**Seeds 1-100 additional criteria**:
- ✅ **100% grammatically correct** (both languages)
- ✅ Grammar review completed (`generation_stage: "GRAMMAR_REVIEWED"`)

---

## 📊 Expected Metrics (per 134 seeds)

**Per seed**: 3-7 LEGOs (average ~4.25)
**Per LEGO**: 12-15 phrases (average ~12.4 after GATE removal)
**Total phrases**: ~1,600-2,000 phrases for 134 seeds
**GATE compliance**: 100% (after violation removal)
**Processing time**:
- Scaffold generation: ~1 minute
- Phrase generation: Variable (depends on automation strategy)
- GATE validation: ~2 minutes
- Violation removal: ~1 minute

---

## 🚨 Common Issues

### Issue 1: Agent generates mechanical phrases
**Symptom**: Arrays of individual LEGO words instead of complete utterances
**Example**: `["quiero", "hablar", "español"]` instead of `["I want to speak Spanish", "quiero hablar español", null, 3]`
**Fix**: Re-emphasize "Think → Express → Validate" approach. Start with meaning, not pattern forcing.

### Issue 2: High GATE violation rate (>5%)
**Symptom**: More than 5% phrases use unavailable vocabulary
**Fix**: Check scaffold generation - ensure `recent_seed_pairs` are complete sentences and properly formatted. Verify `current_seed_legos_available` is correctly tracking incremental LEGOs within seed.

### Issue 3: Phrases are ungrammatical
**Symptom**: Syntactically incorrect phrases in either language
**Impact**: This is rare (~1-2%) and acceptable. Manual review will catch these.
**Note**: Do NOT use automated grammar filters (tested and rejected as too strict/inconsistent).

---

## 🔑 Key Principles (v6.0)

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
- `recent_seed_pairs`: Complete Spanish sentences (split on spaces)
- `current_seed_legos_available`: LEGOs from this seed so far
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

## 📁 File Structure

```
spa_for_eng_sXXXX-XXXX/
├── lego_pairs.json                    # Input from Phase 3/4 (deduplicated)
├── generate_scaffolds_v3.cjs          # Step 1: Scaffold generator
├── phase5_scaffolds/                  # Step 1 output
│   ├── seed_s0001.json
│   ├── seed_s0002.json
│   └── ...
├── phase5_outputs/                    # Step 2 output (agent-generated)
│   ├── seed_s0001.json               # generation_stage: GATE_VIOLATIONS_REMOVED
│   ├── seed_s0002.json
│   └── ...
├── gate_validator.cjs                 # Step 3: Validation
└── remove_gate_violations.cjs         # Step 4: Auto-fix
```

---

## 🎓 Pedagogical Goals

The Phase 5 pipeline is designed to:

1. **Provide natural, meaningful practice** for each new vocabulary unit
2. **Ensure 100% vocabulary safety** (learners never encounter unknown words)
3. **Build progressively** from short to long utterances
4. **Force curriculum progression** through sliding window (can't stagnate on early vocab)
5. **Produce high linguistic quality** through pattern-guided generation
6. **Scale efficiently** to full 668-seed course

---

## 📝 Optional: Manual Quality Review

**Target**: First 50 seeds (~1,500 phrases)
**Purpose**: Perfect first impression for new learners

Manually review for:
- Collocation naturalness (e.g., "say Spanish" vs "speak Spanish")
- Pedagogical usefulness
- Semantic clarity

**Note**: Automated filters were tested but rejected for being too strict/inconsistent. Human review provides better balance of quality and pedagogical value.

---

**Remember**: Linguistic quality is paramount. These phrases are the learner's practice material. They must be natural, meaningful, and grammatically correct.
