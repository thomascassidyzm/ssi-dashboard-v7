/**
 * Editor core — the only sanctioned writer to course-content tables.
 *
 * Every mutation goes through these primitives, which enforce the four
 * non-negotiable invariants from the scope doc:
 *   1. course-scoped writes only (scoping.assertScope)
 *   2. dry-run plan + blast-radius circuit-breaker
 *   3. operation-batch id (journal) for unit revert
 *   4. defence-in-depth: re-check matched rows actually share one course
 *
 * The DB client is INJECTED (a @supabase/supabase-js client, or the in-memory
 * fake in __tests__). That keeps the safety logic testable without a real DB.
 */

const crypto = require('crypto')
const {
  assertScope,
  assertEditableFields,
  assertInsertable,
  assertValueTypes,
  TABLE_RULES,
} = require('./scoping.cjs')
const {
  ScopeError,
  BlastRadiusError,
  NotFoundError,
  ValidationError,
  CourseEditorError,
} = require('./errors.cjs')

const DEFAULT_THRESHOLD = 25

function applyFilters(query, filters) {
  for (const [col, val] of Object.entries(filters)) {
    if (Array.isArray(val)) query = query.in(col, val)
    else if (val === null) query = query.is(col, null)
    else query = query.eq(col, val)
  }
  return query
}

function distinctCourses(rows) {
  return [...new Set(rows.map((r) => r.course_code))]
}

class CourseEditor {
  constructor({ client, logger = null, confirmThreshold = DEFAULT_THRESHOLD } = {}) {
    if (!client) throw new Error('CourseEditor requires a db client')
    // A NaN/Infinity/garbage threshold would make every `count > threshold`
    // comparison false and silently disable the blast-radius circuit-breaker
    // (red-team F1). Refuse anything that isn't a finite, positive integer.
    if (!Number.isInteger(confirmThreshold) || confirmThreshold < 1) {
      throw new Error(`confirmThreshold must be a positive integer, got ${confirmThreshold}`)
    }
    this.client = client
    this.logger = logger
    this.confirmThreshold = confirmThreshold
    this.journal = []
  }

  _log(level, msg, extra) {
    if (this.logger && typeof this.logger[level] === 'function') this.logger[level](msg, extra)
  }

  _record(entry) {
    this.journal.push(entry)
  }

  async _resolve(table, filters) {
    const q = applyFilters(this.client.from(table).select('*'), filters)
    const { data, error } = await q
    if (error) throw new CourseEditorError(`select failed on ${table}: ${error.message}`, { error })
    return data || []
  }

  /**
   * Update a single row identified by a within-course unique key.
   * @param {string} table
   * @param {object} scope  - eq filters; MUST include course_code + unique key
   * @param {object} set    - editable fields to write
   * @param {object} [opts] - { dryRun, confirm, crossCourse, allowMissing }
   * @returns {Promise<{applied, dryRun, batchId, plan, rows}>}
   */
  async update(table, scope, set, opts = {}) {
    assertScope(table, scope, opts)
    // Drop undefined values so `{known_text: undefined}` can't report a false
    // "applied" with an empty diff (red-team F7).
    const clean = {}
    for (const [k, v] of Object.entries(set || {})) if (v !== undefined) clean[k] = v
    assertEditableFields(table, clean)
    assertValueTypes(table, clean)
    if (Object.keys(clean).length === 0) {
      throw new CourseEditorError('update called with empty/all-undefined set', { table, scope })
    }
    set = clean

    const matched = await this._resolve(table, scope)

    // Defence in depth: even if a scoping rule had a gap, never let a write span courses.
    const courses = distinctCourses(matched)
    if (courses.length > 1 && !opts.crossCourse) {
      throw new ScopeError(
        `Refusing update spanning ${courses.length} courses (${courses.join(', ')}). ` +
          `This is the corruption signature. Pass crossCourse:true to opt in deliberately.`,
        { table, scope, courses }
      )
    }
    if (matched.length === 0) {
      if (opts.allowMissing) return { applied: false, dryRun: !!opts.dryRun, batchId: null, plan: [], rows: [] }
      throw new NotFoundError(`No row in ${table} matched scope`, { table, scope })
    }
    if (matched.length > 1 && !opts.crossCourse) {
      throw new ScopeError(
        `Scope matched ${matched.length} rows but claimed a unique key. Refusing.`,
        { table, scope, count: matched.length }
      )
    }

    const pk = TABLE_RULES[table].pk
    const plan = matched.map((row) => ({
      table,
      pk: row[pk],
      course_code: row.course_code,
      before: pickChanged(row, set),
      after: { ...pickChanged(row, set), ...set },
      // Disclose the audio-null trigger side-effects so the plan an operator
      // approves matches what actually gets written (red-team F5).
      sideEffects: predictAudioNulls(table, row, set),
    }))

    // Dry-run ALWAYS returns the plan, even above the threshold — previewing a
    // large/cross-course scope is exactly when you most need to see it first.
    if (opts.dryRun) {
      return { applied: false, dryRun: true, batchId: null, plan, rows: [] }
    }

    // Blast-radius circuit-breaker (matters mainly for crossCourse; ≤1 otherwise).
    if (matched.length > this.confirmThreshold && !opts.confirm) {
      throw new BlastRadiusError(
        `Would change ${matched.length} rows (> ${this.confirmThreshold}). Pass confirm:true.`,
        { table, count: matched.length, threshold: this.confirmThreshold }
      )
    }

    // Honour an outer batchId (bulkUpdateByPk) so a multi-row op is revertible
    // as ONE unit; otherwise mint our own (red-team F3).
    const batchId = opts._batchId || crypto.randomUUID()
    const q = applyFilters(this.client.from(table).update(set), scope).select()
    const { data, error } = await q
    if (error) throw new CourseEditorError(`update failed on ${table}: ${error.message}`, { error })

    for (const p of plan) {
      this._record({ batchId, op: 'update', table, pk: p.pk, course_code: p.course_code, before: p.before, after: p.after })
    }
    this._log('info', `[course-editor] update ${table} (${plan.length} row) batch=${batchId}`)
    return { applied: true, dryRun: false, batchId, plan, rows: data || [] }
  }

  /**
   * Delete a single row by within-course unique key.
   */
  async remove(table, scope, opts = {}) {
    assertScope(table, scope, opts)
    const matched = await this._resolve(table, scope)
    const courses = distinctCourses(matched)
    if (courses.length > 1 && !opts.crossCourse) {
      throw new ScopeError(`Refusing delete spanning ${courses.length} courses`, { table, scope, courses })
    }
    if (matched.length === 0) {
      if (opts.allowMissing) return { applied: false, dryRun: !!opts.dryRun, batchId: null, plan: [], rows: [] }
      throw new NotFoundError(`No row in ${table} matched scope`, { table, scope })
    }
    const pk = TABLE_RULES[table].pk
    const plan = matched.map((row) => ({ table, pk: row[pk], course_code: row.course_code, before: row }))
    if (opts.dryRun) return { applied: false, dryRun: true, batchId: null, plan, rows: [] }

    if (matched.length > this.confirmThreshold && !opts.confirm) {
      throw new BlastRadiusError(
        `Would delete ${matched.length} rows (> ${this.confirmThreshold}). Pass confirm:true.`,
        { table, count: matched.length, threshold: this.confirmThreshold }
      )
    }

    const batchId = crypto.randomUUID()
    const q = applyFilters(this.client.from(table).delete(), scope).select()
    const { data, error } = await q
    if (error) throw new CourseEditorError(`delete failed on ${table}: ${error.message}`, { error })

    for (const p of plan) {
      this._record({ batchId, op: 'delete', table, pk: p.pk, course_code: p.course_code, before: p.before })
    }
    this._log('info', `[course-editor] delete ${table} (${plan.length} row) batch=${batchId}`)
    return { applied: true, dryRun: false, batchId, plan, rows: data || [] }
  }

  /**
   * Insert a row. Must carry course_code. Returns the inserted row.
   */
  async insert(table, row, opts = {}) {
    if (!TABLE_RULES[table]) {
      throw new ScopeError(`Table '${table}' is not editable`, { table })
    }
    // INSERT must enforce the SAME column / type discipline as UPDATE — otherwise
    // it's a back door to write forbidden columns (id-collision, poisoned
    // audio pointers, arbitrary columns) the update path carefully blocks
    // (red-team BUG 1/2/4).
    assertInsertable(table, row)
    assertValueTypes(table, row)
    if (!opts.crossCourse && !row.course_code) {
      throw new ScopeError(`Insert into ${table} must include course_code`, { table, row })
    }

    const pkCol = TABLE_RULES[table].pk
    // Reject a client-set pk that already exists (no silent duplicate rows).
    if (row[pkCol] !== undefined && row[pkCol] !== null) {
      const existing = await this._resolve(table, { [pkCol]: row[pkCol] })
      if (existing.length) {
        throw new ValidationError(`Insert into ${table} would collide with existing ${pkCol}=${row[pkCol]}`, { table, pk: row[pkCol] })
      }
    }
    if (opts.dryRun) return { applied: false, dryRun: true, batchId: null, plan: [{ table, before: null, after: row }], rows: [] }

    const batchId = crypto.randomUUID()
    const { data, error } = await this.client.from(table).insert(row).select()
    if (error) throw new CourseEditorError(`insert failed on ${table}: ${error.message}`, { error })
    const inserted = (data || [])[0] || row
    this._record({ batchId, op: 'insert', table, pk: inserted[pkCol], course_code: inserted.course_code, after: inserted })
    return { applied: true, dryRun: false, batchId, plan: [{ table, after: inserted }], rows: data || [] }
  }

  /**
   * Bulk update many rows of ONE course, each by its own pk. The path batch
   * operations (strip-parens, qmark-fix, …) use. Blast-radius applies to the
   * batch size; every individual write is course_code + pk scoped, so it can
   * never leak across courses.
   *
   * @param {string} table
   * @param {string} courseCode
   * @param {Array<{pk, set}>} updates
   * @param {object} [opts] - { dryRun, confirm }
   */
  async bulkUpdateByPk(table, courseCode, updates, opts = {}) {
    if (!TABLE_RULES[table]) throw new ScopeError(`Table '${table}' is not editable`, { table })
    if (!courseCode) throw new ScopeError('bulkUpdateByPk requires a courseCode', { table })
    for (const u of updates) assertEditableFields(table, u.set)

    if (updates.length > this.confirmThreshold && !opts.confirm) {
      throw new BlastRadiusError(
        `Bulk update of ${updates.length} rows (> ${this.confirmThreshold}). Pass confirm:true.`,
        { table, count: updates.length, threshold: this.confirmThreshold }
      )
    }

    const pkCol = TABLE_RULES[table].pk
    const plan = []
    const results = []
    const batchId = crypto.randomUUID()

    for (const u of updates) {
      const scope = { course_code: courseCode, [pkCol]: u.pk }
      // Reuse the single-row primitive so every write inherits the full guard.
      const r = await this.update(table, scope, u.set, {
        dryRun: opts.dryRun,
        // already counted the batch; don't re-trip per-row threshold
        confirm: true,
        _batchId: batchId,
      })
      plan.push(...r.plan)
      if (r.rows) results.push(...r.rows)
    }
    return { applied: !opts.dryRun, dryRun: !!opts.dryRun, batchId, plan, rows: results }
  }

  /**
   * Re-point audio id columns (the sanctioned audio-relink path). Separate from
   * `update` because audio-id columns are deliberately NOT content-editable —
   * but operations sometimes need to restore a pointer the text-change trigger
   * nulled (e.g. a cosmetic edit that doesn't change TTS). Still course+pk scoped.
   */
  async relinkAudio(table, scope, audioSet, opts = {}) {
    assertScope(table, scope, opts)
    const allowed = (TABLE_RULES[table].audioFields) || []
    const bad = Object.keys(audioSet || {}).filter((k) => !allowed.includes(k))
    if (bad.length) {
      throw new ScopeError(`relinkAudio only writes audio id columns; got: ${bad.join(', ')}`, { table, bad, allowed })
    }
    assertValueTypes(table, audioSet)
    const matched = await this._resolve(table, scope)
    if (distinctCourses(matched).length > 1 && !opts.crossCourse) {
      throw new ScopeError('relinkAudio would span multiple courses', { table, scope })
    }
    if (matched.length === 0) {
      if (opts.allowMissing) return { applied: false, rows: [] }
      throw new NotFoundError(`No row in ${table} matched scope`, { table, scope })
    }
    // Parity with update(): a "unique" scope that matches many rows, or a batch
    // over the threshold, must be refused/confirmed — not silently mass-applied
    // (red-team EXPLOIT-1).
    if (matched.length > 1 && !opts.crossCourse) {
      throw new ScopeError(`relinkAudio scope matched ${matched.length} rows but claimed a unique key. Refusing.`, { table, scope, count: matched.length })
    }
    if (opts.dryRun) return { applied: false, dryRun: true, rows: matched }
    if (matched.length > this.confirmThreshold && !opts.confirm) {
      throw new BlastRadiusError(`relinkAudio would change ${matched.length} rows (> ${this.confirmThreshold}). Pass confirm:true.`, { table, count: matched.length, threshold: this.confirmThreshold })
    }
    const batchId = opts._batchId || crypto.randomUUID()
    const q = applyFilters(this.client.from(table).update(audioSet), scope).select()
    const { data, error } = await q
    if (error) throw new CourseEditorError(`relinkAudio failed on ${table}: ${error.message}`, { error })
    const pk = TABLE_RULES[table].pk
    for (const r of matched) this._record({ batchId, op: 'relinkAudio', table, pk: r[pk], course_code: r.course_code, after: audioSet })
    return { applied: true, batchId, rows: data || [] }
  }

  /** Read helper for operations / callers. */
  async select(table, filters) {
    return this._resolve(table, filters)
  }
}

/**
 * Predict which audio-id columns the DB text-change trigger will null, so the
 * dry-run plan discloses the full effect of a text edit (not just the text col).
 */
function predictAudioNulls(table, beforeRow, set) {
  const nulledAudio = []
  const knownChanged = set.known_text !== undefined && set.known_text !== beforeRow.known_text
  const targetChanged = set.target_text !== undefined && set.target_text !== beforeRow.target_text
  if (table === 'course_legos') {
    if (knownChanged) nulledAudio.push('known_audio_id', 'presentation_audio_id')
    if (targetChanged) nulledAudio.push('target1_audio_id', 'target2_audio_id')
  } else if (table === 'course_practice_phrases') {
    if (knownChanged) nulledAudio.push('known_audio_id')
    if (targetChanged) nulledAudio.push('target1_audio_id', 'target2_audio_id')
  }
  return nulledAudio.length ? { nulledAudio } : {}
}

/** Return only the keys of `row` that `set` touches (for before/after diffs). */
function pickChanged(row, set) {
  const out = {}
  for (const k of Object.keys(set)) out[k] = row[k]
  return out
}

function createEditor(opts) {
  return new CourseEditor(opts)
}

module.exports = { CourseEditor, createEditor, DEFAULT_THRESHOLD }
