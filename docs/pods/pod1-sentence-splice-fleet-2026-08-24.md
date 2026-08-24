# Pod 1 sentence clips — spliced, not rendered. 21 courses, £0

*2026-08-24. Tom ruled splice over render at 12:24Z on job #343's evidence. This is what landed.*

## What was wrong

The Pod 1 split-array repair NULLed `sentence_audio_ids` on every live Pod 1 — correctly, because
the arrays it found had been inherited positionally from a *retired* pod and pointed at another
pod's clips. But it left ~1,500 multi-sentence turns playing to the learner as one undifferentiated
block: `podSentenceSplit.ts` returns a single whole-turn unit for any row with fewer than two
sentence clips.

The obvious repair was to render each sentence as its own TTS take, which is what Italian got. Tom
stopped that and asked why we'd render a second performance of audio we already have. Job #343
answered it with measurement; this job collected on the answer.

## What landed

Every multi-sentence turn's own whole-turn clip was cut at its sentence gaps with ffmpeg. No TTS.
No money. The learner hears the **same take** they hear today, just addressable per sentence.

| | turns |
|---|---|
| Multi-sentence turns needing clips | 1,501 |
| **Linked by splice** | **1,337** |
| Refused → render list | 72 |
| Unlinked again on the known-side gate | 92 |

3,596 clips spliced, 479 reused (already existed under the dedup key — found before cutting, so a
properly rendered clip can never be overwritten by a spliced one). **0 errors across 21 courses.**
Wall clock: **12 minutes.** Cost: **£0.**

Italian was left alone — its 311 rendered clips are live and correct.

Per-course results are in `docs/pods/<course>-sentence-splice-2026-08-24-applied-log.json`, one row
per turn with its gaps, margin, piece durations and worst seam level.

## The gates, and the one that was lying

The rule is Tom's: **cut only in silence, refuse rather than guess.** A refused turn keeps its
whole-turn clip and is exactly as it was this morning — no worse. A guessed cut ships a clip that
starts mid-word, which is worse than no split at all.

Five gates, each fails closed:

1. **gap count** — fewer than N−1 interior silences means no cut is possible.
2. **margin ≥ 1.5** — shortest gap cut at ÷ longest gap rejected. Below that, a comma pause is
   competing with the sentence gap and choosing is a coin toss.
3. **seam silence** — every internal seam must be quiet, absolutely (≤ −35 dB) *and* relative
   (≥ 20 dB below its own piece's speech peak).
4. **piece duration** — nothing under 0.35 s.
5. **known-side count** — see below; added mid-job, on evidence.

### The seam gate was fail-open, and nothing in the output said so

The check that proves a cut didn't land mid-word was measuring nothing. `-ss` before `-i` is a fast
seek to the nearest mp3 frame; on these clips it decoded an **empty window** — `n_samples: 0`,
volumedetect printing no level at all — and the code read that silence-shaped nothing as "−91 dB,
quiet, pass". Measured at the same instant with an accurate method: **−2.0 dB. The middle of a
word.**

The obvious fix was wrong too. `-ss` *after* `-i` is an output option: it discards frames after the
filter graph has already seen them, so volumedetect measured the **whole file** — 102,864 samples
for a 30 ms request, every window returning the clip's overall peak.

The working answer is the `atrim` filter, which cuts inside the graph: verified at exactly 1,440
samples for 30 ms at 48 kHz. With a real gate, the very first run refused a German turn.

Both bugs are now regression tests against synthesised audio whose true levels are known by
construction — `tools/pods/splice-sentence-clips.test.cjs`, 14 tests, all passing. A gate that fails
open is worse than no gate, because it launders a bad cut as verified.

### And the gate that was too strict

The seam floor started at −45 dB and that was also wrong, measured rather than argued. It refused
`deu SC04-S003`, whose cut sits in the middle of a genuine 783 ms pause — profiled at 30 ms
resolution: −91, −91, −49, −90, −91, −73 dB — and whose seam reads −36.8 dB only because a breath
falls in the window. A gate stricter than the method's own definition of silence doesn't reject bad
cuts; it rejects clips with an audible breath. The absolute floor moved to −35 dB (the silence
threshold the cut is *defined* on) and the relative test was added, which is the one that actually
discriminates: a cut through a word leaves a seam within ~10 dB of speech, that breath sits 30 dB
down.

## The Croatian finding — a text decision, and it is Tom's

92 turns were spliced, verified clean, and then **deliberately unlinked**. Every audio gate passed
on them. The defect is upstream of the audio, in the text:

> `hrv SC07-S009`
> target — *"Da, mogu li dobiti… i čašu vode, molim."*
> known — *"Yes, can I have a glass of water as well, please."*

Croatian Pod 1 uses **"…" as a mid-sentence hesitation marker**. The app's own boundary regex
(`POD_SENTENCE_BOUNDARY`) counts "…" as terminal, so that one sentence becomes two pieces — and
`generatePodAudio` uses the *same* regex to place its " … " TTS pause cue, so the take genuinely
pauses there and the splicer finds a wide, clean, high-margin gap. **The cut is good. The unit is
not a sentence.**

The learner-visible harm is on the known side: `splitRowUnits` pairs known text to cards by index
(`kSents[i] || ''`), so a target split into 2 against an English text of 1 sentence gives card 2 an
empty translation — and card 1 the fragment *"Da, mogu li dobiti…"*, which is not something anyone
should be asked to learn.

The gate added for this counts parts rather than looking for ellipses, because that is the general
form: it catches the 78 Croatian rows and the 14 unrelated mismatches elsewhere with one rule.

| course | rows unlinked | of which mid-sentence ellipsis |
|---|---|---|
| hrv_for_eng | 78 | 78 |
| jpn_for_eng | 6 | 0 |
| kor_for_eng | 5 | 0 |
| gle / hin / zho | 1 each | 0 |

Those rows are back to exactly the whole-turn behaviour they had this morning. Their spliced clips
were **kept** in `course_audio` — correct audio of the wrong unit — so if the text ruling changes,
relinking is free and nothing needs rendering.

**The question for Tom:** should Croatian Pod 1 keep "…" as a hesitation marker in its target text?
If yes, the boundary regex needs to stop treating "…" as terminal (it is a one-line change in
`podSentenceSplit.ts`, but it is learner-facing and shared). If no, the 78 Croatian texts want
rewriting. Either way it is a content decision, not an audio one, and nothing was guessed.

Log: `docs/pods/known-mismatch-unlink-2026-08-24-applied-log.json`.

**Five more rows have the same defect and were left alone** (ara_eg 1, hin 3, kor 1): they were
split by earlier work, not by this pass. Same harm, but reverting someone else's live content
because it failed a gate invented today is not this job's call. They are listed in the same log.

## The render list — 72 turns, and nothing rendered

`docs/pods/splice-refusals-render-list-2026-08-24.json` — machine-usable, one entry per refused turn
with the sentences to render, the course, the row id, and the measured reason.

| reason | turns |
|---|---|
| margin_below_floor | 56 |
| seam_not_silent | 10 |
| too_few_gaps | 6 |
| **total** | **72 turns / 214 sentences** (4.8% of 1,501) |

Concentrated where the census predicted: zho 16, deu_at 14, kor 12, deu 8. **Nothing here has been
rendered** — that is a separate, Tom-triggered step, and the list exists so the spend can be aimed
at exactly the turns the free path measurably could not do.

The refusal rate came in at **4.8% against the census's ~8%**.

## Progress

Carried forward per the standing content-change migration protocol, GREATEST-guarded, one
transaction per course, snapshotted first. The split is a change of granularity, not content, so N
exposures of a turn is N exposures of each of its sentences.

Only three courses had any progress on the affected rows: **fra 5 rows → 14 slots, swe 2 → 4,
eus 1 → 2.** Everything else was zero. Small, but those learners keep what they had.

## Verification

Through the real learner path — `saysomethingin.app/api/audio/<id>`, not S3 —
`tools/pods/verify-spliced-sentences.cjs` checks five things per row: clips **serve**; each clip's
stored text is **exactly its own sentence** (this is what catches a reversed or off-by-one array);
**app parity**, by reproducing `splitRowUnits` so it knows what the player will actually build;
**seams**, re-measured on the delivered bytes; and **speech**, via whisper.

### Reading the STT number

Only multi-word clips count, and this matters. On the German pilot 11 of 22 clips "failed" at CER
1.0 and **not one of them was wrong**:

| expected | whisper heard |
|---|---|
| Sieben. | 7. |
| Dreißig. | 30 |
| Samstag. | Zamztak. |
| Danke. | 謝謝 |

Numeral conventions, an orthographic near-miss, and a language-ID failure on 1.1 s of audio — a
known limit of whisper at this length, and the language was already forced. Over the same run,
**every clip of two words or more scored CER 0.000–0.048.** Word count is the line between a
measurement and a guess, so the headline is computed over multi-word clips only and single-word
results are recorded but never counted.

## Explicit gaps

1. **Nobody has listened.** Duration agreement, seam levels, exact text and transcription are
   strong, and they are not ears. Job #343's listening bench is still the real gate.
2. **The known side is not split.** `sentence_known_audio_ids` was out of scope: 1,796 of 2,144
   multi-sentence turns have no known split today, and the app degrades gracefully (it pairs the
   regex-split English text by index and simply has no per-sentence English audio). Splicing the
   known side is the same free method and is a follow-on pass — not something to slip in silently.
3. **Italian's 1 residual turn** was left alone with the rest of Italian.
4. The 5 pre-existing known-mismatch rows above are reported, not fixed.
