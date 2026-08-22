#!/usr/bin/env node
/**
 * Clone-once, copy-everywhere — copy-pass tool.
 *
 * Language-scoped, not direction-scoped (Tom's ruling): an English clip is an
 * English clip regardless of whether it fills a known-side slot in a
 * X_for_eng course or a target-side slot in eng_for_X — same voice, same
 * text, same audio. So this tool works for BOTH course families:
 *   - X_for_eng:  known-role slots   (course.known_lang === 'eng')
 *   - eng_for_X:  target1/2-role slots (course.target_lang === 'eng')
 *
 * For a given course, finds English slots (course_seeds/course_legos/
 * course_practice_phrases; audio_id IS NULL) whose exact
 * (language + normalizeForAudio(text) + voice_id) key already exists as a
 * rendered course_audio row in ANY OTHER course/role. Role and speed are NOT
 * part of the identity — see services/shared/clone-copy-match.cjs.
 *
 * STORAGE MODEL: logical ownership per-course (a fresh course_audio row for
 * this course), PHYSICAL storage SHARED (the new row points at the SAME
 * s3_key as the source — no S3 copy, no new object). This is safe only
 * because canonical objects are write-once: this tool NEVER overwrites an
 * existing mastered/<uuid>.mp3, and the insert is insert-or-noop (never
 * updates an existing row's s3_key). A course dropping a phrase just deletes
 * its row — canonical objects are never deleted by course-level operations
 * (no refcounting, by design).
 *
 * Only trusts voice_ids whose engine is verified speed-invariant at render
 * (xai, elevenlabs — see isTrusted1xEngine). Azure bakes a rate into the
 * SSML at render time and course_audio has no persisted per-row speed, so
 * historical Azure clips can't be verified 1x — this tool refuses to source
 * copies from them and reports that explicitly instead of silently matching.
 *
 * DRY-RUN BY DEFAULT. Pass --apply to actually write. Never runs TTS — slots
 * with no existing source are just reported, not generated. Idempotent: a
 * destination course that already owns a matching row is skipped
 * (SKIP_ALREADY_OWNED), so re-running is always safe.
 *
 * Usage:
 *   node tools/course-optimization/clone-copy-pass.cjs <course_code> [--apply] [--voice=<voiceId>]
 */
require('dotenv').config()
const path = require('path')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs')
const { isPunctuationOnly } = require('../../services/shared/text-classification.cjs')
const { CLONE_VOICE_ID, decideCopy } = require('../../services/shared/clone-copy-match.cjs')
const { buildSourceIndex } = require('../../services/shared/clone-copy-index.cjs')
const { canonicalVoiceId } = require('../../services/shared/clip-identity.cjs')

const PAGE = 2000

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

// English slot definitions for each course family. Exactly one family applies
// to a given course (known_lang and target_lang are never both 'eng').
const KNOWN_SIDE_SLOTS = [ // X_for_eng
  { table: 'course_seeds', textCol: 'known_text', audioCol: 'known_audio_id', role: 'known', statusFilter: 'released' },
  { table: 'course_legos', textCol: 'known_text', audioCol: 'known_audio_id', role: 'known' },
  { table: 'course_practice_phrases', textCol: 'known_text', audioCol: 'known_audio_id', role: 'known' },
]
const TARGET_SIDE_SLOTS = [ // eng_for_X
  { table: 'course_seeds', textCol: 'target_text', audioCol: 'target1_audio_id', role: 'target1', statusFilter: 'released' },
  { table: 'course_seeds', textCol: 'target_text', audioCol: 'target2_audio_id', role: 'target2', statusFilter: 'released' },
  { table: 'course_legos', textCol: 'target_text', audioCol: 'target1_audio_id', role: 'target1' },
  { table: 'course_legos', textCol: 'target_text', audioCol: 'target2_audio_id', role: 'target2' },
  { table: 'course_practice_phrases', textCol: 'target_text', audioCol: 'target1_audio_id', role: 'target1' },
  { table: 'course_practice_phrases', textCol: 'target_text', audioCol: 'target2_audio_id', role: 'target2' },
]

function slotDefsForCourse(course) {
  if (course.known_lang === 'eng') return KNOWN_SIDE_SLOTS
  if (course.target_lang === 'eng') return TARGET_SIDE_SLOTS
  return []
}

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

/**
 * Missing English slots for this course, grouped by (role, normalizedText) —
 * role is kept as a grouping key here (each role needs its own resolved
 * voice_id and its own course_audio row), even though role is NOT part of
 * the cross-course MATCH key.
 */
async function fetchMissingEnglishSlots(course) {
  const slotDefs = slotDefsForCourse(course)
  const byRoleAndNormText = new Map() // `${role}|${norm}` -> { role, text, count }
  let totalMissing = 0
  for (const slot of slotDefs) {
    const rows = await fetchAllForCourse(slot.table, slot.textCol, slot.audioCol, course.course_code, slot.statusFilter)
    for (const row of rows) {
      const text = row[slot.textCol]
      if (!text || isPunctuationOnly(text)) continue
      if (row[slot.audioCol] != null) continue // already linked — not this tool's job
      totalMissing++
      const norm = normalizeForAudio(text)
      const groupKey = `${slot.role}|${norm}`
      if (!byRoleAndNormText.has(groupKey)) byRoleAndNormText.set(groupKey, { role: slot.role, text, count: 0 })
      byRoleAndNormText.get(groupKey).count++
    }
  }
  return { byRoleAndNormText, totalMissing }
}

const INSERT_BATCH = 200

function ownedRow({ courseCode, text, language, role, voiceId, source }) {
  return {
    course_code: courseCode,
    text,
    text_normalized: normalizeForAudio(text),
    language,
    role,
    voice_id: voiceId,
    origin: 'tts',
    s3_key: source.s3Key, // SHARED physical object — never a new copy
    duration_ms: source.durationMs,
    file_size_bytes: source.fileSizeBytes,
    word_boundaries: source.wordBoundaries,
    // text_stripped is a DB GENERATED ALWAYS column (derived from
    // text_normalized) — Postgres rejects an explicit value for it.
    lego_id: null,
  }
}

/**
 * Insert-or-noop: never updates an existing row (immutability of ownership —
 * a destination course's row, once created, is not silently repointed by a
 * later run). decideCopy's SKIP_ALREADY_OWNED already prevents normal
 * re-processing; ignoreDuplicates is a second safety net against races.
 */
async function insertOwnedRow(item) {
  const { error } = await supabase
    .from('course_audio')
    .upsert(ownedRow(item), { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true })
  if (error) throw new Error(`insert owned row failed: ${error.message}`)
}

/**
 * Batched upsert of many owned rows in one round trip — thousands of
 * single-row inserts at ~1 course_audio write/request was the estate-wide
 * apply pass's dominant cost. Falls back to per-row inserts (via
 * insertOwnedRow) ONLY for a batch that errors, so a single bad row can't
 * silently drop its batch-mates' successful writes and stays attributable.
 * Returns the list of items that failed (with `.error` set on each).
 */
async function insertOwnedRowsBatch(items) {
  const failed = []
  for (let i = 0; i < items.length; i += INSERT_BATCH) {
    const slice = items.slice(i, i + INSERT_BATCH)
    const { error } = await supabase
      .from('course_audio')
      .upsert(slice.map(ownedRow), { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true })
    if (!error) continue
    for (const item of slice) {
      try {
        await insertOwnedRow(item)
      } catch (e) {
        failed.push({ item, error: e.message })
      }
    }
  }
  return failed
}

async function run(courseCode, { apply, voiceId }) {
  // The --voice argument was entirely unvalidated, and it is the ONE string
  // that decides both what gets written and — via the `voices` registry lookup
  // inside buildSourceIndex — whether the run is trusted at all, so a typo or a
  // wrong spelling silently downgraded a whole run to SKIP_UNTRUSTED_VOICE.
  // canonicalVoiceId now validates it at intake (an unresolvable voice stops
  // the run instead of quietly copying nothing) and gives the spelling to
  // WRITE. The lookup and the source match deliberately keep the argument AS
  // GIVEN: the `voices` registry holds 161 bare ids to 29 prefixed (checked
  // 2026-08-06), so prefixing what we ask it would break a working run until
  // that table is canonicalised too.
  const canonicalVoice = canonicalVoiceId(voiceId)

  const { data: course, error: courseErr } = await supabase
    .from('courses').select('course_code, known_lang, target_lang').eq('course_code', courseCode).maybeSingle()
  if (courseErr) throw courseErr
  if (!course) throw new Error(`Course not found: ${courseCode}`)

  const family = course.known_lang === 'eng' ? 'X_for_eng (known-side)' : course.target_lang === 'eng' ? 'eng_for_X (target-side)' : null
  if (!family) throw new Error(`${courseCode}: neither known_lang nor target_lang is 'eng' — nothing to copy`)

  // Sequential, not Promise.all: both hit large tables and running them
  // concurrently against the same project has tripped the statement timeout
  // in practice (course_audio's source-index scan starved behind the
  // slot-table scan). Neither is large enough alone to need parallelism.
  const { byRoleAndNormText, totalMissing } = await fetchMissingEnglishSlots(course)
  const texts = [...byRoleAndNormText.values()].map(g => normalizeForAudio(g.text))
  const { index: sourceIndex, trusted, engine } = await buildSourceIndex(supabase, { voiceId, language: 'eng', texts })
  console.log(`[${courseCode}] family=${family} voice=${voiceId} (stored as ${canonicalVoice}) engine=${engine || 'unknown'} trusted1x=${trusted}`)
  console.log(`[${courseCode}] ${totalMissing} missing English slots -> ${byRoleAndNormText.size} unique (role,text) groups`)
  if (!trusted) {
    console.log(`[${courseCode}] REFUSING to source copies from voice=${voiceId} (engine=${engine || 'unknown'} not verified speed-invariant at render — see clone-copy-match.cjs isTrusted1xEngine). All slots will report SKIP_UNTRUSTED_VOICE.`)
  }

  const decisions = []
  for (const [groupKey, { role, text, count }] of byRoleAndNormText) {
    const decision = trusted
      ? decideCopy({ text, language: 'eng', voiceId, courseCode, role }, sourceIndex)
      : { action: 'SKIP_UNTRUSTED_VOICE', key: groupKey, source: null, reason: `voice engine '${engine || 'unknown'}' not verified speed-invariant at render` }
    decisions.push({ ...decision, role, text, normalizedText: normalizeForAudio(text), slotCount: count })
  }

  const summary = { COPY: 0, SKIP_ALREADY_OWNED: 0, SKIP_NO_SOURCE: 0, SKIP_UNTRUSTED_VOICE: 0, ERROR: 0 }
  for (const d of decisions) summary[d.action] = (summary[d.action] || 0) + 1

  let copied = 0
  let linked = null
  if (apply) {
    const toInsert = decisions.filter(d => d.action === 'COPY')
    // Written under the CANONICAL spelling — matching still happens on the
    // argument as given (see the intake note above).
    const items = toInsert.map(d => ({ courseCode, text: d.text, language: 'eng', role: d.role, voiceId: canonicalVoice, source: d.source }))
    const failed = await insertOwnedRowsBatch(items)
    const failedByKey = new Map(failed.map(f => [`${f.item.role}|${f.item.text}`, f.error]))
    for (const d of toInsert) {
      const failErr = failedByKey.get(`${d.role}|${d.text}`)
      if (failErr) {
        d.action = 'ERROR'
        d.error = failErr
        summary.COPY--
        summary.ERROR = (summary.ERROR || 0) + 1
      } else {
        d.applied = true
        copied++
      }
    }
    if (copied > 0) {
      process.env.PHASE8_NO_LISTEN = '1'
      const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
      linked = await phase8.linkAudioIds(courseCode)
    }
    // Standing policy: a pass that leaves un-sourceable slots ends by QUEUEING
    // an audio-pass request (TTS itself stays approval-gated), so the residue
    // can't silently accumulate as a missing-audio backlog.
    if (summary.SKIP_NO_SOURCE > 0) {
      const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs')
      await queueAudioPass(supabase, {
        courseCode,
        reason: 'clone-copy pass residue (no cross-course source — needs TTS)',
        requestedBy: 'clone-copy-pass.cjs',
        metadata: { skipNoSource: summary.SKIP_NO_SOURCE }
      })
    }
  }

  return { courseCode, family, apply, voiceId, storedVoiceId: canonicalVoice, engine, trusted, totalMissing, uniqueGroups: byRoleAndNormText.size, summary, copied, linked, decisions }
}

function parseArgs(argv) {
  const positional = []
  const flags = { apply: false, voice: CLONE_VOICE_ID }
  for (const a of argv) {
    if (a === '--apply') flags.apply = true
    else if (a.startsWith('--voice=')) flags.voice = a.slice('--voice='.length)
    else positional.push(a)
  }
  return { courseCode: positional[0], flags }
}

async function main() {
  const { courseCode, flags } = parseArgs(process.argv.slice(2))
  if (!courseCode) {
    console.error('Usage: node clone-copy-pass.cjs <course_code> [--apply] [--voice=<voiceId>]')
    process.exit(1)
  }

  const result = await run(courseCode, { apply: flags.apply, voiceId: flags.voice })

  console.log(`\n=== ${courseCode} (${flags.apply ? 'APPLIED' : 'DRY RUN'}) ===`)
  console.log(JSON.stringify({ ...result, decisions: undefined }, null, 2))

  const logPath = path.join(__dirname, `clone-copy-pass-${courseCode}-${flags.apply ? 'apply' : 'dryrun'}-log.json`)
  fs.writeFileSync(logPath, JSON.stringify(result.decisions, null, 2))
  console.log(`Per-slot decisions written to ${logPath}`)
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1) })
}

module.exports = { run, fetchMissingEnglishSlots, slotDefsForCourse }
