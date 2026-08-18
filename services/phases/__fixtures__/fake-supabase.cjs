/**
 * In-memory stand-in for the PostgREST client, faithful to the three
 * behaviours the audio-regeneration question turns on:
 *
 *  1. `.is(col, null)` filtering — the basis of getAudioNeeds()'s "unlinked" set
 *  2. the UNIQUE index (course_code, text_normalized, language, role, voice_id)
 *  3. `upsert(..., { ignoreDuplicates: true })` — a conflicting row is a NO-OP
 *
 * Deliberately not a general PostgREST emulator. It supports exactly the
 * chain shapes phase8-audio-v13.cjs uses on the /generate classification path,
 * and throws on anything it does not model rather than quietly returning [].
 */

const UNIQUE_KEYS = {
  course_audio: ['course_code', 'text_normalized', 'language', 'role', 'voice_id'],
}

function normKey(row, cols) {
  return cols.map(c => String(row[c] ?? '')).join('\u0000')
}

class Query {
  constructor(db, table) {
    this.db = db
    this.table = table
    this.filters = []
    this.countMode = null
    this.headOnly = false
    this._limit = null
    this._range = null
    this._op = 'select'
    this._deleteIds = null
  }

  select(_cols, opts = {}) {
    if (opts.count) this.countMode = opts.count
    if (opts.head) this.headOnly = true
    return this
  }

  eq(col, val) { this.filters.push(r => r[col] === val); return this }
  is(col, val) {
    if (val !== null) throw new Error('fake-supabase: .is() only models null')
    this.filters.push(r => r[col] === null || r[col] === undefined)
    return this
  }
  lte(col, val) { this.filters.push(r => r[col] <= val); return this }
  gt(col, val) { this.filters.push(r => r[col] > val); return this }
  in(col, vals) { this.filters.push(r => vals.includes(r[col])); return this }
  like(col, pat) {
    const rx = new RegExp('^' + pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$')
    this.filters.push(r => rx.test(String(r[col] ?? '')))
    return this
  }
  not(col, op, pat) {
    if (op !== 'like') throw new Error(`fake-supabase: .not(${op}) not modelled`)
    const rx = new RegExp('^' + pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$')
    this.filters.push(r => !rx.test(String(r[col] ?? '')))
    return this
  }
  order() { return this }
  limit(n) { this._limit = n; return this }
  range(from, to) { this._range = [from, to]; return this }
  single() { this._single = true; return this }

  upsert(rows, opts = {}) {
    this._op = 'upsert'
    this._rows = Array.isArray(rows) ? rows : [rows]
    this._upsertOpts = opts
    return this
  }

  delete() { this._op = 'delete'; return this }

  _rows_() {
    let rows = this.db.tables[this.table] || []
    for (const f of this.filters) rows = rows.filter(f)
    return rows
  }

  then(resolve, reject) {
    try {
      resolve(this._run())
    } catch (e) {
      if (reject) reject(e); else throw e
    }
    return Promise.resolve()
  }

  _run() {
    if (this._op === 'upsert') return this._runUpsert()
    if (this._op === 'delete') {
      const doomed = this._rows_()
      this.db.stats.deleted += doomed.length
      const set = new Set(doomed)
      this.db.tables[this.table] = (this.db.tables[this.table] || []).filter(r => !set.has(r))
      return { data: null, error: null }
    }
    let rows = this._rows_()
    const count = rows.length
    if (this._range) rows = rows.slice(this._range[0], this._range[1] + 1)
    if (this._limit != null) rows = rows.slice(0, this._limit)
    if (this.headOnly) return { data: null, error: null, count }
    if (this._single) return { data: rows[0] || null, error: null, count }
    return { data: rows.map(r => ({ ...r })), error: null, count }
  }

  _runUpsert() {
    const cols = UNIQUE_KEYS[this.table]
    const existing = this.db.tables[this.table] || (this.db.tables[this.table] = [])
    const ignoreDup = this._upsertOpts.ignoreDuplicates === true
    let inserted = 0, ignored = 0
    for (const row of this._rows) {
      if (cols) {
        const k = normKey(row, cols)
        const hit = existing.find(r => normKey(r, cols) === k)
        if (hit) {
          if (ignoreDup) { ignored++; continue }
          // ON CONFLICT DO UPDATE
          Object.assign(hit, row)
          continue
        }
      }
      existing.push({ id: `row-${++this.db.seq}`, ...row })
      inserted++
    }
    this.db.stats.inserted += inserted
    this.db.stats.dupIgnored += ignored
    return { data: null, error: null }
  }
}

function makeFakeSupabase(tables = {}) {
  const db = {
    tables,
    seq: 0,
    stats: { inserted: 0, dupIgnored: 0, deleted: 0 },
  }
  const client = {
    from(table) { return new Query(db, table) },
    rpc() { return Promise.resolve({ data: null, error: null }) },
    db,
  }
  return client
}

module.exports = { makeFakeSupabase }
