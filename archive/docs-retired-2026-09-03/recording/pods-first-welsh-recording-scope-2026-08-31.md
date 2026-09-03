# Record the pods first — then what is actually left

**Welsh North, from the live database, 31 August 2026.**

# 374

**That is how many lines a human still has to say into a microphone to complete the audio for the Northern Welsh course** — 286 seed sentences that exist in no recording, plus 88 pod lines nobody has recorded yet.

For Welsh South the same sum is **444** — 207 seed sentences, 7 practice phrases, and all 231 pod lines.

*Corrected 31 August, after my own workers contradicted me. The first version of this document said 193, because I counted distinct target texts across seeds, LEGOs and phrases as one pool and let whole-clip concatenation cover 180 of them. Both halves of that were wrong, and the correction is below. The pods finding underneath is unchanged.*

---

## What I got wrong, and what the right unit is

Welsh North's LEGOs and practice phrases are **completely recorded**: 635 of 635 LEGOs and 4,997 of 4,997 practice phrases carry a `target1_audio_id`. There is no gap there at all.

The gap is entirely in **seed sentences**, and seeds are a real audio unit — `course_seeds` carries its own `target1_audio_id` and the player walks that table directly. Welsh North has **19 of 668 seeds** with audio. Every mature course has all of them:

| Course | seeds with target1 audio |
|---|---|
| spa_for_eng | 100% |
| fra_for_eng | 100% |
| deu_for_eng / ita_for_eng | 99.9% |
| nld_for_eng | 53% |
| cym_s_for_eng | 19.2% |
| **cym_n_for_eng** | **2.8%** |

So seed audio is the standard, and Welsh is the outlier precisely because it cannot fall back on TTS. Welsh North has 668 seed rows but only 306 distinct sentences; 286 of those 306 have no recording of any kind. At 8.4 words a sentence that is roughly **40 minutes of finished audio, or an afternoon in a room**.

I also banked 180 phrases on whole-clip concatenation. My own splice worker then measured what that concatenation does — 6% to 86% duration inflation, restarted pitch contours — so I have taken those 180 back out of the headline. They are a fallback, not a plan.

---

---

## Where Welsh actually stands

| | Welsh North | Welsh South |
|---|---|---|
| LEGOs with audio | 635 / 635 | 679 / 679 |
| Practice phrases with audio | 4,997 / 4,997 | 5,358 / 5,365 |
| Distinct seed sentences | 306 | 334 |
| **Seed sentences with no recording anywhere** | **286** | **207** |
| Pod lines still unrecorded | 88 | 231 |
| **Human lines still needed** | **374** | **444** |

A separate and free win sits alongside this: a further ~360 Welsh North seed rows are duplicates of sentences whose clip already exists but is not linked to the seed. That is a relink script, not a studio session.

## The thing you were testing, and the answer is no

Your insight was: the pods are 231 lines of real human speech we had been discounting, so recording them first should knock a large hole in whatever is left.

**It does not. Measured on the real course, the pods buy about 2%.**

Running the estate's own assembler (`services/recording-pools.cjs` — the reconstruction test Kai built, not a "the words appear somewhere" test) over the whole Northern Welsh course as if it were being voiced from scratch:

| Scenario | Lines a human must record |
|---|---|
| Pods discounted — the old calculation | 1,896 |
| Pods recorded, left whole | 1,896 — no change |
| Pods recorded, cut where the reader actually paused | **1,859** |
| Pods recorded, cut at every LEGO boundary | 1,492 |
| Pods recorded, cut at any word boundary | 1,028 |

Read down that column. The pods are worth 37 lines as they are read. They are worth 868 only if you are willing to cut anywhere inside them.

**So the lever was never the pods. The lever is cut granularity.** Discounting the pods cost the old calculation about 2% — it was very nearly the right call. What the old calculation actually left on the table is that no Welsh recording has ever been cut at all.

That is not a figure of speech. Of the 179 Aran and Catrin clips in `course_audio`, **zero have `word_boundaries`**. Nothing in Welsh has been through alignment. Every splice number above 1,859 is a prize for work that has not been started, on any Welsh course.

---

## Method, and what it cannot tell you

- Universe, phrases and pod lines pulled live from `course_legos`, `course_seeds`, `course_practice_phrases`, `listening_pod_sentences`. Pod count verified: **231 sentences, both Welsh courses** — your figure was right.
- Overlap computed with the estate's own chunker and assembler (`services/voice-engine/chunking.cjs`, `services/recording-pools.cjs`), not string equality. A phrase counts as covered only if it can be *reassembled* from spans of things that will exist, at the same minimum piece size the splicer would use.
- Pod text carries `…` at the reader's pause points. 288 of the 462 Welsh pod lines have them. My first pass left those glued to the words and silently understated the pods; the numbers above are the corrected run. Silence detection on the actual takes shows the readers honoured *fewer* pauses than the text marks — so "cut where the reader paused" is, if anything, generous.
- **Limit worth naming:** all of this assumes a piece may be as short as one word. Forbid single-word splices and Northern Welsh from scratch goes from 1,896 lines to **3,478**. That is the exchange rate, and it is your call, not a computation. It is the only taste fork in this document.
- Welsh initial consonant mutation is not a hazard here: matching is on surface text, so *car* and *gar* are different strings and cannot be confused. The hazard is prosody, and it is measured below.

---

## The quality half — what Aran and Catrin have actually got

Measured across all 322 Welsh human clips.

| | clips | mean peak | mean RMS | **mean noise floor** | flagged for re-record |
|---|---|---|---|---|---|
| Catrin | 112 | −1.5 dB | −18.1 dB | **−72.5 dB** | 0 |
| Aran | 158 | −1.6 dB | −16.6 dB | **−54.3 dB** | 41 |
| Aran, second set | 52 | −2.5 dB | −18.0 dB | −52.6 dB | 4 |
| Legacy course corpus | 20 sampled | −6.3 dB | −20.4 dB | −62.3 dB | 0 |

**The single number that separates them is the noise floor: Catrin's room is 18 dB quieter than Aran's.** Everything else — levels, peaks, consistency — is fine on both. 18 dB is a room and a microphone, not a performance.

Listen and judge for yourself.

Catrin, clean — *Croeso. Dach chi yma ar wyliau?…*
https://watson-1.tail4968cb.ts.net/evidence/welsh-pods-first-2026-08-31/30-best-catrin.mp3

Aran, typical — *Oes gynnoch chi frechdanau?…*
https://watson-1.tail4968cb.ts.net/evidence/welsh-pods-first-2026-08-31/33-typical-aran.mp3

Aran, digitally clipped, peaks at +1.3 dB — *Ga i ddau goffi gwyn…*
https://watson-1.tail4968cb.ts.net/evidence/welsh-pods-first-2026-08-31/31-worst-aran-clipped.mp3

Aran, trim-chain damage — the clip ends before the word does
https://watson-1.tail4968cb.ts.net/evidence/welsh-pods-first-2026-08-31/32-worst-aran-trimdamage.mp3

The trim-chain flag holds up empirically, not just as a label: those 41 clips are **100% zero-padded hard cuts** at the start and ~98% at the end, with a noise floor about 12.5 dB worse than Aran's own unflagged clips. His second set also carries genuine digital clipping on 2 of 42 (+1.35 dB and +0.04 dB true peak).

Your ruling on 2026-08-16 that none of Aran's takes were salvageable is written into the data: 65 Welsh clips carry `rerecord_wanted`, reason *"T-20 ALL: full re-record commissioned 2026-08-16 (trim-chain damage, whole set)"*. That was a pipeline defect, not a performance one.

**Fixable with better process:** noise floor (room and mic — Catrin's setup is the existence proof), clipping (gain staging), trim damage (pipeline), level inconsistency (loudnorm already does this).
**Hard ceiling:** none of the above. Every measured weakness in the human recordings is a process problem with a demonstrated solution in the same corpus.

Two pod takes as they stand today:

Aran, pod line 3 — *Dw i'n dda iawn, diolch. Wyt ti'n mynd i'r gwaith?*
https://watson-1.tail4968cb.ts.net/evidence/welsh-pods-first-2026-08-31/12-pod-aran-dwin-dda-iawn.mp3

Catrin, pod line 4 — the long one with real internal pauses
https://watson-1.tail4968cb.ts.net/evidence/welsh-pods-first-2026-08-31/13-pod-catrin-diwrnod-prysur.mp3

---

## The splice half — this is where the ceiling is

Eight Welsh phrases the course needs were built by joining pieces of real recordings, using the estate's own recipe (−16 LUFS normalise, 20 ms crossfade, iOS-safe encode), each paired with the natural whole take of the same sentence.

The measurement that matters is **pitch at the seam**. A join between two pieces recorded in different sentences can drop or jump the speaker's register mid-phrase, and no amount of level matching hides it.

- 8 examples, 1–5 joins, 21 joins in total
- 10 of the 15 joins where pitch was measurable on both sides jumped **4 semitones or more**; average absolute jump 8 semitones; worst **17.7 semitones** — an octave and a half, mid-sentence
- every spliced version ran longer than the natural take of the same words: **+6% to +86%, averaging +36%**, and inflation rises with join count
- 16 of 21 seams land in near-silence, because each source clip carries its own lead and trail padding — the gap *is* the defect

Two structural facts came out of that run and both matter:

**The splicer has never been run in production.** The S3 `segments/` prefix is empty for every course, and `course_audio` carries no `spliced` origin anywhere. Splice-and-dice is a design, not a capability we have exercised.

**It does not crossfade.** `spliceSegmentsToFile()` hard-concatenates independently loudness-normalised clips; the crossfade path exists but is not wired in, because ffmpeg 7's threaded `acrossfade` nondeterministically drops whole segments. That is exactly what the padding and pitch-jump numbers predict.

**One point in splicing's favour, for Welsh specifically:** every mutation-triggering pair in the sample — *mor fuan â **phosib***, *fy **mhres** yn ôl*, *y **ddwy** hogan* — landed inside a single M-LEGO and never across a join. The LEGO decomposition already bundles trigger and mutated word as one recorded unit, so Welsh mutation is structurally protected rather than luckily avoided. Worth a larger sample before calling it proven, but the mechanism is sound.

**A good one** — one join, zero pitch jump, seam falls in silence:

spliced — *ga i nôl rhywbeth i chi yfed?*
https://watson-1.tail4968cb.ts.net/evidence/welsh-pods-first-2026-08-31/20-spliced-good-ga-i-nol-rhywbeth.mp3

the same words, recorded whole
https://watson-1.tail4968cb.ts.net/evidence/welsh-pods-first-2026-08-31/21-natural-good-ga-i-nol-rhywbeth.mp3

**A bad one** — 17.7 semitones at the first join, 70% duration inflation:

spliced — *'swn i chdi, fyddwn i ddim yn rhoi fo iddo fo ar dy ben dy hun*
https://watson-1.tail4968cb.ts.net/evidence/welsh-pods-first-2026-08-31/22-spliced-bad-swn-i-chdi.mp3

the same words, recorded whole
https://watson-1.tail4968cb.ts.net/evidence/welsh-pods-first-2026-08-31/23-natural-bad-swn-i-chdi.mp3

**And another** — *dan ni ddim yn gweld y ddwy hogan yn aml*, 8.6 semitones at the second join:

spliced
https://watson-1.tail4968cb.ts.net/evidence/welsh-pods-first-2026-08-31/24-spliced-bad-dan-ni-ddim.mp3

recorded whole
https://watson-1.tail4968cb.ts.net/evidence/welsh-pods-first-2026-08-31/25-natural-bad-dan-ni-ddim.mp3

Three more built from the 180 phrases Welsh North can actually assemble today from whole takes:

*pa mor hen ydyn nhw?* — one join
https://watson-1.tail4968cb.ts.net/evidence/welsh-pods-first-2026-08-31/01-spliced-pa-mor-hen-ydyn-nhw.mp3

*y dyn ifanc sydd isio siarad* — two joins
https://watson-1.tail4968cb.ts.net/evidence/welsh-pods-first-2026-08-31/02-spliced-y-dyn-ifanc-sydd-isio-siarad.mp3

*fedri di ddal y drws ar agor tra dw i'n nôl y goriadau?* — two joins
https://watson-1.tail4968cb.ts.net/evidence/welsh-pods-first-2026-08-31/03-spliced-fedri-di-ddal-y-drws.mp3

**I cannot hear these.** The pitch and duration figures are measurements; whether a 17.7-semitone seam is unacceptable or merely odd is your ear's call, and that is exactly why the A/B pairs are above rather than a verdict.

What the measurements do say plainly: splice quality tracks join count and where the seam lands. One join into a silence is nearly free. Three joins across voiced material is where it falls apart. And the whole-course splice plan averages **3.1 pieces per assembled phrase** — the failure case is the normal case, not the edge case.

---

## What I would do

1. **Finish Welsh North the honest way.** 286 seed sentences and 88 pod lines, recorded whole, by Catrin, in Catrin's room. Around 40 minutes of finished audio. No splicing needed for any of it, so no ceiling to argue about.
2. **Do not use the pods as a splice corpus.** They earn 37 lines. Record them because the pods need recording.
3. **Relink before you record.** ~360 Welsh North seed rows duplicate sentences whose clip already exists and simply is not linked. Free.
4. **If you want the splice lever, buy it once, properly:** run alignment over the Welsh corpus so `word_boundaries` exists, and wire a crossfade that survives ffmpeg 7. That is what turns 1,896 into 1,492 for the next minority language — and it is a code job, not a studio job. Today the splicer has never run in production at all.
5. **Record the fixable things out of Aran's next session:** quieter room, gain 6 dB lower. His performance is not the problem.

---

## Explicit gaps

- **I cannot hear any of the audio.** Every perceptual claim in this document is a measurement plus a player. The verdict is yours.
- **Legacy corpus liveness: resolved, and it is real.** 130 clips sampled stratified across both courses and both target roles: **130/130 exist in S3 and decode cleanly** (Wilson 95% CI 97.1–100%), none silent, none truncated, stored durations matching measured within 200 ms. target1 and target2 are genuinely different recordings — 0 of 25 sampled pairs shared an MD5.
- **But nobody knows whose voices they are.** `legacy_import` is a hard-coded placeholder in the importer (`database/import-course-v13.cjs:204`, comment *"Unknown from legacy manifest"*), and `origin='human'` is the importer's own tag, not evidence. All 13,078 rows landed in one bulk import on 2026-01-04, and no `recording_provenance` row covers any of them. A prior audit reached the same dead end. If you ever need to say who is speaking on 95% of the Welsh course, the data cannot tell you.
- **Welsh South pod audio is zero.** All 231 lines unrecorded, and its `pod-0` is `visibility: live` while the Northern one is `held`.
- **No before/after recording margins exist** in `recording_provenance` — there are no margin columns, so the gain-fix improvement cannot be quantified from the database, only inferred from the levels.
