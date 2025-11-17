# Confirmed Workflow for Claude Code Web

## What We Know Works ✅

### 1. Shared Filesystem Between Orchestrator and Sub-Agents
- ✅ Sub-agents can write files to the sandbox
- ✅ Orchestrator can see and commit those files
- ✅ They share the same working directory

### 2. Git Operations from Orchestrator
- ✅ `git checkout -b` creates new branches
- ✅ `git add` stages files created by sub-agents
- ✅ `git commit` commits staged files
- ✅ `git push origin` pushes to GitHub with session ID

### 3. Session ID Requirement
- ✅ Branch names MUST end with orchestrator's session ID
- ✅ Sub-agents have different session IDs (ignore them)
- ✅ Format: `claude/baskets-cmn_for_eng-{description}-{ORCHESTRATOR_SESSION_ID}`

---

## Recommended Workflow

### Option A: One Branch per Orchestrator (Test This!)

**Hypothesis**: Push to same branch multiple times, accumulating commits

```bash
# Orchestrator setup
git clone repo
git checkout -b baskets-cmn_for_eng-orch1-SESSION_ID

# Mini-batch 1
# Sub-agents write 5 files
git add files
git commit -m "Batch 1"
git push origin baskets-cmn_for_eng-orch1-SESSION_ID

# Mini-batch 2
# Sub-agents write 5 more files
git add files
git commit -m "Batch 2"
git push origin baskets-cmn_for_eng-orch1-SESSION_ID  # SAME BRANCH!

# Result: One branch with all commits?
```

**Needs Testing**: Does the second push add to the branch or create conflict?

---

### Option B: One Batch Branch per Mini-Batch (Current Pattern)

**What we see in your example:**

```bash
# Mini-batch 1
git checkout -b batch1-SESSION_ID
git add files
git commit
git push origin batch1-SESSION_ID

# Mini-batch 2
git checkout -b batch2-SESSION_ID  # NEW branch
git add files
git commit
git push origin batch2-SESSION_ID

# Result: Multiple branches (batch1, batch2, etc.)
```

**Pros**: Definitely works (confirmed)
**Cons**: Creates many branches (6-7 per orchestrator)

---

### Option C: Consolidation Branches (Your Actual Pattern)

**What you're doing:**

```bash
# After all mini-batches complete locally
# Create consolidated branches from existing work

git checkout -b final-batch1-SESSION_ID existing-work-branch
git push origin final-batch1-SESSION_ID

git checkout -b final-batch2-SESSION_ID another-work-branch
git push origin final-batch2-SESSION_ID

# Result: Fewer branches with organized content
```

**Pros**: Can consolidate multiple mini-batches into fewer branches
**Cons**: Requires post-processing step

---

## Recommended Approach: Test Option A First

### Test Prompt for One Browser Tab

```markdown
# Test: Multiple Pushes to Same Branch

**Goal**: Determine if we can push to the same branch name multiple times

## Setup
```bash
git clone https://github.com/zenjin/ssi-dashboard-v7-clean.git
cd ssi-dashboard-v7-clean

# Get your session ID (it's in the prompt or run this if available)
SESSION_ID="YOUR_SESSION_ID_HERE"
BRANCH_NAME="test-multi-push-$SESSION_ID"

# Create and switch to test branch
git checkout -b $BRANCH_NAME
```

## Test Sequence

### Push 1
```bash
echo "test1" > test1.txt
git add test1.txt
git commit -m "First push test"
git push origin $BRANCH_NAME
```

**Expected**: Branch created on GitHub with test1.txt

### Push 2 (Same Branch!)
```bash
echo "test2" > test2.txt
git add test2.txt
git commit -m "Second push test"
git push origin $BRANCH_NAME  # SAME branch name!
```

**Question**: Does this:
- ✅ Add test2.txt to the existing branch? (SUCCESS!)
- ❌ Fail with conflict/error? (Need Option B or C)

### Push 3 (Same Branch Again!)
```bash
echo "test3" > test3.txt
git add test3.txt
git commit -m "Third push test"
git push origin $BRANCH_NAME  # SAME branch name again!
```

## Verification

Check GitHub branch: Does it contain all 3 files (test1.txt, test2.txt, test3.txt)?

If YES: ✅ **Option A works! Use one branch per orchestrator**
If NO: ❌ **Fall back to Option B (batch branches) or Option C (consolidation)**
```

---

## Orchestrator Template Based on Test Results

### If Option A Works (One Branch, Multiple Pushes)

```markdown
# Phase 5 Orchestrator - Window 1

**Session ID**: {SESSION_ID}
**Seeds**: S0343-S0374 (32 seeds)
**Branch**: baskets-cmn_for_eng-s0343-s0374-{SESSION_ID}

## Setup
```bash
git clone https://github.com/zenjin/ssi-dashboard-v7-clean.git
cd ssi-dashboard-v7-clean
git checkout -b baskets-cmn_for_eng-s0343-s0374-{SESSION_ID}
```

## For Each Mini-Batch (1-7)

### Step 1: Spawn Sub-Agents
```
Use Task tool to spawn 5 agents in parallel
Each agent generates 1 basket file (no git operations)
Wait for all agents to complete
```

### Step 2: Commit and Push
```bash
# Add new basket files
git add public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S*.json

# Commit
git commit -m "Mini-batch X: S0XXX-S0YYY complete"

# Push to SAME branch every time
git push origin baskets-cmn_for_eng-s0343-s0374-{SESSION_ID}
```

### Step 3: Verify
Check that push succeeded without errors

## Result
One branch with all 32 seeds accumulated over 7 pushes!
```

---

### If Option A Doesn't Work (Use Batch Branches)

```markdown
# Phase 5 Orchestrator - Window 1

**Session ID**: {SESSION_ID}
**Seeds**: S0343-S0374 (32 seeds)

## For Each Mini-Batch (1-7)

### Step 1: Create New Branch
```bash
BATCH_NUM=1  # Increment for each batch
git checkout -b baskets-s0343-batch$BATCH_NUM-{SESSION_ID}
```

### Step 2: Spawn Sub-Agents
```
Use Task tool to spawn 5 agents
Each generates 1 basket file
Wait for completion
```

### Step 3: Commit and Push
```bash
git add public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S*.json
git commit -m "Batch $BATCH_NUM complete"
git push origin baskets-s0343-batch$BATCH_NUM-{SESSION_ID}
```

### Step 4: Return to Main
```bash
git checkout main  # Or master
```

Repeat for each mini-batch

## Result
7 branches per orchestrator (one per mini-batch)
Can consolidate later if desired
```

---

## Decision Tree

```
START
  ↓
Test Option A (same branch, multiple pushes)
  ↓
Does it work?
  ↓
YES → Use Option A (cleanest: 1 branch per orchestrator)
  ↓
NO → Use Option B (acceptable: 7 branches per orchestrator)
```

---

## Action Items

1. **Run test in one browser tab** (5 minutes)
2. **If test passes**: Create 10 orchestrator prompts using Option A
3. **If test fails**: Create 10 orchestrator prompts using Option B
4. **Either way**: Will be cleaner than current 600+ branch explosion

---

## Key Learnings

✅ **Sub-agents write files** → Orchestrator commits them
✅ **Shared sandbox filesystem** → All agents see same files
✅ **Session ID required** → Only orchestrator's session ID in branch names
✅ **Git operations work** → Orchestrator can commit/push sub-agent files

❓ **Still testing**: Can we push to same branch multiple times?
