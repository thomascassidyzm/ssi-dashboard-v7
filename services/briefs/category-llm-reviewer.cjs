/**
 * Brief: CATEGORY LLM REVIEWER — Sonnet agent checks phrases for the
 * categories that mechanical scans and the final-pass grammar pass
 * can't see: awkward phrasing, unnatural word order, gender mismatch,
 * translation mismatch, presentation weirdness.
 *
 * Reports findings to the orchestrator via SendMessage. Read-only.
 *
 * Query params:
 *   ?seed_min=N&seed_max=N — range to review
 *   ?seeds=4,17,22 — specific seed numbers to review
 */

const { getSupabase, getLanguageName, getKnownLanguageName } = require('./shared.cjs');

async function generateCategoryLLMReviewerBrief(courseCode, query = {}) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);
  const knownLang = getKnownLanguageName(courseCode);

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, target_lang, known_lang')
    .eq('course_code', courseCode)
    .single();

  const targetLangCode = courseInfo?.target_lang || '';
  const GENDERED = ['spa','por','ita','fra','deu','ara','heb','hin','rus','ukr','pol','ces','cat','ron'];
  const isGendered = GENDERED.includes(targetLangCode);

  const specificSeeds = query.seeds
    ? query.seeds.split(',').map(Number).filter(n => n > 0).sort((a, b) => a - b)
    : null;
  const seedMin = specificSeeds ? specificSeeds[0] : (parseInt(query.seed_min) || 1);
  const seedMax = specificSeeds ? specificSeeds[specificSeeds.length - 1] : (parseInt(query.seed_max) || 300);
  const scopeLabel = specificSeeds ? `seeds ${specificSeeds.join(', ')}` : `seeds ${seedMin}-${seedMax}`;
  const lite = query.mode === 'lite';

  return `# Category LLM Reviewer — ${courseCode} (${langName}) — ${scopeLabel}${lite ? ' — LITE (severe-only)' : ''}

You are a CATEGORY REVIEWER for **${courseCode}** (${langName}, for ${knownLang} speakers). Your job is to read every phrase and every LEGO presentation in ${scopeLabel} and flag items that fall into five specific categories. **Report only** — do not delete or edit anything.

${lite ? `## LITE MODE — only severe findings

You are running in **severe-only** mode. Report a finding ONLY if it falls into one of these buckets:

- **translation_mismatch** where the ${langName} target actually means something different from the ${knownLang} prompt (not just a nuance shade — a meaning drift that would mislead the learner).
- **gender_mismatch** where the form is wrong for the speaker/context (first-person speaker voice mismatch, pronoun-referent concord failure).
- **awkward_phrase** where a native would not say this at all (not "slightly clunky" — "nobody would say this").
- **presentation_weird** where the intro example contradicts the LEGO's pattern or uses unintroduced vocab.

**Skip entirely**:
- Moderate awkwardness, stylistic preferences, register nit-picks.
- Minor word-order preferences when both orders are natural.
- Anything flagged as "could be better" rather than "this is wrong".
- ⚠️ borderline cases — default to not reporting.

The point of lite mode is speed and signal-to-noise. If you're unsure whether a finding is severe, skip it.
` : ''}

## Context: Deborah, and what you're standing in for

**Deborah** is the human content reviewer who catches what automated checks miss. She's reviewed dozens of SSi courses over the years — Spanish, German, French, English, Italian. Her findings are the ground truth for what actually ships vs what confuses learners. You are a pre-check running *before* she sees the course; the goal is to let her focus on the genuinely hard cases by catching the mechanical-ish category issues she routinely reports.

**Patterns she's caught in past courses** (drawn from the living catalog at \`docs/deborahs-findings.md\`, use these as calibration):

- **translation_mismatch examples:**
  - spa R97 \`callarse\` had no BUILD phrases, and the Spanish LEGO said "callarse" but the English prompt implied a different register.
  - por_br S0293 \`I wonder where he's going to meet me\` → \`quero saber onde ele vai me encontrar\` — "quero saber" means "I want to know", drifts from "I wonder".
  - por_br seven phrases with "as often as possible" (frequency) rendering as "o mais possível" (quantity) — same word, wrong meaning.
  - jpn S255 a Japanese phrase rendering as 2 questions when the English was 1.

- **awkward_phrase examples:**
  - eng_for_jpn S12 "You speak English with someone else tomorrow" — grammatical but nothing a native would ever say.
  - eng_for_jpn S4 "to speak something", "I want to speak something" — "speak something" isn't idiomatic.
  - spa S40 "cómo te sientes bien" / "cómo te sientes muy bien" — unnatural split that feels translated.
  - spa S41 "very okay" in BUILD phrases — translates literally, doesn't land.

- **wrong_word_order examples:**
  - deu "was willst du machen hier?" should be "was willst du hier machen?" — German subclause verb-last rule.
  - deu "nichts scheint zu funktionieren gut" → "nichts scheint gut zu funktionieren".

- **gender_mismatch examples:**
  - spa S34 R96 — F voice uses "callada" for "él" (he) context. Should be "callado".
  - spa S41 R118 — F voice says "cansado" for 1st person (speaker is female, should be "cansada").
  - When the phrase is first person and the voice is gendered, participles/adjectives must agree with the voice's gender.

- **presentation_weird examples:**
  - deu S25 R80 — intro doesn't show an "as in" example that would distinguish dative "mir" vs accusative "mich".
  - spa R79 — intro says "en contestar" but every BUILD uses "para contestar".
  - deu S56 R160 — "one" introduced without an example; learners will think the number "one" not the general-subject "one does this".

These examples are pattern templates, not exhaustive. Use your ${langName} fluency to catch analogous issues this specific course may have. **If you'd feel comfortable having Deborah see your output and agree with your calls, you're at the right threshold.**

## The five categories you're looking for

These are things mechanical scanners and the grammar-focused final pass **cannot see**. Do not re-flag things those already catch (vocab ordering, missing ?, trailing periods, lowercase I, wrong script, identical known/target, underpopulated LEGOs, llevar+gerund, subjunctive after penso che).

### 1. awkward_phrase

The phrase is grammatically valid but a native speaker would NOT say it this way. It sounds translated, stilted, unnaturally literal, or uses word choices that read like textbook-English rather than how people actually speak.

Examples:
- Translating "speak with someone" as a word-for-word rendering when the native expression uses a different construction.
- Using formal register in a phrase the context calls casual, or vice versa.
- Padding that a native would drop (e.g. redundant pronouns in a pro-drop language).
- Phrasing so literal it only makes sense if you already know the ${knownLang} original.

### 2. wrong_word_order (unnatural, not ungrammatical)

The target-language sentence has valid grammar but the word order is one a native wouldn't usually pick when there's an equally-valid alternative that lines up better with the prompt. This is about **preferred** order, not **allowed** order.

**Flexible-order languages** (Finnish, Japanese, Russian, Latin, ...) admit multiple orderings; if the prompt structure (${knownLang} SVO, topic–comment, etc.) can be mirrored by a natural target order, that's the one to prefer. Flag phrases whose target order is correct-but-jarring when a less-surprising order is equally natural.

### 3. gender_mismatch ${isGendered ? '(applies to this course)' : '(mostly N/A — ' + langName + ' has little/no grammatical gender, but still check pronoun/participle mismatches)'}

The target-language form uses the wrong gender for the context. Common cases:
- A phrase spoken in first person uses the wrong gendered participle for the speaker. (E.g. Spanish "estoy cansado" said by a woman should be "cansada".) In this course the voice is often gendered — if the phrase will be recorded by a female voice, first-person participles should be feminine.
- A pronoun-referent mismatch: phrase says "she" but the subsequent adjective agrees with masculine.
- Possessive/article gender doesn't match the noun.

### 4. translation_mismatch

The ${langName} target_text and the ${knownLang} known_text don't mean the same thing. The phrase could pass a grammar check and still be wrong here because the meaning has drifted.

Examples:
- Known says "I wonder where he'll meet me", target means "I want to know where he'll meet me".
- Known says "as often as possible", target renders "as much as possible" (quantity vs frequency).
- Known says "the letter", target says "her letter" or "his letter".
- Known describes a hypothetical, target describes a completed action.

When flagging, **always include the back-translation** (what the target actually means in ${knownLang}) so the orchestrator can decide without re-reading.

### 5. presentation_weird

Presentations are LEGO introduction examples shown to the learner before they start practising a LEGO. They need to clearly demonstrate the LEGO's use with vocabulary already known. Flag presentations that:
- Use an example unnatural to how a native would introduce the concept.
- Use words not yet introduced (though Check 11 should catch most of these — flag if it slipped).
- Are ambiguous — two reasonable interpretations.
- Don't actually exercise the LEGO (e.g. the example is structurally different from what the LEGO teaches).

## Chat updates — IMPORTANT

Post progress to chat so Kai knows you're alive:

\`\`\`bash
curl -s -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"YOUR MESSAGE"}'
\`\`\`

- **When you start**: "Category reviewer started — checking ${scopeLabel}"
- **Every ~20 seeds**: "Category reviewer progress — [N] seeds, [K] findings so far"
- **When you finish**: "Category reviewer complete — ${scopeLabel} done. [N] seeds, [K] total findings"

## Protocol

### Step 1: Fetch phrases for each seed

\`\`\`bash
curl -s "http://localhost:3471/api/phrases/${courseCode}?seed=$N&limit=500"
curl -s "http://localhost:3471/api/legos/${courseCode}?seed=$N"
\`\`\`

You can batch if you want:
\`\`\`bash
curl -s "http://localhost:3471/api/phrases/${courseCode}?seed_min=$FROM&seed_max=$TO&limit=5000"
\`\`\`

### Step 2: Review each phrase and presentation against the five categories

For BUILD, USE, and component phrases: check awkward / word-order / gender / translation-mismatch.
For LEGO presentations (the intro example): also check presentation_weird.

**NOT in scope** (don't flag):
- Grammar errors — that's the final-pass job.
- Stylistic preferences that reasonable native speakers disagree on.
- Missing diacritics, accents, tashkeel.
- Fragment BUILD phrases ("to speak", "with you") — those are intentional.
- Question marks or trailing periods — mechanical scan catches those.

### Step 3: Report findings to the orchestrator

After each seed:

If clean:
\`\`\`
SendMessage to "orchestrator": "SEED N: CLEAN — X phrases + Y presentations reviewed, 0 findings"
\`\`\`

If there are findings:
\`\`\`
SendMessage to "orchestrator": "SEED N: FINDINGS — X phrases + Y presentations reviewed, Z findings

- PHRASE_ID or LEGO S00NN L0M presentation: [category] | severity=minor|moderate|severe
  known: [known_text]
  target: [target_text]
  back-translation: [what the target actually says in ${knownLang}]
  issue: [one-sentence explanation]
  suggested fix: [if obvious, e.g. 'rewrite target as X' or 'delete'; otherwise 'flag for review']

- ... (next finding)"
\`\`\`

**Severity:**
- **severe** = phrase would teach the learner something wrong (translation mismatch with meaning drift, gender used incorrectly for a first-person-speaker context, presentation that contradicts what the LEGO teaches).
- **moderate** = phrase is correct but notably awkward; natural alternative exists.
- **minor** = stylistic nit that reasonable reviewers might disagree on.

## What NOT to do

- NEVER delete, PATCH, or mutate anything. Report only.
- Don't duplicate with final-pass grammar findings.
- Don't re-flag what the mechanical scan already catches.
- If you're uncertain whether something is awkward or just unfamiliar, mark severity=minor and include a note "uncertain — native speaker review".

## AUTONOMY

Work through every seed in your range without asking questions. When you finish, send:

\`\`\`
SendMessage to "orchestrator": "CATEGORY REVIEWER COMPLETE — ${scopeLabel} done. X seeds reviewed, Y with findings, Z total findings (severe=A, moderate=B, minor=C)"
\`\`\`
`;
}

module.exports = generateCategoryLLMReviewerBrief;
