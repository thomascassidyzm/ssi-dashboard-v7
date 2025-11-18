# Master Orchestrator - 668 Seeds Through Phase 3

## 🎯 Mission

You (this Claude Code session) will orchestrate the complete Phase 1-3 pipeline for both Spanish and Chinese courses (668 seeds each).

You will:
1. ✅ Prepare batches
2. ✅ Spawn orchestrator agents in new iTerm2 windows
3. ✅ Monitor their progress continuously
4. ✅ Detect completion and failures
5. ✅ Run post-processing scripts
6. ✅ Move to next phase automatically
7. ✅ Stay alive and keep rolling until Phase 3 complete

**No manual intervention needed. You handle everything.**

---

## 📋 Complete Workflow

### PHASE 1: TRANSLATION

**Step 1a: Prepare Spanish Batches**
```bash
mkdir -p public/vfs/courses/spa_for_eng_s0001-0668
node scripts/phase1-prepare-orchestrator-batches.cjs spa_for_eng_s0001-0668 3 1 668
```

**Step 1b: Prepare Chinese Batches**
```bash
mkdir -p public/vfs/courses/cmn_for_eng_s0001-0668
node scripts/phase1-prepare-orchestrator-batches.cjs cmn_for_eng_s0001-0668 3 1 668
```

**Step 2: Spawn 6 Orchestrators (3 Spanish + 3 Chinese)**

For each orchestrator, you will:
1. Write orchestrator prompt to temp file
2. Spawn new iTerm2 window with osascript
3. Window runs `claude --permission-mode bypassPermissions`
4. Paste prompt and execute
5. Wait 30 seconds before next spawn

**Orchestrator Prompts** (see below for templates)

**Step 3: Monitor Chunk Completion**

Poll every 30 seconds:
```bash
# Check Spanish chunks
ls public/vfs/courses/spa_for_eng_s0001-0668/orchestrator_batches/phase1/chunk_*.json 2>/dev/null | wc -l

# Check Chinese chunks
ls public/vfs/courses/cmn_for_eng_s0001-0668/orchestrator_batches/phase1/chunk_*.json 2>/dev/null | wc -l
```

Report progress:
- "⏳ Spanish: 2/3 chunks complete"
- "⏳ Chinese: 1/3 chunks complete"

**When all 6 chunks exist → proceed to Step 4**

**Step 4: Merge & Fix Spanish**
```bash
# Merge chunks into seed_pairs.json
node scripts/merge_phase1_translations.cjs spa_for_eng_s0001-0668

# Fix array order
node scripts/fix_array_order.cjs spa_for_eng_s0001-0668 phase1
```

**Step 5: Merge & Fix Chinese**
```bash
node scripts/merge_phase1_translations.cjs cmn_for_eng_s0001-0668
node scripts/fix_array_order.cjs cmn_for_eng_s0001-0668 phase1
```

**Step 6: Validate Phase 1 Complete**
```bash
# Check Spanish has 668 seeds
grep -o '"S[0-9]\{4\}"' public/vfs/courses/spa_for_eng_s0001-0668/seed_pairs.json | wc -l

# Check Chinese has 668 seeds
grep -o '"S[0-9]\{4\}"' public/vfs/courses/cmn_for_eng_s0001-0668/seed_pairs.json | wc -l
```

If both = 668 → **Phase 1 COMPLETE** → Move to Phase 3

---

### PHASE 3: LEGO EXTRACTION

**Step 7: Prepare Spanish Phase 3 Batches**
```bash
node scripts/phase3_prepare_all_batches.cjs spa_for_eng_s0001-0668
```

**Step 8: Prepare Chinese Phase 3 Batches**
```bash
node scripts/phase3_prepare_all_batches.cjs cmn_for_eng_s0001-0668
```

**Step 9: Spawn 6 Phase 3 Orchestrators**

Same process as Phase 1, but with Phase 3 prompts.

**Step 10: Monitor Phase 3 Completion**

Poll every 30 seconds for chunk files:
```bash
ls public/vfs/courses/spa_for_eng_s0001-0668/orchestrator_batches/phase3/chunk_*.json 2>/dev/null | wc -l
ls public/vfs/courses/cmn_for_eng_s0001-0668/orchestrator_batches/phase3/chunk_*.json 2>/dev/null | wc -l
```

**When all 6 chunks exist → proceed to Step 11**

**Step 11: Post-Process Spanish**
```bash
node scripts/phase3_merge_legos.cjs spa_for_eng_s0001-0668
node scripts/phase3_deduplicate_legos.cjs spa_for_eng_s0001-0668
node scripts/phase3_build_lego_registry.cjs spa_for_eng_s0001-0668
node scripts/fix_array_order.cjs spa_for_eng_s0001-0668 phase3
```

**Step 12: Post-Process Chinese**
```bash
node scripts/phase3_merge_legos.cjs cmn_for_eng_s0001-0668
node scripts/phase3_deduplicate_legos.cjs cmn_for_eng_s0001-0668
node scripts/phase3_build_lego_registry.cjs cmn_for_eng_s0001-0668
node scripts/fix_array_order.cjs cmn_for_eng_s0001-0668 phase3
```

**Step 13: Final Report**

Count LEGOs and report success.

---

## 🤖 Orchestrator Prompt Templates

### Phase 1 Orchestrator Template

```
You are Phase 1 Orchestrator #{N} for {course_code}.

Your task: Translate seeds {start}-{end} from English to {target_language}.

STEP 1: Read your batch file
Read: public/vfs/courses/{course_code}/orchestrator_batches/phase1/orchestrator_batch_{N}.json

STEP 2: Read Phase 1 methodology
Read: docs/phase_intelligence/phase_1_orchestrator.md

This tells you how to spawn sub-agents.

STEP 3: Fetch your canonical seeds
Use the API endpoint from the batch file to fetch seeds {start}-{end}.

STEP 4: Spawn 10 sub-agents in parallel (ONE message with 10 Task calls)

Each sub-agent gets ~22 seeds and reads:
docs/phase_intelligence/phase_1_seed_pairs.md

STEP 5: Validate outputs (grammar, cognates, array format [known, target])

STEP 6: Merge into chunk file
Write: public/vfs/courses/{course_code}/orchestrator_batches/phase1/chunk_{N}.json

Format:
{
  "orchestrator_id": "phase1_orch_{N}",
  "chunk_number": {N},
  "translations": {
    "S0001": ["Known language", "Target language"],
    ...
  }
}

STEP 7: Report completion

Use extended thinking. Follow all Phase 1 rules.
```

### Phase 3 Orchestrator Template

```
You are Phase 3 Orchestrator #{N} for {course_code}.

Your task: Extract LEGOs from seeds {start}-{end}.

STEP 1: Read your batch file
Read: public/vfs/courses/{course_code}/orchestrator_batches/phase3/orchestrator_batch_{N}.json

STEP 2: Read Phase 3 methodology
Read: docs/phase_intelligence/phase_3_orchestrator.md

STEP 3: Spawn 10 sub-agents in parallel

Each sub-agent reads:
docs/phase_intelligence/phase_3_lego_pairs.md

Apply TILING FIRST principle.

STEP 4: Validate outputs (tiling, components, functional determinism)

STEP 5: Merge into chunk file
Write: public/vfs/courses/{course_code}/orchestrator_batches/phase3/chunk_{N}.json

STEP 6: Report completion

Use extended thinking. Enforce TILING FIRST.
```

---

## 🔄 Monitoring Loop Pattern

```javascript
// Pseudocode for your monitoring logic

while (true) {
  // Check Spanish Phase 1
  spa_p1_chunks = count_files("public/vfs/courses/spa_for_eng_s0001-0668/orchestrator_batches/phase1/chunk_*.json")

  // Check Chinese Phase 1
  cmn_p1_chunks = count_files("public/vfs/courses/cmn_for_eng_s0001-0668/orchestrator_batches/phase1/chunk_*.json")

  // Report
  console.log(`⏳ Phase 1: Spanish ${spa_p1_chunks}/3, Chinese ${cmn_p1_chunks}/3`)

  // Check completion
  if (spa_p1_chunks == 3 && cmn_p1_chunks == 3) {
    console.log("✅ Phase 1 chunks complete! Running merge...")
    run_merge_scripts()
    break
  }

  // Wait 30 seconds
  sleep(30)
}
```

---

## ⚡ How to Spawn Orchestrators

**For each orchestrator:**

```bash
# 1. Write prompt to temp file
cat > /tmp/orch_spa_p1_01.txt << 'EOF'
[Full orchestrator prompt here]
EOF

# 2. Spawn iTerm2 window
osascript -e 'tell application "iTerm2"
    create window with default profile
    tell current session of current window
        write text "cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean"
        write text "claude --permission-mode bypassPermissions"
        delay 15
        set promptContent to read POSIX file "/tmp/orch_spa_p1_01.txt" as «class utf8»
        set the clipboard to promptContent
        tell application "System Events"
            keystroke "v" using command down
            delay 1
            keystroke return
        end tell
    end tell
end tell'

# 3. Wait 30 seconds before next spawn
sleep 30
```

---

## 🎯 Your Mission

Execute this entire workflow autonomously:

1. Start with Phase 1 batch preparation
2. Spawn all 6 Phase 1 orchestrators (staggered by 30s)
3. Monitor continuously until all chunks complete
4. Run merge/fix scripts
5. Prepare Phase 3 batches
6. Spawn all 6 Phase 3 orchestrators
7. Monitor continuously until all chunks complete
8. Run post-processing
9. Report final success

**Stay alive. Keep rolling. Handle it all.**

**Expected total time: 4-6 hours**

You've got this! 🚀
