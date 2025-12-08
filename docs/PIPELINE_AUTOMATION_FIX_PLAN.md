# Pipeline Automation Fix Plan

## Executive Summary

**Date:** 2025-12-08
**Goal:** Enable fully automated Phase 1→2→3 pipeline with zero human intervention

**Current Status:** ~70% automated - Phase 2 is completely skipped, Phase 3 has broken completion workflow

**After Fixes:** 100% automated - Single button triggers full pipeline

---

## Critical Issues By Phase

### Phase 1 (Translation + LEGO Extraction) - Port 3457

| Issue | Severity | File | Line | Fix |
|-------|----------|------|------|-----|
| `/api/canonical-seeds` ignores `end` parameter | CRITICAL | orchestrator.cjs | 1800-1824 | Support `end` param |
| Phase 2 trigger not implemented | CRITICAL | orchestrator.cjs | 2883 | Add Phase 2 trigger code |
| No merge quality validation | HIGH | orchestrator.cjs | 2858-2887 | Add seed count/field validation |
| No worker timeout instruction | MEDIUM | server.cjs | 845-865 | Add 30-min timeout in prompt |
| No retry logic in worker prompts | LOW | server.cjs | prompt template | Add retry instructions |

### Phase 2 (Conflict Resolution) - Port 3458

| Issue | Severity | File | Line | Fix |
|-------|----------|------|------|-----|
| **NO AGENT SPAWNING SYSTEM** | CRITICAL | server.cjs | - | Create `/phase2/launch` endpoint |
| **NO AUTOMATIC TRIGGERING** | CRITICAL | orchestrator.cjs | - | Wire Phase 1→2 transition |
| Upchunk application not implemented | HIGH | server.cjs | 2039-2041 | Implement upchunk logic |
| No completion notification | HIGH | server.cjs | - | Add orchestrator callback |
| PROMPT.md is documentation not agent prompt | MEDIUM | PROMPT.md | - | Convert to agent instructions |

### Phase 3 (Basket Generation) - Port 3459

| Issue | Severity | File | Line | Fix |
|-------|----------|------|------|-----|
| Wrong phase number in auto-trigger | CRITICAL | orchestrator.cjs | 3125 | Change `5` to `3` |
| Missing `merge-phase3-staging.cjs` script | CRITICAL | scripts/ | - | Create script |
| Wrong script paths in completion workflow | CRITICAL | server.cjs | 2604-2616 | Fix `../../` paths |
| Hard dependency on grammar service (3460) | HIGH | server.cjs | 2619-2640 | Make optional with try-catch |

### Orchestrator - Port 3456

| Issue | Severity | File | Line | Fix |
|-------|----------|------|------|-----|
| Phase 2 not in PHASE_SERVERS map | CRITICAL | orchestrator.cjs | 36 | Add `2: localhost:3458` |
| Phase 2 not in progress tracking | HIGH | orchestrator.cjs | 96 | Add to initializeCourseProgress |
| `handlePhaseProgression` skips Phase 2 | HIGH | orchestrator.cjs | 1452 | Add Phase 1→2→3 logic |
| `triggerPhase()` doesn't handle Phase 2 | HIGH | orchestrator.cjs | 835 | Add special Phase 2 handling |
| Validation always returns true | LOW | orchestrator.cjs | 790 | Implement actual validation |

### Dashboard

| Issue | Severity | File | Fix |
|-------|----------|------|-----|
| No "Run Full Pipeline" button | HIGH | CourseGeneration.vue | Add dedicated button |
| Phase 2 checkpoint is manual | HIGH | CourseGeneration.vue | Add auto-continue option |
| No `skipCheckpoints` API param | MEDIUM | api integration | Add parameter support |
| Progress only tracks to Phase 3 | LOW | PipelineProgress.vue | Extend to Manifest/Audio |

---

## Implementation Order

### Step 1: Fix Phase 1 Canonical Seeds Endpoint (30 min)

**File:** `/services/orchestration/orchestrator.cjs` lines 1800-1824

```javascript
app.get('/api/canonical-seeds', async (req, res) => {
  try {
    const canonicalPath = path.join(__dirname, '../../public/vfs/canonical/canonical_seeds.json');
    const seedsArray = await fs.readJSON(canonicalPath);

    // Support both limit-based and range-based queries
    const start = parseInt(req.query.start) || 1;
    const end = parseInt(req.query.end);
    const limit = end ? (end - start + 1) : (parseInt(req.query.limit) || 668);

    const startIdx = start - 1;
    const endIdx = Math.min(startIdx + limit, 668);
    const filteredSeeds = seedsArray.slice(startIdx, endIdx);

    res.json({
      total_available: 668,
      start,
      end: end || (start + limit - 1),
      limit,
      count: filteredSeeds.length,
      seeds: filteredSeeds
    });
  } catch (error) {
    console.error('[Orchestrator] Error serving canonical seeds:', error);
    res.status(500).json({ error: 'Failed to load canonical seeds' });
  }
});
```

### Step 2: Add Phase 2 to Orchestrator (1 hour)

**2a. Add to PHASE_SERVERS map** (line 36):
```javascript
const PHASE_SERVERS = {
  '1_translation': process.env.PHASE1_TRANSLATION_URL || 'http://localhost:3457',
  '1_lego': process.env.PHASE1_LEGO_URL || 'http://localhost:3458',
  2: process.env.PHASE1_LEGO_URL || 'http://localhost:3458',  // ADD THIS
  3: process.env.PHASE3_URL || 'http://localhost:3459',
  'manifest': process.env.MANIFEST_URL || 'http://localhost:3464',
  'audio': process.env.AUDIO_URL || 'http://localhost:3465'
};
```

**2b. Add to progress tracking** (line 96):
```javascript
phases: {
  1: { status: 'pending', seedsTotal: totalSeeds },
  2: { status: 'pending' },  // ADD THIS
  3: { status: 'pending' },
  manifest: { status: 'pending' },
  audio: { status: 'pending' }
},
```

**2c. Update handlePhaseProgression** (line 1452):
```javascript
async function handlePhaseProgression(courseCode, completedPhase, state, pipelineJob) {
  const normalizedPhase = normalizePhaseIdentifier(completedPhase);

  if (normalizedPhase === 'phase1') {
    console.log(`   → Phase 1 complete, triggering Phase 2 (Conflict Resolution)`);
    setTimeout(() => triggerPhase(courseCode, 2), 2000);
  } else if (normalizedPhase === 'phase2') {
    console.log(`   → Phase 2 complete, triggering Phase 3 (Baskets)`);
    setTimeout(() => triggerPhase(courseCode, 3), 2000);
  } else if (normalizedPhase === 'phase3') {
    console.log(`   → Phase 3 complete, triggering Manifest compilation`);
    setTimeout(() => triggerPhase(courseCode, 'manifest'), 2000);
  } else if (normalizedPhase === 'manifest') {
    console.log(`   → Manifest complete, triggering Audio generation`);
    setTimeout(() => triggerPhase(courseCode, 'audio'), 2000);
  } else if (normalizedPhase === 'audio') {
    state.status = 'complete';
    console.log(`   🎉 All phases complete!`);
  }
}
```

**2d. Update triggerPhase for Phase 2** (line 835):
```javascript
async function triggerPhase(courseCode, phase, totalSeeds = 668) {
  // Special handling for Phase 2 (conflict resolution)
  if (phase === 2) {
    const phase2Server = PHASE_SERVERS[2];
    console.log(`   Phase 2 uses specialized workflow (detect → apply)`);

    // Step 1: Detect conflicts
    await axios.post(`${phase2Server}/phase2/detect`, { courseCode });

    // Step 2: Apply resolutions
    const resolutionsPath = path.join(VFS_ROOT, courseCode, 'upchunk_resolutions.json');
    let resolutions = [];
    if (await fs.pathExists(resolutionsPath)) {
      resolutions = (await fs.readJSON(resolutionsPath)).resolutions || [];
    }

    await axios.post(`${phase2Server}/phase2/apply`, { courseCode, resolutions });

    // Manually trigger next phase
    const state = courseStates.get(courseCode);
    await handlePhaseProgression(courseCode, 2, state, pipelineJobs.get(courseCode) || {});
    return;
  }

  // Standard handling for other phases
  const phaseServer = PHASE_SERVERS[phase];
  await axios.post(`${phaseServer}/start`, { courseCode, totalSeeds });
}
```

### Step 3: Implement Phase 2 Auto-Trigger After Phase 1 (1 hour)

**File:** `/services/orchestration/orchestrator.cjs` line 2883

Replace the comment with actual trigger code:

```javascript
// After line 2879: draft_lego_pairs.json created
console.log(`[Orchestrator] ✅ Merged ${allSeeds.length} seeds → draft_lego_pairs.json`);

// Trigger Phase 2 (Conflict Resolution)
console.log(`[Orchestrator] → Triggering Phase 2 (Conflict Resolution)...`);

const phase2Server = PHASE_SERVERS['1_lego'];

try {
  // Step 1: Detect conflicts
  console.log(`[Orchestrator]    Step 1: Detecting conflicts...`);
  const detectResponse = await axios.post(`${phase2Server}/phase2/detect`, { courseCode });
  const { conflictCount } = detectResponse.data.summary || { conflictCount: 0 };
  console.log(`[Orchestrator]    ✓ Found ${conflictCount} conflicts`);

  // Step 2: Apply LEGO reuse tracking
  console.log(`[Orchestrator]    Step 2: Applying LEGO reuse tracking...`);
  const resolutionsPath = path.join(VFS_ROOT, courseCode, 'upchunk_resolutions.json');
  let resolutions = [];
  if (await fs.pathExists(resolutionsPath)) {
    resolutions = (await fs.readJSON(resolutionsPath)).resolutions || [];
  }

  const applyResponse = await axios.post(`${phase2Server}/phase2/apply`, {
    courseCode,
    resolutions
  });

  const { uniqueNew, totalLegos } = applyResponse.data.summary || {};
  console.log(`[Orchestrator]    ✓ Created lego_pairs.json (${uniqueNew} unique LEGOs)`);

  // Step 3: Trigger Phase 3
  console.log(`[Orchestrator] → Phase 2 complete, triggering Phase 3 in 2s...`);
  setTimeout(() => {
    console.log(`[Orchestrator] 🚀 Auto-triggering Phase 3 for ${courseCode}`);
    triggerPhase(courseCode, 3);
  }, 2000);

} catch (error) {
  console.error(`[Orchestrator] ❌ Phase 2 failed:`, error.message);
}
```

### Step 4: Fix Phase 3 Auto-Trigger (15 min)

**File:** `/services/orchestration/orchestrator.cjs` line 3125

```javascript
// WRONG:
triggerPhase(courseCode, 5);

// CORRECT:
triggerPhase(courseCode, 3);
```

### Step 5: Fix Phase 3 Script Paths (30 min)

**File:** `/services/phases/phase3-basket-generation/server.cjs`

**Line 2604:**
```javascript
// WRONG:
await execScript(path.join(__dirname, '../../services/scripts/merge-phase3-staging.cjs'), courseCode);

// CORRECT:
await execScript(path.join(__dirname, '../../../scripts/merge-phase3-staging.cjs'), courseCode);
```

**Lines 2610 and 2616:** Similar path fixes for `clean-baskets-gate.cjs` and `ensure-minimum-phrase.cjs`

### Step 6: Create Missing merge-phase3-staging.cjs Script (1 hour)

**File:** `/scripts/merge-phase3-staging.cjs`

```javascript
#!/usr/bin/env node
/**
 * Merge Phase 3 staging baskets into main lego_baskets.json
 */

const fs = require('fs-extra');
const path = require('path');

const VFS_ROOT = process.env.VFS_ROOT || path.join(__dirname, '../public/vfs/courses');

async function main() {
  const courseCode = process.argv[2];
  if (!courseCode) {
    console.error('Usage: node merge-phase3-staging.cjs <courseCode>');
    process.exit(1);
  }

  const courseDir = path.join(VFS_ROOT, courseCode);
  const stagingDir = path.join(courseDir, 'phase3_baskets_staging');
  const outputPath = path.join(courseDir, 'lego_baskets.json');

  if (!await fs.pathExists(stagingDir)) {
    console.log('No staging directory found - nothing to merge');
    process.exit(0);
  }

  // Read existing baskets
  let existingBaskets = {};
  if (await fs.pathExists(outputPath)) {
    const existing = await fs.readJSON(outputPath);
    existingBaskets = existing.baskets || {};
  }

  // Read all staging files
  const stagingFiles = (await fs.readdir(stagingDir)).filter(f => f.endsWith('.json'));
  console.log(`Found ${stagingFiles.length} staging files`);

  for (const file of stagingFiles) {
    const data = await fs.readJSON(path.join(stagingDir, file));
    const baskets = data.baskets || data;

    for (const [legoId, basket] of Object.entries(baskets)) {
      existingBaskets[legoId] = basket;
    }
  }

  // Write merged output
  const output = {
    version: '3.0',
    course: courseCode,
    generated: new Date().toISOString(),
    baskets: existingBaskets,
    total_baskets: Object.keys(existingBaskets).length
  };

  await fs.writeJSON(outputPath, output, { spaces: 2 });
  console.log(`✅ Merged ${Object.keys(existingBaskets).length} baskets → lego_baskets.json`);

  // Archive staging
  const archiveDir = path.join(courseDir, 'phase3_staging_archive');
  await fs.move(stagingDir, archiveDir, { overwrite: true });
  console.log(`📁 Archived staging to ${archiveDir}`);
}

main().catch(err => {
  console.error('Merge failed:', err);
  process.exit(1);
});
```

### Step 7: Make Grammar Validation Optional (15 min)

**File:** `/services/phases/phase3-basket-generation/server.cjs` lines 2619-2640

Wrap in try-catch:
```javascript
// Step 4: Trigger grammar validation (OPTIONAL)
try {
  console.log('📝 Step 4: Triggering grammar validation...');
  const grammarResponse = await fetch('http://localhost:3460/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseCode })
  });

  if (grammarResponse.ok) {
    console.log('✅ Grammar validation started');
    await waitForGrammarValidation(courseCode);
  } else {
    console.warn('⚠️  Grammar validation service unavailable, skipping');
  }
} catch (error) {
  console.warn('⚠️  Grammar validation failed, continuing:', error.message);
}
```

---

## Validation After Fixes

### Test 1: Canonical Seeds Endpoint
```bash
curl "http://localhost:3456/api/canonical-seeds?start=1&end=3"
# Should return exactly 3 seeds, not 668
```

### Test 2: Phase 1→2 Transition
```bash
# Start Phase 1 for small test
curl -X POST http://localhost:3456/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{"courseCode":"test_auto","startSeed":1,"endSeed":10,"phaseSelection":"all"}'

# Watch logs for:
# "🎉 All Phase 1 masters complete!"
# "→ Triggering Phase 2 (Conflict Resolution)..."
# "✅ Created lego_pairs.json"
```

### Test 3: Full Pipeline
```bash
# Run full 668 seeds
curl -X POST http://localhost:3456/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{"courseCode":"spa_for_eng_v2","startSeed":1,"endSeed":668,"phaseSelection":"all"}'

# Expected flow:
# Phase 1 → Phase 2 → Phase 3 → Manifest → Audio → Complete
```

---

## Estimated Time to Full Automation

| Task | Time |
|------|------|
| Fix canonical seeds endpoint | 30 min |
| Add Phase 2 to orchestrator | 1 hour |
| Implement Phase 1→2 trigger | 1 hour |
| Fix Phase 3 auto-trigger | 15 min |
| Fix Phase 3 script paths | 30 min |
| Create merge script | 1 hour |
| Make grammar optional | 15 min |
| Testing | 1-2 hours |
| **Total** | **5-6 hours** |

---

## Files to Modify

1. `/services/orchestration/orchestrator.cjs` - Main coordination fixes
2. `/services/phases/phase3-basket-generation/server.cjs` - Path fixes, grammar optional
3. `/scripts/merge-phase3-staging.cjs` - New file to create
4. `/services/phases/phase1-translation/server.cjs` - Worker prompt improvements (optional)

---

## Success Criteria

- [ ] `curl /api/canonical-seeds?start=1&end=3` returns 3 seeds
- [ ] Phase 1 completion triggers Phase 2 automatically
- [ ] Phase 2 creates `lego_pairs.json` with `new: true/false` flags
- [ ] Phase 2 completion triggers Phase 3 automatically
- [ ] Phase 3 completion workflow runs without errors
- [ ] Full pipeline (668 seeds) completes without human intervention
- [ ] Dashboard can trigger full pipeline with single button
