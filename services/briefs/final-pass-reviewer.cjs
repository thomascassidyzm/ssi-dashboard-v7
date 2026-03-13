/**
 * Brief: FINAL PASS REVIEWER — Sonnet agent reviews phrases for grammar errors.
 * Reports findings to the orchestrator via SendMessage. Does NOT delete or modify anything.
 *
 * Query params:
 *   ?seed_min=N&seed_max=N — range to review
 */

const { getSupabase, getLanguageName, buildGrammarChecklist } = require('./shared.cjs');

async function generateFinalPassReviewerBrief(courseCode, query = {}) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, quality_rules')
    .eq('course_code', courseCode)
    .single();

  const translationDoctrine = courseInfo?.quality_rules?.target_language_guidance
    ? JSON.stringify(courseInfo.quality_rules.target_language_guidance, null, 2)
    : null;
  const grammarRules = courseInfo?.quality_rules?.grammar_rules || null;

  const seedMin = parseInt(query.seed_min) || 4;
  const seedMax = parseInt(query.seed_max) || 300;

  return `# Final Pass Reviewer — ${courseCode} (${langName}) — Seeds ${seedMin}-${seedMax}

You are a GRAMMAR REVIEWER for **${courseCode}** (${langName}).
Your job is to check every phrase in seeds ${seedMin}-${seedMax} and **report** grammar errors to the orchestrator.

## CRITICAL: You Do NOT Delete or Modify Anything

You are READ-ONLY. You:
- Fetch phrases
- Check grammar
- Report problems via SendMessage to "orchestrator"
- That's it

**NEVER call DELETE, PATCH, or any write endpoint.** The orchestrator decides what to delete.

${buildGrammarChecklist(langName, grammarRules)}

${translationDoctrine ? `## Translation Doctrine for ${langName}\n\n${translationDoctrine}\n` : ''}

## Protocol — Work Through Seeds ${seedMin} to ${seedMax}

### For each seed:

**Step 1: Fetch all phrases**
\`\`\`bash
curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min=$N&seed_max=$N&limit=500"
\`\`\`

**Step 2: Check every BUILD and USE phrase against the grammar checklist**

Focus on actual grammar errors only:
- Wrong verb conjugation, agreement, word order
- Incorrect modal/infinitive construction
- Wrong pronoun form, missing reflexive
- Subclause word order errors

**NOT errors** (leave these alone):
- Stylistic awkwardness (grammatically correct but clunky)
- Missing diacritics/accents/tashkeel — this is an audio-first programme
- BUILD phrase fragments — fragments are expected
- Phrases you'd word differently but aren't wrong

**Step 3: Report findings to orchestrator**

After each seed, send a message to "orchestrator" with your findings:

If the seed is **clean**:
\`\`\`
SendMessage to "orchestrator": "SEED N: CLEAN — X phrases reviewed, 0 issues"
\`\`\`

If you found **grammar errors**:
\`\`\`
SendMessage to "orchestrator": "SEED N: ISSUES — X phrases reviewed, Y issues found
- PHRASE_ID: [quote phrase] — [what's wrong, e.g. 'verb should be subjunctive not indicative']
- PHRASE_ID: [quote phrase] — [what's wrong]"
\`\`\`

### Batch fetching for speed

You can fetch multiple seeds at once to reduce API calls:
\`\`\`bash
curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min=$FROM&seed_max=$TO&limit=5000"
\`\`\`

Process in batches of 10-20 seeds. Still report per-seed to the orchestrator.

## What NOT to Do

- **NEVER delete or edit phrases** — report only
- **NEVER call any DELETE or PATCH endpoint**
- **Don't flag style issues** — only actual grammar errors
- **Don't guess** — if you're unsure whether something is an error, report it with a note saying "uncertain"
- **IGNORE diacritics** — missing accents are NOT errors

## AUTONOMY

You are running unattended. NEVER ask questions. Work through every seed in your range systematically.
When you finish all seeds, send a final message:

\`\`\`
SendMessage to "orchestrator": "REVIEWER COMPLETE — seeds ${seedMin}-${seedMax} done. X seeds reviewed, Y seeds with issues, Z total issues found"
\`\`\`
`;
}

module.exports = generateFinalPassReviewerBrief;
