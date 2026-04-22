/**
 * Brief: LEARNER SIMULATION — single Opus agent roleplays a total beginner
 * working through the course sequentially, reporting moments of confusion,
 * nervousness, or misleading content.
 *
 * Output: a report, no mutations. Runs AFTER all other scan checks and
 * LLM category checks — this is the final-final pass before Deborah.
 *
 * Query params:
 *   ?max_seed=N   — how many seeds to read (default 150)
 */

const { getSupabase, getLanguageName, getKnownLanguageName } = require('./shared.cjs');

async function generateLearnerSimulationBrief(courseCode, query = {}) {
  const supabase = getSupabase();
  const targetLang = getLanguageName(courseCode);
  const knownLang = getKnownLanguageName(courseCode);
  const maxSeed = parseInt(query.max_seed) || 150;

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, known_lang, target_lang')
    .eq('course_code', courseCode)
    .single();

  const displayName = courseInfo?.display_name || courseCode;

  return `# Learner Simulation — ${courseCode} (${displayName})

Working directory: ${process.cwd()}

## YOUR JOB

You are roleplaying a **complete beginner** in ${targetLang}. You are fluent in ${knownLang} — that's your native language. At the very start you know **zero** ${targetLang}. Not one word. Your knowledge of the target language grows only from what this course explicitly teaches you.

Read through seeds 1 to ${maxSeed} one at a time, in order. At each seed you (a) learn the new LEGOs introduced in that seed, then (b) attempt every practice phrase in that seed as if you were the learner. Track how each attempt makes you feel, note anything confusing, and produce a report at the end.

**This is a REPORT-ONLY pass.** Do not delete, flag, or edit anything. No curl calls that mutate state. Only read.

## Why this matters

Every phrase a learner hears is an implicit promise: "you can figure this out from what you know so far." If a phrase breaks that promise — uses a word the learner was never taught, or introduces a construction that contradicts an earlier lesson, or means something other than what a learner would reasonably say back to a native speaker — the learner feels nervous, guilty, or stupid. Multiple near-misses stacked together is worse than one blatant error, because the learner starts doubting whether they're even paying attention correctly.

We catch blatant vocab-ordering bugs with regex scanners. What we *can't* catch mechanically is the cumulative texture of a course: does it FEEL like a trustworthy teacher? That's what this pass is for.

## The learner you're simulating

- Speaks ${knownLang} fluently, zero prior ${targetLang}.
- Is an adult, reasonably attentive, trying to learn.
- Retains what they've been explicitly taught. Assumes consistency — if word X meant Y in seed 3, they expect X to mean Y in seed 40.
- Is willing to tolerate mild surprise (different word order than they'd guess, a cognate they can infer from context, a sensible synonym). Not willing to accept a brand new word with no introduction.
- Gets more nervous the denser the surprises get. Three "borderline" moments in seeds 7-9 is worse than three "borderline" moments across seeds 20, 60, 110.

## Process

### Step 0 — Set up

\`\`\`bash
# Chat channel so Kai can see you're alive
curl -s -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"role":"agent","message":"Learner simulation starting — reading seeds 1-${maxSeed} as a total beginner"}'
\`\`\`

Maintain three running stores in your own head:

1. **VocabKnown** — LEGOs you've been introduced to. Keyed by ${knownLang} gloss → ${targetLang} form. Include components of M-type LEGOs (if an M-LEGO "to speak" → "falar" has been introduced, record it; if its component "to" → "" is introduced separately, record that too).
2. **PatternsSeen** — grammar/structure patterns the course has shown (e.g. "${targetLang} puts adjectives after nouns", "verb drops the subject pronoun"). Notice these as you go; don't assume them before the course demonstrates them.
3. **NervousnessLog** — every reaction rated ⚠️ or worse. Keep the last ~15 entries in active memory to spot clusters.

### Step 1 — For each seed N from 1 to ${maxSeed}

**1a. Fetch the seed's LEGOs and phrases:**

\`\`\`bash
curl -s "http://localhost:3471/api/legos/${courseCode}?seed=\${N}"
curl -s "http://localhost:3471/api/phrases/${courseCode}?seed=\${N}"
\`\`\`

The legos endpoint returns \`{ course_code, seed_number, legos: [...] }\` with each LEGO including \`lego_index, lego_id, type, known_text, target_text, components\`. The phrases endpoint returns up to 100 phrases per call — if a seed has more, page with \`&offset=100\`.

**1b. Introduce new LEGOs to yourself.**

For each LEGO with \`is_new=true\`: add it to your VocabKnown. For reused LEGOs (\`is_new=false\`), confirm you already know them — if you don't, that's a **scan finding** (the LEGO was never introduced before being reused).

If the seed introduces a grammar pattern for the first time — pluralisation, gender agreement, verb conjugation, word order — note it in PatternsSeen.

**1c. For each practice phrase in the seed, attempt it.**

Order: components first, then builds, then uses.

For each phrase:

1. Read the ${knownLang} prompt (\`known_text\`).
2. **Translate it in your head** using only your VocabKnown and PatternsSeen. Write down what you *expect* the ${targetLang} answer to be.
3. Compare your expectation to the actual \`target_text\`.
4. Rate the gap (see rubric below).
5. If rated ⚠️ or worse, add to NervousnessLog with the phrase_id, your expected answer, the actual answer, and a one-sentence reason.

### Step 2 — Rubric

Rate each attempt on this five-level scale. Pick the **highest severity** that applies.

| Level | Emoji | When to use | Example |
|---|---|---|---|
| OK | ✓ | Your guess matches exactly, or differs only in surface form you've been taught is variable (diacritic placement, optional pronoun). | Guess "eu quero falar", actual "eu quero falar". |
| Surprise | 🤔 | Word ORDER differs from your guess, or a cognate you reasonably inferred works slightly differently. The learner blinks, re-reads, gets it. | Expected adjective before noun; actual is after. First noun-adj seed shows this. |
| Borderline | ⚠️ | A new word appears in the ${targetLang} that maps to a ${knownLang} word you already know. If it's clearly a synonym (e.g. "comenzar" when you know "empezar") or a morphological variant (different conjugation of a known verb) and meaning is clear, the learner can ABSORB it — but notice. Too many of these in a row tips it. | Learner knows "quiero", phrase uses "querría". Same verb, new form, no intro. Fine once; 5× in one seed is alarming. |
| Problematic | 🚨 | A ${targetLang} word you were never introduced to, used as if you should know it. OR a structure that contradicts an earlier lesson (word order rule established, now violated). | Phrase uses "también" before it was taught. |
| Misleading | 💔 | Your attempt, if spoken to a native ${targetLang} speaker, would be understood wrongly. Or the ${targetLang} text means something different from the ${knownLang} prompt. Or the phrase teaches a structure that would make the learner say something incorrect in real conversation. | ${knownLang} prompt "I want to speak", target text actually means "I want to tell". |

**Cumulative effect**: track density. Every seed, count ⚠️/🚨/💔 in the last 2-3 seeds. If you see 3+ in that window, mark that cluster in the final report even if each individual item was borderline.

### Step 3 — Keep going

Proceed to the next seed. Do NOT double-back and edit earlier entries. Your VocabKnown and PatternsSeen only grow — they don't retroactively update based on later seeds.

## Output: the report

Post a final message to the chat channel and print the full report to stdout.

### Report format

\`\`\`markdown
# Learner Simulation Report — ${courseCode}
**Scope**: seeds 1-${maxSeed}
**Vocab items known by end**: N
**Patterns tracked**: K

## Headline
<1-paragraph plain-English summary: does the course feel trustworthy? Where are the sore points?>

## Severity counts
- ✓ OK: N
- 🤔 Surprise: N
- ⚠️ Borderline: N
- 🚨 Problematic: N
- 💔 Misleading: N

## Nervousness clusters
Seed ranges where ⚠️/🚨/💔 density crossed the threshold (3+ in 2-3 seeds).
For each cluster: seed range, count, 1-line on what's happening.

## Top 🚨 Problematic findings (all of them, up to 30)
For each:
- phrase_id
- known prompt
- target text
- my expected answer
- why it's problematic (which word was new, which pattern violated)

## Top 💔 Misleading findings (all of them)
For each:
- phrase_id
- what a ${knownLang}-speaking learner would say back to a native
- how a native would actually interpret that
- the gap

## ⚠️ Borderline worth mentioning
Top 10 by cluster impact. Same format as 🚨.

## Uncaught reused LEGOs
Any is_new=false LEGO encountered without prior introduction.

## Pattern inconsistencies
Places where the course contradicts a structural rule it previously established.
\`\`\`

Post the full report as a single message to the chat:

\`\`\`bash
curl -s -X POST "http://localhost:3471/api/orchestrator/chat/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d "{\\"role\\":\\"agent\\",\\"message\\":\\"$(cat <<'EOF' | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'
<report markdown here>
EOF
)\\"}"
\`\`\`

## IMPORTANT RULES

1. **Report only.** No deletes, no edits, no flags. Read-only curl calls only.
2. **Don't cheat.** If you're evaluating seed 50, you don't know what seeds 51-150 teach. Simulate honestly — your VocabKnown only includes what's been introduced at or before the current seed.
3. **Take cumulative density seriously.** One ⚠️ is fine. Five ⚠️ across three seeds is a real finding even if each one is individually defensible.
4. **Consider the reverse direction too.** For high-severity items, ask: "if I said my expected answer to a native, would they understand me correctly?" That's a distinct check from "does the target text match my guess".
5. **Stick to ${maxSeed} seeds.** Stop when you hit seed ${maxSeed}, even if the course has more. This is a sampling pass, not a full review.
6. **This is the final final pass.** All mechanical scans and category LLM checks have already run. Don't re-flag things those already catch (missing ?, trailing periods, etc.). Focus on the learner-experience stuff those can't see.

## START NOW

Post the starting chat message, then begin seed 1. Work through sequentially. Produce the report when you reach seed ${maxSeed}.
`;
}

module.exports = generateLearnerSimulationBrief;
