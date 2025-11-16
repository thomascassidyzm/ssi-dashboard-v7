# Simple Dashboard Configuration

## Philosophy

Just expose the raw numbers. Let users calculate their own parallelization.

**Example**: 668 seeds in Phase 3
- User enters: `browsers: 20, agents_per_browser: 7, seeds_per_agent: 5`
- Dashboard calculates: `20 × 7 × 5 = 700 capacity` (enough for 668 seeds)
- Shows: "✅ Can process 668 seeds (700 capacity)"

## Dashboard UI (Minimal)

```
┌─────────────────────────────────────────────────────────────┐
│ Automation Settings                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Checkpoint Mode: [Gated ▼]                                  │
│                                                              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Phase 3: LEGO Extraction                                     │
│                                                              │
│   Browsers:            [10]                                  │
│   Agents per browser:  [10]                                  │
│   Seeds per agent:     [10]                                  │
│   ────────────────────────────────────────────              │
│   Total capacity:      1000 seeds                           │
│                                                              │
│   Browser spawn delay: [5000] ms                            │
│   ☐ Headless mode                                           │
│                                                              │
│   ☑ Auto-inject collision avoidance                         │
│   ☑ Block on collisions                                     │
│                                                              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Phase 5: Basket Generation                                   │
│                                                              │
│   Browsers:            [10]                                  │
│   Agents per browser:  [10]                                  │
│   LEGOs per agent:     [10]                                  │
│   ────────────────────────────────────────────              │
│   Total capacity:      1000 LEGOs                           │
│                                                              │
│   Target phrases per LEGO: [10]                             │
│                                                              │
│   Browser spawn delay: [5000] ms                            │
│   ☐ Headless mode                                           │
│                                                              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│              [Reset to Defaults]  [Save Changes]             │
└─────────────────────────────────────────────────────────────┘
```

## Simple Presets

**Laptop (Conservative)**
```json
{
  "phase3": { "browsers": 5, "agents_per_browser": 5, "seeds_per_agent": 10 },
  "phase5": { "browsers": 5, "agents_per_browser": 5, "legos_per_agent": 10 }
}
```
Capacity: 250 seeds, 250 LEGOs

**Desktop (Balanced)**
```json
{
  "phase3": { "browsers": 10, "agents_per_browser": 10, "seeds_per_agent": 10 },
  "phase5": { "browsers": 10, "agents_per_browser": 10, "legos_per_agent": 10 }
}
```
Capacity: 1000 seeds, 1000 LEGOs

**Workstation (Aggressive)**
```json
{
  "phase3": { "browsers": 20, "agents_per_browser": 10, "seeds_per_agent": 10 },
  "phase5": { "browsers": 20, "agents_per_browser": 10, "legos_per_agent": 10 }
}
```
Capacity: 2000 seeds, 2000 LEGOs

**Custom (Your Example)**
```json
{
  "phase3": { "browsers": 20, "agents_per_browser": 7, "seeds_per_agent": 5 }
}
```
Capacity: 700 seeds (perfect for 668 seed course)

## Dashboard Calculations

Show real-time capacity calculations:

```javascript
function calculateCapacity(browsers, agentsPerBrowser, itemsPerAgent) {
  return browsers × agentsPerBrowser × itemsPerAgent;
}

// In UI:
const capacity = calculateCapacity(20, 7, 5); // 700
const courseSize = 668;
const status = capacity >= courseSize ? "✅" : "❌";
const message = `${status} Can process ${courseSize} seeds (${capacity} capacity)`;
```

## Configuration Fields

### Phase 3
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `browsers` | number | 10 | Browser windows to open |
| `agents_per_browser` | number | 10 | Sub-agents per browser (parallel Task calls) |
| `seeds_per_agent` | number | 10 | Seeds assigned to each agent |
| `browser_spawn_delay_ms` | number | 5000 | Delay between opening browsers |
| `headless` | boolean | false | Run browsers invisibly |
| `auto_inject_collision_avoidance` | boolean | true | Add collision instructions to prompts |
| `block_on_collision` | boolean | true | Halt if collisions detected |

**Capacity Formula**: `browsers × agents_per_browser × seeds_per_agent`

### Phase 5
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `browsers` | number | 10 | Browser windows to open |
| `agents_per_browser` | number | 10 | Sub-agents per browser |
| `legos_per_agent` | number | 10 | LEGOs assigned to each agent |
| `target_phrases_per_lego` | number | 10 | Practice phrases per LEGO |
| `browser_spawn_delay_ms` | number | 5000 | Delay between opening browsers |
| `headless` | boolean | false | Run browsers invisibly |

**Capacity Formula**: `browsers × agents_per_browser × legos_per_agent`

## Smart Defaults

When user starts a course, dashboard suggests optimal settings:

```javascript
function suggestSettings(courseSize) {
  // Aim for ~10 items per agent
  const targetItemsPerAgent = 10;

  // Aim for ~10 agents per browser
  const targetAgentsPerBrowser = 10;

  // Calculate total agents needed
  const totalAgents = Math.ceil(courseSize / targetItemsPerAgent);

  // Calculate browsers needed
  const browsers = Math.ceil(totalAgents / targetAgentsPerBrowser);

  return {
    browsers,
    agents_per_browser: Math.ceil(totalAgents / browsers),
    items_per_agent: Math.ceil(courseSize / totalAgents)
  };
}

// Example: 668 seeds
suggestSettings(668);
// Returns: { browsers: 7, agents_per_browser: 10, items_per_agent: 10 }
// Capacity: 7 × 10 × 10 = 700 (covers 668 seeds)
```

Dashboard shows: "Suggested: 7 browsers × 10 agents × 10 seeds = 700 capacity"

## API Endpoints (Simplified)

### GET /api/config
```json
{
  "phase3_lego_extraction": {
    "browsers": 10,
    "agents_per_browser": 10,
    "seeds_per_agent": 10,
    "browser_spawn_delay_ms": 5000,
    "headless": false
  },
  "phase5_basket_generation": {
    "browsers": 10,
    "agents_per_browser": 10,
    "legos_per_agent": 10,
    "browser_spawn_delay_ms": 5000,
    "headless": false
  }
}
```

### PUT /api/config/phase3
```json
{
  "browsers": 20,
  "agents_per_browser": 7,
  "seeds_per_agent": 5
}
```

### PUT /api/config/phase5
```json
{
  "browsers": 10,
  "agents_per_browser": 10,
  "legos_per_agent": 15
}
```

### POST /api/config/suggest
Request:
```json
{
  "phase": "phase3",
  "course_size": 668
}
```

Response:
```json
{
  "browsers": 7,
  "agents_per_browser": 10,
  "seeds_per_agent": 10,
  "capacity": 700,
  "utilization": 95.4
}
```

## Validation

Simple validation rules:

```javascript
const validation = {
  browsers: { min: 1, max: 50 },
  agents_per_browser: { min: 1, max: 20 },
  seeds_per_agent: { min: 1, max: 50 },
  browser_spawn_delay_ms: { min: 1000, max: 30000 }
};
```

Warnings (not errors):
- If `browsers > 20`: "⚠️ High browser count may overwhelm system"
- If `capacity < course_size`: "❌ Insufficient capacity"
- If `capacity > course_size * 2`: "⚠️ Over-provisioned (wasted capacity)"

## Example Use Cases

### Small Test Course (20 seeds)
```
Browsers: 2
Agents per browser: 2
Seeds per agent: 5
Capacity: 20 ✅
```

### Medium Course (250 seeds)
```
Browsers: 5
Agents per browser: 10
Seeds per agent: 5
Capacity: 250 ✅
```

### Your Spanish Course (668 seeds)
```
Browsers: 20
Agents per browser: 7
Seeds per agent: 5
Capacity: 700 ✅ (95% utilization)
```

### Large Course (2000 seeds)
```
Browsers: 20
Agents per browser: 10
Seeds per agent: 10
Capacity: 2000 ✅
```

## No More Complex Strategy Names!

❌ **Old way**: "small_course_strategy", "medium_course_threshold", etc.
✅ **New way**: Just numbers. You do the math. Dashboard helps.

This is much cleaner and gives you total control!
