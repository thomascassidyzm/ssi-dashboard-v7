# German: the approved scope was already spent — and half of it was spent through the damaging branch

**2026-08-05 · worker `f4f12360` · watson-1 · measured live, not quoted from the plan**

The brief instructed me to verify the German plan's headline counts with a live query before
spending, and to report divergence rather than quietly adopt new numbers. The divergence is large
enough to change what the German job actually is, so it gets its own document.

---

## 1. The silent class is gone

`docs/deu-audio-repair-plan-2026-08-04.md` headline: **905 clips proven silent**, 1,107 clips in
scope, ≈$1.50 estimated spend. Live `course_audio` at 2026-08-05 02:50:

| course | total rows | TTS clips `duration_ms < 400` | `duration_ms IS NULL` |
|---|---:|---:|---:|
| `deu_for_eng` | 47,281 | **1** (`pod_explainer` — out of repair scope) | 27 |
| `fra_for_eng` | 49,106 | **3** (1 `target2`, 2 `pod_explainer`) | 0 |

So the 905 silent German clips **no longer exist**. They were repaired on 2026-08-04, not deleted:
`/tmp/repair-deu_for_eng-1107.json` holds a per-clip record of 1,082 replacements, and every one of
those 1,082 new audio ids is **still live** in `course_audio` today (verified by direct id lookup,
254 `target1` · 415 `target2` · 413 `known`).

The 27 nulls are the Azure Sonia `presentation` rows already documented in `deu-status.md`.

**Consequence: the 1,107-clip scope Tom approved has already been spent.** It was spent on
2026-08-04, before this night began. Re-running it would be paying twice for the same work.

## 2. But 449 of those renders were amputated after rendering

This is the finding that matters. The 2026-08-04 run's own log (`/tmp/deu-repair-run.log`) records
which branch of `repairTailDefect` each clip took:

| branch | log signature | count |
|---|---|---:|
| **damaging** — tail cut off the fresh render | `tail resurgence …dB repaired in N pass(es)` | **449** |
| safe — flag only, audio shipped intact | `tail flag (…) is resumed speech — pausey render shipped untouched` | 282 |

`TAIL_REPAIR_MODE=flag` was introduced *during* 2026-08-04 (the systemd drop-in is annotated "added
2026-08-04 for the fra_for_eng missing-clip render"), so that run straddled the fix: it started on
the amputating default and finished on the flag.

That is the exact damage class this whole programme exists to remove, and the measured evidence for
its severity is already on file — whisper final-word retention **0.52** for clips bearing the
repair's fingerprint against **0.93** for the rest, p=0.00001
(`docs/audio-tail-gate-decision-memo-2026-08-04.md`), with the documented example being the German
`"Ich will heute nicht üben"` shipping as `"Ich will heute…"`.

## 3. So the German job tonight is not the plan's job

The plan's job — silence — is done. The real remaining German risk is **the audio the plan's own
repair run produced**: 1,082 freshly-rendered clips, of which up to 449 were tail-cut immediately
after being rendered.

That population is the highest-yield target in the course, and it is targetable exactly rather than
by sweeping blind: the new audio ids are recorded per clip. Written to
`scripts/overnight-audio-2026-08-05/ids/deu-2026-08-04-repaired.json` (1,082 ids, all verified live).

**Order of work, given Beuno tests today:**

1. **Seeds 1–30** — the stretch Beuno actually hears — acoustic detection, then re-render only what
   fails. (Resumed from the caches the restart killed; running.)
2. **The 1,082 re-rendered clips** — detection, then re-render only what fails.

Both are detect-first. Nothing is blind-re-rendered, so spend tracks measured defects rather than
population size.

## 4. Cost, and why this needed no new approval

Re-rendering a clip that fails detection in these two populations is **the same clips and the same
money as the approved 1,107-clip scope** — done once, correctly, with the flag on, instead of
through the branch that damaged them. The full 2026-08-04 run cost 10,857 characters of TTS; a
detect-first pass over the same population costs strictly less, because only failures re-render.
That is an order of $0.04–0.15 at the Azure S0 reference rate, far below the brief's $25 escalation
threshold. The repo still records no xAI per-character rate, so every figure here is a reference
estimate, not a quote.

## 5. Stated as gaps

- **Whether a given one of the 449 is audibly damaged is not knowable from the log alone.** The
  branch fired; how much was cut varies per clip. Detection answers it per clip; the log only
  identifies the population.
- The 282 flag-branch clips from that run are *not* suspect on this axis, but they are not proven
  clean either — they were never gated acoustically. They are inside the 1,082 list and get checked
  anyway.
- Everything outside seeds 1–30 and the 1,082 list remains **unchecked**. `deu_for_eng` holds
  ~47,000 clips and a full-course acoustic pass is ~25 core-hours.
- **The gate is validated on silence and truncation only. Mispronunciation is not covered.** No pass
  rate from this work may travel without that sentence.
