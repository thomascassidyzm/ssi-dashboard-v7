# Dashboard Progress Tracking

## What We Can Track

Since we can't see **inside** browser windows, we track **external events**:

✅ Browser spawned
✅ Branch created (git push from browser)
✅ Branch detected by automation server
✅ Branch merged to main
✅ File written to VFS

## Progress Events

### Phase 3: LEGO Extraction

```
┌──────────────────────────────────────────────────────┐
│ Phase 3: LEGO Extraction - Spanish (668 seeds)       │
├──────────────────────────────────────────────────────┤
│                                                       │
│ Configuration:                                        │
│   7 browsers × 10 agents × 10 seeds = 700 capacity  │
│                                                       │
│ Progress:                                             │
│   [████████████████░░░░░░░░] 62% (5/7 segments)      │
│                                                       │
│ Status:                                               │
│   ✅ Segment 1 (seeds 1-100)   - Merged              │
│   ✅ Segment 2 (seeds 101-200) - Merged              │
│   ✅ Segment 3 (seeds 201-300) - Merged              │
│   ✅ Segment 4 (seeds 301-400) - Merged              │
│   ✅ Segment 5 (seeds 401-500) - Merged              │
│   🔄 Segment 6 (seeds 501-600) - Branch detected     │
│   ⏳ Segment 7 (seeds 601-668) - Browser spawned     │
│                                                       │
│ Recent Activity:                                      │
│   14:23:45 - Segment 5 merged to main               │
│   14:23:12 - Branch phase3-segment-6 detected       │
│   14:22:58 - Browser 7 spawned                      │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Phase 5: Basket Generation

```
┌──────────────────────────────────────────────────────┐
│ Phase 5: Basket Generation - Spanish (2716 LEGOs)    │
├──────────────────────────────────────────────────────┤
│                                                       │
│ Configuration:                                        │
│   20 browsers × 7 agents × 20 LEGOs = 2800 capacity │
│                                                       │
│ Progress:                                             │
│   [█████████████████████░] 89% (2421/2716 baskets)   │
│                                                       │
│ Browsers:                                             │
│   ✅ 15 complete  🔄 3 active  ⏳ 2 pending           │
│                                                       │
│ Recent Merges:                                        │
│   14:45:23 - S0650_basket → lego_baskets.json       │
│   14:45:18 - S0649_basket → lego_baskets.json       │
│   14:45:12 - S0648_basket → lego_baskets.json       │
│                                                       │
│ Activity Stream:                                      │
│   🔄 Branch phase5-basket-S0651 detected            │
│   ✅ Merged S0650 (2421/2716)                       │
│   ✅ Merged S0649 (2420/2716)                       │
│   🌐 Browser 18 spawned                             │
│                                                       │
└──────────────────────────────────────────────────────┘
```

## Event Types

### 1. Browser Events
```javascript
{
  type: 'BROWSER_SPAWNED',
  timestamp: '2025-11-16T14:22:58Z',
  phase: 'phase3',
  browser_id: 7,
  assigned_items: 'seeds 601-668'
}

{
  type: 'BROWSER_TIMEOUT',
  timestamp: '2025-11-16T14:28:00Z',
  browser_id: 7,
  error: 'No activity for 5 minutes'
}
```

### 2. Git Events
```javascript
{
  type: 'BRANCH_CREATED',
  timestamp: '2025-11-16T14:23:12Z',
  branch: 'phase3-segment-6',
  pushed_by: 'browser_6'
}

{
  type: 'BRANCH_DETECTED',
  timestamp: '2025-11-16T14:23:14Z',
  branch: 'phase3-segment-6',
  watcher: 'phase3-server'
}

{
  type: 'BRANCH_MERGED',
  timestamp: '2025-11-16T14:23:45Z',
  branch: 'phase3-segment-6',
  files_merged: ['lego_pairs.json'],
  new_items: 100
}
```

### 3. File Events
```javascript
{
  type: 'FILE_WRITTEN',
  timestamp: '2025-11-16T14:23:45Z',
  file: 'lego_pairs.json',
  size: '245KB',
  items_count: 500
}

{
  type: 'FILE_DELETED',
  timestamp: '2025-11-16T14:25:00Z',
  file: 'phase5_outputs/S0650_basket.json',
  reason: 'cleanup_after_merge'
}
```

## WebSocket API

Dashboard subscribes to real-time events:

```javascript
const ws = new WebSocket('ws://localhost:3456/progress');

ws.onmessage = (event) => {
  const progressEvent = JSON.parse(event.data);

  switch (progressEvent.type) {
    case 'BROWSER_SPAWNED':
      updateBrowserStatus(progressEvent);
      break;
    case 'BRANCH_MERGED':
      updateProgressBar(progressEvent);
      addActivityLog(progressEvent);
      break;
    case 'PHASE_COMPLETE':
      showCompletionNotification(progressEvent);
      break;
  }
};
```

## Progress Calculation

### Phase 3: Segments
```javascript
function calculatePhase3Progress(state) {
  const { totalSegments, mergedSegments } = state;
  const percentage = (mergedSegments / totalSegments) * 100;

  return {
    percentage,
    status: `${mergedSegments}/${totalSegments} segments`,
    complete: mergedSegments === totalSegments
  };
}
```

### Phase 5: Baskets
```javascript
function calculatePhase5Progress(state) {
  const { totalLegos, mergedBaskets } = state;
  const percentage = (mergedBaskets / totalLegos) * 100;

  return {
    percentage,
    status: `${mergedBaskets}/${totalLegos} baskets`,
    complete: mergedBaskets === totalLegos
  };
}
```

## Activity Timeline

Show chronological log of events:

```
┌──────────────────────────────────────────────────────┐
│ Activity Timeline                                     │
├──────────────────────────────────────────────────────┤
│                                                       │
│ 14:45:23 ✅ Merged S0650_basket (2421/2716)          │
│ 14:45:18 ✅ Merged S0649_basket (2420/2716)          │
│ 14:45:12 ✅ Merged S0648_basket (2419/2716)          │
│ 14:45:05 🔄 Branch phase5-basket-S0651 detected      │
│ 14:44:58 🌐 Browser 18 spawned                       │
│ 14:44:52 ✅ Merged S0647_basket (2418/2716)          │
│ 14:44:45 🔄 Branch phase5-basket-S0650 detected      │
│ 14:44:38 🌐 Browser 17 spawned (delay: 5000ms)       │
│ 14:44:32 ✅ Merged S0646_basket (2417/2716)          │
│ 14:44:25 🗑️  Deleted phase5_outputs/S0646_basket.json│
│                                                       │
│ [Show More]                                           │
└──────────────────────────────────────────────────────┘
```

## Server-Side Event Tracking

### Phase 3 Server
```javascript
class Phase3Server {
  constructor() {
    this.progressTracker = {
      totalSegments: 0,
      mergedSegments: 0,
      browsers: new Map(), // browser_id → status
      branches: new Map()  // branch_name → status
    };
  }

  async onBrowserSpawn(browserId, assignedSeeds) {
    this.progressTracker.browsers.set(browserId, {
      status: 'active',
      assigned: assignedSeeds,
      spawned_at: new Date()
    });

    this.broadcastProgress({
      type: 'BROWSER_SPAWNED',
      browser_id: browserId,
      assigned_items: assignedSeeds
    });
  }

  async onBranchDetected(branchName) {
    this.progressTracker.branches.set(branchName, {
      status: 'detected',
      detected_at: new Date()
    });

    this.broadcastProgress({
      type: 'BRANCH_DETECTED',
      branch: branchName
    });
  }

  async onBranchMerged(branchName) {
    this.progressTracker.mergedSegments++;

    this.broadcastProgress({
      type: 'BRANCH_MERGED',
      branch: branchName,
      progress: {
        merged: this.progressTracker.mergedSegments,
        total: this.progressTracker.totalSegments,
        percentage: (this.progressTracker.mergedSegments / this.progressTracker.totalSegments) * 100
      }
    });

    if (this.progressTracker.mergedSegments === this.progressTracker.totalSegments) {
      this.broadcastProgress({
        type: 'PHASE_COMPLETE',
        phase: 'phase3'
      });
    }
  }

  broadcastProgress(event) {
    // Send to all connected WebSocket clients
    this.wsClients.forEach(client => {
      client.send(JSON.stringify(event));
    });
  }
}
```

## UI Components

### Progress Bar Component
```jsx
function ProgressBar({ current, total, phase }) {
  const percentage = (current / total) * 100;

  return (
    <div className="progress-container">
      <div className="progress-header">
        <span>{phase}: {current}/{total}</span>
        <span>{percentage.toFixed(1)}%</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

### Activity Feed Component
```jsx
function ActivityFeed({ events }) {
  return (
    <div className="activity-feed">
      <h3>Recent Activity</h3>
      {events.map(event => (
        <ActivityItem key={event.id} event={event} />
      ))}
    </div>
  );
}

function ActivityItem({ event }) {
  const icon = {
    'BROWSER_SPAWNED': '🌐',
    'BRANCH_DETECTED': '🔄',
    'BRANCH_MERGED': '✅',
    'FILE_DELETED': '🗑️'
  }[event.type];

  return (
    <div className="activity-item">
      <span className="timestamp">{formatTime(event.timestamp)}</span>
      <span className="icon">{icon}</span>
      <span className="message">{formatMessage(event)}</span>
    </div>
  );
}
```

## Summary

**What Dashboard Can Show**:
- ✅ Real-time progress bars (segment/basket completion)
- ✅ Browser spawn events
- ✅ Branch creation/merge events
- ✅ File write/delete events
- ✅ Activity timeline
- ✅ Current status of each browser/segment

**What Dashboard Cannot Show** (browser internals):
- ❌ Individual agent progress within a browser
- ❌ Current seed being processed
- ❌ Claude's thinking process
- ❌ Error details from within browser

**Solution**: Track external events (git, file system) for accurate progress updates!
