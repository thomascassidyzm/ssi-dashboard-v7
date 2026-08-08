# Seed-1 audio census + truncation measurement — deu_for_eng & fra_for_eng

**2026-08-06 · diagnosis only, no TTS generated · every number below is measured, not inferred**

## Numbers first

| | deu_for_eng | fra_for_eng | both |
|---|---|---|---|
| Distinct live clips reachable from seed 1 | **74** | **65** | **139** |
| Measurably damaged (truncated) | **0** | **0** | **0** |
| Marginal / worth one listen | 0 | 1 | 1 |
| Blanket seed-1 regeneration cost | $0.021 | $0.024 | **$0.045** |

**Headline: I found no physical evidence of truncation in either course's seed-1 audio.**
All 139 clips fetched, decoded and measured — none failed.

**The money question dissolves.** A blanket regeneration of all seed-1 audio in both
courses costs **4.5 cents**. The reason to not do it is not spend — it is churn: the
last deu repair is what produced the live linking bug below.

**The real finding is a linking bug, not a truncation bug** — 10 deu seed-1 slots are
serving audio that was already replaced, and the replacements are sitting unlinked.

---

## The actual defect: 10 deu slots serve superseded audio

deu_for_eng seed 1 has 10 slots whose `*_audio_id` points at a clip marked
`::superseded-regen`. For **all 10**, a replacement exists — generated today,
13:48–13:52 — and was never linked. Two distinct failure shapes:

**6 phrase slots — partial relink.** The replacement was linked to the *lego* but the
*practice phrase* was left pointing at the old clip:

| phrase slot | text | serving (superseded) | replacement exists, linked only to |
|---|---|---|---|
| `S0001L01B01` known | "I want" | `repair-candidates/5F417854-…mp3` | lego `S0001L01`:known |
| `S0001L05B01` known | "with you" | `repair-candidates/0FEA7E2A-…mp3` | lego `S0001L05`:known |
| `S0001L01B01` target1 | "ich will" | `mastered/1CD434B3-…mp3` | lego `S0001L01`:target1 |
| `S0001L05B01` target1 | "mit dir" | `mastered/21850EDE-…mp3` | lego `S0001L05`:target1 |
| `S0001L01B01` target2 | "ich will" | `mastered/0BEF3EF1-…mp3` | lego `S0001L01`:target2 |
| `S0001L05B01` target2 | "mit dir" | `mastered/50D3D330-…mp3` | lego `S0001L05`:target2 |

**4 presentation slots — orphaned replacement.** New clip minted, linked by *nothing*;
the lego still points at the superseded one:

| lego | text | replacement (unlinked) |
|---|---|---|
| `S0001L02` | "The German for: 'to speak'…" | `mastered/C084E8FD-…mp3` |
| `S0001L03` | "The German for: 'German'…" | `mastered/679E6F5C-…mp3` |
| `S0001L04` | "The German for: 'now'…" | `mastered/D300CB1F-…mp3` |
| `S0001L05` | "The German for: 'with you'…" | `mastered/FDF82F24-…mp3` |

This is a **relink, not a regeneration** — the audio is already paid for and on S3.
fra_for_eng has zero superseded links.

---

## Part A — clip census

Counted by resolving every `*_audio_id` column on the seed row, its 5 legos and all
its practice phrases — **not** by `course_audio.lego_id`, which is null on most of
these rows. Query: `scripts/seed1-census/census.cjs`.

| | deu_for_eng | fra_for_eng |
|---|---|---|
| content rows (seed / legos / phrases) | 1 / 5 / 20 | 1 / 5 / 17 |
| non-null audio_id references | 87 | 74 |
| — live | 77 | 74 |
| — superseded | 10 | 0 |
| — dangling (id → no row) | 0 | 0 |
| **distinct live clips** | **74** | **65** |
| known | 23 | 20 |
| target1 | 23 | 20 |
| target2 | 23 | 20 |
| presentation | 5 | 5 |

Distinct < references because clips are shared between slots (deu 77→74, fra 74→65).
**139 is the number a blanket "regenerate all of seed 1" would re-render.**

**Correction to the prior finding: fra_for_eng does have seed-1 `known` audio — 20
clips.** The earlier "zero" came from filtering on `lego_id like 'S0001%'`; `lego_id`
is null on these rows and they are reachable only through the `known_audio_id`
columns. Not a bug — a counting artefact. Worth passing to whichever job it blocked.

---

## Part B — truncation measurement

### Method, and why not the existing probe

`tools/physical-tail-probe.cjs` measures RMS over the final 50 ms **of the file**.
Every clip here carries a silence pad (median 98 ms), so that window lands entirely
in the pad. I computed what that probe would have reported: **`naiveTailRatioDb`
ranges −124.7 to −30.1 dB across all 139 clips** — against its own −6 dB threshold it
would call every single clip clean, including any genuinely cut one. The trap is real
and quantified.

Mine anchors everything to the **onset of trailing silence**, found by walking back
through a 10 ms-window / 5 ms-hop energy envelope to the last frame above
peak−40 dB (`scripts/seed1-census/probe-lib.cjs`). Per clip:

- `tailRatioDb` — RMS of the 50 ms *immediately before* the onset, vs body RMS (pad excluded)
- `stepDb` — last 10 ms of signal vs the 20 ms of silence after it
- `decayDb` — envelope 5 ms before onset minus 55 ms before it. **Threshold-independent**: a natural ending is falling (negative), a cut runs flat into the boundary (≈0 or positive)
- `trailingSilenceMs`, `boundaryPeakAmp`/`boundaryPeakDbfs`

A first version reported the raw amplitude at the last supra-floor *sample*; that is
degenerate — it re-reports whatever floor you chose (every clip landed at −45 dBFS
against a −45 dB floor). Replaced with the frame-based measures above.

### Distribution — and why I set no threshold

| metric | min | p25 | p50 | p75 | p90 | max |
|---|---|---|---|---|---|---|
| `tailRatioDb` | −32.4 | −22.9 | −17.5 | −8.1 | −2.0 | **+1.4** |
| `decayDb` | −32.4 | −23.0 | −17.4 | −10.9 | −5.1 | **+7.8** |
| `stepDb` | 1.9 | 6.9 | 10.3 | 17.8 | 39.9 | 92.5 |
| `trailingSilenceMs` | 34 | 84 | 98 | 111 | 123 | 277 |

**The distribution is unimodal and continuous. There is no damaged population to
threshold off.** The largest gap anywhere in the upper half of `tailRatioDb` is
0.98 dB — noise. A cut-clip population would show as a separated cluster; there
isn't one. So rather than draw a line through a smooth distribution, I required
**two independent signals to agree**: `tailRatioDb > −6` (tail as loud as the body)
**and** `decayDb > −6` (energy not falling into the boundary).

Each alone has a benign explanation, and in this data each alone is *wrong*:

- The three highest `decayDb` clips — "jetzt" (+7.8), "mit dir" (+6.8), "je veux" (+4.3) — all have `tailRatioDb` of −18 or lower. They end in a fricative/plosive burst that rises at the very end. Normal German and French word endings.
- The highest `tailRatioDb` clips are all short (0.95–1.4 s) with strongly *falling* decay (−11 to −24). On a 1 s clip, 50 ms is simply a large fraction of the whole.

**Result: 1 of 139 clips meets both. Split: 138 clean / 0 damaged / 1 marginal.**

### Two independent cross-checks, both negative for truncation

**Post-hoc truncation — ruled out.** `course_audio.duration_ms` is written at
generation; the live S3 object is never more than 46 ms shorter (median −24 ms, pure
mp3 frame padding). **No object was truncated or shortened after its row was written.**
Any truncation would have to be baked in at generation.

**Missing speech — measured, not inferred.** I counted voiced energy nuclei
(250–1600 Hz band-limited envelope) and compared to the syllable count implied by the
text. Overall median deficit 0. French *target* clips showed a mean deficit of +1.05
— which looked like French clips missing speech, exactly the reported symptom.
**It is an artefact of my own estimator.** The deficit scales cleanly with how many
nasal-vowel graphemes the text contains:

| nasal graphemes in text | 0 | 1 | 3 | ≥4 |
|---|---|---|---|---|
| mean syllable deficit | −0.08 | +0.30 | +2.30 | +2.13 |

Written French spells one nasal vowel with two vowel letters, so orthography
over-counts syllables for exactly those words ("maintenant", "français", "avec toi").
French *known* clips — same course, same files, but spoken English — show −1.10,
matching German's −1.46. **The French "deficit" is my estimator, not damage.**

### Confidence bound — the positive control did not pass

A "nothing is damaged" verdict is only worth what the probe's sensitivity is worth.
The 10 superseded deu clips were replaced *because they were judged truncated*, so
they are known positives. Measured with the identical code path against their
replacements (n=10 pairs, same text, same voice):

| mean | superseded | replacement |
|---|---|---|
| `tailRatioDb` | −20.71 | −19.43 |
| `decayDb` | −13.77 | −13.00 |
| `stepDb` | 11.31 | 10.02 |
| `durationSec` | 2.17 | 2.27 |

**Statistically indistinguishable.** Two readings, and I cannot fully separate them
without listening:

1. My probe is insensitive to the damage that got them replaced; or
2. **Those clips were never truncated** — they were replaced on a bad signal.

The evidence favours (2). If the old clips had been missing speech, re-rendering the
same text in the same voice would produce systematically longer files. It doesn't:
mean +0.10 s (+4 %), **4 of the 10 replacements came out *shorter***, and "ich will"
is identical to the millisecond. Syllable-nuclei counts within pairs move in both
directions (±3, within the method's noise). That is the signature of clips that were
fine being regenerated needlessly — which, if the selector that flagged them is still
running, is a recurring spend, not a one-off.

I am stating this as the *more likely* reading, not a proven one. Distinguishing them
needs ASR or a human ear (see gaps).

---

## Part C — the targeted list

**Measurably damaged clips: 0 of 139. There is no targeted regeneration list, because
nothing measured as damaged.**

The contrast asked for: **139 clips in a blanket seed-1 rerun vs 0 measurably damaged.**
And **10 clips that need no generation at all — only a relink.**

The single marginal clip, for one human listen before any spend:

| field | value |
|---|---|
| course | fra_for_eng |
| slot | lego `S0001L01` presentation |
| role | presentation |
| id | `57a00636-ba8d-4502-9276-b01333baa960` |
| s3_key | `mastered/90D2CB79-7FD3-4915-ABDC-E5EADAF4F5A9.mp3` |
| text | "The French for: 'I want', as in — 'I want to speak French with you now', is:" |
| duration | 4.464 s |
| tailRatioDb | −3.33 |
| decayDb | −4.36 |
| stepDb | 35.14 |
| trailing silence | 94 ms |

It is the only clip where both signals agree, and both only marginally (−3.3 and −4.4
against a −6 line). Its text ends in "is:" — a clip that ends on a colon is *meant* to
stop abruptly and hand over to the target word, so an unresolved tail is expected here
rather than evidence of a cut. I flag it for a listen; I do not recommend regenerating it.

---

## Part D — cost

**Provider: xAI, for every seed-1 clip in both courses.** No Azure, no ElevenLabs in
this set. Voice ids are `eve`/`ara`/`leo` (deu) and `xai_eve`/`eve`/`xai_leo` (fra);
bare and `xai_`-prefixed are two spellings of the same voices
(`tools/revoice-clips.cjs:103`), and both spellings coexist in both courses. All 139
rows are `origin='tts'`.

**Rate: $15.00 per 1M characters** — repo-sourced, `services/phases/phase8-audio-v13.cjs:5601-5607`,
citing docs.x.ai/docs/pricing checked 2026-07-28. That comment also records that an
older $4.20/1M figure in this repo was never a billed rate and under-estimated xAI by 3.6×.

| | clips | billable chars | cost |
|---|---|---|---|
| deu_for_eng | 74 | 1,379 | $0.0207 |
| fra_for_eng | 65 | 1,598 | $0.0240 |
| **both** | **139** | **2,977** | **$0.0447** |

Per role: deu known 23/$0.0053, target1 23/$0.0058, target2 23/$0.0058, presentation 5/$0.0038.
fra known 20/$0.0055, target1 20/$0.0064, target2 20/$0.0064, presentation 5/$0.0057.

Seed 1 is short text, so the spend rail is not what should decide this. The argument
against a blanket rerun is that the previous rerun is what left 10 slots mislinked.

---

## Explicit gaps

1. **No ground truth on what the clips actually say.** No whisper/ASR on this machine, and `course_audio.word_boundaries` is **NULL for all 139 rows** (verified: `count(word_boundaries)=0`) — so the one stored record of what TTS reported speaking is unavailable. I could not verify any clip against its text. Everything in Part B is physical waveform evidence only.
2. **The positive control did not separate**, so I cannot put a sensitivity floor on the probe. My "0 damaged" is bounded by that: it means *no clip shows the physical signature of a cut*, not *no clip is wrong*. A clip missing a final word but ending on a clean decay would pass every test here.
3. **Syllable-nuclei counting is approximate** and, as shown, biased by orthography across languages. I used it only for within-pair comparison; the live-set numbers are in the JSON but should not be read as absolute syllable truth.
4. **The data moved during this job.** deu_for_eng had 21 `course_audio` rows created in the 3 hours before this snapshot (latest 15:04Z) — a concurrent repair campaign. The 10 relink findings reflect the DB at snapshot time and should be re-checked before acting.
5. **Not a learner-path finding, stated to close it off:** 12 deu clips under `repair-candidates/` return 403 on the public S3 URL that `physical-tail-probe.cjs` builds, while `mastered/` objects are public. I re-fetched them with credentials and all 12 exist and decode. The learner fetches via **presigned** URLs (`ssi-learning-app/api/audio/batch-urls.ts`), so this is a probe-convention artefact, not learner breakage — though the ACL inconsistency between the two prefixes is real.

---

## Raw data & code

- Per-clip measurements (all 139, every metric): `docs/audio/truncation-census-seed1-2026-08-06.json`
- **Committed, reusable probe: `tools/seed-audio-tail-probe.cjs`** — reproduces every census and measurement number in this report: `node tools/seed-audio-tail-probe.cjs fra_for_eng --seed 1`. It also prints the superseded-link warning that surfaced the deu defect above.
- One-off analysis code (positive control, syllable nuclei, relink check) is in `scripts/seed1-census/`, which is gitignored by repo policy; the method is documented in the tool's header and the queries are quoted above.

## Recommendation

1. **Relink the 10 deu slots** to their existing replacements — no generation, no spend.
2. **Listen to the one fra presentation clip** before deciding anything.
3. **Do not blanket-regenerate seed 1.** Nothing measured as damaged, and the previous rerun caused the only defect actually found.
4. **Look at whatever selector flagged those 10 deu clips as truncated** — the evidence suggests they were fine, and it may still be spending.
