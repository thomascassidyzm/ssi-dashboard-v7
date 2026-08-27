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
const { resolveExplainerLanguage } = require('../tools/pod-voice-coverage.cjs')
const { canonicalLanguage } = require('./shared/clip-identity.cjs')

// =============================================================================
// CONFIG
// =============================================================================

// Default: Tom's branded clone. Override via VOICE_ID env or --voice flag —
// useful for testing whether stubborn xAI ECONNRESETs are voice-endpoint-specific
// (e.g. retry the same failed sentence with public 'leo' / 'rex' to compare).
const EXPLAINER_VOICE_ID = process.env.VOICE_ID || 'gfzdpspr5fdp'
// Explainer language is now resolved PER COURSE to the target language (fr,
// pt-PT, es-MX, …) via the coverage map — Tom-validated 2026-06-07 that an
// explicit target cue pronounces ambiguous tokens ("bien", "pain") far better
// than 'auto'. Falls back to 'auto' for languages xAI can't speak (Azure tail).
// This also changes the course_audio.language dedup key, so switching a course
// from the old 'auto' clips forces fresh synthesis (no stale reuse).
// IMPORTANT: must be 'pod_explainer'. Using role='presentation' here makes
// these rows indistinguishable from course-intro presentation audio, and
// /regenerate-presentations in phase8-audio-v13.cjs USED TO delete any
// role='presentation' row with NULL lego_id whose text didn't match a current
// LEGO presentation — which is exactly what these are. The Italian + Chinese
// explainer audio from the first batch run got wiped by that path. Migration
// 20260519_course_audio_pod_explainer_role.sql adds 'pod_explainer' to the
// allow-list, which is what keeps this role out of that scan.
// That orphan delete is GONE as of 2026-08-27 (canon C23, make-before-break):
// those rows are counted and reported now, never removed. The separation still
// matters — a future deliberate cleanup pass would face the same question — but
// do not read the paragraph above as a description of running code.
const EXPLAINER_ROLE = 'pod_explainer'
const EXPLAINER_PROVIDER = 'xai'

const TEXT_BATCH_SIZE = Number(process.env.TEXT_BATCH_SIZE) > 0
  ? Math.floor(Number(process.env.TEXT_BATCH_SIZE))
  : 12
// TEXT_PARALLEL=4 is the default for healthy Claude CLI throughput. When
// Anthropic's CLI subscription is throttling concurrent invocations (whole
// waves failing with bare 'Command failed') drop to 1 for fully-serialised
// mop-up: TEXT_PARALLEL=1 EXPLAINER_MODEL=sonnet node services/run-pod-...
const TEXT_PARALLEL = Number(process.env.TEXT_PARALLEL) > 0
  ? Math.floor(Number(process.env.TEXT_PARALLEL))
  : 4
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

// The sparse rule-3 construction tail ("— so 'from Split I am'" / "— literally
// 'I ask'") is appended at the end of explainer_text and is NOT present in the
// structured decomposition. Pull it so the P5 rebuild can keep it.
function extractConstructionTail(explainerText) {
  if (typeof explainerText !== 'string') return null
  const m = explainerText.match(/[—–-]\s*(so|literally)\b[\s\S]*$/i)
  if (!m) return null
  return m[0].replace(/^[—–\-]\s*/, '').trim().replace(/[.\s]*$/, '.')
}

function buildExplainerNarration(decomposition, explainerText, connector = 'means') {
  // FIRST-ENCOUNTER DISCIPLINE (Tom 2026-06-10): chunks flagged
  // first_encounter:false by runOncePass are repeats — never narrated again.
  // A flagless chunk counts as first (pre-once-pass rows keep old behaviour).
  // Identity chunks ("Sarah" means Sarah — untranslated proper nouns the
  // model failed to drop per rule 6) carry zero information: never narrated.
  if (Array.isArray(decomposition) && decomposition.length > 0) {
    const active = decomposition.filter(c => c && c.first_encounter !== false && !isIdentityChunk(c))
    if (active.length === 0) return null // everything already introduced — no explainer
    decomposition = active
  }
  // P5 PUNCTUATION FORM (Tom-validated 2026-05-20 across spa+ita; see
  // reference_ssi_tts_recipe_and_intro_model): double-quote each target chunk
  // and put a period after it, joined by the localised connector —
  //   "buongiorno". means good morning. "come stai". means how are you doing.
  // The quotes+period give xAI an unambiguous discrete-foreign-token cue with
  // NOTHING to misparse (the SSML <voice xml:lang> approach leaked the word
  // "voice" in 5-15% of clips). Built from the structured decomposition (the
  // clean target/known pairs). The rare construction tail lives only in
  // explainer_text, so we extract + append it. NOTE: verbatim TTS of the clean
  // dashboard prose would DROP the quote cue, so we rebuild from decomposition
  // whenever it's present and fall back to verbatim prose only when it isn't.
  if (Array.isArray(decomposition) && decomposition.length > 0) {
    const parts = []
    let ok = true
    for (const chunk of decomposition) {
      if (!chunk || typeof chunk.chunk_target !== 'string' || typeof chunk.chunk_known !== 'string') { ok = false; break }
      parts.push(`"${chunk.chunk_target}". ${connector} ${chunk.chunk_known}.`)
    }
    if (ok && parts.length) {
      let narration = parts.join(' ')
      const tail = extractConstructionTail(explainerText)
      if (tail) narration += ` ${tail}`
      return narration
    }
  }
  // Fallback: no usable decomposition → TTS explainer_text verbatim.
  if (typeof explainerText === 'string' && explainerText.trim()) return explainerText.trim()
  return null
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
    ? supabase.from('listening_pod_sentences').select('id, target_text, known_text, speaker').like('pod_id', podPattern)
    : supabase.from('listening_pod_sentences').select('id, target_text, known_text, speaker').eq('pod_id', podPattern)
  const { data: rows, error } = await podQuery.is('explainer_text', null)
  if (error) throw new Error(`load candidates: ${error.message}`)

  // Narrator rows are the canon-v2 vocab codas (numbers/colours/days). They
  // NEVER get an explainer — the translation plays anyway (Tom 2026-06-10).
  // Stamp them '' so they're deliberately done, not re-scanned every run.
  const codas = (rows || []).filter(r => r.speaker === 'Narrator')
  for (const r of codas) {
    const { error: codaErr } = await supabase.from('listening_pod_sentences')
      .update({ explainer_decomposition: [], explainer_text: '' }).eq('id', r.id)
    if (codaErr) log(`[${courseCode}] coda stamp failed:`, r.id, codaErr.message)
  }
  if (codas.length) log(`[${courseCode}] text: ${codas.length} Narrator coda(s) stamped no-explainer`)

  const valid = (rows || []).filter(r => r.target_text && r.known_text && r.speaker !== 'Narrator')
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
// ONCE PASS — first-encounter discipline (Tom 2026-06-10)
// =============================================================================
// "We never want an explainer for something ALREADY introduced." Deterministic
// code, not LLM judgement: walk each pod in global_order, flag every chunk's
// FIRST occurrence (first_encounter:true) and every repeat (false). Narration
// (buildExplainerNarration) speaks only first-encounter chunks; a sentence
// with nothing new gets explainer_text '' and no audio — the player just plays
// the translation. Decomposition data is kept intact (flags are additive).
// Idempotent: same rows in, same flags out; audio is nulled ONLY when the
// effective narration actually changed.

function normChunkKey(s) {
  return String(s || '').normalize('NFC').toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, '')
    .trim()
}

// "X means X" is always noise — an untranslated token (proper noun, loanword
// echo) the model should have dropped. Excluded from narration and prose.
function isIdentityChunk(ch) {
  const t = normChunkKey(ch && ch.chunk_target)
  return t !== '' && t === normChunkKey(ch && ch.chunk_known)
}

async function runOncePass(courseCode) {
  const { learner } = podExplainer.parseCourseCode(courseCode)
  const connector = podExplainer.getConnectorForLearnerLang(learner)
  const podPattern = podFilter(courseCode)
  const COLS = 'id, pod_id, global_order, explainer_decomposition, explainer_text, explainer_audio_id'
  const q = allPods
    ? supabase.from('listening_pod_sentences').select(COLS).like('pod_id', podPattern)
    : supabase.from('listening_pod_sentences').select(COLS).eq('pod_id', podPattern)
  const { data: rows, error } = await q.order('pod_id').order('global_order')
  if (error) throw new Error(`once-pass load: ${error.message}`)

  let flagged = 0, emptied = 0, revoice = 0
  const seenByPod = new Map()
  for (const row of rows || []) {
    const dec = Array.isArray(row.explainer_decomposition) ? row.explainer_decomposition : null
    if (!dec || dec.length === 0) continue
    if (!seenByPod.has(row.pod_id)) seenByPod.set(row.pod_id, new Set())
    const seen = seenByPod.get(row.pod_id)

    const oldNarration = buildExplainerNarration(dec, row.explainer_text, connector)
    const newDec = dec.map(ch => {
      const key = normChunkKey(ch && ch.chunk_target)
      if (!key) return ch
      const first = !seen.has(key)
      seen.add(key)
      return { ...ch, first_encounter: first }
    })
    const newNarration = buildExplainerNarration(newDec, row.explainer_text, connector)

    const active = newDec.filter(c => c && c.first_encounter !== false && !isIdentityChunk(c))
    const flagsChanged = JSON.stringify(newDec) !== JSON.stringify(dec)
    const narrationChanged = newNarration !== oldNarration

    if (!flagsChanged && !narrationChanged) continue

    // Display prose mirrors the spoken form: first-encounter chunks only,
    // tail preserved while any chunk survives; '' when nothing is new.
    const tail = extractConstructionTail(row.explainer_text)
    const newText = active.length === 0 ? '' :
      active.map(ch => `${ch.chunk_target} ${connector} ${ch.chunk_known}`).join(', ') + (tail ? ` — ${tail.replace(/\.$/, '')}` : '')

    const update = { explainer_decomposition: newDec, explainer_text: newText }
    if (narrationChanged && row.explainer_audio_id) { update.explainer_audio_id = null; revoice++ }
    const { error: upErr } = await supabase.from('listening_pod_sentences').update(update).eq('id', row.id)
    if (upErr) { log(`[${courseCode}] once-pass write failed:`, row.id, upErr.message); continue }
    flagged++
    if (active.length === 0) emptied++
  }
  log(`[${courseCode}] once-pass: ${flagged} rows updated (${emptied} fully-repeat → no explainer, ${revoice} queued for re-voice)`)
  return { flagged, emptied, revoice }
}

// =============================================================================
// AUDIO PASS
// =============================================================================

async function runAudioPass(courseCode) {
  // Localised connector for the P5 narration ("means" for _for_eng, "veut dire"
  // for _for_fra, …), keyed on the learner (known) half of the course code.
  const { target, learner } = podExplainer.parseCourseCode(courseCode)
  const connector = podExplainer.getConnectorForLearnerLang(learner)
  // Explicit target-language cue (fr / pt-PT / es-MX / …) so ambiguous tokens
  // pronounce correctly; 'auto' only for languages xAI can't speak.
  //
  // This is a TTS TUNING PARAMETER, not the clip's language. It used to be both
  // — the same string steered xAI and was written into course_audio.language,
  // which is where the 7,847 language='auto' rows came from. It now travels as
  // ttsLanguageCue and the identity column gets the course's own target
  // language. resolveExplainerLanguage is a pure function of that target
  // (tools/pod-voice-coverage.cjs: TARGET table → locale → XAI_EXPLAINER_LANGS),
  // so the cue stays derivable from the identity and nothing is lost.
  const explainerLanguage = resolveExplainerLanguage(target)
  const identityLanguage = canonicalLanguage(target)
  log(`[${courseCode}] audio: scanning rows ready for TTS... (connector="${connector}", cue="${explainerLanguage}", language="${identityLanguage}")`)
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

  async function renderOne(row) {
    // TTS the authored explainer_text VERBATIM (it carries the calibrated
    // tail / usage note). Only legacy rows with no explainer_text fall back
    // to the rebuilt P5-quoted form from the structured decomposition.
    const narration = buildExplainerNarration(row.explainer_decomposition, row.explainer_text, connector)
    const ttsText = narration || row.explainer_text
    const result = await generatePodAudio({
      courseCode,
      text: ttsText,
      language: identityLanguage,
      ttsLanguageCue: explainerLanguage,
      role: EXPLAINER_ROLE,
      voice: {
        voice_id: EXPLAINER_VOICE_ID,
        provider: EXPLAINER_PROVIDER,
        // carry the locale so buildPodTTSConfig uses it directly (toBcp47
        // would strip pt-PT→pt, es-MX→es; the explainer needs the exact cue)
        locale: explainerLanguage === 'auto' ? null : explainerLanguage,
      },
    })
    const audioId = result.id
    if (!audioId) throw new Error('no audio id returned from generatePodAudio')
    const { error: upErr } = await supabase
      .from('listening_pod_sentences')
      .update({ explainer_audio_id: audioId })
      .eq('id', row.id)
    if (upErr) throw new Error(`link write failed: ${upErr.message}`)
    return result.reused
  }

  // Round 0 over all rows, then retry rounds over ONLY the still-failed rows.
  // generatePodAudio dedupes by text+voice (findExistingAudio), so a retry
  // re-attempts just the failures. This mirrors the tts stage's retry-rounds so
  // transient S3 / Supabase / connection blips under load self-heal instead of
  // permanently failing the clip (this stage previously had NO retry, which made
  // it the fragile link whenever the machine was under concurrent load).
  let queue = rows
  for (let round = 0; round <= 3 && queue.length; round++) {
    if (round > 0) {
      log(`[${courseCode}] explainer retry round ${round}: ${queue.length} failed clip(s)`)
      await new Promise(r => setTimeout(r, 3000 * round))
    }
    const stillFailed = []
    for (let i = 0; i < queue.length; i += AUDIO_PARALLEL) {
      const wave = queue.slice(i, i + AUDIO_PARALLEL)
      await Promise.all(wave.map(async row => {
        try {
          const wasReused = await renderOne(row)
          if (wasReused) reused++; else rendered++
        } catch (err) {
          stillFailed.push(row)
          // err.message carries a [STAGE=...] tag from generatePodAudio identifying
          // which call failed (tts / master / s3) — keep it for triage.
          log(`[${courseCode}] audio fail for ${row.id}: code=${err?.code || '?'} ${err?.message || err}`)
        }
      }))
      log(`[${courseCode}] audio progress: ${rendered} rendered + ${reused} reused, ${stillFailed.length} failing-this-round (of ${queue.length})`)
    }
    queue = stillFailed
  }
  return { rendered, reused, failed: queue.length }
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
    // COMPOSITE EXPLAINERS FOR ALL COURSES (Tom 2026-06-11). Born as the
    // fix for languages the clone can't speak, promoted to THE method:
    // the learner hears each chunk as THE CHARACTER ACTUALLY SAYS IT (the
    // cast voice), with "means …" glosses in the known voice — absolute
    // consistency, no second generative rendering to drift or mispronounce,
    // and it works for every language pair. The clone path (runAudioPass)
    // is retired; see services/pod-explainer-composite.cjs.
    try {
      if (runText) textResult = await runTextPass(courseCode)
      await runOncePass(courseCode) // first-encounter discipline before any TTS
      if (runAudio) {
        const { compositeExplainersForCourse } = require('./pod-explainer-composite.cjs')
        audioResult = await compositeExplainersForCourse(courseCode, { log })
      }
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
