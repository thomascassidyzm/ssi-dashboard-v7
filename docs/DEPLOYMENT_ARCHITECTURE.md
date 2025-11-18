# Deployment Architecture - SSi Dashboard v7

**Created:** 2025-11-18
**Status:** CRITICAL REFERENCE - Read before making changes

---

## 🏗️ System Architecture

### Three Environments:

#### 1. **Local Development (Your Machine)**
- **Code:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean`
- **Services:** PM2 (Phase 5 server, ngrok proxy, etc.)
- **Port 3459:** Phase 5 server
- **Port 3463:** Ngrok proxy
- **Purpose:** Development, testing server logic

#### 2. **Dashboard (Vercel)**
- **URL:** https://ssi-dashboard-v7.vercel.app
- **Code:** Deployed from GitHub main branch
- **Purpose:** User interface, control panel
- **Deployment:** Auto-deploy on push to main

#### 3. **Web Agents (Claude Code Web)**
- **Spawned:** Via osascript from local machine
- **Access:** Through ngrok tunnel
- **Constraints:** **CANNOT read local filesystem**
- **Can Access:**
  - ✅ Any web URL (HTTPS)
  - ✅ Ngrok tunnel endpoints
  - ❌ Local files
  - ❌ GitHub repos directly

---

## 🔄 Deployment Flow

### 1. **Making Changes**

```bash
# Edit files locally
vim services/phases/phase5-basket-server.cjs
vim public/prompts/phase5_worker.md

# Commit locally
git add .
git commit -m "Your changes"
```

### 2. **Push to GitHub**

```bash
git push origin main
```

### 3. **Vercel Auto-Deploy** (takes 2-3 minutes)

- GitHub webhook triggers Vercel
- Vercel builds and deploys
- Check status: https://vercel.com/thomascassidyzm/ssi-dashboard-v7/deployments

### 4. **Verify Deployment** ⚠️ **MANDATORY STEP**

```bash
# Check Vercel deployment status
# Wait for "Ready" status in Vercel dashboard

# Verify prompts are accessible
curl -I https://ssi-dashboard-v7.vercel.app/prompts/phase5_worker.md
# Should return: HTTP/2 200

# Verify phase intelligence accessible
curl -I https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_5_lego_baskets.md
# Should return: HTTP/2 200

# Restart local PM2 services if needed
pm2 restart phase5-baskets
```

### 5. **THEN Test** (Dashboard Only)

- Open: https://ssi-dashboard-v7.vercel.app
- Use dashboard UI to trigger Phase 5
- **NEVER test with curl/local calls during development**

---

## 📂 File Locations for Agents

### ✅ Web-Accessible Files (Agents CAN Access)

| Purpose | Location | Web URL |
|---------|----------|---------|
| Worker Prompt | `public/prompts/phase5_worker.md` | https://ssi-dashboard-v7.vercel.app/prompts/phase5_worker.md |
| Master Prompt | `public/prompts/phase5_master.md` | https://ssi-dashboard-v7.vercel.app/prompts/phase5_master.md |
| Phase 5 Intelligence | `public/docs/phase_intelligence/phase_5_lego_baskets.md` | https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_5_lego_baskets.md |

### ❌ Local-Only Files (Agents CANNOT Access)

| Purpose | Location | Accessible By |
|---------|----------|---------------|
| Server Code | `services/phases/phase5-basket-server.cjs` | Local PM2 only |
| Dashboard UI | `src/` | Vercel build only |
| Course Data | `public/vfs/courses/` | Local + Vercel |

---

## 🎯 The Golden Rule

> **Agents run remotely and can ONLY access web URLs.**

If an agent needs a file:
1. ✅ Put it in `public/` directory
2. ✅ Reference it by HTTPS URL
3. ✅ Verify Vercel deployment succeeded
4. ❌ NEVER use local filesystem paths

---

## 🚨 Common Mistakes to Avoid

### ❌ WRONG: Local File Paths

```javascript
// In orchestrator prompt:
"Use `docs/prompts/phase5_worker_prompt.md`"  // ← Agents can't read this!
```

### ✅ CORRECT: Web URLs

```javascript
// In orchestrator prompt:
"Fetch from: https://ssi-dashboard-v7.vercel.app/prompts/phase5_worker.md"
```

### ❌ WRONG: Testing Before Deployment

```bash
# Make changes
git push

# Immediately test (BAD!)
curl http://localhost:3459/start  # ← Old code still running!
```

### ✅ CORRECT: Verify Then Test

```bash
# Make changes
git push

# Wait for Vercel deployment (check dashboard)
# Verify files are accessible
curl -I https://ssi-dashboard-v7.vercel.app/prompts/phase5_worker.md

# THEN test through dashboard
# Open https://ssi-dashboard-v7.vercel.app and use UI
```

---

## 🔍 Pre-Test Checklist

Before launching any Phase 5 test:

- [ ] Changes pushed to GitHub
- [ ] Vercel deployment shows "Ready" status
- [ ] Prompt files accessible via curl
- [ ] PM2 services restarted (if server code changed)
- [ ] Testing through **dashboard UI only**
- [ ] NOT using curl/local API calls

---

## 📊 Deployment Verification Script

```bash
#!/bin/bash
# verify-deployment.sh

echo "🔍 Verifying deployment..."

echo "\n1. Checking worker prompt..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://ssi-dashboard-v7.vercel.app/prompts/phase5_worker.md)
if [ "$STATUS" = "200" ]; then
  echo "   ✅ Worker prompt accessible"
else
  echo "   ❌ Worker prompt NOT accessible (HTTP $STATUS)"
  exit 1
fi

echo "\n2. Checking Phase 5 intelligence..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_5_lego_baskets.md)
if [ "$STATUS" = "200" ]; then
  echo "   ✅ Phase 5 intelligence accessible"
else
  echo "   ❌ Phase 5 intelligence NOT accessible (HTTP $STATUS)"
  exit 1
fi

echo "\n3. Checking Phase 5 server..."
STATUS=$(curl -s http://localhost:3459/health | jq -r '.status')
if [ "$STATUS" = "healthy" ]; then
  echo "   ✅ Phase 5 server running"
else
  echo "   ❌ Phase 5 server NOT healthy"
  exit 1
fi

echo "\n✅ All checks passed - ready to test!"
```

---

## 🎓 Key Learnings

### Why This Architecture?

1. **Web agents can't access local files**
   - They run on Claude.ai infrastructure
   - Only have web access

2. **Dashboard must be the testing interface**
   - Simulates real user workflow
   - Ensures prompts are actually accessible

3. **Vercel deployment is part of the test**
   - If files aren't deployed, agents fail
   - Must verify deployment before testing

### What We Learned the Hard Way:

> "Working on my machine" ≠ "Working for agents"

The gap between:
- Local changes
- What agents actually see

...is where everything breaks.

**Solution:** Web-first for everything agents touch.

---

## 📞 When Things Go Wrong

### Agents Can't Read Prompts

**Symptom:** Agents read old prompt or create scripts

**Diagnosis:**
```bash
curl -I https://ssi-dashboard-v7.vercel.app/prompts/phase5_worker.md
```

**Fix:**
1. Check Vercel deployment status
2. Verify file exists in `public/prompts/`
3. Re-deploy if needed
4. Clear browser cache
5. Test again through dashboard

### Agents Use Wrong Instructions

**Symptom:** Agents do unexpected things

**Check:**
1. Is new prompt deployed to Vercel?
2. Does orchestrator reference correct URL?
3. Is there an old template file conflicting?

---

## 🔄 Update Workflow

When updating prompts:

1. **Edit in `public/prompts/*.md`** (web-accessible location)
2. **Push to GitHub**
3. **Wait for Vercel deploy** (2-3 min)
4. **Verify with curl**
5. **Test through dashboard**

**NEVER:**
- Edit `docs/prompts/*.md` and expect agents to see it
- Test before Vercel deployment completes
- Use curl to test (use dashboard!)

---

**Last Updated:** 2025-11-18
**Maintainer:** Tom Cassidy
**Review:** Before any Phase 5 changes
