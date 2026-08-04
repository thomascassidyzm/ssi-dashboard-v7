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

## 2026-07-11 — phonology gate wired into shared TTS retry path

**Move:** ported the take-g whisper phonology gate (whisper-cli language auto-detect, re-roll
suspect takes) from `tools/render-take-g.cjs` into `services/tts-service.cjs`'s
`generateWithRetry`, so every xAI call site (phase8 course renders, regenerate routes, pods)
re-rolls a render whose detected spoken language is English (or an explicit suspect) instead of
the steered language, and fails the item after the retry budget rather than persisting a
wrong-language clip.

**Better:** the ita_for_eng backlog pass (~2,700 items on xAI ara/leo) would otherwise render
ungated — the take-g header documents xAI slipping into English phonology *even with*
`language:'it'` sent; zero-tolerance bar says such a clip must never be written.
**Simpler:** one choke point instead of per-call-site gating — the measurement is the exact
detectClipLang mechanic already proven on the 163-group ita take-g pass (0 phonology fails).
**Cheaper (total):** ~60 lines reusing installed whisper-cli/ggml-small; re-rolls cost fractions
of a cent; a bounded 2-way semaphore keeps detection off the render critical path. Skips cleanly
(logged once) when whisper is absent; `XAI_PHONO_GATE=0` opts out.

**Searched & rejected:**
- Generate ungated + post-pass whisper audit — worse: bad audio links to learners immediately;
  cleanup needs a deletion plan (approval-gated) per clip.
- Gate per call site in phase8 only — simpler nowhere: misses regenerate-single/-phrase/-role
  and pod paths the "all xAI renders" intent covers.
**Search width:** visible-options
**Decided by:** agent (executing Tom's approved backlog brief, which assumed the gate already
covered all xAI renders — this makes that assumption true)

## 2026-07-23 — declick by DSP repair, not TTS re-roll

**Move:** the regenerated ita_for_eng "Come stai?" clip's end click (a −9dBFS mouth-click
transient baked into the raw xAI render, 70ms before EOF — the 8ms boundary fade was applied
and can't reach it) was fixed by re-processing the STORED mastered clip: trim just before the
click, re-fade, pad, re-encode, new id + S3 key, relink (`tools/declick-tail.cjs`). Future
renders are protected by a tail-click gate (`detectTailClick` in audio-processor) beside the
rescue tool's phonology gate, and the last unfaded cut path (phase8 `spliceAudio`) got the
boundary fade.

**Better:** learner hears clean audio now, verified numerically (tail RMS →10→0, detector
clean), and the defect class is gated for every future rescue render.
**Simpler:** one detector function shared by the gate and the repair tool; repair reuses the
existing ffmpeg→lame pipe and the rescue tool's new-id/relink doctrine.
**Cheaper (total):** zero TTS spend (a re-roll costs money and needs an approved plan; DSP is
free) and no approval round-trip for the live fix.

**Searched & rejected:**
- TTS re-roll of the clip through the rescue tool — cheaper leg fails: paid render + approval
  gate for a defect that sits entirely in 70ms of tail the DSP can cut losslessly.
- Longer end fade (e.g. 100ms) in ANTI_CLICK_FADE — better leg fails: eats real speech decay
  on tight clips and still misses clicks deeper than the fade window.
- Universal trailing silenceremove in mastering — better leg fails: deletes word-final stop
  releases (closure silence + short burst pattern-matches a click).
**Search width:** visible-options
**Decided by:** agent

## 2026-07-24 — child voices: block at the synthesis chokepoint, heal the stored casts

**Move:** Tom heard a CHILD's voice on ita_for_eng wine phrases (staging). Root cause: the
pre-2026-06-30 KNOWN colour pool included en-GB-MaisieNeural (Azure's child voice); 86dc1617
collapsed the pool to Tom's clone but the per-pod casts persisted in
`listening_pods.speakers` were never re-coloured, so regen paths kept faithfully re-selecting
Maisie (tha_for_eng regenerated child clips 2026-07-16, two weeks after the pool fix). Fix in
two layers: (1) `CHILD_VOICE_IDS` hard block inside `tts-service.generate()` — the one
chokepoint every provider path passes through — throwing non-retriable (403); (2)
`tools/rescue-child-voice-clips.cjs` purges child voices from every stored cast (→ Tom's
clone, per the single-known-voice ruling) and regenerates all reachable child-voice clips
delete-first (new id per device-cache doctrine) through the tail-click + phonology gates.

**Better:** the policy ("no kids' voices, ever") is now enforced where voice params actually
arrive, so no stored state — casts, voice_config, future tools — can resurrect a child voice;
every learner-reachable child clip re-rendered and re-gated.
**Simpler:** one Set + one assert at one chokepoint, instead of auditing every caller; the
rescue reuses the proven rescue-wrong-language doctrine wholesale.
**Cheaper (total):** ~250 short English clips of TTS (pennies) under Tom's explicit order;
the blocklist costs nothing at runtime and kills the whole defect class.

**Searched & rejected:**
- Fixing only the reported clips — better leg fails: 38 courses carried the same cast debris
  and tha_for_eng proved live regen paths still selected Maisie.
- Full pod recolour (`pod-recolour --apply` fleet-wide) — cheaper leg fails NOW: it would
  null/regen every non-Tom known clip across 54 courses (thousands of renders) to fix a
  defect that lives in one voice id; left as a flagged decision for Tom (casts still carry
  legacy adult colour voices — Sonia/Libby/Hollie/Ryan — which violate the single-known-voice
  ruling but harm nobody while linked audio plays).
- Deleting the ~600 unreachable child-voice orphan rows — deletion of generated assets needs
  its own plan + approval; left in place, counted in the sweep log.
**Search width:** visible-options
**Decided by:** agent (executing Tom's urgent-defect brief, verbatim policy: "NO kids voices ever")

## 2026-07-29 — schema truth renders from a live dump

**Move:** implemented the founder's schema-snapshot doctrine ("current schema is truth,
migrations lie") in the explainer machinery: the `--live` refresh now dumps the public schema
(tables + matviews) from `information_schema` over the `.env.psql` direct connection and stamps
it into the pack; the Pipeline page renders that dump as "Live schema", demoting the
code-reference scan to an explicitly-labelled cross-check; the ruling itself ships as
founder-framed prose (`tools/explainer/rulings/docs/schema.md`) in the Rulings layer of
How & Why. Same commit: APML renamed to its real expansion (AI Projects Markup Language /
Agent Protocol Markup Language) and re-framed everywhere as architectural lineage superseded
by the rate of model improvement, not live core architecture.

**Better:** schema on the docs surface can no longer lie by omission — `family_members` (live
since 07-10, no migration ever committed) is exactly the class of table the dump catches and
the migrations pile misses; unreferenced-but-live tables are surfaced as their own list.
**Simpler:** rides the existing `--live`/Update-docs path and the existing `.env.psql` +
`pg` pattern (`tools/refresh-round-index.cjs`); no new endpoint, no new secret, honest
degradation to a "no dump yet" note where `.env.psql` is absent.
**Cheaper (total):** two `information_schema` queries per Update-docs press; kills the
standing cost of hand-reconciling migrations against reality.
**Searched & rejected:**
- Rendering from `supabase/schema.sql` pg_dump snapshots — simpler leg fails: per-machine,
  not in git, needs PG17 pg_dump provisioned everywhere; the pooler query needs nothing new.
- Deriving schema from migration files — the ruling names this the lie.
- Keeping code-references as the headline truth — better leg fails: a live unreferenced
  table (the `family_members` proof) is invisible to it; kept as cross-check only.
**Search width:** visible-options
**Decided by:** Tom (ruling 2026-07-29); implementation shape by agent

## 2026-07-29 — watson-1 optional parallel Popty environment

**Move:** stood up the Popty backend (pm2: `orchestrator` :3456 + `production-api` :3470,
Camberley's exact process set) on watson-1 and added an optional "Watson VM" entry to the
popty.app environment switcher pointing at `https://watson-1.tail4968cb.ts.net:8443`
(Tailscale Funnel → :3470). Camberley untouched and still the default.

**Better:** a second, always-on Linux environment Deborah/Aran can opt into with one dropdown
pick — no Tailscale account or client needed (Funnel serves a public HTTPS URL).
**Simpler:** identical process set and pm2 convention as Camberley; shared Supabase/S3 means
identical data by construction; one additive switcher entry, defaults untouched.
**Cheaper (total):** the VM already runs 24/7 for the command surface; no ngrok subscription
(funnel is free); no new frontend deploys beyond the entry.

**Searched & rejected:**
- ngrok fallback on the VM — no authtoken provisioned on this box; would also add a paid/second
  tunnel where the tailnet already provides one. Kept only as the honest fallback if Tom
  declines to enable Funnel.
- Funnel on :443 — already carries the tailnet-only serve → :4317 command surface; clobbering
  it fails Simpler. :8443 coexists.
- cloudflared quick tunnel — URL is ephemeral per restart; a switcher entry needs a stable URL.

**Deliberately NOT running on watson-1:** nightly audit-log archive (`AUDIT_ARCHIVE_CRON`
unset = disabled by default), `insight-discovery --write` cron (never installed), no TTS/
generation triggered. Supabase writes are additionally RLS-blocked until the real
`SUPABASE_SERVICE_KEY` is provisioned (current `.env` uses the public anon key as a stand-in,
clearly commented).

**Search width:** visible-options
**Decided by:** agent (environment + optionality decided by Tom, 2026-07-29 verbatim in the
commission)

## 2026-07-29 — VAD Lab breadth pipeline runs credential-free (REST + proxy + JS extractor)

**Move:** the language-breadth re-sample (founder ruling: more languages in tour/browse/record)
was built as `tools/prosody-lab/extend-lab-breadth.mjs` — course_audio read via Supabase REST
(anon key), clips fetched through the public `saysomethingin.app/api/audio/:id` proxy, features
extracted by the parity-verified JS extractor (`vadProsody.js`) under Node with ffmpeg decode.
The 2026-07-28 study anchors (AUC tables, `median_scale`) are deliberately NOT recomputed:
new pairs score on the study's fixed scale, exactly as the record-yourself flow already does.

**Better:** runs on any machine — watson-1 has no `.env.psql`, no S3 creds, no numpy, and the
canonical pipeline (pg + S3 + prosody.py) is unrunnable there; this reached the same estate
through the two public read paths and shipped 122 new pairs (ita/zho/por/kor/eus + spa/fra).
**Simpler:** no new credentials provisioned, no sudo-gated python deps; one extractor (the JS
mirror) instead of keeping two in lockstep for this run.
**Cheaper (total):** zero secret-distribution and zero infra; the proxy and REST reads are
already public surface.

**Searched & rejected:**
- Provisioning `.env.psql`/S3 to watson-1 — fails Simpler/Cheaper (secret distribution for a
  read-only job the public paths already serve) and needs Tom's scp.
- Full Node port of prosody.py's report stage (recompute anchors over the merged set) — fails
  Better: the anchors are the study's published finding; churning them with a different (though
  parity-verified) extractor weakens the honesty story for zero learner-facing gain.
**Search width:** visible-options
**Decided by:** agent (breadth itself ruled by Tom 2026-07-29)

## 2026-07-29 — clean-mastered VAD Lab xAI clips live as committed static files

**Move:** clean copies (no PRE_COMPRESS, no make-up gain; true-peak limit + anti-click fades
kept) go to `public/vad-lab-clean/<clip_id>.mp3` + manifest in THIS repo, served statically by
the dashboard; the VAD Lab A/B affordance appears automatically when the manifest exists.
Rendering script `tools/prosody-lab/remaster-vad-lab-clean.cjs` (186 xAI/clone sides, 14
voices) is dry-run-gated and pending a run on a machine with `XAI_API_KEY` (watson-1 has no
vault access). `normalizeAudioClean()` is additive — Kai's default chain is bit-identical.

**Better:** honest separation — production `course_audio`/S3 untouched, clip set clearly
VAD-Lab-only, before/after listenable in place.
**Simpler:** no new S3 prefix, no new serving route in the learning-app (Kai's domain), no
auth: the dashboard already ships static lab data the same way.
**Cheaper (total):** ~186 small mp3s (~5-8MB) of repo weight vs new bucket policy + proxy route
+ cross-repo deploy; zero moving parts at runtime.

**Searched & rejected:**
- `vad-lab-clean/` S3 prefix behind the existing audio route — the route serves by course_audio
  id from the private bucket; a prefix needs a new serving path in ssi-learning-app (cross-repo,
  Kai-owned) — fails Simpler.
- Re-mastering from raw pre-masters instead of re-rendering — no raws are retained anywhere;
  physical floor, so clean copies are fresh takes and the UI says so ("listen for the noise
  floor, not the exact delivery").
**Search width:** visible-options
**Decided by:** agent (clean-mastering itself ruled by Tom 2026-07-29)

---

## 2026-07-31 — Popty phase-2 parallel-run door: Funnel + real service key + dropdown entry

watson-1's production-api (:3470) is now a real, selectable popty.app environment:
Tailscale Funnel `https://watson-1.tail4968cb.ts.net:8443` (public internet), real
`SUPABASE_SERVICE_KEY` (sb_secret format, from the sentinel credential already on the VM)
so writes work, and the EnvironmentSwitcher entry renamed "Watson VM" → "SSi Machine
(Cloud)". Camberley entry and default untouched — nothing changes for anyone who doesn't
pick the new entry. One-writer guard: the scheduler belt (`AUDIT_ARCHIVE_CRON=off` pinned
in the systemd unit) stays on; only the credential belt is deliberately removed, which is
what "selectable environment with working writes" means. Write path verified with a
metadata write+revert on a stopped February `build_jobs` row.

**Better:** Aran gets a working cloud environment today; user-triggered writes work while
background jobs stay Camberley-only.
**Simpler:** Funnel was already enabled (no ngrok, no new tunnel identity); the service key
already existed on the VM (`~/.ssi-sentinel.env`) — zero new secrets moved between machines.
**Cheaper (total):** €0 marginal, no ngrok dependency for the VM door, one label edit on
the frontend.

**Searched & rejected:**
- ngrok-on-VM fallback — unnecessary (Funnel already live) and the reserved domain
  `ssi-machine.ngrok.app` is held by Camberley; starting it on the VM would steal the
  domain and cut everyone over — the opposite of parallel-run.
- Vault pull via `.env.psql` — no `.env.psql` on watson-1; the sentinel key is the same
  secret with zero provisioning steps.
**Search width:** visible-options
**Decided by:** agent (phase-2 step founder-approved)

---

## 2026-08-01 — Org/workplace pricing line added to canonical PRICING.md

**Move:** added the new orgs/workplaces product line — £15/seat/month or £150/seat/year,
standard pricing with no volume scaling, card upfront via Paddle, seats reset monthly,
cancel anytime, 30-day free trial covering all languages, seat model the same as for
teachers in schools, in-place trial upgrade available at any time — to `docs/PRICING.md`,
which stays the single canonical price list (founder ruling, 2026-07-29).
**Better:** the new product line is documented where every other price already lives, so
billing/product code has one place to trace prices back to.
**Simpler:** extended the existing table + added one section in the existing doc's own
style, no new file.
**Cheaper (total):** zero — pure documentation, no new source of truth to maintain.
**Searched & rejected:** n/a — founder-specced figures, documentation-only task.
**Search width:** visible-options
**Decided by:** Tom (founder ruling, 2026-08-01)

## 2026-08-03 — APML definition corrected: no "Adaptive Pedagogy", no fabricated gate philosophy

**Move:** the 2026-07-29 rename (`5de3cb55`) got the acronym half right (AI Projects Markup
Language) but invented an alt-reading ("Agent Protocol Markup Language") and a philosophy
paragraph ("the course is data plus gates, not code plus opinions…") that Tom never said.
Separately, `ssi-learning-app/apml/{design,core,schools}/*.apml` carried a wholly different
fabrication ("Adaptive Pedagogy Markup Language") in their header comments. Replaced the "what
APML is" section in `tools/explainer/rulings/docs/apml.md` (source of the compiled
`/stocktake/apml` and How & Why "APML — the lineage" pages) with Tom's own 2026-08-03 words:
AI Projects Markup Language, a way for agents to stay locked in to intent, originally compiled
to JavaScript, now largely superseded by models writing code directly from APML/YAML, still
good for capturing intent. Recompiled `src/explainer/pack.json` from the corrected source.
Fixed the three ssi-learning-app header comments to match.
**Better:** the dashboard states the founder's actual definition instead of a worker's
invention; no more fabricated claims about "machine gates" enforcing course shape.
**Simpler:** single-paragraph correction at the one hand-maintained source file; the compiled
pack and rendered pages follow automatically via the existing compile step.
**Cheaper (total):** zero new surface — same drift-gated compile pipeline, corrected input.
**Searched & rejected:** n/a — factual correction of founder-flagged fabrication.
**Search width:** visible-options
**Decided by:** Tom (founder correction, 2026-08-03)

---

## 2026-08-04 — Popty API supervision: systemd units + a cron watchdog that outlives the supervisor

**Move:** committed both service units to `ops/systemd/` (`popty-production-api`, and a new
`popty-course-builder-api` — 3471 had no unit at all), added `OOMScoreAdjust=500` to both, and
installed `ops/watchdog/popty-services-watchdog.sh` on the user crontab every 2 minutes. Full
incident write-up: `docs/incident-popty-api-outage-2026-08-04.md`.
**Better:** the 2026-08-04 outage was not an unsupervised process — 3470 already had
`Restart=always`. A machine-wide OOM killed the API *and then the systemd user manager itself*,
so the restart policy had nobody to execute it. More systemd alone would not have caught this;
the watchdog runs under `crond`, outside the failure domain that died, and resurrects the manager
via a `loginctl` linger toggle.
**Simpler:** two declarative unit files plus one 50-line POSIX shell script, in the same shape as
the `command-surface` watchdog already on this box. No new daemon, no PM2, no supervisor stack.
**Cheaper (total):** one curl per service per 2 minutes; zero running cost; and it deletes the
ad-hoc `nohup` habit that made "who started this?" unanswerable.
**Searched & rejected:** system units with `User=tomcassidy` (the cleaner fix — command-surface
already does this — but needs `sudo`, refused for this account); a systemd user timer as the
watchdog (dies with the manager, so it cannot cover the actual failure); PM2 (a second supervisor
to keep alive, no better against OOM).
**Search width:** visible-options
**Decided by:** agent (reversible ops change, no spend)
