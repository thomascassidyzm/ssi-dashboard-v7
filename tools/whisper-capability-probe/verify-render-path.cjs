#!/usr/bin/env node
/**
 * verify-render-path.cjs — does the render path still work, on both sides?
 *
 * The unit tests pin the logic with stubs. This runs the REAL module against
 * REAL bytes pulled from S3, through the REAL renderChecked() that phase8 calls,
 * with a render() that hands back a live clip instead of paying for TTS.
 *
 * Two cases, because a guard that only works on one side is not a guard:
 *   GATED   deu — must still be CHECKED, must still catch a broken clip.
 *   SKIPPED sin — must be UNCHECKED with the new reason, must still PUBLISH,
 *                 must return the buffer/duration/wordBoundaries the caller
 *                 destructures, and must not spend a whisper decode.
 *
 * Read-only. No TTS, no writes.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')
const { Client } = require('pg')
const veracity = require('../../services/audio-veracity.cjs')

const S3_BASE = `https://${(process.env.S3_BUCKET || 'ssi-audio-stage').trim()}.s3.${(process.env.AWS_REGION || 'eu-west-1').trim()}.amazonaws.com/`
const url = fs.readFileSync(path.join(__dirname, '..', '..', '.env.psql'), 'utf8').match(/DATABASE_URL=(\S+)/)[1]
const run = (c, a) => new Promise((res, rej) => execFile(c, a, { encoding: 'buffer', maxBuffer: 1 << 26 }, (e, so) => e ? rej(e) : res(so)))

const quiet = { info: () => {}, warn: () => {}, error: () => {}, log: () => {} }
let failures = 0
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

async function fetchClip (c, lang) {
  const { rows } = await c.query(`
    select id, text, language, duration_ms, s3_key from course_audio
    where language = $1 and s3_key is not null and origin is distinct from 'human'
      and role not in ('presentation') and role not like 'pod_%'
      and duration_ms between 1000 and 20000 and length(text) >= 15
      and text !~ '[(\\[]'
    limit 1`, [lang])
  if (!rows.length) throw new Error(`no ${lang} clip`)
  const row = rows[0]
  row.buffer = await run('curl', ['-sfS', S3_BASE + row.s3_key])
  return row
}

async function main () {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()

  const av = veracity.availability()
  console.log(`whisper available: ${av.available} (${av.bin})`)
  if (!av.available) { console.log('CANNOT VERIFY — whisper missing'); process.exit(2) }

  // ── GATED LANGUAGE ──────────────────────────────────────────────────────
  console.log('\n=== GATED: deu (decoder validated) ===')
  const de = await fetchClip(c, 'deu')
  console.log(`  clip ${de.id} "${de.text.slice(0, 50)}"`)

  const dv = await veracity.checkAudioVeracity(de.buffer, de.text, 'deu')
  check('checkAudioVeracity CHECKED it', dv.checked === true, `reason=${dv.reason} cer=${dv.cer}`)
  check('a real decode came back', typeof dv.decode === 'string' && dv.decode.length > 0, JSON.stringify(String(dv.decode).slice(0, 50)))

  // The gate must still CATCH a broken clip: same language, silent bytes.
  const silent = await run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', '2', '-f', 'mp3', 'pipe:1'])
  const sv = await veracity.checkAudioVeracity(silent, de.text, 'deu')
  check('still FAILS a silent clip in a gated language', sv.checked === true && sv.pass === false, `reason=${sv.reason}`)

  const stats1 = veracity.newStats()
  const g1 = await veracity.renderChecked({
    render: async () => ({ buffer: de.buffer, durationMs: de.duration_ms, wordBoundaries: [{ text: 'x' }] }),
    expectedText: de.text, language: 'deu', stats: stats1, logger: quiet,
  })
  check('renderChecked published the good deu clip', g1.published === true)
  check('  and counted it as CHECKED', stats1.checked === 1 && stats1.unchecked === 0, JSON.stringify(stats1))

  // ── SKIPPED LANGUAGE ────────────────────────────────────────────────────
  console.log('\n=== SKIPPED: sin (decoder NOT validated) ===')
  const si = await fetchClip(c, 'sin')
  console.log(`  clip ${si.id} "${si.text.slice(0, 50)}"`)

  const t0 = Date.now()
  const sv2 = await veracity.checkAudioVeracity(si.buffer, si.text, 'sin', { logger: quiet })
  const ms = Date.now() - t0
  check('checkAudioVeracity did NOT check it', sv2.checked === false, `reason=${sv2.reason}`)
  check('reason is the capability guard', sv2.reason === 'unchecked_decoder_not_validated')
  check('pass is null, never true', sv2.pass === null)
  check('language is reported', sv2.language === 'si')
  check('no whisper decode was spent', ms < 300, `${ms}ms (a real decode is ~1700ms)`)

  const stats2 = veracity.newStats()
  const g2 = await veracity.renderChecked({
    render: async () => ({ buffer: si.buffer, durationMs: si.duration_ms, wordBoundaries: [{ text: 'y' }] }),
    expectedText: si.text, language: 'sin', stats: stats2, logger: quiet,
  })
  check('renderChecked PUBLISHED (render path does not crash)', g2.published === true)
  check('  buffer survived for the caller to upload', Buffer.isBuffer(g2.buffer) && g2.buffer.length === si.buffer.length)
  check('  durationMs survived', g2.durationMs === si.duration_ms)
  check('  wordBoundaries survived', JSON.stringify(g2.wordBoundaries) === JSON.stringify([{ text: 'y' }]))
  check('  exactly one attempt, no re-render churn', g2.attempts === 1)
  check('  nothing quarantined', g2.quarantine === undefined)
  check('  counted as UNCHECKED, not passed', stats2.unchecked === 1 && stats2.passed === 0 && stats2.checked === 0, JSON.stringify(stats2))
  check('  the render report names the reason', veracity.formatStats(stats2).includes('unchecked_decoder_not_validated'),
    veracity.formatStats(stats2))

  // ── THE REGRESSION THAT STARTED THIS ────────────────────────────────────
  console.log('\n=== the clip that was blocked three times ===')
  const { rows: lego } = await c.query(
    `select id, text, language, s3_key, duration_ms from course_audio
     where course_code = 'eng_for_sin' and lego_id = 'S0225L01' and language = 'sin' limit 1`)
  if (!lego.length) {
    console.log('  ⚠️  GAP: no live sin clip for eng_for_sin S0225L01 to replay (it never published).')
    const { rows: any } = await c.query(
      `select text from course_legos where course_code='eng_for_sin' and lego_id='S0225L01' limit 1`)
    if (any.length) console.log(`     lego text on record: ${JSON.stringify(any[0].text)}`)
  } else {
    const l = lego[0]
    const before = veracity.verdictFromDecode('වවවවවවවවවවවව', l.text, 'si')
    check('the OLD path failed it', before.pass === false, before.reason)
    const after = await veracity.checkAudioVeracity(Buffer.from('x'), l.text, l.language, { logger: quiet })
    check('the NEW path skips rather than fails it', after.checked === false && after.pass === null, after.reason)
  }

  await c.end()
  console.log(`\n${failures === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`}`)
  process.exit(failures === 0 ? 0 : 1)
}
main().catch(e => { console.error(e); process.exit(1) })
