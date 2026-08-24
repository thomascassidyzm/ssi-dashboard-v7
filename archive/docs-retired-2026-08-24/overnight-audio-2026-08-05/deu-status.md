# deu_for_eng — German audio status for Beuno (2026-08-05)

**Worker `ff46c97a` (respawn of `aa91ed1d`). German only** — `fra_for_eng` and the audio-type
coverage table are held by sibling `d27ba784` (respawn of `8b1dae03`), whose answer landed as
`docs/introductions-audio-coverage-2026-08-05.md`.

Aran's son Beuno tests the German course today. This document is the running record of what was
checked, what was repaired, and — just as important — what was **not** checked.

---

## Gate verified ACTIVE before any spend

Re-verified at 02:23 on this respawn, because the services restarted at 02:07 and carry new PIDs
(94946 / 99939, not the 8382 / 8391 in the earlier plan). Verified three ways:

1. **Live processes** — `/proc/94946/environ` (phase8-audio) and `/proc/99939/environ`
   (production-api) both carry `TAIL_REPAIR_MODE=flag`.
2. **Repo systemd units carry it too** (`ops/systemd/popty-*.service:16`, commit `d90f1ba3`), so
   it now survives a unit rebuild. **The code default on this branch is still `repair`**
   (`services/audio-processor.cjs:684`) — `origin/main` has flipped it (`4c5bbf90`) but this branch
   predates that. So **any CLI render must export the flag explicitly**, and every command in this
   run did.
3. **Positive proof at zero TTS cost** — `tools/verify-tail-repair-mode.cjs` runs the real function
   on a synthetic fixture:

   | mode | action | duration |
   |---|---|---|
   | `TAIL_REPAIR_MODE=flag` | `held`, `flagOnly:true` | 1.832s **unchanged** |
   | unset (code default) | `repaired` | 1.832s → 1.700s, **7.2% removed** |

4. **Proof on the real render path, not just a fixture.** The batch-1 apply run logged, three times:

   ```
   [Phase8-Audio-v13] masterAudio: tail flag (resurgence -5dB at 1.376s) is resumed speech
                                   — pausey render shipped untouched
   ```

   That is the flag branch taken on live audio during actual spend. The tail detector fired and the
   audio was **shipped untouched** instead of being cut. This is the thing the whole night was about.

---

## Batch 1 — the 14 gate-confirmed failures — COMPLETE (14/14)

Source: `scripts/veracity-estate-sweep/out/ids-deu_for_eng.json`, the 2026-08-05 estate sweep.
11 were repaired by the pre-respawn attempt; this respawn finished the remaining 3.

| field | value |
|---|---|
| clips | 14 (`known`/`eve` × 8, `target2`/`leo` × 6) |
| TTS characters | 399 total (85 in this respawn's 3) |
| voices | course `voice_config` unchanged: known=`eve`, target1=`ara`, target2=`leo` — all xAI |
| result | **14 repaired, 0 failed.** xAI health on the final run: 3 responses, 0 empty, 0 cooldowns |
| version bump | `0.1766.41 → 0.1766.42`, revalidation key `4091 → 4092` — clients refetch |

Verified after the fact against the live DB: every one of the 14 texts now has **exactly one** row,
created 2026-08-05, on the **correct voice for its side**, with duration roughly doubled — which is
the truncation being gone. Examples:

| role | text | before | after |
|---|---|---|---|
| `target2` | `Ich werde Deutsch sprechen` | 696 ms | 1512 ms |
| `known` | `I think we should tell to them` | 936 ms | 1728 ms |
| `target2` | `sie ist durch gegangen` | 648 ms | 1392 ms |

`"sie ist durch gegangen"` was decoding as `"ZIIS."` before — that is what a learner was hearing.

Applied log: `logs/deu-batch1-remainder-applied.json`.

---

## Batch 2 — the opening stretch, seeds 1–30 — COMPLETE (177/177), VERIFIED

This is the stretch Beuno actually hears. Detection is read-only and costs nothing; only the repair
list that comes out of it costs money.

| stage | result | when |
|---|---|---|
| detection | **2,665 clips checked, 178 failed** | finished 11:30 |
| repair (`--apply`) | **177 re-rendered, 0 failed** (43 in the 10:00 hour, 134 in the 11:00 hour) | finished 11:28 |
| independent re-check of the 177 replacements | **177/177 checked, 0 failing** | 12:01, log `logs/deu-s1-30-verify.txt` |

Roles repaired: `target2` 77, `known` 60, `target1` 40. Cost was the dry run's estimate — 4,178
characters, ≈$0.017 at the Azure S0 rate; xAI per-character rates are not recorded in this repo, so
treat that as a lower bound rather than a quote.

**Link integrity after the repair, measured not assumed:** all **916** phrases in seeds 1–30 have
`known_audio_id`, `target1_audio_id` and `target2_audio_id` non-null and pointing at a row that
exists. Zero null, zero dangling.

**One loose end, not learner-facing.** 3 of the 177 new rows (`zurückkommen`,
`I'd like to be able to speak after you finish`, `aber ich will nicht aufhören zu sprechen`) are not
referenced by any phrase — orphan duplicates from repairing the same text twice. The phrases
themselves are correctly linked to live audio, so nothing a learner hears is affected; these are
three unreferenced rows worth a fraction of a cent. Logged, not deleted — deleting audio rows needs
a deletion plan and approval.

**Provenance note.** The `--apply` run above was executed by the previous worker on this job
(`a6eb8519`) between 10:45 and 11:28; that worker died without reporting, which is why the repair
looked outstanding. This session established from the DB — 191 of the original 2,665 ids no longer
exist, = 177 batch-2 replacements + the 14 batch-1 ones — that the spend had already happened, and
so re-ran detection rather than re-rendering. The re-run cost nothing: `2,474 checked, 0 failed,
0 re-rendered` entirely from the resume cache.

Clip selection is by **authoritative linkage**, not text matching: the
`known_audio_id` / `target1_audio_id` / `target2_audio_id` columns on `course_practice_phrases`,
restricted to `origin='tts'`. Roles `presentation` and `pod_*` are excluded because the repair tool
refuses them by design (see below).

Run at `--concurrency 3` rather than 4: the box is 8 cores at load ~7, shared with the sibling
French worker. Being a good citizen is worth more than finishing 20 minutes sooner.

---

## The opening stretch is structurally complete — checked, not assumed

Three checks that cost nothing and that the acoustic gate does **not** perform:

| check | seeds 1–30 result |
|---|---|
| missing audio | **0 missing.** 916 phrases, every one has all three of `known_audio_id`, `target1_audio_id`, `target2_audio_id` |
| voice on the right side | **clean.** 916 `known` on `eve`/eng, 916 `target1` on `ara`/deu, 916 `target2` on `leo`/deu — zero cross-contamination |
| introductions present | **100 of 100 legos** have a `lego_introductions` row, all voiced `eve`, all with a real duration |

The 2026-08-04 revoice held: the bug where English `known` clips were narrated by a German voice has
**not** recurred anywhere in the opening stretch.

## The introductions Beuno hears: measured, no longer a gap

The coverage doc recorded presentation audio as **UNMEASURED**, because
`tools/audio-veracity-repair.cjs` applies `SKIP_ROLE` (line 112) at the *fetch* stage — so it cannot
even **detect** presentation clips, only refuse to repair them.

`scripts/deu-measure-introductions.cjs` (read-only; no DB writes, no TTS, no upload) decodes them
through the same gate module at the same operating point. All 100 introductions for seeds 1–30:

| result | count |
|---|---:|
| decoded and matched their text (CER ≈ 0) | **99** |
| gate FAIL | 1 |
| unchecked | 0 |

So **the introductions in Beuno's opening stretch are healthy.** Two things worth an ear rather than
a re-render, collected in `deu-introductions-listening-test.html` (10 clips, playable in a browser):

1. **S0013L01 — the one genuine oddity.** Its audio contains *more* than its stored text: the stored
   text is the English narration ending `…very well', is:`, but the audio continues into the spoken
   German answer (decoded through an English model as `"Do Sie sohn Heivach, jürgen sehr well"`).
   7,152 ms against a 4,536 ms median. That is why it scored CER 0.625 — **not** truncation. Whether
   a baked-in answer is intended casting or a splice defect is a judgement call, so it is logged, not
   changed.
2. **Nine clips drop only trailing words in the decode** (seven of them just the final `is`), CER
   0.16–0.29, all **passing** the gate. That pattern is equally consistent with benign ASR
   tail-dropping and with mild tail clipping. I cannot separate those without listening, and Tom's
   standing rule on spend is that doubt means don't spend — so nothing was re-rendered. The listening
   page settles it in about two minutes.

## Finding: 27 German introductions are on the wrong voice

The coverage doc flagged "27 German `presentation` rows have `duration_ms IS NULL`, cause not
established". Cause is now established, and it is a **voice defect, not a duration defect**:

- All 27 are voiced `en-GB-SoniaNeural` — an **Azure** voice. The course's configured presentation
  voice is `eve` (xAI). The other 2,373 presentation clips are `eve` (2,345) or `xai_eve` (28).
- All 27 were written on **2026-08-03**, in one batch, and all 27 have an `s3_key`.
- **15 of the 27 are duplicates**: each names a `lego_id` that *already* has a correct `xai_eve`
  presentation clip. The other **12 are orphans** with no `lego_id` at all.

**Does Beuno hit them? No.** The 15 identifiable ones belong to legos S0091, S0133, S0160, S0181,
S0314, S0387, S0392, S0444, S0460, S0463, S0465, S0522, S0577, S0597, S0662 — **every one past seed
90**, far beyond the opening stretch. So this is a real defect but not a deadline defect.

**Not fixed tonight, deliberately.** Deleting a `presentation` row CASCADEs into
`lego_introductions`, which is why every repair tool refuses the role
(`SKIP_ROLE`, `tools/audio-veracity-repair.cjs:112`). These 27 look like the safest possible case
for a cleanup — duplicates and orphans rather than sole copies — but "looks safe" is not a deletion
plan, and CLAUDE.md requires a deletion plan plus approval. **Recommendation for Tom, one line:**
*delete the 15 duplicate Sonia presentation clips (a correct `eve` sibling already exists for each)
and investigate the 12 orphans.* Awaiting his call; no rows touched.

---

## What is NOT checked — stated as gaps, not as clean

- **Everything past seed 30 is UNCHECKED.** `deu_for_eng` holds ~47,000 clips; a full-course gate is
  ~25 hours at the measured rate. Seeds 1–30 are the deliberate scope.
- **`presentation` (2,400 clips) and `pod_*` (~2,500 clips) are not gated and not repairable** by
  any current tool. How much of that audio is actually damaged is **unmeasured** — the decision memo
  records that the cheap trailing-room fingerprint **failed** as a predictor (45.8% vs 44.0%,
  p = 1.00), so only acoustic decode would answer it.
- **The gate is validated on SILENCE and TRUNCATION. Mispronunciation is NOT covered and was never
  tested.** No pass rate from this work may travel without that sentence.
- Pod target character voices are deliberate casting, not defects
  (`docs/audio-repair-2026-08-04/deu_for_eng-revoice-complete.md`). Not touched.
