# Testing Phase 5 Through Dashboard

**Web-First Architecture Guide** | Last Updated: 2025-11-18

---

## 🎯 Quick Start (5 Minutes)

### 1. Verify Deployment

```bash
# Run the verification script
./scripts/verify-deployment.sh
```

You should see:
```
✅ Worker prompt accessible (HTTP 200)
✅ Phase 5 intelligence accessible (HTTP 200)
✅ Phase 5 server running (healthy)
✅ Ngrok tunnel accessible
```

If any checks fail, **STOP** and fix before testing.

### 2. Open Dashboard

Navigate to: **https://ssi-dashboard-v7.vercel.app**

### 3. Launch Phase 5 Test

1. Click **"🚀 Generate New Course"**
2. Select languages (e.g., Spanish → English)
3. Click **"Phase 5 Only"** button
4. Choose **"Quick Test (10 seeds)"** for first test
5. Click **"Generate Test Course"**

### 4. Monitor Progress

Watch the real-time progress monitor:
- Agent spawning
- Basket generation
- Upload to staging
- Validation and merge

**Expected time**: ~5-10 minutes for 10 seeds

---

## 📋 Pre-Test Checklist

Before launching ANY Phase 5 test:

- [ ] ✅ Recent changes pushed to GitHub
- [ ] ✅ Vercel deployment shows "Ready" status
      ([Check here](https://vercel.com/thomascassidyzm/ssi-dashboard-v7/deployments))
- [ ] ✅ Prompts accessible via web:
  ```bash
  curl -I https://ssi-dashboard-v7.vercel.app/prompts/phase5_worker.md
  curl -I https://ssi-dashboard-v7.vercel.app/prompts/phase5_master.md
  ```
- [ ] ✅ Phase 5 server running: `curl http://localhost:3459/health`
- [ ] ✅ Ngrok tunnel active
- [ ] ✅ Testing ONLY through dashboard (never curl!)

---

## 🧪 Test Scenarios

### Scenario 1: Quality Validation (Recommended First)
**Purpose**: Validate prompt changes, linguistic quality

- **Seeds**: Quick Test (10 random seeds)
- **Phase**: Phase 5 Only
- **Strategy**: Single Pass
- **What to check**:
  - Are practice phrases natural and meaningful?
  - Is 2-2-2-4 distribution correct?
  - Are agents using linguistic thinking (not scripts)?
  - Is grammar correct in both languages?

### Scenario 2: Missing LEGO Coverage
**Purpose**: Fill gaps in existing course

- **Seeds**: Custom range (e.g., S0101-S0105)
- **Phase**: Phase 5 Only
- **Strategy**: Single Pass
- **What to check**:
  - Staging workflow working correctly?
  - Baskets saved to staging directory?
  - Merge to canon successful?

### Scenario 3: Full Batch (After Validation)
**Purpose**: Generate complete course section

- **Seeds**: Medium (100 seeds) or Custom batch
- **Phase**: Phase 5 Only
- **Strategy**: Staged Segments (swim-lanes)
- **What to check**:
  - Parallel agent coordination
  - Resource usage acceptable
  - All baskets generated without errors

---

## 🔍 Monitoring During Test

### Dashboard View

The progress monitor shows:
- **Current phase status** (e.g., "Spawning agents", "Generating baskets")
- **Sub-agent progress** (if using staged strategy)
- **Upload progress** (baskets being saved to staging)
- **Validation results** (grammar checks, GATE compliance)

### Local Server Logs

In your terminal running the Phase 5 server, watch for:
```
✅ Agent spawned: agent-01
✅ Baskets received: S0101L01, S0101L02, S0101L03
✅ Saved to staging: seed_S0101_agent01.json
✅ Validation passed: 3 baskets
```

### Staging Directory

Check baskets are being saved:
```bash
ls -lh public/vfs/courses/spa_for_eng/phase5_baskets_staging/
```

You should see timestamped JSON files from agents.

---

## ✅ Success Criteria

A successful test shows:

1. **Agents spawn correctly** via osascript (web agents)
2. **Prompts are fetched from web** (not local filesystem)
3. **Baskets are linguistic** (not script-generated LEGO arrays)
4. **2-2-2-4 distribution** maintained (10 phrases per basket)
5. **GATE compliance** (all target language words from available vocabulary)
6. **Grammar is correct** in both languages
7. **Upload to staging** successful (files in staging directory)
8. **No merge conflicts** (staging workflow isolates work)

---

## ❌ Common Issues & Fixes

### Issue: Agents read old prompt

**Symptom**: Agents create scripts instead of linguistic phrases

**Diagnosis**:
```bash
# Check what's deployed
curl https://ssi-dashboard-v7.vercel.app/prompts/phase5_worker.md | head -20
```

**Fix**:
1. Verify Vercel deployment completed
2. Check commit is on main branch
3. Re-deploy if needed: `git push origin main`
4. Wait 2-3 minutes for Vercel build
5. Re-run verification script
6. **Then** test through dashboard

### Issue: Agents can't access prompts

**Symptom**: 404 errors in agent logs, or agents say "couldn't read file"

**Diagnosis**:
```bash
# Should return 200
curl -I https://ssi-dashboard-v7.vercel.app/prompts/phase5_worker.md
```

**Fix**:
- Prompts must be in `public/prompts/` directory
- Check Vercel deployment logs
- Verify files exist in deployed build

### Issue: Phase 5 server not responding

**Symptom**: Dashboard shows "Server not available"

**Diagnosis**:
```bash
curl http://localhost:3459/health
```

**Fix**:
```bash
# Restart with PM2
pm2 restart phase5-baskets

# Or start if not running
pm2 start services/phases/phase5-basket-server.cjs --name phase5-baskets
```

### Issue: Ngrok tunnel down

**Symptom**: Agents can't upload baskets

**Diagnosis**:
```bash
curl -I https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/
```

**Fix**:
```bash
# Check PM2 status
pm2 status ngrok-tunnel

# Restart if needed
pm2 restart ngrok-tunnel
```

---

## 🎓 Understanding the Architecture

### Three Environments

1. **Local Machine**
   - PM2 services (Phase 5 server, ngrok proxy)
   - Staging directory for basket storage
   - **Purpose**: Development, server logic, file storage

2. **Dashboard (Vercel)**
   - URL: https://ssi-dashboard-v7.vercel.app
   - Auto-deploys from GitHub main branch
   - **Purpose**: User interface, control panel

3. **Web Agents (Claude Code Web)**
   - Spawned via osascript from local machine
   - Access resources through HTTPS (web URLs)
   - **Cannot** read local filesystem
   - **Purpose**: Content generation workers

### Data Flow

```
Dashboard UI
    ↓ (Launch Phase 5 via API)
Local Server
    ↓ (Spawn web agents via osascript)
Web Agents
    ↓ (Fetch prompts via HTTPS)
Vercel Static Files
    ↓ (Generate baskets)
Web Agents
    ↓ (Upload via ngrok tunnel)
Local Server
    ↓ (Save to staging)
Staging Directory (git-ignored)
    ↓ (Merge after validation)
Canon lego_baskets.json
    ↓ (Commit to GitHub)
Dashboard Display
```

### Key Principle

> **Agents run remotely and can ONLY access web URLs.**

If an agent needs something:
- ✅ Put it in `public/` directory
- ✅ Reference by HTTPS URL
- ✅ Verify Vercel deployment
- ❌ Never use local paths

---

## 📊 After Testing

### Review Results

1. **Check staging directory**:
   ```bash
   ls -lh public/vfs/courses/spa_for_eng/phase5_baskets_staging/
   ```

2. **Review basket quality** (spot check):
   ```bash
   # Open a random basket file
   cat public/vfs/courses/spa_for_eng/phase5_baskets_staging/seed_S0101_*.json | jq '.baskets.S0101L01.practice_phrases'
   ```

3. **Check validation logs**:
   - Were there any GATE violations?
   - Grammar errors flagged?
   - Distribution issues?

### Merge to Canon (If Quality Good)

```bash
# Merge validated baskets from staging to canon
node tools/phase5/merge-to-canon.cjs spa_for_eng

# Commit to git
git add public/vfs/courses/spa_for_eng/lego_baskets.json
git commit -m "phase5: Add baskets for seeds S0101-S0110 via staging"
git push
```

### Archive Staging (Optional)

```bash
# Archive staging files for recovery
node tools/phase5/archive-staging.cjs spa_for_eng

# Files moved to: archive/phase5_staging/spa_for_eng/2025-11-18/
```

---

## 🚀 Next Steps

Once Phase 5 testing is solid:

1. **Iterate on prompt quality** if needed
2. **Run larger batches** (50-100 seeds)
3. **Generate full course** (668 seeds with staged strategy)
4. **Proceed to Phase 6** (introductions)
5. **Final compilation** (Phase 7)

---

## 📚 Related Documentation

- **Architecture**: `docs/DEPLOYMENT_ARCHITECTURE.md`
- **Staging Workflow**: `docs/workflows/PHASE5_STAGING_WORKFLOW.md`
- **Worker Prompt**: `public/prompts/phase5_worker.md`
- **Master Prompt**: `public/prompts/phase5_master.md`
- **Phase Intelligence**: `public/docs/phase_intelligence/phase_5_lego_baskets.md`

---

## 🎯 Golden Rules

1. ✅ **Always verify deployment before testing**
2. ✅ **Only test through dashboard UI**
3. ✅ **Never use curl for testing** (simulates wrong environment)
4. ✅ **Check Vercel deployment status** (2-3 min build time)
5. ✅ **Prompts must be web-accessible** (`public/prompts/`)
6. ✅ **Staging first, canon later** (safe workflow)

---

**Good luck! 🎉**

*Remember: If agents can't see it via HTTPS, they can't use it.*
