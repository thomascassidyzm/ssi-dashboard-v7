# Popty VM Migration Runbook — Phase 2: Camberley → cloud

*Scouted 2026-07-31 from the watson-1 repo clone (`docs/popty-vm-migration-runbook` branch).
Camberley SSH was unreachable during the scout (Tailscale SSH check-mode re-auth), so the
on-Mac inventory is written as **TODO probes** — run them the moment access returns and fill
the marked blanks before executing anything. **No system was changed during this scout.**
Phase 1 (command surface → watson-1) is done and is the pattern:
`command-surface/docs/vm-migration-runbook.md`.*

**Scope.** Everything Popty runs on the Mac "Camberley" (Tailscale IP `100.126.253.11` — treat
the IP as ground truth; the tailnet *names* for the Macs have drifted across docs) moves to
cloud. Camberley retires after cutover. Users who must not notice: **Aran, Deborah, and the
course team** on popty.app + production API + phase8 audio.

**The single most important discovery of the scout:** phase 2 is already half-done. watson-1
already runs `production-api` on :3470 as a systemd user unit (`popty-production-api`,
read-only stand-in) and `orchestrator` on :3456 under pm2, with a documented one-writer guard
and cutover checklist in `docs/watson-1-environment.md`. This runbook builds on that, not from
scratch.

**The second most important fact:** the *learner path never touches Camberley.* The learning
app reads Supabase/S3 directly (CLAUDE.md, cross-repo map). Migration risk is confined to the
course-production tooling — popty.app dashboard, content APIs, audio generation. Learners
cannot experience downtime from this migration.

---

## 1. Inventory — what runs on Camberley today

### 1.1 The service mesh (pm2)

Source of truth for the expected set: the historic `ecosystem.config.cjs` (git `52adabdf`;
file now gitignored, so Camberley's live copy may differ — probe it) plus
`docs/architecture/POPTY_REMOTE_CONTROL.md` and `docs/watson-1-environment.md`.

| pm2 name | Script | Port | Role | Linux-portable? |
|---|---|---|---|---|
| `production-api` | `services/production-api.cjs` | 3470 | Single front door: auth, course list, QA, WebSocket, admin + spawn endpoints, proxies to all others | **Already running on watson-1** (systemd user unit) |
| `course-builder` | `services/course-builder-api.cjs` | 3471 | Content creation: `POST /api/seed/complete`, decomposition, checkpoints | Node-only — yes (verify agent-spawn paths, §1.5) |
| `phase8-audio` | `services/phases/phase8-audio-v13.cjs` | 3465 | TTS (Azure + ElevenLabs + xAI) → S3 + Supabase | Yes, needs keys + ffmpeg (§1.4) |
| `phase9-manifest` | `services/phases/phase9-manifest-compiler.cjs` | 3466 | Manifest compilation from Supabase | Node-only — yes (legacy path, not learner-facing) |
| `orchestrator` | `services/orchestration/orchestrator.cjs` | 3456 | Pipeline coordination | **Already running on watson-1** (pm2) |
| `ngrok` | `ngrok http --url=$NGROK_DOMAIN 3470` | — | Public tunnel `ssi-machine.ngrok.app` → :3470 | Replaced by Funnel or ngrok-on-VM (§3.3, decision D2) |
| `keep-awake` | `scripts/keep-awake.sh` | — | Mac sleep suppression | Drop — VMs don't sleep |
| `cleanup-terminals` | `scripts/cleanup-terminals.sh` | — | Reaps spawned iTerm windows | Drop with the GUI spawn path (§1.5) |

**TODO probe (Camberley):** `pm2 jlist` — confirm the live set, exact env per process, and
anything started outside this list. Also `cat ~/ssi-dashboard-v7-clean/ecosystem.config.cjs`
(the live, gitignored copy) and `pm2 env <id>` for `NGROK_DOMAIN` and `MACHINE_RAM_GB`.

Note Camberley's repo path is `~/ssi-dashboard-v7-clean` (home-dir root), not `~/SSi/…`
(docs/secrets-vault.md, machine map).

### 1.2 Crons and launchd on Camberley

Known from repo + phase-1 doc; all need probe confirmation:

- **`*/15 * * * *` deploy cron — `tools/sync/git-pull-restart.sh`**: pulls main and restarts
  pm2. This is the deploy path: `claude/*` branches auto-merge to main (GitHub workflow) →
  Camberley pulls + restarts within 15 min (WORKLIST.md header). **The script is NOT in git**
  — it exists only on Camberley. Probe: `crontab -l` and
  `cat ~/ssi-dashboard-v7-clean/tools/sync/git-pull-restart.sh` (copy it into the runbook
  worktree for porting; the VM equivalent is a git-sync + `systemctl --user restart`).
- **`tools/sync/popty-watchdog.sh`** (committed): launchd, every 60s, curls
  `:3470/health`, self-heals missing `node_modules`, restarts pm2 after 3 consecutive fails.
  Direct Linux port = cron + systemd restart.
- **TODO probe:** `crontab -l`, `ls ~/Library/LaunchAgents/`, and
  `launchctl list | grep -iv com.apple` — enumerate every plist (watchdog, anything audio- or
  sync-related), and check for a Vault/secrets-refresh or S3-sync job we don't know about.

### 1.3 How popty.app is actually served (nailed)

- **Frontend**: this repo's Vue SPA, built by Vite, hosted on **Vercel** at `popty.app`
  (`vercel.json` — SPA rewrites + cache headers). Deploys via Vercel's git integration on
  main. **Nothing about the frontend hosting changes in phase 2.**
  - Build note: `package.json` has `"@ssi/core": "file:../ssi-learning-app/packages/core"` —
    the Vercel build must already handle this; **TODO probe (Vercel dashboard):** confirm the
    project's root/build settings and that the dashboard project is linked to this repo.
- **Backend resolution** (`src/services/api.js:23-41`), in priority order:
  1. `localStorage['api_base_url']` (managed by the EnvironmentSwitcher);
  2. relative URLs when the hostname contains `ngrok`;
  3. **hostname `popty.app` → hardcoded default `https://ssi-machine.ngrok.app`** — the
     reserved ngrok domain, tunnelled by the pm2 `ngrok` process to Camberley's :3470.
- **The cutover lever**: `src/components/EnvironmentSwitcher.vue:82-86` re-syncs
  `localStorage['api_base_url']` to the selected environment's URL on every page load. So a
  frontend redeploy that changes the environment URLs re-points every user's browser
  automatically — no "stale localStorage" support burden, as long as we change the URL *of
  the environment they already have selected* (or the popty.app default at
  `src/services/api.js:41`).
- An "SSi Machine (Cloud)" option (formerly "Watson VM") exists in the switcher →
  `https://watson-1.tail4968cb.ts.net:8443` (Tailscale Funnel → :3470; **Funnel is LIVE**
  as of 2026-07-31 — the two one-time Tom actions in `docs/watson-1-environment.md`
  §Public exposure are done, and the real `SUPABASE_SERVICE_KEY` is provisioned on
  watson-1, so writes work through this door. Parallel-run: the scheduler belt
  (`AUDIT_ARCHIVE_CRON=off`) stays on; Camberley remains the sole background writer).

### 1.4 The audio pipeline and the content-addressed clip store

- **Canonical audio storage is S3** (`ssi-audio-stage`, eu-west-1, flat `{uuid}.mp3`) plus
  Supabase `course_audio` rows — content-addressed (UUID from voice+text,
  `services/phases/phase8-audio-from-baskets.cjs:5`). The canonical store does not move; it's
  already in the cloud.
- **Deep-read verdict (worker census, 2026-07-31): there is NO persistent local clip store.**
  Every local path phase8/audio-processor touches is an ephemeral `os.tmpdir()` scratch dir,
  created and removed per call (`phase8-audio-v13.cjs:925-965,5024-5058`;
  `audio-processor.cjs:704,807,972`; stale-dir sweeper at `:520-533` confirms
  ephemeral-by-design). Canonical audio = S3 keys `mastered/{uuid}.mp3` / `pending/{uuid}.mp3`
  referenced from `course_audio.s3_key`. **A Linux VM with a clean `/tmp` needs no audio data
  migrated at all** — the feared multi-GB transfer over the throttled ISP link evaporates.
- `VFS_ROOT` (`public/vfs`) is not on the audio require-chain — it belongs to the earlier
  pipeline phases (baskets/conflict). `services/s3-audio-service.cjs` (different key layout)
  is dead code, required nowhere.
- **Pipeline binaries**: `ffmpeg` (already on watson-1) + **`lame`** (required — ffmpeg's own
  MP3 muxer is deliberately rejected for an iOS/AVPlayer decode bug,
  `audio-processor.cjs:47-58`; not yet on watson-1) + optionally `whisper-cli` + a ggml model
  (trim-verification and the xAI phonology gate **fail open** — they silently switch off when
  whisper is absent: a quality regression, not a crash — `audio-processor.cjs:536-544`,
  `tts-service.cjs:415-418`; set `WHISPER`/`WHISPER_MODEL` env on the VM).
- One PATH landmine to carry over: `audio-processor.cjs:26-30` prepends Homebrew paths
  defensively because a 2026-07-28 `pm2 restart --update-env` from a minimal-PATH shell
  silently dropped ffmpeg and wasted 719 TTS renders. That fallback list doesn't cover Linux
  paths — add `/usr/bin` (small patch) or guarantee PATH in the systemd unit (units have
  explicit env anyway — the incident class dies with pm2).
- **TODO probes (Camberley), now confirmation-only:** `du -sh ~/SSi/SSi_Course_Production`
  (expected: pipeline working state, not audio), `ls ~/ssi-dashboard-v7-clean/scripts/` for
  gitignored tooling in active use, and confirm no cron/launchd job syncs any local audio dir.
  If anything local-only does turn up, transfer is rsync **over the tailnet** (WireGuard/UDP)
  — never plain HTTPS/TCP upload; Camberley's ISP kills upstream TCP >64KB/s (phase-1 lesson).

### 1.5 macOS-specific machinery (the real porting surface)

The one architecturally Mac-bound piece is **Principle 2** of
`docs/architecture/POPTY_REMOTE_CONTROL.md`: HTTP endpoints drive `osascript` to open
iTerm2/Terminal windows that run `claude` CLI / coordinator processes. A full census
(worker report, 2026-07-31; file:line detail in the dispatch transcript) found the porting
surface is small and mostly already done:

**Already portable (env flag or platform branch exists):**
- `services/course-builder/lib/agent-spawner.cjs` — `SPAWN_MODE=headless` branch (:32-42);
  all course-builder routes (`build.cjs`, `v2.cjs`, `qa.cjs`) respect it.
- `services/gender-prep-coordinator.cjs` + its spawn from `production-api.cjs:9616-9663` —
  `TERMINAL_MODE` **already defaults to headless**.
- `production-api.cjs` admin/reboot endpoints — cleanly platform-branched by the recent
  remote-control work (commits `82be7ec4`, `22d00f00`, `8135403d`): `kill-apps` refuses with
  400 off darwin, reboot readiness has a `linuxRebootReadiness()` path, reboot uses
  `systemctl reboot`.
- `services/shared/claude-config.cjs:22` — Claude account dir defaults to
  `/Users/tomcassidy/.cs-accounts/account-3` (the `claude@saysomethingin.com` session), with
  `SSI_CLAUDE_CONFIG_DIR` env override. On watson-1 the phase-1 `/Users/tomcassidy →
  /home/tomcassidy` symlink already resolves this, and `~/.cs-accounts/account-3` exists —
  verify that account's login, nothing else needed.

**LIVE blockers (the actual porting work, two items):**
1. `services/shared/spawn-agent-unified.cjs` and its children (`spawn-agent-cli.cjs`,
   `spawn-agent.cjs`) — **no headless mode at all**: CLI mode probes for iTerm2 via
   osascript, and the fallback is *browser mode* (Safari/Chrome + `pbcopy`), equally
   Mac-GUI-bound. Reached live from **phase3 masters**
   (`phase3-basket-generation/server.cjs:808,1421`) and `orchestrator.cjs:4162-4579`
   (`spawnerMode` cli/browser). Fix: add a headless branch mirroring `agent-spawner.cjs`
   (spawn `claude` as a background child), surface `spawnerMode:'headless'`.
2. `services/phases/phase3-basket-generation/server.cjs:842-886`
   (`spawnClaudeCodeSession`) — direct osascript Safari spawn, no guard. Fix: route through
   the same headless path.

**Small patches:** `production-api.cjs` iTerm session-list endpoint (`:9837-9948`) — return
empty off darwin; `getMemStats()` — verify a `/proc/meminfo` branch exists (:10228 area);
`audio-processor.cjs:26` PATH list (§1.4); a couple of manual tools with hardcoded
`/opt/homebrew` paths (env-override additions, not on the live path).

**Non-factors (checked, zero live hits):** `caffeinate`, `say`, `afplay`, Keychain,
`launchctl` outside the darwin branch. Dev-only osascript tooling under
`tools/orchestrators/` stays Mac-only, out of scope.

### 1.6 LLM work: Claude CLI on subscription

All LLM calls go through the `claude` CLI on Tom's Pro Max subscription (hard rule — never
the SDK). The VM already runs the same pattern for the command surface: three portable
account dirs under `~/.cs-accounts/` with `.cs-oauth-token` credentials, proven on Linux in
phase 1. Popty's coordinators (e.g. `gender-prep-coordinator.cjs`) need `CLAUDE_CONFIG_DIR` /
`CLAUDE_CODE_OAUTH_TOKEN` plumbed the same way, and `CLAUDECODE` unset for nested calls
(CLAUDE.md rule). **TODO probe (Camberley):** which account dir / config popty's spawns use
today (`pm2 env`, coordinator source, `~/.claude` vs `~/.cs-accounts`).

### 1.7 Env / secrets per service

`.env` at the repo root on each machine (gitignored). Var names present in the watson-1 copy
(names only): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`,
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`AWS_REGION`, `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION` (+ legacy `AZURE_TTS_*`),
`ELEVENLABS_API_KEY`, `XAI_API_KEY`, `ANTHROPIC_API_KEY` (env-switcher only, not service
code), `ADMIN_SECRET`, `VFS_API_KEY`, `VFS_ROOT`, `WHISPER_MODEL`.

- watson-1 currently holds the **anon key as a stand-in** for the service key, and **no
  TTS/S3/xAI keys** — that's the deliberate read-only belt (`docs/watson-1-environment.md`).
- 9 shared secrets are already in **Supabase Vault** (`docs/secrets-vault.md`) — retrievable
  on any machine that has secret-zero (`.env.psql` / `DATABASE_URL`). watson-1 currently
  lacks vault access (`docs/DECISIONS.md` 2026-07-29). Provisioning path when SSH to the Mac
  is flaky: **push from the Mac** (`scp .env → watson-1`), per
  `docs/watson-1-environment.md` §Provisioning — or provision `.env.psql` once and pull the
  rest from Vault (`node tools/secrets.cjs load`). Vault is the cleaner move (one credential
  to move, everything else follows) — recommended.
- **TODO probe (Camberley):** diff Camberley's `.env` var *names* against the list above so
  nothing machine-specific is missed; locate `.env.automation` (`VFS_ROOT`), `.env.psql`.

### 1.8 Naming reconciliation (read before trusting any doc)

The estate's Mac names have drifted: phase-1's runbook calls its source machine "Toms-Air"
(tailnet `toms-macbook-air`) and describes "Camberley" as a *second*, offline Mac
(`macbook-air-3`); `docs/secrets-vault.md` maps Camberley to tailnet `toms-air`;
`docs/watson-1-environment.md` maps Camberley to `toms-macbook-air`. The stable facts:
**Camberley = the machine at `100.126.253.11` that runs the pm2 stack and
`ssi-machine.ngrok.app`; watson-1 = `100.108.9.37`.** Use IPs in every executable step.
**TODO probe:** `tailscale status` from watson-1 while Camberley is up — record its current
tailnet name, and `hostname` on the Mac itself.

---

## 2. Target — where phase 2 lands

**Recommendation: onto the existing watson-1 (CPX42-class, 16 GB). No second box.**

Sizing, honestly from inventory:

- **watson-1 today**: 1.6 GB used of 16 GB; 275 GB disk free; running command-surface
  (:4317), production-api (:3470, idle/read-only), orchestrator (:3456), plus 1–5
  `claude` CLI workers in bursts (a few hundred MB each, network-bound).
- **Camberley's stack adds**: course-builder + phase8 + phase9 ≈ 3 more Node processes.
  The historic ecosystem file caps heap per service via `MACHINE_RAM_GB`-aware limits —
  the "default" 16 GB profile is exactly what the EnvironmentSwitcher already assumes for
  watson-1 (`EnvironmentSwitcher.vue:64`). Idle footprint ≈ 1–2 GB; peaks are
  agent-spawn fan-outs (gender-prep: 5 concurrent haiku CLIs) and phase8 renders (network-
  bound TTS + ffmpeg transcodes — CPU-light, minutes-long).
- **Disk**: canonical audio is S3 and there is **no local clip store** (§1.4) — local disk
  needs are repo + node_modules + ephemeral `/tmp` scratch. 275 GB free is over-provisioned.
- **The workloads are anti-correlated in practice** (course-team daytime API use vs Tom's
  dispatch bursts), and both are burst-idle. Contention risk is CPU during simultaneous
  claude fan-outs — acceptable on 8 vCPU; if it ever hurts, a Hetzner **resize**
  CPX42→CPX52 (32 GB) is a reboot, not a migration — that's the upgrade path, not a second
  box.
- A second box would buy blast-radius isolation (course team vs command surface) at the cost
  of a second machine to secure, patch, provision secrets to, and pay for (~€29+/mo), plus a
  second Funnel/tunnel identity. Nothing in the inventory justifies that today.
  Better (one estate, one writer) × Simpler (one box, one runbook) × Cheaper (€0 marginal).

One-writer note: landing popty on watson-1 means watson-1 becomes **the** writer at cutover —
the guard flips exactly per the checklist in `docs/watson-1-environment.md` (Camberley
disarmed first, then watson-1 armed). A second box would reopen the two-writer problem the
guard exists to prevent.

---

## 3. Runbook — parallel run, then cutover

Pattern copied from phase 1: build the standby completely, soak it, move users with one
lever, keep rollback one command away. Steps are agent-executable except **[TOM]** marks.
Nothing before §3.5 touches Camberley or changes any user's experience.

### 3.0 Preconditions

1. Camberley SSH reachable (Tailscale SSH re-auth — **[TOM]** one browser tap), or Tom runs
   the probe block §3.1 by hand on the Mac.
2. All §1 TODO probes answered; blanks in this doc filled; no unexplained service in
   `pm2 jlist`.

### 3.1 Probe block (run on Camberley, read-only, ~5 min)

```sh
pm2 jlist > /tmp/probe-pm2.json
crontab -l > /tmp/probe-cron.txt
ls ~/Library/LaunchAgents/ > /tmp/probe-launchd.txt
cat ~/ssi-dashboard-v7-clean/tools/sync/git-pull-restart.sh > /tmp/probe-deploy.sh
cat ~/ssi-dashboard-v7-clean/ecosystem.config.cjs > /tmp/probe-eco.cjs
grep -oE '^[A-Z_]+=' ~/ssi-dashboard-v7-clean/.env | sort > /tmp/probe-envnames.txt
du -sh ~/SSi/SSi_Course_Production 2>/dev/null; du -sh ~/ssi-dashboard-v7-clean 2>/dev/null
which ffmpeg sox; tailscale status | head -5; hostname
# + the audio-cache paths named in §1.4 once worker-B's list is confirmed
```
Copy `/tmp/probe-*` to watson-1 over the tailnet (`scp /tmp/probe-* tomcassidy@100.108.9.37:~/probes/`).

### 3.2 Complete the standby stack on watson-1

1. **Binaries**: `apt install lame` (ffmpeg already present; lame is required —
   `audio-processor.cjs:47-58`), optionally whisper-cli + a ggml-small model (else trim
   verification and the phono gate silently disable, §1.4) — needs a root step; sudo on
   watson-1 is scoped to one command, so **[TOM]** or the provider console (one-off).
2. **Services**: add systemd user units (same shape as `popty-production-api.service`) for
   `course-builder` (:3471), `phase8-audio` (:3465), `phase9-manifest` (:3466). Keep the
   one-owner-per-port rule (`docs/watson-1-environment.md`): remove orchestrator from pm2 and
   unit-ify it too, then drop the `@reboot pm2 resurrect` crontab line — ending with zero pm2
   on the VM is simpler than two process managers. Put the full PATH and the `WHISPER`/
   `WHISPER_MODEL`/`FFMPEG` env in the units (kills the PATH-loss incident class, §1.4).
3. **Headless spawning**: set `SPAWN_MODE=headless` in the units' env (covers course-builder
   + gender-prep already), and land the one real code change: a headless branch in
   `services/shared/spawn-agent-unified.cjs` + routing phase3's `spawnClaudeCodeSession`
   through it (§1.5 blockers 1–2), staged as a normal PR and soak-tested on the VM.
4. **Claude accounts**: `~/.cs-accounts/account-1..3` already exist on watson-1 and
   `claude-config.cjs`'s default path resolves via the `/Users/tomcassidy` symlink — verify
   `account-3` (the `claude@saysomethingin.com` session popty pins) with one
   `claude -p "ok"`; re-auth via `setup-token` if stale (**[TOM]**, ~5 min, phase-1 §5 flow).
5. **VFS_ROOT**: create/populate `~/SSi/SSi_Course_Production` per probe findings (rsync over
   tailnet if it holds real state; empty scaffold if it's regenerable). Not on the audio
   path — earlier pipeline phases only.
6. **Deploy path**: port `git-pull-restart.sh` → a `*/15` cron doing
   `git pull --ff-only` + `systemctl --user restart <changed services>` (or reuse the
   command-surface git-sync pattern). Port `popty-watchdog.sh` (health-check :3470 →
   user-unit restart).
7. **Secrets — read-only until §3.5**: provision `.env.psql` (secret zero) to watson-1
   (**[TOM]**: scp from the Mac or paste), pull TTS/S3/xAI keys from Vault
   (`node tools/secrets.cjs load`) into `.env` — but **leave the anon-key stand-in for
   `SUPABASE_SERVICE_KEY` in place** until cutover. Phase8 can be smoke-tested against S3
   with a throwaway render *only with an explicit TTS approval* (approval gate; a single
   1-phrase render is the right ask).

### 3.3 Public door for the VM backend (decision D2, then execute)

Whichever of the two D2 options is chosen:
- **Funnel**: **[TOM]** enables Funnel on the tailnet + `sudo tailscale set
  --operator=tomcassidy` on watson-1 (both one-time, links in
  `docs/watson-1-environment.md`), then `tailscale funnel --bg --https=8443 localhost:3470`.
- **ngrok-on-VM**: install ngrok on watson-1 with the same account; the reserved domain
  `ssi-machine.ngrok.app` moves by simply starting the tunnel on the VM (only one agent can
  hold the domain at a time — this is also the instant-rollback lever: start it back on the
  Mac).

Then verify from outside the tailnet: `curl https://<door>/health` → 200.

### 3.4 Parallel run (days, not hours)

1. watson-1 runs the full stack read-only; Camberley remains live and the sole writer.
   Course team continues on popty.app → Camberley, untouched.
2. Smoke the VM stack via the EnvironmentSwitcher "Watson VM" option (Tom or an agent, not
   the course team): course list, QA reads, WebSocket connect, remote-control panel (already
   platform-aware), course-builder validation endpoints with a dry submission.
3. Soak checks: user units restart on kill ≤5s, deploy cron picks up a main push, watchdog
   log ticking, memory under load-test fan-out.

### 3.5 Cutover (one evening, off course-team hours)

Order matters; each step is reversible until step 4.

1. **Freeze writes** briefly: confirm no build/audio job running (`pm2 jlist` on Camberley,
   `build_jobs` in Supabase); announce a 30-min window to Aran/Deborah (**[TOM]** one
   message).
2. **Flip the one-writer guard** exactly per `docs/watson-1-environment.md` §Cutover:
   Camberley disarmed + confirmed in its log → real `SUPABASE_SERVICE_KEY` + TTS/S3 keys into
   watson-1's `.env` → arm watson-1 → confirm log line. Sync any local-only audio/VFS delta
   (tailnet rsync, checksum) accumulated since §3.2.
3. **Move the public door**: stop the ngrok pm2 process on Camberley; start the door on the
   VM (§3.3). If ngrok-on-VM was chosen, `ssi-machine.ngrok.app` now points at watson-1 and
   **no frontend change is needed for cutover day**. If Funnel was chosen, redeploy the
   frontend with `src/services/api.js:41` defaulting to the Funnel URL (and the switcher's
   `ssi-machine` entry updated) — the localStorage auto-sync re-points every browser on next
   load.
4. **Stop Camberley's stack**: `pm2 stop all && pm2 save`; disable the `*/15` deploy cron and
   the watchdog launchd agent (rename plist to `_disabled/`). Do NOT delete anything.
5. **Verify as a user** (the Aran/Deborah experience): open popty.app cold on a phone —
   course list loads, a QA action writes, WebSocket progress streams, one *approved*
   1-phrase audio render lands in S3 + `course_audio`, remote-control panel green.
6. **Watch window**: 48h of the VM as sole writer; watchdog + `journalctl --user` + Supabase
   `build_jobs` monitored. Camberley stays powered but idle.

### 3.6 Rollback (any point before Camberley is wiped)

`pm2 start all` on Camberley (state untouched), move the public door back (start ngrok on the
Mac / re-point the frontend default), re-disarm watson-1's writer guard (unit `Environment=`
line back to `off`, restart). Supabase/S3 were only ever written by one machine at a time, so
there is no data merge to do — rollback is purely a routing + guard flip.

### 3.7 Retirement (after the watch window, **[TOM]** call)

Archive Camberley's `.env*` + any local-only state to the VM (tailnet rsync), keep the Mac
off but intact for a month, then wipe. Remove the "SSi Machine" row from the
EnvironmentSwitcher and the ngrok subscription **if** Funnel was chosen (small recurring
saving — decision D2).

---

## 4. Risks

1. **Hidden Camberley state** (gitignored scripts like `git-pull-restart.sh`, `scripts/`
   workspace tools in active use, unknown launchd jobs). *Mitigation:* the probe block is a
   hard precondition; nothing executes before it's read.
2. **The spawn path is the one real port** — two live blockers in §1.5 (spawn-agent-unified
   headless mode; phase3's direct osascript spawn). A coordinator that silently assumed a
   GUI would fail its first real run on the VM. *Mitigation:* the census enumerated every
   call site; one real (approved) end-to-end job per spawn family during the parallel run.
3. **Silent quality regressions that fail open**: whisper-based trim verification and the
   xAI phonology gate disable themselves without error when whisper-cli/model are absent
   (§1.4). *Mitigation:* install whisper on the VM in §3.2.1 and assert `PHONO_GATE_ON` in
   the phase8 startup log during the soak.
4. **ISP upstream throttle on the Mac** (TCP >64KB/s dies): any bulk copy over HTTPS will
   stall or corrupt. Largely defused — no audio store to move — but any residual transfer
   (VFS state, `.env` archive) is tailnet rsync (UDP/WireGuard) with checksums — phase-1
   proven.
5. **Two writers, briefly**: a missed step in §3.5.2 could leave both machines armed.
   *Mitigation:* the checklist's explicit disarm-confirm-then-arm ordering; credentials are
   the second belt (Camberley's key removal can be added as step 2b if Tom wants belt three).
6. **Course-team browsers pinned to a dead URL**: someone with the switcher set to a
   non-default environment. *Mitigation:* the switcher's localStorage auto-sync on load
   covers all four named environments as long as the redeploy updates the URL in place;
   verify Aran's and Deborah's selected environment during the freeze window (one question).
7. **Subscription/auth drift on the VM**: `claude` OAuth tokens expire ~yearly; phase-1's
   sentinel pattern already monitors the command-surface accounts — extend it to cover
   popty's spawns (same accounts, so likely free).
8. **watson-1 becomes a single point of failure for everything** (command surface + popty).
   Accepted consciously in D1; Hetzner snapshots + the phase-1 backup cadence are the
   mitigation, and Supabase/S3/GitHub hold all canonical data regardless.
9. **Vercel build coupling**: the `@ssi/core file:../ssi-learning-app` dependency means
   frontend builds depend on how Vercel resolves it today. Not changed by this migration —
   but confirm before the cutover-day redeploy (Funnel path only).

## 5. Decisions for the founder

- **D1 — Target box.** Phase 2 lands on the existing watson-1 (16 GB, currently 10%
  utilised); upgrade path is an in-place resize to 32 GB if fan-outs ever contend. Option B:
  a second Hetzner box (~€29+/mo) for isolation, second secrets estate, second door.
  **Recommendation: watson-1.** *(A / B / keep exploring)*
- **D2 — Public door for the API.** (a) Move the ngrok reserved domain
  `ssi-machine.ngrok.app` to the VM: zero frontend change, instant rollback, keeps the ngrok
  subscription. (b) Tailscale Funnel `watson-1.tail4968cb.ts.net:8443`: no ngrok cost/
  dependency, needs a frontend-default redeploy + two one-time Tom actions, rollback = one
  more redeploy. **Recommendation: (a) for cutover day, migrate to (b) — or a proper
  `api.popty.app` on the VM's public IP — as a calm follow-up.** *(a / b / a-then-b)*
- **D3 — Cutover window.** A 30-minute announced quiet window for Aran/Deborah, one evening.
  Which evening? *(date, or "any evening next week")*
- **D4 — Camberley afterlife.** Keep intact-but-off for 30 days then wipe (recommended), or
  repurpose immediately. *(30-days / repurpose / other)*
- **D5 — TTS smoke-test approval.** One 1-phrase throwaway render from watson-1 during
  §3.2/§3.5 verification (cents, deleted after). *(approve / skip — skip means first real
  audio job is the test)*

---

*Worker annexes (macOS-dependency census; audio-pipeline local-store map) are folded into
§1.4/§1.5 above; raw reports live in the dispatch transcripts of 2026-07-31.*
