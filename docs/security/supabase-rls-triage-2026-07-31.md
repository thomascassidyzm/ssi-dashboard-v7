# Supabase security triage + RLS-noise plan — 2026-07-31

Project `swfvymspfxmnfhevgdkg`. Read-only investigation (Management API SQL, no writes).
Companion migration DRAFT (not applied): `supabase-rls-migration-draft-2026-07-31.sql`.

**Frame (Tom's ruling):** RLS is judicious — course content is deliberately world-readable.
Goal: (a) fix genuine gaps, (b) make the advisor warnings stop by making the public posture
*explicit* (RLS on + permissive read policy) rather than "RLS off".

## Ground truth established

- Auth is **Supabase Auth** — `auth.uid()` resolves; the existing policies were written for
  this model and the helper fns `is_ssi_admin()` / `is_god_user()` exist and work
  (god is a deprecated alias of ssi_admin, 2026-06-16).
- **All writes to content tables go through the service key** (dashboard services, Vercel API),
  which **bypasses RLS entirely** — enabling RLS can never break server-side writes.
- **The browser player + /schools dashboard read Supabase directly** with the anon key
  (logged-out) or the user's JWT (`authenticated` role). Tables the browser touches directly:
  course content, `course_round_index` (matview — RLS n/a), and crucially
  `schools`, `classes`, `groups`, `govt_admins`, `entitlement_grants`, `pod_legos`,
  `listening_pod*`, `shared_audio`.
- 17 public tables have RLS off; 9 of those also have policies written (currently inert).

## The genuine gaps (bucket 1)

| # | Table | Current state | Risk |
|---|-------|--------------|------|
| G1 | `audio_pass_requests` | RLS off, **anon has full CRUD + TRUNCATE** | Anyone with the publishable anon key can read, forge, or wipe the audio-pass queue. Only dashboard tooling (service key) legitimately uses it. |
| G2 | `pod_legos` (19.7k rows) | RLS off, **anon has full CRUD + TRUNCATE** | Anon can rewrite/truncate pod content. Browser needs SELECT only. |
| G3 | `classes` (59) | RLS off, policies inert, **authenticated has INSERT+UPDATE grant** | Any logged-in learner can modify any class row. |
| G4 | `schools` (21) | RLS off, policies inert, authenticated SELECT | Any logged-in user reads all schools (incl. admin_user_id). |
| G5 | `govt_admins` (26) | RLS off, policies inert, authenticated SELECT | Any logged-in user reads the govt-admin roster. |
| G6 | `entitlement_grants` (2) | RLS off, no policies, authenticated SELECT | Any logged-in user reads all grants. Low sensitivity (courses per school). |
| G7 | `invite_codes` (165) | RLS off, 9 inert policies incl. a `USING (true)` SELECT | **Mitigated today**: anon/authenticated have NO table grants, so PostgREST can't touch it. But the inert `invite_codes_select USING(true)` is a landmine — if RLS were ever enabled without dropping it, and grants restored, all codes go world-readable. |

`role_change_audit` checked: RLS **on**, admin-only read policy — fine, no action.

### The one real decision (schools/classes landmine)

The inert `schools_select` / `classes_select` policies cover teacher-own, school-admin-own and
tag-membership — but the **/schools dashboard reads schools and classes across a govt-admin's
group subtree** (`groups.path LIKE …` → `schools.in(group_id)` → classes). That pattern is NOT
covered by the written policies. This is almost certainly *why* RLS is off on these tables: the
policies predate the govt-admin/groups model.

So: **enable-as-is would close G3/G4 but break the govt-admin dashboard view.** The draft
migration extends both SELECT policies with a subtree clause (govt_admin whose `group_id`
is an ancestor of the school's group) + `is_ssi_admin()` before enabling. Needs one smoke-test
of /schools as a govt admin on staging/after apply.

## Bucket 2 — deliberately public content (clear the warning, change nothing)

All of these already grant anon+authenticated SELECT only; writes are service-key.
Standard pattern: `ENABLE ROW LEVEL SECURITY` + permissive `USING (true)` SELECT policy for
anon+authenticated. Access is unchanged; posture becomes explicit; both advisor warnings clear.

| Table | Policies today | Action |
|-------|----------------|--------|
| `course_audio`, `course_legos`, `course_practice_phrases`, `course_seeds`, `shared_audio` | **Already have exactly the right policies** (anon read, authenticated read, service ALL) — just inert | `ENABLE RLS` only. Zero-risk: the active policy set equals current behaviour. |
| `canonical_seeds`, `canonical_seed_translations`, `listening_pods`, `listening_pod_sentences` | None | `ENABLE RLS` + add read policy (anon, authenticated) |

No content table needs public WRITE — verified all write paths (course-builder, audio pipeline,
pod-lego-extractor) use `SUPABASE_SERVICE_KEY`.

Note: `course_round_index` is a materialised view — RLS doesn't apply; it inherits nothing here
and the learner read path is unaffected.

## Bucket 3 — dead/duplicate policies

- `course_legos` / `course_practice_phrases` each carry a duplicate anon SELECT policy
  ("Anon can read…" + "Public users can view…") — drop one, cosmetic.
- `invite_codes` `invite_codes_select USING(true)` — **drop** (the landmine above). The other
  8 role-scoped invite policies look intentional and consistent with the current role model —
  keep them (they become live guards when RLS is enabled; app flows go through server API with
  service key, so no impact).
- `is_god_user()`-based policies: functional (aliases ssi_admin) — keep, cosmetic rename later.

## Apply order (in the draft SQL)

1. **Phase A — gaps, safe now**: G1 revoke anon/auth on `audio_pass_requests` + enable RLS;
   G2 revoke writes on `pod_legos` + enable RLS + read policy; G5 enable RLS on `govt_admins`
   (existing policies cover the app's self-read); G7 drop the true-select policy + enable RLS
   on `invite_codes`.
2. **Phase B — needs the subtree policy extension**: `schools`, `classes` (extend then enable),
   `groups` (enable + authenticated-read policy — org tree, needed broadly by the dashboard),
   `entitlement_grants` (enable + authenticated-read interim policy; tighten to school-staff
   scope later if desired).
3. **Phase C — content noise**: enable RLS on the 9 content tables (+ read policies where missing).

After apply: re-run the Supabase advisor; expected result = zero "RLS Disabled in Public" and
zero "Policy Exists RLS Disabled" findings.

**Nothing has been applied.** Awaiting Tom's approval; Phase B additionally wants a
/schools smoke test as govt admin + teacher after apply.
