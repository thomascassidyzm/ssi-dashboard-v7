#!/usr/bin/env node
// Puts phrase-quality changes back from the undo ledger (undo/<course>.jsonl): a deleted row is
// re-inserted whole, a replaced row gets its old row values back. DRY RUN unless --apply.
// Usage: node ops/lanes/phrase-quality/undo.cjs <course> [--row <id>] [--apply]
'use strict'
const fs = require('fs'), path = require('path')
const { client } = require('./lib.cjs')
const { readLedger, pendingUndo, undoRows } = require('./ledger.cjs')
;(async () => {
  const course = process.argv[2], APPLY = process.argv.includes('--apply')
  const only = (process.argv.find((a, i) => process.argv[i - 1] === '--row')) || null
  const ledgerPath = path.join(__dirname, 'undo', `${course}.jsonl`)
  const lines = readLedger(ledgerPath)
  if (!APPLY) { for (const l of pendingUndo(lines, only)) console.error(`would undo ${l.action} of ${l.row_id}`); process.exit(0) }
  await undoRows(lines, only, async (l) => {
    const { error } = l.action === 'delete'
      ? await client().from('course_practice_phrases').upsert(l.before)
      : await client().from('course_practice_phrases').update(l.before).eq('id', l.row_id)
    return error && error.message
  }, (line) => fs.appendFileSync(ledgerPath, JSON.stringify(line) + '\n'), (m) => console.error(m))
  process.exit(0)
})().catch((e) => { console.error(e.message); process.exit(1) })
