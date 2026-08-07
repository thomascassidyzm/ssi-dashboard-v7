# Overnight shepherd — adopting two detached runs, and the snapshot that would not have booted

2026-08-07, 05:15Z. Adopts the fra_for_eng banding run (port 3468) and the deu_for_eng English
rebuild (port 3467) after both owning agents ended. Continues
`fra-rounds-11-200-run-method.md`.

## State at adoption, 05:05Z

| | FRA (3468) | DEU (3467) |
|---|---|---|
| run | `reuse-fra_for_eng-r200-1786078611627`, started 04:56:51Z | `reuse-first`, started 04:51:55Z |
| state | `running` — plan built, **6,413 distinct clips** in rounds 1-200, now in the incumbent-listen phase | 503/1844, **0 failed** |
| code | pinned snapshot `~/.fra-redo-snapshot-2026-08-07` (SNAP1) | live checkout, `5c3a724d` |

Both alive; neither needed restarting. Whisper decodes were confirmed flowing for both
(`-l fr` for the FRA incumbent listen, `-l en`/`-l de` for the DEU render gate).

## Finding 1 — the pinned snapshot could not have run band 2

The handoff records SNAP1 as re-pinned at 04:56Z "to HEAD". It was pinned to **`0eae988d`**, and
`fromRound` + `MAX_ROUNDS` landed **after** that, in `e63e7c3a`. SNAP1 contains zero occurrences of
`fromRound` and still clamps `rounds` to 500.

Band 1 (1-200) is unaffected — it never needed `fromRound`. But **band 201-500 could not have been
launched on that process at all**: the parameter would have been ignored, silently re-planning from
round 1 and re-decoding every finished round through whisper, which is hours of CPU spent
re-answering answered questions.

Fixed by building **SNAP2** (`~/.fra-redo-snapshot2-2026-08-07`) at `ef0079dd`. Banding proved on it
before use, not assumed:

```
GET /reuse-plan/fra_for_eng?rounds=12&fromRound=11
  -> shape.rounds: 2, cycles 35, distinctClips 80, summary.satisfied 80
```

Two rounds, not a twelve-round prefix. Disjoint, and idempotent — the already-finished clips come
back SATISFIED.

## Finding 2 — `git archive` builds a snapshot that will not boot

SNAP2 was first built with `git archive ef0079dd`. It died on the first start:

```
Error: Cannot find module '../shared/build-identity.cjs'
```

**Eight modules phase 8 requires are untracked in git** — present in the working tree, never
committed, and not gitignored:

```
services/shared/build-identity.cjs      services/shared/clip-identity.cjs
services/audio-intelligence/decode.cjs  services/audio-intelligence/envelope.cjs
services/audio-intelligence/syllables.cjs
services/audio-intelligence/tiers/{duration,energy,vad}.cjs
```

So **any snapshot built from git — archive, clone, or worktree — is missing them and cannot start
phase 8.** SNAP1 works only because it was built by copying the checkout. This is a trap for the
next person who pins a snapshot the obvious way; it costs one failed boot to find, and it would
have been found at a band boundary at 3am rather than at 05:12Z under supervision.

SNAP2 was completed with `rsync --ignore-existing` **from SNAP1, not from the live checkout** — SNAP1
is the tree the flying run already loaded and proved, whereas the live checkout is being edited by
other sessions mid-run (which is the whole reason for pinning). Tracked files stayed at `ef0079dd`;
`fromRound` survived the fill; the post-04:28Z last-word veracity rule is present in both.

**Not fixed here, deliberately**: committing those eight files is another session's in-flight work,
and sweeping them into this branch would land someone else's half-finished edits. Flagged for the
morning as a one-line job with a real payoff — it makes snapshots reproducible from a ref.

## Single ownership

`tools/fra-rounds-supervisor.sh` was still looping (pid 3687493), hardcoded to rounds 1-200. Two
loops that both resurrect a dead service and both POST a fresh run is precisely how a course gets
two competing passes. It was stopped and its run id adopted, so the in-flight pass was never
touched.

`tools/overnight-shepherd.sh` replaces it, and differs in three ways that matter:

- **Bands, not one scope** — `1-200, 201-500, 501-900, 901-1300, 1301-1529`, advancing on its own,
  band index persisted in `~/.fra-band-state` so restarting the shepherd resumes the right band.
- **Relaunches onto SNAP2**, and swaps the service off SNAP1 at the first band boundary, because
  band 2+ needs `fromRound`.
- **A band is DONE only when its applied-log artifact exists on disk.** `state:done` without
  `docs/audio-repair-2026-08-07/fra_for_eng-rounds<from>-<to>-reuse-applied-log.json` is a claim,
  not evidence; the shepherd refuses to advance on it and raises an alert instead.

Concurrency stays at **4**. Eight cores, already carrying two whisper fleets — not raised.

## The DEU restart gap, stated rather than papered over

The DEU run's id is not recoverable: `reuseRuns` is an in-process map with no list endpoint, and the
id is only logged when the run *finishes*. It is therefore tracked by `/status` plus the
`[ReuseFirst] … finished:` line, and its id will be captured at completion.

Its shape *is* recoverable, from the dry-run artifact: German targets are **already fully
SATISFIED** (target1 `xai_ara`, target2 `xai_leo`, 1,743 clips each) — this run renders only the
English/known and presentation layers onto Tom's clone `xai_gfzdpspr5fdp`.

If the DEU service dies the shepherd **restarts the service but does not relaunch the run**. The
exact launch parameters are not recoverable from the process, and a guessed relaunch renders audio —
it spends money and could put a wrong voice into the course. Restarting a service is free and
reversible; reissuing a render run is neither. It alerts and leaves that call to a human.

## Measured throughput, and the thing it says out loud

Measured 05:18-05:22Z on this machine, with both runs sharing eight already-loaded cores.
Whisper decodes were attributed to each service by parent pid, so these are real rates for
*this* configuration, not estimates:

| | measured |
|---|---|
| FRA incumbent listen | **22.7 whisper decodes/min** (4 concurrent, as configured) |
| DEU render + gate | **17.3 clips/min**, 0 failed |

Rounds 1-200 is 6,413 distinct clips = **4,314 incumbents to listen** plus 2,099 to render:

- listen: **3.2 h**, finishing ~08:10Z
- render: 2.3 h if the listen promotes nothing, **3.9 h at Tom's 1-in-3**, 4.7 h at half
- so band 1 lands somewhere around **10:30-13:00Z** — not overnight

**And that reframes the whole course.** At ~32 distinct clips per round, 1,529 rounds is
**~49,000 distinct clips**. Band 1 is 200 of those rounds and costs the best part of a working
day. The full-course rebuild is a **multi-day** job at this shape — days of wall-clock, not a
night. That is a fact about the work, not a problem with the run, and it is better known now
than discovered on Tuesday.

Bands were resized on these numbers: **200 rounds each**, not the 300-400 first guessed. Bands
exist to checkpoint, and a band that takes twelve hours is a checkpoint that never lands. Eight
bands: `1-200, 201-400, … 1401-1529`.

The obvious lever, *not* pulled: concurrency stays at **4**. Eight cores are already carrying two
whisper fleets, and Tom's standing instruction on this machine is not to raise it.

## The damage figure, as it lands

The listen logs a running count every 200 clips, so the answer to Tom's *1-in-3* does not
have to wait for the end of a 3.5-hour phase:

| listened | damaged | cumulative | in that block |
|---|---|---|---|
| 200 | 2 | 1.0% | 1.0% |
| 400 | 18 | 4.5% | 8.0% |
| 600 | 35 | 5.8% | 8.5% |
| 800 | 53 | 6.6% | 9.0% |
| 1,000 | 65 | 6.5% | 6.0% |

**~6.5% cumulative, 6-9% marginal — well under 1 in 3.**

Preliminary, and with the reason it may rise stated up front: clips are listened in plan
order, which is round order, and rounds 1-10 were rebuilt fresh at 04:13-04:25Z this
morning. The first few hundred clips are therefore the newest audio in the course, which is
exactly why the first block reads 1.0% and the rate then trebles. What we can say now is
that the marginal rate has *settled* around 6-9% rather than continuing to climb.

Nothing here contradicts what Tom heard. He was listening to specific clips, and a 1-in-3
experience of the clips *he happened to play* is entirely compatible with a 7% base rate —
damage is not evenly spread, and the rounds he was testing are not a random sample. The
final number, and its distribution across rounds, is the thing to look at in the morning.

## Concurrency: the parameter is not the ceiling

Authorisation came through to raise FRA concurrency stepwise once DEU frees its cores. Two
measured facts change what that is worth:

**It cannot be applied to the flying band at all.** The listen result lives only in memory,
so raising concurrency means restarting the run, which throws away every decode banked so
far *and* the damage measurement with it. Concurrency is fixed for a run's lifetime. So this
applies to band 2 onward, and there is nothing to do about it tonight.

**And the parameter is not where the ceiling is.** `whisper-cli` runs with `-t 2`, so
concurrency 4 is already **8 threads on 8 cores**. Going to 8 would be 16 threads on 8 cores
— oversubscription, not throughput. With both runs live the box was at 14 threads on 8 cores
and each run was getting roughly half a machine.

So the recommendation for band 2 is **5-6, measured**, not 8: the only headroom above 4 is
the S3-fetch wait that leaves a worker's threads briefly idle, which is a few percent, not a
doubling. Raise, measure, and keep it only if throughput actually moved.

Clean listen rate with the box otherwise quiet: **28.6 clips/min**, so the band-1 listen
(5,217 clips) ends ~08:25Z.

*A near-miss worth recording:* an intermediate reading suggested 9.5/min and a 9-hour listen.
That was an artifact — the log lines carry no timestamps, so "when I first saw the line" is
not "when it was written", and a probe of mine was stealing a quarter of the box at the time.
Measuring properly gave 28.6/min and vindicated the original figure. The wrong correction was
one command away from being reported as fact.

## Bands cannot be overlapped — but the overlap is the prize

Asked whether band N+1's listen could run while band N renders, since "phases touch different
clips". **The premise is false, and measured so.** Bands are disjoint in ROUNDS but not in
CLIPS: review offsets reach back as far as 2584 rounds, so a later band replays earlier
clips. On real plans:

- rounds 201-210 plans 501 distinct clips; **179 of them (35.7%) are clips rounds 1-200 also plays**
- of its 173 actionable clips, **63 are shared with band 1**

Running the two concurrently would double-render those 63 and race the swap — the opposite of
idempotent.

But the overlap that kills the pipelining idea is itself the cheaper win. Whisper is the
dominant cost, and every band currently re-listens to the shared clips from scratch. So
instead: **a persistent verdict cache** (`2c2a4836`), keyed on s3Key + expected text +
language.

It is correct *by construction* rather than by invalidation — `mastered/<uuid>.mp3` is
write-once, a re-master mints a new key, so an s3Key names the same bytes forever. There is
deliberately no TTL and no invalidation path; adding one could only make it wrong. An
unanswerable check (whisper missing, download failed) is never cached, so a transient outage
cannot freeze into a permanent verdict.

Better, simpler and cheaper than the concurrency route on every leg: it removes the work
rather than racing to do it, needs no cross-run coordination, and carries no double-write
risk. 8 new tests, 81/81 green. Deployed to the band-2 snapshot only — **the flying run is
deliberately untouched**.

## Single instance is a lock, not a promise

While resizing the bands I restarted the shepherd and briefly had **two** running — precisely the
split-brain this file exists to prevent. Care was clearly not sufficient, so the guard is now
structural: the script re-execs itself under `flock -n /tmp/overnight-shepherd.lock`, and a second
copy exits immediately. Proved by launching a second copy and watching it refuse.

## Watching

- `/tmp/overnight-shepherd.log` — per-minute progress, both runs
- `/tmp/overnight-shepherd-alerts.log` — only what a human should look at
- artifacts — `docs/audio-repair-2026-08-07/fra_for_eng-rounds<from>-<to>-reuse-applied-log.json`

The incumbent-listen damage figure — the first real measurement of Tom's *1-in-3* — has **not been
emitted yet**; it prints once at the end of the listen phase, as
`listened to N incumbent clips — M damaged`. It is reported the moment it lands.
