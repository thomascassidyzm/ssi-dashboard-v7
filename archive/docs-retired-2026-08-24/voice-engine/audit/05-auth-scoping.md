# Audit 05 — Auth + Course Scoping

**Scope (single security item):** a contributor must not be able to URL-hop into a course
they are not assigned to. Broader unauthenticated-endpoint concerns are PARKED (see one-liner
at the end). Persona: a community course leader ("Richard leads Macedonian for French speakers")
with a team of helper contributors; the course needs ≥2 distinct human voices.

**Verdict (headline):** Course-scoping is **enforced on the client only**. The server has a
helper for it (`userCanAccessCourse`) that is **defined but never called**. Any logged-in
dashboard user — and for most routes, any anonymous caller — can read and mutate **any** course
by changing the `:courseCode` in the URL. The client filters the course *list* but does not block
direct navigation to an unassigned course.

---

## 1. The current model

### 1.1 Two parallel user models (live simultaneously)

| Model | Table | Read by | Role field | Course field |
|---|---|---|---|---|
| **Legacy** (primary today) | `dashboard_users` | client `useAuth`, `/api/auth/me`, session path | `role ∈ {recorder, editor, admin}` | `courses` JSONB: `"*"` or `["mkd_for_cat", …]` |
| **New** (JWT path) | `learners` | `verifySupabaseJWT` (server) | derived: `admin` if `platform_role='ssi_admin'` or `educational_role='god'`, else `user` | `dashboard_courses` array → `"*"` or list |

`dashboard_users` schema (`database/migrations/20260304_dashboard_auth.sql`):

```sql
CREATE TABLE dashboard_users (
  email TEXT PRIMARY KEY,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'recorder' CHECK (role IN ('recorder','editor','admin')),
  courses JSONB NOT NULL DEFAULT '"*"',   -- NOTE: default is ALL courses
  voice_id TEXT,
  invited_by TEXT, invited_at TIMESTAMPTZ,
  updated_by TEXT, updated_at TIMESTAMPTZ
);
```

RLS (`20260610_drift_capture_dashboard_auth_rls.sql`): service-role full access; an authenticated
user may `SELECT` **only their own row** (`email = auth.jwt()->>'email'`). The dashboard backend
uses the service key, so RLS does not constrain the API — it only stops a learner reading the
roster directly via Supabase.

> ⚠️ Default `courses = '"*"'`. Any `dashboard_users` row created **without** an explicit
> `courses` value (e.g. a manual insert, or any future code path that omits it) silently grants
> **all courses**. Invite paths do set `courses`, but the schema default is fail-open.

### 1.2 How `courses[]` gets assigned

- **Admin invite (legacy):** `POST/PUT /api/auth/invite` → `handleInvite` (admin-only). Requires a
  non-empty `courses` array; writes the `dashboard_users` row.
- **Self-serve invite codes (the leader's path):** `POST /api/auth/invite-codes/generate`
  (gated by `requireDashboardUser`). A non-admin may generate a code **only** for `role !== 'admin'`
  and **only** for courses they themselves hold (`courses.filter(c => !userCourses.includes(c))`
  must be empty). The helper later calls `POST /api/auth/invite-codes/redeem` (public) with the code
  + their email, which creates their Supabase Auth account and `dashboard_users` row with the code's
  `courses`/`role`. **This is the one place a leader can grow their team.**
- **Vercel duplicate:** `api/auth/invite.js` is a second, S3-`users.json`-backed copy of the admin
  invite (admin-gated). Stale/secondary path; the live system uses `dashboard_users`.

### 1.3 `voice_id` auto-generation (`human_{email}_{lang}`)

Both invite paths compute, for non-admins:

```js
const sanitizedEmail  = email.split('@')[0].replace(/[^a-z0-9]/gi,'_').toLowerCase();
const primaryLanguage = courses[0]?.split('_')[0] || 'unknown';   // TARGET lang of FIRST course
const voiceId = role !== 'admin' ? `human_${sanitizedEmail}_${primaryLanguage}` : null;
```

So it is `human_{email-local-part}_{first-course-target-lang}` — e.g. helper `maria@x.com` first
assigned `mkd_for_cat` → `human_maria_mkd`. Notes for the team scenario:
- It keys off the **email local part** (not full email) → two helpers `maria@a.com` and
  `maria@b.com` on the same target language **collide** to the same `voice_id`.
- It uses only `courses[0]` → a helper assigned to two different-target courses gets one voice_id
  bound to the first; the second course's recordings would be filed under the "wrong" language tag.
- `voice_id` is just a label; nothing links it to who may upload (see §2 — uploads aren't gated).

---

## 2. Endpoint table — server-side course-membership enforcement

`userCanAccessCourse(user, courseCode)` exists (production-api.cjs ~L260) but **grep shows zero
call sites**. `requireAdmin`/`requireDashboardUser` check *identity/role*, never *which course*.
So even the auth'd routes do not scope to a course.

Legend: **none** = no auth at all; **admin** = `requireAdmin` (any course); **dashUser** =
`requireDashboardUser` (any course); **course-scoped** = checks `:courseCode` membership.
**No route anywhere is course-scoped.**

### Course-scoped data/mutation routes (`/api/production/:courseCode/*`) — the URL-hop surface

| Method | Route | Server enforcement |
|---|---|---|
| GET | /api/production/:courseCode/stats · /info · /introductions · /presentation/:legoId | **none** |
| GET | /api/production/:courseCode/manifest · /manifest/validate · /pending-manifest | **none** |
| POST | /api/production/:courseCode/manifest/generate | **none** |
| POST | /api/production/:courseCode/status · /pricing-tier | **none** |
| GET/POST | /api/production/:courseCode/flags · /flags/update · /flags/bulk-update · /flags/delete | **none** |
| GET/POST/DELETE | /api/production/:courseCode/audio-flags (+ /resolve, /bulk-delete, /delete-orphaned) | **none** |
| **DELETE** | /api/production/:courseCode/phrases/:phraseId · POST /phrases/batch-delete | **none** |
| PATCH | /api/production/:courseCode/phrase/:phraseId · /lego/:legoId · POST /lego/:legoId/mark-new | **none** |
| DELETE | /api/production/:courseCode/seed/:seedNumber | **none** |
| GET | /api/production/:courseCode/seeds · /legos · /progress · /lego/:legoId/basket · /seed/:seedId/baskets | **none** |
| GET | /api/production/:courseCode/script-view · /learning-journey(/search) · /recording-script · /recording-optimizer · /frankenstein-demo | **none** |
| GET/POST | /api/production/:courseCode/feedback (+ /aggregated, /resolve, /stats) | **none** |
| GET | /api/production/:courseCode/audio-metadata · /audio-stats · /shared-audio-status | **none** |
| GET | /api/production/:courseCode/audio/:uuid/url · /audio/:uuid/exists · /audio/by-text | **none** |
| **POST** | **/api/production/:courseCode/recording/upload** (the core contributor write) | **none** |
| GET/POST | /api/production/:courseCode/recording/queue · /claim · /release | **none** |
| GET/POST | /api/production/:courseCode/regeneration/queue · /trigger · /trigger-all | **none** |
| GET/POST | /api/production/:courseCode/audio-pipeline/* (plan, start, status, cancel, retry, missing, sync-s3, fix-orphan-legos, …) | **none** |
| GET/POST/DEL | /api/production/:courseCode/export-state · /export-legacy(-with-state) · /publish-manifest · /verify-s3 · /deploy-audio/* | **none** |
| POST/GET | /api/production/:courseCode/gender-prep/* | **none** |
| POST | /api/audio/regenerate-role/:courseCode · /regenerate-single/… · /regenerate-presentation/… · /regenerate-presentations/:courseCode · /link-presentation-audio/:courseCode | **none** |
| POST | /api/audio/regenerate-phrase/:courseCode/:phraseId | **admin** (identity only, not course) |
| GET | /api/courses/:courseCode/stats · /voice-config · PUT/PATCH /voice-config(/:role) | **none** |
| PATCH | /api/courses/:courseCode/platform-status | **none** |
| GET | /api/stats/:courseCode · /api/production/:courseCode (production layout data) | **none** |
| GET | /api/pods/:courseCode · /api/pods/:courseCode/:slug | **none** |
| GET | /api/production/:courseCode/seed-phrases-preview | **none** |
| POST | /api/production/voices/register-human (no :courseCode; anyone can register any voice_id/email) | **none** |

### Routes that DO have (identity-level) auth — for contrast

- `admin`: all `/api/admin/*` (agents, pm2, audit, db-health, decomposition, pod-explainer,
  insight-discovery, release-notes), `/api/auth/invite`(PUT), `/api/auth/users`(GET/DELETE),
  `/api/auth/invite-codes`(GET), `/api/auth/generate-code`, `/api/auth/invite-dashboard`,
  `/api/admin/pods/*`, `/api/admin/canonical-*`. (Note: a few `/api/admin/*` like `agents`,
  `system`, `pm2`(GET), `setup-remote`, `system-health` are **none**.)
- `dashUser`: `/api/auth/invite-codes/generate` only.
- public-by-design: `/api/auth/login`, `/redeem`, `/me`, `/logout`, `/health`.

### The Vercel `api/` duplicates (`api/production/[courseCode]/…`)

`manifest.js`, `audio-metadata.js`, `script-view.js`, `flags/*`, `feedback/*`, `audio/[uuid]/url.js`,
`audio-pipeline/plan.js` — **none** verify a JWT or course membership. These are serverless copies
of the above. The live client targets the ngrok `production-api.cjs` via `getApiUrl()`, so these are
a secondary exposure, but if `popty.app`'s `/api/*` functions are deployed they are equally open.

---

## 3. Client routes — course-membership enforcement

Router guard (`src/router/index.js` `beforeEach`, L533–552): sets title, allows `meta.public`,
calls `initAuth()`, and **only** checks `isAuthenticated.value` → redirect to Login if not. **It
never inspects `to.params.courseCode`.** So a logged-in helper typing
`/production/mkd_for_cat/script` (or `/recording`, `/pipeline`, `/seeds`, `/course/<code>`, etc.)
loads it regardless of assignment.

| Client route (course-scoped) | Guard |
|---|---|
| /production/:courseCode and all children (overview, seeds, text, phrase-qa, pipeline, **recording**, script, recording-studio, feedback, recording-optimizer, qa-review, pods, pods/:slug, canonical/:slug) | auth-only (no course check) |
| /course/:courseCode (CourseManager) · /courses/:courseCode (CourseEditor) | auth-only |
| /validate/:courseCode · /courses/:code/progress · /quality/:courseCode/* · /monitor/:courseCode · /courses/:courseCode/compile | auth-only (most lack even `requiresAuth`; caught only by the global guard) |

Where course-scoping *does* appear (list-level cosmetics only, trivially bypassed by URL):
- `useCourses.js` `filterAccessibleCourses` → `courses.filter(c => canAccessCourse(c.code))`.
- `CourseBrowser.vue` filters the library by `canAccessCourse(c.course_code)`.
- `UserManagement.vue` limits the course picker to `accessibleCourses` for non-admins.

`canAccessCourse(courseCode)` (useAuth.js): admin → true; else membership in `dashboardUser.courses`
(`'*'` or array). Correct logic — just never used as a navigation gate, and never enforced server-side.

---

## 4. Smallest coherent fix

Two insertions. Together they (a) close the URL-hop server-side for every `:courseCode` route and,
as a side effect, add authentication to the currently-open course-scoped routes; (b) stop the
client from rendering an unassigned course.

### (A) One server-side middleware — `production-api.cjs`

Add a `courseCode` param middleware so every route carrying `:courseCode` is gated by identity +
membership in one place. Reuse the existing helpers (`requireDashboardUser`, `userCanAccessCourse`).

Insertion point: immediately **after** `requireDashboardUser` is defined (after L294), before any
routes:

```js
// Gate every :courseCode route: must be a dashboard user AND assigned to that course.
app.param('courseCode', async (req, res, next, courseCode) => {
  const user = await requireDashboardUser(req, res)   // 401 if no/invalid token
  if (!user) return                                   // response already sent
  if (!userCanAccessCourse(user, courseCode)) {       // '*' or list membership
    return res.status(403).json({ error: `No access to course ${courseCode}` })
  }
  req.dashboardUser = user
  next()
})
```

Notes / caveats to verify on wiring:
- `app.param` fires for **all** routes with `:courseCode`, including `/api/admin/decomposition-audit/:courseCode`
  (already `requireAdmin` inside; admins pass membership via `'*'`, so no regression) and
  `/api/audio/*/:courseCode`. Confirm no legitimately-public `:courseCode` route exists — none found.
- `/api/production/voices/register-human` has **no** `:courseCode`, so add `requireDashboardUser`
  to that handler directly (one line) if voice registration should be gated.
- This makes the previously-anonymous course routes require a token. The client already holds a
  Supabase session; ensure the production-data composables attach `Authorization: Bearer <token>`
  (today only admin-style calls do). This is the one behavioural ripple to test.

### (B) One client route guard — `src/router/index.js`

In the existing `beforeEach`, after the `isAuthenticated` check (after L549), add:

```js
const courseCode = to.params.courseCode || to.params.code
if (courseCode) {
  const { canAccessCourse } = useAuth()
  if (!canAccessCourse(courseCode)) {
    return next({ name: 'CourseBrowser' })   // or a 'Not authorised' view
  }
}
```

(`canAccessCourse` is already exported from `useAuth`; `accessibleCourses`/admin `'*'` handled inside.)

---

## 5. Model gaps that block the team scenario

- **No leader-vs-helper distinction.** Roles are flat: `editor` and `admin` (`recorder` retired
  2026-04-21, still accepted for old rows). There is **no course owner/leader concept** — "Richard"
  is just the first editor on `mkd_for_cat`; any editor on a course is equal to any other. No
  record-only vs edit-only tier for helpers (recorder retirement removed the only "record but don't
  edit" option). Every helper who can record can also edit/delete seeds, phrases, manifests.
- **Can an editor see other users?** No. `GET /api/auth/users` and edit/delete are admin-only, so a
  leader cannot view or manage their own team roster. **Can an editor add users?** Yes, but only via
  `invite-codes/generate` — and only `editor`-or-lower codes for courses they already hold (server
  enforces this; this part is sound). So a leader can *grow* a team but cannot *see, edit, or remove*
  it — there is no per-course team-management surface for a non-admin.
- **Voice identity is weak for multi-voice courses.** `voice_id` derives from email-local-part +
  first course's target language (§1.3): two helpers with the same local part collide; a helper on
  two courses is mis-tagged on the second. The ≥2-distinct-voices requirement works only if helpers
  have distinct local parts and one course each. Upload routes don't bind `voice_id` to the caller,
  so provenance is self-asserted (`provenance.recordedBy` is free text in `recording/upload`).
- **Fail-open default.** `dashboard_users.courses` defaults to `'"*"'` — any row created without an
  explicit course list grants everything.

---

**PARKED (one line):** Beyond course-hop, the majority of `/api/production/**`, `/api/audio/**`,
`/api/pods/**`, `/api/courses/**` and several `/api/admin/**` routes currently require **no
authentication at all** (anonymous read+mutate, incl. phrase/seed deletion and recording upload) —
fix (A) closes the course-scoped subset; the non-`:courseCode` ones need their own `requireAdmin`/`requireDashboardUser`.
