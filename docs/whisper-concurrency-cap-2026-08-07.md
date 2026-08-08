# Whisper concurrency cap on watson-1 — 2026-08-07

**Trigger:** watson-1 (8 cores) at load 16 with two course rebuilds running — French band 2
and German rounds 201-400. Tom's interactive transcription nearly unusable. Brief: cap
whisper to ≤4 concurrent across BOTH runs, without stopping either rebuild.

## Why config could not do this

Whisper is spawned from two independent places:

| Caller | File | Cap | Threads |
|---|---|---|---|
| xAI phonology gate | `services/tts-service.cjs:577,605` | `XAI_PHONO_CONCURRENCY` (default 2) | `WHISPER_THREADS` (default **4**) |
| ReuseFirst veracity QC | `services/audio-veracity.cjs:179` | none of its own — rides `AUDIO_CONCURRENCY` (default 20) | `AUDIO_VERACITY_THREADS` (default 2) |

Both knobs are **per node process**. Each rebuild is its own `phase8-audio-v13.cjs`
process (FRA pid 111407 under `scripts/overnight-shepherd.sh`, DEU pid 297698 under
`tools/deu-shepherd.sh`). No environment variable can bound the *total* across two
processes. Measured at trigger time: 5 whisper processes, **14 threads** on 8 cores.

Note the real unit is threads, not processes: capping process count alone would have left
`-t 4` phono-gate calls free to multiply back into the runqueue.

## The fix

`tools/whisper-cli-cap.sh`, installed at `~/.local/bin/whisper-cli` with the real binary
moved to `~/.local/bin/whisper-cli.real`. A flock semaphore over N slot files in
`/tmp/whisper-sem`, plus a clamp on `-t`.

Chosen because it is the only place that sees **every** caller, in every run, present and
future — and because each clip spawns a fresh `whisper-cli`, it applied to the
already-running rebuilds with **no restart and no SIGSTOP**. That was the least disruptive
option available, not merely the tidiest.

Defaults: **4 slots x `-t 2` = 8 threads = core count.**

Knobs (all env, per call):
- `WHISPER_MAX_CONCURRENT` — slots (default 4)
- `WHISPER_MAX_THREADS` — clamp on `-t` (default 2)
- `WHISPER_NICE` — priority for batch calls (default 15)
- `WHISPER_NO_SEMAPHORE=1` — full bypass.

### Two additions that turned out to matter more than the cap

**Priority.** The cap bounds whisper, but watson-1 also carries ~9 agent sessions, several
vite preview servers, esbuild, transient lint runs and the two phase8 node processes doing
ffmpeg/lame work. Load therefore does *not* fall to the core count on the cap alone.
Batch whisper now runs at `nice 15` (landing at 19, since the increment stacks on the
parent's niceness), so it yields instantly to anything interactive and loses almost nothing
when nothing else wants the CPU.

**Interactive auto-bypass.** command-surface's voice path (`server.js:5486,5622`, via
`execNiced`) always passes `--prompt`, because it feeds whisper a lexicon of Tom's names
and jargon. The batch callers never pass it. The wrapper bypasses the semaphore whenever it
sees `--prompt` or a `cs-vstream-*` file, so interactive transcription never queues behind a
rebuild — with no change to command-surface and no restart of the running server.

Worth noting: `execNiced` means Tom's *interactive* transcription was already being niced
by his own config. Without the bypass it would have been both deprioritised and queued.

Measured on a real 45s `cs-vstream` clip, under live rebuild load:

| Path | Time | Notes |
|---|---|---|
| semaphored + niced | — | would queue behind 4 batch clips |
| bypass, `-t 4`, normal priority | **9.7 s** | ~4.6x realtime |
| earlier bypass test at load 17.7 | 14.1 s | ~3.2x realtime |

**Durability caveat:** this lives in `~/.local/bin`, not in git-deployed code. Reinstalling
or upgrading `whisper-cli` overwrites the wrapper and silently removes the cap. Re-install
with `cp tools/whisper-cli-cap.sh ~/.local/bin/whisper-cli` after any whisper upgrade.

## Verification

Concurrency, counted by `readlink /proc/*/exe` (counting by cmdline is unreliable on this
box — agent worker command lines contain the word "whisper" from their own prompt text and
inflate every `pgrep -f` count):

```
COUNT_REAL=4   all at -t 2      WAITING_WRAPPERS=3   (queued, working as designed)
```

Load average, 1-minute:

| Time | load1 | note |
|---|---|---|
| 13:11 | 12.29 | pre-cap (15-min avg 14.32, peak ~16) |
| 13:13 | 13.78 | cap applied |
| 13:16 | 8.81 | |
| 13:25 | 9.92 | 15-min avg 11.64 and falling |
| 13:27 | 13.85 | **not the rebuilds** — see below |

The 13:27 spike was an unrelated `eslint` / `pnpm --filter player-vue lint` run in the
`wt-leader-assign` worktree, alongside 9 concurrent `claude` sessions. Whisper stayed at 4
processes / ~2.05 cores throughout it. Honest reading: the whisper contribution is now
bounded and predictable, but total box load is **not** strictly at-or-below 8, because
other work on watson-1 (lint runs, agent sessions, the node phase8 processes themselves)
floats on top of it.

Both rebuilds confirmed still progressing after the cap — neither was stopped, restarted,
or signalled.

## Throughput cost

**FRA band 2** — matched 13-minute windows, from `scripts/overnight-shepherd.sh` progress lines:

- pre-cap 13:00→13:13: 98→319 clips = **17.0 /min**
- post-cap 13:13→13:26: 319→511 clips = **14.8 /min**
- **cost ≈ 13% slower.** Remaining 2196 clips: ~2h28m, vs ~2h09m uncapped → **+19 min**.

FRA is largely network/TTS-bound rather than whisper-bound, which is why the cost is modest.

## Recommendation: move audio+QC off watson-1

See the "separate machine" paragraph in the accompanying report. Short version: the code is
already portable (it talks only to Supabase and S3), but two concrete blockers exist —
`services/audio-intelligence/decode.cjs` and `scripts/overnight-shepherd.sh` are
**untracked in git**, so a fresh box cannot `git clone` and run.

---

# Update, same day 17:32 — the cap held and the box still saturated

**Trigger:** Tom's Activity screenshot: 6 whisper processes at 6.7 cores, box load 13.9 on 12
cores (the "8 cores" above is wrong — watson-1 has 12), fully committed. The semaphore from the
section above was already installed and working.

That is the finding worth keeping: **bounding the process COUNT does not bound contention.**
Four whisper processes at ordinary priority still take their full fair share of a busy runqueue —
the scheduler weights them against node, vite, ffmpeg and nine agent sessions and gives them
roughly a third of the box. The cap made whisper's footprint *predictable*, not *deferential*.

Two separate faults were behind the screenshot.

## Fault 1 — orphaned work outliving its job

Three `node services/run-pod-explainer-batch.cjs` processes (deu_for_jpn, ara_for_eng,
ara_eg_for_eng) were alive with **PPID 1**, ten minutes after the job that started them
(`pod-sample-gate`) had ended — the surface correctly reported "job already ended" while they went
on spawning whisper and ffmpeg. They were the whole load.

Root cause in `command-surface/ops/cs-run-worker.sh`: the cgroup sweep existed **only on the
TERM/INT handlers**, never on the normal-exit path. A worker that was *stopped* had its
descendants killed; a worker that simply *finished its turn* left every background child running,
reparented to init, owned by nothing. Nothing throttles what nothing owns, so leaked transcription
work is unbounded by construction.

Fixed by sweeping the cgroup on the normal path too, before the sentinel is written, so "the job
is over" and "its processes are gone" become true together. `sweep_cgroup` now takes a signal and
the normal path escalates TERM → KILL, because after the sentinel nobody is left to retry.

Verified against a control: the pre-fix script leaks both background children of a worker that
exits 0; the post-fix script reaps them and still records the honest exit status. The stop path is
unchanged (sentinel 143, descendants reaped).

## Fault 2 — whisper was a normal-priority citizen

Tom's standing doctrine from today: **whisper is a background-priority citizen — it may soak idle
cores, but it yields instantly to real work, and clips queue rather than contend.**

`tools/whisper-cli-cap.sh` now applies, on top of the semaphore:

| Layer | Setting | Why |
|---|---|---|
| Concurrency | 3 slots (was 4) | 3 × 2 threads = 6 of 12 cores as a hard ceiling |
| Scheduler | `chrt --idle` (SCHED_IDLE) | the real lever — runs *only* when nothing else wants the CPU, so interactive work **preempts** rather than merely outweighs |
| Nice | 15 | fallback where chrt is missing; orders whisper against whisper |
| I/O | `ionice -c 3` (idle) | the model file and wavs are real I/O; three readers otherwise stall an interactive disk read |

Each layer degrades to the next if its binary is absent, so this never fails closed.

## Verification

- 8-way simultaneous burst → **peak 3 concurrent**, the other 5 queued on the semaphore.
- Running process confirmed `SCHED_IDLE`, `ionice: idle`, and `-t` clamped 4 → 2.
- Load **13.9 → 2.5** after the orphan reap.

## Caveat

The interactive bypass is unchanged: calls passing `--prompt` (command-surface's voice path) and
`WHISPER_NO_SEMAPHORE=1` still skip the queue entirely and run at normal priority. That is
deliberate — a human waiting on one transcription should never queue behind batch QC — but it
means the cap is a cap on *batch* whisper, not on every whisper process on the box.
