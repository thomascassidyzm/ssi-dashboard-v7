// Undo-ledger reading, shared by apply-staged.cjs and undo.cjs (no DB, unit-tested).
// A row_id is "done" while its LAST ledger line is a change (replace/delete); an 'undone' line
// (written by undo.cjs --apply) reopens it so a later apply-staged run may apply it again.
'use strict'
const fs = require('fs')

function readLedger(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : []
}
function doneRowIds(lines) {
  const last = new Map()
  for (const l of lines) last.set(l.row_id, l.action)
  return new Set([...last].filter(([, a]) => a !== 'undone').map(([id]) => id))
}
// the changes undo.cjs should put back, newest first (so the oldest `before` is restored last):
// for each row, the change lines after its last 'undone' line, or nothing if it ends undone
function pendingUndo(lines, only) {
  const lastUndone = new Map()
  lines.forEach((l, i) => { if (l.action === 'undone') lastUndone.set(l.row_id, i) })
  return lines.filter((l, i) => l.action !== 'undone' && i > (lastUndone.has(l.row_id) ? lastUndone.get(l.row_id) : -1) && (!only || l.row_id === only)).reverse()
}
// Undo, per row (#463): restore a row's pending changes newest-first, stop that row on the first
// failure, and write ONE 'undone' line for it (carrying the reverted entries' `at`) only after every
// restore for the row succeeded. A row-wide 'undone' after a partial restore would hide the older
// change that never came back (apply-staged would then treat the row as open).
// restore(change) -> error message or falsy; record(line) appends to the ledger; both injected so no DB.
async function undoRows(lines, only, restore, record, say = () => {}) {
  const byRow = new Map()
  for (const l of pendingUndo(lines, only)) { if (!byRow.has(l.row_id)) byRow.set(l.row_id, []); byRow.get(l.row_id).push(l) }
  for (const [row_id, changes] of byRow) {
    let failed = false
    for (const c of changes) {
      const err = await restore(c)
      if (err) { say(`${row_id}: ERROR ${err} (older changes for this row left pending)`); failed = true; break }
      say(`${row_id}: restored ${c.action}`)
    }
    if (!failed) record({ row_id, action: 'undone', at: new Date().toISOString(), reverted: changes.map((c) => c.at) })
  }
}
module.exports = { readLedger, doneRowIds, pendingUndo, undoRows }
