# Popty — public funnel exposure and route gates

**2026-09-20 · branch `cs/415-popty-funnel-route-gates` · NOT merged, NOT deployed**

## The answer, first

Before tonight's commits, **an anonymous caller anywhere on the internet could deploy code to
watson-1, restart any pm2 service, kill every Claude agent on the box and read its host
telemetry** — no token, no tailnet membership, one curl. They could also create courses, stop
running builds, push course-configs to their git remote, and read the whole course estate.

What they could **not** do: touch anything under `/api/production/:courseCode/*` (all 123 of those
routes, including every money-spending `regenerate-*` route), or any `/api/admin/*` route that
already called `requireAdmin`. Those were gated then and are gated now.

The catastrophic set is fixed on this branch. The data-exposure set is left for Tom.

## The funnel fact

`tailscale funnel` is on for port 8443 and proxies to `http://localhost:3470` —
`https://watson-1.tail4968cb.ts.net:8443`. Tailscale **Funnel** is public-internet exposure, not
tailnet-only.

Observed, unauthenticated, from the public path (`--resolve` onto the public DERP ingress
185.40.234.172, i.e. genuinely off-tailnet, not the tailnet route):

| Request | Status |
|---|---|
| `GET /api/health` | 404 |
| `GET /api/auth/me` | 401 |
| `GET /api/courses` | **200, 84,822 bytes of course data** |
| `GET /api/deploy/history` | **200, full deploy history of watson-1** |
| `GET /api/production/fra_for_eng/info` | 401 (course-scope gate) |

`POST /api/deploy` was never probed — it deploys. The reachability is proven by its sibling
`GET /api/deploy/history`, which shares the same registration block and the same (absent) gate,
and by reading `proxyOrchestrator` at `services/production-api.cjs:1681`.

**The funnel must stay on.** It is the production API base URL for everything that is not on
watson-1's own loopback: `src/services/api.js:41` returns it for `popty.app`,
`src/components/EnvironmentSwitcher.vue:105` lists it as the production backend,
`src/views/admin/voicelab/labApi.js:22` uses it as `CLOUD_BACKEND`, `src/components/RecoveryPanel.vue:108`
falls back to it, `src/services/recordingApi.js` documents recording traffic over it, and
`services/builds-router.cjs:10` serves Android test builds through it to external testers. Turning
it off takes out the deployed dashboard, Voice Lab, the recording booth and build distribution at
once. The answer was never "close the funnel"; it is "gate the control plane", which is what this
branch does.

## `isLoopbackDirectRequest` — settled empirically

`services/production-api.cjs:375` grants same-host trust to a request on loopback with no
`x-forwarded-for` and no `x-real-ip`, and its comment asserts forwarded traffic always carries
those headers. **The comment is correct.** Captured with `tcpdump -i lo` on port 3470 while a
genuine off-tailnet request came through the funnel, verbatim:

```
GET /api/production/fra_for_eng/info?probe=PUBLICPROBE HTTP/1.1
Host: watson-1.tail4968cb.ts.net:8443
User-Agent: curl/8.18.0
Accept: */*
Tailscale-Funnel-Request: ?1
X-Forwarded-For: 62.238.49.218
X-Forwarded-Host: watson-1.tail4968cb.ts.net:8443
X-Forwarded-Proto: https
```

and, for comparison, a real same-host call in the same capture:

```
GET /api/production/fra_for_eng/info?probe=LOOPPROBE HTTP/1.1
Host: 127.0.0.1:3470
User-Agent: curl/8.18.0
Accept: */*
```

The tailnet path (not funnelled) also carries `X-Forwarded-For: 100.108.9.37` plus
`Tailscale-User-Login` identity headers.

So `isLoopbackDirectRequest` returns **false** for everything arriving through the funnel, and the
behavioural oracle agrees: the same funnelled request that would be waved through if the predicate
were fooled got **401** from the `app.param('courseCode')` gate. **Every route that trusts
`isLoopbackDirectRequest` is safe from the internet.** That is also what makes the loopback-bypass
gate added below safe: same-host mesh callers keep working and no internet caller can imitate one.

No temporary route was added to the live service — the capture answered it without touching
running code.

## What was fixed (this branch, not merged)

`services/shared/control-plane-gate.cjs` (new) + wiring in `services/production-api.cjs`.

**Admin, or same-host** (`requireAdminOrLoopback`) — these do not return data, they act:

`GET /api/services` · `POST /api/services/:name/restart` · `GET /api/services/:name/logs` ·
`POST /api/deploy` · `POST /api/deploy/repair` · `GET /api/deploy/history`

These six proxy to the orchestrator on :3456, **which has no authentication of any kind** — no
`requireAdmin` exists anywhere in `services/orchestration/orchestrator.cjs`. `POST /api/deploy`
there runs `git pull` and restarts services (L11107); `POST /api/services/:name/restart` runs
`pm2 restart <name>` (L10956). `proxyOrchestrator` does not forward `x-forwarded-for`, so the
orchestrator saw every funnelled request as a bare loopback call.

**Admin** (`requireAdmin` on the handler's first line, matching their already-gated siblings such
as `/api/admin/pm2/fix`):

`GET /api/admin/agents` · `POST /api/admin/agents/kill` · `POST /api/admin/agents/kill-all`
(SIGTERMs every `claude` process and force-kills iTerm2) · `GET /api/admin/system` ·
`GET /api/admin/pm2` · `GET /api/admin/system-health`

**Same-host only** (`requireSameHost`): `POST /api/production/internal/emit` — every caller in the
repo is a `http://localhost:3470` fetch (`services/course-builder/context.cjs:42`,
`services/course-builder/briefs/detective.cjs:53`).

**Any signed-in dashboard user, or same-host** (`requireDashboardUserOrLoopback`) — writes an
editor legitimately performs, so deliberately *not* `requireAdmin`:

`POST /api/courses/create` · `POST /api/mission-control/jobs/:jobId/{stop,resume,clear}` ·
`POST /api/production/course-configs/push` · `PATCH /api/production/voices/:voiceId/status`

Blast radius checked for each: every browser caller of these is a `fetch()`
(`src/views/CourseManager.vue:1568`, `src/views/production/TextGeneration.vue:1268`,
`src/views/CourseManager.vue:1741`, `src/components/production/export/StageDeployPanel.vue:322`,
`src/components/production/LegacyExportDialog.vue:410`), and
`src/services/authFetch.js` wraps `window.fetch` to attach the Supabase token to every `/api/…`
request, with the axios interceptor in `src/services/api.js:122` doing the same. A signed-in user
of any role still passes. **The one way these break is a panel used while signed out** — one line
each to revert if that turns out to be true.

### The test that proves it

`services/shared/control-plane-gate.test.cjs` — a real express app over a real loopback socket
(same method as `content-edit-gate.test.cjs`), because the distinction lives in the socket and the
headers. Cases: same-host caller passes; anonymous caller carrying the observed funnel header
`x-forwarded-for: 62.238.49.218` gets 401; authenticated non-admin gets 403; admin passes;
`internal/emit` answers loopback and refuses the funnel outright. Plus a drift test naming every
route that must carry a gate, which fails the moment one loses it.

Seen failing on the pre-fix file and passing on the post-fix file, both times, by restoring
`git show HEAD:services/production-api.cjs` over the working copy and re-running:
13 of 18 red before the first commit → 18 green after; 6 of 24 red before the second → 24 green
after. Also ran the four suites that touch `production-api.cjs`
(`content-write-surfaces`, `publish-zero-duration-guard`, `course-learner-status-agreement`,
`popty-identity`): 32 green. The estate suite was not run and is not verification.

## Needs Tom

1. **The funnel itself.** Tom's call. Evidence above: it is load-bearing for popty.app, Voice Lab,
   recording and Android builds. Recommendation: leave it on, keep gating routes.
2. **Anonymous course-data reads.** `GET /api/courses` (84 KB), `/api/languages`,
   `/api/production/course-stats`, `/api/canonical-seeds`, `/api/pod-scripts` (unreleased story
   text), `/api/docs/list` + `/api/docs/:slug`, `/api/estate-map`, `/api/explainer/pack`,
   `/api/ops/staleness`, `/api/production/voices`. All read-only; none gated. Is the course estate
   public data or not? One ruling closes all eleven.
3. **Declined to gate: `GET /api/production/audio/:uuid/stream` and `/download/:bucket`.** The
   stream URL is used as a bare `<audio src>` (`src/services/api.js:1800`,
   `src/composables/useStoredClip.js:57`, `src/composables/useScriptPlayer.js:93`), so the
   authFetch wrapper never decorates it and a gate would silently kill playback. It hands signed S3
   URLs to anonymous callers who know a uuid. Needs a signed-link design, not a middleware.
4. **`app.use('/api/checkpoint')` (L11526)** proxies unauthenticated to course-builder on :3471,
   which "has no auth of its own" (the repo's own words at `production-api.cjs:1592`). Not gated
   tonight because I could not establish its caller set. The sibling proxies
   (`/api/build/*`, `/api/v2/*`, …) all take `requireProxyCourseAccess`; this one does not.
5. **`/api/recording/*` and `/api/builds/*` are unauthenticated by design** — "the link IS the
   identity", stated in the code at `production-api.cjs:540` and `services/builds-router.cjs`.
   Recording it here so nobody "fixes" it later. Worth a decision only if a token has leaked.
6. **`POST /api/auth/invite-codes/redeem` and `POST /api/auth/login` have no rate limit.** An
   8-character code from a 32-character alphabet is ~40 bits — not brute-forceable over HTTP at
   any sane rate, but there is nothing stopping an attempt either. Low priority.
7. **Credential shapes seen, values never read or quoted:** `.env` at the repo root carries
   `ADMIN_SECRET=<set>` (used by `POST /api/admin/setup-remote`, which fails closed when unset —
   `production-api.cjs:11855`). That route writes `/etc/sudoers.d/ssi-reboot` with
   `NOPASSWD: /sbin/reboot`. No key, token or JWT is reproduced anywhere in this document, and none
   was found exposed on a public route.
8. **Route count.** The brief said 212 routes; I count **221** `app.<verb>(…)` registrations in
   `production-api.cjs`, plus 7 mounted routers (`/api/basket-lab` read-only, `/api/recording`,
   `/api/builds`, `/api/checkpoint`, and three under `/api/production/:courseCode/*`). The table
   below is all 221. The gap is counting method, not a missing set.

## The Astra correction (#414·H), checked

**Astra is right about `app.param`, and the "148 ungated" heuristic figure is not a vulnerability
count.** `app.param('courseCode', …)` at `services/production-api.cjs:427` is registered on the app
itself, so Express runs it before the handler of *every* directly declared route whose path
contains `:courseCode` — not only the four mounted sub-routers. It resolves a dashboard user
(`resolveDashboardUserCached`), then admits by casting first and grants second
(`castingRights.courseAccessVerdict`), 401 with no identity and 403 without access. That is 123 of
221 routes gated in one place, confirmed behaviourally: an anonymous funnelled
`GET /api/production/fra_for_eng/info` returns 401. The real exposure was never the course routes;
it was the control plane, which has no `:courseCode` to be gated by.

Astra's three follow-ups, answered:

**1. Course access is not operation permission — confirmed, and it bites the TTS spend.**
`contentEditGate` **attributes, it does not authorise**: it resolves an editor identity, refuses
with 401 when it cannot find one, records a `content_edit_events` row, and never consults role
(`services/shared/content-edit-gate.cjs`). It also runs in `observe` mode by default
(`CONTENT_EDIT_IDENTITY_MODE`), where an undeclared same-host caller is recorded as
`undeclared-loopback` rather than refused. So for course content the *only* authority check is the
course gate — and the course gate admits a cast voice (a recorder/artist) by casting alone.

The deletion routes *are* listed in `services/shared/content-write-surfaces.cjs`
(`DELETE …/phrases/:phraseId`, `POST …/phrases/batch-delete`, `PATCH …/phrase/:phraseId`), so they
carry identity — but nothing stops a non-editor with course access from calling them.
`POST …/audio-flags/bulk-delete` is **not** in that manifest at all: it deletes `audio_flags` rows,
not course content, so the gate never sees it.

The sharpest instance is the money family. The file states the posture itself at line 6517 —
*"Admin-only — it costs TTS"* — and applies it to exactly two of six:

| Route | Extra authority beyond course access |
|---|---|
| `POST /api/audio/regenerate-phrase/:courseCode/:phraseId` | `requireAdmin` |
| `POST /api/audio/regenerate-lego/:courseCode/:legoId` | `requireAdmin` |
| `POST /api/audio/regenerate-role/:courseCode` | **none** — and this one re-renders a whole role |
| `POST /api/audio/regenerate-presentations/:courseCode` | **none** |
| `POST /api/audio/regenerate-presentation/:courseCode/:legoId` | **none** |
| `POST /api/audio/regenerate-single/:courseCode/:audioUuid` | **none** |

Not internet-reachable — the course gate holds — so this is an insider/over-broad-grant question,
which makes it Tom's, not mine. **I declined to gate them**: editors and recordists use audio regen
from the UI, and a `requireAdmin` here would 403 the people whose job it is. Recommendation:
make the four match their two siblings, or drop the admin requirement from all six and say the
posture is course access. What is indefensible is the current split, which reads as an accident.

**2. Object-to-course binding — checked, and it is sound.** Every one of the four binds the object
to the authorised course in the query itself, so a phrase id from another course deletes nothing:

- `DELETE …/phrases/:phraseId` — `.eq('course_code', courseCode).eq('id', phraseId)` (L3673)
- `POST …/phrases/batch-delete` — `.eq('course_code', courseCode).in('id', phraseIds)` (L3714)
- `POST …/audio-flags/bulk-delete` — `.eq('course_code', courseCode).in('audio_uuid', batch)` (L3547)
- `PATCH …/phrase/:phraseId` — both the pre-read and the update carry `.eq('course_code', courseCode)`

Astra is right that the query is the only boundary (service key, RLS bypassed); the queries hold.

**3. `dashboard_users.courses` defaults to a wildcard.** Confirmed against the schema snapshot
(`ssi-learning-app/supabase/schema.sql:9414`): `courses jsonb DEFAULT '"*"'::jsonb NOT NULL`, with
`role text DEFAULT 'recorder'`. A row inserted without an explicit course list is granted **every
course**, and is then indistinguishable from a deliberate wildcard grant. `userCanAccessCourse`
treats `'*'` as all-courses, so the DB default is fail-open even though the gate's own comment
says a missing list should deny. Worth an audit of existing rows and a `DEFAULT '[]'::jsonb`.

## The 221 routes

Verdicts: **GATED** (a gate runs before the handler acts) · **GATED (FIXED)** (was open, gated on
this branch) · **UNGATED-BUT-HARMLESS** (liveness/echo, read-only by intent) · **NEEDS-TOM**
(open, and whether it should be is his call).

Every path containing `:courseCode` is gated in one place — `app.param('courseCode')` at
`production-api.cjs:427` — which resolves a dashboard user and checks casting-then-grants for that
course. That is 123 of the 221, including the whole `regenerate-*` money family.

| Method | Path | Line | Gate it actually calls | Verdict | Note |
|---|---|---|---|---|---|
| GET | `/api/production/:courseCode/pods/coverage` | 504 | app.param('courseCode') L427 → course-scope + userCanAccessCourse | GATED |  |
| POST | `/api/auth/login` | 564 | authVerifyLoginCode (email + emailed code) | UNGATED-BUT-HARMLESS | the login route; refuses without a valid code |
| POST | `/api/auth/generate-code` | 581 | requireAdmin | GATED |  |
| GET | `/api/auth/me` | 598 | jwtInline | GATED |  |
| POST | `/api/auth/invite-dashboard` | 621 | requireAdmin | GATED |  |
| POST | `/api/auth/invite` | 693 | requireAdmin via handleInvite (L686) | GATED | heuristic missed it: the gate is inside handleInvite |
| PUT | `/api/auth/invite` | 694 | requireAdmin via handleInvite (L686) | GATED | same handler |
| GET | `/api/auth/users` | 780 | requireAdmin | GATED |  |
| DELETE | `/api/auth/users` | 794 | requireAdmin | GATED |  |
| POST | `/api/auth/logout` | 815 | own bearer token only | UNGATED-BUT-HARMLESS | deletes the session named by the caller's own token |
| POST | `/api/auth/invite-codes/generate` | 831 | requireDashboardUser | GATED |  |
| GET | `/api/auth/invite-codes` | 886 | requireAdmin | GATED |  |
| POST | `/api/auth/invite-codes/redeem` | 906 | jwtInline | GATED |  |
| GET | `/api/production/health` | 1017 | none | UNGATED-BUT-HARMLESS | liveness |
| GET | `/api/production/schema/validate` | 1029 | none | NEEDS-TOM | anonymous read of DB schema-drift detail; no write, but it describes the database |
| GET | `/api/courses` | 1050 | none | NEEDS-TOM | 84,822 bytes of course data to an anonymous internet caller (both registrations) |
| GET | `/api/estate-map` | 1299 | none | NEEDS-TOM | the estate's own map: released status, voices of record, serving pod, anonymous |
| GET | `/api/courses/:courseCode/stats` | 1412 | app.param('courseCode') L427 → course-scope | GATED |  |
| PATCH | `/api/courses/:courseCode/platform-status` | 1426 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/stats/:courseCode` | 1508 | app.param('courseCode') L427 → course-scope + resolveDashboardUser, requireProxyCourseAccess, loopbackTrust, userCanAccessCourse | GATED |  |
| ALL | `/api/build/*` | 1686 | requireProxyCourseAccess, mw:requireProxyCourseAccess, proxyCourseBuilder) | GATED |  |
| ALL | `/api/v2/*` | 1687 | requireProxyCourseAccess, mw:requireProxyCourseAccess, proxyCourseBuilder) | GATED |  |
| ALL | `/api/golden/*` | 1688 | requireProxyCourseAccess, mw:requireProxyCourseAccess, proxyCourseBuilder) | GATED |  |
| ALL | `/api/phrases/*` | 1689 | requireProxyCourseAccess, mw:requireProxyCourseAccess, proxyCourseBuilder) | GATED |  |
| ALL | `/api/legos/*` | 1690 | requireProxyCourseAccess, mw:requireProxyCourseAccess, proxyCourseBuilder) | GATED |  |
| ALL | `/api/agents` | 1691 | requireProxyCourseAccess, mw:requireProxyCourseAccess, proxyCourseBuilder) | GATED |  |
| ALL | `/api/agents/*` | 1692 | requireProxyCourseAccess, mw:requireProxyCourseAccess, proxyCourseBuilder) | GATED |  |
| ALL | `/api/orchestrator/*` | 1693 | requireProxyCourseAccess, mw:requireProxyCourseAccess, proxyCourseBuilder) | GATED |  |
| ALL | `/api/qa/*` | 1694 | requireProxyCourseAccess, mw:requireProxyCourseAccess, proxyCourseBuilder) | GATED |  |
| ALL | `/api/course/*` | 1695 | requireProxyCourseAccess, mw:requireProxyCourseAccess, proxyCourseBuilder) | GATED |  |
| ALL | `/api/seeds/*` | 1696 | requireProxyCourseAccess, mw:requireProxyCourseAccess, proxyCourseBuilder) | GATED |  |
| GET | `/health` | 1743 | none | UNGATED-BUT-HARMLESS | liveness |
| GET | `/api/ops/staleness` | 1767 | none | NEEDS-TOM | ops telemetry, anonymous |
| GET | `/api/explainer/pack` | 1797 | none | NEEDS-TOM | generated explainer content, anonymous |
| POST | `/api/explainer/refresh` | 1809 | requireAdmin | GATED |  |
| GET | `/api/languages` | 1842 | none | NEEDS-TOM | course/language inventory, anonymous |
| GET | `/api/courses` | 1871 | none | NEEDS-TOM | 84,822 bytes of course data to an anonymous internet caller (both registrations) |
| POST | `/api/courses/create` | 1913 | requireDashboardUserOrLoopback (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| GET | `/api/courses/:courseCode/voice-config` | 2004 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/courses/:courseCode/voice-config/resolved` | 2028 | app.param('courseCode') L427 → course-scope | GATED |  |
| PUT | `/api/courses/:courseCode/voice-config` | 2040 | app.param('courseCode') L427 → course-scope | GATED |  |
| PATCH | `/api/courses/:courseCode/voice-config/:role` | 2060 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/voices/discover/:language` | 2083 | none | NEEDS-TOM | anonymous caller drives Azure/xAI voice-list lookups; no spend, but an outbound call per request |
| GET | `/api/courses/:courseCode/seed-phrases-preview` | 2107 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/voices/preview` | 2142 | requireDashboardUser | GATED |  |
| GET | `/api/mission-control/jobs` | 2223 | none | NEEDS-TOM | running build/audio jobs and their messages, anonymous |
| POST | `/api/mission-control/jobs/:jobId/stop` | 2373 | requireDashboardUserOrLoopback (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| POST | `/api/mission-control/jobs/:jobId/resume` | 2415 | requireDashboardUserOrLoopback (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| POST | `/api/mission-control/jobs/:jobId/clear` | 2449 | requireDashboardUserOrLoopback (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| GET | `/api/services` | 2501 | requireAdminOrLoopback (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| POST | `/api/services/:name/restart` | 2502 | requireAdminOrLoopback (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| GET | `/api/services/:name/logs` | 2503 | requireAdminOrLoopback (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| POST | `/api/deploy` | 2504 | requireAdminOrLoopback (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| POST | `/api/deploy/repair` | 2506 | requireAdminOrLoopback (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| GET | `/api/deploy/history` | 2507 | requireAdminOrLoopback (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| GET | `/api/production/course-stats` | 2512 | none | NEEDS-TOM | per-course content counts, anonymous |
| GET | `/api/production/:courseCode/stats` | 2533 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/info` | 2556 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/status` | 2616 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/pricing-tier` | 2697 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/introductions` | 2751 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/presentation/:legoId` | 2776 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/manifest` | 2847 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/manifest/generate` | 2906 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/manifest/validate` | 2946 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/export-legacy` | 2974 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/cancel-legacy-audio` | 3176 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/legacy-audio-status` | 3192 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/flags` | 3211 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/flags/update` | 3246 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/audio-flags` | 3302 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/flagged-items` | 3322 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/audio-flags` | 3441 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/audio-flags/:audioUuid/resolve` | 3477 | app.param('courseCode') L427 → course-scope | GATED |  |
| DELETE | `/api/production/:courseCode/audio-flags/:audioUuid` | 3503 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/audio-flags/bulk-delete` | 3528 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/audio-flags/delete-orphaned` | 3564 | app.param('courseCode') L427 → course-scope | GATED |  |
| DELETE | `/api/production/:courseCode/phrases/:phraseId` | 3657 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/phrases/batch-delete` | 3698 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/flags/delete` | 3748 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/flags/bulk-update` | 3779 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/feedback` | 3824 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/feedback/aggregated` | 3880 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/feedback/resolve` | 3983 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/feedback/stats` | 4041 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/audio-metadata` | 4083 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/shared-audio-status` | 4283 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/audio-stats` | 4355 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/pods/:courseCode` | 4403 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/pods/:courseCode/:slug` | 4454 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/admin/pods/:courseCode/:slug/visibility` | 4496 | app.param('courseCode') L427 → course-scope + requireAdmin | GATED |  |
| GET | `/api/pod-scripts` | 4655 | none | NEEDS-TOM | pod scripts (unreleased story text), anonymous |
| GET | `/api/pod-scripts/:courseCode` | 4722 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/admin/pods/generate` | 4809 | requireAdmin | GATED |  |
| PATCH | `/api/admin/pod-sentences/:id` | 4832 | requireAdmin | GATED |  |
| GET | `/api/admin/pods/:courseCode/audio-plan` | 4856 | app.param('courseCode') L427 → course-scope + requireAdmin | GATED |  |
| POST | `/api/admin/pods/:courseCode/generate-audio` | 4877 | app.param('courseCode') L427 → course-scope + requireAdmin | GATED |  |
| GET | `/api/admin/canonical-pods` | 4894 | requireAdmin | GATED |  |
| GET | `/api/admin/canonical-pods/:slug` | 4925 | requireAdmin | GATED |  |
| PATCH | `/api/admin/canonical-pods/:id` | 4951 | requireAdmin | GATED |  |
| GET | `/api/canonical-seeds` | 4974 | none | NEEDS-TOM | canonical seed corpus, anonymous |
| PATCH | `/api/admin/canonical-seeds/:id` | 4995 | requireAdmin | GATED |  |
| GET | `/api/docs/list` | 5031 | none | NEEDS-TOM | documentation index from the DB, anonymous |
| GET | `/api/docs/:slug` | 5046 | none | NEEDS-TOM | full document body by slug, anonymous; slug is a DB key, not a path, so no traversal |
| GET | `/api/production/audio/:uuid/stream` | 5078 | none | NEEDS-TOM — DECLINED TO GATE | used as a bare <audio src>, so the authFetch wrapper never decorates it; gating it silently kills playback |
| GET | `/api/production/:courseCode/audio/:uuid/url` | 5121 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/audio/:uuid/exists` | 5162 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/audio/by-text` | 5176 | app.param('courseCode') L427 → course-scope + jwtInline | GATED |  |
| POST | `/api/production/:courseCode/recording/upload` | 5883 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/recording/queue` | 5934 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/recording/claim` | 5961 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/recording/release` | 6015 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/regeneration/queue` | 6068 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/regeneration/trigger` | 6111 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/regeneration/trigger-all` | 6192 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/audio/status` | 6295 | none | UNGATED-BUT-HARMLESS | pipeline status summary |
| POST | `/api/audio/regenerate-role/:courseCode` | 6308 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/audio/regenerate-single/:courseCode/:audioUuid` | 6482 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/audio/regenerate-presentation/:courseCode/:legoId` | 6499 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/audio/regenerate-phrase/:courseCode/:phraseId` | 6518 | app.param('courseCode') L427 → course-scope + requireAdmin | GATED |  |
| POST | `/api/audio/regenerate-lego/:courseCode/:legoId` | 6538 | app.param('courseCode') L427 → course-scope + requireAdmin | GATED |  |
| POST | `/api/audio/regenerate-presentations/:courseCode` | 6556 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/audio/link-presentation-audio/:courseCode` | 6590 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/audio/reuse-plan/:courseCode` | 6612 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/audio/reuse-coverage/:courseCode` | 6631 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/audio/reuse-apply/:courseCode` | 6648 | app.param('courseCode') L427 → course-scope + requireAdmin | GATED |  |
| GET | `/api/audio/reuse-run/:runId` | 6663 | none | UNGATED-BUT-HARMLESS | one reuse run's log |
| GET | `/api/production/voices` | 6712 | none | NEEDS-TOM | voice inventory incl. provider voice ids, anonymous |
| GET | `/api/production/voices/:voiceId` | 6740 | none | NEEDS-TOM | one voice record, anonymous |
| POST | `/api/production/voices/register-human` | 6767 | requireDashboardUser | GATED |  |
| PATCH | `/api/production/voices/:voiceId/status` | 6829 | requireDashboardUserOrLoopback (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| POST | `/api/production/internal/emit` | 6890 | requireSameHost (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| GET | `/api/production/:courseCode/audio-pipeline/plan` | 6916 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/audio-pipeline/start` | 6966 | app.param('courseCode') L427 → course-scope + requireDashboardUser | GATED |  |
| GET | `/api/audio/health` | 7003 | none | UNGATED-BUT-HARMLESS | liveness |
| GET | `/api/production/:courseCode/audio-pipeline/status` | 7014 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/audio-pipeline/cancel` | 7062 | app.param('courseCode') L427 → course-scope + requireDashboardUser | GATED |  |
| POST | `/api/production/:courseCode/audio-pipeline/retry` | 7079 | app.param('courseCode') L427 → course-scope + requireDashboardUser | GATED |  |
| POST | `/api/production/:courseCode/audio-pipeline/link-and-recount` | 7103 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/audio-pipeline/missing` | 7135 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/audio-pipeline/ungeneratable` | 7328 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/audio-pipeline/orphan-legos` | 7391 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/audio-pipeline/fix-orphan-legos` | 7443 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/audio-pipeline/sync-s3` | 7546 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/seeds` | 7699 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/legos` | 7736 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/progress` | 7752 | app.param('courseCode') L427 → course-scope | GATED |  |
| PATCH | `/api/production/:courseCode/lego/:legoId` | 7764 | app.param('courseCode') L427 → course-scope | GATED |  |
| DELETE | `/api/production/:courseCode/seed/:seedNumber` | 7788 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/lego/:legoId/basket` | 7806 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/seed/:seedId/baskets` | 7831 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/script-view` | 7989 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/mapping/:rowId` | 8416 | app.param('courseCode') L427 → course-scope + resolveDashboardUser | GATED |  |
| GET | `/api/production/:courseCode/learning-journey` | 8571 | app.param('courseCode') L427 → course-scope + resolveDashboardUser | GATED |  |
| GET | `/api/production/:courseCode/learning-journey/search` | 8630 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/lego/:legoId/mark-new` | 8723 | app.param('courseCode') L427 → course-scope | GATED |  |
| PATCH | `/api/production/:courseCode/phrase/:phraseId` | 8753 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/recording-optimizer` | 8864 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/recording-volumes` | 8935 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/recording-script` | 8961 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/export-state` | 9156 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/export-state` | 9215 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/export-legacy-with-state` | 9269 | app.param('courseCode') L427 → course-scope | GATED |  |
| DELETE | `/api/production/:courseCode/export-state` | 9508 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/pending-manifest` | 9552 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/export-state/manifest` | 9572 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/publish-manifest` | 9609 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/publish-manifest/version` | 9692 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/manifest-diff` | 9728 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/course-configs/status` | 9780 | none | UNGATED-BUT-HARMLESS | git status of the course-configs checkout |
| POST | `/api/production/course-configs/push` | 9792 | requireDashboardUserOrLoopback (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| POST | `/api/production/:courseCode/stage-deploy` | 9818 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/stage-deploy/cancel` | 10018 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/stage-deploy/status` | 10055 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/stage-restart` | 10076 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/stage-restart/cancel` | 10194 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/verify-s3` | 10227 | app.param('courseCode') L427 → course-scope | GATED |  |
| DELETE | `/api/production/:courseCode/verify-s3` | 10486 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/deploy-audio/plan` | 10611 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/deploy-audio/execute` | 10687 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/deploy-audio/new-only` | 10780 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/deploy-audio/new-and-mismatched` | 10874 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/deploy-audio/status` | 10968 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/audio/:uuid/download/:bucket` | 10982 | none | NEEDS-TOM — DECLINED TO GATE | same family; Step4Deploy fetches it, but it is the sibling of the src= route |
| POST | `/api/production/:courseCode/verify-production-durations` | 11033 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/deploy-audio/missing-only` | 11066 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/gender-prep/check` | 11179 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/gender-prep/override` | 11195 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/production/:courseCode/gender-prep/status` | 11212 | app.param('courseCode') L427 → course-scope | GATED |  |
| POST | `/api/production/:courseCode/gender-prep/start` | 11284 | app.param('courseCode') L427 → course-scope + requireDashboardUser | GATED |  |
| GET | `/api/production/:courseCode/gender-prep/flag-count` | 11469 | app.param('courseCode') L427 → course-scope | GATED |  |
| GET | `/api/admin/agents` | 11604 | requireAdmin (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| POST | `/api/admin/agents/kill` | 11648 | requireAdmin (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| POST | `/api/admin/agents/kill-all` | 11695 | requireAdmin (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| GET | `/api/admin/system` | 11729 | requireAdmin (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| GET | `/api/admin/pm2` | 11763 | requireAdmin (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| POST | `/api/admin/pm2/fix` | 11780 | requireAdmin | GATED |  |
| POST | `/api/admin/pm2/restart` | 11798 | requireAdmin | GATED |  |
| POST | `/api/admin/pm2/stop` | 11823 | requireAdmin | GATED |  |
| POST | `/api/admin/pm2/delete` | 11839 | requireAdmin | GATED |  |
| POST | `/api/admin/setup-remote` | 11854 | adminSecret | GATED |  |
| POST | `/api/admin/kill-pid` | 11923 | requireAdmin | GATED |  |
| POST | `/api/admin/git-pull` | 11940 | requireAdmin | GATED |  |
| POST | `/api/admin/kill-apps` | 11972 | requireAdmin | GATED |  |
| GET | `/api/admin/system-health` | 12209 | requireAdmin (added 2026-09-20) | GATED (FIXED) | was ungated and public |
| POST | `/api/admin/restart-machine` | 12249 | requireAdmin | GATED |  |
| GET | `/api/admin/audit-stats` | 12307 | requireAdmin | GATED |  |
| GET | `/api/admin/audit-events` | 12331 | requireAdmin | GATED |  |
| GET | `/api/admin/audit-row` | 12431 | requireAdmin | GATED |  |
| POST | `/api/admin/audit-restore` | 12485 | requireAdmin | GATED |  |
| POST | `/api/admin/audit-cleanup` | 12550 | requireAdmin | GATED |  |
| POST | `/api/admin/audit-archive` | 12626 | requireAdmin | GATED |  |
| GET | `/api/admin/decomposition-audit/:courseCode` | 12682 | app.param('courseCode') L427 → course-scope + requireAdmin | GATED |  |
| POST | `/api/admin/decomposition-backfill` | 12749 | requireAdmin | GATED |  |
| GET | `/api/admin/uptime-summary` | 12926 | requireAdmin | GATED |  |
| GET | `/api/admin/db-health` | 13026 | requireAdmin | GATED |  |
| POST | `/api/insight-discovery/run` | 13213 | requireAdmin | GATED |  |
| GET | `/api/insight-discovery/latest` | 13240 | requireAdmin | GATED |  |
| POST | `/api/release-notes/generate` | 13272 | requireAdmin | GATED |  |
| POST | `/api/release-notes/publish` | 13288 | requireAdmin | GATED |  |
| GET | `/api/release-notes/drafts` | 13306 | requireAdmin | GATED |  |
