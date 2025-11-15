# Phase 5 Quickstart Guide

Generate practice baskets for a course using the new layered automation system.

## Prerequisites

**Input:** `lego_pairs.json` and `seed_pairs.json` (from Phase 1 and Phase 3)
**Output:** `lego_baskets.json` (minimal metadata, ready for git/Vercel)

## Setup (One-Time)

1. **Configure VFS path:**
   ```bash
   cp .env.example .env.automation
   nano .env.automation
   ```

   Set your VFS_ROOT:
   ```bash
   # For production (your actual SSi_Course_Production folder)
   VFS_ROOT=/Users/yourname/path/to/SSi_Course_Production

   # For testing (local public/vfs)
   VFS_ROOT=/Users/yourname/path/to/ssi-dashboard-v7-clean/public/vfs/courses
   ```

2. **Test the pipeline:**
   ```bash
   ./test-phase5-pipeline.sh
   ```

   You should see:
   ```
   ✅ All scripts have valid syntax
   ✅ Course data found (668 seeds, 2487 LEGOs)
   ✅ Parallelization strategies calculated
   ✅ Metadata stripping works
   🚀 Phase 5 pipeline is ready!
   ```

## Running Phase 5

### Step 1: Start Automation Services

```bash
npm run automation
```

You should see:
```
✅ Orchestrator listening on port 3456
✅ Phase 1 (Translation) (STUB) listening on port 3457
✅ Phase 3 (LEGO Extraction) (STUB) listening on port 3458
✅ Phase 5 (Baskets) listening on port 3459
✅ Phase 6 (Introductions) (STUB) listening on port 3460
✅ Phase 8 (Audio) (STUB) listening on port 3461
```

### Step 2: Trigger Phase 5

**Option A: Balanced Strategy (Recommended)**
```bash
curl -X POST http://localhost:3459/start \
  -H 'Content-Type: application/json' \
  -d '{
    "courseCode": "spa_for_eng",
    "totalSeeds": 668,
    "strategy": "balanced"
  }'
```

**Option B: Conservative Strategy (Lower RAM)**
```bash
curl -X POST http://localhost:3459/start \
  -H 'Content-Type: application/json' \
  -d '{
    "courseCode": "spa_for_eng",
    "totalSeeds": 668,
    "strategy": "conservative"
  }'
```

**Option C: Fast Strategy (Higher RAM)**
```bash
curl -X POST http://localhost:3459/start \
  -H 'Content-Type: application/json' \
  -d '{
    "courseCode": "spa_for_eng",
    "totalSeeds": 668,
    "strategy": "fast"
  }'
```

**Option D: Custom Strategy**
```bash
curl -X POST http://localhost:3459/start \
  -H 'Content-Type: application/json' \
  -d '{
    "courseCode": "spa_for_eng",
    "totalSeeds": 668,
    "strategy": "custom",
    "browserWindows": 20,
    "agentsPerWindow": 10,
    "seedsPerAgent": 5
  }'
```

### Step 3: Monitor Progress

**Check Phase 5 server status:**
```bash
curl http://localhost:3459/status/spa_for_eng
```

**Check waiting branches:**
```bash
curl http://localhost:3459/branches
```

**Health check all services:**
```bash
curl http://localhost:3456/health/all
```

## What Happens

### Parallelization (Balanced Strategy Example)

```
10 Browser Windows
├─ Window 1: Seeds 1-70
│  ├─ Agent 1: Seeds 1-7   → claude/baskets-spa_for_eng-w01-agent-01
│  ├─ Agent 2: Seeds 8-14  → claude/baskets-spa_for_eng-w01-agent-02
│  ├─ ... (10 agents total)
│  └─ Agent 10: Seeds 64-70
│
├─ Window 2: Seeds 71-140
│  └─ ... (10 agents)
│
└─ ... (10 windows total = 100 agents)
```

### Workflow

1. **Phase 5 server spawns 10 browser windows**
   - Each window opens Claude Code in a new browser tab
   - Staggered by 3 seconds to avoid overwhelming the system

2. **Each window spawns 10 Task agents in parallel**
   - Window receives an "orchestrator prompt"
   - Makes 10 Task tool calls in a single message
   - All 10 agents run simultaneously

3. **Each agent generates baskets**
   - Loads LEGOs from `lego_pairs.json`
   - Generates practice baskets for its 7 seeds
   - Writes output to `staging/w##-agent-##.json`

4. **Each agent pushes to its branch**
   - Runs: `node scripts/push_segment.cjs staging/w##-agent-##.json`
   - Script automatically strips metadata (99.5% size reduction)
   - Pushes to `claude/baskets-spa_for_eng-w##-agent-##`

5. **Branch watcher detects all 100 branches**
   - Runs in background, checking every 10 seconds
   - When all 100 branches detected, triggers merge

6. **Auto-merge**
   - Pulls all 100 segment files
   - Merges into single `lego_baskets.json`
   - Pushes to main branch
   - Triggers Vercel deployment
   - Deletes all 100 claude/baskets-* branches

7. **Phase 5 server notifies orchestrator**
   - POST to `http://localhost:3456/phase-complete`
   - Orchestrator logs completion
   - Ready for Phase 6

## Parallelization Strategies

| Strategy | Windows | Agents/Win | Seeds/Agent | Total Agents | RAM Use | Speed |
|----------|---------|------------|-------------|--------------|---------|-------|
| **conservative** | 7 | 10 | 10 | 70 | Low ⭐ | Slower |
| **balanced** | 10 | 10 | 7 | 100 | Medium ⭐⭐ | Good |
| **fast** | 14 | 10 | 5 | 140 | Higher ⭐⭐⭐ | Faster |
| **custom** | You choose | You choose | You choose | Calculated | Depends | Depends |

**For 668 seeds:**
- All strategies have 700 capacity (covers all seeds)
- Choose based on your machine's RAM
- Balanced is recommended for most machines

## Troubleshooting

### Branches not merging

**Check if all branches exist:**
```bash
git fetch --all
git branch -r | grep "claude/baskets-spa_for_eng"
```

**Manually trigger merge:**
```bash
curl -X POST http://localhost:3459/merge \
  -H 'Content-Type: application/json' \
  -d '{"courseCode": "spa_for_eng"}'
```

### Too many browser windows

Use a more conservative strategy:
```bash
# Change from 'balanced' to 'conservative'
curl -X POST http://localhost:3459/start \
  -H 'Content-Type: application/json' \
  -d '{
    "courseCode": "spa_for_eng",
    "totalSeeds": 668,
    "strategy": "conservative"
  }'
```

### Memory issues

Reduce parallelization:
```bash
curl -X POST http://localhost:3459/start \
  -H 'Content-Type: application/json' \
  -d '{
    "courseCode": "spa_for_eng",
    "totalSeeds": 668,
    "strategy": "custom",
    "browserWindows": 5,
    "agentsPerWindow": 10,
    "seedsPerAgent": 14
  }'
```

### Phase 5 server not responding

```bash
# Check if it's running
curl http://localhost:3459/health

# Restart automation
# Press Ctrl+C in terminal running npm run automation
npm run automation
```

## Output Files

### Final Output
```
public/vfs/courses/spa_for_eng/lego_baskets.json
```

**Size:** ~5MB (after metadata stripping)
**Format:**
```json
{
  "version": "1.0.0",
  "phase": "5",
  "methodology": "Phase 5 Practice Basket Generation",
  "generated_at": "2025-11-15T...",
  "course": "spa_for_eng",
  "seeds_processed": ["S0001", "S0002", ...],
  "total_baskets": 2716,
  "baskets": {
    "S0001L01": {
      "practice_phrases": [...],
      "distribution": {...},
      "_metadata": {
        "lego_id": "S0001L01",
        "seed_context": {"target": "...", "known": "..."}
      }
    },
    ...
  }
}
```

**Metadata stripped:**
- ✅ Keeps: `lego_id`, `seed_context`, practice phrases
- ❌ Removes: `whitelist_pairs` (3000+ entries), `available_whitelist_size`, `current_seed_legos_available`
- 📉 Result: 350MB → 5MB (98.5% reduction)

### Working Files (Not Committed)
```
staging/w01-agent-01.json
staging/w01-agent-02.json
... (100 files)
```

These are gitignored and only exist during generation.

## Next Steps

After Phase 5 completes:

1. **Verify output:**
   ```bash
   jq '.total_baskets' public/vfs/courses/spa_for_eng/lego_baskets.json
   # Should show: 2716
   ```

2. **Check file size:**
   ```bash
   ls -lh public/vfs/courses/spa_for_eng/lego_baskets.json
   # Should be ~5MB
   ```

3. **Commit to git:**
   ```bash
   git add public/vfs/courses/spa_for_eng/lego_baskets.json
   git commit -m "feat: Phase 5 complete - 2,716 baskets generated"
   git push
   ```

4. **Vercel auto-deploys:**
   - Detects the push to main
   - Rebuilds and deploys
   - Dashboard now shows baskets: https://ssi-dashboard-v7.vercel.app

5. **Proceed to Phase 6** (introductions)

## Advanced: Running Multiple Courses

Phase 5 can run multiple courses simultaneously (if you have enough RAM):

```bash
# Terminal 1: Spanish course
curl -X POST http://localhost:3459/start \
  -d '{"courseCode": "spa_for_eng", "totalSeeds": 668, "strategy": "balanced"}'

# Terminal 2: German course
curl -X POST http://localhost:3459/start \
  -d '{"courseCode": "deu_for_eng", "totalSeeds": 10, "strategy": "conservative"}'
```

The branch watcher tracks them separately:
- `claude/baskets-spa_for_eng-*`
- `claude/baskets-deu_for_eng-*`
