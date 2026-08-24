# A-134 — the මමා defect class in eng_for_sin, closed

**Date:** 2026-08-17 · **Course:** `eng_for_sin` (known/prompt side = Sinhala, target/answer side = English)
**Job:** retry of #874, which died on a rate limit having applied nothing.

මමා is a corrupt spelling of මම ("I"). The Azure voice `si-LK-SameeraNeural` voices it aloud
as "mamaa". This is a distinct class from the `ඒ ගෙ` placeholder the plate was built around.

## Headline

| | |
|---|---|
| `course_audio` rows carrying මමා in stored text | 1,076 |
| of those, **reachable by a learner** | **73** (71 via `course_legos.presentation_audio_id`, 2 via `course_practice_phrases.known_audio_id`) |
| confirmed **actually spoken** from the provider's token array | **73 / 73** |
| fixed by pure **re-composition** (no authoring) | **69** |
| fixed by **card-text repair** | **2** |
| **held** for other live workers | **2** |
| unlinked rows deliberately left alone | 1,003 → now 1,074 |
| clips live-verified as a learner receives them | **71 / 71** |

Reachable clips still carrying මමා: **2**, and both are the deliberately held items.
Arithmetic closes: 1,074 unlinked + 2 held = 1,076.

## Scope re-derived, not trusted

I checked **all 13** audio-holder columns in the estate, not the 5 that #874's `pull.cjs`
covered (`course_legos` ×4, `course_practice_phrases` ×4, `course_seeds` ×3,
`lego_introductions` ×2). The count came out at exactly 71 + 2 = 73, confirming the brief.

One correction: the brief said the 71 lego clips span **72** distinct legos. They span **71** —
the mapping is 1:1. No clip is shared between two cards.

## (a) Calibration — is මමා actually voiced?

**73 / 73 confirmed spoken. 0 text-only artefacts.** Three independent lines of evidence:

1. **Token presence.** All 73 carry a මමා token in Azure's own per-token `word_boundaries`
   log — 84 tokens across the set. Azure emits a WordBoundary event only for units it
   places on the audio timeline.
2. **Duration distribution.** The reported durations are *not* anomalous, which matters
   because the first clip I sampled reported only 13ms for the මමා token and that looked
   like silence. Measured against a control of 4,000 clean clips on the same course and
   voice: මමා is 2 graphemes (ම + මා); genuine 2-grapheme Sinhala words report a median of
   163ms and **20.3% of them also report under 50ms**. The මමා tokens report a median of
   138ms with 29.8% under 50ms — statistically the same population. The 13ms was normal
   under-reporting, not silence.
3. **Decoded audio.** On 3 sampled clips I fetched the bytes the **live learner endpoint**
   serves and measured the මමා window: mean −11.6, −16.0 and −15.2 dB with peaks of −2.0
   to −5.4 dB, against a whole-clip mean of −17 dB. The windows are *louder* than the clip
   average. That is speech, not silence.

Strength: (1) and (2) rest on distribution counts — **strong**. (3) is direct measurement
of served bytes — **strongest**, but sampled at n=3.

## Root cause — confirmed: stale composition

The presentation clips were composed from **older card text that has since been repaired,
and were never re-composed**. Evidence:

- **Zero** `course_legos` rows in this course carry මමා in their own text today.
- All 71 lego clips recompose to text that **differs** from what is stored — i.e. every one
  is stale.
- The 12 headword-slot cases pair up one-for-one: each stale clip voices a headword the card
  no longer contains (table below).

The defect sat in the headword slot for **12** clips (11 headword + 1 both) and in the
example-sentence slot for **60** (59 example + 1 both).

### The 12 headword-slot cases (paired proof of staleness)

| lego | seed | stale headword (was voiced) | card text now | confidence |
|---|---|---|---|---|
| S0174L01 | 174 | `මමා කියන දේ ඔයාට` | `මම කියන දේ` | high |
| S0296L01 | 296 | `මමා ... කිව්වා` | `මම ... කිව්වා` | high |
| S0155L01 | 155 | `මමා බලාගෙන` | `මම බලාගෙන` | HELD |
| S0171L01 | 171 | `මමා ඔයාට හොයන්න` | `මම ඔයාට උදව් කරන්නද` | high |
| S0295L01 | 295 | `මමා ... කිව්වේ නෑ` | `මම ... කිව්වේ නෑ` | high |
| S0238L01 | 238 | `ඔයා මමා ලවා කියන්නයි ඕනේ කළේ` | `ඔයා මාව ලවා කියන්නයි ඕනේ කළේ` | high |
| S0293L01 | 293 | `ඔහු මමා ලවා හමු වෙන්නේ කොහෙද` | `ඔහු මාව ලවා හමු වෙන්නේ කොහෙද` | high |
| S0289L01 | 289 | `මමා ඔච්චරක් හිතනවා` | `මම ඔච්චරක් හිතනවා` | high |
| S0237L01 | 237 | `ඔයාට කියන්නයි මමා ලවා ඕනේ කළේ` | `ඔයාට කියන්නයි මාව ලවා ඕනේ කළේ` | high |
| S0181L01 | 181 | `මමා ළඟ ඕනේ` | `දොස්තර ළඟට` | HELD |
| S0250L01 | 250 | `මමා උත්තර දෙන්නට කලිං` | `මම උත්තර දෙන්න කලින්` | high |
| S0227L01 | 227 | `ඒ මිනිහා මමා ලවා අලුත් දෙයක් කිව්වයි` | `මට කියන්න හදනවා` | high |

## (b) The example slot is SELECTED, never authored

Confirmed against the current source (`services/phases/phase8-audio-v13.cjs`, composer at
lines 3355–3554). The offline re-implementation is faithful, and I validated it the only way
that means anything: **it reproduces 570 healthy stored clips byte-for-byte.**

The other 600 healthy clips it does *not* reproduce are the same staleness phenomenon at a
larger scale — e.g. a clip storing `මමට` where the card now reads `මට`. **My 73 are the මමා
subset of a much bigger stale-composition problem in this course.** I did not widen scope to
it; it is reported below.

Nothing was authored. Context sources chosen by the course's own composer for my 69:
`use_phrase` 46, `seed` 12, `none` 5, `none_overlap` 6. Two clips **gained** a real example
sentence where the stale clip had an empty slot; four lost one, both being the composer's own
deterministic decision, not mine.

## (c) The 2 card-text repairs

These 2 are categorically different from the 71: their clip text **matches** their card text,
so they are not stale — the card itself is corrupt.

| phrase | seed | English target | old known_text | new known_text |
|---|---|---|---|---|
| `S0216L01B03` | 216 | a few friends at home | `මමා යාළුවන් ටිකක් ඒ ගෙදරදී` | `යාළුවන් ටිකක් ඒ ගෙදරදී` |
| `S0226L01U03` | 226 | a man told me at home | `a මිනිහා මමා ලවා ඒ ගෙදරදී කිව්වා` | `a මිනිහා මාව ලවා ඒ ගෙදරදී කිව්වා` |

**S0216L01B03 — deleting මමා.** The English has no first person, so the pronoun is spurious.
Of 7,041 phrases whose English carries no first person, only **28 (0.4%)** carry a Sinhala
first-person pronoun anyway, and this row was one of those outliers. The converse holds too:
of 4,678 rows whose English *does* carry first person, 4,172 (89%) carry the Sinhala pronoun.
Confidence **high**, on distribution (n=7,041).

**S0216L01B03 — what I did NOT do.** I first proposed *also* reordering to put the locative
first, copying siblings U01/U05. **My own self-review refuted that.** Course-wide the
`ගෙදරදී` locative sits at the END in 6 rows and at the START in only 2 — so the row's
existing order is better attested than my "improvement" was. I dropped the reorder and shipped
the pure deletion. Net effect: the repair introduces **no new vocabulary at all**.

**S0226L01U03 — මමා ලවා → මාව ලවා.** Categorical distribution evidence: `මාව` appears in 119
rows, **98** of them immediately before `ලවා`. `මට` appears in 1,328 rows and **0** of them
before `ලවා`. Three sibling phrases at this very seed (U01, U02, U04) use `මාව ලවා ... කිව්වා`
for "told me". Confidence **high**, on distribution (98 vs 0).

**S0226L01U03 — the Latin `a` I deliberately left.** Untranslated English determiners are a
**separate whole-seed class**: exactly **8** rows course-wide have a bare Latin `the`/`a`/`that`
on the Sinhala known side, and **all 8 are at seed 226**. Repairing only my row would have left
the seed internally inconsistent (my row saying one thing, its 5 siblings another). Reported
below as its own finding.

Migration protocol (`docs/pods/pod-migration-protocol.md`, plate A-111): **verified a genuine
no-op.** `eng_for_sin` is absent from `lego_progress` entirely — 0 rows. Worth stating how that
check can mislead: a naive count of `lego_progress` rows matching my 71 lego_ids returns **818**,
because lego ids like `S0174L01` exist in every course and that column is not course-scoped.
Grouping by `course_id` shows 13 courses, none of them this one. And for the 69, the protocol is
a no-op by construction anyway: re-pointing an audio link does not move a slot.

## (d) The known-side gate is inert for Sinhala — my tokenizer

`tokenizeKnown()` splits on an ASCII-only class, so Sinhala tokenizes to nothing and a
"0 violations" result means nothing. I wrote my own (`sintok.cjs`) and disclose it:

- Word split on whitespace and ASCII punctuation only.
- **`Intl.Segmenter('si', {granularity:'grapheme'})`** for all length and prefix work, so a
  vowel sign (ා, ෙ, ි) and the ZWJ inside a conjunct (ග්‍ර) are never split from their base.
- **Stemming: grapheme-prefix matching**, min 3 graphemes. Not a morphological analyser.
- **Which way it errs:** deliberately lenient. It correctly unifies වෙනවා/වෙන්නට and
  ගෙදර/ගෙදරදී, but will also conflate unrelated words sharing a 3-grapheme opening —
  including මම / මමා, the very pair this job turns on, which is why the corruption check uses
  **exact identity**, never the stem match. Net: it **under-reports** violations and does not
  invent them. So a violation it reports is trustworthy; **a clean result is weak evidence.**

Result on both repairs: 0 not-introduced tokens, 0 ZUT hits in either direction across
`course_seeds`, `course_legos` and `course_practice_phrases`, 0 malformed graphemes, no
residual corruption, no Devanagari.

## (e) Gates — 71/71 passed on the first take

Duration models **refit from scratch** on this course and voice rather than inherited:

| population | model | sd | n |
|---|---|---|---|
| presentation | `ms = 3061.1 + 46.38 × chars` | 164 | 2,060 |
| known | `ms = 1392.5 + 45.53 × chars` | 130 | 11,943 |

The two slopes agreeing to within 2% (46.38 vs 45.53 ms/char) is corroboration that the model
is real, and the 1,669ms intercept gap is exactly the presentation template frame.

**Ellipsis correction confirmed and sharpened.** Against my tighter models, text containing a
literal `...` reads +5.17 sd (presentation, n=72, 95.8% exceeding |z|>3) and +7.09 sd (known,
n=71, 98.6%). So the base gate would fire on ~96–99% of *good* ellipsis clips. Such text is
judged against the ellipsis population — a corrected model, not a widened tolerance. 2 of my
shipped clips were judged this way.

Seven gates, all applied: decode/duration agreement · duration z (ellipsis-corrected) ·
**headword-voiced-per-token-array** · not-truncated · **no-filler-regression** (extended to the
whole doubled-ma family මමා/මමට/මමම/මමතා/මMA/Devanagari, plus stray ඥ and ෙවෙනස/දිහා/නනිකු,
asserted against both the token array *and* the TTS text) · no-end-click · example-fully-voiced.

Results: **71/71 passed all gates on attempt 1.** Max |z| 2.68 (mean 0.84), worst tail floor
−77.7 dB relative to peak against a −40 dB threshold, 446.1 seconds of audio.

Two gate improvements I kept from #874 and one I added:
- `ඒ ගෙ` is matched as **adjacent whole tokens**, not as a substring. The substring form also
  fires on the legitimate word ගෙදර/ගෙදරදී ("home") — 2 of this set's texts contain it and
  would have failed spuriously.
- The template artefact `ඉංග්‍රීසිෙන්` is reported as **INFO, never a failure** — see findings.
- Added: the doubled-ma family is asserted against the **TTS text** as well as the token array,
  since a corruption the voice silently swallowed is still wrong text to have shipped.

## (f) Make-before-break, and live verification

Order per item, never varied: bytes to S3 → `HeadObject` verify → insert row → repoint →
read the link back and assert. **No old clip was deleted.** The 71 stale clips are still on S3
and still in `course_audio`; they are simply unlinked now, which is why the unlinked count rose
from 1,003 to 1,074.

Schema traps navigated: `origin='tts'` set explicitly (NOT NULL, no default) · `language='sin'`,
`text_normalized` left to the BEFORE INSERT trigger · collision pre-check run through the
**database's own** `normalize_text()` and `canonical_voice_id()`, **0 internal and 0 external
collisions** so no reuse was needed · the autolink AFTER INSERT trigger only fills NULL links
and my 69 links were *not* NULL, so the explicit repoint was load-bearing and every final link
was read back and asserted.

On the 2 phrase repairs I found the trigger behaviour is **not** what the brief described:
`trg_null_phrase_audio_on_text_change` is BEFORE UPDATE and does **not** null the link — it
*re-resolves* it via `audio_id_for_text()`, which picks the newest clip matching the new text.
So inserting the clip *before* the text update lets the trigger land the link itself. It did,
for both, and I asserted the result rather than assuming it.

**Live verification — 71/71.** Each clip fetched from
`ssi-learning-app.vercel.app/api/audio/<id>` as a path segment: HTTP 200, **md5 of the served
body identical to my gated take**, and decoded duration within 60ms of `duration_ms`.
`courses.content_stamp` bumped 11:49:49 → 12:23:57, invalidating the learner's cached script.

## What I left alone, and why

**The 1,003 unlinked rows** — untouched per Tom's explicit instruction. Not deleted, not edited.

**2 held items**, fully prepared and gated but not applied, because they collide with live workers:

| lego | seed | why held |
|---|---|---|
| `S0181L01` | 181 | Seed 181 is explicitly held. Its example slot is drawn from a **seed-181 USE phrase**, so another worker's edit would instantly re-stale my clip. |
| `S0155L01` | 155 | Seed 155 is in the sibling's bare-`ගෙ` phrase cluster. Lower risk — its `contextSource` is `none`, so it reads only its own card text — but held on the brief's explicit instruction. |

Their recomposed text is in `plan.json`; whoever owns those seeds can ship them by running
`myrender.cjs` with `ONLY=S0155L01,S0181L01` and then `mylink.cjs --apply`.

## Findings for other passes (not mine to fix)

1. **The presentation template itself is malformed.** `presentation_templates` for `known_lang='sin'`
   is `{target_lang_name}ෙන්. '{known}'. '{seed}' ඉතින්. :`, which renders `ඉංග්‍රීසිෙන්` — a
   standalone `ෙ` vowel sign following the vowel sign `ි`, an illegal sequence. Correct Sinhala for
   "in English" is ඉංග්‍රීසියෙන් (needs the ය). This affects **all ~1,300 presentation clips in the
   course**, healthy ones included, which is why I gated it as INFO. Fixing it is a course-wide
   re-render and a separate decision.
2. **Stale composition is far wider than මමා.** 600 of 1,170 healthy presentation clips do not
   reproduce from current card text. A second corruption family `මමට` (where cards now read `මට`)
   is visible in that set. Worth a systematic re-composition pass.
3. **Latin determiners on the Sinhala known side, seed 226**: 8 rows carry a bare English
   `the`/`a`/`that`. All 8 at seed 226. One of them is the build card `S0226L01B03` ("a man" →
   `a මිනිහා`), so the seed teaches the artefact.
4. **28 rows carry a Sinhala first-person pronoun where the English has none** (0.4% of 7,041).
   Several are plainly wrong, e.g. "very surprised" → `මම ගොඩක් පුදුමයි`, "that is unusual" →
   `මම ඒ ගැන අසාමාන්‍ය`.
5. The other doubled-ma variants (`මමමමමම`, Devanagari `ममා`, `මMA`) exist in this course's text.
   #874 had drafted repairs for 4 such phrases outside my reachable 73. I did not verify their
   reachability — **explicit gap**, and a natural next job.

## EXPLICIT GAPS

1. **No independent adversarial verifier.** I changed card text, so verification was mandatory.
   Both permitted routes failed: the sonnet dispatch was **refused on the fan-out depth ceiling**
   (this worker sits at depth 2 of a 2-level tree), and `claude --print` reports **"Not logged in"**
   on this account. What I did instead is **self-review, named as such** — weaker than an
   independent opinion. It is however backed by real corpus counts, which a no-tools opinion could
   not have produced, and it **overturned one of my own two proposals** (the S0216 reorder), which
   is at least evidence the process bit.
2. **The "no unintroduced vocabulary" result is weak evidence**, by construction — my tokenizer
   under-reports. Stated in full in section (d).
3. **The decoded-audio confirmation of "මමා is voiced" was sampled at n=3**, not all 73. The other
   70 rest on token presence plus the duration distribution.
4. **No spares beyond the shipped takes.** All 71 passed on attempt 1, so `spares/` holds exactly
   the 71 shipped takes and there were no rejected takes to keep. Under this plate's idiom
   ("every take, pass or fail") that is complete, but it does mean there is no alternate take on
   the shelf.
5. **Reachability of the other doubled-ma variants not measured** (finding 5 above).

## Reproducing this

Scripts and logs are in this directory. Order:
`scope.cjs` → `calib2.cjs` → `fitmodels.cjs` → `recompose.cjs` → `plan.cjs` → `slots.cjs` →
`conflicts.cjs` → `collide.cjs` → `checktext.cjs` → `selfrefute.cjs` → `myrender.cjs` →
`render2.cjs` → `mylink.cjs [--apply]` → `verifylive.cjs`.

Every Sinhala string in this document was produced programmatically from the database, including
the tables above.
