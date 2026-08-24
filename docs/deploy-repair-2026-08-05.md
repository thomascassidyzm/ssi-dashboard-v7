# Deploy Repair — the fallback when a machine's checkout jams

*Built 2026-08-05 on Tom's sign-off ("Yes. Build the repair option."), after Camberley's
Deploy failed five times running: local mess plus stashes jammed `git pull --ff-only`, so
the button could never get past step 2 and nobody was at the Mac.*

## What it does

When a normal Deploy fails on a machine, the Deploy UI now offers a **Repair** action.
Repair force-resets that machine's checkout to exactly match `origin/main` and then
restarts pm2 services exactly as a normal deploy does.

Repair is a fallback, never a first option, and never accidental:

| Guardrail | How it is enforced |
|---|---|
| 1. Only after a failed deploy | The failed deploy issues a single-use `repair_token` (30-min TTL, in-memory). `POST /api/deploy/repair` without a live token is a **409** — enforced server-side, not just hidden in the UI. |
| 2. Explicit confirmation | The UI opens a confirm panel that says in plain words that local changes on that machine will be discarded. Only that button sends `confirm: true`; the server 400s without it. |
| 3. Nothing unrecoverable | Before any reset, a safety snapshot is captured **and verified on disk** — a repair that cannot snapshot aborts. |
| 4. Audit trail | Every deploy and every repair (including refusals and failures) is appended to `logs/deploy-history.jsonl` on that machine, readable at `GET /api/deploy/history`. |

## The safety snapshot

Written to the target machine before the reset, under `logs/repair-snapshots/<stamp>`:

- `refs/repair-snapshots/<stamp>` — a real commit built by `git stash create`, holding HEAD
  plus the dirty tracked state. It does **not** touch the working tree or the stash list.
- `<stamp>.bundle` — the same, as a portable git bundle, so it survives ref GC and can be
  copied off the machine.
- `<stamp>-untracked.tar.gz` — untracked-but-not-ignored files (`git stash create` misses these).
- `<stamp>.json` — branch, HEAD, full `git status`, the pre-existing stash list, and the exact
  recovery commands.

What is deliberately **not** touched: ignored files. `git clean -fd` is run without `-x`, so
`.env`, `node_modules/` and `logs/` survive a repair. Pre-existing stashes also survive — a hard
reset does not delete stash refs — and they are recorded in the manifest either way.

Recovery is then: `git stash apply <snapshot_commit>` for tracked work, `tar xzf …` for
untracked files, or `git bundle` for a copy off-box.

## The reset

```
git fetch origin --prune
git checkout -f -B <branch> origin/<branch>
git reset --hard origin/<branch>
git clean -fd            # NOT -x: ignored files are kept
```
then verify `HEAD == origin/<branch>` (mismatch throws), npm install if `package.json` moved,
respond, then restart pm2 services (orchestrator last — the response must be sent first,
because production-api is proxying the request).

## Surface

- `POST /api/deploy` — unchanged, except a failure now returns `repair_available: true` and a
  `repair_token`, and both outcomes are logged to the history.
- `POST /api/deploy/repair` — `{ repair_token, confirm: true, branch?: "main" }`.
- `GET /api/deploy/history?limit=50` — newest first.

All three are proxied by production-api, so they work through ngrok/Tailscale exactly as the
Deploy button does.

## Testing it on Camberley once its jam is cleared

The jam that motivated this is still there as of writing, and clearing it is a one-liner at the
Mac. To prove the whole loop afterwards, from anywhere:

```bash
BASE=https://ssi-machine.ngrok.app       # Camberley's production-api

# 1. Deploy so Camberley is running this code at all
curl -s -X POST $BASE/api/deploy -H 'ngrok-skip-browser-warning: true' | jq

# 2. Guardrail 2: repair without confirmation → 400
curl -s -X POST $BASE/api/deploy/repair -H 'Content-Type: application/json' \
  -d '{"repair_token":"anything"}' | jq

# 3. Guardrail 1: confirmed repair with no live token → 409
curl -s -X POST $BASE/api/deploy/repair -H 'Content-Type: application/json' \
  -d '{"confirm":true,"repair_token":"not-a-real-token"}' | jq

# 4. The real loop: re-jam the checkout (touch a tracked file at the Mac), press Deploy,
#    take the repair_token from the 500, then confirm the repair in the UI — or:
curl -s -X POST $BASE/api/deploy/repair -H 'Content-Type: application/json' \
  -d "{\"confirm\":true,\"repair_token\":\"<token from the failed deploy>\"}" | jq

# 5. Audit trail + recoverability
curl -s $BASE/api/deploy/history | jq '.history[0]'
#    → snapshot_ref / snapshot_bundle; at the Mac, `git show <snapshot_commit>` shows
#      exactly what was discarded.
```

Unit tests (`services/deploy-repair.test.cjs`, 9 tests) build a real git repo in the exact
Camberley shape — dirty tracked file, untracked file, a stash and a local-only commit — assert
that `git pull --ff-only` genuinely fails on it, and then that repair reaches `origin/main`,
keeps `.env` and `logs/`, and leaves the discarded work restorable from the snapshot.
