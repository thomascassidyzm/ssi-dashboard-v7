#!/usr/bin/env node

/**
 * Generate Phase 1 Orchestrator Prompt
 * Uses actual phase intelligence docs (not skill structure)
 */

const orchestratorNum = process.argv[2] || 1;
const courseCode = process.argv[3] || 'spa_for_eng_s0001-0100';

const targetLang = courseCode.split('_')[0];
const knownLang = courseCode.split('_for_')[1].split('_')[0];

const prompt = `You are Phase 1 Orchestrator #${orchestratorNum} for ${courseCode}.

Your task: Translate ~33 canonical sentences into ${targetLang} using 10 sub-agents.

## STEP 1: Read Your Batch File

Read: public/vfs/courses/${courseCode}/orchestrator_batches/phase1/orchestrator_batch_${String(orchestratorNum).padStart(2, '0')}.json

This contains:
- Seed range to translate (e.g., S0001-S0033)
- API endpoint to fetch canonical seeds
- Configuration for sub-agent spawning

## STEP 2: Fetch Canonical Seeds

Use the API endpoint from batch file to fetch canonical English sentences for your range.

## STEP 3: Read Phase 1 Intelligence

**CRITICAL:** Read the complete Phase 1 translation methodology:

\`\`\`
docs/phase_intelligence/phase_1_seed_pairs.md
\`\`\`

This document contains:
- ⚠️ TWO ABSOLUTE RULES (never violate)
- Cognate preference (mandatory for seeds 1-100)
- Zero variation principle (first word wins)
- Extended thinking protocol (use for EVERY seed)
- Array format: [known, target] everywhere
- Complete examples with reasoning

**Study this document carefully before spawning sub-agents.**

## STEP 4: Divide Work Among 10 Sub-Agents

Split your ~33 seeds into 10 portions:
- Agent 1: Seeds 1-3
- Agent 2: Seeds 4-6
- Agent 3: Seeds 7-9
- ...
- Agent 10: Seeds 31-33

## STEP 5: Spawn All 10 Sub-Agents IN PARALLEL

**CRITICAL:** Use Task tool to spawn all 10 agents in a SINGLE message.

Each agent's prompt should be:

\`\`\`
You are a Phase 1 Translation Agent for ${courseCode}.

Your task: Translate seeds SXXXX-SXXXX from English to ${targetLang}.

**REQUIRED READING:**
Read the complete Phase 1 methodology: docs/phase_intelligence/phase_1_seed_pairs.md

**PAY SPECIAL ATTENTION TO:**
1. TWO ABSOLUTE RULES (lines 44-71) - NEVER violate
2. Cognate preference (lines 447-505) - Check cognates FIRST for seeds 1-100
3. Zero variation (lines 551-628) - First word wins, maintain registry
4. Extended thinking (lines 260-396) - Use for EVERY seed translation
5. Array format (line 884-889) - [known, target] format required

**INPUT:**
Canonical seeds SXXXX-SXXXX:
[List canonical English sentences here with seed IDs]

**OUTPUT FORMAT:**
{
  "SXXXX": ["English translation", "${targetLang} translation"],
  "SXXXX": ["English translation", "${targetLang} translation"],
  ...
}

**CRITICAL REQUIREMENTS:**
- Use extended thinking for EVERY seed (show your reasoning)
- For ${targetLang}, check for cognates FIRST (seeds 1-100)
- Maintain vocabulary registry (first occurrence wins)
- Array format: [known, target] (English first, ${targetLang} second)
- Validate grammar in both languages

Output your translations as JSON.
\`\`\`

## STEP 6: Collect & Validate Outputs

Wait for all 10 agents to complete. For each output, validate:

1. **Grammar**: Both languages grammatically correct?
2. **Cognates**: Used when available (seeds 1-100)?
3. **Consistency**: Same English word → same ${targetLang} translation?
4. **Array format**: [known, target] format used?
5. **Completeness**: All assigned seeds translated?

If issues found:
- Minor (<5 seeds): Fix manually
- Systematic: Re-spawn that agent with clarification

## STEP 7: Merge Into Chunk File

Combine all 10 outputs:

{
  "orchestrator_id": "phase1_orch_${String(orchestratorNum).padStart(2, '0')}",
  "chunk_number": ${orchestratorNum},
  "total_seeds": 33,
  "translations": {
    "S0001": ["I want to speak Spanish with you now.", "Quiero hablar español contigo ahora."],
    "S0002": ["I'm trying to learn.", "Estoy intentando aprender."],
    ... all 33 seeds from your range
  }
}

## STEP 8: Write Chunk File

Write to: public/vfs/courses/${courseCode}/orchestrator_batches/phase1/chunk_${String(orchestratorNum).padStart(2, '0')}.json

## STEP 9: Report Completion

✅ Phase 1 Orchestrator #${orchestratorNum} Complete

Seeds translated: 33
Agents spawned: 10
Output: chunk_${String(orchestratorNum).padStart(2, '0')}.json
Validation: PASSED

Ready for merge step.

---

**Use extended thinking to coordinate this orchestration. Follow all Phase 1 rules.**
`;

console.log(prompt);
