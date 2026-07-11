# Decisions log

Append-only. Newest at the bottom. Read the tail before deciding; append after. Doctrine:
`capture-pack/decision-doctrine.md` (search-first Better×Simpler×Cheaper). Entry template:

```markdown
## YYYY-MM-DD — <slug: the move in five words>
**Move:** what was done, one or two sentences, intention level.
**Better:** <fact>. **Simpler:** <fact>. **Cheaper (total):** <fact — build + maintain + run>.
**Searched & rejected:**
- <option> — <the leg it failed, one line>
**Search width:** visible-options | re-levelled | component-redesign | from-scratch | floor-surfaced
**Decided by:** agent | Tom <one-line context if Tom>
```

## 2026-07-09 — Synthesis Studio sampler reads Supabase directly

**Move:** the Result state's "listen to a few" playback sampler (design
`docs/leaderjourney-synthesis-design.md` §2.2 point 4) fetches its sample of freshly-written
`course_audio` rows via a new frontend-only helper (`getRecentHumanAudio` in
`src/services/supabase.js`) that queries `course_audio` directly with the dashboard's existing
anon Supabase client, then resolves each row's playback URL through the existing
`GET /api/production/:courseCode/audio/:uuid/url` signed-URL endpoint (same one ScriptViewer
already uses).

**Better:** the sampler shows real freshly-spliced audio, fulfilling the design's "reality is the
demo" requirement, with S3 signing staying server-side (no new auth surface).
**Simpler:** reuses two patterns already live in this exact file/route — `getAudioMetadata`
already reads `course_audio` columns (id, text, role, s3_key, origin, voice_id, created_at)
directly via Supabase in `src/services/supabase.js:297-316`, and the signed-URL fetch is the
verbatim pattern ScriptViewer uses (`ScriptViewer.vue:1427-1441`).
**Cheaper (total):** zero new backend routes/maintenance; a five-line Supabase `select` versus
extending `synthesis-job.cjs`'s report shape (engine code the design doc explicitly says not to
touch) or adding a new HTTP route (against the brief's "no new backend engine routes").

**Searched & rejected:**
- Extend `synthesis-job.cjs`'s job report to carry the freshly-written audio ids — rejected:
  touches the engine (`services/voice-engine/synthesis-job.cjs`), which the design and the task
  brief scope as untouched; also a real code change to test/verify, not just a read.
- Add a new backend route to list recent audio for a (course, voice) — rejected: brief is
  explicit, "no new backend engine routes," and it would duplicate the existing signed-URL
  endpoint's job.
- Reuse the deleted frankenstein endpoint's `findCourseAudio` service call — rejected: that
  function does a single hardcoded-language lookup by exact text, not "N most recent human
  rows for a voice"; wrong shape, and it's the code being deleted this same session.

**Search width:** visible-options (existing precedent already covered the whole need)
**Decided by:** agent

## 2026-07-11 — Single-course editor lands in the journey, not the console

**Move:** router `beforeEach` now redirects a non-admin authenticated user landing on `Home`
(`/`) straight to `/production/:courseCode/journey` when their `dashboard_users.courses` is an
array of exactly one course. Multi-course editors, admins (courses = `'*'`), and recorders
(already confined to `/record/...` by an earlier block in the same guard) are unaffected. The
full console (`/`, `/courses`, `/production/:courseCode` overview) stays reachable — this only
changes the post-login default destination, mirroring the existing recorder-confinement block
immediately below it in the same function.

**Better:** a single-course leader's first click after OTP is the guided journey they actually
need, not a card-wall requiring an extra hop through `/courses` → click course → land on
ProductionOverview.
**Simpler:** four lines inside the existing `beforeEach`, same shape as the recorder block it
sits next to (`Array.isArray(courses) && courses.length === 1`) — no new route, no new
component, no state beyond what `useAuth()` already exposes.
**Cheaper (total):** zero new surface to maintain; reuses `learner.value.courses` already fetched
on every page load for `canAccessCourse`.

**Searched & rejected:**
- A `LeaderJourney.vue`-side redirect-on-mount — rejected: the Home hub would still render first
  (flash of the card-wall), and it duplicates the courses-length check the router already needs
  for the course-scope gate two blocks down.
- Making `/` itself conditionally render `LeaderJourney` inline — rejected: two components behind
  one path is harder to reason about than a redirect, and breaks the router's existing
  `to.name === 'Home'` mental model used by the recorder block.

**Search width:** visible-options (recorder block was the direct precedent)
**Decided by:** Tom (ruled YES on the deferred fork; implementation detail is agent's)

## 2026-07-11 — Deleted the three orphaned frankenstein-demo S3 objects

**Move:** deleted `demo-splices/demo1.mp3`, `demo-splices/demo2.mp3`, `demo-splices/demo3.mp3`
from `ssi-audio-stage` (the only bucket in use) via a one-off script using the repo's existing
`aws-sdk` v2 client pattern (`services/s3-service.cjs`'s config). Confirmed all three existed
(head-checked) before deleting, deleted via a single `deleteObjects` call, then head-checked again
to confirm all three now 404. No other keys touched.

**Better:** removes the last unreferenced bytes from the Welsh frankenstein-demo, whose code
(the `/frankenstein-demo` endpoint and `RecordingOptimizer.vue`'s hardcoded fetch) was already
deleted in commit `9a8a0604`.
**Simpler:** three known, exact keys — no scan/glob, no heuristic "looks orphaned" logic.
**Cheaper (total):** ~330KB of stage-bucket storage; zero ongoing cost either way, but leaving
dead objects around is a future "what's this for?" tax on whoever audits the bucket next.

**Searched & rejected:**
- Writing a general "find orphaned S3 objects" sweep — rejected: Tom approved deletion of these
  three specific known keys only; a sweep is a different, much riskier, unrequested task (real
  `origin=human`/`course_audio` objects live in the same bucket).

**Search width:** visible-options (keys were named exactly in the deleted code)
**Decided by:** Tom (approved deletion; agent executed surgically)

## 2026-07-11 — Recorder upload auth: verified and reused the existing OTP session, no new model

**Move:** traced the full recorder path end-to-end instead of building a new auth mechanism.
Findings: (1) `production-api.cjs`'s `app.param('courseCode', ...)` gate (commit `44cebf9c`,
"item A, server") already covers `POST /api/production/:courseCode/recording/upload` — verified
live against the running service (`curl` with a simulated non-loopback `X-Forwarded-For`: 401
with no token, matching every other `:courseCode` route). (2) The client's global `window.fetch`
wrapper (`src/services/authFetch.js`, commit `8844f2d6`, "item A, client") already attaches the
Supabase session token to every `/api/...` call, including both live upload call sites
(`useAudioUpload.ts`, `useAutocueState.js`) — neither sets its own `Authorization` header, so the
wrapper's `!headers.has('Authorization')` check fires. (3) The self-serve invite/redeem path
(`POST /api/auth/invite-codes/redeem`, used by `team-router.cjs`'s recorder invite) creates a
**real Supabase Auth account** (`db.auth.admin.createUser`) — a redeemed recorder logs in via the
exact same `supabase.auth.signInWithOtp`/`verifyOtp` flow as an editor or admin. There is no
separate "OTP-only, no Supabase session" recorder tier; `resolvePoptyIdentity` already carries
`role: 'recorder'` + `courses: [...]` through correctly (existing test coverage in
`services/shared/popty-identity.test.js`). The M7 risk note in
`docs/voice-engine/design/integration-map.md` ("verify at integration, not a code edit") is
resolved: verified, not a gap.
**Fix applied:** one real bug found during the trace — `POST /api/auth/invite-codes/redeem`
stored `email` in whatever case the redeemer typed it, but `verifySupabaseJWT`'s later lookup
(`authGetUser(user.email)`) uses the email Supabase itself returns (lowercase-normalised) against
`dashboard_users.email` (a case-sensitive TEXT primary key). A mixed-case redemption would
silently produce a recorder who can never resolve dashboard access again — the exact symptom
"upload endpoint not gated for recorders" would have been diagnosed as. Fixed by lowercasing
`email` once at the top of the redeem handler before every use (existing-user check, insert,
redemption record).

**Better:** a recorder authenticates with the exact flow they already use to log in — no second
credential, no barbaric password/token dance for a volunteer helper, matching the "never favour
security over the contributor's experience" design law.
**Simpler:** zero new auth surface. Reused `resolveDashboardUser` (server) and `authFetch.js`
(client) exactly as built for editors/admins; `userCanAccessCourse`'s array-membership check
already scopes a recorder to only their assigned course(s) — no role-specific branch needed.
**Cheaper (total):** one three-line fix (email casing) instead of a new recorder-token system to
build, document, and maintain.

**Searched & rejected:**
- A dedicated recorder API-token/key issued at invite time — rejected: a second credential
  contradicts "no barbaric auth flows"; the existing Supabase-session model already produces a
  bearer token with zero extra steps for the recorder.
- Reviving the legacy `dashboard_sessions`/login-code path (`authValidateSession`,
  `authGenerateLoginCode`) for recorders specifically — rejected: dead code kept only for
  backwards compat during the Supabase migration; giving one role a different session mechanism
  from everyone else is the "barbaric" outcome, not the fix.
- Full live positive-path test (mint a real invite, redeem with a disposable email, generate a
  session via the Supabase admin API, hit the upload endpoint, clean up) — rejected for this pass:
  touches live Supabase Auth state for a confidence gain the structural 401-proof + existing
  identity-resolution unit tests + full code trace already deliver; the negative-path proof (gate
  fires on this exact route for real network traffic) was the one previously-unverified claim.

**Search width:** re-levelled (M7 was framed as "needs a session story"; tracing the code showed
the story already existed and was already the load-bearing mechanism for editors/admins — the
task re-levelled from "design a new model" to "verify the existing one, fix what it found")
**Decided by:** Tom (ruled YES; agent chose verify-first over building new per doctrine)
# Decision journal

One entry per better×simpler×cheaper go decision. Newest first.

## 2026-07-10 — xAI Italian phonology: whisper re-roll gate, not voice recasting alone

**Context.** Tom caught xAI voices reading Italian cross-language words with English
phonology ('come stai' with English 'come'; phase-3 verify flagged 'stia'→'sti').
Investigation (language-steering pilot, 24 renders): every production render already
sends `language:'it'` and the Italian cast are xAI *library native-it* voices, not
English clones — yet the pilot reproduced English reads on the multilingual presets
(eve/ara) **stochastically, even with `language:'it'` and even in the exact Take-G
`[pause]` text shape**, and the 'stia'→'sti' artifact occurred on the native voice
Enzo. The language param is necessary but not sufficient; the defect is per-render,
not per-voice-config.

**Decision.** Gate at render time: extend render-take-g's existing gate-and-retry
loop with a whisper auto-detect check — a take whose audio detects as the course's
known language (or English) instead of the target fails the attempt and re-rolls.
Plus a choke-point warning in `tts-service.cjs` so no xAI course render can silently
go out as `language:'auto'`.

**Why all three legs.** Better: catches the actual observed failure (stochastic
per-render drift) at the only point it's cheap to fix — before the take is linked
and sliced; recasting voices alone would not have caught Enzo's 'stia'→'sti'.
Simpler: reuses the proven gate-and-retry structure and the whisper tooling already
on the machine for slice verification; no new services, ~40 lines. Cheaper: a
re-roll costs one extra short render (pennies) only when drift is detected, versus
mass re-render or human listening passes after the fact; the clip is already
downloaded for gap measurement, so detection adds one local whisper call.

**Rejected.** (a) "Add the language param" — already present everywhere on the pod
paths; the two `'auto'` fallbacks found were latent, not live. (b) Recast presets to
native voices as THE fix — helps (pilot: no English detections on Enzo) but doesn't
close the stochastic hole; kept as an approval-gated proposal for the eve/ara estate.
(c) SSML/inline language tags — xAI /v1/tts has no such surface (docs verified
2026-07-10).
