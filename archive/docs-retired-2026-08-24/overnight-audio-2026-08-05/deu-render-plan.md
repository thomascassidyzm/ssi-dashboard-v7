# deu_for_eng — overnight render plan (2026-08-05)

Beuno (Aran's son) tests the German course today. German is the priority job;
`fra_for_eng` and the estate-wide audio-type coverage table are held by sibling
worker `8b1dae03` (lock: `/tmp/popty-overnight-audio.lock`). This worker touches
**deu_for_eng only**.

## Gate verified ACTIVE before any render

`TAIL_REPAIR_MODE=flag` stops `repairTailDefect` mutating audio. Verified three ways:

1. **Live processes** — phase8-audio (pid 8382) and production-api (pid 8391), both
   running from `ssi-dashboard-v7-clean-prod` @ `d5ad9f2c`, carry
   `TAIL_REPAIR_MODE=flag` in `/proc/<pid>/environ`. Set by hand; it is in no
   service file, so it does NOT survive a rebuild of those units.
2. **Code default is still `repair`** — `services/audio-processor.cjs:684`,
   on `origin/main` and on both `fix/tail-repair-*` branches. So **any CLI tool
   inherits the DAMAGING path unless the shell exports it.**
3. **Positive proof, zero TTS spend** — `tools/verify-tail-repair-mode.cjs` builds a
   fixture matching `detectTailClick`'s resurgence rule and runs the real function:

   | mode | action | new file cut? | duration |
   |---|---|---|---|
   | `TAIL_REPAIR_MODE=flag` | `held`, `flagOnly:true` | no | 1.832s unchanged |
   | unset (code default) | `repaired` | yes | 1.832s → 1.700s, **7.2% removed** |

Render path for repairs: `audio-veracity-repair --apply` → `tools/repair-silent-clips.cjs`
→ `phase8.masterAudio()` → `repairTailDefect(..., minKeepSec: 0.2)`. So the export is
mandatory on every repair command. `PHASE8_NO_LISTEN=1` is also mandatory: phase8 is
loaded as a library and would otherwise fight live pid 8382 for port 3465.

## Batch 1 — shakedown (this batch)

| field | value |
|---|---|
| course | `deu_for_eng` |
| selection | the 14 gate-confirmed failures from the 2026-08-05 estate ids sweep (`scripts/veracity-estate-sweep/out/ids-deu_for_eng.json`) |
| clips | 14 (`known`/`eve` × 8, `target2`/`leo` × 6) |
| TTS characters | 399 |
| cost | ≈ $0.0016 at the Azure S0 rate. **These are xAI voices and xAI per-character rates are not recorded in this repo — treat as a lower bound, not a quote.** Worst case ~3× (up to 3 re-rolls per clip). |
| voices | course `voice_config`: known=`eve`, target1=`ara`, target2=`leo`, presentation=`eve` — all xAI. Unchanged. |
| failure mode being fixed | truncation, e.g. `"sie ist durch gegangen"` decoding as `"ZIIS."`; `"Ich werde Deutsch sprechen"` as `"Ich werde ..."` |

Every replacement mints a NEW audio id (the player caches blobs by id under an
immutable max-age=31536000 policy), heals every link, and can undo itself.

## Batch 2 — the opening stretch (pending gate result)

Read-only gate over seeds 1–30, the stretch Beuno actually hears: 2,762 clips
(878 `known`/`eve`, 887 `target1`/`ara`, 890 `target2`/`leo`, 7 `pod_fine_known`,
223 bound by `lego_id` incl. `presentation`). Dry run in flight; the repair list it
produces is batch 2. Sized against the estate-sweep confirmed rate, expect tens of
clips, not thousands.

## Explicit scope limits

- **Not a full-course gate.** `deu_for_eng` holds 47,281 clips; at the measured
  ~1.7s/clip that is ~25 hours. Seeds 1–30 are covered; **everything past seed 30 is
  UNCHECKED tonight** and is reported as such, not as clean.
- **`presentation` and `pod_*` are skipped by the repair tool by design**
  (`SKIP_ROLE`, tools/audio-veracity-repair.cjs:112) — deleting a presentation
  CASCADEs into `lego_introductions`, and pod links live in `listening_pod_sentences`.
  German holds 2,345 `presentation` clips and ~2,500 `pod_*` clips that this tool will
  never nominate. Reported as a gap; the mechanism table is 8b1dae03's deliverable.
- **The gate is validated on SILENCE and TRUNCATION. Mispronunciation is NOT covered
  and was never tested.** No pass rate from this work may travel without that sentence.
- Pod target character voices are deliberate casting, not defects
  (`docs/audio-repair-2026-08-04/deu_for_eng-revoice-complete.md`). Not touched.
