# Repointing course-builder (3471) off the developer's working checkout

**Date:** 2026-08-05 · **Host:** watson-1 · **Approved by:** Tom
**Follow-on from:** `docs/deploy-staleness-watchdog-2026-08-05.md`

## What was wrong

The staleness watchdog went in on 2026-08-05 and immediately reported the same
line every ten minutes:

```
popty-staleness: skipping popty-course-builder-api — loaded from
/home/tomcassidy/SSi/ssi-dashboard-v7-clean, not …/ssi-dashboard-v7-clean-prod
```

That skip was correct behaviour and a true finding. Of the three Popty services
on watson-1, two ran from the clean deployed clone and one — course-builder, the
service that validates every seed submission and spawns every build agent — ran
from a developer's in-progress working checkout:

| service | port | checkout (before) |
|---|---|---|
| popty-production-api | 3470 | `ssi-dashboard-v7-clean-prod` |
| popty-phase8-audio | 3465 | `ssi-dashboard-v7-clean-prod` |
| **popty-course-builder-api** | **3471** | **`ssi-dashboard-v7-clean`** ← developer's tree |

So 3471 served whatever branch a developer happened to be sitting on, plus
whatever they had uncommitted. At cutover time that was branch
`fix/audio-finish-the-job-2026-08-05` at `22a0cb2c`, with ten modified tracked
files in the tree. It also meant the service could never be judged or updated by
the watchdog, because the watchdog deliberately refuses to restart a unit loaded
from a clone it does not own.

## What was actually being served

Recorded before touching anything:

- **branch** `fix/audio-finish-the-job-2026-08-05`
- **commit** `22a0cb2c7eae9c29825050d6b715d847328a6922` — **pushed**; contained in
  `origin/fix/audio-finish-the-job-2026-08-05`, so no commit was at risk
- **plus uncommitted working-tree edits**, which is why "pin the clean checkout to
  the same commit" was not on its own sufficient. The served artefact was a
  hybrid of a commit and a dirty tree, and two of the dirty files were inside
  this service's require graph:

```
services/shared/claude-cli.cjs
services/shared/claude-config.cjs
```

Those two carry the watson-1 auth fix — the previously hardcoded
`/Users/tomcassidy/.cs-accounts/account-3` (the Mac's home) resolved to nothing
on Linux, so every spawned CLI fell back to the stale `ANTHROPIC_API_KEY` and
died with 401. Deploying `22a0cb2c` alone would have reintroduced that.

**They did not need to be carried across: the same fix had already landed on
`origin/main` independently.** Verified byte-for-byte, not by reading the diff.

## The zero-behaviour-change proof

Rather than assume, the whole require graph of `services/course-builder-api.cjs`
was resolved (59 first-party files, `node_modules` excluded) and every file
compared byte-for-byte between the running tree and the clean one:

| result | count |
|---|---|
| byte-identical | **57** |
| differs | **1** — `services/course-builder-api.cjs` |
| missing from the clean tree | 0 |

The single difference is the `/health` build-identity hunk from `c051a509` — the
watchdog commit — which adds `build: buildIdentity()` to the health payload and
changes nothing else:

```diff
-app.get('/health', (req, res) => res.json({ ok: true }));
+const { identity: buildIdentity } = require('./shared/build-identity.cjs');
+app.get('/health', (req, res) => res.json({ ok: true, build: buildIdentity() }));
```

So the cutover moved the service *onto* the health reporting it needs to be
watched, and changed nothing else in its 59-file graph. That is a stronger
guarantee than pinning a commit would have given, and it is why the clean
checkout used is the existing `-prod` clone rather than a third clone pinned to
`22a0cb2c` — a third clone would have been dirty-tree-equivalent, off `main`,
and invisible to the watchdog, which is the problem being fixed.

The `-prod` clone already shares the dev tree's `.env` and `node_modules` by
symlink, so no environment drift was introduced either.

## The change

One line, in `ops/systemd/popty-course-builder-api.service` and the installed
copy at `~/.config/systemd/user/`:

```diff
-WorkingDirectory=/home/tomcassidy/SSi/ssi-dashboard-v7-clean
+WorkingDirectory=/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod
```

The repo-canonical unit was byte-identical to the installed one beforehand, so
both were updated — otherwise a reinstall from `ops/systemd/` would silently
revert the cutover.

Previous installed unit backed up to
`~/.config/systemd/user/popty-course-builder-api.service.bak-2026-08-05`,
matching the convention already used for the other two units.

Restart window was chosen after confirming the service had **no in-flight
children** (`ps --ppid` empty, cgroup held only the main process) and no active
build. `KillMode=process` was already set, so spawned agents survive a restart
regardless.

## Verification

`/health`, before and after:

```
before: {"ok":true}
after:  {"ok":true,"build":{"root":".../ssi-dashboard-v7-clean-prod",
        "commit":"6bcb63532b3be49374f8e122c8eec785c1caee0d","branch":"main",
        "dirtyAtStart":false,...}}
```

Seven read-only endpoints captured before the restart and re-captured after,
compared byte-for-byte:

| endpoint | http | result |
|---|---|---|
| `/api/stats/fra_for_eng` | 200 | identical |
| `/api/stats/deu_for_eng` | 200 | identical |
| `/api/build/status/fra_for_eng` | 200 | identical |
| `/api/v2/build/status/fra_for_eng` | 200 | identical |
| `/api/course/fra_for_eng/drafts` | 200 | identical |
| `/api/orchestrator/status/fra_for_eng` | 200 | identical |
| `/api/checkpoint/status/fra_for_eng` | 404 | identical |

Startup log clean — Supabase connected, language-code service loaded, build
manager running, no errors.

The watchdog now adopts the service instead of skipping it. State file after a
manual run:

```json
"running": {
  "popty-production-api": "6bcb6353…",
  "popty-course-builder-api": "6bcb6353…",
  "popty-phase8-audio": "6bcb6353…"
}
```

No watchdog configuration was needed. It attributes services by the `root` they
report on `/health`, so course-builder joined the moment it started reporting
one.

## The developer's checkout

Left completely untouched — same branch, same `HEAD` `22a0cb2c`, same 32 dirty
entries, no stash created, no file written into the tree.

The served commit was pushed, so nothing was at risk there. The tree does
however hold genuinely unpushed uncommitted work, which was snapshotted
read-only *outside* the checkout rather than committed or stashed:

```
~/.local/share/popty-wip-snapshots/ssi-dashboard-v7-clean-wip-2026-08-05T1300Z.{tracked.patch,untracked.tar.gz,status.txt,head.txt}
```

Of the ten modified tracked files, five are already byte-identical to
`origin/main` and five are unique to the tree:

| unique to the dev tree | already on main |
|---|---|
| `services/audio-processor.cjs` | `services/shared/claude-cli.cjs` |
| `services/production-api.cjs` | `services/shared/claude-config.cjs` |
| `src/components/production/autocue/AutocueStudio.vue` | `src/components/production/autocue/RoleSelector.vue` |
| `src/components/production/autocue/ModeSelector.vue` | `src/views/RecordRoom.vue` |
| `src/composables/useAutocueState.js` | `tools/recording-optimizer/generate-recording-script.cjs` |

None of the five unique files are in course-builder's require graph, so none of
them were ever being served by 3471. `services/production-api.cjs` is worth a
look separately: 3470 runs the `main` version of it, so that edit is live
nowhere.

## Consequence worth knowing

3471 now lives under the same regime as the other two services: when `main`
moves, the staleness watchdog pulls and restarts it within ten minutes. A
restart drops the build manager's in-memory state and re-reads running jobs from
the DB; `KillMode=process` keeps spawned agents alive across it. That is the
regime 3470 and 3465 have been under since 2026-08-05, now applied uniformly.
