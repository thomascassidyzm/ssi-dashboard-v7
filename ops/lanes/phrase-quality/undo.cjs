#!/usr/bin/env node
// Puts phrase-quality changes back from the undo ledger (undo/<course>.jsonl): a deleted row is
// re-inserted whole, a replaced row gets its old row values back. DRY RUN unless --apply.
// Usage: node ops/lanes/phrase-quality/undo.cjs <course> [--row <id>] [--apply]
'use strict'
const fs = require('fs'), path = require('path')
const { client } = require('./lib.cjs')
const { readLedger, pendingUndo } = require('./ledger.cjs')
;(async () => {
  const course = process.argv[2], APPLY = process.argv.includes('--apply')
  const only = (process.argv.find((a, i) => process.argv[i - 1] === '--row')) || null
  const ledgerPath = path.join(__dirname, 'undo', `${course}.jsonl`)
  for (const l of pendingUndo(readLedger(ledgerPath), only)) {
    if (!APPLY) { console.error(`would undo ${l.action} of ${l.row_id}`); continue }
    const { error } = l.action === 'delete'
      ? await client().from('course_practice_phrases').upsert(l.before)
      : await client().from('course_practice_phrases').update(l.before).eq('id', l.row_id)
    if (!error) fs.appendFileSync(ledgerPath, JSON.stringify({ row_id: l.row_id, action: 'undone', at: new Date().toISOString() }) + '\n')
    console.error(`${l.row_id}: ${error ? 'ERROR ' + error.message : 'restored'}`)
  }
  process.exit(0)
})().catch((e) => { console.error(e.message); process.exit(1) })
