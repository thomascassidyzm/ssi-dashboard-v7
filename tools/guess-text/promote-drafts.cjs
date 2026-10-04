#!/usr/bin/env node
/**
 * One-off (job #632, Tom 2026-10-04): the humanised draft IS the canonical live text. For every
 * guess_text_items row in state 'draft', the current live row for that item becomes 'superseded'
 * (kept as history) and the draft becomes live, stamped. One transaction; idempotent (no drafts -> no-op).
 *   node tools/guess-text/promote-drafts.cjs [--dry]
 */
const fs = require('fs'), path = require('path')
const { Client } = require('pg')
const dry = process.argv.includes('--dry')
const url = (fs.readFileSync(path.join(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.*)/) || [])[1].trim()
const WHO = 'Tom ruling 2026-10-04 (job #632): the friendly version is the live text'

;(async () => {
  const c = new Client({ connectionString: url })
  await c.connect()
  await c.query('begin')
  const drafts = (await c.query("select id, known_lang, kind, item_id from guess_text_items where state='draft' order by id")).rows
  for (const d of drafts) {
    await c.query("update guess_text_items set state='superseded' where known_lang=$1 and kind=$2 and item_id=$3 and state='live'", [d.known_lang, d.kind, d.item_id])
    await c.query("update guess_text_items set state='live', approved_by=$2, approved_at=now() where id=$1", [d.id, WHO])
  }
  const r = await c.query("select state, count(*) from guess_text_items group by 1 order by 1")
  console.log(dry ? 'DRY (rolled back)' : 'promoted', drafts.length, JSON.stringify(r.rows))
  await c.query(dry ? 'rollback' : 'commit')
  await c.end()
})().catch(e => { console.error(e.message); process.exit(1) })
