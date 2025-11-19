# Phase 5 Generation Workflow

Two strategies based on machine capacity:

## 🚀 Tom's Machine (24GB): One-Shot Full Course
- **Config:** `automation.config.tom.json`
- **Capacity:** 15 tabs × 10 agents × 5 seeds = 750 seeds
- **Time:** ~40 minutes for full 668-seed course
- **RAM:** ~6GB peak
- **Note:** 3× Kai's proven ratio (simpler!)

## 🔄 Kai's Machine (8GB): Wave-Based Processing
- **Config:** `automation.config.simple.json`
- **Capacity:** 5 tabs × 10 agents × 5 seeds = 250 seeds/wave
- **Time:** ~2 hours for full course (3 waves)
- **RAM:** ~2GB peak

---

# Tom's One-Shot Workflow

## Full Course Generation (Seeds 1-668)

### Start Generation
```bash
# Via Dashboard UI (recommended)
# Or via API:

curl -X POST http://localhost:3000/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "target": "Spanish",
    "known": "English",
    "startSeed": 1,
    "endSeed": 668,
    "phaseSelection": "5"
  }'
```

### What Happens
- **15 Safari tabs spawn** (5 second delay between each)
- Each tab is master orchestrator
- Each master spawns **10 Task agents** (same proven ratio as Kai)
- Each agent processes **5 seeds** (~15-20 LEGOs) silently
- Agents POST to ngrok → staging
- **Total: 150 parallel agents** working simultaneously

### Expected Time
- **~40 minutes** for full 668-seed course
- 15 tabs × 10 agents = 150 workers
- Each worker: 5 seeds × ~3 min/seed = ~15 min
- All parallel = ~40 min total
- **(3× Kai's throughput, same proven ratio)**

### Monitor Progress
```bash
# Watch staging directory fill up
watch -n 5 'ls public/vfs/courses/spa_for_eng/phase5_baskets_staging/ | wc -l'

# Check API status
curl http://localhost:3459/status/spa_for_eng | jq
```

### After Completion
1. Review staging (668 seed files)
2. Run validation
3. Regenerate any failures
4. Merge to canon
5. Deploy

**One shot, done!**

---

# Kai's Wave-Based Workflow

## Configuration (automation.config.simple.json)

```json
{
  "browsers": 5,
  "agents_per_browser": 10,
  "seeds_per_agent": 5
}
```

**Capacity per wave:** 5 × 10 × 5 = **250 seeds**

---

## Wave 1: Seeds 1-250

### Start Generation
```bash
# Via Dashboard UI
POST /api/courses/generate
{
  "target": "Spanish",
  "known": "English",
  "startSeed": 1,
  "endSeed": 250,
  "phaseSelection": "5"
}

# Or via curl
curl -X POST http://localhost:3000/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "target": "Spanish",
    "known": "English",
    "startSeed": 1,
    "endSeed": 250,
    "phaseSelection": "5"
  }'
```

### Monitor Progress
- Dashboard shows real-time updates
- Or check: `GET /api/courses/spa_for_eng/status`

### Expected Time
- **~40 minutes** (agents work in parallel)
- 5 tabs spawn, each coordinates 10 agents
- Each agent processes 5 seeds (~20 LEGOs) silently

### After Completion

1. **Review Staging Files**
   ```bash
   ls -lh public/vfs/courses/spa_for_eng/phase5_baskets_staging/
   # Should see: seed_s0001.json through seed_s0250.json
   ```

2. **Preview Merge**
   ```bash
   node tools/phase5/preview-merge.cjs spa_for_eng
   ```

3. **Run Validation**
   ```bash
   node tools/validators/phase-deep-validator.cjs spa_for_eng phase5
   ```

4. **If Clean: Merge to Canon**
   ```bash
   node tools/phase5/extract-and-normalize.cjs spa_for_eng
   # Manual review, then:
   # Merge normalized → lego_baskets.json
   ```

5. **If Errors: Regenerate Failures**
   ```bash
   # Extract failed LEGO IDs from validation report
   curl -X POST http://localhost:3459/regenerate \
     -H "Content-Type: application/json" \
     -d '{
       "courseCode": "spa_for_eng",
       "legoIds": ["S0042L03", "S0089L01"],
       "target": "Spanish",
       "known": "English"
     }'
   ```

6. **Clean Staging for Next Wave**
   ```bash
   # After merging to canon
   rm public/vfs/courses/spa_for_eng/phase5_baskets_staging/*.json
   ```

---

## Wave 2: Seeds 251-500

Repeat exact same process with different seed range:

```bash
curl -X POST http://localhost:3000/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "target": "Spanish",
    "known": "English",
    "startSeed": 251,
    "endSeed": 500,
    "phaseSelection": "5"
  }'
```

**Expected time:** ~40 minutes

---

## Wave 3: Seeds 501-668 (Final)

```bash
curl -X POST http://localhost:3000/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "target": "Spanish",
    "known": "English",
    "startSeed": 501,
    "endSeed": 668,
    "phaseSelection": "5"
  }'
```

**Expected time:** ~30 minutes (168 seeds)

---

## Quality Gates Between Waves

### Must Pass Before Next Wave:

1. **Zero GATE violations** (vocabulary restriction)
2. **Grammar score > 95%**
3. **FD collision rate < 2%**
4. **All baskets have exactly 10 phrases**

### Automated Validation
```bash
node tools/validators/phase-deep-validator.cjs spa_for_eng phase5 \
  --seeds 1-250 \
  --threshold 0.95
```

Returns:
- ✅ PASS: Proceed to merge
- ❌ FAIL: Lists specific LEGO_IDs to regenerate

---

## RAM Monitoring (Optional)

```bash
# Watch Safari RAM usage during generation
watch -n 5 'ps aux | grep Safari | awk "{sum+=\$4} END {print sum \"%\"}"'

# Should stay under 30% on 8GB machine (2.4GB)
```

---

## Troubleshooting

### Wave Hangs or Stalls
```bash
# Check server logs
tail -f logs/phase5-server.log

# Check active jobs
curl http://localhost:3459/status/spa_for_eng

# Emergency abort
curl -X POST http://localhost:3459/abort/spa_for_eng
```

### Out of Memory
- Reduce to 3 browsers in config
- Capacity: 3 × 10 × 5 = 150 seeds/wave
- Run 5 waves instead of 3

### Ngrok Tunnel Down
```bash
# Restart ngrok
ngrok http 3459

# Update hardcoded URL in phase5-basket-server.cjs if changed
```

---

## Success Metrics

**Full Course (668 seeds):**
- Total time: ~2 hours
- RAM peak: ~2.5GB
- Baskets generated: ~2,000-2,500
- Quality: 95%+ clean rate
- Human review time: ~30 min (between waves)

---

## Next Steps After Phase 5

1. **Phase 6:** Introduction generation
2. **Phase 7:** Course manifest compilation
3. **Phase 8:** Audio generation
4. **Deploy:** Git commit + Vercel deployment

---

**Last updated:** 2025-11-18
