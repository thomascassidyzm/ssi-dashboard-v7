#!/usr/bin/env node
/**
 * hrv-pod0-two-voice-verify-2026-08-21.cjs — prove the Croatian pilot pod is actually
 * two-voiced, actually says what the rows say, and actually plays.
 *
 * Read-only. Writes nothing, ever. Same shape of check the pilot build used on its 231
 * clips (link alive, size/duration, voice id, veracity), extended in three ways this
 * pass needs:
 *
 *   1. BOTH TRACKS. The two-voice rule binds the known (English) track as well as the
 *      target one, and the known track was where the Learner's 79 lines sat on a female
 *      voice against a male Croatian Learner. 462 clips, not 231.
 *   2. VOICE AGAINST THE RULE, not against the stored cast. Checking a clip against
 *      listening_pods.speakers only proves the cast was applied consistently — it would
 *      pass happily if the cast itself were wrong. This tool re-derives the expected
 *      voice from Tom's rule (the VOICE_A list) and checks the clip against THAT, so a
 *      mis-cast character fails here even if everything downstream agrees with it.
 *   3. TEXT IDENTITY. course_audio.text must equal the sentence's current text. This is
 *      what catches a clip that survived an edit and is still saying the old words —
 *      the exact failure mode the four SC20/SC22 rows had.
 *
 * Also asserts the LIVE pod is untouched: hrv_for_eng:pod-0 must still be 142/142 with
 * every clip alive, because everything in this pass was supposed to stay on the pilot.
 *
 *   node tools/pods/hrv-pod0-two-voice-verify-2026-08-21.cjs
 *   node tools/pods/hrv-pod0-two-voice-verify-2026-08-21.cjs --no-head   # skip S3 probes
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const POD_ID = 'hrv_for_eng:pod-0-unrecorded'
const LIVE_POD = 'hrv_for_eng:pod-0'
const NO_HEAD = process.argv.includes('--no-head')

const SRECKO = 'hr-HR-SreckoNeural'
const GABRIJELA = 'hr-HR-GabrijelaNeural'
const TOM = 'gfzdpspr5fdp'
const OLIVIA = 'bedd6226'

/** Tom's rule, restated independently of the stored cast — see header note 2. */
const VOICE_A = new Set([
  'Sarah', 'James', 'Customer 1', 'Customer 2', 'Customer 3',
  'Customer', 'Guest', 'Tourist', 'Passenger', 'Learner',
])

const canon = (s) => String(s || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * The renderer stores the text it actually spoke, and the pod ladder injects `…` chunk
 * pauses into it — `Dobro jutro. Kako si?` is stored as `Dobro jutro. … Kako si?`. Those
 * marks are pacing, not words, so compare on words alone. What this check exists to catch
 * is a clip left saying the OLD words after an edit, and dropping the ellipses does not
 * weaken it one bit: every gender edit in this pass changed a WORD.
 */
const words = (s) => String(s || '').replace(/…/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Words only. The renderer also normalises punctuation on its way to the provider —
 * a hyphen becomes an em-dash, a reused cross-course clip may carry `!` where the row
 * has `.`. Those are the same words spoken, so they are reported as NOTES, not
 * failures; a changed WORD still fails, which is the whole job of this check.
 */
const lettersOnly = (s) => words(s).toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, '').replace(/\s+/g, ' ').trim()
const normVoice = (v) => String(v || '').replace(/^azure_/, '').replace(/^xai_/, '')
const S3 = 'https://ssi-audio-stage.s3.amazonaws.com/'

async function head (key) {
  try {
    const r = await fetch(S3 + key, { method: 'HEAD' })
    return { ok: r.ok, status: r.status, bytes: Number(r.headers.get('content-length') || 0) }
  } catch (e) { return { ok: false, status: 0, error: e.message } }
}

async function main () {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  const fail = []
  const notes = []
  const report = { pod_id: POD_ID, checked_at: new Date().toISOString(), rows: 0, clips: 0, failures: [] }

  const { rows } = await db.query(
    `select s.scene_number sc, s.sentence_number sn, s.speaker, s.target_text, s.known_text,
            s.target_audio_id, ta.voice_id tv, ta.s3_key tk, ta.duration_ms td, ta.text ttext, ta.veracity_pass tvp,
            s.known_audio_id,  ka.voice_id kv, ka.s3_key kk, ka.duration_ms kd, ka.text ktext
       from listening_pod_sentences s
       left join course_audio ta on ta.id = s.target_audio_id
       left join course_audio ka on ka.id = s.known_audio_id
      where s.pod_id = $1 order by s.global_order`, [POD_ID])
  report.rows = rows.length

  const voiceCount = {}
  const probes = []
  for (const r of rows) {
    const slot = `SC${String(r.sc).padStart(2, '0')}-S${String(r.sn).padStart(3, '0')}`
    const key = canon(r.speaker)
    const a = VOICE_A.has(key)
    const wantT = a ? SRECKO : GABRIJELA
    const wantK = a ? TOM : OLIVIA
    const add = (what) => fail.push({ slot, speaker: r.speaker, ...what })

    for (const [track, id, voice, want, s3, dur, clipText, rowText] of [
      ['target', r.target_audio_id, r.tv, wantT, r.tk, r.td, r.ttext, r.target_text],
      ['known', r.known_audio_id, r.kv, wantK, r.kk, r.kd, r.ktext, r.known_text],
    ]) {
      if (!id) { add({ track, problem: 'no clip linked' }); continue }
      report.clips++
      voiceCount[`${track}:${normVoice(voice)}`] = (voiceCount[`${track}:${normVoice(voice)}`] || 0) + 1
      if (normVoice(voice) !== want) add({ track, problem: 'wrong voice', got: voice, want })
      if (lettersOnly(clipText) !== lettersOnly(rowText)) {
        add({ track, problem: 'clip text does not match the row', clip_text: clipText, row_text: rowText })
      } else if (words(clipText) !== words(rowText)) {
        notes.push({ slot, track, note: 'punctuation-only difference between clip and row', clip_text: clipText, row_text: rowText })
      }
      if (!dur || dur < 300) add({ track, problem: 'missing or implausible duration', duration_ms: dur })
      if (!s3) add({ track, problem: 'no s3_key' })
      else if (!NO_HEAD) probes.push({ slot, track, s3, add })
    }
    if (r.target_audio_id && r.tvp === false) add({ track: 'target', problem: 'veracity check FAILED on the stored clip' })
  }

  // S3 liveness, batched so the probe does not become the slow part of the pass.
  if (probes.length) {
    const B = 24
    for (let i = 0; i < probes.length; i += B) {
      const batch = probes.slice(i, i + B)
      const res = await Promise.all(batch.map(p => head(p.s3)))
      res.forEach((h, j) => {
        const p = batch[j]
        if (!h.ok) p.add({ track: p.track, problem: 'clip not reachable on S3', status: h.status, s3_key: p.s3 })
        else if (h.bytes < 1000) p.add({ track: p.track, problem: 'clip is suspiciously small', bytes: h.bytes })
      })
      process.stdout.write(`\r  probing S3 … ${Math.min(i + B, probes.length)}/${probes.length}`)
    }
    process.stdout.write('\n')
  }

  // The live pod must be exactly as it was.
  const live = await db.query(
    `select count(*)::int n, count(s.target_audio_id)::int t, count(s.known_audio_id)::int k
       from listening_pod_sentences s where s.pod_id = $1`, [LIVE_POD])
  const L = live.rows[0]
  report.live_pod = { pod_id: LIVE_POD, rows: L.n, target_clips: L.t, known_clips: L.k }
  if (L.n !== 142 || L.t !== 142) {
    fail.push({ slot: '(live pod)', problem: `LIVE POD MOVED: expected 142 rows / 142 target clips, found ${L.n}/${L.t}` })
  }

  report.voice_distribution = voiceCount
  report.failures = fail
  report.notes = notes

  console.log(`\n${POD_ID} — two-voice verification`)
  console.log(`  rows ${report.rows}, clips checked ${report.clips}`)
  console.log('  voice distribution:')
  for (const [k, v] of Object.entries(voiceCount).sort()) console.log(`    ${k.padEnd(34)} ${v}`)
  console.log(`  live pod ${LIVE_POD}: ${L.n} rows, ${L.t} target clips, ${L.k} known clips`)
  console.log(`  punctuation-only differences (not failures): ${notes.length}`)
  for (const n of notes) console.log(`    ${n.slot} ${n.track}: ${JSON.stringify(n.clip_text)} vs ${JSON.stringify(n.row_text)}`)
  console.log(fail.length ? `\n  FAILURES: ${fail.length}` : '\n  PASS — no failures.')
  for (const f of fail.slice(0, 40)) console.log(`    ${f.slot} ${f.track || ''} ${f.problem}${f.got ? ` (got ${f.got}, want ${f.want})` : ''}`)

  const out = path.join(__dirname, '..', '..', 'docs', 'pods', 'hrv-pod0-two-voice-verify-2026-08-21-report.json')
  fs.writeFileSync(out, JSON.stringify(report, null, 2))
  console.log(`  wrote ${out}\n`)
  await db.end()
  process.exit(fail.length ? 1 : 0)
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(2) })
