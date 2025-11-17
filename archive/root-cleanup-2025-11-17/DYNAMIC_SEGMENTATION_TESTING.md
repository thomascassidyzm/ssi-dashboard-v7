# Dynamic Segmentation - Testing Guide

## What Changed

The automation server now uses **adaptive segmentation** based on course size instead of hardcoded 100-seed segments.

### Before (Hardcoded)
- Always used 100 seeds per segment
- Always used 10 agents per segment
- No flexibility for testing small courses

### After (Dynamic)
- **Small courses (≤20 seeds)**: 2 segments, ~4 agents total, ~3 seeds/agent
- **Medium courses (21-100 seeds)**: 1 segment, 5-10 agents, 10 seeds/agent
- **Large courses (>100 seeds)**: 100 seeds/segment, 10 agents/segment

## How It Works

### Automatic Calculation

When you create a course, `calculateSegmentation(totalSeeds)` automatically determines:

1. **Strategy**: SMALL_TEST, MEDIUM_SINGLE, or LARGE_MULTI
2. **Segment count**: How many orchestrator tabs to spawn
3. **Agents per segment**: How many parallel Claude agents each orchestrator spawns
4. **Seeds per agent**: Workload distribution

### Example Outputs

#### 10-Seed Test Course
```javascript
{
  totalSeeds: 10,
  segmentSize: 5,
  seedsPerAgent: 3,
  segmentCount: 2,
  totalAgents: 4,
  strategy: 'SMALL_TEST',
  segments: [
    { segmentNumber: 1, startSeed: 1, endSeed: 5, seedCount: 5, agentCount: 2, seedsPerAgent: 3 },
    { segmentNumber: 2, startSeed: 6, endSeed: 10, seedCount: 5, agentCount: 2, seedsPerAgent: 3 }
  ]
}
```

**What happens:**
- Opens 2 browser tabs (5-second delay between them)
- Each tab spawns 2 parallel Claude agents
- Each agent processes ~3 seeds
- Total: 4 agents working in parallel

#### 50-Seed Medium Course
```javascript
{
  totalSeeds: 50,
  segmentSize: 50,
  seedsPerAgent: 10,
  segmentCount: 1,
  totalAgents: 5,
  strategy: 'MEDIUM_SINGLE',
  segments: [
    { segmentNumber: 1, startSeed: 1, endSeed: 50, seedCount: 50, agentCount: 5, seedsPerAgent: 10 }
  ]
}
```

**What happens:**
- Opens 1 browser tab
- Tab spawns 5 parallel Claude agents
- Each agent processes 10 seeds

#### 668-Seed Full Course
```javascript
{
  totalSeeds: 668,
  segmentSize: 100,
  seedsPerAgent: 10,
  segmentCount: 7,
  totalAgents: 67,
  strategy: 'LARGE_MULTI',
  segments: [
    { segmentNumber: 1, startSeed: 1, endSeed: 100, seedCount: 100, agentCount: 10, seedsPerAgent: 10 },
    { segmentNumber: 2, startSeed: 101, endSeed: 200, seedCount: 100, agentCount: 10, seedsPerAgent: 10 },
    // ... segments 3-6 ...
    { segmentNumber: 7, startSeed: 601, endSeed: 668, seedCount: 68, agentCount: 7, seedsPerAgent: 10 }
  ]
}
```

**What happens:**
- Opens 7 browser tabs (5-second delay between each)
- Tabs 1-6 spawn 10 agents each (100 seeds)
- Tab 7 spawns 7 agents (68 seeds)
- Total: 67 agents

## Testing End-to-End with 10 Seeds

### Quick Test Setup

1. **Create a 10-seed test course:**
   - Target: `spa` (Spanish)
   - Known: `eng` (English)
   - Seeds: 10

2. **Expected behavior:**
   ```
   [Web Orchestrator] Dynamic Segmentation Strategy: SMALL_TEST
   [Web Orchestrator] Total Seeds: 10, Segments: 2, Total Agents: 4

   [Web Orchestrator] Segment 1/2: S0001-S0005 (5 seeds, 2 agents)
   [Web Orchestrator] Opening Segment 1 tab...
   [Web Orchestrator] ✅ Segment 1 prompt pasted!
   [Web Orchestrator] Waiting 5000ms before next segment...

   [Web Orchestrator] Segment 2/2: S0006-S0010 (5 seeds, 2 agents)
   [Web Orchestrator] Opening Segment 2 tab...
   [Web Orchestrator] ✅ Segment 2 prompt pasted!
   ```

3. **Browser windows:**
   - 2 Safari tabs open
   - Each shows orchestrator prompt
   - Each spawns 2 parallel agents
   - Monitor progress in each tab

4. **Timing:**
   - Segment 1 spawns immediately
   - 5-second delay
   - Segment 2 spawns
   - Agents run in parallel across both tabs

## Manual Configuration Overrides

You can override the automatic calculation in `.env.automation`:

```bash
# Force specific segment size (optional)
SEGMENT_SIZE=20

# Force specific agents per segment (optional)
AGENTS_PER_SEGMENT=5

# Force specific seeds per agent (optional)
SEEDS_PER_AGENT=5
```

### Override Examples

#### Test with 10 seeds, 5 segments (2 seeds each, 1 agent each)
```bash
SEGMENT_SIZE=2
AGENTS_PER_SEGMENT=1
SEEDS_PER_AGENT=2
```

This will create:
- 5 segments (S0001-S0002, S0003-S0004, S0005-S0006, S0007-S0008, S0009-S0010)
- 1 agent per segment
- 5 browser tabs total
- Good for testing multi-tab spawning

#### Test with 10 seeds, 1 segment, 10 agents (1 seed each)
```bash
SEGMENT_SIZE=10
AGENTS_PER_SEGMENT=10
SEEDS_PER_AGENT=1
```

This will create:
- 1 segment
- 10 parallel agents
- 1 browser tab
- Good for testing parallel agent execution

## What This Enables

### Fast End-to-End Testing ✅
- Test full pipeline with 10-seed course in minutes instead of hours
- Verify segmentation logic works correctly
- Test multi-tab spawning and delays
- Validate phase transitions

### Flexible Testing Scenarios ✅
- Small courses: 2 segments, 4 agents (rapid testing)
- Medium courses: 1 segment, 5-10 agents (standard workflow)
- Large courses: 7 segments, 67 agents (production scale)

### Smooth Phase Transitions ✅
- Each segment completes independently
- Git branches auto-merge when complete
- Next phase triggers automatically after all segments finish

## Verifying It Works

### Check Logs

When you start Phase 3 or Phase 5, you should see:

```
[Web Orchestrator] Dynamic Segmentation Strategy: SMALL_TEST
[Web Orchestrator] Total Seeds: 10, Segments: 2, Total Agents: 4
```

### Check Browser Tabs

- Count the Safari tabs that open
- Should match segment count
- Each tab shows orchestrator prompt

### Check Git Branches

After agents complete, you should see branches like:
```
claude/phase3-s0001-s0005-seg1
claude/phase3-s0006-s0010-seg2
```

## Configuration Reference

| Course Size | Strategy | Segments | Agents/Segment | Seeds/Agent |
|-------------|----------|----------|----------------|-------------|
| 10 seeds    | SMALL_TEST | 2 | 2 | ~3 |
| 20 seeds    | SMALL_TEST | 2 | 2-3 | ~5 |
| 50 seeds    | MEDIUM_SINGLE | 1 | 5 | 10 |
| 100 seeds   | MEDIUM_SINGLE | 1 | 10 | 10 |
| 668 seeds   | LARGE_MULTI | 7 | 7-10 | 10 |

## Spawn Timing

The `AGENT_SPAWN_DELAY` config controls the delay between spawning browser tabs:

```bash
# .env.automation
AGENT_SPAWN_DELAY=5000  # 5 seconds (default)
```

For a 10-seed course with 2 segments:
- Segment 1 spawns at t=0s
- Segment 2 spawns at t=5s
- Both run in parallel after t=5s

For a 668-seed course with 7 segments:
- Segment 1 spawns at t=0s
- Segment 2 spawns at t=5s
- Segment 3 spawns at t=10s
- ...
- Segment 7 spawns at t=30s
- All 7 run in parallel after t=30s

## Troubleshooting

### Issue: Still using 100-seed segments

**Check:** Verify you pulled the latest code
```bash
git pull origin main
pm2 restart ssi-automation
```

### Issue: Wrong number of tabs opening

**Check:** Look for segmentation logs
```bash
pm2 logs ssi-automation | grep "Dynamic Segmentation"
```

Should show:
```
Dynamic Segmentation Strategy: SMALL_TEST
Total Seeds: 10, Segments: 2, Total Agents: 4
```

### Issue: Want different segmentation

**Fix:** Add overrides to `.env.automation`:
```bash
SEGMENT_SIZE=5
AGENTS_PER_SEGMENT=2
SEEDS_PER_AGENT=3
```

Then restart:
```bash
pm2 restart ssi-automation --update-env
```

## Next Steps

1. ✅ **Test with 10-seed course** - Verify 2 segments, 4 agents spawn correctly
2. ✅ **Monitor phase transitions** - Ensure Phase 3 → Phase 5 works smoothly
3. ✅ **Check git merging** - Verify branches auto-merge after completion
4. ✅ **Validate output quality** - Ensure small courses produce correct LEGOs and baskets
5. ✅ **Test overrides** - Experiment with manual configuration for edge cases
