#!/usr/bin/env node
/**
 * retire-canonical-walk — take a walk OUT of the canonical pod store, keeping a restore record.
 * Never a delete without one.
 *
 * WHY. Tom, 2026-10-20: "The one I want to get rid of is the ones the agents made up for Tom and
 * Aran Talk Bollocks - the Methodology and our general view on Education. It didn't work because
 * it just did not sound enough like us." The Method pod's two cuts left the store on 2026-09-27
 * (job #410) by hand-written SQL, before the 2026-10-14 rule that no agent touches the database
 * with hand-written code. This is that retirement as a tool, so the next one is not hand-written.
 *
 * WHAT IT DOES, for one pod_slug:
 *   1. reads every row under the slug in canonical_pod_scenarios, canonical_pod_walk_steps and
 *      canonical_pod_target_text;
 *   2. writes them to a restore file (one transaction of json_populate_recordset inserts, the same
 *      shape as archive/pods-retired-2026-09-27/method-pod/canonical-store-rows.restore.sql);
 *   3. in ONE transaction: deletes them (target text, walk steps, then scenarios, the FK order),
 *      PROVES the restore file by running its inserts inside a savepoint and comparing every row
 *      it brings back with the snapshot, rolls the savepoint back, and only then commits.
 * If the file does not bring back exactly what was there, nothing is deleted.
 *
 * WHAT IT LEAVES. canonical_script_versions is the Script Lab's edit history, keyed by scenario id
 * with no foreign key; it is history, like content_audit_log, and is not touched. Listening pods
 * (listening_pods / listening_pod_sentences) are not this tool's business: a live one is never
 * pulled back (services/pod-visibility.cjs), and is retired by slug in serving-slug.cjs.
 *
 *   node tools/pods/retire-canonical-walk.cjs --census
 *   node tools/pods/retire-canonical-walk.cjs --slug=<slug> --out=<restore.sql>            # dry run
 *   node tools/pods/retire-canonical-walk.cjs --slug=<slug> --out=<restore.sql> --apply
 */
'use strict'

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true })

// FK order: target text and walk steps point at scenarios.
const TABLES = ['canonical_pod_target_text', 'canonical_pod_walk_steps', 'canonical_pod_scenarios']
const ORDER_BY = {
  canonical_pod_scenarios: 'id',
  canonical_pod_walk_steps: 'id',
  canonical_pod_target_text: 'target_lang, global_order',
}

const arg = (n) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : null }

/** PURE. Rows → the restore file. Inserts go in the reverse of the delete order. */
function restoreSql (slug, snapshot, why) {
  const tag = '$tbr$'
  const lines = [
    `-- The canonical store rows of '${slug}', as they stood when they were retired.`,
    `-- ${why}`,
    `-- Restore: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <this file>`,
    'BEGIN;',
  ]
  for (const t of [...TABLES].reverse()) {
    const rows = snapshot[t] || []
    if (!rows.length) continue
    const json = JSON.stringify(rows)
    if (json.includes(tag)) throw new Error(`row text contains the dollar-quote tag ${tag}`)
    lines.push(`INSERT INTO ${t} SELECT * FROM json_populate_recordset(null::${t}, ${tag}${json}${tag});`)
  }
  lines.push('COMMIT;', '')
  return lines.join('\n')
}

/** PURE. The insert statements of a restore file, without its BEGIN/COMMIT. */
function restoreInserts (sql) {
  return sql.split('\n').filter(l => l.startsWith('INSERT INTO '))
}

async function readSlug (db, slug) {
  const snapshot = {}
  for (const t of TABLES) {
    const r = await db.query(`select * from ${t} where pod_slug = $1 order by ${ORDER_BY[t]}`, [slug])
    snapshot[t] = r.rows
  }
  return snapshot
}

const canon = rows => JSON.stringify(rows)

async function census (db) {
  const s = await db.query(`select pod_slug, count(*)::int lines, count(distinct scene_number)::int scenes,
      (array_agg(scene_title order by global_order))[1] first_title,
      string_agg(distinct speaker, ',') speakers
    from canonical_pod_scenarios group by pod_slug order by pod_slug`)
  const w = await db.query('select pod_slug, count(*)::int n from canonical_pod_walk_steps group by 1')
  const t = await db.query("select pod_slug, string_agg(target_lang || ':' || n, ' ' order by target_lang) langs from (select pod_slug, target_lang, count(*)::int n from canonical_pod_target_text group by 1, 2) x group by 1")
  const v = await db.query('select pod_slug, count(*)::int n from canonical_script_versions group by 1')
  const by = (r, k) => Object.fromEntries(r.rows.map(x => [x.pod_slug, x[k]]))
  const W = by(w, 'n'), T = by(t, 'langs'), V = by(v, 'n')
  const slugs = [...new Set([...s.rows.map(r => r.pod_slug), ...Object.keys(W), ...Object.keys(T)])].sort()
  const S = Object.fromEntries(s.rows.map(r => [r.pod_slug, r]))
  console.log('slug | lines | scenes | speakers | walk steps | target text | script versions | first scene')
  for (const slug of slugs) {
    const r = S[slug] || {}
    console.log([slug, r.lines || 0, r.scenes || 0, r.speakers || '', W[slug] || 0, T[slug] || '', V[slug] || 0, r.first_title || ''].join(' | '))
  }
}

async function retire (db, slug, out, apply) {
  const snapshot = await readSlug(db, slug)
  const counts = Object.fromEntries(TABLES.map(t => [t, snapshot[t].length]))
  console.log(`${slug}: ${JSON.stringify(counts)}`)
  if (!snapshot.canonical_pod_scenarios.length) throw new Error(`no canonical_pod_scenarios rows under '${slug}'`)
  const why = arg('why') || `Retired ${new Date().toISOString().slice(0, 10)} by tools/pods/retire-canonical-walk.cjs.`
  const sql = restoreSql(slug, snapshot, why)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, sql)
  console.log(`restore file written: ${out} (${sql.length} bytes)`)
  if (!apply) { console.log('DRY RUN — nothing deleted. Add --apply.'); return }

  await db.query('begin')
  try {
    for (const t of TABLES) {
      const r = await db.query(`delete from ${t} where pod_slug = $1`, [slug])
      if (r.rowCount !== counts[t]) throw new Error(`${t}: deleted ${r.rowCount}, expected ${counts[t]}`)
    }
    // The proof: the file brings back exactly what was there.
    await db.query('savepoint restore_proof')
    for (const stmt of restoreInserts(fs.readFileSync(out, 'utf8'))) await db.query(stmt)
    const back = await readSlug(db, slug)
    for (const t of TABLES) if (canon(back[t]) !== canon(snapshot[t])) throw new Error(`restore proof failed on ${t}: the file does not bring back the same rows`)
    await db.query('rollback to savepoint restore_proof')
    const after = await readSlug(db, slug)
    for (const t of TABLES) if (after[t].length) throw new Error(`${t} still holds ${after[t].length} rows`)
    await db.query('commit')
    console.log(`retired '${slug}': ${JSON.stringify(counts)} removed; restore proven row-for-row before commit`)
  } catch (e) { await db.query('rollback'); throw e }
}

module.exports = { restoreSql, restoreInserts, TABLES }

if (require.main === module) {
  (async () => {
    const { Client, types } = require('pg')
    // Timestamps as Postgres prints them: a JS Date drops the microseconds, and the restore
    // file must bring back created_at/updated_at exactly.
    for (const oid of [1114, 1184]) types.setTypeParser(oid, v => v)
    const db = new Client({ connectionString: process.env.DATABASE_URL })
    await db.connect()
    try {
      if (process.argv.includes('--census')) await census(db)
      else {
        const slug = arg('slug'), out = arg('out')
        if (!slug || !out) throw new Error('usage: --census | --slug=<slug> --out=<restore.sql> [--why=<text>] [--apply]')
        await retire(db, slug, path.resolve(out), process.argv.includes('--apply'))
      }
    } finally { await db.end() }
  })().catch(e => { console.error(`REFUSED: ${e.message}`); process.exit(1) })
}
