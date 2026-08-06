#!/usr/bin/env node
/**
 * audio-word-loss-scan — find clips that are MISSING WORDS, by listening to them.
 *
 * ── Why this exists, and why it is not the tail check ───────────────────────
 * The tail-integrity predictor (`queue --tails`) measures how fast a clip fades
 * from speech to silence. It is a good ORDERING and it found the original
 * amputations. It is the wrong SCOPE for a repair, measured 2026-08-06 on
 * deu_for_eng against a control group:
 *
 *   clips it FLAGGED     — final word missing in a large minority
 *   clips it PASSED      — final word ALSO missing in a substantial minority,
 *                          including "Ich werde morgen Deutsch sprechen" heard
 *                          as "ich werde morgen deutsch"
 *
 * Driving a re-render from it alone would both re-render thousands of healthy
 * clips and leave damaged ones on the course. So this tool measures the defect
 * itself: unprimed whisper on the deployed bytes, asking whether the words are
 * there. Same check the repair path already uses to VERIFY a clip — it should
 * also be what SELECTS them.
 *
 * ── It costs nothing ────────────────────────────────────────────────────────
 * Whisper runs locally. No TTS, no provider calls, no writes of any kind. The
 * only cost is our own CPU: ~1.7s/clip at 4 concurrency on an 8-core box, so a
 * 50,000-clip course is several hours. It is checkpointed and resumable —
 * re-run with the same --out and it picks up where it stopped.
 *
 * ── TRUNCATION, not mis-spelling ────────────────────────────────────────────
 * A clip counts as truncated only when the final word is absent AND the word
 * before it was heard. Whisper mis-spells ("effizient" for "effizienter"), and
 * counting that as damage would drown the signal. Stem-tolerant matching plus
 * the preceding-word requirement separates the two.
 *
 * Output feeds straight into `audio-repair.cjs propose --targets`.
 *
 *   node tools/audio-word-loss-scan.cjs <course> [--max-seed N] [--role R]
 *        [--concurrency 4] [--limit N] --out docs/audio-repair-<date>/<c>-wordloss.json
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')
const { createClient } = require('@supabase/supabase-js')
const veracity = require('../services/audio-veracity.cjs')

const argv = process.argv.slice(2)
const COURSE = argv.find(a => !a.startsWith('-'))
const flag = (n, d = null) => {
  const i = argv.indexOf('--' + n)
  return i === -1 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true)
}
if (!COURSE) {
  console.error('usage: audio-word-loss-scan <course> [--max-seed N] [--role R] [--concurrency N] [--limit N] --out FILE')
  process.exit(1)
}
const OUT = flag('out', `docs/audio-repair-2026-08-06/${COURSE}-wordloss.json`)
const CONCURRENCY = Number(flag('concurrency', 4))
const MAX_SEED = flag('max-seed') ? Number(flag('max-seed')) : null
const ROLE = flag('role')
const LIMIT = flag('limit') ? Number(flag('limit')) : null

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})
const BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const norm = s => String(s || '').toLowerCase().normalize('NFKD')
  .replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()

/** Stem-tolerant: whisper's spelling drift is not damage. */
function heardIn (word, heardWords) {
  if (!word) return true
  return heardWords.some(h => {
    if (h === word) return true
    if (word.length < 4) return false
    const a = word.slice(0, Math.max(4, word.length - 2))
    const b = h.slice(0, Math.max(4, h.length - 2))
    return h.startsWith(a) || word.startsWith(b)
  })
}

async function bytes (key) {
  const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const c = []
  for await (const x of r.Body) c.push(x)
  return Buffer.concat(c)
}

async function scanOne (row) {
  const buf = await bytes(row.s3_key)
  const v = await veracity.checkAudioVeracity(buf, row.text, row.language)
  if (v.checked !== true) {
    // "Could not verify" is NOT "verified". This is exactly the confusion that
    // let the amputations ship — it is recorded as unchecked, never as a pass.
    return { audioId: row.id, role: row.role, text: row.text, checked: false, reason: v.reason }
  }
  const heard = norm(v.decode).split(' ').filter(Boolean)
  const want = norm(row.text).split(' ').filter(Boolean)
  const last = want[want.length - 1] || null
  const prev = want.length >= 2 ? want[want.length - 2] : null
  const finalPresent = heardIn(last, heard)
  const truncated = !finalPresent && (prev ? heardIn(prev, heard) : true)
  const missing = want.filter(w => !heardIn(w, heard))
  return {
    audioId: row.id, role: row.role, text: row.text, durationMs: row.duration_ms,
    checked: true, truncated, finalWordPresent: finalPresent,
    expectedFinalWord: last, heardTail: heard.slice(-5).join(' '),
    missingWords: missing.slice(0, 8), missingCount: missing.length,
    cer: v.cer, veracityPass: v.pass,
  }
}

async function loadRows () {
  const COLUMNS = 'id, text, text_normalized, role, language, duration_ms, s3_key'
  let ids = null
  if (MAX_SEED) {
    ids = await require('../services/audio-repair.cjs')
      .seedScopedAudioIds({ courseCode: COURSE, maxSeedNumber: MAX_SEED })
  }
  const out = []
  if (ids) {
    for (let i = 0; i < ids.length; i += 200) {
      let q = sb.from('course_audio').select(COLUMNS)
        .eq('course_code', COURSE).in('id', ids.slice(i, i + 200))
      if (ROLE) q = q.eq('role', ROLE)
      const { data, error } = await q.limit(200)
      if (error) throw new Error(error.message)
      out.push(...(data || []))
    }
  } else {
    // Paged along text_normalized — the only index whose leading column is
    // course_code, so the only ordering Postgres can walk without a sort.
    const seen = new Set()
    let cursor = null
    for (;;) {
      let q = sb.from('course_audio').select(COLUMNS)
        .eq('course_code', COURSE).order('text_normalized', { ascending: true })
      if (ROLE) q = q.eq('role', ROLE)
      if (cursor !== null) q = q.gte('text_normalized', cursor)
      const { data, error } = await q.limit(1000)
      if (error) throw new Error(error.message)
      if (!data || !data.length) break
      let fresh = 0
      for (const r of data) { if (!seen.has(r.id)) { seen.add(r.id); out.push(r); fresh++ } }
      const next = data[data.length - 1].text_normalized
      if (!fresh || next === cursor || data.length < 1000) break
      cursor = next
    }
  }
  return out.filter(r => r.s3_key && r.duration_ms)
}

/**
 * Tom's ruling, 2026-08-06: "we should prioritise LEGOS - before cycles - a
 * missing clip in a LEGO basically destroys the learning journey / a missing
 * clip in a cycle makes little difference", and a LEGO means the full triple:
 * "intro + voice 1 + voice 2".
 *
 * The scan is hours long and checkpointed, so ORDER is what makes a partial
 * result useful: everything reachable from course_legos goes first, so the
 * clips that break the learning journey are judged in the first minutes rather
 * than the last hour.
 */
async function legoFirst (rows) {
  const lego = new Set()
  let from = 0
  for (;;) {
    const { data, error } = await sb.from('course_legos')
      .select('presentation_audio_id, target1_audio_id, target2_audio_id, known_audio_id')
      .eq('course_code', COURSE).order('lego_id').range(from, from + 999)
    if (error || !data) break
    for (const l of data) {
      for (const x of [l.presentation_audio_id, l.target1_audio_id, l.target2_audio_id, l.known_audio_id]) {
        if (x) lego.add(x)
      }
    }
    if (data.length < 1000) break
    from += 1000
  }
  const a = [], b = []
  for (const r of rows) (lego.has(r.id) ? a : b).push(r)
  console.log(`LEGO-first: ${a.length} LEGO clip(s) ahead of ${b.length} other clip(s)`)
  return a.concat(b)
}

;(async () => {
  veracity.announceStatus(console)
  const av = require('../services/audio-veracity.cjs')
  let rows = await loadRows()
  rows = await legoFirst(rows)
  if (LIMIT) rows = rows.slice(0, LIMIT)
  console.log(`${COURSE}: ${rows.length} rendered clip(s) to listen to`)

  // Resume: keep whatever a previous run already judged.
  let done = {}
  if (fs.existsSync(OUT)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'))
      for (const r of prev.results || []) done[r.audioId] = r
      console.log(`resuming — ${Object.keys(done).length} already scanned`)
    } catch {}
  }
  const todo = rows.filter(r => !done[r.id])
  console.log(`${todo.length} left`)

  const started = Date.now()
  let next = 0, finished = 0
  const save = () => {
    const results = Object.values(done)
    const checked = results.filter(r => r.checked)
    const trunc = checked.filter(r => r.truncated)
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, JSON.stringify({
      course: COURSE, scannedAt: new Date().toISOString(),
      total: rows.length, scanned: results.length,
      checked: checked.length, unchecked: results.length - checked.length,
      truncated: trunc.length,
      truncatedPct: checked.length ? +(trunc.length / checked.length * 100).toFixed(2) : null,
      // propose --targets reads this shape
      items: trunc.map(r => ({ audioId: r.audioId, id: r.audioId, role: r.role, text: r.text })),
      results,
    }, null, 2))
  }

  const worker = async () => {
    for (;;) {
      const i = next++
      if (i >= todo.length) return
      const r = todo[i]
      try { done[r.id] = await scanOne(r) } catch (e) { done[r.id] = { audioId: r.id, error: e.message } }
      finished++
      if (finished % 100 === 0) {
        const rate = finished / ((Date.now() - started) / 1000)
        const eta = Math.round((todo.length - finished) / Math.max(rate, 0.01) / 60)
        const t = Object.values(done).filter(x => x.truncated).length
        process.stderr.write(`\r  ${finished}/${todo.length} (${rate.toFixed(1)}/s, ~${eta}m left) truncated so far: ${t}   `)
        save()
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker))
  save()
  const results = Object.values(done)
  const checked = results.filter(r => r.checked)
  const trunc = checked.filter(r => r.truncated)
  console.log(`\n\n${COURSE}`)
  console.log(`  scanned    ${results.length}`)
  console.log(`  checked    ${checked.length} (unchecked ${results.length - checked.length} — NOT passes)`)
  console.log(`  TRUNCATED  ${trunc.length} (${checked.length ? (trunc.length / checked.length * 100).toFixed(2) : 0}%)`)
  console.log(`\n-> ${OUT}`)
})()
