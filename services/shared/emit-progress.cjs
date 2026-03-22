/**
 * Progress emission — writes narrative messages to orchestrator_messages
 * so the dashboard chat pane shows what's happening in real time.
 *
 * DB is SSoT: every service writes here, dashboard reads via polling/realtime.
 *
 * Usage:
 *   const { emitProgress } = require('./shared/emit-progress.cjs')
 *   await emitProgress(supabase, 'eng_for_sin', 'Generating audio: 145/973 complete')
 *   await emitProgress(supabase, 'eng_for_sin', 'Translation complete', { seeds: 468 })
 *
 * @version 1.0.0
 */

const createLogger = require('./logger.cjs')
const logger = createLogger('Progress')

/**
 * Emit a progress message to orchestrator_messages.
 * Fire-and-forget — never throws, never blocks the caller.
 *
 * @param {object} supabase - Supabase client instance
 * @param {string} courseCode - Course this relates to
 * @param {string} message - Human-readable narrative (keep it short)
 * @param {object} [metadata={}] - Optional structured data (counts, phase, etc.)
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
        status: 'read' // Auto-read — these are status updates, not questions
      })
  } catch (e) {
    // Never let progress emission break the actual work
    logger.warn(`Failed to emit progress for ${courseCode}: ${e.message}`)
  }
}

module.exports = { emitProgress }
