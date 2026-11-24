#!/usr/bin/env node
/**
 * READ-ONLY. Which of job #621's 219 label-linked English cues (13 Oct 2026, cym_n_for_eng known_audio_id ← Aran's
 * English takes matched by TEXT, never heard) does the learner still hear? (cs #255·AL, Kai 24 Nov: listen to them all.)
 *
 * The set is the committed ledger ops/welsh-human-links-621/aran-ledger.csv (copied from branch cs/621-welsh-north-links,
 * which never merged). A row is SERVED only when its slot's known_audio_id today is still exactly the ledger's `to` clip:
 * slots unlinked since (learner tickets #47-#49, #50·AI, #58·AI) or re-pointed are listed as dropped, never played.
 *
 *   source ~/ssi-restore/qa-copy.env    # read the nightly QA copy, never live (never-hammer rule)
 *   node tools/audio/welsh-label-linked-cues-621.cjs [--out file.json]
 *
 * Output: {served:[...], dropped:[...]} in learner order (seed, then LEGO, then phrase position). Each row carries the
 * slot id, the cue text the course shows, the clip id and its s3_key. No writes; three SELECTs on primary keys.
 */
const fs = require('fs'), path = require('path')
const db = require('../../services/shared/agent-db.cjs')

const COURSE = 'cym_n_for_eng'
const LEDGER = path.join(__dirname, '../../ops/welsh-human-links-621/aran-ledger.csv')

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') q = false; else cell += c; continue }
    if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = '' } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [h, ...rest] = rows
  return rest.filter((r) => r.length === h.length).map((r) => Object.fromEntries(r.map((v, i) => [h[i], v])))
}

async function main() {
  const outIdx = process.argv.indexOf('--out')
  const ledger = parseCsv(fs.readFileSync(LEDGER, 'utf8')).filter((r) => r.course_code === COURSE && r.col === 'known_audio_id')
  const ids = (tbl) => ledger.filter((r) => r.tbl === tbl).map((r) => r.pk)
  const pg = await db.connect()
  try {
    const now = new Map()
    const seeds = await pg.query(`SELECT id::text AS pk, seed_number, 0 AS lego_index, 0 AS position, seed_id AS slot, known_text, known_audio_id::text AS cur
      FROM course_seeds WHERE course_code = $1 AND id = ANY($2::uuid[])`, [COURSE, ids('course_seeds')])
    const legos = await pg.query(`SELECT id::text AS pk, seed_number, lego_index, 0 AS position, lego_id AS slot, known_text, known_audio_id::text AS cur
      FROM course_legos WHERE course_code = $1 AND id = ANY($2::uuid[])`, [COURSE, ids('course_legos')])
    const phrases = await pg.query(`SELECT id AS pk, seed_number, lego_index, position, id AS slot, known_text, known_audio_id::text AS cur
      FROM course_practice_phrases WHERE course_code = $1 AND id = ANY($2::text[])`, [COURSE, ids('course_practice_phrases')])
    for (const [tbl, res] of [['course_seeds', seeds], ['course_legos', legos], ['course_practice_phrases', phrases]]) for (const r of res.rows) now.set(tbl + ':' + r.pk, r)
    const clips = await db.clipMap(pg, ledger.map((r) => r.to))
    const served = [], dropped = []
    for (const l of ledger) {
      const r = now.get(l.tbl + ':' + l.pk)
      const kind = { course_seeds: 'seed', course_legos: 'lego', course_practice_phrases: 'phrase' }[l.tbl]
      if (!r) { dropped.push({ tbl: l.tbl, pk: l.pk, linked: l.to, why: 'slot row no longer exists' }); continue }
      const base = { course: COURSE, kind, slot: r.slot, seed_number: r.seed_number, lego_index: r.lego_index, position: r.position, cue: r.known_text, linked_clip: l.to, clip_source: l.clip_voice }
      if (r.cur !== l.to) { dropped.push({ ...base, now_clip: r.cur || null, why: r.cur ? 're-pointed to another clip' : 'unlinked (slot empty)' }); continue }
      const c = clips.get(l.to)
      if (!c) { dropped.push({ ...base, why: 'linked clip row missing from course_audio' }); continue }
      served.push({ ...base, clip_id: c.id, s3_key: c.s3_key, clip_text: c.text, voice_id: c.voice_id, duration_ms: c.duration_ms })
    }
    const order = (a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index || a.position - b.position
    served.sort(order); dropped.sort((a, b) => order({ seed_number: 0, lego_index: 0, position: 0, ...a }, { seed_number: 0, lego_index: 0, position: 0, ...b }))
    const out = JSON.stringify({ course: COURSE, ledger_rows: ledger.length, served, dropped }, null, 1)
    if (outIdx > 0) fs.writeFileSync(process.argv[outIdx + 1], out); else process.stdout.write(out + '\n')
    console.error(`ledger ${ledger.length} · served ${served.length} · dropped ${dropped.length}`)
  } finally { await pg.end() }
}
main().catch((e) => { console.error(e.message); process.exit(1) })
