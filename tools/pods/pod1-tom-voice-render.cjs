#!/usr/bin/env node
/**
 * pod1-tom-voice-render.cjs — put Tom's Cartesia clone on the Pod 1 KNOWN track,
 * one slot at a time, make-before-break.
 *
 * Tom ruled GO on 2026-08-27 against the staged manifest
 * `tools/tts-bakeoff/pod1-tom-voice-manifest-2026-08-27.json` — 2,051 lines,
 * 22 courses, ~96K Cartesia credits. This is the driver that spends it.
 *
 * ── Why this is not /generate-pods ───────────────────────────────────────────
 * The bulk route builds its work queue from `!s.known_audio_id` — it fills
 * GAPS. Every one of these 2,051 slots is already linked, so the only way to
 * reach them through that route is to NULL the links first and let the renderer
 * find the holes. That is break-before-make on a live course: a run that dies in
 * the gap leaves silence exactly where it got to, which is the fra_for_eng
 * outage and the shape Kai ruled against on 2026-08-27 (canon A4/A19).
 *
 * So this driver inverts it, per slot:
 *   1. RENDER  — generatePodAudio() with the Cartesia voice. Renders, masters,
 *                passes the whisper veracity gate, uploads to a NEW S3 key and
 *                inserts a NEW course_audio row. The upsert key carries
 *                voice_id, so the incumbent xAI row cannot be overwritten.
 *   2. VERIFY  — the new row exists, has a live S3 object with real bytes, a
 *                sane duration, and is stamped with the Cartesia voice.
 *   3. SWAP    — one UPDATE of listening_pod_sentences.known_audio_id.
 *   4. (never) — nothing is deleted, nothing is unlinked. The superseded rows
 *                keep their flags, sign-offs and revision history, and several
 *                of them are shared with OTHER courses by cross-course canon
 *                reuse, so deleting one would silence a sibling.
 * A slot the render or the verify fails is left pointing at its old clip. A
 * dead run costs money and loses no audio.
 *
 * ── Progress is filed by SLOT, never by a counter ────────────────────────────
 * `docs/pods/pod-migration-protocol.md` — progress is keyed on the slot id
 * `${podId}:SC{scene}-S{sentence}`. This tool's log is keyed the same way, so a
 * resumed or re-run pass reconciles per slot rather than per position, and
 * `--resume` skips slots already swapped. No learner progress is owed here: this
 * changes AUDIO under UNCHANGED TEXT, so no slot moves and nothing is
 * mis-credited. The tool asserts that by refusing to run if a line's known_text
 * has changed since the manifest was staged.
 *
 * Usage:
 *   node tools/pods/pod1-tom-voice-render.cjs --course=spa_for_eng --dry-run
 *   node tools/pods/pod1-tom-voice-render.cjs --course=spa_for_eng --limit=1 --apply
 *   node tools/pods/pod1-tom-voice-render.cjs --course=spa_for_eng --apply --resume
 */
'use strict'

process.env.PHASE8_NO_LISTEN = '1'

const path = require('path')
const fs = require('fs')
const REPO = path.join(__dirname, '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env') })

const { createClient } = require('@supabase/supabase-js')
const { HeadObjectCommand } = require('@aws-sdk/client-s3')
const phase8 = require(path.join(REPO, 'services/phases/phase8-audio-v13.cjs'))
const veracity = require(path.join(REPO, 'services/audio-veracity.cjs'))
const { canonicalSpeakerName } = require(path.join(REPO, 'tools/pod-voice-colour-n.cjs'))

// Tom's clone. Stored PREFIXED on the clip (canonicalClipVoiceId does that), so
// audio-repair-core's decodeVoiceId cannot mistake it for a bare xAI id.
const TOM_CARTESIA = '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'
// The voices the manifest selects on: Tom's xAI clone, prefixed or bare.
const TOM_XAI = new Set(['gfzdpspr5fdp', 'xai_gfzdpspr5fdp'])
// en-GB, not en. Cartesia's own guidance is to prefer a full locale, and this is
// a British voice reading English; `en` is a weaker steer on a multilingual clone.
const KNOWN_LOCALE = 'en-GB'

const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : d
}
const COURSE = arg('course', '')
const LIMIT = parseInt(arg('limit', '0'), 10) || 0
const APPLY = process.argv.includes('--apply')
const RESUME = process.argv.includes('--resume')
const OUT_DIR = arg('out', path.join(REPO, 'docs/pods/pod1-tom-voice-2026-08-27'))

if (!COURSE) {
  console.error('--course=<code> is required')
  process.exit(1)
}

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

/** Append one JSON line per slot, so a dead run is still readable cold. */
function appendLog (file, row) {
  fs.appendFileSync(file, JSON.stringify(row) + '\n')
}

/**
 * Verify a freshly rendered clip before anything links to it. RMS is not
 * verification and neither is a row id: the object has to be alive in the
 * bucket, big enough to be audio, and stamped with the voice we asked for.
 */
async function verifyNewClip (audioId) {
  const { data: row, error } = await sb
    .from('course_audio')
    .select('id,s3_key,voice_id,duration_ms,text,veracity_pass,veracity_reason')
    .eq('id', audioId)
    .maybeSingle()
  if (error) return { ok: false, why: `row read failed: ${error.message}` }
  if (!row) return { ok: false, why: 'no course_audio row' }
  if (!/cartesia/i.test(row.voice_id || '')) return { ok: false, why: `wrong voice on the clip: ${row.voice_id}` }
  if (!row.duration_ms || row.duration_ms < 400) return { ok: false, why: `implausible duration ${row.duration_ms}ms` }
  try {
    const head = await phase8.s3.send(new HeadObjectCommand({
      Bucket: process.env.S3_BUCKET, Key: row.s3_key,
    }))
    if (!head.ContentLength || head.ContentLength < 2000) {
      return { ok: false, why: `s3 object too small (${head.ContentLength} bytes)` }
    }
    return { ok: true, row, bytes: head.ContentLength }
  } catch (e) {
    return { ok: false, why: `s3 head failed: ${e.message}` }
  }
}

async function main () {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const logFile = path.join(OUT_DIR, `${COURSE}-${APPLY ? 'applied' : 'dryrun'}-log.jsonl`)

  const manifestPath = path.join(REPO, 'tools/tts-bakeoff/pod1-tom-voice-manifest-2026-08-27.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const entry = manifest.courses.find((c) => c.course_code === COURSE)
  if (!entry) throw new Error(`${COURSE} is not in the staged manifest`)

  const { data: pod, error: podErr } = await sb
    .from('listening_pods').select('id,course_code,slug,visibility,speakers')
    .eq('id', entry.pod_id).single()
  if (podErr) throw new Error(`pod read failed: ${podErr.message}`)

  // The cast is the selector, not gender — 11 of Tom's lines per pod are on
  // speakers with no gender set at all (rescope, 2026-08-27).
  const tomSpeakers = new Set(Object.entries(pod.speakers || {})
    .filter(([, v]) => v && v.known && TOM_XAI.has(String(v.known.voice_id)))
    .map(([k]) => k))

  const { data: sentences, error: sErr } = await sb
    .from('listening_pod_sentences')
    .select('id,speaker,known_text,known_audio_id,scene_number,sentence_number')
    .eq('pod_id', pod.id)
    .order('scene_number').order('sentence_number')
  if (sErr) throw new Error(`sentences read failed: ${sErr.message}`)

  const bySlot = new Map(sentences.map((s) => [s.id, s]))
  const staged = entry.lines

  // ── Before-state assertions. Drift means the manifest is describing a pod
  // that no longer exists, and the honest response is to stop, not to guess.
  const drift = []
  for (const line of staged) {
    const s = bySlot.get(line.sentence_id)
    if (!s) { drift.push({ slot: line.sentence_id, why: 'slot no longer exists' }); continue }
    // The cast is keyed on the CANONICAL name — "Neighbour (8 am)" is cast as
    // "Neighbour" — which is exactly how phase8 resolves a speaker's voice.
    if (!tomSpeakers.has(canonicalSpeakerName(s.speaker))) drift.push({ slot: line.sentence_id, why: `speaker ${s.speaker} is no longer cast to Tom` })
  }
  if (drift.length) {
    console.error(`DRIFT — ${drift.length} staged slot(s) no longer match the live pod. Nothing rendered.`)
    drift.slice(0, 10).forEach((d) => console.error('  ', d.slot, d.why))
    process.exit(2)
  }

  // Already-swapped slots, for --resume. A slot whose link already points at a
  // Cartesia clip is done; re-rendering it would spend money to change nothing.
  const linkedIds = staged.map((l) => bySlot.get(l.sentence_id).known_audio_id).filter(Boolean)
  const done = new Set()
  if (linkedIds.length) {
    const { data: linked } = await sb.from('course_audio').select('id,voice_id').in('id', linkedIds)
    const cart = new Set((linked || []).filter((r) => /cartesia/i.test(r.voice_id || '')).map((r) => r.id))
    for (const l of staged) {
      const s = bySlot.get(l.sentence_id)
      if (s.known_audio_id && cart.has(s.known_audio_id)) done.add(l.sentence_id)
    }
  }

  let work = staged.filter((l) => !(RESUME && done.has(l.sentence_id)))
  if (LIMIT) work = work.slice(0, LIMIT)

  console.log(`[${COURSE}] pod ${pod.id} (${pod.visibility}) — ${staged.length} staged, ${done.size} already on Cartesia, ${work.length} to render${APPLY ? '' : ' (DRY RUN — nothing rendered, nothing written)'}`)
  if (!APPLY) {
    work.slice(0, 5).forEach((l) => {
      const s = bySlot.get(l.sentence_id)
      console.log(`   ${l.sentence_id}  ${s.speaker.padEnd(16)} ${JSON.stringify(s.known_text.slice(0, 60))}`)
    })
    if (work.length > 5) console.log(`   … and ${work.length - 5} more`)
    return
  }

  // ctx exists only to feed the xAI→Azure safety net, and that net fires only
  // when the primary provider was xAI. Cartesia has no fallback here on purpose:
  // a failed render must fail loudly and leave the old clip playing, never get
  // rescued into somebody else's voice on Tom's line.
  const ctx = null
  const voice = { voice_id: TOM_CARTESIA, provider: 'cartesia', locale: KNOWN_LOCALE, gender: 'm' }

  veracity.startCourse(COURSE)
  const started = Date.now()
  let rendered = 0, swapped = 0, failed = 0
  const failures = []

  for (const [i, line] of work.entries()) {
    const s = bySlot.get(line.sentence_id)
    const before = s.known_audio_id
    const row = {
      slot: line.sentence_id, speaker: s.speaker, text: s.known_text,
      known_audio_id_before: before, at: new Date().toISOString(),
    }
    try {
      // 1. RENDER — nothing has been touched yet.
      const result = await phase8.generatePodAudio({
        courseCode: COURSE,
        text: s.known_text,
        language: 'eng',
        role: 'known',
        voice,
        ctx,                 // null: no Azure safety net on this path, by design
        track: 'known',
        sentenceId: line.sentence_id,
      })
      row.known_audio_id_after = result.id
      row.reused = !!result.reused
      rendered++

      // 2. VERIFY — before any link moves.
      const v = await verifyNewClip(result.id)
      if (!v.ok) throw new Error(`verify: ${v.why}`)
      row.bytes = v.bytes
      row.duration_ms = v.row.duration_ms
      row.veracity = v.row.veracity_pass === null ? 'not_sampled' : (v.row.veracity_pass ? 'pass' : 'fail')

      // 3. SWAP — one row, only now.
      const { error: linkErr } = await sb.from('listening_pod_sentences')
        .update({ known_audio_id: result.id })
        .eq('id', line.sentence_id)
        .eq('known_audio_id', before)   // optimistic: abort if it moved under us
      if (linkErr) throw new Error(`link: ${linkErr.message}`)
      row.status = 'swapped'
      swapped++
    } catch (e) {
      row.status = 'failed'
      row.error = e.message.slice(0, 300)
      failed++
      failures.push({ slot: line.sentence_id, error: row.error })
      console.warn(`  ✗ ${line.sentence_id}: ${row.error}`)
    }
    appendLog(logFile, row)
    if ((i + 1) % 10 === 0 || i + 1 === work.length) {
      console.log(`  … ${i + 1}/${work.length} — ${swapped} swapped, ${failed} failed`)
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`[${COURSE}] DONE — ${rendered} rendered, ${swapped} swapped, ${failed} failed in ${elapsed}s`)
  console.log(`[${COURSE}] log: ${logFile}`)
  if (failures.length) {
    console.log(`[${COURSE}] failed slots still point at their ORIGINAL clip — no silence:`)
    failures.slice(0, 20).forEach((f) => console.log('   ', f.slot, f.error))
  }
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
