# Tail-clip damage — runtime forensics timeline (watson-1)

Read-only forensics only. No process was modified, restarted, or stopped. Scope: runtime
evidence (systemd, journal, on-disk logs, processes, the command-surface job ledger) for
what actually ran and when, 2026-07-25 → 2026-08-06. Code/architecture analysis and S3/asset
forensics are other workers' halves (`tail-forensics-code`, `tail-forensics-s3`).

## Method

1. `systemctl --user list-units --all` / `list-timers --all` — full unit + timer inventory.
2. `journalctl --user -u <unit> --since 2026-07-25` for every audio-related unit; also
   `journalctl --user --list-boots` to confirm journal coverage (no gap).
3. `crontab -l`, `/etc/cron.*`, `/etc/crontab`, `atq` — no audio job found there (see below).
4. `~/.bash_history` — read, reported (near-empty, no timestamps, see Gap 1).
5. On-disk logs: the systemd units log to `~/.local/log/*.log` (not journal — confirmed by
   grepping the journal for non-systemd lines and getting zero hits), so those files are the
   real application log. Read directly.
6. `ps auxww` for live processes.
7. The command-surface dispatch ledger, `~/command-surface/command-surface.db` (`jobs` table)
   — every dispatched worker since 2026-07-25, with real start/end timestamps. This is
   genuine runtime evidence (workers that actually ran), not documentation.
8. Filesystem sweep (`find -newermt`) across all three dashboard checkouts + ssi-learning-app
   for logs/JSON touched 2026-07-28→2026-08-04, cross-checked against a bulk-checkout mtime
   artifact (see Gap 3).

## Confirmed runtime facts

**No systemd --user timer runs anything audio-related.** The only user timer on the box is
`launchpadlib-cache-clean.timer` (unrelated, Ubuntu stock). **No system-level timer, cron.d,
cron.daily/hourly/weekly entry, or `crontab -l` line touches audio, ffmpeg, tail-repair, or
phase8.** (Confidence: high — direct command output, not inferred.)

**The audio-serving systemd unit is `popty-phase8-audio.service`**, running
`node services/phases/phase8-audio-v13.cjs` out of
`/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod` (a *different* checkout from this one),
logging to `~/.local/log/popty-phase8-audio.log` (StandardOutput/Error, not journal).
Its **journal history starts 2026-08-04 16:49:33 UTC** — before that, journalctl for this
unit returns nothing, even though the journal itself has continuous coverage back to
2026-07-28 15:24:50 (two boots, no gap: boot -1 ends 2026-07-30 22:33:02, boot 0 picks up
2026-07-30 22:33:25 and runs to now). **This means the unit did not exist / was not running
under systemd before 2026-08-04 16:49.** (Confidence: high.)

**The unit carries a drop-in, `tail-repair-mode.conf`, created 2026-08-04 23:29:49 UTC**
(file birth time), setting `TAIL_REPAIR_MODE=flag`. Its own committed comment (visible on
disk, dated by the drop-in's birth time, not by me) states the code's *default* mode is
`repair` (trims into speech + re-pads), and that shipped clips in that mode lose their final
word 0.52 of the time vs 0.93 for the rest. A second drop-in, `path.conf`, was created
2026-08-04 17:28:07 UTC (unrelated — just PATH). The main unit file itself was last modified
2026-08-05 01:25:19 UTC, adding the same `TAIL_REPAIR_MODE=flag` line directly into
`ExecStart`'s environment (belt-and-braces alongside the drop-in) plus an `OOMScoreAdjust`/
`KillMode=process` hardening pass, per its own inline comments.

**Restart history for `popty-phase8-audio.service` since 2026-08-04 16:49** (from
`journalctl --user -u popty-phase8-audio.service`): started 16:49:33, restarted 16:51:44,
19:38:08 (counter 1), 23:02:35 (counter 2, after two orphaned `whisper-cli` children were
flagged as "remains running after unit stopped"), 23:29:49 (drop-in applied), 2026-08-05
01:25:39, 02:07:01, then a dense run of restarts 12:50–15:02 UTC on 2026-08-05 (many within
seconds of each other — consistent with iterative fix/restart cycles, not a scheduled batch),
continuing intermittently through 2026-08-06 01:50 and 02:39. Full list is in the journal;
this is the restart cadence, not proof of what each run processed.

**The application log (`~/.local/log/popty-phase8-audio.log`, birth 2026-08-04 16:49:33,
4,896 lines, last write 2026-08-06 02:08:49) carries NO line-level timestamps** — the process
doesn't stamp its own stdout — so within-file ordering is all that's available; wall-clock
placement is only as good as the journal restart markers bracketing it. Within this log:
every `TAIL_REPAIR_MODE=` line present reads `flag (detect + report only; audio is never
mutated)` (20 occurrences) — **no `repair`-mode line appears anywhere in this log**, and every
`masterAudio: tail flag (...) is resumed speech — pausey render shipped untouched` line (166
occurrences) is a flag-mode detection, not a mutation. **This log contains no evidence of an
actual tail-trimming mutation run** — consistent with the unit only having existed since
after the flag-mode switch, or with `repair` mode never having logged distinctly before this
log's birth (see Gap 2).

`getExistingAudioSet(deu_for_eng)` appears repeatedly at a **constant 47,254 rows / 47,231
unique keys** throughout this log's lifetime, with only 33 "missing" (14 to link, 31 to
generate) — i.e. **no bulk deu_for_eng generation/re-render ran inside this log's window**
(2026-08-04 16:49 → now). Whatever produced the bulk of deu_for_eng's 47k clips predates this
log and this systemd unit's existence — outside what journal/log evidence on this machine can
date (Gap 2/3).

## The command-surface dispatch ledger (`~/command-surface/command-surface.db`, `jobs` table)

This is a real, timestamped record of dispatched agent workers (not documentation) — `started`/
`ended` are wall-clock, recorded by the dispatch service itself. Every row below is a worker
that actually ran, per this ledger. Filtered for audio/tail-relevant labels, 2026-07-25 →
2026-08-06, chronological:

| Started (UTC-ish, server local) | Label | cwd | Model | Status |
|---|---|---|---|---|
| 2026-07-27 09:25:45 | Cap whisper concurrency in trim-verify (machine crash fix) | ssi-dashboard-v7-clean | fable | **failed** |
| 2026-07-27 09:30:35 | Finish whisper-cap fix + restart phase8 + relaunch batch | ssi-dashboard-v7-clean | opus | done |
| 2026-08-04 13:34:43 | tail-click-listen-page | ssi-dashboard-v7-clean | opus | done |
| 2026-08-04 18:06:55 | FOR TOM - tail-gate decision needed | ssi-dashboard-v7-clean | opus | done |
| 2026-08-04 21:44:09 | proving-run-rerender-20 | ssi-dashboard-v7-clean | opus | done |
| 2026-08-04 22:07:04 | proving-run-rerender-20 | ssi-dashboard-v7-clean | opus | done |
| 2026-08-04 23:27:18 | fra-audio-verify-and-render | ssi-dashboard-v7-clean | opus | done (00:01:24) |
| 2026-08-05 01:58:32 | brief: Tom answered the Camberley Mac tail-repair decis[ion] | ssi-dashboard-v7-clean | opus | done |
| 2026-08-05 02:01:02 | tail-repair fix → popty.app deploy path | ssi-dashboard-v7-clean | opus | done (02:09:39) |
| 2026-08-05 02:04:02 | overnight audio: German for Beuno + French renders + audio-type coverage | ssi-dashboard-v7-clean | opus | **cancelled-for-restart** |
| 2026-08-05 02:07:04 | overnight audio: German first, then French (watson-1) | ssi-dashboard-v7-clean | opus | **cancelled-for-restart** |
| 2026-08-05 02:21:05 | build pad-first tail-repair mode | ssi-dashboard-v7-clean | opus | done (02:30:51) |
| 2026-08-05 02:21:06 | overnight audio: German for Beuno + French renders + audio-type coverage | ssi-dashboard-v7-clean | opus | **cancelled-for-restart** |
| 2026-08-05 02:21:06 | overnight audio: German first, then French (watson-1) | ssi-dashboard-v7-clean | opus | **cancelled-for-restart** |
| 2026-08-05 02:26:59 | resume: pad-first tail-repair mode | ssi-dashboard-v7-clean | opus | stopped |
| 2026-08-05 02:46:05 | overnight audio: German for Beuno + French renders + audio-type coverage | ssi-dashboard-v7-clean | opus | done (03:03:37) |
| 2026-08-05 02:46:05 | overnight audio: German first, then French (watson-1) | ssi-dashboard-v7-clean | opus | done (02:56:55) |
| 2026-08-05 10:43:49 | FINISH THE JOB — German for Beuno + French truncation, verified | ssi-dashboard-v7-clean | opus | **cancelled-for-restart** (11:28:04) |
| 2026-08-05 11:29:05 | FINISH THE JOB — German for Beuno + French truncation, verified | ssi-dashboard-v7-clean | opus | **failed** (11:37:25) |
| 2026-08-05 11:48:04 | resume: German for Beuno + French truncation | ssi-dashboard-v7-clean | opus | done (12:13:01) |
| 2026-08-05 12:21:39 | delete 15 Sonia German intro clips (approved) | ssi-dashboard-v7-clean | sonnet | done (12:28:18) |
| 2026-08-05 14:42:58 | finish French voice-fix + German gap check | ssi-dashboard-v7-clean | opus | done (15:05:33) |
| 2026-08-05 20:32:10 | **EMERGENCY deu_for_eng audio clipping** | ssi-dashboard-v7-clean | opus | done (21:37:14) |
| 2026-08-05 22:53:28 | brief: deu_for_eng first-5-seeds audio quality pass | ssi-dashboard-v7-clean | opus | done |
| 2026-08-05 22:55:24 | deu_for_eng seeds 1-5 audio quality pass | ssi-dashboard-v7-clean | opus | done (2026-08-06 00:12:52) |
| 2026-08-06 00:39:38 | ara_lb: link 1,324 free duplicate clips (no TTS) | ssi-dashboard-v7-clean | opus | done (00:49:38) |
| 2026-08-06 01:00:33 | brief: Tom approved the deu_for_eng seeds 1-5 naked-TTS | ssi-dashboard-v7-clean | opus | done |
| 2026-08-06 01:03:36 | audio naked-TTS repair rollout + codify + loudness | ssi-dashboard-v7-clean | opus | **running** (still, at time of this report) |

**Reading this literally, as runtime evidence only** (not endorsing any worker's own claims
inside their reports — I did not read those, see Gap 4):

- The label **"overnight audio: German first, then French"** ran three times starting
  2026-08-05 02:07/02:21/02:46 UTC, the first two cut off by `cancelled-for-restart` (the
  restart-drain-gate work landing that same night per the parallel command-surface jobs), the
  third completing 02:46:05→02:56:55. This is the single clearest **named, timestamped,
  actually-completed batch touching German audio** in the whole ledger for this window. It
  ran roughly 25 minutes after the `tail-repair-mode.conf` drop-in went into effect and the
  systemd unit restarted to pick it up (23:29:49 the night before), and about 45 minutes after
  a job titled "build pad-first tail-repair mode" (02:21–02:30) — so by the ledger's own
  clock, this render ran in what the drop-in claims is flag-only (non-mutating) mode. I cannot
  independently confirm from runtime evidence alone that the running process actually had that
  env var in effect for this specific job (the ledger doesn't record env vars); the
  `journalctl` restart at 02:07:01 is the closest timestamp anchor and it postdates the
  drop-in.
- **"FINISH THE JOB — German for Beuno + French truncation, verified"**, dispatched
  2026-08-05 10:43:49 and again 11:29:05, is the first ledger label to name **"truncation"**
  explicitly as a known, named problem — i.e. by mid-morning 2026-08-05 the truncation defect
  was already identified and being chased, not freshly discovered.
- **"EMERGENCY deu_for_eng audio clipping"**, 2026-08-05 20:32:10–21:37:14, is the ledger's
  clearest incident-response marker — an emergency-labelled job specifically about
  deu_for_eng clipping, ~18 hours after the truncation label first appears and ~44 hours after
  the tail-repair-mode drop-in first shipped.
- A dedicated **"deu_for_eng seeds 1-5 audio quality pass"** ran 2026-08-05 22:55:24 through
  2026-08-06 00:12:52, and a broader **"audio naked-TTS repair rollout"** job started
  2026-08-06 01:03:36 and was still `running` at the time this report was written.

## Live processes at time of writing (2026-08-06, ~02:39 UTC)

`ps auxww` shows, among others: `node tools/audio-word-loss-scan.cjs deu_for_eng` (started
02:34, writing to `docs/audio-repair-2026-08-06/deu-wordloss.json`), `node
tools/audio-repair.cjs queue fra_for_zho --tails --max-seed 50 ...` (started 02:38, writing to
`docs/audio-repair-2026-08-06/estate/`), a `scripts/clip-detector/asr.cjs` run (started
02:23), and four live `ffmpeg` pipe transcode processes (started 02:39, part of an ASR/
detection pipeline, not a mutation pass — each is `-i pipe:0 ... -f s16le pipe:1`, i.e.
decode-only). **These are today's own investigation tooling** (this forensics effort and its
sibling workers), not the original incident — flagged so they aren't mistaken for it.

## Timeline (chronological, confidence stated per entry)

| When (UTC) | Event | Source | Confidence |
|---|---|---|---|
| 2026-07-27 09:25–09:35 | "Cap whisper concurrency in trim-verify" (failed) → "Finish whisper-cap fix + restart phase8 + relaunch batch" (done) | command-surface jobs ledger | High (ledger timestamps) — but no detail on what the "batch" processed |
| 2026-07-28 15:24:50 → 2026-07-30 22:33:02 | Journal boot -1 (covers this range, no audio-unit activity found in it) | `journalctl --user --list-boots` | High (journal coverage confirmed, no gap) |
| 2026-07-30 22:33:25 → present | Journal boot 0 (current boot) | `journalctl --user --list-boots` | High |
| 2026-08-04 13:34–18:07 | `tail-click-listen-page`, then `FOR TOM - tail-gate decision needed` — decision-support jobs, not renders | command-surface jobs ledger | High (ledger), but these are analysis/UI jobs, not the mutation event itself |
| 2026-08-04 16:49:33 | `popty-phase8-audio.service` journal history begins — earliest evidence this unit ran under systemd | `journalctl --user -u popty-phase8-audio.service` | High that this is the earliest systemd record; **cannot** confirm from this whether the process ran earlier via some other mechanism (pm2, manual nohup, a different host) — see Gap 2 |
| 2026-08-04 17:28:07 | `path.conf` drop-in created | `stat` | High |
| 2026-08-04 21:44 – 00:01 (05) | `proving-run-rerender-20` (x2), `fra-audio-verify-and-render` | command-surface jobs ledger | High (ledger) |
| 2026-08-04 23:29:49 | `tail-repair-mode.conf` drop-in created, setting `TAIL_REPAIR_MODE=flag`; unit stopped+restarted same second to load it | `stat` + `journalctl` | High |
| 2026-08-05 01:25:19 / 01:25:39 | Main unit file modified (env var duplicated into ExecStart + OOM/KillMode hardening); unit restarted | `stat` + `journalctl` | High |
| 2026-08-05 02:01–02:09 | `tail-repair fix → popty.app deploy path` | command-surface jobs ledger | High |
| 2026-08-05 02:07:01 | Unit restart (journal) | `journalctl` | High |
| 2026-08-05 02:07–02:56 | **"overnight audio: German first, then French (watson-1)"** — 2 cancelled attempts then one completed run, 02:46:05→02:56:55 | command-surface jobs ledger | High that this job ran and completed in this window; cannot independently verify from runtime evidence what mode the render used or how many clips it touched (Gap 4) |
| 2026-08-05 02:21–02:30 | `build pad-first tail-repair mode` | command-surface jobs ledger | High |
| 2026-08-05 10:43–12:13 | `FINISH THE JOB — German for Beuno + French truncation, verified` (cancelled, failed, then done on 3rd attempt) — **first explicit "truncation" label** | command-surface jobs ledger | High |
| 2026-08-05 12:21–12:28 | `delete 15 Sonia German intro clips (approved)` | command-surface jobs ledger | High |
| 2026-08-05 12:50–15:02 | Dense `popty-phase8-audio.service` restart cluster (many restarts within seconds/minutes) | `journalctl` | High that restarts happened at these times; cannot attribute each restart to a specific cause from journal alone (no crash reason logged beyond the general "Stopped/Started" pairs) |
| 2026-08-05 20:32–21:37 | **"EMERGENCY deu_for_eng audio clipping"** | command-surface jobs ledger | High |
| 2026-08-05 22:53–2026-08-06 00:13 | `deu_for_eng seeds 1-5 audio quality pass` | command-surface jobs ledger | High |
| 2026-08-06 01:03 – present | `audio naked-TTS repair rollout + codify + loudness` (still running) | command-surface jobs ledger | High that it's running; no completion evidence yet |
| 2026-08-06 02:34/02:38/02:39 | Live ASR/word-loss-scan/ffmpeg-decode processes (today's forensics tooling, not the incident) | `ps auxww` | High — but explicitly *today's* investigation, flagged as such |

## Explicit gaps (honesty rule)

1. **`~/.bash_history` has no timestamps** (`HISTTIMEFORMAT` unset) and contains only 3 lines
   total (`sudo tailscale set --operator`, an `.cs-accounts/account-4` mkdir, and a `claude
   login`) — none audio-related, and the file itself is too sparse to be useful; interactive
   shell commands for this work were evidently run through a different mechanism (dispatched
   agent sessions, not this account's login shell). Command run:
   `cat ~/.bash_history` → 3 unrelated lines. No other shell history files found under
   `/home/tomcassidy` at depth 1.
2. **No runtime evidence dates the original bulk deu_for_eng generation** (47,254 rows,
   constant throughout the one log I could read). The `popty-phase8-audio.service` journal and
   its log file both begin 2026-08-04 16:49 — before that, I have **no journal, no log, no
   process record** for this unit. I cannot rule out it ran earlier under a different
   supervision mechanism (a prior pm2 process, a manual foreground run, or a different
   machine/checkout) — the stale `~/.pm2/logs/production-api-*.log` files (last touched
   2026-07-29/30) confirm pm2 *was* in use for at least the production-api service before the
   systemd migration, so an equivalent audio-side pm2 process is plausible but **I found no
   log file evidencing it** (searched `~/.pm2/logs/*.log`, only 4 files exist, none
   phase8-audio-named, none containing batch-generation content). This is the single biggest
   gap in this half of the investigation.
3. **File-mtime sweep across the three checkouts was dominated by a bulk-checkout artifact**:
   hundreds of tracked files across `ssi-dashboard-v7-clean`, `wt-walkthrough`, and others all
   share the identical mtime `2026-07-28 15:26:53` (or `2026-08-04 18:48:27` for the
   walkthrough worktree) — clearly a `git checkout`/`clone` timestamp stamped across the whole
   tree, not evidence of individual file activity. I did not treat any of those as runtime
   evidence. Only files with distinct, non-clustered mtimes were reported.
4. **I did not read the content of individual dispatched workers' own chat transcripts**
   (e.g. what "overnight audio: German first, then French" actually did clip-by-clip, or what
   "EMERGENCY deu_for_eng audio clipping" found) — the `summary` field in the jobs table is
   truncated at source ("… \[truncated — full report in this worker's chat\]") and
   `stream_path` was empty for the row I checked, so the detail lives in those workers' own
   sessions, which are a different worker's job to read (this is runtime-existence evidence —
   *that* a job ran and when — not a report of *what it did*, which would require reading
   those sessions' content, out of scope for "runtime forensics only").
5. **No `at` jobs, no non-standard cron entries reference audio** — checked `atq` (empty) and
   the full `crontab -l` output (reproduced above in Method); confirmed none of the ~20 lines
   touch audio/tail/repair.
6. **`journalctl --user -u popty-production-api.service` and
   `popty-course-builder-api.service`** were checked for first/last entries only (Jul 30 18:34
   and Aug 04 16:45 respectively) — I did not do a full content sweep of those two logs for
   audio-adjacent activity, since neither is the audio-generation service; flagging this as an
   unswept surface rather than asserting they're clean.

## Landing line

No commits were made until this report. This report itself is committed as
`docs/audio/tail-forensics-runtime-timeline-2026-08-06.md` on branch `fix/audio-link-integrity`
(the branch this session started on) — **not merged**, and **not deployed anywhere** (it's a
docs-only forensics artifact).
