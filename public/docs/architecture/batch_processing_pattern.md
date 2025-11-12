# Batch Processing Architecture

**Version**: 1.0 (2025-10-27)
**Status**: Core pattern for preventing agent drift across large datasets

---

## The Problem: Agent Drift

**Observed behavior**: When processing 668 seeds in one session:
- Seeds 1-100: Follows phase intelligence carefully ✓
- Seeds 200-400: Relying on memory, taking shortcuts
- Seeds 500-668: Significant drift from original intelligence ❌

**Result**: Inconsistent output quality across course

**Root cause**: Agent stops actively referring to intelligence, relies on established patterns in context

---

## The Solution: Fresh Sessions Per Batch

### Batch Size: 20 Seeds

**Why 20?**
- Each seed decomposes to ~3-4 LEGOs on average
- 20 seeds = **~50-70 LEGO_PAIRS per batch**
- 50-70 LEGOs = **~50-70 LEGO_BASKETS per batch**
- Manageable batch size for focused quality
- Frequent re-grounding in phase intelligence
- Not too many batches (668 seeds / 20 = 34 batches)

### Architecture Pattern

```
Course: 668 seeds (ita_for_eng_full)

┌─────────────────────────────────────────┐
│ Batch 1: Seeds 1-20                     │
│ - Fresh Claude Code session             │
│ - Load Phase intelligence (fresh)       │
│ - Generate ~50-70 LEGOs                 │
│ - Output: lego_pairs_batch_1.json       │
│ - Validate batch 1                      │
│ - If pass: Merge into lego_pairs.json   │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ Batch 2: Seeds 21-40                    │
│ - NEW Fresh Claude Code session         │
│ - Load Phase intelligence (fresh) ← KEY │
│ - Generate ~50-70 LEGOs                 │
│ - Output: lego_pairs_batch_2.json       │
│ - Validate batch 2                      │
│ - If pass: Merge into lego_pairs.json   │
└─────────────────────────────────────────┘
           ↓
         ...
           ↓
┌─────────────────────────────────────────┐
│ Batch 34: Seeds 661-668                 │
│ - NEW Fresh Claude Code session         │
│ - Load Phase intelligence (fresh)       │
│ - Generate ~40 LEGOs (8 seeds)          │
│ - Output: lego_pairs_batch_34.json      │
│ - Validate batch 34                     │
│ - If pass: Merge into lego_pairs.json   │
└─────────────────────────────────────────┘
           ↓
    Final Output: lego_pairs.json (all 668 seeds, ~2300 LEGOs)
```

---

## Implementation: Option A (Separate Processes)

**Strongest approach**: Completely fresh Claude Code session per batch

### Automation Server Logic

```javascript
async function generatePhase3(courseCode, totalSeeds = 668) {
  const BATCH_SIZE = 20;
  const totalBatches = Math.ceil(totalSeeds / BATCH_SIZE);

  console.log(`Starting Phase 3: ${totalSeeds} seeds in ${totalBatches} batches`);

  // Load all canonical seeds
  const allSeeds = await fetchCanonicalSeeds(totalSeeds);

  // Load seed pairs from Phase 1
  const seedPairs = await fs.readJson(`vfs/courses/${courseCode}/seed_pairs.json`);

  for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
    const batchStart = (batchNum - 1) * BATCH_SIZE + 1;
    const batchEnd = Math.min(batchNum * BATCH_SIZE, totalSeeds);
    const batchSeeds = allSeeds.slice(batchStart - 1, batchEnd);

    console.log(`\n📦 Processing Batch ${batchNum}/${totalBatches} (Seeds ${batchStart}-${batchEnd})`);

    // Generate batch (fresh session)
    let batchValid = false;
    let attempts = 0;

    while (!batchValid && attempts < 3) {
      attempts++;

      // Spawn FRESH Claude Code session
      await spawnBatchAgent({
        phase: 3,
        batchNum: batchNum,
        batchStart: batchStart,
        batchEnd: batchEnd,
        seeds: batchSeeds,
        seedPairs: seedPairs.slice(batchStart - 1, batchEnd),
        courseCode: courseCode
      });

      // Wait for batch output
      await waitForBatchCompletion(courseCode, 3, batchNum);

      // Validate batch (Phase 3.5)
      const validation = await validatePhase3Batch(courseCode, batchNum);

      if (validation.valid) {
        batchValid = true;
        console.log(`✅ Batch ${batchNum} validation passed`);

        // Merge batch into main file
        await mergeBatch(courseCode, 3, batchNum);
        console.log(`✅ Batch ${batchNum} merged into lego_pairs.json`);

        // Clean up batch file
        await fs.remove(`vfs/courses/${courseCode}/lego_pairs_batch_${batchNum}.json`);

      } else {
        console.log(`❌ Batch ${batchNum} validation failed (attempt ${attempts}/3)`);
        console.log(`Errors: ${validation.errors.length} failed seeds: ${validation.failedSeeds.length}`);

        if (attempts < 3) {
          // Retry with error context
          console.log(`Retrying batch ${batchNum} with error feedback...`);
        }
      }
    }

    if (!batchValid) {
      throw new Error(`Batch ${batchNum} failed after 3 attempts`);
    }
  }

  console.log(`\n✅ Phase 3 complete: All ${totalBatches} batches processed successfully`);
  console.log(`📄 Output: vfs/courses/${courseCode}/lego_pairs.json`);
}
```

### Batch Agent Prompt

```javascript
async function spawnBatchAgent({ phase, batchNum, batchStart, batchEnd, seeds, seedPairs, courseCode }) {
  const phaseIntelligence = await fetchPhaseIntelligence(phase);

  const prompt = `
# Phase ${phase} - Batch ${batchNum} Processing

## Batch Context

You are processing **Batch ${batchNum}** of a larger course generation.

**Batch scope**: Seeds ${batchStart}-${batchEnd} (${seeds.length} seeds)
**Output file**: vfs/courses/${courseCode}/lego_pairs_batch_${batchNum}.json

## CRITICAL: Fresh Intelligence

This is a FRESH session. Do NOT rely on memory from other batches.

**Before starting, carefully read the FULL Phase ${phase} intelligence below.**

---

${phaseIntelligence}

---

## Input: Seed Pairs for This Batch

${JSON.stringify(seedPairs, null, 2)}

## Task

Process seeds ${batchStart}-${batchEnd} following the Phase ${phase} intelligence above.

Output format: lego_pairs array
Save to: vfs/courses/${courseCode}/lego_pairs_batch_${batchNum}.json

## Quality Reminder

- Treat this batch as ISOLATED - each seed decomposes independently
- Follow TILING FIRST principle - LEGOs must reconstruct seed exactly
- Apply FD test to every LEGO
- Use LITERAL component translations
- Check hard rules before outputting

Begin processing batch ${batchNum} now.
`;

  // Spawn iTerm2 session (same mechanism as existing spawnPhaseAgent)
  await spawnITermSession({
    courseDir: `vfs/courses/${courseCode}`,
    prompt: prompt,
    sessionName: `Phase${phase}_Batch${batchNum}`
  });
}
```

### Batch Validation

```javascript
async function validatePhase3Batch(courseCode, batchNum) {
  const batchFile = `vfs/courses/${courseCode}/lego_pairs_batch_${batchNum}.json`;

  if (!await fs.pathExists(batchFile)) {
    return {
      valid: false,
      errors: [{ type: 'missing_output', message: `Batch ${batchNum} output file not found` }]
    };
  }

  const batchData = await fs.readJson(batchFile);

  // Run Phase 3.5 validator on this batch
  const validation = await validatePhase3(batchData);

  return {
    valid: validation.valid,
    errors: validation.errors,
    failedSeeds: validation.failedSeeds,
    stats: {
      batchNum: batchNum,
      totalSeeds: batchData.length,
      totalLegos: validation.stats.totalLegos,
      passedSeeds: validation.stats.passedSeeds,
      failedSeeds: validation.stats.failedSeeds
    }
  };
}
```

### Batch Merging

```javascript
async function mergeBatch(courseCode, phase, batchNum) {
  const courseDir = `vfs/courses/${courseCode}`;
  const batchFile = path.join(courseDir, `lego_pairs_batch_${batchNum}.json`);
  const mainFile = path.join(courseDir, 'lego_pairs.json');

  const batchData = await fs.readJson(batchFile);

  let mainData = [];
  if (await fs.pathExists(mainFile)) {
    mainData = await fs.readJson(mainFile);
  }

  // Append batch data
  mainData.push(...batchData);

  // Write updated main file
  await fs.writeJson(mainFile, mainData, { spaces: 2 });

  console.log(`Merged batch ${batchNum}: ${batchData.length} seeds, ${countLegos(batchData)} LEGOs`);
}

function countLegos(seedData) {
  let total = 0;
  for (const seed of seedData) {
    total += seed[2].length; // seed[2] is the LEGOs array
  }
  return total;
}
```

---

## Benefits

### 1. No Agent Drift
- Fresh intelligence every 20 seeds
- Seed 660 has same quality as Seed 5
- Consistent application of rules throughout

### 2. Granular Error Detection
- Errors caught per batch (20 seeds)
- Not after entire course (668 seeds)
- Faster feedback loop

### 3. Efficient Recovery
- Batch 15 fails? Retry only batch 15
- Batches 1-14 and 16-34 unaffected
- Don't regenerate entire course

### 4. Progress Visibility
```
📦 Batch 1/34 complete ✅ (20 seeds, 58 LEGOs)
📦 Batch 2/34 complete ✅ (20 seeds, 61 LEGOs)
📦 Batch 3/34 complete ✅ (20 seeds, 55 LEGOs)
...
```

### 5. Prompt Caching Economics

**With Claude prompt caching:**
- Batch 1: Full intelligence tokens (~30KB)
- Batches 2-34: Intelligence cached, ~90% discount

**Cost impact**: Minimal (intelligence cached after first batch)

**Quality impact**: Massive (no drift, consistent output)

---

## Applying to All Phases

### Phase 1: Translation (Batching)
- Batch size: 20 seeds
- Output: seed_pairs_batch_N.json
- Validate each batch (Phase 1.5)
- Merge into seed_pairs.json

### Phase 3: LEGO Decomposition (Batching)
- Batch size: 20 seeds → ~50-70 LEGOs per batch
- Output: lego_pairs_batch_N.json
- Validate each batch (Phase 3.5)
- Merge into lego_pairs.json

### Phase 5: Basket Generation (Batching)
- Batch size: 50-70 LEGOs (corresponds to 20-seed batch from Phase 3)
- Output: lego_baskets_batch_N.json
- Validate each batch (Phase 5.5)
- Merge into lego_baskets.json

**Key**: Batch boundaries align across phases
- Seeds 1-20 → LEGOs from batch 1 → Baskets from batch 1
- Seeds 21-40 → LEGOs from batch 2 → Baskets from batch 2

---

## Example: 668-Seed Course Timeline

```
Course: ita_for_eng_full (668 seeds)

Phase 1: Translation
├─ Batch 1 (1-20)     ✅ 2 min
├─ Batch 2 (21-40)    ✅ 2 min
├─ ...
└─ Batch 34 (661-668) ✅ 2 min
Total: ~70 minutes

Phase 3: LEGO Decomposition
├─ Batch 1 (1-20, ~58 LEGOs)    ✅ 3 min
├─ Batch 2 (21-40, ~61 LEGOs)   ✅ 3 min
├─ ...
└─ Batch 34 (661-668, ~40 LEGOs) ✅ 3 min
Total: ~100 minutes

Phase 5: Basket Generation
├─ Batch 1 (~58 baskets)  ✅ 15 min
├─ Batch 2 (~61 baskets)  ✅ 15 min
├─ ...
└─ Batch 34 (~40 baskets) ✅ 15 min
Total: ~500 minutes (8 hours)

**Total Course Generation: ~10-12 hours**
(vs unreliable 6 hours with drift)
```

---

## Monitoring & Observability

### Batch Progress Dashboard

```javascript
// Real-time progress tracking
{
  "course": "ita_for_eng_full",
  "totalSeeds": 668,
  "totalBatches": 34,
  "currentPhase": 3,
  "currentBatch": 15,
  "status": "processing",
  "progress": {
    "phase1": { "completed": 34, "failed": 0, "duration": "68min" },
    "phase3": { "completed": 14, "failed": 0, "inProgress": 15, "duration": "45min" },
    "phase5": { "completed": 0, "failed": 0, "pending": 34 }
  },
  "estimatedCompletion": "2025-10-27T22:30:00Z"
}
```

### Error Tracking

```javascript
// Errors per batch
{
  "batch": 15,
  "phase": 3,
  "status": "failed",
  "attempts": 2,
  "errors": [
    {
      "seedId": "S0285",
      "type": "tiling_failure",
      "message": "Missing LEGO: 'parlare'"
    }
  ],
  "retryScheduled": true
}
```

---

## Testing Strategy

### 1. Small Course Test (20 seeds)
```bash
# Test with 1 batch
node automation_server.cjs spa_for_eng_20seeds

# Verify:
# - Fresh intelligence loaded
# - Tiling correct
# - Validation passes
# - Merge works
```

### 2. Medium Course Test (100 seeds)
```bash
# Test with 5 batches
node automation_server.cjs spa_for_eng_100seeds

# Verify:
# - Batch boundaries correct
# - Quality consistent across batches
# - Error recovery works
# - Progress tracking accurate
```

### 3. Full Course Test (668 seeds)
```bash
# Production test with 34 batches
node automation_server.cjs ita_for_eng_full

# Verify:
# - No drift at seed 660
# - All validations pass
# - Complete in ~10 hours
# - Final output quality excellent
```

---

## Version History

**v1.0 (2025-10-27)**:
- Initial batch processing architecture
- Defined 20-seed batch size (~50-70 LEGOs)
- Documented fresh session per batch pattern
- Implementation details for automation server
- Benefits analysis and cost considerations
- Monitoring and testing strategy

---

**End of Batch Processing Architecture**
