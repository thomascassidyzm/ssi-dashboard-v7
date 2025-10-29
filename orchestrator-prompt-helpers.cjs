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
2. Spawn orchestrators using Task tool (with 30s delays between spawns)
3. Monitor for chunk completion via Read/Glob tools
4. Run merge scripts via Bash tool
5. Provide clear status updates
6. Coordinate all phases from start to finish

**Important notes:**
- Use Task tool with subagent_type "general-purpose" to spawn orchestrator agents
- Wait 30 seconds between each orchestrator spawn (prevents overload)
- Monitor chunk files in vfs/courses/${courseCode}/orchestrator_batches/phase*/
- Run merge scripts immediately after all chunks complete

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
