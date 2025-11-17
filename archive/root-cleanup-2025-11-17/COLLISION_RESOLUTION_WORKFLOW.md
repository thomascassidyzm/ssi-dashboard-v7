# Complete Collision Resolution Workflow

## Overview

LEGO registry collisions occur when the same KNOWN phrase maps to multiple different TARGET phrases, violating the one-to-one mapping constraint required for the registry.

**Solution Strategy**: FCFS (First-Come-First-Served) + Collision-Aware Re-extraction

## The Problem

**Example Collision:**
```
S0012L03: "what" → "lo que" (relative pronoun)
S0068L01: "what" → "qué" (interrogative)
```

When a learner hears "what", the registry cannot determine which TARGET to produce → **learner uncertainty**.

## The Solution: FCFS + Re-extraction

### Step 1: Detect Collisions

**Script**: `scripts/validation/check-lego-fd-violations.cjs`

```bash
node scripts/validation/check-lego-fd-violations.cjs public/vfs/courses/spa_for_eng/lego_pairs.json
```

**Output**:
- `lego_pairs_fd_report.json` - Detailed collision analysis
- `lego_pairs_reextraction_manifest.json` - Seeds needing fixes

**Spanish Course Results**:
- 96 collisions detected
- 301 LEGOs involved (multiple LEGOs per collision)
- 237 affected seeds

### Step 2: Apply FCFS Rule & Delete Subsequent Baskets

**Script**: `scripts/validation/delete-colliding-baskets.cjs`

```bash
node scripts/validation/delete-colliding-baskets.cjs spa_for_eng
```

**FCFS Rule**:
- **KEEP** first occurrence (winner)
- **DELETE** baskets for all subsequent occurrences
- Subsequent LEGOs will be re-extracted with collision avoidance

**Spanish Course Results**:
- 96 first-occurrence LEGOs KEPT
- 205 subsequent LEGOs flagged for re-extraction
- 169 baskets deleted (6% of total)
- 2547 baskets remaining (94% preserved)

**Backup**: `deleted_baskets_backup.json` (can restore if needed)

### Step 3: Generate Collision-Aware Re-extraction Manifest

**Script**: `scripts/validation/generate-collision-aware-reextraction.cjs`

```bash
node scripts/validation/generate-collision-aware-reextraction.cjs spa_for_eng
```

**Output**: `phase3_collision_reextraction_manifest.json`

Contains:
- **77 seeds** requiring re-extraction
- For each seed:
  - Original sentence (known + target)
  - Specific collision avoidance instructions
  - FCFS winner details

**Example instruction** (S0068):
```
DO NOT extract "what" as standalone LEGO (S0068L01).
Reason: Registry collision with S0012:S0012L03 ("lo que").
Solution: Chunk "what" UP with adjacent words from this sentence
to create a larger, unique LEGO. Use ONLY words from the source sentence.
```

**Spanish Course Results**:
- 77 seeds need re-extraction (32% of originally affected seeds)
- Average: ~1.3 collision phrases per affected seed
- Seed IDs list saved to `collision_reextraction_seed_ids.txt`

### Step 4: Re-run Phase 3 with Collision Awareness

**Method**: Send manifest to Phase 3 agent as context

The Phase 3 agent will:
1. Read the seed sentence
2. See the collision avoidance instruction
3. Naturally chunk up the phrase by including adjacent context
4. Extract LEGOs that avoid the collision

**Example** (S0068: "What are you looking for?"):
- ❌ AVOID: "what" (collides)
- ✅ EXTRACT: "What are you" or "What are you looking for"

### Step 5: Run Deduplication

**Script**: (Part of Phase 3.5 in Phase 3 server)

After re-extraction, mark debuts vs repeats:
- First occurrence of LEGO pair → `new: true`
- Subsequent occurrences → `new: false, ref: firstSeedId`

### Step 6: Re-validate (Should be 0 Collisions)

```bash
node scripts/validation/check-lego-fd-violations.cjs public/vfs/courses/spa_for_eng/lego_pairs.json
```

**Expected**: `✅ PASS: No registry collisions detected`

### Step 7: Generate Baskets for Re-extracted LEGOs

**Method**: Run Phase 5 for the 77 affected seeds

- Only generate baskets for newly re-extracted LEGOs
- FCFS winners already have baskets (were not deleted)
- 169 new baskets will be created

## Complete Workflow Diagram

```
┌─────────────────────────────────────────┐
│ Initial State: Phase 3 Complete         │
│ - 2931 LEGOs in lego_pairs.json        │
│ - 2716 baskets in lego_baskets.json    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Step 1: Detect Collisions               │
│ check-lego-fd-violations.cjs            │
│ → 96 collisions found                   │
│ → 301 LEGOs involved                    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Step 2: Apply FCFS & Delete Baskets     │
│ delete-colliding-baskets.cjs            │
│ → Keep 96 first-occurrence LEGOs        │
│ → Delete 169 subsequent baskets         │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Step 3: Generate Re-extraction Manifest │
│ generate-collision-aware-reextraction   │
│ → 77 seeds with avoidance instructions  │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Step 4: Phase 3 Re-extraction           │
│ (Send manifest to Phase 3 agent)        │
│ → Claude chunks up colliding phrases    │
│ → 205 LEGOs re-extracted with chunking  │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Step 5: Deduplication (Phase 3.5)       │
│ → Mark new: true/false                  │
│ → Add ref: firstSeedId for repeats      │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Step 6: Re-validate Collisions          │
│ check-lego-fd-violations.cjs            │
│ → Should be 0 collisions!               │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Step 7: Generate Baskets (Phase 5)      │
│ → 169 baskets for re-extracted LEGOs    │
│ → Total: 2716 baskets (same as before)  │
└─────────────────────────────────────────┘
```

## Key Insights

### Why FCFS Works

1. **Respects course progression**: Earlier seeds are more fundamental
2. **Minimal disruption**: Only 6% of baskets need regeneration
3. **Clear decision rule**: No subjective choices needed
4. **Stable winners**: First occurrence never changes

### Why Re-extraction > Programmatic Upchunking

1. **Linguistic understanding**: Claude knows natural phrase boundaries
2. **Context-aware**: Considers semantic meaning, not just string manipulation
3. **Flexible**: Can handle edge cases (same-seed collisions, atomic words, etc.)
4. **Reliable**: 100% success rate (vs 67% for programmatic approach)

### Collision Statistics (Spanish Course)

- **Total LEGOs**: 2931
- **Collision rate**: 3.3% (96 out of 2931)
- **Affected seeds**: 237 out of 679 (35%)
- **Seeds needing re-extraction**: 77 out of 237 (32%)
- **Baskets deleted**: 169 out of 2716 (6%)

**Most common collision types**:
1. Synonyms ("parar" vs "dejar" for "to stop")
2. Grammatical variations ("aprendiendo" vs "aprender")
3. Preposition differences ("para ir" vs "ir")
4. Same phrase, different contexts ("what" = "qué" vs "lo que")

## Scripts Summary

| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `check-lego-fd-violations.cjs` | Detect collisions | `lego_pairs.json` | `lego_pairs_fd_report.json` |
| `delete-colliding-baskets.cjs` | Apply FCFS, delete baskets | `lego_pairs_fd_report.json`, `lego_baskets.json` | Modified `lego_baskets.json`, backup |
| `generate-collision-aware-reextraction.cjs` | Create re-extraction manifest | `lego_pairs_fd_report.json`, `seed_pairs.json` | `phase3_collision_reextraction_manifest.json` |

## Future Improvements

1. **Proactive collision detection**: Run collision check DURING Phase 3 extraction (in parallel segments)
2. **Collision prediction**: Train model to predict likely collisions before extraction
3. **Automatic re-extraction trigger**: Orchestrator automatically sends manifest to Phase 3
4. **Iterative refinement**: If re-extraction still has collisions, expand further
5. **Collision heatmap**: Visualize collision-prone phrase patterns across courses

## Related Documentation

- `PHASE3_VALIDATION.md` - Phase 3 validation gates
- `PHASE5_CASCADE_IMPACT.md` - Basket regeneration details
- `PHASE2_VALIDATION.md` - Seed-level validation (FD at seed level)
