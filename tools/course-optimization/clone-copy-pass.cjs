#!/usr/bin/env node
/**
 * Clone-once, copy-everywhere — copy-pass tool.
 *
 * For a given *_for_eng course, finds known-side slots (course_seeds,
 * course_legos, course_practice_phrases; known_audio_id IS NULL) whose exact
 * (normalizeForAudio(text) + role + voice_id[+speed]) key already exists as a
 * rendered clone-voice course_audio row in ANY OTHER course. For each match:
 *
 *   1. S3-copies the source mastered/<uuid>.mp3 object to a NEW
 *      mastered/<uuid>.mp3 key in the SAME bucket (ssi-audio-stage) — never
 *      shares an s3_key across courses, so re-mastering one course can never
 *      silently affect another.
 *   2. Inserts a new course_audio row OWNED by the destination course.
 *   3. Runs linkAudioIds(courseCode) to bind the new rows to their slots.
 *
 * DRY-RUN BY DEFAULT. Pass --apply to actually copy/write. Never runs TTS —
 * slots with no existing clone-voice source are just reported, not generated.
 * Idempotent: a destination course that already owns a matching row is
 * skipped (SKIP_ALREADY_OWNED), so re-running is always safe.
 *
 * Usage:
 *   node tools/course-optimization/clone-copy-pass.cjs <course_code> [--apply] [--voice=<voiceId>] [--role=known]
 */
require('dotenv').config()
const path = require('path')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
const { S3Client, CopyObjectCommand } = require('@aws-sdk/client-s3')
const { v4: uuidv4 } = require('uuid')
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs')
const { isPunctuationOnly } = require('../../services/shared/text-classification.cjs')
const { CLONE_VOICE_ID, computeAudioKey, decideCopy } = require('./clone-copy-lib.cjs')

const PAGE = 2000
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })

// Known-side slot definitions — mirrors getAudioNeeds()'s 'known' role scope
// in services/phases/phase8-audio-v13.cjs.
const SLOT_DEFS = [
  { table: 'course_seeds', textCol: 'known_text', audioCol: 'known_audio_id', statusFilter: 'released' },
  { table: 'course_legos', textCol: 'known_text', audioCol: 'known_audio_id' },
  { table: 'course_practice_phrases', textCol: 'known_text', audioCol: 'known_audio_id' },
]

async function fetchAllForCourse(table, textCol, audioCol, courseCode, statusFilter) {
  const rows = []
  let offset = 0
  while (true) {
    let q = supabase.from(table)
      .select(`${textCol}, ${audioCol}`)
      .eq('course_code', courseCode)
      .range(offset, offset + PAGE - 1)
    if (statusFilter) q = q.eq('status', statusFilter)
    const { data, error } = await q
    if (error) throw new Error(`${table}/${courseCode}: ${error.message}`)
    rows.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }
  return rows
}

async function fetchMissingKnownSlots(courseCode) {
  // Map: normalizedText -> { text (representative), slotCount }
  const byNormText = new Map()
  let totalMissing = 0
  for (const slot of SLOT_DEFS) {
    const rows = await fetchAllForCourse(slot.table, slot.textCol, slot.audioCol, courseCode, slot.statusFilter)
    for (const row of rows) {
      const text = row[slot.textCol]
      if (!text || isPunctuationOnly(text)) continue
      if (row[slot.audioCol] != null) continue // already linked — not this tool's job
      totalMissing++
      const norm = normalizeForAudio(text)
      if (!byNormText.has(norm)) byNormText.set(norm, { text, count: 0 })
      byNormText.get(norm).count++
    }
  }
  return { byNormText, totalMissing }
}

async function getEngineForVoice(voiceId) {
  const { data } = await supabase.from('voices').select('tts_engine').eq('voice_id', voiceId).maybeSingle()
  return data?.tts_engine || null
}

async function getConfiguredSpeed(courseCode, role) {
  const { data } = await supabase.from('courses').select('voice_config').eq('course_code', courseCode).maybeSingle()
  return data?.voice_config?.voices?.[role]?.settings?.speed || 1.0
}

/**
 * Global index of every rendered course_audio row for (role, voiceId), keyed
 * by computeAudioKey. speedMatters=false (e.g. xAI, which has no speed
 * param) skips reading per-course voice_config entirely — it can't affect
 * the render, and voice_config can drift after the row was rendered anyway.
 */
async function buildSourceIndex(role, voiceId, speedMatters) {
  const rows = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('course_audio')
      .select('id, course_code, text, language, s3_key, created_at, duration_ms, file_size_bytes, word_boundaries, text_stripped')
      .eq('role', role)
      .eq('voice_id', voiceId)
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(`course_audio source index: ${error.message}`)
    rows.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }
  const real = rows.filter(r => r.s3_key && !r.s3_key.startsWith('pending/'))

  let speedByCourse = new Map()
  if (speedMatters) {
    const courseCodes = [...new Set(real.map(r => r.course_code))]
    for (let i = 0; i < courseCodes.length; i += 200) {
      const chunk = courseCodes.slice(i, i + 200)
      const { data: courses, error } = await supabase.from('courses').select('course_code, voice_config').in('course_code', chunk)
      if (error) throw new Error(`voice_config batch: ${error.message}`)
      for (const c of (courses || [])) {
        speedByCourse.set(c.course_code, c.voice_config?.voices?.[role]?.settings?.speed || 1.0)
      }
    }
  }

  const index = new Map()
  for (const r of real) {
    const key = computeAudioKey({
      text: r.text,
      language: r.language,
      role,
      voiceId,
      speed: speedMatters ? speedByCourse.get(r.course_code) : undefined,
    }, speedMatters)
    const entry = {
      courseCode: r.course_code,
      s3Key: r.s3_key,
      text: r.text,
      id: r.id,
      createdAt: r.created_at,
      durationMs: r.duration_ms,
      fileSizeBytes: r.file_size_bytes,
      wordBoundaries: r.word_boundaries,
      textStripped: r.text_stripped,
    }
    if (!index.has(key)) index.set(key, [])
    index.get(key).push(entry)
  }
  return index
}

async function copyS3Object(sourceKey) {
  const destKey = `mastered/${uuidv4().toUpperCase()}.mp3`
  await s3.send(new CopyObjectCommand({
    Bucket: S3_BUCKET,
    CopySource: `${S3_BUCKET}/${sourceKey}`,
    Key: destKey,
    MetadataDirective: 'COPY',
  }))
  return destKey
}

async function insertOwnedRow({ courseCode, text, language, role, voiceId, source, destKey }) {
  const { data, error } = await supabase
    .from('course_audio')
    .upsert({
      course_code: courseCode,
      text,
      text_normalized: normalizeForAudio(text),
      language,
      role,
      voice_id: voiceId,
      origin: 'tts',
      s3_key: destKey,
      duration_ms: source.durationMs,
      file_size_bytes: source.fileSizeBytes,
      word_boundaries: source.wordBoundaries,
      text_stripped: source.textStripped,
      lego_id: null,
    }, { onConflict: 'course_code,text_normalized,language,role,voice_id' })
    .select('id')
    .single()
  if (error) throw new Error(`insert owned row failed: ${error.message}`)
  return data.id
}

async function run(courseCode, { apply, voiceId, role }) {
  const { data: course, error: courseErr } = await supabase
    .from('courses').select('course_code, known_lang, target_lang').eq('course_code', courseCode).maybeSingle()
  if (courseErr) throw courseErr
  if (!course) throw new Error(`Course not found: ${courseCode}`)

  const engine = await getEngineForVoice(voiceId)
  const speedMatters = engine !== 'xai'
  console.log(`[${courseCode}] voice=${voiceId} engine=${engine || 'unknown'} speedMatters=${speedMatters}`)

  const [{ byNormText, totalMissing }, sourceIndex] = await Promise.all([
    fetchMissingKnownSlots(courseCode),
    buildSourceIndex(role, voiceId, speedMatters),
  ])
  console.log(`[${courseCode}] ${totalMissing} missing known-side slots -> ${byNormText.size} unique normalized texts`)

  const destSpeed = speedMatters ? await getConfiguredSpeed(courseCode, role) : undefined

  const decisions = []
  for (const [norm, { text, count }] of byNormText) {
    const decision = decideCopy(
      { text, language: course.known_lang, role, voiceId, speed: destSpeed, courseCode },
      sourceIndex,
      speedMatters
    )
    decisions.push({ ...decision, text, normalizedText: norm, slotCount: count })
  }

  const summary = { COPY: 0, SKIP_ALREADY_OWNED: 0, SKIP_NO_SOURCE: 0, ERROR: 0 }
  for (const d of decisions) summary[d.action] = (summary[d.action] || 0) + 1

  let copied = 0
  let linked = null
  if (apply) {
    for (const d of decisions) {
      if (d.action !== 'COPY') continue
      try {
        const destKey = await copyS3Object(d.source.s3Key)
        await insertOwnedRow({ courseCode, text: d.text, language: course.known_lang, role, voiceId, source: d.source, destKey })
        d.destS3Key = destKey
        d.applied = true
        copied++
      } catch (e) {
        d.action = 'ERROR'
        d.error = e.message
        summary.COPY--
        summary.ERROR = (summary.ERROR || 0) + 1
      }
    }
    if (copied > 0) {
      process.env.PHASE8_NO_LISTEN = '1'
      const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
      linked = await phase8.linkAudioIds(courseCode)
    }
  }

  return { courseCode, apply, voiceId, role, speedMatters, totalMissing, uniqueTexts: byNormText.size, summary, copied, linked, decisions }
}

function parseArgs(argv) {
  const positional = []
  const flags = { apply: false, voice: CLONE_VOICE_ID, role: 'known' }
  for (const a of argv) {
    if (a === '--apply') flags.apply = true
    else if (a.startsWith('--voice=')) flags.voice = a.slice('--voice='.length)
    else if (a.startsWith('--role=')) flags.role = a.slice('--role='.length)
    else positional.push(a)
  }
  return { courseCode: positional[0], flags }
}

async function main() {
  const { courseCode, flags } = parseArgs(process.argv.slice(2))
  if (!courseCode) {
    console.error('Usage: node clone-copy-pass.cjs <course_code> [--apply] [--voice=<voiceId>] [--role=known]')
    process.exit(1)
  }

  const result = await run(courseCode, { apply: flags.apply, voiceId: flags.voice, role: flags.role })

  console.log(`\n=== ${courseCode} (${flags.apply ? 'APPLIED' : 'DRY RUN'}) ===`)
  console.log(JSON.stringify({ ...result, decisions: undefined }, null, 2))

  const logPath = path.join(__dirname, `clone-copy-pass-${courseCode}-${flags.apply ? 'apply' : 'dryrun'}-log.json`)
  fs.writeFileSync(logPath, JSON.stringify(result.decisions, null, 2))
  console.log(`Per-slot decisions written to ${logPath}`)
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1) })
}

module.exports = { run, fetchMissingKnownSlots, buildSourceIndex }
