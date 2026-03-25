/**
 * Progress emission — writes narrative messages to orchestrator_messages
 * so the dashboard chat pane shows what's happening in real time.
 *
 * Two modes:
 *   emitProgress()          — always emits (milestones: job started, job complete)
 *   emitProgressThrottled() — emits every N calls with real progress from DB
 *
 * The API layer is the RELIABLE progress source. Agent briefs also post to chat
 * but agents can forget or lose context. The API always fires.
 *
 * @version 2.0.0
 */

const createLogger = require('./logger.cjs')
const logger = createLogger('Progress')

/**
 * Emit a progress message to orchestrator_messages.
 * Fire-and-forget — never throws, never blocks the caller.
 */
async function emitProgress(supabase, courseCode, message, metadata = {}) {
  try {
    await supabase
      .from('orchestrator_messages')
      .insert({
        course_code: courseCode,
        direction: 'agent_to_human',
        message,
        metadata: { source: 'system', ...metadata },
        status: 'read'
      })
  } catch (e) {
    logger.warn(`Failed to emit progress for ${courseCode}: ${e.message}`)
  }
}

// In-memory counters: "courseCode:key" → count
const throttleCounters = new Map()

/**
 * Throttled progress emission — only emits every N calls.
 * When it does emit, calls opts.getProgress() to fetch real numbers from the DB.
 *
 * @param {object} supabase - Supabase client instance
 * @param {string} courseCode - Course this relates to
 * @param {string} key - Throttle key (e.g. 'translate', 'build')
 * @param {object} opts
 * @param {number} opts.every - Emit every N calls (default 50)
 * @param {function} opts.getProgress - async () => { done, total } — queries DB for real counts
 * @param {function} opts.message - (done, total) => string
 * @param {object} [opts.metadata={}] - Optional structured data
 */
async function emitProgressThrottled(supabase, courseCode, key, opts = {}) {
  const every = opts.every || 50
  const counterKey = `${courseCode}:${key}`
  const count = (throttleCounters.get(counterKey) || 0) + 1
  throttleCounters.set(counterKey, count)

  if (count % every === 0) {
    try {
      let done = count
      let total = '?'

      if (typeof opts.getProgress === 'function') {
        const progress = await opts.getProgress()
        done = progress.done
        total = progress.total
      }

      const message = typeof opts.message === 'function'
        ? opts.message(done, total)
        : `${key}: ${done}/${total}`

      await emitProgress(supabase, courseCode, message, {
        phase: key, done, total, ...opts.metadata
      })
    } catch (e) {
      // Never let progress checks break the actual work
      logger.warn(`Failed to check progress for ${courseCode}:${key}: ${e.message}`)
    }
  }
}

/**
 * Reset throttle counter (call when a phase completes to reset for next run)
 */
function resetThrottleCounter(courseCode, key) {
  throttleCounters.delete(`${courseCode}:${key}`)
}

module.exports = { emitProgress, emitProgressThrottled, resetThrottleCounter }
