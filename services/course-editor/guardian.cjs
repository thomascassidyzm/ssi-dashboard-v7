/**
 * Edit Guardian — reviews a human dashboard edit in the background.
 *
 * Pipeline (deterministic parts live here; the LLM judgment is a pluggable step):
 *   1. reviewEdit()          — gather ALL findings for an edit:
 *        · impact report (downstream phrases, ZUT, cascade, presentation, tiling, related forms)
 *        · cross-course shared audio (other courses using the same deduped clip)
 *        · parallel-course siblings (same target language) to investigate
 *        · a deterministic cascade fix-plan (exact-text propagation)
 *   2. buildAgentBrief()     — render the findings + the fix playbook into a prompt
 *                              for `claude --print` to judge "mistake?" and approve fixes.
 *   3. applyCascadeFixes()   — auto-apply the approved deterministic fixes through the
 *                              course-editor (scoped, audited → undoable). All fixes in
 *                              one batchId so the human can review/undo the whole review.
 *
 * Everything the guardian writes goes through the editor, so it inherits the
 * full safety contract and the content_audit_log undo runway.
 */

const fs = require('fs')
const path = require('path')
const { findParallelCourses } = require('./parallel-courses.cjs')

const PLAYBOOK_PATH = path.join(__dirname, '..', '..', 'docs', 'COURSE_EDIT_GUARDIAN_PLAYBOOK.md')

function contains(h, n) { return typeof h === 'string' && typeof n === 'string' && n.length > 0 && h.includes(n) }

class Guardian {
  /**
   * @param {object} deps
   * @param {object} deps.editor   - CourseEditor
   * @param {object} deps.ops      - CourseOperations (impact analyzer lives here)
   * @param {function} [deps.llm]  - async ({system,prompt}) => string (defaults to claude --print)
   * @param {string[]} [deps.allCourseCodes] - for parallel-course resolution
   */
  constructor({ editor, ops, llm = null, allCourseCodes = [] }) {
    this.editor = editor
    this.ops = ops
    this.llm = llm
    this.allCourseCodes = allCourseCodes
  }

  /**
   * Full deterministic review of a completed edit. Reads only.
   * `onProgress(stage)` streams human-facing status to the editor inline
   * ('checking-side-effects' | 'checking-audio' | 'checking-similar-courses').
   */
  async reviewEdit({ courseCode, table, before, after, onProgress = () => {} }) {
    const review = { courseCode, table, findings: {}, cascadeFixes: [], parallelCourses: [], crossCourseAudio: [] }

    // 1. Impact report — run the analyzer with the OLD row + the NEW fields, so
    // downstream rows (still holding old text) are detected correctly.
    onProgress('checking-side-effects')
    if (table === 'course_seeds') {
      review.findings.impact = await this.ops.analyzer.forSeedEdit(courseCode, before, after)
      review.cascadeFixes = await this._planSeedCascade(courseCode, before, after)
    } else if (table === 'course_legos') {
      review.findings.impact = await this.ops.analyzer.forLegoEdit(courseCode, before, after)
      review.cascadeFixes = await this._planLegoCascade(courseCode, before, after)
    } else if (table === 'course_practice_phrases') {
      review.findings.impact = await this.ops.analyzer.forPhraseEdit(courseCode, before, after)
    }

    // 2. Cross-course shared audio: a text change means the old clip may be
    // reused by sibling courses (course_audio dedups by text/lang/role).
    onProgress('checking-audio')
    review.crossCourseAudio = await this._findSharedAudio(courseCode, before, after, table)

    // 3. Parallel courses to investigate (same target language).
    onProgress('checking-similar-courses')
    review.parallelCourses = findParallelCourses(courseCode, this.allCourseCodes)

    return review
  }

  /** Seed text change → propagate the changed token into LEGOs + phrases that quote it. */
  async _planSeedCascade(courseCode, before, after) {
    return this._planTextPropagation(courseCode, before.target_text, after.target_text, before.known_text, after.known_text, before.seed_number)
  }

  /** LEGO text change → propagate into phrases (and components) that quote it. */
  async _planLegoCascade(courseCode, before, after) {
    return this._planTextPropagation(courseCode, before.target_text, after.target_text, before.known_text, after.known_text, before.seed_number)
  }

  /**
   * Build an exact-text propagation plan: any phrase whose known/target CONTAINS
   * the old text gets the old→new substring replacement. Deterministic and
   * reversible. Only emits a fix when there's a real, unambiguous substring hit.
   */
  async _planTextPropagation(courseCode, oldTarget, newTarget, oldKnown, newKnown, seedNumber) {
    const fixes = []
    const targetChanged = oldTarget != null && newTarget != null && oldTarget !== newTarget
    const knownChanged = oldKnown != null && newKnown != null && oldKnown !== newKnown
    if (!targetChanged && !knownChanged) return fixes

    const phrases = await this.editor.select('course_practice_phrases', { course_code: courseCode })
    for (const p of phrases) {
      const set = {}
      if (targetChanged && contains(p.target_text, oldTarget)) set.target_text = p.target_text.split(oldTarget).join(newTarget)
      if (knownChanged && contains(p.known_text, oldKnown)) set.known_text = p.known_text.split(oldKnown).join(newKnown)
      if (Object.keys(set).length) {
        fixes.push({ table: 'course_practice_phrases', pk: p.id, before: { known_text: p.known_text, target_text: p.target_text }, set, reason: 'exact-text propagation from edited parent' })
      }
    }
    return fixes
  }

  /** Find other courses whose course_audio shares the OLD text/role/lang (deduped clip reuse). */
  async _findSharedAudio(courseCode, before, after, table) {
    const textChanged = (before.target_text !== after.target_text) || (before.known_text !== after.known_text) || (before.text !== after.text)
    if (!textChanged) return []
    const oldTexts = [before.target_text, before.known_text, before.text].filter(Boolean)
    const hits = []
    for (const text of oldTexts) {
      const rows = await this.editor.select('course_audio', { text })
      for (const r of rows) {
        if (r.course_code !== courseCode) hits.push({ course_code: r.course_code, text: r.text, role: r.role, audio_id: r.id })
      }
    }
    return hits
  }

  /**
   * Render findings + the fix playbook into a prompt for the judgment agent.
   * The agent decides: is this edit a likely mistake? Which deterministic fixes
   * should apply? What needs flagging for the human?
   */
  buildAgentBrief({ courseCode, table, before, after }, review) {
    const playbook = this.loadPlaybook()
    const system = 'You are the SSi course Edit Guardian. You review a human content edit, decide whether it looks correct or like a mistake, approve safe downstream fixes, and flag anything you cannot resolve. Follow the playbook exactly. Respond ONLY with the JSON described.'
    const prompt = [
      `## The edit`,
      `course: ${courseCode}  ·  table: ${table}`,
      `BEFORE: ${JSON.stringify(before)}`,
      `AFTER:  ${JSON.stringify(after)}`,
      ``,
      `## Deterministic findings`,
      JSON.stringify({
        impact: review.findings.impact,
        proposedCascadeFixes: review.cascadeFixes,
        crossCourseSharedAudio: review.crossCourseAudio,
        parallelCourses: review.parallelCourses,
      }, null, 2),
      ``,
      `## Fix playbook (authoritative — how to check & fix each issue type)`,
      playbook,
      ``,
      `## Your output (JSON only)`,
      JSON.stringify({
        verdict: "'looks_good' | 'possible_mistake' | 'clear_mistake'",
        confidence: '0..1',
        reasoning: 'one or two sentences',
        approveCascadeFixes: 'true to apply ALL proposedCascadeFixes, or list the pk(s) to apply',
        additionalChecks: ['e.g. vocab-introduction, ZUT, single-phrase rule — note any that fail'],
        flags: [{ severity: "'info'|'warn'|'block'", message: 'what a human must look at', items: [] }],
        parallelCourseNotes: 'whether siblings likely share this issue and the same/similar fix',
      }, null, 2),
    ].join('\n')
    return { system, prompt }
  }

  loadPlaybook() {
    try { return fs.readFileSync(PLAYBOOK_PATH, 'utf8') } catch { return '(playbook not found)' }
  }

  /** Run the judgment agent (claude --print by default). Returns parsed JSON or null. */
  async judge(editInfo, review) {
    const { system, prompt } = this.buildAgentBrief(editInfo, review)
    const raw = this.llm ? await this.llm({ system, prompt }) : await this._claudePrint(system, prompt)
    if (!raw) return null
    try {
      const m = raw.match(/\{[\s\S]*\}/)
      return m ? JSON.parse(m[0]) : null
    } catch { return null }
  }

  async _claudePrint(system, prompt) {
    // Per CLAUDE.md: LLM calls go through the Claude CLI subscription, never the SDK.
    const { spawn } = require('child_process')
    return new Promise((resolve) => {
      const env = { ...process.env }
      delete env.CLAUDECODE // unset so the nested CLI call runs cleanly
      const child = spawn('claude', ['--print', '--model', 'sonnet', '--append-system-prompt', system], { env })
      let out = ''
      child.stdout.on('data', (d) => (out += d))
      child.on('close', () => resolve(out.trim()))
      child.on('error', () => resolve(null))
      child.stdin.write(prompt)
      child.stdin.end()
    })
  }

  /**
   * Apply approved cascade fixes through the editor (one batchId → undoable as a
   * unit). `approve` is true (all) or an array of pks. Returns applied results.
   */
  async applyCascadeFixes(courseCode, cascadeFixes, approve = true) {
    const chosen = approve === true ? cascadeFixes : cascadeFixes.filter((f) => Array.isArray(approve) && approve.includes(f.pk))
    if (!chosen.length) return { applied: [], batchId: null }
    const byTable = {}
    for (const f of chosen) (byTable[f.table] = byTable[f.table] || []).push({ pk: f.pk, set: f.set })
    const applied = []
    let batchId = null
    for (const [table, updates] of Object.entries(byTable)) {
      const r = await this.editor.bulkUpdateByPk(table, courseCode, updates, { confirm: true })
      batchId = batchId || r.batchId
      applied.push(...r.plan)
    }
    return { applied, batchId }
  }
}

function createGuardian(deps) { return new Guardian(deps) }

module.exports = { Guardian, createGuardian }
