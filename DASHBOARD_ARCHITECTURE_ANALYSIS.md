# Dashboard Architecture Analysis & Claude Code Web Integration Options

**Date**: 2025-11-08
**Purpose**: Analyze current architecture and propose optimal Claude Code Web integration
**Status**: Current system working but RAM-intensive, seeking cloud-based solution

---

## 🏗️ Current Architecture (Working)

### Flow Diagram:
```
┌─────────────────────────────────────────────────────────────────┐
│  1. User interacts with Dashboard                               │
│     (Vercel-hosted React app)                                   │
│     https://ssi-dashboard-v7.vercel.app                         │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP Request
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. ngrok Tunnel                                                │
│     (Exposes local machine to internet)                         │
│     https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev │
└────────────────────────────┬────────────────────────────────────┘
                             │ localhost:3456
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. automation_server.cjs                                       │
│     (Express server on local Mac)                               │
│     - Receives phase generation requests                        │
│     - Orchestrates Claude Code agents                           │
│     - Manages VFS (Virtual File System)                         │
│     PORT: 3456                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ osascript command
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. osascript → iTerm2                                          │
│     (AppleScript spawns iTerm2 windows)                         │
│     - Creates new iTerm2 window                                 │
│     - Launches Claude Code in that window                       │
│     - Pastes prompt into Claude Code                            │
└────────────────────────────┬────────────────────────────────────┘
                             │ claude code session
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. Claude Code (CLI)                                           │
│     (Running in iTerm2 terminal)                                │
│     - Receives pasted prompt                                    │
│     - Executes phase generation                                 │
│     - Writes output to VFS                                      │
│     - Loops through orchestrator batches                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ File writes
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  6. VFS (Virtual File System)                                   │
│     ./public/vfs/courses/{courseCode}/                          │
│     - seed_pairs.json                                           │
│     - lego_pairs.json                                           │
│     - lego_baskets.json                                         │
│     - orchestrator_batches/                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Current Implementation Details:

#### automation_server.cjs
```javascript
// Key endpoints:
POST /api/courses/:courseCode/phase/:phaseNum
  → Spawns Claude Code agent via osascript

GET /api/courses/:courseCode/job
  → Checks generation status

// Orchestration for parallel processing:
POST /api/courses/:courseCode/phase/1/prepare
  → Divides seeds into batches

POST /api/courses/:courseCode/phase/1/orchestrate
  → Spawns 5 orchestrators (each spawns 10 sub-agents)
  → 50 concurrent agents for Phase 1

// osascript spawning (automation_server.cjs:800-850):
async function closeAgentWindows(windowIds, processIds) {
  // Closes iTerm2 windows
  // Kills Claude processes to free RAM
  // Uses AppleScript to manage iTerm2
}
```

#### osascript Pattern:
```applescript
tell application "iTerm2"
    create window with default profile
    tell current session of current window
        write text "claude"
        write text "[PASTED PROMPT]"
    end tell
    return id of current window
end tell
```

### Parallel Orchestration (Phase 1 Example):

**Preparation**:
- `scripts/phase1-prepare-orchestrator-batches.cjs`
- Divides 668 seeds → 5 orchestrators (134 seeds each)
- Each orchestrator → 10 sub-agents (~13 seeds each)
- Total: 50 concurrent agents

**Execution**:
1. Dashboard calls `POST /phase/1/orchestrate`
2. automation_server spawns 5 iTerm2 windows (30s delay between)
3. Each window runs orchestrator with Phase 1 intelligence
4. Orchestrators spawn 10 sub-agents each
5. Sub-agents write to `chunk_01.json`, `chunk_02.json`, etc.
6. Validator merges chunks → final `seed_pairs.json`

**Timeline**:
- Without parallelization: ~11 hours (668 seeds × 1 min each)
- With 50 agents: ~18 minutes (668 seeds / 50 agents)

---

## 🚨 Current System Limitations

### 1. **RAM Consumption** ⚠️
- **Problem**: 50 concurrent Claude Code instances = massive RAM usage
- Each Claude Code instance: ~200-500 MB RAM
- 50 agents: 10-25 GB RAM consumed
- **Impact**: Can crash local machine

### 2. **Machine Dependency** 🖥️
- **Problem**: Requires Mac with iTerm2 running
- Cannot run headless
- Cannot run on server
- User's machine must stay powered on

### 3. **Single Point of Failure** 💥
- **Problem**: If local machine crashes, all agents die
- No redundancy
- No recovery mechanism

### 4. **osascript Complexity** 🔧
- **Problem**: AppleScript is Mac-specific
- Hard to debug
- Fragile (relies on iTerm2 GUI)
- Cannot scale beyond local machine

### 5. **Monitoring Difficulty** 👀
- **Problem**: 50 iTerm2 windows is chaotic
- Hard to track which agent is doing what
- Log aggregation is manual

---

## 💡 Proposed Solution: Claude Code Web API Integration

### Option 1: **Claude API Direct** (Recommended) ⭐⭐⭐⭐⭐

**Architecture**:
```
┌────────────────────────────────────────────┐
│  Dashboard (Vercel)                        │
└───────────────────┬────────────────────────┘
                    │ HTTPS
                    ↓
┌────────────────────────────────────────────┐
│  Backend API Server (Railway/Render)       │
│  - Receives phase requests                 │
│  - Manages concurrent API calls            │
│  - Tracks job status                       │
│  - Writes to cloud storage                 │
└───────────────────┬────────────────────────┘
                    │ Anthropic API
                    ↓
┌────────────────────────────────────────────┐
│  Anthropic Cloud (claude.ai)               │
│  - Runs Claude Sonnet 4.5                  │
│  - Handles 50+ concurrent requests         │
│  - No local RAM usage                      │
└───────────────────┬────────────────────────┘
                    │ Responses
                    ↓
┌────────────────────────────────────────────┐
│  Cloud Storage (Vercel Blob / S3)          │
│  - Stores generated files                  │
│  - VFS structure maintained                │
└────────────────────────────────────────────┘
```

**Implementation**:

```javascript
// backend-api/routes/phase-generation.js

import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Parallel orchestration
async function generatePhase1(courseCode, seeds) {
  // 1. Prepare batches (same as current system)
  const batches = prepareBatches(seeds, 5); // 5 orchestrators

  // 2. Spawn 5 concurrent orchestrator agents (via API)
  const orchestratorPromises = batches.map((batch, i) =>
    spawnOrchestratorAgent(batch, i)
  );

  // 3. Wait for all orchestrators to complete
  const results = await Promise.all(orchestratorPromises);

  // 4. Validate and merge
  return validateAndMerge(results);
}

// Single orchestrator agent
async function spawnOrchestratorAgent(batch, orchestratorId) {
  const prompt = buildOrchestratorPrompt(batch);

  // Call Anthropic API instead of osascript
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514', // Latest Sonnet
    max_tokens: 100000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  // Parse response and write to cloud storage
  const output = parseOrchestratorResponse(response.content);
  await saveToCloudStorage(`chunk_${orchestratorId}.json`, output);

  return { success: true, chunk: orchestratorId };
}

// Backend server (Express on Railway/Render)
app.post('/api/courses/:courseCode/phase/:phaseNum/generate', async (req, res) => {
  const { courseCode, phaseNum } = req.params;

  // Create job
  const jobId = createJob(courseCode, phaseNum);

  // Start generation in background
  generatePhaseInBackground(courseCode, phaseNum, jobId);

  res.json({
    jobId,
    status: 'STARTED',
    message: 'Phase generation started with cloud agents'
  });
});

// Background worker
async function generatePhaseInBackground(courseCode, phaseNum, jobId) {
  try {
    updateJobStatus(jobId, 'RUNNING');

    if (phaseNum === '1') {
      await generatePhase1(courseCode, seeds);
    } else if (phaseNum === '3') {
      await generatePhase3(courseCode, seeds);
    } else if (phaseNum === '5') {
      await generatePhase5(courseCode, seeds);
    }

    updateJobStatus(jobId, 'COMPLETED');
  } catch (error) {
    updateJobStatus(jobId, 'FAILED', error.message);
  }
}
```

**Benefits**:
- ✅ **Zero local RAM usage** (runs on Anthropic's servers)
- ✅ **Infinite parallelization** (API rate limits: 1000 RPM)
- ✅ **Platform-independent** (works from any device)
- ✅ **No GUI dependency** (pure API calls)
- ✅ **Robust error handling** (API retries, timeouts)
- ✅ **Better monitoring** (structured API responses)
- ✅ **Cloud-native** (deploy to Railway/Render/Vercel Functions)

**Costs**:
- Anthropic API: ~$3-15 per 1M input tokens, ~$15-75 per 1M output tokens
- Phase 1 (668 seeds): ~200k input tokens + 300k output tokens = ~$6-30 per run
- **Much cheaper than running local Mac 24/7**

**Rate Limits**:
- Claude API: 1000 requests/min (more than enough for 50 agents)
- Can batch requests if needed

---

### Option 2: **GitHub Actions + Claude Code Web** ⭐⭐⭐

**Architecture**:
```
┌────────────────────────────────────────────┐
│  Dashboard triggers GitHub workflow        │
└───────────────────┬────────────────────────┘
                    │ GitHub API
                    ↓
┌────────────────────────────────────────────┐
│  GitHub Actions Workflow                   │
│  - Receives workflow_dispatch event        │
│  - Runs orchestrator scripts               │
│  - Calls Anthropic API in parallel         │
│  - Commits results to repo                 │
└───────────────────┬────────────────────────┘
                    │ Commits
                    ↓
┌────────────────────────────────────────────┐
│  GitHub Repository                         │
│  - VFS files committed                     │
│  - Dashboard pulls latest                  │
└────────────────────────────────────────────┘
```

**Implementation**:

```.github/workflows/generate-phase.yml
name: Generate Course Phase

on:
  workflow_dispatch:
    inputs:
      courseCode:
        description: 'Course code (e.g., spa_for_eng)'
        required: true
      phase:
        description: 'Phase number (1, 3, 5, etc.)'
        required: true

jobs:
  generate:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run orchestrator
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          node scripts/phase${{ github.event.inputs.phase }}-orchestrator.js \
            --course ${{ github.event.inputs.courseCode }} \
            --parallel 50

      - name: Commit generated files
        run: |
          git config user.name "SSi Bot"
          git config user.email "bot@ssi.com"
          git add public/vfs/courses/${{ github.event.inputs.courseCode }}/
          git commit -m "Generate Phase ${{ github.event.inputs.phase }} for ${{ github.event.inputs.courseCode }}"
          git push
```

**Dashboard triggers workflow**:
```javascript
// dashboard/api/trigger-generation.js

export async function triggerPhaseGeneration(courseCode, phase) {
  const response = await fetch(
    `https://api.github.com/repos/owner/repo/actions/workflows/generate-phase.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          courseCode,
          phase: String(phase)
        }
      })
    }
  );

  return {
    triggered: response.ok,
    workflowUrl: `https://github.com/owner/repo/actions`
  };
}
```

**Benefits**:
- ✅ Free (GitHub Actions: 2000 min/month on free tier)
- ✅ Built-in CI/CD integration
- ✅ Git history for all generations
- ✅ No server hosting needed
- ✅ Secure secrets management

**Drawbacks**:
- ⚠️ 6-hour max runtime per job
- ⚠️ Slower to start (workflow queue)
- ⚠️ Less real-time feedback

---

### Option 3: **Hybrid: Local orchestrator + Cloud agents** ⭐⭐

Keep current architecture but replace osascript with API calls:

```javascript
// automation_server.cjs (modified)

async function spawnClaudeAgent(prompt) {
  // OLD: osascript → iTerm2 → Claude Code
  // NEW: Direct API call

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100000,
    messages: [{ role: 'user', content: prompt }]
  });

  return parseResponse(response.content);
}

// Still runs locally via ngrok, but agents are cloud-based
```

**Benefits**:
- ✅ Minimal code changes
- ✅ Keep existing ngrok setup
- ✅ Zero local RAM for agents

**Drawbacks**:
- ⚠️ Still requires local machine running
- ⚠️ ngrok tunnel can be flaky

---

## 📊 Comparison Matrix

| Aspect | Current (osascript) | Option 1: API Direct | Option 2: GitHub Actions | Option 3: Hybrid |
|--------|---------------------|---------------------|-------------------------|------------------|
| **RAM Usage** | 10-25 GB (local) | 0 GB (cloud) | 0 GB (cloud) | 0 GB (cloud) |
| **Scalability** | Limited (local CPU) | Excellent (1000 RPM) | Good (2000 min/month) | Good |
| **Platform** | Mac only | Any | Any | Any |
| **Monitoring** | 50 iTerm windows | API responses | GitHub UI | API responses |
| **Cost** | $0 (hardware wear) | ~$6-30/run | $0 (free tier) | ~$6-30/run |
| **Setup Complexity** | Medium | High | Medium | Low |
| **Reliability** | Low (GUI-dependent) | High (API SLA) | Medium (queue delays) | Medium |
| **Real-time Feedback** | Visual (iTerm) | JSON responses | Workflow logs | JSON responses |
| **Debugging** | Hard | Easy (API logs) | Easy (workflow logs) | Easy |

---

## 🎯 Recommended Approach

### **Use Option 1: Claude API Direct** ⭐

**Rationale**:
1. **Solves RAM problem**: No local instances
2. **Best scalability**: 50+ concurrent agents easily
3. **Platform-independent**: Works from any device
4. **Production-ready**: Anthropic's infrastructure handles load
5. **Cost-effective**: ~$6-30 per run vs hardware wear
6. **Future-proof**: Can scale to 100s of agents if needed

### Implementation Plan:

#### Phase 1: Backend API Server (2-4 hours)
1. Deploy Express server to Railway/Render
2. Add Anthropic SDK
3. Implement orchestrator endpoints
4. Add cloud storage (Vercel Blob or S3)

#### Phase 2: Dashboard Integration (1-2 hours)
1. Update dashboard to call new backend API
2. Remove ngrok dependency
3. Add job status polling
4. Show progress for concurrent agents

#### Phase 3: Migration (1 hour)
1. Test on single course
2. Compare output quality
3. Validate performance
4. Full migration

**Total time**: 4-7 hours

---

## 🔧 Technical Implementation Details

### Backend Server Architecture:

```
backend-api/
├── server.js                  # Express server entry
├── routes/
│   ├── courses.js             # Course management
│   ├── phase-generation.js    # Phase orchestration
│   └── jobs.js                # Job status tracking
├── services/
│   ├── anthropic.js           # Anthropic API wrapper
│   ├── orchestrator.js        # Parallel orchestration logic
│   └── storage.js             # Cloud storage (Vercel Blob/S3)
├── lib/
│   ├── phase-prompts.js       # Phase intelligence builders
│   └── validators.js          # Output validation
└── package.json
```

### Key Functions:

```javascript
// services/orchestrator.js

export class PhaseOrchestrator {
  constructor(courseCode, phaseNum) {
    this.courseCode = courseCode;
    this.phaseNum = phaseNum;
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async generatePhase1() {
    // 1. Prepare batches
    const batches = await this.prepareBatches(5);

    // 2. Run orchestrators in parallel
    const results = await Promise.all(
      batches.map((batch, i) => this.runOrchestrator(batch, i))
    );

    // 3. Validate and merge
    return this.validateAndMerge(results);
  }

  async runOrchestrator(batch, orchestratorId) {
    const prompt = this.buildOrchestratorPrompt(batch);

    // Anthropic API call (replaces osascript)
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100000,
      messages: [{ role: 'user', content: prompt }]
    });

    // Parse and save chunk
    const output = this.parseResponse(response.content);
    await this.saveChunk(orchestratorId, output);

    return { orchestratorId, success: true };
  }

  async saveChunk(orchestratorId, data) {
    // Save to Vercel Blob or S3
    await storage.put(
      `courses/${this.courseCode}/chunks/chunk_${orchestratorId}.json`,
      JSON.stringify(data, null, 2)
    );
  }
}
```

### Dashboard Changes:

```javascript
// dashboard/api/generate-phase.js

export async function generatePhase(courseCode, phaseNum) {
  // OLD: POST to ngrok → automation_server → osascript
  // NEW: POST to Railway backend → Anthropic API

  const response = await fetch(
    `https://your-backend.railway.app/api/courses/${courseCode}/phase/${phaseNum}/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }
  );

  const { jobId } = await response.json();

  // Poll job status
  return pollJobStatus(jobId);
}

async function pollJobStatus(jobId) {
  while (true) {
    const status = await fetch(
      `https://your-backend.railway.app/api/jobs/${jobId}`
    ).then(r => r.json());

    if (status.status === 'COMPLETED') {
      return { success: true, output: status.output };
    } else if (status.status === 'FAILED') {
      return { success: false, error: status.error };
    }

    // Wait 2 seconds before polling again
    await new Promise(r => setTimeout(r, 2000));
  }
}
```

---

## 📋 Migration Checklist

### Pre-Migration:
- [ ] Set up Railway/Render account
- [ ] Get Anthropic API key
- [ ] Set up cloud storage (Vercel Blob or S3)
- [ ] Deploy backend API server

### Backend Development:
- [ ] Implement Phase 1 orchestrator
- [ ] Implement Phase 3 orchestrator
- [ ] Implement Phase 5 orchestrator (staged pipeline)
- [ ] Add job status tracking
- [ ] Add cloud storage integration
- [ ] Add error handling and retries

### Dashboard Updates:
- [ ] Update API calls to point to new backend
- [ ] Remove ngrok dependency
- [ ] Add job status polling UI
- [ ] Test parallel agent visualization

### Testing:
- [ ] Test single course generation
- [ ] Compare output quality with osascript version
- [ ] Test 50 concurrent agents
- [ ] Monitor API costs
- [ ] Validate performance metrics

### Production:
- [ ] Full migration
- [ ] Deprecate ngrok setup
- [ ] Update documentation
- [ ] Monitor system health

---

## 💰 Cost Analysis

### Current System (osascript + local Mac):
- Hardware: MacBook Pro (~$2000-4000)
- Power consumption: ~24/7 for long generations
- RAM upgrades: Potentially needed for 50 agents
- **Total**: High upfront, ongoing electricity

### Cloud API System:
- Anthropic API:
  - Phase 1 (668 seeds): ~500k tokens total = ~$6-30
  - Phase 3 (668 seeds): ~300k tokens total = ~$4-20
  - Phase 5 (668 seeds): ~1M tokens total = ~$10-50
- Backend hosting (Railway): ~$5-20/month
- Storage (Vercel Blob): ~$0.15/GB/month
- **Total per course**: ~$20-100 (one-time)
- **Monthly**: ~$5-20 (hosting only)

**Conclusion**: Cloud is cheaper for intermittent generation, especially when factoring in hardware wear and electricity.

---

## 🚀 Next Steps

1. **Immediate** (1-2 hours):
   - Set up Railway account
   - Deploy minimal Express server
   - Test single Anthropic API call

2. **Short-term** (4-7 hours):
   - Implement full orchestrator
   - Migrate one phase (Phase 5 recommended - staged pipeline)
   - Test with single course

3. **Medium-term** (2-3 days):
   - Migrate all phases
   - Update dashboard
   - Full testing

4. **Long-term**:
   - Deprecate osascript system
   - Scale to 100+ concurrent agents if needed
   - Consider moving dashboard backend to same server

---

**Recommendation**: Start with **Option 1 (Claude API Direct)** for Phase 5 (staged pipeline), as it's the most recent and has the clearest architecture. Once proven, migrate other phases.
