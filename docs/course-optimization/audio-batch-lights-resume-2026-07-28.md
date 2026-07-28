# Audio batch — light-course resume record (2026-07-28)

Execution record for the founder decision on the paused batch audited in
[`audio-batch-fill-vs-regen-audit-2026-07-28.md`](./audio-batch-fill-vs-regen-audit-2026-07-28.md).

**Decision executed:** resume the light courses now; HOLD the five heavy `X_for_eng`
courses until the English known side is repointed to the xAI clone voice; commissioned
repairs included in the resumed scope.

## The running unit — how to check it later

| | |
|---|---|
| pm2 unit name | **`audio-batch-lights`** |
| log path | **`logs/audio-batch-lights-2026-07-28.log`** (repo-relative; out+err merged) |
| check it | `pm2 list \| grep audio-batch-lights` and `tail -f logs/audio-batch-lights-2026-07-28.log` |
| live progress | `curl -s localhost:3465/status` (phase8 current/total/success/failed) |
| stop it | `pm2 stop audio-batch-lights` then `curl -XPOST localhost:3465/cancel` |

Started `--no-autorestart` on purpose: this is a queue that finishes, not a daemon. It is
OS-owned (pm2), **not** a child of any agent session, so it survives every session ending.
Resume-safety is unchanged — phase8 marks a request fulfilled only on a zero-failure pass
and `/generate` only voices missing/unlinked audio, so re-running picks up where it stopped.

## Scope

Runner gained `--only-courses` / `--exclude-courses` (commit `977a5e28`) so per-course spend
decisions no longer require editing approved queue rows. Unmatched names are a hard abort
before any TTS — a typo in an exclusion would otherwise spend money on the held-back course.

Excluded (8): `fra_ca_for_eng`, `por_br_for_eng`, `spa_mx_for_eng`, `eng_for_tel`,
`eng_for_urd` (heavies, held) + `deu_ch_for_eng`, `fin_for_eng`, `por_for_jpn` (no voice_config).

**Real unlinked-slot counts, measured today** (all 9 slot sources, NULL audio FK):

| bucket | courses | slots |
|---|---|---|
| light — RUNNING | 33 | **5,059** |
| heavy — HELD | 5 | 116,911 |
| no voice_config — BLOCKED | 3 | 118,569 |

**The light figure is 5,059, not the audit's ~700.** The difference is two courses:
`eng_for_guj` (2,559) and `eng_for_pan` (1,339) — the backfill residuals the audit listed
separately, left over when resume4 was interrupted. They are in scope deliberately: they are
`eng_for_X` courses whose English is the **target** side (already xAI clone-voiced), so the
clone-repoint rationale for holding the heavies does not apply to them, and they are the tail
of work already approved, started and part-paid. ≈5k clips ≈ 120k chars ≈ **$0.50 at Azure
rates** plus the xAI share for English target1. Everything else is single-to-double digits.

## Incident during this resume — 719 wasted renders (fixed)

Bouncing phase8 with `pm2 restart --update-env` from a shell with a minimal PATH
(`/usr/bin:/bin:/usr/sbin:/sbin`) pushed that PATH into the service. `ffmpeg` lives at
`/opt/homebrew/bin/ffmpeg` and is invoked bare, so it vanished — and **every clip failed
loudness normalisation _after_ its TTS render was already paid for**. Caught at 719 failures
(`ok=0 fail=719`), batch stopped and phase8 cancelled within ~2 minutes of the first check.

Invisible by design until it wasn't: the ebur128 probe runs under `|| true`
(`services/audio-processor.cjs:285`), so the only symptom was a 100% failure rate.

Fix (`ea3220b5`): `services/audio-processor.cjs` now pins `/opt/homebrew/bin` and
`/usr/local/bin` onto `process.env.PATH` at load, so ffmpeg cannot depend on whoever last
restarted pm2. Verified two ways — the module resolves ffmpeg under the exact stripped PATH
that broke it, and a live one-clip generate returned `generated=1/1 failed=0`.

Nothing precious was lost: failed clips simply stay missing and are regenerated on this run.
The cost is the wasted renders (English target1, xAI-voiced — exact cost unknown, see pricing
note in the heavies-prep doc).

## First-course evidence

- `eng_for_ita` — `HTTP 200 status=completed generated=1/1 failed=0`, request **fulfilled**;
  it correctly dropped out of the queue on the next pass (33 → 32 requests), which also
  demonstrates the resume-safety.
- `eng_for_guj` — the big one, progressing normally after the fix: `generate 98/2040 ok=92
  fail=6`. A few percent tail-defect/transient failures is the expected rate (the audit saw
  ~1,000 across ~70k) and those clips are retried by the next run.

## Blocked — needs voice_config before it can EVER run

`deu_ch_for_eng` (46,581 slots), `fin_for_eng` (48,189), `por_for_jpn` (23,799) have **no
voice_config**. `/generate` 400s and generates nothing; their queue rows will sit pending and
400 until a voice_config is created. That is a separate task — ~118.6k slots ≈ 2.35M chars if
ever configured, which makes it a spend decision in its own right, not a repair.

## Held — the five heavies

Not touched. See `heavies-clone-repoint-prep-2026-07-28.md` for what the clone repoint
requires before they run.
