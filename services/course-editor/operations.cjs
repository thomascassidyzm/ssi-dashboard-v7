/**
 * High-level operations — the methodology-encoding layer the CLI / MCP / API
 * expose. Each composes the editor primitives, so every op inherits the full
 * safety contract (course-scoping, dry-run, blast-radius, audit, side-effects).
 *
 * The ops here deliberately do NOT guess where human judgement is required:
 *  - slashes need a chosen form (no auto-pick),
 *  - "is this phrase a question?" is left to the caller / Haiku skill — we only
 *    apply the correct mark once a phrase is declared a question.
 */

const { NotFoundError, ValidationError, ImpactReviewError } = require('./errors.cjs')
const { TABLE_RULES } = require('./scoping.cjs')
const { createAnalyzer } = require('./impact.cjs')
const t = require('./text-ops.cjs')

/** Turn a flexible lego key into a scope object. */
function legoScope(courseCode, key) {
  if (key == null) throw new ValidationError('lego key required')
  if (typeof key === 'string') return { course_code: courseCode, lego_id: key }
  if (key.id) return { course_code: courseCode, id: key.id }
  if (key.legoId || key.lego_id) return { course_code: courseCode, lego_id: key.legoId || key.lego_id }
  if (key.seedNumber != null && key.legoIndex != null) {
    return { course_code: courseCode, seed_number: key.seedNumber, lego_index: key.legoIndex }
  }
  throw new ValidationError('lego key must provide id, lego_id, or seedNumber+legoIndex', { key })
}

class CourseOperations {
  constructor(editor) {
    this.editor = editor
    this.analyzer = createAnalyzer(editor)
  }

  /**
   * The responsible-editing gate. Given a computed impact report, enforce that
   * the caller has reviewed it:
   *  - no warn/block impacts → proceed.
   *  - warn impacts → require acknowledgeImpacts === report.ackToken.
   *  - block impacts → also require overrideBlock:true.
   *  - dryRun never gates (it's how you SEE the report).
   * Throws ImpactReviewError carrying the full report.
   */
  _gateImpacts(report, opts) {
    if (opts.dryRun || !report.requiresAck) return
    if (opts.acknowledgeImpacts !== report.ackToken) {
      throw new ImpactReviewError(
        `This edit has downstream impacts that must be reviewed first. Inspect report.impacts, ` +
          `then re-call with acknowledgeImpacts:'${report.ackToken}'.`,
        { report }
      )
    }
    if (report.maxSeverity === 'block' && !opts.overrideBlock) {
      throw new ImpactReviewError(
        `This edit has BLOCK-severity impacts (e.g. a ZUT clash). If you genuinely intend it, ` +
          `re-call with overrideBlock:true (and the ack token).`,
        { report }
      )
    }
  }

  // --- LEGO ----------------------------------------------------------------

  /** Read-only: preview the downstream impact of a proposed LEGO edit. */
  async analyzeLegoEdit(courseCode, key, fields) {
    const [cur] = await this.editor.select('course_legos', legoScope(courseCode, key))
    if (!cur) throw new NotFoundError('lego not found', { courseCode, key })
    return this.analyzer.forLegoEdit(courseCode, cur, fields)
  }

  async editLego(courseCode, key, fields, opts = {}) {
    const [cur] = await this.editor.select('course_legos', legoScope(courseCode, key))
    if (!cur) throw new NotFoundError('lego not found', { courseCode, key })
    const report = await this.analyzer.forLegoEdit(courseCode, cur, fields)
    this._gateImpacts(report, opts)
    const res = await this.editor.update('course_legos', legoScope(courseCode, key), fields, opts)
    return { ...res, impact: report }
  }

  /** Read-only: preview the downstream impact of a proposed seed edit. */
  async analyzeSeedEdit(courseCode, seedNumber, fields) {
    const [cur] = await this.editor.select('course_seeds', { course_code: courseCode, seed_number: seedNumber })
    if (!cur) throw new NotFoundError('seed not found', { courseCode, seedNumber })
    return this.analyzer.forSeedEdit(courseCode, cur, fields)
  }

  async editSeed(courseCode, seedNumber, fields, opts = {}) {
    const [cur] = await this.editor.select('course_seeds', { course_code: courseCode, seed_number: seedNumber })
    if (!cur) throw new NotFoundError('seed not found', { courseCode, seedNumber })
    const report = await this.analyzer.forSeedEdit(courseCode, cur, fields)
    this._gateImpacts(report, opts)
    const res = await this.editor.update('course_seeds', { course_code: courseCode, seed_number: seedNumber }, fields, opts)
    return { ...res, impact: report }
  }

  /**
   * Resolve a ZUT duplicate: set is_new=false and optionally rename the gloss.
   * (memory methodology-zut-resolution). Composes a single scoped LEGO edit.
   */
  async resolveZutDuplicate(courseCode, key, { known_text, markNotNew = true } = {}, opts = {}) {
    const fields = {}
    if (markNotNew) fields.is_new = false
    if (known_text !== undefined) fields.known_text = known_text
    if (Object.keys(fields).length === 0) throw new ValidationError('resolveZutDuplicate: nothing to change')
    // Route through editLego so it inherits the impact gate (a ZUT resolution can
    // itself create/relocate a clash — the agent should see that).
    return this.editLego(courseCode, key, fields, opts)
  }

  // --- PHRASE --------------------------------------------------------------

  /**
   * Edit a phrase's text, owning the audio side-effect:
   *  - the DB trigger nulls audio on any text change,
   *  - but for a COSMETIC change (trailing period / case only — no TTS impact),
   *    we restore the pointer so we don't needlessly regenerate audio.
   * Returns { ...editorResult, audioPolicy: { known, target } } where each is
   * 'preserved' | 'nulled-for-regen' | 'unchanged'.
   */
  async editPhrase(courseCode, phraseId, fields, opts = {}) {
    const [cur] = await this.editor.select('course_practice_phrases', { course_code: courseCode, id: phraseId })
    if (!cur) throw new NotFoundError('phrase not found', { courseCode, phraseId })

    const set = {}
    if (fields.known_text !== undefined) set.known_text = fields.known_text
    if (fields.target_text !== undefined) set.target_text = fields.target_text
    if (fields.introduce !== undefined) set.introduce = fields.introduce
    if (Object.keys(set).length === 0) throw new ValidationError('editPhrase: nothing to change')

    const report = await this.analyzer.forPhraseEdit(courseCode, cur, fields)
    this._gateImpacts(report, opts)

    const audioPolicy = { known: 'unchanged', target: 'unchanged' }
    const restore = {}
    if (set.known_text !== undefined) {
      if (t.affectsAudio(cur.known_text, set.known_text)) audioPolicy.known = 'nulled-for-regen'
      else if (set.known_text !== cur.known_text) { audioPolicy.known = 'preserved'; restore.known_audio_id = cur.known_audio_id }
    }
    if (set.target_text !== undefined) {
      if (t.affectsAudio(cur.target_text, set.target_text)) audioPolicy.target = 'nulled-for-regen'
      else if (set.target_text !== cur.target_text) {
        audioPolicy.target = 'preserved'
        restore.target1_audio_id = cur.target1_audio_id
        restore.target2_audio_id = cur.target2_audio_id
      }
    }

    const res = await this.editor.update('course_practice_phrases', { course_code: courseCode, id: phraseId }, set, opts)
    if (!opts.dryRun && Object.keys(restore).length) {
      await this.editor.relinkAudio('course_practice_phrases', { course_code: courseCode, id: phraseId }, restore, opts)
    }
    return { ...res, audioPolicy, impact: report }
  }

  async deletePhrase(courseCode, phraseId, opts = {}) {
    return this.editor.remove('course_practice_phrases', { course_code: courseCode, id: phraseId }, opts)
  }

  /**
   * Apply the correct terminal question mark for the target language to a phrase
   * the caller has DECLARED a question. We never auto-detect questionhood.
   */
  async applyQuestionMark(courseCode, phraseId, targetLang, opts = {}) {
    const [cur] = await this.editor.select('course_practice_phrases', { course_code: courseCode, id: phraseId })
    if (!cur) throw new NotFoundError('phrase not found', { courseCode, phraseId })
    const { text, changed } = t.ensureQuestionMark(cur.target_text, targetLang)
    if (!changed) return { applied: false, reason: 'already-correct', audioPolicy: { target: 'unchanged' } }
    return this.editPhrase(courseCode, phraseId, { target_text: text }, opts)
  }

  // --- COURSE-WIDE MECHANICAL SWEEPS --------------------------------------

  /**
   * Strip parenthetical glosses across a whole course, on BOTH known and target
   * sides, across legos / phrases / seeds (memory feedback_parens_slashes_both_sides).
   * Returns a report; pass {dryRun:true} to preview, {confirm:true} to exceed the
   * blast-radius threshold.
   */
  async stripParensFromCourse(courseCode, opts = {}) {
    const sides = opts.sides || ['known', 'target']
    const tables = opts.tables || ['course_legos', 'course_practice_phrases', 'course_seeds']
    const report = { courseCode, dryRun: !!opts.dryRun, byTable: {}, totalChanged: 0 }

    for (const table of tables) {
      const rule = TABLE_RULES[table]
      const rows = await this.editor.select(table, { course_code: courseCode })
      const updates = []
      for (const row of rows) {
        const set = {}
        for (const side of sides) {
          for (const col of rule.textFields[side] || []) {
            if (typeof row[col] !== 'string') continue
            const { text, changed } = t.stripParens(row[col])
            if (changed) set[col] = text
          }
        }
        if (Object.keys(set).length) updates.push({ pk: row[rule.pk], set, _id: row[rule.pk] })
      }
      report.byTable[table] = { scanned: rows.length, changed: updates.length, samples: updates.slice(0, 5) }
      report.totalChanged += updates.length
      if (updates.length && !opts.dryRun) {
        await this.editor.bulkUpdateByPk(table, courseCode, updates.map(({ pk, set }) => ({ pk, set })), { confirm: opts.confirm })
      }
    }
    return report
  }

  /**
   * Find slash alternations across a course (does NOT auto-fix — returns the
   * options for a human/agent to choose, per feedback_no_slashes_use_seed).
   */
  async findSlashesInCourse(courseCode, opts = {}) {
    const tables = opts.tables || ['course_legos', 'course_practice_phrases', 'course_seeds']
    const sides = opts.sides || ['known', 'target']
    const hits = []
    for (const table of tables) {
      const rule = TABLE_RULES[table]
      const rows = await this.editor.select(table, { course_code: courseCode })
      for (const row of rows) {
        for (const side of sides) {
          for (const col of rule.textFields[side] || []) {
            const { hasSlash, options } = t.detectSlashOptions(row[col])
            if (hasSlash) hits.push({ table, pk: row[rule.pk], col, value: row[col], options })
          }
        }
      }
    }
    return { courseCode, hits }
  }
}

function createOperations(editor) {
  return new CourseOperations(editor)
}

module.exports = { CourseOperations, createOperations, legoScope }
