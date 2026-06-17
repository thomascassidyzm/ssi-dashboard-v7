# Audio Generation Queue — Implementation Log & Deploy Handoff

**Date:** 2026-06-17
**Author:** Claude (Opus) — autonomous session
**Status:** ✅ Built + fully tested (unit + live integration on a throwaway instance). ⏳ **NOT yet deployed to live** — see [Deploy](#deploy).

---

## Why

Audio generation was **one-at-a-time and blocking**. Phase 8 (`:3465`) tracked a single in-memory job (`currentWork`) and the dashboard hard-disabled actions with a banner ("Audio job running on another course — only one at a time"). To generate course B while course A ran, you had to babysit A to completion, then manually start B. There was no way to line up work and walk away (e.g. queue several courses overnight).

**Goal:** queue audio jobs so they run serially and automatically, instead of blocking / 409-rejecting.

---

## What changed

Heavy audio operations now **enqueue a job and return `202 {jobId, position}` immediately**. A single serial worker drains the queue one job at a time, reusing the existing `currentWork` + `emitProgress` machinery (so all live-progress UIs keep working). The work runs **fully decoupled from the HTTP request** that enqueued it — critical because these jobs run for hours and a client/proxy disconnect must not abort or double-run a job (a connection-tied lock would be unsafe).

### Scope: which operations are queued

| Operation | Queued? | Notes |
|-----------|:---:|-------|
| `generate` | ✅ | main "Generate Missing Audio" |
| `regenerate-role` | ✅ | |
| `generate-components` | ✅ | previously `409`-rejected when busy |
| `splice-components` | ✅ | previously `409`-rejected when busy |
| `regenerate-presentations` | ❌ | **Deliberately left un-queued** — it's text-gen (Haiku), doesn't use `currentWork`, and already runs without blocking. Queueing it needs a riskier refactor + frontend contract change for little benefit. *Open question for Kai: include it or not?* |

### Design

- **In-memory** (matches `currentWork`). A process restart loses queued jobs. The active job is already lost on restart today, so this is no regression. (DB-backed persistence is a possible future upgrade.)
- **Serial** — one worker, respecting Azure's concurrency limits exactly as before.
- **Dedup** on `(courseCode, operation, role)` — a double-click returns the existing job (`already_queued`) instead of queuing twice.
- **Error-isolated** — one failed job can't stop the queue; a safety net releases `currentWork` if a job dies mid-run.

---

## Files

**New (both unit-tested, factory pattern for testability):**
- `services/phases/audio-job-queue.cjs` — the queue core (`enqueueJob`, `drainQueue`, `removeQueuedJob`, `queueSnapshot`).
- `services/wait-for-phase8-job.cjs` — polls `/status` until a queued job finishes; used by background tasks that must act *on completion* (clearing QA flags after regen).

**Modified:**
- `services/phases/phase8-audio-v13.cjs` — 4 heavy endpoints wrapped in `run()` closures + enqueue/`202`; `GET /status` now returns `queue[]`; new `DELETE /queue/:jobId` and `GET /queue`; removed the old `409` guards.
- `services/production-api.cjs` — `audio-pipeline/start` passes the `202` through (no more premature post-link; the worker auto-links on completion); `regeneration/trigger`, `regeneration/trigger-all`, and the `regenerate-role` background IIFE adapted to async (the IIFE now waits for the queued job to finish via `waitForPhase8JobDone` before clearing flags); new `DELETE /api/audio/queue/:jobId` proxy.
- `src/views/production/AudioPipeline.vue` — queue panel (running job + waiting jobs, each with a **Remove** button → `DELETE /api/audio/queue/:jobId`); buttons no longer hard-blocked when another course runs (they queue); `202` handled as "queued".

### API surface

```
POST   /generate/:courseCode            → 202 { status:'queued'|'already_queued', jobId, position, willGenerate }
POST   /regenerate-role/:courseCode      → 202 { ..., role, willRegenerate }
POST   /generate-components/:courseCode  → 202 { ..., willGenerate }
POST   /splice-components/:courseCode     → 202 { ..., willSplice }
GET    /status                           → { ...currentWork, queue: [ {jobId, courseCode, operation, role, position, ...} ] }
GET    /queue                            → { active, queue }
DELETE /queue/:jobId                     → 200 { removed } | 404   (queued jobs only; running job uses /cancel)
```
(dryRun on any of the above still responds immediately and is **never** queued.)

Production-API proxy: `DELETE /api/audio/queue/:jobId` → phase8 `DELETE /queue/:jobId`. `/api/audio/status` already passes the queue through unchanged.

---

## Tests

| Suite | Result |
|-------|:---:|
| `scripts/experiments/test-audio-job-queue.cjs` | 8/8 ✅ (serial, FIFO, dedup, remove, error-isolation, stuck-work safety net, idle-restart) |
| `scripts/experiments/test-wait-for-phase8-job.cjs` | 7/7 ✅ (active→idle, queued→running→done, instant-completion grace, course/role matching, timeout, transient errors) |
| `scripts/experiments/test-queue-integration.cjs` | 6/6 ✅ — run live against a **throwaway phase8 on :3475** (real HTTP + real DB): status has `queue[]`, `/queue`, `DELETE 404`, dryRun-immediate, live `202` + serial-drain |

Re-run unit tests anytime: `node scripts/experiments/test-audio-job-queue.cjs && node scripts/experiments/test-wait-for-phase8-job.cjs`

The live code was validated by booting `PHASE8_PORT=3475 node services/phases/phase8-audio-v13.cjs` (boots clean) and running `PHASE8_PORT=3475 node scripts/experiments/test-queue-integration.cjs eng_for_ben`. The live phase8 (3465) was **not** touched during the build.

---

## Deploy

The feature is **not live yet** — phase8 (3465) and production-api (3470) still run the old code (edits are on-disk only). Deploy needs **both restarted together** — a phase8-new / production-api-old mix is unsafe (old `regeneration/trigger` checks `status===200` and would mis-handle the new `202`).

> ⚠️ Held off restarting `production-api` autonomously overnight because of the `SSH_AUTH_SOCK` export gotcha (see memory `pm2-needs-ssh-agent-socket`): a bare restart can drop apidev SSH until `--update-env` runs with a live agent.

```bash
pm2 restart phase8-audio
pm2 restart production-api --update-env
# smoke test against the live service:
node scripts/experiments/test-queue-integration.cjs eng_for_ben
```

Rollback: the old code is intact in git; `pm2 restart` after reverting the working tree.

---

## Side task this session — audio generation favor (Kai)

Kai left **eng_for_hin** generating and asked me to run **eng_for_ben** on completion, watching for money-wasting loops.

- **eng_for_hin** ✅ — 19,015/19,015, **0 fail, 10 timeout**. The 10 timeouts are items that didn't confirm in-window (not failures); a cheap top-up re-run would catch them. *Not done — flagged to Kai.*
- **eng_for_ben** ✅ — generated in ~31 min on the **proven (un-queued) code**, success 17,908/17,908, 0 fail, 0 timeout. Verified additive & genuine: `/plan` `missing` 17,908 → 0; DB rows known=5,620 / target1=5,396 / target2=5,396 / presentation=1,420, **0 pending, 0 human-origin**; sampled rows have real `mastered/` S3 keys + real durations. Cost ~$7.87 as estimated. No waste.

Monitoring used a reusable watchdog: `scripts/experiments/audio-gen-monitor.cjs <courseCode> [--expect-active]` (polls `:3465/status`, logs to `temp/audio-gen-monitor/<course>.log`, exits on completion / 25-min stall / failure-spike). The expensive Bengali run was deliberately kept on the proven code — the queue was integration-tested separately on the throwaway instance at $0.
