/**
 * Brief: BACKFILL PHRASES — Add missing USE phrases to under-threshold LEGOs.
 *
 * NOT a redo — the seed structure (translation, decomposition, LEGOs) is fine.
 * We're just topping up LEGOs that ended up with < 4 USE phrases after the
 * final pass deleted bad ones.
 *
 * Uses POST /api/build/backfill-submit/:courseCode to add phrases to existing LEGOs.
 *
 * Sibling deepening pass: LEGOs that meet the USE floor but are never reused
 * outside their own seed ("under-spread" orphans) are found by scan-course
 * Check 17 / tools/backfill-spread/analyze.cjs and fixed via the agent method
 * in docs/course-optimization/lego-spread-backfill-playbook.md — a separate
 * pass with its own targets, not part of this floor-gap brief.
 */

const { getSupabase, getLanguageName, getKnownLanguageName, buildGrammarChecklist, loadCondensedMethodology } = require('./shared.cjs');

async function generateBackfillPhrasesBrief(courseCode, query = {}) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);       // TARGET side (what the learner is learning)
  const knownName = getKnownLanguageName(courseCode);  // KNOWN side (learner's native prompt)

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
  const minUse = query.min_use ? parseInt(query.min_use, 10) : 4;

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

  // Build list of LEGOs needing phrases (skip seeds 1-3 — too little prior vocab)
  const gaps = [];
  for (const l of legos || []) {
    if (l.seed_number <= 3) continue;
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

**DIRECTION — read carefully, this is critical:**
- \`target_text\` = **${langName}** (the language the learner is learning). It MUST contain the exact LEGO target text verbatim.
- \`known_text\` = **${knownName}** (the learner's own language — the prompt they see). This is a natural ${knownName} translation of the ${langName} target_text.
- The two sides are in DIFFERENT languages. They must NEVER be identical. If ${knownName} ≠ ${langName}, writing the same string on both sides is a hard error.

For each under-threshold LEGO, write the needed USE phrases. Each phrase MUST:
- \`target_text\`: contain the exact LEGO target text, read naturally and be grammatically correct in ${langName}. A full sentence is preferred but not required (Kai, 2026-08-17) — a shorter phrase passes if it is clear, unambiguous for the rest of the course, longish, and something you could say on its own in a conversation
- \`known_text\`: the ${knownName} translation of that target_text, grammatically correct in ${knownName}
- Use only vocabulary introduced up to this seed
- No capitalisation, no trailing periods

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
          { "known_text": "${knownName.toLowerCase()} phrase (in ${knownName})", "target_text": "${langName.toLowerCase()} phrase (in ${langName}, contains the LEGO target)", "target_score": 7 }
        ]
      }
    ]
  }'
\`\`\`

### Step 5: Continue to the next seed

## USE Phrase Rules

- **Natural things a real learner would say** — complete enough to stand alone
- Must contain the exact LEGO target text (never conjugate/inflect)
- Score 5-9 (how useful/natural the phrase is)
- **No capitalisation, no trailing periods**
- Don't duplicate existing phrases — check Step 1 output first

## USE Phrase VARIETY — Critical (ralph-methodology Principle 7)

A USE basket exists to make the NEW LEGO's contribution salient, and every USE phrase enters the eternal spaced-repetition pool — a basket of near-identical phrases teaches nothing and pollutes review forever.

**Genuine structural recombination must carry the basket.** The main source of variety should be:
- turn it into a question
- negate it
- swap the object/complement for a different already-taught one
- change to a different already-taught subject (especially where that changes the verb)
- add a taught temporal/conditional clause

Adverb / time-word / discourse-marker variations (now / here / today / often / well / actually) are **fine in moderation** — a couple in a basket is natural and welcome. What is NOT ok is a basket where those are the *only* axis of variation: one frozen base sentence with swapped adverbs, or an adverb/marker salad front-loaded onto the same phrase.

❌ BAD (adverbs are the only variation — same base every time):
- i'm trying to learn something
- i'm trying to learn something now
- i'm trying to learn something with you
- i'm trying to learn something often
- i'm trying to learn something as often as possible

✓ GOOD (recombination carries it; an adverb variant or two is fine):
- i'm trying to learn something
- what are you trying to learn?
- i'm not trying to learn that yet
- she's trying to learn how to say it today
- are you still trying to learn it?

**Long-chunk escape hatch (READ THIS — it's the #1 failure).** When the LEGO target is a long phrase that every USE phrase must contain verbatim, the lazy move is to keep the whole phrase frozen and only swap a trailing adverb. DON'T. Your structural variety comes from *wrapping and transforming* the chunk, not appending to it:
- make it a question: "do you...?", "are you...?", "why do you...?"
- negate it: "i don't...", "i'm not going to...", "i wouldn't..."
- embed it in a different clause: "when i..., i...", "i think that...", "she said she..."
- change to a different already-taught subject where the verb allows it

Aim for **at least 2 of every 5** phrases to be a question, negation, or clause-embedding — not the base with a different ending.

Every phrase must still contain the exact LEGO target text and use only vocabulary introduced up to this seed.

${translationDoctrine ? `## Translation Doctrine for ${langName}\n\n${translationDoctrine}\n` : ''}
${buildGrammarChecklist(langName, grammarRules)}

## Chat Updates — IMPORTANT

A remote user is watching build progress via the dashboard chat. Post meaningful updates so they know the process is alive and healthy.

\`\`\`bash
curl -s -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"YOUR MESSAGE"}'
\`\`\`

**When to post:**
1. **When you start**: "Phrase backfill started — ${totalNeeded} USE phrases needed across ${filteredGaps.length} LEGOs in ${seedCount} seeds"
2. **Every ~5 seeds** (or every ~5 minutes, whichever is less frequent): "Phrase backfill progress — [N]/${seedCount} seeds done, [N]/${totalNeeded} phrases added so far"
3. **When you finish**: "Phrase backfill complete — added [N] USE phrases across [N] LEGOs in [N] seeds"

Keep messages concise but informative. The user can't see your terminal — chat is their only window into what you're doing.

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
