# Dashboard Configuration Interface

## Overview

The dashboard provides a UI for controlling automation parameters without editing JSON files. This document specifies which parameters are exposed to the dashboard and how they map to `automation.config.json`.

## Architecture Clarification

### Browser → Master Agent → Sub-Agents

```
Browser Window 1 (Claude Code on Web)
    │
    └── Master Agent (1 browser session)
            │
            ├── Task tool call 1 → Sub-agent 1 (Process seeds 1-10)
            ├── Task tool call 2 → Sub-agent 2 (Process seeds 11-20)
            ├── Task tool call 3 → Sub-agent 3 (Process seeds 21-30)
            ├── Task tool call 4 → Sub-agent 4 (Process seeds 31-40)
            ├── Task tool call 5 → Sub-agent 5 (Process seeds 41-50)
            ├── Task tool call 6 → Sub-agent 6 (Process seeds 51-60)
            ├── Task tool call 7 → Sub-agent 7 (Process seeds 61-70)
            ├── Task tool call 8 → Sub-agent 8 (Process seeds 71-80)
            ├── Task tool call 9 → Sub-agent 9 (Process seeds 81-90)
            └── Task tool call 10 → Sub-agent 10 (Process seeds 91-100)
                (All spawned in parallel in same message)

Browser Window 2 (Claude Code on Web)
    │
    └── Master Agent
            └── ... 10 more sub-agents (seeds 101-200)
```

**Key points**:
- `max_concurrent_browsers` = number of browser windows
- Each browser = 1 master agent
- Each master agent spawns `agents_per_segment` sub-agents in **parallel** (single message, multiple Task calls)
- `browser_spawn_delay_ms` = delay between opening **browser windows** (not sub-agents)

## Dashboard Configuration Sections

### 1. Global Settings (Always Visible)

**Checkpoint Mode**
```javascript
{
  label: "Automation Mode",
  type: "radio",
  options: [
    { value: "manual", label: "Manual - Approve each phase" },
    { value: "gated", label: "Gated - Auto if validation passes" },
    { value: "full", label: "Full Auto - CI/CD mode" }
  ],
  default: "gated",
  configPath: "orchestrator.checkpoint_modes.default"
}
```

**Browser Performance**
```javascript
{
  label: "Max Concurrent Browsers",
  type: "slider",
  min: 1,
  max: 20,
  default: 10,
  help: "Number of browser windows to open simultaneously. More = faster but uses more resources.",
  configPath: "phase3_lego_extraction.browser_sessions.max_concurrent_browsers"
}

{
  label: "Browser Spawn Delay (ms)",
  type: "number",
  min: 1000,
  max: 10000,
  default: 5000,
  help: "Delay between opening new browser windows. Increase if experiencing focus issues.",
  configPath: "phase3_lego_extraction.browser_sessions.browser_spawn_delay_ms"
}

{
  label: "Headless Mode",
  type: "checkbox",
  default: false,
  help: "Run browsers invisibly (faster, but harder to debug)",
  configPath: "phase3_lego_extraction.browser_sessions.headless"
}
```

### 2. Phase 3 Settings (Expandable Section)

**Parallelization Strategy**
```javascript
{
  label: "Course Size Thresholds",
  type: "group",
  fields: [
    {
      label: "Small Course (≤ X seeds)",
      type: "number",
      min: 10,
      max: 50,
      default: 20,
      configPath: "phase3_lego_extraction.parallelization.small_course_threshold"
    },
    {
      label: "Medium Course (≤ X seeds)",
      type: "number",
      min: 50,
      max: 200,
      default: 100,
      configPath: "phase3_lego_extraction.parallelization.medium_course_threshold"
    }
  ]
}
```

**Strategy Overrides** (Collapsible Advanced Section)
```javascript
{
  label: "Small Course Strategy",
  type: "group",
  advanced: true,
  fields: [
    {
      label: "Segment Count",
      type: "number",
      min: 1,
      max: 10,
      default: 2,
      help: "How many segments to split small courses into",
      configPath: "phase3_lego_extraction.parallelization.small_course_strategy.segment_count"
    },
    {
      label: "Agents per Segment",
      type: "number",
      min: 1,
      max: 20,
      default: 2,
      help: "Sub-agents spawned per browser (parallel Task calls)",
      configPath: "phase3_lego_extraction.parallelization.small_course_strategy.agents_per_segment"
    }
  ]
}

{
  label: "Medium Course Strategy",
  type: "group",
  advanced: true,
  fields: [
    {
      label: "Segment Count",
      type: "number",
      default: 1,
      readonly: true,
      help: "Medium courses don't segment",
      configPath: "phase3_lego_extraction.parallelization.medium_course_strategy.segment_count"
    },
    {
      label: "Agents per Segment",
      type: "number",
      min: 5,
      max: 20,
      default: 10,
      configPath: "phase3_lego_extraction.parallelization.medium_course_strategy.agents_per_segment"
    },
    {
      label: "Seeds per Agent",
      type: "number",
      min: 5,
      max: 20,
      default: 10,
      configPath: "phase3_lego_extraction.parallelization.medium_course_strategy.seeds_per_agent"
    }
  ]
}

{
  label: "Large Course Strategy",
  type: "group",
  advanced: true,
  fields: [
    {
      label: "Seeds per Segment",
      type: "number",
      min: 50,
      max: 200,
      default: 100,
      help: "Split large courses into segments of this size",
      configPath: "phase3_lego_extraction.parallelization.large_course_strategy.seeds_per_segment"
    },
    {
      label: "Agents per Segment",
      type: "number",
      min: 5,
      max: 20,
      default: 10,
      help: "Sub-agents per browser window",
      configPath: "phase3_lego_extraction.parallelization.large_course_strategy.agents_per_segment"
    },
    {
      label: "Seeds per Agent",
      type: "number",
      min: 5,
      max: 20,
      default: 10,
      configPath: "phase3_lego_extraction.parallelization.large_course_strategy.seeds_per_agent"
    }
  ]
}
```

**Collision Handling**
```javascript
{
  label: "Auto-inject Collision Avoidance",
  type: "checkbox",
  default: true,
  help: "Automatically add collision avoidance instructions to re-extraction prompts",
  configPath: "phase3_lego_extraction.collision_handling.auto_inject_avoidance_instructions"
}

{
  label: "Block on Collisions",
  type: "checkbox",
  default: true,
  help: "Halt pipeline if LEGO collisions detected (gated/manual modes only)",
  configPath: "phase3_lego_extraction.validation.block_on_collision"
}
```

### 3. Phase 5 Settings (Expandable Section)

**Parallelization Strategy**
```javascript
{
  label: "Agent Count Thresholds",
  type: "group",
  fields: [
    {
      label: "Small Course (≤ X LEGOs)",
      type: "number",
      min: 20,
      max: 100,
      default: 50,
      configPath: "phase5_basket_generation.parallelization.small_course_threshold"
    },
    {
      label: "Medium Course (≤ X LEGOs)",
      type: "number",
      min: 100,
      max: 500,
      default: 200,
      configPath: "phase5_basket_generation.parallelization.medium_course_threshold"
    }
  ]
}

{
  label: "Small Course Agents",
  type: "number",
  min: 1,
  max: 5,
  default: 2,
  configPath: "phase5_basket_generation.parallelization.small_course_strategy.agents"
}

{
  label: "Medium Course Agents",
  type: "number",
  min: 2,
  max: 10,
  default: 5,
  configPath: "phase5_basket_generation.parallelization.medium_course_strategy.agents"
}

{
  label: "Large Course Agents",
  type: "number",
  min: 5,
  max: 20,
  default: 10,
  configPath: "phase5_basket_generation.parallelization.large_course_strategy.agents"
}
```

**Practice Generation**
```javascript
{
  label: "Target Phrases per LEGO",
  type: "number",
  min: 5,
  max: 20,
  default: 10,
  help: "How many practice phrases to generate for each LEGO",
  configPath: "phase5_basket_generation.practice_generation.target_phrases_per_lego"
}

{
  label: "Default Overlap Strategy",
  type: "select",
  options: [
    { value: "none", label: "None - No shared LEGOs" },
    { value: "light", label: "Light - Minimal overlap" },
    { value: "medium", label: "Medium - Moderate overlap" },
    { value: "heavy", label: "Heavy - Significant overlap" }
  ],
  default: "none",
  configPath: "phase5_basket_generation.practice_generation.default_overlap"
}
```

### 4. Performance (Expandable Section)

```javascript
{
  label: "Max Retries",
  type: "number",
  min: 1,
  max: 10,
  default: 3,
  help: "How many times to retry failed operations",
  configPath: "performance.max_retries"
}

{
  label: "Retry Backoff (ms)",
  type: "number",
  min: 1000,
  max: 30000,
  default: 5000,
  help: "Exponential backoff delay for retries",
  configPath: "performance.retry_backoff_ms"
}

{
  label: "Browser Timeout (ms)",
  type: "number",
  min: 60000,
  max: 600000,
  default: 300000,
  help: "Maximum time to wait for browser operations (5 min default)",
  configPath: "phase3_lego_extraction.browser_sessions.browser_timeout_ms"
}
```

## Dashboard UI Mock

```
┌─────────────────────────────────────────────────────────────┐
│ SSi Course Production - Automation Settings                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Global Settings                                              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│ Automation Mode:  ◉ Gated    ○ Manual    ○ Full Auto       │
│                                                              │
│ Max Concurrent Browsers:  [=========●=====] 10              │
│                          1                20                 │
│                                                              │
│ Browser Spawn Delay:  [5000] ms                             │
│                                                              │
│ ☐ Headless Mode                                             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ ▼ Phase 3: LEGO Extraction                                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│ Parallelization Strategy:                                    │
│   Small Course Threshold:  [20] seeds                        │
│   Medium Course Threshold: [100] seeds                       │
│                                                              │
│ Collision Handling:                                          │
│   ☑ Auto-inject Collision Avoidance                         │
│   ☑ Block on Collisions                                     │
│                                                              │
│ [▸ Advanced Settings]                                        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ ▼ Phase 5: Basket Generation                                │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│ Agent Counts:                                                │
│   Small Course (≤50 LEGOs):  [2] agents                     │
│   Medium Course (≤200 LEGOs): [5] agents                    │
│   Large Course (>200 LEGOs):  [10] agents                   │
│                                                              │
│ Practice Generation:                                         │
│   Target Phrases per LEGO: [10]                             │
│   Overlap Strategy: [None ▼]                                │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ ▸ Performance                                                │
│ ▸ Development                                                │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                      [Reset to Defaults]  [Save Changes]     │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints for Dashboard

### GET /api/config
Returns current configuration
```json
{
  "orchestrator": { "checkpoint_modes": { "default": "gated" } },
  "phase3_lego_extraction": { ... },
  "phase5_basket_generation": { ... }
}
```

### POST /api/config/update
Update configuration
```json
{
  "path": "phase3_lego_extraction.browser_sessions.max_concurrent_browsers",
  "value": 15
}
```

### POST /api/config/reset
Reset to defaults
```json
{
  "section": "phase3_lego_extraction"  // Optional, omit to reset all
}
```

### GET /api/config/validation
Validate current configuration
```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    "max_concurrent_browsers=20 may overwhelm system with <16GB RAM"
  ]
}
```

## Parameters NOT Exposed to Dashboard

These should remain in config file only (expert-level):

- `paths.*` - VFS and script paths
- `ports.*` - Service ports
- `orchestrator.validation_gates` - Which validators run
- `development.mock_claude_api` - Testing flags
- Collision manifest path
- FCFS rule

## Preset Configurations

Dashboard could offer presets:

**"Conservative" (Laptop)**
- Max browsers: 5
- Spawn delay: 7000ms
- Small course: 2 agents
- Large course: 5 agents

**"Balanced" (Desktop)**
- Max browsers: 10
- Spawn delay: 5000ms
- Small course: 2 agents
- Large course: 10 agents

**"Aggressive" (Workstation)**
- Max browsers: 20
- Spawn delay: 3000ms
- Small course: 4 agents
- Large course: 15 agents

**"CI/CD" (Server)**
- Max browsers: 15
- Headless: true
- Checkpoint mode: full
- Block on collision: false

## Implementation Notes

1. **Real-time validation**: Validate input ranges before saving
2. **Restart required**: Some changes (e.g., ports) require service restart - show warning
3. **Per-course overrides**: Allow course-specific config that inherits from global
4. **Change history**: Track who changed what when (audit log)
5. **Import/Export**: Allow saving/loading config presets

## Related Files

- `automation.config.json` - Config storage
- `services/config-loader.cjs` - Config loading utility
- Dashboard component: `src/components/AutomationSettings.tsx` (to be created)
- API routes: `src/routes/api/config.ts` (to be created)
