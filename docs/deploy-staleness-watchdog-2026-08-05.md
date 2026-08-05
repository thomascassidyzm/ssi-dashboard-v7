# Deploy-staleness watchdog (2026-08-05)

## The incident this exists for

A route was merged to main, deployed, and then sat there doing nothing for
hours, because nothing restarted the backend service that serves it. The live
server kept running the old code and kept returning 404 for the new
audio-preview route, with no error and no alert anywhere. Tom saw a red banner
on popty.app; the fix had already landed on main.

That day it was a missing-audio checker. The same silence could hide something
worse — and it was silent, not broken: `/health` returned `ok` throughout,
because `/health` said nothing about *which code was running*.

## What was built

Three pieces, all small.

### 1. Staleness is now observable — `services/shared/build-identity.cjs`

Every Popty service's `/health` now carries a `build` object:

```json
"build": {
  "commit": "4b9f4c58…", "commitShort": "4b9f4c58",
  "branch": "main", "dirtyAtStart": false,
  "startedAt": "2026-08-05T12:44:27.328Z", "pid": 767851
}
```

The sha is resolved **once, at require time, and frozen**. This is the whole
design and it is not a performance choice. A health handler that shelled out to
git per request would report the code **on disk**, not the code the process
**loaded** — and those two are identical in every situation except the one this
watchdog exists to catch. A disk-reading health check would have reported "up to
date" for the process that was 404ing all afternoon: it would lie in the
reassuring direction, which is worse than not building it at all.

`dirtyAtStart` is included because a sha alone can't vouch for a process that
started from an uncommitted tree.

Wired into: production-api (3470), course-builder-api (3471), phase8-audio
(3465). `POPTY_BUILD_SHA` / `POPTY_BUILD_BRANCH` override for machines with no
git in PATH.

### 2. The check — `ops/watchdog/popty-staleness-watchdog.sh`

Runs from the user crontab every 10 minutes. Per run it: `git fetch origin main`
(fetch only, never a merge), reads the sha each **running** service reports on
`/health`, and compares.

"Behind" means the running sha is an **ancestor** of `origin/main`. A sha that
is merely *different* — a feature branch ahead of main — is not staleness.

When behind, it acts:

| Situation | Action |
|---|---|
| Tree clean, on `main`, fast-forwardable | `git pull --ff-only`, `npm install` if package.json changed, restart services |
| Working tree **dirty** | **Alert only.** No pull, no stash. |
| Checkout on a branch other than `main` | Alert only |
| Not a fast-forward | Alert only |
| Restart already tried for this sha and still stale | Alert once, back off |

**Why a sibling script rather than a second section of
`popty-services-watchdog.sh`:** different question, different cadence, different
portability. The liveness watchdog answers "is it up?" every 2 minutes with no
network calls and Linux-only machinery (`XDG_RUNTIME_DIR`, `systemctl --user`,
absolute `/usr/bin` paths). Staleness needs a network `git fetch`, wants a much
slower cadence, and must run on the Mac. Folding a fetch into a 2-minute loop
that exists to survive catastrophe would make the reliable thing depend on the
network. Separate file, same cron route.

**One script, two supervisors.** watson-1 is a systemd-user estate; Camberley is
a pm2 estate. The script detects which is present rather than forking into two
divergent scripts — so a fix to the logic cannot land on one machine and miss
the other. It uses portable `/bin/sh`, no GNU-only flags, no `/run/user`
assumption outside the Linux branch, and sets a PATH covering Homebrew and
`~/.npm-global/bin` because cron's PATH is minimal on both platforms.

### 3. The loud part

- **Log**: every verdict goes to `POPTY_WATCHDOG_LOG` (default
  `/tmp/popty-watchdog.log`), same shape as the existing watchdog.
- **HTTP**: `GET /api/ops/staleness` on production-api serves the state file the
  cron job wrote. Read-only, cached, no git in the request path. It adds
  `age_seconds` — because a "current" verdict from six hours ago means the
  watchdog itself stopped running, which is its own alarm.

## Two taste-safe defaults chosen here, not ruled on by Tom

1. **Dirty tree ⇒ alert only, never stash.** The existing
   `POST /api/admin/git-pull` route stashes uncommitted work. A human pressing
   Deploy and a cron job at 3am are different risks: silently stashing someone's
   in-flight work is a worse outcome than being one commit behind, and this
   checkout is routinely dirty with live content work. Same reasoning extends to
   "checkout is on a feature branch" — also alert-only.
2. **Alerting is log + HTTP, no cross-machine channel.** Camberley holds a key
   into watson-1 (the reverse doesn't work), so a Mac→Watson push is *possible* —
   but building a receiver, an auth story, and a retry policy turns this into a
   project, and the brief said keep it small. Left out deliberately. If Camberley
   staleness needs to be visible from watson-1, that is a follow-on.

## Install

Both machines, from the repo root, idempotent:

```sh
sh ops/watchdog/install-staleness-watchdog.sh
```

It installs the crontab line, runs the check once, and prints the resulting
state and log tail so you can see it work.

## Camberley — EXPLICIT GAP

Camberley is SSH-blocked from watson-1, so **nothing here is installed or tested
on the Mac.** What is untested there: pm2 detection, the pm2 restart path, BSD
`sed`/`date`/`grep` behaviour, and cron's Full Disk Access on modern macOS
(cron may need to be granted it in System Settings → Privacy & Security → Full
Disk Access before a crontab entry can touch the repo).

To close the gap, on Camberley:

```sh
cd ~/SSi/ssi-dashboard-v7-clean && git pull && sh ops/watchdog/install-staleness-watchdog.sh
```

Then check `curl -s localhost:3470/api/ops/staleness`.
