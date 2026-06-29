# Process-Spawn / CLI-Drive Endpoint Audit — Re-verification (READ-ONLY)

*Generated 2026-06-25. No code was changed.*
*Supersedes `spawn-endpoint-audit-2026-06-24.md` — re-verified against the current
working tree (which carries uncommitted changes to `services/production-api.cjs`).*

> Scope: every HTTP route on the Popty dashboard that can spawn a host process or
> drive the Claude CLI (`osascript` → iTerm2/Terminal → `node`/`claude`,
> `child_process.spawn`/`execFile`), its **current** auth posture, the cross-course
> access-hop risk flagged in `docs/fable5-brief.md`, and a concrete per-contributor
> auth fix. Ranked by exposure.

---

## TL;DR — what changed since yesterday

The brief's one security ask — **cross-course access scoping on the spawn proxy** —
**has now been implemented in the working tree** (uncommitted, `M services/production-api.cjs`):

- A new `requireProxyCourseAccess` middleware (`production-api.cjs:1167`) is mounted
  **in front of every wildcard build/agent proxy route** (`:1217-1227`). It resolves
  the dashboard user, 401s if absent, extracts the course code from the path/body via
  `extractProxyCourseCode` (`:1149`, regex `^[a-z]{2,4}_for_[a-z]{2,4}$`), and 403s a
  non-admin who lacks access to that course — exactly mirroring the `app.param('courseCode')`
  gate (`:355`).
- `proxyCourseBuilder` now **forwards `Authorization`** to 3471 (`:1196-1199`) — the
  header drop the prior audit flagged is fixed.
- The same-host loopback bypass (`isLoopbackDirectRequest`, `:306`) is preserved, so
  mesh/agent callbacks keep working.

So findings #1–#3 from the 2026-06-24 audit (the "whoever has the link can drive the
machine" critical) are **closed in the working tree** — pending commit/deploy.

**Two items remain open**, one of them newly identified:

1. 🟠 **3471 (`course-builder-api.cjs`) still has zero auth of its own** and binds to all
   interfaces. Defence-in-depth (the prior audit's Fix 3) was not done.
2. 🟠 **NEW — three `/api/admin/agents*` routes drive host processes with NO auth guard.**
   The prior audit missed these (it focused on *spawn*; these *kill/list*). They are
   unauthenticated and destructive.

⚠️ **These fixes live only in the uncommitted working tree.** Until committed and
deployed (Tom's DEPLOY button), the live Camberley host runs the *old* code — i.e. the
critical proxy hole is still live in production right now.

---

## Exposure ranking (current state)

| # | Endpoint(s) | Drives / spawns | Auth in working tree | Course-scoped? | Exposure |
|---|-------------|-----------------|----------------------|----------------|----------|
| 1 | `ALL /api/build/*`, `/api/v2/*`, `/api/golden/*`, `/api/phrases/*`, `/api/legos/*`, `/api/agents`, `/api/agents/*`, `/api/orchestrator/*`, `/api/qa/*`, `/api/course/*`, `/api/seeds/*` → 3471 (`:1217-1227`) | osascript→iTerm2/Terminal→`node`/`claude` CLI agents (translate, decompose, team-start, final-pass, zut-resolve, backfill, redo…) | `requireProxyCourseAccess` (`:1167`): dashboard user **+ per-course access** when a course code is in path/body | **YES** ✅ (when code present) | 🟡 Low *(was 🔴 Critical)* |
| 2 | `GET /api/admin/agents` (`:9421`) | `osascript` — enumerate every iTerm session on host | **NONE** | n/a | 🟠 High |
| 3 | `POST /api/admin/agents/kill` (`:9464`) | `osascript` close sessions + `process.kill` arbitrary PIDs | **NONE** | n/a | 🟠 High |
| 4 | `POST /api/admin/agents/kill-all` (`:9510`) | `ps`/`process.kill` all `claude` procs + `pkill -9 iTerm2` | **NONE** | n/a | 🟠 High |
| 5 | proxy routes where **no course code** appears in path/body (e.g. bare `/api/agents`, some `/api/orchestrator/*`) | same as #1 | authenticated user only — **course check skipped** (`extractProxyCourseCode` → null) | **NO** | 🟡 Low-Med |
| 6 | 3471 `course-builder-api.cjs` direct (`localhost:3471/api/build/*`) | the actual spawn site | **NONE** of its own; binds `0.0.0.0` (`:66`) | **NO** | 🟠 High (if box reachable / 3471 tunnelled) |
| 7 | `POST /api/production/:courseCode/gender-prep/start` (`:9102`) | osascript→iTerm2/Terminal→`gender-prep-coordinator.cjs` (parallel Haiku `--print`) | `app.param('courseCode')` gate (`:355`): user **+ per-course** | **YES** ✅ | 🟢 Protected |
| 8 | `POST /api/insight-discovery/run` (`:11152`) | detached `node insight-discovery.cjs` (runs `claude --print`) | `requireAdmin` (`:11153`) | n/a (global) | 🟢 Protected |
| 9 | `POST /api/admin/audit-archive` (`:10327`) | `node tools/archive-audit-log.cjs` (can `--prune` Postgres) | `requireAdmin` (`:10328`) | n/a (global) | 🟢 Protected |
| 10 | `POST /api/release-notes/generate` (`:11211`) | in-process `claude --print` over git delta | `requireAdmin` (`:11212`) | n/a (global) | 🟢 Protected |
| 11 | `POST /api/admin/{pm2/fix,pm2/restart,pm2/stop,pm2/delete,kill-pid,git-pull,kill-apps,restart-machine}` (`:9592`–`:9940`) | `pm2`/`kill -9`/`git pull`/`killall`/`osascript restart` | `requireAdmin` each (verified at head of body) | n/a (global) | 🟢 Protected |
| 12 | `POST /api/admin/setup-remote` (`:9666`) | writes sudoers, sets `SPAWN_MODE`, reads autologin | `ADMIN_SECRET` query/header (`:9667`) | n/a | 🟢 Protected |
| — | `GET /api/admin/pm2` (`:9576`), `GET /api/admin/system` (`:9543`) | read-only `pm2 jlist`/`ps` | **NONE** (read-only info disclosure) | n/a | 🟢 Info-only |

Library spawners (no direct HTTP surface; reached only via the routes above):
`services/course-builder/lib/agent-spawner.cjs` (headless bash vs osascript iTerm2/Terminal,
`MAX_CONCURRENT_AGENTS` cap), `services/shared/spawn-agent-cli.cjs`,
`services/shared/spawn-agent-terminal.cjs`, `services/shared/spawn-course-builder.cjs`.

---

## The two open holes, concretely

### A. Unauthenticated host-process control — `/api/admin/agents*` (#2–#4)

`GET /api/admin/agents` (`:9421`), `POST /api/admin/agents/kill` (`:9464`) and
`POST /api/admin/agents/kill-all` (`:9510`) have **no `requireAdmin` and no course gate** —
their route bodies go straight to `execFileAsync('osascript', …)` / `process.kill` /
`pkill -9 iTerm2`. Every *mutating* sibling in the same admin block (pm2/*, kill-pid,
git-pull, kill-apps, restart-machine) **does** call `requireAdmin` at the top of its body;
these three were missed.

These do not *spawn*, but they **drive the machine destructively**: anyone on the ngrok
link can `POST /api/admin/agents/kill-all` and terminate every in-flight build agent and
force-kill iTerm2 on Tom's/Kai's host — wiping hours of running course builds. `kill`
with a `pids` array calls `process.kill` on **arbitrary PIDs**, including non-agent
processes. This is the same "whoever has the link can drive the machine" risk class as the
spawn hole, on the teardown side.

### B. 3471 has no auth of its own and binds to all interfaces (#6)

`course-builder-api.cjs` still contains **zero** auth primitives (grep for `requireAdmin`,
`app.param`, `verifySupabaseJWT`, `req.headers.authorization` → 0 hits) and `app.listen(PORT)`
(`:66`) with no host arg binds `0.0.0.0`. Today it is protected only by the 3470 proxy gate
in front of it. Anything else on the box — or any tunnel pointed at 3471 — reaches the spawn
routes unauthenticated. The proxy now forwards `Authorization`, so 3471 *could* check it, but
it doesn't yet.

---

## Proposed per-contributor auth fixes (ranked)

### Fix 1 — Add `requireAdmin` to the three `/api/admin/agents*` routes — do first (cheap, closes #2–#4)
One line each at the top of the body (`if (!await requireAdmin(req, res)) return`),
exactly as every other mutating admin route already does. `kill`/`kill-all` are destructive;
`agents` (list) leaks the host's session inventory. No new machinery — reuse `requireAdmin`
(`:266`).

### Fix 2 — Defence-in-depth on 3471 (closes #6, the prior audit's Fix 3, still undone)
- Bind 3471 to `127.0.0.1` only (`app.listen(PORT, '127.0.0.1', …)`) so it is reachable
  solely via the same-host 3470 proxy.
- And/or have 3471 verify the now-forwarded `Authorization` header (it already arrives) plus
  its own `app.param('courseCode')` gate, so it never assumes it is unreachable.

### Fix 3 — Tighten the proxy's "no course code" path (closes #5)
`extractProxyCourseCode` returning `null` currently means **authenticated-but-unscoped**
passes through. Decide the policy explicitly: for spawn verbs that *require* a course
(build/decompose/translate), **deny** when no course code is resolvable rather than allowing
an authenticated editor to hit a course-less spawn route. The cleanest long-term form is to
re-mount these as `/api/build/:verb/:courseCode` so the audited `app.param('courseCode')` gate
fires directly and there is one enforcement path, not two.

### Fix 4 — Commit & deploy the working-tree proxy gate
The critical close (findings #1–#3 from 2026-06-24) exists **only in the uncommitted
`M services/production-api.cjs`**. Until it is committed and Tom hits DEPLOY, the live
Camberley host still serves the old, ungated proxy. This is the highest-urgency item by
real-world exposure even though the code fix is already written.

### Already-correct (no change needed, re-verified 2026-06-25)
- `app.param('courseCode')` gate (`:355`) and `requireProxyCourseAccess` (`:1167`) — the model.
- `gender-prep/start`, `insight-discovery/run`, `audit-archive`, `release-notes/generate`,
  all `pm2/*` + `kill-pid` + `git-pull` + `kill-apps` + `restart-machine`, `setup-remote` —
  gated (per-course, `requireAdmin`, or `ADMIN_SECRET`).

---

## Verification notes
- Auth helpers: `requireAdmin` (`:266`), `requireDashboardUser` (`:281`),
  `resolveDashboardUser`/`…Cached` (`:316`/`:339`), `userCanAccessCourse` (used `:367`,`:1184`),
  loopback bypass `isLoopbackDirectRequest` (`:306`).
- Central gates: `app.param('courseCode', …)` `:355-378`; `requireProxyCourseAccess` `:1167-1191`.
- Proxy wildcard mounts now carry the gate: `:1217-1227`; `proxyCourseBuilder` `:1193` (now
  forwards `Authorization` `:1196-1199`); `extractProxyCourseCode` `:1149`.
- Unauthenticated host-control gap: `/api/admin/agents` `:9421`, `/agents/kill` `:9464`,
  `/agents/kill-all` `:9510` — no `requireAdmin` in body (contrast `:9593`,`:9611`,`:9736`,`:9753`,`:9782`,`:9941`).
- 3471: `course-builder-api.cjs` — 0 auth primitives; `app.listen(PORT)` `:66` (no host bind).
- Spawn sites: gender-prep `:9102+`; agent spawn lib `services/course-builder/lib/agent-spawner.cjs`.
