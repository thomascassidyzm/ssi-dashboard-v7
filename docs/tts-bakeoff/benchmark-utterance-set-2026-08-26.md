# The SSi voice benchmark — utterance set

**Built 26 August 2026 from the live Supabase course DB. No audio was generated and nothing was
spent.** This is deliverable 2 of the phase-1 TTS bake-off: the fixed set of things every candidate
voice will be asked to say, so that comparisons between Cartesia, Chatterbox, MiniMax, OpenAI and
the xAI / Azure / ElevenLabs controls are like-for-like.

| | |
|---|---|
| English set | `tools/tts-bakeoff/data/utterances-eng.json` — 99 utterances |
| Welsh set | `tools/tts-bakeoff/data/utterances-cym.json` — 99 utterances |
| Generator | `tools/tts-bakeoff/build-utterance-set.cjs` |
| Regenerate | `node tools/tts-bakeoff/build-utterance-set.cjs --language cym --date 2026-08-26` |

Welsh is **gate zero**: a candidate that cannot do Welsh convincingly is dead for canonical course
work regardless of how good its English is. That is why the Welsh set is built to the same depth as
the English one rather than treated as a spot check.

---

## The one rule this set is built on

**Nothing is invented.** Every utterance is a string that already exists in the live DB, and every
utterance carries `provenance` naming the course, the table, the row id and (where the row has one)
the seed number. A spot check of 22 utterances across both files resolved every provenance back to
its row and matched the text. If a category could not be filled from real rows, the file says so in
its `gaps` array instead of being padded — see **Gaps** below.

Two small, declared exceptions, both recorded in the row's own provenance so nothing is hidden:

- **Minimal pairs** are single words lifted out of a longer row. The utterance carries
  `provenance.attested_in` with the full sentence the word was taken from, plus `pair_partner` and
  `contrast`.
- **Pod explainer rows** in `course_audio` store a leading control marker, e.g.
  `[atom] 11 o'clock`. The marker is not content and must not be spoken, so it is stripped and the
  raw row text is kept in `provenance.source_text` with `provenance.transform` naming what was done.

---

## How to run it

Every utterance is a `{text, language, repeat_count}` triple. Synthesise each `text` once, except
the single `repeat_probe`, which is synthesised `repeat_count` (20) times in one session — and
again on a later date, from the same file, for the axis-E repeatability measurement.

Listen against Tom's axes: **A** similarity to the reference voice, **B** naturalness,
**C** pronunciation accuracy, **D** intra-voice consistency, **E** repeatability over time,
**F** control, **G** operational suitability. Each category below says which axis it is really
serving and what a listener should be listening *for*.

---

## The categories

### `isolated_word` — 12 per language
**Failure mode:** a model that only sounds good with a run-up. Single words have no surrounding
context to borrow prosody from, so the delivery is naked.

**Listen for:** a dead-flat citation tone; lexical stress on the wrong syllable; a missing release
on the final consonant (the word ends in a click or a cut rather than a decay). Welsh stress is
almost always the penultimate syllable — `ymddangos`, `cyflawni`, `ffeithiau` — and a model applying
English stress rules will get it wrong in an obvious, disqualifying way.

**How it was filled:** single-word entries in `course_legos`, preferring polysyllables — a
two-letter function word tells you nothing about prosody. Axes B, C.

### `very_short_lego` — 12 per language
**Failure mode:** clipping. Two- and three-word LEGOs are over before the model has settled into a
rhythm, and this is where truncated tails and swallowed onsets appear. The estate has been bitten by
exactly this before (`docs/deu-first5-clipping-emergency-2026-08-05.md`, and the Azure last-clip
flush race).

**Listen for:** the first consonant missing or half-present; the last word cut short; unnatural
speed because the model is pacing a fragment as if it were a sentence.

**How it was filled:** 2-3 word `course_legos` rows. Axes B, C, G.

### `medium_chunk` — 12 per language
**Failure mode:** false cadence. BUILD phrases are *deliberately incomplete* — that is the
methodology, not a bug — and the model has to deliver an unfinished thought without inventing a
full stop or trailing off as if the text were corrupt.

**Listen for:** a downward final cadence on a fragment; a pause or breath at the end that implies
the sentence finished; the model "fixing" the text by adding a filler.

**How it was filled:** `course_practice_phrases` with `phrase_role='build'`, 4-8 words. Axis B.

### `full_sentence` — 12 per language
**Failure mode:** the baseline. This is what most of the course actually is, and it is where
naturalness either holds up or doesn't.

**Listen for:** phrasing and breath placement; whether the sentence sounds like a person saying
something they mean, or a sequence of correctly-pronounced words; whether emphasis lands on the
content word rather than uniformly.

**How it was filled:** `phrase_role='use'`, 6-16 words, no question mark. Axes A, B.

### `question` — 10 per language
**Failure mode:** flattened interrogatives. Many models read a question mark as "raise the pitch at
the end" regardless of question type, or ignore it entirely.

**Listen for:** whether yes/no questions and wh-questions get *different* contours — the Welsh set
carries both (`wyt ti 'di cael digon i yfed rŵan?` against `beth fydd yn dod nesa?`) — and whether
the rise lands on the right word rather than being applied uniformly to the last syllable.

**How it was filled:** any pool row ending in `?`, 3-12 words. Axis B.

### `numbers` — 8 per language
**Failure mode:** text normalisation. This is the classic silent breakage: the model reads a number
as the wrong quantity, in the wrong language, or spells it out digit by digit.

**Listen for:** clock times read as a bare count; ordinals read as cardinals; in Welsh, the counted
noun taking the wrong form after a numeral, and the vigesimal/decimal split (`un deg naw` vs
`pymtheg`); in English, `304` read as "three hundred and four" vs "three oh four".

**How it was filled:** digit-bearing rows first, then number-word rows. **See the Welsh gap
below — this category is where the corpus is thinnest in both languages.** Axis C.

### `hard_pronunciation` — 14 per language
**The category that makes this benchmark worth anything.** Every entry carries a
`difficulty_note` saying exactly what is hard about it, and where a defect nominated the string, the
note carries that defect's own words.

Two sources, in priority order:

1. **Defect provenance.** Rows the estate has already had to flag in
   `course_audio.rerecord_wanted` take the first seats, one seat per *distinct* defect.
2. **Phonological rule classes** applied over real corpus strings — one seat per class before any
   class gets a second, so the whole phonological surface is covered rather than the noisiest bit
   of it.

The Welsh classes: initial `ll` (/ɬ/), initial `rh` (/r̥/), `ch` (/χ/), the `dd` /ð/ vs `th` /θ/
pair, `w` as a vowel, `y` as schwa vs clear, circumflex length, voiceless-nasal onsets
(`ngh`/`mh`/`nh`, and the pronoun `nhw`), `si` as /ʃ/, and the `ff`=/f/ vs `f`=/v/ inversion.

The English classes: the `th` voiced/voiceless split, `-ough`, apostrophe contractions (the estate
has repeatedly been bitten by typographic U+2019 vs ASCII `'`), weak forms reducing to schwa, heavy
consonant clusters, heteronyms (`read`, `live`, `record`, `wound`…), and tense/lax vowel pairs.

**Listen for:** anglicisation of Welsh digraphs — `ll` rendered as /l/ or /kl/, `ch` as /tʃ/, `si`
read letter-by-letter; on the English side, a heteronym coin-flipped rather than disambiguated by
syntax, and every function word given its citation form (the single most common cause of "sounds
robotic").

### `proper_noun` — 8 per language
**Failure mode:** the class most often anglicised. A model that reads `Cymraeg` as an English word
is disqualified for course work in one syllable.

**Listen for:** English phonology applied to a Welsh name; wrong stress on days, months and places;
in mixed sentences, the model switching accent mid-utterance for the name and not switching back.

**How it was filled:** rows containing a name-class word, at most one per distinct name and rarer
names first — otherwise the category becomes eight days of the week. Axis C.

### `minimal_pair` — 10 per language
**Failure mode:** a collapsed distinction. If the model renders both members identically, the course
teaches the learner a mistake — this is the category with the sharpest consequence.

For **Welsh** the pairs are **initial consonant mutations mined from the corpus itself**: for every
word in the corpus, the generator checks whether its radical form also occurs, and only emits the
pair if both are genuinely attested. This run produced `codi`/`godi`, `past`/`bast`,
`bwrdd`/`fwrdd`, `teulu`/`deulu`, `maint`/`faint` — soft mutation across five different initial
consonants. Mutation is *the* Welsh breaker: it changes the first sound of a word depending on
grammar, so a model that has learned "these are spelling variants of the same word" will smooth
them together.

For **English** the pairs are corpus words at edit distance 1 whose single difference is a nameable
phonetic contrast: `known`/`knows`, `but`/`put`, `met`/`wet`, `we're`/`we've`, `doing`/`going`.

**Listen for:** the two members A/B against each other. Same initial consonant on `codi` and `godi`
is a fail. `we're` and `we've` indistinguishable is a fail.

### `repeat_probe` — exactly 1 per language, `repeat_count: 20`
**Failure mode:** the thing that actually costs SSi money — a voice that is beautiful and different
every time. This is the axis-D and axis-E instrument.

- English: `I'd like to believe that you can't guess`
- Welsh: `fyddech chi'n fodlon rhoi fo iddo fo?` (north)

**Listen for, across the 20 renders:** duration spread; pitch drift; whether any single render is
audibly a different take — a different mood, a different mic distance, a different person. Then
re-run the same probe weeks later and compare: Azure is the consistency benchmark to beat, and
ElevenLabs is the known-variable one to stay clear of.

---

## Welsh: dialects, and what the evidence actually supports

Both live Welsh courses feed one set, tagged per utterance so a north/south split can be made later:

| Course | Dialect | Utterances |
|---|---|---|
| `cym_n_for_eng` | north | 57 |
| `cym_s_for_eng` | south | 42 |

Every Welsh utterance carries `provenance.dialect`. The dialect matters for several hard cases:
`awn ni gytre…` and `wnes i gwrdd â…` are southern forms; `efo chdi`, `deud`, `isio` are northern.
A candidate that renders one dialect's forms with the other's phonology is telling you it has one
generic Welsh model underneath.

**And here is the honest limit on the Welsh hard cases.** Welsh has *never been TTS'd in
production* on this estate. Verified directly against the DB today, not from a doc:
`cym_n_for_eng` has 12,929 human Welsh clips against 18 TTS ones; `cym_s_for_eng` 13,370 against
18; and a search for Azure's `cy-GB` voice ids across both courses returns **zero rows**. So there
is no Welsh TTS defect history to mine, because there is no Welsh TTS. What the Welsh hard cases
are mined from instead:

- **Human-recording defects** carrying `rerecord_wanted` flags — the "angry eyes" defect
  (`llygaid blin`, where the legacy northern recording says `del`, "pretty"; reported by Deborah in
  October 2025, ruled for re-record 19 August 2026), and the T-20 whole-set re-record commissioned
  on 16 August 2026 for trim-chain damage. Both appear in the file with the flag's own wording.
- **Phonological rule classes over real corpus strings.** The strings are real; the *reason they
  are hard* is stated per row and is a claim about Welsh phonology, not about an observed defect.

That distinction is in the data: notes beginning `DEFECT PROVENANCE —` have an observed defect
behind them; notes beginning `[rule-id]` are phonologically motivated selections. Do not let a
report blur the two.

## English: no defect provenance exists

The English set has no `DEFECT PROVENANCE` entries, and that is a finding, not an omission. Checked
across all 20 English-target courses in the live DB: **not one carries a `rerecord_wanted` flag or
a `veracity_pass=false` row for English-language audio.** (`eng_for_sin` has 50 flagged rows, but
they are Sinhala presentation openers, not English.) The English hard cases are therefore
rule-driven only. If English TTS defects have been observed, they were never written back to the
DB — which is itself worth fixing before phase 2 renders anything.

---

## Gaps — stated, not papered over

1. **No digits anywhere in Welsh course content.** Checked `course_seeds`, `course_legos`,
   `course_practice_phrases` and `course_audio` for both Welsh courses: zero rows contain a digit.
   Welsh numbers exist only as words. Digit, date and ordinal *normalisation* therefore cannot be
   tested for Welsh from real course content, and the `numbers` category is filled with number
   words instead. This is recorded in the file's `gaps` array. Phase-2 options: author a small
   deliberate digit probe set and label it as authored, or accept that the benchmark does not
   cover Welsh normalisation.
2. **English digit coverage is thin** — 2 of the 8 English number utterances contain digits
   (`11 o'clock`, `room 304`), because the only short digit-bearing English rows in the estate are
   pod explainer atoms. The rest are number words.
3. **No English defect provenance at all** — see above.
4. **Welsh hard cases are phonologically motivated, not defect-observed**, apart from the two
   flagged human-recording defects — see above.
5. **A real data defect found while mining, unrelated to the benchmark.** Two `course_legos` rows
   in `cym_n_for_eng` contain a **Cyrillic `е` (U+0435)** inside otherwise-Latin Welsh text:
   `problеm` (seed 264, row `22109064-486a-489f-b109-b1a999901f23`) and `hеr` (seed 271, row
   `cf6449c6-e081-4681-a377-cc4fd0703b8e`), plus the matching `course_audio` rows. They look
   correct on screen and are a different string underneath, which will silently break any
   text-match, autolink or veracity check. They are excluded from the benchmark — a homoglyph
   tests the database, not the voice — and reported here for a separate fix pass.

---

## Adding a language

The generator is language-agnostic. `node tools/tts-bakeoff/build-utterance-set.cjs --language <iso>`
picks that language's live-then-beta courses automatically (up to four), builds the pool, and writes
the same schema. `--courses a,b` overrides the selection; `--out` overrides the path; `--date`
stamps `generated_at`.

Categories that need language knowledge — `hard_pronunciation`, `minimal_pair`, the number-word and
proper-noun lists — come from a **language pack** in `LANG_PACKS` at the top of the script. A
language with no pack still builds; it simply reports those categories as gaps rather than
inventing content. Adding a language means adding a pack: a list of rule classes with a note saying
*why* each is hard, a contrast definition for minimal pairs, and the two word lists. Writing that
pack is the real work, and it should be done with someone who speaks the language.

The output is deterministic — no randomness and no clock beyond `--date` — so re-running against an
unchanged DB reproduces the file byte for byte, and a diff between two runs is a real change in the
course content.
