/**
 * Brief: BACKFILL PHRASES — Add missing USE phrases to under-threshold LEGOs.
 *
 * NOT a redo — the seed structure (translation, decomposition, LEGOs) is fine.
 * We're just topping up LEGOs that ended up with < 4 USE phrases after the
 * final pass deleted bad ones.
 *
 * Uses POST /api/build/backfill-submit/:courseCode to add phrases to existing LEGOs.
 */

const { getSupabase, getLanguageName, buildGrammarChecklist, loadCondensedMethodology } = require('./shared.cjs');

async function generateBackfillPhrasesBrief(courseCode, query = {}) {
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

  // Find under-threshold LEGOs
  const minUse = 4;

  // Get all new LEGOs
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type')
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .order('seed_number', { ascending: true });

  // Count USE phrases per LEGO
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, phrase_role')
    .eq('course_code', courseCode);

  const useCounts = {};
  for (const p of phrases || []) {
    if (p.phrase_role === 'use') {
      const key = `${p.seed_number}:${p.lego_index}`;
      useCounts[key] = (useCounts[key] || 0) + 1;
    }
  }

  // Build list of LEGOs needing phrases
  const gaps = [];
  for (const l of legos || []) {
    const key = `${l.seed_number}:${l.lego_index}`;
    const have = useCounts[key] || 0;
    if (have < minUse) {
      gaps.push({
        seed: l.seed_number,
        lego: l.lego_index,
        known: l.known_text,
        target: l.target_text,
        type: l.type,
        have,
        need: minUse - have
      });
    }
  }

  // Optional seed filter
  let filteredGaps = gaps;
  if (query.seeds) {
    const seedFilter = new Set(query.seeds.split(',').map(Number));
    filteredGaps = gaps.filter(g => seedFilter.has(g.seed));
  }

  const totalNeeded = filteredGaps.reduce((sum, g) => sum + g.need, 0);
  const seedCount = new Set(filteredGaps.map(g => g.seed)).size;

  // Group gaps by seed for the brief
  const gapsBySeed = {};
  for (const g of filteredGaps) {
    if (!gapsBySeed[g.seed]) gapsBySeed[g.seed] = [];
    gapsBySeed[g.seed].push(g);
  }

  return `# Backfill Phrases — ${courseCode} (${langName})

You are adding **${totalNeeded} USE phrases** across **${filteredGaps.length} LEGOs** in **${seedCount} seeds**.

The seed structure is correct — translations, decompositions, and LEGOs are all fine.
The final pass deleted some bad phrases, leaving these LEGOs below the ${minUse}-phrase minimum.
Your job: write natural, grammatically correct USE phrases to bring each LEGO up to ${minUse}.

## LEGOs Needing Phrases

${Object.entries(gapsBySeed).map(([seed, seedGaps]) => {
  return `### Seed ${seed}\n${seedGaps.map(g =>
    `- **L${g.lego} (${g.type})**: "${g.known}" → "${g.target}" — has ${g.have} USE, needs **${g.need} more**`
  ).join('\n')}`;
}).join('\n\n')}

## Your Workflow

Process seeds in order. For each seed:

### Step 1: Fetch existing phrases to see what's already there
\`\`\`bash
curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min=$N&seed_max=$N&limit=500"
\`\`\`

### Step 2: Fetch vocabulary (so you know what words are available)
\`\`\`bash
curl -s "http://localhost:3471/api/vocab/${courseCode}?seed=$N"
\`\`\`

### Step 3: Write USE phrases
For each under-threshold LEGO, write the needed USE phrases. Each phrase MUST:
- Contain the exact LEGO target text
- Use only vocabulary introduced up to this seed
- Be a natural, complete sentence a learner would say
- Be grammatically correct in ${langName}
- Have no capitalisation, no trailing periods

### Step 4: Submit via the backfill endpoint
\`\`\`bash
curl -X POST "http://localhost:3471/api/build/backfill-submit/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phrases": [
      {
        "seed_number": N,
        "lego_index": L,
        "use": [
          { "known_text": "english phrase", "target_text": "${langName.toLowerCase()} phrase", "target_score": 7 }
        ]
      }
    ]
  }'
\`\`\`

### Step 5: Post progress to chat
\`\`\`bash
curl -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{ "role": "agent", "message": "Backfill: seed N done — added X USE phrases" }'
\`\`\`

## USE Phrase Rules

- **Natural things a real learner would say** — complete enough to stand alone
- Must contain the exact LEGO target text (never conjugate/inflect)
- Score 5-9 (how useful/natural the phrase is)
- **No capitalisation, no trailing periods**
- Don't duplicate existing phrases — check Step 1 output first

${translationDoctrine ? `## Translation Doctrine for ${langName}\n\n${translationDoctrine}\n` : ''}
${buildGrammarChecklist(langName, grammarRules)}

## IMPORTANT

1. **DO NOT rebuild seeds.** The decomposition is correct. You are ONLY adding USE phrases.
2. **DO NOT submit BUILD phrases.** Only USE phrases are needed.
3. **Check existing phrases first.** Don't duplicate what's already there.
4. **Quality over speed.** Each phrase will be heard by thousands of learners.
5. You are running unattended. NEVER ask questions.
6. Do NOT spawn sub-agents.
`;
}

module.exports = generateBackfillPhrasesBrief;
