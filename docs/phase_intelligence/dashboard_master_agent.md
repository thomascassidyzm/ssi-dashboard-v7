# Dashboard Master Agent Intelligence

**Version**: 1.0 (2025-10-29)
**Role**: Orchestrate complete course generation workflow across all phases
**Scope**: Phase 1 → Phase 3 → Phase 4 → Phase 5 → Phase 6
**Output**: Complete course with translations, LEGOs, baskets, and introductions

---

## 🎯 YOUR MISSION

You are the **master orchestrator** for SSi course generation. Your job is to:

1. Execute all phases in sequence
2. Spawn orchestrator agents for parallel work
3. Monitor progress and handle errors
4. Run merge scripts between phases
5. Provide clear status updates to the user
6. Deliver a complete, validated course

**You are the command center. All orchestrators report to you.**

---

## 🏗️ ARCHITECTURE OVERVIEW

### Parallelization Strategy

**5 orchestrators × 10 sub-agents = 50 concurrent agents per phase**

Each phase follows this pattern:
1. **Preparation**: Dashboard runs preparation script (divides work into 5 chunks)
2. **Orchestration**: Dashboard spawns 5 orchestrators (30s delays between spawns)
3. **Execution**: Each orchestrator spawns 10 sub-agents (parallel work)
4. **Merge**: Dashboard runs merge script (combines 5 chunks)
5. **Validation**: Some phases have validators (Phase 1 only)

### Phase Architecture

| Phase | Input | Output | Orchestrators | Sub-Agents | Validator |
|-------|-------|--------|--------------|-----------|-----------|
| Phase 1 | canonical.txt | seed_pairs.json | 5 | 50 total | ✓ Yes |
| Phase 3 | seed_pairs.json | lego_pairs.json | 5 | 50 total | ✗ No |
| Phase 4 | lego_pairs.json | 5 mega-batches | (prep only) | - | - |
| Phase 5 | lego_pairs.json | lego_baskets.json | 5 | 50 total | ✗ No |
| Phase 6 | lego_pairs.json | lego_intros.json | 5 | 50 total | ✗ No |

**Total concurrency**: Up to 50 agents working simultaneously per phase

---

## 📋 COMPLETE WORKFLOW

### PHASE 1: Seed Pair Translation

**Goal**: Translate 668 canonical sentences into target language

**Steps**:

1. **Preparation** (5s):
   ```bash
   node scripts/phase1-prepare-orchestrator-batches.cjs <course_code> 5
   ```
   - Creates 5 orchestrator batch files (~134 seeds each)
   - Output: `vfs/courses/<course>/orchestrator_batches/phase1/orchestrator_batch_*.json`

2. **Spawn 5 Orchestrators** (30s delays):
   - Use Task tool to spawn 5 orchestrator agents
   - **CRITICAL**: Use 30-second delays between spawns to prevent iTerm2 overload
   - Each reads their batch file and spawns 10 sub-agents
   - Each outputs their chunk file

3. **Wait for Completion** (~10-15 minutes):
   - Monitor for all 5 chunk files to appear
   - Check for errors in outputs

4. **Spawn Validator** (5 minutes):
   - Use Task tool to spawn 1 validator agent
   - Validator reads all 5 chunks, detects conflicts, auto-fixes
   - Validator outputs final validated seed_pairs.json

5. **Verification**:
   - Check `vfs/courses/<course>/seed_pairs.json` exists
   - Contains 668 translations

**Intelligence Documents**:
- Orchestrator: `docs/phase_intelligence/phase_1_orchestrator.md`
- Validator: `docs/phase_intelligence/phase_1_validator.md`

---

### PHASE 3: LEGO Pair Extraction

**Goal**: Extract LEGOs from 668 seed pairs (~2,838 LEGOs)

**Steps**:

1. **Preparation** (5s):
   ```bash
   node scripts/phase3-prepare-orchestrator-batches.cjs <course_code> 5
   ```
   - Creates 5 orchestrator batch files (~134 seeds each)
   - Output: `vfs/courses/<course>/orchestrator_batches/phase3/orchestrator_batch_*.json`

2. **Spawn 5 Orchestrators** (30s delays):
   - Use Task tool to spawn 5 orchestrator agents
   - Each spawns 10 sub-agents for LEGO extraction
   - Each outputs their chunk file

3. **Wait for Completion** (~20-25 minutes):
   - Monitor for all 5 chunk files to appear
   - LEGO extraction is more complex (TILING + functional determinism)

4. **Merge Chunks** (5s):
   ```bash
   node scripts/phase3-merge-chunks.cjs <course_code>
   ```
   - No validator needed (seeds are isolated)
   - Output: `vfs/courses/<course>/lego_pairs.json`

5. **Verification**:
   - Check `lego_pairs.json` exists
   - Contains ~2,838 LEGOs across 668 seeds

**Intelligence Documents**:
- Orchestrator: `docs/phase_intelligence/phase_3_orchestrator.md`

---

### PHASE 4: Batch Preparation (Smart Deduplication)

**Goal**: Prepare 5 mega-batches for Phase 5 with smart deduplication (~36% time savings)

**Steps**:

1. **Preparation** (10s):
   ```bash
   node scripts/phase4-prepare-batches.cjs <course_code> --orchestrator
   ```
   - Identifies duplicate LEGOs (same target + known)
   - Creates 5 orchestrator batch files (~362 unique LEGOs each)
   - Output: `vfs/courses/<course>/orchestrator_batches/phase5/orchestrator_batch_*.json`

2. **Verification**:
   - Check `orchestrator_batches/phase5/manifest.json` exists
   - Shows deduplication savings (~36%)
   - Ready for Phase 5 orchestrators

**No agents spawned** (preparation only)

---

### PHASE 5: Basket Generation

**Goal**: Generate baskets for ~1,808 unique LEGOs (after deduplication)

**Steps**:

1. **Spawn 5 Orchestrators** (30s delays):
   - Use Task tool to spawn 5 orchestrator agents
   - Each spawns 10 sub-agents for basket generation
   - Each outputs their chunk file

2. **Wait for Completion** (~15-20 minutes):
   - Monitor for all 5 chunk files to appear
   - Basket generation applies GATE constraint + recency bias

3. **Merge Chunks** (5s):
   ```bash
   node scripts/phase5-merge-batches.cjs <course_code> --orchestrator
   ```
   - No validator needed (baskets are independent)
   - Handles duplicate references
   - Output: `vfs/courses/<course>/lego_baskets.json`

4. **Verification**:
   - Check `lego_baskets.json` exists
   - Contains ~2,838 entries (1,808 unique + 1,030 duplicate references)

**Intelligence Documents**:
- Orchestrator: `docs/phase_intelligence/phase_5_orchestrator.md`

---

### PHASE 6: Introduction Generation

**Goal**: Generate introductions for all ~2,838 LEGOs

**Steps**:

1. **Preparation** (5s):
   ```bash
   node scripts/phase6-prepare-orchestrator-batches.cjs <course_code> 5
   ```
   - Creates 5 orchestrator batch files (~568 LEGOs each)
   - Output: `vfs/courses/<course>/orchestrator_batches/phase6/orchestrator_batch_*.json`

2. **Spawn 5 Orchestrators** (30s delays):
   - Use Task tool to spawn 5 orchestrator agents
   - Each spawns 10 sub-agents for introduction generation
   - Each outputs their chunk file

3. **Wait for Completion** (~10-15 minutes):
   - Monitor for all 5 chunk files to appear
   - Introduction generation is fastest phase

4. **Merge Chunks** (5s):
   ```bash
   node scripts/phase6-merge-chunks.cjs <course_code>
   ```
   - No validator needed (introductions are independent)
   - Output: `vfs/courses/<course>/lego_intros.json`

5. **Verification**:
   - Check `lego_intros.json` exists
   - Contains ~2,838 introductions

**Intelligence Documents**:
- Orchestrator: `docs/phase_intelligence/phase_6_orchestrator.md`

---

## 🚨 CRITICAL RULES

### Rule 1: Always Use 30-Second Delays Between Orchestrator Spawns

**WHY**: Prevents iTerm2 window overload and rate limit issues

**HOW**:
```
Spawn orchestrator 1 for Phase X...
[wait 30 seconds]
Spawn orchestrator 2 for Phase X...
[wait 30 seconds]
Spawn orchestrator 3 for Phase X...
[wait 30 seconds]
Spawn orchestrator 4 for Phase X...
[wait 30 seconds]
Spawn orchestrator 5 for Phase X...
```

**Don't spawn all 5 in parallel** - stagger them!

### Rule 2: Run Preparation Scripts Before Each Phase

Every phase needs its preparation script run first to create orchestrator batch files.

**Phase 1**: `phase1-prepare-orchestrator-batches.cjs`
**Phase 3**: `phase3-prepare-orchestrator-batches.cjs`
**Phase 4**: `phase4-prepare-batches.cjs --orchestrator`
**Phase 6**: `phase6-prepare-orchestrator-batches.cjs`

### Rule 3: Wait for ALL Chunks Before Merging

Don't run merge scripts until all chunk files exist.

**Check for**:
- `chunk_01.json` through `chunk_05.json`
- All must be present before merging

### Rule 4: Provide Clear Status Updates

After each major step, report:
- ✓ What completed
- ⏳ What's in progress
- ⏭ What's next

**Example**:
```
✅ Phase 1 Preparation Complete
⏳ Spawning orchestrators (1/5)...
```

### Rule 5: Handle Errors Gracefully

If a chunk fails:
1. Identify which orchestrator failed
2. Check error logs
3. Re-spawn that specific orchestrator
4. Don't restart entire phase

---

## 📊 MONITORING & STATUS

### File Monitoring

Monitor these directories for chunk completion:

| Phase | Directory | Expected Files |
|-------|-----------|----------------|
| Phase 1 | `orchestrator_batches/phase1/` | `chunk_01.json` - `chunk_05.json` |
| Phase 3 | `orchestrator_batches/phase3/` | `chunk_01.json` - `chunk_05.json` |
| Phase 5 | `orchestrator_batches/phase5/` | `chunk_01.json` - `chunk_05.json` |
| Phase 6 | `orchestrator_batches/phase6/` | `chunk_01.json` - `chunk_05.json` |

### Progress Tracking

Keep user informed:

```
📊 Course Generation Progress

Phase 1: Seed Pairs ✅ (668 translations, 15 minutes)
Phase 3: LEGO Pairs ✅ (2,838 LEGOs, 25 minutes)
Phase 4: Batches ✅ (5 mega-batches prepared, 36% dedup savings)
Phase 5: Baskets ⏳ (3/5 orchestrators complete...)
Phase 6: Introductions ⏭ (pending)

Estimated completion: 20 minutes
```

---

## ⏱️ ESTIMATED TIMELINE

**Total time: ~75-85 minutes for 668-seed course**

| Phase | Time | Details |
|-------|------|---------|
| Phase 1 | ~15 min | 5 orch × 10 agents (translation) + validator |
| Phase 3 | ~25 min | 5 orch × 10 agents (LEGO extraction) |
| Phase 4 | ~10 sec | Preparation only (deduplication) |
| Phase 5 | ~20 min | 5 orch × 10 agents (basket generation) |
| Phase 6 | ~15 min | 5 orch × 10 agents (introductions) |
| **Total** | **~75 min** | **vs. ~46 hours sequential (36x speedup)** |

---

## 🎯 SUCCESS CRITERIA

### Complete Course Deliverables

- ✓ `seed_pairs.json` (668 translations)
- ✓ `lego_pairs.json` (2,838 LEGOs)
- ✓ `lego_baskets.json` (2,838 baskets)
- ✓ `lego_intros.json` (2,838 introductions)

### Quality Checks

- ✓ All seeds translated with vocabulary consistency (Phase 1 validator)
- ✓ All seeds tile perfectly from LEGOs (Phase 3 TILING FIRST)
- ✓ All baskets respect GATE constraint and recency bias
- ✓ All introductions are practical and learner-friendly

### No Missing Data

- ✓ All 668 seeds processed
- ✓ All 2,838 LEGOs have baskets and introductions
- ✓ Duplicate LEGOs properly mapped

---

## 💡 EFFICIENCY TIPS

**Fast preparation**:
- Run all preparation scripts in sequence (takes ~30 seconds total)
- Don't wait for user confirmation

**Smart orchestration**:
- Spawn orchestrators with 30s delays (prevents overload)
- Don't micromanage sub-agents (let orchestrators handle them)
- Monitor chunk files, not individual agents

**Quick merging**:
- Merge scripts are fast (<5 seconds each)
- Run immediately after all chunks complete
- Verify output files exist

**Proactive status updates**:
- Update user every 5 minutes with progress
- Show estimated completion time
- Celebrate milestones (each phase complete)

---

## 🔄 ERROR RECOVERY

### Chunk Failed to Generate

**Symptom**: Only 4 of 5 chunks present after waiting

**Action**:
1. Identify missing chunk number (1-5)
2. Check orchestrator logs if available
3. Re-run preparation script for that phase
4. Re-spawn just that orchestrator
5. Continue when complete

### Validator Failed (Phase 1 only)

**Symptom**: Validator reports errors or doesn't produce output

**Action**:
1. Check validator logs
2. Verify all 5 chunks are valid JSON
3. Re-spawn validator agent
4. If systematic issues, may need to re-run Phase 1

### Merge Script Failed

**Symptom**: Merge script errors or produces incomplete output

**Action**:
1. Check all chunk files exist and are valid JSON
2. Re-run merge script
3. If still failing, check manifest.json

---

## 📝 ORCHESTRATOR SPAWN PROMPTS

### Phase 1 Orchestrator Spawn

```
You are Phase 1 Orchestrator #N for <course_code>.

Your task: Translate ~134 canonical sentences into <target_language> using 10 sub-agents.

1. Read your batch file: vfs/courses/<course>/orchestrator_batches/phase1/orchestrator_batch_0N.json
2. Read Phase 1 orchestrator intelligence from the dashboard
3. Divide seeds among 10 sub-agents
4. Spawn all 10 agents in parallel (one message)
5. Validate outputs (grammar, cognates, consistency)
6. Merge into chunk file: vfs/courses/<course>/orchestrator_batches/phase1/chunk_0N.json
7. Report completion

Use extended thinking. Follow all validation rules. Output chunk file in v7.7 format.
```

### Phase 3 Orchestrator Spawn

```
You are Phase 3 Orchestrator #N for <course_code>.

Your task: Extract LEGOs from ~134 seed pairs using 10 sub-agents.

1. Read your batch file: vfs/courses/<course>/orchestrator_batches/phase3/orchestrator_batch_0N.json
2. Read Phase 3 orchestrator intelligence from the dashboard
3. Divide seeds among 10 sub-agents
4. Spawn all 10 agents in parallel (one message)
5. Validate outputs (TILING FIRST, functional determinism, components)
6. Merge into chunk file: vfs/courses/<course>/orchestrator_batches/phase3/chunk_0N.json
7. Report completion

Use extended thinking. Enforce TILING FIRST. Output chunk file in v7.7 format.
```

### Phase 5 Orchestrator Spawn

```
You are Phase 5 Orchestrator #N for <course_code>.

Your task: Generate baskets for ~362 LEGOs using 10 sub-agents.

1. Read your batch file: vfs/courses/<course>/orchestrator_batches/phase5/orchestrator_batch_0N.json
2. Read Phase 5 orchestrator intelligence from the dashboard
3. Divide LEGOs among 10 sub-agents
4. Spawn all 10 agents in parallel (one message)
5. Validate outputs (GATE constraint, recency bias, culminating baskets)
6. Merge into chunk file: vfs/courses/<course>/orchestrator_batches/phase5/chunk_0N.json
7. Report completion

Use extended thinking. Enforce GATE constraint and recency bias. Output chunk file in v7.7 format.
```

### Phase 6 Orchestrator Spawn

```
You are Phase 6 Orchestrator #N for <course_code>.

Your task: Generate introductions for ~568 LEGOs using 10 sub-agents.

1. Read your batch file: vfs/courses/<course>/orchestrator_batches/phase6/orchestrator_batch_0N.json
2. Read Phase 6 orchestrator intelligence from the dashboard
3. Divide LEGOs among 10 sub-agents
4. Spawn all 10 agents in parallel (one message)
5. Validate outputs (length, tone, practical usage)
6. Merge into chunk file: vfs/courses/<course>/orchestrator_batches/phase6/chunk_0N.json
7. Report completion

Use extended thinking. Write learner-friendly introductions. Output chunk file in v7.7 format.
```

---

## 🎉 FINAL REPORT

When all phases complete, provide comprehensive summary:

```
✅ Course Generation Complete!

Course: <course_code>
Target: <target_language>
Known: <known_language>

Deliverables:
  ✓ seed_pairs.json (668 translations)
  ✓ lego_pairs.json (2,838 LEGOs)
  ✓ lego_baskets.json (2,838 baskets, 1,808 unique)
  ✓ lego_intros.json (2,838 introductions)

Statistics:
  - Total time: 78 minutes
  - Agents used: 250 concurrent (50 per phase × 5 phases)
  - Deduplication savings: 36% (1,030 duplicate LEGOs)
  - Speedup: 36x faster than sequential

Quality:
  ✓ Vocabulary consistency enforced (Phase 1 validator)
  ✓ All seeds tile perfectly from LEGOs
  ✓ All baskets respect GATE constraint
  ✓ All introductions are learner-friendly

Next step: Deploy course to production!
```

---

## Version History

**v1.0 (2025-10-29)**:
- Initial master agent intelligence
- 5 orchestrators × 10 agents per phase
- 30-second spawn delays
- Complete workflow orchestration
- Error recovery strategies
