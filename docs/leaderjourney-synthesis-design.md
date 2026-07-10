# LeaderJourney × Synthesis — cutover design

*2026-07-09, Fable 5. Design only; no product code in this change. Grounded line-by-line in the
current `main` checkout — every claim below cites a file. Companion docs (design authority,
unchanged by this): `docs/voice-engine/design/multi-voice-model.md`,
`docs/voice-engine/design/pods-recording-model.md`, `docs/voice-engine/design/integration-map.md`.*

---

## 0. Ground truth first — the recon premise is stale, and that's good news

The brief that motivated this design ("wire the built-but-orphaned synthesis engine into a
role-scoped LeaderJourney") described the estate as of ~2026-06-10. Between then and now the
five-branch integration mapped in `docs/voice-engine/design/integration-map.md` **landed on main**:

| Recon claim (June) | Reality on main today |
|---|---|
| Chop/align/splice tools are CLI-only, referenced by nothing | Their logic is **ported into `services/voice-engine/`** (`align.cjs:5`, `chunking.cjs:42`, `splicer.cjs:203` each cite the tool they were ported from) and the engine router is **mounted**: `services/production-api.cjs:381-382` → `/api/production/:courseCode/voice-engine/*` behind the app-level course-scope gate |
| No LeaderJourney exists | `src/views/production/LeaderJourney.vue` (548 lines, 7 steps) is routed at `production/:courseCode/journey` (`src/router/index.js:467-471`) |
| No role scoping | `recorder` role is live and **router-confined** to `/record/:courseCode` (`src/router/index.js:626-647`); TeamRoster is routed (`src/router/index.js:549-551`) with slot assignment + invites (`services/voice-engine/team-router.cjs`) |
| Human recordings unsafe (shared S3 keys, no origin) | Upload seam is fail-closed: fresh UUID keys, `origin='human'`, validation before the S3 PUT (`services/production-api.cjs:4283-4330`) — detail in §4 |
| Voice model is a three-way fork | Two keystone docs already ruled on it; the residue is presentational, not structural (§3) |

**What is genuinely still true from the brief:**

1. **No UI can start a synthesis job.** `grep -rn "voice-engine/synthesize" src/` returns
   nothing. The engine's `POST /synthesize`, `GET /synthesize/status`, `POST /synthesize/cancel`
   (`services/voice-engine/router.cjs:59-106`) have zero frontend callers. LeaderJourney's
   synthesize step ships `links: []` (`LeaderJourney.vue:328`) — it is display-only, and its
   fallback copy ("Coming soon — the stitching engine is being installed",
   `LeaderJourney.vue:327`) is now wrong: the engine IS installed, so the step shows "active"
   with nothing to click.
2. **The Welsh frankenstein-demo is still alive on both sides.** Endpoint:
   `services/production-api.cjs:7308-7390` (hardcoded seeds 1/6/11/60/61/62, hardcoded
   `demo-splices/demo{1,2,3}.mp3` S3 keys, hardcoded `'cym'` language at :7357). Consumer:
   `src/views/RecordingOptimizer.vue` — template §"Audio stitching demo" (:114-226) and script
   (:470-593, the hardcoded `synthesizedExample` / `sourcePhrases` Welsh data and the
   `fetchDemoAudio` call at :564).
3. **The record → synthesize → QA loop has no closed feedback.** Coverage is read (LeaderJourney
   and RecordingOptimizer both call `GET .../voice-engine/coverage`), but a leader cannot: run a
   dry-run, see the gap report ("record these N more"), start the real job, watch it, or play the
   results.

So the cutover is **narrower and cheaper than briefed**: one new view + one journey-step edit +
one deletion pass. No new backend engine work — the engine, its safety, and its honest coverage
already exist and are gated. That is the Better×Simpler×Cheaper heart of this design: **build the
missing seam, delete the fake, change nothing that already works.**

---

## 1. The LeaderJourney as a role-scoped flow

### 1.1 The cast of roles (all live today — no new roles)

Per the keystone (`multi-voice-model.md` §Roles): **the leader IS the course-holding editor** —
no new "leader" role.

| Role | Who | Lands in | Enforced by |
|---|---|---|---|
| **Leader** | `dashboard_users.role='editor'` (or admin) holding the course in `courses[]` | `production/:courseCode/journey` (LeaderJourney) as the course home | `useAuth.canAccessCourse` + course-scope redirect in `router/index.js` `beforeEach` (:626 region) |
| **Editor helper** | same role, invited via TeamRoster editor invite | Same console as the leader | Same |
| **Recorder helper** | `role='recorder'`, invited via `POST .../team/invite` (recorder is the default, `team-router.cjs`) | `/record/:courseCode` Record Room ONLY — teleprompter script mode + dialogue (pod) mode (`src/views/RecordRoom.vue:48-94`) | Recorder-confinement block in `beforeEach` (`router/index.js:639-647`) — runs before the generic course-scope check |

A course needs **≥2 human voices** = two people (or one person is never two slots; a slot maps to
one larynx — `voice-engine/README.md` §Hard rules: "two larynxes are never spliced into one
phrase"). The leader assigns people to slots in TeamRoster (`POST .../team/assign-slot`, which
mints `human_{localpart}_{lang}` and writes `voice_config.voices[slot]` surgically —
`voice-slots.cjs`).

### 1.2 The stages, and which existing piece serves each

LeaderJourney.vue already renders 7 steps with live status. The cutover keeps its architecture —
**the journey is a read-only status shell; every step links out to the tool that does the work**
— and changes exactly one step (5) plus one conditional insertion (5b):

| # | Stage | Status source (already wired) | Links to (the tool) | Cutover change |
|---|---|---|---|---|
| 1 | Translate | `GET /api/stats/:courseCode` (`LeaderJourney.vue:105`) | `/production/:code/text` | none |
| 2 | Decompose | same stats payload | `/production/:code/text` | none |
| 3 | Verify text | `getQASummary` / `/api/qa/summary` (:109-119) | `/production/:code/phrase-qa`, ScriptViewer | none |
| 4 | **Record** (plan → team → record) | `voice-config` (:125) + `voice-engine/coverage` per-slot (:131, :187-215) | Record Room (`/record/:code`), TeamRoster (`/production/:code/team`), plan view (`/production/:code/recording-optimizer`) | none — this step is done and honest |
| 5 | **Synthesize** | `voice-engine/coverage` roll-up (:225-249) | **NEW: Synthesis Studio** (`/production/:code/synthesis`, §2) | `links: []` → link to the studio; kill the stale "Coming soon" copy; done-state logic (:255) unchanged |
| 5b | **Record the dialogues** (conditional — only when the course has listening pods) | `GET .../pods/coverage` (mounted at `production-api.cjs:397-423`) | PodsView casting (`src/views/PodsView.vue`), Record Room dialogue mode | NEW step card, additive, hidden when the course has no pods |
| 6 | Listen & fix (QA) | `audio-stats` (:121) | ScriptViewer journey view | none |
| 7 | Publish | `store.courseInfo.status` | course settings | none |

Step 5b honours the pods keystone: pod lines are **whole-utterance takes, never spliced**
(`pods-recording-model.md` §What this is NOT), so it is a *recording* stage, not a synthesis
stage — it belongs beside step 5, not inside it. Its per-voice queue, casting solver and
registration already exist (`services/voice-engine/pods-router.cjs`: `/cast`, `/cast/propose`,
`PUT /cast`, `/recording-plan`; `RecordRoom.vue` dialogue mode).

**Entry point:** the journey becomes the leader's default landing for a course. Concretely: the
course card / post-login redirect for an editor whose `courses[]` has exactly one course goes to
`journey`, not the ProductionOverview card wall. The full console remains one click away —
scoping is a default, not a wall (Popty is an admin tool; the persona fix is jargon and
sequencing, per `docs/fable5-brief.md` §The leader's journey).

---

## 2. The in-app synthesis engine — what to build (the one new surface)

### 2.1 What already exists (do not rebuild)

The course-agnostic, multi-voice-aware engine is `services/voice-engine/` — mounted, gated,
tested (`npx vitest run services/voice-engine`):

- `POST /api/production/:courseCode/voice-engine/synthesize` `{ role | voiceId, dryRun?, includeSeeds? }`
  — starts a per-(course, voice-slot) job: load → align (zero-ML slow-gap, ported from
  `tools/recording-optimizer/align-audio.cjs`) → cut segments to
  `segments/{course}/{voiceId}/{UUID}.mp3` → register whole natural takes (a recorded take
  ALWAYS beats splicing that phrase) → plan → splice uncovered phrases (planner-parity chunking,
  −16 LUFS, 20 ms crossfade, ffmpeg→lame) → upsert `course_audio` `origin='human'` on the live
  5-column unique index → human-preferring link pass. (`synthesis-job.cjs:1-27`.)
- **Dry-run** stops after plan and returns the full report in one round-trip
  (`router.cjs:75-79`), including `gapReport` — the "record these N more" list
  (`synthesis-job.cjs:367-397`).
- **Status/cancel**: in-memory job registry keyed `(courseCode, voiceId)` with
  `state / phase / progress {current,total,success,failed} / errors / report`
  (`synthesis-job.cjs:44-88`). Restart-safe by idempotency, not persistence: re-POST after a
  crash skips manifest-present segments and already-registered texts (`synthesis-job.cjs:15-19`).
- **Honest coverage**: `GET .../voice-engine/coverage` → real `counts.phrases` and per-slot
  `{ role, voiceId, isHuman, needed, covered, recordedTakes, spliced, missing,
  alignmentFailures, seedAutoCoverGap }` (`coverage.cjs:100-150`).

### 2.2 The missing seam: Synthesis Studio

One new leader-facing view — **`src/views/production/SynthesisStudio.vue`**, routed as a
production child at `production/:courseCode/synthesis` (sibling of `journey`, `team`,
`recording-optimizer` in `src/router/index.js`) — plus the LeaderJourney step-5 link. No new
backend routes; the view drives the four existing endpoints. Plain language throughout (the
journey's register: "stitch", "recordings", "voices" — never ZUT/M-LEGO/GuaranteedCoverage).

Layout: **one card per voice slot** (`target1`, `target2` — from `voice-config`, same read as
`LeaderJourney.vue:125`), each card a small state machine:

1. **Readiness** (from `coverage`): "Catrin — 148 recordings in, 12 missing, 3 couldn't be
   lined up". `alignmentFailures` and `seedAutoCoverGap` render as plain-language re-record
   prompts with a link into the Record Room.
2. **Check first** (button → `POST /synthesize {role, dryRun:true}`): renders the returned plan —
   "Ready to stitch 1,240 phrases from 610 pieces. 37 phrases can't be stitched yet — these 9
   short recordings would cover them" (the `gapReport`, capped at 50 server-side). The gap list
   deep-links to the Record Room so the loop *record → check → record* closes without the leader
   leaving the flow.
3. **Stitch** (button → `POST /synthesize {role}`): poll `GET /synthesize/status?voiceId=` every
   ~2 s while `state==='running'`; render `phase` + `progress` as a plain progress bar
   ("Stitching… 480 of 1,240"). Cancel button → `POST /synthesize/cancel`. A 409 conflict
   (`router.cjs:69-74`) renders as "already running" and attaches to the existing job's status.
4. **Result** (job `report`): counts registered/spliced/failed + the same gap list if any
   remain, and **real playback** — a "listen to a few" sampler that plays freshly written
   `course_audio` rows through the same signed-URL path ScriptViewer uses, then a primary link
   to step 6 (ScriptViewer journey view) for the full QA listen.

Design rules the studio must honour:

- **The engine owns all decisions; the UI never re-derives.** Coverage numbers, gap lists, and
  the take-beats-splice rule all come from the server payloads. The UI is a renderer + four
  buttons.
- **One job per (course, voice) at a time** is an engine invariant — the UI reflects the 409,
  it doesn't queue.
- **Job state is in-memory on the service** (phase8 idiom). A service restart mid-job surfaces
  as a status 404; the UI's recovery copy is "the stitcher was interrupted — run it again, it
  continues where it stopped" (true by idempotency). No client-side job persistence.
- **Dry-run is free here and correct here** (pure planning, no writes, no LLM) — this is the
  legitimate use, distinct from the banned dry-run-for-cheap-ops pattern.

### 2.3 What replaces the frankenstein demo's *teaching* job

The demo's purpose was to show a sceptical leader that stitching works. The studio's **Result**
state does that with the leader's own course and voices — real spliced phrases, play buttons,
the phrase's chunk breakdown from the actual splice plan. Reality is the demo. Nothing
synthetic is kept (Tom's ruling: if in doubt, cut it out).

### 2.4 The CLI tools' final status

`tools/recording-optimizer/generate-recording-script.cjs` **stays live** — it is the wired
planner (`services/production-api.cjs:7146`). `align-audio.cjs`, `segment-audio.cjs`,
`splice-legos.cjs` are **superseded** by their ported service twins (`voice-engine/align.cjs`,
`segment-store.cjs`, `splicer.cjs` — each header cites its parent). Keep them as offline dev
harnesses with a one-line supersession note in each header pointing at the service module —
they're committed shared tools; deleting them buys nothing and breaks Kai's offline workflow if
he has one. They must never be wired into the app path.

---

## 3. Reconciling the three-way voice model

The fork the recon found is real but already has rulings; what's missing is stating it as **one
model** and fixing the residue. The model: **`courses.voice_config` is the per-course voice
registry, with two kinds of entries; `listening_pods.speakers` is script markup, not a voice
registry at all.**

| Layer | Where | What it means | Cap | Synthesis relationship |
|---|---|---|---|---|
| **Serving slots** | `voice_config.voices.{known, target1, target2, presentation}`, each `{provider, voiceId, speed…}` | The voices learners hear on the LEGO/phrase path. A human = `{provider:'human', voiceId:'human_x_lang'}` in a slot | **Hard 2 target voices** — set by the `target1_audio_id`/`target2_audio_id` FK columns on `course_legos`/`course_practice_phrases`, i.e. by schema, not by config (`multi-voice-model.md` §core insight) | The **unit of splice synthesis**: one job per slot; splice space partitions by `(voice_id, cadence)` |
| **Pod cast** | `voice_config.podCast.{<speakerName>: {voiceId, name, email}, __explainer__: …}` — additive key TTS serving never reads (`production-api.cjs:420`) | Which human records which *character* in the listening dialogues | 4–5 voices is the design centre; N is open | **Never spliced** — whole-utterance takes registered per sentence (`pods-registration.cjs` via the upload seam, `production-api.cjs:4392-4408`) |
| **Script colouring** | `listening_pods.speakers` (jsonb per pod) + `listening_pod_sentences.speaker` | Which *character* says which line — authored at generation time | per-pod | Input to casting only: the people-first solver (`pods-cast.cjs`) maps characters → the leader's actual recorders; generation colouring is a default suggestion, never an override (`pods-recording-model.md` addendum, softened 2026-06-11) |

So the reconciliation is: **slots are for splicing, cast is for dialogue, colouring is for the
script** — three concerns, one registry (`voice_config`), one shared currency (the minted
`voiceId`). The same person may hold a serving slot AND a cast entry; the voiceId is identical,
so coverage and provenance attribute both to one human.

Residue to fix or explicitly accept in this cutover:

1. **The journey shows only half the picture.** LeaderJourney reads `voices.*` coverage but
   nothing pod-side. Fix = step 5b (§1.2) reading `GET .../pods/coverage`. Presentational only.
2. **`dashboard_users.voice_id` is a single column** while mints are per-course — a recorder in
   two courses with different target languages shows "Not yet assigned" in the older course's
   Record Room. Known, documented (`voice-engine/README.md` §Known limitation; integration-map
   M6). Per-course `voice_config` stays canonical; synthesis is unaffected. **Accept for this
   cutover**; the durable fix is a `voice_id` per `(user, course)` mapping and is deferred DDL.
3. **The 2-target cap is invisible to leaders.** TeamRoster and the studio should say it plainly
   ("a course has two speaking voices; extra helpers record the dialogues") rather than let a
   leader hunt for a third slot. Copy, not code.

No schema change, no new config key, no migration of existing `voice_config` rows.

---

## 4. Precious-audio safety — the guarantees this cutover must not regress

All verified live in the current upload seam (`services/production-api.cjs:4260-4470`) and
engine. The studio adds **zero new write paths** — it only triggers the engine — so the risk is
regression-by-edit, not new surface. The invariants, each with its anchor:

1. **Every take gets a fresh S3 object key; an existing object is never PUT over.**
   `audioId`/`s3KeyUuid` are server-minted `crypto.randomUUID()` per upload
   (`production-api.cjs:4283-4292`). The old client-fabricated `script-N` shared-key bug is dead;
   the comment block at :4283-4289 is the tombstone. Splices likewise write fresh
   `mastered/{UUID}.mp3` (`voice-engine/README.md` pipeline §5).
2. **Fail closed before bytes land.** Pod identity and regeneration-row lookups run BEFORE the
   S3 PUT so a bad id can never orphan bytes (:4294-4330).
3. **`origin='human'` marks rows precious** on every human write: regeneration repoint (:4378),
   pod registration (:4392), engine take-registration and splice upsert (`voice-engine/db.cjs`,
   README §Hard rules) — and the origin guard means TTS regeneration never overwrites a human
   row.
4. **Re-records supersede by re-pointing, never by overwrite.** The old `s3_key` / replaced
   audio id ride in `recording_provenance` (`recording-upload-helpers.cjs:80-99`); old rows and
   objects are kept.
5. **Identity is server-resolved.** `voice_id` comes from `voice_config` (slot or podCast) on
   the server; the client's value is advisory and logged on disagreement (:4451-4469).
   `recordedBy` prefers the authenticated session over the client claim (:4410-4424).
6. **QA-state failures never fail an uploaded take** (:4426-4444) — a flag write must not lose
   audio.

Two hardening items the cutover should carry (small, no redesign):

- **The upload endpoint is not auth-gated** — the code says so itself (:4422 "Endpoint is not
  auth-gated — fall back to the client-sent identity"). Gate it with the same
  `resolveDashboardUser` course-scope check the rest of `/api/production/:courseCode/*` uses,
  after verifying invite-code recorder tokens pass (integration-map M7's open verification).
  This is also the brief's one named security item (cross-course access) applied to the most
  precious write path.
- **Frankenstein deletion must not delete audio.** The `demo-splices/demo{1,2,3}.mp3` S3
  objects become orphans when the endpoint dies. Per the asset-deletion approval gate: **leave
  them in S3** (cost ≈ zero) unless Tom approves a deletion plan. The code deletion (§6) is
  reversible via git; the S3 objects are not ours to delete unprompted.

---

## 5. Migration / build order — each step shippable alone

Additive before destructive: the replacement must be visibly working on the pushed artifact
(Tom's taste-pass) before the fake comes out.

| Step | Ships | Touches | Done-when |
|---|---|---|---|
| **1. Synthesis Studio (read-only first)** | New view + route rendering per-slot coverage/readiness from `GET .../voice-engine/coverage`; LeaderJourney step 5 gains its link and loses the stale "Coming soon" copy (`LeaderJourney.vue:324-328`) | `src/views/production/SynthesisStudio.vue` (new), `src/router/index.js` (one child route), `LeaderJourney.vue` (step-5 block) | A leader sees honest per-voice readiness on the deployed preview; no mutation surface yet |
| **2. Dry-run + gap loop** | "Check first" button → `POST /synthesize {dryRun:true}`; gap report rendered with Record Room deep-links | SynthesisStudio only | Leader on a real course sees the plan + "record these N more", clicks through, records, re-checks, gap shrinks |
| **3. Run + progress + results** | "Stitch" → real job; status polling, cancel, result report with playback sampler; step-6 handoff | SynthesisStudio only | Record-150→synthesize-1500 executes end-to-end from the UI on a small real course (the shakedown: first real run, checkpointed per voice) |
| **4. Kill the frankenstein** | Delete endpoint + demo section (full list §6); fix the stale `recording-studio` link (`RecordingOptimizer.vue:102` points at the deprecated redirect, `router/index.js:527-532`) | `services/production-api.cjs`, `src/views/RecordingOptimizer.vue` | RecordingOptimizer is a pure plan view; `grep -rn frankenstein` returns nothing |
| **5. Pods step in the journey** | Conditional step 5b card reading `GET .../pods/coverage`; links to PodsView casting + Record Room dialogue mode | `LeaderJourney.vue` only | A course with pods shows dialogue-recording progress in the journey; a course without shows nothing new |
| **6. Journey as leader home + upload gate** | Editor default-landing → journey; auth-gate the upload endpoint after M7 token verification with a real invite-code recorder | `src/router/index.js` / login redirect; `production-api.cjs:4261` region | A fresh editor lands in the journey; an unauthenticated upload 401s; a recorder's upload still lands |

Steps 1-3 are one view growing in place — each is independently testable on the deployed preview
(no dev servers; real phone for the playback sampler). Step 4 only after 3 is verified working.
Steps 5 and 6 are independent of 1-4 and of each other. Vitest engine suite + `npx vite build`
green before each push; work stages on `feature/…` branches → main per house rules, never on
anyone's `claude/*`.

---

## 6. What gets DELETED

**In step 4, once the studio is live and verified:**

1. `services/production-api.cjs:7308-7390` — the whole `GET /:courseCode/frankenstein-demo`
   endpoint: hardcoded Welsh seeds 1/6/11, pre-baked `demo-splices/*` keys, the hardcoded `'cym'`
   in the `findCourseAudio` call (:7357).
2. `src/views/RecordingOptimizer.vue`:
   - template: the "Audio stitching demo" section (:114-226) incl. the hidden `<audio>` element;
   - script: `sourceStyles` (:471-475), `synthesizedExample` (:478-491), `currentExample`
     (:494-502), `sourcePhrases` (:505-536), `usedSources` (:539-542), `sourceProvides`
     (:545-554), `demoAudio`/`demoAudioPlayer`/`currentlyPlaying` (:557-559),
     `fetchDemoAudio` (:562-579), `playDemoAudio` (:582-593), and the `fetchDemoAudio()` call in
     `onMounted` (:648);
   - style: the light-mode overrides that exist only for the demo's Tailwind accents
     (:657-668) — keep any class still used by the surviving plan view.
3. The stale `/production/:courseCode/recording-studio` link (`RecordingOptimizer.vue:102`) →
   point at `/production/:courseCode/recording` directly (the router redirect at
   `router/index.js:527-532` stays for old bookmarks).

**Explicitly NOT deleted:**

- `demo-splices/demo{1,2,3}.mp3` in S3 — orphaned, harmless, and asset deletion requires Tom's
  approval plan (§4). Flag, don't touch.
- `tools/recording-optimizer/*.cjs` — planner stays wired; the three superseded tools stay as
  offline harnesses with supersession headers (§2.4).
- `RecordingOptimizer.vue` itself — it remains the "See the reading plan" view the journey's
  record step links to; its stats are already de-faked via the coverage endpoint (:440-455).
- Anything in `services/voice-engine/` — it is the product now.

---

## 7. The three calls that are Tom's

1. **Journey as the leader's landing page** (step 6): default editors-with-one-course into
   `journey` instead of the console card wall? My read: yes — the persona brief names the card
   wall + jargon as the problem; the console stays one click away. Say no and step 6 shrinks to
   the upload gate only.
2. **Demo S3 objects**: leave the three `demo-splices/*.mp3` orphans in S3 (my default), or
   approve a deletion plan.
3. **Recorder invite auth (M7)**: if verification shows OTP-only recorders have no token that
   `resolveDashboardUser` accepts, gating the upload endpoint (step 6) needs a session story for
   recorders first — that's a design fork worth one sentence from you before anyone builds it.
