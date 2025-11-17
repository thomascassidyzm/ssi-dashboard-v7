# Running a Test Course - Quick Guide

## Step 1: Start the Servers

### Terminal 1: Frontend (Vite)
```bash
npm run dev
```
**Expected:** Server starts on `http://localhost:5173`

### Terminal 2: Backend (Automation Server)
```bash
npm run server
# Or: node automation_server.cjs
```
**Expected:** Server starts on port 3456

## Step 2: Create a Small Test Course

### Option A: Via UI
1. Visit: `http://localhost:5173`
2. Click: "🚀 Generate New Course"
3. Fill in:
   - Course code: `test_small_10seeds`
   - Source: English
   - Target: Spanish
   - Seeds: `10` (small test!)
4. Click "Generate"

### Option B: Via API (Recommended for testing)
```bash
# Create a minimal test course with 10 seeds
curl -X POST http://localhost:3456/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "courseCode": "test_spa_10",
    "sourceLanguage": "eng",
    "targetLanguage": "spa",
    "totalSeeds": 10,
    "startSeed": 1,
    "endSeed": 10
  }'
```

## Step 3: Monitor Phase 1 (Sequential)

**What should happen:**
- 1 agent spawns (not 10!)
- Processes seeds S0001-S0010 sequentially
- Creates `seed_pairs.json`

**Check progress:**
```bash
# Watch the automation server terminal
# Or query status:
curl http://localhost:3456/api/courses/test_spa_10/status
```

**Expected time:** ~1-2 minutes for 10 seeds

## Step 4: Validate Results

### Check files were created:
```bash
ls -la public/vfs/courses/test_spa_10/
# Should see: seed_pairs.json
```

### Run validation:
```bash
# Basic validation
node course-validator.cjs test_spa_10

# Deep validation
node phase-deep-validator.cjs test_spa_10
```

### Via UI:
1. Visit: `http://localhost:5173/validate`
2. Select: `test_spa_10`
3. Click: "🔬 Deep Dive"
4. Check for:
   - ✅ Phase 1: Complete (10/10 seeds)
   - ❌ Phase 3: Missing (expected)
   - Progress: 25% (1/4 phases)

## Step 5: Run Phase 3 (Parallel - Small Course)

### Expected behavior for 10 seeds:
- Strategy: `SMALL_TEST`
- Segments: 2
- Agents: 4 (2 per segment)
- Seeds/agent: ~3

### Trigger Phase 3:
```bash
# Via validation UI:
# 1. Go to /validate/test_spa_10
# 2. Click "Run Phase 3: LEGOs" button

# Or via API:
curl -X POST http://localhost:3456/api/phase3/start/test_spa_10 \
  -H "Content-Type: application/json" \
  -d '{
    "courseCode": "test_spa_10",
    "totalSeeds": 10
  }'
```

**Expected time:** ~5-10 minutes (4 parallel agents)

## Step 6: Verify Parametrization Works

### Phase 3 should show:
```bash
# In automation server logs, you should see:
Strategy: SMALL_TEST
Segments: 2
Total Agents: 4
Seeds/Agent: 3
Segment 1: S0001-S0005 (5 seeds, 2 agents)
Segment 2: S0006-S0010 (5 seeds, 2 agents)
```

### Check if agents spawned correctly:
```bash
# You should see 4 browser windows open
# Each processing ~3 seeds
```

## What to Watch For

### ✅ Good Signs
- Frontend loads without errors
- Backend starts and shows port 3456
- Validation UI shows all courses
- Phase 1 spawns only 1 agent
- Phase 3 spawns 4 agents for 10-seed course
- No console errors in browser dev tools
- Files appear in `public/vfs/courses/test_spa_10/`

### ❌ Red Flags
- CORS errors (check automation server allows localhost:5173)
- "Cannot require() ES module" errors
- Phase 1 trying to spawn multiple agents
- Phase 3 spawning wrong number of agents
- Validation UI shows blank/error
- Files not being created in VFS

## Quick Checks

```bash
# 1. Check servers are running
lsof -i :5173  # Vite dev server
lsof -i :3456  # Automation server

# 2. Test validation API directly
curl http://localhost:3456/api/courses/validate/all | jq

# 3. Check test course exists
ls -la public/vfs/courses/test_spa_10/

# 4. See parametrization calculation
node test-phase-parametrization.cjs
```

## Emergency Stop

```bash
# Kill all processes
pkill -f "vite"
pkill -f "automation_server"

# Or in each terminal:
Ctrl+C
```

## Expected Test Results

For a **10-seed test course:**

| Phase | Time | Agents | Output |
|-------|------|--------|--------|
| Phase 1 | ~2 min | 1 | `seed_pairs.json` (10 seeds) |
| Phase 3 | ~8 min | 4 | `lego_pairs.json` (~40-50 LEGOs) |
| Phase 5 | ~5 min | 1 | `lego_baskets.json` (~40-50 baskets) |

**Total:** ~15-20 minutes for complete 10-seed course

## Troubleshooting

### Frontend won't start
```bash
npm install  # Reinstall dependencies
npm run dev
```

### Backend won't start
```bash
# Check VFS_ROOT is set
cat .env.automation

# Or set manually:
VFS_ROOT=/Users/tomcassidy/SSi/SSi_Course_Production npm run server
```

### Validation UI blank
- Check browser console (F12)
- Verify API_BASE_URL points to localhost:3456
- Check CORS headers in automation server

### Files not appearing
```bash
# Check VFS_ROOT is correct
echo $VFS_ROOT

# Manually check course directory
ls -la public/vfs/courses/
```

## Success Criteria ✅

After running a 10-seed test course, you should have:

1. ✅ Frontend and backend running without errors
2. ✅ Phase 1 completed sequentially (1 agent, 10 seeds)
3. ✅ Phase 3 completed in parallel (4 agents, 2 segments)
4. ✅ Validation UI showing correct progress
5. ✅ Deep dive showing detailed stats
6. ✅ Files created in VFS (`seed_pairs.json`, `lego_pairs.json`)
7. ✅ No console errors or warnings

**If all 7 criteria pass:** Feature branch is ready to merge! 🎉

## Next: Full Course Test

Once 10-seed test works:
```bash
# Try a 50-seed course (medium)
# Should use: 1 segment, 5 agents
# Phase 1: ~5 min, Phase 3: ~15 min
```

Then eventually:
```bash
# Full 668-seed course
# Phase 1: ~60 min (1 agent)
# Phase 3: ~120 min (67 agents in 7 segments)
```

---

**Ready to go!** Start with the 10-seed test to verify everything works.
