# fra/deu held-slot targeted check — does the tail-repair defect show up in the residue?

**2026-08-12 · READ-ONLY · no DB writes, no S3 writes, no TTS, no spend.**

One question, asked by Tom, answered here and nothing else: `non-english-canon-render-scope-2026-08-12.md`
§4 found that the fra/deu rebuild was partial and left **10,456 held course slots still pointing at
pre-fix clips** (fra 6,030, deu 4,426). Does the 2026-08-05 tail-repair defect actually show up in
*that specific residue*, or does Tom's premise — mostly fine — hold even there?

---

## Verdict

**Yes, materially — but at a low single-digit rate, and it is confined to a specific shape.**

The residue is **not** clean, and it is measurably dirtier than the repaired cohort: **4.4% genuine
defect rate (13 in 294)** against **0% (0 in 119)** in a matched control drawn from the *trusted*
post-fix clips in the same courses and slots. Twelve of the thirteen are the tail-repair signature
exactly — the final word clipped off — and the thirteenth is a near-silent clip.

But Tom's premise is not wrong either, and the headline number the gate produces is a lie. **The raw
whisper flag rate was 15.6%.** Of the 46 flags, **33 were false positives** — 72% of them. Reported
raw, that number would have said "one clip in six is broken" when the truth is one in twenty-three.

**And the single slot the scope doc called out as most alarming — `fra phrase.presentation`, 100% of
1,621 holders on pre-fix clips — came back clean.** Nine of the 39 sampled were flagged; every one
of the nine was the known quote-fold artefact, and every one of the nine has a *normal or
longer-than-normal* duration, so nothing is missing from any of them. Zero genuine defects in that
slot.

So: the redo was worth doing, the residue does carry real damage, and the damage is roughly **460
held slots out of 10,456** — not 1,600, not 10,000.

---

## The three rates — never quote the first one alone

| | count | rate |
|---|---|---|
| **Raw whisper flag rate** (what the gate emits) | 46 / 294 | **15.6%** |
| **Genuine defect rate** (after hand-reading every flag) | 13 / 294 | **4.4%** — 95% CI 2.6–7.4% |
| **Gate precision on this cohort** | 13 / 46 | **28.3%** |
| *Control: trusted post-fix clips, same courses/slots* | *0 genuine / 119* | ***0%*** — 95% CI 0–3.1% |

The control is the number that makes the verdict safe. The instrument, pointed at repaired clips in
the same courses, the same voices and the same slot types, finds **nothing**: 2 raw flags in 119, both
plainly false (`"ich kann sehen, dass man gut zusammen arbeitet"` heard as `zusammenarbeitet`, CER
0.02; `"nous suivre"` heard as `"Nous suivrons"`). The 4.4% in the residue is therefore a property
of the residue, not of whisper.

### False-positive taxonomy — the 33

| class | n | what it is |
|---|---|---|
| **quote-fold** | 21 | Presentation clips end `…', is:`. Whisper folds the closing quote into the last word and never emits `is`, so `last_word_missing` fires. Every one of these has duration at or *above* its voice-matched peer median — nothing is missing. Same class the 2026-08-12 quality-gate survey documented. |
| **asr-short-clip** | 9 | Two- and three-word fragments where CER is meaningless: `"y a"`→`Yeah`, `"me to"`→`Me too`, `"of my"`→`of mine`, `"se passait"`→`Se passer`, `"beantworten"`→`beantragen`. Substitutions, not losses. |
| **asr-hallucination** | 3 | Whisper emits *more* than was asked for: `"with that"` → `"with the same number of points."`, `"der einzige"` → `"der Einzel- und -verkürzten."`, `"quelle est"` → `"Qu'est-ce qu'il y a ?"`. Extra audio is not missing audio. |

---

## How a flag was hand-read

No flag was judged on the whisper decode alone. Three independent signals per clip:

1. **The gate** — `checkAudioVeracity` in `services/audio-veracity.cjs`, unmodified, local whisper
   (`ggml-small.bin`). `flagTailDefect` was **not** used (its own docstring admits ~9% precision).
2. **Duration plausibility** — the clip's `duration_ms` against the median of **voice-matched**
   trusted post-fix clips of similar text length (83,884-row calibration set drawn from the same two
   courses). Voice matching matters: an unmatched calibration flagged 20.6% of *unflagged* clips as
   short, and voice matching is what removed that noise.
3. **Prefix test** — is the decode a whole-word *initial segment* of the expected text? Truncation
   starts correctly and stops early; a homophone or substitution does not.

The conjunction separates cleanly. Across the 248 **unflagged** clips in the sample, the prefix test
fired **zero times**. Across the 46 flags it fired 32 times, and of those, the ones where the missing
milliseconds also match the cost of the dropped words are the genuine set. A defect was only called
genuine where a **content word** was lost *and* the duration shortfall accounted for it.

Two flags were called genuine despite a mild duration ratio (#42 lost `verstehen` off a 22-word
sentence, #1 lost `que`): on long clips the *ratio* is insensitive, so the absolute shortfall was used
— 480 ms and 168 ms respectively, both consistent with exactly the dropped word.

---

## Evidence — the 13 genuine defects

Expected text vs what whisper heard, with the duration shortfall against voice-matched peers.

| # | course | slot | voice | rendered | expected | whisper heard | short by | lost |
|---|---|---|---|---|---|---|---|---|
| 44 | deu | phrase.target1 | ara | 2026-03-12 | `es macht mir Spaß` | `Es macht...` | 648 ms (r=0.46) | **mir Spaß** |
| 22 | deu | phrase.known | eve | 2026-02-16 | `will be able to` | `will be...` | 504 ms (r=0.53) | **able to** |
| 15 | fra | phrase.target2 | xai_leo | 2026-08-03 | `trop de temps` | `trop de...` | 480 ms (r=0.55) | **temps** |
| 26 | deu | phrase.known | xai_eve | 2026-03-12 | `has just started` | `has just...` | 432 ms (r=0.65) | **started** |
| 16 | fra | phrase.target2 | xai_leo | 2026-08-04 | `ne pourront pas` | `ne pourront.` | 352 ms (r=0.67) | **pas** — the negation |
| 18 | fra | phrase.target2 | xai_leo | 2026-08-03 | `j'ai hâte` | `J'ai...` | 288 ms (r=0.68) | **hâte** |
| 45 | deu | phrase.target2 | leo | 2026-07-15 | `sie will auch mit euch bleiben` | `Sie will auch mit euch.` | 576 ms (r=0.68) | **bleiben** |
| 46 | deu | phrase.target2 | leo | 2026-07-15 | `ich wollte eines von denen` | `Ich wollte eines...` | 360 ms (r=0.77) | **von denen** |
| 33 | deu | phrase.presentation | eve | 2026-08-03 | `The German for: 'yellow', as in — 'with the yellow dress', is:` | `The German for yellow as in with the yellow.` | 984 ms (r=0.75) | **dress**, + `is:` |
| 34 | deu | phrase.presentation | eve | 2026-08-03 | `The German for: 'his sister', as in — 'for his sister', is:` | `The German for his sister as in for his` | 624 ms (r=0.84) | **sister**, + `is:` |
| 42 | deu | phrase.target1 | ara | 2026-02-15 | `…und ich konnte sie nicht verstehen` | `…und ich konnte sie nicht` | 480 ms | **verstehen** |
| 1 | fra | lego.target2 | xai_leo | 2026-08-03 | `j'ai entendu dire que` | `J'ai entendu dire` | 168 ms | **que** |
| 2 | fra | phrase.known | xai_eve | 2026-08-03 | `are not` | `[BLANK_AUDIO]` | 288 ms | *near-silent — different class* |

Two of these are learner-visible in a way that matters beyond a clipped syllable: **#16 loses the
negation** (`ne pourront pas` → `ne pourront`, which a learner hears as the opposite meaning), and
**#2 is silence where a prompt should be**.

### Where the damage sits

| | genuine / sampled | rate |
|---|---|---|
| **fra_for_eng** | 5 / 147 | 3.4% |
| **deu_for_eng** | 8 / 147 | 5.4% |
| **target-language clips** | 8 / 117 | **6.8%** |
| known / English clips | 5 / 177 | 2.8% |

The target side is roughly **2.4× dirtier than the known side** — which is the right way round for a
defect in the non-English render path, and is a small corroboration that this is the tail bug rather
than noise.

| slot | held on pre-fix clips | sampled | genuine | rate | implied slots |
|---|---|---|---|---|---|
| fra phrase.target2 | 1,173 | 27 | 3 | 11.1% | **~130** |
| deu phrase.target2 | 779 | 20 | 2 | 10.0% | **~78** |
| deu phrase.target1 | 778 | 21 | 2 | 9.5% | **~74** |
| deu phrase.known | 1,760 | 46 | 2 | 4.3% | **~77** |
| deu phrase.presentation | 932 | 40 | 2 | 5.0% | **~47** |
| fra phrase.known | 1,799 | 32 | 1 | 3.1% | **~56** |
| fra lego.target2 | 6 | 5 | 1 | 20.0% | ~1 |
| **fra phrase.target1** | 1,274 | 29 | **0** | 0% | 0 |
| **fra phrase.presentation** | **1,621** | 39 | **0** | **0%** | **0** |
| all lego.* slots (both courses) | 340 | 40 | 0 | 0% | 0 |
| **total** | **10,456** | **294** | **13** | **4.4%** | **~460** |

**Implied population: ~460 of the 10,456 held slots carry a genuine defect.** Pooled 95% interval on
the rate gives a band of **272–776 slots**. The slot-wise band is wider (132–1,925) because several
strata are thin; the pooled figure is the one to plan against.

The slot types that carry it are **`phrase.target1` / `phrase.target2` in both courses** (~280 slots,
9–11% rates, and these are the clips the learner is asked to *produce*), then `phrase.known`
(~130 slots), then `deu phrase.presentation` (~47). **`fra phrase.presentation` and all eight
`lego.*` slots carry none of it** in this sample.

### Render date does not cluster

Genuine defects by render month: 2026-02 ×2, 2026-03 ×2, 2026-07 ×2, 2026-08 ×7 — against a sample
weighted 168/294 to August. Rate by month is roughly flat (4–11%). This is **not** a batch event with
a timestamp window, the way the 2026-03-11 orphan-component debris was. It is a background rate
across the whole pre-fix era, which is what a persistent render-path bug looks like.

---

## Reconciliation — the counts still hold

Re-ran the scope doc's SQL fresh today. Per-slot suspect counts are **bit-identical** to
`non-english-canon-render-scope-2026-08-12.md` §4: fra 11 + 6 + 122 + 24 + 1,274 + 1,173 + 1,799 +
1,621 = **6,030**; deu 23 + 23 + 125 + 6 + 778 + 779 + 1,760 + 932 = **4,426**. Zero dangling
pointers in either course. Nothing has moved.

One number the scope doc does not state: those **10,456 held slots resolve to 7,555 distinct clips** —
clip reuse across slots is about 28%. The sample was drawn over distinct clips within slot strata and
reweighted back onto held-slot counts.

---

## Gaps — what this check could not measure

1. **These are the server's current bytes, today.** A clip cached on a learner's device in February
   is a different failure mode and is invisible from here. Nothing in this document says anything
   about what is on any handset.
2. **Nobody listened.** Every verdict here is instrument-plus-inference: whisper decode, duration
   against voice-matched peers, prefix structure. That triangulation is strong for *truncation and
   silence* — the classes the gate is validated on — and says **nothing about mispronunciation**,
   which `audio-veracity.cjs` is explicit it has never been tested against. A clip that says the
   wrong word confidently passes everything here.
3. **21 of the 140 control clips could not be fetched** — all 20 trusted `deu phrase.presentation`
   clips plus one `deu phrase.target1`, all under an S3 `repair-candidates/` prefix that returns 403
   to an unsigned public GET. The learner path signs its URLs (`GetObjectCommand` in
   `ssi-learning-app/api/audio/batch-urls.ts`), so this is **a limit of my read path, not a defect** —
   but it means **the control has no trusted-presentation arm**, and the deu presentation comparison
   is suspect-only. 1,744 deu held slots sit on that prefix; they were not measured.
4. **Thin strata.** The eight `lego.*` slots got 5 clips each (40 total, 0 defects). "Zero in 40" is
   consistent with anything up to ~9% — it is weak evidence of cleanliness, not proof. Same caution
   on `fra phrase.target1` (0/29) though not on `fra phrase.presentation` (0/39, and all nine flags
   there positively explained as artefacts, which is stronger than a bare zero).
5. **The duration calibration is empirical, not ground truth.** Peer medians come from trusted clips
   of the same voice and similar text length; pacing varies. It was used only to *corroborate* a
   whisper prefix-drop, never alone. No clip was called genuine on duration alone.
6. **`fra_ca_for_eng` and `deu_at_for_eng` are out of scope** and were not touched. Note the known
   instrument failure recorded in the quality-gate survey — whisper cannot read Austrian dialect and
   flagged `deu_at` at 35% spuriously. No analogous instrument problem appeared in fra or deu here:
   `xai_leo`, `xai_eve`, `eve`, `ara` and `leo` all behaved, and the control's 1.7% raw / 0% genuine
   confirms the instrument is not systematically hostile to these voices.

---

## Method

- **Set**: every `course_legos` / `course_practice_phrases` audio slot (target1, target2, known,
  presentation) in `fra_for_eng` / `deu_for_eng` pointing at a `course_audio` row with
  `created_at < '2026-08-05'` and `coalesce(audio_revision,1) = 1`.
- **Sample**: 300 slot picks → 294 distinct clips (150 per course), stratified across the eight slot
  types roughly in proportion to their suspect counts, with a floor of 40 on `phrase.presentation`
  and 5 on each thin slot. Chosen deterministically by `md5(s3_key)` ordering — unbiased and exactly
  reproducible.
- **Control**: 140 slot picks (→119 fetchable) from the *trusted* post-fix cohort in the same courses
  and slots, same `md5(s3_key)` technique.
- **Check**: read-only HTTPS GET of the S3 bytes, then `checkAudioVeracity` from
  `services/audio-veracity.cjs` — local whisper, `~/.local/bin/whisper-cli`,
  `~/.local/share/whisper-models/ggml-small.bin`, concurrency 4. Zero API spend.
- **Scripts** (gitignored workspace, `scripts/heldslot/`): `counts.sql`, `pool.sql`, `alloc.cjs`,
  `control.sql`, `calib.sql`, `handread.cjs`, `verdicts.cjs`, `extrapolate.cjs`. Sampler reused from
  `scripts/qgate/sample.cjs`.
- Nothing was written to the database, to S3, or to any clip.
