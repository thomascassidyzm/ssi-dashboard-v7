#!/usr/bin/env node
/**
 * nld-vregister-decode-verify-2026-08-14.cjs — adversarial second opinion on the
 * clips the render pass flagged.
 *
 * WHY. `alstublieft` and `alsjeblieft` are near-homophones and whisper flips
 * between them freely; a free decode that comes back `alsjeblieft` is therefore
 * NOT evidence the clip speaks the informal form. So the first decode cannot
 * settle it, and neither can a second one shaped the same way.
 *
 * The test that CAN settle it is an adversarial prime: hand whisper an initial
 * prompt containing the SUPERSEDED text, biasing it toward the answer we do not
 * want, and decode again. A clip that still yields the polite form under a prime
 * pulling the other way is speaking the polite form. A clip that flips to the
 * informal form under that prime has told us nothing new — the prime is doing
 * the work — so it stays a suspect and gets an explicit ear-check gap in the
 * report rather than a clean bill of health.
 *
 * Read-only. Renders nothing, writes no DB row.
 *
 *   node tools/pods/nld-vregister-decode-verify-2026-08-14.cjs <applied-log.json>
 */

require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') })
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { createClient } = require('@supabase/supabase-js')

const S3_BASE = 'https://ssi-audio-stage.s3.eu-west-1.amazonaws.com'
const MODEL = path.join(process.env.HOME, '.local/share/whisper-models/ggml-medium.bin')
const LOG = process.argv[2] || path.join(__dirname, '../../docs/a108/nld-vregister-render-applied-log.json')

function decode (wav, out, prompt) {
  const args = ['-m', MODEL, '-l', 'nl', '-t', '4', '-np', '-oj', '-of', out, '-f', wav]
  if (prompt) args.push('--prompt', prompt)
  execFileSync(path.join(process.env.HOME, '.local/bin/whisper-cli'), args, { stdio: 'ignore' })
  const j = JSON.parse(fs.readFileSync(`${out}.json`, 'utf8'))
  return (j.transcription || []).map(s => s.text).join(' ').trim()
}

const log = JSON.parse(fs.readFileSync(LOG, 'utf8'))
const suspects = new Set((log.decode_suspects || []).map(s => s.clip))
const targets = log.plan.filter(p => suspects.has(p.new_clip_id))
if (!targets.length) { console.log('no decode suspects in the log — nothing to verify'); process.exit(0) }

;(async () => {
// The s3 key is NOT derivable from the clip id: generatePodAudio mints its own
// uuid for the object and lets the DB assign the row's id, so the two differ.
// Ask the table.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const { data: keyRows, error } = await supabase.from('course_audio')
  .select('id, s3_key').in('id', targets.map(p => p.new_clip_id))
if (error) { console.error('load s3 keys: ' + error.message); process.exit(1) }
const keyOf = Object.fromEntries(keyRows.map(r => [r.id, r.s3_key]))

const tmp = fs.mkdtempSync('/tmp/nld-adv-')
const results = []
for (const p of targets) {
  const src = path.join(tmp, 'a.mp3'), wav = path.join(tmp, 'a.wav')
  const key = keyOf[p.new_clip_id]
  if (!key) { console.log(`${p.new_clip_id.slice(0, 8)}: no s3_key in course_audio`); continue }
  try {
    execFileSync('curl', ['-sf', `${S3_BASE}/${key}`, '-o', src])
  } catch { console.log(`${p.new_clip_id.slice(0, 8)}: NOT FETCHABLE at ${key}`); continue }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-ar', '16000', '-ac', '1', wav])

  // prime toward the SUPERSEDED wording — the answer we do not want
  const adversarial = decode(wav, path.join(tmp, 'adv'), p.before)
  const heard = adversarial.toLowerCase()
  const gained = p.tokens.gained.filter(w => heard.includes(w))
  const lost = p.tokens.lost.filter(w => new RegExp(`\\b${w}\\b`).test(heard))

  // survives the adversarial prime = the clip really does speak the polite form
  const verdict = gained.length && !lost.length ? 'CONFIRMED-POLITE'
    : lost.length ? 'STILL-SUSPECT' : 'INCONCLUSIVE'
  results.push({
    clip: p.new_clip_id,
    expected: p.after,
    free_decode: p.transcript,
    adversarial_prompt: p.before,
    adversarial_decode: adversarial,
    gained_heard: gained,
    superseded_heard: lost,
    verdict,
  })
  console.log(`${p.new_clip_id.slice(0, 8)} ${verdict}\n    expect: ${p.after}\n    free  : ${p.transcript}\n    primed: ${adversarial}`)
}
fs.rmSync(tmp, { recursive: true, force: true })

const out = path.join(__dirname, '../../docs/a108/nld-vregister-decode-verify-log.json')
fs.writeFileSync(out, JSON.stringify({
  method: 'whisper ggml-medium, -l nl, initial prompt = the SUPERSEDED text (adversarial prime)',
  results,
}, null, 2) + '\n')
console.log(`\n${results.filter(r => r.verdict === 'CONFIRMED-POLITE').length}/${results.length} confirmed polite under an adversarial prime`)
console.log(`log: ${out}`)
})().catch((e) => { console.error('ERR:', e.stack || e.message); process.exit(1) })
