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
