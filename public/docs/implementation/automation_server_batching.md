# Automation Server Batching Implementation Guide

**Version**: 1.0 (2025-10-27)
**Status**: Implementation reference for batch processing + validation pattern

---

## Overview

This document provides implementation details for integrating batch processing and validation phases into the automation server.

**Key concepts**:
- **Batch size**: 20 seeds per batch (~50-70 LEGOs)
- **Fresh sessions**: Each batch gets new Claude Code session
- **Validation loops**: Generate → Validate → Pass/Retry
- **Prompt caching**: Intelligence cached after first batch

---

## Architecture Integration

### Phase Flow

```
Phase 1: Translation (Batched)
├─ Generate batch 1 (seeds 1-20)
├─ Validate batch 1 (Phase 1.5)
├─ If pass: Merge → Continue to batch 2
└─ If fail: Retry with error context → Validate again

Phase 3: LEGO Decomposition (Batched)
├─ Generate batch 1 (seeds 1-20, ~50-70 LEGOs)
├─ Validate batch 1 (Phase 3.5)
├─ If pass: Merge → Continue to batch 2
└─ If fail: Retry with error context → Validate again

Phase 5: Basket Generation (Batched)
├─ Generate batch 1 (~50-70 baskets from Phase 3 batch 1)
├─ Validate batch 1 (Phase 5.5)
├─ If pass: Merge → Continue to batch 2
└─ If fail: Retry with error context → Validate again
```

---

## Implementation: Automation Server Changes

### 1. Core Batch Generation Function

```javascript
// automation_server.cjs

const { validatePhase1 } = require('./validators/validate-phase1.5-translations.cjs');
const { validatePhase3 } = require('./validators/validate-phase3.5-legos.cjs');
const { validatePhase5 } = require('./validators/validate-phase5.5-baskets.cjs');

/**
 * Generate Phase with batching and validation
 */
async function generatePhaseWithBatching({
  phase,
  courseCode,
  totalSeeds = 668,
  batchSize = 20,
  validator,
  maxAttempts = 3
}) {
  const totalBatches = Math.ceil(totalSeeds / batchSize);

  console.log(`\n📦 Starting Phase ${phase}: ${totalSeeds} seeds in ${totalBatches} batches`);

  for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
    const batchStart = (batchNum - 1) * batchSize + 1;
    const batchEnd = Math.min(batchNum * batchSize, totalSeeds);
    const batchSeeds = batchEnd - batchStart + 1;

    console.log(`\n📦 Processing Batch ${batchNum}/${totalBatches} (Seeds ${batchStart}-${batchEnd})`);

    let batchValid = false;
    let attempts = 0;

    while (!batchValid && attempts < maxAttempts) {
      attempts++;

      // Generate batch (fresh Claude Code session)
      console.log(`  Attempt ${attempts}/${maxAttempts}: Spawning fresh agent...`);
      await spawnBatchAgent({
        phase: phase,
        batchNum: batchNum,
        batchStart: batchStart,
        batchEnd: batchEnd,
        courseCode: courseCode
      });

      // Wait for batch output
      console.log(`  Waiting for batch ${batchNum} output...`);
      await waitForBatchCompletion(courseCode, phase, batchNum);

      // Validate batch
      console.log(`  Validating batch ${batchNum}...`);
      const validation = await validator(
        `vfs/courses/${courseCode}`,
        batchNum
      );

      if (validation.valid) {
        batchValid = true;
        console.log(`  ✅ Batch ${batchNum} validation passed`);
        console.log(`     Seeds: ${validation.stats.passedSeeds}/${validation.stats.totalSeeds} passed`);

        // Merge batch into main file
        await mergeBatch(courseCode, phase, batchNum);
        console.log(`  ✅ Batch ${batchNum} merged into phase ${phase} output`);

        // Clean up batch file
        await fs.remove(`vfs/courses/${courseCode}/phase${phase}_batch_${batchNum}.json`);

      } else {
        console.log(`  ❌ Batch ${batchNum} validation failed (attempt ${attempts}/${maxAttempts})`);
        console.log(`     Errors: ${validation.errors.length}`);
        console.log(`     Failed items: ${validation.failedSeeds?.length || validation.failedLegos?.length}`);

        if (attempts < maxAttempts) {
          console.log(`  Retrying batch ${batchNum} with error feedback...`);
          // Error context will be passed to retry (implementation below)
        }
      }
    }

    if (!batchValid) {
      throw new Error(`Batch ${batchNum} failed after ${maxAttempts} attempts`);
    }
  }

  console.log(`\n✅ Phase ${phase} complete: All ${totalBatches} batches processed successfully`);
}
```

### 2. Batch Agent Spawning

```javascript
/**
 * Spawn fresh Claude Code session for batch
 */
async function spawnBatchAgent({ phase, batchNum, batchStart, batchEnd, courseCode }) {
  // Load phase intelligence
  const phaseIntelligence = await fs.readFile(
    `docs/phase_intelligence/phase_${phase}_*.md`,
    'utf-8'
  );

  // Load batch input data
  let batchInput;
  if (phase === 1) {
    // Fetch canonical seeds for this batch
    batchInput = await fetchCanonicalSeeds(batchStart, batchEnd);
  } else if (phase === 3) {
    // Load seed_pairs from Phase 1 for this batch
    const allSeedPairs = await fs.readJson(`vfs/courses/${courseCode}/seed_pairs.json`);
    batchInput = Object.fromEntries(
      Object.entries(allSeedPairs).slice(batchStart - 1, batchEnd)
    );
  } else if (phase === 5) {
    // Load lego_pairs from Phase 3 for this batch
    const allLegoPairs = await fs.readJson(`vfs/courses/${courseCode}/lego_pairs.json`);
    batchInput = allLegoPairs.slice(batchStart - 1, batchEnd);
  }

  // Build prompt
  const prompt = `
# Phase ${phase} - Batch ${batchNum} Processing

## Batch Context

You are processing **Batch ${batchNum}** of a larger course generation.

**Batch scope**: Seeds ${batchStart}-${batchEnd} (${batchEnd - batchStart + 1} seeds)
**Output file**: vfs/courses/${courseCode}/phase${phase}_batch_${batchNum}.json

## CRITICAL: Fresh Intelligence

This is a FRESH session. Do NOT rely on memory from other batches.

**Before starting, carefully read the FULL Phase ${phase} intelligence below.**

---

${phaseIntelligence}

---

## Input: Batch Data

${JSON.stringify(batchInput, null, 2)}

## Task

Process seeds ${batchStart}-${batchEnd} following the Phase ${phase} intelligence above.

Output format: ${getOutputFormatDescription(phase)}
Save to: vfs/courses/${courseCode}/phase${phase}_batch_${batchNum}.json

## Quality Reminder

- Treat this batch as ISOLATED
- Follow the intelligence methodically
- Use Extended Thinking for every item
- Self-check before outputting

Begin processing batch ${batchNum} now.
`;

  // Spawn iTerm2 session
  await spawnITermSession({
    courseDir: `vfs/courses/${courseCode}`,
    prompt: prompt,
    sessionName: `Phase${phase}_Batch${batchNum}`
  });
}

function getOutputFormatDescription(phase) {
  const formats = {
    1: 'JSON object with seed_id keys and [target, known] pairs',
    3: 'JSON array of [seedId, seedPair, legos] tuples',
    5: 'JSON object with lego_id keys and basket objects'
  };
  return formats[phase] || 'JSON';
}
```

### 3. Batch Validation Wrappers

```javascript
/**
 * Validate Phase 1 batch
 */
async function validatePhase1Batch(courseDir, batchNum) {
  const batchFile = path.join(courseDir, `phase1_batch_${batchNum}.json`);

  if (!await fs.pathExists(batchFile)) {
    return {
      valid: false,
      errors: [{ type: 'missing_output', message: `Batch ${batchNum} output file not found` }]
    };
  }

  // Run validator on batch file
  // (Validator reads from seed_pairs.json or can be adapted to read batch file)
  const validation = await validatePhase1(courseDir);

  return validation;
}

/**
 * Validate Phase 3 batch
 */
async function validatePhase3Batch(courseDir, batchNum) {
  const batchFile = path.join(courseDir, `phase3_batch_${batchNum}.json`);

  if (!await fs.pathExists(batchFile)) {
    return {
      valid: false,
      errors: [{ type: 'missing_output', message: `Batch ${batchNum} output file not found` }]
    };
  }

  const validation = await validatePhase3(courseDir);

  return validation;
}

/**
 * Validate Phase 5 batch
 */
async function validatePhase5Batch(courseDir, batchNum) {
  const batchFile = path.join(courseDir, `phase5_batch_${batchNum}.json`);

  if (!await fs.pathExists(batchFile)) {
    return {
      valid: false,
      errors: [{ type: 'missing_output', message: `Batch ${batchNum} output file not found` }]
    };
  }

  const validation = await validatePhase5(courseDir);

  return validation;
}
```

### 4. Batch Merging

```javascript
/**
 * Merge validated batch into main output file
 */
async function mergeBatch(courseCode, phase, batchNum) {
  const courseDir = `vfs/courses/${courseCode}`;
  const batchFile = path.join(courseDir, `phase${phase}_batch_${batchNum}.json`);
  const mainFile = path.join(courseDir, getMainOutputFile(phase));

  const batchData = await fs.readJson(batchFile);

  let mainData;
  if (await fs.pathExists(mainFile)) {
    mainData = await fs.readJson(mainFile);
  } else {
    mainData = phase === 1 ? {} : (phase === 5 ? {} : []);
  }

  // Merge strategy depends on phase
  if (phase === 1 || phase === 5) {
    // Object merge
    Object.assign(mainData, batchData);
  } else if (phase === 3) {
    // Array merge
    mainData.push(...batchData);
  }

  // Write updated main file
  await fs.writeJson(mainFile, mainData, { spaces: 2 });

  console.log(`Merged batch ${batchNum}: ${getBatchItemCount(phase, batchData)} items`);
}

function getMainOutputFile(phase) {
  const files = {
    1: 'seed_pairs.json',
    3: 'lego_pairs.json',
    5: 'lego_baskets.json'
  };
  return files[phase];
}

function getBatchItemCount(phase, batchData) {
  if (phase === 1 || phase === 5) {
    return Object.keys(batchData).length;
  } else if (phase === 3) {
    return batchData.length;
  }
  return 0;
}
```

### 5. Wait for Batch Completion

```javascript
/**
 * Wait for batch output file to appear
 */
async function waitForBatchCompletion(courseCode, phase, batchNum, timeoutMs = 600000) {
  const courseDir = `vfs/courses/${courseCode}`;
  const batchFile = path.join(courseDir, `phase${phase}_batch_${batchNum}.json`);

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await fs.pathExists(batchFile)) {
      // File exists - wait a bit more to ensure write is complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    }

    // Check every 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error(`Batch ${batchNum} output not received after ${timeoutMs / 1000}s`);
}
```

### 6. Main Course Generation

```javascript
/**
 * Generate complete course with batching + validation
 */
async function generateCourse(courseCode, totalSeeds = 668) {
  console.log(`\n🚀 Starting course generation: ${courseCode}`);
  console.log(`Total seeds: ${totalSeeds}`);

  // Phase 1: Translation (batched)
  await generatePhaseWithBatching({
    phase: 1,
    courseCode: courseCode,
    totalSeeds: totalSeeds,
    batchSize: 20,
    validator: validatePhase1Batch
  });

  // Phase 3: LEGO Decomposition (batched)
  await generatePhaseWithBatching({
    phase: 3,
    courseCode: courseCode,
    totalSeeds: totalSeeds,
    batchSize: 20,
    validator: validatePhase3Batch
  });

  // Phase 5: Basket Generation (batched by LEGOs, not seeds)
  // Count total LEGOs from Phase 3
  const legoPairs = await fs.readJson(`vfs/courses/${courseCode}/lego_pairs.json`);
  let totalLegos = 0;
  for (const seed of legoPairs) {
    totalLegos += seed[2].length; // seed[2] is the LEGOs array
  }

  await generatePhaseWithBatching({
    phase: 5,
    courseCode: courseCode,
    totalSeeds: totalLegos, // Actually total LEGOs
    batchSize: 60, // ~60 LEGOs per batch (from ~20 seeds)
    validator: validatePhase5Batch
  });

  console.log(`\n✅ Course generation complete: ${courseCode}`);
  console.log(`📄 Output files:`);
  console.log(`   - vfs/courses/${courseCode}/seed_pairs.json`);
  console.log(`   - vfs/courses/${courseCode}/lego_pairs.json`);
  console.log(`   - vfs/courses/${courseCode}/lego_baskets.json`);
}
```

---

## Testing Strategy

### 1. Small Course (20 seeds)

```bash
# Test with 1 batch
node automation_server.cjs spa_for_eng_20seeds

# Verify:
# - Fresh intelligence loaded
# - Validation passes
# - Merge works
```

### 2. Medium Course (100 seeds)

```bash
# Test with 5 batches
node automation_server.cjs spa_for_eng_100seeds

# Verify:
# - Batch boundaries correct
# - Quality consistent across batches
# - Error recovery works
# - Progress tracking accurate
```

### 3. Full Course (668 seeds)

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

## Monitoring & Progress Tracking

### Progress Dashboard

```javascript
/**
 * Track progress across all batches
 */
class ProgressTracker {
  constructor(totalSeeds, batchSize) {
    this.totalSeeds = totalSeeds;
    this.batchSize = batchSize;
    this.totalBatches = Math.ceil(totalSeeds / batchSize);
    this.completedBatches = 0;
    this.failedBatches = 0;
    this.startTime = Date.now();
  }

  logBatchComplete(batchNum) {
    this.completedBatches++;
    const percentComplete = (this.completedBatches / this.totalBatches * 100).toFixed(1);
    const elapsed = (Date.now() - this.startTime) / 1000 / 60; // minutes
    const estimated = (elapsed / this.completedBatches) * this.totalBatches;
    const remaining = estimated - elapsed;

    console.log(`\n📊 Progress: ${this.completedBatches}/${this.totalBatches} batches (${percentComplete}%)`);
    console.log(`   Elapsed: ${elapsed.toFixed(0)}min | Estimated total: ${estimated.toFixed(0)}min | Remaining: ${remaining.toFixed(0)}min`);
  }

  logBatchFailed(batchNum, attempt) {
    this.failedBatches++;
    console.log(`❌ Batch ${batchNum} failed (attempt ${attempt})`);
  }
}
```

---

## Error Handling & Recovery

### Retry with Error Context

```javascript
/**
 * Build retry prompt with error feedback
 */
function buildRetryPrompt(phase, batchNum, validation) {
  const failedItems = validation.failedSeeds || validation.failedLegos || [];

  return `
# Phase ${phase} - Batch ${batchNum} RETRY

Your previous attempt had validation errors. Please regenerate ONLY the failed items.

## What Went Wrong

${validation.errors.map((error, i) => `
### Error ${i + 1}: ${error.type}
- Item: ${error.seedId || error.legoId}
- Message: ${error.message}
${error.suggestion ? `- Suggestion: ${error.suggestion}` : ''}
`).join('\n')}

## Failed Items to Regenerate

${failedItems.join(', ')}

## Phase Intelligence

[Phase intelligence loaded here...]

## Task

Regenerate ONLY the failed items listed above.
Apply the error feedback to avoid the same mistakes.
`;
}
```

---

## Version History

**v1.0 (2025-10-27)**:
- Initial implementation guide
- Core batch generation function
- Validation integration
- Batch merging strategy
- Progress tracking
- Error handling & retry logic

---

**End of Automation Server Batching Implementation Guide**
