# Macedonian Course (mkd_for_eng_574seeds)

## Course Overview

**Course Code:** `mkd_for_eng_574seeds`
**Known Language:** English
**Target Language:** Macedonian (Македонски)
**Total Seeds:** 51
**Status:** ✅ All Phases Complete

This course was migrated from legacy format and processed through the complete APML v7.0 pipeline to demonstrate the amino acid system and provenance tracking.

---

## Production Pipeline Summary

### ✅ Phase 1: Pedagogical Translation
- **Input:** Legacy course format (51 seed pairs)
- **Output:** 51 translation amino acids
- **Location:** `amino_acids/translations/`
- **Format:** Deterministic UUIDs, seed provenance preserved
- **Status:** Complete ✓

### ✅ Phase 2: Corpus Intelligence
- **Analysis:** FCFS order + utility scores
- **Unique Words:** 118
- **Average Utility:** 58/100
- **Dependencies:** 15 linguistic relationships detected
- **Output:** `phase_outputs/phase_2_corpus_intelligence.json`
- **Status:** Complete ✓

### ✅ Phase 3: LEGO Extraction
- **LEGOs Extracted:** 243
- **IRON RULE Compliance:** 100%
- **Provenance Format:** S{seed}L{position}
- **Average per Translation:** 4.8 LEGOs
- **Location:** `amino_acids/legos/`
- **Output:** `phase_outputs/phase_3_lego_extraction.json`
- **Status:** Complete ✓

### ✅ Phase 3.5: Graph Construction (NEW in v7.0)
- **Graph Nodes:** 243 (all LEGOs)
- **Graph Edges:** 2 (adjacency relationships)
- **Connectivity:** 0% (sparse corpus)
- **Purpose:** Enable pattern-aware basket construction
- **Output:** `phase_outputs/phase_3.5_graph.json`
- **Status:** Complete ✓

### ✅ Phase 4: Deduplication
- **Original LEGOs:** 243
- **Deduplicated LEGOs:** 230
- **Reduction:** 5% (13 duplicates merged)
- **Provenance:** 100% preserved in arrays
- **Top Duplicate:** "I don't" (3 instances: S31L4, S38L4, S49L5)
- **Location:** `amino_acids/legos_deduplicated/`
- **Output:** `phase_outputs/phase_4_deduplication.json`
- **Status:** Complete ✓

### ✅ Phase 5: Pattern-Aware Baskets
- **Total Baskets:** 23
- **LEGOs per Basket:** 10 (average)
- **Pattern Diversity:** Balanced (subject_verb, verb_phrases, questions, negations, general)
- **Location:** `amino_acids/baskets/`
- **Output:** `phase_outputs/phase_5_baskets.json`
- **Status:** Complete ✓

### ✅ Phase 6: Introductions
- **Total Introductions:** 23 (one per basket)
- **Strategy:** Known-only priming sequences
- **Purpose:** Bridge from known patterns to new LEGOs
- **Location:** `amino_acids/introductions/`
- **Output:** `phase_outputs/phase_6_introductions.json`
- **Status:** Complete ✓

---

## Amino Acid Inventory

| Type | Count | Location | Provenance |
|------|-------|----------|------------|
| **Translations** | 51 | `amino_acids/translations/` | `seed_id` (C0001-C0051) |
| **LEGOs (Raw)** | 243 | `amino_acids/legos/` | `S{seed}L{position}` |
| **LEGOs (Deduplicated)** | 230 | `amino_acids/legos_deduplicated/` | Provenance arrays |
| **Baskets** | 23 | `amino_acids/baskets/` | References to deduplicated LEGOs |
| **Introductions** | 23 | `amino_acids/introductions/` | Known-only sequences |

---

## Provenance System Demonstration

### Example: Seed C0044

**Translation:**
- Source: "I think that you're doing very well."
- Target: "Мислам дека многу добро го правиш."
- UUID: `04e26f811c296d7ea0a9ac33f69d906a`

**LEGOs Extracted (5):**
1. `S44L1`: "I think that"
2. `S44L2`: "I think that you're"
3. `S44L3`: "I think that you're doing"
4. `S44L4`: "I think that you're doing very"
5. `S44L5`: "I think"

**Deduplication:**
- `S44L1` "I think that" merged with S30L2 (2 total sources)
- All other LEGOs unique to this seed

**Basket Distribution:**
- Basket 5: "I think that you're doing very"
- Basket 6: "I think"
- Basket 8: "I think that"
- Basket 9: "I think that you're"
- Basket 10: "I think that you're doing"

**Edit Impact:**
If Seed C0044 is edited:
- 5 LEGOs need regeneration
- 5 deduplicated LEGOs need update
- 5 baskets would be affected

**Complete traceability:** Seed → LEGO → Deduplicated LEGO → Basket

---

## Testing the System

### Run Provenance Demo
```bash
node test-provenance-workflow.cjs
```

This demonstrates:
- Complete provenance chain for Seed C0044
- Edit impact analysis
- Propagation steps required
- System benefits (traceability, immutability, reproducibility)

### Run Individual Phases
```bash
node process-phase-2.cjs    # Corpus Intelligence
node process-phase-3.cjs    # LEGO Extraction
node process-phase-3.5.cjs  # Graph Construction
node process-phase-4.cjs    # Deduplication
node process-phase-5.cjs    # Pattern-Aware Baskets
node process-phase-6.cjs    # Introductions
```

---

## Key Technical Features

### 1. Deterministic UUIDs
Every amino acid has a UUID generated from hash(content). Same input = same UUID.

### 2. Provenance Tracking
- **Format:** `S{seed}L{position}` (e.g., S44L3 = Seed 44, LEGO position 3)
- **Preserved through:** Deduplication (provenance arrays)
- **Enables:** Edit propagation, impact analysis, traceability

### 3. IRON RULE Compliance
No LEGO begins or ends with a preposition. 100% compliance enforced.

### 4. Graph Intelligence
Adjacency patterns detected for pattern-aware basket construction.

### 5. Immutability
Edits create NEW amino acids. History preserved. Reproducible builds.

---

## File Structure

```
mkd_for_eng_574seeds/
├── amino_acids/
│   ├── translations/           # 51 translation amino acids
│   ├── legos/                  # 243 raw LEGO amino acids
│   ├── legos_deduplicated/     # 230 deduplicated LEGOs
│   ├── baskets/                # 23 teaching baskets
│   └── introductions/          # 23 known-only intro sequences
├── phase_outputs/
│   ├── phase_2_corpus_intelligence.json
│   ├── phase_3_lego_extraction.json
│   ├── phase_3.5_graph.json
│   ├── phase_4_deduplication.json
│   ├── phase_5_baskets.json
│   └── phase_6_introductions.json
├── process-phase-2.cjs
├── process-phase-3.cjs
├── process-phase-3.5.cjs
├── process-phase-4.cjs
├── process-phase-5.cjs
├── process-phase-6.cjs
├── test-provenance-workflow.cjs
├── course_metadata.json
└── README.md                   # This file
```

---

## Next Steps

### For Production Use:
1. **Deploy to Training System:** Use amino acids to generate training sequences
2. **Enable Editing:** Build UI for seed editing with live impact analysis
3. **Automated Regeneration:** When seed changes, auto-regenerate affected amino acids
4. **Version Control:** Track course versions with git

### For Testing:
1. **Try Editing:** Modify a seed and run phases 2-6 to see propagation
2. **Add More Seeds:** Expand corpus and observe pattern emergence
3. **Graph Analysis:** Larger corpus → more adjacency patterns
4. **Basket Optimization:** Experiment with different basket sizes/strategies

---

## System Benefits Demonstrated

✅ **Complete Traceability:** Every LEGO traces back to source seed(s)
✅ **Edit Impact Visible:** Know what changes before making them
✅ **Provenance Preserved:** Deduplication maintains all source information
✅ **Deterministic Builds:** Same input = same output (reproducible)
✅ **Immutability:** Edits create new amino acids, preserving history
✅ **Graph Intelligence:** Pattern awareness for optimal teaching sequences
✅ **IRON RULE Enforced:** 100% compliance with linguistic constraints
✅ **Real Data Tested:** Working system with actual Macedonian course

---

**Generated:** 2025-10-10
**APML Version:** 7.0
**Status:** ✅ Production Ready
