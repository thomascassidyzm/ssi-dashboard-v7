#!/usr/bin/env node
/**
 * pair-slug-canonical-pod — give a pair's target text its own pod slug, and hand
 * the shared English slug back to the canon.
 *
 * WHY THIS EXISTS. `canonical_pod_scenarios` has ONE target column and NO course
 * column. So the moment a pair writes target text into a shared English slug like
 * `health`, that slug is consumed: the sibling of `retail`/`trades`/`hospitality`
 * is no longer English canon, and the second pair — South Welsh, in the case this
 * was written for — has nowhere to go. The other layer, `listening_pods`, already
 * keys by `course_code`. This makes the canonical store agree with it by using a
 * `<course>:<slug>` pod_slug for the pair layer, so `health` stays canon and
 * `cym_n_for_eng:health` / `cym_s_for_eng:health` are siblings, not rivals.
 *
 * IT COPIES, IT DOES NOT MOVE, AND THAT IS THE POINT.
 *   - The English canon rows must SURVIVE under the shared slug: they are the
 *     source every other pair overlay is written against.
 *   - `canonical_pod_walk_steps.scenario_id` is a real FK to
 *     `canonical_pod_scenarios(id)` ON DELETE SET NULL. Deleting the source rows
 *     would silently null 201 walk-step references — the walk would still be
 *     there and would point at nothing. Copying leaves every reference intact.
 *   - So NO WALK STEPS ARE TOUCHED OR DUPLICATED. The walk belongs to the English
 *     canon and stays there, singular. A pair layer needs none: `pair-overlay` in
 *     tools/pods/pod-corpora.json "declares no walk steps", `health-general-welsh`
 *     has zero, and the Script Lab falls back to walkFromCanonicalRows() when the
 *     API returns an empty walk (src/views/ScriptLabScriptView.vue).
 *
 * `--clear-source-target` is the second half of the job: once the copy is verified
 * row-for-row, the target_text/target_lang on the SOURCE rows is nulled, which is
 * what actually returns `health` to being English canon. english_text is never
 * written, in either slug, by any path in this file.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write. It refuses if the destination slug
 * already holds rows, if any new id collides anywhere in the table, or if any
 * source id does not carry the source slug as its id prefix. It asserts the
 * inserted count equals the source count inside the transaction, and will not
 * clear a single source target until the copy is verified present and complete.
 *
 *   node tools/pods/pair-slug-canonical-pod.cjs --from=health --to=cym_n_for_eng:health --clear-source-target
 *   node tools/pods/pair-slug-canonical-pod.cjs --from=health --to=cym_n_for_eng:health --clear-source-target --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const APPLY = process.argv.includes('--apply')
const CLEAR = process.argv.includes('--clear-source-target')
const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const FROM = arg('from')
const TO = arg('to')
if (!FROM || !TO) {
  console.error('FAILED: --from=<slug> and --to=<slug> are both required')
  process.exit(1)
}
if (FROM === TO) {
  console.error('FAILED: --from and --to are the same slug')
  process.exit(1)
}

const LOG_DIR = path.join(__dirname, '..', '..', 'docs', 'pods')
const STAMP = new Date().toISOString().slice(0, 10)
const logName = `${FROM.replace(/[^a-z0-9]+/gi, '-')}-to-${TO.replace(/[^a-z0-9]+/gi, '-')}-${STAMP}-${APPLY ? 'applied' : 'dryrun'}-log.json`

/**
 * A scenario id is `<pod_slug>:<tail>` — `health:SC01-F01-S01`. The slug itself
 * may contain a colon once it is a pair slug, so the prefix is matched literally
 * rather than by splitting on ':'. An id that does not carry its own slug is a
 * refusal, never a guess.
 */
function retail(id, fromSlug) {
  const prefix = `${fromSlug}:`
  if (!String(id).startsWith(prefix)) return null
  const tail = String(id).slice(prefix.length)
  return tail || null
}

const COLS = [
  'id', 'pod_slug', 'scene_number', 'scene_label', 'scene_title', 'scene_subtitle',
  'difficulty', 'sentence_number', 'global_order', 'speaker', 'english_text',
  'author_notes', 'variant_key', 'target_text', 'target_lang',
]

;(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  try {
    const src = (await db.query(
      `select ${COLS.join(', ')} from canonical_pod_scenarios where pod_slug=$1 order by global_order`, [FROM])).rows
    if (!src.length) throw new Error(`${FROM}: no scenario rows`)

    const existing = (await db.query(
      `select count(*)::int as n from canonical_pod_scenarios where pod_slug=$1`, [TO])).rows[0].n
    if (existing) throw new Error(`${TO}: destination slug already holds ${existing} rows; refusing to write into an occupied slug`)

    const plan = []
    for (const r of src) {
      const tail = retail(r.id, FROM)
      if (!tail) throw new Error(`row id "${r.id}" does not start with "${FROM}:"; refusing to guess a new id`)
      plan.push({ from: r.id, to: `${TO}:${tail}`, global_order: r.global_order, has_target: r.target_text != null })
    }

    const collisions = (await db.query(
      `select id, pod_slug from canonical_pod_scenarios where id = any($1::text[])`,
      [plan.map(p => p.to)])).rows

    // Walk steps are reported, never written. If the FK ever stopped protecting
    // them this number is the blast radius, so it is on the face of every run.
    const walk = (await db.query(
      `select count(*)::int as n from canonical_pod_walk_steps where pod_slug=$1`, [FROM])).rows[0].n

    const summary = {
      from: FROM,
      to: TO,
      rows: src.length,
      with_target: src.filter(r => r.target_text != null).length,
      target_langs: [...new Set(src.map(r => r.target_lang).filter(Boolean))],
      walk_steps_under_source_left_untouched: walk,
      clear_source_target: CLEAR,
      collisions: collisions.length,
      examples: plan.slice(0, 3),
    }

    if (collisions.length) {
      console.error(JSON.stringify({ mode: 'REFUSED', reason: 'new ids collide with existing rows', summary, collisions: collisions.slice(0, 10) }, null, 2))
      process.exit(1)
    }

    if (!APPLY) {
      fs.writeFileSync(path.join(LOG_DIR, logName), JSON.stringify({ mode: 'DRY RUN', summary, plan }, null, 1))
      console.log(JSON.stringify({ mode: 'DRY RUN', summary, log: logName }, null, 2))
      return
    }

    await db.query('BEGIN')
    try {
      const placeholders = COLS.map((_, i) => `$${i + 1}`).join(', ')
      for (const r of src) {
        const tail = retail(r.id, FROM)
        const vals = COLS.map(c => {
          if (c === 'id') return `${TO}:${tail}`
          if (c === 'pod_slug') return TO
          return r[c]
        })
        const ins = await db.query(
          `insert into canonical_pod_scenarios (${COLS.join(', ')}) values (${placeholders})`, vals)
        if (ins.rowCount !== 1) throw new Error(`insert for ${r.id} wrote ${ins.rowCount} rows`)
      }

      const copied = (await db.query(
        `select count(*)::int as n, count(target_text)::int as t from canonical_pod_scenarios where pod_slug=$1`, [TO])).rows[0]
      if (copied.n !== src.length) throw new Error(`copy count ${copied.n} != source count ${src.length}`)
      if (copied.t !== summary.with_target) throw new Error(`copy target count ${copied.t} != source target count ${summary.with_target}`)

      let cleared = 0
      if (CLEAR) {
        // Only ever after the copy above is counted and matched — make before break.
        const upd = await db.query(
          `update canonical_pod_scenarios set target_text=null, target_lang=null, updated_at=now()
           where pod_slug=$1 and (target_text is not null or target_lang is not null)`, [FROM])
        cleared = upd.rowCount
      }

      const after = (await db.query(
        `select count(*)::int as n, count(target_text)::int as t from canonical_pod_scenarios where pod_slug=$1`, [FROM])).rows[0]
      if (after.n !== src.length) throw new Error(`source row count changed: ${after.n} != ${src.length}`)
      if (CLEAR && after.t !== 0) throw new Error(`source still holds ${after.t} target_text rows after clear`)

      await db.query('COMMIT')
      const out = { mode: 'APPLIED', summary, copied, source_after: after, source_targets_cleared: cleared, plan }
      fs.writeFileSync(path.join(LOG_DIR, logName), JSON.stringify(out, null, 1))
      console.log(JSON.stringify({ mode: 'APPLIED', summary, copied, source_after: after, source_targets_cleared: cleared, log: logName }, null, 2))
    } catch (e) {
      await db.query('ROLLBACK')
      throw e
    }
  } finally {
    await db.end()
  }
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
