/**
 * Brief: TRANSLATE — Opus orchestrator spawns one Sonnet translator agent.
 */

const { getSupabase, getLanguageName, getKnownLanguageName } = require('./shared.cjs');

// ─── Sonnet Translator Brief ──────────────────────────────────────────────────

function generateSonnetTranslatorBrief(courseCode, translateField, translateLangName, translateCount) {
  return `# Seed Translator — ${courseCode}

You are translating ${translateCount} canonical seed sentences into **${translateLangName}**.
Fetch the full list at the start, then translate and submit them ONE AT A TIME.

## Translation Doctrine

### Core Principle
Each English intention maps to the FEWEST possible ${translateLangName} forms that remain natural.

**Clarity > nuance. Predictability > elegance. Confidence > completeness.**

### Phase 1 — Stabilisation (Seeds 1–150)
- ONE hardest-working form per function. No synonym drift.
- Spoken, transparent constructions. Grammar only when structurally unavoidable.
- No register switching, no stylistic upgrades, no native-speaker optimisation.

### Phase 2 — Controlled Flexibility (Seeds 151–300)
- Phase 1 mappings remain valid and are never contradicted.
- Limited variation ONLY if it does not create choice anxiety.
- Variation is additive, never substitutive.

### Phase 3 — Natural Range (Seeds 301–${translateCount})
- Natural variation and idioms may appear.
- Earlier mappings are never invalidated. The learner's mental model expands, not fragments.

### Always
- Hardest-working vocabulary: broad, reusable, forgiving.
- Predictable syntax. Avoid early register/politeness decisions.
- Must work spoken, even when imperfectly produced.
- Same concept = same word throughout. Build and maintain a glossary as you go.

## Workflow — STRICT ONE-AT-A-TIME

**Step 1: Fetch all untranslated seeds (once, at the start)**
\`\`\`
curl -s "http://localhost:3471/api/course/${courseCode}/translate?limit=${translateCount}"
\`\`\`

**Step 2: For EACH seed in the returned list:**
1. Translate it into ${translateLangName}, following the doctrine and your glossary
2. Submit it immediately — do NOT batch:
\`\`\`
curl -s -X POST "http://localhost:3471/api/course/${courseCode}/translate" \\
  -H "Content-Type: application/json" \\
  -d '{"translations": [{"seed_number": N, "${translateField}": "YOUR TRANSLATION"}]}'
\`\`\`
3. Update your glossary if new vocabulary was introduced
4. Move to the next seed

## Field to populate
You are providing \`${translateField}\` (${translateLangName}).
The English text is already in the database — do NOT overwrite it.

## After all seeds are translated
Submit a translation analysis:
\`\`\`
curl -s -X POST "http://localhost:3471/api/course/${courseCode}/analysis" \\
  -H "Content-Type: application/json" \\
  -d '{"analysis": {
    "generated_at": "<ISO timestamp>",
    "seeds_analyzed": ${translateCount},
    "register": {"choice": "...", "markers": ["..."]},
    "problem_verbs": ["..."],
    "golden_keys": ["..."],
    "zut_concerns": ["..."]
  }}'
\`\`\`

## Rules
- NEVER ask questions. Translate everything and submit.
- Do NOT spawn sub-agents.
- Keep output concise — no need to echo every seed. Just translate, submit, move on.
`;
}

// ─── Opus Orchestrator Brief ──────────────────────────────────────────────────

async function generateTranslateBrief(courseCode) {
  const supabase = getSupabase();
  const targetLanguageName = getLanguageName(courseCode);
  const knownName = getKnownLanguageName(courseCode);

  const parts = courseCode.split('_for_');
  const targetLang = parts[0] || '';
  const knownLang = parts[1] || '';
  const targetIsEng = targetLang === 'eng';

  const translateField = targetIsEng ? 'known_text' : 'target_text';
  const translateLangName = targetIsEng ? knownName : targetLanguageName;

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name')
    .eq('course_code', courseCode)
    .single();

  const displayName = courseInfo?.display_name || courseCode;
  const translateCount = 668;

  const sonnetBrief = generateSonnetTranslatorBrief(courseCode, translateField, translateLangName, translateCount);

  return `# Seed Translation Orchestrator — ${courseCode}

You are orchestrating the translation of **${translateCount}** seed sentences into **${translateLangName}** for **${displayName}**.

## Your Role
- Spawn ONE Sonnet agent to do the translations
- Monitor its progress every ~50 seeds
- Watch for stalls and catch obvious errors
- Intervene or respawn if needed

## Step 1 — Spawn the Sonnet translator

Use the **Agent tool** with:
- \`subagent_type\`: \`"general"\`
- \`prompt\`: the full Sonnet brief at the bottom of this document (copy it exactly)

Then post to chat:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"Translation started — Sonnet translator active, translating ${translateCount} seeds"}'
\`\`\`

## Step 2 — Monitor progress

Check remaining seeds periodically:
\`\`\`
curl -s "http://localhost:3471/api/course/${courseCode}/translate?limit=1" | python3 -c "import json,sys; d=json.load(sys.stdin); print('remaining:', d.get('needs_translation','?'), '/ total:', d.get('total_seeds','?'))"
\`\`\`

- Check every ~50 seeds or a few minutes
- If \`needs_translation\` stops decreasing for 5+ minutes → agent has stalled → respawn it with the same Sonnet brief
- Post a progress update to chat every ~100 seeds:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"Translation progress: [N] seeds done, [N] remaining"}'
\`\`\`

## Step 3 — Spot-check quality

Sample a few translations every ~100 seeds:
\`\`\`
curl -s "http://localhost:3471/api/course/${courseCode}/translate?limit=5&offset=N"
\`\`\`

Flag: garbage text, English left untranslated, obvious vocabulary inconsistency.
If errors found, submit corrections manually or respawn a targeted Sonnet agent.

## Step 4 — Done

When \`needs_translation\` reaches 0, post to chat and exit:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"Translation complete — all ${translateCount} seeds translated"}'
\`\`\`

---

## Sonnet Translator Brief

Spawn the Agent tool with this exact text as the prompt:

${sonnetBrief}
`;
}

module.exports = { generateTranslateBrief, generateSonnetTranslatorBrief };
