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

## Watching

- `/tmp/overnight-shepherd.log` — per-minute progress, both runs
- `/tmp/overnight-shepherd-alerts.log` — only what a human should look at
- artifacts — `docs/audio-repair-2026-08-07/fra_for_eng-rounds<from>-<to>-reuse-applied-log.json`

The incumbent-listen damage figure — the first real measurement of Tom's *1-in-3* — has **not been
emitted yet**; it prints once at the end of the listen phase, as
`listened to N incumbent clips — M damaged`. It is reported the moment it lands.
