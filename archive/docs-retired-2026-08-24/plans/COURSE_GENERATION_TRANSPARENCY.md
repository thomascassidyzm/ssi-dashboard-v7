# Course Generation Transparency Overhaul

> **Status**: Planning
> **Created**: 2025-12-18
> **Goal**: Full visibility into browser spawning, agent execution, and seed completion

## Problem Statement

Current course generation is a black box:
- No visibility into which browsers spawned
- No tracking of individual agents within browsers
- No seed-level status tracking
- Gap-fill triggers but we don't know why seeds failed
- Dashboard shows only aggregate progress, not swim lanes

## Architecture Overview (APML 12 Directions)

Following APML principles of transparency, traceability, and progressive disclosure.

### Full Pipeline View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COURSE PIPELINE: zho_for_eng                    Mode: Quick Test (10)      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │   PHASE 1    │───▶│   PHASE 2    │───▶│   PHASE 3    │───▶│   AUDIO    │ │
│  │ Translation  │    │  Conflict    │    │   Baskets    │    │    TTS     │ │
│  │              │    │  Resolution  │    │              │    │            │ │
│  │  ████████░░  │    │  ░░░░░░░░░░  │    │  ░░░░░░░░░░  │    │  ░░░░░░░░  │ │
│  │   8/10 ✓    │    │   pending    │    │   pending    │    │  pending   │ │
│  │  Job: p1-001 │    │              │    │              │    │            │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └────────────┘ │
│                                                                              │
│  ▼ PHASE 1 DETAIL (click to expand/collapse)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Job ID: p1-001    Status: RUNNING    Started: 14:39:17                     │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Browser 1       │  │ Browser 2       │  │ Browser 3       │              │
│  │ Status: COMPLETE│  │ Status: FAILED  │  │ Status: RUNNING │              │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤              │
│  │ Agent 1.1       │  │ Agent 2.1       │  │ Agent 3.1       │              │
│  │ S0001 ✓ S0002 ✓│  │ S0005 ✗ S0006 ✗│  │ S0009 ⏳ S0010 ⏳│              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                              │
│  Seeds: ✓✓✓✓✗✗✓✓⏳⏳  (8/10 complete, 2 failed, 0 pending)                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase Progression with Job History

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: Conflict Resolution                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Input: 10 seeds from Phase 1 (p1-001)                                      │
│  Job ID: p2-001    Status: COMPLETE    Duration: 45s                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Conflicts Found: 3                                                      ││
│  │ ├─ S0003: "quiero" vs "deseo" → Resolved: "quiero" (frequency)         ││
│  │ ├─ S0007: duplicate LEGO "el" → Merged                                  ││
│  │ └─ S0009: type mismatch A/M → Resolved: M-type                          ││
│  │                                                                          ││
│  │ Output: lego_pairs.json (10 seeds, 47 LEGOs)                            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ▶ Auto-advancing to Phase 3...                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: Basket Generation                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Input: 47 LEGOs from Phase 2 (p2-001)                                      │
│  Job ID: p3-001    Status: RUNNING    Elapsed: 2m 15s                       │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Browser 1       │  │ Browser 2       │  │ Browser 3       │              │
│  │ LEGOs 1-16      │  │ LEGOs 17-32     │  │ LEGOs 33-47     │              │
│  │ ████████████░░  │  │ ██████░░░░░░░░  │  │ ████░░░░░░░░░░  │              │
│  │ 12/16 complete  │  │ 6/16 complete   │  │ 4/15 complete   │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                              │
│  Baskets Generated: 22/47                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Single Phase Detail View (Current)

## Data Model

### 0. Pipeline (Top Level)

```typescript
interface Pipeline {
  pipelineId: string;       // "pipeline-zho_for_eng-20251218"
  courseCode: string;
  mode: 'quick_test' | 'mvp_course' | 'full_course';
  status: 'running' | 'complete' | 'failed' | 'paused';

  // Phase progression
  phases: {
    phase1: PhaseStatus;
    phase2: PhaseStatus;
    phase3: PhaseStatus;
    audio: PhaseStatus;
    manifest: PhaseStatus;
  };

  // Current active phase
  currentPhase: 'phase1' | 'phase2' | 'phase3' | 'audio' | 'manifest' | null;

  // Job history (all jobs across all phases)
  jobs: GenerationJob[];

  // Timing
  startedAt: string;
  completedAt?: string;
  totalDuration?: number;   // seconds

  // Summary stats
  stats: {
    seedsTotal: number;
    seedsComplete: number;
    legosGenerated: number;
    basketsGenerated: number;
    audioFilesGenerated: number;
  };
}

interface PhaseStatus {
  status: 'pending' | 'running' | 'complete' | 'failed' | 'skipped';
  jobId?: string;           // Current or last job for this phase
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  inputCount?: number;      // Seeds/LEGOs/etc going in
  outputCount?: number;     // Items produced
  error?: string;
}
```

### 1. Generation Job (Per-Phase)

```typescript
interface GenerationJob {
  jobId: string;
  courseCode: string;
  mode: 'quick_test' | 'mvp_course' | 'full_course';
  phase: number;

  // Seed tracking
  seeds: {
    total: number;
    pending: string[];    // S0001, S0002...
    processing: string[];
    completed: string[];
    failed: string[];
  };

  // Browser/Master tracking
  browsers: BrowserInstance[];

  // Timing
  startedAt: string;
  lastActivityAt: string;

  // Gap-fill
  gapFillAttempts: number;
  maxGapFillAttempts: number;
}
```

### 2. Browser Instance

```typescript
interface BrowserInstance {
  browserId: string;        // "browser-1", "browser-2"
  status: 'spawning' | 'ready' | 'running' | 'complete' | 'failed' | 'timeout';

  // Assigned work
  assignedSeeds: string[];  // Seeds this browser is responsible for

  // Agents within this browser
  agents: AgentInstance[];

  // Timing
  spawnedAt: string;
  readyAt?: string;
  completedAt?: string;

  // Error info
  error?: string;
}
```

### 3. Agent Instance

```typescript
interface AgentInstance {
  agentId: string;          // "browser-1-agent-1"
  browserId: string;
  status: 'spawning' | 'running' | 'complete' | 'failed';

  // Assigned work
  assignedSeeds: string[];
  completedSeeds: string[];
  failedSeeds: string[];
  currentSeed?: string;

  // Timing
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string;
}
```

### 4. Seed Status

```typescript
interface SeedStatus {
  seedId: string;           // "S0001"
  status: 'pending' | 'assigned' | 'processing' | 'complete' | 'failed';

  // Assignment
  browserId?: string;
  agentId?: string;

  // Timing
  assignedAt?: string;
  processingStartedAt?: string;
  completedAt?: string;

  // Result
  result?: any;             // The actual translation/LEGO data
  error?: string;
}
```

## WebSocket Events

### From Phase Server → Orchestrator

```typescript
// Browser lifecycle
{ event: 'browser:spawning', browserId: string, assignedSeeds: string[] }
{ event: 'browser:ready', browserId: string }
{ event: 'browser:failed', browserId: string, error: string }
{ event: 'browser:timeout', browserId: string }
{ event: 'browser:complete', browserId: string }

// Agent lifecycle
{ event: 'agent:spawning', browserId: string, agentId: string, assignedSeeds: string[] }
{ event: 'agent:running', agentId: string }
{ event: 'agent:complete', agentId: string, completedSeeds: string[] }
{ event: 'agent:failed', agentId: string, error: string }

// Seed lifecycle
{ event: 'seed:processing', seedId: string, agentId: string }
{ event: 'seed:complete', seedId: string, agentId: string }
{ event: 'seed:failed', seedId: string, agentId: string, error: string }

// Batch submission
{ event: 'batch:received', seedIds: string[], agentId: string }

// Recovery
{ event: 'gap-fill:triggered', missingSeeds: string[], attempt: number }
{ event: 'gap-fill:complete', recoveredSeeds: string[] }
{ event: 'gap-fill:failed', remainingSeeds: string[] }
```

### From Orchestrator → Dashboard (via WebSocket)

```typescript
// Full state update (on connect or major change)
{
  event: 'job:state',
  job: GenerationJob
}

// Incremental updates
{ event: 'browser:update', browser: BrowserInstance }
{ event: 'agent:update', agent: AgentInstance }
{ event: 'seed:update', seed: SeedStatus }
{ event: 'log:entry', log: { time: string, level: string, message: string } }
```

## Implementation Plan

### Phase 1: Data Model & State Tracking

1. **Orchestrator changes** (`orchestrator.cjs`)
   - Add `GenerationJob` tracking with full data model
   - Track individual browsers, agents, seeds
   - Store state in memory (Map) with WebSocket emit on change

2. **Phase 1 Server changes** (`phase1-translation/server.cjs`)
   - Report browser spawn status to orchestrator
   - Report agent spawn status
   - Report seed-level progress
   - Use HTTP callbacks or WebSocket to orchestrator

### Phase 2: WebSocket Event Flow

1. **Orchestrator WebSocket enhancements**
   - Emit granular events (not just aggregate progress)
   - Support `subscribe` to specific job
   - Send full state on connect, incremental updates after

2. **Event handler in orchestrator**
   - Endpoint for phase servers to report events
   - `/api/events/browser`, `/api/events/agent`, `/api/events/seed`

### Phase 3: Dashboard UI

1. **New component: `GenerationMonitor.vue`**
   - Swim lane view of browsers
   - Nested agent cards
   - Seed status grid
   - Live event log

2. **WebSocket integration**
   - Connect to orchestrator WebSocket
   - Subscribe to active job
   - Update UI in real-time

### Phase 4: Robust Spawn & Recovery

1. **Browser spawn verification**
   - Timeout detection per browser
   - Retry individual failed browsers
   - Don't wait for all browsers if some fail

2. **Agent health monitoring**
   - Heartbeat from agents
   - Detect stalled agents (no progress for X seconds)
   - Reassign seeds from failed agents

3. **Smarter gap-fill**
   - Know exactly which seeds failed and why
   - Target specific browsers/agents for recovery
   - Don't re-spawn entire job

## File Changes Required

### Orchestrator (`services/orchestration/orchestrator.cjs`)
- [ ] Add GenerationJob state model
- [ ] Add browser/agent/seed tracking functions
- [ ] Add event ingestion endpoints
- [ ] Enhance WebSocket emit with granular events
- [ ] Add job state query endpoint

### Phase 1 Server (`services/phases/phase1-translation/server.cjs`)
- [ ] Report browser spawn events to orchestrator
- [ ] Report agent lifecycle events
- [ ] Report seed-level progress
- [ ] Add timeout/retry logic for browser spawn

### Dashboard (`src/views/CourseGeneration.vue` or new component)
- [ ] Add WebSocket connection to orchestrator
- [ ] Build swim lane UI component
- [ ] Build live event log component
- [ ] Build seed status grid component

### New Files
- [ ] `src/components/generation/GenerationMonitor.vue`
- [ ] `src/components/generation/BrowserLane.vue`
- [ ] `src/components/generation/AgentCard.vue`
- [ ] `src/components/generation/SeedGrid.vue`
- [ ] `src/components/generation/EventLog.vue`

## Success Criteria

1. **Before clicking "Generate"**: Know exactly what will spawn (X browsers, Y agents each, Z seeds each)
2. **During generation**: See real-time swim lanes with browser/agent status
3. **On failure**: Know EXACTLY which browser/agent/seed failed and why
4. **On gap-fill**: See targeted recovery, not blind retry
5. **On completion**: Full audit trail of what happened

## Questions to Resolve

1. Should agents report directly to orchestrator, or through phase server?
2. How do we handle browser tabs that never call back (no failure, just silence)?
3. Should we persist job state to database for crash recovery?
4. How granular should WebSocket updates be? (every seed vs batched)

---

*This document follows APML 12 Directions: Transparency, Traceability, Progressive Disclosure*
