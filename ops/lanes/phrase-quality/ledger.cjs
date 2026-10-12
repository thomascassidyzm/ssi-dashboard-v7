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
// what apply-staged.cjs applies: replace/delete lines whose row is not already done, and not on hold.
// A line with "hold" (ramp 967: a replacement whose new text has no audio yet) stays staged until the
// hold is lifted; it is never applied by this tool while it carries one.
const stagedTodo = (staged, done) => staged.filter((d) => ['replace', 'delete'].includes(d.decision) && !d.hold && !done.has(d.row_id))
module.exports = { readLedger, doneRowIds, pendingUndo, stagedTodo }
