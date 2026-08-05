# fra_for_eng missing-clip render — pilot gate FAILED, bulk stopped

**2026-08-04 · For Tom · The bulk render is stopped. 250 clips are live. One of them is truncated.**

Kai approved TTS for `fra_for_eng`. Tom's addendum mid-run inverted the order to
live-check → pilot → verify-every-pilot-clip → only-then-bulk, with an explicit instruction to stop
and report rather than tune live if any clip truncates. That gate has now been applied and it
**fails**: 1 confirmed truncation in the 250 clips already written. Nothing further has been
rendered.

---

## 1. Live need — re-verified, not taken from the stale figure

`GET /plan/fra_for_eng` on port 3465, queried live at 23:29Z:

| | before the run | after the partial run |
|---|---:|---:|
| missing | **2,631** | 2,386 |
| of which renderable TTS jobs | 2,241 | 2,000 |
| of which need intro text authored first | 390 | 390 |
| copyable from another course | 36 | 31 |
| existing | 48,799 | 49,049 |
| estimated cost of the remainder | $1.75 | $1.61 |

The 2,633 figure in the brief was near-accurate but stale by 2. Need was genuine.

**German sanity check on the same endpoint: `deu_for_eng` reports 46 missing, not 0.** The earlier
"905 → 0" no longer holds exactly. That is a *useful* result for the purpose it was asked for — the
endpoint is reporting live state rather than a cached zero. German was not touched; Kai's approval
is `fra_for_eng` only.

---

## 2. Render mode — `TAIL_REPAIR_MODE=flag`, and the evidence for it

The default (`repair`) was not used. Evidence, read from the documents rather than assumed:

- `docs/proving-run-2026-08-04.md` is the direct comparison of the two modes on the same clips:
  shipped clips rendered under the repair lost their final word **9/20 (45%)**; the 60 candidate
  renders made under **`TAIL_REPAIR_MODE=flag` lost it 2/60 (3%)**.
- `docs/amputation-tts-probe-2026-08-04.md` §3 is where the 0.52-vs-0.93 (p = 0.00001) figure comes
  from: final-word retention for shipped clips carrying the repair's 100 ms pad fingerprint versus
  the rest. It is a property of *shipped* clips, not of fresh renders.
- `docs/audio-tail-gate-decision-memo-2026-08-04.md` §3: 16 of 20 *fresh* renders trip the detector;
  bare-flag precision by ear is 7/76 = 9%.

`flag` is a real code path — `services/audio-processor.cjs:684-692` returns `{action:'held'}` before
any buffer mutation, and `phase8-audio-v13.cjs:945-951` only `fs.move`s a repaired file on the
non-held branch. Set as a systemd drop-in, `~/.config/systemd/user/popty-phase8-audio.service.d/tail-repair-mode.conf`,
and verified in `/proc/<mainpid>/environ` before each batch.

**Proof it took effect: 166 tail flags raised during the run, 0 repairs performed.** Zero
`repaired in N pass(es)` lines in the service log after the restart. Every flagged clip shipped as
the provider rendered it.

The drop-in is **still in place** — reverting it would restore a mode the evidence says damages
audio, and whether `flag` becomes the permanent default is memo decision #1, still yours.

---

## 3. Service stability — not stable, which is why this was batched

`popty-phase8-audio.service`, `NRestarts=2` on 2026-08-04:

- **19:38:03Z** — `The kernel OOM killer killed some processes in this unit`, `status=9/KILL`,
  `Failed with result 'oom-kill'`. Confirmed OOM.
- **23:02:30Z** — unit stopped, whisper-cli children orphaned by `KillMode=process`, 2.2 G memory
  peak over its 3h24m life. **No `oom-kill` result was logged for this one** — so it is an
  unexplained stop, not a second confirmed OOM. The brief's "OOM-crashed twice" is half-confirmed.

The run was batched at 50 seeds per call with a health gate and a re-assertion that the mode was
still `flag` before each batch. Memory stayed at ~185 MB throughout — nowhere near the earlier peak,
because `flag` mode returns before the whisper amputation guard runs.

---

## 4. What is actually live now

**250 `course_audio` rows written for `fra_for_eng` since 23:28Z**, all live in production the
moment they were written (there is no staging buffer):

- 10 from a seeds 1–3 smoke test — 10/10 succeeded
- 240 from batch 1 (seeds 1–50) before it was cancelled — 235 succeeded, 1 failed
- 1 failure: the single word `"un"`, rejected 3× by the xAI phonology gate (whisper heard `en`, not
  `fr`). A known benign class on ultra-short French words; no audio was written for it.

Batch 1 was cancelled at 236/284 on reading Tom's addendum. **Batches 2–14 never started.** The
remaining ~2,000 renderable clips are untouched.

---

## 5. Verification — every one of the 250, not a sample

Method is the one validated today in `docs/forced-alignment-2026-08-04/findings.md`: an **unprimed**
whisper decode (the expected text is never shown to the model) compared afterwards against the
expected text; flag when the decode is empty or a non-speech marker, **or CER ≥ 0.3**. Measured
there at 98.8% recall / 1.2% false-alarm over 165 labelled clips. Forced alignment proper was
refuted in §5 of that document and was not used. Harness: `scripts/fra-render-qa.cjs` (gitignored,
read-only — S3 GETs and `course_audio` SELECTs only).

| | result |
|---|---|
| clips scored | **250 of 250** (no sampling, 0 errors) |
| median CER | **0.000** |
| median word coverage | **1.000** |
| median implied words/sec | 3.41 — mid-band for healthy SSi TTS (2.33–5.27) |
| flagged by the gate | 4 (1.6%) |
| **confirmed truncated after cross-check** | **1** |

### The one real defect

| clip | role | text | duration | decode (`small`) | decode (`medium`) | implied w/s |
|---|---|---|---:|---|---|---:|
| `0e698b7f-ad1a-4a11-bf43-b42b7147f291` | known/eng | "I'd like to guess" | 0.55 s | "I'd like" | "I'd like" | **7.25** |

Three independent signals agree: two different whisper models both hear only a prefix, and the
ASR-free physics check says four words in 0.55 s needs 7.25 w/s — **above the maximum observed
anywhere in the healthy set (5.27)**, the exact signature of findings.md §2. This clip is live.

Independent corroboration: phase8's own post-run gate logged
`240 new clips — 0 SILENT, 0 NEAR-SILENT, 1 suspect (short/fast)`. It found the same single clip.

**Crucially, the tail repair did not do this.** In `flag` mode nothing trims the buffer, and the
log confirms 0 repairs. The provider itself returned a short render. That is the hole findings.md §2
named: if xAI truncates a text *reproducibly*, a probe-and-keep re-render does not fix it, and
switching off the repair does not either.

### The three that were flagged but are not defects

| clip | text | duration | `small` | `medium` | implied w/s |
|---|---|---:|---|---|---:|
| `8eb6c3df` | "ce" | 0.48 s | "S." | "Sous-titres réalisés para la communauté d'Amara.org" | 2.08 |
| `706b14c4` | "vas" | 0.50 s | "Va." | "Va." | 1.98 |
| `1ccfe5f6` | "te" | 0.38 s | "Deux" | "T'es..." | 2.60 |

All three are one- to three-letter French function words at healthy speech rates, where CER over a
2-character expected string is hair-trigger and whisper is known to mishear or hallucinate
(`medium` producing an Amara subtitle credit on 0.48 s of audio is the textbook case). Every one
sits inside the healthy words-per-second band, so the physics check clears them. Two further clips
whose *final word* was missing from the decode — "started to" → "Started 2.", "am starting to" →
"I am starting too." — are homophone transcriptions at healthy rates, not truncations.

**Honest limitation:** ASR is the instrument and no human has listened to any of these 250 clips.
The proving run found `small` carries roughly one false positive in nine; `medium` agreeing on
`0e698b7f` is what raises it from suspicion to a finding, but ears would be genuinely independent
and have not been applied.

---

## 6. Where this leaves it

Per Tom's rule — *if any pilot clip truncates, stop and report rather than tune live* — the gate
has failed and the bulk render is stopped. Nothing was tuned, retried, or repaired.

What that one clip costs, stated plainly: **1 in 250 is a ~0.4% truncation rate that the render
mode cannot fix, because the mode is not what caused it.** Extrapolated over the remaining ~2,000
clips that is roughly 8 more truncated clips shipping live — under a QA pass that would catch them
after the fact, on a course that today ships 2,386 clips of *silence* in those slots.

Three things need your call, and none of them should be made by me unattended:

1. **Proceed or hold?** The alternative to ~8 bad clips is 2,386 missing ones. My read: proceed,
   with the acoustic gate run per batch and confirmed truncations re-rendered, not repaired.
2. **`0e698b7f` is live and wrong now** — re-render it (a fresh render may well come back complete;
   the truncation may not be reproducible) or delete the row?
3. **Does `TAIL_REPAIR_MODE=flag` become the default?** It is live on watson-1 right now as a
   drop-in. Memo decision #1, still open.

## Artefacts

- `scripts/fra-render-qa.cjs` — the QA harness (gitignored, read-only)
- `scripts/fra-render-batches.sh` — the batched render runner (gitignored)
- `/tmp/fra-render-qa/results-small.json` — per-clip scores for all 250
- `/tmp/fra-render/` — per-batch API responses and run log
- `~/.config/systemd/user/popty-phase8-audio.service.d/tail-repair-mode.conf` — the mode drop-in

## Operational finding, unrelated but load-bearing

`lame` is **not** installed system-wide on watson-1. Rendering works only because of the
uncommitted `LAME_BIN` resolution in `services/audio-processor.cjs` plus `~/.local/bin` on the
unit's PATH. If that working-tree change is reverted, or the service is ever run from a clean
checkout, every render on this box dies with ENOENT at the mastering step.
