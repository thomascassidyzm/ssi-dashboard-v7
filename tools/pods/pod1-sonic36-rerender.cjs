#!/usr/bin/env node
/**
 * pod1-sonic36-rerender.cjs — re-render the spa_for_eng Pod 1 KNOWN track on
 * sonic-3.6, one slot at a time, make-before-break.
 *
 * ── Why this exists and why it is not pod1-tom-voice-render.cjs ──────────────
 * That driver moved the known track from Tom's xAI clone to his Cartesia clone
 * on 2026-08-27, and it could do make-before-break the easy way: the new clip
 * had a DIFFERENT voice_id, so it landed in a NEW course_audio row and the swap
 * was one link update on listening_pod_sentences.
 *
 * This pass cannot. The 91 clips are already on the Cartesia voice; only the
 * MODEL changes (sonic-3 → sonic-3.6, commit d6695bac2). course_audio is unique
 * on (course_code, text_normalized, language, role, voice_id) — every one of
 * those five is identical before and after — so a second row is not merely
 * undesirable, it is impossible. generatePodAudio({force:true}) handles that by
 * upserting the SAME row with a fresh s3_key, which publishes the new clip to
 * the learner at the moment of render, BEFORE anything has verified it. That is
 * break-before-make with extra steps, so it is not what this does.
 *
 * Instead the make-before-break rail moves down one level, from the LINK to the
 * OBJECT. Per slot:
 *   1. MEASURE  — the incumbent clip's loudness, off S3, before anything runs.
 *   2. RENDER   — ttsService (sonic-3.6, locale en-GB) + phase8.masterAudio,
 *                 inside the same veracity.renderChecked gate the production
 *                 pod path uses. Bytes in memory; nothing published.
 *   3. VERIFY   — the mastered bytes are decoded by whisper and must come back
 *                 English (Tom's standing policy, 2026-08-27: his clone speaks
 *                 English only), and measured for loudness and duration.
 *   4. PUBLISH  — upload to a NEW s3 key. The incumbent object is untouched and
 *                 stays live, because nothing points at the new key yet.
 *   5. SWAP     — one UPDATE of course_audio.s3_key, guarded on the old key.
 *                 The pod link never moves; it already points at this row.
 *   6. (never)  — the old S3 object is NOT deleted. Rollback is one UPDATE per
 *                 slot back to the key in this tool's log.
 *
 * A slot that fails at any step before 5 leaves the learner on the old clip. A
 * dead run costs credits and loses no audio.
 *
 * A new key rather than an overwrite is also what makes the swap visible: the
 * bucket serves a long CacheControl, so re-uploading the same key would leave
 * caches and CDNs handing out the quiet clip for as long as they felt like it.
 *
 * Usage:
 *   node tools/pods/pod1-sonic36-rerender.cjs --dry-run          # measure only
 *   node tools/pods/pod1-sonic36-rerender.cjs --limit=3 --apply
 *   node tools/pods/pod1-sonic36-rerender.cjs --apply --resume
 */
'use strict'

process.env.PHASE8_NO_LISTEN = '1'

const path = require('path')
const fs = require('fs')
const os = require('os')
const REPO = path.join(__dirname, '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env') })

const { execFileSync, spawnSync } = require('child_process')
const { v4: uuidv4 } = require('uuid')
const { createClient } = require('@supabase/supabase-js')
const { HeadObjectCommand, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3')
const phase8 = require(path.join(REPO, 'services/phases/phase8-audio-v13.cjs'))
const ttsService = require(path.join(REPO, 'services/tts-service.cjs'))
const veracity = require(path.join(REPO, 'services/audio-veracity.cjs'))
const { isEnglishLine } = require('./tom-voice-language-gate.cjs')

const COURSE = 'spa_for_eng'
const POD_SLUG = 'pod-1'
const TOM_CARTESIA = '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'
// en-GB, not en — exactly as the 2026-08-27 render used, and on 3.6 the locale
// is a supported parameter that shapes phonology rather than a silent no-op.
const KNOWN_LOCALE = 'en-GB'
// Same CacheControl the pod render path puts on every clip.
const AUDIO_CACHE_CONTROL = 'public, max-age=31536000, immutable'

const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : d
}
const LIMIT = parseInt(arg('limit', '0'), 10) || 0
const APPLY = process.argv.includes('--apply')
const RESUME = process.argv.includes('--resume')
const OUT_DIR = arg('out', path.join(REPO, 'docs/pods/pod1-sonic36-rerender-2026-08-27'))
const KEEP_DIR = arg('keep', '')   // optional: save before/after mp3 pairs here

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const S3_BUCKET = process.env.S3_BUCKET

const WHISPER_BIN = process.env.WHISPER_BIN || path.join(os.homedir(), '.local/bin/whisper-cli')
const WHISPER_MODEL = process.env.WHISPER_MODEL || path.join(os.homedir(), '.local/share/whisper-models/ggml-small.bin')

function appendLog (file, row) { fs.appendFileSync(file, JSON.stringify(row) + '\n') }

/**
 * Integrated loudness and true peak, from ffmpeg's ebur128 summary. This is the
 * measurement Tom's complaint is about: the sonic-3 clips came off the API ~10 dB
 * quiet and mastering had to shout at a whisper to reach target, amplifying room
 * tone with the voice. Measured on the MASTERED clip both sides, so before and
 * after are the same quantity on the same scale.
 */
function measureLoudness (file) {
  const r = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 16 << 20 })
  const out = `${r.stdout || ''}${r.stderr || ''}`
  const tail = out.slice(out.lastIndexOf('Integrated loudness'))
  const i = /I:\s*(-?[\d.]+)\s*LUFS/.exec(tail)
  const lra = /LRA:\s*(-?[\d.]+)\s*LU/.exec(tail)
  const peak = /Peak:\s*(-?[\d.]+)\s*dBFS/.exec(out.slice(out.lastIndexOf('True peak')))
  return {
    lufs: i ? Number(i[1]) : null,
    lra: lra ? Number(lra[1]) : null,
    peak_dbfs: peak ? Number(peak[1]) : null,
  }
}

async function downloadS3 (key, dest) {
  const obj = await phase8.s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }))
  fs.writeFileSync(dest, Buffer.from(await obj.Body.transformToByteArray()))
  return fs.statSync(dest).size
}

/**
 * THE BACKSTOP, unchanged in intent from pod1-tom-voice-render.cjs: text gates
 * bound what we SEND, only the waveform bounds what the clone SAID. Per slot,
 * never sampled — and here it runs on the mastered BYTES, before they are
 * uploaded anywhere, so a foreign-sounding take costs one render and reaches
 * nobody.
 */
function assertEnglishFile (mp3) {
  if (!fs.existsSync(WHISPER_BIN) || !fs.existsSync(WHISPER_MODEL)) {
    return { ok: false, why: `whisper unavailable (${WHISPER_BIN} / ${WHISPER_MODEL}) — refusing to publish an unverifiable clip on Tom's voice` }
  }
  const wav = mp3.replace(/\.mp3$/, '.wav')
  try {
    execFileSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', mp3, '-ar', '16000', '-ac', '1', wav])
    const r = spawnSync(WHISPER_BIN, ['-m', WHISPER_MODEL, '-l', 'auto', '-nt', '-t', '2', wav],
      { encoding: 'utf8', maxBuffer: 8 << 20 })
    if (r.error) return { ok: false, why: `whisper failed: ${r.error.message}` }
    const both = `${r.stdout || ''}${r.stderr || ''}`
    const m = /auto-detected language:\s*(\w+)\s*\(p = ([\d.]+)\)/.exec(both)
    if (!m) return { ok: false, why: 'whisper returned no language verdict' }
    if (m[1] !== 'en') return { ok: false, why: `clip SPEAKS ${m[1]} (p=${m[2]}), not English` }
    // The transcript is on STDOUT; whisper's own chatter (and the language
    // verdict) is on stderr. Reading `both` here put "read_audio_data: reading
    // audio data from …" in the decode field of a verification report.
    const text = String(r.stdout || '').split('\n').map((l) => l.trim()).filter(Boolean).join(' ')
    return { ok: true, lang: m[1], p: Number(m[2]), decode: text.slice(0, 200) }
  } catch (e) {
    return { ok: false, why: `audio language check failed: ${e.message}` }
  } finally {
    try { fs.rmSync(wav, { force: true }) } catch { /* noop */ }
  }
}

async function main () {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  if (KEEP_DIR) fs.mkdirSync(KEEP_DIR, { recursive: true })
  const logFile = path.join(OUT_DIR, `${COURSE}-${APPLY ? 'applied' : 'dryrun'}-log.jsonl`)

  const { data: pod, error: podErr } = await sb
    .from('listening_pods').select('id,course_code,slug,visibility')
    .eq('course_code', COURSE).eq('slug', POD_SLUG).single()
  if (podErr) throw new Error(`pod read failed: ${podErr.message}`)

  const { data: sentences, error: sErr } = await sb
    .from('listening_pod_sentences')
    .select('id,speaker,known_text,target_text,known_audio_id,scene_number,sentence_number')
    .eq('pod_id', pod.id).order('scene_number').order('sentence_number')
  if (sErr) throw new Error(`sentences read failed: ${sErr.message}`)

  const linked = sentences.map((s) => s.known_audio_id).filter(Boolean)
  const { data: rows, error: aErr } = await sb
    .from('course_audio')
    .select('id,course_code,text,language,role,voice_id,s3_key,duration_ms,word_boundaries')
    .in('id', linked)
  if (aErr) throw new Error(`course_audio read failed: ${aErr.message}`)
  const byId = new Map(rows.map((r) => [r.id, r]))

  // THE WORK-LIST IS WHAT IS LIVE, not a staged file. The set is defined by the
  // thing Tom complained about: known-track slots currently pointing at a clip
  // on his Cartesia clone.
  let work = sentences.filter((s) => {
    const r = s.known_audio_id && byId.get(s.known_audio_id)
    return r && String(r.voice_id).includes(TOM_CARTESIA)
  })

  // ── Before-state assertions. Each of these, if it fired, would mean this tool
  // is describing a pod that no longer matches the one on disk.
  const drift = []
  const heldForAudio = []
  const linkCounts = new Map()
  for (const s of work) linkCounts.set(s.known_audio_id, (linkCounts.get(s.known_audio_id) || 0) + 1)
  for (const s of work) {
    const r = byId.get(s.known_audio_id)
    if (r.course_code !== COURSE) drift.push({ slot: s.id, why: `clip owned by ${r.course_code}` })
    if (r.role !== 'known') drift.push({ slot: s.id, why: `clip role ${r.role}` })
    if (!r.s3_key || r.s3_key.startsWith('pending/')) drift.push({ slot: s.id, why: `no live s3 object (${r.s3_key})` })
    if (linkCounts.get(s.known_audio_id) > 1) drift.push({ slot: s.id, why: 'clip row shared by more than one slot' })
    // The clip's stored text IS what the voice was asked to say. Re-rendering a
    // row whose text has drifted from the line would put the wrong words under
    // an unchanged link.
    const sents = phase8.splitPodTurnSentences(s.known_text)
    const ttsText = sents.length > 1 ? sents.join(' … ') : s.known_text
    if (r.text !== ttsText) drift.push({ slot: s.id, why: `clip text differs from the line: ${JSON.stringify(r.text)} vs ${JSON.stringify(ttsText)}` })
    const v = isEnglishLine(s.known_text, { targetText: s.target_text })
    // `hold` is the text gate saying "I cannot decide", and on this pod it says
    // it about six drill lines that are numbers, colours and months — "October.
    // November. December." carries almost no English trigram evidence because it
    // is barely English PROSE, while being unambiguously an English line.
    //
    // Lowering the band to let them through would weaken the gate for every
    // future pod, so instead a hold ESCALATES to the layer that actually settles
    // the question: whisper decodes the clip already live in that slot, and it
    // must come back English. That is stricter than the text gate, not looser —
    // and it is the same test the new clip must pass before it is published.
    if (v.verdict === 'hold') heldForAudio.push(s)
    else if (!v.ok) drift.push({ slot: s.id, why: `line not confirmed English [${v.verdict}] ${v.why}` })
  }
  // Nothing outside this pod may reference these rows: the swap is at the OBJECT,
  // so a row shared with another slot or course would change audio out of scope.
  const workIds = work.map((s) => s.known_audio_id)
  for (const col of ['known_audio_id', 'target_audio_id']) {
    const { data: refs, error: rErr } = await sb
      .from('listening_pod_sentences').select('id,pod_id').in(col, workIds)
    if (rErr) throw new Error(`reference scan (${col}) failed: ${rErr.message}`)
    const outside = (refs || []).filter((x) => x.pod_id !== pod.id || col === 'target_audio_id')
    if (outside.length) drift.push({ slot: outside[0].id, why: `${outside.length} out-of-scope ${col} reference(s) to these clips` })
  }
  // Resolve the held lines against the waveform, BEFORE a credit is spent.
  if (heldForAudio.length) {
    console.log(`LANGUAGE — ${heldForAudio.length} line(s) the text gate could not decide; asking the clip that is already live in each slot.`)
    const holdTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sonic36-hold-'))
    for (const s of heldForAudio) {
      const r = byId.get(s.known_audio_id)
      const f = path.join(holdTmp, `${s.id.replace(/[:]/g, '_')}.mp3`)
      let verdict
      try {
        await downloadS3(r.s3_key, f)
        verdict = assertEnglishFile(f)
      } catch (e) { verdict = { ok: false, why: `could not fetch the incumbent clip: ${e.message}` } }
      if (!verdict.ok) drift.push({ slot: s.id, why: `text gate held and the live clip does not confirm English: ${verdict.why}` })
      else console.log(`   ${s.id} — live clip speaks ${verdict.lang} (p=${verdict.p}) ${JSON.stringify(String(s.known_text).slice(0, 44))}`)
    }
    try { fs.rmSync(holdTmp, { recursive: true, force: true }) } catch { /* noop */ }
  }

  if (drift.length) {
    console.error(`DRIFT — ${drift.length} assertion(s) failed. Nothing rendered.`)
    drift.slice(0, 12).forEach((d) => console.error('  ', d.slot, d.why))
    process.exit(2)
  }

  // --resume: a slot whose clip is already stamped sonic-3.6 in this tool's log
  // is done. The DB carries no model column, so the log is the record.
  const doneKeys = new Set()
  const appliedLog = path.join(OUT_DIR, `${COURSE}-applied-log.jsonl`)
  if (RESUME && fs.existsSync(appliedLog)) {
    for (const l of fs.readFileSync(appliedLog, 'utf8').split('\n').filter(Boolean)) {
      try { const r = JSON.parse(l); if (r.status === 'swapped') doneKeys.add(r.slot) } catch { /* noop */ }
    }
  }
  if (RESUME) work = work.filter((s) => !doneKeys.has(s.id))
  if (LIMIT) work = work.slice(0, LIMIT)

  console.log(`[${COURSE}] pod ${pod.id} (${pod.visibility}) — ${work.length} slot(s) to re-render on ${ttsService.CARTESIA_MODEL}${APPLY ? '' : ' (DRY RUN — measuring the incumbents only, nothing rendered, nothing written)'}`)

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sonic36-'))
  const stats = veracity.newStats()
  veracity.startCourse(COURSE)
  const started = Date.now()
  let swapped = 0, failed = 0
  const failures = []

  for (const [i, s] of work.entries()) {
    const r = byId.get(s.known_audio_id)
    const sents = phase8.splitPodTurnSentences(s.known_text)
    const ttsText = sents.length > 1 ? sents.join(' … ') : s.known_text
    const row = {
      slot: s.id, speaker: s.speaker, text: s.known_text,
      audio_id: r.id, s3_key_before: r.s3_key, duration_ms_before: r.duration_ms,
      at: new Date().toISOString(), model: ttsService.CARTESIA_MODEL,
    }
    const oldMp3 = path.join(tmpRoot, `${i}-before.mp3`)
    const newMp3 = path.join(tmpRoot, `${i}-after.mp3`)
    try {
      // 1. MEASURE the incumbent. Nothing has been touched.
      row.bytes_before = await downloadS3(r.s3_key, oldMp3)
      row.before = measureLoudness(oldMp3)

      if (!APPLY) { row.status = 'measured'; appendLog(logFile, row); continue }

      // 2. RENDER — the production call path: buildTTSConfig's cartesia shape,
      //    ttsService (which owns the sonic-3.6 pin and the format), then
      //    phase8.masterAudio, all inside the veracity gate that /generate-pods
      //    renders behind. Bytes in memory; nothing is published by this step.
      const ttsConfig = {
        voiceId: TOM_CARTESIA, speed: 1.0, courseCode: COURSE,
        apiKey: process.env.CARTESIA_API_KEY,
        locale: KNOWN_LOCALE, language: KNOWN_LOCALE,
      }
      const gated = await veracity.renderChecked({
        render: async () => {
          const { audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(ttsText, 'cartesia', ttsConfig)
          // THE MEASUREMENT THAT ACTUALLY CARRIES THE DEFECT. Mastering
          // normalises every clip to -16 LUFS, so the mastered before/after can
          // only ever show that both hit target — it cannot show the thing Tom
          // heard, which is how far the chain had to REACH to get there. That
          // lives in the raw bytes off the API, and this is the only moment they
          // exist. Recorded per clip, on the real 91, not on a test line.
          const rawFile = path.join(tmpRoot, `${i}-raw.mp3`)
          try {
            fs.writeFileSync(rawFile, audioBuffer)
            row.raw_after = measureLoudness(rawFile)
          } catch { /* measurement must never fail a render */ } finally {
            try { fs.rmSync(rawFile, { force: true }) } catch { /* noop */ }
          }
          const { buffer, durationMs } = await phase8.masterAudio(audioBuffer, ttsText)
          return { buffer, durationMs, wordBoundaries }
        },
        expectedText: ttsText,
        language: 'eng',
        stats,
        meta: { courseCode: COURSE, role: 'known', voiceId: TOM_CARTESIA, sentenceId: s.id, track: 'known', originalText: s.known_text },
      })
      if (!gated.published) {
        throw new Error(`[STAGE=veracity] quarantined after ${gated.attempts} attempts (${gated.verdict?.reason}, CER ${gated.verdict?.cer})`)
      }

      // 3. VERIFY the bytes themselves, before anything can hear them.
      fs.writeFileSync(newMp3, gated.buffer)
      row.bytes_after = gated.buffer.length
      row.duration_ms_after = gated.durationMs
      if (!gated.durationMs || gated.durationMs < 400) throw new Error(`implausible duration ${gated.durationMs}ms`)
      if (gated.buffer.length < 2000) throw new Error(`clip too small (${gated.buffer.length} bytes)`)
      row.after = measureLoudness(newMp3)
      if (row.after.lufs === null) throw new Error('could not measure the new clip')
      // A near-silent take is the dropout this catches cheaply; mastering targets
      // -16 LUFS, so anything below -25 never came out of the mastering chain right.
      if (row.after.lufs < -25) throw new Error(`new clip is ${row.after.lufs} LUFS — near-silent, not published`)
      const lang = assertEnglishFile(newMp3)
      if (!lang.ok) throw new Error(`language: ${lang.why}`)
      row.audio_language = lang.lang
      row.audio_language_p = lang.p

      // 4. PUBLISH to a NEW key. The incumbent object is still the live one:
      //    nothing references this key yet.
      const s3KeyAfter = `mastered/${uuidv4().toUpperCase()}.mp3`
      await phase8.s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET, Key: s3KeyAfter, Body: gated.buffer,
        ContentType: 'audio/mpeg', CacheControl: AUDIO_CACHE_CONTROL,
      }))
      const head = await phase8.s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: s3KeyAfter }))
      if (!head.ContentLength || head.ContentLength !== gated.buffer.length) {
        throw new Error(`uploaded object is ${head.ContentLength} bytes, expected ${gated.buffer.length}`)
      }
      row.s3_key_after = s3KeyAfter

      // 5. SWAP — one UPDATE, guarded on the key we measured, so a run racing
      //    another writer aborts instead of clobbering it. The pod link is not
      //    touched: it already points at this row.
      const { data: upd, error: uErr } = await sb.from('course_audio')
        .update({
          s3_key: s3KeyAfter,
          duration_ms: gated.durationMs,
          word_boundaries: gated.wordBoundaries && gated.wordBoundaries.length ? gated.wordBoundaries : null,
          ...veracity.verdictColumns(gated.verdict, { checker: 'pod1-sonic36-rerender', attempts: gated.attempts }),
        })
        .eq('id', r.id).eq('s3_key', r.s3_key).select('id')
      if (uErr) throw new Error(`swap: ${uErr.message}`)
      if (!upd || !upd.length) throw new Error('swap: the clip moved under us — old key no longer current')
      row.status = 'swapped'
      swapped++
      if (KEEP_DIR) {
        fs.copyFileSync(oldMp3, path.join(KEEP_DIR, `${s.id.replace(/[:]/g, '_')}-before.mp3`))
        fs.copyFileSync(newMp3, path.join(KEEP_DIR, `${s.id.replace(/[:]/g, '_')}-after.mp3`))
      }
    } catch (e) {
      row.status = 'failed'
      row.error = String(e.message).slice(0, 300)
      failed++
      failures.push({ slot: s.id, error: row.error })
      console.warn(`  ✗ ${s.id}: ${row.error}`)
    } finally {
      for (const f of [oldMp3, newMp3]) { try { fs.rmSync(f, { force: true }) } catch { /* noop */ } }
    }
    appendLog(logFile, row)
    if ((i + 1) % 10 === 0 || i + 1 === work.length) {
      console.log(`  … ${i + 1}/${work.length} — ${swapped} swapped, ${failed} failed`)
    }
  }

  try { fs.rmSync(tmpRoot, { recursive: true, force: true }) } catch { /* noop */ }
  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`[${COURSE}] DONE — ${swapped} swapped, ${failed} failed in ${elapsed}s`)
  console.log(`[${COURSE}] log: ${logFile}`)
  if (failures.length) {
    console.log(`[${COURSE}] failed slots still serve their ORIGINAL clip — no silence:`)
    failures.slice(0, 20).forEach((f) => console.log('   ', f.slot, f.error))
  }
}

module.exports = { measureLoudness, assertEnglishFile }

if (require.main === module) {
  main().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
}
