// =============================================================================
// IN-MEMORY JOB QUEUE for Phase 8 audio operations
// =============================================================================
// Heavy audio operations (generate, regenerate-role, regenerate-presentations,
// splice-components, generate-components) no longer block or 409-reject when one
// is already running. Each enqueues a job and the caller returns 202 immediately.
// A single serial worker (drainQueue) runs jobs one at a time, reusing the
// existing currentWork + emitProgress machinery in phase8 — so all live-progress
// UIs keep working unchanged. Work runs fully decoupled from the HTTP request
// that enqueued it, so a client/proxy disconnect can never abort or double-run
// a job (these jobs run for hours; connection-tied locking would be unsafe).
//
// In-memory only (matches currentWork): a process restart loses queued jobs.
// The active job is already lost on restart today, so this is no regression.
//
// Factory pattern so the queue can be unit-tested in isolation, injecting a fake
// logger and currentWork hooks.

/**
 * @param {object} deps
 * @param {{info:Function,error:Function}} deps.logger
 * @param {() => boolean} deps.isWorkActive       - read currentWork.active
 * @param {() => void}    deps.releaseWork         - call endWork() if work is stuck active
 * @param {(fn:Function)=>void} [deps.schedule]    - defer drainQueue (default setImmediate)
 */
function createJobQueue({ logger, isWorkActive, releaseWork, schedule = setImmediate }) {
  const jobQueue = []   // [{ id, courseCode, operation, role, meta, status, enqueuedAt, startedAt, finishedAt, result, error, run }]
  let draining = false
  let jobSeq = 0

  function genJobId(courseCode, operation) {
    jobSeq += 1
    return `${courseCode}:${operation}:${jobSeq}`
  }

  // Position among jobs that are running (1) or still queued. The running job is
  // position 1; the first queued job is 2; etc.
  function queuePosition(job) {
    const live = jobQueue.filter(j => j.status === 'running' || j.status === 'queued')
    const idx = live.indexOf(job)
    return idx < 0 ? null : idx + 1
  }

  // Enqueue a heavy job. Dedupes on (courseCode, operation, role): a double-click
  // or repeated trigger returns the existing job instead of queuing a duplicate.
  function enqueueJob({ courseCode, operation, role = null, meta = {}, run }) {
    const dup = jobQueue.find(j =>
      (j.status === 'queued' || j.status === 'running') &&
      j.courseCode === courseCode && j.operation === operation && j.role === role)
    if (dup) {
      return { jobId: dup.id, position: queuePosition(dup), alreadyQueued: true }
    }
    const job = {
      id: genJobId(courseCode, operation),
      courseCode, operation, role, meta,
      status: 'queued',
      enqueuedAt: new Date().toISOString(),
      startedAt: null, finishedAt: null,
      result: null, error: null,
      run
    }
    jobQueue.push(job)
    schedule(drainQueue)
    return { jobId: job.id, position: queuePosition(job), alreadyQueued: false }
  }

  // Remove a still-queued job. Returns false if not found or already running
  // (a running job must be stopped via /cancel, not removed from the queue).
  function removeQueuedJob(jobId) {
    const idx = jobQueue.findIndex(j => j.id === jobId && j.status === 'queued')
    if (idx < 0) return false
    const [job] = jobQueue.splice(idx, 1)
    logger.info(`[QUEUE] removed queued job ${job.id} (${job.operation} ${job.courseCode})`)
    return true
  }

  // Serial worker: runs queued jobs one at a time. Self-guarding via `draining`
  // so concurrent enqueues never start a second worker. Per-job errors are
  // swallowed so one failed job can't stop the queue.
  async function drainQueue() {
    if (draining) return
    draining = true
    try {
      while (true) {
        const job = jobQueue.find(j => j.status === 'queued')
        if (!job) break
        job.status = 'running'
        job.startedAt = new Date().toISOString()
        logger.info(`[QUEUE] starting job ${job.id} (${job.operation} ${job.courseCode}${job.role ? ` ${job.role}` : ''})`)
        try {
          await job.run(job)
        } catch (e) {
          job.error = e.message
          logger.error(`[QUEUE] job ${job.id} failed: ${e.message}`)
        } finally {
          // Safety net: a job that threw before releasing currentWork would leave
          // it stuck active and wedge every future job. Release it.
          if (isWorkActive()) {
            try { releaseWork() } catch (_) {}
          }
          job.status = 'done'
          job.finishedAt = new Date().toISOString()
          const i = jobQueue.indexOf(job)
          if (i >= 0) jobQueue.splice(i, 1)
          logger.info(`[QUEUE] finished job ${job.id} (${jobQueue.filter(j => j.status === 'queued').length} still queued)`)
        }
      }
    } finally {
      draining = false
    }
  }

  // Public snapshot of the queue (queued jobs only; the running one is already
  // represented by currentWork in /status).
  function queueSnapshot() {
    return jobQueue
      .filter(j => j.status === 'queued')
      .map(j => ({
        jobId: j.id,
        courseCode: j.courseCode,
        operation: j.operation,
        role: j.role,
        enqueuedAt: j.enqueuedAt,
        position: queuePosition(j),
        ...j.meta
      }))
  }

  return { enqueueJob, removeQueuedJob, drainQueue, queueSnapshot, queuePosition, _jobQueue: jobQueue }
}

module.exports = { createJobQueue }
