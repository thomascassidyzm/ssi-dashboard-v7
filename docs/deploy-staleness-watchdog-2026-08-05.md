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
| Checkout has **diverged** from main (commits main lacks) | Alert — it can never be auto-updated |

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

## Finding: watson-1 runs services out of TWO checkouts

The brief for this job said the live services run from
`~/SSi/ssi-dashboard-v7-clean`. The installed systemd units say otherwise:

| Service | Port | Installed `WorkingDirectory` |
|---|---|---|
| popty-production-api | 3470 | `ssi-dashboard-v7-clean-**prod**` (clean, on `main`) |
| popty-phase8-audio | 3465 | `ssi-dashboard-v7-clean-**prod**` (clean, on `main`) |
| popty-course-builder-api | 3471 | `ssi-dashboard-v7-clean` (the **dev** checkout, dirty, on a feature branch) |

Two consequences shaped the design:

1. `build.root` is part of the health payload and the watchdog **skips any
   service loaded from a different tree than the one it guards.** Without this,
   a watchdog installed in `-prod` would see course-builder sitting on
   `fix/audio-…` and either alert forever or try to restart a service it has no
   business restarting. State files are keyed by checkout for the same reason.
2. **Install this watchdog in `-prod`.** That is where the deployable services
   live.

**For Tom — course-builder-api runs from the dev checkout.** That means the live
3471 service is running whatever half-finished branch happens to be checked out
for agent work, which is a deploy-correctness question well beyond this
watchdog's remit. Not changed here: repointing a live service's working
directory is a real deploy change, not a watchdog's call. Also noted: the
committed unit files in `ops/systemd/` say `ssi-dashboard-v7-clean` for
production-api, while the *installed* unit says `-prod` — the repo copies have
drifted from what is running.

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

## Verified live on watson-1 (2026-08-05)

- **The frozen-sha property, proven the hard way.** A process was started, the
  commit on disk was then advanced (`c051a509` → `fa2378d8`) **without** a
  restart, and `/health` still reported `c051a509`. Had it reported the new sha,
  the whole watchdog would be decorative.
- **Auto-deploy end to end, twice.** Commits landed on `main`; the watchdog
  fetched, saw the running sha behind, pulled `--ff-only`, restarted via
  `systemctl --user`, and all three services came back healthy on the new sha.
- **Level ⇒ no action.** Re-run returned `current`, no restart.
- **Dirty tree ⇒ refused.** In a throwaway clone, behind main with a modified
  tracked file: alert only, no pull, the dirty edit untouched.
- **Back-off.** With the attempt file already stamped for the target sha, it
  alerted "NEEDS A HUMAN" and did not restart again.
- **Diverged ⇒ alert**, not a false `current`.
- **Cross-checkout attribution.** The `-prod` watchdog correctly skips
  course-builder-api: *"skipping popty-course-builder-api — loaded from
  …/ssi-dashboard-v7-clean, not …-prod"*.

## Install

Both machines, from the repo root, idempotent:

```sh
sh ops/watchdog/install-staleness-watchdog.sh
```

It installs the crontab line, runs the check once, and prints the resulting
state and log tail so you can see it work.

## Camberley — EXPLICIT GAP

> **Correction, 2026-08-05.** "SSH-blocked" below is about *shell* access from
> watson-1, and it must not be read as "Camberley is unreachable" or "Camberley
> can only be updated by someone sitting at the Mac". Both of those are FALSE.
> Camberley is remotely reachable and remotely controllable **right now**, over
> HTTPS, with no shell and nobody at the keyboard: `https://ssi-machine.ngrok.app`
> fronts its production-api, and the dashboard's Remote panel drives it —
> `/api/admin/system-health` (RAM/disk/load/pm2/reboot-readiness),
> `/api/services` and `/api/services/:name/restart` (every pm2 process),
> `/api/services/:name/logs`, and `/api/deploy` (the blue Deploy button: git
> pull + restart all pm2 services except orchestrator/ngrok/keep-awake). All
> verified live by curl on 2026-08-05. popty.app has no privileged "default"
> machine either — the Environment Switcher points the whole dashboard at
> whichever machine you pick.
>
> What IS genuinely missing is a **shell**, and that is the only reason the
> watchdog install below is untested there: installing a crontab entry is not
> something any of those endpoints can do.

What is untested there: pm2 detection, the pm2 restart path, BSD
`sed`/`date`/`grep` behaviour, and cron's Full Disk Access on modern macOS
(cron may need to be granted it in System Settings → Privacy & Security → Full
Disk Access before a crontab entry can touch the repo).

To close the gap, on Camberley:

```sh
cd ~/SSi/ssi-dashboard-v7-clean && git pull && sh ops/watchdog/install-staleness-watchdog.sh
```

Then check `curl -s localhost:3470/api/ops/staleness`.
