# Phase 1: Sequential Translation Architecture

## Why Sequential?

Phase 1 **must be sequential** because of translation consistency requirements:

- All 668 seeds must use **consistent terminology**
- Later translations build on earlier vocabulary choices
- Example: If seed #5 translates "want" as "quiero", seed #200 must also use "quiero"
- Parallel processing would create inconsistent vocabularies across agents

## Current Implementation ✅

**File:** `services/phases/phase1-translation-server.cjs`

### Key Design Points

```javascript
// Lines 211-215
const seedsPerAgent = totalSeeds;  // All seeds go to one agent
const agentCount = 1;               // Only spawn 1 agent

console.log(`Mode: Sequential (1 agent for all ${totalSeeds} seeds)`);
```

### How It Works

1. **Single Agent Spawn**
   ```javascript
   // Line 304
   await spawnClaudeWebAgent(prompt, 1, 'safari');
   ```

2. **Process All Seeds**
   - Agent receives seeds S0001-S0668
   - Processes them sequentially in order
   - Maintains consistent vocabulary throughout

3. **Output**
   - Single `seed_pairs.json` file
   - Guaranteed consistency across all translations

## Comparison: Phase 1 vs Phase 3/5

| Aspect | Phase 1 (Seeds) | Phase 3 (LEGOs) | Phase 5 (Baskets) |
|--------|----------------|-----------------|-------------------|
| **Parallelizable?** | ❌ NO | ✅ YES | ✅ YES |
| **Why?** | Consistency needed | LEGOs are independent | Baskets are independent |
| **Agents** | 1 | 10-67 | Variable |
| **Segments** | 1 (all seeds) | 1-7 | Variable |

### Why Phase 3 Can Be Parallel

LEGOs are extracted **independently** from each seed:
- Seed #1's LEGOs don't affect Seed #200's LEGOs
- Can safely process in parallel segments
- Merge results at the end

### Why Phase 5 Can Be Parallel

Baskets build on **completed LEGOs**:
- All LEGOs exist before Phase 5 starts
- Each basket generated independently
- Vocabulary constraints known upfront

## API Endpoints

### POST /start

Start Phase 1 translation (always sequential)

**Request:**
```json
{
  "courseCode": "spa_for_eng",
  "totalSeeds": 668,
  "target": "spa",
  "known": "eng",
  "startSeed": 1,
  "endSeed": 668
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phase 1 started for spa_for_eng",
  "job": {
    "courseCode": "spa_for_eng",
    "totalSeeds": 668,
    "target": "Spanish",
    "known": "English",
    "agentCount": 1,  // Always 1
    "status": "running"
  }
}
```

### GET /status/:courseCode

Check Phase 1 progress

**Response:**
```json
{
  "courseCode": "spa_for_eng",
  "status": "running",
  "totalSeeds": 668,
  "agentCount": 1,
  "orchestratorSpawned": true,
  "branchesDetected": 1,
  "merged": false
}
```

## Configuration

**Environment Variables:**
```bash
PORT=3457                           # Phase 1 server port
VFS_ROOT=/path/to/courses           # Course data location
ORCHESTRATOR_URL=http://localhost:3456
SERVICE_NAME="Phase 1 (Translation)"
AGENT_SPAWN_DELAY=3000              # Not used (only 1 agent)
```

## Performance Characteristics

### Time Estimates (668 seeds)

| Metric | Estimate |
|--------|----------|
| **Seeds/minute** | ~10-15 |
| **Total time** | ~45-70 minutes |
| **Agents** | 1 |
| **Token usage** | High (sequential, no sharing) |

### Why Not Parallelize?

**Attempted parallel approaches fail because:**

1. **Vocabulary Drift**
   - Agent 1: "want" → "quiero"
   - Agent 2: "want" → "desear"
   - Result: Inconsistent course

2. **Context Loss**
   - Agent processing S0200-S0300 doesn't know choices from S0001-S0199
   - Can't maintain pedagogical progression

3. **Merge Conflicts**
   - Can't auto-merge conflicting vocabulary choices
   - Requires manual review (defeats automation)

## Sequential Processing Guarantees

✅ **Consistency**: Same word always translates the same way
✅ **Context**: Later seeds build on earlier vocabulary
✅ **Pedagogy**: Smooth difficulty progression
✅ **Quality**: Single agent maintains coherent style
✅ **Merge**: No conflicts - single output file

## Code Location

```
services/
└── phases/
    └── phase1-translation-server.cjs
        ├── Line 211-215: Sequential mode enforcement
        ├── Line 304: Single agent spawn
        └── Line 212: agentCount = 1 (hardcoded)
```

## Testing

```bash
# Verify sequential mode
grep -A 5 "Sequential processing" services/phases/phase1-translation-server.cjs

# Expected output:
# const seedsPerAgent = totalSeeds;
# const agentCount = 1;
```

## Future Considerations

**Could we parallelize Phase 1?**

Only if we implement:
1. **Shared terminology database** (complex)
2. **Agent coordination protocol** (slow)
3. **Conflict resolution system** (error-prone)

**Verdict:** Not worth the complexity. Sequential is simpler and safer.

## Summary

- ✅ Phase 1 is **correctly implemented as sequential**
- ✅ Single agent processes all 668 seeds in order
- ✅ Guarantees translation consistency
- ✅ No parallelization needed or recommended
- ✅ Different from Phase 3/5 which CAN parallelize

**The current architecture is correct - no changes needed!**
