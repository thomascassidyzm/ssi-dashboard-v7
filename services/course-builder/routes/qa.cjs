/**
 * QA flag management routes.
 *
 * Handles golden QA orchestration, phrase checking, flag CRUD,
 * bulk operations, phrase deletion, and agent spawning.
 *
 * Factory: receives ctx ({ supabase, config, SPAWN_MODE, PROJECT_DIR }).
 */

const { Router } = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { claudeConfigExport } = require('../../shared/claude-config.cjs');
const { getGoldenSeedCount, getLanguageName } = require('../lib/language-config.cjs');
const { spawnParallelQAAgent } = require('../lib/agent-spawner.cjs');
const { advancePipeline, setPipelineStage } = require('../lib/pipeline.cjs');
const { bumpCourseVersion } = require('../../shared/course-version.cjs');
const { emitProgress } = require('../../shared/emit-progress.cjs');

// TODO: Extract generateStrictQABrief to briefs module
function generateStrictQABrief({ courseCode, courseInfo }) {
  const langName = courseInfo?.display_name || courseCode;
  const goldenCount = getGoldenSeedCount(courseInfo);

  // 8 sub-agents x 5 seeds each = seeds 11-50
  const batches = [];
  for (let start = goldenCount + 1; start <= 50; start += 5) {
    batches.push({ start, end: Math.min(start + 4, 50) });
  }
  const batchList = batches.map((b, i) =>
    `Batch ${i + 1}: seeds ${b.start}-${b.end} (${b.end - b.start + 1} seeds)`
  ).join('\n');

  return `# Parallel Golden QA — Seeds ${goldenCount + 1}-50 (${courseCode})

You are coordinating a parallel HIGH-STANDARD quality review of the golden seeds (${goldenCount + 1}-50) for course **${courseCode}** (${langName}).

Seeds 1-${goldenCount} are hand-calibrated by the course creator — do NOT QA those.

## CRITICAL: You are an ORCHESTRATOR, not a checker
- You do NOT check phrases yourself
- You spawn sub-agents using the Task tool and monitor their progress
- You report completion when all batches are checked

## Batch Assignments

${batchList}

## Step 1: Spawn ALL Sub-Agents In One Message

**CRITICAL: You MUST send ALL Task tool calls in a SINGLE message.** Do NOT spawn one, wait, then spawn the next. Send one message containing one Task tool call per batch — all at once. This is how parallel execution works. If you spawn them sequentially the QA will take 10x longer.

For each batch, use this prompt template (customize START/END for each):

---BEGIN SUB-AGENT PROMPT---
You are a HIGH-STANDARD quality reviewer for course ${courseCode} (${langName}). You are checking ALL phrases (BUILD and USE) for seeds {START} to {END}.

## Your Four Checks

For each phrase pair (known_text + target_text), apply ALL four checks:

### 1. GRAMMAR (BOTH LANGUAGES) — MOST IMPORTANT
Is the phrase grammatically correct in BOTH English and ${langName}?
- Flag: ANY grammar error in either language — wrong verb form, wrong pronoun, missing elision, wrong mood, agreement errors
- Flag: wrong preposition, missing negation word, wrong pronoun placement, gender/number agreement
- If a native speaker of either language would notice an error, flag it
- Grammar errors teach learners wrong patterns — this is the #1 quality gate

### 2. NATURALNESS
Would a real person say this in conversation?
- Flag: stilted, textbook-sounding, or contrived phrases
- Flag: semantic nonsense ("I'm starting to finish", "I want to feel tired")
- Flag: subject-object conflicts ("I like speaking with me"), time contradictions
- Keep: everyday speech, things learners would actually say

### 3. VARIETY
Are the phrases for each LEGO genuinely different?
- Flag: near-duplicates (same sentence with one word swapped)
- Flag: phrases that all follow the exact same template pattern
- Keep: phrases showing the LEGO in varied, surprising contexts

### 4. BUILD PHRASE QUALITY
Do BUILD phrases demonstrate meaningful recombination?
- Flag: BUILD phrases that are just the LEGO by itself with no combination
- Flag: BUILD phrases with meaningless filler (LEGO + "here" or LEGO + "please")
- Keep: BUILD phrases combining the new LEGO with previously introduced LEGOs

## CRITICAL RULES
- **IGNORE punctuation and capitalisation entirely** — these are spoken phrases
- **IGNORE missing accents/diacritics** — known normalization issue, not content errors
- **Grammar errors in EITHER language MUST be flagged** — primary quality gate
- **Do NOT be conservative.** The cost of a bad phrase reaching learners is far higher than over-flagging.

## Workflow

### Step 1: Fetch ALL phrases for your seed range
\`\`\`
OFFSET=0
while true; do
  RESULT=$(curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min={START}&seed_max={END}&limit=500&offset=$OFFSET")
  COUNT=$(echo "$RESULT" | jq '.count')
  echo "$RESULT"
  if [ "$COUNT" -lt 500 ]; then break; fi
  OFFSET=$((OFFSET + 500))
done
\`\`\`

### Step 2: Review every phrase
For each phrase, apply all four checks. If EITHER language fails ANY check, add to flags.

### Step 3: Submit flags (if any)
\`\`\`
curl -s -X POST "http://localhost:3471/api/qa/bulk-flag" \\
  -H "Content-Type: application/json" \\
  -d '{"flags": [
    {"course_code": "${courseCode}", "phrase_id": "<the phrase uuid>", "seed_number": <N>, "check_type": "<grammar|naturalness|variety|build_quality>", "severity": "<error for grammar, warning for others>", "issue": "<brief reason — say which language and what's wrong>", "details": {"known": "<known_text>", "target": "<target_text>", "phrase_role": "<build/use>"}},
    ...
  ]}'
\`\`\`

### Step 4: Mark range as checked
\`\`\`
curl -s -X POST "http://localhost:3471/api/qa/bulk-mark-checked" \\
  -H "Content-Type: application/json" \\
  -d '{"course_code": "${courseCode}", "seed_min": {START}, "seed_max": {END}}'
\`\`\`

## IMPORTANT
- Check EVERY phrase (BUILD and USE). Do not skip any.
- Check BOTH languages independently for every phrase.
- NEVER ask questions. Process all phrases and submit results.
---END SUB-AGENT PROMPT---

IMPORTANT: When spawning sub-agents via the Task tool:
- Use subagent_type: "general-purpose"
- Set run_in_background: true for each
- Use model: "sonnet" for all languages.
- Keep the description short: "QA seeds {start}-{end} for ${courseCode}"

## Step 2: Monitor Progress

After spawning all sub-agents, poll progress every 60 seconds:

\`\`\`
curl -s http://localhost:3471/api/qa/summary/${courseCode}
\`\`\`

This returns { phrases: { total, checked, unchecked, progress_percent }, flags: { total, open, errors, warnings } }.

Use the Bash tool with curl to poll. Wait 60 seconds between polls (use sleep 60).

When all 8 sub-agents have completed (check their output files), the QA pass is complete.

If progress stalls (no change for 5 minutes), check sub-agent output files and report the issue. If a sub-agent failed, spawn a replacement for its seed range.

## Step 3: Report

When all batches are checked, summarise:
- Total phrases checked across all sub-agents
- Flags raised (count) by category (grammar / naturalness / variety / build_quality)
- Grammar flags broken down by language (English errors vs ${langName} errors)
- Any seeds that are particularly weak overall
- Any batches that failed

## Step 4: Signal Completion

**CRITICAL**: After all sub-agents finish and you've summarised the results, you MUST call the completion endpoint so the dashboard knows Golden QA is done:

\`\`\`
curl -s -X POST "http://localhost:3471/api/qa/golden/complete/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"flags_total": <total_flags>, "phrases_checked": <total_phrases>}'
\`\`\`

This marks the golden_qa build_jobs record as complete. Without this call, the dashboard will not know QA finished.

## AUTONOMY
You are running unattended. NEVER ask questions.
- Make decisions yourself
- If a sub-agent fails, spawn a replacement
- Keep going until all batches are checked
- ALWAYS call the completion endpoint when done (Step 4)
`;
}

// TODO: Extract generateQABrief to briefs module
function generateQABrief({ courseCode, batches, courseInfo }) {
  const batchList = batches.map((b, i) =>
    `Batch ${i + 1}: seeds ${b.start}-${b.end} (${b.end - b.start + 1} seeds)`
  ).join('\n');

  const langCode = courseCode.split('_')[0];
  const langName = courseInfo?.display_name || courseCode;

  return `# Parallel QA Pass — Coordinator Agent

You are coordinating a parallel naturalness & grammar QA pass for course **${courseCode}** (${langName}).

## CRITICAL: You are an ORCHESTRATOR, not a checker
- You do NOT check phrases yourself
- You spawn sub-agents using the Task tool and monitor their progress
- You report completion when all batches are checked

## Batch Assignments
Seeds 1-${getGoldenSeedCount(courseInfo)} are golden (skip). Remaining seeds split into batches:

${batchList}

## Step 1: Spawn ALL Sub-Agents In One Message

**CRITICAL: You MUST send ALL Task tool calls in a SINGLE message.** Do NOT spawn one, wait, then spawn the next. Send one message containing one Task tool call per batch — all at once. This is how parallel execution works. If you spawn them sequentially the QA will take 10x longer.

For each batch, use this prompt template (customize start/end for each):

---BEGIN SUB-AGENT PROMPT---
You are a naturalness QA checker for course ${courseCode} (${langName}). You are checking USE phrases only for seeds {START} to {END}.

## Your Job

For each USE phrase pair (known_text + target_text), check BOTH sides independently:

**Known text (English):** Is this grammatically correct, natural English that a real person would say?
**Target text (${langName}):** Is this grammatically correct, natural ${langName} that a native speaker would say?

Flag the phrase if EITHER side fails ANY of these checks:

### Grammar Errors (EITHER language) — flag ALL of these:
- Wrong verb form: "I want going" (should be "I want to go"), "de comprends" (should be "de comprendre")
- Wrong reflexive pronoun: "je veux s'occuper" (should be "m'occuper"), "I speak with me" (should be "with you")
- Missing elision: "de essayer" (should be "d'essayer"), "je ai" (should be "j'ai")
- Wrong mood: "je veux que tu comprends" (should be subjunctive "comprennes")
- Missing negation word: "je ne sais" without "pas" when "pas" is needed
- Wrong preposition: "j'essaie à comprendre" (should be "de comprendre")
- Wrong pronoun placement: "comprendre toi" (should be "te comprendre")
- Gender/number agreement errors: "des choses différents" (should be "différentes")
- ANY other grammar error in either language — if a native speaker would notice it, flag it

### Naturalness — flag if:
- Nobody would actually say this in conversation (stilted, textbook, contrived)
- Semantic nonsense: "I'm starting to finish", "today or yesterday", "I want to feel tired"
- Subject-object conflict: "I like speaking French with me"
- Time contradictions: "I don't worry yesterday" (present + past)
- Incomplete thoughts that trail off without meaning

### Meaning Match — flag if:
- The two sides don't match in meaning
- One side says something significantly different from the other

**IGNORE ALL FORMATTING:**
- Do NOT flag missing capitalization (e.g. "i want to speak italian" is perfectly fine)
- Do NOT flag missing punctuation (no periods, question marks, or commas needed — these are SPOKEN phrases, not written text)
- Do NOT flag missing accents/diacritics — these are a known normalization issue, not content errors
- Punctuation, capitalisation, and diacritics are IRRELEVANT. Only the spoken content matters.

You do NOT fix phrases. You FLAG every phrase that has a problem for deletion.
**Do NOT be conservative.** If a phrase has a grammar error, flag it. If a native speaker would wince, flag it. The cost of missing a bad phrase is far higher than the cost of flagging one that's borderline.

## Workflow

### Step 1: Fetch USE phrases for your seed range
Use the Bash tool with curl to paginate through USE phrases:

\`\`\`
OFFSET=0
while true; do
  RESULT=$(curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min={START}&seed_max={END}&role=use&limit=500&offset=$OFFSET")
  COUNT=$(echo "$RESULT" | jq '.count')
  echo "$RESULT"
  if [ "$COUNT" -lt 500 ]; then break; fi
  OFFSET=$((OFFSET + 500))
done
\`\`\`

Each phrase has: id, known_text, target_text, seed_number, lego_index, phrase_role.

### Step 2: Evaluate each phrase
For each phrase, check both the known (English) and target (${langName}) text:

- If BOTH sides are grammatically correct, natural, and match in meaning → move on
- If EITHER side has a grammar error, is unnatural, or the meanings don't match → add to your flags list

### Step 3: Submit flags (if any)
Collect all flags and submit in one bulk call:

\`\`\`
curl -s -X POST "http://localhost:3471/api/qa/bulk-flag" \\
  -H "Content-Type: application/json" \\
  -d '{"flags": [
    {"course_code": "${courseCode}", "phrase_id": "<the phrase uuid>", "seed_number": <N>, "check_type": "<grammar|naturalness|meaning_mismatch>", "severity": "error", "issue": "<brief reason — say which language and what's wrong>", "details": {"known": "<known_text>", "target": "<target_text>", "phrase_role": "<build/use>"}},
    ...
  ]}'
\`\`\`

### Step 4: Mark range as checked
After checking ALL phrases (whether or not you found flags), mark the entire range:

\`\`\`
curl -s -X POST "http://localhost:3471/api/qa/bulk-mark-checked" \\
  -H "Content-Type: application/json" \\
  -d '{"course_code": "${courseCode}", "seed_min": {START}, "seed_max": {END}}'
\`\`\`

## IMPORTANT
- Check EVERY phrase. Do not skip any.
- Check BOTH languages independently. A phrase with perfect English but broken ${langName} grammar MUST be flagged. A phrase with perfect ${langName} but broken English MUST be flagged.
- Do NOT be lenient. If a native speaker of either language would notice an error, flag it. The cost of a bad phrase reaching learners is far higher than the cost of over-flagging.
- You are running unattended. NEVER ask questions. Process all phrases and submit results.
---END SUB-AGENT PROMPT---

IMPORTANT: When spawning sub-agents via the Task tool:
- Use subagent_type: "general-purpose"
- Set run_in_background: true for each
- Use model: "sonnet" for all languages.
- Keep the description short: "QA seeds {start}-{end} for ${courseCode}"

## Step 2: Monitor Progress

After spawning all sub-agents, poll progress every 60 seconds:

\`\`\`
curl -s http://localhost:3471/api/qa/summary/${courseCode}
\`\`\`

This returns { phrases: { total, checked, unchecked, progress_percent }, flags: { total, open, errors, warnings } }.

Use the Bash tool with curl to poll. Wait 60 seconds between polls (use sleep 60).

When progress_percent reaches 100 (or unchecked reaches 0), the QA pass is complete.

If progress stalls (no change for 5 minutes), check sub-agent output files and report the issue. If a sub-agent failed, spawn a replacement for its seed range.

## Step 3: Report

When all batches are checked, summarise:
- Total phrases checked
- Flags raised (count)
- Any batches that failed

## AUTONOMY
You are running unattended. NEVER ask questions.
- Make decisions yourself
- If a sub-agent fails, spawn a replacement
- Keep going until all batches are checked
`;
}

module.exports = function qaRoutes(ctx) {
  const router = Router();
  const supabase = ctx.supabase;

  // ---------------------------------------------------------------------------
  // POST /qa/strict/:courseCode - Start a parallel strict (golden) QA pass
  // ---------------------------------------------------------------------------
  router.post('/qa/strict/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { terminal = 'iTerm2' } = req.body || {};

    try {
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('course_code, display_name, seed_count')
        .eq('course_code', courseCode)
        .single();

      if (courseError || !course) {
        return res.status(404).json({ ok: false, error: `Course ${courseCode} not found` });
      }

      // Create build_jobs record for golden_qa tracking
      let jobId = null;
      try {
        // Cancel any existing running golden_qa job first
        await supabase
          .from('build_jobs')
          .update({ status: 'stopped', completed_at: new Date().toISOString() })
          .eq('course_code', courseCode)
          .eq('pass', 'golden_qa')
          .in('status', ['pending', 'running']);

        const { data: job, error: jobError } = await supabase
          .from('build_jobs')
          .insert({
            course_code: courseCode,
            pass: 'golden_qa',
            status: 'running',
            total_seeds: 40,
            seeds_completed: 0,
            started_at: new Date().toISOString(),
            last_heartbeat: new Date().toISOString(),
            requested_by: 'dashboard'
          })
          .select()
          .single();
        if (jobError) {
          console.warn(`[QA-STRICT] Could not create build_jobs record: ${jobError.message}`);
        } else {
          jobId = job.id;
          console.log(`[QA-STRICT] Created build_jobs record ${jobId} for golden_qa`);
        }
      } catch (e) {
        console.warn(`[QA-STRICT] build_jobs insert failed (constraint may need updating): ${e.message}`);
      }

      const prompt = generateStrictQABrief({ courseCode, courseInfo: course });
      const tmpFile = `/tmp/claude_qa_strict_${courseCode}_${Date.now()}.txt`;
      fs.writeFileSync(tmpFile, prompt);

      const projectDir = ctx.PROJECT_DIR;
      const claudeCmd = `cd "${projectDir}" && ${claudeConfigExport()} && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model sonnet --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      console.log(`[QA-STRICT] Spawning parallel golden QA coordinator for ${courseCode} seeds 11-50 (8 sub-agents) in ${effectiveTerminal}`);
      emitProgress(ctx.supabase, courseCode, 'Golden QA started: checking seeds 11–50 with 8 parallel agents', { phase: 'qa', action: 'golden-qa-start' });

      let agent;
      if (effectiveTerminal === 'headless') {
        const logsDir = path.join(projectDir, 'logs');
        if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
        const logFile = `${logsDir}/qa-strict-${courseCode}.log`;
        const out = fs.openSync(logFile, 'a');
        const err = fs.openSync(logFile, 'a');
        agent = spawn('bash', ['-c', claudeCmd], { detached: true, stdio: ['ignore', out, err] });
        agent.unref();
      } else {
        const osascript = `
tell application "iTerm"
    activate
    set newWindow to (create window with default profile)
    set targetSession to current session of newWindow
    tell targetSession
        set name to "Golden QA: ${courseCode}"
        write text "${claudeCmd.replace(/"/g, '\\"')}"
    end tell
end tell
return "spawned"`;
        const { execSync } = require('child_process');
        execSync(`osascript -e '${osascript.replace(/'/g, "'\\''")}'`);
      }

      res.json({
        ok: true,
        mode: 'strict_qa_parallel',
        course_code: courseCode,
        seed_range: '11-50',
        agents: 8,
        job_id: jobId,
        message: `Golden QA coordinator spawned for seeds 11-50 (Opus coordinator + 8 Sonnet sub-agents)`
      });
    } catch (err) {
      console.error(`[QA-STRICT] Error:`, err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /qa/golden/complete/:courseCode - Mark golden QA as complete
  // ---------------------------------------------------------------------------
  router.post('/qa/golden/complete/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { flags_total, phrases_checked } = req.body || {};

    try {
      // Find the active golden_qa job
      const { data: job, error: findError } = await supabase
        .from('build_jobs')
        .select('id')
        .eq('course_code', courseCode)
        .eq('pass', 'golden_qa')
        .in('status', ['running', 'pending'])
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (findError || !job) {
        // No running job found — mark complete anyway by inserting a completed record
        const { error: insertErr } = await supabase
          .from('build_jobs')
          .insert({
            course_code: courseCode,
            pass: 'golden_qa',
            status: 'complete',
            total_seeds: 40,
            seeds_completed: 40,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            requested_by: 'agent'
          });
        if (insertErr) {
          console.warn(`[QA-GOLDEN-COMPLETE] Insert fallback failed: ${insertErr.message}`);
        }
        console.log(`[QA-GOLDEN-COMPLETE] No running job found for ${courseCode}, created completed record`);
      } else {
        // Update existing job
        const { error: updateErr } = await supabase
          .from('build_jobs')
          .update({
            status: 'complete',
            seeds_completed: 40,
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);

        if (updateErr) {
          console.error(`[QA-GOLDEN-COMPLETE] Update failed: ${updateErr.message}`);
          return res.status(500).json({ ok: false, error: updateErr.message });
        }
        console.log(`[QA-GOLDEN-COMPLETE] Marked job ${job.id} as complete for ${courseCode}`);
      }

      res.json({
        ok: true,
        course_code: courseCode,
        flags_total: flags_total || null,
        phrases_checked: phrases_checked || null,
        message: `Golden QA marked as complete for ${courseCode}`
      });
    } catch (err) {
      console.error(`[QA-GOLDEN-COMPLETE] Error:`, err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /qa/golden/status/:courseCode - Check golden QA job status
  // ---------------------------------------------------------------------------
  router.get('/qa/golden/status/:courseCode', async (req, res) => {
    const { courseCode } = req.params;

    try {
      // Check for any golden_qa job (most recent)
      const { data: job } = await supabase
        .from('build_jobs')
        .select('id, status, started_at, completed_at, seeds_completed')
        .eq('course_code', courseCode)
        .eq('pass', 'golden_qa')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!job) {
        return res.json({ ok: true, status: 'not_started', complete: false });
      }

      res.json({
        ok: true,
        status: job.status,
        complete: job.status === 'complete',
        running: ['running', 'pending'].includes(job.status),
        job_id: job.id,
        started_at: job.started_at,
        completed_at: job.completed_at,
        seeds_checked: job.seeds_completed || 0
      });
    } catch (err) {
      res.json({ ok: true, status: 'not_started', complete: false });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /qa/start/:courseCode - Start a parallel QA pass
  // ---------------------------------------------------------------------------
  router.post('/qa/start/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { terminal = 'iTerm2' } = req.body || {};

    try {
      // Verify course exists
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('course_code, display_name, seed_count')
        .eq('course_code', courseCode)
        .single();

      if (courseError || !course) {
        return res.status(404).json({ ok: false, error: `Course ${courseCode} not found` });
      }

      // Check current QA progress
      const { count: totalPhrases } = await supabase
        .from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode);

      if (!totalPhrases || totalPhrases === 0) {
        return res.status(400).json({ ok: false, error: `No phrases found for ${courseCode} — build course first` });
      }

      const { count: uncheckedPhrases } = await supabase
        .from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .is('qa_checked', null);

      if (uncheckedPhrases === 0) {
        return res.json({ ok: false, error: `All ${totalPhrases} phrases already QA checked` });
      }

      console.log(`[QA] Starting parallel QA for ${courseCode}: ${uncheckedPhrases}/${totalPhrases} unchecked phrases`);
      emitProgress(supabase, courseCode, `QA pass started: ${uncheckedPhrases}/${totalPhrases} phrases to check`, { phase: 'qa', action: 'qa-start', unchecked: uncheckedPhrases, total: totalPhrases });

      // spawnParallelQAAgent inline — the lib stub throws, so run the logic here
      const { data: courseInfo } = await supabase
        .from('courses')
        .select('display_name, seed_count, quality_rules')
        .eq('course_code', courseCode)
        .single();

      const targetSeeds = courseInfo?.seed_count || 300;
      const goldenCount = getGoldenSeedCount(courseInfo);

      // Calculate batch ranges: seeds after golden range split into batches
      const firstSeed = goldenCount + 1;
      const totalToCheck = targetSeeds - firstSeed + 1;
      const NUM_BATCHES = Math.min(ctx.config.MAX_PARALLEL_AGENTS, Math.ceil(totalToCheck / ctx.config.SEEDS_PER_AGENT));
      const batchSize = Math.ceil(totalToCheck / NUM_BATCHES);

      const qaBatches = [];
      for (let i = 0; i < NUM_BATCHES; i++) {
        const start = firstSeed + (i * batchSize);
        const end = Math.min(start + batchSize - 1, targetSeeds);
        if (start <= targetSeeds) {
          qaBatches.push({ start, end });
        }
      }

      console.log(`[QA] Parallel QA for ${courseCode}: ${qaBatches.length} batches, ${totalToCheck} seeds`);

      const prompt = generateQABrief({ courseCode, batches: qaBatches, courseInfo });

      const tmpFile = `/tmp/claude_qa_${courseCode}_${Date.now()}.txt`;
      fs.writeFileSync(tmpFile, prompt);

      const projectDir = ctx.PROJECT_DIR;
      const claudeCmd = `cd "${projectDir}" && ${claudeConfigExport()} && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model sonnet --dangerously-skip-permissions "$(cat ${tmpFile})"`;

      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      console.log(`[QA] Spawning QA Coordinator for ${courseCode} in ${effectiveTerminal}`);

      let agent;

      if (effectiveTerminal === 'headless') {
        const logsDir = path.join(projectDir, 'logs');
        if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

        const logFile = `${logsDir}/qa-coordinator-${courseCode}.log`;
        const out = fs.openSync(logFile, 'a');
        const errFd = fs.openSync(logFile, 'a');

        agent = spawn('bash', ['-c', claudeCmd], {
          stdio: ['ignore', out, errFd],
          detached: true
        });
        agent.unref();

        console.log(`[QA] QA coordinator launched headless (pid: ${agent.pid}, log: ${logFile})`);

        agent.on('error', (spawnErr) => {
          console.error(`[QA] QA coordinator error:`, spawnErr.message);
        });

        agent.on('exit', (code) => {
          console.log(`[QA] QA coordinator exited (code: ${code})`);
        });
      } else {
        const escapedCmd = claudeCmd.replace(/"/g, '\\"');

        let osascript;
        if (effectiveTerminal === 'iTerm2') {
          osascript = `tell application "iTerm"
  activate
  set newWindow to (create window with default profile)
  tell current session of newWindow
    write text "${escapedCmd}"
  end tell
end tell`;
        } else {
          osascript = `tell application "Terminal"
  activate
  do script "${escapedCmd}"
end tell`;
        }

        agent = spawn('osascript', ['-e', osascript], {
          stdio: 'pipe',
          detached: true
        });

        agent.on('error', (spawnErr) => {
          console.error(`[QA] QA coordinator osascript error:`, spawnErr.message);
        });

        agent.on('exit', (code) => {
          console.log(`[QA] QA coordinator terminal launched (osascript exit: ${code})`);
        });
      }

      res.json({
        ok: true,
        mode: 'parallel_qa',
        course_code: courseCode,
        batches: qaBatches.length,
        phrases: {
          total: totalPhrases,
          unchecked: uncheckedPhrases
        },
        message: `Parallel QA started — coordinator agent spawned with ${qaBatches.length} batches`
      });
    } catch (err) {
      console.error(`[QA] Error starting QA for ${courseCode}:`, err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /qa/unchecked/:courseCode - Get phrases not yet QA checked
  // ---------------------------------------------------------------------------
  router.get('/qa/unchecked/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const role = req.query.role; // Optional: 'use', 'practice', 'component'
      const seedMin = parseInt(req.query.seed_min) || null;
      const seedMax = parseInt(req.query.seed_max) || null;

      let query = supabase
        .from('course_practice_phrases')
        .select('id, lego_index, known_text, target_text, phrase_role, seed_number, created_at')
        .eq('course_code', courseCode)
        .is('qa_checked', null);

      // Filter by role if specified (recommended: use 'use' for QA)
      if (role) {
        query = query.eq('phrase_role', role);
      }
      if (seedMin) {
        query = query.gte('seed_number', seedMin);
      }
      if (seedMax) {
        query = query.lte('seed_number', seedMax);
      }

      const { data, error } = await query
        .order('seed_number', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      res.json({
        course_code: courseCode,
        role_filter: role || 'all',
        unchecked_count: data.length,
        phrases: data
      });
    } catch (err) {
      console.error('[QA] Error getting unchecked phrases:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /qa/sample/:courseCode - Get random sample of phrases for AUDIT mode
  // ---------------------------------------------------------------------------
  router.get('/qa/sample/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const limit = Math.min(parseInt(req.query.limit) || 100, 500);
      const seedMin = parseInt(req.query.seed_min) || 1;
      const seedMax = parseInt(req.query.seed_max) || 999;

      // Get random sample using Supabase's built-in random ordering
      // Note: For true randomness on large tables, we fetch more and shuffle
      const { data, error } = await supabase
        .from('course_practice_phrases')
        .select('id, lego_index, known_text, target_text, phrase_role, seed_number, created_at, qa_checked')
        .eq('course_code', courseCode)
        .gte('seed_number', seedMin)
        .lte('seed_number', seedMax)
        .limit(limit * 2);  // Fetch extra for shuffling

      if (error) throw error;

      // Shuffle and take limit
      const shuffled = data.sort(() => Math.random() - 0.5).slice(0, limit);

      res.json({
        course_code: courseCode,
        sample_size: shuffled.length,
        seed_range: { min: seedMin, max: seedMax },
        phrases: shuffled
      });
    } catch (err) {
      console.error('[QA] Error getting phrase sample:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /qa/flag - Insert a QA flag for a phrase
  // ---------------------------------------------------------------------------
  router.post('/qa/flag', async (req, res) => {
    try {
      const { course_code, phrase_id, seed_number, lego_id, check_type, severity, issue, details } = req.body;

      if (!course_code || !check_type || !issue) {
        return res.status(400).json({
          error: 'Missing required fields: course_code, check_type, issue'
        });
      }

      // Valid check types from migration
      const validTypes = ['grammar', 'semantic', 'naturalness', 'lego_frequency', 'lego_spread', 'variety', 'vocabulary', 'decomposition', 'pedagogy'];
      if (!validTypes.includes(check_type)) {
        return res.status(400).json({
          error: `Invalid check_type. Must be one of: ${validTypes.join(', ')}`
        });
      }

      const validSeverities = ['error', 'warning', 'info'];
      if (severity && !validSeverities.includes(severity)) {
        return res.status(400).json({
          error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
        });
      }

      // Attribution before the write, while the flagged row is still named.
      if (req.contentEdit) {
        await req.contentEdit.record({
          scope: {
            ...(phrase_id ? { phrase_ids: [phrase_id] } : {}),
            ...(seed_number ? { seed_numbers: [seed_number] } : {}),
            ...(lego_id ? { lego_ids: [lego_id] } : {}),
            rows: 1
          },
          detail: { check_type, severity: severity || 'warning' }
        });
      }

      // Check if flag already exists for this phrase+check_type
      let existingFlag = null;
      if (phrase_id) {
        const { data: existing } = await supabase
          .from('course_qa_flags')
          .select('id')
          .eq('phrase_id', phrase_id)
          .eq('check_type', check_type)
          .eq('status', 'open')
          .maybeSingle();
        existingFlag = existing;
      }

      let data;
      if (existingFlag) {
        // Update existing flag
        const { data: updated, error } = await supabase
          .from('course_qa_flags')
          .update({
            severity: severity || 'warning',
            issue,
            details: details || {},
            flagged_at: new Date().toISOString()
          })
          .eq('id', existingFlag.id)
          .select()
          .single();
        if (error) throw error;
        data = updated;
      } else {
        // Insert new flag
        const { data: inserted, error } = await supabase
          .from('course_qa_flags')
          .insert({
            course_code,
            phrase_id: phrase_id || null,
            seed_number: seed_number || null,
            lego_id: lego_id || null,
            check_type,
            severity: severity || 'warning',
            issue,
            details: details || {},
            status: 'open',
            flagged_at: new Date().toISOString()
          })
          .select()
          .single();
        if (error) throw error;
        data = inserted;
      }

      console.log(`[QA] Flag created: ${check_type}/${severity} - ${issue.substring(0, 50)}...`);

      res.json({
        success: true,
        flag: data
      });
    } catch (err) {
      console.error('[QA] Error inserting flag:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /qa/bulk-flag - Insert/upsert multiple QA flags at once
  // ---------------------------------------------------------------------------
  router.post('/qa/bulk-flag', async (req, res) => {
    try {
      const { flags } = req.body;

      if (!flags || !Array.isArray(flags) || flags.length === 0) {
        return res.status(400).json({ error: 'flags must be a non-empty array' });
      }

      const validTypes = ['grammar', 'semantic', 'naturalness', 'lego_frequency', 'lego_spread', 'variety', 'vocabulary', 'decomposition', 'pedagogy'];
      const validSeverities = ['error', 'warning', 'info'];

      // Validate all flags first
      for (let i = 0; i < flags.length; i++) {
        const f = flags[i];
        if (!f.course_code || !f.check_type || !f.issue) {
          return res.status(400).json({ error: `Flag ${i}: missing required fields (course_code, check_type, issue)` });
        }
        if (!validTypes.includes(f.check_type)) {
          return res.status(400).json({ error: `Flag ${i}: invalid check_type '${f.check_type}'` });
        }
        if (f.severity && !validSeverities.includes(f.severity)) {
          return res.status(400).json({ error: `Flag ${i}: invalid severity '${f.severity}'` });
        }
      }

      // One event for the whole bulk save; the qa_checked stamp below rides it.
      const eventId = req.contentEdit ? await req.contentEdit.record({
        scope: {
          phrase_ids: [...new Set(flags.map(f => f.phrase_id).filter(Boolean))],
          rows: flags.length
        }
      }) : null;

      let created = 0;
      let updated = 0;
      const phraseIdsToMark = new Set();

      for (const f of flags) {
        // Check for existing flag (dedup by phrase_id + check_type)
        let existingFlag = null;
        if (f.phrase_id) {
          const { data: existing } = await supabase
            .from('course_qa_flags')
            .select('id')
            .eq('phrase_id', f.phrase_id)
            .eq('check_type', f.check_type)
            .eq('status', 'open')
            .maybeSingle();
          existingFlag = existing;
        }

        if (existingFlag) {
          const { error } = await supabase
            .from('course_qa_flags')
            .update({
              severity: f.severity || 'warning',
              issue: f.issue,
              details: f.details || {},
              flagged_at: new Date().toISOString()
            })
            .eq('id', existingFlag.id);
          if (error) throw error;
          updated++;
        } else {
          const { error } = await supabase
            .from('course_qa_flags')
            .insert({
              course_code: f.course_code,
              phrase_id: f.phrase_id || null,
              seed_number: f.seed_number || null,
              lego_id: f.lego_id || null,
              check_type: f.check_type,
              severity: f.severity || 'warning',
              issue: f.issue,
              details: f.details || {},
              status: 'open',
              flagged_at: new Date().toISOString()
            });
          if (error) throw error;
          created++;
        }

        if (f.phrase_id) phraseIdsToMark.add(f.phrase_id);
      }

      // Mark all flagged phrases as qa_checked
      if (phraseIdsToMark.size > 0) {
        const { error: markError } = await supabase
          .from('course_practice_phrases')
          .update({ qa_checked: new Date().toISOString(), last_edit_event_id: eventId })
          .in('id', [...phraseIdsToMark]);
        if (markError) console.error('[QA] Error marking flagged phrases as checked:', markError.message);
      }

      console.log(`[QA] Bulk flag: ${created} created, ${updated} updated, ${phraseIdsToMark.size} phrases marked checked`);

      const courseCode = flags[0]?.course_code;
      if (courseCode) ctx.emitPipelineEvent(courseCode, 'qa:update', { flagged: created + updated, checked: phraseIdsToMark.size });

      res.json({
        success: true,
        created,
        updated,
        total: created + updated,
        phrases_marked_checked: phraseIdsToMark.size
      });
    } catch (err) {
      console.error('[QA] Error in bulk flag:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /qa/bulk-mark-checked - Mark all phrases in a seed range as QA checked
  // ---------------------------------------------------------------------------
  router.post('/qa/bulk-mark-checked', async (req, res) => {
    try {
      const { course_code, seed_min, seed_max } = req.body;

      if (!course_code || !seed_min || !seed_max) {
        return res.status(400).json({ error: 'Missing required fields: course_code, seed_min, seed_max' });
      }
      if (seed_min > seed_max) {
        return res.status(400).json({ error: 'seed_min must be <= seed_max' });
      }

      // Range, not row ids: the update selects by seed span, so the scope says so.
      const eventId = req.contentEdit ? await req.contentEdit.record({
        scope: { course_code, seed_min, seed_max }
      }) : null;

      const { data, error } = await supabase
        .from('course_practice_phrases')
        .update({ qa_checked: new Date().toISOString(), last_edit_event_id: eventId })
        .eq('course_code', course_code)
        .gte('seed_number', seed_min)
        .lte('seed_number', seed_max)
        .is('qa_checked', null)
        .select('id', { count: 'exact', head: true });

      // Supabase update doesn't return count directly, so count separately
      const { count } = await supabase
        .from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', course_code)
        .gte('seed_number', seed_min)
        .lte('seed_number', seed_max)
        .not('qa_checked', 'is', null);

      if (error) throw error;

      console.log(`[QA] Bulk mark-checked: seeds ${seed_min}-${seed_max} for ${course_code} (${count} phrases)`);

      ctx.emitPipelineEvent(course_code, 'qa:update', { checked: count || 0, flagged: 0 });

      res.json({
        success: true,
        course_code,
        seed_min,
        seed_max,
        phrases_checked: count || 0
      });
    } catch (err) {
      console.error('[QA] Error in bulk mark-checked:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /qa/mark-checked - Mark phrases as QA checked (by phrase IDs)
  // ---------------------------------------------------------------------------
  router.post('/qa/mark-checked', async (req, res) => {
    try {
      const { phrase_ids } = req.body;

      if (!phrase_ids || !Array.isArray(phrase_ids) || phrase_ids.length === 0) {
        return res.status(400).json({
          error: 'phrase_ids must be a non-empty array'
        });
      }

      const eventId = req.contentEdit ? await req.contentEdit.record({
        scope: { phrase_ids, rows: phrase_ids.length }
      }) : null;

      const { error } = await supabase
        .from('course_practice_phrases')
        .update({ qa_checked: new Date().toISOString(), last_edit_event_id: eventId })
        .in('id', phrase_ids);

      if (error) throw error;

      console.log(`[QA] Marked ${phrase_ids.length} phrases as checked`);

      res.json({
        success: true,
        checked_count: phrase_ids.length
      });
    } catch (err) {
      console.error('[QA] Error marking phrases checked:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /qa/flags/:courseCode/pending - Get open flags needing review (for Fixer agent)
  // ---------------------------------------------------------------------------
  router.get('/qa/flags/:courseCode/pending', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const severity = req.query.severity;

      let query = supabase
        .from('course_qa_flags')
        .select('*')
        .eq('course_code', courseCode)
        .eq('status', 'open')
        .order('severity', { ascending: true })  // errors first
        .order('flagged_at', { ascending: true })
        .limit(limit);

      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data: flags, error } = await query;
      if (error) throw error;

      res.json({
        course_code: courseCode,
        pending_count: flags.length,
        flags
      });
    } catch (err) {
      console.error('[QA] Error getting pending flags:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // PATCH /phrases/:id - Update a phrase (for Fixer agent)
  // ---------------------------------------------------------------------------
  router.patch('/phrases/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { known_text, target_text } = req.body;

      if (!known_text && !target_text) {
        return res.status(400).json({
          error: 'Must provide known_text and/or target_text to update'
        });
      }

      // Get current phrase for logging
      const { data: current } = await supabase
        .from('course_practice_phrases')
        .select('known_text, target_text, course_code, seed_number')
        .eq('id', id)
        .single();

      if (!current) {
        return res.status(404).json({ error: 'Phrase not found' });
      }

      // Build update object
      const updates = {};
      if (known_text && known_text !== current.known_text) {
        updates.known_text = known_text;
      }
      if (target_text && target_text !== current.target_text) {
        updates.target_text = target_text;
      }

      if (Object.keys(updates).length === 0) {
        return res.json({ success: true, message: 'No changes needed', phrase_id: id });
      }

      updates.updated_at = new Date().toISOString();

      // The human phrase-edit path: keep the before/after, it is one row.
      updates.last_edit_event_id = req.contentEdit ? await req.contentEdit.record({
        scope: { phrase_ids: [id], seed_numbers: [current.seed_number] },
        detail: {
          before: { known_text: current.known_text, target_text: current.target_text },
          after: {
            known_text: updates.known_text ?? current.known_text,
            target_text: updates.target_text ?? current.target_text
          }
        }
      }) : null;

      const { data, error } = await supabase
        .from('course_practice_phrases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log(`[QA-FIX] Updated phrase ${id} in ${current.course_code} S${current.seed_number}:`);
      if (updates.known_text) console.log(`  known: "${current.known_text}" → "${updates.known_text}"`);
      if (updates.target_text) console.log(`  target: "${current.target_text}" → "${updates.target_text}"`);

      res.json({
        success: true,
        phrase_id: id,
        changes: updates,
        phrase: data
      });
    } catch (err) {
      console.error('[QA] Error updating phrase:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /qa/flag/:id/resolve - Mark flag as resolved with fix applied
  // ---------------------------------------------------------------------------
  router.post('/qa/flag/:id/resolve', async (req, res) => {
    try {
      const { id } = req.params;
      const { resolution, fix_applied, reasoning } = req.body;

      // Get current details first
      const { data: flag } = await supabase
        .from('course_qa_flags')
        .select('details')
        .eq('id', id)
        .single();

      const mergedDetails = {
        ...(flag?.details || {}),
        fix_applied,
        reasoning
      };

      const { data: updated, error: updateError } = await supabase
        .from('course_qa_flags')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: resolution || 'fixed',
          details: mergedDetails
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      console.log(`[QA-FIX] Resolved flag ${id}: ${resolution || 'fixed'}`);
      res.json({ success: true, flag: updated });
    } catch (err) {
      console.error('[QA] Error resolving flag:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /qa/flag/:id/dismiss - Dismiss flag as false positive
  // ---------------------------------------------------------------------------
  router.post('/qa/flag/:id/dismiss', async (req, res) => {
    try {
      const { id } = req.params;
      const { reasoning } = req.body;

      // Get current details
      const { data: flag } = await supabase
        .from('course_qa_flags')
        .select('details')
        .eq('id', id)
        .single();

      const mergedDetails = {
        ...(flag?.details || {}),
        dismissal_reasoning: reasoning
      };

      const { data, error } = await supabase
        .from('course_qa_flags')
        .update({
          status: 'false_positive',
          resolved_at: new Date().toISOString(),
          details: mergedDetails
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log(`[QA-FIX] Dismissed flag ${id} as false positive`);
      res.json({ success: true, flag: data });
    } catch (err) {
      console.error('[QA] Error dismissing flag:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /qa/flags/:courseCode - Get all QA flags for a course
  // ---------------------------------------------------------------------------
  router.get('/qa/flags/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const status = req.query.status || 'open';

      let query = supabase
        .from('course_qa_flags')
        .select('*')
        .eq('course_code', courseCode)
        .order('flagged_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by check_type for summary
      const bySeverity = { error: 0, warning: 0, info: 0 };
      const byType = {};
      data.forEach(f => {
        bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
        byType[f.check_type] = (byType[f.check_type] || 0) + 1;
      });

      res.json({
        course_code: courseCode,
        total: data.length,
        by_severity: bySeverity,
        by_type: byType,
        flags: data
      });
    } catch (err) {
      console.error('[QA] Error getting flags:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /qa/summary/:courseCode - QA summary for dashboard
  // ---------------------------------------------------------------------------
  router.get('/qa/summary/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;

      // Get flag counts
      const { data: flags, error: flagError } = await supabase
        .from('course_qa_flags')
        .select('severity, status')
        .eq('course_code', courseCode);

      if (flagError) throw flagError;

      // Look up golden seed count for this course
      let goldenCount = 10;
      try {
        const { data: courseData } = await supabase
          .from('courses')
          .select('quality_rules')
          .eq('course_code', courseCode)
          .single();
        goldenCount = getGoldenSeedCount(courseData);
      } catch (e) { /* default to 10 */ }

      // Get phrase check progress (exclude golden seeds — they aren't QA-checked)
      const { count: totalPhrases } = await supabase
        .from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .gt('seed_number', goldenCount);

      const { count: checkedPhrases } = await supabase
        .from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .gt('seed_number', goldenCount)
        .not('qa_checked', 'is', null);

      const openFlags = flags.filter(f => f.status === 'open');
      const bySeverity = { error: 0, warning: 0, info: 0 };
      openFlags.forEach(f => {
        bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
      });

      res.json({
        course_code: courseCode,
        phrases: {
          total: totalPhrases || 0,
          checked: checkedPhrases || 0,
          unchecked: (totalPhrases || 0) - (checkedPhrases || 0),
          progress_percent: totalPhrases ? Math.round((checkedPhrases / totalPhrases) * 100) : 0
        },
        flags: {
          total: flags.length,
          open: openFlags.length,
          errors: bySeverity.error,
          warnings: bySeverity.warning,
          info: bySeverity.info
        }
      });
    } catch (err) {
      console.error('[QA] Error getting summary:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /qa/spawn-fixer/:courseCode - Spawn Opus phrase fixer agent
  // ---------------------------------------------------------------------------
  router.post('/qa/spawn-fixer/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const { spawnPhraseFixer } = require('../../shared/spawn-course-builder.cjs');

      console.log(`[QA] Spawning phrase fixer for ${courseCode}...`);

      // Spawn in background - don't wait for completion
      spawnPhraseFixer({ courseCode, terminal: 'iterm' }, 1)
        .then(() => console.log(`[QA] Fixer spawned for ${courseCode}`))
        .catch(err => console.error(`[QA] Fixer spawn failed: ${err.message}`));

      res.json({
        success: true,
        message: `Phrase fixer spawning for ${courseCode}`,
        course_code: courseCode
      });
    } catch (err) {
      console.error('[QA] Error spawning fixer:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /qa/spawn-polisher/:courseCode - Spawn Opus phrase polisher
  // ---------------------------------------------------------------------------
  router.post('/qa/spawn-polisher/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const roundLimit = parseInt(req.body.round_limit) || 50;
      const { spawnPhrasePolisher } = require('../../shared/spawn-course-builder.cjs');

      console.log(`[QA] Spawning phrase polisher for ${courseCode} (first ${roundLimit} rounds)...`);

      // Spawn in background - don't wait for completion
      spawnPhrasePolisher({ courseCode, roundLimit, terminal: 'iterm' }, 1)
        .then(() => console.log(`[QA] Polisher spawned for ${courseCode}`))
        .catch(err => console.error(`[QA] Polisher spawn failed: ${err.message}`));

      res.json({
        success: true,
        message: `Opus polisher spawning for ${courseCode} - first ${roundLimit} rounds`,
        course_code: courseCode,
        round_limit: roundLimit
      });
    } catch (err) {
      console.error('[QA] Error spawning polisher:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /qa/spawn-audit/:courseCode - Spawn Sonnet phrase auditor agent
  // ---------------------------------------------------------------------------
  router.post('/qa/spawn-audit/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const sampleSize = parseInt(req.body.sample_size) || 100;
      const { spawnPhraseAuditor } = require('../../shared/spawn-course-builder.cjs');

      console.log(`[QA] Spawning phrase auditor for ${courseCode} (sample: ${sampleSize})...`);

      // Spawn in background - don't wait for completion
      spawnPhraseAuditor({ courseCode, sampleSize, terminal: 'iterm' }, 1)
        .then(() => console.log(`[QA] Auditor spawned for ${courseCode}`))
        .catch(err => console.error(`[QA] Auditor spawn failed: ${err.message}`));

      res.json({
        success: true,
        message: `Phrase auditor spawning for ${courseCode}`,
        course_code: courseCode,
        sample_size: sampleSize
      });
    } catch (err) {
      console.error('[QA] Error spawning auditor:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // DELETE /qa/phrase/:phraseId - Delete a flagged phrase
  // ---------------------------------------------------------------------------
  router.delete('/qa/phrase/:phraseId', async (req, res) => {
    try {
      const { phraseId } = req.params;

      // Nothing survives to stamp, so the event is the only record of the delete.
      if (req.contentEdit) await req.contentEdit.record({ scope: { phrase_ids: [phraseId], rows: 1 } });

      // Remove flags first (FK constraint: flags reference phrases)
      await supabase
        .from('course_qa_flags')
        .delete()
        .eq('phrase_id', phraseId);

      // Then delete the phrase
      const { error: phraseError } = await supabase
        .from('course_practice_phrases')
        .delete()
        .eq('id', phraseId);

      if (phraseError) throw phraseError;

      console.log(`[QA] Deleted phrase ${phraseId}`);

      // Extract course code from phraseId (format: course_code:S0001L01U01)
      const phraseCourseCode = phraseId.split(':')[0];
      if (phraseCourseCode) await bumpCourseVersion(supabase, phraseCourseCode, 'minor');

      res.json({ success: true, deleted: phraseId });
    } catch (err) {
      console.error('[QA] Error deleting phrase:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // DELETE /qa/flagged-phrases/:courseCode - Delete all phrases with open QA flags
  // ---------------------------------------------------------------------------
  router.delete('/qa/flagged-phrases/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const severity = req.query.severity;
      const seedMin = parseInt(req.query.seed_min) || null;
      const seedMax = parseInt(req.query.seed_max) || null;
      const dryRun = req.query.dry_run === 'true';

      // Get all open flags for this course
      let flagQuery = supabase
        .from('course_qa_flags')
        .select('id, phrase_id, seed_number, check_type, severity, issue')
        .eq('course_code', courseCode)
        .eq('status', 'open')
        .not('phrase_id', 'is', null);

      if (severity) flagQuery = flagQuery.eq('severity', severity);
      if (seedMin) flagQuery = flagQuery.gte('seed_number', seedMin);
      if (seedMax) flagQuery = flagQuery.lte('seed_number', seedMax);

      const { data: flags, error: flagError } = await flagQuery;
      if (flagError) throw flagError;

      if (!flags || flags.length === 0) {
        return res.json({ success: true, deleted: 0, phrases: [], message: 'No flagged phrases found' });
      }

      // Deduplicate phrase IDs (multiple flags can reference same phrase)
      const phraseIds = [...new Set(flags.map(f => f.phrase_id))];

      if (dryRun) {
        return res.json({
          dry_run: true,
          would_delete: phraseIds.length,
          flags_count: flags.length,
          phrases: phraseIds,
          flags: flags
        });
      }

      // Recorded after the dry-run return: a dry run deletes nothing.
      if (req.contentEdit) {
        await req.contentEdit.record({
          scope: { phrase_ids: phraseIds, rows: phraseIds.length, flags: flags.length }
        });
      }

      // Delete flags first (FK constraint)
      const flagIds = flags.map(f => f.id);
      const { error: delFlagError } = await supabase
        .from('course_qa_flags')
        .delete()
        .in('id', flagIds);
      if (delFlagError) throw delFlagError;

      // Delete the phrases
      const { error: delPhraseError, count } = await supabase
        .from('course_practice_phrases')
        .delete()
        .in('id', phraseIds);
      if (delPhraseError) throw delPhraseError;

      console.log(`[QA] Bulk deleted ${phraseIds.length} flagged phrases (${flags.length} flags) for ${courseCode}`);

      await bumpCourseVersion(supabase, courseCode, 'minor');

      res.json({
        success: true,
        deleted: phraseIds.length,
        flags_removed: flags.length,
        phrases: phraseIds
      });
    } catch (err) {
      console.error('[QA] Error bulk-deleting flagged phrases:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // PATCH /qa/flag/:flagId - Update a flag (resolve, dismiss, etc.)
  // ---------------------------------------------------------------------------
  router.patch('/qa/flag/:flagId', async (req, res) => {
    try {
      const { flagId } = req.params;
      const { status, resolution_notes } = req.body;

      const updates = { status };
      if (status === 'resolved' || status === 'ignored' || status === 'false_positive') {
        updates.resolved_at = new Date().toISOString();
      }
      if (resolution_notes) {
        updates.resolution_notes = resolution_notes;
      }

      const { data, error } = await supabase
        .from('course_qa_flags')
        .update(updates)
        .eq('id', flagId)
        .select()
        .single();

      if (error) throw error;

      console.log(`[QA] Flag ${flagId} updated to ${status}`);

      res.json({ success: true, flag: data });
    } catch (err) {
      console.error('[QA] Error updating flag:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /qa/flagged-phrases/:courseCode - Get phrases with their flags for UI
  // ---------------------------------------------------------------------------
  router.get('/qa/flagged-phrases/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const severity = req.query.severity;
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const offset = parseInt(req.query.offset) || 0;

      // First get total count for pagination
      let countQuery = supabase
        .from('course_qa_flags')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .eq('status', 'open');

      if (severity) {
        countQuery = countQuery.eq('severity', severity);
      }

      const { count: total } = await countQuery;

      // Get flags with pagination
      let query = supabase
        .from('course_qa_flags')
        .select('*')
        .eq('course_code', courseCode)
        .eq('status', 'open')
        .order('flagged_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data: flags, error: flagError } = await query;
      if (flagError) {
        console.error('[QA] Flag query error:', flagError);
        throw flagError;
      }

      // Get unique phrase IDs from this page only
      const phraseIds = [...new Set(flags.filter(f => f.phrase_id).map(f => f.phrase_id))];
      const phraseMap = new Map();

      // Batch fetch phrases (max 100 at a time for Supabase)
      if (phraseIds.length > 0) {
        for (let i = 0; i < phraseIds.length; i += 100) {
          const batch = phraseIds.slice(i, i + 100);
          const { data: phrases } = await supabase
            .from('course_practice_phrases')
            .select('id, known_text, target_text, seed_number, phrase_role')
            .in('id', batch);
          if (phrases) {
            phrases.forEach(p => phraseMap.set(p.id, p));
          }
        }
      }

      // Merge flags with phrase data
      const result = flags.map(f => ({
        id: f.id,
        phrase_id: f.phrase_id,
        seed_number: f.seed_number || f.details?.seed_number,
        check_type: f.check_type,
        severity: f.severity,
        issue: f.issue,
        details: f.details,
        flagged_at: f.flagged_at,
        phrase: f.phrase_id ? (phraseMap.get(f.phrase_id) || {
          known_text: f.details?.known_text,
          target_text: f.details?.target_text,
          phrase_role: f.details?.phrase_role
        }) : null
      }));

      res.json({
        course_code: courseCode,
        total,
        limit,
        offset,
        has_more: offset + flags.length < total,
        flags: result
      });
    } catch (err) {
      console.error('[QA] Error getting flagged phrases:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /qa/reset/:courseCode - Reset QA checked state (clear qa_checked on all phrases)
  // ---------------------------------------------------------------------------
  router.post('/qa/reset/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const { clear_flags = false } = req.body || {};

      const eventId = req.contentEdit ? await req.contentEdit.record({
        scope: { course_code: courseCode, clear_flags }
      }) : null;

      // Clear qa_checked on all phrases
      const { error: resetError } = await supabase
        .from('course_practice_phrases')
        .update({ qa_checked: null, last_edit_event_id: eventId })
        .eq('course_code', courseCode)
        .not('qa_checked', 'is', null);

      if (resetError) throw resetError;

      let flagsDeleted = 0;
      if (clear_flags) {
        const { count, error: flagError } = await supabase
          .from('course_qa_flags')
          .delete()
          .eq('course_code', courseCode)
          .select('*', { count: 'exact', head: true });
        if (flagError) throw flagError;
        flagsDeleted = count || 0;
      }

      console.log(`[QA] Reset QA for ${courseCode} (clear_flags=${clear_flags}, flags_deleted=${flagsDeleted})`);

      res.json({
        success: true,
        course_code: courseCode,
        flags_deleted: flagsDeleted
      });
    } catch (err) {
      console.error('[QA] Error resetting QA:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /qa/approve/:courseCode - Human approves QA review, deletes flagged phrases, advances pipeline
  // ---------------------------------------------------------------------------
  router.post('/qa/approve/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const { dismiss_flag_ids = [] } = req.body || {};

      // 1. Dismiss any false-positive flags the human marked
      if (dismiss_flag_ids.length > 0) {
        await supabase
          .from('course_qa_flags')
          .update({ status: 'false_positive', resolved_at: new Date().toISOString() })
          .in('id', dismiss_flag_ids);
        console.log(`[QA-APPROVE] Dismissed ${dismiss_flag_ids.length} false-positive flags`);
      }

      // 2. Delete all remaining open-flagged phrases
      const { data: openFlags } = await supabase
        .from('course_qa_flags')
        .select('id, phrase_id')
        .eq('course_code', courseCode)
        .eq('status', 'open')
        .not('phrase_id', 'is', null);

      const phraseIds = [...new Set((openFlags || []).map(f => f.phrase_id).filter(Boolean))];
      const flagIds = (openFlags || []).map(f => f.id);

      // Deletes leave no row to stamp; the event carries the ids.
      if (req.contentEdit) {
        await req.contentEdit.record({
          scope: { course_code: courseCode, phrase_ids: phraseIds, rows: phraseIds.length }
        });
      }

      if (flagIds.length > 0) {
        await supabase.from('course_qa_flags').delete().in('id', flagIds);
      }
      if (phraseIds.length > 0) {
        await supabase.from('course_practice_phrases').delete().in('id', phraseIds);
      }

      console.log(`[QA-APPROVE] Deleted ${phraseIds.length} flagged phrases, ${flagIds.length} flags for ${courseCode}`);

      // 3. Advance pipeline → gender_prep
      let nextStage = null;
      try {
        nextStage = await advancePipeline(ctx, courseCode);
        console.log(`[QA-APPROVE] Pipeline advanced to: ${nextStage}`);
      } catch (pipeErr) {
        console.error(`[QA-APPROVE] Pipeline advance failed:`, pipeErr.message);
      }

      res.json({
        ok: true,
        course_code: courseCode,
        dismissed: dismiss_flag_ids.length,
        phrases_deleted: phraseIds.length,
        flags_deleted: flagIds.length,
        next_stage: nextStage
      });
    } catch (err) {
      console.error('[QA-APPROVE] Error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
};
