/**
 * Brief: TRANSLATE — Opus orchestrator spawns one Sonnet translator agent.
 */

const fs = require('fs');
const path = require('path');
const { getSupabase, getLanguageName, getKnownLanguageName } = require('./shared.cjs');

const REFERENCE_DIR = path.join(__dirname, 'reference-examples');

/**
 * Load native-checked reference examples for a produced language code, if present.
 * File: services/briefs/reference-examples/<langCode>.json
 * Returns { absPath, data } or null.
 */
function loadReferenceExamples(langCode) {
  if (!langCode) return null;
  const absPath = path.join(REFERENCE_DIR, `${langCode}.json`);
  try {
    const data = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    if (data && Array.isArray(data.examples) && data.examples.length > 0) {
      return { absPath, data };
    }
  } catch (_) {
    // no reference file for this language — fine
  }
  return null;
}

/**
 * Render a "read first" reference section for the Sonnet brief.
 * Embeds a short inline excerpt and points at the full file (kept lean to
 * avoid bloating the single command-line arg the brief is passed as).
 */
function renderReferenceSection(ref, translateLangName) {
  if (!ref) return '';
  const { absPath, data } = ref;
  const excerpt = data.examples
    .slice(0, 15)
    .map(e => `- ${e.english}  →  ${e.yoruba || e.translation || e.target}`)
    .join('\n');
  return `## Native-checked reference — READ FIRST

A human native speaker has checked ${data.examples.length} example ${translateLangName} translations. **Read the full set before you start:**
\`\`\`
cat ${absPath}
\`\`\`
${data.note ? `\n${data.note}\n` : ''}
Match their register, vocabulary, and tone-marking (diacritics) closely — ${translateLangName} is a weak language for LLMs, so these native-checked examples are your single most important quality anchor. When unsure, prefer the vocabulary and constructions these examples use.

Short excerpt (read the full file for the rest):
${excerpt}

`;
}

// ─── Sonnet Translator Brief ──────────────────────────────────────────────────

function generateSonnetTranslatorBrief(courseCode, translateField, translateLangName, translateCount, referenceSection = '') {
  return `# Seed Translator — ${courseCode}

You are translating ${translateCount} canonical seed sentences into **${translateLangName}**.
Fetch the full list at the start, then translate and submit them ONE AT A TIME.

${referenceSection}
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
You are providing \`${translateField}\` (${translateLangName}) ONLY.

Each seed returned by the fetch includes:
- \`canonical_english\` — the meaning to convey. Translate FROM this.
- \`current_known\` / \`current_target\` — whichever side is already filled is this course's **canonical reference** (e.g. a vetted Chinese target reused across all Chinese courses). Read it for every seed and make sure your ${translateLangName} matches its meaning exactly.

Submit ONLY \`${translateField}\`. NEVER overwrite the already-filled side — it is shared canonical data and must stay intact.

## Language name fidelity
When a seed refers to a language by name (e.g. "Italian", "French", "Spanish"), translate the name of THAT specific language into ${translateLangName}. Do NOT substitute it with the learner's own language. Seeds only ever refer to the target language of the course — never to the learner's language or to unrelated languages.

For example, in a French course for Italian speakers (Italians learning French), the known_text should use "Francese" (the Italian word for French), NOT "italiano".

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

  // Decide which side to translate from the ACTUAL seed data, not from a
  // course-code heuristic. New X_for_Y courses are seeded by reusing
  // canonical_seed_translations independently per side (keyed by language code),
  // so EITHER side can arrive pre-filled:
  //   eng_for_hin → English TARGET reused, Hindi KNOWN is the gap
  //   hin_for_eng → English KNOWN reused, Hindi TARGET is the gap
  //   zho_for_hin → Chinese TARGET reused (zho canonical already existed),
  //                 Hindi KNOWN is the gap.
  // The old "is the target English?" test mis-pointed the agent at the
  // already-done Chinese for that last case. Counting empties per side is
  // robust to all of them.
  let needsKnown = 0, needsTarget = 0;
  try {
    const { data: seeds } = await supabase
      .from('course_seeds')
      .select('known_text, target_text')
      .eq('course_code', courseCode);
    for (const s of seeds || []) {
      if (!s.known_text || !String(s.known_text).trim()) needsKnown++;
      if (!s.target_text || !String(s.target_text).trim()) needsTarget++;
    }
  } catch (_) {
    // Supabase unreachable — fall back to the legacy heuristic below.
  }

  // Translate the side with the larger gap. Tie / no data → legacy heuristic
  // (translate the known side only when the target is English).
  const produceKnownSide = (needsKnown === 0 && needsTarget === 0)
    ? (targetLang === 'eng')
    : (needsKnown >= needsTarget);

  const translateField = produceKnownSide ? 'known_text' : 'target_text';
  const translateLangName = produceKnownSide ? knownName : targetLanguageName;

  // The language code we are PRODUCING (used to look up native-checked references)
  const produceLang = produceKnownSide ? knownLang : targetLang;
  const reference = loadReferenceExamples(produceLang);
  const referenceSection = renderReferenceSection(reference, translateLangName);

  // ── Model selection ─────────────────────────────────────────────────────────
  // Default to Sonnet; auto-upgrade to Opus for languages where LLMs are
  // unreliable (low-resource and/or complex scripts). The orchestrator also
  // escalates Sonnet→Opus mid-run if its spot-checks find quality problems.
  // Extend this set as we learn which languages need it.
  const WEAK_LLM_LANGS = new Set([
    // Indic — Devanagari & related abugidas
    'hin', 'mar', 'nep', 'san', 'ben', 'guj', 'pan', 'asm', 'ory', 'sin', 'urd',
    // Dravidian
    'tam', 'tel', 'kan', 'mal',
    // Other low-resource / script-heavy
    'hye', 'kat', 'amh', 'yor', 'eus', 'gle', 'gla', 'bre', 'mlt', 'aze',
    'khm', 'lao', 'mya', 'kaz', 'uzb', 'div', 'tir',
    // Sinitic non-Mandarin — LLMs default to 書面語/Mandarin; force Opus to hold
    // colloquial register + correct script (see reference-examples/{yue,hak,nan}.json)
    'yue', 'hak', 'nan',
    // Swiss German — Dieth-lite dialect spelling needs Opus (see deu_ch.json)
    'deu_ch',
    // Quebec French — colloquial Québécois; LLMs default to standard France French,
    // so force Opus to hold the register (see fra_ca.json)
    'fra_ca',
    // Austrian — full colloquial Viennese; LLMs default to standard German or a
    // half-dialect mix, so force Opus to hold the register (see deu_at.json)
    'deu_at'
  ]);
  const weakLang = WEAK_LLM_LANGS.has(produceLang);
  const recommendedModel = weakLang ? 'opus' : 'sonnet';
  const modelLabel = recommendedModel === 'opus' ? 'Opus' : 'Sonnet';
  const modelReason = weakLang
    ? `${translateLangName} is a weak language for LLMs (low-resource and/or complex script) — use **Opus** to protect script and grammar integrity.`
    : `${translateLangName} is well-supported — **Sonnet** is fine. Escalate to Opus only if your spot-checks (Step 3) find quality problems.`;

  // Two-sided course: neither side was pre-filled from canonical. Translate the
  // larger-gap side first; a second pass (just re-run this brief) auto-targets
  // the remaining side, because side selection is now data-driven.
  const bothGap = needsKnown > 0 && needsTarget > 0;
  const otherLangName = produceKnownSide ? targetLanguageName : knownName;

  let displayName = courseCode;
  let translateCount = 668;
  try {
    const { data: courseInfo } = await supabase
      .from('courses')
      .select('display_name, seed_count')
      .eq('course_code', courseCode)
      .single();
    displayName = courseInfo?.display_name || courseCode;
    translateCount = courseInfo?.seed_count || 668;
  } catch (_) {
    // Supabase unreachable — use courseCode as fallback display name and the 668 default
  }

  const sonnetBrief = generateSonnetTranslatorBrief(courseCode, translateField, translateLangName, translateCount, referenceSection);

  return `# Seed Translation Orchestrator — ${courseCode}

You are orchestrating the translation of **${translateCount}** seed sentences into **${translateLangName}** for **${displayName}**.
${bothGap ? `
> ⚠️ **Two-sided course — both sides still need translation** (${needsKnown} known, ${needsTarget} target). This pass produces the **${translateLangName}** side ONLY. Global \`needs_translation\` will NOT reach 0 after this pass (the **${otherLangName}** side is still empty), so for THIS pass treat "done" as *this side* being empty-free — count it with:
> \`\`\`
> curl -s "http://localhost:3471/api/course/${courseCode}/translate?limit=${translateCount}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('this-side remaining:', sum(1 for s in d['seeds'] if s.get('${produceKnownSide ? 'needs_known' : 'needs_target'}')))"
> \`\`\`
> When this side reaches 0, post to chat that the **${translateLangName}** side is done, then **stop and ask for the translate stage to be re-run** — a fresh brief is data-driven and will automatically target the remaining **${otherLangName}** side (with its own appropriate model). Do NOT declare the whole course finished after one pass.
` : ''}
## Your Role
- Spawn ONE ${modelLabel} agent to do the translations
- Monitor its progress every ~50 seeds
- Watch for stalls and catch obvious errors
- Intervene, escalate the model, or respawn if needed

## Step 1 — Spawn the translator

**Model: ${modelLabel}.** ${modelReason}

Use the **Agent tool** with:
- \`subagent_type\`: \`"general"\`
- \`model\`: \`"${recommendedModel}"\`
- \`prompt\`: the full translator brief at the bottom of this document (copy it exactly)

Then post to chat:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"Translation started — ${modelLabel} translator active, translating ${translateLangName} for ${translateCount} seeds"}'
\`\`\`

## Step 2 — Monitor progress

Check remaining seeds periodically (use the FULL limit — \`needs_translation\` and \`total_seeds\` are counted over the returned page, so \`limit=1\` falsely reports "0 / 1"):
\`\`\`
curl -s "http://localhost:3471/api/course/${courseCode}/translate?limit=${translateCount}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('remaining:', d.get('needs_translation','?'), '/ total:', d.get('total_seeds','?'))"
\`\`\`

- Check every ~50 seeds or a few minutes
- If \`needs_translation\` stops decreasing for 5+ minutes → agent has stalled → respawn it with the same brief and model (\`${recommendedModel}\`)
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

Flag: garbage text, English left untranslated, broken script/diacritics, obvious vocabulary inconsistency.
- If errors are isolated → submit corrections manually or respawn a targeted agent for those seeds.
- If errors are systemic and the translator is Sonnet → **respawn with \`model: "opus"\`** and the same brief. Quality beats cost here.${weakLang ? ' (This language already starts on Opus.)' : ''}

## Step 4 — Done

When \`needs_translation\` reaches 0, post to chat and exit:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"Translation complete — all ${translateCount} seeds translated"}'
\`\`\`

---

## Translator Brief (${modelLabel})

Spawn the Agent tool with this exact text as the prompt:

${sonnetBrief}
`;
}

module.exports = { generateTranslateBrief, generateSonnetTranslatorBrief };
