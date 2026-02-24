/**
 * Brief: FINAL PASS — Opus agent reviews all submitted phrases for grammar errors.
 * Runs AFTER the creator/checker team has built the course.
 * Fix-or-delete approach: rearrange existing words to fix, or delete if unfixable.
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

  // Seed range from query params
  const seedMin = parseInt(query.seed_min) || 1;
  const seedMax = parseInt(query.seed_max) || 300;

  // Get total phrase count for context
  const { count: phraseCount } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .gte('seed_number', seedMin)
    .lte('seed_number', seedMax);

  // Get LEGO count for context
  const { count: legoCount } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .gte('seed_number', seedMin)
    .lte('seed_number', seedMax);

  return `# Final Pass — ${courseCode} (${langName}) — Seeds ${seedMin}-${seedMax}

You are the FINAL QUALITY AUDITOR for **${courseCode}** (${langName}).
The course has been built by a creator/checker team. Your job is to do a thorough final pass, catching any grammar errors that slipped through.

**Scope**: Seeds ${seedMin}-${seedMax} (~${phraseCount || '?'} phrases across ~${legoCount || '?'} LEGOs)

## Your Approach: Fix or Delete

For each error you find:

1. **Can you fix it by rearranging existing words?** → Fix it (update the phrase in the database)
2. **Does the fix require a word NOT in vocabulary at that seed number?** → DELETE the phrase
3. **Is the phrase just awkward but not wrong?** → Leave it. Don't rewrite for style.

**Deletion is fine.** The course has hundreds of LEGOs and 5+ USE phrases per LEGO. Deleting a bad phrase is better than leaving a grammar error that teaches thousands of learners the wrong pattern.

${buildGrammarChecklist(langName, grammarRules)}

${translationDoctrine ? `## Translation Doctrine for ${langName}\n\n${translationDoctrine}\n` : ''}

## Protocol — For Each Seed

### Step 1: Fetch all phrases for seed N
\`\`\`bash
curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min=$N&seed_max=$N&limit=500"
\`\`\`

### Step 2: Fetch vocabulary at seed N
\`\`\`bash
curl -s "http://localhost:3471/api/vocab/${courseCode}?seed=$N"
\`\`\`

### Step 3: Review every phrase
Go through each BUILD and USE phrase. Check against grammar checklist.

### Step 4: For each error found

**If fixable within vocab** — update directly:
\`\`\`bash
curl -s -X PATCH "http://localhost:3471/api/phrases/PHRASE_ID" \\
  -H "Content-Type: application/json" \\
  -d '{"target_text": "corrected text"}'
\`\`\`

**If fix requires out-of-vocab words** — delete:
\`\`\`bash
curl -s -X DELETE "http://localhost:3471/api/qa/phrase/PHRASE_ID"
\`\`\`

**IMPORTANT**: After fixing, verify the LEGO still has >= 4 USE phrases. If it drops below 4, note it but don't try to generate new phrases (that would require the full seed/complete pipeline).

### Step 5: Log your actions
After each seed, print a summary:
\`\`\`
SEED N: X phrases reviewed, Y fixed, Z deleted
  Fixed: [list phrase IDs + what changed]
  Deleted: [list phrase IDs + why]
\`\`\`

### Step 6: Move to next seed

## Batch Processing Tip

You can process seeds in batches of 10 for efficiency:
\`\`\`bash
curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min=$FROM&seed_max=$TO&limit=5000"
\`\`\`

But still check vocabulary per-seed (vocab grows with each seed).

## What NOT to Do

- **Don't rewrite for style** — only fix actual grammar errors
- **Don't add phrases** — you can only fix or delete
- **Don't rebuild seeds** — that's the creator/checker team's job
- **Don't guess vocabulary** — always check the vocab endpoint
- **Don't fix BUILD phrases unless grammar is wrong** — fragments are expected

## Summary Report

When you finish all seeds, produce a summary:
\`\`\`
FINAL PASS COMPLETE — ${courseCode} seeds ${seedMin}-${seedMax}
Total phrases reviewed: X
Total fixes: Y
Total deletions: Z
LEGOs below 4 USE phrases: [list seed:lego pairs]
Most common error type: [e.g., "modal + te (15 instances)"]
\`\`\`

## AUTONOMY

You are running unattended. NEVER ask questions.
Process seeds ${seedMin} through ${seedMax} in order.
Work SLOWLY AND STEADILY — check every phrase, don't skim.
When done, your summary report is the deliverable.
`;
}

module.exports = generateFinalPassBrief;
