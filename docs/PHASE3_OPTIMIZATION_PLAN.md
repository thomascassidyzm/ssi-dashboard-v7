# Phase 3 Optimization Plan: Sustainable Multi-Course Pipeline

## Goal: Reliable pipeline for producing multiple courses per week

**Model**: Sonnet 4.5 (generous rate limits on Pro Max)
**Accounts**: 2x Pro Max ($200/month each)
**Bottlenecks**: Not token budget - it's architecture and reliability

---

## Current State Analysis

### zho_for_eng Course Stats
- **260 seeds** (complete)
- **1,395 total LEGOs**
- **1,228 NEW LEGOs** (need baskets)
- **925 completed** (75.3%)
- **303 missing** (24.7%)
- **~5.4 LEGOs per seed** average

### Current Configuration
- **Standard**: 13 workers × 10 LEGOs = 130 LEGOs per Master batch
- **Resume**: 13 workers × 5 LEGOs = 65 LEGOs per Master batch

### Failure Modes Observed
1. **32k output limit on MASTER** - Spawning 13 workers in one message exceeds limit
2. **ngrok disconnections** - Intermittent orchestrator connectivity
3. **Browser spawn failures** - Safari less reliable than CLI
4. **Data integrity issues** - Non-contiguous LEGOs, vocabulary mismatches
5. **Assignment errors** - LEGOs marked `new: false` incorrectly

---

## The Real Bottleneck: Master Spawn Output Limit

### Why 13 Workers Fails

The Master tries to spawn 13 workers in ONE message using 13 Task tool calls:

```
13 workers × ~3k tokens per Task call = ~39k output tokens
32k limit = FAIL
```

### Worker Output is Fine

Individual workers with 10 LEGOs are well within limits:
- Worker prompt: ~2k tokens input
- 10 LEGOs × 10 phrases × ~30 tokens = ~3k output
- Extended thinking: ~5k
- Total worker output: ~8-10k (safe)

**The problem is the MASTER, not the workers.**

---

## Architecture Fix: Batched Master Spawning

### Current (Broken)
```
Master Message 1:
  → Spawn Worker 1 (Task tool)
  → Spawn Worker 2 (Task tool)
  → ...
  → Spawn Worker 13 (Task tool)
  = 39k tokens = EXCEEDS 32k LIMIT
```

### Proposed (Working)
```
Master Message 1:
  → Spawn Workers 1-5 (5 Task tools)
  = ~15k tokens = OK

Master Message 2:
  → Spawn Workers 6-10 (5 Task tools)
  = ~15k tokens = OK

Master Message 3:
  → Spawn Workers 11-13 (3 Task tools)
  = ~9k tokens = OK
```

### Configuration Change

```javascript
// OLD
const WORKERS_PER_MASTER_BATCH = 13;  // All at once

// NEW
const WORKERS_PER_SPAWN_MESSAGE = 5;  // Batched spawning
const TOTAL_WORKERS = 13;
// Master sends 3 messages to spawn all 13 workers
```

---

## Spawning Strategy: CLI vs Browser

### Comparison

| Aspect | Browser (Safari) | CLI (iTerm2) |
|--------|------------------|--------------|
| Spawn speed | 8s delay required | Instant |
| Reliability | Tab failures common | Very stable |
| Parallelism | Limited by tabs | True parallel |
| ngrok dependency | Yes | Yes (but can be local) |
| Monitoring | Visual in browser | Terminal logs |

### Recommendation: Hybrid Approach

1. **CLI for Workers** - Spawn workers via iTerm2 for reliability
2. **Browser for Monitoring** - Keep orchestrator dashboard open
3. **Local fallback** - Workers can write to staging if ngrok fails

### CLI Spawning Benefits
- No 8-second delays between spawns
- No tab creation failures
- Can run headless/background
- Better error recovery

---

## Sustainable Pipeline Design

### Phase Overview (Per Course)

| Phase | Description | Claude Usage | Time |
|-------|-------------|--------------|------|
| Phase 1 | Translation + LEGO Extraction | Medium | 1-2 hrs |
| Phase 2 | Conflict Resolution | Light | 30 min |
| Phase 3 | Basket Generation | **Heavy** | 2-3 hrs |
| Phase 8 | Audio Generation (TTS) | Minimal (API) | 1-2 hrs |
| Phase 9 | Manifest Compilation | Minimal | 15 min |
| **Total** | | | **5-8 hrs** |

### Recommended Configuration

```javascript
const phase3Config = {
  // Worker settings
  legos_per_worker: 10,        // Sweet spot - not too fast, reliable
  total_workers: 13,           // Per master batch

  // Master batching (to avoid 32k limit)
  workers_per_spawn_message: 5, // Spawn in batches of 5
  spawn_messages_per_master: 3, // 5 + 5 + 3 = 13 workers

  // Spawning method
  primary_method: "cli",        // iTerm2 for reliability
  fallback_method: "browser",   // Safari if needed

  // Timing
  spawn_delay_ms: 1000,         // Between CLI spawns
  batch_cooldown_ms: 30000,     // Between master batches
};
```

### Batch Math for 260-Seed Course

```
1,228 NEW LEGOs ÷ 10 LEGOs/worker = 123 workers needed
123 workers ÷ 13 workers/master = 10 master batches

Per master batch:
  - 13 workers × 10 LEGOs = 130 LEGOs
  - Time: ~15-20 minutes

Full Phase 3:
  - 10 master batches × 20 min = ~3-4 hours
```

---

## Multi-Course Pipeline Strategy

### Option A: Sequential (Simple)

```
Account 1: Course A (all phases) → Course B (all phases) → ...
Account 2: Course C (all phases) → Course D (all phases) → ...
```

**Pros**: Simple, no coordination needed
**Cons**: Underutilizes accounts during light phases

### Option B: Pipelined (Optimized)

```
Day 1:
  Account 1: Course A Phase 1-2
  Account 2: Course B Phase 1-2

Day 2:
  Account 1: Course A Phase 3 (heavy)
  Account 2: Course B Phase 3 (heavy)

Day 3:
  Account 1: Course A Phase 8-9 + Course C Phase 1-2
  Account 2: Course B Phase 8-9 + Course D Phase 1-2
```

**Pros**: Better utilization, more throughput
**Cons**: Requires coordination/scheduling

### Weekly Capacity Estimate

With Sonnet 4.5 (generous limits), the constraint is **time, not tokens**:

| Scenario | Courses/Week | Notes |
|----------|--------------|-------|
| Conservative | 4 courses | 2 per account, sequential |
| Moderate | 6 courses | Pipelined, some parallel |
| Aggressive | 8 courses | Full pipeline optimization |

**Realistic target: 4-6 complete courses per week**

---

## Implementation Changes Required

### 1. Update Master Prompt (Batched Spawning)

The master prompt needs to spawn workers in batches of 5, not all 13 at once:

```markdown
## SPAWN WORKERS (BATCHED TO AVOID TOKEN LIMIT)

You have {{TOTAL_WORKERS}} workers to spawn. Spawn them in batches:

**Batch 1**: Spawn workers 1-5 (5 Task tools in ONE message)
**Batch 2**: Spawn workers 6-10 (5 Task tools in ONE message)
**Batch 3**: Spawn workers 11-13 (3 Task tools in ONE message)

Wait for each batch's Task tools to be accepted before sending the next batch.
```

### 2. Update automation.config.json

```json
{
  "phase3_basket_generation": {
    "legos_per_worker": 10,
    "workers_per_master": 13,
    "workers_per_spawn_batch": 5,
    "spawn_method": "cli_preferred",
    "spawn_delay_ms": 1000,
    "comment": "13 workers × 10 LEGOs = 130 per master. Spawn in batches of 5 to stay under 32k."
  }
}
```

### 3. CLI Spawner Improvements

- Health check orchestrator before starting
- Automatic retry with exponential backoff on ngrok failure
- Local staging fallback if orchestrator unreachable
- Progress tracking via staging file count

---

## Completing the Missing 303 LEGOs (zho_for_eng)

### Immediate Action Plan

1. **Identify missing LEGOs**:
```bash
node tools/validators/find-missing-baskets.cjs zho_for_eng
```

2. **Create targeted resume batch**:
```
303 LEGOs ÷ 10 LEGOs/worker = 31 workers needed
31 workers ÷ 13 workers/master = 3 master batches (13 + 13 + 5)
```

3. **Run with batched spawning**:
- Master spawns 5 workers at a time (not 13)
- CLI mode for reliability
- Monitor via orchestrator dashboard

### Estimated Time
- **Per master batch**: 15-20 minutes
- **3 master batches**: ~45-60 minutes total
- **Buffer for retries**: +15 minutes
- **Total**: ~1 hour

---

## Reliability Improvements

### ngrok Stability

The ngrok tunnel dropping is a recurring issue. Options:

1. **Paid ngrok** - More stable, reserved subdomain
2. **Self-hosted tunnel** - Cloudflare Tunnel or similar
3. **Local-first** - Workers write to staging files, orchestrator merges later

### Error Recovery

Workers should handle orchestrator failures gracefully:

```javascript
// Pseudo-code for worker resilience
async function submitBasket(basket) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await fetch(`${ORCHESTRATOR_URL}/upload-basket`, { ... });
      return; // Success
    } catch (e) {
      if (attempt === 3) {
        // Fallback: write to local staging
        await writeToLocalStaging(basket);
      } else {
        await sleep(attempt * 5000); // Exponential backoff
      }
    }
  }
}
```

---

## Summary

| Issue | Root Cause | Fix |
|-------|------------|-----|
| 32k token limit | Master spawning 13 workers in 1 message | Batch spawns (5 at a time) |
| ngrok dropouts | Unreliable tunnel | CLI mode + local fallback |
| Browser failures | Safari tab limits | CLI-first spawning |
| Unpredictable timing | Variable work per agent | Fixed 10 LEGOs/worker |

### Key Metrics

| Metric | Value |
|--------|-------|
| LEGOs per worker | 10 |
| Workers per master | 13 |
| Workers per spawn batch | 5 |
| LEGOs per master batch | 130 |
| Time per master batch | ~15-20 min |
| Courses per week (realistic) | 4-6 |

---

## Next Steps

1. [ ] Update master prompt template with batched spawning
2. [ ] Update automation.config.json
3. [ ] Create find-missing-baskets.cjs validator
4. [ ] Test batched spawning on small batch (1 master, 13 workers)
5. [ ] Run resume job for 303 missing LEGOs
6. [ ] Document CLI spawning workflow

---

*Created: 2026-01-10*
*Status: Ready for review and implementation*
