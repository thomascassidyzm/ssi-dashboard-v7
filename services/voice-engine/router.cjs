/**
 * voice-engine/router.cjs — HTTP surface of the human voice engine.
 *
 * NOT mounted anywhere by this build — integration mounts it in
 * services/production-api.cjs with the one-liner in README.md:
 *
 *   app.use('/api/production/:courseCode/voice-engine',
 *           require('./voice-engine/router.cjs').createVoiceEngineRouter())
 *
 * MOUNTED UNDER /api/production/:courseCode so the app-level
 * app.param('courseCode') course-scope auth gate fires for every route
 * (the router uses mergeParams to read it; declaring :courseCode inside
 * the sub-router would silently escape the gate).
 *
 * Routes (all course-agnostic, voice-slot aware):
 *   POST /synthesize          { voiceId? , role?, dryRun? } → start job
 *   GET  /synthesize/status   ?voiceId=                    → job status
 *   POST /synthesize/cancel   { voiceId }                  → cancel
 *   GET  /coverage                                          → honest per-slot counts
 *
 * NO TTS. NO DDL. Mutations are course_audio upserts + S3 writes performed
 * by the job, never by the request thread.
 */

const express = require('express')
const synthesisJob = require('./synthesis-job.cjs')
const { computeCoverage } = require('./coverage.cjs')

/** Build the production dependency set lazily (env/SDKs only when used). */
function createDefaultDeps() {
  const supabaseClient = require('../supabase-client.cjs')
  const audioProcessor = require('../audio-processor.cjs')
  const { createS3Storage } = require('./storage.cjs')
  return {
    supabase: supabaseClient.getClient(),
    storage: createS3Storage(),
    audioProcessor,
    db: require('./db.cjs'),
    provenance: require('./provenance-adapter.cjs'),
    logger: console,
  }
}

/**
 * @param {object|null} depsArg - injectable deps for tests; production uses
 *   the lazy default set (built on first request, so requiring this file
 *   needs no env).
 */
function createVoiceEngineRouter(depsArg = null) {
  const router = express.Router({ mergeParams: true })
  let deps = depsArg
  const getDeps = () => {
    if (!deps) deps = createDefaultDeps()
    if (!deps.supabase) throw new Error('voice-engine: Supabase client not initialized (SUPABASE_URL / SUPABASE_SERVICE_KEY)')
    return deps
  }

  // Start a synthesis job for one (course, voice slot).
  router.post('/synthesize', async (req, res) => {
    try {
      const { courseCode } = req.params
      const { voiceId = null, role = null, dryRun = false, includeSeeds = true } = req.body || {}
      if (!voiceId && !role) {
        return res.status(400).json({ error: 'voiceId or role (target1|target2|known) required' })
      }
      const { started, conflict, job } = synthesisJob.startSynthesisJob(getDeps(), {
        courseCode, voiceId, role, dryRun: !!dryRun, includeSeeds: !!includeSeeds,
      })
      if (!started && conflict) {
        return res.status(409).json({
          error: 'A synthesis job is already running for this course/voice',
          job: publicJob(job),
        })
      }
      // Dry runs are fast — wait so the caller gets the plan in one round-trip.
      if (dryRun && job._run) {
        await job._run
        return res.json({ started: true, dryRun: true, job: publicJob(job) })
      }
      res.status(202).json({ started: true, job: publicJob(job) })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // Job status (one voice, or all jobs for the course).
  router.get('/synthesize/status', (req, res) => {
    const { courseCode } = req.params
    const { voiceId } = req.query
    if (voiceId) {
      const job = synthesisJob.getJob(courseCode, String(voiceId))
      if (!job) return res.status(404).json({ error: `no synthesis job for ${courseCode}/${voiceId}` })
      return res.json(publicJob(job))
    }
    res.json({ courseCode, jobs: synthesisJob.listJobs(courseCode).map(publicJob) })
  })

  // Cancel a running job.
  router.post('/synthesize/cancel', (req, res) => {
    const { courseCode } = req.params
    const { voiceId } = req.body || {}
    if (!voiceId) return res.status(400).json({ error: 'voiceId required' })
    const ok = synthesisJob.cancelJob(courseCode, voiceId)
    if (!ok) return res.status(404).json({ error: 'no running job to cancel' })
    res.json({ success: true, message: 'cancellation requested' })
  })

  // Honest coverage per voice slot (de-fakes RecordingOptimizer's stats).
  router.get('/coverage', async (req, res) => {
    try {
      const coverage = await computeCoverage(getDeps(), req.params.courseCode)
      res.json(coverage)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}

/** Strip internals (promise handle) from a job for HTTP responses. */
function publicJob(job) {
  if (!job) return null
  const { _run, ...rest } = job
  return rest
}

module.exports = { createVoiceEngineRouter, createDefaultDeps }
