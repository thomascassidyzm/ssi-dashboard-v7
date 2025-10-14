# Brief: Orchestrator Pattern for Course Generation

**Problem**: Current architecture spawns 7 separate Warp windows (one per phase), each launching Claude Code independently. Inefficient and fragmented.

**Solution**: Single orchestrator agent executes entire pipeline in one Claude session.

---

## Current Architecture (Inefficient)

```
User clicks "Generate Course"
  ↓
automation_server.cjs: cascadePhases()
  ↓
Spawns 7 separate Warp windows:
  - Phase 0 → New Warp window → Launch Claude → Execute → Close
  - Phase 1 → New Warp window → Launch Claude → Execute → Close
  - Phase 2 → New Warp window → Launch Claude → Execute → Close
  - Phase 3 → New Warp window → Launch Claude → Execute → Close
  - Phase 3.5 → New Warp window → Launch Claude → Execute → Close
  - Phase 4 → New Warp window → Launch Claude → Execute → Close
  - Phase 5 → New Warp window → Launch Claude → Execute → Close
  - Phase 6 → New Warp window → Launch Claude → Execute → Close
```

**Problems**:
- 7 separate Claude launches (startup overhead × 7)
- No context between phases (each starts fresh)
- Difficult to debug (7 separate logs)
- Desktop clutter (7 Warp windows)
- No self-healing (each phase independent)

---

## New Architecture (Orchestrator Pattern)

```
User clicks "Generate Course"
  ↓
automation_server.cjs: spawnCourseOrchestrator()
  ↓
Creates comprehensive orchestrator brief
  ↓
Spawns ONE Warp window with orchestrator
  ↓
Claude Code orchestrator (single session):
  - Reads APML spec (all phase definitions)
  - Reads course parameters (target/known/seeds)
  - Executes Phase 0 → writes output to VFS
  - Executes Phase 1 → writes output to VFS
  - Executes Phase 2 → writes output to VFS
  - Executes Phase 3 → writes output to VFS
  - Executes Phase 3.5 → writes output to VFS
  - Executes Phase 4 → writes output to VFS
  - Executes Phase 5 → writes output to VFS
  - Executes Phase 6 → writes output to VFS
  - Reports completion/failure status
  ↓
Dashboard polls status, displays results
```

**Advantages**:
- Single Claude session (maintains context)
- Self-healing (can reference previous phases)
- Easier debugging (one log stream)
- Desktop clean (one Warp window)
- Can optimize across phases (intelligence accumulation)
- Runs unattended (user checks results when done)

---

## Implementation Changes

### 1. Replace cascadePhases() Function

**Current** (automation_server.cjs lines ~187-245):
```javascript
async function cascadePhases(courseCode, params) {
  // Spawns 7 separate agents
  await spawnPhaseAgent('0', PHASE_PROMPTS['0'], courseDir, courseCode);
  await spawnPhaseAgent('1', PHASE_PROMPTS['1'], courseDir, courseCode);
  // ... 6 more spawns
}
```

**New**:
```javascript
async function spawnCourseOrchestrator(courseCode, params) {
  console.log(`[Orchestrator] Starting course generation: ${courseCode}`);

  const job = STATE.jobs.get(courseCode);
  const courseDir = await ensureCourseDirectory(courseCode);

  // Create orchestrator brief
  const brief = generateOrchestratorBrief(courseCode, params, courseDir);

  // Write brief to file
  const briefFile = path.join(__dirname, `.orchestrator-${courseCode}-${Date.now()}.md`);
  await fs.writeFile(briefFile, brief, 'utf8');

  // Spawn single orchestrator agent
  await spawnPhaseAgent('orchestrator', brief, courseDir, courseCode);

  console.log(`[Orchestrator] Course orchestrator spawned for ${courseCode}`);
  console.log(`[Orchestrator] Brief: ${briefFile}`);
}
```

### 2. Create generateOrchestratorBrief() Function

Add after ensureCourseDirectory():

```javascript
/**
 * Generates comprehensive orchestrator brief for course generation
 */
function generateOrchestratorBrief(courseCode, params, courseDir) {
  const { target, known, seeds } = params;

  return `# Course Generation Orchestrator Brief

## Mission
Generate complete SSi language course from canonical English seeds.

**Course**: ${courseCode}
**Target Language**: ${target} (learning language)
**Known Language**: ${known} (learner's language)
**Seeds**: ${seeds} (total canonical sentences to process)

---

## Your Role

You are the **course generation orchestrator**. You will execute all 7 phases sequentially in this single Claude Code session. Work autonomously - read specs, execute phases, write outputs, report status.

---

## Key Files

**APML Specification** (Single Source of Truth):
\`/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ssi-course-production.apml\`
- Read this FIRST
- Contains all phase prompts and rules
- VERSION: 7.2.0

**Course Directory** (Your workspace):
\`${courseDir}\`
- Write all outputs here
- VFS structure pre-created (amino_acids/, phase_outputs/, proteins/)

**Canonical Seeds** (Input data):
\`/Users/tomcassidy/SSi/SSi_Course_Production/vfs/seeds/canonical_seeds.json\`
- 668 English sentences to translate and process

---

## Phase Execution Sequence

Execute phases in order. Each phase reads from APML for detailed instructions.

### Phase 0: Corpus Pre-Analysis
- **Input**: canonical_seeds.json
- **Output**: phase_outputs/phase_0_intelligence.json
- **Prompt**: Read from APML Phase 0 section
- **Purpose**: Analyze corpus for pedagogical translation

### Phase 1: Pedagogical Translation
- **Input**: canonical_seeds.json + phase_0_intelligence.json
- **Output**: amino_acids/translations/*.json (${seeds} files)
- **Prompt**: Read from APML Phase 1 section
- **Purpose**: Apply 6 heuristics, create optimized translations
- **Critical**: Two-step process (canonical→target→known)

### Phase 2: Corpus Intelligence
- **Input**: amino_acids/translations/*.json
- **Output**: phase_outputs/phase_2_corpus_intelligence.json
- **Prompt**: Read from APML Phase 2 section
- **Purpose**: Map FCFS order, calculate utility scores

### Phase 3: LEGO Extraction
- **Input**: amino_acids/translations/*.json + phase_2_corpus_intelligence.json
- **Output**: amino_acids/legos/*.json
- **Prompt**: Read from APML Phase 3 section
- **Purpose**: Extract FD-compliant LEGOs (BASE + COMPOSITE)
- **Critical**: FD_LOOP test, IRON RULE, TILING test

### Phase 3.5: Graph Construction
- **Input**: amino_acids/legos/*.json
- **Output**: phase_outputs/phase_3.5_lego_graph.json
- **Prompt**: Read from APML Phase 3.5 section
- **Purpose**: Build adjacency graph for pattern coverage

### Phase 4: Deduplication
- **Input**: amino_acids/legos/*.json
- **Output**: amino_acids/legos_deduplicated/*.json
- **Prompt**: Read from APML Phase 4 section
- **Purpose**: Merge duplicate LEGOs, preserve provenance

### Phase 5: Basket Generation
- **Input**: amino_acids/legos_deduplicated/*.json + phase_3.5_lego_graph.json
- **Output**: phase_outputs/phase_5_baskets.json
- **Prompt**: Read from APML Phase 5 section
- **Purpose**: Generate e-phrases + d-phrases with progressive vocabulary
- **Critical**: 7-10 word e-phrases, perfect target grammar

### Phase 6: Introductions
- **Input**: phase_outputs/phase_5_baskets.json + amino_acids/legos_deduplicated/*.json
- **Output**: amino_acids/introductions/*.json
- **Prompt**: Read from APML Phase 6 section
- **Purpose**: Generate zero-unknowns introductions for COMPOSITE LEGOs

---

## Critical Rules

1. **Read APML First**: All phase details are in ssi-course-production.apml
2. **Sequential Execution**: Complete each phase before starting next
3. **Write to VFS**: All outputs go to ${courseDir}
4. **Quality Validation**: After Phase 5, spot-check 5-10 baskets for grammar
5. **Report Status**: At end, report completion or failure with specifics

---

## Quality Checkpoints

### After Phase 1
- Spot-check 5 translations: Natural? High-frequency vocabulary?

### After Phase 3
- Spot-check 10 LEGOs: Pass FD_LOOP? IRON RULE compliant?

### After Phase 5
- Spot-check 10 baskets: 7-10 word e-phrases? Perfect target grammar?
- Check for Italian grammar errors (cercando di, imparando a, etc.)

If critical issues found: Document them, but continue (self-healing on next run).

---

## Success Criteria

✅ All 7 phases executed
✅ Phase outputs written to VFS
✅ No critical errors (translations natural, LEGOs FD-compliant, baskets grammatical)
✅ Status reported

---

## Failure Handling

If any phase fails:
1. Document specific error
2. Note which seeds/LEGOs/baskets affected
3. Report failure status with details
4. Do NOT continue to next phase

---

## Final Report Format

After Phase 6 (or on failure), report:

\`\`\`
✅ Course Generation Complete: ${courseCode}

Phase 0: ✅ Corpus analyzed
Phase 1: ✅ ${seeds} translations created
Phase 2: ✅ FCFS intelligence generated
Phase 3: ✅ [X] LEGOs extracted ([Y] BASE, [Z] COMPOSITE)
Phase 3.5: ✅ Adjacency graph built
Phase 4: ✅ [X] unique LEGOs (deduplicated)
Phase 5: ✅ [X] baskets generated
Phase 6: ✅ Introductions created

Quality Checks:
- Translations: [Natural/Issues found]
- LEGOs: [FD-compliant/Issues found]
- Baskets: [Grammar perfect/Issues found]

Status: COMPLETE
Time: [Duration]
Next: Review in dashboard at ${CONFIG.TRAINING_URL}
\`\`\`

---

## Begin Execution

Read APML spec, execute Phase 0, proceed sequentially through Phase 6, report status.
`;
}
```

### 3. Update POST /api/courses/generate Endpoint

**Current** (line ~1107):
```javascript
cascadePhases(courseCode, { target, known, seeds }).catch(err => {
  console.error(`[API] Cascade error:`, err);
});
```

**New**:
```javascript
spawnCourseOrchestrator(courseCode, { target, known, seeds }).catch(err => {
  console.error(`[API] Orchestrator error:`, err);
});
```

---

## Testing

### Manual Test (10-seed course)
```bash
# 1. Start server
node automation_server.cjs

# 2. Trigger 10-seed test course
curl -X POST http://localhost:3456/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{"target": "ita", "known": "eng", "seeds": 10}'

# 3. Verify single Warp window spawns
# 4. Watch Claude execute phases sequentially
# 5. Check VFS outputs after completion
```

---

## Benefits

1. **Single Context**: Claude maintains state across all phases
2. **Self-Healing**: Can detect issues in early phases, note for improvement
3. **Intelligence Accumulation**: Learns patterns, applies to later phases
4. **Cleaner Desktop**: One Warp window instead of 7
5. **Easier Debugging**: Single log stream, clear phase progression
6. **Matches APML Vision**: "Thinking partner" model - orchestrator is autonomous executor

---

## Success Criteria

✅ spawnCourseOrchestrator() function added
✅ generateOrchestratorBrief() function added
✅ POST /api/courses/generate updated to use orchestrator
✅ Single Warp window spawns for course generation
✅ Orchestrator executes all 7 phases sequentially
✅ Outputs written to VFS correctly
✅ Status reported at completion

---

## Files to Modify

1. `automation_server.cjs` - Add orchestrator functions, update endpoint
2. Test with 10-seed course before full 668-seed run

---

## Notes

**No Timelines**: Sonnet 4.5 executes quickly - phases complete in minutes, not hours. User checks results when convenient (overnight batches optional, not required).

**Orchestrator = Autonomous Executor**: Main Claude stays as thinking partner, orchestrator handles unattended batch work.
