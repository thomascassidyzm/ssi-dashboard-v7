#!/usr/bin/env node
/**
 * CHECK-AFTER for clips phase8 /generate published with the phonology gate
 * DEFERRED (`phonologyGate: false`). Kai, 2026-09-25 22:28Z, eng_for_hin:
 * "voice now, check after" — the course goes audible in hours, and this runs
 * the SAME check the inline gate would have run, over every clip on the ledger.
 *
 *   node tools/course-optimization/phonology-check-after.cjs <course> [--concurrency 2] [--reroll]
 *
 * The check is the gate's own: services/tts-service.cjs detectSpokenLanguage
 * (whisper-small auto-detect) against phonologySuspects — a clip steered to a
 * non-English language that whisper hears as English FAILS. English-steered
 * clips are skipped and counted: the inline gate never checks them either, so
 * deferring it cost them nothing.
 *
 * --reroll re-voices each failure through phase8 /regenerate-single, which
 * runs WITH the gate on (its default), keeps the clip's own gendered voice,
 * and swaps the bytes in place only after the new render passed
 * (make-before-break). A re-roll the gate still refuses leaves the ungated take
 * live and is reported as `reroll_refused` — never silenced, never unlinked.
 *
 * Resumable: results append to the evidence store; a re-run skips every
 * audio_id already checked. Never disables anything and never deletes a clip.
 */
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })
const { evidencePath } = require('../lib/evidence-path.cjs')

const args = process.argv.slice(2)
const course = args.find(a => !a.startsWith('--'))
if (!course) { console.error('usage: phonology-check-after.cjs <course> [--concurrency N] [--reroll]'); process.exit(2) }
const flag = (n) => args.includes(n)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const CONC = Number(opt('--concurrency', 2))
process.env.XAI_PHONO_CONCURRENCY = String(CONC) // detectSpokenLanguage's own bound
const { detectSpokenLanguage, phonologySuspects } = require('../../services/tts-service.cjs')
const { checkAudioVeracity } = require('../../services/audio-veracity.cjs')

const P8 = process.env.PHASE8_URL || 'http://localhost:3465'
const S3_BASE = `https://${(process.env.S3_BUCKET || 'ssi-audio-stage').trim()}.s3.${(process.env.AWS_REGION || 'eu-west-1').trim()}.amazonaws.com/`
const LEDGER = evidencePath(`phonology-deferred/${course}.jsonl`)
const RESULTS = process.env.CHECK_AFTER_RESULTS || evidencePath(`phonology-deferred/${course}.checked.jsonl`)

/** ISO 639-3/2 or BCP-47 → the base code the gate compares against. */
function baseLang (l) {
  const s = String(l || '').toLowerCase().split('-')[0]
  return ({ hin: 'hi', eng: 'en', ita: 'it', fra: 'fr', deu: 'de', spa: 'es', por: 'pt', jpn: 'ja', kor: 'ko', zho: 'zh', ara: 'ar' })[s] || s
}

const readJsonl = (f) => fs.existsSync(f)
  ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  : []

async function main () {
  const ledger = readJsonl(LEDGER)
  const byId = new Map()
  for (const r of ledger) if (r.audio_id) byId.set(r.audio_id, r) // last write wins
  const done = new Set(readJsonl(RESULTS).map(r => r.audio_id))
  const todo = [...byId.values()].filter(r => !done.has(r.audio_id)).slice(0, Number(opt('--limit', Infinity)))
  console.log(`[check-after] ${course}: ledger ${ledger.length} lines, ${byId.size} clips, ${done.size} already checked, ${todo.length} to go (whisper x${CONC})`)

  const tally = { pass: 0, fail: 0, unmeasured: 0, skipped_english: 0, rerolled: 0, reroll_refused: 0 }
  let n = 0
  const out = fs.createWriteStream(RESULTS, { flags: 'a' })
  const write = (o) => out.write(JSON.stringify({ at: new Date().toISOString(), ...o }) + '\n')

  async function one (r) {
    const suspects = phonologySuspects('cartesia', { locale: baseLang(r.language), phonologyGate: true })
    if (!suspects) { tally.skipped_english++; write({ audio_id: r.audio_id, role: r.role, outcome: 'skipped_english' }); return }
    let buf
    try {
      const res = await fetch(S3_BASE + r.s3_key)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      buf = Buffer.from(await res.arrayBuffer())
    } catch (e) {
      tally.unmeasured++; write({ audio_id: r.audio_id, role: r.role, outcome: 'unmeasured', error: `fetch: ${e.message}` }); return
    }
    const heard = await detectSpokenLanguage(buf)
    if (!heard) { tally.unmeasured++; write({ audio_id: r.audio_id, role: r.role, outcome: 'unmeasured' }); return }
    if (!suspects.has(heard)) { tally.pass++; write({ audio_id: r.audio_id, role: r.role, heard, outcome: 'pass' }); return }
    tally.fail++
    const rec = { audio_id: r.audio_id, role: r.role, voice_id: r.voice_id, text: r.text, heard, outcome: 'fail' }
    // SECOND OPINION on every failure, not a veto: the veracity check decodes the
    // clip in its steered language and compares it with the text. Language
    // auto-detect on a one-word clip is known to hear English in good Hindi
    // (the 9 refusals of the gated run were all single words), so the report
    // separates "detector says English, transcript matches" from a real miss.
    // The re-roll below happens either way.
    try {
      const v = await checkAudioVeracity(buf, r.tts_text || r.text, r.language, { meta: { courseCode: course, role: r.role } })
      rec.veracity = { checked: v.checked, pass: v.pass, reason: v.reason, cer: v.cer, decode: v.decode ? String(v.decode).slice(0, 80) : null }
    } catch (e) { rec.veracity = { checked: false, error: e.message } }
    if (flag('--reroll')) {
      try {
        const res = await fetch(`${P8}/regenerate-single/${course}/${r.audio_id}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-service-name': 'phonology-check-after' },
          body: JSON.stringify({ reuse: false }),
        })
        const j = await res.json().catch(() => ({}))
        if (res.ok && j.success) { tally.rerolled++; rec.reroll = { ok: true, newS3Key: j.newS3Key, revision: j.revision } }
        else { tally.reroll_refused++; rec.reroll = { ok: false, error: String(j.error || res.status).slice(0, 300) } }
      } catch (e) { tally.reroll_refused++; rec.reroll = { ok: false, error: e.message } }
    }
    write(rec)
  }

  // A small pool: detectSpokenLanguage bounds whisper itself; this bounds fetches.
  const queue = todo.slice()
  await Promise.all(Array.from({ length: CONC * 2 }, async () => {
    while (queue.length) {
      await one(queue.shift())
      if (++n % 100 === 0) console.log(`[check-after] ${n}/${todo.length} ${JSON.stringify(tally)}`)
    }
  }))
  await new Promise(resolve => out.end(resolve))
  const all = readJsonl(RESULTS)
  const sum = {}
  for (const r of all) sum[r.outcome] = (sum[r.outcome] || 0) + 1
  const rer = all.filter(r => r.reroll).reduce((a, r) => { a[r.reroll.ok ? 'ok' : 'refused']++; return a }, { ok: 0, refused: 0 })
  console.log(`[check-after] THIS RUN ${JSON.stringify(tally)}`)
  console.log(`[check-after] CUMULATIVE ${JSON.stringify(sum)} rerolls ${JSON.stringify(rer)}`)
}

main().catch(e => { console.error(e); process.exit(1) })
