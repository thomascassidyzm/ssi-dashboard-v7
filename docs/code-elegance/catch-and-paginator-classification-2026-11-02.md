# Popty: catch-block and paginator classification

Read-only classification, 2 November 2026, job #134 on origin/main at ef5d81986. **Corrected and completed by job #179 (same day) after the fold was built**: the table below is regenerated from the live file on branch `cs/179-popty-catch-fold-finish-149` (line numbers are that tree's, after the #149 paginator edits and the #179 fold), every one of the 279 handlers read, and the verdict column says what was actually done, not what was proposed.

## 1. The catch blocks in production-api.cjs

The file has **279** catch blocks (#134 counted 275 and the original proposal 206). **53 were folded** onto the named responder; **226 stay** as they were.

What #134 got wrong, and what #179 found by reading rather than pattern-matching:
- **The "83 safe" set did not share one shape.** 31 of the 83 log something other than the error object — `err.message` (13, e.g. the seeds/legos/progress reads), `err?.message || err` (12, e.g. canonical-pods, phrase-v4, audit, db-health), or the message interpolated into the tag (4, the pods and pod-scripts reads) — and a shared helper that logged the object would change the log output (a stack where there was a message, or a message where there was a stack). They stay. The other 3 of the 31 are gender-prep check/override/flag-count, which Tom named out.
- **`POST /api/production/:courseCode/manifest/generate` is not an audio spend path.** It builds the legacy manifest JSON from the database and caches it; no TTS, no write. #134 kept it out on the route name; #179 read it and folded it.
- **`POST /api/auth/invite-dashboard`, the regenerate-single/presentation/phrase/lego proxies and `GET /api/pods/*`** carry a fallback string (`|| 'Failed to invite user'`, `|| 'Phase 8 audio server not reachable'`) or log the message only. The fold set turned out to need **no fallback parameter at all**: every folded catch answers bare `err.message`, so the responder has none — one parameter fewer than the brief allowed.
- Four catches #134 never classified (main L8416 `return refuse(400, e.message)` in the admin edit door, L11125 `/* no state dir yet */`, L11782 `safeParseJson`, L12708 the pm2 plist stat) are none of them the plain shape; they stay, as Tom named.
- The 2026-11-02 hand-over said all five page-all loops went to `readAllPages` at pageSize 1000. **Four did**; the fifth, the legacy audio-stats read in `startLegacyAudioGeneration`, was already on the helper and keeps its 5000 default (only its inline `require` was lifted to the top of the file).

Rule applied by #179, in order. A catch stays if any of these hold:
1. It is not a route handler (a helper function or an inner catch).
2. Tom named it: line 700 (login-code generation; every other `/api/auth` route kept with it), main 8416 / 11125 / 11782 / 12708, and every gender-prep route.
3. The route is a money or audio-spend route (pricing tier, audio/reuse/deploy plans, the trial, every regenerate-*, `/api/audio/render`, pod audio generation).
4. The route is a booth route (recording queue/claim/release/upload, ingest-cut, add-recording, recording-optimizer/volumes/script).
5. The route writes course content or audio links (the `content-write-surfaces.cjs` manifest, plus regeneration triggers, link-presentation-audio, reuse-apply, mark-new, pod-sentences, canonical pod and seed edits, stage-draft, phrase-v4 gate and gap-fill, mapping, audio-pipeline start/cancel/retry/link/fix/sync, pod visibility, audit-restore).
6. The route deploys or publishes (platform-status, status, publish-manifest, stage-deploy, stage-restart, course-configs, deploy-audio) or deletes assets or audit history.
7. The catch body is not **exactly** `logger.error(<tag>, err)` then `res.status(500).json({ error: err.message })` — the error object itself in the log, bare `err.message` in the body, no fallback, no envelope, no socket emit, no other status.

Everything else folded: 53 catches, all GET reads or bookkeeping writes (sample/audio flags, feedback, course_export_states and its temp files, the S3 verify spawn). The responder is `services/shared/server-error.cjs` (`serverErrorResponder(logger)` → `serverError(res, tag, err)`), bound once next to the logger in production-api.cjs, tested in `services/shared/server-error.test.cjs`; the fold commit is 53 hunks of exactly -2/+1 lines, which is the byte-identity proof.

### Every catch, by line (branch cs/179, after the fold)

| line | route | verdict | reason |
|---|---|---|---|
| 318 | fn: verifySupabaseJWT | stays | not a route handler (helper or inner catch) |
| 334 | fn: attachCasting | stays | not a route handler (helper or inner catch) |
| 452 | fn: resolveDashboardUser | stays | not a route handler (helper or inner catch) |
| 505 | fn: resolveDashboardUserCached | stays | not a route handler (helper or inner catch) |
| 570 | get  /api/production/:courseCode/pods/coverage | stays | not the plain log + 500 { error: err.message } shape |
| 691 | post  /api/auth/login | stays | auth route (line 700 named by Tom; the rest kept with it) |
| 708 | post  /api/auth/generate-code | stays | auth route (line 700 named by Tom; the rest kept with it) |
| 802 | post  /api/auth/invite-dashboard | stays | auth route (line 700 named by Tom; the rest kept with it) |
| 852 | fn: handleInvite | stays | not a route handler (helper or inner catch) |
| 889 | fn: handleInvite | stays | not a route handler (helper or inner catch) |
| 905 | get  /api/auth/users | stays | auth route (line 700 named by Tom; the rest kept with it) |
| 925 | delete  /api/auth/users | stays | auth route (line 700 named by Tom; the rest kept with it) |
| 935 | post  /api/auth/logout | stays | auth route (line 700 named by Tom; the rest kept with it) |
| 996 | post  /api/auth/invite-codes/generate | stays | auth route (line 700 named by Tom; the rest kept with it) |
| 1016 | get  /api/auth/invite-codes | stays | auth route (line 700 named by Tom; the rest kept with it) |
| 1079 | post  /api/auth/invite-codes/redeem | stays | auth route (line 700 named by Tom; the rest kept with it) |
| 1085 | post  /api/auth/invite-codes/redeem | stays | auth route (line 700 named by Tom; the rest kept with it) |
| 1123 | post  /api/auth/invite-codes/redeem | stays | auth route (line 700 named by Tom; the rest kept with it) |
| 1158 | get  /api/production/schema/validate | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 1175 | get  /api/library/courses | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 1189 | get  /api/library/course/:courseCode | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 1245 | fn: computeBetaDays | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 1523 | get  /api/estate-map | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 1537 | get  /api/courses/:courseCode/stats | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 1618 | patch  /api/courses/:courseCode/platform-status | stays | deploys or publishes |
| 1705 | get  /api/stats/:courseCode | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 1777 | fn: requireProxyCourseAccess | stays | not a route handler (helper or inner catch) |
| 1826 | fn: proxyCourseBuilder | stays | not a route handler (helper or inner catch) |
| 1878 | fn: proxyOrchestrator | stays | not a route handler (helper or inner catch) |
| 1922 | get  /api/ops/staleness | stays | not the plain log + 500 { error: err.message } shape |
| 1949 | get  /api/explainer/pack | stays | constant message, not err.message |
| 1977 | post  /api/explainer/refresh | stays | constant message, not err.message |
| 2010 | get  /api/languages | stays | constant message, not err.message |
| 2052 | get  /api/courses | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 2141 | post  /api/courses/create | stays | not the plain log + 500 { error: err.message } shape |
| 2167 | get  /api/courses/:courseCode/voice-config | stays | success/ok:false envelope, not { error } |
| 2188 | get  /api/courses/:courseCode/voice-config/resolved | stays | success/ok:false envelope, not { error } |
| 2208 | put  /api/courses/:courseCode/voice-config | stays | success/ok:false envelope, not { error } |
| 2225 | patch  /api/courses/:courseCode/voice-config/:role | stays | success/ok:false envelope, not { error } |
| 2255 | get  /api/voices/discover/:language | stays | success/ok:false envelope, not { error } |
| 2287 | get  /api/courses/:courseCode/seed-phrases-preview | stays | not the plain log + 500 { error: err.message } shape |
| 2348 | post  /api/voices/preview | stays | success/ok:false envelope, not { error } |
| 2422 | get  /api/mission-control/jobs | stays | no response in the catch (helper, inner catch, or fall-through) |
| 2494 | get  /api/mission-control/jobs | stays | no response in the catch (helper, inner catch, or fall-through) |
| 2498 | get  /api/mission-control/jobs | stays | no response in the catch (helper, inner catch, or fall-through) |
| 2536 | post  /api/mission-control/jobs/:jobId/stop | stays | success/ok:false envelope, not { error } |
| 2546 | post  /api/mission-control/jobs/:jobId/stop | stays | success/ok:false envelope, not { error } |
| 2580 | post  /api/mission-control/jobs/:jobId/resume | stays | success/ok:false envelope, not { error } |
| 2634 | post  /api/mission-control/jobs/:jobId/clear | stays | success/ok:false envelope, not { error } |
| 2668 | get  /api/production/course-stats | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 2691 | get  /api/production/:courseCode/stats | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 2750 | get  /api/production/:courseCode/info | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 2851 | post  /api/production/:courseCode/status | stays | deploys or publishes |
| 2905 | post  /api/production/:courseCode/pricing-tier | stays | money / audio-spend route |
| 2927 | get  /api/production/:courseCode/introductions | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 2978 | get  /api/production/:courseCode/presentation/:legoId | stays | no response in the catch (helper, inner catch, or fall-through) |
| 2989 | get  /api/production/:courseCode/presentation/:legoId | stays | no response in the catch (helper, inner catch, or fall-through) |
| 3007 | get  /api/production/:courseCode/presentation/:legoId | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 3030 | get  /api/production/:courseCode/manifest | stays | no response in the catch (helper, inner catch, or fall-through) |
| 3067 | get  /api/production/:courseCode/manifest | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 3107 | post  /api/production/:courseCode/manifest/generate | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 3126 | get  /api/production/:courseCode/manifest/validate | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 3203 | get  /api/production/:courseCode/export-legacy | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 3331 | fn: startLegacyAudioGeneration | stays | not a route handler (helper or inner catch) |
| 3408 | get  /api/production/:courseCode/flags | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 3460 | post  /api/production/:courseCode/flags/update | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 3483 | get  /api/production/:courseCode/audio-flags | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 3603 | get  /api/production/:courseCode/flagged-items | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 3639 | post  /api/production/:courseCode/audio-flags | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 3665 | post  /api/production/:courseCode/audio-flags/:audioUuid/resolve | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 3690 | delete  /api/production/:courseCode/audio-flags/:audioUuid | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 3726 | post  /api/production/:courseCode/audio-flags/bulk-delete | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 3815 | post  /api/production/:courseCode/audio-flags/delete-orphaned | stays | destructive (asset or audit deletion) |
| 3860 | delete  /api/production/:courseCode/phrases/:phraseId | stays | content or audio write route |
| 3885 | post  /api/production/:courseCode/link-clip | stays | content or audio write route |
| 3903 | post  /api/production/:courseCode/sync-intro-links | stays | content or audio write route |
| 3927 | post  /api/production/:courseCode/ingest-cut | stays | booth route |
| 3932 | post  /api/production/:courseCode/ingest-cut | stays | booth route |
| 3957 | patch  /api/production/:courseCode/pod/:podId/solo-readers | stays | content or audio write route |
| 4002 | post  /api/production/:courseCode/phrases/batch-delete | stays | content or audio write route |
| 4037 | post  /api/production/:courseCode/flags/delete | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 4077 | post  /api/production/:courseCode/flags/bulk-update | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 4138 | post  /api/production/:courseCode/feedback | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 4241 | get  /api/production/:courseCode/feedback/aggregated | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 4299 | post  /api/production/:courseCode/feedback/resolve | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 4341 | get  /api/production/:courseCode/feedback/stats | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 4353 | get  /api/production/:courseCode/audio-metadata | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 4410 | fn: getDirectAudioStats | stays | not a route handler (helper or inner catch) |
| 4562 | get  /api/production/:courseCode/shared-audio-status | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 4608 | get  /api/production/:courseCode/audio-stats | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 4663 | get  /api/pods/:courseCode | stays | logs the message inside the tag, not the error object |
| 4691 | get  /api/pods/:courseCode/:slug | stays | logs the message inside the tag, not the error object |
| 4783 | post  /api/admin/pods/:courseCode/:slug/visibility | stays | content or audio write route |
| 4901 | get  /api/pod-scripts | stays | no response in the catch (helper, inner catch, or fall-through) |
| 4908 | get  /api/pod-scripts | stays | logs the message inside the tag, not the error object |
| 4974 | get  /api/pod-scripts/:courseCode | stays | no response in the catch (helper, inner catch, or fall-through) |
| 4996 | get  /api/pod-scripts/:courseCode | stays | logs the message inside the tag, not the error object |
| 5032 | post  /api/admin/pods/generate | stays | money / audio-spend route |
| 5087 | post  /api/admin/pods/:courseCode/:slug/stage-draft | stays | content or audio write route |
| 5110 | patch  /api/admin/pod-sentences/:id | stays | content or audio write route |
| 5129 | fn: podTextSwapsRoute | stays | not a route handler (helper or inner catch) |
| 5152 | get  /api/admin/pods/:courseCode/audio-plan | stays | money / audio-spend route |
| 5170 | post  /api/admin/pods/:courseCode/generate-audio | stays | money / audio-spend route |
| 5197 | get  /api/admin/canonical-pods | stays | fallback text behind err?.message |
| 5223 | get  /api/admin/canonical-pods/:slug | stays | fallback text behind err?.message |
| 5246 | patch  /api/admin/canonical-pods/:id | stays | content or audio write route |
| 5267 | get  /api/canonical-seeds | stays | fallback text behind err?.message |
| 5281 | get  /api/admin/speakability-grid | stays | fallback text behind err?.message |
| 5306 | patch  /api/admin/canonical-seeds/:id | stays | content or audio write route |
| 5359 | get  /api/production/audio/:uuid/stream | stays | no response in the catch (helper, inner catch, or fall-through) |
| 5370 | get  /api/production/audio/:uuid/stream | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 5410 | get  /api/production/:courseCode/audio/:uuid/url | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 5422 | get  /api/production/:courseCode/audio/:uuid/exists | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 5511 | get  /api/production/:courseCode/audio/by-text | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 5890 | fn: handleRecordingUpload | stays | not a route handler (helper or inner catch) |
| 5946 | fn: handleRecordingUpload | stays | not a route handler (helper or inner catch) |
| 6007 | fn: handleRecordingUpload | stays | not a route handler (helper or inner catch) |
| 6086 | fn: handleRecordingUpload | stays | not a route handler (helper or inner catch) |
| 6089 | fn: handleRecordingUpload | stays | not a route handler (helper or inner catch) |
| 6180 | fn: handleRecordingUpload | stays | not a route handler (helper or inner catch) |
| 6215 | fn: proxyToPhase8 | stays | not a route handler (helper or inner catch) |
| 6256 | get  /api/production/:courseCode/recording/queue | stays | booth route |
| 6304 | post  /api/production/:courseCode/recording/claim | stays | booth route |
| 6355 | post  /api/production/:courseCode/recording/release | stays | booth route |
| 6407 | get  /api/production/:courseCode/regeneration/queue | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 6488 | post  /api/production/:courseCode/regeneration/trigger | stays | content or audio write route |
| 6550 | post  /api/production/:courseCode/regeneration/trigger-all | stays | content or audio write route |
| 6588 | post  /api/production/:courseCode/regeneration/trigger-all | stays | content or audio write route |
| 6603 | get  /api/audio/status | stays | deploys or publishes |
| 6749 | post  /api/audio/regenerate-role/:courseCode | stays | money / audio-spend route |
| 6769 | post  /api/audio/regenerate-role/:courseCode | stays | money / audio-spend route |
| 6778 | post  /api/audio/regenerate-role/:courseCode | stays | money / audio-spend route |
| 6795 | post  /api/audio/render | stays | money / audio-spend route |
| 6810 | get  /api/audio/trial/:id | stays | money / audio-spend route |
| 6892 | post  /api/audio/add-recording | stays | booth route |
| 6907 | post  /api/audio/regenerate-single/:courseCode/:audioUuid | stays | money / audio-spend route |
| 6924 | post  /api/audio/regenerate-presentation/:courseCode/:legoId | stays | money / audio-spend route |
| 6944 | post  /api/audio/regenerate-phrase/:courseCode/:phraseId | stays | money / audio-spend route |
| 6964 | post  /api/audio/regenerate-lego/:courseCode/:legoId | stays | money / audio-spend route |
| 7001 | post  /api/audio/regenerate-presentations/:courseCode | stays | money / audio-spend route |
| 7014 | post  /api/audio/link-presentation-audio/:courseCode | stays | content or audio write route |
| 7038 | get  /api/audio/reuse-plan/:courseCode | stays | money / audio-spend route |
| 7057 | get  /api/audio/reuse-coverage/:courseCode | stays | fallback text behind err.message |
| 7075 | post  /api/audio/reuse-apply/:courseCode | stays | content or audio write route |
| 7087 | get  /api/audio/reuse-run/:runId | stays | fallback text behind err.message |
| 7168 | get  /api/production/voices | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 7194 | get  /api/production/voices/:voiceId | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 7243 | post  /api/production/voices/register-human | stays | not the plain log + 500 { error: err.message } shape |
| 7288 | patch  /api/production/voices/:voiceId/status | stays | deploys or publishes |
| 7369 | get  /api/production/:courseCode/audio-pipeline/plan | stays | money / audio-spend route |
| 7394 | get  /api/production/:courseCode/audio-pipeline/plan | stays | money / audio-spend route |
| 7418 | post  /api/production/:courseCode/audio-pipeline/start | stays | content or audio write route |
| 7425 | post  /api/production/:courseCode/audio-pipeline/start | stays | content or audio write route |
| 7443 | get  /api/audio/health | stays | answers 502/503, not 500 |
| 7484 | get  /api/production/:courseCode/audio-pipeline/status | stays | deploys or publishes |
| 7504 | post  /api/production/:courseCode/audio-pipeline/cancel | stays | content or audio write route |
| 7527 | post  /api/production/:courseCode/audio-pipeline/retry | stays | content or audio write route |
| 7548 | post  /api/production/:courseCode/audio-pipeline/link-and-recount | stays | content or audio write route |
| 7561 | post  /api/production/:courseCode/audio-pipeline/link-and-recount | stays | content or audio write route |
| 7626 | get  /api/production/:courseCode/audio-pipeline/missing | stays | no response in the catch (helper, inner catch, or fall-through) |
| 7683 | get  /api/production/:courseCode/audio-pipeline/missing | stays | no response in the catch (helper, inner catch, or fall-through) |
| 7753 | get  /api/production/:courseCode/audio-pipeline/missing | stays | logs err.message, not the error object |
| 7818 | get  /api/production/:courseCode/audio-pipeline/ungeneratable | stays | logs err.message, not the error object |
| 7869 | get  /api/production/:courseCode/audio-pipeline/orphan-legos | stays | logs err.message, not the error object |
| 7974 | post  /api/production/:courseCode/audio-pipeline/fix-orphan-legos | stays | content or audio write route |
| 8109 | post  /api/production/:courseCode/audio-pipeline/sync-s3 | stays | content or audio write route |
| 8124 | post  /api/production/:courseCode/audio-pipeline/sync-s3 | stays | content or audio write route |
| 8165 | get  /api/production/:courseCode/seeds | stays | logs err.message, not the error object |
| 8181 | get  /api/production/:courseCode/legos | stays | logs err.message, not the error object |
| 8193 | get  /api/production/:courseCode/progress | stays | logs err.message, not the error object |
| 8227 | fn: runCourseEdit | stays | not a route handler (helper or inner catch) |
| 8236 | fn: runCourseEdit | stays | not a route handler (helper or inner catch) |
| 8269 | fn: runCourseEdit | stays | not a route handler (helper or inner catch) |
| 8285 | fn: runCourseEdit | stays | not a route handler (helper or inner catch) |
| 8301 | fn: runCourseEdit | stays | not a route handler (helper or inner catch) |
| 8334 | fn: editBatch | stays | not a route handler (helper or inner catch) |
| 8376 | post  /api/admin/recompute-decompositions | stays | content or audio write route |
| 8403 | post  /api/admin/recompute-decompositions | stays | content or audio write route |
| 8420 | get  /api/admin/phrase-v4/courses | stays | fallback text behind err?.message |
| 8435 | get  /api/admin/phrase-v4/course/:courseCode | stays | fallback text behind err?.message |
| 8457 | post  /api/admin/phrase-v4/gate | stays | content or audio write route |
| 8489 | post  /api/admin/phrase-v4/gap-fill | stays | content or audio write route |
| 8508 | post  /api/admin/unapprove-seeds | stays | content or audio write route |
| 8535 | delete  /api/production/:courseCode/seed/:seedNumber | stays | content or audio write route |
| 8560 | get  /api/production/:courseCode/lego/:legoId/basket | stays | content or audio write route |
| 8620 | get  /api/production/:courseCode/seed/:seedId/baskets | stays | logs err.message, not the error object |
| 9067 | get  /api/production/:courseCode/script-view | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 9301 | post  /api/production/:courseCode/mapping/:rowId | stays | content or audio write route |
| 9359 | get  /api/production/:courseCode/learning-journey | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 9452 | get  /api/production/:courseCode/learning-journey/search | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 9476 | post  /api/production/:courseCode/lego/:legoId/mark-new | stays | content or audio write route |
| 9592 | patch  /api/production/:courseCode/phrase/:phraseId | stays | logs err.message, not the error object |
| 9646 | get  /api/production/:courseCode/recording-optimizer | stays | booth route |
| 9665 | fn: readRecordedProgress | stays | not a route handler (helper or inner catch) |
| 9697 | get  /api/production/:courseCode/recording-volumes | stays | booth route |
| 9887 | get  /api/production/:courseCode/recording-script | stays | booth route |
| 9964 | get  /api/production/:courseCode/export-state | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 10018 | post  /api/production/:courseCode/export-state | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 10257 | post  /api/production/:courseCode/export-legacy-with-state | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 10301 | delete  /api/production/:courseCode/export-state | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 10321 | get  /api/production/:courseCode/pending-manifest | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 10358 | get  /api/production/:courseCode/export-state/manifest | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 10448 | post  /api/production/:courseCode/publish-manifest | stays | deploys or publishes |
| 10484 | get  /api/production/:courseCode/publish-manifest/version | stays | deploys or publishes |
| 10536 | get  /api/production/:courseCode/manifest-diff | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 10548 | get  /api/production/course-configs/status | stays | deploys or publishes |
| 10566 | post  /api/production/course-configs/push | stays | deploys or publishes |
| 10615 | post  /api/production/:courseCode/stage-deploy | stays | deploys or publishes |
| 10745 | post  /api/production/:courseCode/stage-deploy | stays | deploys or publishes |
| 10792 | post  /api/production/:courseCode/stage-deploy/cancel | stays | deploys or publishes |
| 10814 | post  /api/production/:courseCode/stage-deploy/cancel | stays | deploys or publishes |
| 10929 | post  /api/production/:courseCode/stage-restart | stays | deploys or publishes |
| 10964 | post  /api/production/:courseCode/stage-restart/cancel | stays | deploys or publishes |
| 10981 | post  /api/production/:courseCode/stage-restart/cancel | stays | deploys or publishes |
| 11065 | post  /api/production/:courseCode/verify-s3 | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 11085 | get  /api/production/:courseCode/verify-s3 | stays | no response in the catch (helper, inner catch, or fall-through) |
| 11098 | delete  /api/production/:courseCode/verify-s3 | stays | no response in the catch (helper, inner catch, or fall-through) |
| 11240 | post  /api/production/:courseCode/deploy-audio/plan | stays | money / audio-spend route |
| 11246 | post  /api/production/:courseCode/deploy-audio/plan | stays | money / audio-spend route |
| 11331 | post  /api/production/:courseCode/deploy-audio/execute | stays | deploys or publishes |
| 11338 | post  /api/production/:courseCode/deploy-audio/execute | stays | deploys or publishes |
| 11431 | post  /api/production/:courseCode/deploy-audio/new-only | stays | deploys or publishes |
| 11526 | post  /api/production/:courseCode/deploy-audio/new-and-mismatched | stays | deploys or publishes |
| 11590 | get  /api/production/audio/:uuid/download/:bucket | stays | not the plain log + 500 { error: err.message } shape |
| 11626 | post  /api/production/:courseCode/verify-production-durations | FOLDED | plain log(tag, err) then 500 { error: err.message }; read or bookkeeping route, no content, money, booth or deploy write |
| 11720 | post  /api/production/:courseCode/deploy-audio/missing-only | stays | deploys or publishes |
| 11727 | post  /api/production/:courseCode/deploy-audio/missing-only | stays | deploys or publishes |
| 11742 | post  /api/production/:courseCode/deploy-audio/missing-only | stays | deploys or publishes |
| 11754 | post  /api/production/:courseCode/gender-prep/check | stays | gender-prep (named by Tom) |
| 11773 | post  /api/production/:courseCode/gender-prep/override | stays | gender-prep (named by Tom) |
| 11845 | get  /api/production/:courseCode/gender-prep/status | stays | gender-prep (named by Tom) |
| 12028 | fn: spawnInTerminalApp | stays | not a route handler (helper or inner catch) |
| 12082 | get  /api/production/:courseCode/gender-prep/flag-count | stays | gender-prep (named by Tom) |
| 12111 | use  /api/checkpoint | stays | answers 502/503, not 500 |
| 12162 | fn: pm2SaveIfHealthy | stays | not a route handler (helper or inner catch) |
| 12209 | get  /api/admin/agents | stays | logs err.message, not the error object |
| 12249 | post  /api/admin/agents/kill | stays | no response in the catch (helper, inner catch, or fall-through) |
| 12257 | post  /api/admin/agents/kill | stays | logs err.message, not the error object |
| 12276 | post  /api/admin/agents/kill-all | stays | no response in the catch (helper, inner catch, or fall-through) |
| 12284 | post  /api/admin/agents/kill-all | stays | no response in the catch (helper, inner catch, or fall-through) |
| 12290 | post  /api/admin/agents/kill-all | stays | logs err.message, not the error object |
| 12313 | get  /api/admin/system | stays | no response in the catch (helper, inner catch, or fall-through) |
| 12343 | get  /api/admin/pm2 | stays | not the plain log + 500 { error: err.message } shape |
| 12357 | post  /api/admin/pm2/fix | stays | no response in the catch (helper, inner catch, or fall-through) |
| 12378 | post  /api/admin/pm2/restart | stays | no response in the catch (helper, inner catch, or fall-through) |
| 12386 | post  /api/admin/pm2/restart | stays | success/ok:false envelope, not { error } |
| 12402 | post  /api/admin/pm2/stop | stays | success/ok:false envelope, not { error } |
| 12416 | post  /api/admin/pm2/delete | stays | success/ok:false envelope, not { error } |
| 12436 | post  /api/admin/setup-remote | stays | success/ok:false envelope, not { error } |
| 12444 | post  /api/admin/setup-remote | stays | no response in the catch (helper, inner catch, or fall-through) |
| 12455 | post  /api/admin/setup-remote | stays | success/ok:false envelope, not { error } |
| 12470 | post  /api/admin/setup-remote | stays | success/ok:false envelope, not { error } |
| 12478 | post  /api/admin/setup-remote | stays | no response in the catch (helper, inner catch, or fall-through) |
| 12501 | post  /api/admin/kill-pid | stays | no response in the catch (helper, inner catch, or fall-through) |
| 12529 | post  /api/admin/git-pull | stays | no response in the catch (helper, inner catch, or fall-through) |
| 12531 | post  /api/admin/git-pull | stays | success/ok:false envelope, not { error } |
| 12555 | post  /api/admin/kill-apps | stays | no response in the catch (helper, inner catch, or fall-through) |
| 12590 | fn: getMemStats | stays | not a route handler (helper or inner catch) |
| 12623 | fn: getDiskStats | stays | not a route handler (helper or inner catch) |
| 12668 | fn: darwinRebootReadiness | stays | not a route handler (helper or inner catch) |
| 12674 | fn: darwinRebootReadiness | stays | not a route handler (helper or inner catch) |
| 12721 | fn: linuxRebootReadiness | stays | not a route handler (helper or inner catch) |
| 12766 | fn: linuxRebootReadiness | stays | not a route handler (helper or inner catch) |
| 12805 | get  /api/admin/system-health | stays | no response in the catch (helper, inner catch, or fall-through) |
| 12880 | get  /api/admin/audit-stats | stays | not the plain log + 500 { error: err.message } shape |
| 12959 | get  /api/admin/audit-events | stays | logs err.message, not the error object |
| 13033 | get  /api/admin/audit-row | stays | logs err.message, not the error object |
| 13104 | post  /api/admin/audit-restore | stays | content or audio write route |
| 13111 | post  /api/admin/audit-restore | stays | content or audio write route |
| 13161 | post  /api/admin/audit-cleanup | stays | destructive (asset or audit deletion) |
| 13214 | post  /api/admin/audit-archive | stays | destructive (asset or audit deletion) |
| 13299 | get  /api/admin/decomposition-audit/:courseCode | stays | fallback text behind err?.message |
| 13450 | fn: getVocab | stays | not a route handler (helper or inner catch) |
| 13477 | fn: getVocab | stays | not a route handler (helper or inner catch) |
| 13532 | get  /api/admin/uptime-summary | stays | fallback text behind err?.message |
| 13675 | get  /api/admin/db-health | stays | fallback text behind err?.message |
| 13709 | fn: scheduleNightlyArchive | stays | not a route handler (helper or inner catch) |
| 13750 | post  /api/insight-discovery/run | stays | constant message, not err.message |
| 13770 | get  /api/insight-discovery/latest | stays | constant message, not err.message |

## 2. The five page-all loops, line by line

| | production-api fetchAllRows (L4382) | production-api fetchAllPodSentences (L4860) | production-api canonical-pods inline (L5212) | production-api pageAll (L8387; phrase-v4 gap-fill door and admin edit doors) | debut-practice pageAll (L163) |
|---|---|---|---|---|---|
| page size | 50,000 | 1,000 | 1,000 | 1,000 | 1,000 |
| order clause | none; filters passed as [method,...args] list | pod_id, global_order | none | caller's builder (callers at L8427-8433 pass no order) | caller's builder (both callers order on the unique index) |
| stop condition | data.length < PAGE | !data or length < PAGE | data.length < 1000 | !data or length < 1000 | !data or length < 1000 |
| on error | throw error (raw PostgREST object) | throw error (raw) | throw error (raw) | throw error (raw) | throw new Error(error.message) |
| null data | crashes on data.length | guarded | crashes on data.length | guarded | guarded |
| builder reuse | builds fresh query per page from table+filters | fresh per page | fresh per page | fresh per page via build() | fresh per page via query() |

Which differences are deliberate, and which are not:
- **fetchAllRows page size 50,000 is deliberate but WRONG against the cap.** PostgREST on this project returns at most 60,000 rows and says nothing; a 50,000 page sits under that, so the short-page stop works today, but it rides a 5 s statement cap with no order clause. It is used by the audio-stats cache for course_audio counts. Not a reason to keep a separate copy; it is the copy most in need of the shared helper.
- **fetchAllPodSentences ordering (pod_id, global_order) is deliberate.** The pod script order is the product; callers depend on it. Keep the order as a parameter, not as a reason for a separate loop.
- **The canonical-pods inline loop has no ordering and no null guard.** Not deliberate; it was written inline because it aggregates while paging. The aggregation can stay; the paging should not.
- **pageAll at L8387 and debut-practice pageAll are the same function with one deliberate difference**: debut-practice wraps the error in a real Error with the message, production-api rethrows the raw PostgREST object. The debut-practice shape is the right one (a raw object has no stack and no message in some logs). Debut-practice's seed-window callers (WINDOW of 20 seeds, ordered on the unique index) are deliberate and measured: a plain OFFSET walk of a 20k-row course hit the statement timeout on ita_for_eng on 2026-09-30. That windowing lives in the caller and survives any helper.
- **Stop-on-short-page is shared by all five and is the real hazard.** services/shared/paged-read.cjs already exists (readAllPages, used nine times in phase8) and stops on an EMPTY page precisely because a server whose max-rows is smaller than the page size returns short pages that are not last. It also forces an order column and wraps the error in an Error. It is the helper the proposal asks for; it is already tested-by-use in phase8, and production-api does not import it anywhere.

Recommendation for the build: do not write a sixth paginator. Point the five loops at readAllPages with pageSize 1000 and the caller's orderCol, keeping fetchAllPodSentences's two-column order by passing a builder that already orders (readAllPages appends one more order on id, harmless as a tiebreak on a unique key; check that pod sentences have an id column, which they select). Add one test for readAllPages asserting the empty-page stop with a short-page server and the order clause. The phrase-proof router's allRows (parallel pages with one retry) is a different design for a different reason and is out of scope.

## 3. Honest gaps
- The route for each catch is the nearest preceding `app.<method>(` or `function` line; inner catches inside a handler inherit that route. Catches inside helper functions stay regardless of shape.
- Route-class exclusions (money, booth, content, deploy) are by route name AND a read of the handler body for every candidate that the shape test let through; the 53 folded handlers were each read for inserts, updates, deletes, spawns, S3 and TTS calls before folding.
- The 30-ish stay rows whose reason is a log-argument difference could be folded later with a second responder shape; #179 did not, because Tom's brief was one responder with byte-identical log output.
