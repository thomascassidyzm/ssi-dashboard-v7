/**
 * Brief: FINAL PASS — Opus agent reviews submitted phrases for grammar errors.
 * Runs AFTER the creator/checker team has built the course.
 * Fix-or-delete approach: rearrange existing words to fix, or delete if unfixable.
 *
 * Default strategy: ADAPTIVE SAMPLING
 *   Tier 1: Seeds 1-50 — every seed checked
 *   Tier 2: Seeds 51-300 — every 10th seed sampled
 *   If errors found in Tier 2 → escalate to every 5th, then every seed in dirty ranges
 *
 * Query params:
 *   ?strategy=full — check every seed (old behaviour)
 *   ?strategy=adaptive — adaptive sampling (default)
 *   ?seed_min=N&seed_max=N — override range
 */

const { getSupabase, getLanguageName, getGoldenSeedCount, buildGrammarChecklist } = require('./shared.cjs');

async function generateFinalPassBrief(courseCode, query = {}) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules, translation_analysis')
    .eq('course_code', courseCode)
    .single();

  const translationDoctrine = courseInfo?.quality_rules?.target_language_guidance
    ? JSON.stringify(courseInfo.quality_rules.target_language_guidance, null, 2)
    : null;
  const grammarRules = courseInfo?.quality_rules?.grammar_rules || null;

  const seedMin = parseInt(query.seed_min) || 4; // Skip seeds 1-3 (golden, hand-verified, limited vocab confuses agent)
  const seedMax = parseInt(query.seed_max) || 300;
  const strategy = query.strategy || 'full';

  const { count: phraseCount } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .gte('seed_number', seedMin)
    .lte('seed_number', seedMax);

  const { count: legoCount } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .gte('seed_number', seedMin)
    .lte('seed_number', seedMax);

  const strategySection = strategy === 'full' ? buildFullStrategySection(seedMin, seedMax) : buildAdaptiveStrategySection(seedMin, seedMax);

  return `# Final Pass — ${courseCode} (${langName}) — Seeds ${seedMin}-${seedMax}

You are the FINAL QUALITY AUDITOR for **${courseCode}** (${langName}).
The course has been built by a creator/checker team. Your job is to do a thorough final pass, catching any grammar errors that slipped through.

**Scope**: Seeds ${seedMin}-${seedMax} (~${phraseCount || '?'} phrases across ~${legoCount || '?'} LEGOs)
**Strategy**: ${strategy === 'full' ? 'FULL — check every seed' : 'ADAPTIVE SAMPLING — drill deeper where errors are found'}

## Chat Updates — IMPORTANT

A remote user is watching build progress via the dashboard chat. Post meaningful updates so they know the process is alive and healthy.

\`\`\`bash
curl -s -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"YOUR MESSAGE"}'
\`\`\`

**When to post:**
1. **When you start**: "Final pass started — reviewing seeds ${seedMin}-${seedMax} (~${phraseCount || '?'} phrases, ${strategy} strategy)"
2. **Every ~20 seeds reviewed** (roughly every 5 minutes): "Final pass progress — reviewed seeds [N]-[N], [N] approved, [N] flagged, [N] phrases deleted so far. ${strategy !== 'full' ? 'Current tier: [tier].' : ''}"
3. **When you finish**: "Final pass complete — [N] seeds reviewed, [N] approved, [N] flagged, [N] phrases deleted. Most common error: [pattern]"

Keep messages concise but informative. The user can't see your terminal — chat is their only window into what you're doing.

## Your Approach: Identify and Delete — NEVER Fix

For each phrase you review:

1. **Grammar is correct?** → Leave it. Move on.
2. **Grammar is wrong?** → DELETE the phrase. Do NOT attempt to fix or rewrite it.
3. **Phrase is awkward but not grammatically wrong?** → Leave it. Don't delete for style.

**NEVER edit or fix phrases.** You are an auditor, not an editor. Fixing phrases risks introducing new errors and would need to go through the full API validation pipeline. Just delete bad ones.

**Deletion is safe.** The course has hundreds of LEGOs and 5+ USE phrases per LEGO. Deleting a bad phrase is better than leaving a grammar error that teaches thousands of learners the wrong pattern.

${buildGrammarChecklist(langName, grammarRules)}

${translationDoctrine ? `## Translation Doctrine for ${langName}\n\n${translationDoctrine}\n` : ''}

${strategySection}

## Protocol — For Each Seed You Review

### Step 1: Fetch all phrases for the seed
\`\`\`bash
curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min=$N&seed_max=$N&limit=500"
\`\`\`

### Step 2: Fetch vocabulary at that seed
\`\`\`bash
curl -s "http://localhost:3471/api/vocab/${courseCode}?seed=$N"
\`\`\`

### Step 3: Review every phrase in the seed
Go through each BUILD and USE phrase. Check against grammar checklist.

### Step 4: For each grammar error found — DELETE

\`\`\`bash
curl -s -X DELETE "http://localhost:3471/api/qa/phrase/PHRASE_ID"
\`\`\`

**NEVER use PATCH to edit phrases.** Only delete.

After deleting, check the LEGO still has >= 4 USE phrases. If it drops below 4, note it in your log but don't try to fix it.

### Step 5: Approve or flag the seed

**If the seed is clean (or you only deleted 1-2 phrases)** — approve it:
\`\`\`bash
curl -s -X PATCH "http://localhost:3471/api/seed/${courseCode}/$N" \\
  -H "Content-Type: application/json" \\
  -d '{"approved_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
\`\`\`

**If you had to delete 3+ phrases or a LEGO dropped below 4 USE phrases** — flag it for rebuild:
\`\`\`bash
curl -s -X PATCH "http://localhost:3471/api/seed/${courseCode}/$N" \\
  -H "Content-Type: application/json" \\
  -d '{"flagged_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
\`\`\`
Flagged seeds show RED in the dashboard seed grid and are excluded from mass approve.

### Step 6: Log your actions
After each seed, print a summary:
\`\`\`
SEED N: APPROVED — X phrases reviewed, Y deleted
  Deleted: [list phrase IDs + why]
\`\`\`
or:
\`\`\`
SEED N: FLAGGED — X phrases reviewed, Y deleted — [reason for flag]
\`\`\`

## Batch Processing Tip

You can fetch phrases for multiple seeds at once:
\`\`\`bash
curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min=$FROM&seed_max=$TO&limit=5000"
\`\`\`

But still check vocabulary per-seed (vocab grows with each seed).

## What NOT to Do

- **NEVER edit or fix phrases** — only delete grammatically wrong ones
- **Don't rewrite for style** — only delete actual grammar errors
- **IGNORE diacritics/accents/tashkeel** — missing or inconsistent diacritical marks are NOT errors. This is an audio-first programme — learners hear the correct pronunciation, they don't learn it from reading
- **Don't add phrases** — you can only delete
- **Don't rebuild seeds** — that's the creator/checker team's job
- **Don't guess vocabulary** — always check the vocab endpoint
- **Don't delete BUILD phrases unless grammar is wrong** — fragments are expected

## Summary Report

When you finish, produce a summary:
\`\`\`
FINAL PASS COMPLETE — ${courseCode} seeds ${seedMin}-${seedMax}
Strategy: ${strategy === 'full' ? 'FULL' : 'ADAPTIVE'}
Seeds reviewed: X / Y total
Seeds approved: X
Seeds flagged for rebuild: Z [list seed numbers]
Total phrases reviewed: X
Total deletions: Z
LEGOs below 4 USE phrases: [list seed:lego pairs]
Most common error type: [e.g., "missing subjunctive (15 instances)"]
${strategy !== 'full' ? 'Escalation history: [which tiers triggered, which ranges expanded]' : ''}
\`\`\`

## Lessons Learned — Store Error Patterns

After completing your audit, store the most common error patterns so future builds and QA passes can catch them earlier. Call this once at the end:

\`\`\`bash
curl -s -X PATCH "http://localhost:3471/api/course/${courseCode}/quality-rules" \\
  -H "Content-Type: application/json" \\
  -d '{"lessons_learned": ["pattern 1", "pattern 2", ...]}'
\`\`\`

Example patterns:
- "كيف takes indicative mood, not subjunctive"
- "Plural subjects (أنهم) require plural verb forms (يعرفون not يعرف)"
- "Preposition بـ cannot be used as sentence subject"

Keep them short, specific, and actionable. These get fed into future builder briefs.

## AUTONOMY

You are running unattended. NEVER ask questions.
Work SLOWLY AND STEADILY — check every phrase in every seed you review, don't skim.
When done, your summary report is the deliverable.
`;
}

function buildAdaptiveStrategySection(seedMin, seedMax) {
  const tier1End = Math.min(50, seedMax);
  return `## Sampling Strategy: ADAPTIVE

You do NOT need to check every seed. Use adaptive sampling to focus effort where it matters.

### Tier 1: Seeds ${seedMin}-${tier1End} — CHECK EVERY SEED

These early seeds set the vocabulary foundation. Errors here propagate into later phrases.
Review every seed thoroughly.

After Tier 1, note your **error rate** (errors found / phrases reviewed).

### Tier 2: Seeds ${tier1End + 1}-${seedMax} — SAMPLE EVERY 10th SEED

Check seeds: ${Array.from({length: Math.floor((seedMax - tier1End) / 10)}, (_, i) => tier1End + 1 + i * 10).slice(0, 15).join(', ')}${seedMax > tier1End + 150 ? '...' : ''}

For each sampled seed, review ALL phrases in that seed thoroughly.

**After Tier 2, evaluate:**
- **All sampled seeds clean?** → PASS. The course is clean. Approve all unreviewed seeds and produce your summary.
- **1-2 errors found across all samples?** → PASS with fixes. Minor issues, likely isolated. Approve remaining seeds.
- **3+ errors found, OR errors in 2+ consecutive sampled seeds?** → ESCALATE to Tier 3.

### Tier 3: ESCALATE — SAMPLE EVERY 5th SEED in dirty ranges

Identify which sampled seeds had errors. For each dirty seed N, check the range N-10 to N+10 at every 5th seed.

**After Tier 3, evaluate:**
- **Errors are isolated (1-2 dirty seeds in the range)?** → Fix them, approve the rest. PASS.
- **Errors are widespread (3+ dirty seeds in a 20-seed range)?** → ESCALATE to Tier 4.

### Tier 4: FULL AUDIT of dirty ranges

Check EVERY seed in the ranges that failed Tier 3. Fix or flag each one.

**If 20%+ of seeds in a range are flagged for rebuild**, note this prominently in your summary — the build quality for that range was poor and may need a re-run.

### Key Principle

The goal is CONFIDENCE, not coverage. If sampling shows the course is clean, trust the sampling. If sampling shows problems, drill deeper until you've found and fixed them all.`;
}

function buildFullStrategySection(seedMin, seedMax) {
  return `## Strategy: FULL AUDIT

Check every seed from ${seedMin} to ${seedMax} in order.
Review every phrase in every seed. No sampling, no shortcuts.`;
}

module.exports = generateFinalPassBrief;
