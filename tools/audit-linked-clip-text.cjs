#!/usr/bin/env node
/**
 * audit-linked-clip-text.cjs — READ-ONLY. For one course, compare every slot's CURRENT text
 * (seed, LEGO, practice phrase; known / target1 / target2) with the text of the course_audio clip it
 * links to, and every LEGO presentation clip with its LEGO.
 *
 * WHY. Editing course_seeds / course_legos / course_practice_phrases text does not null the audio
 * link (no trigger), so an edited row keeps a clip that speaks the OLD words. audio-link-reconcile
 * only finds slots that are NOT linked; this finds the ones linked to the wrong words.
 *
 * Differences of case, whitespace and punctuation are not mismatches (`sameWords`). For each mismatch it
 * also lists existing clips of the CURRENT text in the same course+role (voice-matched ones first), so a
 * free relink through POST /api/production/:course/link-clip (replace + expectCurrent) can be planned.
 * It never writes.
 *
 *   node tools/audit-linked-clip-text.cjs <course_code> [--out file.json]
 */
const fs = require('fs')
const db = require('../services/shared/agent-db.cjs')
const { normalizeForDb } = require('../services/shared/text-normalize.cjs')

/** The words only: lower-case, punctuation dropped, whitespace collapsed. */
function wordsKey(t) {
  return String(t == null ? '' : t).normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim()
}
const sameWords = (a, b) => wordsKey(a) === wordsKey(b)

const ROLE_COL = { known: ['known_text', 'known_audio_id'], target1: ['target_text', 'target1_audio_id'], target2: ['target_text', 'target2_audio_id'] }

/** Pure: rows of one kind + a clip map -> mismatches. Exported for the test. */
function compareRows(kind, rows, clips) {
  const out = []
  for (const r of rows) {
    for (const [role, [textCol, linkCol]] of Object.entries(ROLE_COL)) {
      const id = r[linkCol]
      if (!id) continue
      const clip = clips.get(String(id))
      const text = r[textCol]
      if (!clip) { out.push({ kind, role, row: r, audioId: String(id), problem: 'DANGLING', text, clipText: null }); continue }
      if (!sameWords(text, clip.text)) out.push({ kind, role, row: r, audioId: String(id), problem: 'TEXT', text, clipText: clip.text, clipVoice: clip.voice_id, clipCreated: clip.created_at })
    }
  }
  return out
}

/** Pure: a presentation clip ("The German for: 'X', is:") must mention its LEGO's known text. */
function comparePresentations(rows, clips) {
  const out = []
  for (const r of rows) {
    if (!r.presentation_audio_id) continue
    const clip = clips.get(String(r.presentation_audio_id))
    if (!clip) { out.push({ kind: 'lego', role: 'presentation', row: r, audioId: String(r.presentation_audio_id), problem: 'DANGLING', text: r.known_text, clipText: null }); continue }
    const k = wordsKey(r.known_text)
    if (k && !wordsKey(clip.text).includes(k)) out.push({ kind: 'lego', role: 'presentation', row: r, audioId: String(r.presentation_audio_id), problem: 'TEXT', text: r.known_text, clipText: clip.text, clipVoice: clip.voice_id, clipCreated: clip.created_at })
  }
  return out
}

async function main() {
  const [course, ...rest] = process.argv.slice(2)
  if (!course) { console.error('usage: audit-linked-clip-text.cjs <course_code> [--out file]'); process.exit(2) }
  const outFile = rest.includes('--out') ? rest[rest.indexOf('--out') + 1] : null
  const pg = await db.connect({ app: `agent:audit-linked-clip-text:${course}` })
  const cols = 'known_audio_id, target1_audio_id, target2_audio_id, known_text, target_text, updated_at, seed_number'
  const seeds = (await pg.query(`SELECT seed_id AS ref, ${cols} FROM course_seeds WHERE course_code=$1 ORDER BY seed_number`, [course])).rows
  const legos = (await pg.query(`SELECT lego_id AS ref, presentation_audio_id, ${cols} FROM course_legos WHERE course_code=$1 ORDER BY seed_number, lego_index`, [course])).rows
  const phrases = (await pg.query(`SELECT id AS ref, lego_id, ${cols} FROM course_practice_phrases WHERE course_code=$1 ORDER BY seed_number`, [course])).rows
  const ids = []
  for (const r of [...seeds, ...legos, ...phrases]) ids.push(r.known_audio_id, r.target1_audio_id, r.target2_audio_id)
  for (const r of legos) ids.push(r.presentation_audio_id)
  const clips = await db.clipMap(pg, ids)
  const mism = [...compareRows('seed', seeds, clips), ...compareRows('lego', legos, clips), ...compareRows('phrase', phrases, clips), ...comparePresentations(legos, clips)]
  // existing clips of the CURRENT text, same course + role (index course_code,text_normalized,role)
  const wants = [...new Set(mism.filter((m) => m.role !== 'presentation').map((m) => normalizeForDb(m.text || '')).filter(Boolean))]
  const cand = new Map()
  for (let i = 0; i < wants.length; i += 300) {
    const { rows } = await pg.query(
      `SELECT id::text AS id, role, voice_id, text, origin, created_at FROM course_audio WHERE course_code=$1 AND text_normalized = ANY($2::text[]) AND role IN ('known','target1','target2')`,
      [course, wants.slice(i, i + 300)])
    for (const c of rows) { const k = `${c.role}|${wordsKey(c.text)}`; if (!cand.has(k)) cand.set(k, []); cand.get(k).push(c) }
  }
  for (const m of mism) {
    if (m.role === 'presentation') { m.candidates = []; continue }
    const list = cand.get(`${m.role}|${wordsKey(m.text)}`) || []
    m.candidates = list.sort((a, b) => (a.voice_id === m.clipVoice ? -1 : 0) - (b.voice_id === m.clipVoice ? -1 : 0))
  }
  const slim = mism.map((m) => ({ kind: m.kind, ref: m.row.ref, seed: m.row.seed_number, role: m.role, problem: m.problem, text: m.text, clipText: m.clipText, audioId: m.audioId, clipVoice: m.clipVoice, clipCreated: m.clipCreated, rowUpdated: m.row.updated_at, candidates: m.candidates }))
  const summary = { course, seeds: seeds.length, legos: legos.length, phrases: phrases.length, mismatches: slim.length,
    byKindRole: slim.reduce((a, m) => { const k = `${m.kind}/${m.role}/${m.problem}`; a[k] = (a[k] || 0) + 1; return a }, {}) }
  if (outFile) fs.writeFileSync(outFile, JSON.stringify({ summary, mismatches: slim }, null, 1))
  console.log(JSON.stringify(summary, null, 1))
  await pg.end()
}

module.exports = { wordsKey, sameWords, compareRows, comparePresentations }
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1) })
