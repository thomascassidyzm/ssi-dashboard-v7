#!/usr/bin/env node
/**
 * Add the 'game' kind (the game's OWN words) to public.guess_text_items and seed it with today's
 * wording as LIVE rows for known language 'eng' (job #671, Aran via Tom 2026-10-04).
 *   1. widen the kind check constraint to include 'game' (additive; nothing else changes)
 *   2. insert each id in seed-game-2026-10-04.json as a live row, source 'seed-game', unless the item already exists
 * The JSON is exported from packages/player-vue/src/guess/gameDefaults.ts in ssi-learning-app, no wording touched.
 * Idempotent. node tools/guess-text/seed-game.cjs [--dry]
 */
const fs = require('fs'), path = require('path')
const { Client } = require('pg')
const dry = process.argv.includes('--dry')
const url = (fs.readFileSync(path.join(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.*)/) || [])[1].trim()
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-game-2026-10-04.json'), 'utf8'))

;(async () => {
  const c = new Client({ connectionString: url })
  await c.connect()
  const cons = await c.query("select conname, pg_get_constraintdef(oid) d from pg_constraint where conrelid='public.guess_text_items'::regclass and contype='c' and pg_get_constraintdef(oid) like '%place_where%'")
  console.log('kind constraint:', JSON.stringify(cons.rows))
  if (!dry) {
    await c.query('begin')
    for (const r of cons.rows) if (!r.d.includes("'game'")) await c.query(`alter table public.guess_text_items drop constraint "${r.conname}"`)
    const left = await c.query("select 1 from pg_constraint where conrelid='public.guess_text_items'::regclass and conname='guess_text_items_kind_check'")
    if (!left.rowCount) await c.query("alter table public.guess_text_items add constraint guess_text_items_kind_check check (kind in ('game','tell','pair','place_note','place_where'))")
    await c.query('commit')
  }
  let added = 0
  for (const [kind, items] of Object.entries(data)) {
    for (const [id, content] of Object.entries(items)) {
      const has = await c.query("select 1 from guess_text_items where known_lang='eng' and kind=$1 and item_id=$2 and state='live'", [kind, id])
      if (has.rowCount) continue
      if (!dry) await c.query("insert into guess_text_items (known_lang, kind, item_id, content, state, source, edited_by, approved_by, approved_at) values ('eng',$1,$2,$3,'live','seed-game','seed (job #671)','seed (job #671): the game wording bundled on 2026-10-04', now())", [kind, id, content])
      added++
    }
  }
  const r = await c.query("select state, kind, count(*) from guess_text_items group by 1,2 order by 1,2")
  console.log(dry ? 'DRY' : 'applied', 'added', added, JSON.stringify(r.rows))
  await c.end()
})().catch(e => { console.error(e.message); process.exit(1) })
