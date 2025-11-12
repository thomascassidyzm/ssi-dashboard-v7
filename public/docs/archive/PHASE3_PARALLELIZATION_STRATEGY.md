# Phase 3 Parallelization Strategy: LEGO Extraction at Scale

**Goal**: Extract LEGOs from 100 Spanish seeds (or 668 total) using parallel agents
**Challenge**: Complete Tiling requirement creates sequential dependency
**Solution**: Hybrid batching with provisional IDs and merge step

---

## The Core Problem

### Complete Tiling Requirement

Each seed MUST show ALL LEGOs (new + referenced) to reconstruct it:

```json
// S0007 uses "quiero" from S0001
{
  "seed_id": "S0007",
  "legos": [
    {"id": "S0001L01", "type": "A", "target": "quiero", "known": "I want", "ref": "S0001"},  // ← Must reference S0001
    {"id": "S0007L01", "type": "A", "target": "intentar", "known": "to try", "new": true},
    {"id": "S0007L02", "type": "M", "target": "tan duro como pueda", "known": "as hard as I can", "new": true, "components": [...]},
    {"id": "S0007L03", "type": "A", "target": "hoy", "known": "today", "new": true}
  ]
}
```

### Sequential Dependency Chain

❌ **Naive parallelization fails**:
```
Agent 1: Extract S0001-S0005 → outputs lego_batch_01.json
Agent 2: Extract S0006-S0010 → ??? BLOCKED - needs Agent 1's LEGOs to mark references
Agent 3: Extract S0011-S0015 → ??? BLOCKED - needs Agent 1+2's LEGOs
```

**Problem**: Agent 2 cannot mark `"ref": "S0001"` for "quiero" until Agent 1 finishes.

---

## Solution: Hybrid Batch + Provisional IDs

### Strategy Overview

**3-Phase Approach:**
1. **Parallel Extraction** (agents work independently with provisional IDs)
2. **Sequential Merge** (coordinator builds master LEGO registry)
3. **Rewrite References** (update provisional IDs to final IDs)

### Phase 1: Parallel Extraction (Independent)

**Each agent extracts LEGOs treating ALL as "new"**:

```
Agent 1 (S0001-S0005):
  Extracts: quiero, hablar, español, contigo, ahora, estoy intentando, aprender...
  Marks: ALL as "new": true (no references yet)
  Outputs: batch_01_provisional.json

Agent 2 (S0006-S0010):
  Extracts: recordar, una palabra, quiero (again!), intentar, hoy...
  Marks: ALL as "new": true (duplicates OK at this stage)
  Outputs: batch_02_provisional.json

Agent 3 (S0011-S0015):
  Extracts: me gustaría, poder, después de que termines, quiero (again!)...
  Marks: ALL as "new": true
  Outputs: batch_03_provisional.json
```

**Key**: Agents don't know about each other. They just extract what they see.

### Phase 2: Sequential Merge (Build Master Registry)

**Coordinator processes batches in order**:

```javascript
// Coordinator (single-threaded, fast)
const masterLEGOs = new Map(); // targetText → {id, seed_id, type, components}
let cumulativeLEGOs = 0;

// Process batch_01
for (seed of batch01.seeds) {
  for (lego of seed.legos) {
    const key = lego.target.toLowerCase();

    if (!masterLEGOs.has(key)) {
      // First occurrence - assign final ID
      lego.id = `S${seed.seed_id}L${String(++legoCounter).padStart(2, '0')}`;
      lego.new = true;
      masterLEGOs.set(key, {id: lego.id, seed_id: seed.seed_id});
      cumulativeLEGOs++;
    } else {
      // Duplicate - mark as reference
      const original = masterLEGOs.get(key);
      lego.id = original.id;
      lego.new = false;
      lego.ref = original.seed_id;
    }
  }
}

// Process batch_02 (now knows batch_01's LEGOs)
for (seed of batch02.seeds) {
  for (lego of seed.legos) {
    const key = lego.target.toLowerCase();

    if (!masterLEGOs.has(key)) {
      // New LEGO
      lego.id = `S${seed.seed_id}L${String(++legoCounter).padStart(2, '0')}`;
      lego.new = true;
      masterLEGOs.set(key, {id: lego.id, seed_id: seed.seed_id});
      cumulativeLEGOs++;
    } else {
      // References earlier batch
      const original = masterLEGOs.get(key);
      lego.id = original.id;
      lego.new = false;
      lego.ref = original.seed_id;
    }
  }
}

// Repeat for batch_03, batch_04, etc.
```

**Output**: `lego_pairs_final.json` with proper IDs and references

### Phase 3: Pattern Identification (Optional Parallel)

**After merge, pattern analysis can be parallel again**:

```
Agent A: Analyze P01 instances (Quiero + infinitive) across all seeds
Agent B: Analyze P02 instances (Estoy + gerund) across all seeds
Agent C: Analyze P03 instances (Voy a + infinitive) across all seeds
```

---

## Detailed Workflow

### Step 1: Prepare Seed Batches

```bash
# Split 100 seeds into 10 batches of 10
scripts/prepare_batches.sh spa_for_eng 100 10

# Outputs:
# - batch_input/seeds_001_010.json  (S0001-S0010)
# - batch_input/seeds_011_020.json  (S0011-S0020)
# - ...
# - batch_input/seeds_091_100.json  (S0091-S0100)
```

### Step 2: Launch Parallel Agents

**Agent Task Template**:
```markdown
# Task: Extract LEGOs from Seeds S00XX-S00YY

## Input
- Seed batch file: `batch_input/seeds_0XX_0YY.json`
- Phase 3 intelligence: Extract FD chunks, classify A/M, componentize

## Instructions
1. Read your seed batch (10 seeds)
2. For each seed:
   - Bidirectional sweep (forward + backward)
   - Extract FD chunks (IF IN DOUBT → CHUNK UP)
   - Classify Atomic (A) or Molecular (M)
   - For M-type: componentize ALL WORDS
   - Mark ALL LEGOs as "new": true (coordinator will fix)
3. Output: `batch_output/batch_0X_provisional.json`

## IMPORTANT
- Treat ALL LEGOs as new (don't worry about duplicates)
- Don't reference other batches (you can't see them)
- Focus on quality FD extraction
- Ensure complete tiling (all words accounted for)

## Output Format
```json
{
  "batch_id": "001_010",
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
      "legos": [
        {"provisional_id": "PROV_001", "type": "A", "target": "quiero", "known": "I want", "new": true},
        {"provisional_id": "PROV_002", "type": "A", "target": "hablar", "known": "to speak", "new": true},
        ...
      ]
    },
    ...
  ]
}
```
```

**Launch 10 agents in parallel**:
```bash
# Pseudo-code for launching agents
for i in {1..10}; do
  launch_agent "Extract LEGOs batch $i" --input batch_input/seeds_$(printf "%03d_%03d" $((i*10-9)) $((i*10))).json --output batch_output/batch_$(printf "%02d" $i)_provisional.json &
done
wait
```

### Step 3: Sequential Merge

```bash
# Single-threaded coordinator merges batches in order
node scripts/phase3_merge_batches.cjs

# Reads:
# - batch_output/batch_01_provisional.json
# - batch_output/batch_02_provisional.json
# - ...
# - batch_output/batch_10_provisional.json

# Outputs:
# - lego_pairs.json (final, with proper IDs and references)
```

**Merge script**:
```javascript
// scripts/phase3_merge_batches.cjs
const masterLEGOs = new Map();
const finalSeeds = [];
let cumulativeLEGOs = 0;

// Process batches in order
for (let batchNum = 1; batchNum <= 10; batchNum++) {
  const batch = loadBatch(batchNum);

  for (const seed of batch.seeds) {
    const processedSeed = {
      seed_id: seed.seed_id,
      seed_pair: seed.seed_pair,
      legos: [],
      patterns: [],
      cumulative_legos: 0
    };

    for (const lego of seed.legos) {
      const key = lego.target.toLowerCase();

      if (masterLEGOs.has(key)) {
        // Duplicate - mark as reference
        const original = masterLEGOs.get(key);
        processedSeed.legos.push({
          id: original.id,
          type: lego.type,
          target: lego.target,
          known: lego.known,
          ref: original.seed_id,
          ...(lego.components && {components: lego.components})
        });
      } else {
        // New LEGO
        const legoId = generateLegoId(seed.seed_id, ++cumulativeLEGOs);
        processedSeed.legos.push({
          id: legoId,
          type: lego.type,
          target: lego.target,
          known: lego.known,
          new: true,
          ...(lego.components && {components: lego.components})
        });

        masterLEGOs.set(key, {id: legoId, seed_id: seed.seed_id});
      }
    }

    processedSeed.cumulative_legos = cumulativeLEGOs;
    finalSeeds.push(processedSeed);
  }
}

// Output final file
saveFinalLegoPairs(finalSeeds);
```

---

## Performance Analysis

### Time Comparison

**Sequential (current approach)**:
```
Agent extracts S0001: 2 min
Agent extracts S0002: 2 min  (waits for S0001)
Agent extracts S0003: 2 min  (waits for S0002)
...
Total for 100 seeds: 200 minutes (3.3 hours)
```

**Parallel (hybrid approach)**:
```
10 Agents extract S0001-S0100 in parallel: 20 min (10 seeds × 2 min each, parallel)
Coordinator merges batches sequentially: 5 min
Total: 25 minutes
```

**Speedup**: ~8x faster (200 min → 25 min)

### Bottlenecks

1. **Extraction time** (parallelized): 20 min
2. **Merge time** (sequential, but fast): 5 min
3. **Agent coordination overhead**: ~2 min

**Total wall-clock**: ~27 minutes for 100 seeds

---

## Quality Control

### Agent Output Validation

**Before merge, validate each batch**:
```bash
# Automated checks per batch
for batch in batch_output/*.json; do
  node scripts/validate_batch.cjs $batch
done

# Checks:
# - JSON validity
# - All seeds present
# - FD compliance (manual spot-check)
# - Complete tiling (all words accounted for)
# - Component structure for M-type LEGOs
```

### Post-Merge Validation

```bash
# Validate final lego_pairs.json
node scripts/validate_lego_pairs.cjs

# Checks:
# - All seeds reconstructible from LEGOs
# - No duplicate LEGO IDs
# - Cumulative counts correct
# - References point to earlier seeds
# - First occurrence of each LEGO marked "new": true
```

---

## Alternative Approaches Considered

### ❌ Approach 1: Fully Independent (No Merge)

**Idea**: Each agent extracts independently, coordinator just concatenates

**Problem**:
- Massive duplication ("quiero" appears in 50 seeds)
- No shared LEGO registry
- Cannot mark references
- Fails Complete Tiling requirement

**Verdict**: REJECTED

### ❌ Approach 2: Real-Time Shared Registry

**Idea**: Agents share a live database, update in real-time

**Problems**:
- Complex coordination (race conditions, locks)
- Agents block waiting for database updates
- Network latency
- Defeats parallelization benefits

**Verdict**: REJECTED (too complex)

### ✅ Approach 3: Hybrid (Chosen)

**Why it works**:
- Agents work independently (fast)
- Merge is sequential but FAST (just ID assignment)
- No coordination during extraction
- Clean separation of concerns

**Trade-off**: Small sequential bottleneck (5 min merge) worth the 8x speedup

---

## Implementation Checklist

### Scripts to Create

- [ ] `scripts/prepare_batches.sh` - Split seeds into batches
- [ ] `scripts/phase3_agent_task.md` - Agent task template
- [ ] `scripts/phase3_merge_batches.cjs` - Merge coordinator
- [ ] `scripts/validate_batch.cjs` - Batch validation
- [ ] `scripts/validate_lego_pairs.cjs` - Final validation

### Test Run

- [ ] Test with S0001-S0020 (2 batches of 10)
- [ ] Compare against existing lego_pairs.json
- [ ] Verify quality matches or exceeds
- [ ] Measure timing (should be ~4 min for 20 seeds)

### Production Run

- [ ] Run on S0001-S0100 (10 batches of 10)
- [ ] Validate output
- [ ] Compare against manual extraction
- [ ] Document any quality issues

---

## Next Steps

1. **Create batch preparation script**
2. **Write agent task template** (detailed, with examples)
3. **Implement merge coordinator**
4. **Test on S0001-S0020** (known-good reference)
5. **If successful, scale to S0001-S0100**
6. **Lessons learned → Chinese course** (S0001-S0100)

---

## Success Criteria

**Phase 3 parallelization succeeds if**:
- ✅ 8x faster than sequential (25 min vs 200 min for 100 seeds)
- ✅ 100% of seeds reconstructible from LEGOs
- ✅ FD compliance maintained
- ✅ Component quality matches manual extraction
- ✅ References correctly marked
- ✅ Cumulative counts accurate

**If achieved**: Apply same approach to 668-seed full course (60 min vs 8+ hours)
