# German is moving again past round 200

*2026-08-07, watson-1. Companion to the French run, which is untouched and still first priority.*

## The three numbers

**Start time.** 11:45:24Z, verified — not scheduled and hoped for. A systemd timer armed at
11:24Z fired at 11:45:23Z, the shepherd took the lock, and the live band POSTed one second
later: `reuse-deu_for_eng-r201to400-1786103124289`, `fromRound: 201`, `dryRun: false`,
state `running`. Read back off the service's own `/reuse-run`, not off a log line.

**Band plan.** Six bands, derived from the data. `deu_for_eng` has 1,395 `is_new` LEGOs and
therefore 1,395 rounds — against French's 1,529, which is why the tail band differs. Rounds
1-200 finished at 06:44Z this morning, so the continuation is:

| Band | Rounds | State |
|---|---|---|
| — | 1-200 | done 06:44Z (NONE 3,590 / RENDERED 1,323 / REUSED_CROSS 506 / REUSED_OWN 12 / FAILED 3) |
| 1 | 201-400 | **running from 11:45:24Z** |
| 2 | 401-600 | queued |
| 3 | 601-800 | queued |
| 4 | 801-1000 | queued |
| 5 | 1001-1200 | queued |
| 6 | 1201-1395 | queued |

200 rounds a band, mirroring French: bands exist to checkpoint, and a band that takes twelve
hours is a checkpoint that never lands.

**Reuse stats.** Dry run of band 1, 5,696 distinct clips (4,301 cycles, 12,903 clip plays):

| | clips |
|---|---|
| already satisfied | 3,805 |
| to render | 1,528 |
| reuse cross-course | 352 |
| reuse within German | 11 |
| blocked / errors | 0 |

## What the dry run says that we did not expect

**The German target audio is finished.** Both target layers are 1,831 of 1,831 satisfied with
nothing to render. Every clip of work left in this band is on the **English known side** —
1,834 clips, of which only 143 are already in the clone voice — plus the 200 presentation
clips that `freshRoles` deliberately re-renders. That is the whole job: German rounds 201-400
are an English-voice rebuild, not a German one.

**The thirty-minute delay bought nothing measurable, and the reason is worth knowing.** The
delay was premised on the running French band populating a shared English clone-clip pool for
German to draw on. Measured twice — 11:24Z and 11:43Z, immediately before the start — the
plan was byte-identical both times: 352 cross-course reuses, of which `fra_for_eng` supplies
**18**.

The pool is real and it is worth having; it saves 352 renders. But it is the *estate's* pool,
not this morning's French run:

| source course | clips |
|---|---|
| spa_for_eng | 147 |
| deu_at_for_eng | 44 |
| fra_for_eng | 18 |
| eng_for_mar | 16 |
| eng_for_kan | 15 |
| mlt_for_eng | 13 |
| fra_ca_for_eng | 11 |
| 22 more courses | 88 |

And the mechanism explains it. French band 2 spends its first hours *listening*, not
rendering — at 11:56Z it was 3,800 of 4,941 clips into its incumbent listen with zero renders
issued. There was no new French audio to wait for. Twenty minutes was never going to be
enough time; the pool grows over hours, not minutes.

Nothing was lost by waiting — the start was honoured as ruled. The finding is only that the
lever is smaller than it looked, and if the two runs are ever sequenced again for reuse the
gap wants to be hours behind French's *render* phase, not thirty minutes behind its start.

## How German is kept off French's toes

Three isolations, each a trap that had already been identified:

- **Port 3469, not 3467.** The French shepherd's `deu_report()` watches 3467 and restarts a
  phase-8 service that goes unreachable there. Two loops resurrecting one service is exactly
  the split-brain the French shepherd exists to prevent. 3467 keeps its finished 1-200 run and
  is left alone.
- **Its own verdict cache**, `~/.audio-veracity-verdicts-deu.json` via
  `AUDIO_VERACITY_CACHE_PATH` — confirmed set on the running process, not just in the script.
  The store is read once and flushed as a **whole map** every 200 verdicts, so two writers is
  last-write-wins on French's thousands of remembered decodes. The reuse that matters comes
  from the database clip pool, not this cache, so not sharing costs little and sharing would
  have risked French's listening.
- **Concurrency 2**, against French's 4. Load was 8-11 on 8 cores before German started and
  12.4 after. If the box goes into distress the move is to drop German to 1 or pause it —
  never to slow French.

The shepherd is `tools/deu-shepherd.sh`, running as the systemd user unit
`deu-shepherd-start.service`, so it outlives any chat session. It reports band completions,
failures and the running damage figure straight into the conversation itself.

## Launched from a tree that can actually do the job

The original German snapshot **cannot** run a band. It predates `ef0079dd` and has zero
occurrences of `fromRound`, so a 201-400 band launched from it would have silently re-planned
from round 1 — hours of duplicated listening and no error to show for it. German therefore
runs from a fresh tree cut with `git archive` from committed HEAD `2112ac32`, never from the
working tree, which is shared with live sessions and permanently dirty. `node_modules` is
hardlinked from the French snapshot, so the tree costs 111M and needed no install.

## One thing for Tom

**Eight files that phase 8 cannot boot without are not in git.** A tree cut from committed
HEAD crashed on startup with `Cannot find module '../shared/build-identity.cjs'`. The missing
set is the whole veracity engine plus two identity helpers:

```
services/audio-intelligence/decode.cjs
services/audio-intelligence/envelope.cjs
services/audio-intelligence/syllables.cjs
services/audio-intelligence/tiers/duration.cjs
services/audio-intelligence/tiers/energy.cjs
services/audio-intelligence/tiers/vad.cjs
services/shared/build-identity.cjs
services/shared/clip-identity.cjs
```

They are untracked, not gitignored — so this is an omission, not a policy. They are byte-identical
between the working checkout and the French snapshot that is running right now, so there is no
ambiguity about which version is correct; I copied them into the German tree and it booted.

I did **not** commit them. They are somebody else's uncommitted work in a shared checkout, and
sweeping eight files of a live session's work into my commit is the branch-hygiene failure this
repo has a rule about. But it means every deploy, snapshot or fresh clone of this repo produces
a phase-8 service that will not start, and the next person to hit it will lose the same twenty
minutes I did. Worth one commit from whoever owns them.

## Damage figure — pending

French measured 497 damaged out of 5,217 incumbent clips (9.5%) on band 1, and band 2 is
tracking similar at 424 of 3,800 (11.2%) so far. German's equivalent number for rounds 201-400
lands when its listen phase completes; the shepherd pings it into the conversation the moment
it appears, and every 1,000 clips on the way.
