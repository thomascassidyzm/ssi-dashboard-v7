/**
 * Scoping rules — the incident-critical layer.
 *
 * The 2026-06-17 cross-course corruption happened because an agent ran
 *   UPDATE course_legos … WHERE lego_id = 'S0524L01'
 * and `lego_id` is NOT globally unique — it matched one row in 79 courses.
 *
 * This module makes that class of write *impossible to express*:
 *   - every write must include `course_code` (unless explicit cross-course mode),
 *   - and must include a key that is unique WITHIN that course.
 *
 * `assertScope()` throws BEFORE the editor ever touches the DB. Defence in
 * depth: editor.cjs also re-checks the actually-matched rows after the SELECT,
 * so even a rule gap here cannot silently span courses.
 */

const { ScopeError, TableNotAllowedError, ValidationError } = require('./errors.cjs')

/**
 * Per-table rules.
 *  - uniqueKeys: list of column-sets, each of which is unique WITHIN a course.
 *      A scope satisfies the rule if it provides ALL columns of at least one set.
 *  - pk: the true primary key (what content_audit_log keys on for restore).
 *  - editableFields: the only columns the editor will write via content edits.
 *      (audio-id columns are written by triggers / audio ops, not content edits.)
 */
const TABLE_RULES = {
  course_legos: {
    pk: 'id',
    uniqueKeys: [['id'], ['lego_id'], ['seed_number', 'lego_index']],
    editableFields: ['known_text', 'target_text', 'type', 'is_new', 'components', 'status'],
    audioFields: ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'],
    insertableFields: ['id', 'course_code', 'seed_number', 'lego_index', 'lego_id', 'known_text', 'target_text', 'type', 'is_new', 'components', 'status'],
    textFields: { known: ['known_text'], target: ['target_text'] },
  },
  course_practice_phrases: {
    pk: 'id',
    uniqueKeys: [['id']],
    editableFields: ['known_text', 'target_text', 'introduce', 'phrase_role', 'position'],
    audioFields: ['known_audio_id', 'target1_audio_id', 'target2_audio_id'],
    insertableFields: ['id', 'course_code', 'seed_number', 'lego_index', 'known_text', 'target_text', 'phrase_role', 'position', 'introduce', 'word_count', 'lego_count'],
    textFields: { known: ['known_text'], target: ['target_text'] },
  },
  course_seeds: {
    pk: 'id',
    uniqueKeys: [['id'], ['seed_number']],
    editableFields: ['known_text', 'target_text', 'status'],
    insertableFields: ['id', 'course_code', 'seed_number', 'known_text', 'target_text', 'status'],
    textFields: { known: ['known_text'], target: ['target_text'] },
  },
  course_audio: {
    pk: 'id',
    uniqueKeys: [['id']],
    editableFields: ['text', 's3_key'],
    audioFields: [],
    // Audio rows are created by phase8, never minted through the content editor.
    insertableFields: null,
    textFields: { known: ['text'], target: ['text'] },
  },
}

// Text columns must be plain strings within a sane length bound. Garbage values
// (objects/arrays/numbers, control-char payloads, megabyte strings) flow straight
// into TTS and manifests, so we reject them on every write path.
const MAX_TEXT_LEN = 2000

function textColumnsOf(table) {
  const tf = TABLE_RULES[table].textFields || {}
  return [...new Set(Object.values(tf).flat())]
}

function isPresent(v) {
  return v !== undefined && v !== null && v !== ''
}

/** Does the scope provide every column of at least one uniqueKey set? */
function hasUniqueKey(table, scope) {
  const rule = TABLE_RULES[table]
  return rule.uniqueKeys.some((keySet) => keySet.every((col) => isPresent(scope[col])))
}

/**
 * Assert a single-row scope is safe. Throws ScopeError / TableNotAllowedError.
 *
 * @param {string} table
 * @param {object} scope  - eq-filters for the write, e.g. {course_code, id}
 * @param {object} [opts]
 * @param {boolean} [opts.crossCourse=false] - allow omitting course_code (cross-course ops)
 */
function assertScope(table, scope, opts = {}) {
  const rule = TABLE_RULES[table]
  if (!rule) {
    throw new TableNotAllowedError(`Table '${table}' is not editable through the course-editor`, {
      table,
      allowed: Object.keys(TABLE_RULES),
    })
  }
  if (!scope || typeof scope !== 'object') {
    throw new ScopeError('Scope must be an object of eq-filters', { table, scope })
  }

  const crossCourse = !!opts.crossCourse

  if (!crossCourse && !isPresent(scope.course_code)) {
    throw new ScopeError(
      `Refusing unscoped write to ${table}: every write must include course_code ` +
        `(this is the exact gap that caused the 2026-06-17 cross-course corruption). ` +
        `Pass crossCourse:true explicitly for deliberate multi-course propagation.`,
      { table, scope }
    )
  }

  if (!hasUniqueKey(table, scope)) {
    const sets = rule.uniqueKeys.map((s) => s.join('+')).join(' OR ')
    throw new ScopeError(
      `Refusing write to ${table}: scope lacks a within-course unique key (need one of: ${sets}). ` +
        `Filtering by a non-unique column alone (e.g. lego_id without course_code) is how the ` +
        `corruption spread to 79 courses.`,
      { table, scope, requiredOneOf: rule.uniqueKeys }
    )
  }
}

/** Validate that a `set` payload only touches editable fields. Throws ScopeError. */
function assertEditableFields(table, set) {
  const rule = TABLE_RULES[table]
  if (!rule) throw new TableNotAllowedError(`Table '${table}' is not editable`, { table })
  const bad = Object.keys(set || {}).filter((k) => !rule.editableFields.includes(k))
  if (bad.length) {
    throw new ScopeError(
      `Refusing to write non-editable field(s) on ${table}: ${bad.join(', ')}`,
      { table, badFields: bad, editable: rule.editableFields }
    )
  }
}

/** Validate INSERT payload columns against the per-table insert allow-list. */
function assertInsertable(table, row) {
  const rule = TABLE_RULES[table]
  if (!rule) throw new TableNotAllowedError(`Table '${table}' is not editable`, { table })
  if (!rule.insertableFields) {
    throw new ScopeError(
      `Insert into ${table} is not supported by the content editor ` +
        `(audio rows are created by phase8).`,
      { table }
    )
  }
  const bad = Object.keys(row || {}).filter((k) => !rule.insertableFields.includes(k))
  if (bad.length) {
    throw new ScopeError(
      `Refusing to insert non-insertable field(s) on ${table}: ${bad.join(', ')}`,
      { table, badFields: bad, insertable: rule.insertableFields }
    )
  }
}

/**
 * Value-type / size validation for a write payload. Text columns must be plain
 * strings ≤ MAX_TEXT_LEN; audio-id columns must be a string or null. Throws
 * ValidationError. Runs on every write path (update / insert / relinkAudio).
 */
function assertValueTypes(table, payload) {
  const rule = TABLE_RULES[table]
  if (!rule) return
  const textCols = textColumnsOf(table)
  const audioCols = rule.audioFields || []
  // Control chars (excluding tab/newline) + Unicode bidi overrides — these
  // corrupt TTS / manifests / RTL rendering and must never reach a text column.
  const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/
  for (const [k, v] of Object.entries(payload || {})) {
    if (v === undefined) continue
    if (textCols.includes(k)) {
      if (typeof v !== 'string') {
        throw new ValidationError(`${table}.${k} must be a string, got ${typeof v}`, { table, field: k, type: typeof v })
      }
      if (v.length > MAX_TEXT_LEN) {
        throw new ValidationError(`${table}.${k} exceeds ${MAX_TEXT_LEN} chars (${v.length})`, { table, field: k, length: v.length })
      }
      if (CONTROL.test(v)) {
        throw new ValidationError(`${table}.${k} contains control / bidi-override characters`, { table, field: k })
      }
    }
    if (audioCols.includes(k)) {
      if (v !== null && typeof v !== 'string') {
        throw new ValidationError(`${table}.${k} must be a uuid string or null, got ${typeof v}`, { table, field: k })
      }
    }
  }
}

module.exports = {
  TABLE_RULES,
  MAX_TEXT_LEN,
  assertScope,
  assertEditableFields,
  assertInsertable,
  assertValueTypes,
  textColumnsOf,
  hasUniqueKey,
  isPresent,
}
