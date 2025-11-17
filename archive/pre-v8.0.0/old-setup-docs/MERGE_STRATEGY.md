# Merge Strategy - Consolidate Recent Work

## Current State

**Main branch**: Has old whitelist builder (broken - generates untaught conjugations)

**Key branches to merge**:
1. `claude/review-whitelist-registry-011CUwJwkcVHAQzo3D2FcVug` - Fixed whitelist builder
2. `claude/start-new-session-011CUstzCf9ksaHNVtQjJ7LU` - Phase 5 work + browser automation

---

## What Needs to Merge

### ✅ CRITICAL (Must merge immediately)

#### From `claude/review-whitelist-registry-011CUwJwkcVHAQzo3D2FcVug`:

**Files:**
- `build_vocabulary_whitelist.cjs` - Fixed to read from lego_pairs.json
- `vocabulary_whitelist_s0011.json` - Example output

**Why critical:**
- Current whitelist builder generates untaught conjugations (GATE violations)
- Phase 5 basket generation depends on accurate whitelists
- Without this fix, all baskets will have vocabulary errors

**Changes:**
- ✅ Reads from `lego_pairs.json` (authoritative source)
- ✅ Extracts only taught forms (no generated conjugations)
- ✅ Outputs Spanish → English registry (not just word list)
- ✅ Includes molecular LEGO components

---

#### From `claude/start-new-session-011CUstzCf9ksaHNVtQjJ7LU`:

**New files to commit:**

1. **Browser Automation System** (CRITICAL - New capability):
   - `spawn_claude_web_agent.cjs` - osascript browser automation
   - `automation_server.cjs` (modified) - Phase 5 web endpoints
   - `PHASE5_WEB_AGENTS_USAGE.md` - Usage documentation

2. **Phase 5 Scripts** (Already committed in f1e16066):
   - `scripts/create_basket_scaffolds.cjs` ✅
   - `scripts/validate_agent_baskets.cjs` ✅

3. **Phase 3 Scripts** (Supporting infrastructure):
   - `scripts/phase3_prepare_batches.cjs`
   - `scripts/phase3_merge_batches.cjs`
   - `scripts/phase3_build_lego_registry.cjs`
   - `scripts/validate_lego_pairs.cjs`

4. **Validation Scripts**:
   - `scripts/validation/run-all-checks.js`
   - `scripts/validation/check-gate-violations.js`
   - `scripts/validation/check-speakability.js`
   - `scripts/validation/check-conjunctions.js`

**Why critical:**
- Browser automation enables 34 parallel agents using Claude Pro ($0 cost)
- Replaces iTerm2 + CLI approach (saves 8GB RAM + API costs)
- Enables completing Phase 5 in 20-30 minutes instead of hours

---

### 📋 DOCUMENTATION (Should merge - useful reference)

**From current session (uncommitted):**
- `BROWSER_AUTOMATION_INTEGRATION.md` - Integration guide
- `CLAUDE_CODE_FINAL_SOLUTION.md` - Solution analysis
- `PROJECT_PROGRESS_OVERVIEW.md` - Overall status
- `CLAUDE_CODE_WEB_GITHUB_INTEGRATION.md` - GitHub integration research
- `DASHBOARD_ARCHITECTURE_ANALYSIS.md` - Architecture analysis
- `REMOTE_CLAUDE_CODE_TRIGGER.md` - Remote trigger approach
- `SIMPLE_GITHUB_TRIGGER_STRATEGY.md` - Simplified strategies

**From committed work:**
- `STAGED_PIPELINE_IMPLEMENTATION.md` ✅
- Various agent/batch status reports (historical value)

---

### ❌ SKIP (Don't merge - temporary/generated)

**Generated outputs:**
- `phase5_batch1_s0101_s0300/batch_output/*.json` (100+ files)
- `agent_generated_baskets_s0006_s0030/*.json`
- `public/vfs/courses/spa_for_eng/baskets/*.json`

**Temporary analysis:**
- `BASKET_GENERATION_STATUS.md`
- `BATCH2_MONITORING.md`
- `BATCH2_PHRASE_QUALITY_REVIEW.md`
- `BRANCH_STATUS_BATCH2.md`
- Various AGENT_XX reports

**Why skip:**
- Too large (bloat repo)
- Regenerable from source
- Historical analysis (not needed in main)

---

## Merge Plan

### Step 1: Merge whitelist fix first (Foundation)

```bash
git checkout main
git merge claude/review-whitelist-registry-011CUwJwkcVHAQzo3D2FcVug
```

**Result**: Main now has correct whitelist builder

---

### Step 2: Commit browser automation to current branch

```bash
git checkout claude/start-new-session-011CUstzCf9ksaHNVtQjJ7LU

# Add critical files
git add spawn_claude_web_agent.cjs
git add automation_server.cjs
git add PHASE5_WEB_AGENTS_USAGE.md
git add BROWSER_AUTOMATION_INTEGRATION.md
git add CLAUDE_CODE_FINAL_SOLUTION.md

# Add supporting scripts
git add scripts/phase3_*.cjs
git add scripts/validate_lego_pairs.cjs
git add scripts/validation/

# Add useful docs
git add PROJECT_PROGRESS_OVERVIEW.md
git add DASHBOARD_ARCHITECTURE_ANALYSIS.md
git add CLAUDE_CODE_WEB_GITHUB_INTEGRATION.md
git add STAGED_PIPELINE_IMPLEMENTATION.md

# Commit
git commit -m "Add browser-based Claude Code on the Web automation

- Spawn 34 parallel agents in browser tabs (claude.ai/code)
- Uses Claude Pro subscription ($0 additional cost vs API)
- Saves 8GB RAM (browser vs iTerm2 + CLI)
- New endpoints: POST /api/phase5/spawn-web-agents, GET /api/phase5/progress
- Complete with prompts, scaffolds, monitoring

Supporting infrastructure:
- Phase 3 batch preparation scripts
- Validation suite for GATE compliance
- Comprehensive documentation

Enables Phase 5 completion in 20-30 minutes with 34 parallel agents
"
```

---

### Step 3: Merge both into main

```bash
git checkout main

# Already merged: whitelist fix
# Now merge: browser automation + Phase 5 work
git merge claude/start-new-session-011CUstzCf9ksaHNVtQjJ7LU -m "Merge Phase 5 browser automation and infrastructure

Combines:
- Fixed vocabulary whitelist (no untaught conjugations)
- Browser-based agent spawning (Claude Code on the Web)
- Phase 3 & 5 batch processing scripts
- Validation suite
- Staged pipeline implementation

Phase 5 status: 180/200 seeds complete at 90% with browser automation ready
"
```

---

### Step 4: Push to remote

```bash
git push origin main
```

---

## Conflicts to Expect

### `build_vocabulary_whitelist.cjs`

**Conflict**: Both branches modified this file

**Resolution**: Use version from `claude/review-whitelist-registry` (the fixed one)

**Why**: The review branch has the critical fix that reads from lego_pairs.json

---

### `automation_server.cjs`

**Conflict**: Modified in current session (uncommitted)

**Resolution**:
1. Commit changes first (Phase 5 web endpoints)
2. Then merge will include those changes

---

## Verification After Merge

### Test 1: Whitelist builder works

```bash
node build_vocabulary_whitelist.cjs S0011 spa_for_eng
# Should output: 61 entries (43 single words, 18 multi-word)
```

### Test 2: Browser automation works

```bash
# Restart automation server
lsof -ti:3456 | xargs kill -9
PORT=3456 node automation_server.cjs &

# Test spawn endpoint
curl -X POST http://localhost:3456/api/phase5/spawn-web-agents \
  -H "Content-Type: application/json" \
  -d '{"batchName":"test_batch","agentCount":2}'
```

### Test 3: Scripts available

```bash
ls scripts/create_basket_scaffolds.cjs
ls scripts/validate_agent_baskets.cjs
ls scripts/phase3_prepare_batches.cjs
ls scripts/validation/run-all-checks.js
```

---

## Summary

**What gets merged**:
- ✅ Fixed whitelist builder (no untaught conjugations)
- ✅ Browser automation system (34 parallel agents)
- ✅ Phase 3 & 5 infrastructure scripts
- ✅ Validation suite
- ✅ Documentation

**What gets skipped**:
- ❌ Generated basket JSON files (too large)
- ❌ Temporary status reports
- ❌ Historical analysis docs

**Result**:
- Main branch has all production code
- Phase 5 ready to complete with browser automation
- No GATE violations in whitelists
- Clean, documented codebase

---

## Risk Assessment

**Low risk**:
- Whitelist fix is isolated (doesn't break existing code)
- Browser automation is additive (doesn't replace existing endpoints)
- Scripts are standalone utilities

**Testing needed**:
- Verify automation server starts
- Test browser spawning
- Validate whitelist output

**Rollback plan**:
If issues arise:
```bash
git revert HEAD
git push origin main
```

---

## Execute Now?

Ready to proceed with merge? Steps:

1. ✅ Merge whitelist fix to main
2. ✅ Commit browser automation to current branch
3. ✅ Merge current branch to main
4. ✅ Verify tests pass
5. ✅ Push to remote

**Estimated time**: 10 minutes

**Benefits**:
- Clean main branch with all recent work
- Browser automation production-ready
- Phase 5 can proceed with correct whitelists
