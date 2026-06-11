# Pods integration map — casting × dialogue-autocue × registration

Three branches off `e27e2c68`, verified 2026-06-11 (all suites + vite builds green in each worktree):

| Branch | Worktree | vitest services/voice-engine | vite build |
|---|---|---|---|
| `pods/casting` | wt-pod-cast | 11 files / 118 tests PASS | PASS |
| `pods/dialogue-autocue` | wt-pod-cue | 9 files / 99 tests PASS | PASS |
| `pods/registration` | wt-pod-reg | 11 files / 108 tests PASS | PASS |

## 1. File collisions (`git diff --name-only e27e2c68..HEAD` per worktree)

**Only one file is touched by more than one branch: `services/production-api.cjs`** (casting + registration).
Both insert at the SAME spot (immediately after the team-router mount, ~line 394) → guaranteed textual
merge conflict on the second merge. Resolution: keep both hunks, **coverage `app.get` FIRST** (see §3.B).

Everything else is disjoint:
- casting: `services/voice-engine/{pods-cast,pods-plan,pods-router}.cjs`, `tools/pod-voice-colour-n.cjs`, `src/components/PodCastPanel.vue`, `src/views/PodsView.vue`, tests `pods-cast-solver/pods-cast/pods-plan`
- autocue: `src/utils/podRecordingPlan.js`, `src/views/RecordRoom.vue`, `src/components/production/autocue/{DialogueCue,PodDialogueStudio}.vue`, test `pod-recording-plan-contract.test.mjs`
- registration: `services/voice-engine/{pods-registration,pods-coverage}.cjs`, `services/recording-upload-helpers.cjs(+test)`, `services/phases/phase8-audio-v13.cjs` (one additive export `humanRowAtAudioKey`), `src/views/PodDetailView.vue`, tests `pods-coverage/pods-origin-guard/pods-registration`
- No test-file name collisions; PodsView (cast) vs PodDetailView (reg) vs RecordRoom (cue) are different files.

## 2. MUST-FIX contract mismatches

### A. Recording-plan item shape: server (pods-plan.cjs) ≠ client canonical (podRecordingPlan.js)
The cue branch's normalizer is liberal, but the casting plan's actual keys fall OUTSIDE its accepted lists.
**No test catches this** — the cue contract test runs on fixtures only (never imports pods-plan.cjs), so all
suites stay green after merge while the autocue breaks at runtime. Four concrete drifts:

1. **cues**: server emits `cues:[{speaker, target, known}]` (pods-plan.cjs:183); normalizer accepts
   `targetText|target_text|text|line` and `knownText|known_text|gloss` only (podRecordingPlan.js:56-64)
   → every cue renders with EMPTY text in DialogueCue.
2. **gloss**: server emits `knownGloss` on target items (pods-plan.cjs:163); normalizer picks
   `gloss|knownText|known_text` top-level → known-language gloss lost on the line being recorded.
3. **scene**: server emits nested `scene:{number,title}` + `sceneStart`; normalizer reads top-level
   `sceneNumber/sceneTitle` only → pod/scene boundary headers never render.
4. **recorded/audioId**: server NEVER stamps them (pure pods-plan has no DB knowledge; pods-router doesn't
   enrich) → normalizer defaults `recorded:false`, `audioId:null` → resume always starts at item 0, per-pod
   progress always 0/n, `replacesAudioId` in upload metadata always null.

**Fix (one integration commit, server-side, after all merges):** in `pods-router.cjs` GET /recording-plan,
map plan items to the canonical pinned shape (`cues[].targetText/knownText`, flatten `sceneNumber` +
`sceneTitle` (sceneStart-only), emit gloss as `knownText` or add `knownGloss` to the normalizer) and stamp
`recorded`/`audioId` per item: sentence `{target|known|explainer}_audio_id` → course_audio row with
`origin='human'` AND `voice_id === plan voiceId` (exactly the lookup `pods-coverage.cjs`/`humanRowAtAudioKey`
already implement in the registration branch — reuse, don't reinvent). 1-4 could alternatively be patched in
the normalizer's accept-lists, but recorded-stamping is server-only regardless, so do it all at the router edge
against the canonical shape pinned in `pod-recording-plan-contract.test.mjs`.

### B. production-api.cjs mount order: coverage route vs pods router
`requireDashboardUser` (router gate) has NO loopback bypass and 401s without a Bearer token; the app.param
gate DOES bypass loopback-direct. PodDetailView fetches `/pods/coverage` with a PLAIN fetch (no auth header,
PodDetailView.vue:608). If `app.use('/.../pods', pods-router)` is registered BEFORE
`app.get('/.../pods/coverage')`, the router's gate intercepts /pods/coverage and 401s it even for
loopback/dev → coverage chips dead everywhere. **Resolve the merge conflict with the coverage `app.get`
ABOVE the router mount** (Express matches in registration order; the router would otherwise see /coverage,
find no route, but only after its auth middleware has already killed the request).

## 3. Contracts checked and CONSISTENT (no action)

- **Roles**: `target→target1, known→known, explainer→pod_explainer` identical in cue `roleForKind` and reg
  `POD_KIND_ROLES`; reg validates kind server-side and derives role itself (client `role` advisory). recon §1 ✓
- **canonicalSpeakerName**: byte-equivalent parens-strip in `tools/pod-voice-colour-n.cjs:55` and
  `pods-registration.cjs:90` (deliberate reimplementation to avoid booting phase8). ✓
- **podCast shape** `{ "<speaker>": {voiceId, name?, email?}, "__explainer__": {...} }` consistent across
  cast PUT validation/mergePodCast, plan `castVoiceFor` (canonical + raw-key fallback), reg
  `resolvePodCastVoiceId` (same fallback), cue email auto-detect. ✓
- **email auto-detect**: PodCastPanel PUT includes `email` when the roster voice has one
  (PodCastPanel.vue:244); placeholders carry none — `?podVoice=` link covers that (wired in RecordRoom). ✓
- **Upload metadata**: cue `buildPodUploadMetadata` carries everything reg validates (`mode:'pod'`, podId,
  sentenceId, kind as strings); extra keys advisory; `uuid:null` + server mints — matches reg seam. ✓
- **Upload response**: reg returns `uuid` (= linked course_audio id) + `pod:{podId,sentenceId,kind,audioId,
  replacedAudioId,voiceId}` — what cue carries back. ✓
- **Record-ahead-of-casting**: reg falls back to client voiceId when cast misses; 400 when neither. ✓
- **404/empty plan**: cue shows "Casting not set up yet" for both 404 AND 0-item 200s — covers the router's
  200-with-empty-items behavior for an uncast voice. ✓

## 4. Known-and-accepted (note, don't block)

- Plan top-level: server `castSpeakers`/`counts` not read by normalizer (`speakers|characters`, recomputed
  totals) → cosmetic empty speaker chips; `voiceName` absent → null.
- `sentenceIds` (len 1) → normalizer sets `glueSentenceIds:[id]` on every non-glued item — advisory only,
  reg ignores it.
- Glue chains: plan makes ONE item per chain but reg links ONLY `sentenceId` (first row) — rows 2..n of a
  chain would keep TTS audio. Latent: zero glued rows live post canon-v2 (recon §5).
- Coverage fetch is unauthenticated → 401 behind ngrok (non-fatal, chips hide; same pre-existing pattern as
  the pod-detail fetch). Upload endpoint not auth-gated (pre-existing, flagged by reg).
- No bumpCourseVersion on PUT /cast (podCast never read by serving — keystone §1).

## 5. Merge order

1. **`pods/casting`** → main-line (server endpoints + cast UI; nothing depends on the others).
2. **`pods/registration`** → resolve the single `production-api.cjs` conflict; coverage `app.get` ABOVE the
   pods-router mount (§2.B). Run both suites in the merged tree.
3. **`pods/dialogue-autocue`** → merges clean (client-only + fixture test).
4. **Integration fix commit (REQUIRED before anyone records)**: canonical plan shape + recorded/audioId
   stamping at the router edge (§2.A), reusing reg's human-row lookup. Then a live smoke: cast a voice on a
   dev course, open `/record/:courseCode?podVoice=`, confirm cues/scene headers/gloss render and
   recorded counts move after one take.

## 6. Mount checklist (post-merge production-api.cjs)

- [ ] `const podsRegistration = require('./voice-engine/pods-registration.cjs')` at top (reg hunk).
- [ ] `app.get('/api/production/:courseCode/pods/coverage', ...)` BEFORE the pods-router mount.
- [ ] `app.use('/api/production/:courseCode/pods', require('./voice-engine/pods-router.cjs')({...}))`
      with `requireDashboardUser, userCanAccessCourse, getDb, logger` (mergeParams; no internal :courseCode).
- [ ] Upload seam: `isPodMode` short-circuits before `isScriptMode`; prepare BEFORE S3 PUT; commit AFTER;
      sample_flags skipped for pod mode; provenance `pod` param wired into `buildProvenanceContext`.
- [ ] `pm2 restart production-api` on Camberley after main pull; `npx vitest run services/voice-engine`
      (should be 11+1+3 = ~15 files; no name collisions) + `npx vite build` in the merged tree.
