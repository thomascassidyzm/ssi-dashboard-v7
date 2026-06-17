// Wait for a Phase 8 queue job to finish.
//
// Phase 8 audio operations enqueue and return 202 immediately; the work runs
// later in a serial queue. This polls the Phase 8 /status payload until the job
// (identified by jobId, plus course/operation/role to match the active running
// job — currentWork has no jobId) is no longer queued or running. Used by
// background tasks that must act ON completion (e.g. clearing QA flags after the
// audio is actually regenerated). Never blocks an HTTP request.
//
// Factory takes getStatus() returning the parsed /status object, so it can be
// unit-tested with a fake status sequence.

function createJobWaiter(getStatus, { sleep = (ms) => new Promise(r => setTimeout(r, ms)) } = {}) {
  return async function waitForPhase8JobDone(jobId, { courseCode, operation, role = null }, { intervalMs = 5000, timeoutMs = 6 * 3600 * 1000, now = () => Date.now() } = {}) {
    const start = now()
    let sawJob = false
    while (now() - start < timeoutMs) {
      let status
      try {
        status = await getStatus()
      } catch (e) {
        await sleep(intervalMs)
        continue
      }
      const inQueue = Array.isArray(status.queue) && status.queue.some(j => j.jobId === jobId)
      const isActive = !!status.active && status.courseCode === courseCode && status.operation === operation && (!role || status.role === role)
      if (inQueue || isActive) {
        sawJob = true
      } else if (sawJob) {
        return { done: true, status }
      } else if (now() - start > intervalMs * 2) {
        // Never observed the job live across two polls — it likely completed
        // before the first poll (tiny jobs finish in <5s). Treat as done.
        return { done: true, assumedInstant: true, status }
      }
      await sleep(intervalMs)
    }
    return { done: false, timedOut: true }
  }
}

module.exports = { createJobWaiter }
