# Popty: catch-block and paginator classification

Read-only classification, 2 November 2026, job #134 on origin/main at ef5d81986. No code changed. Input to the "one server-error responder" and "one tested paginator" proposals.

## 1. The catch blocks in production-api.cjs

The file has 275 catch blocks (the proposal counted 206; the extra ones are inner catches inside handlers and helper functions, counted here because a mechanical fold would meet them too). Verdicts: **83 safe to fold**, **192 stay out**.

Rule applied, in order. A catch stays out if any of these hold:
1. It is not a route handler at all (a helper function or an inner catch with no response to send).
2. The route is a money route (pricing tier, anything matching paddle, stripe, billing, subscription, premium, payment, plan).
3. The route is a booth route (booth, recordist, take, cut, ingest).
4. The route is a content write surface listed in services/shared/content-write-surfaces.cjs, or a content or audio write not yet in that manifest (regeneration trigger, audio-pipeline, link-presentation-audio, reuse-apply, mark-new, pod-sentences, canonical pods and seeds, stage-draft, phrase-v4 gate and gap-fill, gender-prep start, audit-restore).
5. The route deploys or publishes (publish-manifest, stage-deploy, stage-restart, course-configs push, platform-status, status) or deletes assets or audit history.
6. The catch body is not the plain shape "log, then res.status(500).json({ error: <message> })". Any 502 or 503 branch, success:false envelope, io.emit, warn-only, return-object or custom message string stays out because a shared helper would change the response.

Everything else folds: GET read routes, plus write routes whose handler is bookkeeping (flags, audio-flags, feedback, export-state, verify-s3, verify-production-duration, gender-prep check and override, agents kill). Six body variants are byte-equivalent after a rename of the error variable and are the fold set: logger.error(tag, x) then 500 with x.message, with x in {error, err, e}, with or without a fallback string.

The helper to build: `serverError(res, tag, err)` doing exactly logger.error(tag, err) then res.status(500).json({ error: err?.message || 'Internal error' }). Fold only rows marked fold; the mechanical edit is replacing the two lines, never the catch itself. One test: a handler that throws reaches a 500 with the message, and the log line carries the tag.

### Every catch, by line

| line | route | verdict | reason |
|---|---|---|---|
| 317 | fn:async function verifySupabaseJWT(token) { | stay-out | not a route handler (helper/function catch, no res) |
| 333 | fn:async function attachCasting(user, email) { | stay-out | not a route handler (helper/function catch, no res) |
| 451 | fn:async function resolveDashboardUser(req) { | stay-out | not a route handler (helper/function catch, no res) |
| 504 | fn:async function resolveDashboardUserCached(req) { | stay-out | not a route handler (helper/function catch, no res) |
| 569 | get  /api/production/:courseCode/pods/coverage | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(err.status // 500).json({ error: err.message }) |
| 690 | post  /api/auth/login | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ error: 'S' }) |
| 707 | post  /api/auth/generate-code | stay-out | AUDIO spend path |
| 801 | post  /api/auth/invite-dashboard | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ error: err.message // 'S' }) |
| 851 | fn:async function handleInvite(req, res) { | stay-out | not a route handler (helper/function catch, no res) |
| 888 | fn:async function handleInvite(req, res) { | stay-out | not a route handler (helper/function catch, no res) |
| 904 | get  /api/auth/users | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ error: 'S' }) |
| 924 | delete  /api/auth/users | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ error: 'S' }) |
| 934 | post  /api/auth/logout | stay-out | body is not the plain 500 shape:  |
| 995 | post  /api/auth/invite-codes/generate | stay-out | AUDIO spend path |
| 1015 | get  /api/auth/invite-codes | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ error: 'S' }) |
| 1078 | post  /api/auth/invite-codes/redeem | stay-out | body is not the plain 500 shape:  |
| 1084 | post  /api/auth/invite-codes/redeem | stay-out | body is not the plain 500 shape: ; // Already exists is fine ; if (!authErr.message?.includes('S') && !authErr.message?.inc |
| 1122 | post  /api/auth/invite-codes/redeem | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ error: 'S' }) |
| 1157 | get  /api/production/schema/validate | fold | GET read route, plain log+500 shape |
| 1174 | get  /api/library/courses | fold | GET read route, plain log+500 shape |
| 1188 | get  /api/library/course/:courseCode | fold | GET read route, plain log+500 shape |
| 1244 | get  /api/courses | fold | GET read route, plain log+500 shape |
| 1522 | get  /api/estate-map | fold | GET read route, plain log+500 shape |
| 1536 | get  /api/courses/:courseCode/stats | fold | GET read route, plain log+500 shape |
| 1617 | patch  /api/courses/:courseCode/platform-status | stay-out | DEPLOY/PUBLISH route (outward-facing) |
| 1704 | get  /api/stats/:courseCode | fold | GET read route, plain log+500 shape |
| 1776 | fn:async function requireProxyCourseAccess(req, res, next) { | stay-out | not a route handler (helper/function catch, no res) |
| 1825 | fn:async function proxyCourseBuilder(req, res) { | stay-out | not a route handler (helper/function catch, no res) |
| 1877 | fn:async function proxyOrchestrator(req, res) { | stay-out | not a route handler (helper/function catch, no res) |
| 1921 | get  /api/ops/staleness | stay-out | body is not the plain 500 shape: ; res.json({ ; status: 'S', ; reason: 'S', ; build: buildIdentity() ; }) |
| 1948 | get  /api/explainer/pack | stay-out | body is not the plain 500 shape: ; res.status(500).json({ error: 'S' }) |
| 1976 | post  /api/explainer/refresh | stay-out | body is not the plain 500 shape: ; res.status(500).json({ error: 'S' }) |
| 2009 | get  /api/languages | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ error: 'S' }) |
| 2051 | get  /api/courses | fold | GET read route, plain log+500 shape |
| 2140 | post  /api/courses/create | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ ; error: 'S', ; message: error.message ; }) |
| 2166 | get  /api/courses/:courseCode/voice-config | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ success: false, error: error.message }) |
| 2187 | get  /api/courses/:courseCode/voice-config/resolved | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ success: false, error: error.message }) |
| 2207 | put  /api/courses/:courseCode/voice-config | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ success: false, error: error.message }) |
| 2224 | patch  /api/courses/:courseCode/voice-config/:role | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ success: false, error: error.message }) |
| 2254 | get  /api/voices/discover/:language | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ success: false, error: error.message }) |
| 2286 | get  /api/courses/:courseCode/seed-phrases-preview | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ known: [], target: [] }) |
| 2347 | post  /api/voices/preview | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ success: false, error: error.message }) |
| 2421 | get  /api/mission-control/jobs | stay-out | body is not the plain 500 shape: ; LOG() |
| 2493 | get  /api/mission-control/jobs | stay-out | body is not the plain 500 shape: ; // Phase 8 not running or no active job - that'S'[Mission Control] No active audio job ( |
| 2497 | get  /api/mission-control/jobs | stay-out | body is not the plain 500 shape: ; LOG() |
| 2535 | post  /api/mission-control/jobs/:jobId/stop | stay-out | body is not the plain 500 shape: ; return res.status(500).json({ success: false, error: err.message }) |
| 2545 | post  /api/mission-control/jobs/:jobId/stop | stay-out | body is not the plain 500 shape: ; return res.status(500).json({ success: false, error: err.message }) |
| 2579 | post  /api/mission-control/jobs/:jobId/resume | stay-out | body is not the plain 500 shape: ; return res.status(500).json({ success: false, error: err.message }) |
| 2633 | post  /api/mission-control/jobs/:jobId/clear | stay-out | body is not the plain 500 shape: ; return res.status(500).json({ success: false, error: err.message }) |
| 2667 | get  /api/production/course-stats | fold | GET read route, plain log+500 shape |
| 2690 | get  /api/production/:courseCode/stats | fold | GET read route, plain log+500 shape |
| 2749 | get  /api/production/:courseCode/info | fold | GET read route, plain log+500 shape |
| 2850 | post  /api/production/:courseCode/status | stay-out | DEPLOY/PUBLISH route (outward-facing) |
| 2904 | post  /api/production/:courseCode/pricing-tier | stay-out | MONEY route (pricing tier) |
| 2926 | get  /api/production/:courseCode/introductions | fold | GET read route, plain log+500 shape |
| 2977 | get  /api/production/:courseCode/presentation/:legoId | stay-out | body is not the plain 500 shape: ; // A missing template is not a reason to fail the read — fall back to blank. ; LOG() |
| 2988 | get  /api/production/:courseCode/presentation/:legoId | stay-out | body is not the plain 500 shape: ; LOG() |
| 3006 | get  /api/production/:courseCode/presentation/:legoId | fold | GET read route, plain log+500 shape |
| 3029 | get  /api/production/:courseCode/manifest | stay-out | body is not the plain 500 shape: ; // Course not in database yet, fall through to S3 ; logger.debug('S') |
| 3066 | get  /api/production/:courseCode/manifest | fold | GET read route, plain log+500 shape |
| 3106 | post  /api/production/:courseCode/manifest/generate | stay-out | AUDIO spend path |
| 3125 | get  /api/production/:courseCode/manifest/validate | fold | GET read route, plain log+500 shape |
| 3202 | get  /api/production/:courseCode/export-legacy | fold | GET read route, plain log+500 shape |
| 3330 | fn:async function startLegacyAudioGeneration(courseCode, job | stay-out | not a route handler (helper/function catch, no res) |
| 3407 | get  /api/production/:courseCode/flags | fold | GET read route, plain log+500 shape |
| 3459 | post  /api/production/:courseCode/flags/update | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 3482 | get  /api/production/:courseCode/audio-flags | fold | GET read route, plain log+500 shape |
| 3602 | get  /api/production/:courseCode/flagged-items | fold | GET read route, plain log+500 shape |
| 3638 | post  /api/production/:courseCode/audio-flags | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 3664 | post  /api/production/:courseCode/audio-flags/:audioUuid/res | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 3689 | delete  /api/production/:courseCode/audio-flags/:audioUuid | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 3725 | post  /api/production/:courseCode/audio-flags/bulk-delete | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 3814 | post  /api/production/:courseCode/audio-flags/delete-orphane | stay-out | ASSET deletion (orphaned audio rows), approval-gated |
| 3859 | delete  /api/production/:courseCode/phrases/:phraseId | stay-out | CONTENT write surface (content-write-surfaces.cjs) |
| 3884 | post  /api/production/:courseCode/link-clip | stay-out | CONTENT write surface (content-write-surfaces.cjs) |
| 3902 | post  /api/production/:courseCode/sync-intro-links | stay-out | CONTENT write surface (content-write-surfaces.cjs) |
| 3926 | post  /api/production/:courseCode/ingest-cut | stay-out | BOOTH route |
| 3931 | post  /api/production/:courseCode/ingest-cut | stay-out | BOOTH route |
| 3956 | patch  /api/production/:courseCode/pod/:podId/solo-readers | stay-out | CONTENT write surface (content-write-surfaces.cjs) |
| 4001 | post  /api/production/:courseCode/phrases/batch-delete | stay-out | CONTENT write surface (content-write-surfaces.cjs) |
| 4036 | post  /api/production/:courseCode/flags/delete | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 4076 | post  /api/production/:courseCode/flags/bulk-update | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 4137 | post  /api/production/:courseCode/feedback | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 4240 | get  /api/production/:courseCode/feedback/aggregated | fold | GET read route, plain log+500 shape |
| 4298 | post  /api/production/:courseCode/feedback/resolve | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 4340 | get  /api/production/:courseCode/feedback/stats | fold | GET read route, plain log+500 shape |
| 4352 | get  /api/production/:courseCode/audio-metadata | fold | GET read route, plain log+500 shape |
| 4429 | fn:async function getDirectAudioStats(courseCode) { | stay-out | not a route handler (helper/function catch, no res) |
| 4581 | get  /api/production/:courseCode/shared-audio-status | fold | GET read route, plain log+500 shape |
| 4627 | get  /api/production/:courseCode/audio-stats | fold | GET read route, plain log+500 shape |
| 4682 | get  /api/pods/:courseCode | fold | GET read route, plain log+500 shape |
| 4710 | get  /api/pods/:courseCode/:slug | fold | GET read route, plain log+500 shape |
| 4802 | post  /api/admin/pods/:courseCode/:slug/visibility | stay-out | PUBLISH-facing (pod visibility) |
| 4927 | get  /api/pod-scripts | stay-out | body is not the plain 500 shape: ; // A course that fails to build is a NAMED gap, never a silent omission. ; errors.push({ |
| 4934 | get  /api/pod-scripts | fold | GET read route, plain log+500 shape |
| 5000 | get  /api/pod-scripts/:courseCode | stay-out | body is not the plain 500 shape: ; // A thrown fetch names WHICH batch and why, rather than reaching the ; // page as a bar |
| 5022 | get  /api/pod-scripts/:courseCode | fold | GET read route, plain log+500 shape |
| 5058 | post  /api/admin/pods/generate | stay-out | AUDIO spend path |
| 5113 | post  /api/admin/pods/:courseCode/:slug/stage-draft | stay-out | CONTENT/AUDIO write not yet in the manifest; treat as content |
| 5136 | patch  /api/admin/pod-sentences/:id | stay-out | CONTENT/AUDIO write not yet in the manifest; treat as content |
| 5155 | fn:async function podTextSwapsRoute(req, res) { | stay-out | not a route handler (helper/function catch, no res) |
| 5178 | get  /api/admin/pods/:courseCode/audio-plan | stay-out | MONEY route |
| 5196 | post  /api/admin/pods/:courseCode/generate-audio | stay-out | AUDIO spend path |
| 5229 | get  /api/admin/canonical-pods | fold | GET read route, plain log+500 shape |
| 5255 | get  /api/admin/canonical-pods/:slug | fold | GET read route, plain log+500 shape |
| 5278 | patch  /api/admin/canonical-pods/:id | stay-out | CONTENT write (canonical pod scripts) |
| 5299 | get  /api/canonical-seeds | fold | GET read route, plain log+500 shape |
| 5313 | get  /api/admin/speakability-grid | fold | GET read route, plain log+500 shape |
| 5338 | patch  /api/admin/canonical-seeds/:id | stay-out | CONTENT/AUDIO write not yet in the manifest; treat as content |
| 5391 | get  /api/production/audio/:uuid/stream | stay-out | body is not the plain 500 shape:  |
| 5402 | get  /api/production/audio/:uuid/stream | fold | GET read route, plain log+500 shape |
| 5442 | get  /api/production/:courseCode/audio/:uuid/url | fold | GET read route, plain log+500 shape |
| 5454 | get  /api/production/:courseCode/audio/:uuid/exists | fold | GET read route, plain log+500 shape |
| 5543 | get  /api/production/:courseCode/audio/by-text | fold | GET read route, plain log+500 shape |
| 5922 | fn:async function handleRecordingUpload(req, res) { | stay-out | not a route handler (helper/function catch, no res) |
| 5978 | fn:async function handleRecordingUpload(req, res) { | stay-out | not a route handler (helper/function catch, no res) |
| 6039 | fn:async function handleRecordingUpload(req, res) { | stay-out | not a route handler (helper/function catch, no res) |
| 6118 | fn:async function handleRecordingUpload(req, res) { | stay-out | not a route handler (helper/function catch, no res) |
| 6121 | fn:async function handleRecordingUpload(req, res) { | stay-out | not a route handler (helper/function catch, no res) |
| 6212 | fn:async function handleRecordingUpload(req, res) { | stay-out | not a route handler (helper/function catch, no res) |
| 6247 | fn:async function proxyToPhase8(method, path, body = null) { | stay-out | not a route handler (helper/function catch, no res) |
| 6288 | get  /api/production/:courseCode/recording/queue | stay-out | BOOTH route |
| 6336 | post  /api/production/:courseCode/recording/claim | stay-out | BOOTH route |
| 6387 | post  /api/production/:courseCode/recording/release | stay-out | BOOTH route |
| 6439 | get  /api/production/:courseCode/regeneration/queue | fold | GET read route, plain log+500 shape |
| 6520 | post  /api/production/:courseCode/regeneration/trigger | stay-out | CONTENT/AUDIO write not yet in the manifest; treat as content |
| 6582 | post  /api/production/:courseCode/regeneration/trigger-all | stay-out | body is not the plain 500 shape: ; return { role, success: false, error: err.message } |
| 6620 | post  /api/production/:courseCode/regeneration/trigger-all | stay-out | CONTENT/AUDIO write not yet in the manifest; treat as content |
| 6635 | get  /api/audio/status | stay-out | body is not the plain 500 shape: ; // If Phase 8 is not running, return inactive status ; res.json({ active: false, error:  |
| 6781 | post  /api/audio/regenerate-role/:courseCode | stay-out | AUDIO spend path |
| 6801 | post  /api/audio/regenerate-role/:courseCode | stay-out | AUDIO spend path |
| 6810 | post  /api/audio/regenerate-role/:courseCode | stay-out | AUDIO spend path |
| 6827 | post  /api/audio/render | stay-out | AUDIO spend path |
| 6842 | get  /api/audio/trial/:id | stay-out | MONEY route |
| 6924 | post  /api/audio/add-recording | stay-out | BOOTH route |
| 6939 | post  /api/audio/regenerate-single/:courseCode/:audioUuid | stay-out | AUDIO spend path |
| 6956 | post  /api/audio/regenerate-presentation/:courseCode/:legoId | stay-out | AUDIO spend path |
| 6976 | post  /api/audio/regenerate-phrase/:courseCode/:phraseId | stay-out | AUDIO spend path |
| 6996 | post  /api/audio/regenerate-lego/:courseCode/:legoId | stay-out | AUDIO spend path |
| 7033 | post  /api/audio/regenerate-presentations/:courseCode | stay-out | AUDIO spend path |
| 7046 | post  /api/audio/link-presentation-audio/:courseCode | stay-out | CONTENT/AUDIO write not yet in the manifest; treat as content |
| 7070 | get  /api/audio/reuse-plan/:courseCode | stay-out | MONEY route |
| 7089 | get  /api/audio/reuse-coverage/:courseCode | fold | GET read route, plain log+500 shape |
| 7107 | post  /api/audio/reuse-apply/:courseCode | stay-out | CONTENT/AUDIO write not yet in the manifest; treat as content |
| 7119 | get  /api/audio/reuse-run/:runId | fold | GET read route, plain log+500 shape |
| 7200 | get  /api/production/voices | fold | GET read route, plain log+500 shape |
| 7226 | get  /api/production/voices/:voiceId | fold | GET read route, plain log+500 shape |
| 7275 | post  /api/production/voices/register-human | stay-out | body is not the plain 500 shape: ; LOG() ;  ; // Handle duplicate voice error ; if (error.message.includes('S')) { ; return |
| 7320 | patch  /api/production/voices/:voiceId/status | stay-out | body is not the plain 500 shape: ; LOG() ;  ; // Handle not found error ; if (error.code === 'S') { ; return res.status(404 |
| 7401 | get  /api/production/:courseCode/audio-pipeline/plan | stay-out | MONEY route |
| 7426 | get  /api/production/:courseCode/audio-pipeline/plan | stay-out | MONEY route |
| 7450 | post  /api/production/:courseCode/audio-pipeline/start | stay-out | body is not the plain 500 shape: ; LOG() |
| 7457 | post  /api/production/:courseCode/audio-pipeline/start | stay-out | body is not the plain 500 shape: ; LOG() ; if (error.code === 'S') { ; return res.status(503).json({ error: 'S' }) ; } ; re |
| 7475 | get  /api/audio/health | stay-out | body is not the plain 500 shape: ; res.status(503).json({ status: 'S', service: 'S', error: e.message }) |
| 7516 | get  /api/production/:courseCode/audio-pipeline/status | stay-out | body is not the plain 500 shape: ; if (error.response?.status === 404) { ; return res.json({ success: true, job: null, mess |
| 7536 | post  /api/production/:courseCode/audio-pipeline/cancel | stay-out | body is not the plain 500 shape: ; LOG() ; if (error.code === 'S') { ; return res.status(503).json({ error: 'S' }) ; } ; re |
| 7559 | post  /api/production/:courseCode/audio-pipeline/retry | stay-out | body is not the plain 500 shape: ; LOG() ; if (error.code === 'S') { ; return res.status(503).json({ error: 'S' }) ; } ; re |
| 7580 | post  /api/production/:courseCode/audio-pipeline/link-and-re | stay-out | body is not the plain 500 shape: ; LOG() |
| 7593 | post  /api/production/:courseCode/audio-pipeline/link-and-re | stay-out | CONTENT/AUDIO write not yet in the manifest; treat as content |
| 7658 | get  /api/production/:courseCode/audio-pipeline/missing | stay-out | body is not the plain 500 shape: ; LOG() |
| 7715 | get  /api/production/:courseCode/audio-pipeline/missing | stay-out | body is not the plain 500 shape: ;  ; // ========================================================================= ; // BUI |
| 7785 | get  /api/production/:courseCode/audio-pipeline/missing | fold | GET read route, plain log+500 shape |
| 7850 | get  /api/production/:courseCode/audio-pipeline/ungeneratabl | fold | GET read route, plain log+500 shape |
| 7901 | get  /api/production/:courseCode/audio-pipeline/orphan-legos | fold | GET read route, plain log+500 shape |
| 8006 | post  /api/production/:courseCode/audio-pipeline/fix-orphan- | stay-out | CONTENT/AUDIO write not yet in the manifest; treat as content |
| 8141 | post  /api/production/:courseCode/audio-pipeline/sync-s3 | stay-out | body is not the plain 500 shape: ; LOG() ; errors++ |
| 8156 | post  /api/production/:courseCode/audio-pipeline/sync-s3 | stay-out | CONTENT/AUDIO write not yet in the manifest; treat as content |
| 8197 | get  /api/production/:courseCode/seeds | fold | GET read route, plain log+500 shape |
| 8213 | get  /api/production/:courseCode/legos | fold | GET read route, plain log+500 shape |
| 8225 | get  /api/production/:courseCode/progress | fold | GET read route, plain log+500 shape |
| 8259 | fn:async function runCourseEdit(req, res, ops, { apply, cour | stay-out | not a route handler (helper/function catch, no res) |
| 8268 | fn:async function runCourseEdit(req, res, ops, { apply, cour | stay-out | not a route handler (helper/function catch, no res) |
| 8301 | fn:async function runCourseEdit(req, res, ops, { apply, cour | stay-out | not a route handler (helper/function catch, no res) |
| 8317 | fn:async function runCourseEdit(req, res, ops, { apply, cour | stay-out | not a route handler (helper/function catch, no res) |
| 8333 | fn:async function runCourseEdit(req, res, ops, { apply, cour | stay-out | not a route handler (helper/function catch, no res) |
| 8366 | fn:async function editBatch(req, res) { | stay-out | not a route handler (helper/function catch, no res) |
| 8443 | post  /api/admin/recompute-decompositions | stay-out | CONTENT write surface (content-write-surfaces.cjs) |
| 8460 | get  /api/admin/phrase-v4/courses | fold | GET read route, plain log+500 shape |
| 8475 | get  /api/admin/phrase-v4/course/:courseCode | fold | GET read route, plain log+500 shape |
| 8497 | post  /api/admin/phrase-v4/gate | stay-out | CONTENT/AUDIO write not yet in the manifest; treat as content |
| 8529 | post  /api/admin/phrase-v4/gap-fill | stay-out | CONTENT write surface (content-write-surfaces.cjs) |
| 8548 | post  /api/admin/unapprove-seeds | stay-out | CONTENT write surface (content-write-surfaces.cjs) |
| 8575 | delete  /api/production/:courseCode/seed/:seedNumber | stay-out | CONTENT write surface (content-write-surfaces.cjs) |
| 8600 | get  /api/production/:courseCode/lego/:legoId/basket | fold | GET read route, plain log+500 shape |
| 8660 | get  /api/production/:courseCode/seed/:seedId/baskets | fold | GET read route, plain log+500 shape |
| 9107 | get  /api/production/:courseCode/script-view | fold | GET read route, plain log+500 shape |
| 9341 | post  /api/production/:courseCode/mapping/:rowId | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ error: 'S' }) |
| 9399 | get  /api/production/:courseCode/learning-journey | fold | GET read route, plain log+500 shape |
| 9492 | get  /api/production/:courseCode/learning-journey/search | fold | GET read route, plain log+500 shape |
| 9516 | post  /api/production/:courseCode/lego/:legoId/mark-new | stay-out | CONTENT/AUDIO write not yet in the manifest; treat as content |
| 9632 | patch  /api/production/:courseCode/phrase/:phraseId | stay-out | CONTENT write surface (content-write-surfaces.cjs) |
| 9686 | get  /api/production/:courseCode/recording-optimizer | stay-out | BOOTH route |
| 9705 | fn:async function readRecordedProgress(courseCode, { maxSeed | stay-out | not a route handler (helper/function catch, no res) |
| 9737 | get  /api/production/:courseCode/recording-volumes | stay-out | BOOTH route |
| 9927 | get  /api/production/:courseCode/recording-script | stay-out | BOOTH route |
| 10004 | get  /api/production/:courseCode/export-state | fold | GET read route, plain log+500 shape |
| 10058 | post  /api/production/:courseCode/export-state | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 10297 | post  /api/production/:courseCode/export-legacy-with-state | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 10341 | delete  /api/production/:courseCode/export-state | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 10361 | get  /api/production/:courseCode/pending-manifest | fold | GET read route, plain log+500 shape |
| 10398 | get  /api/production/:courseCode/export-state/manifest | fold | GET read route, plain log+500 shape |
| 10488 | post  /api/production/:courseCode/publish-manifest | stay-out | DEPLOY/PUBLISH route (outward-facing) |
| 10524 | get  /api/production/:courseCode/publish-manifest/version | stay-out | DEPLOY/PUBLISH route (outward-facing) |
| 10576 | get  /api/production/:courseCode/manifest-diff | fold | GET read route, plain log+500 shape |
| 10588 | get  /api/production/course-configs/status | stay-out | DEPLOY/PUBLISH route (outward-facing) |
| 10606 | post  /api/production/course-configs/push | stay-out | DEPLOY/PUBLISH route (outward-facing) |
| 10655 | post  /api/production/:courseCode/stage-deploy | stay-out | body is not the plain 500 shape: ; // Non-fatal: if the status check itself errors, let the deploy proceed ; // rather than |
| 10785 | post  /api/production/:courseCode/stage-deploy | stay-out | DEPLOY/PUBLISH route (outward-facing) |
| 10832 | post  /api/production/:courseCode/stage-deploy/cancel | stay-out | body is not the plain 500 shape: ; LOG() |
| 10854 | post  /api/production/:courseCode/stage-deploy/cancel | stay-out | DEPLOY/PUBLISH route (outward-facing) |
| 10969 | post  /api/production/:courseCode/stage-restart | stay-out | DEPLOY/PUBLISH route (outward-facing) |
| 11004 | post  /api/production/:courseCode/stage-restart/cancel | stay-out | body is not the plain 500 shape: ; LOG() |
| 11021 | post  /api/production/:courseCode/stage-restart/cancel | stay-out | DEPLOY/PUBLISH route (outward-facing) |
| 11105 | post  /api/production/:courseCode/verify-s3 | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 11138 | delete  /api/production/:courseCode/verify-s3 | stay-out | body is not the plain 500 shape: ; res.json({ cancelled: true, message: 'S' }) |
| 11280 | post  /api/production/:courseCode/deploy-audio/plan | stay-out | MONEY route |
| 11286 | post  /api/production/:courseCode/deploy-audio/plan | stay-out | MONEY route |
| 11371 | post  /api/production/:courseCode/deploy-audio/execute | stay-out | body is not the plain 500 shape: ; LOG() ; io.emit('S', { courseCode, error: error.message }) |
| 11378 | post  /api/production/:courseCode/deploy-audio/execute | stay-out | body is not the plain 500 shape: ; // Validation failed before accepting — return error synchronously ; LOG() ; runningDepl |
| 11471 | post  /api/production/:courseCode/deploy-audio/new-only | stay-out | body is not the plain 500 shape: ; LOG() ; io.emit('S', { courseCode, error: error.message }) |
| 11566 | post  /api/production/:courseCode/deploy-audio/new-and-misma | stay-out | body is not the plain 500 shape: ; LOG() ; io.emit('S', { courseCode, error: error.message }) |
| 11630 | get  /api/production/audio/:uuid/download/:bucket | stay-out | body is not the plain 500 shape: ; LOG() ; if (error.name === 'S') { ; res.status(404).json({ error: 'S' }) ; } else { ; re |
| 11666 | post  /api/production/:courseCode/verify-production-duration | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 11760 | post  /api/production/:courseCode/deploy-audio/missing-only | stay-out | body is not the plain 500 shape: ; LOG() ; io.emit('S', { courseCode, error: error.message }) |
| 11767 | post  /api/production/:courseCode/deploy-audio/missing-only | stay-out | body is not the plain 500 shape: ; LOG() ; runningDeploys.delete(courseCode) ; res.status(500).json({ error: error.message  |
| 11794 | post  /api/production/:courseCode/gender-prep/check | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 11813 | post  /api/production/:courseCode/gender-prep/override | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 11885 | get  /api/production/:courseCode/gender-prep/status | stay-out | DEPLOY/PUBLISH route (outward-facing) |
| 12068 | post  /api/production/:courseCode/gender-prep/start | stay-out | CONTENT write (gender expansions via LLM spawn) |
| 12122 | get  /api/production/:courseCode/gender-prep/flag-count | fold | GET read route, plain log+500 shape |
| 12151 | use  /api/checkpoint | stay-out | body is not the plain 500 shape: ; if (error.code === 'S') { ; return res.status(503).json({ ; error: 'S', ; message: 'S' ; |
| 12202 | fn:async function pm2SaveIfHealthy({ waitMs = 10000, minUpti | stay-out | not a route handler (helper/function catch, no res) |
| 12249 | get  /api/admin/agents | fold | GET read route, plain log+500 shape |
| 12289 | post  /api/admin/agents/kill | stay-out | body is not the plain 500 shape: ; LOG() |
| 12297 | post  /api/admin/agents/kill | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 12316 | post  /api/admin/agents/kill-all | stay-out | body is not the plain 500 shape:  |
| 12324 | post  /api/admin/agents/kill-all | stay-out | body is not the plain 500 shape: ; LOG() |
| 12330 | post  /api/admin/agents/kill-all | fold | write method but flags/feedback/export/verify bookkeeping, not content, money or booth; plain 500 shape |
| 12353 | get  /api/admin/system | stay-out | body is not the plain 500 shape: ;  ; res.json({ ; ok: true, ; hostname: os.hostname(), ; platform: os.platform(), ; uptime |
| 12383 | get  /api/admin/pm2 | stay-out | body is not the plain 500 shape: ; res.status(500).json({ error: e.message }) |
| 12397 | post  /api/admin/pm2/fix | stay-out | body is not the plain 500 shape: ; LOG() |
| 12418 | post  /api/admin/pm2/restart | stay-out | body is not the plain 500 shape:  |
| 12426 | post  /api/admin/pm2/restart | stay-out | body is not the plain 500 shape: ; res.status(500).json({ ok: false, error: e.message }) |
| 12442 | post  /api/admin/pm2/stop | stay-out | body is not the plain 500 shape: ; res.status(500).json({ ok: false, error: e.message }) |
| 12456 | post  /api/admin/pm2/delete | stay-out | body is not the plain 500 shape: ; res.status(500).json({ ok: false, error: e.message }) |
| 12476 | post  /api/admin/setup-remote | stay-out | body is not the plain 500 shape: ; results.pm2_save = { ok: false, error: e.message } |
| 12484 | post  /api/admin/setup-remote | stay-out | body is not the plain 500 shape: ; results.pm2_startup = { configured: false, error: e.message } |
| 12495 | post  /api/admin/setup-remote | stay-out | body is not the plain 500 shape: ; results.sudoers_reboot = { ok: false, error: e.message } |
| 12510 | post  /api/admin/setup-remote | stay-out | body is not the plain 500 shape: ; results.spawn_mode = { ok: false, error: e.message } |
| 12518 | post  /api/admin/setup-remote | stay-out | body is not the plain 500 shape: ; results.auto_login = { configured: false, note: 'S' } |
| 12541 | post  /api/admin/kill-pid | stay-out | body is not the plain 500 shape: ; results[pid] = e.message |
| 12569 | post  /api/admin/git-pull | stay-out | body is not the plain 500 shape:  |
| 12571 | post  /api/admin/git-pull | stay-out | body is not the plain 500 shape: ; res.status(500).json({ ok: false, error: e.message, log }) |
| 12595 | post  /api/admin/kill-apps | stay-out | body is not the plain 500 shape: ; results[app] = e.stderr?.includes('S') ? 'S' : e.message |
| 12630 | fn:async function getMemStats() { | stay-out | not a route handler (helper/function catch, no res) |
| 12663 | fn:async function getDiskStats() { | stay-out | not a route handler (helper/function catch, no res) |
| 12714 | fn:async function darwinRebootReadiness() { | stay-out | not a route handler (helper/function catch, no res) |
| 12761 | fn:async function linuxRebootReadiness() { | stay-out | not a route handler (helper/function catch, no res) |
| 12806 | fn:async function linuxRebootReadiness() { | stay-out | not a route handler (helper/function catch, no res) |
| 12845 | get  /api/admin/system-health | stay-out | body is not the plain 500 shape: ; health.pm2_error = e.message |
| 12920 | get  /api/admin/audit-stats | stay-out | body is not the plain 500 shape: ; // A bodyless PostgREST failure gives supabase-js an error with an EMPTY message, ; // w |
| 12999 | get  /api/admin/audit-events | fold | GET read route, plain log+500 shape |
| 13073 | get  /api/admin/audit-row | fold | GET read route, plain log+500 shape |
| 13144 | post  /api/admin/audit-restore | stay-out | body is not the plain 500 shape: ; failed.push({ event_id: ev.id, reason: e.message }) |
| 13151 | post  /api/admin/audit-restore | stay-out | CONTENT write (restores course rows from audit log) |
| 13201 | post  /api/admin/audit-cleanup | stay-out | DESTRUCTIVE (audit log cleanup) |
| 13254 | post  /api/admin/audit-archive | stay-out | DESTRUCTIVE (audit log archive) |
| 13339 | get  /api/admin/decomposition-audit/:courseCode | fold | GET read route, plain log+500 shape |
| 13490 | post  /api/admin/decomposition-backfill | stay-out | CONTENT write surface (content-write-surfaces.cjs) |
| 13517 | post  /api/admin/decomposition-backfill | stay-out | CONTENT write surface (content-write-surfaces.cjs) |
| 13572 | get  /api/admin/uptime-summary | fold | GET read route, plain log+500 shape |
| 13715 | get  /api/admin/db-health | fold | GET read route, plain log+500 shape |
| 13749 | fn:function scheduleNightlyArchive() { | stay-out | not a route handler (helper/function catch, no res) |
| 13790 | post  /api/insight-discovery/run | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ error: 'S', detail: e.message }) |
| 13810 | get  /api/insight-discovery/latest | stay-out | body is not the plain 500 shape: ; LOG() ; res.status(500).json({ error: 'S' }) |

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
- The route for each catch was found by nearest preceding app.<method>( line; inner catches inside a handler inherit that route, which is intended. Catches inside helper functions are marked "not a route handler" and stay out regardless.
- Verdicts on the write-method fold rows (flags, feedback, export-state, verify, gender-prep check/override, agents kill) rest on the route name and the plain body shape, not on reading each handler's body. Before folding any of those, one look at the handler confirms it writes no course content.
- Time-boxed to the hey.com reset at 20:00Z; no second pass was made.
