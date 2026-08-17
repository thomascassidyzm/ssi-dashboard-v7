#!/usr/bin/env node
/**
 * A-136 — prove the swapped clips are actually FEMKE, not merely new bytes.
 *
 * "It sounds different" is not evidence and neither is "the row says Femke". The
 * row says whatever the swap wrote; the question is whether the BYTES the learner
 * now fetches carry Femke's voice. So this measures median f0 on three
 * populations and checks the swapped clips land on the Femke reference, not the
 * Noor one — the same instrument the T-21 gender forensics used to settle
 * Lieke 183.9 Hz vs Bas 141.6 Hz.
 *
 * The three populations:
 *   A. control-noor  — superseded Noor objects, still on S3 (make-before-break)
 *   B. control-femke — Femke clips this pass never touched
 *   C. swapped       — what the learner fetches now
 *
 * If C sits on B and away from A, the swap moved the voice. If C sits on A, the
 * swap wrote a row and changed nothing that matters, and I need to know that
 * before telling anyone this is done.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
process.env.PHASE8_NO_LISTEN = '1'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { GetObjectCommand } = require('@aws-sdk/client-s3')
const p8 = require('../../services/phases/phase8-audio-v13.cjs')

const PSQL = path.join(process.env.HOME, '.local/pg17/bin/psql')
const DB = process.env.DATABASE_URL
const N = parseInt(process.argv[2] || '12', 10)

function q (sql) {
  return JSON.parse(execFileSync(PSQL, [DB, '-At', '-c',
    `select coalesce(json_agg(t), '[]'::json) from (${sql}) t`], { maxBuffer: 1 << 28 }).toString())
}

/**
 * Median f0 by autocorrelation over voiced frames. Deliberately simple and
 * self-contained: the claim it supports is "these two populations are different
 * speakers", which needs a robust central tendency, not a pitch tracker.
 */
function medianF0 (file) {
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '16000',
    '-f', 's16le', '-'], { maxBuffer: 1 << 28 })
  const n = Math.floor(pcm.length / 2)
  const s = new Float32Array(n)
  for (let i = 0; i < n; i++) s[i] = pcm.readInt16LE(i * 2) / 32768
  const frame = 1024; const hop = 512
  const minLag = Math.floor(16000 / 400); const maxLag = Math.floor(16000 / 70)
  const f0s = []
  for (let start = 0; start + frame < n; start += hop) {
    let energy = 0
    for (let i = 0; i < frame; i++) energy += s[start + i] * s[start + i]
    const rms = Math.sqrt(energy / frame)
    if (rms < 0.02) continue // unvoiced / silence
    let best = 0; let bestLag = 0
    for (let lag = minLag; lag <= maxLag; lag++) {
      let acf = 0
      for (let i = 0; i + lag < frame; i++) acf += s[start + i] * s[start + i + lag]
      acf /= (frame - lag)
      if (acf > best) { best = acf; bestLag = lag }
    }
    if (bestLag && best / (energy / frame) > 0.3) f0s.push(16000 / bestLag)
  }
  if (f0s.length < 5) return null
  f0s.sort((a, b) => a - b)
  return { f0: +f0s[Math.floor(f0s.length / 2)].toFixed(1), frames: f0s.length }
}

async function pull (key, dest) {
  const r = await p8.s3.send(new GetObjectCommand({ Bucket: p8.S3_BUCKET, Key: key }))
  fs.writeFileSync(dest, Buffer.concat(await r.Body.toArray()))
}

const median = a => { const b = a.slice().sort((x, y) => x - y); return +b[Math.floor(b.length / 2)].toFixed(1) }

;(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'a136-vid-'))

  const swapped = q(`select a.id, a.s3_key as new_key, r.previous_s3_key as old_key
    from course_audio a join course_audio_revisions r
      on r.audio_id = a.id and r.source = 'a136-nld-noor-drop'
    where a.course_code = 'nld_for_eng' and a.duration_ms > 1500
    order by a.id limit ${N}`)
  // Femke clips this pass never touched — the reference for "is this Femke?"
  const femke = q(`select a.id, a.s3_key from course_audio a
    where a.course_code = 'nld_for_eng' and a.voice_id in ('58d27475085e','xai_58d27475085e')
      and a.duration_ms > 1500
      and not exists (select 1 from course_audio_revisions r
                      where r.audio_id = a.id and r.source = 'a136-nld-noor-drop')
    order by a.id limit ${N}`)

  const groups = { control_noor: [], control_femke: [], swapped: [] }
  for (const s of swapped) {
    const a = path.join(tmp, `old-${s.id}.mp3`); const b = path.join(tmp, `new-${s.id}.mp3`)
    await pull(s.old_key, a); await pull(s.new_key, b)
    const fa = medianF0(a); const fb = medianF0(b)
    if (fa) groups.control_noor.push(fa.f0)
    if (fb) groups.swapped.push(fb.f0)
  }
  for (const f of femke) {
    const d = path.join(tmp, `fem-${f.id}.mp3`)
    await pull(f.s3_key, d)
    const x = medianF0(d)
    if (x) groups.control_femke.push(x.f0)
  }

  const out = {}
  for (const [k, v] of Object.entries(groups)) {
    out[k] = { n: v.length, median_f0_hz: v.length ? median(v) : null,
      min: v.length ? Math.min(...v) : null, max: v.length ? Math.max(...v) : null }
  }
  const dNoor = Math.abs(out.swapped.median_f0_hz - out.control_noor.median_f0_hz)
  const dFemke = Math.abs(out.swapped.median_f0_hz - out.control_femke.median_f0_hz)
  out.verdict = {
    swapped_is_closer_to: dFemke < dNoor ? 'FEMKE' : 'NOOR',
    hz_from_femke: +dFemke.toFixed(1), hz_from_noor: +dNoor.toFixed(1),
    pass: dFemke < dNoor,
  }
  console.log(JSON.stringify(out, null, 2))
  fs.writeFileSync(path.join(__dirname, '../../docs/a108/a136-voice-identity.json'), JSON.stringify(out, null, 2))
  if (!out.verdict.pass) process.exitCode = 1
})().catch(e => { console.error(e.stack || e.message); process.exit(1) })
