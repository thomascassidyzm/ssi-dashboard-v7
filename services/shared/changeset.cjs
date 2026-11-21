'use strict'
/**
 * CHANGESETS — compute on the copy, touch live only with the difference (cs #835, 2026-11-18).
 *
 * Tom: "There should be no need to write to the live database in a heavy way. We want a single db still
 * but we need a clever way to update it." Design: https://watson-1.tail4968cb.ts.net/d/973c9f34
 *
 * A content job reads and plans against the NIGHTLY COPY (a worker's pg reads already land there), then
 * describes its result as a changeset: one JSONL file, a header line, then one edit-batch op per row
 * that ACTUALLY differs, carrying only the columns that differ, each with `expect` = what the copy held.
 * tools/changeset/apply-changeset.cjs pushes it to live through Popty's edit door, small, governed,
 * at night, idempotent.
 *
 *   const cs = require('<popty>/services/shared/changeset.cjs')
 *   const ops = cs.diffUpdates({ op: 'phrase.update', key: 'phrase_id', idColumn: 'id',
 *                                current: rowsFromTheCopy, desired: rowsYouComputed, columns: ['known_text', 'target_text'] })
 *   cs.write('ops/<job>/<course>.changeset.jsonl', { course: 'fra_for_eng', job: '#123·AI', why: '…' }, ops)
 *
 * Op vocabulary = Popty's edit door (GET /api/production/:course/edit-ops): seed.update (seed_number),
 * lego.update (lego_id), phrase.update (phrase_id), audio.update (audio_id), gender.update (id), plus
 * whole-row inserts/deletes written by hand with cs.op(...).
 */
const fs = require('fs')
const path = require('path')

const FORMAT = 'ssi-changeset/1'

// Value equality the way the edit door compares (JSON shape, so arrays/objects compare by content).
const same = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b)

/**
 * Update ops for the rows whose listed columns differ. A desired row with no current row is reported
 * in `missing` (an insert is a deliberate op, never inferred). Rows that are equal produce nothing.
 * key: the op's key field (phrase_id, lego_id, seed_number, audio_id, id); idColumn: the column in the
 * rows that holds it (defaults to key).
 */
function diffUpdates({ op, key, idColumn = key, current, desired, columns }) {
  if (!op || !key || !Array.isArray(columns) || !columns.length) throw new Error('diffUpdates needs op, key and columns')
  const byId = new Map((current || []).map((r) => [String(r[idColumn]), r]))
  const ops = [], missing = []
  for (const want of desired || []) {
    const id = want[idColumn]
    const have = byId.get(String(id))
    if (!have) { missing.push(id); continue }
    const set = {}, expect = {}
    for (const c of columns) {
      if (!(c in want)) continue
      if (!same(have[c], want[c])) { set[c] = want[c]; expect[c] = have[c] === undefined ? null : have[c] }
    }
    if (Object.keys(set).length) ops.push({ op, [key]: id, set, expect })
  }
  if (missing.length) Object.defineProperty(ops, 'missing', { value: missing, enumerable: false })
  return ops
}

/** One hand-written op, normalised (insert/delete/link ops that diffUpdates does not infer). */
function op(name, fields) { return { op: name, ...fields } }

/** Write a changeset file. header: { course (required), job, why, source? }. Returns the path. */
function write(file, header, ops) {
  if (!header || !header.course) throw new Error('changeset header needs course')
  const id = header.id || `${header.course}-${new Date().toISOString().replace(/[:.]/g, '-')}`
  const head = { format: FORMAT, id, course: header.course, job: header.job || null, why: header.why || null,
    computed_from: header.source || 'nightly copy (~/ssi-restore)', created_at: new Date().toISOString(), ops: ops.length,
    ...(header.tom_go ? { tom_go: header.tom_go } : {}), ...(header.kai_go ? { kai_go: header.kai_go } : {}) }
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true })
  fs.writeFileSync(file, [JSON.stringify(head), ...ops.map((o) => JSON.stringify(o))].join('\n') + '\n')
  return file
}

/** Read a changeset → { header, ops }. Throws on a file that is not one. */
function read(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim())
  const header = JSON.parse(lines[0] || '{}')
  if (header.format !== FORMAT || !header.course) throw new Error(`${file} is not a ${FORMAT} changeset (first line must be its header)`)
  const ops = lines.slice(1).map((l, i) => { try { return JSON.parse(l) } catch (e) { throw new Error(`${file} line ${i + 2}: ${e.message}`) } })
  return { header, ops }
}

module.exports = { FORMAT, diffUpdates, op, write, read, same }
