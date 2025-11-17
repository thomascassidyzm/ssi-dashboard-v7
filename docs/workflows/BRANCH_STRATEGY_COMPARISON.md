# Branch Strategy Comparison

## Current Approach (Push per Mini-Batch)

### How It Works
- Each mini-batch (3-5 seeds) = 1 branch
- 10 agents × 6 mini-batches = 60 branches per orchestrator
- 24 orchestrators = **1,440 potential branches** 😱

### Problems
1. **Branch explosion**: Currently 154 branches and counting
2. **Harder to track**: Which branches belong to which orchestrator?
3. **More git operations**: 60+ pushes per orchestrator
4. **Merge complexity**: Need to extract from 1,400+ branches
5. **GitHub clutter**: Hard to see what's complete

### Current State
```bash
git branch -r | grep baskets-cmn_for_eng
# Returns 154 branches like:
origin/claude/baskets-cmn_for_eng-window-1-s0003-s0004-01AEN...
origin/claude/baskets-cmn_for_eng-window-1-s0073-s0075-019MZ...
origin/claude/baskets-cmn_for_eng-window-1-s0103-s0105-011mg...
# ... 151 more
```

---

## Proposed Approach (One Branch per Orchestrator)

### How It Works
```
1. Orchestrator spawns all its agents (in mini-batches for safety)
2. Each agent commits files locally (no push)
3. After ALL agents complete, orchestrator does ONE push
4. Result: 24 orchestrators = 24 branches maximum
```

### Benefits
1. ✅ **24 branches total** instead of 1,440
2. ✅ **Easy tracking**: One branch = one orchestrator window
3. ✅ **Atomic completion**: Branch exists = all seeds done
4. ✅ **Simpler extraction**: Extract from 24 branches, not 1,440
5. ✅ **Cleaner GitHub**: Easy to see progress at a glance
6. ✅ **Better recovery**: If orchestrator fails, just re-run that one

### Branch Naming
```
claude/baskets-cmn_for_eng-orchestrator-01-<SESSION_ID>
claude/baskets-cmn_for_eng-orchestrator-02-<SESSION_ID>
...
claude/baskets-cmn_for_eng-orchestrator-24-<SESSION_ID>
```

Or with seed ranges:
```
claude/baskets-cmn_for_eng-s0343-s0374-<SESSION_ID>  (Orchestrator 1: 32 seeds)
claude/baskets-cmn_for_eng-s0375-s0406-<SESSION_ID>  (Orchestrator 2: 32 seeds)
...
```

---

## Implementation Strategy

### Orchestrator Prompt Pattern

```markdown
# Phase 5 Basket Generation - Orchestrator X

**Session ID**: <ORCHESTRATOR_SESSION_ID>
**Seeds to Process**: S0343-S0374 (32 seeds)
**Target Branch**: claude/baskets-cmn_for_eng-s0343-s0374-<ORCHESTRATOR_SESSION_ID>

## Execution Plan

### Step 1: Clone and Setup
```bash
git clone https://github.com/user/repo.git
cd repo
git checkout -b baskets-cmn_for_eng-s0343-s0374-<ORCHESTRATOR_SESSION_ID>
```

### Step 2: Process Seeds in Mini-Batches

For each mini-batch of 5 seeds:
1. Spawn 5 agents in parallel
2. Each agent generates its basket file
3. Wait for all 5 to complete
4. Commit locally (DO NOT PUSH YET):
   ```bash
   git add public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S*.json
   git commit -m "Mini-batch X: S0XXX-S0YYY complete"
   ```

Repeat for all 6-7 mini-batches until all 32 seeds are done.

### Step 3: Single Push at End

After ALL mini-batches complete:
```bash
# Verify all files are present
ls public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S0{343..374}_baskets.json | wc -l
# Should show: 32

# Single push with all work
git push origin baskets-cmn_for_eng-s0343-s0374-<ORCHESTRATOR_SESSION_ID>
```

### Step 4: Verify
Check that branch appears on GitHub with all 32 seed files.
```

---

## Safety Considerations

### Pros
- ✅ Single point of failure is better than 60 points
- ✅ If push fails, just retry once (not 60 times)
- ✅ Can verify completeness before pushing
- ✅ Easier to debug: one branch = one orchestrator's work

### Cons
- ⚠️ If orchestrator crashes mid-run, lose all work (not just one mini-batch)
- ⚠️ One failed push = retry all 32 seeds (not just 5)

### Mitigation
- **Commit frequently locally** (after each mini-batch)
- **If orchestrator crashes**: Can manually push the local commits
- **Progress tracking**: Orchestrator reports after each mini-batch
- **Backup strategy**: Could still push every 2-3 mini-batches if desired

---

## Hybrid Approach (Recommended)

**Push every N mini-batches** to balance atomic updates with recovery:

```
Mini-batches 1-3 (15 seeds) → Push to -part1 branch
Mini-batches 4-6 (15 seeds) → Push to -part2 branch
```

This gives:
- 24 orchestrators × 2 pushes = **48 branches** (still manageable)
- Smaller failure blast radius
- Still much better than 1,440 branches

---

## Updated Orchestrator Template

```markdown
# Phase 5 Basket Generation - Orchestrator 1

**Session ID**: <ORCHESTRATOR_SESSION_ID>
**Seeds**: S0343-S0374 (32 seeds)
**Branch**: claude/baskets-cmn_for_eng-s0343-s0374-<SESSION_ID>

## Process

1. **Setup**
   ```bash
   git clone https://github.com/zenjin/ssi-dashboard-v7-clean.git
   cd ssi-dashboard-v7-clean
   git checkout -b baskets-cmn_for_eng-s0343-s0374-<SESSION_ID>
   ```

2. **Process all 32 seeds in mini-batches of 5**

   For each mini-batch:
   - Spawn 5 agents in parallel
   - Each generates 1 seed basket
   - Wait for completion
   - Commit locally:
     ```bash
     git add public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S*.json
     git commit -m "Batch X/7: S0XXX-S0YYY"
     ```

3. **Final Push (after all 7 mini-batches)**
   ```bash
   # Verify completion
   count=$(ls public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S0{343..374}_baskets.json 2>/dev/null | wc -l)
   echo "Generated $count / 32 seeds"

   # Push everything at once
   git push origin baskets-cmn_for_eng-s0343-s0374-<SESSION_ID>
   ```

4. **Report Success**
   "✅ All 32 seeds (S0343-S0374) generated and pushed to branch: baskets-cmn_for_eng-s0343-s0374-<SESSION_ID>"

## Critical Points

- ❌ DO NOT push after each mini-batch
- ✅ DO commit after each mini-batch (local only)
- ✅ DO single push at the end
- ✅ DO verify count before pushing
- ✅ DO use orchestrator session ID in branch name
```

---

## Comparison Summary

| Metric | Current (Per Mini-Batch) | Proposed (Per Orchestrator) | Hybrid (Every 3 Batches) |
|--------|-------------------------|----------------------------|-------------------------|
| Branches per orchestrator | 60 | 1 | 2 |
| Total branches (24 orch) | 1,440 | 24 | 48 |
| Pushes per orchestrator | 60 | 1 | 2 |
| Recovery complexity | High | Low | Medium |
| Failure blast radius | 5 seeds | 32 seeds | 15 seeds |
| GitHub readability | Poor | Excellent | Good |
| Extraction complexity | Very High | Very Low | Low |

**Recommendation**: Use **Proposed (One Branch per Orchestrator)** approach for next run.
