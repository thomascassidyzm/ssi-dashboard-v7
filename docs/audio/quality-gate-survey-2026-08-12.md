# The audio quality gate — what it is, what it actually covers, and why recent clips still sound clipped

**2026-08-12 · analysis only. No audio rendered, no DB rows written, nothing triggered on popty.app.**
Every number below is measured. Where I could not measure, it says so.

---

## Headline

| | |
|---|---|
| The canonical check | **`checkAudioVeracity` in `services/audio-veracity.cjs`** (whisper round-trip) |
| `flagTailDefect` as a gate | **Unusable** — 9% precision by ear (7/76), read-only by design |
| Clips in `course_audio` | **2,562,605** |
| Clips ever veracity-checked | **1,608 — 0.06%** |
| Clips checked by the pre-publish gate (`veracity_checker='phase8-generate'`) | **48**, all on 2026-08-06 |
| Render paths that call the gate | **1 of 11** (`phase8-audio-v13.cjs` only) |
| Clips proven failed and still live | **21 rows** |
| Fresh-cohort damage, measured tonight (348-clip whisper sample) | **~1–2 genuine defects in 268** non-dialect clips |

**The diagnosis in one line:** the gate is real and works, but it is wired into exactly one module
and has gated 48 clips in its lifetime — so 99.94% of the estate is unverified. *However*, when I
actually listened to 348 clips from the most recent big render (2026-08-08), they came back
**~99% clean**. So the truncation Tom is hearing tonight is **not** fresh render damage. The
evidence points at the **serving path**, not the render path.

---

## 1. The canonical quality check

**It is `services/audio-veracity.cjs` → `checkAudioVeracity(input, expectedText, language)`.**
Whisper round-trip: decode the clip, compare to the text it is supposed to say. Two failure
reasons: `last_word_missing` and `cer_above_threshold` (`0a8798d9`, 2026-08-07, added the last-word
rule). It is the only instrument in the estate with per-clip ground truth.

**`flagTailDefect` (`services/audio-processor.cjs:542`) is not a quality gate and its own docstring
says so:**

> ⚠️ 9 % PRECISION. Nine out of ten flags are not defects — measured by ear on 76 flagged clips,
> 2026-08-04. 83 % of its flags vanish if you merely append 300 ms of silence, which cannot remove a
> real click, and 16 of 20 FRESH TTS renders trip it.

Measured against real ground truth (`whisper-sampling-value-2026-08-07.md` §4): **46.7% recall,
36.4% precision.** It cannot distinguish a tail click from a natural pause. The tail-*repair*
mutation path was deliberately deleted on 2026-08-05; only read-only flagging survives, and
`services/audio-processor.cjs:983` states the deletion is permanent, not a rename.

**So: `flagTailDefect` is unusable as a gate; `audio-veracity` is the real gate.** That is the
honest answer, exactly as the brief anticipated.

### The three-state rule (matters for reading every number below)
`verdictColumns` (`services/audio-veracity.cjs:614`) writes three distinguishable states:

| state | meaning |
|---|---|
| `veracity_checked_at IS NULL` | **no check was attempted at all** — the code path never called the gate |
| `checked_at` set, `veracity_pass IS NULL` | the gate was called but could not check (disabled, or whisper missing) |
| `checked_at` set, `pass` TRUE/FALSE | a genuine verdict |

Estate-wide the middle state has **0 rows**. So every unchecked clip is unchecked because *nothing
called the gate* — not because the gate was switched off.

---

## 2. THE CRITICAL QUESTION — why recent clips still show the defect

The brief offered three hypotheses. Measured answer: **(a) is true and systemic, (b) is partly true
in the opposite direction (the gate over-flags), and (c) is the best explanation for what Tom is
actually hearing.**

### (a) The gate is bypassed on almost every render path — CONFIRMED

The gate is imported and called in **one file**, `services/phases/phase8-audio-v13.cjs`
(`veracity.renderChecked` at lines 2278, 2797, 5326, 6869). Every other module that writes
`course_audio` contains **zero** references to `audio-veracity`, `renderChecked` or `verdictColumns`:

| writer module | veracity references |
|---|---|
| `services/voice-engine/synthesis-job.cjs` | 0 |
| `services/voice-engine/router.cjs` | 0 |
| `services/voice-engine/pods-router.cjs` | 0 |
| `services/run-pod-explainer-batch.cjs` | 0 |
| `services/pod-explainer-composite.cjs` | 0 |
| `services/orchestration/orchestrator.cjs` | 0 |
| `services/phases/presentation-author.cjs` | 0 |
| `services/audio-reuse-planner.cjs` | 0 |
| `tools/revoice-clips.cjs` | 0 |
| `api/import-course.js` | 0 |

And the gate's own lifetime output is tiny. Every checker that has ever written a verdict:

| `veracity_checker` | rows | pass | fail | date range |
|---|---|---|---|---|
| `audio-repair-core.cjs` | 1,304 | 1,304 | 0 | 2026-01-17 → 08-05 |
| `regen-seed-clips-from-scratch.cjs` | 164 | 164 | 0 | 2026-08-06 → 08-07 |
| **`phase8-generate` (the pre-publish gate)** | **48** | 48 | 0 | 2026-08-06 only |
| `eng-mar-introduce-strip-2026-08-11` | 48 | 48 | 0 | 2026-08-11 |
| `introduce-directive-strip-2026-08-11` | 38 | 38 | 0 | 2026-08-11 |
| `…-manual-listen` | 3 | 0 | **3** | 2026-08-11 |
| `repair-presentation-clips.cjs` | 2 | 2 | 0 | 2026-08-05 |
| `manual-take-selection-2026-08-06` | 1 | 1 | 0 | 2026-08-06 |

**The pre-publish veracity gate has gated 48 clips, ever.** It is not "on for the estate" in any
meaningful sense — it is on for one code path that is rarely the path a real render takes.

Renders of the last ten days, and how many were checked:

| render date | clips | checked | proven fail |
|---|---|---|---|
| 2026-08-11 | 89 | 89 | **3** |
| 2026-08-10 | 63 | 0 | 0 |
| **2026-08-08** | **24,509** | **0** | 0 |
| 2026-08-07 | 5,215 | 57 | 0 |
| 2026-08-06 | 479 | 156 | 0 |
| 2026-08-05 | 3,461 | 36 | 0 |
| 2026-08-04 | 3,232 | 73 | 0 |
| 2026-08-03 | 31,755 | 70 | 0 |
| 2026-08-02 | 74,644 | 0 | 0 |

**24,509 clips were rendered on 2026-08-08 — four days ago — through a path with no listen at all.**
That is the cohort most likely to be "recently recorded" in Tom's sense. Its composition:

| course | role | clips |
|---|---|---|
| deu_for_eng | known | 10,938 |
| fra_for_eng | known | 10,807 |
| fra_for_eng | presentation | 1,235 |
| deu_for_eng | presentation | 1,193 |
| deu_at_for_eng | known / target1 | 188 |
| others (fra/spa/deu targets) | | 148 |

**One more confirmation that the defect class is live:** the only three `veracity_pass = FALSE` rows
in the entire database are `ita_for_jpn` clips rendered **yesterday, 2026-08-11 18:19Z**, all three
`last_word_missing` (CER 0.14 / 0.50 / 0.67). They were caught by a **manual** listen pass
(`…-manual-listen`), not by the automatic gate. So the defect is still being produced, and when a
human listens it is found — the automatic gate was simply not on that path.

### (b) Does the gate pass clips that are actually truncated? — measured, and the answer is the reverse

I ran the real gate over a **348-clip stratified sample** of the 2026-08-08 unchecked cohort
(40 per course×role, chosen by `md5(s3_key)` so it is unbiased). Read-only: fetched the S3 bytes,
ran local whisper (`~/.local/bin/whisper-cli`, `ggml-small.bin`), wrote nothing.

**Result: 21 of 348 flagged (6.0%)** — 11 `last_word_missing`, 10 `cer_above_threshold`, 0 unchecked.

| course | role | n | flagged | rate |
|---|---|---|---|---|
| **deu_at_for_eng** | target1 | 40 | **14** | **35.0%** |
| deu_for_eng | presentation | 40 | 2 | 5.0% |
| fra_for_eng | target2 | 40 | 2 | 5.0% |
| deu_at_for_eng | known | 40 | 1 | 2.5% |
| deu_for_eng | known | 40 | 1 | 2.5% |
| fra_for_eng | presentation | 40 | 1 | 2.5% |
| fra_for_eng | known / target1 | 80 | 0 | 0% |
| spa_for_eng | target1 | 16 | 0 | 0% |
| deu_for_eng | target1 / target2 | 12 | 0 | 0% |

**The 35% on `deu_at_for_eng` is the instrument failing, not the audio.** That course is Austrian
dialect and whisper is trained on standard German. It heard "Kann i a Seidl Cider hobn?" as
"kann IA Seidl Zeit erhoben" and "Hobn S' wos zum Essen?" as "Hupenswurst zum Essen?". Those clips
are almost certainly fine; whisper simply cannot read Viennese. **Excluding that course: 6 flags in
268 clips = 2.2%.**

And reading all six by hand, **most are gate false positives:**

| expected | whisper heard | verdict |
|---|---|---|
| "you will try too" | "you will try to." | **false positive** — homophone |
| "The German for: 'to consider about', is:" | "…'to consider about is'" | **false positive** — the "is" is present, quote-merged |
| "The French for: 'the latest', as in — …, is:" | "…the latest idea is'." | **false positive** — same pattern |
| "The German for: 'at the weekend', as in — …, is:" | "…is Zainoff-Heivie-Führer-Hiswon." | **not truncation — the opposite.** Clip contains extra German audio past its text |
| "celle-là" | "Sella." | ambiguous — 2-word clip, CER unreliable at this length |
| **"vingt œufs durs"** | **"Vinte dur."** | **GENUINE — "œufs" is missing** |

**So the measured genuine-defect rate in the freshest large cohort is on the order of 1–2 in 268
(0.4–0.7%).** The `last_word_missing` rule has a systematic false positive on presentation clips
ending `', is:'`, because whisper folds the closing quote and the final word together.

**This is the finding that redirects the whole diagnosis:** freshly rendered clips are ~99% clean.
Whatever Tom heard tonight, the render did not produce it at anything like the rate he describes.

### (c) The serving path — the best explanation for what Tom is hearing

`docs/audio/deu-truncation-root-cause-2026-08-06.md` already traced exactly this complaint end to
end, from Tom's own live session, and found the server's copy perfect:

- Tom's event, 18:42:44Z: `audio_play deu_for_eng … cacheHit: TRUE` — **the bytes came off his
  device; the server was never asked.**
- The player only versions a URL (`<uuid>.v<N>`) when `audio_revision > 1`. At revision 1 the URL is
  a bare uuid and has been byte-identical since February.
- The S3 object behind that row was **rewritten in place on 3 August** and the revision was left at
  1 — so the URL never moved and no client ever found out.
- Fetching the server's current bytes and running whisper: complete, CER 0, clean 104 ms tail.

**The scale of that exposure, measured now:**

| | rows |
|---|---|
| `audio_revision = 1` (bare-uuid URL, permanently cacheable, unbustable) | **2,511,244 (98.0%)** |
| `audio_revision > 1` (versioned URL) | 51,361 |
| rows whose text carries a `superseded` marker | 254 |

And `seed1-truncation-census-2026-08-06.md` found the *linking* variant of the same failure: of 139
live seed-1 clips in deu/fra, **0 were measurably damaged**, but **10 deu slots were serving audio
already marked `::superseded-regen`** while their replacements sat unlinked.

**Diagnosis, stated plainly:** (a) is unambiguously true — the gate covers 0.06% of the estate and
one render path in eleven, and that is a real systemic hole worth closing. But it does **not**
explain tonight's symptom, because the clips that hole let through measure ~99% clean. The symptom
Tom hears is best explained by **(c)**: 98% of the estate serves un-versioned, permanently-cacheable
URLs, bytes have been rewritten in place behind them, and some slots point at superseded rows. A
truncated clip cached on his device in February will keep playing truncated no matter how many times
the server side is fixed.

**The cheap confirmation, and it costs nothing:** have Tom clear the app's audio cache (or hard-reload
in a fresh profile) and replay the exact clips he flagged. If they play whole, (c) is confirmed by his
own ear and the render path is exonerated. I have not done this because it needs his device.

---

## 3. Render-event cohort map

Damage in this estate is **not a per-clip rate — it is a dated render event**
(`whisper-sampling-value-2026-08-07.md`). Grouping by that axis:

| cohort | clips | % of estate | ever checked | verdict basis |
|---|---|---|---|---|
| **Pre-gate era** (`created_at < 2026-08-04`) | **2,525,557** | 98.6% | 1,197 (0.05%) | **SUSPECT — unproven.** Published before the gate existed |
| ├─ of which the **2026-08-03 emergency batch** | 31,755 | 1.2% | 70 | **SUSPECT — high prior.** 23.8% measured damage on the fra slice (band 2) |
| └─ of which everything else pre-08-04 | 2,493,802 | 97.3% | 1,127 | **SUSPECT — low prior.** Comparable cuts read 0.4–5.7% |
| **Post-gate era** (`>= 2026-08-04`) | **37,048** | 1.4% | 411 (1.1%) | mixed — see below |
| ├─ 2026-08-08 bulk render | 24,509 | 1.0% | **0** | **MEASURED TONIGHT — ~99% clean** (348-clip sample) |
| ├─ 2026-08-11 | 89 | — | 89 | **KNOWN-GOOD except 3 proven fails** |
| └─ remainder (08-04→08-10) | 12,450 | 0.5% | 322 | **SUSPECT — unproven**, but same pipeline era |

By language (top cuts, all ≥10k clips):

| language | clips | pre-gate | in 08-03 batch | ever checked |
|---|---|---|---|---|
| eng | 1,073,863 | 1,041,274 | 18,653 | 749 |
| zho | 111,751 | 111,668 | 0 | **0** |
| spa | 109,489 | 109,469 | 0 | **0** |
| fra | 99,185 | 96,878 | 12,526 | 57 |
| kor | 90,326 | 90,325 | 0 | **0** |
| jpn | 75,594 | 75,592 | 0 | **0** |
| deu | 69,048 | 67,826 | 204 | 761 |
| por | 63,612 | 63,609 | 0 | **0** |
| hin | 59,787 | 59,534 | 30 | **0** |
| ara | 57,397 | 57,348 | 0 | **0** |
| *…43 further languages, 10k–45k clips each* | | | | **0 checked in all but ita (41)** |

**Forty-four of the fifty largest language cuts have never had a single clip listened to.**

By origin: `tts` 2,520,567 clips (1,607 checked); `human` 42,038 clips (**1** checked).

---

## 4. How many existing clips fail the quality gate

**This is the number the plan needs, and I am going to be strict about the difference between
*proven* and *suspect*, because reporting a suspect count as a failure count would be poison.**

### 4a. PROVEN FAILED — measured, per-clip ground truth

| source | failed clips | reasons |
|---|---|---|
| `~/.audio-veracity-verdicts.json` (fra band 2, 5,341 verdicts) | **534** | 467 `last_word_missing`, 67 `cer_above_threshold` |
| `course_audio.veracity_pass = FALSE` | **3** | 3 `last_word_missing` (ita_for_jpn, 2026-08-11) |
| Tonight's 348-clip sample of the 08-08 cohort | **21 flagged**, of which **~1–2 genuine** | see §2(b) |

By language, from the verdict cache: **fra 528, eng 6.**

**But 520 of those 534 have already been remediated.** Joining the failed `s3_key`s back to
`course_audio`: **520 keys no longer have a live row** — the band-2 repair run replaced them. Only
**21 rows** remain live:

| course | language | live rows still proven-failed |
|---|---|---|
| fra_for_eng | fra | 8 |
| fra_for_eng | eng | 5 |
| deu_for_eng | eng | 2 |
| spa_for_eng | eng | 2 |
| eng_for_urd / eng_for_hin / eng_for_guj / eng_for_kan | eng | 1 each |

**PROVEN-FAILED, STILL LIVE, NEEDING RE-RENDER: 21 rows (+3 ita_for_jpn) = 24 clips.**
That is the whole proven backlog. It is a rounding error, and it is honest.

### 4b. SUSPECT — unproven, cannot be called failures

| cohort | clips | why suspect | expected damage if the prior holds |
|---|---|---|---|
| 2026-08-03 emergency batch | 31,755 | published pre-gate; fra slice measured 23.8% | ~7,500 — **but only the fra slice was measured** |
| All other pre-2026-08-04 clips | 2,493,802 | never listened to; comparable cuts 0.4–5.7% | ~10k–140k, a 14× range |
| Post-gate but unchecked (incl. 08-08) | 36,637 | no listen at render time | ~0.4–0.7% measured tonight → ~150–250 |

**I am not going to hand you a single estate-wide "clips that need re-rendering" number, because
there isn't one that is honest.** The 2.5M pre-gate clips are *unverified*, not *failed*, and the
only two cohorts anyone has actually listened to disagree by a factor of thirty (23.8% for the
08-03 batch, ~0.5% for the 08-08 batch). Extrapolating either one across the estate would be
fabrication.

**What would produce the real number:** the render-date stratification from
`whisper-sampling-value-2026-08-07.md` §5 — whisper 100% of the identified bad cohorts plus a 10%
random audit of the rest. That doc measured the payoff: **36% of the calls finds 91% of the damage.**
At the measured 28.6 clips/min, a 10% audit of the 2.5M pre-gate estate is ~145 hours of whisper —
so this needs scoping to the courses that actually have learners, not run blind across 50 languages.

---

## 5. Cross-course reuse — does a reused clip pass any quality check?

**Tom's ruling: NO CLIP GETS REUSED BLIND. VERDICT: the current code does NOT satisfy it.**

`findAudioRowForClip` (`services/phases/phase8-audio-v13.cjs:6133`) is the reuse mechanism added by
`ee43c5a7`. Its guards are genuinely careful — but they are all **identity** guards, not **quality**
guards. The SELECT is:

```js
.select('id, course_code, text, language, voice_id, s3_key')   // :6139
```

**`veracity_pass` and `veracity_checked_at` are not in the projection, and are not filtered on
anywhere in the function.** What it does check (`:6160-6169`):

- the course's own clips first, then widen only with `opts.canonTexts` proof;
- the stored row's `text` must be byte-identical (not merely normalisation-equal);
- `s3_key` present and not `pending/`;
- language and voice match canonically.

Then `:6296-6304`: on a hit it returns `{ id, reused: true, crossCourse }` — **a pure FK link. The
audio bytes are never fetched, never decoded, never listened to.**

**Consequence, quantified:** since only 0.06% of `course_audio` has any verdict at all, a clip
selected by this path has a **~99.94% chance of never having been listened to** — and nothing stops
it selecting a row that is `veracity_pass = FALSE`, because that column is not read.

**The one nuance, which must not be collapsed:** there *is* real veracity plumbing in the
reuse-first machinery — `reusePlanner.verifyPlanVeracity` at `:7126-7134`, which fetches and
whispers incumbent clips. But it is **opt-in and off by default**:

```js
if (req.body?.verifyIncumbents === true) {     // :7125
```

Its own comment says: *"Off by default because it costs a whisper decode per incumbent clip; on for
the fra_for_eng last-word repair, which is the only way a clip that is present, alive and wrong gets
caught (Tom, 2026-08-07)."* So the estate's own code already names this as the only way to catch a
live-but-wrong clip — and leaves it off.

Two further fragilities in the same block (`:7136-7148`): the gate reports "unchecked" whenever
whisper is missing, and **whisper is off `PATH` on `watson-1`** — a documented incident where 34 of
45 clips were logged FAILED for this reason on 2026-08-08.

### What would need to change (description only — nothing implemented)

1. **`findAudioRowForClip` must read the verdict columns.** Add `veracity_pass, veracity_checked_at`
   to the `.select()` at `:6139`.
2. **Reject known-bad on sight.** In the `identityMatches` filter, exclude any row with
   `veracity_pass === false`. This is free, has no false-positive risk, and is strictly a bug fix.
3. **Decide the policy for `veracity_checked_at IS NULL` — this is the actual ruling needed.** A
   hard `veracity_pass === true` requirement would reject 99.94% of candidates and collapse the
   ~374-render saving back toward ~5,837. The proportionate option is **listen-on-reuse**: when the
   chosen row has no verdict, fetch its bytes and run `checkAudioVeracity` against the text once,
   persist the verdict via `verdictColumns` (so it is paid for exactly once per clip, estate-wide,
   and the `verdictCache` at `:6739` already exists for this), reuse on pass, render fresh on fail.
   Cost is one whisper decode per *distinct* reused clip, not per use.
4. **Make the failure mode loud.** If whisper is unavailable, reuse of an unverified clip should
   refuse rather than silently proceed — matching the fail-closed precedent already set for lookup
   errors at `:6144-6150`.
5. **The same treatment is needed at `findExistingAudio` (`:6176`)**, the id-returning wrapper that
   every non-pod caller uses — otherwise the hole simply moves.

---

## Explicit gaps

- **I did not listen to the 2.5M pre-gate estate.** The suspect counts in §4b are priors from two
  measured cohorts, not measurements. They must not be quoted as failure counts.
- **The `deu_at_for_eng` 35% flag rate is uninterpretable** — whisper cannot read Austrian dialect.
  That course needs a human ear or a dialect-aware threshold; my sample says nothing reliable about it.
- **Hypothesis (c) is not confirmed on Tom's device.** It is strongly supported by prior forensics
  and by the 98% un-versioned-URL number, but the confirming test — clear the audio cache, replay the
  flagged clips — needs his phone and takes thirty seconds.
- **The band-1 fra verdicts (497 damaged) were never persisted** and are not recoverable; only the
  aggregate survives.
- **Sample size honesty:** 348 clips, one render date, five courses. It is decisive about the 08-08
  cohort and says nothing about any other.

---

## Method / reproduction

- DB: `course_audio`, 2,562,605 rows, read-only `SELECT`s throughout.
- Verdict cache: `~/.audio-veracity-verdicts.json`, 5,341 per-clip verdicts, 534 failed.
- Sample: stratified 40-per-`course_code`×`role` over `created_at::date = '2026-08-08' AND
  veracity_checked_at IS NULL`, ordered by `md5(s3_key)`; 348 clips.
- Sampler: `scripts/qgate/sample.cjs` (gitignored workspace). Fetches S3 bytes over HTTPS, calls
  `veracity.checkAudioVeracity`, writes a JSON log. **No DB writes, no S3 writes, no TTS.**
- Whisper: `/home/tomcassidy/.local/bin/whisper-cli`, `ggml-small.bin`, concurrency 4, gate enabled.
- Raw verdicts: `/tmp/verdicts-0808.json`; run log `/tmp/qgate-0808.log`.
