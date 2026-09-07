#!/usr/bin/env node
/**
 * write-cym-s-health-rows — insert the South Welsh health pod rows into
 * canonical_pod_scenarios under pod_slug cym_s_for_eng:health, mirroring the
 * North rows (cym_n_for_eng:health) id for id.
 *
 * Every non-text field (scene_number, scene_label, scene_title, scene_subtitle,
 * difficulty, sentence_number, global_order, speaker, variant_key,
 * attach_sentence_number, english_text) is COPIED from the North row with the
 * same id tail. Only target_text, target_lang and author_notes come from the
 * part file. The North rows are read, never written.
 *
 * DRY RUN BY DEFAULT. --apply writes, inside one transaction, and refuses if:
 *   - a part-file tail has no North row, or a North scene in the part's range
 *     has a row the part file does not cover (the two must line up exactly);
 *   - any destination id already exists (never overwrites — a re-author is a
 *     separate, deliberate delete first);
 *   - the inserted count differs from the part-file count.
 *
 *   node tools/pods/write-cym-s-health-rows.cjs --part=tools/pods/cym-s-health/part1-scenes-1-8.cjs --scenes=1-8
 *   node tools/pods/write-cym-s-health-rows.cjs --part=... --scenes=1-8 --apply
 */
'use strict'
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true })
const fs = require('fs')
const { Client } = require('pg')
const { evidencePath } = require('../lib/evidence-path.cjs')

const FROM = 'cym_n_for_eng:health'
const TO = 'cym_s_for_eng:health'
const TO_LANG = 'cym_s'
const APPLY = process.argv.includes('--apply')
const arg = (n) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : null }
const PART = arg('part')
const SCENES = arg('scenes')
if (!PART || !SCENES) { console.error('FAILED: --part=<file> and --scenes=<a-b> are required'); process.exit(1) }
const [sLo, sHi] = SCENES.split('-').map(Number)
if (!(sLo >= 1 && sHi >= sLo)) { console.error('FAILED: bad --scenes'); process.exit(1) }

const part = require(path.resolve(PART))
const byTail = new Map(part.map(([tail, target_text, author_notes]) => [tail, { target_text, author_notes }]))
if (byTail.size !== part.length) { console.error('FAILED: duplicate tails in part file'); process.exit(1) }

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await c.connect()
  try {
    const { rows: north } = await c.query(
      `select * from canonical_pod_scenarios where pod_slug=$1 and scene_number between $2 and $3 order by global_order`,
      [FROM, sLo, sHi])
    const prefix = `${FROM}:`
    const northByTail = new Map(north.map(r => [r.id.slice(prefix.length), r]))
    const missingNorth = [...byTail.keys()].filter(t => !northByTail.has(t))
    const uncovered = [...northByTail.keys()].filter(t => !byTail.has(t))
    if (missingNorth.length || uncovered.length) {
      console.error(`FAILED: part/North mismatch — no North row for ${JSON.stringify(missingNorth)}; North rows not in part ${JSON.stringify(uncovered)}`)
      process.exit(1)
    }
    const ids = [...byTail.keys()].map(t => `${TO}:${t}`)
    const { rows: existing } = await c.query(`select id from canonical_pod_scenarios where id = any($1)`, [ids])
    if (existing.length) { console.error(`FAILED: ${existing.length} destination ids already exist, e.g. ${existing[0].id} — refusing to overwrite`); process.exit(1) }

    const out = north.map(n => {
      const tail = n.id.slice(prefix.length)
      const s = byTail.get(tail)
      return {
        id: `${TO}:${tail}`, pod_slug: TO,
        scene_number: n.scene_number, scene_label: n.scene_label, scene_title: n.scene_title,
        scene_subtitle: n.scene_subtitle, difficulty: n.difficulty, sentence_number: n.sentence_number,
        global_order: n.global_order, speaker: n.speaker, variant_key: n.variant_key,
        attach_sentence_number: n.attach_sentence_number, english_text: n.english_text,
        target_text: s.target_text, target_lang: TO_LANG, author_notes: s.author_notes,
      }
    })
    const stamp = new Date().toISOString().slice(0, 10)
    const log = evidencePath(`docs/pods/cym-s-health-scenes-${SCENES}-${stamp}-${APPLY ? 'applied' : 'dryrun'}-log.json`)
    fs.writeFileSync(log, JSON.stringify({ from: FROM, to: TO, scenes: SCENES, apply: APPLY, count: out.length, rows: out }, null, 1))
    console.log(`${out.length} rows prepared for ${TO} scenes ${SCENES}; log: ${log}`)
    if (!APPLY) { console.log('[dry run] re-run with --apply to insert'); return }

    await c.query('begin')
    let n = 0
    for (const r of out) {
      const cols = Object.keys(r)
      const res = await c.query(
        `insert into canonical_pod_scenarios (${cols.join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')})`,
        cols.map(k => r[k]))
      n += res.rowCount
    }
    const { rows: [{ cnt }] } = await c.query(`select count(*)::int as cnt from canonical_pod_scenarios where pod_slug=$1 and scene_number between $2 and $3`, [TO, sLo, sHi])
    if (n !== out.length || cnt !== out.length) { await c.query('rollback'); console.error(`FAILED: inserted ${n}, found ${cnt}, expected ${out.length} — rolled back`); process.exit(1) }
    await c.query('commit')
    console.log(`✓ inserted ${n} rows into ${TO} (scenes ${SCENES})`)
  } finally { await c.end() }
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
