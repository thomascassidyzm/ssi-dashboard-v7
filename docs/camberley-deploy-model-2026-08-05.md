# How Camberley is actually deployed — and what is really blocking it

**2026-08-05.** Written to kill a false model that had been repeated all day, and
to record the one real blocker underneath it. Everything below was verified live
by curl from watson-1 on 2026-08-05 between 15:02Z and 15:09Z.

## The false model — retired

Three claims, all wrong:

1. ~~"popty.app defaults to Camberley."~~ There is no privileged default. The
   dashboard has an Environment Switcher — Tom's Machine / Kai's Machine / SSi
   Machine / SSi Machine (Cloud) / API Server — and it points the whole app at
   whichever machine is selected (`src/components/EnvironmentSwitcher.vue`,
   stored in `localStorage.api_base_url`).
2. ~~"Camberley can only be updated by someone physically at the Mac."~~ False.
   It has a full remote-control panel in the app, and every endpoint behind it
   answers over the public internet with no shell and nobody at the keyboard.
3. ~~"SSH is blocked, so Camberley is unreachable."~~ SSH from watson-1 is
   blocked; that is a *shell* gap, not a reachability gap. Camberley answered
   every HTTP probe today in under a second.

## The true model

`https://ssi-machine.ngrok.app` → ngrok tunnel on Camberley → **production-api**
on :3470. production-api proxies the machine-control routes to the
**orchestrator** on :3456 (`proxyOrchestrator`, `services/production-api.cjs`).
The UI is `src/components/RemoteControl.vue`.

| What the panel shows | Endpoint | Verified 2026-08-05 |
|---|---|---|
| RAM / disk / load / pm2 list / reboot-readiness | `GET /api/admin/system-health` | ✅ `hostname: camberley`, darwin, 9 pm2 processes |
| Per-service Restart | `POST /api/services/:name/restart` | ✅ route live |
| Service logs | `GET /api/services/:name/logs?lines=N` | ✅ returned pm2 out+error logs |
| **Blue Deploy button** | `POST /api/deploy` | ✅ reachable, ❌ **fails on Camberley — see below** |
| Reboot machine | reboot route, gated on `reboot_readiness.ready` | not exercised |

`/api/deploy` (`services/orchestration/orchestrator.cjs`) does exactly this:
`git status` → optional `git stash` when `{"force":true}` → `git pull --ff-only`
→ `npm install` if package.json moved → respond → `pm2 restart` every process
except `orchestrator`, `ngrok`, `keep-awake`. **It pulls whatever branch the
checkout is on** — so anything you want deployed must be on that branch first.

## The real blocker — Camberley's checkout cannot pull

Five deploy attempts on 2026-08-05, three of them mine, all failed identically:

```
[Deploy] Checking git status...
[Deploy] WARNING: 4 uncommitted changes detected
[Deploy] force=true — stashing local changes...
[Deploy] Stashed local changes
[Deploy] Running git pull...
[Deploy] Deploy FAILED: Command failed: git pull --ff-only 2>&1
```

The stash worked and the pull still failed, so a dirty tree is **not** the
cause. The two remaining candidates are a **diverged local branch** (local
commits on the Mac, which `--ff-only` refuses) or a **credential prompt**
failing non-interactively under pm2 — and the endpoint could not tell us which,
because it reported `err.message` only and threw git's stderr away.

That blindness is now fixed on `main` (`fb996ae9`): a failed deploy returns
`git_output` plus a `checkout` block with branch, commit, upstream and
ahead/behind counts. It cannot help Camberley until Camberley pulls once —
which is the catch-22 that makes the next section a human action.

**Camberley is provably running pre-12:46Z-2026-08-05 code**: its `/health`
carries no `build` block, and `build: buildIdentity()` landed in
`services/production-api.cjs` at `c051a509`, 2026-08-05 12:46Z. It has also been
logging `Unregistered API key` from Supabase on repeat — a second, separate
breakage on that box.

## One command, once, at a shell on Camberley

```sh
cd ~/SSi/ssi-dashboard-v7-clean && git status && git stash list && git pull --ff-only
```

If it refuses as non-fast-forward, `git log --oneline origin/main..HEAD` names
the local commits to rescue; two stashes from today's forced deploys are waiting
in `git stash list` and should be inspected before anything is discarded. Once
one pull succeeds, the blue Deploy button takes over again and nothing further
needs a shell.

Proposal, needs Tom's ruling: give `/api/deploy` a `repair` mode that resets the
checkout to `origin/main` after stashing, so this class of failure is
recoverable from the app instead of from the keyboard. It is a hard reset on a
production box, so it is not being added unasked.

## Two things found on watson-1 while doing this

**1. Its whole Popty backend was down, and now isn't.** `popty-production-api`,
`popty-course-builder-api` and `popty-phase8-audio` were all crash-looping
(restart counter 22) on `Cannot find module 'dotenv'` — the deployed checkout
`~/SSi/ssi-dashboard-v7-clean-prod` had **no `node_modules` at all**, so the
Tailscale funnel for "SSi Machine (Cloud)" was returning 502. Fixed by running
`npm install` in that checkout and restarting the three units. Verified live:
all three `active`, and `localhost:3470/health` now reports
`build.commit fb996ae9`, `branch main`, `dirtyAtStart false`.

**2. The Cloud machine's Deploy button points at the wrong checkout.** The
orchestrator on watson-1:3456 — which `/api/deploy` proxies to, and which
resolves its project dir as `path.resolve(__dirname, '..', '..')` — is running
out of `~/SSi/ssi-dashboard-v7-clean`, Tom's **live working checkout**, on a
feature branch with 36 modified files. Pressing Deploy for "SSi Machine (Cloud)"
would therefore `git pull` and (with force) `git stash` in the tree someone is
actively working in, and restart services from it. Not touched; flagged. The
services themselves correctly run from the `-prod` checkout — it is only the
orchestrator that is loose, and it has no systemd unit.
