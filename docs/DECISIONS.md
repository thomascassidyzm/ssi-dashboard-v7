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

---

## 2026-08-04 (follow-up) — supervise phase 8, and make Linux agent spawning actually work

**Move:** added `ops/systemd/popty-phase8-audio.service` (port 3465), extended the watchdog to
cover it, set `KillMode=process` on all three units, set `SPAWN_MODE=headless` on course-builder,
and replaced an empty `{"error":""}` with a named error. Detail in
`docs/incident-popty-api-outage-2026-08-04.md`.
**Better:** `/audio-stats` 500'd because it hard-depends on phase 8's `/needs` and phase 8 was
never running on watson-1 — supervising it fixes the endpoint rather than papering over the
symptom. Separately, `SPAWN_MODE` being unset meant every dashboard-triggered agent on this Linux
box died instantly with `spawn osascript ENOENT` (a macOS-only path); one env line restores the
whole spawn surface, not just the backfill that surfaced it.
**Simpler:** one more unit file in the shape of the existing two, one extra `check` line in the
watchdog, one `Environment=` line. No new abstraction and no code change to the spawn logic.
**Cheaper (total):** one extra health curl per 2 minutes. Against that: agents that silently
never start, and a 500 whose error body was the empty string, both cost far more in diagnosis time
than they look like they should.
**Searched & rejected:** making `getDirectAudioStats` degrade gracefully when phase 8 is down
(rejected — the pending count would silently disagree with what `/generate` actually processes,
which is the exact drift the `/needs` call was introduced to remove; a loud 500 naming the dead
dependency is more honest); patching `agent-spawner.cjs` to detect Linux and force headless
(rejected for now — the env var is the existing, intended switch, and changing shared spawn logic
under a live dashboard is a bigger blast radius than a unit-file line).
**Search width:** visible-options
**Decided by:** agent (reversible ops change, no spend)

## 2026-08-05 — tail-repair flag mode becomes the DEFAULT, not an env var somebody has to remember

**Move:** flipped `TAIL_REPAIR_MODE`'s default in `services/audio-processor.cjs` from `'repair'`
to `'flag'`, added a load-time log line naming the active mode, and made `tools/declick-tail.cjs`
opt itself back into `'repair'` before it loads the module. `TAIL_REPAIR_MODE=repair` remains the
explicit opt-back-in.
**Better:** the measured case against repair-mode is settled (`d5ad9f2c`, and the memo it cites):
detector precision by ear 9%, 83% of flags vanish under a padding test that cannot remove a real
click, 16/20 fresh TTS renders trip it, and the repair itself removes trailing words — whisper
final-word retention 0.52 for clips bearing its fingerprint vs 0.93 for the rest, p=0.00001. The
defect it chases is ~42x rarer than the one it causes. When the evidence says a behaviour is
wrong, the wrong behaviour should not be what you get by doing nothing. Concretely: `d5ad9f2c`
shipped flag mode default-off, activated by an environment variable set on the render service.
watson-1's phase8 had `TAIL_REPAIR_MODE=flag`, but only in live host config that no artifact
records: a hand-edited systemd *user* unit at `~/.config/systemd/user/popty-phase8-audio.service`
plus a drop-in `…service.d/tail-repair-mode.conf`. It is in no committed file — the repo's own
`ops/systemd/popty-phase8-audio.service` carries neither the variable nor, as it turns out, the
right `WorkingDirectory` (repo says `ssi-dashboard-v7-clean`; the live unit runs the service from
`ssi-dashboard-v7-clean-prod`). The Camberley Mac, which also renders and publishes production
audio, had none of it. So the fix protected exactly one machine, by hand, invisibly, via config
that had already drifted from the version-controlled copy.
**Simpler:** one constant instead of per-machine environment archaeology on every host that ever
renders audio. Reading `/proc/<pid>/environ` to find out whether a render service is mutating
audio is not a thing anyone should have to do; the startup log line replaces it.
**Cheaper (total):** nothing to set, nothing to forget, and no second failure mode where the code
deployed but the variable did not. That failure mode was live: Camberley's `*/15` deploy cron
pulls `main` and restarts, so it would have taken the flag-mode CODE and carried on rendering in
repair mode indefinitely, because a cron cannot carry a hand-set environment variable. With the
default flipped, that same cron completes the fix with no action from anyone.
**Searched & rejected:** committing `Environment=TAIL_REPAIR_MODE=flag` into the systemd unit and
whatever pm2 config Camberley uses (rejected — it fixes the two hosts we currently know about and
leaves the next one to be discovered the same expensive way; it also needs `pm2 restart all
--update-env`, and the dashboard's own `/api/admin/git-pull` restarts *without* `--update-env`, so
the deploy path we have would land the config and not apply it). Reaching Camberley over SSH to
set it live (rejected by Tom — the deploy path is the route, and a live setting no artifact
records is the problem, not the solution). Removing `repairTailDefect` outright (rejected — the
detector's *reporting* is still wanted, `declick-tail.cjs` is a legitimate targeted repair tool,
and deleting the code would throw away the escape hatch along with the bug).
**Blast radius checked:** `repairTailDefect` has exactly two callers — `phase8-audio-v13.cjs:945`
(the automatic gate, which is precisely what should stop mutating) and `tools/declick-tail.cjs`
(human-invoked, dry-by-default, explicit id list, whisper + amputation guards), which now opts back
in so it still repairs. Flag mode returns `action:'held'`, which every call site already treats as
"shipped untouched".
**Search width:** visible-options
**Decided by:** agent (reversible, no spend; overrulable in one sentence — revert the default)

## 2026-08-05 — course-wide missing clips live on the audio-preview page

**Move:** the whole course's missing clips are now one server-computed list
(`GET /api/production/:course/audio-preview/missing-clips`) rendered on the audio-preview page,
next to the pod-slot MISSING scan — rather than a dedicated view, and rather than a smarter
Script Viewer filter. Tom's ask was to stop having to "wade through the script view"; Script
Viewer's "Missing audio only" toggle can only ever filter the 20 LEGOs it has loaded
(`ScriptViewer.vue` `journeyPageSize = 20`, confirmed against the code and the live API).

**Better:** one number a person can act on — fra_for_eng: 1,459 clips the learner cannot hear
across 963 of 1,529 rounds — instead of a per-page filter that can never state a course total.
**Simpler:** one audio-health surface, not a new destination to remember; and the gap test is
the SAME `hasAudio` the Script Viewer filter uses (learning-script-generator), so the two
surfaces cannot disagree.
**Cheaper (total):** no new data path — it reuses the journey generator the journey-search
endpoint already runs whole-course, and no new database objects. ~8s cold per course, cached
60s, on a page that is opened deliberately.

**Searched & rejected:**
- Dedicated "missing audio" view — rejected on simpler: a second place to look for the same
  question the audio-preview page already answers for pods.
- Paginate the Script Viewer filter server-side — rejected on better: it fixes the paging and
  still never produces a total, which is the thing Tom asked for.
- Direct SQL count of `course_practice_phrases` with null audio — rejected on better: counts
  rows the learner never plays and misses LEGO intro/debut gaps entirely; kept instead as the
  independent CROSS-CHECK, and the delta is printed on the page rather than hidden.

**Search width:** visible-options
**Decided by:** agent (taste call on placement, per the brief's "take that call yourself")

---

## 2026-08-05 — "Recently rendered" becomes a real window; the listening page opens on the gate

**Decision:** make the audio-preview `recent` filter an actual 7-day predicate, default the page
to "Rendered under the gate", and print how much of a mixed filter predates the gate.

**Why:** Tom reported the gate as working ("rendered under the gate in the French course is
basically excellent") but "when I played recently rendered I got a whole load of bad ones".
The cause was in `applyFilter`: `recent` applied NO predicate at all, so "Recently rendered" was
byte-identical to "All". Newest-first paging hides that; `/sample` does not — it draws uniformly
over the filtered set, and 47,876 of fra_for_eng's 49,098 clips (97.5%) predate the gate. The
label promised the newest renders and the button served the entire pre-gate history.

**Better:** the page can no longer make a claim the query does not back, and the first thing a
listener hears is the set the gate actually covers.
**Simpler:** one predicate added, one default flipped — the per-clip pre-gate badge already
existed, so nothing new had to be invented to mark provenance.
**Cheaper (total):** one extra head-count per request, only on the mixed filters; no schema
change, no re-render, no TTS.

**Searched & rejected:**
- Delete the `recent` tab (two tabs: gated / all) — rejected on better: "what did we just
  render" is a real question Tom asks, and newest-first over the whole course is not an answer.
- Persist a per-clip veracity verdict so `gated` becomes a verdict lookup rather than a time
  window — genuinely better, and NOT rejected: it is the real fix for the residual dishonesty
  that a gate-era clip may have been *unchecked*, and for render paths that write `course_audio`
  without passing through the gate at all. Out of scope for a UI honesty fix; carried as the
  next move.

**Search width:** visible-options
**Decided by:** agent
## 2026-08-05 — Make-before-break written into audio operations doctrine

**Move:** added an explicit ordering rule — generate the replacement, verify it, swap links
atomically, only then delete the old clip — to `CLAUDE.md`'s approval gates and as a new §6b in
`docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md`, naming the 2026-08-03 fra_for_eng Azure-voice
purge (31,310 rows deleted before replacements existed, ~2,000 slots silent for two days) as the
incident that forced it. Audited both tracked tools that mutate `course_audio`
(`tools/revoice-clips.cjs`, `tools/repair-silent-clips.cjs`) — both already generate/verify before
deleting (one inserts-then-deletes because a voice change doesn't collide on the unique key; the
other must delete-then-insert because a same-voice re-render does collide, but renders and
verifies first and restores the deleted row on a failed insert). The 08-03 purge itself was a
direct service-role SQL statement, not a repo script, so there was nothing to patch there —
recorded as a gap.
**Better:** the rule Tom stated in one sentence is now load-bearing text at the two places anyone
touching audio deletion is likely to read (project rules, pipeline architecture), not tribal
knowledge in a chat log.
**Simpler:** two doc edits, no new file, no code change — the two existing tools already do the
right thing and needed no fix.
**Cheaper (total):** zero — documentation only.
**Searched & rejected:** n/a — founder ruling, documentation-only task.
**Search width:** visible-options
**Decided by:** Tom (founder ruling, 2026-08-05)

## 2026-08-05 — Deploy gets a Repair fallback for jammed checkouts

**Decision:** when a machine's normal Deploy fails, the Deploy UI offers **Repair**, which
force-resets that machine's checkout to `origin/main` and restarts services — behind four
guardrails: fallback-only (single-use token issued by the failed deploy; no token → 409),
explicit confirm (`confirm:true` or 400), a verified safety snapshot before anything is
touched (abort if it can't be made), and a deploy-history audit trail.
**Move:** `services/deploy-repair.cjs` + 9 tests, `POST /api/deploy/repair` and
`GET /api/deploy/history` in the orchestrator (proxied by production-api), Repair button +
confirm panel in `EnvironmentSwitcher.vue`. Written up in `docs/deploy-repair-2026-08-05.md`.
**Better:** Camberley's Deploy failed five times today with nobody at the Mac; the repair path
existed only as a shell command on a machine no one could reach. Now the app can do it.
**Simpler:** one module, one endpoint, one button — reusing the existing deploy restart path
rather than a second deploy mechanism. No new service, no scripts to remember.
**Cheaper (total):** no running cost; it removes the "someone has to go to the Mac" trip, which
is the expensive part. Snapshots are bounded (a ref, a bundle, a tarball per repair) and the
history log self-trims at 500 rows.
**Searched & rejected:** (a) always force-reset on deploy — cheaper to build, but silently
destroys local work and makes every deploy a loaded gun; (b) an ops script + docs — no cost, but
it needs a shell on the jammed machine, which is exactly what was missing; (c) auto-repair on
failure — removes the human, and a hard reset on a production machine must never be automatic.
**Search width:** visible-options
**Decided by:** Tom (sign-off, 2026-08-05: "Yes. Build the repair option.")

## 2026-08-05 — No course reaches learners without a human play-through

**Decision:** a manual approval gate, per course, blocking promotion to learner-visible
(`new_app_status IN ('live','beta')`) until a human has played through the first **X rounds**
in the REAL learning app and signed each one off. X is stored per course, seeded 100 for paid
and 20 for free/community. Sampling remains fine for the body of a course; the first X rounds
are not sampleable. All 143 existing courses start honestly **unpassed** — nothing
grandfathered, nothing backfilled, no live course's status touched.
**Move:** `ops/sql/20260805-course-qa-gate.sql` (five tables, five derived views, applied live),
`services/course-qa-gate.cjs`, `services/api/course-qa-gate-routes.cjs`, the block in
`POST /api/production/:courseCode/status`, plus `CourseQAGate.vue` (the play-through worklist),
`QAGateEstate.vue` (the retrofit's priority list) and status badges in Production Overview and
Script View.
**Better:** Tom played ten minutes of live `deu_for_eng` and found it "an unmitigated disaster".
Two failures caused it and both are now structurally impossible rather than merely discouraged.
(1) An agent overruled six real detector flags as "transcription artifacts";
`audio_clip_flags.resolution` now has exactly two values — `cleared_by_human` and `replaced` —
so there is no column an automated re-judgement can write to. (2) Nobody had ever listened.
The gate makes "a human played it and signed it off" a first-class, queryable fact.
**Simpler:** cycle and round verification status are VIEWS, never stored, so they cannot drift
from the clips they describe. Invalidation is arithmetic, not a hook: clip sign-off keys on
`(audio_id, audio_revision)` and round sign-off stores an md5 over every `(audio_id, revision)`
in the round, so accepting an audio repair moves the fingerprint and the sign-off goes stale on
its own. Nothing was added to `audio-repair-core.cjs` — a coupling that has to fire is one that
can fail to fire. A round is a LEGO and cycle keys are byte-identical to the ids the learner API
emits, so no new vocabulary was invented and no "seed position" is named.
**Cheaper (total):** no running cost. One 40ms query decides a course's gate; the estate view
covers 143 courses / 86,733 rounds in well under a second (the exact per-round view timed out at
that width, so the estate uses a conservative course-level staleness test that under-reports and
never over-reports). The real cost is human listening time, and Part 3 exists to divide it — a
partial gist exclusion constraint makes two people being handed the same rounds impossible.
**Searched & rejected:** (a) check every clip — Tom explicitly ruled sampling acceptable for the
body of a course, and it would make the gate undeliverable; (b) trust an automated audio check —
no check here has a measured miss rate against human-labelled ground truth, so ordering the
queue for human ears is the only job one may legitimately hold; (c) grandfather the 78 live
courses as passed — it would make the gate a lie on the day it shipped; (d) hook invalidation
into the repair flow's accept path — more code, more coupling, and it can silently not fire.
**Search width:** visible-options
**Decided by:** Tom (ruling, 2026-08-05: "No course should EVER go out to learners unless it has
passed a manual approval gate" / "we MUST manually play through the first X ROUNDS").
## 2026-08-05 — delete tail-repair, keep read-only flagging

**Move:** removed `repairTailDefect`, `verifyTrimKeepsText`, the `TAIL_REPAIR_MODE` switch and
`tools/declick-tail.cjs` outright, so no code path in the estate can automatically trim or rewrite
course audio. Detection survives as read-only `flagTailDefect`, carrying its own 9%-precision caveat
in every result, for the coming manual approval gate.

**Better:** the capability that deleted taught words from a live course no longer exists, so it
cannot recur — versus a default that had already been flipped once and still leaked. The estate
audit found six copies of `audio-processor.cjs` on this host, two with the mutation path and **no
switch at all**, which is exactly how "a rogue default keeps sneaking through" happens.
**Simpler:** one read-only function replaces a 3-pass repair loop, two guards, a whisper trim-check
and an env switch — 506 lines deleted for 162 added, and there is no longer an environment variable
anyone can get wrong. **Cheaper (total):** removes the whisper subprocess pair per flagged clip from
the render path; removes a per-checkout, per-unit-file configuration burden that was already being
paid incorrectly; and removes the recurring cost of repair passes that were 9% precise — the
repairs themselves were the expense.

**Searched & rejected:**
- Flip the default to `flag` (done earlier today, `c6703b2d`) — failed *better*: leaves the
  capability and the switch, and two checkouts have no switch to set.
- Keep the repair behind the whisper amputation guard — failed *better*: the guard returns
  `null → proceed` whenever whisper is absent, which is true on this box, and it cannot see a trim
  that eats one final word of six.
- Raise the detector's threshold — failed *better*: 9% precision is a discrimination failure, not a
  threshold failure; the detector cannot distinguish a tail click from a natural mid-sentence pause.
- Keep `declick-tail.cjs` as a read-only reporter — failed *simpler*: duplicates `flagTailDefect`
  for no added value.

**Search width:** component-redesign
**Decided by:** Tom — 2026-08-05 21:06Z escalation, verbatim: "DELETE the tail-repair service's
ability to modify audio entirely, do not just change its default", after the clipping recurred a
third time and reached learners in the first 10 minutes of the live German course.

## 2026-08-06 — Fix the unlink at the write path, not with a cleanup cron

Audio that exists and is usable was becoming unlinked from the content that needs it, and then
reported to everyone as "missing". In `ara_lb_for_eng` 1,324 such clips were re-linked for free.
The estate has three independent mechanisms producing this, all now addressed in
`database/migrations/20260806_audio_link_integrity.sql`: an unlink trigger that fires on any text
change with no counterpart that ever re-links; a relink trigger that compared text with a different
normaliser than the one writing the column it compared against (154,257 rows unmatchable); and an
`ON DELETE CASCADE` that deleted authored introduction rows outright when their audio went.

**Decision: prevent it in the trigger, and make the trigger's preference order identical to the JS
link passes' — rather than detect it later with a sweep.** The unlink triggers now re-link to a clip
we already own for the new text via `audio_id_for_text()`, whose ordering (human > newest > id)
mirrors `pickPreferredAudioRow` exactly. The reconciliation tool still exists, but as a standing
report and a recovery pass for the historical backlog, not as the mechanism that keeps the estate
correct.

**Better:** the defect cannot accrue between sweeps — the window in which a course is silently
missing audio it owns closes from "until someone runs the tool" to zero. It also fixes the class of
unlink nobody would ever have sweep-detected as a bug: a cosmetic edit (trailing space, casing) that
nulled a link even though the normalised text never changed. Verified against real production rows.
**Simpler:** one function and three trigger bodies, in the one place every writer already goes
through, replaces a scheduled job plus the operational burden of noticing it stopped running. There
is exactly one definition of "which clip wins" (`pickPreferredAudioRow`) and the database now agrees
with it instead of having its own.
**Cheaper (total):** re-linking costs nothing and generates nothing, so every clip recovered this way
is TTS spend not incurred — the standing failure mode was regenerating audio the estate already
owned. No cron, no scheduler, no recurring compute.

**Searched & rejected:**
- Scheduled reconciliation sweep as the primary fix — failed *better*: leaves a window proportional
  to the sweep interval, and the estate's own history is that periodic passes are what stopped
  running unnoticed.
- Redefine `normalize_text()` so the DB and JS normalisers agree — failed *cheaper* and is unsafe:
  it feeds `UNIQUE (course_code, text_normalized, language, role, voice_id)`, so recomputing it would
  collide on the next write to each of the 154,257 affected rows, converting a matching bug into
  write failures. Matching was made tolerant instead; the normaliser split remains an open item for a
  planned, gated backfill.
- Resolve the fallback at read time in the learning app — failed *simpler*: puts the rule in the more
  sensitive delivery codebase Tom signs off individually, and duplicates it away from
  `pickPreferredAudioRow`. Popty holds the authoritative rule and materialises it into real links, so
  delivery needs no change at all.
- Drop the unlink triggers entirely — failed *better*: a text edit genuinely does invalidate audio of
  the old text; the bug was never re-linking, not invalidating.

**Search width:** component-redesign
**Decided by:** agent, under Tom's standing ruling 2026-08-05, verbatim: "it's probably better to
have a system that plays Azure until better voices are available in lieu of nothing!!!!" and "we
don't want the player to screw up a course just because some audio is missing — it should ALWAYS
PLAY WHAT IT HAS". Not escalated: monotone by construction (only fills NULL links, never overwrites
a live one, never deletes), and a rollback file is committed alongside.

## 2026-08-06 — Two pod voices by default, three or four as opt-in

**Move:** made two human voices — one male, one female — the DEFAULT pod cast in both the UI and
the underlying model, with three-to-five as a quiet opt-in upgrade for courses that genuinely have
extra recorders. `POST /cast/propose` no longer hard-rejects anything but exactly two; `GET /cast`
serves a two-voice `castDefaults` so a leader who configures nothing still lands on the right
shape; `PUT /cast` records `podCastVoices` so a deliberate opt-in survives the legacy collapse.
Separately, fixed the two surfaces that were *rendering* generation-side speaker colouring as if it
were a cast — `PodDetailView`'s always-open 22-row "Speaker voice mapping" grid and `PodsView`'s
"22 speakers" pod card.

Tom's ruling, voice note 2026-08-06, verbatim:

> "the whole point of doing this in this way was that we could get by with just two different
> voices, a male voice and a female voice […] probably do it for two voices as the default. And
> then if you want to try it with three or four voices because you do have additional human voice
> recorders, then fantastic, we can do that. But think about that. If we are making it a lot more
> complicated to even get the recordings done, it's going to be harder for people to do community
> courses, isn't it? And Welsh is a great example of that. Every single audio that's in the Welsh
> course was recorded by Aran and Katchin themselves. Those are for the seeds, for the LEGOs and
> for the phrases. So we don't want to make it unnecessarily complicated by having 56 different
> cast members."

**Better:** a two-person community course — the Welsh case, and the common case — can record a
whole course without ever meeting an N-voice concept, while courses with more recorders lose
nothing. The diagnosis also corrected a real category error in the UI: characters (a writing fact,
as many as a scene likes) were being displayed as voices (a casting fact, which is two).
**Simpler:** one rule at every size (2–5, at least one male and one female) replaces a hard
"exactly two" wall plus a two-row UI cap; the character list moves behind one click instead of
being the first thing on the pod page.
**Cheaper (total):** no data migration and no TTS — the cast data was already correct in both
Welsh courses, so nothing was rewritten and no audio was regenerated. The change is one pure
validator, one additive `voice_config` key, and three template edits.

**Searched & rejected:**
- Rewrite the generation-side colouring in `listening_pods.speakers` down to two voices — failed
  *cheaper* and *better*: it is a destructive write to generation data that the human recording
  path never reads anyway (`buildRecordingPlan` reads `voice_config.podCast` alone), so it would
  have been risk with no effect on the recorder.
- Re-solve and re-save the Welsh casts to "fix" them — failed *better*: both courses already hold
  exactly Aran + Catrin, and Aran holds 27 recorded takes on `cym_n_for_eng`. A re-solve
  load-balances characters differently between the two voices for no gain, against the
  make-before-break rule.
- Keep the hard two-voice wall and just fix the UI — failed *better*: it satisfies the complaint
  but contradicts the explicit half of the ruling ("if you want to try it with three or four
  voices […] fantastic, we can do that").
- A voices-count setting or mode switch on the cast panel — failed *simpler*: it puts a decision
  in front of every leader to serve the minority case, which is the exact complexity the governing
  principle forbids.

**Search width:** component-redesign
**Decided by:** Tom, voice note 2026-08-06. Governing principle in his framing: anything that makes
recording more complicated makes community courses harder — "If we are making it a lot more
complicated to even get the recordings done, it's going to be harder for people to do community
courses, isn't it?"

## 2026-08-06 — a phrase that IS the LEGO never counts

**Move:** the course generator was meeting the per-LEGO phrase floor (3+ BUILD / 5+ USE) with a
copy of the LEGO's own text — 20-32% of rows in generated courses, vs 0.1% in hand-built Welsh.
The floor now excludes bare-LEGO phrases and every course-builder write path drops them, so the
floor can only be met by real practice. `generateBuildupPhrases` no longer emits the LEGO itself
as a build row. Code fix only — the 4,172 known existing rows are untouched, a separate content
call.

**Better:** the floor now measures what it claims to. A bare-LEGO row was never played anyway —
the round generator renders intro and debut from `course_legos` and claims that phrase id
(`learning-script-generator.cjs`: "the debut IS the bare LEGO"), so the rows inflated counts and
audio backlogs while teaching nothing. Same rule ralph-methodology.md already states for BUILD.
**Simpler:** one predicate (`isBareLegoPhrase`) in the pure-function library the gate and every
write path already import; the counting rule and the writing rule are the same line of code.
**Cheaper (total):** removes rows from future courses — fewer phrases to store, to decompose, and
to voice at TTS cost. No migration, no regeneration, no new service.

**Searched & rejected:**
- Retroactively delete the existing bare rows — out of scope by the brief and a content call, not
  a tool call; deleting rows also drags audio behind it (make-before-break).
- Let the generator auto-synthesise a replacement phrase to keep the count — failed *better*: a
  machine-written filler phrase is the same padding wearing a better disguise. Rejecting with a
  named reason puts the work back on the author, which is where phrase quality lives.
- Hard-reject a first-row bare LEGO in `checkBuildRecombination` (it already hard-rejects one in
  rows 2+, blessing row 1 as a 'debut-row') — failed *simpler*: it would reject otherwise-good
  seeds for a row we can simply not count and not write. The count is the lever; the row is noise.

**Search width:** visible-options
**Decided by:** agent — a tool/process bug against a rule already written down, not a content
judgement.
## 2026-08-06 — TTS spend: small sample run first, always

**Move:** the standing "never generate TTS without a plan and explicit approval" gate is replaced,
for sample-scale work, by a standing doctrine in Tom's own words: *"we can spend TTS money with
impunity these days - the whole new approach should always do small sample runs first as part of
the new process"*. Every generation job now opens with a small sample run, judged, before any bulk
render. First application: VOICELAB 01 (`docs/audio/voicelab-01-tom-clone-multilingual-2026-08-06.md`),
21 clips for $0.036.

**Better:** the sample is where the ear test happens, so a bad voice, a wrong-language drift or a
broken construction is caught on twenty clips instead of twenty thousand — the fra Azure-purge
class of accident becomes structurally cheaper to avoid. **Simpler:** one rule replaces a
per-job approval negotiation; the agent acts, and Tom's attention goes to the clips rather than to
the request. **Cheaper (total):** xAI at $15/1M characters makes a 2,000-character probe cost under
four cents, against re-rendering a whole course side at ~$7.50 — the sample is rounding error
against the cost of being wrong, and it removes a round-trip of Tom's time from every job.

**Searched & rejected:**
- Keep the blanket approval gate — failed *simpler* and *cheaper*: it spends Tom's scarcest
  resource on decisions whose money is now negligible, and it delayed jobs that a four-cent probe
  would have settled.
- Drop the gate entirely — failed *better*: bulk renders are still irreversible-ish work against a
  live estate, and make-before-break still needs a judged artifact before the swap.
- Approve by budget ceiling instead of by sample — failed *better*: a ceiling authorises spend but
  authorises nothing about quality, which is the thing that actually goes wrong.

**Search width:** re-levelled
**Decided by:** Tom, 2026-08-06, ruling the VOICELAB 01 spend.

## 2026-08-07 — orchestrator off pm2, onto systemd, under the watchdog

**Move:** finished the 2026-07-30 pm2→systemd migration for its last holdout. `orchestrator`
(3456) now runs as `popty-orchestrator.service` alongside its seven siblings, is removed from pm2
entirely, and is health-checked by the existing cron watchdog. Triggered by the 14:44 UTC watson-1
reboot, where `@reboot pm2 resurrect` lost a race with crontab loading and left 3456 dead for ~50
minutes while every systemd sibling recovered in five seconds unattended.

**Better:** one supervision mechanism instead of two, and the surviving failure mode (the user
manager itself dying) is already covered by the cron watchdog — which now watches 3456 too, closing
the gap that turned a five-second recovery into a fifty-minute outage. **Simpler:** a daemon is
removed rather than a watchdog added; pm2 now manages nothing at all. **Cheaper (total):** the pm2
God daemon stops running, one unit file replaces an opaque `dump.pm2` blob carrying a stale
snapshot of a 2026-07-30 shell environment, and nobody has to reason about which of two supervisors
owns a service during an incident.

**Searched & rejected:**
- Just restart it under pm2 and move on — failed *better*: it reinstates the exact hook that just
  failed intermittently, which is worse than a deterministic failure.
- Add a watchdog for pm2's resurrect race — failed *simpler* and *cheaper*: it defends a daemon
  that has no remaining reason to exist.
- Move orchestrator to the `-prod` checkout to match its siblings — failed *better* for this pass:
  a supervision fix should not smuggle in a checkout cutover. The unit preserves the dev checkout
  pm2 actually ran, with a comment saying so; the cutover stays a separate, deliberate decision.

**Search width:** visible-options
**Decided by:** agent — Tom's brief specified the migration; the watchdog line and the empty
`dump.pm2` force-save are the agent's calls, both reversible.

## 2026-08-11 — merge and deploy the recorder review flow before Catrin's first session

**Move:** merged four pieces of unmerged recorder work into `main` and deployed them —
the flag-then-re-record-only-the-flagged review pass
(`fix/autocue-reject-flag-2026-08-11`, including the e2e spec that drives flag → re-record
→ supersede through the real app), removal of the fake `Math.random()` confidence badge and
its ID-derived waveform (`fix/autocue-remove-fake-confidence-2026-08-11`), per-LEGO chunk
playback on the review card (`feat/autocue-chunk-review-playback-2026-08-11`), and the
draft-badge wording fix cherry-picked from `fix/recorder-draft-badge-name-2026-08-11`.
Tom ruled: merge it. Catrin starts her first recording session today.

**Better:** the review screen's Redo button previously coloured a card and changed nothing —
a recorder could flag takes all session and none of it meant anything, while a badge that was
only a 1KB file-size check told them the app had listened and approved. Both are now honest:
flagging drives a real second pass, and the screen says nothing about quality it cannot observe.
**Simpler:** three branches, one shared set of files, resolved to one lineage rather than left
as three forks of `SessionReview.vue`/`SegmentCard.vue`/`useAutocueState.js` diverging further
each day. The fake-confidence removal deleted 246 lines against 166 added.
**Cheaper (total):** one bad LEGO now costs one chunk of re-reading instead of a whole phrase,
and a flagged-only second pass replaces the existing "re-read every line from the top" walk —
recorder time is the scarce input here. No new services, no schema change: the new
`chunk_boundaries_ms` witness rides inside the `quality_notes` JSON blob that
`buildProvenanceContext` already serialises.

**Searched & rejected:**
- Deploy the frontend only, leave the API on the old commit — fails Better: the new SPA sends
  `chunkBoundariesMs` in the upload metadata and only the new `production-api` strips it before
  the S3 PUT, so an old backend risks 400ing uploads. Frontend and backend were moved together.
- Merge the badge branch wholesale — fails Cheaper: that branch carries ten unrelated pdc/ell/pod
  commits. Cherry-picked the single one-line commit instead.
- Also merge `feat/autocue-record-everything` and `feat/autocue-concat-listening-test` while in
  there — out of scope for today's ask, and untested against this merge. Left unmerged.

**Search width:** visible-options
**Decided by:** Tom — "merge it", ahead of Catrin's first session on 2026-08-11.

## 2026-08-11 — Insert-path capitals decided by evidence, not a word list

**Move:** the course-builder insert path no longer lowercases the first word of a LEGO or phrase
unless the submission itself proves the capital is accidental. Casing is decided per side from
the author's own writing — a word capitalised mid-sentence anywhere in the submission is never
lowercased; a word written lowercase anywhere may be lowercased at position 0; with no evidence
the author's capital stands. The old hard-coded `KEEP_CAP_WORDS` list survives only as a
backstop and never needs to grow.

**Better:** it stops producing wrong text. Pennsylvania Dutch and German capitalise nouns, so
"Deitsch schwetze" was being stored as "deitsch schwetze" and "I'm waiting" as "i'm waiting";
the evidence rule protects every proper noun and every German-style noun in every language pair,
including ones nobody has thought of yet.
**Simpler:** one rule replaces a 30-entry list of language names that could never be complete —
and the leading-capital check now reads Unicode capitals (É, Ä, Ц), not just A–Z.
**Cheaper (total):** no per-language maintenance, no new lookup, no DB read — the evidence is
the submission already in memory; zero added latency.

**Searched & rejected:**
- Add 'Deitsch' and the I-contractions to the allowlist — fails Cheaper: the list grows forever
  and the next language's nouns break again.
- Skip lowercasing for noun-capitalising languages by language code — fails Simpler: swaps a word
  list for a language-code list, and pdc was exactly the code that would have been missing.
- Drop the lowercasing entirely — fails Better: the step has a real job, undoing sentence-case an
  author put on a fragment.

**Search width:** component-redesign
**Decided by:** agent (bug reported by Kai on pdc_for_eng; confirmed present in deu_for_eng)

## 2026-08-12 — stale phrase glosses fixed by content, not version stamp

**Move:** Deborah's eus_for_eng report ("the English gloss under 'hitz bat' is wrong") traced to
frozen `course_practice_phrases.decomposition` rows, and fixed by a new gated tool
(`tools/course-optimization/refresh-stale-phrase-decompositions.cjs`) that detects drift by
COMPARING EACH BLOCK'S STORED GLOSS TO THE LEGO IT NAMES, then recomputes with `decomposeAnchored`.
Applied to eus_for_eng: 447 phrases rewritten, 543 → 46 stale blocks, residual reconciles exactly
to the 44 rows the tool deliberately declined.

The decomposition is computed once at phrase-write time and each block is bound to a lego_id SLOT
carrying the gloss that slot held then. Re-author or re-index the LEGO and the frozen gloss stays,
now labelling a different word — and the player renders those stored strings verbatim
(`LearningPlayer.vue` "Strategy 0 (authoritative)"), so it reaches the learner.

**Better:** the existing detector (`/api/admin/decomposition-audit`) keys off
`decomposition_course_version < courses.version`; only 29% of decomposed phrases estate-wide carry
that stamp and a NULL fails the `<` test, so it saw 49 stale eus rows where content comparison sees
502. Content keying cannot be defeated by a missing stamp.
**Simpler:** no new decomposer — it calls the one the build path already uses, and unlike the
version-keyed backfill it uses `decomposeAnchored` rather than plain `decomposeText`, so a lost
salient anchor is restored rather than re-lost.
**Cheaper (total):** one query per course, writes only the `decomposition` column (no phrase text,
no LEGO, no audio row — verified: eus audio links unchanged at 6449/6450), and the applied log
keeps every pre-write value so `--undo` is exact. No TTS, no regeneration, no spend.

**Searched & rejected:**
- Stamp every phrase and let the existing version-keyed backfill run — fails Better: a stamp
  written now says "current" about a decomposition computed against long-gone LEGOs.
- Drop the stored decomposition and let the player's runtime fallback decompose — fails Better:
  the runtime path is the one the stored tiling was introduced to replace.
- Hand-edit the reported row — fails Cheaper: 502 eus phrases and ~22k blocks estate-wide behind it.

**Search width:** component-redesign
**Decided by:** agent


## 2026-08-12 — Decompositions preserve target word order

**Move:** recorded Tom's ruling that a phrase decomposition always follows **target-language**
word order — the chunk sequence rebuilds the target sentence exactly, and the known-side glosses
are segmented to sit underneath their target chunks, reading deliberately out of order where the
two languages diverge (his example: `cosa azul` maps literally as "thing blue"). Applied to
`eng_for_X`, where English is the target, this means the **English** side is decomposed, not the
known side. Corrected the two briefs that said otherwise: `.claude/commands/eng-for-jpn-build.md`
told builders "LEGOs decompose the Japanese known text", and
`.claude/commands/layered-decomposition-brief.md` was headed `eng_for_jpn` while every LEGO in it
decomposed the Japanese side — it is a `jpn_for_eng` brief and is now labelled as one.

**Better:** the learner sees how target grammar maps onto what they already know, which is the
whole point of showing a breakdown; a known-ordered breakdown teaches nothing about the target.
**Simpler:** one rule for all 178 courses, and it is the rule the writer already implements —
`decomposeText(p.target_text, vocab)` in `services/phrase-decomposer.cjs` has always tiled the
target. The briefs were the only place the other side was written down.
**Cheaper (total):** no data migration and no re-render. Audited all 19 `eng_for_X` courses,
193,201 stored decompositions: **zero** decompose the known side, so the ruling costs nothing to
adopt (`scripts/engforx-decompose/audit-side.cjs`, 99.2–100% target-recomposing per course).

**Searched & rejected:**
- Rewrite the layered brief's Japanese examples into English-target ones — fails Cheaper: it
  invents new worked content when the brief is already correct for `jpn_for_eng`; relabelling is
  free and loses nothing.
- Enforce target-order at the gate — fails Simpler: nothing violates it, so a gate would be a
  check with no defects to catch. The real residue is stale drift, not wrong-side (below).

**Search width:** visible-options
**Decided by:** Tom — ruling given 2026-08-12; also relayed to job #389 (component-mapping editor)
as "target-order-preserving display, segmentation-of-known-text as the edit model".

## 2026-08-16 — Verifier agent approves drafted pod text for audio

**Move:** implemented Tom's A-109 ruling — a human proofread of every line is rejected as policy;
instead an agent independent of the translator judges each machine-written draft for
"reasonableness", clean lines are marked approved to generate audio, and only the flagged tail
reaches a human. One predicate (`services/pod-text-approval.cjs`) refuses the target track of any
unapproved draft in `/generate-pods`, `/plan-pods` and `pod-bulk-migrate`'s in-process mode.

**Better:** 4,852 drafted lines across 42 pods could be rendered by any unscoped bulk call; the
gate makes that structurally impossible rather than a thing someone must remember, and blocked
lines are reported as a number (`blocked_unapproved_target`) instead of silence.
**Simpler:** one boolean condition in one pure, tested module, mirroring the existing voice gate
next to it; approval is a single timestamp, so there is no second flag to disagree with it.
**Cheaper (total):** the alternative — humans reading 4,852 lines — was never going to happen, and
its non-happening was the blocker. The verifier cost 8 subscription CLI calls for 128 lines
(~5 min), no metered API, no TTS. The gate adds one map lookup per queue item.

**Searched & rejected:**
- Human proofread of every line — Tom's own word: "lunacy". Fails Cheaper on the only cost that
  matters here, attention, and it had already stalled the estate for ten days.
- A boolean `approved_for_audio` column alongside a timestamp — fails Simpler: two sources of
  truth that can disagree, for no gain over `approved_at IS NOT NULL`.
- Gate only `/generate-pods` — fails Better: the estimate would promise clips the render refuses,
  and `pod-bulk-migrate`'s DEFAULT in-process mode rebuilds the queue itself, so it would have
  remained a full bypass on the bulk driver.
- Gate the known (English) track too — fails Better: `known_text` was never drafted, so it would
  block the English side of 4,852 lines to no purpose.
- Trust a zero-flag verifier result — rejected as unproven; calibrated against 8 control lines
  carrying 5 planted defects (5/5 caught, 0 false positives) before the result was believed.

**Search width:** visible-options
**Decided by:** Tom — ruling given 2026-08-16 on A-109, verbatim in
`docs/pods/text-approval-policy-2026-08-16.md`.
## 2026-08-16 — Voice pools carry a locale, and the Spanish pool says Manuel

`app_config.pod_voice_pools` entries may now carry an optional `locale`, which `resolveCast` copies
onto the cast voice; the `spa` pool now leads with xAI Manuel `yis75yfp` @ `es-ES` (male) and Azure
Elvira @ `es-ES` (female), the cast Tom approved by ear on 2026-08-14. Before this, the approved
cast lived only in `listening_pods.speakers` and any re-sync of `spa_for_eng` from its markdown
would have recast Manuel back to Azure Alvaro, moving the fingerprint and self-invalidating Tom's
own approval. Named in `docs/pods/spa-t17-cast-approval-2026-08-14.md` and again in the 2026-08-16
A-109 re-check; measured here as 55 target seats that would have moved, now 0.

**Better:** the pool and the approved reality agree, so the stomp is structurally impossible rather
than merely unlikely; a malformed locale throws instead of being silently dropped. **Simpler:** the
field the fingerprint already digests and phase8 already honours now exists in the one place casting
reads from — `pod-recolour` already assumed pools could carry one, so this removes a discrepancy
rather than adding a concept. **Cheaper (total):** no migration, no new table, no render; 144 of the
146 pool entries carry no locale and cast byte-identically to before, verified by casting all 46
pool keys under old and new code.

**Searched & rejected:**
- Reorder the pool to put Alvaro/Elvira first without a locale — failed *better*: it records a
  different cast from the one Tom listened to (plain `es` is a different handle from `es-ES`).
- Derive the locale in `resolveCast` from the voice id — failed *better*: it works for Azure and is
  exactly wrong for xAI, where the tag IS the Iberian-vs-Mexican choice and must be the human's.
- Rewrite the stored cast, or raise `POD_VOICES_PER_GENDER`, to make the known side match too —
  failed *better*: both fake a passing acceptance test, and Tom's ruling the same day settled that
  neither is wanted anyway ("in the re-casting to 2 voices for the PODS, there should only be one
  voice per gender, right? this may well be different from the voices in the main course").

**Amended the same day by that ruling.** One voice per gender per pod IS the design, and the pod
pool is independent of main-course voices, so the 6 English voices in `spa_for_eng`'s stored cast
are earlier casting leakage rather than something to preserve. Converging them to Tom's clone (male)
and Olivia (female) is the intended end state, not a regression. The target side still pins Manuel @
`es-ES` and Elvira exactly. Applying that convergence will legitimately move the fingerprint
`29cc217afb5fa101` → `92ab0ed61dbc6741` and so requires a fresh approval — the gate working as
designed. Not applied here: this pass wrote no cast.

**Search width:** visible-options
**Decided by:** Tom (the approach was his commission); the insertion order, the throw-on-malformed
rule and the `pod-recast` explicit-beats-derived precedence are the agent's calls, all reversible —
the apply log holds a full backup of the pool row.
## 2026-08-17 — TTS clips master without the compressor

**Move:** phase8's `masterAudio` — the one mastering step every generated clip passes through —
now calls `audioProcessor.normalizeAudioClean()` instead of `normalizeAudio()`, dropping the
`PRE_COMPRESS` stage (`acompressor=threshold=-24dB:ratio=8`) and its make-up gain. Pure
subtraction: one processing stage removed, nothing added; the limiter and the 8ms anti-click fades
stay, and the deleted tail-repair mutation path is not touched (`verify-tail-repair-mode` passes).

**Better:** the compressor lifts whatever sits in a clip's tail by ~12dB. A blind listening test
that day (Tom: "all good apart from 4 — had a tiny click") decoded to the nld pod-0 xAI voice
`xai_247783ebdd51` as raw provider bytes, with none of our processing on it — so the click is
baked into that voice at source and the compressor was amplifying it, not creating it. Removing
the amplification is the only lever our chain has. Same defect Tom heard from the other side on
2026-07-29 as "that hissy mastering stuff", which is why `normalizeAudioClean` already existed.
**Simpler:** one existing function swapped for another existing function, one call site, no flag,
no branch, no A/B toggle — nothing new to maintain or to get wrong in a fresh checkout.
**Cheaper (total):** one filter stage less per render across the estate; no new code, no new
config, no new test surface.

**Measured cost, accepted:** output lands 0.8–1.7 LUFS quieter (this take: −15.6 → −16.9 LUFS),
and the tail floor drops from −53.5 to −64.9 dB relative to the clip's own speech peak (raw
provider bytes: −68.0 dB).

**Searched & rejected:**
- Feature flag / env switch on the chain — rejected: the tail-repair switch WAS the bug once
  already (ruling 2026-08-05); a default that must be set right in every unit file and cron leaks.
- Trim, pad or de-click the tail — rejected: mutation of course audio is deleted doctrine; it once
  shipped a German clip missing its final word.
- Keep the compressor and recast the Dutch pod off the clicking voice — not rejected, deferred:
  it is the remaining lever if Tom still hears the click on the new chain, and it is his call.

**Search width:** re-levelled (the earlier search assumed our chain caused the click; the blind
test moved the question to the provider's bytes)
**Decided by:** Tom — the blind-test ruling and the A/B ear check are his; the call site chosen and
the other `normalizeAudio()` callers left alone are the agent's, both reversible.

---

## 2026-08-17 — A regional variant gets its own voice-pool key, not its own `target_lang`

**Decision:** add `courses.voice_pool_key` (nullable) and resolve pod casting through one
function, `poolKeysForCourse()` in `tools/pod-sync.cjs`. Leave `courses.target_lang` alone.

**Problem:** `target_lang` carries the BASE tag for a regional-variant course — `deu_at_for_eng`
is `deu`, `ara_eg_for_eng` is `ara`, `spa_mx_for_eng` is `spa`. Casting resolved the pool from
that column, so a variant and its base shared one slot. Tom then ruled opposite pairs either
side of it (German → Moritz + Lena, Austrian German → Felix + Sonja) and six languages became
unlockable: locking one silently recast its sibling.

**Better:** each of the seven affected slots now holds its own ruling, and the same change kills
the long-standing `spa_mx`/`por_br` variant-unreachable bug on the casting page.
**Simpler:** one resolver replaces three disagreeing ones (`pod-sync` and `pod-recast` read the
course code, `api/pod-cast-voices.js` read `target_lang`). `NULL` means "exactly as before".
**Cheaper (total):** the new column is read by the casting path and nowhere else. Retagging
`target_lang` would have touched a column read by ~105 files across Popty and
`ssi-learning-app` — syllable counting, i18n, entitlement, pricing, the learner round map —
each one a learner-facing failure if wrong, and each one needing its own regression pass.

**Searched & rejected:**
- Retag `courses.target_lang` to the true variant tag — rejected on blast radius, above. It was
  the option the casting worker named first; the enumeration is what ruled it out.
- Derive the variant from the course code everywhere — rejected: the estate's standing lesson
  from `spa_mx_for_eng` is "read the column, never the course code". Kept as tier 2 *below* the
  column, purely so no course the tools already cast correctly can regress.
- Make manual voice picks stick / re-fix after every sync — rejected by Tom's brief.

**Fallback on a bad key THROWS, deliberately.** A `voice_pool_key` naming a pool that does not
exist raises rather than falling back to the base language: a silent fallback is precisely the
miscast the column exists to stop.

**Verification:** resolved casts computed for all 145 courses before and after —
132 byte-identical, 13 moved, every one intended or a stated knock-on
(`docs/pods/t21-resolved-cast-after-diff.json`). 102 unit tests green across five suites.

**Search width:** re-levelled (the brief framed it as "give variants their own language tag";
the enumeration moved the question from *which tag* to *which column*)
**Decided by:** agent — Tom's brief delegated the (a)/(b) choice explicitly and called it
reversible. The casting rulings applied are Tom's own.

## 2026-08-19 — publication is two nullable columns on the rows that already exist

**Decision:** publishing learner-facing copy is a `published_at` / `published_by` stamp on the
existing append-only version rows, and "the live text" is the row with the greatest non-null
`published_at`. No publish table, no pointer row, no content copy, no status enum.

**Better:** rollback falls out of the model rather than being built — stamping an older row
makes it the newest published, so undo is the same click as publish and cannot lose anything.
Every publish is attributable and every past state is reachable, because content is never
copied, edited or deleted. Save stays exactly what it was: a draft that reaches nobody.
**Simpler:** two nullable columns and one ordering rule, expressed once in
`api/lib/copy-publish.js` and imported by both the editor endpoint and the learner endpoint —
so the two surfaces cannot disagree about what a learner is reading. A pointer row would have
been a second source of truth to keep consistent with the history it points into.
**Cheaper (total):** nothing new to back up, migrate or reconcile; the store stays one table
of plain text. The learner path costs one indexed read per edge-cache miss at
`s-maxage=60` — and the alternative it replaces, a code deploy per wording change, costs a
branch, a review and a release train for every comma.

**Searched & rejected:**
- A `published` boolean per row — rejected: publishing then has to unset the flag on the old
  row, which is two writes that can half-fail, and the history of what was live when is gone.
- A separate `htw_copy_published` pointer table — rejected: a second source of truth, and it
  buys nothing the timestamp does not already give.
- Copy the published content into a new row — rejected outright: it duplicates text, and it
  makes "which version is this" unanswerable after two rollbacks.
- Auto-publish on save (Tom raised it: *"we could just have the save auto-publish in the
  app?"*) — rejected in the source conversation in favour of his own second option: autosave
  stays the draft safety net, Publish is a separate button. A 2s autosave that reached
  learners would put half-typed sentences in front of them.

**A real bug the tests found:** a rollback clicked in the same millisecond as the publish it
undoes ties on `published_at`, and the rollback target — being the *older* row — loses any
id-based tie-break, silently leaving the wrong words live. Fixed by preventing the tie rather
than resolving it: `nextPublishStamp()` makes every publish strictly later than the one it
replaces.

**Verification:** 30 unit tests over the rules and both endpoints, plus a probe against the
real PostgREST on throwaway rows confirming that the rollback ordering and the
`published_at is not null` filter behave as the test double does, and that an unpublished
draft is unreachable through the public filter. 112/112 across the whole `api/` suite.

**Search width:** four options enumerated above; the pointer-table option was the one to beat
and lost on having a second source of truth.
**Decided by:** agent — the brief pre-decided the column shape and called it reversible. The
save-vs-publish split is Tom's own ruling of 2026-08-19.

---

## 2026-08-30 — Script View: the determinism boundary, and the spaced-review slot

**Decision.** The Script View keeps generating (it is an editable QA surface, Tom's ruling), but
the part of it a learner is promised — structure, round composition, cycle order, and which
LEGO's basket each spaced-review slot draws from — is what must match the serving path. The
random half stops being rendered at all: **each spaced-review slot is now ONE row naming the
LEGO, tapped to expand into that LEGO's whole USE basket** ("the spaced rep part of the script
should JUST show the LEGO ID and its basket of USE phrases as a clickable expand" — Tom,
2026-08-30). Nothing on the page invents a drawn phrase any more.

**What was established first** (`docs/script-view/what-order-the-learner-hears-2026-08-30.md`):

- The Script View has always run its own generator (`services/learning-script-generator.cjs`,
  behind `/api/production/:courseCode/learning-journey`, production-api.cjs:8440). Its own header
  says so: *"dashboard mirror … no shared code — keep the two in sync by hand."* Confirmed, not
  suspected.
- The live learner path is **not** the bundle. `packages/core/src/script/generateScript.ts` is
  built but has **no caller in player-vue** and nothing fetches `/api/courses/:code/bundle` from
  the client. A learner is served by `/cycles` for the opening (DB position order) and then by
  `providers/generateLearningScript.ts` in the browser (shortest-first, via
  `capPhrasesByLength`). Wiring Popty to the bundle generator today would have mirrored a path
  nobody is served by — the brief's suggested target, and it was wrong.
- On phrase order the Script View and the live walk **agree** (both shortest-first, which
  `ralph-methodology.md` line 270 states as doctrine). The position-order sort lives in the
  bootstrap endpoint and in the unswitched bundle generator. A-307 is a question about those two,
  not about the review tool.

**Why the basket row rather than a seeded draw.** Reproducing the draw would have meant the view
carrying a second copy of a per-learner random process — the exact duplication that let the
position-order sort go unnoticed. A slot that names its basket is honest about precisely what is
determined, and it is cheaper: no seed to keep in step, nothing to drift.

**Known consequence, named rather than hidden.** Because the view no longer draws, a review can
no longer claim a phrase for the round, so CONSOLIDATE occasionally picks a phrase a learner's
draw would have taken (observed once across spa_for_eng's first 8 rounds). Item counts also fall,
because a slot is one row where it used to be up to three.

**What is NOT done, and is the larger remaining piece.** The deterministic half still has two
implementations — Popty's `.cjs` and player-vue's `generateLearningScript.ts` — kept in step by
hand. Collapsing them means promoting the live walk (not the bundle generator) into `@ssi/core`
and having Popty call it, which is a cross-repo build change (Popty is CJS, `@ssi/core` is ESM/TS)
plus a golden-master parity run over several courses. Estimated a day's work of its own, and it
should not start until the bundle cutover's client half is switched on or abandoned — otherwise
it will be redone.

**Decided by:** agent, under Tom's 2026-08-30 ruling on the spaced-rep rendering; the ordering
question (A-307) was deliberately left untouched.
