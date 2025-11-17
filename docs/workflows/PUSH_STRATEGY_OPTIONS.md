# Push Strategy Options for Claude Code Web

## The Constraint
**Claude Code Web runs in a sandboxed environment** - there is NO local filesystem. Every git commit must be immediately pushed to GitHub to persist.

This means:
- ❌ Cannot commit locally and push later
- ❌ Cannot accumulate commits before pushing
- ✅ Must push to GitHub for every commit we want to keep

---

## Option 1: Accept Branch Explosion (Current Approach)

### How It Works
- Each mini-batch = 1 commit = 1 push = 1 branch
- 10 orchestrators × 6-7 mini-batches = 60-70 branches
- Extract from all branches at the end

### Pros
✅ Works with sandbox constraint
✅ Incremental progress (each mini-batch saved)
✅ Small failure blast radius (lose max 5 seeds if crash)

### Cons
❌ 60-70 branches per run (already at 154)
❌ Complex extraction from many branches
❌ GitHub clutter

### Verdict
**This is what we're doing now** - it works but is messy

---

## Option 2: Push to Same Branch (Force Push)

### How It Works
```bash
# All mini-batches push to the SAME branch name
git add files
git commit -m "Mini-batch 1"
git push origin HEAD:baskets-cmn_for_eng-orch1-SESSION_ID

# Next mini-batch
git add more_files
git commit -m "Mini-batch 2"
git push origin HEAD:baskets-cmn_for_eng-orch1-SESSION_ID  # Same branch!

# Git will add commits to the existing branch
```

### Pros
✅ One branch per orchestrator (10 total instead of 600)
✅ Each push adds to same branch (accumulates commits)
✅ Final branch contains all work
✅ Clean GitHub view

### Cons
⚠️ Need to test if Claude Code allows pushing to same branch multiple times
⚠️ Each sub-agent needs to pull latest before pushing (merge conflicts?)

### Implementation
```
For each mini-batch:
1. Sub-agents generate files
2. Orchestrator does:
   git checkout baskets-cmn_for_eng-orch1-SESSION_ID  # Same branch every time
   git add files
   git commit -m "Batch X: SXXX-SYYY"
   git push origin baskets-cmn_for_eng-orch1-SESSION_ID
```

### Verdict
**Worth testing!** This could solve the branch explosion if it works.

---

## Option 3: Single Large Mini-Batch (Risky)

### How It Works
- Process all 32 seeds at once (or in 2 large batches of 16)
- One commit, one push, one branch

### Pros
✅ Minimal branches (10 total)
✅ Simple extraction

### Cons
❌ High failure risk (lose 32 seeds if crash)
❌ Might hit rate limits with 32 concurrent agents
❌ Long wait time before any progress saved

### Verdict
**Too risky** - we learned 240 concurrent sessions was too much; 32 is safer but still risky

---

## Option 4: Incremental Branch Names with Pattern

### How It Works
Use a predictable branch naming pattern:
```
baskets-cmn_for_eng-orch1-batch1-SESSION_ID
baskets-cmn_for_eng-orch1-batch2-SESSION_ID
baskets-cmn_for_eng-orch1-batch3-SESSION_ID
...
```

Modify extraction script to group by orchestrator:
```bash
# Extract all branches for orchestrator 1
git branch -r | grep "baskets-cmn_for_eng-orch1-"
```

### Pros
✅ Works with sandbox constraint
✅ Easy to track which orchestrator created which branches
✅ Simple extraction per orchestrator
✅ Predictable naming

### Cons
❌ Still many branches (60-70 per run)
❌ Doesn't reduce total branch count

### Verdict
**Better organization of current approach** - doesn't solve branch count but makes it manageable

---

## Option 5: Hub Orchestrator Pattern

### How It Works
```
Main Orchestrator (in terminal, not web)
  ↓
Spawns 10 Sub-Orchestrators (Claude Code Web)
  ↓
Each sub-orchestrator pushes mini-batches
  ↓
Main orchestrator extracts and consolidates
```

Main orchestrator runs locally (your terminal) where it CAN commit locally.

### Pros
✅ Main orchestrator can accumulate work locally
✅ Can merge branches into one before pushing to main
✅ Clean final state

### Cons
❌ Requires local Claude Code instance for main orchestrator
❌ More complex setup
❌ Still need 60-70 branches during generation

### Verdict
**Possible but complex** - doesn't eliminate intermediate branches

---

## Option 6: Post-Processing Consolidation (Recommended)

### How It Works
Accept the branch explosion during generation, but clean it up after:

**During Generation:**
- Let orchestrators create 60-70 branches each
- Extract all files as they arrive

**After Generation Complete:**
```bash
# Extract all basket files from all branches
bash extract_all_baskets.sh

# Consolidate into single file
node consolidate_cmn_baskets.cjs

# Commit consolidated file to main
git checkout main
git add public/vfs/courses/cmn_for_eng/lego_baskets.json
git commit -m "Phase 5 complete: all 668 seeds consolidated"
git push origin main

# Delete all basket branches
git branch -r | grep "baskets-cmn_for_eng" | while read branch; do
  git push origin --delete ${branch#origin/}
done
```

**Result:** Clean main branch with consolidated file, all temp branches deleted.

### Pros
✅ Works with sandbox constraint
✅ Clean final state
✅ Doesn't fight against the constraints
✅ Automated cleanup possible

### Cons
❌ Temporary branch explosion (but cleaned up after)
❌ GitHub notifications for many branches (during generation)

### Verdict
**This is the pragmatic solution** - accept temporary mess, clean up after.

---

## Recommended Approach: Option 2 + Option 6

### Test Option 2 First (Same Branch Multiple Pushes)

Try with one orchestrator:
```
Orchestrator creates branch: baskets-cmn_for_eng-test-SESSION_ID
Mini-batch 1: generate 5 seeds → push to baskets-cmn_for_eng-test-SESSION_ID
Mini-batch 2: generate 5 seeds → push to SAME baskets-cmn_for_eng-test-SESSION_ID
Check if both batches appear in the branch
```

**If it works**: Use this for all orchestrators (10 branches total!) 🎉

**If it doesn't work**: Fall back to Option 6 (accept branch explosion, clean up after)

---

## Testing Script for Option 2

```bash
# In Claude Code Web sandbox, test this:

git clone https://github.com/zenjin/ssi-dashboard-v7-clean.git
cd ssi-dashboard-v7-clean

BRANCH_NAME="baskets-cmn_for_eng-test-$CLAUDE_SESSION_ID"

# First push
echo "test1" > test1.txt
git add test1.txt
git commit -m "Test commit 1"
git push origin HEAD:$BRANCH_NAME

# Second push to SAME branch
echo "test2" > test2.txt
git add test2.txt
git commit -m "Test commit 2"
git push origin HEAD:$BRANCH_NAME  # Same branch name!

# Check if both files appear in the branch on GitHub
```

If both test1.txt and test2.txt appear in the branch on GitHub, then **Option 2 works!**

---

## Updated Orchestrator Instructions (Option 2 - if it works)

```markdown
# Phase 5 Basket Generation - Orchestrator 1

**Branch Name**: baskets-cmn_for_eng-s0343-s0374-{SESSION_ID}
**Seeds**: S0343-S0374 (32 seeds)

## Process

For each mini-batch:

1. Spawn 5 agents to generate 5 seeds
2. Wait for completion
3. Push to GitHub:
   ```bash
   git add public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S*.json
   git commit -m "Batch X: S0XXX-S0YYY"

   # Push to SAME branch every time
   git push origin HEAD:baskets-cmn_for_eng-s0343-s0374-{SESSION_ID}
   ```

Repeat for all mini-batches. All commits accumulate on the same branch!

Result: ONE branch with all 32 seeds
```

---

## Summary

| Option | Branches | Works with Sandbox | Complexity | Recommendation |
|--------|----------|-------------------|------------|----------------|
| 1. Accept explosion | 600+ | ✅ Yes | Low | Current fallback |
| 2. Same branch pushes | 10 | ✅ Yes | Low | **Test this first!** |
| 3. Large batches | 10 | ✅ Yes | Low | Too risky |
| 4. Predictable naming | 600+ | ✅ Yes | Low | Better org only |
| 5. Hub orchestrator | ~60 | Partial | High | Too complex |
| 6. Post-processing | 600→1 | ✅ Yes | Medium | **Fallback if #2 fails** |

**Action Item**: Test Option 2 with a small test case to see if multiple pushes to same branch works in Claude Code Web sandbox.
