# Phase 5 Architectural Audit & Pre-Mortem

**Date:** 2025-11-18
**Status:** 🚨 CRITICAL ISSUES FOUND
**Purpose:** Pre-testing audit to identify failure points before deployment

---

## 🚨 CRITICAL ISSUE #1: Web Agents Cannot Access Local Data

### **The Problem**

Phase 5 orchestrator prompts tell web agents to read LOCAL files:

```javascript
// From orchestrator prompt (line 782):
"Read lego_pairs.json to find all LEGOs in your seed range"

// From worker prompt (line 76):
"Scaffold location: public/vfs/courses/{{COURSE_CODE}}/phase5_scaffolds/seed_{{SEED}}_scaffold.json"
```

**WEB AGENTS CANNOT READ LOCAL FILESYSTEM!**

### **Why This Happens**

When `/start` is called:
1. ✅ Server reads local `lego_pairs.json` and creates scaffolds (lines 277-286)
2. ✅ Server spawns browser windows (line 324)
3. ❌ Orchestrator prompt tells agents to "read lego_pairs.json" (line 782)
4. ❌ Worker prompt tells agents to "read scaffolds from local path" (line 76)
5. 💥 **Agents are web-based (claude.ai), cannot access local files**

### **Current Flow (BROKEN)**

```
Server (localhost)
    ↓ Reads local files
lego_pairs.json ✅
phase5_scaffolds/ ✅
    ↓ Generates orchestrator prompt
Prompt says: "Read lego_pairs.json"  ← This is a LOCAL path!
    ↓ Spawns web agent via osascript
Web Agent (claude.ai)
    ↓ Tries to read local file
❌ FAILS - web agents have no filesystem access
```

### **What SHOULD Happen**

```
Server (localhost)
    ↓ Reads local files
lego_pairs.json ✅
phase5_scaffolds/ ✅
    ↓ IDENTIFIES missing LEGOs
Missing LEGO list: ["S0042L01", "S0042L02", ...]
    ↓ EMBEDS LEGO data in orchestrator prompt
Prompt contains COMPLETE LEGO data (no file reads needed)
    ↓ Spawns web agent
Web Agent (claude.ai)
    ↓ Has all data embedded in prompt
✅ WORKS - no file access needed
```

### **Solution Required**

The server MUST:

1. **Identify missing LEGOs** on the server side (before spawning agents)
2. **Read scaffold data** for those LEGOs (server has local access)
3. **Embed complete LEGO + scaffold data** in orchestrator prompt
4. **Remove all references** to reading local files from prompts

Example of what to embed:

```json
{
  "S0042L01": {
    "lego": ["quería decir", "I meant"],
    "type": "M",
    "recent_context": {
      "S0041": {
        "sentence": ["I didn't want to say that"],
        "vocabulary": ["no", "quería", "decir", "eso"]
      },
      "S0040": { ... },
      ...
    },
    "current_seed_earlier_legos": [],
    "is_final_lego": false
  },
  "S0042L02": { ... }
}
```

### **Fix Location**

**File:** `services/phases/phase5-basket-server.cjs`

**Function:** `generatePhase5OrchestratorPrompt()` (line ~706)

**Changes needed:**
1. Add parameter: `missingLegos` (array of LEGO IDs with full scaffold data)
2. Embed this data in prompt (JSON block)
3. Remove: "Read lego_pairs.json" instruction
4. Remove: Local file path references

---

## 🚨 CRITICAL ISSUE #2: Regeneration vs Regular Mode Confusion

### **Two Different Code Paths**

#### **Path 1: Regeneration Mode** (line 715-759)
- **Used for:** Re-generating specific LEGO IDs
- **Input:** `legoIds` array provided by caller
- **Prompt:** Embeds LEGO IDs in prompt ✅
- **Result:** Would work (if scaffold data also embedded)

#### **Path 2: Regular Mode** (line 768-847)
- **Used for:** Generating baskets for seed range
- **Input:** `startSeed`, `endSeed`
- **Prompt:** Tells agents to "read lego_pairs.json" ❌
- **Result:** **WILL FAIL** - agents can't read local files

### **The Problem**

The `/start` endpoint (line 141) uses **Regular Mode** (no `legoIds`):

```javascript
await spawnBrowserWindows(courseCode, {
  target,
  known,
  startSeed,  // ← Just seed range, no LEGO list
  endSeed
}, ...)
```

This triggers the BROKEN regular mode path.

### **Solution**

Convert `/start` endpoint to work like regeneration mode:

1. **Server identifies missing LEGOs** from seed range
2. **Passes `legoIds` array** to orchestrator
3. **Uses regeneration mode path** (which embeds data)
4. **Deprecate regular mode** entirely

---

## 📊 TERMINOLOGY AUDIT

### **Current Terms (Inconsistent Usage)**

| Term | Definition | Where Used | Issues |
|------|------------|------------|--------|
| **Orchestrator** | Top-level service that coordinates phases | `automation_server.cjs` (port 3456) | ⚠️ Also called "Master Orchestrator" in some docs |
| **Master** | Agent that spawns sub-agents | Phase 5 prompts (`phase5_master.md`) | ⚠️ Confused with "Orchestrator" |
| **Worker** | Sub-agent that does actual work | Phase 5 prompts (`phase5_worker.md`) | ✅ Clear |
| **Sub-agent** | Same as worker | Code comments | ⚠️ Redundant with "worker" |
| **Agent** | Generic term for any Claude Code instance | Everywhere | ⚠️ Too vague |
| **Automator** | Legacy term (no longer used) | Old docs only | ❌ Deprecated |
| **Browser window** | Safari tab with Claude Code | Server code | ⚠️ Confusing - sounds like UI, actually means agent container |
| **Window orchestrator** | Master agent for one browser window | Old architecture | ❌ Deprecated (no longer using browser windows) |

### **Proposed Standardized Terminology**

| Term | Definition | Use For | Example |
|------|------------|---------|---------|
| **Orchestrator** | Top-level service coordinating ALL phases | `automation_server.cjs` port 3456 | "The orchestrator starts Phase 5" |
| **Phase Server** | Service handling ONE specific phase | `phase5-basket-server.cjs` port 3459 | "Phase 5 server spawns agents" |
| **Master Agent** | Claude Code instance that coordinates other agents | Phase 5 master prompt | "Master agent spawns 10 worker agents" |
| **Worker Agent** | Claude Code instance that generates content | Phase 5 worker prompt | "Worker agent generates 10 baskets" |
| **Agent Instance** | Single Claude Code session (generic) | Technical docs | "Spawned 5 agent instances" |
| **Web Agent** | Agent running in browser (claude.ai) | Architecture docs | "Web agents cannot access local files" |
| **Local Agent** | Agent running on local machine (CLI) | Future use | Not currently used |

### **Terms to REMOVE**

- ❌ **Automator** - deprecated
- ❌ **Browser window** - use "master agent" instead
- ❌ **Window orchestrator** - deprecated architecture
- ❌ **Sub-agent** - use "worker agent" instead
- ❌ **Agent** (alone) - too vague, always specify "master" or "worker"

### **Communication Hierarchy**

```
User (Dashboard UI)
    ↓
API Backend (Express)
    ↓
Orchestrator (automation_server.cjs, port 3456)
    ↓
Phase 5 Server (phase5-basket-server.cjs, port 3459)
    ↓
Master Agent (web, spawned via osascript)
    ↓
Worker Agent 1 (web, spawned via Task tool)
Worker Agent 2 (web, spawned via Task tool)
...
Worker Agent N (web, spawned via Task tool)
```

---

## 🗂️ SERVICE REGISTRY AUDIT

### **Currently Running Services (PM2)**

```bash
pm2 list
```

| ID | Name | Port | Purpose | Status | Needed? |
|----|------|------|---------|--------|---------|
| 7 | ngrok-proxy | 3463 | Reverse proxy for ngrok tunnel | ✅ Online | ✅ **KEEP** |
| 8 | ngrok-tunnel | N/A | Ngrok tunnel to mirthlessly-nonanesthetized-marilyn | ✅ Online | ✅ **KEEP** |
| ? | phase5-baskets | 3459 | Phase 5 basket generation server | ✅ Online | ✅ **KEEP** |

**Missing from PM2** (should be running):
- ❌ Orchestrator (`automation_server.cjs` port 3456) - NOT in PM2 list

### **Services Referenced in Code**

#### ✅ **ACTIVE** (Currently Used)

| Service | File | Port | Purpose |
|---------|------|------|---------|
| **Orchestrator** | `services/orchestration/automation_server.cjs` | 3456 | Top-level phase coordination |
| **Phase 5 Server** | `services/phases/phase5-basket-server.cjs` | 3459 | Basket generation |
| **Ngrok Proxy** | `services/orchestration/ngrok-proxy-server.cjs` | 3463 | Routes `/phase5/*` to 3459 |
| **Ngrok Tunnel** | External (ngrok CLI) | N/A | Public HTTPS tunnel |
| **API Backend** | `api/index.js` | 3000 | Dashboard backend API |
| **Dashboard Frontend** | Vite dev server | 5173 | Vue UI (local dev) |
| **Dashboard Production** | Vercel | N/A | Vue UI (deployed) |

#### ⚠️ **REFERENCED BUT UNCLEAR**

| Service | File | Port | Status |
|---------|------|------|--------|
| Phase 1 Server | `services/phases/phase1-*` | 3457 | STUB only? Not implemented? |
| Phase 3 Server | `services/phases/phase3-*` | 3458 | STUB only? Not implemented? |
| Phase 6 Server | `services/phases/phase6-*` | 3460 | STUB only? Not implemented? |
| Phase 7 Server | `services/phase7/` | ? | Separate implementation exists |

#### ❌ **DEPRECATED** (Should Remove)

| Service | File | Why Deprecated |
|---------|------|----------------|
| `automation_server.js` | Root directory | Old version, use `services/orchestration/automation_server.cjs` |
| `local-bridge-registrar.js` | Root + `deploy/` | Railway proxy (not using Railway anymore) |
| `tunnel-bridge-server.js` | Root + `services/orchestration/` | Old tunnel approach |
| `simple-tunnel-bridge.js` | `services/orchestration/` | Simplified version no longer needed |
| `start-automation.sh` | Root | Old startup script |
| `emergency-stop.sh` | Root | Old emergency script |

### **Directory Audit**

#### ✅ **KEEP** (Active Code)

```
services/
├── orchestration/
│   ├── automation_server.cjs         ← KEEP (orchestrator)
│   ├── ngrok-proxy-server.cjs        ← KEEP (ngrok reverse proxy)
│   └── config-loader.cjs             ← KEEP (config utility)
├── phases/
│   └── phase5-basket-server.cjs      ← KEEP (Phase 5)
├── phase7/                            ← KEEP (Phase 7 compilation)
└── web/
    └── ssi-dashboard/                 ← UNCLEAR (what is this?)
```

#### ❌ **DEPRECATED** (Can Remove)

```
services/
├── orchestration/
│   ├── tunnel-bridge-server.js       ← REMOVE (old tunnel)
│   ├── simple-tunnel-bridge.js       ← REMOVE (old tunnel)
│   └── mcp-orchestrator/             ← REMOVE (old MCP experiment)
```

#### ⚠️ **UNCLEAR** (Needs Investigation)

```
tools/                                 ← What's the difference vs services/?
scripts/                               ← Git-ignored workspace, OK to keep
public/vfs/courses/                    ← Course data, KEEP
archive/                               ← Historical data, OK to keep
```

### **Proposed Service Structure**

**Clear separation:**

```
services/
├── orchestrator.cjs           ← Top-level coordinator (port 3456)
├── api/
│   └── index.js               ← Dashboard backend (port 3000)
├── phases/
│   ├── phase1-server.cjs      ← Phase 1 translation (port 3457)
│   ├── phase3-server.cjs      ← Phase 3 LEGO extraction (port 3458)
│   ├── phase5-server.cjs      ← Phase 5 baskets (port 3459) ✅ EXISTS
│   ├── phase6-server.cjs      ← Phase 6 introductions (port 3460)
│   └── phase7-server.cjs      ← Phase 7 compilation (port 3461)
├── proxy/
│   └── ngrok-proxy.cjs        ← Ngrok reverse proxy (port 3463) ✅ EXISTS
└── utils/
    └── config-loader.cjs      ← Shared config ✅ EXISTS
```

---

## 🎯 WHAT ACTUALLY NEEDS TO RUN

### **For Phase 5 Testing**

**Minimum services:**

1. ✅ **Phase 5 Server** (`services/phases/phase5-basket-server.cjs` port 3459)
   - Receives `/start` requests
   - Generates orchestrator prompts
   - Spawns web agents
   - Receives uploads via `/upload-basket`

2. ✅ **Ngrok Tunnel** (external ngrok process)
   - Public HTTPS endpoint for web agents
   - Routes to ngrok-proxy

3. ✅ **Ngrok Proxy** (`services/orchestration/ngrok-proxy-server.cjs` port 3463)
   - Receives ngrok traffic
   - Routes `/phase5/*` → `localhost:3459`

4. ⚠️ **API Backend** (`api/index.js` port 3000) - IF testing through dashboard
   - Dashboard UI calls this
   - Forwards to Phase 5 server

5. ⚠️ **Orchestrator** (`services/orchestration/automation_server.cjs` port 3456) - NOT NEEDED for standalone Phase 5 test
   - Only needed if testing full pipeline
   - Phase 5 server can run standalone

### **Currently Running (PM2)**

```bash
pm2 status

✅ ngrok-proxy (port 3463)
✅ ngrok-tunnel
❓ phase5-baskets (port 3459) - need to verify
❌ automation_server (port 3456) - NOT RUNNING
```

### **What to Start**

```bash
# If not already running:
pm2 start services/phases/phase5-basket-server.cjs --name phase5-baskets

# Verify
pm2 status
curl http://localhost:3459/health
curl https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/phase5/upload-basket \
  -X POST -H "Content-Type: application/json" -d '{"test": true}'
```

---

## 📋 PRE-LAUNCH CHECKLIST (REVISED)

### **Before ANY Phase 5 Test**

- [ ] ✅ Phase 5 server running (port 3459)
- [ ] ✅ Ngrok tunnel active
- [ ] ✅ Ngrok proxy running (port 3463)
- [ ] ✅ Upload endpoint responds (test with mock data)
- [ ] ✅ Web prompts deployed to Vercel (200 OK)
- [ ] ❌ **CRITICAL FIX NEEDED**: Server must embed LEGO data in orchestrator prompt
- [ ] ❌ **CRITICAL FIX NEEDED**: Remove "read local files" from prompts

### **Fix Priority**

**MUST FIX before testing:**

1. 🚨 **CRITICAL**: Embed LEGO + scaffold data in orchestrator prompt
2. 🚨 **CRITICAL**: Remove local file read instructions from prompts
3. ⚠️ **HIGH**: Identify missing LEGOs on server side (before spawning agents)
4. ⚠️ **MEDIUM**: Standardize terminology in all docs/prompts
5. 🔧 **LOW**: Clean up deprecated services

---

## 🔧 IMMEDIATE ACTION ITEMS

### **1. Fix Orchestrator Prompt Generation**

**File:** `services/phases/phase5-basket-server.cjs`

**Function:** `generatePhase5OrchestratorPrompt()` line ~706

**Changes:**

```javascript
// BEFORE (BROKEN):
function generatePhase5OrchestratorPrompt(courseCode, params, courseDir) {
  // ...
  return `Read lego_pairs.json to find all LEGOs...`; // ← WRONG
}

// AFTER (FIXED):
function generatePhase5OrchestratorPrompt(courseCode, params, courseDir, legoData) {
  // legoData = {
  //   "S0042L01": { lego: [...], type: "M", recent_context: {...}, ... },
  //   "S0042L02": { ... }
  // }

  return `
## 📋 YOUR LEGO DATA (${Object.keys(legoData).length} LEGOs)

Complete LEGO information embedded below (NO FILE READS NEEDED):

\`\`\`json
${JSON.stringify(legoData, null, 2)}
\`\`\`

Each LEGO includes:
- lego: [target, known]
- type: A/M/F/X
- recent_context: vocabulary from last 10 seeds
- current_seed_earlier_legos: LEGOs from same seed
- is_final_lego: boolean

Use this data to generate practice baskets.
  `;
}
```

### **2. Identify Missing LEGOs on Server**

**File:** `services/phases/phase5-basket-server.cjs`

**Function:** `/start` endpoint, line ~141

**Add before spawning:**

```javascript
// After loading lego_pairs.json and lego_baskets.json:
const missingLegos = identifyMissingLegos(
  legoPairs,
  basketsPath,
  startSeed,
  endSeed
);

// Load scaffold data for missing LEGOs
const legoData = await loadScaffoldData(
  baseCourseDir,
  missingLegos
);

// Pass to orchestrator
const prompt = generatePhase5OrchestratorPrompt(
  courseCode,
  params,
  courseDir,
  legoData  // ← NEW: embedded data
);
```

### **3. Update Worker Prompt**

**File:** `public/prompts/phase5_worker.md`

**Remove:**
```markdown
## 🔧 STEP 1: Read Scaffolds

Scaffold location: public/vfs/courses/{{COURSE_CODE}}/phase5_scaffolds/...
```

**Replace with:**
```markdown
## 🔧 STEP 1: Review Your LEGO Data

Your master agent provided complete LEGO data (no file reads needed).

Each LEGO in your assignment includes:
- `lego`: Target and known language pair
- `type`: A/M/F/X (difficulty)
- `recent_context`: Available vocabulary from recent seeds
- `current_seed_earlier_legos`: LEGOs from same seed
- `is_final_lego`: Whether this is the last LEGO in the seed

Use this data to generate natural, GATE-compliant practice phrases.
```

---

## 📊 ESTIMATED FIX TIME

| Task | Complexity | Time Estimate |
|------|------------|---------------|
| Add `identifyMissingLegos()` function | Medium | 30 min |
| Add `loadScaffoldData()` function | Medium | 30 min |
| Update `generatePhase5OrchestratorPrompt()` | Medium | 30 min |
| Update worker prompt (remove file reads) | Low | 15 min |
| Test with 5 LEGOs | Low | 15 min |
| **TOTAL** | | **~2 hours** |

---

## 🎯 CONCLUSION

**Current Status:** 🚨 **WILL FAIL IF TESTED NOW**

**Why:** Web agents cannot read local files. Prompts tell them to read:
- `lego_pairs.json` (local)
- `phase5_scaffolds/*.json` (local)
- Course data files (local)

**Fix Required:** Embed all LEGO + scaffold data in orchestrator prompt (server-side operation).

**After Fix:** Should work end-to-end with no further blockers.

---

**Last Updated:** 2025-11-18
**Next Action:** Implement fixes above before testing
**Review Status:** Awaiting user approval to proceed with fixes
