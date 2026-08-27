# Scan Course - Post-Build Quality Check

Use this skill after a course build completes to catch structural issues before content checking or audio generation.

**Usage:** `/scan-course <course_code>`

Reports issues but does NOT fix them — you decide what to do.

## Workflow

### Step 1: Get course metadata

```bash
set -a && source .env && set +a
```

```javascript
const supabase = require('./services/supabase-client.cjs').getClient();
const { data: course } = await supabase.from('courses')
  .select('course_code, known_lang, target_lang, display_name')
  .eq('course_code', COURSE_CODE).single();
```

You need `known_lang` and `target_lang` to know what scripts to expect.

### Step 2: Fetch all LEGOs and phrases

Fetch in pages of 1000:

```javascript
// Fetch all LEGOs
let legos = [], from = 0;
while (true) {
  const { data } = await supabase.from('course_legos')
    .select('lego_id, seed_number, lego_index, known_text, target_text')
    .eq('course_code', COURSE_CODE).range(from, from + 999);
  if (!data || !data.length) break;
  legos = legos.concat(data);
  if (data.length < 1000) break;
  from += 1000;
}

// Fetch all phrases (same pattern)
// Fields: id, seed_number, lego_index, phrase_role, known_text, target_text
```

### Step 3: Run structural checks

Run these checks in a single node script. Print results as you go.

#### Check 1: Parentheticals in LEGO known_text

Pattern: `/\([^)]+\)/` in known_text

These are grammar annotations like `(sentence end)`, `(2sg pronoun)`, `(past participle)` that the builder agent added. They should not be in learner-facing text.

**Search independently** — do NOT combine with the slash check. A LEGO can have parentheticals only, slashes only, or both.

Report: count + 5 samples.

#### Check 2: Slashes in LEGO known_text

Pattern: `/\//` in known_text

These are synonym glosses like `he/she`, `well/good`, `to talk/speak`. The learner should hear one word, not alternatives.

**Search independently** from parentheticals — many LEGOs have slashes WITHOUT parentheticals and vice versa. Run a separate query/filter for each.

Report: count + 5 samples.

#### Check 3: Wrong language in known_text

Detect by script mismatch. The known_text should match the expected script for `known_lang`:

```javascript
// Script detection helpers
const hasJapanese = (t) => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(t);
const hasChinese = (t) => /[\u4E00-\u9FFF]/.test(t);
const hasKorean = (t) => /[\uAC00-\uD7AF\u1100-\u11FF]/.test(t);
const hasArabic = (t) => /[\u0600-\u06FF]/.test(t);
const hasArmenian = (t) => /[\u0530-\u058F]/.test(t);
const isLatinOnly = (t) => /^[a-zA-ZÀ-ÿ\s.,!?;:'"()\-\/¿¡«»]+$/.test(t.trim());

// For jpn known_lang: known_text should have Japanese characters
// For zho known_lang: known_text should have Chinese characters
// For eng known_lang: known_text should be Latin
// etc.
```

Check both LEGOs and phrases. For `_for_jpn` courses, any known_text that is purely Latin (no CJK) is wrong. For `_for_eng` courses, any known_text with CJK/Arabic/Armenian is wrong.

Report: count + seed range where it starts + 5 samples.

#### Check 4: Wrong language in target_text

Same script check but for target_text against `target_lang`.

#### Check 5: Multi-sentence phrases

Detect dialogue or two sentences joined together. Check both known_text and target_text:

```javascript
// Two question marks
(text.match(/\?/g) || []).length >= 2

// Period/exclamation followed by space and capital (not abbreviations)
/[.!]\s+[A-ZÀ-Ü¿¡]/.test(text) && !/[A-Z]\./.test(text)

// Second ¿ appearing mid-string (Spanish)
text.indexOf('¿') > 5
```

Report: count + all matches (usually few).

#### Check 6: Unpronounceable phrases

Detect phrases where known_text or target_text contains no actual letters — just punctuation, numbers, or whitespace. These can't be spoken by TTS or learners.

```javascript
const hasNoPronounceable = (t) => t.replace(/[^a-zA-ZÀ-ÿ0-9\u0400-\u04FF\u0530-\u058F\u0600-\u06FF\u3040-\u9FFF\uAC00-\uD7AF]/g, '').length === 0;
const unpron = phrases.filter(p => hasNoPronounceable(p.known_text) || hasNoPronounceable(p.target_text) || p.known_text.trim() === '' || p.target_text.trim() === '');
```

Note: Single real words like `I`, `a`, `の` are NOT unpronounceable — they have letters. Numbers like `6` are pronounceable (TTS reads them as words). This check only catches things like `"..."`, `"?!"`, `""`, etc.

Report: count + all matches.

#### Check 7: Speech marks wrapping text

Detect phrases or LEGOs where known_text or target_text is wrapped in speech marks. These appear as quotes on screen in the app.

```javascript
const hasWrappingQuotes = (t) => (t.startsWith('"') && t.endsWith('"')) ||
  (t.startsWith('\u201C') && t.endsWith('\u201D')) ||
  (t.startsWith('\u201E') && t.endsWith('\u201D'));

const quotedPhrases = phrases.filter(p => hasWrappingQuotes(p.known_text) || hasWrappingQuotes(p.target_text));
const quotedLegos = legos.filter(l => hasWrappingQuotes(l.known_text) || hasWrappingQuotes(l.target_text));
```

Report: count + 5 samples.
Action: Strip wrapping quotes from both known_text and target_text. Also strip from matching course_audio.text and text_normalized to keep exports consistent.

#### Check 8: Trailing periods

Detect phrases with trailing periods (`.`) in known_text or target_text. These cause TTS to add unnatural pauses and create duplicate key conflicts in `course_audio`.

```javascript
const trailingPeriod = phrases.filter(p =>
  /\.\s*$/.test(p.known_text) || /\.\s*$/.test(p.target_text)
);
```

Note: This does NOT flag `?` or `!` — those are valid sentence-ending punctuation. Only `.` is problematic because it's the default TTS sentence boundary marker and gets stripped inconsistently by normalization.

Report: count + 5 samples.

#### Check 9: Lowercase "I" in English

If the target language is English (`target_lang === 'eng'`), check for standalone lowercase `i` that should be `I`:

```javascript
// Match " i " or "i'" (i'm, i've, i'd) but not inside words
/\bi\b(?!')/.test(text) || /\bi'/.test(text)
```

If the known language is English (`known_lang === 'eng'`), check known_text instead.

Report: count + 5 samples.

#### Check 10: ZUT conflicts (duplicate known_text → different target_text)

Find is_new LEGOs where two or more share the same known_text but have different target_text. This means the learner won't know which word to say.

```javascript
// Group is_new LEGOs by known_text
const byKnown = new Map();
for (const l of legos) {
  if (!l.is_new) continue;
  if (!byKnown.has(l.known_text)) byKnown.set(l.known_text, []);
  byKnown.get(l.known_text).push(l);
}

const conflicts = [];
for (const [known, entries] of byKnown) {
  const uniqueTargets = [...new Set(entries.map(e => e.target_text))];
  if (uniqueTargets.length > 1) {
    conflicts.push({ known, entries, targets: uniqueTargets });
  }
}
```

**Ignore gender pairs** where the only difference is masculine/feminine (amigo/amiga, bueno/buena, ocupado/ocupada) — either form is correct, not a real ZUT.

Report: count + each conflict with LEGO IDs, known text, and both target texts.

**Important:** This check should run AFTER parentheticals and slashes are fixed, since stripping those can reveal hidden duplicates (e.g., two LEGOs both become "it was" after removing "(imperfect)" and "(preterite)").

See `memory/methodology-zut-resolution.md` for the resolution patterns.

#### Check 11: Vocab ordering — word-level (known side)

Detect phrases that introduce NEW ENGLISH words the learner hasn't encountered yet. This is the pedagogically serious version of the vocab-ordering check — if the learner sees an English word they've never seen before, they're confused regardless of whether the target language already introduced it.

```javascript
// Tokenizer that PRESERVES contractions (didn't, weren't, I'll, etc.)
// Apostrophes inside words are part of the word — don't strip them.
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[.,!?;:()\/\-–—¿¡"]/g, ' ')  // strip sentence punctuation, KEEP apostrophes
    .split(/\s+/)
    .filter(w => w.length > 0);
}

// Build cumulative known-side vocabulary per seed
// Source: all LEGOs (both is_new and reuses), all seeds, and all build/component phrases
const knownAtSeed = new Map();
for (const l of legos) {
  if (!knownAtSeed.has(l.seed_number)) knownAtSeed.set(l.seed_number, new Set());
  for (const w of tokenize(l.known_text)) knownAtSeed.get(l.seed_number).add(w);
}
for (const s of seeds) {
  if (!knownAtSeed.has(s.seed_number)) knownAtSeed.set(s.seed_number, new Set());
  for (const w of tokenize(s.known_text)) knownAtSeed.get(s.seed_number).add(w);
}
for (const p of phrases) {
  if (p.phrase_role === 'use') continue;  // USE phrases are the ones being CHECKED, not sources
  if (!knownAtSeed.has(p.seed_number)) knownAtSeed.set(p.seed_number, new Set());
  for (const w of tokenize(p.known_text)) knownAtSeed.get(p.seed_number).add(w);
}
const maxSeed = Math.max(...seeds.map(s => s.seed_number));
let running = new Set();
const cumKnown = new Map();
for (let s = 1; s <= maxSeed; s++) {
  if (knownAtSeed.has(s)) for (const w of knownAtSeed.get(s)) running.add(w);
  cumKnown.set(s, new Set(running));
}

// Build the same cumulative set for the target language side.
const targetAtSeed = new Map();
for (const l of legos) {
  if (!targetAtSeed.has(l.seed_number)) targetAtSeed.set(l.seed_number, new Set());
  for (const w of tokenize(l.target_text)) targetAtSeed.get(l.seed_number).add(w);
}
for (const s of seeds) {
  if (!targetAtSeed.has(s.seed_number)) targetAtSeed.set(s.seed_number, new Set());
  for (const w of tokenize(s.target_text)) targetAtSeed.get(s.seed_number).add(w);
}
for (const p of phrases) {
  if (p.phrase_role === 'use') continue;
  if (!targetAtSeed.has(p.seed_number)) targetAtSeed.set(p.seed_number, new Set());
  for (const w of tokenize(p.target_text)) targetAtSeed.get(p.seed_number).add(w);
}
let runTarget = new Set();
const cumTarget = new Map();
for (let s = 1; s <= maxSeed; s++) {
  if (targetAtSeed.has(s)) for (const w of targetAtSeed.get(s)) runTarget.add(w);
  cumTarget.set(s, new Set(runTarget));
}

// Classify violations by whether the TARGET side is also new:
//   Cat A: both sides introduce new vocab → real violation, DELETE.
//   Cat B: only the English label is new, every target word already taught →
//          WORTH CHECKING, not automatically safe. Cat B is safe ONLY when
//          the new English word is a clear bridge from something taught —
//          contraction ("he'd" from "he would"), gerund ("practising" from
//          "practice"), past tense ("were" from "are/is"), plural. If the
//          new English word is a fresh lexical item ("glad", "really",
//          "afternoon") with no clear bridge, the learner sees an unfamiliar
//          prompt and has to guess what to say — Kai's criterion: "is it
//          possible for the learner to know what to say?" Safe answer
//          requires a bridge, not just a known target.
//   Cat C: mixed (some new target words but fewer than new known words).
//          Worth a manual look.
const wordViolationsCatA = [];
const wordViolationsCatB = [];
const wordViolationsCatC = [];
for (const p of phrases) {
  if (p.phrase_role !== 'use') continue;
  const knownWords = tokenize(p.known_text);
  const targetWords = tokenize(p.target_text);
  const known = cumKnown.get(p.seed_number) || new Set();
  const target = cumTarget.get(p.seed_number) || new Set();
  const newK = knownWords.filter(w => !known.has(w));
  if (!newK.length) continue;
  const newT = targetWords.filter(w => !target.has(w));
  const row = { id: p.id, seed: p.seed_number, known: p.known_text, target: p.target_text, newK, newT };
  if (newT.length === 0) wordViolationsCatB.push(row);
  else if (newT.length >= newK.length) wordViolationsCatA.push(row);
  else wordViolationsCatC.push(row);
}
```

**Why the target-side filter matters.** Raw Check 11 fires on any phrase whose English prompt uses a word not yet introduced. In practice most of those are Cat B — the English prompt is a synonym/morph variant ("were" vs "are", "he'd" contraction, "practising" gerund of "practice") while the target uses only known words. The learner produces the correct target regardless. On por_br_for_eng the filter cut 140 raw to 1 Cat A.

**Cat B is "worth verifying", not "automatically safe".** Two ways a Cat B can still be a real violation:

1. **The new English word isn't a clear bridge.** Cat B is safe *only* when the new English word is derivable from something taught: contraction ("he'd"), gerund ("practising"), past-tense ("were"), plural, or an obvious synonym. A fresh lexical item like "glad", "really", "afternoon" that happens to map to words the learner knows in the target is still a guess for the learner unless the bridge is explicit. Kai's criterion: "is it possible for the learner to know what to say?" Bridge required, not just target familiarity.

2. **New sense of an already-taught target word.** The target word has been seen before but in a different meaning — e.g. Portuguese "fizer" taught as "ask" (in "fazer perguntas") and later used to mean "do/make". The word is familiar, the *sense* isn't. Mechanical Check 11 can't detect sense changes; the Cat B flag just confirms the word-form was seen. Step 6b (category LLM pre-check) is where new-sense violations should be caught — it's exactly a translation_mismatch finding. If you're running Check 11 standalone (without Step 6b), flag Cat B items for a semantic look.

Report: total + Cat A + Cat C + Cat B. Show all Cat A with new English AND new target words. Sample Cat B with both the new English word and its mapping in target — enough context for a bridge judgement.

Action:
- **Cat A**: delete.
- **Cat C**: review each.
- **Cat B**: spot-check for the two failure modes above. If running Step 6b later in the pipeline, safe to defer — the category LLM will catch new-sense cases as translation_mismatch.

**Known limitation**: the tokenizer does not stem. `perguntas` (plural) and `pergunta` (singular) count as different words. If a Cat A is just a singular/plural mismatch within the same seed's own vocabulary, it's a false positive — check the seed's target_text before acting.

#### Check 12: Vocab ordering — chunk-level (multi-word M-LEGO target text used before introduced)

Deborah discovered that single-word vocab checks miss an important class: **multi-word M-LEGO chunks** (fixed expressions like "ein bisschen", "kein Problem", "lo que", "llevas aprendiendo") that are taught AS A UNIT at a specific seed but appear wholesale in earlier phrases. The learner's confusion isn't at the word level — it's "I recognise the individual words but this combination means something I haven't learned."

```javascript
// Multi-word M-type is_new LEGOs are the chunks we protect
const mLegos = legos.filter(l => {
  if (l.type !== 'M' || !l.is_new) return false;
  const w = l.target_text.trim().split(/\s+/).filter(x => x.length > 0);
  return w.length >= 2;
});

// Exclude own-seed LEGO texts (a phrase can naturally use its own seed's LEGOs)
const seedLegoTexts = new Map();
for (const l of legos) {
  if (!seedLegoTexts.has(l.seed_number)) seedLegoTexts.set(l.seed_number, new Set());
  seedLegoTexts.get(l.seed_number).add(l.target_text.toLowerCase().trim());
}

const chunkViolations = [];
for (const p of phrases) {
  const pt = p.target_text.toLowerCase();
  const own = seedLegoTexts.get(p.seed_number) || new Set();
  for (const ml of mLegos) {
    if (ml.seed_number <= p.seed_number) continue;  // already introduced
    const chunk = ml.target_text.toLowerCase().trim();
    if (own.has(chunk)) continue;  // skip self-matches
    const escaped = chunk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Word boundary: before chunk = start/space/punct; after chunk = end/space/punct
    const re = new RegExp('(?:^|\\s|[\"\\\',.¿¡])' + escaped + '(?:$|\\s|[\"\\\',.?!])', 'i');
    if (re.test(pt)) {
      chunkViolations.push({ id: p.id, seed: p.seed_number, chunk: ml.target_text, introSeed: ml.seed_number });
      break;  // one violation per phrase
    }
  }
}
```

**Filter by English-side novelty before acting.** Most chunk violations are "grammar-y" (the target chunk recombined from known words, like `ich habe` used early even though `ich` and `habe` are known). The ones worth deleting are those where the KNOWN TEXT also introduces a new English concept — the learner is confused both sides.

```javascript
const catA = chunkViolations.filter(v => {
  const phrase = phrases.find(p => p.id === v.id);
  const knownWords = tokenize(phrase.known_text);
  const knownNow = cumKnown.get(v.seed);
  return knownWords.some(w => !knownNow.has(w));
});
```

Report: count (A vs B) + top chunks by frequency + sample Cat A violations.
Action:
- **Category A (new English + early chunk)**: delete. These confuse the learner on both sides.
- **Category B (all English known, just chunk reuse)**: keep unless the chunk is an idiomatic unit the learner really needs to be introduced to first (judgment call).

#### Check 13: Capitalisation consistency

Two sub-checks. Case-only duplicates are clear bugs; first-letter outliers are usually bugs but occasionally false positives (e.g., a phrase starting with a proper noun).

**13a. Case-only duplicates** — two phrases or LEGOs with the same text but different case. Nearly always a data corruption bug.

```javascript
function groupByLower(items, field) {
  const m = new Map();
  for (const it of items) {
    const key = (it[field] || '').toLowerCase().trim();
    if (!key) continue;
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(it);
  }
  return m;
}

function caseOnlyDupes(items, field) {
  const out = [];
  for (const [key, group] of groupByLower(items, field)) {
    if (group.length < 2) continue;
    const variants = new Set(group.map(g => g[field]));
    if (variants.size > 1) {
      out.push({ key, variants: [...variants], ids: group.map(g => g.id || `${g.seed_number}/${g.lego_index}`) });
    }
  }
  return out;
}

const phraseKnownCaseDupes = caseOnlyDupes(phrases, 'known_text');
const phraseTargetCaseDupes = caseOnlyDupes(phrases, 'target_text');
```

**13b. First-letter outliers** — determine the dominant first-letter case across phrases and flag the minority.

```javascript
function firstLetterStats(items, field) {
  let upper = 0, lower = 0;
  for (const it of items) {
    const t = (it[field] || '').trim();
    const first = [...t][0]; // handle multi-byte first char
    if (!first) continue;
    if (first === first.toUpperCase() && first !== first.toLowerCase()) upper++;
    else if (first === first.toLowerCase() && first !== first.toUpperCase()) lower++;
  }
  return { upper, lower, dominant: upper >= lower ? 'upper' : 'lower' };
}

function firstLetterOutliers(items, field, dominant) {
  return items.filter(it => {
    const t = (it[field] || '').trim();
    const first = [...t][0];
    if (!first || first === first.toUpperCase() && first === first.toLowerCase()) return false;
    const isUpper = first === first.toUpperCase() && first !== first.toLowerCase();
    return (dominant === 'upper' && !isUpper) || (dominant === 'lower' && isUpper);
  });
}

const knownStats = firstLetterStats(phrases, 'known_text');
const targetStats = firstLetterStats(phrases, 'target_text');
// Only flag outliers if dominance is strong (>80%)
const knownOutliers = Math.max(knownStats.upper, knownStats.lower) / (knownStats.upper + knownStats.lower) > 0.8
  ? firstLetterOutliers(phrases, 'known_text', knownStats.dominant) : [];
const targetOutliers = Math.max(targetStats.upper, targetStats.lower) / (targetStats.upper + targetStats.lower) > 0.8
  ? firstLetterOutliers(phrases, 'target_text', targetStats.dominant) : [];
```

Note: Skip outlier flagging for languages where initial-capital is grammatically required (e.g., German sentences starting with a noun) — or accept the noise and let the user judge. For `deu` target_text, initial capital is the norm only for sentence-start, so the outlier logic still works course-wide.

Report:
- Case-only duplicates: each with both variants and phrase IDs
- First-letter outliers: count + 10 samples (suppress if dominance < 80%)

Action: For case-only dupes, pick the dominant case and update the outlier. For outliers, bulk-update to match dominant convention (unless it's a proper noun case).

#### Check 14: Missing question marks

Direct questions must end with `?`. Spanish also requires opening `¿`.

```javascript
const QUESTION_STARTERS = {
  eng: /^(what|where|when|why|who|which|whose|how|can|could|will|would|do|does|did|is|are|was|were|am|have|has|had|should|shall|may|might|must)\b/i,
  spa: /^(qué|cómo|cuándo|dónde|por qué|quién|cuál|cuáles|cuánto|cuánta|cuántos|cuántas|puedes|podrías|puedo|hay)\b/i,
  fra: /^(qu'|que|qui|où|quand|comment|pourquoi|quel|quelle|quels|quelles|est-ce|peux-tu|peut-on|peux|y a-t-il)\b/i,
  ita: /^(che|cosa|come|dove|quando|perché|chi|quale|quali|quanto|quanti|quante|puoi|potresti)\b/i,
  por: /^(o que|que|como|onde|quando|por que|quem|qual|quais|quanto|quantas|quantos|você|posso)\b/i,
  deu: /^(was|wo|wann|warum|wer|welche|welches|welcher|wie|kannst|bist|ist|hast|hat|habt|könntest|würdest|darf)\b/i,
  cym: /^(beth|ble|pryd|pam|pwy|pa|sut|oes|ydw|ydy|wyt|oeddwn)\b/i,
};

// Subordinate-clause patterns: question word + subject is a subordinate clause,
// NOT a direct question. Direct questions have subject-verb inversion
// ("what IS he doing?" vs subordinate "what HE is doing").
const SUBORDINATE_STARTERS = {
  eng: /^(what|where|when|why|who|which|whose|how)\s+(i|you|we|they|he|she|it|the|a|an|some|my|your|his|her|its|our|their|someone|somebody|anyone|anybody|everyone|everybody|no one|nobody|nothing|something|anything|everything|people|things)\b/i,
  por: /^(o que|que|quando|onde|como|por que|quem)\s+(eu|tu|você|vocês|ele|ela|nós|eles|elas|o|a|os|as|um|uma|uns|umas|alguém|todos|ninguém|algo|tudo|nada|pessoas|gente)\b/i,
  spa: /^(qué|cómo|cuándo|dónde|por qué|quién)\s+(yo|tú|usted|ustedes|él|ella|nosotros|vosotros|ellos|ellas|el|la|los|las|un|una|unos|unas|alguien|todos|nadie|algo|todo|nada|gente)\b/i,
  ita: /^(che|cosa|come|dove|quando|perché|chi)\s+(io|tu|lei|lui|noi|voi|loro|il|la|i|le|l'|un|una|qualcuno|tutti|nessuno|qualcosa|tutto|niente|gente)\b/i,
  fra: /^(qu'|que|qui|où|quand|comment|pourquoi)\s+(je|tu|il|elle|on|nous|vous|ils|elles|le|la|les|l'|un|une|des|quelqu'un|tout|personne|quelque chose|rien|gens)\b/i,
  deu: /^(was|wo|wann|warum|wer|wie)\s+(ich|du|er|sie|es|wir|ihr|sie|der|die|das|den|dem|ein|eine|einen|jemand|niemand|alle|etwas|nichts|leute)\b/i,
};

const endsWithQmark = (t) => /[?？]\s*$/.test((t || '').trim());
const startsSpanishQmark = (t) => /^\s*¿/.test(t || '');

// Infinitive-after-wh patterns: "how to say", "what to do", "where to go"
// are infinitive/gerund constructions, not questions.
const INFINITIVE_STARTERS = {
  eng: /^(what|where|when|why|who|how|whose|which)\s+to\s+\w/i,
  por: /^(o que|que|como|onde|quando|por que|quem)\s+\w+r\b/i, // ends with infinitive -ar/-er/-ir
};

function questionNeedsMark(text, lang) {
  if (!text) return false;
  const rx = QUESTION_STARTERS[lang];
  if (!rx) return false;
  const trimmed = text.trim();
  if (!rx.test(trimmed)) return false;
  // Skip very short fragments — bare LEGO components like "why" / "how"
  // aren't questions, they're vocabulary being introduced.
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 3) return false;
  // Exclude subordinate-clause patterns (wh-word + subject = not a question)
  const sub = SUBORDINATE_STARTERS[lang];
  if (sub && sub.test(trimmed)) return false;
  // Exclude infinitive constructions (wh-word + "to" + verb)
  const inf = INFINITIVE_STARTERS[lang];
  if (inf && inf.test(trimmed)) return false;
  return !endsWithQmark(text);
}

// Require BOTH sides to look like questions to avoid false positives.
// Question starters like "when", "que", "what" also appear in subordinate clauses:
//   "when we learn, it changes everything" (eng subordinate)
//   "que eu podia fazer" = "that I could do" (por subordinate)
// Real direct questions have question-starter on BOTH sides.
const missingQmark = phrases.filter(p => {
  const knownIsQ = questionNeedsMark(p.known_text, course.known_lang);
  const targetIsQ = questionNeedsMark(p.target_text, course.target_lang);
  return knownIsQ && targetIsQ;
});

// Spanish-specific: missing opening ¿ (when phrase already has closing ?)
const missingSpanishOpen = [];
for (const p of phrases) {
  const lang = course.known_lang === 'spa' ? 'known' : course.target_lang === 'spa' ? 'target' : null;
  if (!lang) continue;
  const text = p[`${lang}_text`];
  if (endsWithQmark(text) && !startsSpanishQmark(text)) missingSpanishOpen.push(p);
}
```

Note: Indirect questions ("I wonder what...", "tell me where...") do NOT start with a question starter and won't be flagged. That's correct — they don't need `?`.

Note: The "both sides must look like questions" requirement is strict but necessary — on por_br_for_eng this cut false positives from 208 (mostly subordinate clauses) to a handful of real ones. If a finding seems to be missed, it's likely because one side is an indirect question — which is fine.

Report: count by field (known vs target) + 10 samples + Spanish ¿ violations separately.
Action: Bulk-append `?` (and prepend `¿` for Spanish). This is an audio-affecting change — null the known_audio_id / target_audio_id on modified phrases for regen.

#### Check 15: Identical known_text and target_text

Data corruption: target text is literally the same string as known text (after trim + lowercase). Legitimate only for a tiny cognate allowlist per language pair.

```javascript
// Cognate allowlist — single-word cognates that are legitimately identical.
// Pronouns like "me" and articles like "a"/"o" are also included where
// the written form happens to match between English and the target language,
// even if the pronunciation differs.
const COGNATES = {
  'eng|spa': new Set(['idea','ideas','bar','total','hotel','email','emails','radio','internet','taxi','me','yoga','pizza']),
  'eng|deu': new Set(['bar','email','hotel','internet','okay','ok','taxi']),
  'eng|por': new Set(['total','hotel','emails','internet','taxi','radio','um','yoga','me']),
  'eng|ita': new Set(['email','hotel','internet','okay','ok','taxi','radio','pizza','me']),
  'eng|fra': new Set(['taxi','hotel','email','internet']),
};

function pairKey(a, b) {
  const langs = [a, b].sort();
  return langs.join('|');
}

function isCognate(text, knownLang, targetLang) {
  const key = pairKey(knownLang, targetLang);
  const allow = COGNATES[key];
  if (!allow) return false;
  const normalized = text.toLowerCase().trim().replace(/[.,!?¿¡]/g, '');
  return allow.has(normalized);
}

function identicalPairs(items) {
  return items.filter(it => {
    const k = (it.known_text || '').toLowerCase().trim();
    const t = (it.target_text || '').toLowerCase().trim();
    if (!k || !t || k !== t) return false;
    if (isCognate(k, course.known_lang, course.target_lang)) return false;
    return true;
  });
}

const identicalPhrases = identicalPairs(phrases);
const identicalLegos = identicalPairs(legos);
```

Report: count + all matches (usually rare).
Action: Flag seeds for rebuild if LEGO-level — the target_text is missing. For phrase-level, delete or fix based on context.

#### Check 16: Underpopulated LEGOs

LEGOs that are missing practice phrases. A healthy LEGO has at least 1 build phrase and typically ≥2 use phrases. Multi-word M-type LEGOs also need components.

```javascript
// Count phrases per LEGO by role
const perLego = new Map();
for (const p of phrases) {
  const key = `${p.seed_number}/${p.lego_index}`;
  if (!perLego.has(key)) perLego.set(key, { component: 0, build: 0, use: 0 });
  perLego.get(key)[p.phrase_role]++;
}

const underpopulated = [];
for (const l of legos) {
  // Only new LEGOs need their own phrases. Reused LEGOs (is_new=false)
  // rely on the phrases at their original introduction seed.
  if (l.is_new === false) continue;
  const key = `${l.seed_number}/${l.lego_index}`;
  const counts = perLego.get(key) || { component: 0, build: 0, use: 0 };
  const targetWords = (l.target_text || '').trim().split(/\s+/).filter(w => w.length > 0);
  const likelyM = targetWords.length >= 2;
  const issues = [];
  if (counts.build === 0) issues.push('0 build phrases');
  if (likelyM && counts.component === 0) issues.push('0 components (multi-word target, expected M-type)');
  if (counts.use < 2) issues.push(`${counts.use} use phrases (< 2)`);
  if (issues.length) {
    underpopulated.push({
      lego: `S${String(l.seed_number).padStart(4,'0')}L${String(l.lego_index).padStart(2,'0')}`,
      known: l.known_text,
      target: l.target_text,
      counts,
      issues
    });
  }
}
```

Report: count grouped by severity — "empty" (0 build AND 0 use), "no builds", "few uses". Sample 10 of each.
Action: Either generate more phrases via course builder, or accept the LEGO is intentionally sparse (rare — usually a builder bug).

#### Check 17: Under-spread LEGOs (orphans)

New LEGOs whose target chunk never (or rarely) appears in practice phrases outside their own
seed. Orphaned chunks get no long-range spaced recall — the hand-crafted Welsh originals sit
at 6–9% orphans; machine-built courses left unchecked sit at 20–55% (fleet scan 2026-07-27).

Run the committed analyzer (don't reimplement — it handles Unicode and unspaced scripts):

```bash
node tools/backfill-spread/analyze.cjs {courseCode} --max-uses 1
# add --cjk for unspaced scripts (jpn/zho/yue/hak/nan/tha…) or the numbers are inflated artifacts
```

Report: the outside-use distribution line plus orphan percentage of new LEGOs.
Thresholds: **<10% good · 10–25% flag as improvement backlog · >25% recommend a spread-backfill
pass** (method + agent brief template: `docs/course-optimization/lego-spread-backfill-playbook.md`;
validate submissions with `tools/backfill-spread/validate.cjs`).
This check is informational for scan purposes — it never blocks a build, and fixing it is a
separate agent-run project, not a scan-time edit.

### Step 4: Language spot-check with Haiku

For EVERY seed in the course, pick 1 random phrase and ask Haiku to verify the languages are correct. This catches subtle issues regex misses (e.g., Portuguese words that look valid in English).

Run this with `claude --print --model haiku`:

```
For each batch of ~20 seeds, send a single Haiku prompt:

"You are checking whether text is written in the CORRECT LANGUAGE — nothing else. Do NOT judge grammar, spelling, naturalness, or meaning. Only check: is the known text actually in {KNOWN_LANGUAGE}? Is the target text actually in {TARGET_LANGUAGE}?

For example, if known should be English but contains Japanese characters, that's WRONG. If known is English with a grammar mistake, that's FINE (correct language, bad grammar — not your problem).

Reply with ONLY the numbers of any pairs where the WRONG LANGUAGE is used, or ALL OK if all pairs use the correct languages.

1. known: {known_text} | target: {target_text}
2. known: {known_text} | target: {target_text}
..."
```

Batch them to keep Haiku calls reasonable (~15 calls for a 300-seed course).

Report: any flagged seed numbers + the phrases Haiku flagged.

**Important:** Unset `ANTHROPIC_API_KEY` before spawning `claude --print` to avoid billing the API key:

```javascript
const { execSync } = require('child_process');
const result = execSync('claude --print --model haiku', {
  input: prompt,
  env: { ...process.env, ANTHROPIC_API_KEY: '' }
});
```

### Step 5: Print report

Format:

```
=== SCAN REPORT: {course_code} ===
{display_name}
{lego_count} LEGOs, {phrase_count} phrases scanned

[1] PARENTHETICALS IN LEGO KNOWN_TEXT: {count}
    {5 samples}
    Action: Strip parentheticals from known_text

[2] SLASHES IN LEGO KNOWN_TEXT: {count}
    {5 samples}
    Action: Resolve slashes (pick first option or check phrase usage)

[3] WRONG LANGUAGE IN KNOWN_TEXT: {count} ({seed range})
    {5 samples}
    Action: Flag affected seeds for rebuild

[4] WRONG LANGUAGE IN TARGET_TEXT: {count}
    {5 samples}
    Action: Flag affected seeds for rebuild

[5] MULTI-SENTENCE PHRASES: {count}
    {all matches}
    Action: Delete dialogue phrases, keep tag questions / connectors

[6] UNPRONOUNCEABLE PHRASES: {count}
    {all matches}
    Action: Delete

[7] SPEECH-MARK WRAPPED: {count}
    {5 samples}
    Action: Strip wrapping quotes (also from course_audio.text)

[8] TRAILING PERIODS: {count}
    {5 samples}
    Action: Strip trailing "."

[9] LOWERCASE "I" IN ENGLISH: {count}
    {5 samples}
    Action: Bulk replace \bi\b with I

[10] ZUT CONFLICTS: {count}
     {each conflict with both targets}
     Action: See memory/methodology-zut-resolution.md

[11] VOCAB ORDERING (word-level, known side): {count}
     {10 samples with the new English words}
     Action: Delete violating phrases (case-by-case for mild cases)

[12] VOCAB ORDERING (chunk-level, target): {total} ({catA} Cat A)
     {top chunks + Cat A samples}
     Action: Delete Cat A; Cat B is judgment

[13a] CASE-ONLY DUPLICATES: {count}
      {each dupe with variants}
      Action: Pick dominant case, update outliers

[13b] FIRST-LETTER CASE OUTLIERS: {count} (dominant: {upper/lower}, {X}%)
      {10 samples}
      Action: Bulk-update to dominant convention

[14] MISSING QUESTION MARKS: {count} ({spanish_open} missing ¿)
     {10 samples}
     Action: Bulk-append "?" (and prepend "¿" for Spanish), null audio_ids for regen

[15] IDENTICAL KNOWN/TARGET: {count} ({legos} LEGOs, {phrases} phrases)
     {all matches}
     Action: Flag seeds for rebuild (LEGO-level) or delete/fix (phrase-level)

[16] UNDERPOPULATED LEGOs: {count} ({empty} empty, {noBuilds} no-builds, {fewUses} few-uses)
     {10 samples of each}
     Action: Generate more phrases or accept

[17a] LLEVAR + GERUND (spa only): {count} ({noTime} NO_TIME, {wrongOrder} WRONG_ORDER)
      {10 samples grouped by type}
      Action: WRONG_ORDER — swap so time sits between llevar and gerund. NO_TIME — flag for builder.

[17e] EUROPEAN PT — você (por non-_br only): {count}
      {10 samples}
      Action: Drop você (verb already encodes 2nd person), null target audio for regen.

[17f] PT→EN PRONOUN ENCODING (eng_for_por only): {count}
      {10 samples — pt verb + missing-I english}
      Action: Insert "I" into the English target, null target audio for regen.

[18] PRESENTATION/TEXT DRIFT: {count}
     coverage: {parsed}/{clips} clips parsed ({pct}%){, N UNPARSED — not judged}
     {all mismatches with LEGO=... ANNOUNCED=...}
     Action: Regenerate presentation audio with correct text; null presentation_audio_id first.
     ⚠️ Coverage below 99% = FAILED run, not a clean course. Never report [18] without it.

[19] DISTINCTION COVERAGE: {axes and their DIRECTION}
     [A1] known richer, {n} proposals passing the reach test, {n} NOT drill candidates
          coverage {classified}/{carrying}, attested {n} (calibration), rejected {n} by rule
     [A2] {n} reachable collapses · {n} not-drill-pairs ({n} in sentences) · {n} flagged
     [B1] target richer: {n} under-determined, other form taught {n} times, {n} prompts cued
     [B2] {n} prompts taught with two related answers
     Action: A → author the counterpart and drill it. B → disambiguate, split, or confirm
     the ambiguity is deliberate. NEVER give one direction's remedy to the other's finding.
     ⚠️ Zero attested on a course known to have some = broken run, not a clean course.
     ⚠️ Direction B findings are candidates, never asserted defects.

LANGUAGE SPOT-CHECK ({seed_count} seeds): {PASS/FAIL}
  {any flagged seeds}

SUMMARY: {total_issues} issues across {categories} categories
READINESS GATE: {READY ✓ if all deterministic checks zero, NOT READY ✗ otherwise}
```

## Remediation Guide

After the scan, the user will decide what to fix. Here's how to handle each issue type:

### Recommended fix order

1. Strip parentheticals
2. Resolve slashes
3. Strip wrapping speech marks
4. Strip trailing periods
5. Fix lowercase I
6. Fix capitalisation outliers (case-only dupes first, then outliers)
7. Add missing question marks (and Spanish `¿`)
8. Fix identical known/target (flag seeds for rebuild)
9. **Re-scan for ZUT conflicts** (stripping parens/slashes can reveal hidden duplicates)
10. Resolve ZUT conflicts
11. Delete multi-sentence phrases
12. Delete unpronounceable phrases
13. Delete Cat A vocab ordering violations (word-level, then chunk-level)
14. Backfill underpopulated LEGOs (or accept)
15. Report under-spread LEGO percentage (Check 17 — informational; a >25% result recommends a
    separate spread-backfill project, never a scan-time fix)

**Why this order matters:**
- Strip-then-rescan: parens/slashes hide ZUT conflicts — strip before resolving.
- Capitalisation before `?`: adding `?` to "Is this correct" is fine, but if the phrase is also case-inconsistent you fix both in one update.
- Identical known/target before ZUT: seeds flagged for rebuild will be regenerated and may resolve other issues for free.
- Underpopulated last: you may delete phrases at steps 11-13 that affect the count.

### Fixing parentheticals

Safe to bulk-strip with regex: `.replace(/\s*\([^)]*\)\s*/g, ' ').trim()`

After stripping, check for artifacts — sometimes the parenthetical was between a slash and trailing words, leaving things like `"before /before that"`. Do a follow-up check for ` /` or `/ ` patterns.

**Important:** After stripping, immediately re-run the ZUT conflict check. Two LEGOs with `"it was (imperfect)"` and `"it was (preterite)"` both become `"it was"` after stripping — that's a new ZUT conflict.

### Fixing slashes

**Do NOT blindly pick the first option.** Handle by category:

**he/she, him/her, his/her slashes:** Check the SEED sentence to see which pronoun it uses. Query:
```javascript
const { data: seed } = await supabase.from('course_seeds')
  .select('known_text').eq('course_code', CODE).eq('seed_number', N);
```
If the seed says "she wanted..." → pick "she". If neutral or ambiguous → pick "he" (first option).

**Synonym slashes** (e.g., `happy / content`, `so far / until now`): Pick the first option — it's usually the more common/natural word. If you want to be thorough, check which option appears more in the course's phrases.

**word/word + trailing words** (e.g., `he/she wants`): Keep the first word PLUS the trailing words → `"he wants"`. The regex pattern is: if `match(/^(\S+)\/(\S+)\s+(.+)$/)` → use `match[1] + ' ' + match[3]`.

**After fixing slashes**, verify with: `legos.filter(l => l.known_text.includes('/'))` — should be 0.

### Fixing wrong language

If wrong language is detected in a contiguous seed range (e.g., seeds 162+ all have English instead of Japanese), the builder lost track of the known language mid-build. These seeds need to be **flagged for rebuild** — you can't just translate the known_text because the phrases will have the same problem.

```javascript
await supabase.from('course_seeds')
  .update({ flagged_at: new Date().toISOString() })
  .eq('course_code', CODE).in('seed_number', affectedSeeds);
```

### Fixing multi-sentence phrases

**Delete these types:**
- **Dialogue**: Two different speakers. E.g., `"That woman is my friend. Of course you can ask her"` — this is two people talking. Delete.
- **Double questions**: Two unrelated questions joined. E.g., `"What's that? Can you explain?"` — two separate speech acts. Delete.

**Keep these types:**
- **Tag questions**: `"he told you, didn't he?"`, `"that's good, isn't it?"`, `"you like it, right?"` — these are single natural utterances with a confirmation tag. Keep.
- **Rhetorical follow-ups**: `"I like that blue thing, what is it?"` — natural spoken pattern where the second part extends the first. Keep.
- **"así que" / "so" connectors**: `"so are you happy with how things are going?"` — the `¿` appearing mid-string is because Spanish opens questions with `¿`, but it's one sentence. Keep.
- **"before you go, can you..."**: Subordinate clause + main clause. Single utterance. Keep.

**Rule of thumb**: If you could naturally say it in one breath as one thought → keep. If it's two separate thoughts or two people → delete.

### Fixing lowercase "I" (English-specific)

Only applies when English is the known or target language. Bulk replace in the English text column (known_text or target_text depending on which is English):

```javascript
newText = text.replace(/\bi\b/g, 'I').replace(/\bi'/g, "I'");
```

This catches `i` as standalone and `i'm`, `i've`, `i'd`, `i'll`.

### Fixing ZUT conflicts

See `memory/methodology-zut-resolution.md` for the full pattern catalogue. Summary:

**For each conflict, present the user with:**
1. The two LEGOs (known_text, target_text, seed context)
2. Their phrases (to check what context they're used in)
3. A suggested fix

**Resolution approaches (in preference order):**

1. **Expand the LEGO** to include natural context from the seed. Both known AND target must be expanded. Make it M-type with the original word as a component. Check that the expansion doesn't create a NEW conflict, and that all vocab in the expansion is already introduced.

2. **Set is_new=false** if the word is already taught inside a larger M-type LEGO (e.g., `que` is a component of `pienso que`).

3. **Rename** to a more accurate English gloss (e.g., `"I had"` → `"I took"` for `tomé`).

4. **Leave it** if it's a gender pair (amigo/amiga) or person variation (irme/irte) where either answer is correct.

**After each fix, check:**
- Does the seed still have at least one is_new LEGO? If not, set the seed to draft.
- Did the expansion absorb another LEGO in the same seed? Set that one to is_new=false.
- Does the expanded LEGO tile into the seed target_text?

### Fixing capitalisation

**Case-only duplicates (13a)**: always a clear bug. For each pair/group:
- Count each case variant's occurrences across the full course (not just the flagged pair) to see which is dominant.
- Update the outlier(s) to match dominant. E.g., if "I want" appears 120× and "i want" appears 3×, update the 3 lowercase ones.
- Null `known_audio_id` / `target1_audio_id` on changed phrases — audio is case-insensitive to TTS but the `text_normalized` column may have a case mismatch.

**First-letter outliers (13b)**: bulk update only when dominance is strong (>80%) and the outliers aren't proper nouns.
```javascript
for (const p of outliers) {
  const text = p.known_text;
  const fixed = dominant === 'upper'
    ? text.charAt(0).toUpperCase() + text.slice(1)
    : text.charAt(0).toLowerCase() + text.slice(1);
  await supabase.from('course_practice_phrases')
    .update({ known_text: fixed, known_audio_id: null }).eq('id', p.id);
}
```

**Languages with initial-cap grammar (German nouns, sentence starts)**: if the target language is German, skip target-side outlier correction — German noun-initial capitals are grammatical, not style.

### Fixing missing question marks

Bulk-append `?` to phrases that match the question-starter regex but don't end with `?`. For Spanish, also prepend `¿`.

```javascript
for (const p of missingQmark) {
  const updates = {};
  if (questionNeedsMark(p.known_text, course.known_lang)) {
    updates.known_text = p.known_text.trim() + '?';
    updates.known_audio_id = null;
  }
  if (questionNeedsMark(p.target_text, course.target_lang)) {
    let fixed = p.target_text.trim() + '?';
    if (course.target_lang === 'spa' && !fixed.startsWith('¿')) fixed = '¿' + fixed;
    updates.target_text = fixed;
    updates.target1_audio_id = null;
    updates.target2_audio_id = null;
  }
  await supabase.from('course_practice_phrases').update(updates).eq('id', p.id);
}
```

**Audio regen required** — `?` changes TTS intonation. Null audio_ids and let Phase 8 regenerate.

### Fixing identical known/target

Almost always indicates LEGO-level data corruption — the target translation is missing and the builder duplicated the known field. Fix by:

1. Flag the seed for rebuild (`flagged_at = now()`) so the course builder regenerates.
2. Or, if it's an isolated phrase (not LEGO), check surrounding context and either fix in-place or delete.

```javascript
const seedsToFlag = [...new Set(identicalLegos.map(l => l.seed_number))];
if (seedsToFlag.length) {
  await supabase.from('course_seeds')
    .update({ flagged_at: new Date().toISOString() })
    .eq('course_code', COURSE_CODE).in('seed_number', seedsToFlag);
}
```

**Don't auto-delete** — the issue is usually missing translation, not a wrong phrase. Rebuild is safer.

### Fixing underpopulated LEGOs

These are generation gaps, not corruptions — the builder missed components/builds/uses. Options:

1. **Run the course builder** on the specific LEGO via checkpoint-qa skill to add more phrases.
2. **Break a USE phrase down into BUILDs.** When a LEGO has plenty of USE phrases but few BUILDs, construct BUILDs by trimming a USE to a simpler, more atomic fragment. A USE like "someone said he wanted to tell you" can seed BUILDs "someone said" and "he said he wanted". The fragments aren't always perfect but they populate the pedagogical step between bare vocab and full USE without an LLM call; the build team can polish later.
3. **Accept as intentional** — rare, but some LEGOs are sparse on purpose (e.g., highly specific vocab that doesn't recombine).

Summary report by severity:
- **Empty (0 build + 0 use)**: must rebuild. These LEGOs provide no practice at all.
- **No builds (0 build, some uses)**: option 2 (break a USE down into BUILDs) is usually the fastest fix — you already have the material. Option 1 if there are no USEs to draw from.
- **Few uses (<2 use)**: nice to have more, but not blocking if the LEGO is simple.

### Fixing LEGO ordering (when many phrases need the following LEGO to be grammatical)

**Detection cue**: an early LEGO in a seed has multiple practice phrases that feel ungrammatical or incomplete on their own, and what makes them complete is vocabulary from a LATER LEGO in the same seed. The builder decomposed the seed in the wrong order — the LEGOs need to trade places so the prerequisite vocabulary is introduced first.

**How to spot this:**
- The LEGO's BUILD and USE phrases keep showing up as Cat A vocab-ordering violations (Check 11), but the "new" words aren't unintroduced — they're in the *next* LEGO of the same seed.
- The Step 7 learner simulation flags a cluster of 🚨 Problematic in one seed where the learner attempts LEGO N's phrases but needs LEGO N+1's words.
- Step 6b category LLM reviewer flags multiple phrases in one LEGO as "awkward" or "translation mismatch" because the phrase is a fragment waiting for more.
- In the seed's own LEGO list, LEGO N has a short/atomic known_text and its phrases all quote the longer LEGO N+1 content.

**Fix — reorder then repopulate:**

1. **Reorder the LEGOs within the seed.** Swap `lego_index` so the prerequisite LEGO comes first. If only two need swapping, it's a 2-row update. Be careful: `lego_index` is part of the phrase_id, so touching it while phrases exist is messy.
2. **Delete the affected phrases.** Since their IDs depend on the LEGO index, and they're ungrammatical anyway, remove them rather than try to rewrite.
3. **Flag the seed** (`flagged_at = now()`) so the build team picks it up.
4. **Repopulate via the build team**. With the corrected LEGO order, the builder now has the right prerequisites at each step and produces grammatical phrases. The standard flow — flagged seed → build-team rebuild — handles this cleanly; no special brief needed.

Script sketch:

\`\`\`javascript
// Swap LEGO indices within a seed
const newIdxA = oldIdxB, newIdxB = oldIdxA;
// Delete affected phrases (both LEGOs)
await supabase.from('course_practice_phrases').delete()
  .eq('course_code', CODE).eq('seed_number', SEED).in('lego_index', [oldIdxA, oldIdxB]);
// Use a placeholder to avoid the unique constraint during the swap
await supabase.from('course_legos').update({ lego_index: 999 })
  .eq('course_code', CODE).eq('seed_number', SEED).eq('lego_index', oldIdxA);
await supabase.from('course_legos').update({ lego_index: newIdxB })
  .eq('course_code', CODE).eq('seed_number', SEED).eq('lego_index', oldIdxB);
await supabase.from('course_legos').update({ lego_index: newIdxA })
  .eq('course_code', CODE).eq('seed_number', SEED).eq('lego_index', 999);
// Null presentation audio (LEGO text may shift depending on component order)
// Flag the seed for rebuild
await supabase.from('course_seeds').update({ flagged_at: new Date().toISOString() })
  .eq('course_code', CODE).eq('seed_number', SEED);
\`\`\`

**Don't try to preserve phrases across a reorder.** A phrase written against the wrong order is very rarely salvageable — the wording assumes one decomposition, the new order needs different framing. Let the builder start clean.

**If the reorder isn't straightforward** (e.g. three LEGOs that should be a different structure entirely, or the decomposition itself is wrong regardless of order), just flag the seed and let the builder redecompose from scratch.

### Fixing language-specific pattern violations

See Check 17 below. Each sub-check is independent of the others — run only the ones relevant to the course's target (or known) language.

#### Check 17: Language-specific patterns

These checks encode grammar rules that generic checks can't see. Only the sub-check matching the course's target language is meaningful — the others are no-ops.

##### 17a. Spanish: `llevar + gerund` time duration AND word order

Pattern `llevo aprendiendo` / `llevas hablando` has TWO failure modes:

1. **NO_TIME** — no explicit time duration anywhere → incomplete construction (means "spending learning"). Needs a time: `llevo dos meses aprendiendo`, `cuánto tiempo llevas hablando`.
2. **WRONG_ORDER** — time duration is *after* the gerund: `Llevo aprendiendo X una semana` / `Llevo aprendiendo todo el día`. The time duration must sit *between* `llevar` and the gerund: `Llevo una semana aprendiendo X`, `Llevo todo el día aprendiendo`.

Both produce learner-facing nonsense and must be flagged. (Discovered 2026-04-30 — Deborah's 2nd-pass review on spa_for_eng caught 11 WRONG_ORDER survivors after a narrow fix only swept S0038 L03.)

```javascript
// Run only when target_lang === 'spa' or known_lang === 'spa'
const LLEVAR_GERUND = /\bllev[oa]s?\s+(\w+ndo)\b/i;  // captures the gerund
const TIME_DURATION = /\b(cuánto tiempo|mucho tiempo|poco tiempo|un año|una hora|una semana|un mes|un día|todo el día|toda la semana|\d+\s+(años?|meses|semanas|días|horas|minutos)|m[aá]s o menos\s+\w+|algún tiempo|bastante tiempo|desde que\s+\w+|desde hace\s+\w+|hace\s+(un|una|\d+))\b/i;

const llevarViolations = [];
for (const p of phrases) {
  const text = course.target_lang === 'spa' ? p.target_text : (course.known_lang === 'spa' ? p.known_text : null);
  if (!text) continue;
  const llevarM = text.match(LLEVAR_GERUND);
  if (!llevarM) continue;
  const timeM = text.match(TIME_DURATION);
  if (!timeM) {
    llevarViolations.push({ phrase: p, type: 'NO_TIME', text });
    continue;
  }
  // Time exists. Where is it relative to the gerund?
  const gerundStart = llevarM.index + llevarM[0].length - llevarM[1].length;
  if (timeM.index > gerundStart) {
    llevarViolations.push({ phrase: p, type: 'WRONG_ORDER', text });
  }
}
```

Report: count grouped by `type`. NO_TIME and WRONG_ORDER both must be zero before a course is reviewer-ready.
Action:
- **WRONG_ORDER**: deterministic rewrite — swap so time sits between `llev[oa]s?` and the gerund. Null target1/target2 audio for regen.
- **NO_TIME**: needs build judgement (add a time duration that fits the meaning). Flag for builder/Kai, not for mechanical fix.

##### 17b. Italian: subjunctive required after `penso che` / `credo che`

After "penso che" or "credo che" (also "sembra che", "è possibile che"), the verb must be in the subjunctive mood. Indicative forms like `ha`, `è`, `può`, `deve`, `vuole`, `fa` are wrong.

```javascript
// Run only when target_lang === 'ita' or known_lang === 'ita'
// Common indicative 3sg/3pl that should be subjunctive after penso/credo che
const INDICATIVE_AFTER_CHE = /\b(pens[oa]|cred[oa]|sembra|è possibile)\s+che\s+(\w+\s+)?(ha|hanno|è|sono|può|possono|deve|devono|vuole|vogliono|fa|fanno|va|vanno|viene|vengono|sa|sanno|dice|dicono)\b/i;

const italianSubjunctiveViolations = phrases.filter(p => {
  const text = course.target_lang === 'ita' ? p.target_text : (course.known_lang === 'ita' ? p.known_text : null);
  if (!text) return false;
  return INDICATIVE_AFTER_CHE.test(text);
});
```

Report: count + samples with the offending indicative form highlighted.
Action: Replace indicative with subjunctive (ha→abbia, è→sia, può→possa, deve→debba, vuole→voglia, fa→faccia, va→vada, viene→venga, sa→sappia, dice→dica, hanno→abbiano, sono→siano, possono→possano, devono→debbano, vogliono→vogliano, fanno→facciano, vanno→vadano, vengono→vengano, sanno→sappiano, dicono→dicano).

See `memory/feedback_subjunctive_penso_che.md` for the underlying rule.

##### 17c. German: verb-final in subclauses

Subordinating conjunctions (weil, dass, wenn, ob, als, nachdem, bevor, während, damit, obwohl, falls, sobald) trigger verb-final word order. Regex can detect the clause boundary but can't reliably check verb placement — this is an LLM-only check.

```javascript
// Run only when target_lang === 'deu'. Flag candidates for manual or LLM review.
const SUBORDINATOR = /\b(weil|dass|wenn|ob|als|nachdem|bevor|während|damit|obwohl|falls|sobald)\b/i;

const germanSubordinateCandidates = phrases.filter(p => {
  if (course.target_lang !== 'deu') return false;
  return SUBORDINATOR.test(p.target_text);
});
```

Report: count. These are candidates, not violations — the regex can't tell which have wrong verb placement. Sample 10 and pass to Opus with the rule "the finite verb must be at the end of the subordinate clause". (Opus not Haiku/Sonnet for grammar judgement of this subtlety.)

Action: Flag for LLM check (Step 6) or Deborah's review.

##### 17d. Japanese: `ka` particle + `?` consistency

Japanese questions use the sentence-final particle `か` (ka). The app's convention is `ka?` or `ka？` — never `ka` alone for a direct question. Check consistency:

```javascript
// Run only when target_lang === 'jpn'.
const KA_NO_QMARK = /か\s*$/;      // ends with か but no ? (hidden after spaces)
const KA_WITH_QMARK = /か[?？]\s*$/;
const QMARK_NO_KA = /[^か][?？]\s*$/;

const kaNoQmark = phrases.filter(p => course.target_lang === 'jpn' && KA_NO_QMARK.test(p.target_text) && !KA_WITH_QMARK.test(p.target_text));
const qmarkNoKa = phrases.filter(p => course.target_lang === 'jpn' && QMARK_NO_KA.test(p.target_text));
```

Report: ka+? count, ka-only count, ?-only count. Whichever convention is dominant wins; the other is flagged.

Action: Bulk-append `?` to ka-only phrases, or strip `?` if ka-only is dominant. Null target audio for regen.

##### 17e. European Portuguese: ban Brazilian `você`

`você` is the standard 2nd-person address in Brazilian Portuguese, but in European Portuguese it's perceived as overly formal/distant — speakers normally drop the explicit pronoun (`fala inglês?` not `você fala inglês?`). Apply to *whichever side* of the course is European Portuguese (target for `_for_*`, known for `*_for_por`). (Discovered 2026-04-30 — Deborah's review of eng_for_por turned up 442 phrases.)

```javascript
// Apply when EITHER side is por without _br dialect.
// CRITICAL: only the SINGULAR "você" is the issue. The plural "vocês" is the standard
//   2pl form in EU PT and should NOT be flagged. (Earlier draft used /vocês?/ — false-positive on plurals.)
// IMPORTANT: \b doesn't work with non-ASCII letters in JS regex — \bvocê\b never matches.
//   Use Unicode property escapes with the /u flag.
const VOCE_SG = /(?<!\p{L})você(?!\p{L})/iu;
const cc = course.course_code;
const ptIsTarget = course.target_lang === 'por' && !/_br/.test(cc);
const ptIsKnown  = course.known_lang  === 'por' && !/_for_por_br/.test(cc);
const voceViolations = phrases.filter(p => {
  if (ptIsTarget && p.target_text && VOCE_SG.test(p.target_text)) return true;
  if (ptIsKnown  && p.known_text  && VOCE_SG.test(p.known_text))  return true;
  return false;
});
// Also scan course_seeds and course_legos for the same — these aren't usually in `phrases`.
```

Report: count + all matches.
Action: Drop `você` from the phrase (the verb conjugation already encodes 2nd person). Null the relevant audio side for regen. For sentences where `você` was load-bearing for disambiguation (e.g. when verb form is ambiguous between 1sg and 3sg), rewrite via build judgement.

##### 17f. Portuguese → English: 1sg verb in known but no "I" subject in target

Portuguese verbs encode the subject (`quero` = "I want", `vou` = "I'm going to", `tenho` = "I have"), so the explicit `eu` is usually dropped. Translators sometimes mirror this by dropping the English `I` too — but English requires an explicit subject. (Discovered 2026-04-30 — Deborah's review of eng_for_por.)

```javascript
// Run only when target_lang === 'eng' AND known_lang === 'por'
// NOTE: only include verbs that are unambiguously 1sg. Excluded:
//   - 'queria' / 'podia' / 'fazia' (imperfect — also 3sg)
//   - 'consigo' (homonym — 1sg of conseguir, also preposition "with you")
//   - 'fui' / 'foi' (preterite — also 3sg)
const PT_1SG = ['quero','vou','sou','sei','tenho','estou','gosto','preciso','sinto','penso','acredito','posso','devo','faço','digo','venho','vejo','tive','estive','vi'];
// Use Unicode-safe boundary on the right (\b doesn't match non-ASCII letters)
const PT_1SG_RE = new RegExp(`(?:^|[\\s¿«"'“])(${PT_1SG.join('|')})(?!\\p{L})`, 'iu');
const HAS_I = /(?:^|\s)(I\b|I')/;  // capital I — English subject pronoun
const isPtToEn = course.target_lang === 'eng' && course.known_lang === 'por';

const ptPronounViolations = isPtToEn
  ? phrases.filter(p => {
      if (!p.known_text || !p.target_text) return false;
      if (!PT_1SG_RE.test(p.known_text)) return false;
      return !HAS_I.test(p.target_text);
    })
  : [];
```

Report: count + samples (`pt: …  en: …`).
Action: Insert "I" into the English target so it matches the Portuguese subject. Null known/target audio for regen. The Portuguese side stays as-is (dropped `eu` is correct).

##### Adding new language patterns

When a new language-specific pattern is found during content check, add it here with:
1. The language code and rule name
2. The detection regex
3. Any exclusion regex (e.g., `TIME_DURATION` for llevar)
4. The fix action (mechanical / LLM / flag-for-rebuild)

#### Check 18: LEGO presentation/text drift

Each LEGO has a `presentation_audio_id` whose clip announces the LEGO's `known_text` before speaking the target. The announced phrase MUST equal the LEGO's `known_text`. When they drift, the learner hears the presenter announce one phrase and then sees a different phrase on screen — extremely confusing.

Failure patterns observed:
- **Swap**: L01 announces L02's known_text and L02 announces L01's. Likely a generation bug where presentation prompts iterated in the wrong order.
- **Synonym drift**: presentation says "about" but the LEGO is "more or less" — usually because the LEGO's known_text was edited but the presentation audio wasn't regenerated.
- **Bracket drift**: the LEGO reads `short`, the clip speaks `short (adjective)` — the authored text was cleaned but the narration was not re-rendered.

(Discovered 2026-04-30 — Deborah caught S0033 L01/L02 swap and S0038 L02 synonym drift on spa_for_eng.)

**Do not hand-roll the matcher.** Run the check:

```bash
node tools/check-presentation-drift.cjs <course_code>          # human-readable, exits 1 on drift
node tools/check-presentation-drift.cjs <course_code> --json    # machine-readable
node tools/check-presentation-drift.cjs --all                   # whole estate
```

Its verdict logic lives in `tools/presentation-drift.cjs` (`matchesKnown`) if you need it programmatically.

⚠️ **Why the old inline snippet was removed (2026-08-18).** This check used to extract the announced phrase with one English template, `/^The \w+ for:\s+'([\s\S]*?)'\s*,\s*as in/i`, and `continue`d past anything that didn't match. Measured live, that template matched **21,342 of 72,063** presentation clips and silently skipped **50,721**. Against a known set of 229 drifted rows it flagged **2**. It reported clean because it was not looking. The estate's narration is not one template: most courses say `, is:` rather than `, as in`; Dutch and the Indic courses use em-dashes; the known side is often not English (Japanese, Chinese, Korean, Hindi, Tamil, Spanish, German narration all exist); the legacy Welsh courses use `<src>`/`<tgt>` markup; and some Dutch clips wrap the phrase in SSML `<phoneme>`. The replacement parses **delimiters, not sentences**, and covers 72,058 of 72,063 clips (99.99%).

**Read the coverage line, not just the count.** The tool always prints `coverage: parsed/clips`. Anything it cannot parse is reported as UNPARSED and counted — never dropped. A run below 99% coverage exits non-zero and is a FAILED run, not a clean course. That is the whole point: a detector you have not seen find a known-present defect is not evidence.

Report: count + every mismatch, shown as `LEGO=...  ANNOUNCED=...` so the swap pattern is obvious at a glance.
Action: regenerate the presentation audio with the correct text. For swapped pairs, regen both. Set `presentation_audio_id` to null on the LEGO row before re-running presentation generation, so it doesn't try to reuse the wrong audio. Note that a *bracket-drift* row usually needs no render at all — a clip at the corrected text often already exists, so the move is a relink.

Not every mismatch is a defect worth fixing. The estate-wide run classifies into: bracket-only drift; **alternation picks** (LEGO reads `yet / still`, narration announces `yet`) which look deliberate; sub/superstring drift; and genuinely unrelated phrases. Triage before you regenerate.

⚠️ **Two implementation gotchas worth knowing:**
- Supabase silently truncates `IN`-clause results past ~500 IDs. Batch in chunks of 200 to be safe.
- JS regex `\b` only matches ASCII word boundaries — `\bvocê\b`, `\bcansé\b`, `\bgrüß\b` etc. silently never match. For Unicode-letter words, use `(?<!\p{L})word(?!\p{L})` with the `/u` flag.

#### Check 19: Distinction coverage — one side marks what the other does not

A course pairs a KNOWN language with a TARGET language. Wherever one side grammatically marks a distinction the other does not, the pair has a problem — but **which** problem depends on which side is richer, and **the two have opposite remedies**.

Shuchita, the eng_for_hin proofreader, named the first case (2026-08-19):

> "Hindi genders things that you dont in English. We want to make sure that the Hindi speakers understand the lack of gendering in these contexts — so we should prompt for the multiple options (both genders for example) with the same English phrase as the answer. Drilling that will help them understand the phrase they learnt is acceptable for both genders instead of just the one originally introduced."

**DIRECTION A — known richer.** Several known-side prompts collapse onto one target answer. The learner meets one prompt, learns the answer, and has no way to know it also answers the others. *Remedy: teach the collapse — same answer, several prompts, drilled.*

**DIRECTION B — target richer.** The learner must PRODUCE a distinction their own language does not make, with nothing in the prompt telling them which. *Remedy is the opposite: this is not a lesson, it is a potentially unanswerable card. Disambiguate the prompt, split the card, or confirm the ambiguity is deliberate.*

⚠️ **A check that knew only Direction A would report every Direction B case as healthy** — worse than not having the check. Both are detected and labelled, and the output never gives one direction's remedy to the other's finding.

⚠️ **Direction B findings are never asserted as defects.** Deliberate ambiguity is sometimes a teaching tool on this estate. They are candidates for a human.

**Neither slot is English.** The check names no language and no axis; both are configuration.

```bash
node tools/check-distinction-coverage.cjs <course_code>            # human-readable
node tools/check-distinction-coverage.cjs <course_code> --json      # machine-readable
node tools/check-distinction-coverage.cjs <course_code> --all-samples
node tools/check-distinction-coverage.cjs --estate                  # which pairs fire, and how
```

Config: `tools/distinctions/axes.cjs` (73 languages across the estate's 143 real courses, four axes, with a deliberate `partial` and `unknown` state — see below). Tests: `node tools/distinctions/axes.test.cjs` and `node tools/distinctions/reach-test.test.cjs`.

##### THE GATE — every Direction A candidate must pass the reach test

Kai's ruling, 2026-08-19, and the most important part of this check:

> "Just because the same word can be used in both ways, does not mean the learner will find the process painless."

The question is **not** "is the target form genuinely the same?" — that is a fact about the language and it is not sufficient. The question is **will the learner reach for the thing they already know?**

- **WORKS** — taught "she speaks" = *se puhuu*; later asked "he speaks", the learner thinks *"I only know how to say she speaks… I'll just say that"*, and it is the same. Surprise, reward, lesson learned.
- **FAILS** — taught "I am learning" = *dw i'n dysgu*; later asked "I am teaching", the same Welsh word, the learner does **not** think "the closest thing I know is learning". They think *"I don't know that one, aaa!"* A wall, not a lesson.

What separates them: in the gender case the two prompts are obviously neighbours **from the learner's side** — same sentence, one word different, relationship visible without being told. In learn/teach the connection exists only in the target language, which is exactly what the learner cannot see yet. Minimal pairs pass; accidental collisions do not; the middle ground is flagged rather than guessed.

Every candidate carries an explicit reach verdict with its reasoning, and failures are reported **separately** as *"same target form, but not a drill candidate"* — never mixed in with the good ones. `tools/distinctions/reach-test.cjs` holds the gate and both of Kai's examples are pinned as tests.

##### The four detectors

| | direction | needs config | question |
|---|---|---|---|
| **A1** | A, generative | morphology on the known side | the counterpart prompt is missing — propose it |
| **A2** | A, observational | **none — runs on every pair** | the course already reaches one answer from >1 prompt; is that a drill or a wall? |
| **B1** | B, generative | morphology on the target side | this answer is marked, the prompt gives no cue, and the other form is never taught |
| **B2** | B, observational | **none** | one prompt taught with two answers that are forms of one word |

**B1 is the one that matters most, and B2 alone would miss it.** A collision detector can only see a distinction the course contradicts itself about. On `spa_for_eng` a hand pass found 690 rows putting an English first-person subject against a Spanish gender-marked adjective, with the feminine first-person form appearing **zero** times in 668 seeds — no collision, because the course is perfectly self-consistent in being masculine-only, and a female learner is drilled hundreds of times on a self-description wrong for her. `hin_for_eng` is the same shape and is measured: 912 under-determined rows, other form taught 0 times.

##### Read the buckets, not the count

Every row carrying a marked form lands in exactly one bucket and the totals print with a `coverage: classified/carrying` line. Nothing is silently dropped.

- **attested** (A1) — both sides already taught with the same answer. The calibration signal: a run reporting zero attested on a course that demonstrably has some is a broken run, not a clean course.
- **not a drill candidate** — failed the gate. Needs teaching properly, not drilling.
- **rejected/<rule>** — each by a named rule whose reasoning is in `--json`.
- **unanchored** — carries a marked form but nothing shows whose gender it is. Reported, never proposed.

##### Axis states, and what does not fire

`full` (morphology available) · `declared` (marked, no morphology) · **`partial`** (register-bound, optional or moribund — Japanese gender, Basque *hika*, Mandarin 您) · **`unknown`** (nobody has checked — Nepali gender, Hakka clusivity, Lombard/Romagnol/Venetian T-V). Only `full` and `declared` fire. `partial` and `unknown` are a deliberate third and fourth state: folding them into yes/no makes the check either too loud or blind, and a wrong entry silently turns a whole course's check on or off.

**you-number is OFF estate-wide by default.** English's one "you" covers both numbers, so a *tú/vosotros* split genuinely collapses — but it is an accepted whole-estate feature, and ~79 of the 283 asymmetric (course, axis) hits are this axis alone. `directionsFor(k, t, { includeDisabled: true })` shows them.

##### Known limits, stated rather than hidden

- The gate works on surface form and has no semantic knowledge, so a near-synonym pair in the known language ("speak"/"talk") is called a wall when a learner might well connect them. It errs safe: withholding a proposal, not making a bad one.
- Its relatedness measure is affix-based. A shared *ending* is weak evidence (Spanish *sostener*/*mantener* share an inflection, not a word) and is flagged rather than asserted. Templatic morphology (Arabic, Hebrew) and unspaced scripts (Japanese, Chinese, Thai) return `flag`, never a confident verdict they have not earned.
- B1's "never taught" string is a mechanical swap and can over-swap non-participant agreement elsewhere in the same sentence. The finding is sound; treat the rendered counterpart as an illustration, not authored text.

Report: bucket totals per detector plus the first ~10 of each. Action: hand proposals to a proofreader or build agent. **This check does not create phrases, and it must not be moved into the course builder** — Kai's ruling: *"We should test it out properly as fixes before thinking about changing the actual course generation."*

## Step 6: Post-scan pipeline — backfill, final pass, gender prep

Scanner fixes change phrase counts (deletes leave LEGOs thinner, rewrites invalidate audio). After applying fixes from the Remediation Guide, run the build pipeline to fill gaps, re-run quality checks, and prep new items for gender expansion.

**Model pattern**: Opus *orchestrates*, Sonnet does the per-phrase work, Haiku is for mechanical classification only. The endpoints below already follow this pattern internally — they spawn Sonnet workers orchestrated by Opus. Don't replace them with per-phrase Opus calls.

### Flow

```
scan → fix → backfill → final-pass → gender-prep → re-scan → (if issues: loop)
```

Ready criteria: 0 under-threshold seeds, 0 flagged seeds, final-pass complete, gender-prep complete, scan re-runs clean on the categories the fixes addressed.

### Endpoints

All run on `production-api` (port 3470). Each is an async spawn — the endpoint returns immediately with a `job_id` and the actual work happens in the background. Poll the seed-grid / pipeline status to know when to move to the next step.

#### 6a. Backfill phrases (under-threshold seeds)

`POST http://localhost:3470/api/build/backfill-phrases/{courseCode}`

Regenerates practice phrases for seeds that fell below the threshold (usually because deletes during fix steps thinned the LEGOs). Returns `{ok: true, job_id, message}`.

**Before firing backfill, read the under-threshold seeds.** Deletion-driven under-thresholds often surface a structural problem — a LEGO that was thin *because* phrases kept failing review, not because of random bad luck. Fire backfill on a broken LEGO and you spend a build-team run on the same garbage input; iteration count goes up, quality stays flat.

For each under-threshold seed, eyeball for:
- **Reorder opportunity**: the thin LEGO is early, its remaining phrases quote vocabulary from the NEXT LEGO in the same seed. Swap `lego_index` and let backfill work with the prerequisites in place. (See "Fixing LEGO ordering" in the Remediation Guide.)
- **Bad LEGO mapping**: the known/target pairing is off in a way that makes every phrase a synonym-struggle for the builder — e.g. `your` → `tua` standalone when the natural unit is `your sister` → `tua irmã`. Restructure the LEGO into a larger unit (M-LEGO with the noun) before backfilling.
- **Redundant or absorbed LEGO**: the thin LEGO's meaning is already covered by a sibling LEGO in the same seed. Consider setting `is_new=false` so it reuses the sibling's phrases, or merge.
- **Duplicate sense**: two LEGOs end up meaning the same thing (ZUT-like but for senses, not surface forms). Resolve the duplication before filling.

Only once the structural issues are addressed should you hit the backfill endpoint. Then wait for `GET /api/build/seed-grid/{courseCode}` to show `under-threshold=0`.

After backfill lands, **re-run final-pass on the affected seeds** (`POST /build/final-pass/{courseCode}?seeds=N,M,...`). If final-pass deletes more, loop: structural check → backfill → final-pass. The loop terminates when a final-pass cycle produces no new deletions.

#### 6b. Component backfill (M-type LEGOs missing components)

`POST http://localhost:3470/api/build/component-backfill/{courseCode}`

Fills in missing component phrases for multi-word M-LEGOs. Run after 6a when Check 16 reports M-LEGOs missing components.

#### 6c. Final pass (quality review)

`POST http://localhost:3470/api/build/final-pass/{courseCode}`

Opus-orchestrated Sonnet workers review every phrase for grammar, naturalness, vocab ordering, and register. Flags seeds that need rebuild and marks complete ones as finalized. Check completion via the `finalPassCompleted` flag in the pipeline status.

Can be targeted at specific seeds by POSTing `{seeds: [N, M, ...]}` — useful when scan fixes only touched a subset.

#### 6d. Gender prep (only for gendered target languages)

`POST http://localhost:3470/api/production/{courseCode}/gender-prep/start`

Identifies phrases needing male/female voice variants and prepares the expansion records. Only applies to gendered-grammar languages (spa, por, fra, ita, deu, ...). Skipped automatically for ungendered languages (eng, jpn, zho, ...).

Specifically make sure this runs on **new items created by backfill/final-pass**, not just pre-existing ones — the coordinator scans all phrases each run, so one pass after 6c covers it.

#### 6e. Audio regen (nulled audio_ids)

Any phrase with `known_audio_id = null` or `target1_audio_id = null` after text changes needs audio regenerated via Phase 8:

`POST http://localhost:3465/generate/{courseCode}` — show `--plan` first, wait for user approval, then execute (costs TTS API credits).

### Iteration

After one full pass (6a → 6b → 6c → 6d → 6e), re-run the scan. If new issues surfaced (e.g. backfill regenerated a phrase that introduces new vocab ordering violation), fix → re-run pipeline. Loop until the scan is clean AND the pipeline is stable.

The signal for "ready for Deborah": 0 under-threshold, 0 flagged, final-pass complete, gender-prep complete, audio gen complete, scan-course report clean on mechanical checks.

## When to go heavy vs lite

**Default: lite mode for courses Deborah can review in her languages (en/es/de/fr/it/pt_br-ish)**. Deborah catches cumulative-texture and idiomatic issues better than the heavy LLM pipeline, for a fraction of the clock time. Running the full Step 6b + 7 on a course she'll review next is duplicative.

**Heavy mode** (Opus reviewers on 6b, full 150-seed Step 7) earns its cost when:
- The target language is outside Deborah's reach (Armenian, Japanese, Korean, Arabic, Chinese, Welsh minority variants, etc.). The LLM pipeline is the only line of defence.
- First build of a new variant where nothing has been reviewed yet.
- Final polish before beta/public release.

**Lite mode** (Sonnet reviewers, severe-only findings, shorter sim) for everything else. Pass `?mode=lite` on the endpoints. The mechanical scan (Checks 1-17), deterministic auto-fixes, and one Sonnet final-pass run unchanged — those are always cheap and always worth running.

## Readiness gate — fix-script logs are NOT proof of fix

A fix script's "ok=N failed=0" log is proof that *the rows the script targeted* updated. It is **not** proof that the failure class is gone. Coverage holes are how Deborah-flagged classes survive multiple "fix" rounds (spa_for_eng llevar word-order, 2026-04-20 → 2026-04-30: a narrow fix touched S0038L03 only, then reviewer caught 11 untouched siblings two passes later).

**Definition of done after any fix pass:** re-run the *whole class detector* (Check 17a / Check 18 / etc.) against the course and require zero hits. If the detector fires on rows the fix didn't touch, the fix wasn't comprehensive — sweep those too before declaring the card ready.

Specifically, fix-script template should end with the same regex/predicate that *defined* the issue, not a hand-curated verify list:

```javascript
// WRONG — narrow verify
const fixed = await supabase.from('course_practice_phrases').select('id,target_text').in('id', PHRASE_IDS);
console.log('Verified', fixed.data.length, 'updates');  // proves nothing about siblings

// RIGHT — whole-class re-scan
const survivors = (await supabase.from('course_practice_phrases')
  .select('id,target_text').eq('course_code', cc))
  .data.filter(p => CLASS_DETECTOR.test(p.target_text));
if (survivors.length) {
  console.error('NOT DONE — class still has', survivors.length, 'hits:');
  for (const s of survivors) console.error('  ', s.id, s.target_text);
  process.exit(1);
}
console.log('Class clean ✓');
```

The card stays in Content Checking until **every applicable deterministic check returns zero**.

## Re-verifying after fixes — affected seeds only

This applies to *expensive LLM* passes (final-pass, category-LLM, learner-sim). For the *cheap deterministic* class detectors (Check 17a, Check 18, etc.), always re-run on the whole course — see "Readiness gate" above.

When an LLM edit changes phrases/LEGOs in a specific set of seeds, **re-verify only those seeds, not the whole course**. Running full-course LLM passes after every fix multiplies clock time without catching issues outside the affected set.

Pattern:

1. Track which seeds were touched (by IDs or by filtering `updated_at` within the edit window).
2. Run targeted final-pass: `POST /build/final-pass/:courseCode?seeds=N,M,...`.
3. If backfill is needed (under-threshold count went up), run backfill — it already scopes itself to under-threshold seeds automatically.
4. Run lite 6b on the touched seeds only: `POST /build/category-llm/:courseCode?seeds=N,M&mode=lite`.
5. Skip learner sim unless the change was systemic (affected >30% of early seeds). Cumulative-texture impact of a narrow edit is usually local.
6. Repeat until stable.

The full-course run is for initial builds or after wide-pattern sweeps (EP→BR cleanup of 100+ phrases, e.g.). Targeted passes for everything else.

## Step 6b: Category LLM pre-check

After Step 6's pipeline (backfill / final-pass / gender-prep / audio) is stable, run the category-LLM pre-check before Step 7. This pass targets the five categories that mechanical scans and the grammar-focused final-pass **cannot** detect:

- **awkward_phrase** — grammatically valid, but nothing a native would say.
- **wrong_word_order** — allowed word order, not the preferred one a native would pick (especially for flexible-order languages like Finnish / Japanese / Russian).
- **gender_mismatch** — wrong gendered form for the context (first-person speaker voice, possessive/article concord, referent agreement).
- **translation_mismatch** — ${'`'}target_text${'`'} and ${'`'}known_text${'`'} don't mean the same thing.
- **presentation_weird** — LEGO intro example is ambiguous, uses unintroduced vocab, or doesn't match the LEGO's pattern.

### Endpoint

\`POST http://localhost:3470/api/build/category-llm/{courseCode}?seed_max=150&agents=6\`

Spawns an Opus orchestrator that dispatches N Opus reviewers in parallel. Reviewers are **Opus** (not Sonnet) because these categories need careful judgement — Sonnet produces noisier false positives on awkwardness, subtle gender, and nuanced meaning drift. Default scope is seeds 1-150 (not full course — this is a high-value sampling pass, not an exhaustive audit).

### Orchestrator behaviour

- Verifies each reviewer finding against its own target-language knowledge before acting.
- **translation_mismatch** severe + obvious fix: rewrite target + null audio. Ambiguous: delete. Moderate/minor: flag to Kai.
- **awkward_phrase** severe: delete. Moderate/minor: flag.
- **wrong_word_order** with easy less-surprising alternative: rewrite. Otherwise flag.
- **gender_mismatch**: always flag (Kai owns voice assignment).
- **presentation_weird** severe: flag seed for rebuild. Otherwise note.
- Posts a final report with per-category counts, auto-actions, flagged items, and cumulative patterns.

### When to run

After mechanical scan + fixes + Steps 6a-6e pipeline is complete (course is structurally sound). Before Step 7 learner simulation (so the sim isn't drowning in category-shaped noise the LLM should catch).

### Calibration

Reviewer brief includes a section on **Deborah's past findings** per category as calibration templates. Update \`docs/deborahs-findings.md\` whenever Deborah surfaces new patterns — the brief reads from that catalog at generation time.

## Step 7: Learner simulation — the final-final pass

After Steps 1-6 (mechanical + category LLM + pipeline) the course is *structurally* sound. Step 7 asks a different question: **does the course feel like a trustworthy teacher to an actual beginner?** A single Opus agent roleplays a complete beginner in the target language, works through seeds 1-150 in order, and rates every practice phrase against what they've been explicitly taught so far.

This is a **report-only** pass. No deletes, no fixes. Kai reads the report and decides which findings (if any) to act on.

### What the simulation catches that Steps 1-6 miss

- **Cumulative texture**: five defensible "borderline" phrases in three consecutive seeds *feels* confusing to a real learner even if each one is individually fine. Mechanical checks miss density; the simulation tracks it.
- **Learner back-pressure**: would the learner's reasonable guess, said to a native speaker, be *understood correctly*? A phrase can be perfectly grammatical and still teach a pattern that misleads the learner about how to say what they actually mean.
- **Order-of-exposure drift**: subtle cases where a word has been "introduced" via an M-LEGO component but never practised in isolation, so the learner technically knows it but doesn't feel they do.
- **Pattern inconsistency**: the course establishes an implicit rule (verb goes at the end in subclauses, say) in early seeds and then contradicts it later without flagging the shift.

### Endpoint

`POST http://localhost:3470/api/build/learner-simulation/{courseCode}?max_seed=150`

Spawns a single Opus agent (one iTerm2 window) that fetches seed/LEGO/phrase data via the existing API as it goes. The agent:

1. Sets itself up as a total beginner (zero target-language knowledge).
2. Walks seeds 1-150. At each seed: (a) adds newly-introduced LEGOs to its "vocab known" state, (b) attempts every practice phrase using only that state, (c) rates each attempt on a 5-point rubric (OK / surprise / borderline / problematic / misleading).
3. Tracks nervousness clusters (3+ ⚠️ or worse in 2-3 seeds).
4. Posts a final report to the orchestrator chat and stdout.

### Rubric (summary)

| Level | When |
|---|---|
| ✓ OK | Guess matches or differs only in taught-variable surface |
| 🤔 Surprise | Word order or cognate mild divergence, learner re-reads and gets it |
| ⚠️ Borderline | New word that maps clearly to a known concept (synonym / morphological variant). Acceptable once; concerning in clusters |
| 🚨 Problematic | New word never introduced, or pattern contradicting an earlier lesson |
| 💔 Misleading | Learner's reasonable guess, said to a native, would be understood wrongly |

### When to run

After Steps 1-6 complete and the scan is clean. This is the last signal before handoff to Deborah. If Step 7 surfaces many ⚠️ clusters or 🚨/💔 findings, fix them (back to the Remediation Guide) and re-run Step 7 until the report is quiet.

### After the report lands — read it and decide

The agent posts its report to `orchestrator_messages` for the course. Fetch the latest:

\`\`\`javascript
const { data } = await supabase.from('orchestrator_messages')
  .select('created_at, message')
  .eq('course_code', COURSE_CODE)
  .ilike('message', '# Learner Simulation Report%')
  .order('created_at', { ascending: false })
  .limit(1);
\`\`\`

Read it and decide per-finding. Pattern:

- **💔 Misleading**: almost always fix. The learner would say the wrong thing to a native.
  - If the target mis-translates the prompt → rewrite target_text, null target1/target2_audio_id for regen.
  - If the fix reveals a systemic pattern (one wrong translation predicts N more), scan for all instances and fix in one pass.
- **🚨 Problematic (new word never introduced)**: usually fix. Either delete the phrase or rewrite the prompt to use taught vocab. Scan-course Check 11 (word-level vocab ordering) should have caught most of these — if it didn't, the simulation is showing a gap in the mechanical check.
- **⚠️ Borderline clusters**: methodology call, do NOT auto-fix. Flag to Kai with the cluster + root cause. Options are usually "standardise the earlier seeds", "standardise the later seeds", or "add a bridge LEGO". Learner's call.
- **🤔 Surprise**: not automatic-leave. Check two conditions:
  1. **Is there an equally-correct less-surprising version?** If a language allows flexible word order (e.g. Finnish), or a phrase has multiple natural renderings, and one of them lines up with what the learner would guess from what they've been taught, prefer that. We only spend a "surprise" when it's unavoidable.
  2. **Is it clustered?** Three surprises in consecutive seeds — even if each is individually natural — dents confidence. In a cluster, rewrite the few that are easiest to make less surprising so the density drops below the threshold.
  Leave the surprise only when every natural rendering of the target would surprise the learner equally. Don't surprise the learner for no reason.
- **Pattern inconsistencies / methodology notes**: flag to Kai, don't act. These are course-design decisions.
- **Component metadata issues** (e.g. M-LEGO listing itself as a component): low priority, non-learner-facing. Log for a future builder pass.

Always verify a proposed fix against the cognate/cumulative findings before applying — if the simulation says 7 phrases share a root cause, search for the pattern across the whole course, not just the flagged instances.

### Placement in the pipeline

```
scan → fix → 6a-6e pipeline → scan again → 6a-6e again if needed
                                    ↓ (clean)
                            Step 6 category LLM pre-check (Opus orch + Sonnet)
                                    ↓
                            Step 7 Learner simulation (single Opus)
                                    ↓
                                 Deborah
```

## IMPORTANT: Stale Audio After Text Changes — NEVER DELETE THE OLD CLIP

When ANY fix changes the `known_text` or `target_text` of a seed, LEGO, or phrase, the old clip becomes stale — it speaks the wrong words. It must stop being *heard*. It must **not** be *deleted*.

> **This section used to say "delete the old `course_audio` record, then unlink, then regenerate." That instruction was wrong and is withdrawn.** Kai ruled make-before-break on **2026-08-27** (canon clash C0): *deletion never precedes a verified replacement — not even "we'll regenerate right after."* The 2026-08-03 `fra_for_eng` purge deleted 31,310 rows before re-rendering and left ~2,000 slots silent for two days. On 2026-08-27 two generation jobs died mid-run; under delete-first one of them would have left 57 slots silent on a live course.

### Two different faults, two different routes

- **The TEXT changed** (this section). The clip is fine, it just says the old words. Follow the procedure below.
- **The RECORDING is bad** and the text is right (clipped, silent, wrong voice, hallucinated words). This is **not** the procedure — use the non-destructive audio repair flow instead, see "If the recording is bad" at the end of this section.

### The database already unlinks for you — do not hand-null

Verified against the live DB on 2026-08-27: **all three content tables carry a BEFORE UPDATE trigger** that handles the stale link on a text change (`trg_null_seed_audio_on_text_change`, `trg_null_lego_audio_on_text_change`, `trg_null_phrase_audio_on_text_change`, all enabled). On a text change the trigger:

1. **keeps** the link if the clip still speaks the new words (whitespace, casing or trailing punctuation only changed);
2. otherwise **re-links to a same-voice clip** that does speak them, if one exists (`audio_id_for_text_same_voice` — voice is preserved, never silently swapped);
3. otherwise **sets the link to NULL**;

and writes a row to **`content_audio_link_drops`** either way, recording the old and new audio id, the old and new text, the old voice, and the reason. 1,783 drops logged since 2026-08-17 — this is live, in use, and doing the unlinking step for you. Step 2 of the old instruction is therefore unnecessary; do not write your own NULLing UPDATE.

The one exception: `course_legos` also respects a link **you** set in the same UPDATE as the text (that is the audio-first repair shape). `course_seeds` and `course_practice_phrases` do **not** — they resolve the link themselves and will overwrite one you set in the same statement.

### The correct order (make-before-break)

1. **Render the replacement clip FIRST**, for the NEW text, in the **same voice, role and language** as the old one. Generating TTS is an approval gate — queue an audio pass rather than running TTS yourself, unless it is a handful of clips and you have said so and been told yes.
2. **Verify the new clip before anything points at it.** All five, not a subset:
   - the `course_audio` row exists and its `s3_key` is not NULL;
   - `role`, `voice_id` and `language` match the clip being replaced;
   - `duration_ms` is non-zero and plausible for the length of the text;
   - `text_normalized` equals `normalize_text(<the new text>)`;
   - the object is actually in the bucket (HEAD it) — a row is not bytes.
3. **Then UPDATE the content text.** The trigger will link your new clip automatically, because it is the same-voice match for the new text.
4. **Read the link back and assert it.** If it came back NULL, repoint explicitly. Check the `content_audio_link_drops` row to see what the trigger decided and why:
   ```sql
   SELECT column_name, role, old_audio_id, new_audio_id, old_voice_id, reason, dropped_at
     FROM content_audio_link_drops
    WHERE course_code = :code AND row_id = :rowId
    ORDER BY dropped_at DESC LIMIT 5;
   ```
5. **Leave the old `course_audio` row exactly where it is.** Never delete it.

**If you cannot render first** — a bulk text fix, or the audio pass is queued and not yet run — update the text anyway. The trigger unlinks and logs; the slot goes quiet, which is the honest state, because the old clip speaks the wrong words and playing it would be worse than silence. Then queue the audio pass. Still delete nothing.

### Why deleting is worse than it looks

Deleting a `course_audio` row is not a tidy-up. `ON DELETE CASCADE` foreign keys mean the delete also destroys, irreversibly:

- `audio_repair_candidates` — any verified replacement already proposed for that clip;
- `audio_clip_flags` and `audio_clip_signoffs` — every QA verdict and every human pass on it;
- `course_audio_revisions` — the history that makes a revert possible;
- `course_audio_envelope` — the measured envelope.

And it forecloses two cheap outcomes: reverting the text change (the clip would have been re-linked for free), and reusing the clip elsewhere. An unlinked row costs nothing — no learner can reach it, because the learner path is reached through the link, not the row.

### If the recording is bad (text unchanged)

Two roads, both make-before-break, both leaving the row in place.

**The used one — flag it, then regenerate the flagged clips.** Raise a flag from the dashboard (`/api/production/:courseCode/flags/update`), then `POST /api/audio/regenerate-role/:courseCode` with `flaggedOnly: true` (`dryRun: true` first to see the count). Phase 8 renders, passes a veracity gate, uploads to a **new** S3 key, and only then swaps the clip in place at the same id with `audio_revision` bumped; the flag is cleared only once the run reports success. Nothing is deleted; human-origin clips are excluded by the precious-audio guard. 48,868 flags raised since February, 7,125 in the last 30 days — this is the road in daily use.

**The careful one — propose / preview / accept.** Use it when a human should hear both takes before anything moves. It is genuinely make-before-break: it renders, masters, measures, veracity-checks and uploads a candidate to a separate key **before** a human is even offered the accept, and a failed propose mutates nothing. The swap is **same id, new bytes** — the row is never deleted, so nothing cascades, no link moves, and `audio_revision` is bumped so cached bytes cannot be served.

```
POST /api/audio/repair/:courseCode/:audioId/propose   { source: 'tts'|'upload', voiceId?, ... }
GET  /api/audio/repair/:courseCode/:audioId/preview   # hear old and candidate side by side
POST /api/audio/repair/:courseCode/:audioId/accept    { candidateId, actor, reason }
POST /api/audio/repair/:courseCode/:audioId/revert    # data-only; the old object was never deleted
POST /api/audio/repair/:courseCode/:audioId/reject
```

Production API (port 3470); the dashboard surface is the Audio Repair panel. Pass `dryRun` to `propose` to see what it would spend before spending it. **`accept` refuses if the text moved** — that assertion is why this flow cannot be used for a text change, and why the procedure above exists.

**Why the old text mattered at all:** the dashboard's missing-audio count checks `audio_id` links, and the legacy export checks text matching. Change text and leave the link, and the dashboard says 0 missing while the export breaks and the learner hears the old words. The trigger now closes that gap on its own — the only thing left for you is to make the replacement before you break the link, and never to delete.

## What This Skill Does NOT Do

- Does NOT auto-fix anything
- Does NOT run the final pass (that's a separate agent checking grammar/naturalness)
- Does NOT check audio — that's Phase 8
