#!/usr/bin/env node
/**
 * Overnight pod-explainer batch runner.
 *
 * For each course passed via argv:
 *   1. Text generation pass — calls Haiku via the same generateForBatch
 *      module the admin endpoint uses, fills explainer_decomposition +
 *      explainer_text on listening_pod_sentences rows that don't have
 *      one yet. Parallel batches of POD_EXPLAINER_BATCH_SIZE.
 *   2. Audio generation pass — for sentences with non-empty explainer_text
 *      but NULL explainer_audio_id, render via xAI multilingual TTS
 *      (Tom's branded voice gfzdpspr5fdp), master to -16 LUFS, upload
 *      to S3, insert into course_audio, write the resulting id back to
 *      listening_pod_sentences.explainer_audio_id.
 *
 * Reuses the validated module logic from pod-explainer-generator.cjs +
 * phase8-audio-v13.cjs — same writes, same TTS path, same audio mastering
 * as the existing pod-audio pipeline. Just exposed via a CLI surface so
 * Tom can fire-and-forget overnight.
 *
 * Usage:
 *   node services/run-pod-explainer-batch.cjs ita_for_eng zho_for_eng
 *   node services/run-pod-explainer-batch.cjs --no-audio ita_for_eng
 *   node services/run-pod-explainer-batch.cjs --no-text ita_for_eng
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const { createClient } = require('@supabase/supabase-js')
const podExplainer = require('./pod-explainer-generator.cjs')

// =============================================================================
// CONFIG
// =============================================================================

// Default: Tom's branded clone. Override via VOICE_ID env or --voice flag —
// useful for testing whether stubborn xAI ECONNRESETs are voice-endpoint-specific
// (e.g. retry the same failed sentence with public 'leo' / 'rex' to compare).
const EXPLAINER_VOICE_ID = process.env.VOICE_ID || 'gfzdpspr5fdp'
const EXPLAINER_LANGUAGE = 'auto'         // xAI multilingual handles code-switching
// IMPORTANT: must be 'pod_explainer'. Using role='presentation' here makes
// these rows indistinguishable from course-intro presentation audio, and the
// /regenerate-presentations endpoint in phase8-audio-v13.cjs deletes any
// role='presentation' row with NULL lego_id whose text doesn't match a current
// LEGO presentation — which is exactly what these are. The Italian + Chinese
// explainer audio from the first batch run got wiped by that path. Migration
// 20260519_course_audio_pod_explainer_role.sql adds 'pod_explainer' to the
// allow-list; the orphan cleanup is scoped to role='presentation' so the new
// role is immune.
const EXPLAINER_ROLE = 'pod_explainer'
const EXPLAINER_PROVIDER = 'xai'

const TEXT_BATCH_SIZE = 12
const TEXT_PARALLEL = 4
// Parallel-4 is the sweet spot for healthy xAI endpoint: full 537-clip V6 regen
// on 2026-05-19 hit 0 failures in 277s. Earlier in the same day we saw ECONNRESETs
// at parallel-2 — turned out to be an xAI infrastructure spell, not a load issue,
// since serial passes during that window also failed. Override via env when the
// endpoint is acting up (AUDIO_PARALLEL=1 fully serialises for mop-up).
const AUDIO_PARALLEL = Number(process.env.AUDIO_PARALLEL) > 0
  ? Math.floor(Number(process.env.AUDIO_PARALLEL))
  : 4

// Default: only touch the canonical pod-0 (the shipped pod for every course).
// Other pod ids (e.g. spa_for_eng:music, spa_for_eng:travel-situations) are
// drafts in the table and shouldn't get explainers generated until they're
// real shipping content. Override via --all-pods.
const TARGET_POD_SUFFIX = 'pod-0'

// =============================================================================
// Punctuation-based narration (P5)
// =============================================================================
//
// xAI's auto-detect garbles short Latin-script target tokens (Italian "come
// stai" reads as English "come" + "stay") unless given a clear segmentation
// cue. SSML <voice xml:lang="..."> markup (the previous V6 approach) worked
// most of the time but xAI's parser is unreliable: ~5-15% of clips leaked the
// closing-tag word "voice" as an audible token in production.
//
// Punctuation does the same job without anything to misparse. The P5 form
// (Tom-validated 2026-05-20 across spa + ita, 5 takes each):
//
//   "buongiorno". means good morning. "come stai". means how are you doing.
//
// Double-quoting + a period after each target chunk gives xAI an unambiguous
// "this is a discrete foreign-language token" cue — pronunciation matches
// the V6 SSML version (correct Italian "come"), with no markup leakage.
// Stored explainer_text in DB stays clean prose for dashboard display; the
// quoted form is rebuilt at TTS time from explainer_decomposition.

function buildExplainerNarration(decomposition) {
  // Build "X". means Y. "A". means B. from the structured chunk list.
  // Returns null if decomposition is empty/malformed — caller falls back
  // to plain explainer_text.
  if (!Array.isArray(decomposition) || decomposition.length === 0) return null
  const parts = []
  for (const chunk of decomposition) {
    if (!chunk || typeof chunk.chunk_target !== 'string' || typeof chunk.chunk_known !== 'string') {
      return null
    }
    parts.push(`"${chunk.chunk_target}". means ${chunk.chunk_known}.`)
  }
  return parts.join(' ')
}

// =============================================================================
// ARGV
// =============================================================================

const argv = process.argv.slice(2)
let runText = true
let runAudio = true
let allPods = false
const courses = []
for (const a of argv) {
  if (a === '--no-audio') { runAudio = false; continue }
  if (a === '--no-text') { runText = false; continue }
  if (a === '--all-pods') { allPods = true; continue }
  if (a.startsWith('-')) { console.error('Unknown flag:', a); process.exit(1) }
  courses.push(a)
}
function podFilter(courseCode) {
  // Returns the pod_id pattern to filter listening_pod_sentences by.
  // Default targets only the canonical pod-0; --all-pods opens it up.
  return allPods ? `${courseCode}:%` : `${courseCode}:${TARGET_POD_SUFFIX}`
}
if (courses.length === 0) {
  console.error('Usage: node services/run-pod-explainer-batch.cjs <course_code> [<course_code> ...] [--no-audio] [--no-text]')
  process.exit(1)
}

// =============================================================================
// CLIENTS
// =============================================================================

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env')
  process.exit(1)
}
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Lazy-load the phase8 helpers — that module pulls in the full audio
// server graph, so only require() it when audio gen is actually needed.
// PHASE8_NO_LISTEN suppresses its app.listen() so we don't grab PORT 3465.
let phase8 = null
function getPhase8() {
  if (!phase8) {
    process.env.PHASE8_NO_LISTEN = '1'
    phase8 = require('./phases/phase8-audio-v13.cjs')
  }
  return phase8
}

// =============================================================================
// LOGGING
// =============================================================================

function log(...args) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}]`, ...args)
}

// =============================================================================
// TEXT PASS
// =============================================================================

async function runTextPass(courseCode) {
  log(`[${courseCode}] text: scanning rows missing explainer_text...`)
  const skip = podExplainer.shouldSkipCourse(courseCode)
  if (skip.skip) {
    log(`[${courseCode}] text: SKIPPED (${skip.reason})`)
    return { updated: 0, failed: 0, skipped: true }
  }

  // Pull all in-scope candidates for this course (canonical pod only by default).
  const podPattern = podFilter(courseCode)
  const podQuery = allPods
    ? supabase.from('listening_pod_sentences').select('id, target_text, known_text').like('pod_id', podPattern)
    : supabase.from('listening_pod_sentences').select('id, target_text, known_text').eq('pod_id', podPattern)
  const { data: rows, error } = await podQuery.is('explainer_text', null)
  if (error) throw new Error(`load candidates: ${error.message}`)

  const valid = (rows || []).filter(r => r.target_text && r.known_text)
  log(`[${courseCode}] text: ${valid.length} sentences to process`)
  if (valid.length === 0) return { updated: 0, failed: 0, skipped: false }

  // Slice into batches of TEXT_BATCH_SIZE.
  const batches = []
  for (let i = 0; i < valid.length; i += TEXT_BATCH_SIZE) {
    batches.push(valid.slice(i, i + TEXT_BATCH_SIZE))
  }

  let updated = 0
  let failed = 0
  // Fan out TEXT_PARALLEL waves.
  for (let i = 0; i < batches.length; i += TEXT_PARALLEL) {
    const wave = batches.slice(i, i + TEXT_PARALLEL)
    await Promise.all(wave.map(async batch => {
      let resultsById
      try {
        resultsById = await podExplainer.generateForBatch({
          courseCode,
          sentences: batch.map(r => ({
            id: r.id,
            target_text: r.target_text,
            known_text: r.known_text,
          })),
        })
      } catch (err) {
        log(`[${courseCode}] text batch failed:`, err?.message || err)
        failed += batch.length
        return
      }
      for (const row of batch) {
        const result = resultsById.get(row.id)
        if (!result) { failed++; continue }
        const { error: upErr } = await supabase
          .from('listening_pod_sentences')
          .update({
            explainer_decomposition: result.decomposition,
            explainer_text: result.explainer_text,
          })
          .eq('id', row.id)
        if (upErr) { failed++; log('write failed:', row.id, upErr.message); continue }
        updated++
      }
    }))
    log(`[${courseCode}] text progress: ${updated}/${valid.length} updated, ${failed} failed`)
  }
  return { updated, failed, skipped: false }
}

// =============================================================================
// AUDIO PASS
// =============================================================================

async function runAudioPass(courseCode) {
  log(`[${courseCode}] audio: scanning rows ready for TTS...`)
  // Pull sentences where explainer_text is non-empty AND explainer_audio_id is NULL.
  // Empty explainer_text rows are intentional skips (one-chunk sentences) and
  // shouldn't generate audio. explainer_decomposition is the structured form
  // we use to build SSML <voice xml:lang> wrappers per target chunk.
  const podPattern = podFilter(courseCode)
  const COLS = 'id, explainer_text, explainer_decomposition, explainer_audio_id'
  const baseQuery = allPods
    ? supabase.from('listening_pod_sentences').select(COLS).like('pod_id', podPattern)
    : supabase.from('listening_pod_sentences').select(COLS).eq('pod_id', podPattern)
  const { data: rows, error } = await baseQuery
    .not('explainer_text', 'is', null)
    .neq('explainer_text', '')
    .is('explainer_audio_id', null)
  if (error) throw new Error(`load audio candidates: ${error.message}`)

  log(`[${courseCode}] audio: ${(rows || []).length} sentences to render`)
  if (!rows || rows.length === 0) return { rendered: 0, reused: 0, failed: 0 }

  const { generatePodAudio } = getPhase8()
  let rendered = 0
  let reused = 0
  let failed = 0

  // Fan out AUDIO_PARALLEL TTS calls — each one mastering + uploading +
  // inserting into course_audio independently. The findExistingAudio cache
  // inside generatePodAudio dedupes by text+voice across sentences with
  // identical explainer_text (rare but possible).
  for (let i = 0; i < rows.length; i += AUDIO_PARALLEL) {
    const wave = rows.slice(i, i + AUDIO_PARALLEL)
    await Promise.all(wave.map(async row => {
      try {
        // Prefer the P5-quoted form built from the structured decomposition;
        // if that's missing/malformed (legacy rows before the explainer
        // columns landed) fall back to the flat explainer_text.
        const narration = buildExplainerNarration(row.explainer_decomposition)
        const ttsText = narration || row.explainer_text
        const result = await generatePodAudio({
          courseCode,
          text: ttsText,
          language: EXPLAINER_LANGUAGE,
          role: EXPLAINER_ROLE,
          voice: {
            voice_id: EXPLAINER_VOICE_ID,
            provider: EXPLAINER_PROVIDER,
          },
        })
        const audioId = result.id
        if (!audioId) throw new Error('no audio id returned from generatePodAudio')
        const { error: upErr } = await supabase
          .from('listening_pod_sentences')
          .update({ explainer_audio_id: audioId })
          .eq('id', row.id)
        if (upErr) throw new Error(`link write failed: ${upErr.message}`)
        if (result.reused) reused++
        else rendered++
      } catch (err) {
        failed++
        log(`[${courseCode}] audio fail for ${row.id}:`, err?.message || err)
      }
    }))
    log(`[${courseCode}] audio progress: ${rendered} rendered + ${reused} reused, ${failed} failed (of ${rows.length})`)
  }
  return { rendered, reused, failed }
}

// =============================================================================
// MAIN
// =============================================================================

;(async () => {
  log(`Starting batch run for ${courses.length} courses: ${courses.join(', ')}`)
  log(`Phases: text=${runText} audio=${runAudio}`)
  const startedAt = Date.now()
  const summary = []
  for (const courseCode of courses) {
    log(`=== ${courseCode} ===`)
    const courseStart = Date.now()
    let textResult = null
    let audioResult = null
    try {
      if (runText) textResult = await runTextPass(courseCode)
      if (runAudio) audioResult = await runAudioPass(courseCode)
    } catch (err) {
      log(`[${courseCode}] FATAL:`, err?.message || err)
      summary.push({ courseCode, error: err?.message || String(err) })
      continue
    }
    summary.push({
      courseCode,
      text: textResult,
      audio: audioResult,
      elapsed_ms: Date.now() - courseStart,
    })
    log(`=== ${courseCode} done in ${Math.round((Date.now() - courseStart) / 1000)}s ===`)
  }

  log(`\nALL DONE in ${Math.round((Date.now() - startedAt) / 1000)}s`)
  console.log('\n--- summary ---')
  console.log(JSON.stringify(summary, null, 2))
  process.exit(0)
})().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
