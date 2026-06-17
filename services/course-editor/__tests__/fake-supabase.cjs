/**
 * In-memory fake of @supabase/supabase-js, faithful to the subset the
 * course-editor uses. This is BOTH the test double and the sandbox the
 * adversarial "user" agents play in — they never touch a real DB.
 *
 * Emulated:
 *   .from(t).select(cols).eq/neq/in/is(...).order().limit().single()/maybeSingle()
 *   .from(t).update(set).eq(...).select()
 *   .from(t).delete().eq(...).select()
 *   .from(t).insert(row|rows).select()
 *   .from(t).upsert(row, {onConflict}).select()
 *   awaiting the builder resolves to { data, error, count }
 *
 * Also replicates two DB-side behaviours that matter for correctness:
 *   - content_audit_log capture (old_row snapshot on UPDATE/DELETE)
 *   - audio-nulling triggers on text change (course_legos / course_practice_phrases)
 */

const crypto = require('crypto')

// Tables whose UPDATE/DELETE are captured into content_audit_log (mirrors the
// ssi-learning-app trigger migrations).
const AUDITED = new Set([
  'course_legos',
  'course_practice_phrases',
  'course_seeds',
  'course_audio',
  'courses',
])

function clone(o) {
  return o === null || o === undefined ? o : JSON.parse(JSON.stringify(o))
}

function matchesFilters(row, filters) {
  return filters.every(({ type, col, val }) => {
    if (type === 'eq') return row[col] === val
    if (type === 'neq') return row[col] !== val
    if (type === 'in') return val.includes(row[col])
    if (type === 'is') return val === null ? row[col] === null || row[col] === undefined : row[col] === val
    return true
  })
}

// Audio-nulling triggers: changing text nulls the corresponding audio pointers.
function applyAudioNullTrigger(table, oldRow, newRow) {
  if (table === 'course_practice_phrases' || table === 'course_legos') {
    if (newRow.known_text !== undefined && newRow.known_text !== oldRow.known_text) {
      newRow.known_audio_id = null
      if (table === 'course_legos') newRow.presentation_audio_id = null
    }
    if (newRow.target_text !== undefined && newRow.target_text !== oldRow.target_text) {
      newRow.target1_audio_id = null
      newRow.target2_audio_id = null
    }
  }
  return newRow
}

class FakeQuery {
  constructor(store, table) {
    this.store = store
    this.table = table
    this._op = 'select'
    this._cols = '*'
    this._payload = null
    this._filters = []
    this._order = null
    this._limit = null
    this._single = null // 'single' | 'maybeSingle' | null
    this._onConflict = null
  }

  select(cols = '*') {
    if (this._op === 'select') this._cols = cols
    // for update/delete/insert, .select() just flags that we want rows back
    this._wantReturn = true
    return this
  }
  insert(payload) { this._op = 'insert'; this._payload = payload; return this }
  update(payload) { this._op = 'update'; this._payload = payload; return this }
  delete() { this._op = 'delete'; return this }
  upsert(payload, opts = {}) { this._op = 'upsert'; this._payload = payload; this._onConflict = opts.onConflict || null; return this }

  eq(col, val) { this._filters.push({ type: 'eq', col, val }); return this }
  neq(col, val) { this._filters.push({ type: 'neq', col, val }); return this }
  in(col, val) { this._filters.push({ type: 'in', col, val }); return this }
  is(col, val) { this._filters.push({ type: 'is', col, val }); return this }
  order(col, opts = {}) { this._order = { col, ascending: opts.ascending !== false }; return this }
  limit(n) { this._limit = n; return this }
  single() { this._single = 'single'; return this }
  maybeSingle() { this._single = 'maybeSingle'; return this }

  _rows() {
    return this.store.tables[this.table] || (this.store.tables[this.table] = [])
  }

  _audit(changeType, oldRow) {
    if (!AUDITED.has(this.table)) return
    this.store.audit.push({
      id: this.store._auditSeq++,
      table_name: this.table,
      primary_key: String(oldRow[this.store.pkOf(this.table)]),
      old_row: clone(oldRow),
      change_type: changeType,
      changed_at: new Date(this.store._clock++).toISOString(),
    })
  }

  _exec() {
    const rows = this._rows()
    try {
      if (this._op === 'select') {
        let out = rows.filter((r) => matchesFilters(r, this._filters)).map(clone)
        if (this._order) {
          const { col, ascending } = this._order
          out.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (ascending ? 1 : -1))
        }
        if (this._limit != null) out = out.slice(0, this._limit)
        return this._finish(out)
      }

      if (this._op === 'insert' || this._op === 'upsert') {
        const incoming = Array.isArray(this._payload) ? this._payload : [this._payload]
        const written = []
        for (const raw of incoming) {
          const r = clone(raw)
          const pk = this.store.pkOf(this.table)
          if (this._op === 'upsert' && this._onConflict) {
            const keys = this._onConflict.split(',').map((s) => s.trim())
            const existing = rows.find((x) => keys.every((k) => x[k] === r[k]))
            if (existing) {
              this._audit('UPDATE', existing)
              Object.assign(existing, r)
              written.push(clone(existing))
              continue
            }
          }
          if (r[pk] === undefined || r[pk] === null) r[pk] = crypto.randomUUID()
          rows.push(r)
          written.push(clone(r))
        }
        return this._finish(written)
      }

      if (this._op === 'update') {
        const targets = rows.filter((r) => matchesFilters(r, this._filters))
        const written = []
        for (const row of targets) {
          this._audit('UPDATE', row)
          const merged = applyAudioNullTrigger(this.table, row, { ...clone(row), ...clone(this._payload) })
          Object.assign(row, merged)
          written.push(clone(row))
        }
        return this._finish(written)
      }

      if (this._op === 'delete') {
        const keep = []
        const removed = []
        for (const r of rows) {
          if (matchesFilters(r, this._filters)) { this._audit('DELETE', r); removed.push(clone(r)) }
          else keep.push(r)
        }
        this.store.tables[this.table] = keep
        return this._finish(removed)
      }
    } catch (err) {
      return { data: null, error: { message: err.message }, count: null }
    }
  }

  _finish(arr) {
    if (this._single === 'single') {
      if (arr.length !== 1) return { data: null, error: { message: `expected 1 row, got ${arr.length}`, code: 'PGRST116' }, count: arr.length }
      return { data: arr[0], error: null, count: 1 }
    }
    if (this._single === 'maybeSingle') {
      if (arr.length > 1) return { data: null, error: { message: `expected ≤1 row, got ${arr.length}` }, count: arr.length }
      return { data: arr[0] || null, error: null, count: arr.length }
    }
    return { data: arr, error: null, count: arr.length }
  }

  then(resolve, reject) {
    try {
      return Promise.resolve(this._exec()).then(resolve, reject)
    } catch (err) {
      return Promise.resolve({ data: null, error: { message: err.message } }).then(resolve, reject)
    }
  }
}

class FakeSupabase {
  constructor({ tables = {}, pkMap = {} } = {}) {
    this.tables = clone(tables)
    this.audit = []
    this._auditSeq = 1
    this._clock = 1
    this.pkMap = {
      course_legos: 'id',
      course_practice_phrases: 'id',
      course_seeds: 'id',
      course_audio: 'id',
      courses: 'course_code',
      content_audit_log: 'id',
      ...pkMap,
    }
  }
  pkOf(table) { return this.pkMap[table] || 'id' }
  from(table) {
    if (table === 'content_audit_log') return new AuditQuery(this)
    return new FakeQuery(this, table)
  }
  // test helper
  rows(table) { return clone(this.tables[table] || []) }
}

// Minimal query surface over the audit log (read + the restore upsert path).
class AuditQuery extends FakeQuery {
  constructor(store) { super(store, 'content_audit_log'); this._auditMode = true }
  _rows() { return this.store.audit }
}

function createFakeSupabase(opts) {
  return new FakeSupabase(opts)
}

module.exports = { createFakeSupabase, FakeSupabase, AUDITED }
