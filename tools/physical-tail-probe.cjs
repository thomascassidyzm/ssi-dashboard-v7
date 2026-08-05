#!/usr/bin/env node
/**
 * physical-tail-probe.cjs — independent file evidence, no veracity tooling involved.
 *
 * WHY. Every other check in this programme is either metadata (a DB column saying
 * "repaired") or a log line (a claim that a code branch executed). Neither says
 * anything about the bytes a learner actually hears. This fetches the real S3
 * object, decodes it, and measures the tail — the check the adversarial verifier
 * proposed and could not run.
 *
 * WHAT IT MEASURES, per clip:
 *   durationSec   ffprobe duration of the decoded file
 *   tailRms       RMS over the final TAIL_MS (default 50 ms)
 *   bodyRms       RMS over the whole clip
 *   tailRatioDb   20*log10(tailRms/bodyRms)
 *
 * HOW TO READ IT. A natural ending decays: the final 50 ms sits well below the
 * body level, so tailRatioDb is strongly negative. An abrupt cut leaves speech
 * energy running right up to the last sample, so tailRatioDb approaches or
 * exceeds 0 dB. CUT_DB (default -6) is the line between them.
 *
 * ⚠️ This is a TAIL-SHAPE test. It detects a clip that stops mid-signal. It does
 * NOT detect a clip that is missing a word but happens to end on a decayed
 * boundary, and it says nothing whatsoever about pronunciation. It is corroborating
 * physical evidence for the acoustic decoder, never a replacement for it.
 *
 * Usage:
 *   node scripts/ftj-2026-08-05/physical-tail-probe.cjs <course> --ids <path.json> [--sample 30] [--out <path>]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const { createClient } = require('@supabase/supabase-js')
const run = promisify(execFile)

const argv = process.argv.slice(2)
const arg = (f, d = null) => { const i = argv.indexOf(f); return i !== -1 && argv[i + 1] ? argv[i + 1] : d }
const COURSE = argv[0] && !argv[0].startsWith('--') ? argv[0] : null
const IDS_PATH = arg('--ids')
const SAMPLE = Number(arg('--sample', 0)) || 0
const OUT = arg('--out', `/tmp/${COURSE}-physical-tail-probe.json`)
const TAIL_MS = Number(arg('--tail-ms', 50))
const CUT_DB = Number(arg('--cut-db', -6))
const CONC = Number(arg('--concurrency', 4))

if (!COURSE || !IDS_PATH) {
  console.error('usage: physical-tail-probe.cjs <course> --ids <path.json> [--sample N]')
  process.exit(1)
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY)

// Same convention as tools/audio-veracity-repair.cjs:103 — keep these in step.
const S3_BASE = `https://${(process.env.S3_BUCKET || 'ssi-audio-stage').trim()}.s3.${(process.env.AWS_REGION || 'eu-west-1').trim()}.amazonaws.com/`

// Deterministic sampler — no Math.random, so a re-run probes the same clips and
// the numbers in the report can be reproduced.
function stride (arr, n) {
  if (!n || n >= arr.length) return arr
  const step = arr.length / n
  const out = []
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)])
  return out
}

async function probeOne (row, tmpDir) {
  const url = row.s3_key.startsWith('http') ? row.s3_key : S3_BASE + row.s3_key
  const local = path.join(tmpDir, `${row.id}.mp3`)
  try {
    await run('curl', ['-sfS', '-o', local, url])
  } catch (e) {
    return { id: row.id, ok: false, error: `fetch failed: ${(e.stderr || e.message).trim().slice(0, 120)}`, url }
  }

  const { stdout: dur } = await run('/usr/bin/ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', local
  ])
  const durationSec = parseFloat(dur.trim())
  if (!isFinite(durationSec) || durationSec <= 0) {
    fs.unlinkSync(local)
    return { id: row.id, ok: false, error: 'undecodable' }
  }

  const rms = async (extraFilters) => {
    const { stderr } = await run('/usr/bin/ffmpeg', [
      '-v', 'info', '-i', local, '-af', `${extraFilters}astats=metadata=1:reset=0`, '-f', 'null', '-'
    ])
    const m = [...stderr.matchAll(/RMS level dB:\s*(-?[\d.]+|-inf)/g)]
    if (!m.length) return null
    const v = m[m.length - 1][1]
    return v === '-inf' ? -120 : parseFloat(v)
  }

  const bodyDb = await rms('')
  const tailStart = Math.max(0, durationSec - TAIL_MS / 1000)
  const tailDb = await rms(`atrim=start=${tailStart.toFixed(4)},asetpts=PTS-STARTPTS,`)
  fs.unlinkSync(local)

  const tailRatioDb = (tailDb == null || bodyDb == null) ? null : +(tailDb - bodyDb).toFixed(2)
  return {
    id: row.id,
    text: row.text,
    role: row.role,
    durationSec: +durationSec.toFixed(3),
    bodyDb, tailDb, tailRatioDb,
    verdict: tailRatioDb == null ? 'unknown' : (tailRatioDb >= CUT_DB ? 'ABRUPT_CUT' : 'natural_decay'),
    ok: true
  }
}

;(async () => {
  const allIds = JSON.parse(fs.readFileSync(IDS_PATH, 'utf8'))
  const ids = stride(allIds, SAMPLE)
  console.log(`physical-tail-probe — ${COURSE}`)
  console.log(`  ${allIds.length} ids in list, probing ${ids.length} (deterministic stride sample)`)
  console.log(`  tail window ${TAIL_MS}ms, cut threshold ${CUT_DB}dB relative to body RMS\n`)

  const rows = []
  for (let i = 0; i < ids.length; i += 500) {
    const { data, error } = await supabase
      .from('course_audio').select('id,text,role,s3_key').in('id', ids.slice(i, i + 500))
    if (error) throw new Error(`supabase: ${error.message}`)
    rows.push(...(data || []))
  }
  console.log(`  ${rows.length} rows resolved from course_audio (${ids.length - rows.length} missing)\n`)

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tailprobe-'))
  const results = []
  let next = 0
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (next < rows.length) {
      const row = rows[next++]
      try { results.push(await probeOne(row, tmpDir)) } catch (e) { results.push({ id: row.id, ok: false, error: e.message }) }
      if (results.length % 10 === 0) process.stdout.write(`  ${results.length}/${rows.length} probed\r`)
    }
  }))
  fs.rmSync(tmpDir, { recursive: true, force: true })

  const good = results.filter(r => r.ok)
  const cut = good.filter(r => r.verdict === 'ABRUPT_CUT')
  const nat = good.filter(r => r.verdict === 'natural_decay')
  const failed = results.filter(r => !r.ok)

  console.log(`\n\nPROBED ${results.length}: ${good.length} decoded, ${failed.length} could not be probed`)
  console.log(`  natural decay (tail well below body): ${nat.length}`)
  console.log(`  ABRUPT CUT (tail at/above ${CUT_DB}dB of body): ${cut.length}`)
  if (good.length) {
    const s = good.map(r => r.tailRatioDb).filter(v => v != null).sort((a, b) => a - b)
    console.log(`  tailRatioDb min/median/max: ${s[0]} / ${s[Math.floor(s.length / 2)]} / ${s[s.length - 1]}`)
    const d = good.map(r => r.durationSec).sort((a, b) => a - b)
    console.log(`  duration min/median/max: ${d[0]}s / ${d[Math.floor(d.length / 2)]}s / ${d[d.length - 1]}s`)
  }
  if (cut.length) {
    console.log(`\n  cuts:`)
    for (const r of cut.slice(0, 20)) console.log(`    ${r.tailRatioDb}dB  ${r.durationSec}s  ${r.role}  "${r.text}"`)
  }
  if (failed.length) console.log(`\n  probe failures: ${failed.slice(0, 5).map(f => f.error).join(', ')}`)

  fs.writeFileSync(OUT, JSON.stringify(results, null, 2))
  console.log(`\nresults -> ${OUT}`)
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
