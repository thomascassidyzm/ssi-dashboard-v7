# Automation Configuration Guide

## Overview

The SSi Course Production automation system is configured via `automation.config.json`. This centralized configuration controls parallelization strategies, collision handling, validation gates, and performance tuning.

## Configuration File Location

```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/automation.config.json
```

## Loading Configuration

All services use the centralized `config-loader.cjs`:

```javascript
const { loadConfig, getPhase3Segmentation, getCollisionInstructions } = require('./services/config-loader.cjs');

// Load full config
const config = loadConfig();

// Get Phase 3 segmentation for a course with 500 seeds
const strategy = getPhase3Segmentation(500);
// Returns: { strategyName: 'LARGE_COURSE', segmentSize: 100, agentsPerSegment: 10, seedsPerAgent: 10 }

// Check for collision avoidance instructions for a seed
const instructions = getCollisionInstructions('/path/to/course', 'S0068');
// Returns collision avoidance instructions if manifest exists, null otherwise
```

## Phase 3: LEGO Extraction Configuration

### Parallelization Strategies

**Small Course (≤20 seeds)**:
```json
"small_course_strategy": {
  "segment_count": 2,
  "agents_per_segment": 2,
  "seeds_per_agent": "calculated"
}
```

Example: 15 seeds → 2 segments of 7-8 seeds → 2 agents/segment → ~4 seeds/agent

**Medium Course (21-100 seeds)**:
```json
"medium_course_strategy": {
  "segment_count": 1,
  "agents_per_segment": 10,
  "seeds_per_agent": 10
}
```

Example: 75 seeds → 1 segment → 10 agents → ~8 seeds/agent

**Large Course (>100 seeds)**:
```json
"large_course_strategy": {
  "seeds_per_segment": 100,
  "agents_per_segment": 10,
  "seeds_per_agent": 10
}
```

Example: 679 seeds → 7 segments of 100 seeds → 10 agents/segment → 10 seeds/agent

### Collision Handling

```json
"collision_handling": {
  "auto_inject_avoidance_instructions": true,
  "collision_manifest_path": "phase3_collision_reextraction_manifest.json",
  "fcfs_rule": "keep_first_occurrence"
}
```

**auto_inject_avoidance_instructions**: When `true`, Phase 3 agents automatically receive collision avoidance instructions for seeds in the re-extraction manifest.

**How it works**:
1. Collision detector generates `phase3_collision_reextraction_manifest.json`
2. Phase 3 agent checks if current seed has collision instructions
3. If yes, injects instructions into extraction prompt
4. Claude naturally chunks up colliding phrases

**Example prompt injection**:
```
SEED: S0068 "What are you looking for?"

COLLISION AVOIDANCE:
DO NOT extract "what" as standalone LEGO (S0068L01).
Reason: Registry collision with S0012:S0012L03 ("lo que").
Solution: Chunk "what" UP with adjacent words from this sentence
to create a larger, unique LEGO. Use ONLY words from the source sentence.
```

### Validation Gates

```json
"validation": {
  "run_fd_check_after_merge": true,
  "run_deduplication": true,
  "block_on_collision": true
}
```

- **run_fd_check_after_merge**: Run collision detector after all segments merged
- **run_deduplication**: Mark debuts (`new: true`) vs repeats (`new: false`)
- **block_on_collision**: Halt pipeline if collisions detected (gated/manual modes)

## Phase 5: Basket Generation Configuration

### Parallelization Strategies

**Small Course (≤50 LEGOs)**:
```json
"small_course_strategy": {
  "agents": 2,
  "legos_per_agent": "calculated"
}
```

**Medium Course (51-200 LEGOs)**:
```json
"medium_course_strategy": {
  "agents": 5
}
```

**Large Course (>200 LEGOs)**:
```json
"large_course_strategy": {
  "agents": 10
}
```

### Practice Generation

```json
"practice_generation": {
  "target_phrases_per_lego": 10,
  "overlap_strategies": ["none", "light", "medium", "heavy"],
  "default_overlap": "none"
}
```

- **target_phrases_per_lego**: How many practice phrases to generate per LEGO
- **overlap_strategies**: Available overlap levels (none = no shared LEGOs between phrases)
- **default_overlap**: Default overlap strategy if not specified

## Orchestrator Configuration

### Checkpoint Modes

```json
"checkpoint_modes": {
  "available": ["manual", "gated", "full"],
  "default": "gated"
}
```

**manual**: Wait for user approval at every phase transition
```
Phase 1 Complete → [WAIT FOR USER] → Phase 3
```

**gated**: Auto-proceed if validation passes, wait if validation fails
```
Phase 1 Complete → Validation PASS → Auto Phase 3
Phase 3 Complete → Validation FAIL (collisions) → [WAIT FOR USER]
```

**full**: Auto-proceed through entire pipeline (CI/CD mode)
```
Phase 1 → 3 → 5 → 6 → 8 (no stops, validation failures logged but don't block)
```

### Validation Gates

```json
"validation_gates": {
  "phase1": ["seed_fd_check"],
  "phase3": ["lego_fd_check", "infinitive_form_check"],
  "phase5": [],
  "phase6": [],
  "phase8": []
}
```

Defines which validators run after each phase. Empty arrays mean no validation gates.

## Performance Tuning

### Browser Session Configuration

```json
"browser_sessions": {
  "max_concurrent_browsers": 10,
  "browser_spawn_delay_ms": 5000,
  "browser_timeout_ms": 300000,
  "headless": false
}
```

**Architecture**: Browser → Master Agent → Sub-Agents (Parallel Task Calls)

Each browser window runs **1 master agent** that spawns **10 sub-agents in parallel** using multiple Task tool calls in a single message.

```
Browser Window 1
  └── Master Agent
        ├── Task 1 → Sub-agent (seeds 1-10)
        ├── Task 2 → Sub-agent (seeds 11-20)
        ├── ... (spawned in parallel)
        └── Task 10 → Sub-agent (seeds 91-100)
```

- **max_concurrent_browsers**: Number of browser windows (NOT sub-agents!)
- **browser_spawn_delay_ms**: Delay between opening **browser windows** (5000ms = 5 seconds to allow window load and focus)
- **browser_timeout_ms**: Timeout for browser operations (5 minutes default)
- **headless**: Whether to run browsers in headless mode (false = visible for debugging)

**Important**: The delay is between browsers, NOT between sub-agents. Sub-agents spawn instantly in parallel via Task tool.

**Tuning Tips**:
- Increase `max_concurrent_browsers` to 15-20 on powerful machines
- Decrease to 5 on laptops or when rate-limited
- Increase `browser_spawn_delay_ms` to 5000 if hitting Claude API rate limits

### General Performance

```json
"performance": {
  "agent_spawn_delay_ms": 3000,
  "max_retries": 3,
  "retry_backoff_ms": 5000,
  "memory_limit_mb": 4096
}
```

- **agent_spawn_delay_ms**: Delay between spawning agents within a browser
- **max_retries**: How many times to retry failed operations
- **retry_backoff_ms**: Exponential backoff for retries
- **memory_limit_mb**: Memory limit per Node.js process

## Customization Examples

### Example 1: Faster Small Course Processing

For test courses (≤20 seeds), increase parallelization:

```json
"small_course_strategy": {
  "segment_count": 4,
  "agents_per_segment": 4,
  "seeds_per_agent": "calculated"
}
```

Result: 20 seeds → 4 segments of 5 seeds → 4 agents/segment → ~1 seed/agent → **16 parallel agents**

### Example 2: Conservative Large Course Processing

For production runs with rate limit concerns:

```json
"large_course_strategy": {
  "seeds_per_segment": 50,
  "agents_per_segment": 5,
  "seeds_per_agent": 10
}
```

Result: 500 seeds → 10 segments of 50 seeds → 5 agents/segment → 10 seeds/agent → **5 parallel agents max**

### Example 3: Disable Collision Auto-Injection

If you want to manually review collision instructions before Phase 3:

```json
"collision_handling": {
  "auto_inject_avoidance_instructions": false
}
```

Now Phase 3 will extract LEGOs normally, and you must manually trigger re-extraction.

### Example 4: CI/CD Mode (Full Auto)

For automated nightly builds:

```json
"checkpoint_modes": {
  "default": "full"
},
"browser_sessions": {
  "headless": true,
  "max_concurrent_browsers": 20
},
"validation": {
  "block_on_collision": false
}
```

Pipeline runs fully automated with no user intervention.

## File Structure

```
ssi-dashboard-v7-clean/
├── automation.config.json          # Main configuration file
├── services/
│   ├── config-loader.cjs           # Configuration loader utility
│   ├── orchestration/
│   │   └── orchestrator.cjs        # Uses loadConfig()
│   └── phases/
│       ├── phase3-lego-extraction-server.cjs   # Uses getPhase3Segmentation()
│       └── phase5-basket-generation-server.cjs # Uses getPhase5Parallelization()
└── scripts/
    └── validation/
        ├── check-lego-fd-violations.cjs
        └── generate-collision-aware-reextraction.cjs
```

## Environment Variables (Still Supported)

Some settings can be overridden via environment variables:

```bash
PORT=3458 \
VFS_ROOT=/custom/path \
ORCHESTRATOR_URL=http://localhost:3456 \
AGENT_SPAWN_DELAY=5000 \
node services/phases/phase3-lego-extraction-server.cjs
```

Environment variables take precedence over config file.

## Validation

To validate your configuration file:

```bash
node -e "console.log(require('./automation.config.json'))"
```

If JSON is valid, it will print the config. If invalid, you'll see a syntax error.

## Best Practices

1. **Version control**: Commit `automation.config.json` to git
2. **Course-specific overrides**: Create `automation.config.{course_code}.json` for special cases
3. **Development vs Production**: Use different configs for local testing vs production
4. **Document changes**: Add comments to config (JSON5 format if needed)
5. **Test incrementally**: Change one parameter at a time, test, then adjust

## Troubleshooting

### "Config file not found" Warning

```
⚠️  automation.config.json not found, using defaults
```

**Solution**: The config loader falls back to defaults. Create `automation.config.json` or ignore if defaults work.

### Collisions Still Occurring After Re-extraction

**Check**:
```json
"collision_handling": {
  "auto_inject_avoidance_instructions": true  // Must be true!
}
```

**Verify manifest exists**:
```bash
ls public/vfs/courses/spa_for_eng/phase3_collision_reextraction_manifest.json
```

### Too Many Browser Windows Overwhelming System

**Reduce parallelization**:
```json
"browser_sessions": {
  "max_concurrent_browsers": 5
}
```

Or increase spawn delay:
```json
"browser_spawn_delay_ms": 5000
```

## Related Documentation

- `COLLISION_RESOLUTION_WORKFLOW.md` - How collision resolution works
- `PHASE3_VALIDATION.md` - Phase 3 validation gates
- `PHASE5_CASCADE_IMPACT.md` - Basket regeneration details
