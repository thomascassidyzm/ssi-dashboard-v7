# Incident — Popty dashboard API outage, 2026-08-04 (watson-1)

**Impact:** every Popty.app dashboard API call failed from ~14:38 UTC until ~16:42 UTC.
Browser showed CORS errors, which was a symptom, not the cause: Tailscale Funnel proxies
`watson-1.tail4968cb.ts.net:8443 -> localhost:3470`, nothing was listening on 3470, and the
proxy's 502s carry no `Access-Control-Allow-Origin` header.

## Cause — the supervisor died, not just the service

The production API was **already** supervised: `~/.config/systemd/user/popty-production-api.service`,
`Restart=always`, enabled since 2026-07-30. It was not an ad-hoc `nohup` process.

From `journalctl -u user@1000.service`:

```
Aug 04 16:09:49  popty-production-api.service: The kernel OOM killer killed some processes in this unit.
Aug 04 16:09:49  popty-production-api.service: Main process exited, code=killed, status=9/KILL
Aug 04 16:09:49  app.slice: The kernel OOM killer killed some processes in this unit.
Aug 04 16:09:54  popty-production-api.service: Scheduled restart job, restart counter is at 1.
Aug 04 16:09:54  Started popty-production-api.service.
...
Active: failed (Result: signal) since Tue 2026-08-04 16:10:02 UTC
Process: 1428 ExecStart=/usr/lib/systemd/systemd --user (code=killed, signal=KILL)
```

A machine-wide OOM event killed the API, systemd restarted it as designed — and then, thirteen
seconds later, the OOM killer took **`user@1000.service` itself**: the systemd user manager.
With the manager dead, `Restart=always` had nobody to run it. `systemctl --user` from any
session just returned "Failed to connect to user scope bus". Lingering was enabled, but linger
does not resurrect a manager that has been SIGKILLed.

The API's own footprint was not the problem — peak 254.7M over 4 days. Something else on the
box exhausted 15G of RAM (no swap) at 16:09; the API and the manager were collateral.

**Course-builder-api (3471) was genuinely unsupervised** — it had no unit at all, and died with
whatever ad-hoc session started it.

Note the two timestamps: the API's log stops at 14:38 (last request served), the OOM kill lands
at 16:09. The service was alive but idle in between; the outage Tom saw began at the OOM.

## Fix

1. **`ops/systemd/popty-production-api.service`** — the existing unit, now committed to the repo
   rather than living only in `~/.config`, plus `OOMScoreAdjust=500`.
2. **`ops/systemd/popty-course-builder-api.service`** — new; 3471 is now supervised at all.
   Enabled, starts on boot, restarts on failure.
3. **`OOMScoreAdjust=500` on both** — makes the two services the preferred OOM victim ahead of
   the user manager. Sacrificing a service that restarts itself protects the supervisor that
   cannot.
4. **`ops/watchdog/popty-services-watchdog.sh`**, installed in the user crontab every 2 minutes.
   This is the part that closes the actual hole: **cron runs under `crond`, not under the user
   manager**, so it survives precisely the failure that took supervision down. It restarts the
   user manager (via a `loginctl` linger toggle — works without root) and then any unhealthy
   unit. Two consecutive `/health` misses before acting. Same shape as the existing
   `~/command-surface/ops/watchdog.sh`.

Command-surface (4317) and its restart machinery were not touched.

## Verified

- `/health` 200 on 3470 and 3471, both owned by systemd (`is-active`/`is-enabled` = active/enabled).
- `curl -k -H 'Origin: https://popty.app' https://watson-1.tail4968cb.ts.net:8443/api/languages?format=legacy`
  → `HTTP/2 200` with `access-control-allow-origin: https://popty.app`.
- `kill -9` on the production API → back to 200 within 12s, `NRestarts=1`.
- `systemctl --user stop popty-course-builder-api` → watchdog logged miss 1/2, then restarted it
  on the second run; 3471 back to 200.

## Open — needs root, not available to this account

The single remaining hole is that **nothing at the system level restarts `user@1000.service`**.
The cron watchdog now covers it, which is a real fix, but the tidier one is a drop-in on
`user@.service` (or moving both services to system units with `User=tomcassidy`, the pattern
`command-surface.service` already uses). Both require `sudo`, which this account does not have —
`sudo -n` is refused. Flagging rather than papering over.

Second open item: **what actually ate 15G at 16:09 is unidentified.** The kernel ring buffer and
`journalctl -k` are restricted to the `adm`/`systemd-journal` groups, so the OOM victim list is
not readable from this account. The user-manager journal proves the OOM happened and that
`app.slice` was hit; it does not name the process that caused it. If dashboard outages recur,
that is the thing to chase — supervision now recovers from it, but does not prevent it.

---

# Follow-up, same day: the 500 on `/audio-stats`, and why the backfill never ran

Tom reported the dashboard connecting but `GET /api/production/nld_for_eng/audio-stats?fresh=1`
returning 500. Suspicion was that the systemd unit's env was thinner than the login shell's.
**That suspicion was wrong for this 500, and right about something else.**

## The 500 — a third dead service, not a missing env var

`getDirectAudioStats()` calls phase 8's `/needs/:courseCode` on **port 3465**
(`services/production-api.cjs`, in the helper above `proxyToPhase8`). Phase 8 was not running,
so the call threw `AggregateError [ECONNREFUSED]`. Because an `AggregateError` has an empty
`.message`, the endpoint answered `{"error":""}` — true and useless.

This was **pre-existing, not a regression from the systemd move**: the same ECONNREFUSED to 3465
is present in `popty-production-api.log` in the region written *before* the 14:38 outage. Phase 8
has simply not been running on watson-1. Note also that `start-automation.cjs` points at
`services/phases/phase8-audio-generator.cjs`, which **does not exist** — the live file is
`services/phases/phase8-audio-v13.cjs`, and that is what serves `/needs`.

The comment above the helper claimed "Calculate audio stats directly from Supabase (no Phase 8
needed)". That stopped being true when the `/needs` call was made the single source of truth for
the pending count. Corrected in this commit.

**Fixes:**
- `ops/systemd/popty-phase8-audio.service` — phase 8 supervised, enabled, on boot.
- Watchdog now health-checks 3465 alongside 3470/3471.
- The ECONNREFUSED now surfaces as a named, actionable error instead of `{"error":""}`.

Starting phase 8 generates no audio and spends nothing: TTS happens only on its POST routes
(`/generate`, `/regenerate-*`). There is no boot-time or timer-driven generation in the file.

## The nld_for_eng backfill — my restart did not kill it; it never started

The heads-up assumed my 16:45:38 `kill -9` of popty-production-api took the backfill down. It did
not, on two independent counts:

1. **Agents are spawned by course-builder (3471), never by production-api (3470).** The dashboard
   route `POST /build/component-backfill/:courseCode`
   (`services/course-builder/routes/build.cjs:818`) calls `spawnInTerminal`
   (`services/course-builder/lib/agent-spawner.cjs:21`). production-api only HTTP-proxies
   `/api/build/*` to 3471 (`services/production-api.cjs:1229`) — no spawn, exec or fork.
2. **The spawn failed on a macOS-only code path.** From the course-builder log:

   ```
   [SPAWN] Component Backfill iTerm2 spawn error: spawn osascript ENOENT — falling back to Terminal.app
   [SPAWN] Component Backfill falling back to Terminal.app...
   [SPAWN] Component Backfill Terminal.app error: spawn osascript ENOENT
   ```

   `agent-spawner.cjs:30` reads
   `ctx.SPAWN_MODE === 'headless' ? 'headless' : (terminal || ctx.SPAWN_MODE || 'iTerm2')`.
   `SPAWN_MODE` was unset, so it tried `osascript` — a macOS binary absent on this Linux box —
   and the Terminal.app fallback failed identically. No headless fallback exists after that.

   Corroborating: the brief was written (`/tmp/component-backfill_nld_for_eng_1785861885709.md`,
   16:44) but `build_jobs` holds **no component-backfill row for nld_for_eng at all**, and the
   newest nld_for_eng row is from 2026-05-22.

**This was not specific to the backfill: every dashboard-triggered agent on watson-1 was failing
this way.** Fixed with `Environment=SPAWN_MODE=headless` in the course-builder unit — verified
live in `/proc/<pid>/environ`. This *is* the "unit env is thinner than the login shell" class Tom
suspected; it just wasn't the cause of the 500.

## Restarts vs in-flight agents

`KillMode=process` is now set on all three units. Detail worth keeping: the spawns already use
`detached: true` + `unref()`, which gives the child its own POSIX process group — but that does
**not** move it out of the unit's cgroup, and systemd's default `KillMode=control-group` signals
the whole cgroup. So `detached:true` alone would NOT have saved an in-flight agent from
`systemctl restart`; `KillMode=process` is what does. This matters because the 2-minute watchdog
can fire a restart automatically.

## Still open

- **A killed agent orphans its `build_jobs` row.** The completion curl appended by `withJobDone()`
  (`build.cjs:29`) never runs, so `status` stays `'running'` forever. `build-manager.cjs:65-152`
  refreshes `last_heartbeat` unconditionally for `'running'` jobs rather than checking OS-level
  liveness, and no PID is stored — so a dead agent is never detected and never retried. For
  `pass: 'component-backfill'` no progress branch matches either, so it cannot auto-complete.
  Not fixed here; flagged.
- **No duplicate guard** on the backfill route — it inserts a fresh row unconditionally, so a
  stale `'running'` row does not block a re-trigger.
- `start-automation.cjs` still references the non-existent phase 8 filename (above).
