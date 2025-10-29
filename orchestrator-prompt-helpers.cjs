/**
 * Helper functions for generating orchestrator spawn prompts
 * These follow the exact format from dashboard_master_agent.md (lines 413-483)
 */

/**
 * Generate orchestrator spawn prompt for a specific phase
 *
 * @param {number} phaseNum - Phase number (1, 3, 5, or 6)
 * @param {number} orchestratorNum - Orchestrator number (1-5)
 * @param {string} courseCode - Course code (e.g., "spa_for_eng")
 * @returns {string} The formatted prompt string
 */
function generateOrchestratorPrompt(phaseNum, orchestratorNum, courseCode) {
  const batchPath = `vfs/courses/${courseCode}/orchestrator_batches/phase${phaseNum}/orchestrator_batch_${String(orchestratorNum).padStart(2, '0')}.json`;
  const chunkPath = `vfs/courses/${courseCode}/orchestrator_batches/phase${phaseNum}/chunk_${String(orchestratorNum).padStart(2, '0')}.json`;

  // Extract target language code from course_code (e.g., "fra_for_eng" → "fra")
  const targetLang = courseCode.split('_')[0];

  const prompts = {
    1: `You are Phase 1 Orchestrator #${orchestratorNum} for ${courseCode}.

Your task: Translate ~134 canonical sentences into target language using 10 sub-agents.

1. Read your batch file: ${batchPath}
2. Read Phase 1 orchestrator intelligence: docs/phase_intelligence/phase_1_orchestrator.md
3. Divide seeds among 10 sub-agents
4. Spawn all 10 agents in parallel (one message)
5. Validate outputs (grammar, cognates, consistency)
6. Merge into chunk file: ${chunkPath}
7. Report completion

**CRITICAL: Chunk output format:**
Use canonical IDs (C####) and target language only:
\`\`\`json
{
  "orchestrator_id": "phase1_orch_${String(orchestratorNum).padStart(2, '0')}",
  "chunk_number": ${orchestratorNum},
  "total_items": 134,
  "translations": {
    "C0001": {"${targetLang}": "Translation here"},
    "C0002": {"${targetLang}": "Translation here"}
  }
}
\`\`\`
The validator will convert C#### to S#### and add known language.

Use extended thinking. Follow all validation rules.`,

    3: `You are Phase 3 Orchestrator #${orchestratorNum} for ${courseCode}.

Your task: Extract LEGOs from ~134 seed pairs using 10 sub-agents.

1. Read your batch file: ${batchPath}
2. Read Phase 3 orchestrator intelligence: docs/phase_intelligence/phase_3_orchestrator.md
3. Divide seeds among 10 sub-agents
4. Spawn all 10 agents in parallel (one message)
5. Validate outputs (TILING FIRST, functional determinism, components)
6. Merge into chunk file: ${chunkPath}
7. Report completion

Use extended thinking. Enforce TILING FIRST. Output chunk file in v7.7 format.`,

    5: `You are Phase 5 Orchestrator #${orchestratorNum} for ${courseCode}.

Your task: Generate baskets for ~362 LEGOs using 10 sub-agents.

1. Read your batch file: ${batchPath}
2. Read Phase 5 orchestrator intelligence: docs/phase_intelligence/phase_5_orchestrator.md
3. Divide LEGOs among 10 sub-agents
4. Spawn all 10 agents in parallel (one message)
5. Validate outputs (GATE constraint, recency bias, culminating baskets)
6. Merge into chunk file: ${chunkPath}
7. Report completion

Use extended thinking. Enforce GATE constraint and recency bias. Output chunk file in v7.7 format.`,

    6: `You are Phase 6 Orchestrator #${orchestratorNum} for ${courseCode}.

Your task: Generate introductions for ~568 LEGOs using 10 sub-agents.

1. Read your batch file: ${batchPath}
2. Read Phase 6 orchestrator intelligence: docs/phase_intelligence/phase_6_orchestrator.md
3. Divide LEGOs among 10 sub-agents
4. Spawn all 10 agents in parallel (one message)
5. Validate outputs (length, tone, practical usage)
6. Merge into chunk file: ${chunkPath}
7. Report completion

Use extended thinking. Write learner-friendly introductions. Output chunk file in v7.7 format.`
  };

  return prompts[phaseNum];
}

/**
 * Generate Phase 1 validator spawn prompt
 * Validator reads 5 chunks and outputs final seed_pairs.json
 * Based on phase_1_validator.md intelligence
 *
 * @param {string} courseCode - Course code (e.g., "spa_for_eng")
 * @returns {string} The formatted validator prompt
 */
function generateValidatorPrompt(courseCode) {
  // Extract target language code from course_code (e.g., "fra_for_eng" → "fra")
  const targetLang = courseCode.split('_')[0];

  return `You are the Phase 1 Validator for ${courseCode}.

Your task: Ensure vocabulary consistency across all 668 seeds from 5 orchestrator chunks.

**CRITICAL: DO NOT write Python/JavaScript scripts to do validation work.**
**YOU are the intelligent validator. Use your reasoning + tools (Read, Write) directly.**
**Scripts delegate intelligence to code - we want agent-native validation.**

1. Read all 5 chunk files:
   - vfs/courses/${courseCode}/orchestrator_batches/phase1/chunk_01.json
   - vfs/courses/${courseCode}/orchestrator_batches/phase1/chunk_02.json
   - vfs/courses/${courseCode}/orchestrator_batches/phase1/chunk_03.json
   - vfs/courses/${courseCode}/orchestrator_batches/phase1/chunk_04.json
   - vfs/courses/${courseCode}/orchestrator_batches/phase1/chunk_05.json

2. Read Phase 1 validator intelligence: docs/phase_intelligence/phase_1_validator.md

**CRITICAL: Chunk input format:**
Chunks use canonical IDs (C####) with target language only:
\`\`\`json
{
  "translations": {
    "C0001": {"${targetLang}": "Translation"},
    "C0002": {"${targetLang}": "Translation"}
  }
}
\`\`\`

3. **Use extended thinking** to analyze all translations:
   - Build vocabulary map in your reasoning (English word → target translations → occurrences)
   - Detect conflicts (same English word → multiple target translations)
   - Apply Phase 1 rules mechanically (First Word Wins, Prefer Cognate, Zero Variation)
   - Track fixes in your thinking

4. Auto-fix conflicts using Phase 1 rules:
   - First Word Wins (use earliest occurrence)
   - Prefer Cognate (when applicable)
   - Zero Variation (seeds 1-100)

5. Flag subjective conflicts (if any) for review

6. Convert C#### to S#### and add known language from canonical_seeds.json
   - Read canonical_seeds.json to get source sentences
   - Map C#### → S#### using seed_id from batch files
   - Add known language translations

7. **Use Write tool** to output final validated file: vfs/courses/${courseCode}/seed_pairs.json
   - Do NOT use scripts - assemble the JSON structure yourself
   - Use extended thinking to organize the data
   - Write directly with Write tool

**CRITICAL: Final output format:**
\`\`\`json
{
  "translations": {
    "S0001": ["Target translation", "Known translation"],
    "S0002": ["Target translation", "Known translation"]
  }
}
\`\`\`

8. Report validation results (conflicts detected, auto-fixed, flagged)

Use extended thinking. Apply rules mechanically. Aim for >90% auto-fix rate.`;
}

/**
 * Generate master orchestrator spawn prompt
 * Master orchestrator coordinates all phases of course generation
 * Based on dashboard_master_agent.md intelligence
 *
 * @param {string} courseCode - Course code (e.g., "spa_for_eng")
 * @param {string} targetLanguage - Target language name
 * @param {string} knownLanguage - Known language name
 * @param {number} totalSeeds - Total number of seeds to process
 * @returns {string} The formatted master orchestrator prompt
 */
function generateMasterOrchestratorPrompt(courseCode, targetLanguage, knownLanguage, totalSeeds) {
  return `You are the Master Orchestrator for SSi course generation.

Course: ${courseCode}
Target Language: ${targetLanguage}
Known Language: ${knownLanguage}
Total Seeds: ${totalSeeds}

Your mission: Coordinate the complete course generation workflow across all phases (Phase 1 → Phase 3 → Phase 4 → Phase 5 → Phase 6).

**CRITICAL FIRST STEP:**
Read your complete intelligence document: docs/phase_intelligence/dashboard_master_agent.md

This document contains:
- Complete workflow for all phases
- Orchestrator spawn prompts
- Error recovery strategies
- Monitoring instructions
- Success criteria

**INTELLIGENT RESUME - CHECK BEFORE STARTING:**
Before running any phase, check if it's already complete:

1. **Phase 1 Check**: Read vfs/courses/${courseCode}/seed_pairs.json
   - If exists and has ${totalSeeds} seeds in translations object → Skip Phase 1
   - Report: "✅ Phase 1 COMPLETE: ${totalSeeds}/${totalSeeds} seeds found, skipping to Phase 3"

2. **Phase 3 Check**: Read vfs/courses/${courseCode}/lego_pairs.json
   - If exists and has ${totalSeeds} seeds in seeds array → Skip Phase 3
   - Report: "✅ Phase 3 COMPLETE: ${totalSeeds}/${totalSeeds} LEGO breakdowns found, skipping to Phase 5"

3. **Phase 5 Check**: Read vfs/courses/${courseCode}/lego_baskets.json
   - If exists and has baskets object → Skip Phase 5
   - Report: "✅ Phase 5 COMPLETE: Baskets found, skipping to Phase 6"

**Start from the first incomplete phase.** Don't regenerate completed work!

**Architecture:**
- 5 orchestrators × 10 sub-agents = 50 concurrent agents per phase
- 30-second delays between orchestrator spawns (prevents iTerm2 overload)
- Preparation scripts before each phase
- Merge scripts after chunk completion
- Validator for Phase 1 only

**Your workflow:**
1. Run preparation scripts via Bash tool
2. Spawn orchestrators in NEW iTerm2 windows using osascript via Bash tool
3. Wait 30 seconds between each orchestrator spawn (prevents overload)
4. **IMMEDIATELY start monitoring** for chunk completion (don't wait for all orchestrators to spawn):
   - Check every 30 seconds using Glob tool: vfs/courses/{course}/orchestrator_batches/phase*/chunk_*.json
   - Track timestamps of each chunk as it appears
   - Report progress: "Chunks: 1,2 complete (2/5), waiting for 3,4,5..."
   - Use DIFFERENTIAL LOGIC for failure detection:
     * If N-1 chunks complete within 3-5 min window
     * And 1 chunk is 5+ min behind the last completion
     * → Failed spawn, retry immediately (don't wait 10-15 min)
   - Example: chunks 1,2,3,5 complete at 21:29-21:32, chunk 4 missing at 21:37 → retry chunk 4 now
   - Continuous 30s polling allows fast detection (within 5-6 minutes of failure vs 10-15 min)
5. When all chunks complete:
   - Run merge/validator scripts via Bash tool
   - **CRITICAL: Kill orchestrator processes and close windows to free RAM**
   - When spawning orchestrators, capture window IDs:
     \`\`\`bash
     window_id=\$(osascript -e 'tell application "iTerm2"
         create window with default profile
         set newWindow to current window
         tell current session of newWindow
             write text "cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean"
             write text "claude --permission-mode bypassPermissions"
             delay 15
             ...
         end tell
         return id of newWindow
     end tell')
     \`\`\`
   - Track all window IDs: \`window_ids="id1 id2 id3 id4 id5"\`
   - After validation completes, **FIRST kill the Claude processes**, then close windows:
     \`\`\`bash
     # Find and kill Claude PIDs in this course directory
     pids=\$(lsof -c claude -a -d cwd -Fn | grep -A1 "vfs/courses/${courseCode}" | grep ^p | cut -c2-)
     for pid in \$pids; do
         echo "Killing orchestrator PID: \$pid"
         kill -9 \$pid
     done

     # Wait for processes to die
     sleep 2

     # Then close the iTerm2 windows
     for win_id in \$window_ids; do
         osascript -e "tell application \\"iTerm2\\" to close (every window whose id is \$win_id)"
     done

     echo "✅ All orchestrator processes killed and windows closed - RAM freed"
     \`\`\`
6. Provide clear status updates throughout monitoring
7. Coordinate all phases from start to finish

**Monitoring pattern:**
\`\`\`
Loop every 30 seconds:
  1. Count chunks: ls vfs/courses/{course}/orchestrator_batches/phase1/chunk_*.json | wc -l
  2. If all 5 present → proceed to merge
  3. If <5 present → check differential timing → retry outliers if needed
  4. Report: "⏳ Phase 1: 3/5 chunks complete (waiting 2 min)"
\`\`\`

**CRITICAL: How to spawn orchestrators in iTerm2:**

**DO NOT use the Task tool** - that spawns sub-agents within your Claude Code session. You need **NEW iTerm2 windows** so orchestrators can spawn their own Task agents.

Use the Bash tool with osascript to create new iTerm2 windows. For each orchestrator:

**Step 1:** Write the orchestrator prompt to a temp file:
\`\`\`bash
cat > /tmp/phase1_orch_01.txt << 'PROMPT_EOF'
[Full orchestrator prompt text here - see dashboard_master_agent.md lines 413-483]
PROMPT_EOF
\`\`\`

**Step 2:** Spawn iTerm2 window with osascript:
\`\`\`bash
osascript -e 'tell application "iTerm2"
    create window with default profile
    tell current session of current window
        write text "cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean"
        write text "claude --permission-mode bypassPermissions"
        delay 15
        set promptContent to read POSIX file "/tmp/phase1_orch_01.txt" as «class utf8»
        set the clipboard to promptContent
        tell application "System Events"
            keystroke "v" using command down
            delay 1
            keystroke return
        end tell
    end tell
end tell'
\`\`\`

**Step 3:** Wait 30 seconds before spawning next orchestrator

**Orchestrator prompt template for Phase 1:**
\`\`\`
You are Phase 1 Orchestrator #N for ${courseCode}.

Your task: Translate ~134 canonical sentences using 10 sub-agents.

1. Read batch: vfs/courses/${courseCode}/orchestrator_batches/phase1/orchestrator_batch_0N.json
2. Read intelligence: docs/phase_intelligence/phase_1_orchestrator.md
3. Divide work among 10 sub-agents
4. Spawn all 10 using Task tool in parallel (one message)
5. Validate outputs
6. Write chunk: vfs/courses/${courseCode}/orchestrator_batches/phase1/chunk_0N.json
7. Report completion

Use extended thinking. Follow validation rules.
\`\`\`

**Expected deliverables:**
- seed_pairs.json (${totalSeeds} translations)
- lego_pairs.json (~${Math.round(totalSeeds * 4.25)} LEGOs)
- lego_baskets.json (baskets for all LEGOs)
- lego_intros.json (introductions for all LEGOs)

Start by reading the master agent intelligence document, then begin Phase 1 preparation.

Use extended thinking. Follow all critical rules. Report progress clearly.`;
}

module.exports = {
  generateOrchestratorPrompt,
  generateValidatorPrompt,
  generateMasterOrchestratorPrompt
};
