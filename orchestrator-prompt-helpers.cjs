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

  const prompts = {
    1: `You are Phase 1 Orchestrator #${orchestratorNum} for ${courseCode}.

Your task: Translate ~134 canonical sentences into target language using 10 sub-agents.

1. Read your batch file: ${batchPath}
2. Read Phase 1 orchestrator intelligence from the dashboard
3. Divide seeds among 10 sub-agents
4. Spawn all 10 agents in parallel (one message)
5. Validate outputs (grammar, cognates, consistency)
6. Merge into chunk file: ${chunkPath}
7. Report completion

Use extended thinking. Follow all validation rules. Output chunk file in v7.7 format.`,

    3: `You are Phase 3 Orchestrator #${orchestratorNum} for ${courseCode}.

Your task: Extract LEGOs from ~134 seed pairs using 10 sub-agents.

1. Read your batch file: ${batchPath}
2. Read Phase 3 orchestrator intelligence from the dashboard
3. Divide seeds among 10 sub-agents
4. Spawn all 10 agents in parallel (one message)
5. Validate outputs (TILING FIRST, functional determinism, components)
6. Merge into chunk file: ${chunkPath}
7. Report completion

Use extended thinking. Enforce TILING FIRST. Output chunk file in v7.7 format.`,

    5: `You are Phase 5 Orchestrator #${orchestratorNum} for ${courseCode}.

Your task: Generate baskets for ~362 LEGOs using 10 sub-agents.

1. Read your batch file: ${batchPath}
2. Read Phase 5 orchestrator intelligence from the dashboard
3. Divide LEGOs among 10 sub-agents
4. Spawn all 10 agents in parallel (one message)
5. Validate outputs (GATE constraint, recency bias, culminating baskets)
6. Merge into chunk file: ${chunkPath}
7. Report completion

Use extended thinking. Enforce GATE constraint and recency bias. Output chunk file in v7.7 format.`,

    6: `You are Phase 6 Orchestrator #${orchestratorNum} for ${courseCode}.

Your task: Generate introductions for ~568 LEGOs using 10 sub-agents.

1. Read your batch file: ${batchPath}
2. Read Phase 6 orchestrator intelligence from the dashboard
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
  return `You are the Phase 1 Validator for ${courseCode}.

Your task: Ensure vocabulary consistency across all 668 seeds from 5 orchestrator chunks.

1. Read all 5 chunk files:
   - vfs/courses/${courseCode}/orchestrator_batches/phase1/chunk_01.json
   - vfs/courses/${courseCode}/orchestrator_batches/phase1/chunk_02.json
   - vfs/courses/${courseCode}/orchestrator_batches/phase1/chunk_03.json
   - vfs/courses/${courseCode}/orchestrator_batches/phase1/chunk_04.json
   - vfs/courses/${courseCode}/orchestrator_batches/phase1/chunk_05.json

2. Read Phase 1 validator intelligence from the dashboard

3. Detect vocabulary conflicts across chunks (same English word → different Spanish translations)

4. Auto-fix conflicts using Phase 1 rules:
   - First Word Wins (use earliest occurrence)
   - Prefer Cognate (when applicable)
   - Zero Variation (seeds 1-100)

5. Flag subjective conflicts (if any) for review

6. Output final validated file: vfs/courses/${courseCode}/seed_pairs.json

7. Report validation results (conflicts detected, auto-fixed, flagged)

Use extended thinking. Apply rules mechanically. Aim for >90% auto-fix rate.`;
}

module.exports = {
  generateOrchestratorPrompt,
  generateValidatorPrompt
};
