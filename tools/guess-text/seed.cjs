#!/usr/bin/env node
/**
 * Seed public.guess_text_items for known language 'eng' with TWO things (job #628):
 *   1. today's /guess text exactly as the game bundled it on 2026-10-04 -> state 'live'
 *      (tools/guess-text/seed-live-2026-10-04.json, exported from tells.ts / neighbours.ts / places.ts, no wording touched)
 *   2. the humanised draft published for Aran -> state 'draft', one per item it rewrites
 *      (tools/guess-text/seed-draft-2026-10-04.json, taken verbatim from the draft document; lines it left
 *      word-for-word identical to live are not stored as drafts, since approving them would change nothing)
 * HISTORICAL: superseded by promote-drafts.cjs (job #632, Tom 2026-10-04: the humanised text is live). Do NOT re-run
 * against the live table: it would re-insert the drafts. Idempotent otherwise.
 *   node tools/guess-text/seed.cjs [--dry]
 */
const fs = require('fs'), path = require('path')
const { Client } = require('pg')
const dry = process.argv.includes('--dry')
const url = (fs.readFileSync(path.join(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.*)/) || [])[1].trim()
const load = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'))
const live = load('seed-live-2026-10-04.json'), draft = load('seed-draft-2026-10-04.json')

;(async () => {
  const c = new Client({ connectionString: url })
  await c.connect()
  let added = { live: 0, draft: 0 }
  for (const [state, source, data] of [['live', 'seed-live', live], ['draft', 'seed-draft', draft]]) {
    for (const [kind, items] of Object.entries(data)) {
      for (const [id, content] of Object.entries(items)) {
        const has = await c.query("select 1 from guess_text_items where known_lang='eng' and kind=$1 and item_id=$2 and state=$3", [kind, id, state])
        if (has.rowCount) continue
        if (!dry) await c.query("insert into guess_text_items (known_lang, kind, item_id, content, state, source, edited_by, approved_by, approved_at) values ('eng',$1,$2,$3,$4,$5,$6,$7,$8)",
          [kind, id, content, state, source, 'seed (job #628)', state === 'live' ? 'seed (job #628): the text the game bundled on 2026-10-04' : null, state === 'live' ? new Date().toISOString() : null])
        added[state]++
      }
    }
  }
  const r = await c.query("select state, kind, count(*) from guess_text_items group by 1,2 order by 1,2")
  console.log(dry ? 'DRY' : 'applied', JSON.stringify(added), JSON.stringify(r.rows))
  await c.end()
})().catch(e => { console.error(e.message); process.exit(1) })
