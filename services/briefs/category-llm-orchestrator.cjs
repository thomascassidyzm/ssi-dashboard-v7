/**
 * Brief: CATEGORY LLM ORCHESTRATOR — Opus agent spawns Sonnet reviewers
 * in parallel. Reviewers flag phrases in five categories (awkward,
 * word-order, gender, translation-mismatch, presentation-weird).
 * Orchestrator verifies each finding and decides whether to delete,
 * rewrite, flag to Kai, or ignore.
 *
 * Query params:
 *   ?seed_min=N&seed_max=N — range (default 1-300)
 *   ?seeds=4,17,22 — specific seeds
 *   ?agents=N — parallel reviewers (default 6)
 */

const { getSupabase, getLanguageName, getKnownLanguageName } = require('./shared.cjs');

async function generateCategoryLLMOrchestratorBrief(courseCode, query = {}) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);
  const knownLang = getKnownLanguageName(courseCode);

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, target_lang, known_lang, quality_rules')
    .eq('course_code', courseCode)
    .single();

  const specificSeeds = query.seeds
    ? query.seeds.split(',').map(Number).filter(n => n > 0).sort((a, b) => a - b)
    : null;
  const seedMin = specificSeeds ? specificSeeds[0] : (parseInt(query.seed_min) || 1);
  const seedMax = specificSeeds ? specificSeeds[specificSeeds.length - 1] : (parseInt(query.seed_max) || 150);
  const agentCount = parseInt(query.agents) || 6;
  const mode = query.mode === 'lite' ? 'lite' : 'heavy';
  const reviewerModel = mode === 'lite' ? 'sonnet' : 'opus';

  // Count phrases in scope
  let phraseCount;
  if (specificSeeds) {
    const { count } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .in('seed_number', specificSeeds);
    phraseCount = count;
  } else {
    const { count } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .gte('seed_number', seedMin)
      .lte('seed_number', seedMax);
    phraseCount = count;
  }

  // Divide seeds into batches for parallel reviewers
  const seedList = specificSeeds || Array.from({ length: seedMax - seedMin + 1 }, (_, i) => seedMin + i);
  const totalSeeds = seedList.length;
  const effectiveAgents = Math.min(agentCount, totalSeeds);
  const batchSize = Math.ceil(totalSeeds / effectiveAgents);
  const batches = [];
  for (let i = 0; i < effectiveAgents; i++) {
    const batchSeeds = seedList.slice(i * batchSize, (i + 1) * batchSize);
    if (batchSeeds.length > 0) {
      batches.push({
        index: i + 1,
        seeds: batchSeeds,
        seedMin: batchSeeds[0],
        seedMax: batchSeeds[batchSeeds.length - 1]
      });
    }
  }

  const isTargeted = !!specificSeeds;
  const scopeLabel = isTargeted ? `${totalSeeds} specific seeds` : `seeds ${seedMin}-${seedMax}`;

  function reviewerBriefUrl(batch) {
    if (isTargeted) {
      return `http://localhost:3471/api/brief/${courseCode}/category-llm-reviewer?seeds=${batch.seeds.join(',')}`;
    }
    return `http://localhost:3471/api/brief/${courseCode}/category-llm-reviewer?seed_min=${batch.seedMin}&seed_max=${batch.seedMax}`;
  }

  function batchLabel(batch) {
    if (isTargeted || batch.seeds.length <= 10) return `seeds ${batch.seeds.join(', ')}`;
    return `seeds ${batch.seedMin}-${batch.seedMax} (${batch.seeds.length} seeds)`;
  }

  const teamName = `${courseCode.replace(/_/g, '-')}-category-llm`;

  return `# Category LLM Orchestrator — ${courseCode} (${langName}) for ${knownLang} speakers

Working directory: ${process.cwd()}

## YOUR JOB

You are the **category LLM pre-check** for **${courseCode}**. Your reviewers scan ${phraseCount || '?'} phrases across ${scopeLabel} for five categories that mechanical scans and the final-pass grammar review cannot detect:

1. **awkward_phrase** — grammatically valid but not what a native would actually say.
2. **wrong_word_order** — allowed order, not preferred. Matters especially for flexible-order languages where a less-surprising natural order exists.
3. **gender_mismatch** — wrong gendered form for the context (speaker, referent, or noun concord).
4. **translation_mismatch** — target meaning doesn't match the known prompt.
5. **presentation_weird** — LEGO intro example is ambiguous, unnatural, or contradicts the LEGO's pattern.

You run this BEFORE the Step 7 learner simulation. The goal is to clean out category-shaped bugs so the sim can focus on cumulative-texture findings.

## Architecture

- **${batches.length} ${reviewerModel === 'opus' ? 'Opus' : 'Sonnet'} reviewers** (read-only) — each gets a seed batch, scans phrases + presentations, reports findings.${mode === 'lite' ? ' Sonnet and severity=severe-only because this is the lite pass: we accept some missed nuance in exchange for speed and lower cost. Use after a small redo or for courses Deborah can also review.' : ' Opus because these categories need careful judgement: awkwardness, subtle gender, nuanced meaning drift, and word-order preference are exactly the places where Sonnet produces noisier false positives.'}
- **You** (Opus orchestrator) — verify each finding against your ${langName} knowledge, then decide the action per finding.

${mode === 'lite' ? `## LITE MODE — rules for this run

- Reviewers report **severe findings only**. Skip moderate and minor. "Severe" = the phrase teaches something wrong or would be misunderstood by a native; "moderate" and "minor" (awkward register, mild word-order preference) are not for this pass.
- Fewer findings means less verification work. Don't chase nuance.
- Goal: catch catastrophic bugs quickly. Polish comes from the heavy mode or from Deborah.
` : ''}

## Phase 1: Review

### Step 1.1: Create the team

\`\`\`
TeamCreate: team_name="${teamName}", description="Category LLM pre-check for ${courseCode}"
\`\`\`

### Step 1.2: Post start to chat

\`\`\`bash
curl -s -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"Category LLM pre-check started — spawning ${batches.length} reviewer${batches.length !== 1 ? 's' : ''} across ${totalSeeds} seeds. Checking awkward / word-order / gender / translation-mismatch / presentation-weird."}'
\`\`\`

### Step 1.3: Spawn all reviewers in parallel

Use the Agent tool. One call per reviewer, all in the same tool-use message:

${batches.map(b => `**reviewer-${b.index}** (${reviewerModel === 'opus' ? 'Opus' : 'Sonnet'}, ${batchLabel(b)}):
\`\`\`
Agent tool:
  name: "reviewer-${b.index}"
  team_name: "${teamName}"
  model: "${reviewerModel}"
  prompt: "You are a category LLM reviewer. Read your brief and follow it exactly:\\n\\ncurl -s \\"${reviewerBriefUrl(b)}${mode === 'lite' ? '&mode=lite' : ''}\\"\\n\\nThen work through every seed in your assignment."
\`\`\``).join('\n\n')}

### Step 1.4: Process findings as they come in

Reviewers message in a structured format: \`SEED N: CLEAN\` or \`SEED N: FINDINGS ...\` with per-finding phrase_id, category, severity, back-translation, issue, suggested fix.

**For each finding — verify before acting.**

1. **Re-read the known_text + target_text.** Use your ${langName} fluency to evaluate the reviewer's claim. Reviewers are Opus too, so their judgement is strong — but independent verification still catches cases where a reviewer pattern-matched without full context.
2. **Decide the action by category**:

#### translation_mismatch
- **severe + obvious fix**: rewrite the target to match the prompt. \`PATCH\` the phrase and null the audio:
  \`\`\`bash
  node -r dotenv/config -e "const {createClient}=require('@supabase/supabase-js'); const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY); s.from('course_practice_phrases').update({target_text:'<NEW>',target1_audio_id:null,target2_audio_id:null}).eq('id','<PHRASE_ID>').then(r=>console.log(r.error||'ok'));"
  \`\`\`
- **severe but ambiguous fix**: delete the phrase (cleaner than guessing).
  \`\`\`bash
  curl -s -X DELETE "http://localhost:3471/api/qa/phrase/<PHRASE_ID>"
  \`\`\`
- **moderate or minor**: flag for Kai (log in the final report, don't act).

#### awkward_phrase
- **severe**: delete. These are phrases a native would never say, better off gone.
- **moderate**: flag.
- **minor**: leave.

#### wrong_word_order
- **severe** (ungrammatical): shouldn't be in this category — bounce to final-pass.
- **moderate** (valid but jarring, less-surprising alternative exists): if the fix is a clean word swap, apply. Otherwise flag.
- Apply the avoid-needless-surprise rule: if the target language permits multiple natural orders and one aligns better with the ${knownLang} prompt, prefer that.

#### gender_mismatch
- Flag for Kai. Gender fixes often depend on voice assignment which Kai manages separately.

#### presentation_weird
- **severe** (contradicts LEGO pattern or uses unintroduced vocab): flag for rebuild via \`flagged_at\`.
- **moderate / minor**: flag in report, don't act.

3. **After a seed's findings are processed**, count remaining USE phrases per LEGO. If deletes dropped a LEGO below 2 USE phrases, track it — we'll flag these seeds for backfill at the end.

### Step 1.5: Monitor

Track which reviewers have finished. If one goes silent 10+ minutes, check status; replace if dead. Shut down completed ones.

## Phase 2: Summary + triage

### Step 2.1: After all reviewers are done

Post to chat:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"Phase 1 complete — [N] findings reviewed, [X] auto-fixed, [Y] auto-deleted, [Z] flagged for Kai"}'
\`\`\`

### Step 2.2: If any seeds dropped a LEGO under threshold — flag for backfill

\`\`\`bash
curl -s -X POST "http://localhost:3471/api/build/set-flags/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"seeds": [list of seed numbers]}'
\`\`\`

### Step 2.3: Print the final report

Structure:

\`\`\`
CATEGORY LLM PRE-CHECK COMPLETE — ${courseCode} ${scopeLabel}
Reviewers: ${batches.length} Sonnet, orchestrator: Opus

Findings by category:
  translation_mismatch: A found, B fixed, C flagged
  awkward_phrase:       A found, B deleted, C flagged
  wrong_word_order:     A found, B fixed, C flagged
  gender_mismatch:      A found, 0 fixed (always flagged), C flagged
  presentation_weird:   A found, B flagged for rebuild, C flagged

Auto-actions taken:
  Phrases rewritten: N (list phrase_ids + before/after)
  Phrases deleted:   N (list phrase_ids + reason)
  Seeds flagged:     N (list seed numbers)

Flagged for Kai (no auto-action — methodology or judgement needed):
  [phrase_id / LEGO] [category] [severity] — [one-line reason]
  ...

False positives (reviewer flagged, orchestrator overruled): N

Cumulative patterns worth noting:
  [any cross-finding patterns, e.g. "15 phrases across 12 seeds use 'o mais possível' where the ${knownLang} says 'as often as possible'"]
\`\`\`

## IMPORTANT RULES

1. **Verify before acting.** Reviewers are Sonnet — right most of the time, wrong on nuance. Use your Opus fluency.
2. **Don't overlap final-pass.** Grammar errors belong to final-pass. Don't re-fix those.
3. **Don't overlap mechanical scans.** Missing ?, trailing periods, lowercase I, wrong script, identical known/target — mechanical scan handles those.
4. **Apply the avoid-needless-surprise rule for word order.** If a less-surprising equally-natural order exists, prefer it.
5. **Gender is always flagged, never auto-fixed.** Voice assignment is Kai's call.
6. **Cluster patterns matter.** If you see 5+ findings that share a root cause, flag the cluster rather than the individuals — one fix likely closes all of them.
7. **Never touch phrases the reviewer flagged as "uncertain"** unless you independently confirm.
8. **Post cumulative patterns in the final report** — they're the most valuable output of this pass.

## START NOW

Create the team, spawn all ${batches.length} reviewers at once, then process their reports as they arrive.
`;
}

module.exports = generateCategoryLLMOrchestratorBrief;
