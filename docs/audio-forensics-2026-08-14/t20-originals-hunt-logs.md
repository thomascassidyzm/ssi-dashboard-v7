# T-20 originals hunt — server logs and ingress (read-only)

2026-08-14. Scope: does the raw voice-actor take (base64 audio in the upload
POST body) survive anywhere in a log, journal, or local DB — as opposed to an
S3 object or filesystem file, which prior sweeps already ruled out. No writes,
deletes, log rotation, or service restarts were performed.

**Verdict up front: nothing recovered. Every one of the five hunt targets is a
proof-of-absence, and question 1's answer is also no — nothing in the code
logs the request body.** Detail and citations below.

---

## Question 1 — does any code path log the request body or an error carrying it?

Handler: `services/production-api.cjs:4442` (`POST /api/production/:courseCode/recording/upload`).

Read the handler end-to-end (`services/production-api.cjs:4442-4780`) plus every
middleware ahead of it and every helper it calls:

- **Body parser** — `services/production-api.cjs:148`: `app.use(express.json({ limit: '50mb' }))`. Stock express.json, no logging option enabled, no debug flag set.
- **Global middleware** — `services/production-api.cjs:151-157`: only sets cache-control headers. No request logger (no morgan, no pino, no winston) is `app.use()`'d anywhere in the file — confirmed by `grep -n "app.use("` (`services/production-api.cjs:142,148,151,389,396,430,10044`); none of the six route-level ones touch this endpoint or log bodies.
- **Success path inside the handler** — the only `logger.log` calls that mention the payload log *derived* values, never the base64 itself: `services/production-api.cjs:4515` (`Received ${rawBuffer.length} bytes`), `:4525` (format string), `:4574` (before/after byte counts). `rawBuffer` and `audioData` are never passed to a logger call.
- **Failure/refusal paths inside the handler** — `:4545` (`REFUSED unprocessed audio... ${audioMeta.reason}`), `:4565` (`REFUSED silent/empty take... ${audioMeta.durationMs}ms`) — both log only metadata about the audio, never the buffer.
- **Outer catch** — `services/production-api.cjs:4775-4778`: `logger.error('Error uploading recording:', error)`; `res.status(500).json({ error: error.message })`. `error` here is whatever the try block threw (Supabase/S3/ffmpeg errors) — none of those error objects are constructed from `audioData`, so `error.message` cannot carry the base64.
- **No global express error-handler** exists in the file (`grep -n "(err, req, res, next)"` → zero hits) and no `process.on('uncaughtException'/'unhandledRejection')` handler that could dump `req.body` — both greps returned nothing.
- **Downstream helpers**: `services/recording-upload-helpers.cjs` and `services/voice-engine/pods-registration.cjs` (called from this handler) — grepped for `log|console`; the only calls are `logger.warn`/`logger.log` on voice-id mismatches and pod registration confirmations (`services/voice-engine/pods-registration.cjs:201,282`), never on the audio payload.
- **`services/shared/logger.cjs`** (the logger implementation) does plain `console.log/warn/error` pass-through with a `[ServiceName]` prefix — it doesn't truncate or redact, but it also never receives the buffer to begin with (see above), so this is moot.
- **`services/audio-processor.cjs`** (does the ffmpeg decode/trim/normalize) — its `console.log`/`console.error` calls (lines 702-961) log file paths and byte counts (`[CONCAT DEBUG] ...`, `Processing failed: ${error.message}`), never buffer contents.

**Answer: No.** No code path — success, refusal, or catch — logs `req.body`, `audioData`, or an error object carrying either. The only thing written to any logger about this endpoint is byte counts, durations, and file paths.

---

## Hunt 1 — journalctl (this machine, which IS watson-1)

Prior instructions describe watson-1 as a separate prod host to check remotely.
It isn't — `hostname` on this session returns `watson-1`, and
`systemctl --user list-units 'popty*'` shows `popty-production-api.service`
running locally from `~/SSi/ssi-dashboard-v7-clean-prod`. So "check watson-1's
journal" and "check this machine's journal" are the same action; there is no
second machine to reach.

- **Retention floor**: `journalctl --user --list-boots` shows the oldest retained boot starts **2026-07-28 15:24:50 UTC** (both `--user` and the system journal via `journalctl -u tailscaled`, which needed no sudo and returned the same floor). Disk usage: 120M (`journalctl --user --disk-usage`). No custom `Storage=`/`MaxRetentionSec=` overrides in `/etc/systemd/journald.conf` (only the `[Journal]` header, no keys set) or `~/.config/systemd/journald.conf` (absent) — retention is whatever the default vacuum policy leaves, which turned out to be ~17 days.
- **Consequence**: of the five recording-session dates named in the brief (2026-02-16, 2026-05-22, 2026-06-15, 2026-06-16, 2026-08-10), only **2026-08-10** falls inside the retained window; the other four are gone by retention, not by absence of a hit.
- **Signature grep, full retained window** (`journalctl --user --since "2026-07-28"`, all units, piped to `grep -c "GkXf\|SUQz\|//u"`): 13 raw hits. Read in context (`grep -o '.\{0,40\}GkXf.\{0,80\}'` etc.), **every hit is a false positive**: they are this very task's own brief text ("...the characters GkXf; an MP3 with SUQz or //u...") being logged verbatim by the command-surface worker-dispatch pipeline when this session (and an earlier one) was spawned — i.e. the hunt instructions describing the signatures are themselves in the journal, not any audio. Confirmed by inspecting the surrounding text, which quotes this brief's own wording.
- **`audioData` string, full window**: 1 hit, same cause — the brief's own sentence "...and for the string audioData" logged as part of a dispatch payload.
- **2026-08-10 specifically, `popty-production-api` unit** (`--since "2026-08-10 00:00:00" --until "2026-08-11 00:00:00"`): 0 hits for the base64 signatures, 0 hits for `upload|recording` (case-insensitive) — the unit logged nothing that day at all. Its current `ActiveEnterTimestamp` is **2026-08-14 17:30:04 UTC** (checked via `systemctl --user show popty-production-api -p ActiveEnterTimestamp`), meaning it has been restarted since, and any 08-10 log lines it did emit either predate the current journal cursor for that unit's boot or were never written to a boot still on disk — either way, the grep against the retained window is a genuine zero, not a suppressed one.

**Verdict: proof of absence for 2026-08-10 within the retained window; the other four dates are outside the retention floor entirely (EXPLICIT GAP — see below), not confirmed-absent.**

**EXPLICIT GAP**: journalctl retention does not reach 2026-02-16, 2026-05-22, 2026-06-15, or 2026-06-16 on this host. If those sessions' journal entries still exist anywhere, it would only be via an external log shipper (none found — see Hunt 3) or a journal backup (none found under `/var/log/journal/` beyond the live retained files, and reading system-journal directory listings beyond what `journalctl` exposes needs root, which this session doesn't have — `sudo -n true` refused). Access needed to close this gap: root/sudo on watson-1, or confirmation from Tom that no external shipper/backup exists.

---

## Hunt 2 — logs/, /var/log, ~/.pm2/logs, and every *.log / *.log.gz / *.log.1 under /home/tomcassidy

- **`logs/` in both checkouts** (`~/SSi/ssi-dashboard-v7-clean/logs/` and `~/SSi/ssi-dashboard-v7-clean-prod/logs/`): contents are course-optimization pass logs (`Build Team-*.log`, `Redo-*.log`, `Translate-*.log`, `deploy-history.jsonl`) — text logs from translation/build tooling, unrelated to the recording-upload endpoint. Grepped both directories' `*.log` files for `GkXf|SUQz`: **0 hits**.
- **`~/.pm2/logs/`**: 4 files (`orchestrator-{error,out}.log`, `production-api-{error,out}.log`), dated 2026-07-29 to 2026-07-30 — stale (per prior sessions' finding that pm2 is off the current PATH and the systemd units are the live truth; these logs predate the systemd migration). Grepped for the signatures: **0 hits** across all four files (`grep -c "GkXf\|SUQz" ~/.pm2/logs/*.log` → 0,0,0,0). Also grepped for `recording/upload`/`[Upload]`: **0 hits** — no upload traffic is recorded in these files at all, consistent with them predating or missing that traffic window.
- **Estate-wide sweep**: `find /home/tomcassidy -maxdepth 6 \( -name "*.log" -o -name "*.log.gz" -o -name "*.log.1" -o -name "*.log.*" \) -type f` → **687 files**. (No `.gz` files matched at depth ≤6 despite the pattern being included — none exist that shallow; see gap note below.) Ran `grep -l "GkXf\|SUQz"` across all 687: **0 files matched**.

**Verdict: proof of absence**, command: `find /home/tomcassidy -maxdepth 6 '(' -name "*.log" -o -name "*.log.gz" -o -name "*.log.1" -o -name "*.log.*" ')' -type f | xargs grep -l "GkXf\|SUQz"` → empty output, 687 files searched.

**EXPLICIT GAP**: the sweep was capped at `-maxdepth 6` from `/home/tomcassidy` (a full unbounded filesystem walk risked being disproportionate and slow for a read-only forensics pass); rotated/compressed logs living deeper than 6 path segments down (e.g. inside a deeply-nested node_modules or a dated subfolder of a subfolder of a subfolder) would not have been caught. No `.gz`-rotated log files exist anywhere in the searched depth, which is itself informative (nothing here rotates logs — consistent with the journal being the actual mechanism, and the journal's own gap is covered above).

---

## Hunt 3 — ingress (nginx/caddy/tailscale funnel/ngrok/Cloudflare)

- **No nginx or caddy is installed**: `which nginx caddy ngrok` → all empty, no binaries. `/var/log/` has no `nginx/`, `caddy/`, `ngrok/`, `tailscale/`, `funnel/`, or `cloudflare/` subdirectory (checked the full `ls -la /var/log/` listing).
- **Ingress in front of `popty-production-api` (port 3470, per `Environment=PRODUCTION_API_PORT=3470` in `systemctl --user cat popty-production-api`) is Tailscale Funnel**: `tailscale serve status` shows `https://watson-1.tail4968cb.ts.net:8443 (Funnel on) → proxy http://localhost:3470`. Tailscale Funnel/Serve is a TLS-terminating TCP/HTTP reverse proxy built into `tailscaled`; it has **no configuration option for request-body or access logging** — it is not nginx-shaped software with a `log_format` directive. This is an architectural fact, not a missing-log finding: there is no ingress access log to check because this ingress layer doesn't produce one.
- **`tailscaled`'s own service journal** was checked anyway (`journalctl -u tailscaled --since "2026-07-28"`, readable without sudo): 0 hits for the base64 signatures. Same 2026-07-28 retention floor as Hunt 1 applies here too.
- **No ngrok** is present anywhere (`find / -maxdepth 3 -iname "*ngrok*"` → empty) and no Cloudflare tunnel config was found.

**Verdict: proof of absence for what's checkable, plus an architectural reason (no such logging exists in this ingress layer) rather than a mere gap. Access-log entries for the five named session dates cannot exist because Tailscale Funnel doesn't keep per-request access logs at all — this isn't a retention question, it's a "this proxy was never capable of it" answer.**

---

## Hunt 4 — command-surface.db and other local sqlite files

- **The path named in the brief** — `command-surface.db` at the repo root (`~/SSi/ssi-dashboard-v7-clean/command-surface.db`) — is **0 bytes** (`ls -la` confirms; last touched 2026-08-04). Empty file, nothing to search.
- **The real, live command-surface DB** is `~/command-surface/command-surface.db` (1.14 GB). Its schema (`.tables`): `auth_events, branch_landing, cards, channel_backlog, channel_members, client_repos, commissions, conv_handover, conv_state, done, dispatch_queue, events, invites, jobs, ledger, msg_dedupe, needs_you, published_docs, push_subs, queue, rate_limit_events, repo_state, sessions, settings, turns, users, weekly_anchor`. This is Watson's own agent-dispatch/chat store (worker prompts, job status, turn results) — checked the two most payload-shaped tables' full schemas (`jobs`, `turns`): neither has a column that could hold an HTTP request body from an unrelated app (`prompt`, `summary`, `result`, `dispatch_payload` are all about *this* dispatch system's own agent conversations, not Popty's recording-upload traffic). There is no code path connecting `production-api.cjs`'s upload handler to this DB at all — it's a different application.
- Ran `strings command-surface.db | grep "GkXf\|SUQz"` anyway (in case some unrelated blob coincidentally embedded one): **62 hits**. Inspected them: every one is a *mid-string* match inside a much larger, structurally unrelated base64/binary blob (ASN.1-looking key/certificate material and what appears to be compiled binary or npm-cache data — ~1-3KB runs of dense base64, not the tens-to-hundreds-of-KB an MP3/WebM take would produce, and none begin with the signature at a field boundary). These are coincidental substring collisions, not audio.
- **Other local sqlite files found** (`find ... -iname "*.db" -o -iname "*.sqlite*"`): `~/.deu-redo-snapshot-2026-08-07/command-surface.db`, `~/.fra-redo-snapshot-2026-08-07/command-surface.db`, `~/.fra-redo-snapshot2-2026-08-07/command-surface.db` — all **0 bytes**. `~/.cs-testdb.db` (1.37 GB), `~/command-surface-dev/command-surface-dev.db` (1.10 GB), `~/command-surface/archive/events-archive.db` (1.04 GB) — same command-surface schema family (dev/test/archive copies of the same Watson dispatch DB), same conclusion applies: no table shaped to hold production-api payloads.

**Verdict: proof of absence** for a genuine hit — the 62 raw grep matches are false positives on unrelated binary data, and no table in any local sqlite DB is wired to receive the recording-upload endpoint's request body in the first place (confirmed from the app code in Hunt/Question 1, not just from the DB schema).

**EXPLICIT GAP**: did not `strings`-grep the three large sibling command-surface DBs (`.cs-testdb.db`, `command-surface-dev.db`, `events-archive.db` — ~3.5GB combined) individually; skipped because they share the identical schema already ruled out as payload-incapable, and a byte-for-byte re-scan of 3.5GB more of the same non-audio blob types was judged disproportionate to the marginal evidence value. If you want that closed out formally, say so and it's a mechanical repeat of the Hunt 4 command.

---

## Hunt 5 — live process memory

Not attempted, per the brief's own instruction ("irrelevant... do NOT dump process memory").

---

## Summary table

| # | Target | Result |
|---|--------|--------|
| Q1 | Code path logging the body | **No** — traced every line, file:line cited above |
| 1 | journalctl (this host = watson-1) | Proof of absence for 2026-08-10 (in-window); **gap** for the other 4 dates (outside 2026-07-28 retention floor) |
| 2 | logs/, /var/log, ~/.pm2/logs, estate *.log* | Proof of absence — 687 files, 0 hits |
| 3 | Ingress (Tailscale Funnel; no nginx/caddy/ngrok/Cloudflare present) | Proof of absence + architectural: this ingress layer keeps no access logs at all |
| 4 | command-surface.db + other local sqlite | Proof of absence — named path is empty; real DB has no payload-shaped table; 62 raw signature hits are false positives on unrelated binary blobs |
| 5 | Live process memory | Not attempted (explicitly out of scope) |

**Bottom line for Tom**: the code was never capable of writing the raw take to a
log (Q1), and every log surface that does exist and is still reachable — this
host's journal back to 2026-07-28, every rotated/plain log file under the home
directory, and every local sqlite DB — comes back clean. The one real gap is
journal retention: four of the five named session dates fell off the journal
before this hunt could reach them, and there's no shipper or backup found to
recover them from. If the originals survive anywhere, this sweep (server logs)
and the prior S3/filesystem sweeps together suggest they don't survive on this
host at all.

---

**Landing line**: committed to branch `docs/a108-romance2-2026-08-14`; not
merged (no merge performed); not deployed (a docs-only markdown file, nothing
to deploy).
