# watson-1 environment vs Camberley Mac

watson-1 is a Linux VM used for development, review, and eventual failover. Camberley
remains the live production machine until an explicit cutover. This doc captures what's
different so nobody accidentally treats watson-1 as a second writer.

## Summary table

| | **Camberley Mac** (live) | **watson-1** (standby/dev) |
|---|---|---|
| Role | Production, sole writer | Dev/review, read-only in practice |
| OS / host | macOS, `toms-macbook-air` | Ubuntu Linux, `watson-1.tail4968cb.ts.net` |
| Tailnet IP | 100.126.253.11 | 100.108.9.37 |
| Node | (Mac version) | v24.18.0 |
| Process manager | pm2 | systemd **user** unit for production-api; pm2 still owns `orchestrator` |
| Service name | pm2 process | `popty-production-api` |
| Audit archive scheduler | owner of the nightly archive (not verified from watson-1) | opt-in, pinned **off** in the unit |
| Supabase key in `.env` | real service key | **public anon key** (stand-in) |
| TTS / S3 / xAI keys | present | **absent** |
| Public exposure | n/a (already prod) | Funnel mapping planned, **not yet enabled** |

## Service: production-api

`services/production-api.cjs` listens on `PRODUCTION_API_PORT` (default `3470`) —
`services/production-api.cjs:11671`. Health check: `GET /health` —
`services/production-api.cjs:1286`.

## The one-writer guard

While Camberley is live, watson-1 must never run background write jobs against
Supabase. Three separate facts make this true today, plus a deliberate credential
belt-and-braces:

1. **Nightly audit-log archive/prune is opt-in.** `scheduleNightlyArchive()`
   (`services/production-api.cjs:11523`) only arms if `AUDIT_ARCHIVE_CRON=on`. Left unset
   it logs `[AuditArchive] nightly schedule DISABLED — set AUDIT_ARCHIVE_CRON=on to
   enable`. watson-1 leaves this env var unset.
2. **insight-discovery is not a scheduler.** It's endpoint-triggered only —
   `POST /api/insight-discovery/run` (`services/production-api.cjs:11566`) — so it never
   fires on its own regardless of which machine is running the process.
3. **No `setInterval`-based background writers exist in `production-api.cjs`** — verified,
   zero matches in the file. No OS cron job on watson-1 references this repo. The user
   crontab does carry two `ssi-learning-app` jobs, and both were checked and cleared:
   `deploy-sentinel/sentinel.mjs` is documented in its own header as "read-only against
   production; zero writes anywhere", and `release-train/candidate-report.mjs` promotes
   nothing — it only writes a markdown report and pushes it to the `dev` branch. Neither
   touches production data, and both are deliberately sited on watson-1, so leave them be.
4. **Credentials are a second, independent layer.** watson-1's `.env` currently carries
   the **public Supabase anon key** as a stand-in for `SUPABASE_SERVICE_KEY` (see the
   header comments in that file). Reads work fine and the server reports Supabase
   connected, but writes are RLS-blocked. TTS/S3/xAI keys aren't present either, so audio
   generation and any S3 write path simply won't work on watson-1 until real credentials
   are provisioned from the Mac.

So even if code on watson-1 tried to write, both the scheduler gate and the credentials
would stop it. Two independent belts, not one.

## Cutover checklist (when watson-1 becomes the live writer)

Do these in order — do not skip the Camberley disable step:

1. On **Camberley**: disable `scheduleNightlyArchive()` by unsetting/removing
   `AUDIT_ARCHIVE_CRON=on` from its `.env`, and restart its pm2 process.
2. Confirm Camberley's log now shows `[AuditArchive] nightly schedule DISABLED`.
3. On **watson-1**: provision real credentials into the repo `.env`
   (`SUPABASE_SERVICE_KEY`, TTS/S3/xAI keys) from the Mac — never commit them.
4. On **watson-1**: the unit file pins `Environment=AUDIT_ARCHIVE_CRON=off`, and a unit
   `Environment=` line beats anything in `.env`. So editing `.env` alone will NOT arm the
   archiver — change the line in
   `~/.config/systemd/user/popty-production-api.service` to `=on` (or delete it and set
   the value in `.env`), then `systemctl --user daemon-reload`.
5. Restart the watson-1 service: `systemctl --user restart popty-production-api`.
6. Confirm the log line flipped from `DISABLED` to `[AuditArchive] nightly armed —
   next run in Xh...` in `~/.local/log/popty-production-api.log`. Note the unit sends
   stdout/stderr to that file, so `journalctl` shows lifecycle events only, not app output.
7. Only after both 2 and 6 are confirmed — one machine disabled, the other armed — treat
   watson-1 as the live writer.

## Service management on watson-1

watson-1 runs the API as a **systemd user unit**, not a system unit, because `sudo` on
watson-1 is scoped to only `/usr/bin/systemctl restart command-surface` — there's no
general root access to install a system-level service. Unit file:
`~/.config/systemd/user/popty-production-api.service`. Lingering is enabled for user
`tomcassidy`, so the user unit does start at boot without a login session.

Commands:

```
export XDG_RUNTIME_DIR=/run/user/1000      # required in non-login/agent shells
systemctl --user status  popty-production-api
systemctl --user restart popty-production-api
systemctl --user stop    popty-production-api
tail -f ~/.local/log/popty-production-api.log
```

Without `XDG_RUNTIME_DIR` set, `systemctl --user` fails with a DBus "Failed to connect to
user scope bus" error. Application logs go to `~/.local/log/popty-production-api.log`;
`journalctl --user -u popty-production-api` shows unit lifecycle only.

pm2 *is* present on watson-1, but off `PATH` at `~/.npm-global/bin/pm2`, and it owns only
`orchestrator` (:3456 — pin `PORT`, the command-surface shell leaks `PORT=4317`).
`production-api` was deliberately removed from `~/.pm2/dump.pm2` on 2026-07-30 — backup at
`~/.pm2/dump.pm2.bak-before-systemd-2026-07-30` — because the `@reboot pm2 resurrect`
crontab entry would otherwise start a second copy on :3470 at boot and clash with the
systemd unit. One owner per port: systemd owns 3470, pm2 owns 3456.

## Public exposure

`src/components/EnvironmentSwitcher.vue` (commit `8b528c7d`) has a "Watson VM" option
pointing at `https://watson-1.tail4968cb.ts.net:8443`. This requires a Tailscale Funnel
mapping `8443 -> localhost:3470`. **Funnel is not yet live.** Two one-time actions are
needed, both requiring Tom, and neither doable by an agent on this box:

1. **Enable Funnel on the tailnet** — visit
   `https://login.tailscale.com/f/funnel?node=nWNmPtVzjN11CNTRL`.
   Until then `tailscale funnel` replies `Funnel is not enabled on your tailnet`.
2. **Grant local serve config rights** — `sudo tailscale set --operator=tomcassidy`, run
   once on watson-1. Serve and funnel config are root-gated, and `sudo -n` here is scoped
   to `/usr/bin/systemctl restart command-surface` only, so without this an agent gets
   `Access denied: serve config denied`.

With both done, the mapping is a single non-root command:

```
tailscale funnel --bg --https=8443 localhost:3470
curl -sS https://watson-1.tail4968cb.ts.net:8443/health    # expect status ok, port 3470
```

Separately, there is a tailnet-only `tailscale serve` mapping `443 -> localhost:4317`.
This is the founder's command surface and must not be modified as part of any watson-1
work. Funnel only supports ports 443, 8443 and 10000, and 443 is taken — which is why the
switcher uses 8443.

## Provisioning real credentials from the Mac

SSH from watson-1 to the Mac is **not** key auth — it is Tailscale SSH in *check mode*.
Any connection attempt blocks and prints `To authenticate, visit:
https://login.tailscale.com/a/<id>`, which needs a browser tap while the attempt is still
open. That makes it unusable for unattended agent runs, so credentials get **pushed from
the Mac**, not pulled from watson-1. From the Camberley Mac:

```
scp ~/SSi/ssi-dashboard-v7-clean/.env \
    tomcassidy@100.108.9.37:/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.camberley
```

Then on watson-1, merge only the vars the API actually needs — `SUPABASE_SERVICE_KEY`,
S3, and any TTS/xAI keys — into `.env`, delete `.env.camberley`, and restart the unit.
`.env*` is gitignored; never commit any of it.

## The unit file

`~/.config/systemd/user/popty-production-api.service`:

```ini
[Unit]
Description=Popty Production API (watson-1)
After=network-online.target tailscaled.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/home/tomcassidy/SSi/ssi-dashboard-v7-clean
Environment=NODE_OPTIONS=--max-old-space-size=4096
Environment=PRODUCTION_API_PORT=3470
# ONE-WRITER GUARD — Camberley Mac is the live production writer.
# Leave this off on watson-1 until real cutover.
Environment=AUDIT_ARCHIVE_CRON=off
ExecStart=/usr/bin/node services/production-api.cjs
Restart=always
RestartSec=5
StandardOutput=append:/home/tomcassidy/.local/log/popty-production-api.log
StandardError=append:/home/tomcassidy/.local/log/popty-production-api.log

[Install]
WantedBy=default.target
```
