#!/usr/bin/env node
/**
 * READ-ONLY census: what share of a course's presentation intros (seeds 1..N) could be built by dice-and-splice with ZERO new
 * characters — i.e. every piece (fragment, X, 'as in', context, 'is') already exists as a Charlotte English clip somewhere in
 * course_audio. Spends nothing and writes nothing. Used for Tom's 2026-10-11 question (job #516).
 *   node tools/audio/intro-splice-coverage.cjs --course spa_for_eng [--seeds 100]
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env.psql') })
const { Client } = require('pg')
const { planIntro } = require('../../services/shared/intro-splice.cjs')
const { normalizeForAudio, audioKeyCandidates } = require('../../services/shared/text-normalize.cjs')
const policy = require('../../services/shared/voicing-policy.cjs')

const argv = process.argv.slice(2)
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }

async function main() {
  const course = opt('--course'), maxSeed = Number(opt('--seeds', 100))
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); await pg.connect()
  const { rows: [crs] } = await pg.query('select course_code, known_lang, target_lang from courses where course_code=$1', [course])
  const { rows } = await pg.query(`select l.lego_id, ca.text from course_legos l join course_audio ca on ca.id::text = l.presentation_audio_id::text
    where l.course_code=$1 and l.seed_number <= $2 order by l.seed_number, l.lego_index`, [course, maxSeed])
  const voices = [policy.config.englishVoice, policy.config.englishVoice.replace(/^cartesia_/, '')]
  const plans = rows.map(r => ({ ...r, plan: planIntro(r.text, crs) }))
  const parsed = plans.filter(p => p.plan)
  const want = new Map()   // candidate key -> piece text
  for (const p of parsed) for (const pc of p.plan.pieces) for (const k of audioKeyCandidates(normalizeForAudio(pc.text))) want.set(k, pc.text)
  const { rows: have } = await pg.query(`select distinct text_normalized from course_audio where language='eng' and voice_id = any($1) and text_normalized = any($2) and s3_key not like 'pending/%'`, [voices, [...want.keys()]])
  const haveKeys = new Set(have.map(h => h.text_normalized))
  const exists = text => audioKeyCandidates(normalizeForAudio(text)).some(k => haveKeys.has(k))
  let full = 0, contentReady = 0; const missingCount = new Map(); let missChars = 0; const byKind = {}
  const missingUnique = new Set()
  for (const p of parsed) {
    const miss = p.plan.pieces.filter(pc => !exists(pc.text))
    if (!miss.length) full++
    if (!miss.some(pc => pc.kind === 'x' || pc.kind === 'context')) contentReady++   // the LEGO and its sentence exist; only the shared fixed pieces (fragment, 'as in') are owed
    for (const pc of miss) { byKind[pc.kind] = (byKind[pc.kind] || 0) + 1; if (!missingUnique.has(pc.text.toLowerCase())) { missingUnique.add(pc.text.toLowerCase()); missChars += pc.text.length } }
  }
  console.log(JSON.stringify({ course, seedsTo: maxSeed, intros: rows.length, spliceable: parsed.length, zeroNewCharacters: full,
    contentPiecesAllExist: contentReady, pctContentPiecesAllExist: parsed.length ? +(100 * contentReady / parsed.length).toFixed(1) : null,
    pctZeroNew: parsed.length ? +(100 * full / parsed.length).toFixed(1) : null, missingPiecesByKind: byKind,
    uniqueMissingPieces: missingUnique.size, charsToCloseAllGaps: missChars }, null, 1))
  await pg.end()
}
main().catch(e => { console.error(e); process.exit(1) })
