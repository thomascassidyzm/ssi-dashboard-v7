# Process-Spawn / CLI-Drive Endpoint Audit (READ-ONLY)

*Generated 2026-06-24. No code was changed.*

> Scope: every HTTP route that can spawn a host process or drive the Claude CLI
> (`osascript` → iTerm2/Terminal → `node`/`claude`, `child_process.spawn`), its
> current auth posture, the cross-course access-hop risk flagged in
> `docs/fable5-brief.md`, and a concrete per-contributor auth fix. Ranked by exposure.

---

## TL;DR

The cross-course access fix the brief asks for is **already implemented for the
main service** (`production-api.cjs`, port 3470) via a single `app.param('courseCode')`
gate (`production-api.cjs:355`) that requires a resolved dashboard user *and*
per-course access on **every** route carrying a real `:courseCode` param.

**The hole is the proxy layer.** The build/agent-spawning routes are mounted as
**wildcards** (`app.all('/api/build/*', …)`, `production-api.cjs:1171-1182`), so
`:courseCode` is never a named param — the gate above **never fires** for them.
The proxy (`proxyCourseBuilder`, `production-api.cjs:1144`) also **does not forward
the `Authorization` header**, and the downstream Course Builder service
(`course-builder-api.cjs`, port 3471) has **zero auth of its own** (no `app.param`,
no `requireAdmin`, no token check anywhere). Net result: anyone who can reach 3470
(i.e. anyone with the ngrok link) can spawn Claude CLI agents against **any**
course, fully unauthenticated. That is the live cross-course hop.

By contrast, `gender-prep/start` and all the `requireAdmin` admin tools are
properly protected. (An earlier sub-agent pass reported these as "wide open" —
that is **incorrect**; the `app.param` gate and `requireAdmin` cover them.)

---

## Exposure ranking

| # | Endpoint(s) | Spawns | Auth today | Course-scoped? | Exposure |
|---|-------------|--------|------------|----------------|----------|
| 1 | `ALL /api/build/*` → 3471 build routes | osascript→iTerm2/Terminal→`node`/`claude` CLI agents (translate, decompose, team-start, final-pass, category-llm, learner-sim, component-backfill, zut-resolve, backfill-phrases, redo) | **NONE** (gate escaped + auth not forwarded + 3471 open) | **NO** | 🔴 Critical |
| 2 | `ALL /api/orchestrator/*`, `/api/agents`, `/api/agents/*` → 3471 | Course-builder orchestration / agent spawn | **NONE** (same wildcard escape) | **NO** | 🔴 Critical |
| 3 | `ALL /api/v2/*`, `/api/golden/*`, `/api/qa/*`, `/api/course/*`, `/api/phrases/*`, `/api/legos/*`, `/api/seeds/*` → 3471 | Course-builder writes; some trigger spawns | **NONE** | **NO** | 🟠 High |
| 4 | `POST /api/courses/:courseCode/generate` (orchestrator 3456, `orchestration/orchestrator.cjs:~4147`) | `spawnCourseBuilder` + `spawnPhraseMonitor` via osascript/bash | Depends on 3456 exposure; orchestrator proxy forwards auth but 3456 routes self-gate weakly | **NO** server-side course check | 🟠 High |
| 5 | `POST /api/production/:courseCode/gender-prep/start` (`production-api.cjs:9056`) | osascript→iTerm2/Terminal→`gender-prep-coordinator.cjs` (parallel Haiku `--print`) | **`app.param` gate** (`:355`): dashboard user **+ per-course access** | **YES** ✅ | 🟡 Low |
| 6 | `POST /api/insight-discovery/run` (`production-api.cjs:~11106`) | detached `node insight-discovery.cjs` (runs `claude --print`) | `requireAdmin` (`:11107`) | n/a (global) | 🟢 Protected |
| 7 | `POST /api/admin/audit-archive` (`production-api.cjs:~10281`) | `node tools/archive-audit-log.cjs` (can `--prune` Postgres) | `requireAdmin` (`:10282`) | n/a (global) | 🟢 Protected |
| 8 | `POST /api/release-notes/generate` (`production-api.cjs:~11165`) | in-process `claude --print` over git delta | `requireAdmin` (`:11166`) | n/a (global) | 🟢 Protected |

Library spawners (no direct HTTP surface, reached only via the routes above):
`services/course-builder/lib/agent-spawner.cjs` (headless bash vs osascript iTerm2/Terminal, `MAX_CONCURRENT_AGENTS` cap default 12), `services/shared/spawn-agent-cli.cjs`, `services/shared/spawn-agent-terminal.cjs`, `services/shared/spawn-course-builder.cjs`.

---

## The mechanism (why #1–#3 are open)

1. **Gate is keyed on a named param.** `app.param('courseCode', …)`
   (`production-api.cjs:355-375`) only runs for routes that literally declare
   `:courseCode`. It resolves the dashboard user, denies non-admins lacking `*`
   or list membership (`userCanAccessCourse`), and is the intended one-place
   cross-course enforcement.

2. **Proxy routes use `*`, not `:courseCode`.** `production-api.cjs:1171-1182`
   mounts `/api/build/*`, `/api/orchestrator/*`, `/api/agents/*`, `/api/v2/*`,
   `/api/golden/*`, `/api/qa/*`, `/api/course/*`, `/api/phrases/*`,
   `/api/legos/*`, `/api/seeds/*` as wildcards. No named param → **gate never
   fires**. The course code rides in the path (`/api/build/translate/<course>`)
   but is invisible to Express's param machinery.

3. **Proxy strips auth.** `proxyCourseBuilder` (`:1144-1169`) rebuilds headers
   with only `Content-Type` and **omits `Authorization`** — contrast
   `proxyOrchestrator` (`:1200-1203`) which *does* forward it. So even if 3471
   wanted to check a token, it never receives one.

4. **3471 has no auth at all.** `course-builder-api.cjs` has no `app.param`, no
   `requireAdmin`/`requireDashboardUser`, no token verification; `routes/build.cjs`
   contains no auth references. Every build route spawns agents on the host
   unconditionally.

**Consequence (the brief's cross-course hop, concretely):** an `editor` scoped to
only `mkd_for_fra` can `POST /api/build/decompose/spa_for_eng` — or any course —
and spawn Claude CLI agents on Tom's/Kai's machine for a course they were never
assigned. With no auth forwarded, an *unauthenticated* caller on the ngrok link
can do the same. This is literally "whoever has the link can drive the machine."

**One caveat that limits — but does not close — the blast radius:** the loopback
bypass `isLoopbackDirectRequest` (`:305`) only trusts same-host requests with no
`x-forwarded-for`. ngrok/LAN traffic always carries forwarded headers, so remote
callers cannot impersonate the mesh. That protects the *gated* routes — it does
nothing for the wildcard proxy routes, which have no gate to bypass in the first place.

---

## Proposed per-contributor auth fix (ranked)

The fix is to make the spawn proxy routes obey the same per-contributor,
per-course gate that already protects the rest of 3470. No new auth system is
needed — reuse `resolveDashboardUserCached` + `userCanAccessCourse`.

### Fix 1 — Gate the build/agent proxy on course access (closes #1, #2, #3) — do first

Add a middleware *in front of* the wildcard proxy mounts that:
- extracts the course code from the path (these routes are
  `/api/build/<verb>/<courseCode>`, `/api/v2/...`, etc. — parse the trailing
  segment, or re-mount as `/api/build/:verb/:courseCode` so the existing
  `app.param('courseCode')` gate fires automatically — the cleaner option);
- resolves the dashboard user (`resolveDashboardUserCached`), 401 if none;
- denies unless `user.role === 'admin' || userCanAccessCourse(user, courseCode)`,
  403 otherwise;
- preserves the same-host loopback bypass so mesh/agent callbacks keep working.

Re-mounting with a named `:courseCode` is preferable to a regex parse: it routes
the spawn endpoints through the *exact* enforcement path already audited and
trusted for the rest of the app, eliminating drift.

### Fix 2 — Forward `Authorization` through `proxyCourseBuilder` (`:1144`)

Mirror `proxyOrchestrator`: pass `req.headers.authorization` to 3471. Required so
the downstream service can make its own decisions and so audit logs attribute the
spawn to a contributor.

### Fix 3 — Defence-in-depth on 3471 (`course-builder-api.cjs`)

3471 should not assume it is unreachable. Bind it to `127.0.0.1` only (so it is
reachable solely via the 3470 proxy / same host), and/or add its own
`app.param('courseCode')` gate + a shared-secret check on the proxy hop. Today a
direct hit on `localhost:3471/api/build/*` from anything on the box is
unauthenticated; if 3471 is ever bound to `0.0.0.0` or tunnelled, it is wide open
independent of 3470.

### Fix 4 — Course-scope the orchestrator generate path (#4)

`POST /api/courses/:courseCode/generate` (orchestrator 3456) validates course
existence but not contributor access. Apply the same gate, or route it through
3470's gated proxy rather than exposing 3456 directly.

### Already-correct (no change needed)

- `app.param('courseCode')` gate — the model fix; extend its coverage, don't replace it.
- `gender-prep/start`, `insight-discovery`, `audit-archive`, `release-notes` —
  already gated (per-course or admin). Verify they stay behind the gate after any refactor.

---

## Verification notes

- Auth helpers: `requireAdmin` (`:266`), `requireDashboardUser` (`:281`),
  `resolveDashboardUser` (`:316`) / `…Cached` (`:339`), `userCanAccessCourse`
  (used at `:365`), loopback bypass `isLoopbackDirectRequest` (`:305`).
- Central gate: `app.param('courseCode', …)` `production-api.cjs:355-375`.
- Wildcard proxy mounts (the gap): `production-api.cjs:1171-1182`;
  proxy fn `proxyCourseBuilder` `:1144` (no auth forwarded);
  `proxyOrchestrator` `:1186` (auth forwarded — the pattern to copy).
- 3471 has no auth primitives (grep for `app.param`/`requireAdmin`/JWT in
  `course-builder-api.cjs` returns nothing).
- Spawn sites: `gender-prep/start` body `production-api.cjs:9056+`;
  agent spawn lib `services/course-builder/lib/agent-spawner.cjs:20-104`.
