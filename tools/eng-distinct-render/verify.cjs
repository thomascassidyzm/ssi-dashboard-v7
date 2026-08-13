#!/usr/bin/env node
/**
 * Verify every clip this run produced, BEFORE anything is relinked (make-before-break
 * step 2). Four independent checks per clip, none of which is "the row exists":
 *
 *  1. ALIVE — real bytes in the bucket. HEAD the object and record Content-Length; a
 *     row is a claim about S3, not evidence of it (phase8's own comment, line 126).
 *  2. VOICE — the DEFINITIVE check, `voice_id`, not pitch. The 2026-08-13 pod-0 fill
 *     verification established this: the clone/Olivia f0 bands OVERLAP at 148-176Hz, so
 *     pitch alone has an ambiguity zone and cannot decide a borderline clip. An Azure
 *     fallback, which is the substitution that actually happens, records an Azure voice
 *     id — so voice_id catches it with no ambiguity at all.
 *  3. NOT TRUNCATED — speech-rate outlier, the same method as tools/pod0-fill/verify.cjs:
 *     chars per second against the run's own distribution. A clip cut short reads as an
 *     impossibly fast speaker.
 *  4. DECODABLE — ffprobe actually decodes the bytes and reports a duration that agrees
 *     with the stored duration_ms. A file that HEADs 200 and will not decode is dead.
 *
 * Read-only. Writes verify-results.json.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execFileSync } = require('child_process')
const { q } = require('./db.cjs')

const BUCKET = process.env.S3_BUCKET, REGION = process.env.AWS_REGION || 'eu-west-1'
const url = k => `https://${BUCKET}.s3.${REGION}.amazonaws.com/${k}`
const APPROVED = { gfzdpspr5fdp: 'clone(M)', bedd6226: 'Olivia(F)' }
const CONC = 8

const rendered = fs.readFileSync(path.join(__dirname, 'render-log.jsonl'), 'utf8')
  .split('\n').filter(Boolean).map(JSON.parse).filter(r => r.ok && !r.skipped)
console.log('clips rendered by this run:', rendered.length)

/**
 * One retry on a TRANSPORT failure, and only on that. A curl exit code is not a verdict
 * about the clip — the 2026-08-13 re-verification run died on its 655th object with
 * curl 35 (SSL connect error) and threw away a complete pass over the estate. A dead
 * object still answers 404/200 and is judged on the answer; a socket that never opened
 * is asked again. Two failures in a row still throw, because a check that swallows its
 * own inability to run is the bug this whole pipeline exists to avoid.
 */
const retryTransport = (fn) => {
  try { return fn() } catch (e) { return fn() }
}

const head = u => retryTransport(() => {
  const out = execFileSync('curl', ['-sI', '-m', '30', u]).toString()
  const status = Number((out.match(/HTTP\/[\d.]+ (\d{3})/) || [])[1] || 0)
  const len = Number((out.match(/[Cc]ontent-[Ll]ength: (\d+)/) || [])[1] || 0)
  return { status, len }
})

function probe(u) {
  const tmp = path.join(os.tmpdir(), 'edr-' + Math.abs(hash(u)) + '.mp3')
  try {
    retryTransport(() => execFileSync('curl', ['-s', '-m', '60', '-o', tmp, u]))
    const bytes = fs.statSync(tmp).size
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', tmp], { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
    return { bytes, decoded_ms: Math.round(Number(out) * 1000) }
  } finally { try { fs.unlinkSync(tmp) } catch (_) {} }
}
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h }

;(async () => {
  const ids = rendered.map(r => r.audio_id)
  const dbRows = []
  for (let i = 0; i < ids.length; i += 300) {
    dbRows.push(...await q(
      `SELECT id, course_code, text, language, role, voice_id, s3_key, duration_ms, text_stripped,
              coalesce(audio_revision,1) AS rev, origin
       FROM course_audio WHERE id = ANY($1)`, [ids.slice(i, i + 300)]))
  }
  const byId = new Map(dbRows.map(r => [r.id, r]))
  console.log('rows found in course_audio:', dbRows.length, 'of', ids.length)

  const results = []
  let n = 0
  await Promise.all(Array.from({ length: CONC }, async () => {
    for (;;) {
      const i = n++
      if (i >= rendered.length) return
      const r = rendered[i]
      const db = byId.get(r.audio_id)
      const res = { audio_id: r.audio_id, text: r.text, voice: r.voice }
      if (!db) { res.fail = 'no course_audio row'; results.push(res); continue }
      const vb = String(db.voice_id || '').replace(/^(xai_|azure_)/, '')
      res.voice_id = db.voice_id
      res.voice_ok = vb === r.voice && !!APPROVED[vb]
      res.s3_key = db.s3_key
      const h = head(url(db.s3_key))
      res.http = h.status; res.bytes = h.len
      res.alive = h.status === 200 && h.len > 2048   // 2,016b = the xAI silent-stub size
      try {
        const p = probe(url(db.s3_key))
        res.decoded_ms = p.decoded_ms
        res.decodable = p.decoded_ms > 0
        res.duration_ms = db.duration_ms
        res.duration_agrees = Math.abs(p.decoded_ms - db.duration_ms) <= Math.max(250, db.duration_ms * 0.1)
      } catch (e) { res.decodable = false; res.decode_error = String(e.message).slice(0, 120) }
      res.chars = (db.text || '').length
      res.cps = res.decoded_ms ? +(res.chars / (res.decoded_ms / 1000)).toFixed(2) : null
      results.push(res)
      if (results.length % 50 === 0) console.log(`  ...${results.length}/${rendered.length}`)
    }
  }))

  // Speech-rate outliers: a truncated clip says fewer characters than it should in the
  // time it has, i.e. an impossibly HIGH chars-per-second. Flagged per voice, against
  // this run's own distribution, because the two voices pace differently.
  for (const v of Object.keys(APPROVED)) {
    const set = results.filter(r => r.voice === v && r.cps)
    if (set.length < 10) continue
    const cps = set.map(r => r.cps).sort((a, b) => a - b)
    const med = cps[Math.floor(cps.length / 2)]
    const p95 = cps[Math.floor(cps.length * 0.95)]
    console.log(`${APPROVED[v]} cps: median ${med}, p95 ${p95}, max ${cps[cps.length - 1]} (n=${set.length})`)
    for (const r of set) r.rate_outlier = r.cps > med * 1.6
  }

  const bad = results.filter(r => r.fail || !r.alive || !r.voice_ok || !r.decodable
    || r.duration_agrees === false || r.rate_outlier)
  console.log('\nVERIFIED', results.length - bad.length, 'of', results.length)
  console.log('  alive       ', results.filter(r => r.alive).length)
  console.log('  right voice ', results.filter(r => r.voice_ok).length)
  console.log('  decodable   ', results.filter(r => r.decodable).length)
  console.log('  total bytes ', results.reduce((a, r) => a + (r.bytes || 0), 0).toLocaleString())
  if (bad.length) console.log('\nPROBLEMS:', JSON.stringify(bad.slice(0, 40), null, 1))
  fs.writeFileSync(path.join(__dirname, 'verify-results.json'), JSON.stringify(results, null, 1))
  fs.writeFileSync(path.join(__dirname, 'verify-problems.json'), JSON.stringify(bad, null, 1))
})().catch(e => { console.error(e); process.exit(1) })
