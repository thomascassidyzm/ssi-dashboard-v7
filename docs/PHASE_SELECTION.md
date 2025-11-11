# Phase Selection Configuration

**Version**: 1.0 (2025-11-11)
**Purpose**: Run specific phases of the orchestrator workflow

---

## 🎯 Overview

The orchestrator workflow now supports running specific phases instead of the full pipeline. This allows you to:
- Generate only seed pairs (Phase 1)
- Extract LEGOs without generating baskets (Phases 1-3)
- Resume from a specific phase if previous phases are complete
- Test individual phases during development

---

## 📋 Configuration

Add `startPhase` and `endPhase` parameters to your job configuration:

```javascript
{
  target: "spa",
  known: "eng",
  seeds: 100,
  startSeed: 1,
  endSeed: 100,
  startPhase: 1,  // Begin at this phase
  endPhase: 3     // Stop after this phase
}
```

### Default Behavior

If not specified:
- `startPhase` defaults to `1`
- `endPhase` defaults to `6`
- Full pipeline runs (Phases 1-6)

---

## 🔢 Phase Numbers

| Phase | Name | Description |
|-------|------|-------------|
| 1 | Seed Pairs | Translation of target/known sentence pairs |
| 3 | LEGO Extraction | Vocabulary unit extraction with A-before-M ordering |
| 4 | Basket Prep | Smart deduplication and batch preparation |
| 5 | Practice Baskets | Phrase generation with GATE validation |
| 6 | Introductions | Introduction chunk generation |

*Note: Phase 2 is skipped (legacy phase)*

---

## 💡 Common Use Cases

### Use Case 1: Generate Seed Pairs Only

**Goal**: Create seed_pairs.json and stop

```javascript
{
  startPhase: 1,
  endPhase: 1,
  // ... other params
}
```

**Output**:
- `vfs/courses/{course}/seed_pairs.json`
- Workflow stops after Phase 1 validation

---

### Use Case 2: Extract LEGOs (Phases 1-3)

**Goal**: Generate seeds and extract vocabulary, but don't create practice baskets

```javascript
{
  startPhase: 1,
  endPhase: 3,
  // ... other params
}
```

**Output**:
- `seed_pairs.json`
- `lego_pairs.json`
- Workflow stops after Phase 3 merge

**Why**: Useful for manual Phase 5 basket generation or quality review before continuing

---

### Use Case 3: Resume from Phase 3

**Goal**: LEGOs already extracted, now generate baskets

```javascript
{
  startPhase: 3,
  endPhase: 6,
  // ... other params
}
```

**Requirements**:
- `seed_pairs.json` must exist
- Phase 3 preparation will recreate orchestrator batches from existing seed_pairs.json

---

### Use Case 4: Phase 5 Only (Practice Baskets)

**Goal**: Regenerate baskets without re-extracting LEGOs

```javascript
{
  startPhase: 5,
  endPhase: 5,
  // ... other params
}
```

**Requirements**:
- `seed_pairs.json` exists
- `lego_pairs.json` exists
- Phase 4 will run automatically to prepare batches

---

## 🔄 Phase Dependencies

Some phases depend on previous phases:

| Phase | Requires | Notes |
|-------|----------|-------|
| 1 | None | Creates seed_pairs.json |
| 3 | seed_pairs.json | Can recreate from existing file |
| 4 | lego_pairs.json | Always runs before Phase 5 |
| 5 | lego_pairs.json | Batch prep (Phase 4) runs first |
| 6 | lego_pairs.json + baskets | Needs completed Phase 5 output |

**Smart Resumption**: If you start at Phase 3 or later, the workflow assumes previous outputs exist and will validate/use them.

---

## 🚨 Validation & Error Handling

### Phase 1 Validation
- Polls `seed_pairs.json` for completion
- Validates all seeds present
- Timeout: 30 minutes

### Phase Skip Messages
When phases are skipped, you'll see:
```
⏭️  PHASE 1: Skipped (startPhase=3)
```

### Early Termination
When workflow stops at endPhase:
```
🛑 Workflow stopping at Phase 3 (as configured)
```

Job status set to `completed` with `progress: 100`

---

## 📊 Progress Tracking

Progress percentages are adjusted based on phases run:

| Phase Complete | Full Pipeline (1-6) | Partial (1-3) |
|----------------|---------------------|---------------|
| Phase 1 | 30% | 33% |
| Phase 3 | 50% | 100% |
| Phase 4 | 60% | N/A |
| Phase 5 | 85% | N/A |
| Phase 6 | 100% | N/A |

---

## 🔧 Implementation Details

**File Modified**: `orchestrator-workflow.cjs`

**Key Changes**:
1. Added `startPhase` and `endPhase` parameter extraction
2. Wrapped each phase in conditional: `if (startPhase <= N && endPhase >= N)`
3. Added skip messages for phases before startPhase
4. Added early termination for phases after endPhase
5. Updated workflow header to show phase range

**Example Code**:
```javascript
// Phase 3 conditional
if (startPhase <= 3 && endPhase >= 3) {
  console.log('\n📍 PHASE 3: LEGO Extraction\n');
  // ... phase 3 logic ...
} else if (startPhase > 3) {
  console.log(`\n⏭️  PHASE 3: Skipped (startPhase=${startPhase})\n`);
}

// Early termination check
if (endPhase < 4) {
  console.log(`\n🛑 Workflow stopping at Phase ${endPhase} (as configured)\n`);
  job.phase = 'complete';
  job.status = 'completed';
  job.progress = 100;
  return;
}
```

---

## 🎓 Best Practices

### 1. Quality Gates
Use phase selection to add quality gates:
- Run Phase 1 → Manual review → Continue with Phase 3
- Run Phases 1-3 → Manual LEGO validation → Continue with Phase 5

### 2. Development/Testing
Test individual phases during development:
```javascript
// Test only basket generation
{ startPhase: 5, endPhase: 5 }
```

### 3. Incremental Processing
For large courses (500+ seeds), process incrementally:
```javascript
// First batch: Seeds 1-100, Phases 1-3 only
{ startSeed: 1, endSeed: 100, startPhase: 1, endPhase: 3 }

// Review LEGOs, then continue
{ startSeed: 1, endSeed: 100, startPhase: 5, endPhase: 6 }
```

### 4. Error Recovery
If a phase fails, resume from that phase:
```javascript
// Phase 5 failed, rerun it
{ startPhase: 5, endPhase: 6 }
```

---

## 🚀 Example: Manual Phase 5 Generation

**Scenario**: You want to manually generate practice baskets for seeds 1-100 using Claude Code web, but orchestrator should handle Phases 1-3.

**Step 1**: Run Phases 1-3 via Dashboard
```javascript
{
  target: "spa",
  known: "eng",
  seeds: 100,
  startSeed: 1,
  endSeed: 100,
  startPhase: 1,
  endPhase: 3
}
```

**Step 2**: After Phase 3 completes, you have:
- `seed_pairs.json` (100 seeds)
- `lego_pairs.json` (deduplicated & A-before-M ordered)

**Step 3**: Manually generate baskets using Claude Code web
- Run deduplication: `node scripts/phase3_deduplicate_legos.cjs public/vfs/courses/spa_for_eng_s0001-0100`
- Run reordering: `node scripts/phase3_reorder_legos.cjs public/vfs/courses/spa_for_eng_s0001-0100`
- Generate scaffolds: `node scripts/phase5_generate_scaffolds.cjs public/vfs/courses/spa_for_eng_s0001-0100`
- Spawn 5 parallel Claude Code agents for phrase generation (20 seeds each)
- Run GATE validation: `node scripts/phase5_gate_validator.cjs public/vfs/courses/spa_for_eng_s0001-0100`
- Remove violations: `node scripts/phase5_remove_gate_violations.cjs public/vfs/courses/spa_for_eng_s0001-0100`
- Run grammar review: `node scripts/phase5_grammar_review.cjs public/vfs/courses/spa_for_eng_s0001-0100`

**Step 4**: (Optional) Resume with Phase 6 via Dashboard
```javascript
{
  startPhase: 6,
  endPhase: 6
}
```

---

**Status**: ✅ **Feature Complete - Ready for Use**
