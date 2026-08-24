/**
 * A test double for the supabase-js query builder — used by the api/*.test.js
 * suites so an endpoint's WRITES can be asserted, not just its response.
 *
 * It is table-backed rather than call-backed on purpose: the questions worth
 * pinning about the config endpoints are "did algorithm_config change?" and
 * "how many version rows exist now?", and a mock that only records calls
 * answers neither. Tables in, tables out; assertions read the tables.
 *
 * Supports exactly what the endpoints under test use: select/eq/not/order/limit/
 * single/maybeSingle, insert(row).select().single(),
 * update(...).eq(...).select().single(), and
 * upsert(row, { onConflict, ignoreDuplicates }). Anything else is deliberately
 * absent — a silently-ignored method is how a mock starts lying.
 *
 * `defaults` fills in the columns Postgres would fill in itself on insert — a
 * bigserial id, a now() timestamp — as a per-table function of the rows already
 * there. Without it an insert test asserts against a row the real database
 * would never have produced.
 */

const NO_ROWS = { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }

export function createFakeSupabase(tables = {}, { defaults = {} } = {}) {
  const db = {
    tables: Object.fromEntries(Object.entries(tables).map(([t, rows]) => [t, rows.map(r => ({ ...r }))])),
    defaults,
    // Force an error from a table's next operation: { [table]: { message } }
    errors: {},
    calls: [],
    from(table) {
      if (!db.tables[table]) db.tables[table] = []
      return new Query(db, table)
    },
  }
  return db
}

class Query {
  constructor(db, table) {
    this.db = db
    this.table = table
    this.op = 'select'
    this.filters = []
    this.negated = []
  }

  select() { return this }
  eq(column, value) { this.filters.push([column, value]); return this }
  /** Only the form the endpoints use: .not(col, 'is', null) — "col is not null". */
  not(column, op, value) {
    if (op !== 'is' || value !== null) {
      throw new Error(`fake-supabase: not(${column}, ${op}, ${value}) is not implemented — add it rather than working round it`)
    }
    this.negated.push(row => row[column] !== null && row[column] !== undefined)
    return this
  }
  order(column, opts = {}) { this._order = { column, ascending: opts.ascending !== false }; return this }
  limit(n) { this._limit = n; return this }
  single() { this._row = 'single'; return this }
  maybeSingle() { this._row = 'maybe'; return this }
  insert(values) { this.op = 'insert'; this._values = values; return this }
  update(values) { this.op = 'update'; this._values = values; return this }
  upsert(values, opts = {}) { this.op = 'upsert'; this._values = values; this._opts = opts; return this }

  then(resolve, reject) {
    try { resolve(this._run()) } catch (e) { reject(e) }
  }

  _matches(row) {
    return this.filters.every(([c, v]) => row[c] === v) && this.negated.every(f => f(row))
  }

  _run() {
    const { db, table } = this
    db.calls.push({ table, op: this.op, filters: this.filters, values: this._values })

    const forced = db.errors[table]
    if (forced) return { data: null, error: forced }

    const rows = db.tables[table]

    if (this.op === 'insert') {
      const inserted = { ...(db.defaults[table] ? db.defaults[table](rows) : {}), ...this._values }
      rows.push(inserted)
      return this._shape([inserted])
    }

    if (this.op === 'update') {
      const hit = rows.filter(r => this._matches(r))
      hit.forEach(r => Object.assign(r, this._values))
      return this._shape(hit)
    }

    if (this.op === 'upsert') {
      const conflict = (this._opts.onConflict || '').split(',').map(s => s.trim()).filter(Boolean)
      const existing = conflict.length
        ? rows.find(r => conflict.every(c => r[c] === this._values[c]))
        : null
      if (existing) {
        if (!this._opts.ignoreDuplicates) Object.assign(existing, this._values)
        return this._shape([existing])
      }
      const inserted = { ...this._values }
      rows.push(inserted)
      return this._shape([inserted])
    }

    let out = rows.filter(r => this._matches(r))
    if (this._order) {
      const { column, ascending } = this._order
      out = [...out].sort((a, b) => {
        if (a[column] === b[column]) return 0
        return (a[column] > b[column] ? 1 : -1) * (ascending ? 1 : -1)
      })
    }
    if (this._limit != null) out = out.slice(0, this._limit)
    return this._shape(out)
  }

  _shape(rows) {
    if (this._row === 'single') {
      if (rows.length !== 1) return { data: null, error: NO_ROWS }
      return { data: { ...rows[0] }, error: null }
    }
    if (this._row === 'maybe') {
      return { data: rows[0] ? { ...rows[0] } : null, error: null }
    }
    return { data: rows.map(r => ({ ...r })), error: null }
  }
}

/** Minimal Vercel-style res that records what the handler said. */
export function createFakeRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    headers: {},
    setHeader(k, v) { res.headers[k] = v },
    status(code) { res.statusCode = code; return res },
    json(payload) { res.body = payload; return res },
    end() { return res },
  }
  return res
}
