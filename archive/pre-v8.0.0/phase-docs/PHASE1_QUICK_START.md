# Phase 1 Orchestration - Quick Start Guide

**30-second guide to using the new Phase 1 parallel orchestration**

---

## What Changed?

**Old Way** (11 hours):
```bash
POST /api/courses/generate  # Single agent translates all 668 seeds
→ Wait 11 hours
→ Done
```

**New Way** (18 minutes):
```bash
POST /api/courses/{code}/phase/1/prepare      # Split into 5 batches
POST /api/courses/{code}/phase/1/orchestrate  # Spawn 5 × 10 = 50 agents
→ Wait 18 minutes
POST /api/courses/{code}/phase/1/validate     # Merge + consistency check
→ Done
```

---

## Basic Usage

### 1. Quick Run (Default Settings)

```bash
COURSE="spa_for_eng"

# Prepare
curl -X POST http://localhost:3456/api/courses/$COURSE/phase/1/prepare \
  -H "Content-Type: application/json"

# Orchestrate (spawns 5 orchestrators, 30s delays)
curl -X POST http://localhost:3456/api/courses/$COURSE/phase/1/orchestrate \
  -H "Content-Type: application/json"

# Wait ~15 minutes, then validate
curl -X POST http://localhost:3456/api/courses/$COURSE/phase/1/validate \
  -H "Content-Type: application/json"
```

### 2. Check Progress

```bash
# Poll every 30 seconds
curl http://localhost:3456/api/courses/$COURSE/phase/1/orchestrators/status | jq '.all_complete'

# When true, run validation
```

---

## Custom Settings

### More Orchestrators (Faster, More RAM)
```bash
curl -X POST http://localhost:3456/api/courses/$COURSE/phase/1/prepare \
  -H "Content-Type: application/json" \
  -d '{"numOrchestrators": 10}'  # 10 × 10 = 100 agents!

curl -X POST http://localhost:3456/api/courses/$COURSE/phase/1/orchestrate \
  -H "Content-Type: application/json" \
  -d '{"numOrchestrators": 10, "delayBetweenSpawns": 20000}'
```

### Fewer Orchestrators (Slower, Less RAM)
```bash
curl -X POST http://localhost:3456/api/courses/$COURSE/phase/1/prepare \
  -H "Content-Type: application/json" \
  -d '{"numOrchestrators": 2}'  # 2 × 10 = 20 agents

curl -X POST http://localhost:3456/api/courses/$COURSE/phase/1/orchestrate \
  -H "Content-Type: application/json" \
  -d '{"numOrchestrators": 2}'
```

---

## Complete Automation Script

```bash
#!/bin/bash

COURSE="spa_for_eng"
ORCH_COUNT=5

echo "🔧 Phase 1: Prepare"
curl -s -X POST http://localhost:3456/api/courses/$COURSE/phase/1/prepare \
  -H "Content-Type: application/json" \
  -d "{\"numOrchestrators\": $ORCH_COUNT}" | jq .

echo ""
echo "🚀 Phase 1: Orchestrate ($ORCH_COUNT orchestrators)"
curl -s -X POST http://localhost:3456/api/courses/$COURSE/phase/1/orchestrate \
  -H "Content-Type: application/json" \
  -d "{\"numOrchestrators\": $ORCH_COUNT}" | jq .

echo ""
echo "⏳ Waiting for orchestrators to complete..."

# Poll until complete
while true; do
  STATUS=$(curl -s http://localhost:3456/api/courses/$COURSE/phase/1/orchestrators/status)
  ALL_COMPLETE=$(echo $STATUS | jq -r '.all_complete')
  CHUNKS_READY=$(echo $STATUS | jq -r '.chunks_ready')

  echo "Progress: $CHUNKS_READY/$ORCH_COUNT chunks complete"

  if [ "$ALL_COMPLETE" = "true" ]; then
    echo "✅ All orchestrators complete!"
    break
  fi

  sleep 30
done

echo ""
echo "🔍 Phase 1: Validate"
curl -s -X POST http://localhost:3456/api/courses/$COURSE/phase/1/validate \
  -H "Content-Type: application/json" | jq .

echo ""
echo "⏳ Waiting for validation (check vfs/courses/$COURSE/seed_pairs.json)..."
```

Save as `phase1_orchestrate.sh` and run:
```bash
chmod +x phase1_orchestrate.sh
./phase1_orchestrate.sh
```

---

## Verification

After completion, verify:

```bash
# Check seed_pairs.json exists
ls -lh vfs/courses/$COURSE/seed_pairs.json

# Count translations
cat vfs/courses/$COURSE/seed_pairs.json | jq '.translations | length'
# Should output: 668

# Check chunks created
ls -lh vfs/courses/$COURSE/orchestrator_batches/phase1/chunk_*.json
# Should list: chunk_01.json through chunk_05.json
```

---

## Troubleshooting

**Problem**: Orchestrator stuck?
```bash
# Check which are pending
curl http://localhost:3456/api/courses/$COURSE/phase/1/orchestrators/status | jq '.pending'

# Check iTerm2/Warp windows manually
# Look for errors in agent output
```

**Problem**: Validation fails?
```bash
# Check if all chunks exist
ls vfs/courses/$COURSE/orchestrator_batches/phase1/chunk_*.json

# Check chunk content
cat vfs/courses/$COURSE/orchestrator_batches/phase1/chunk_01.json | jq '.translations | length'
```

**Problem**: Need to restart?
```bash
# Clear job state
curl -X DELETE http://localhost:3456/api/courses/$COURSE/status

# Delete orchestrator batches
rm -rf vfs/courses/$COURSE/orchestrator_batches

# Start over
```

---

## When to Use Orchestration vs. Single Agent?

**Use Orchestration** (New Way):
- ✅ Full course (668 seeds)
- ✅ Speed is critical
- ✅ Have sufficient RAM (~3GB)
- ✅ Want to leverage parallelism

**Use Single Agent** (Old Way):
- ✅ Testing (1-50 seeds)
- ✅ Low-resource environment
- ✅ Debugging specific issues
- ✅ Simpler workflow

Both methods produce identical output!

---

## API Reference (Quick)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/phase/1/prepare` | POST | Split seeds into batches |
| `/phase/1/orchestrate` | POST | Spawn orchestrators |
| `/phase/1/orchestrators/status` | GET | Check progress |
| `/phase/1/validate` | POST | Merge + validate |

---

## Performance

| Metric | Single Agent | Orchestration |
|--------|--------------|---------------|
| Time (668 seeds) | 11 hours | 18 minutes |
| Concurrent Agents | 1 | 50 |
| RAM Usage | 500MB | 3GB |
| Speedup | 1x | **36.7x** |

---

**That's it!** You're ready to use Phase 1 orchestration. 🚀

For detailed documentation, see `PHASE1_ORCHESTRATION_INTEGRATION.md`.
