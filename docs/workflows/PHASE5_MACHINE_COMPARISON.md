# Phase 5 Machine Comparison

Quick reference for choosing configuration based on your machine.

---

## Configuration Comparison

| Metric | Tom's Machine | Kai's Machine |
|--------|---------------|---------------|
| **RAM** | 24GB | 8GB |
| **Config File** | `automation.config.tom.json` | `automation.config.simple.json` |
| **Safari Tabs** | 15 | 5 |
| **Agents per Tab** | 10 | 10 |
| **Seeds per Agent** | 5 | 5 |
| **Capacity** | 750 seeds | 250 seeds |
| **Multiplier** | 3× Kai's config | 1× (base) |
| **Strategy** | One-shot | 3 waves |
| **Time (full course)** | ~40 min | ~2 hours |
| **RAM Usage** | ~6GB | ~2GB |
| **Parallel Workers** | 150 | 50 |

---

## Speed Breakdown

### Tom's One-Shot (668 seeds)
```
15 tabs spawn simultaneously (3× Kai's proven ratio)
  ↓ Each spawns 10 agents (in-conversation)
  ↓ 150 agents work in parallel
  ↓ Each agent: 5 seeds × ~3 min = ~15 min
  ↓ All parallel = ~40 min total

Total: 40 minutes ⚡

(Same proven 10×5 ratio as Kai, just 3× more tabs)
```

### Kai's Wave-Based (3 × 250 seeds)
```
Wave 1: 250 seeds
  5 tabs × 10 agents × 5 seeds = 250
  Time: ~40 min

Wave 2: 250 seeds
  Time: ~40 min

Wave 3: 168 seeds (final)
  Time: ~30 min

Total: ~110 minutes (1h 50min)
```

**Tom's machine is 2.4× faster** ⚡

---

## When to Use Which

### Use Tom's Config When:
- ✅ You have 24GB RAM
- ✅ You want full course in one shot
- ✅ Speed is priority (3× faster)
- ✅ You can monitor one ~40 min session
- ✅ You want to use Kai's proven 10×5 ratio (just scaled)

### Use Kai's Config When:
- ✅ You have 8GB RAM
- ✅ You want checkpoints between waves
- ✅ You want to validate incrementally
- ✅ You prefer shorter sessions

---

## How to Switch Configs

### Option 1: Environment Variable
```bash
# Tom's machine
export SSI_CONFIG=automation.config.tom.json
npm run phase5:start

# Kai's machine
export SSI_CONFIG=automation.config.simple.json
npm run phase5:start
```

### Option 2: API Parameter
```bash
# Tom's one-shot (3× Kai's ratio)
curl -X POST http://localhost:3000/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "target": "Spanish",
    "known": "English",
    "startSeed": 1,
    "endSeed": 668,
    "browserWindows": 15,
    "agentsPerWindow": 10,
    "seedsPerAgent": 5
  }'

# Kai's wave
curl -X POST http://localhost:3000/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "target": "Spanish",
    "known": "English",
    "startSeed": 1,
    "endSeed": 250,
    "browserWindows": 5,
    "agentsPerWindow": 10,
    "seedsPerAgent": 5
  }'
```

---

## RAM Monitoring

### Tom's Machine
```bash
# Should stay under 35% on 16GB
watch -n 5 'ps aux | grep Safari | awk "{sum+=\$4} END {print sum \"%\"}"'
```

### Kai's Machine
```bash
# Should stay under 30% on 8GB
watch -n 5 'ps aux | grep Safari | awk "{sum+=\$4} END {print sum \"%\"}"'
```

---

## Cost Analysis (Already Paid!)

Both use the same **$200/month Pro Max subscription**:
- Unlimited browser usage
- Extended thinking
- No per-token API costs

**Tom's faster setup doesn't cost more!** Just uses more local RAM.

---

## Scalability

### Adding More Machines

If you get a 3rd machine (e.g., cloud instance):

**Option A: Parallel Courses**
- Tom's machine: Spanish course (668 seeds)
- Kai's machine: Mandarin course (668 seeds)
- Cloud machine: Welsh course (668 seeds)

**Option B: Distributed Single Course**
- Tom: Seeds 1-300
- Kai: Seeds 301-600
- Cloud: Seeds 601-668

Coordination via shared staging directory (git/Vercel).

---

**Last updated:** 2025-11-18
