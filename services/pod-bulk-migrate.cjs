#!/usr/bin/env node
/**
 * pod-bulk-migrate.cjs — resumable bulk migration of Listening Pod 0 across
 * every pod-0 course, onto the canonical-generated pipeline.
 *
 * Per course, four stages run in order:
 *   1. regen      — full dialogue rebuild from canonical_pod_scenarios:
 *                     node services/pod-dialogue-generator.cjs <course> --force
 *                   (mode:'full' = wipe + re-flex every scene; afterwards the
 *                    pod is source 'generated:canonical' with metadata.scene_hashes,
 *                    enabling future --sync.)
 *   2. recolour   — re-assign speaker voices + null changed audio:
 *                     node tools/pod-recolour.cjs --course=<course> --apply
 *   3. tts        — render the missing target+known dialogue audio. This mirrors
 *                   Phase 8's POST /generate-pods/<course> EXACTLY (same work
 *                   queue, same generatePodAudio call). Driven in-process via the
 *                   exported generatePodAudio (PHASE8_NO_LISTEN=1) — no running
 *                   server required — or, with --tts=http, by POSTing to a live
 *                   Phase 8 on localhost:3465.
 *   4. explainers — null explainer_audio_id for this course's pod-0 rows, then
 *                     node services/run-pod-explainer-batch.cjs <course>
 *                   (FULL batch: text pass first — regen wipes explainer_text/
 *                    decomposition with the rows — then the audio pass).
 *
 * RESUMABLE + IDEMPOTENT. A per-course ledger (scripts/pod-bulk-migrate-ledger.json)
 * records each course's stage state (pending → running → done | failed). On
 * relaunch the batch skips completed stages and continues. The ledger is also
 * BOOTSTRAPPED from observable DB state at the start of every run, so a course
 * whose regen/tts is already complete (e.g. fra_for_eng, mid-pipeline by hand)
 * is detected as done without a prior ledger entry.
 *
 * Courses run SEQUENTIALLY (the claude CLI + TTS providers are the bottleneck;
 * parallelising courses would only thrash them). A single course's failure is
 * logged, marked failed in the ledger, and the batch moves on; the final summary
 * lists failures.
 *
 * SKIPPED courses: all Welsh (cym, cym_n, cym_s — no Welsh pods + TTS
 * voice-quality blocker). hrv_for_eng was skipped while Aran's hand-authored
 * Croatian was in livecast use; canon v2 (2026-06-10) supersedes it. This
 * reuses pod-explainer-generator.shouldSkipCourse, the same skip authority
 * the explainer batch already honours.
 *
 * Usage:
 *   node services/pod-bulk-migrate.cjs --dry-run            # plan only, touch nothing
 *   node services/pod-bulk-migrate.cjs                      # run the real migration
 *   node services/pod-bulk-migrate.cjs --only=fra_for_eng,spa_for_eng
 *   node services/pod-bulk-migrate.cjs --from=lit_for_eng   # resume from a course
 *   node services/pod-bulk-migrate.cjs --tts=http           # use a live Phase 8 (3465) for TTS
 *   node services/pod-bulk-migrate.cjs --redo=tts --only=fra_for_eng   # force-rerun a stage
 *
 * Designed to be tee'd to a log:
 *   node services/pod-bulk-migrate.cjs 2>&1 | tee logs/pod-bulk-migrate-$(date +%F).log
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const fs = require('fs')
const { spawn } = require('child_process')
const { createClient } = require('@supabase/supabase-js')
const { CLAUDE_CONFIG_DIR } = require('./shared/claude-config.cjs')
const { shouldSkipCourse, parseCourseCode, getConnectorForLearnerLang } = require('./pod-explainer-generator.cjs')
const { resolveExplainerLanguage } = require('../tools/pod-voice-coverage.cjs')

// =============================================================================
// CONFIG
// =============================================================================

const REPO_ROOT = path.join(__dirname, '..')
const LEDGER_PATH = path.join(REPO_ROOT, 'scripts', 'pod-bulk-migrate-ledger.json')
const POD_SLUG = 'pod-0'
const STAGES = ['regen', 'recolour', 'tts', 'explainers']
const PHASE8_PORT = Number(process.env.PHASE8_PORT) || 3465

const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
)

// =============================================================================
// ARGV
// =============================================================================

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const argv = process.argv.slice(2)
const getArg = (flag) => {
  for (const a of argv) { if (a === flag) return true; if (a.startsWith(flag + '=')) return a.slice(flag.length + 1) }
  return null
}
const DRY_RUN = !!getArg('--dry-run')
const ONLY = (() => { const v = getArg('--only'); return v && v !== true ? new Set(String(v).split(',').map(s => s.trim()).filter(Boolean)) : null })()
const FROM = (() => { const v = getArg('--from'); return v && v !== true ? String(v).trim() : null })()
const REDO = (() => { const v = getArg('--redo'); return v && v !== true ? new Set(String(v).split(',').map(s => s.trim()).filter(Boolean)) : null })()
const TTS_MODE = (() => { const v = getArg('--tts'); return v === 'http' ? 'http' : 'inproc' })()

// =============================================================================
// LOGGING
// =============================================================================

function ts() { return new Date().toISOString() }
function log(...a) { console.log(`[${ts().slice(11, 19)}]`, ...a) }
function stageLog(course, stage, ...a) { console.log(`[${ts().slice(11, 19)}] [${course}] [${stage}]`, ...a) }

// =============================================================================
// LEDGER
// =============================================================================
//
// Shape:
// {
//   started_at, updated_at,
//   courses: {
//     <course_code>: {
//       skip?: <reason>,
//       stages: { regen: 'done'|'pending'|'running'|'failed', recolour: ..., tts: ..., explainers: ... },
//       errors: { <stage>: <message> },
//       finished_at?: <iso>
//     }
//   }
// }

function loadLedger() {
  try {
    const raw = fs.readFileSync(LEDGER_PATH, 'utf8')
    const led = JSON.parse(raw)
    if (!led.courses) led.courses = {}
    return led
  } catch (_) {
    return { started_at: ts(), updated_at: ts(), courses: {} }
  }
}

function saveLedger(led) {
  if (DRY_RUN) return  // dry-run never writes
  led.updated_at = ts()
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true })
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(led, null, 2))
}

function ensureCourse(led, course) {
  if (!led.courses[course]) {
    led.courses[course] = { stages: { regen: 'pending', recolour: 'pending', tts: 'pending', explainers: 'pending' }, errors: {} }
  }
  if (!led.courses[course].stages) led.courses[course].stages = { regen: 'pending', recolour: 'pending', tts: 'pending', explainers: 'pending' }
  if (!led.courses[course].errors) led.courses[course].errors = {}
  return led.courses[course]
}

// =============================================================================
// DISCOVERY + DETECTION
// =============================================================================

/** All courses that currently have a pod-0 row. */
async function discoverPod0Courses() {
  const { data, error } = await supabase
    .from('listening_pods')
    .select('id, course_code, source_file, metadata')
    .like('id', `%:${POD_SLUG}`)
  if (error) throw new Error(`discover pod-0 courses: ${error.message}`)
  const map = new Map()
  for (const p of data || []) {
    if (!map.has(p.course_code)) map.set(p.course_code, p)
  }
  return [...map.values()].sort((a, b) => a.course_code.localeCompare(b.course_code))
}

/** count helper */
async function countSentences(podId, filterCb) {
  let q = supabase.from('listening_pod_sentences').select('id', { count: 'exact', head: true }).eq('pod_id', podId)
  if (filterCb) q = filterCb(q)
  const { count, error } = await q
  if (error) throw new Error(`count ${podId}: ${error.message}`)
  return count || 0
}

/**
 * Derive each stage's completion from OBSERVABLE DB state (so the ledger can be
 * bootstrapped, and so manual mid-pipeline work like fra_for_eng is honoured).
 *
 * regen   done  ⟺ pod source is 'generated:canonical' AND has scene_hashes AND sentences.
 *               (The canonical-pipeline marker — distinguishes a re-flexed pod
 *                from a hand-authored markdown pod that merely has sentences.)
 * tts     done  ⟺ every sentence has BOTH target_audio_id and known_audio_id.
 * explainers done ⟺ every sentence WITH explainer_text has explainer_audio_id
 *               AND at least one explainer_audio_id exists (avoids "0/0 = done").
 *
 * recolour is not separately observable in the DB (it just rewrites speakers +
 * nulls changed audio, which tts then refills) — it's tracked in the ledger only.
 * If tts is observed done, recolour is implied done too.
 */
async function detectState(pod) {
  const podId = pod.id
  const isGenerated = String(pod.source_file || '').startsWith('generated:')
  const hashCount = pod.metadata && pod.metadata.scene_hashes ? Object.keys(pod.metadata.scene_hashes).length : 0
  const total = await countSentences(podId)
  const tgtAudio = await countSentences(podId, q => q.not('target_audio_id', 'is', null))
  const knownAudio = await countSentences(podId, q => q.not('known_audio_id', 'is', null))
  const expText = await countSentences(podId, q => q.not('explainer_text', 'is', null).neq('explainer_text', ''))
  const expAudioOfText = await countSentences(podId, q => q.not('explainer_text', 'is', null).neq('explainer_text', '').not('explainer_audio_id', 'is', null))

  const regenDone = isGenerated && hashCount > 0 && total > 0
  const ttsDone = total > 0 && tgtAudio >= total && knownAudio >= total
  const explainersDone = expText > 0 && expAudioOfText >= expText

  return {
    source_file: pod.source_file,
    hand_authored: !isGenerated,
    counts: { total, tgtAudio, knownAudio, expText, expAudioOfText, hashCount },
    observed: {
      regen: regenDone ? 'done' : 'pending',
      // recolour can't be observed independently; if tts is done it's implied done.
      recolour: ttsDone ? 'done' : 'pending',
      tts: ttsDone ? 'done' : 'pending',
      explainers: explainersDone ? 'done' : 'pending',
    },
  }
}

/** Merge observed state into the ledger (observed 'done' wins over a stale
 *  'pending'/'failed'; a ledger 'done' is preserved even if the observation
 *  can't confirm it, e.g. recolour).
 *
 *  GUARD: a downstream stage may only be bootstrapped 'done' if ALL earlier
 *  stages are also done (observed or already in the ledger). Otherwise a
 *  hand-authored course that already has audio (tts looks "done") but whose
 *  regen is pending would skip tts AFTER regen wipes that audio. Once an
 *  earlier stage is pending, every later stage is forced pending. */
function bootstrapStages(entry, observed) {
  // Stages whose completion is directly observable in the DB. For these,
  // observation is authoritative: a ledger 'done' with a pending observation
  // means the DB state regressed under it (e.g. explainer clips that failed
  // after the stage runner exited 0) — re-run, don't trust the stamp.
  // recolour is NOT here: it isn't observable, its ledger entry must win.
  const OBSERVABLE = new Set(['regen', 'tts', 'explainers'])
  let upstreamAllDone = true
  for (const stage of STAGES) {
    const ledgerDone = entry.stages[stage] === 'done'
      && !(OBSERVABLE.has(stage) && observed[stage] !== 'done')
    const observedDone = observed[stage] === 'done'
    if (upstreamAllDone && (observedDone || ledgerDone)) {
      entry.stages[stage] = 'done'
      delete entry.errors[stage]
    } else {
      // An upstream stage isn't done → this (and everything after) is stale.
      upstreamAllDone = false
      if (entry.stages[stage] === 'done') entry.stages[stage] = 'pending'
    }
  }
}

// =============================================================================
// SUBPROCESS RUNNER
// =============================================================================

/** Run a child node process, streaming its stdout/stderr to ours (prefixed),
 *  resolving on exit 0, rejecting otherwise. Unsets CLAUDECODE so nested claude
 *  CLI calls (in pod-dialogue-generator) work, per CLAUDE.md. */
function runProcess(cmd, args, { course, stage }) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: REPO_ROOT,
      env: { ...process.env, CLAUDECODE: '', CLAUDE_CONFIG_DIR },  // pin claude@ account for nested CLI
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const pipe = (stream, isErr) => {
      let buf = ''
      stream.on('data', (d) => {
        buf += d.toString()
        let i
        while ((i = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, i); buf = buf.slice(i + 1)
          if (line.trim()) console.log(`[${ts().slice(11, 19)}] [${course}] [${stage}]${isErr ? ' !' : ''} ${line}`)
        }
      })
      stream.on('end', () => { if (buf.trim()) console.log(`[${ts().slice(11, 19)}] [${course}] [${stage}]${isErr ? ' !' : ''} ${buf}`) })
    }
    pipe(child.stdout, false)
    pipe(child.stderr, true)
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${path.basename(cmd === 'node' ? args[0] : cmd)} exited ${code}`))
    })
  })
}

// =============================================================================
// STAGE IMPLEMENTATIONS
// =============================================================================

async function stageRegen(course) {
  await runProcess('node', ['services/pod-dialogue-generator.cjs', course, '--force'], { course, stage: 'regen' })
  // Wholesale content replacement → restart every learner's pod progression
  // from sentence 1 of the NEW content (Tom 2026-06-10: "reset completed pods
  // for existing learners when we do wholesale changes"). Without this, a
  // learner with a high pod-round counter computes the new sentences at
  // advanced stages and never hears their Phase-0 explainers.
  const { data: reset, error } = await supabase
    .from('course_enrollments')
    .update({ completed_pod_rounds: 0, pod_activation_round: null })
    .eq('course_id', course)
    .or('completed_pod_rounds.gt.0,pod_activation_round.not.is.null')
    .select('id')
  if (error) throw new Error(`pod-counter reset: ${error.message}`)
  if (reset && reset.length) log(`[${course}] [regen] reset pod counters on ${reset.length} enrollment(s)`)
}

async function stageRecolour(course) {
  await runProcess('node', ['tools/pod-recolour.cjs', `--course=${course}`, '--apply'], { course, stage: 'recolour' })
}

async function stageExplainers(course) {
  // Null any existing explainer_audio_id for this course's pod-0 rows (the
  // dialogue text changed under them in regen, so old explainer audio is stale),
  // then run the FULL explainer batch: regen wipes explainer_text +
  // explainer_decomposition with the rows, so the text pass must run before
  // the audio pass has anything to voice (--no-text would be a silent no-op).
  const podId = `${course}:${POD_SLUG}`
  const { error } = await supabase
    .from('listening_pod_sentences')
    .update({ explainer_audio_id: null })
    .eq('pod_id', podId)
    .not('explainer_audio_id', 'is', null)
  if (error) throw new Error(`null explainer_audio_id: ${error.message}`)
  // Azure-tail targets the clone can't speak now go through the COMPOSITE
  // path inside the batch (pod-explainer-composite.cjs: target-voice chunks
  // + known-voice glosses spliced into one file) — every texted row gets
  // audio either way, so the voiced-count verify below applies uniformly.
  await runProcess('node', ['services/run-pod-explainer-batch.cjs', course], { course, stage: 'explainers' })
  // VERIFY: the explainer batch exits 0 even when individual clips fail (xAI
  // ECONNRESET spells can drop most of a course). Re-observe and throw on a
  // shortfall so the ledger marks this course failed and a relaunch retries —
  // otherwise an unlucky course is silently stamped done with explainers missing.
  const expText = await countSentences(podId, q => q.not('explainer_text', 'is', null).neq('explainer_text', ''))
  const expVoiced = await countSentences(podId, q => q.not('explainer_text', 'is', null).neq('explainer_text', '').not('explainer_audio_id', 'is', null))
  if (expText === 0) throw new Error('explainers incomplete: text pass produced 0 rows')
  if (expVoiced < expText) throw new Error(`explainers incomplete: ${expVoiced}/${expText} voiced (TTS failures — re-run to fill)`)
}

// ---- TTS stage ----------------------------------------------------------------
// Two execution modes:
//   inproc (default): require phase8 with PHASE8_NO_LISTEN=1 and drive the
//     exported generatePodAudio over a work queue that mirrors the
//     /generate-pods endpoint exactly (only fills NULL audio ids; never deletes).
//   http: POST to a live Phase 8 on localhost:PHASE8_PORT (the validated path
//     that production-api's admin endpoint proxies to).

let _phase8 = null
function getPhase8() {
  if (!_phase8) {
    process.env.PHASE8_NO_LISTEN = '1'
    _phase8 = require('./phases/phase8-audio-v13.cjs')
  }
  return _phase8
}

// Mirror of phase8's private canonicalSpeakerName + resolvePodSpeakerVoice +
// getCourseContext. Kept faithful to services/phases/phase8-audio-v13.cjs so the
// in-process queue resolves voices identically to the /generate-pods endpoint.
function canonicalSpeakerName(speaker) {
  return (speaker || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}
function resolvePodSpeakerVoice(podSpeakers, speaker, track) {
  const mapping = podSpeakers || {}
  const canon = canonicalSpeakerName(speaker)
  const entry = mapping[canon] || mapping[speaker] || mapping._default
  if (!entry) return null
  if (entry[track] && entry[track].voice_id) {
    return {
      voice_id: entry[track].voice_id,
      provider: entry[track].provider || 'azure',
      gender: entry.gender || 'n',
      locale: entry[track].locale || null,
    }
  }
  // Legacy single-track shape (target only); fall through for known.
  if (track === 'target' && entry.voice_id) {
    return { voice_id: entry.voice_id, provider: entry.provider || 'azure', gender: entry.gender || 'n', locale: entry.locale || null }
  }
  return null
}
async function getCourseContext(course) {
  const { data, error } = await supabase
    .from('courses').select('known_lang, target_lang, voice_config').eq('course_code', course).single()
  if (error) throw new Error(`course not found: ${error.message}`)
  const vc = data.voice_config || {}
  const knownVoiceRaw = (vc.voices && vc.voices.known) || {}
  const knownVoice = {
    voice_id: knownVoiceRaw.voiceId || knownVoiceRaw.voice_id || 'en-GB-SoniaNeural',
    provider: knownVoiceRaw.provider || 'azure',
    gender: knownVoiceRaw.gender || 'f',
  }
  return { knownLang: data.known_lang, targetLang: data.target_lang, knownVoice, voiceConfig: vc }
}

async function loadPod0WithSentences(course) {
  const podId = `${course}:${POD_SLUG}`
  const { data: pod, error: pErr } = await supabase
    .from('listening_pods').select('*').eq('id', podId).maybeSingle()
  if (pErr) throw new Error(`load pod: ${pErr.message}`)
  if (!pod) throw new Error(`pod not found: ${podId}`)
  const { data: sentences, error: sErr } = await supabase
    .from('listening_pod_sentences').select('*').eq('pod_id', podId).order('global_order')
  if (sErr) throw new Error(`load sentences: ${sErr.message}`)
  return { ...pod, sentences: sentences || [] }
}

async function stageTtsInproc(course) {
  // SAMPLE-FIRST HARD GATE (Tom's ruling, 2026-08-07). The http mode inherits
  // the gate for free by going through /generate-pods; this in-process mode is
  // the DEFAULT and reimplements that endpoint's work queue, so without this
  // check it is a full bypass of the gate — the one that matters, since this is
  // the bulk driver. Same approval record, same fingerprint, same refusal.
  const podApprovals = require('./pod-voice-approvals.cjs')
  const gate = await podApprovals.checkApproval(supabase, course)
  if (!gate.ok) {
    throw new Error(`pod voices not approved (${gate.reason}) for ${course}. ${gate.message}`)
  }
  stageLog(course, 'tts', `voice approval OK: cast ${gate.live_fingerprint}, approved by ${gate.approval.approved_by}`)

  const phase8 = getPhase8()
  const { generatePodAudio } = phase8
  const ctx = await getCourseContext(course)
  const pod = await loadPod0WithSentences(course)
  const roles = ['target', 'known']

  // CROSS-COURSE CANON REUSE (Tom, 2026-08-11). Same proof the /generate-pods
  // endpoint builds: the set of this pod's lines that are byte-identical
  // canonical pod-0 English, and only when the pod is aligned end to end. A line
  // in that set may point at a sibling course's identical clip instead of paying
  // to render it again. Unavailable canon costs reuse, never correctness.
  let canonTexts = null
  try {
    const englishCol = phase8.englishColumnFor(ctx)
    if (englishCol) {
      canonTexts = phase8.podCanonReuseTexts(await phase8.loadPod0Canon(), pod.sentences, englishCol)
    }
    stageLog(course, 'tts', canonTexts
      ? `canon reuse: ${canonTexts.size} shareable canon line(s) — sibling-course clips are eligible`
      : 'canon reuse: pod not aligned to canon — course-scoped matching only')
  } catch (e) {
    stageLog(course, 'tts', `canon reuse unavailable (${e.message}) — course-scoped matching only`)
    canonTexts = null
  }

  // TEXT APPROVAL GATE (Tom's A-109 ruling, 2026-08-16). Same reasoning as the
  // voice gate above: the http mode inherits this from /generate-pods, but
  // in-process is the DEFAULT mode and rebuilds the endpoint's work queue, so
  // without this it is a full bypass of the gate on the bulk driver — the one
  // place it matters most. Withheld lines are counted and logged, never fatal.
  const podTextApproval = require('./pod-text-approval.cjs')

  const workQueue = []
  let blockedUnapprovedTarget = 0
  for (const s of pod.sentences) {
    // Target only. The line's KNOWN track drops through to the branch below and
    // renders as normal — the draft marker is about target words, and the
    // English side of a drafted line was never in doubt.
    if (!s.target_audio_id && s.target_text && !podTextApproval.targetTextRenderable(s)) {
      blockedUnapprovedTarget++
    } else if (!s.target_audio_id && s.target_text) {
      workQueue.push({ kind: 'target', sentence_id: s.id, text: s.target_text, language: ctx.targetLang, role: 'target1', voice: resolvePodSpeakerVoice(pod.speakers, s.speaker, 'target'), link_column: 'target_audio_id' })
    }
    if (!s.known_audio_id && s.known_text) {
      const knownVoice = resolvePodSpeakerVoice(pod.speakers, s.speaker, 'known') || ctx.knownVoice
      workQueue.push({ kind: 'known', sentence_id: s.id, text: s.known_text, language: ctx.knownLang, role: 'known', voice: knownVoice, link_column: 'known_audio_id' })
    }
  }
  if (blockedUnapprovedTarget) {
    stageLog(course, 'tts', `TEXT GATE: ${blockedUnapprovedTarget} target clip(s) withheld — unapproved draft target_text (verify with tools/pods/verify-pod-text.cjs)`)
  }
  stageLog(course, 'tts', `${workQueue.length} clips to render (${pod.sentences.length} sentences)`)
  if (workQueue.length === 0) return { generated: 0, reused: 0, failed: 0 }

  // Default 5 (matches POD_GEN_CONCURRENCY_DEFAULT; xAI flaky above ~6), but
  // env-tunable for mop-up when the connection pool resets under load —
  // TTS_CONCURRENCY=1 fully serialises, mirroring the explainer AUDIO_PARALLEL=1 knob.
  const concurrency = Number(process.env.TTS_CONCURRENCY) > 0
    ? Math.floor(Number(process.env.TTS_CONCURRENCY))
    : 5
  let generated = 0, reused = 0, failed = 0
  const errors = []
  async function worker(items) {
    for (const item of items) {
      try {
        const result = await generatePodAudio({
          courseCode: course, text: item.text, language: item.language, role: item.role,
          voice: item.voice, ctx, track: item.kind, sentenceId: item.sentence_id, canonTexts,
        })
        const { error: linkErr } = await supabase
          .from('listening_pod_sentences').update({ [item.link_column]: result.id }).eq('id', item.sentence_id)
        if (linkErr) throw new Error(`link: ${linkErr.message}`)
        if (result.reused) reused++; else generated++
      } catch (err) {
        failed++
        errors.push({ sentence_id: item.sentence_id, kind: item.kind, error: err.message })
        stageLog(course, 'tts', `! ${item.sentence_id} ${item.kind}: ${err.message}`)
      }
    }
  }
  // Round 0 over the whole queue, then retry rounds over ONLY the still-failed
  // items. generatePodAudio dedupes by text+voice, so a retry re-attempts just
  // the failures — transient external kills (SIGKILL) / connection blips clear.
  let queue = workQueue
  for (let round = 0; round <= 2 && queue.length; round++) {
    if (round > 0) { stageLog(course, 'tts', `retry round ${round}: ${queue.length} failed clips`); await sleep(3000 * round) }
    failed = 0; errors.length = 0
    const buckets = Array.from({ length: concurrency }, () => [])
    queue.forEach((item, i) => buckets[i % concurrency].push(item))
    await Promise.all(buckets.map(b => worker(b)))
    queue = errors.map(e => workQueue.find(w => w.sentence_id === e.sentence_id && w.kind === e.kind)).filter(Boolean)
  }
  stageLog(course, 'tts', `done: ${generated} generated, ${reused} reused, ${queue.length} failed`)
  if (queue.length > 0) throw new Error(`${queue.length} clip(s) failed to render after retries`)
  return { generated, reused, failed: queue.length }
}

function httpPostPhase8(course, body) {
  const http = require('http')
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body || {})
    const req = http.request(
      { hostname: 'localhost', port: PHASE8_PORT, path: `/generate-pods/${course}`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
      (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }) } catch { resolve({ status: res.statusCode, data: d }) } }) },
    )
    req.on('error', reject)
    req.write(payload); req.end()
  })
}
async function stageTtsHttp(course) {
  // /generate-pods is idempotent (only fills NULL audio ids), so re-POSTing
  // re-attempts just the failures — transient blips clear across rounds.
  let last
  for (let round = 0; round <= 2; round++) {
    if (round > 0) { stageLog(course, 'tts', `retry round ${round}`); await sleep(3000 * round) }
    const r = await httpPostPhase8(course, { pod_ids: [`${course}:${POD_SLUG}`] })
    if (r.status !== 200) throw new Error(`phase8 ${r.status}: ${JSON.stringify(r.data).slice(0, 300)}`)
    last = r.data
    stageLog(course, 'tts', `done: ${r.data.generated} generated, ${r.data.reused} reused, ${r.data.failed} failed`)
    if (!r.data.failed) return r.data
  }
  throw new Error(`${last.failed} clip(s) failed to render after retries`)
}

async function stageTts(course) {
  return TTS_MODE === 'http' ? stageTtsHttp(course) : stageTtsInproc(course)
}

const STAGE_FNS = { regen: stageRegen, recolour: stageRecolour, tts: stageTts, explainers: stageExplainers }

// =============================================================================
// PLAN (shared by dry-run + real run)
// =============================================================================

async function buildPlan() {
  const pods = await discoverPod0Courses()
  const led = loadLedger()
  const plan = []
  for (const pod of pods) {
    const course = pod.course_code
    // eng_for_* (learn-English) courses invert the SSi language model: target
    // is English, known is the _for_XXX language — the voice-coverage map has
    // no English TARGET pool and the known track must NOT be British English.
    // Needs a deliberate language-aware fix; skip from the standard bulk.
    const skip = course.startsWith('eng_for_')
      ? { skip: true, reason: 'eng-target language-inversion — handle separately (see task)' }
      : shouldSkipCourse(course)
    const entry = ensureCourse(led, course)
    if (skip.skip) {
      entry.skip = skip.reason
      plan.push({ course, skip: skip.reason })
      continue
    }
    const state = await detectState(pod)
    bootstrapStages(entry, state.observed)
    const todo = STAGES.filter(s => entry.stages[s] !== 'done' || (REDO && REDO.has(s)))
    plan.push({ course, state, stages: { ...entry.stages }, todo, hand_authored: state.hand_authored })
  }
  return { plan, led }
}

function inScope(course) {
  if (ONLY && !ONLY.has(course)) return false
  return true
}

// =============================================================================
// DRY RUN
// =============================================================================

async function dryRun() {
  log('DRY RUN — no DB writes, no TTS, no ledger writes. Discovering pod-0 courses…')
  const { plan } = await buildPlan()
  const skips = plan.filter(p => p.skip)
  const active = plan.filter(p => !p.skip)
  const handAuthored = active.filter(p => p.hand_authored)

  console.log('\n' + '='.repeat(78))
  console.log(`DISCOVERED ${plan.length} pod-0 courses  ·  ${active.length} to migrate  ·  ${skips.length} skipped`)
  console.log(`TTS mode: ${TTS_MODE}${TTS_MODE === 'http' ? ` (expects live Phase 8 on :${PHASE8_PORT})` : ' (in-process generatePodAudio)'}`)
  if (ONLY) console.log(`--only filter active: ${[...ONLY].join(', ')}`)
  if (FROM) console.log(`--from=${FROM} (would start here)`)
  if (REDO) console.log(`--redo: ${[...REDO].join(', ')} (would force-rerun these stages)`)
  console.log('='.repeat(78))

  console.log('\nSKIPPED:')
  if (!skips.length) console.log('  (none)')
  for (const s of skips) console.log(`  ${s.course.padEnd(18)} — ${s.skip}`)

  console.log('\nPER-COURSE DETECTED STATE  (✓ done · · pending)  [todo = stages that would run]')
  const mark = (st) => st === 'done' ? '✓' : st === 'failed' ? '✗' : '·'
  for (const p of active) {
    if (!inScope(p.course)) continue
    const c = p.state.counts
    const stageStr = STAGES.map(s => `${s[0]}${mark(p.stages[s])}`).join(' ')
    const todoStr = p.todo.length ? p.todo.join(',') : '(nothing — complete)'
    const ha = p.hand_authored ? '  ⚠HAND-AUTHORED→will-be-WIPED-by-regen' : ''
    console.log(`  ${p.course.padEnd(18)} ${stageStr}   sent=${c.total} tgtA=${c.tgtAudio} knoA=${c.knownAudio} expTxt=${c.expText} expAud=${c.expAudioOfText} hash=${c.hashCount}`)
    console.log(`  ${' '.repeat(18)}   → todo: ${todoStr}${ha}`)
  }

  // fra_for_eng spotlight (called out in the brief)
  const fra = active.find(p => p.course === 'fra_for_eng')
  console.log('\n' + '-'.repeat(78))
  if (fra) {
    console.log('fra_for_eng DETECTED STATE (mid-pipeline by hand):')
    console.log(`  source_file=${fra.state.source_file}  hashCount=${fra.state.counts.hashCount}  sentences=${fra.state.counts.total}`)
    console.log(`  observed stages: ${STAGES.map(s => `${s}=${fra.stages[s]}`).join('  ')}`)
    console.log(`  → todo: ${fra.todo.join(', ') || '(none)'}`)
    console.log(`  (regen correctly detected DONE from generated:canonical + scene_hashes — it will NOT be redone.)`)
  } else {
    console.log('fra_for_eng: not found among pod-0 courses (unexpected).')
  }

  console.log('\n' + '-'.repeat(78))
  console.log(`HAND-AUTHORED pods that are NOT skipped: ${handAuthored.length}`)
  console.log('  These have a markdown source_file and WILL BE WIPED + re-flexed from canonical by stage 1')
  console.log('  (pod-dialogue-generator --force = full mode, which does NOT refuse hand-authored).')
  console.log('  This is the intended migration (canonical becomes the single source of truth),')
  console.log('  but it is destructive — see RISKS in the run report. Courses:')
  for (let i = 0; i < handAuthored.length; i += 4) {
    console.log('    ' + handAuthored.slice(i, i + 4).map(p => p.course).join(', '))
  }

  console.log('\nDRY RUN complete. No changes made. Re-run without --dry-run to execute.')
}

// =============================================================================
// REAL RUN
// =============================================================================

async function realRun() {
  log(`REAL RUN starting. TTS mode=${TTS_MODE}. Ledger=${LEDGER_PATH}`)
  const { plan, led } = await buildPlan()
  led.started_at = led.started_at || ts()
  saveLedger(led)

  let active = plan.filter(p => !p.skip && inScope(p.course))
  if (FROM) {
    const idx = active.findIndex(p => p.course === FROM)
    if (idx >= 0) active = active.slice(idx)
  }

  // Courses are fully independent, and each course runs ONE claude call at a
  // time internally (sequential scenes). So running COURSE_CONCURRENCY courses
  // at once ≈ that many concurrent claude calls — keep it at the measured
  // free-concurrency zone (~10-12; 24 starves local resources). This turns a
  // ~9h sequential run into ~20-40min. Override via COURSE_CONCURRENCY env.
  const COURSE_CONCURRENCY = Math.max(1, parseInt(process.env.COURSE_CONCURRENCY, 10) || 10)
  log(`${active.length} course(s) in scope; ${plan.filter(p => p.skip).length} skipped. Course concurrency=${COURSE_CONCURRENCY}.`)
  const failures = []
  let completed = 0

  // Per-course retry: transient external kills (SIGKILL under load / a single
  // failed clip) shouldn't doom a course. Retry up to COURSE_RETRIES times —
  // completed stages skip via the ledger, so a retry RESUMES mid-course rather
  // than redoing finished work. Only a stage that fails on every attempt
  // (structural, e.g. eng_for_* recolour) ends up in `failures`.
  const COURSE_RETRIES = 2
  const attemptCourse = async (course, entry) => {
    for (const stage of STAGES) {
      const force = REDO && REDO.has(stage)
      if (entry.stages[stage] === 'done' && !force) { stageLog(course, stage, 'already done — skipping'); continue }
      entry.stages[stage] = 'running'
      for (const later of STAGES.slice(STAGES.indexOf(stage) + 1)) {
        if (entry.stages[later] === 'done') { entry.stages[later] = 'pending'; delete entry.errors[later] }
      }
      saveLedger(led)
      const t0 = Date.now()
      try {
        await STAGE_FNS[stage](course)
        entry.stages[stage] = 'done'
        delete entry.errors[stage]
        saveLedger(led)
        stageLog(course, stage, `✓ done in ${Math.round((Date.now() - t0) / 1000)}s`)
      } catch (err) {
        entry.stages[stage] = 'failed'
        entry.errors[stage] = err.message
        saveLedger(led)
        stageLog(course, stage, `✗ ${stage} failed: ${err.message}`)
        return { stage, error: err.message }
      }
    }
    return null
  }

  const runCourse = async (p) => {
    const course = p.course
    const entry = ensureCourse(led, course)
    log(`=== ${course} START === (stages: ${STAGES.map(s => `${s}=${entry.stages[s]}`).join(' ')})`)
    let fail = null
    for (let attempt = 0; attempt <= COURSE_RETRIES; attempt++) {
      if (attempt > 0) { log(`=== ${course} retry ${attempt}/${COURSE_RETRIES} (resuming from ${fail.stage}) ===`); await sleep(5000 * attempt) }
      fail = await attemptCourse(course, entry)
      if (!fail) break
    }
    if (!fail) { entry.finished_at = ts(); completed++; saveLedger(led); log(`=== ${course} COMPLETE (${completed}/${active.length}) ===`) }
    else { failures.push({ course, stage: fail.stage, error: fail.error }); log(`=== ${course} FAILED at ${fail.stage} after ${COURSE_RETRIES} retries ===`) }
  }

  // Worker pool over courses (shared cursor; no batch barrier).
  let cursor = 0
  const worker = async () => {
    while (true) {
      const i = cursor++
      if (i >= active.length) return
      await runCourse(active[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(COURSE_CONCURRENCY, active.length) }, worker))

  console.log('\n' + '='.repeat(78))
  log(`BATCH DONE. ${completed}/${active.length} courses complete. ${failures.length} failure(s).`)
  if (failures.length) {
    console.log('FAILURES:')
    for (const f of failures) console.log(`  ${f.course} [${f.stage}]: ${f.error}`)
    console.log('\nRe-run the same command to resume — completed stages are skipped via the ledger.')
  }
  console.log('='.repeat(78))
}

// =============================================================================
// MAIN
// =============================================================================

// Guarded by require.main. Without this the IIFE below ran at MODULE LOAD, so
// merely `require()`-ing this file — to check it parsed, to read an export, to
// let a test import a helper — started a real 49-course TTS migration. That is
// not hypothetical: a load-check require() on 2026-08-07 rendered 111
// pod_explainer clips across cat_for_spa, cat_for_eng, ara_sy_for_eng,
// bul_for_eng, ara_eg_for_eng and ell_for_eng before it was killed.
//
// A file whose cost of being LOOKED AT is a bulk TTS run cannot be left that
// way, whatever else guards it downstream.
if (require.main === module) {
  ;(async () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in env'); process.exit(1)
    }
    if (DRY_RUN) await dryRun()
    else await realRun()
    process.exit(0)
  })().catch(err => { console.error('FATAL:', err.stack || err.message); process.exit(1) })
}
