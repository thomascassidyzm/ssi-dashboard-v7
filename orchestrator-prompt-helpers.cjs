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

3. Detect vocabulary conflicts across chunks (same English word → different translations)

4. Auto-fix conflicts using Phase 1 rules:
   - First Word Wins (use earliest occurrence)
   - Prefer Cognate (when applicable)
   - Zero Variation (seeds 1-100)

5. Flag subjective conflicts (if any) for review

6. Convert C#### to S#### and add known language from canonical_seeds.json

7. Output final validated file: vfs/courses/${courseCode}/seed_pairs.json

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
4. Monitor for chunk completion via Read/Glob tools
   - Check every 60 seconds for new chunks
   - Use DIFFERENTIAL LOGIC: If N-1 chunks complete within tight window (3-5 min) and 1 chunk is 5+ min behind the last completion → failed spawn, retry immediately
   - Example: chunks 1,2,3,5 done at 21:29-21:32, chunk 4 missing at 21:37 → chunk 4 failed, retry now
   - Don't wait absolute 10-15 min if differential timing shows clear failure
   - Osascript clipboard paste can fail silently
5. Run merge scripts via Bash tool
6. Provide clear status updates
7. Coordinate all phases from start to finish

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
