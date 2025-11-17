# Real-Time Progress Monitoring System

## Overview

Enhanced monitoring to show **what's happening** during phase execution:
- Which Claude Code windows are open
- What each window is doing
- When branches are pushed to GitHub
- When branches are merged to main
- Real-time event stream

## Architecture

```
┌────────────────────────────────────────────────────────┐
│  Automation Server (Backend)                           │
├────────────────────────────────────────────────────────┤
│                                                         │
│  job.events = [                                        │
│    { type: 'window_opened', window: 1, task: '...' }  │
│    { type: 'branch_pushed', branch: 'claude/...' }    │
│    { type: 'branch_merged', branch: '...' }           │
│  ]                                                      │
│                                                         │
│  Every action adds an event to job.events[]            │
│                                                         │
└────────────────────────────────────────────────────────┘
         ↓ (polls every 30s)
┌────────────────────────────────────────────────────────┐
│  Dashboard (Frontend)                                   │
├────────────────────────────────────────────────────────┤
│                                                         │
│  GET /api/courses/:code/status                         │
│    → Returns: { status, phase, events[] }              │
│                                                         │
│  Displays:                                              │
│    📋 Event Timeline (scrollable)                      │
│    🪟 Active Windows (collapsible)                     │
│    🌿 Git Activity (push/merge status)                │
│                                                         │
└────────────────────────────────────────────────────────┘
```

## Event Types

### Window Events
```javascript
{
  type: 'window_opened',
  timestamp: '2025-01-14T15:30:00Z',
  window: 1,
  phase: 'phase_5',
  task: 'Generate practice baskets for seeds S0001-S0100',
  url: 'https://claude.ai/...' // Optional
}

{
  type: 'window_ready',
  timestamp: '2025-01-14T15:30:05Z',
  window: 1,
  message: 'Prompt pasted - ready for user to hit Enter'
}
```

### Git Events
```javascript
{
  type: 'branch_detected',
  timestamp: '2025-01-14T15:35:00Z',
  branch: 'claude/phase5-20250114-abc123',
  commitTime: '2025-01-14T15:34:50Z'
}

{
  type: 'branch_pushed',
  timestamp: '2025-01-14T15:35:00Z',
  branch: 'claude/phase5-20250114-abc123',
  commits: 1
}

{
  type: 'branch_merging',
  timestamp: '2025-01-14T15:35:10Z',
  branch: 'claude/phase5-20250114-abc123'
}

{
  type: 'branch_merged',
  timestamp: '2025-01-14T15:35:15Z',
  branch: 'claude/phase5-20250114-abc123',
  target: 'main'
}

{
  type: 'push_complete',
  timestamp: '2025-01-14T15:35:20Z',
  branch: 'main',
  remote: 'origin'
}
```

### Phase Events
```javascript
{
  type: 'phase_started',
  timestamp: '2025-01-14T15:30:00Z',
  phase: 'phase_5'
}

{
  type: 'phase_complete',
  timestamp: '2025-01-14T15:40:00Z',
  phase: 'phase_5',
  method: 'git-based' // or 'file-based'
}
```

## Implementation

### Backend (automation_server.cjs)

Add event tracking to job state:

```javascript
const job = {
  courseCode,
  status: 'in_progress',
  phase: 'phase_5',
  progress: 70,
  startTime: new Date(),
  events: [], // NEW: Event timeline
  windows: [] // NEW: Active windows
}

// Helper function
function addEvent(job, event) {
  if (!job.events) job.events = [];
  job.events.push({
    ...event,
    timestamp: new Date().toISOString()
  });

  // Keep last 100 events
  if (job.events.length > 100) {
    job.events = job.events.slice(-100);
  }
}

// Usage
addEvent(job, {
  type: 'window_opened',
  window: 1,
  phase: 'phase_5',
  task: 'Generate practice baskets for seeds S0001-S0100'
});
```

### Update spawnClaudeWebAgent

```javascript
async function spawnClaudeWebAgent(prompt, windowNum, browser = 'safari') {
  // Add event: Opening window
  if (currentJob) {
    addEvent(currentJob, {
      type: 'window_opening',
      window: windowNum,
      browser
    });
  }

  // Open browser and paste prompt...
  await execAsync(`osascript ...`);

  // Add event: Window ready
  if (currentJob) {
    addEvent(currentJob, {
      type: 'window_ready',
      window: windowNum,
      message: 'Prompt pasted - ready for execution'
    });
  }
}
```

### Update pollGitBranches

```javascript
async function pollGitBranches(baseCourseDir, jobStartTime, phasePattern, job) {
  // ... existing code ...

  const newBranches = // ... detect new branches ...

  if (newBranches.length > 0) {
    for (const branch of newBranches) {
      if (branch.isNew) {
        // Add event: Branch detected
        addEvent(job, {
          type: 'branch_detected',
          branch: branch.branch,
          commitTime: branch.commitTime.toISOString()
        });
      }
    }
  }

  return newBranches;
}
```

### Update merge logic

```javascript
// Before merge
addEvent(job, {
  type: 'branch_merging',
  branch: branchName
});

await execAsync(`git merge ${branch} ...`);

// After merge
addEvent(job, {
  type: 'branch_merged',
  branch: branchName,
  target: 'main'
});

// After push
await execAsync('git push origin main');
addEvent(job, {
  type: 'push_complete',
  branch: 'main',
  remote: 'origin'
});
```

## Frontend UI

### Enhanced ProgressMonitor Component

Add new sections to ProgressMonitor.vue:

```vue
<template>
  <div class="progress-monitor">

    <!-- Existing phase progress -->
    <div class="phase-progress">...</div>

    <!-- NEW: Event Timeline -->
    <div class="event-timeline bg-slate-800/50 rounded-lg p-4 mt-6">
      <h4 class="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        📋 Activity Timeline
        <span class="text-xs text-slate-500">({{ events.length }} events)</span>
      </h4>

      <div class="space-y-2 max-h-64 overflow-y-auto">
        <div
          v-for="(event, i) in reversedEvents"
          :key="i"
          class="flex items-start gap-3 text-xs bg-slate-900/50 rounded p-2"
        >
          <span class="text-slate-500">{{ formatTime(event.timestamp) }}</span>
          <span :class="eventIcon(event.type)">{{ getEventIcon(event.type) }}</span>
          <span class="text-slate-300 flex-1">{{ formatEvent(event) }}</span>
        </div>
      </div>
    </div>

    <!-- NEW: Active Windows -->
    <div v-if="windows.length > 0" class="active-windows bg-slate-800/50 rounded-lg p-4 mt-4">
      <h4 class="text-sm font-semibold text-slate-300 mb-3">
        🪟 Active Claude Code Windows ({{ windows.length }})
      </h4>

      <div class="space-y-2">
        <div
          v-for="window in windows"
          :key="window.id"
          class="bg-slate-900/50 rounded p-3 text-xs"
        >
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono text-cyan-400">Window {{ window.id }}</span>
            <span class="text-slate-500">•</span>
            <span class="text-emerald-400">{{ window.phase }}</span>
          </div>
          <p class="text-slate-400">{{ window.task }}</p>
        </div>
      </div>
    </div>

    <!-- NEW: Git Activity -->
    <div class="git-activity bg-slate-800/50 rounded-lg p-4 mt-4">
      <h4 class="text-sm font-semibold text-slate-300 mb-3">
        🌿 Git Activity
      </h4>

      <div class="space-y-2 text-xs">
        <div v-if="gitStats.branchesDetected > 0" class="flex items-center gap-2">
          <span class="text-blue-400">📤</span>
          <span class="text-slate-300">{{ gitStats.branchesDetected }} branch(es) pushed</span>
        </div>
        <div v-if="gitStats.branchesMerged > 0" class="flex items-center gap-2">
          <span class="text-green-400">✓</span>
          <span class="text-slate-300">{{ gitStats.branchesMerged }} branch(es) merged</span>
        </div>
        <div v-if="gitStats.pushesToMain > 0" class="flex items-center gap-2">
          <span class="text-emerald-400">🚀</span>
          <span class="text-slate-300">{{ gitStats.pushesToMain }} push(es) to main</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
const events = ref([])
const windows = ref([])
const gitStats = computed(() => {
  return {
    branchesDetected: events.value.filter(e => e.type === 'branch_detected').length,
    branchesMerged: events.value.filter(e => e.type === 'branch_merged').length,
    pushesToMain: events.value.filter(e => e.type === 'push_complete').length
  }
})

const reversedEvents = computed(() => [...events.value].reverse())

function formatEvent(event) {
  switch (event.type) {
    case 'window_opened':
      return `Opened window ${event.window} for ${event.phase}`
    case 'window_ready':
      return `Window ${event.window} ready - ${event.message}`
    case 'branch_detected':
      return `Detected new branch: ${event.branch}`
    case 'branch_merged':
      return `Merged ${event.branch} → ${event.target}`
    case 'push_complete':
      return `Pushed ${event.branch} to ${event.remote}`
    case 'phase_complete':
      return `Phase complete (${event.method})`
    default:
      return event.type
  }
}

function getEventIcon(type) {
  const icons = {
    window_opened: '🪟',
    window_ready: '✓',
    branch_detected: '📤',
    branch_merging: '⚙️',
    branch_merged: '✓',
    push_complete: '🚀',
    phase_started: '▶️',
    phase_complete: '✅'
  }
  return icons[type] || '•'
}

async function checkProgress() {
  const response = await apiClient.get(`/api/courses/${props.courseCode}/status`)
  if (response.data) {
    events.value = response.data.events || []
    windows.value = response.data.windows || []
    // ... existing code ...
  }
}
</script>
```

## Benefits

✅ **Visibility** - See exactly what's happening in real-time
✅ **Transparency** - Know when windows open, branches push, merges happen
✅ **Debugging** - Easy to spot where things get stuck
✅ **Progress** - Clear timeline of events
✅ **Multi-phase** - Works for Phase 1, 3, 5, 6, 7
✅ **Non-intrusive** - Just adds metadata, doesn't change workflow

## Next Steps

1. Add `addEvent()` helper to automation_server.cjs
2. Update all spawn/merge functions to emit events
3. Expand job state to include `events[]` and `windows[]`
4. Update `/api/courses/:code/status` endpoint to return events
5. Update ProgressMonitor.vue to display event timeline
6. Test with Phase 5 run

## Example Timeline

```
15:30:00 ▶️  Phase 5 started
15:30:01 🪟  Opened window 1 for phase_5
15:30:05 ✓   Window 1 ready - Prompt pasted
15:30:10 🪟  Opened window 2 for phase_5
15:30:15 ✓   Window 2 ready - Prompt pasted
15:34:50 📤  Detected new branch: claude/phase5-20250114-abc123
15:34:55 📤  Detected new branch: claude/phase5-20250114-def456
15:35:00 ⚙️  Merging claude/phase5-20250114-abc123
15:35:05 ✓   Merged claude/phase5-20250114-abc123 → main
15:35:10 ⚙️  Merging claude/phase5-20250114-def456
15:35:15 ✓   Merged claude/phase5-20250114-def456 → main
15:35:20 🚀  Pushed main to origin
15:35:25 ✅  Phase 5 complete (git-based)
```

This gives you **full visibility** into what's happening without needing to check content quality!
