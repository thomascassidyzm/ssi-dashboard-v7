/**
 * Edit Guardian worker — wires the queue → guardian → judgment → auto-fix →
 * review record. This is the background loop that turns "a human edited an item"
 * into "reviewed, safe fixes applied, the rest flagged for sanity-check."
 *
 * Dependencies are injected so the whole flow is testable with the in-memory
 * fake (no DB, no real LLM):
 *   - makeEditor()   : () => CourseEditor          (fresh per job is fine)
 *   - makeOps(editor): (editor) => CourseOperations
 *   - persistReview(record): async — store a course_edit_reviews row
 *   - llm, allCourseCodes  : passed through to the guardian
 */

const { GuardianQueue } = require('./guardian-queue.cjs')
const { createGuardian } = require('./guardian.cjs')

function createGuardianWorker({
  makeEditor,
  makeOps,
  persistReview,
  notify = null,            // async (record) => void — push an URGENT message to the user
  onProgress = null,        // (job, stage, extra) => void — inline status to the editor
  llm = null,
  allCourseCodes = [],
  debounceMs = 4000,
  concurrency = 2,
  onError = null,
  timers = {},
}) {
  async function process(job) {
    const editor = makeEditor()
    const ops = makeOps(editor)
    const guardian = createGuardian({ editor, ops, llm, allCourseCodes })
    const emit = (stage, extra) => { if (onProgress) { try { onProgress(job, stage, extra) } catch { /* progress is best-effort */ } } }

    emit('reviewing')
    const editInfo = { courseCode: job.courseCode, table: job.table, before: job.before, after: job.after, onProgress: (stage) => emit(stage) }
    const review = await guardian.reviewEdit(editInfo)
    emit('judging')
    const verdict = await guardian.judge(editInfo, review)

    const isClearMistake = verdict && verdict.verdict === 'clear_mistake'
    const hasZutClash = !!(review.findings.impact && (review.findings.impact.impacts || []).some((i) => i.type === 'zut_clash'))

    // 1. Deterministic cascade fixes — apply UNLESS the agent flagged a clear
    //    mistake (don't propagate a wrong edit) or withheld approval.
    let applied = { applied: [], batchId: null }
    const approve = verdict ? verdict.approveCascadeFixes : true
    if (!isClearMistake && approve && review.cascadeFixes.length) {
      emit('applying-fixes', { count: review.cascadeFixes.length })
      applied = await guardian.applyCascadeFixes(job.courseCode, review.cascadeFixes, approve === true ? true : approve)
    }

    // 2. ZUT resolution — TRY to fix it. The agent returns zutResolution:
    //    { confident, fixes:[{table,pk,set}], message }. Apply ONLY if confident.
    let zutApplied = { applied: [], batchId: null }
    const zut = verdict && verdict.zutResolution
    const zutConfident = !!(zut && zut.confident && Array.isArray(zut.fixes) && zut.fixes.length)
    if (!isClearMistake && zutConfident) {
      zutApplied = await guardian.applyCascadeFixes(job.courseCode, zut.fixes, true)
    }

    // 3. Urgency. A ZUT clash the guardian could NOT confidently resolve is the
    //    canonical "ping the human now" case (deterministic backstop — does not
    //    rely on the LLM remembering to set urgent). Also honour an explicit
    //    agent `urgent` flag / urgent-severity flags.
    const agentFlags = (verdict && verdict.flags) || []
    const unresolvedZut = hasZutClash && !zutConfident
    const urgent = unresolvedZut || !!(verdict && verdict.urgent) || agentFlags.some((f) => f.severity === 'urgent')
    const flags = [...agentFlags]
    if (unresolvedZut) {
      flags.unshift({
        severity: 'urgent',
        message: `ZUT clash on ${job.courseCode} ${job.pk} could not be resolved confidently — needs your call (expand/rename/gender-pair).`,
        items: (review.findings.impact.impacts.find((i) => i.type === 'zut_clash') || {}).items || [],
      })
    }

    const record = {
      course_code: job.courseCode,
      table_name: job.table,
      primary_key: job.pk,
      edited_by: job.editedBy || null,
      before_row: job.before,
      after_row: job.after,
      verdict: verdict ? verdict.verdict : null,
      confidence: verdict ? verdict.confidence : null,
      reasoning: verdict ? verdict.reasoning : null,
      findings: {
        impact: review.findings.impact || null,
        crossCourseAudio: review.crossCourseAudio,
        parallelCourses: review.parallelCourses,
        proposedCascadeFixes: review.cascadeFixes,
        zutResolution: zut || null,
      },
      applied_fix_batch_id: applied.batchId,
      zut_fix_batch_id: zutApplied.batchId,
      applied_fix_count: applied.applied.length + zutApplied.applied.length,
      flags,
      urgent,
      status: 'open',
    }
    await persistReview(record)
    if (urgent && notify) await notify(record)

    // Final inline outcome to the editor: "edit accepted" or "flagged for review".
    const flagged = urgent || (verdict && verdict.verdict !== 'looks_good') || flags.length > 0
    emit(flagged ? 'flagged' : 'accepted', {
      verdict: record.verdict,
      urgent,
      autoFixed: record.applied_fix_count,
      flags,
    })
    return record
  }

  const queue = new GuardianQueue({ processFn: process, debounceMs, concurrency, onError, ...timers })

  return {
    /** Call this from the edit endpoint AFTER a successful write (non-blocking). */
    enqueue(edit) { queue.enqueue(edit) },
    queue,
    _process: process, // exposed for tests
  }
}

module.exports = { createGuardianWorker }
