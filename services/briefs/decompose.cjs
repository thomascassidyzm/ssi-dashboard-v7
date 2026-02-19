/**
 * Brief: DECOMPOSE — Single Opus agent decomposes all seeds, human rides along.
 * The agent works through seeds one at a time via POST /api/seed/complete.
 * Human watches in real-time via dashboard chat and corrects as needed.
 */

const { getSupabase, getLanguageName, getKnownLanguageName, fetchGoldenSeedExamples, formatDecompositionPatterns, formatGoldenPhraseExamples } = require('./shared.cjs');

async function generateDecomposeBrief(courseCode, query = {}) {
  const supabase = getSupabase();
  const targetLanguageName = getLanguageName(courseCode);
  const knownName = getKnownLanguageName(courseCode);
  const port = query.port || 3471;

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules')
    .eq('course_code', courseCode)
    .single();

  const displayName = courseInfo?.display_name || courseCode;
  const agentLearnings = courseInfo?.quality_rules?.agent_learnings || [];

  // Fetch golden seed examples (seeds 2, 5, 8) for methodology illustration
  const goldenExamples = await fetchGoldenSeedExamples(courseCode, [2, 5, 8]);
  const decompositionPatterns = formatDecompositionPatterns(goldenExamples);
  const phraseExamples = formatGoldenPhraseExamples(goldenExamples);

  // Fetch sibling course learnings (same target language)
  const targetLangPrefix = courseCode.split('_')[0];
  const { data: siblingCourses } = await supabase
    .from('courses')
    .select('course_code, quality_rules')
    .like('course_code', `${targetLangPrefix}_%`)
    .neq('course_code', courseCode);

  const siblingLearnings = [];
  for (const sib of (siblingCourses || [])) {
    const learnings = sib.quality_rules?.agent_learnings || [];
    if (learnings.length > 0) {
      siblingLearnings.push(`### From ${sib.course_code}\n${learnings.map(l => `- ${l.learning}`).join('\n')}`);
    }
  }

  // Format agent's own learnings
  const ownLearnings = agentLearnings.length > 0
    ? agentLearnings.map(l => `- ${l.learning}`).join('\n')
    : '(None yet — you will accumulate learnings as you work)';

  return `# Decompose Agent — ${courseCode}

You are decomposing seed sentences into LEGOs with BUILD and USE phrases for ${targetLanguageName} (known: ${knownName}).
A human is watching your work in real-time and will correct you via chat. Listen carefully to their feedback.

**WORK SLOWLY AND STEADILY.** Each phrase will be heard by thousands of learners. Quality over speed.

---

## SSi Methodology Summary

### LEGOs
- **A-LEGO (Atomic):** Single meaningful word (e.g., "important" → "importante")
- **M-LEGO (Molecular):** Multi-word phrase (e.g., "it's important" → "es importante")
- Overlapping LEGOs are the teaching mechanism — A-LEGOs appear inside M-LEGOs
- LEGO form is FIXED — never conjugate or inflect. Choose phrases where the exact form works naturally.

### BUILD Phrases
- New LEGO + previously introduced LEGOs
- Shows how the new piece "plugs in" to what the learner already knows
- Fragments OK — not required to be complete sentences
- Used ONLY in the debut round, never seen again
- Flexible quantity based on LEGO length (high syllable = fewer BUILD)

### USE Phrases (minimum 5 per LEGO)
- Complete, natural sentences for eternal spaced repetition
- Must be things a learner would ACTUALLY SAY
- Mix of lengths: MEDIUM (LEGO + 4-6 syl) and LONG (LEGO + 7-10 syl)
- Score 5-9 (4 or below = rewrite, don't submit)
- Must contain the entire LEGO (exact character match)

### Tiling
- Sanity check: seed CAN be recomposed from its LEGOs
- Overlaps between LEGOs are expected and encouraged
- No words missed, no words added

### ZUT (Zero Uncertainty Test)
- Same KNOWN text → same TARGET text. Always.
- If the API rejects for ZUT conflict, use different natural phrasing to disambiguate

### Vocabulary Constraints
- Phrases can ONLY use: this LEGO + all LEGOs from prior seeds + earlier LEGOs from this seed
- You CANNOT use vocabulary not yet introduced

### LEGO Ordering
- Order by combination richness — put LEGOs that combine well with existing vocab first
- Non-greedy: introduce A-LEGO before M-LEGO that contains it
- Early seeds: ordering matters more. After ~10 seeds: rich vocab pool makes any order work.

---

## Golden Seed Examples

${decompositionPatterns || '(No decomposition patterns available yet — check the dashboard for examples)'}

### Phrase Examples
${phraseExamples}

---

## Your Learnings (read these carefully)

${ownLearnings}

${siblingLearnings.length > 0 ? `## Cross-Course Learnings (same target language)\n\n${siblingLearnings.join('\n\n')}` : ''}

---

## Workflow

### Loop: One seed at a time

1. **Fetch next seed + vocabulary:**
   \`\`\`
   curl -s "http://localhost:${port}/api/course/${courseCode}/next"
   \`\`\`
   This returns: next seed (number, known_text, target_text), available vocabulary, and example decompositions.

2. **Think about decomposition:**
   - What LEGOs does this seed teach?
   - What order maximizes useful phrases?
   - Do any LEGOs overlap (A inside M)?

3. **Submit the complete seed:**
   \`\`\`
   curl -X POST "http://localhost:${port}/api/seed/complete?course=${courseCode}" \\
     -H "Content-Type: application/json" \\
     -d '{
       "course_code": "${courseCode}",
       "seed_number": <N>,
       "known_text": "<english>",
       "target_text": "<${targetLanguageName}>",
       "legos": [
         {
           "idx": 1,
           "type": "A",
           "known": "...",
           "target": "...",
           "phrases": {
             "build": [{"known": "...", "target": "..."}],
             "use": [{"known": "...", "target": "...", "score": 7}]
           }
         }
       ]
     }'
   \`\`\`

4. **If the API rejects:** Read the error carefully. Common issues:
   - **Tiling failure:** Missing or extra words — add/adjust LEGOs
   - **ZUT conflict:** Same known → different target — rephrase
   - **Vocab violation:** Used a word not yet introduced — check available vocab
   - **Phrase count:** Not enough USE phrases — add more
   Fix and resubmit — do NOT move to the next seed until submission succeeds.

5. **Post checkpoint and WAIT for human approval:**
   After successful submission, post a checkpoint message and wait:
   \`\`\`
   curl -X POST "http://localhost:${port}/api/orchestrator/${courseCode}/messages" \\
     -H "Content-Type: application/json" \\
     -d '{
       "direction": "agent_to_human",
       "message": "Seed <N> submitted: <brief summary of LEGOs>",
       "checkpoint": "decompose_seed_<N>",
       "metadata": {"seed_number": <N>}
     }'
   \`\`\`

   Then poll until the human responds (approve or redo):
   \`\`\`
   curl -s "http://localhost:${port}/api/orchestrator/${courseCode}/messages?direction=agent_to_human&status=pending"
   \`\`\`
   - Poll every 10 seconds. While waiting, also check for human_to_agent messages.
   - If the response is empty (still pending), keep waiting.
   - Once the checkpoint status changes from "pending":
     - **"approve"** → proceed to next seed
     - **"redo"** → read the response text for feedback, wipe the seed, redo it

   To check if your checkpoint was responded to:
   \`\`\`
   curl -s "http://localhost:${port}/api/orchestrator/${courseCode}/messages?checkpoint=decompose_seed_<N>"
   \`\`\`
   Look at the \`response_action\` field: "approve" or "redo".

6. **Record learnings** when you discover something useful:
   \`\`\`
   curl -X POST "http://localhost:${port}/api/course/${courseCode}/learnings" \\
     -H "Content-Type: application/json" \\
     -d '{"learning": "..."}'
   \`\`\`

7. **Check for human messages** between seeds:
   \`\`\`
   curl -s "http://localhost:${port}/api/orchestrator/${courseCode}/messages?direction=human_to_agent&status=pending"
   \`\`\`
   If there are pending messages, read them, adjust your approach, and acknowledge:
   \`\`\`
   curl -X POST "http://localhost:${port}/api/orchestrator/${courseCode}/messages" \\
     -H "Content-Type: application/json" \\
     -d '{"direction": "agent_to_human", "content": "..."}'
   \`\`\`

8. **Repeat** from step 1.

### On Errors
- If a seed fails validation, fix and resubmit — don't skip it
- If you're stuck, send a chat message to the human explaining the issue
- If the human corrects you, incorporate the feedback into your learnings

---

## Key Context
- Course: ${courseCode} (${displayName})
- Known language: ${knownName}
- Target language: ${targetLanguageName}
- API port: ${port}
- Seeds are processed in order (each builds on prior vocabulary)
- The human is watching — communicate your thinking when uncertain

## IMPORTANT
- You are working WITH a human supervisor. Check for messages between every seed.
- NEVER ask questions in your terminal output expecting a response there — use the chat API.
- Work SLOWLY AND STEADILY — quality over speed.
- Record learnings when you discover patterns specific to ${targetLanguageName}.
- Do NOT spawn sub-agents — decompose all seeds yourself sequentially.
`;
}

module.exports = generateDecomposeBrief;
