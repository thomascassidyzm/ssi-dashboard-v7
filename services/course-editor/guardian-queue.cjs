/**
 * Debounced, concurrency-capped review queue for the Edit Guardian.
 *
 * A human may make many rapid edits; we must NOT spawn one agent per keystroke.
 * This queue:
 *   - coalesces rapid edits to the SAME item (course+table+pk) into one review,
 *     keeping the EARLIEST `before` and the LATEST `after` (the net change),
 *   - waits `debounceMs` of quiet on an item before it becomes runnable,
 *   - drains runnable items through `processFn` with at most `concurrency` in flight.
 *
 * Timers/clock are injectable so the coalesce + concurrency logic is unit-testable
 * without real time. In production a thin DB-backed wrapper persists jobs so they
 * survive a restart; the scheduling logic is this module.
 */

class GuardianQueue {
  /**
   * @param {object} opts
   * @param {function} opts.processFn  - async (job) => void  (runs the review)
   * @param {number} [opts.debounceMs=4000]
   * @param {number} [opts.concurrency=2]
   * @param {function} [opts.setTimer=setTimeout]
   * @param {function} [opts.clearTimer=clearTimeout]
   * @param {function} [opts.onError]  - (err, job) => void
   */
  constructor({ processFn, debounceMs = 4000, concurrency = 2, setTimer = setTimeout, clearTimer = clearTimeout, onError = null }) {
    if (typeof processFn !== 'function') throw new Error('GuardianQueue requires processFn')
    this.processFn = processFn
    this.debounceMs = debounceMs
    this.concurrency = concurrency
    this.setTimer = setTimer
    this.clearTimer = clearTimer
    this.onError = onError
    this.pending = new Map() // key -> { job, timer }
    this.ready = []          // coalesced jobs whose debounce elapsed
    this.inFlight = 0
  }

  static keyOf(job) { return `${job.courseCode}:${job.table}:${job.pk}` }

  /** Record an edit. Coalesces with any pending edit to the same item. */
  enqueue(job) {
    const key = GuardianQueue.keyOf(job)
    const existing = this.pending.get(key)
    if (existing) {
      // keep the earliest before + latest after (net change), refresh debounce
      this.clearTimer(existing.timer)
      existing.job = { ...existing.job, after: job.after, editedBy: job.editedBy, at: job.at }
      existing.timer = this._arm(key)
    } else {
      this.pending.set(key, { job: { ...job }, timer: this._arm(key) })
    }
  }

  _arm(key) {
    return this.setTimer(() => this._promote(key), this.debounceMs)
  }

  _promote(key) {
    const entry = this.pending.get(key)
    if (!entry) return
    this.pending.delete(key)
    this.ready.push(entry.job)
    this._drain()
  }

  _drain() {
    while (this.inFlight < this.concurrency && this.ready.length) {
      const job = this.ready.shift()
      this.inFlight++
      Promise.resolve()
        .then(() => this.processFn(job))
        .catch((err) => { if (this.onError) this.onError(err, job) })
        .finally(() => { this.inFlight--; this._drain() })
    }
  }

  /** Test/inspection helpers. */
  stats() { return { pending: this.pending.size, ready: this.ready.length, inFlight: this.inFlight } }
}

module.exports = { GuardianQueue }
