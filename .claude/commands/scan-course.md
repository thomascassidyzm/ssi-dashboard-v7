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

#### Check 7: Trailing periods

Detect phrases with trailing periods (`.`) in known_text or target_text. These cause TTS to add unnatural pauses and create duplicate key conflicts in `course_audio`.

```javascript
const trailingPeriod = phrases.filter(p =>
  /\.\s*$/.test(p.known_text) || /\.\s*$/.test(p.target_text)
);
```

Note: This does NOT flag `?` or `!` — those are valid sentence-ending punctuation. Only `.` is problematic because it's the default TTS sentence boundary marker and gets stripped inconsistently by normalization.

Report: count + 5 samples.

#### Check 8: Lowercase "I" in English

If the target language is English (`target_lang === 'eng'`), check for standalone lowercase `i` that should be `I`:

```javascript
// Match " i " or "i'" (i'm, i've, i'd) but not inside words
/\bi\b(?!')/.test(text) || /\bi'/.test(text)
```

If the known language is English (`known_lang === 'eng'`), check known_text instead.

Report: count + 5 samples.

#### Check 8: ZUT conflicts (duplicate known_text → different target_text)

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

PARENTHETICALS IN LEGO KNOWN_TEXT: {count}
  {5 samples}
  Action: Strip parentheticals from known_text

SLASHES IN LEGO KNOWN_TEXT: {count}
  {5 samples}
  Action: Resolve slashes (pick first option or check phrase usage)

WRONG LANGUAGE IN KNOWN_TEXT: {count} ({seed range})
  {5 samples}
  Action: Flag affected seeds for rebuild

WRONG LANGUAGE IN TARGET_TEXT: {count}
  {5 samples}
  Action: Flag affected seeds for rebuild

MULTI-SENTENCE PHRASES: {count}
  {all matches}
  Action: Delete dialogue phrases

LOWERCASE "I" IN ENGLISH: {count}
  {5 samples}
  Action: Bulk replace \bi\b with I

LANGUAGE SPOT-CHECK ({seed_count} seeds): {PASS/FAIL}
  {any flagged seeds}

SUMMARY: {total_issues} issues across {categories} categories
```

## Remediation Guide

After the scan, the user will decide what to fix. Here's how to handle each issue type:

### Recommended fix order

1. Strip parentheticals
2. Resolve slashes
3. Fix lowercase I
4. **Re-scan for ZUT conflicts** (stripping parens/slashes can reveal hidden duplicates)
5. Resolve ZUT conflicts
6. Delete multi-sentence phrases

This order matters — steps 1-2 can CREATE ZUT conflicts that step 4 detects.

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

## What This Skill Does NOT Do

- Does NOT auto-fix anything
- Does NOT run the final pass (that's a separate agent checking grammar/naturalness)
- Does NOT check audio — that's Phase 8
