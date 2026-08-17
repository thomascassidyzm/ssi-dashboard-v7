/**
 * pod-explainer-composite.cjs — Phase-0 explainers for languages the
 * explainer clone can't speak (Tom 2026-06-11: "we can't NOT have any —
 * it's a real fail").
 *
 * The clone (Tom's xAI multilingual voice) can only be steered to xAI's
 * official language handles, so the Azure-tail courses (Irish, Croatian,
 * Icelandic, …) lost explainer AUDIO. But the decompositions — the chunk
 * texts and their glosses — exist for every sentence. So assemble the
 * narration from PIECES instead of one multilingual utterance:
 *
 *   [chunk x · TARGET voice] ["means x′" · KNOWN voice] [chunk y] [means y′] …
 *
 * - Target chunks are TTS'd per-chunk in the course's target voice (Azure
 *   Irish speaks Irish natively; mutations are SPELLED in the chunk text,
 *   so they render correctly). The v2 upgrade path — slicing chunk audio
 *   out of the existing sentence clip on Azure word boundaries for
 *   in-context prosody — plugs in here without changing the assembly.
 * - Glosses ride the course's KNOWN voice with the localised connector
 *   ("means" / "significa" / …), which makes this work for EVERY pair.
 * - Pieces are stitched with the voice-engine splicer (per-piece loudness
 *   normalize → 20ms crossfade → ffmpeg→lame) into ONE mastered file,
 *   uploaded and linked to explainer_audio_id — a drop-in for the player:
 *   Phase 0, Guided mode and all fallbacks work unchanged.
 *
 * First-encounter discipline applies: only chunks the once-pass left
 * active (first_encounter !== false) are narrated; identity chunks
 * ("Sarah means Sarah") are never spoken.
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const fs = require('fs')
const os = require('os')
const { v4: uuidv4 } = require('uuid')
const { createClient } = require('@supabase/supabase-js')
const { PutObjectCommand } = require('@aws-sdk/client-s3')
const { AUDIO_CACHE_CONTROL } = require('./shared/audio-cache-control.cjs')

const ttsService = require('./tts-service.cjs')
const audioProcessor = require('./audio-processor.cjs')
const { spliceSegmentsToFile } = require('./voice-engine/splicer.cjs')
const { resolveTargetPool } = require('../tools/pod-voice-coverage.cjs')
const { parseCourseCode, getConnectorForLearnerLang } = require('./pod-explainer-generator.cjs')
const { canonicalLanguage } = require('./shared/clip-identity.cjs')
const { normalizeForAudio } = require('./shared/text-normalize.cjs')
const { canonicalSpeakerName } = require('../tools/pod-sync.cjs')

const POD_SLUG = 'pod-0'
const EXPLAINER_ROLE = 'pod_explainer'
// Pieces are edge-trimmed to 40ms (EDGE_TRIM_FILTER), so these constants are
// the REAL pacing. Before the trim, Azure's ~140ms lead / ~870ms tail padding
// made chunk→gloss play ~1.3s regardless of the constant (Tom's ear,
// 2026-06-12). Calibrate both by ear on sample renders.
const GAP_CHUNK_TO_GLOSS_MS = 240   // breath between beats within a unit (target↔meaning↔target)
const GAP_BETWEEN_PAIRS_MS = 620    // breath between one chunk's unit and the next
const GAP_AFTER_INTRO_MS = 380      // settle after the one-time cue

// One-time spoken cue at the head of the breakdown, so we DON'T repeat the
// connector ("means") before every gloss (Tom 2026-06-13: the repeated "means"
// grates). After this, each pair is just target · pause · gloss. Localised by
// learner language; English is the only built cue for now (pods are mostly
// _for_eng) — non-English learner courses fall back to it and should get a
// translated cue before launch. Tweak the wording freely; it's heard once.
const INTRO_CUE_BY_LEARNER = {
  eng: 'Breaking it down...',
}
function introCueFor(learner) {
  return INTRO_CUE_BY_LEARNER[learner] || INTRO_CUE_BY_LEARNER.eng
}

const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
)

// phase8 brings the bounded keep-alive S3 client + masterAudio + the
// course_audio dedup lookup — the same substrate every other clip uses.
let _phase8 = null
function getPhase8() {
  if (!_phase8) {
    process.env.PHASE8_NO_LISTEN = '1'
    _phase8 = require('./phases/phase8-audio-v13.cjs')
  }
  return _phase8
}

// ── narration selection (mirrors run-pod-explainer-batch semantics) ─────────

function normChunkKey(s) {
  return String(s || '').normalize('NFC').toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, '')
    .trim()
}

function isIdentityChunk(ch) {
  const t = normChunkKey(ch && ch.chunk_target)
  return t !== '' && t === normChunkKey(ch && ch.chunk_known)
}

function activeChunks(decomposition) {
  if (!Array.isArray(decomposition)) return []
  return decomposition.filter(c =>
    c && typeof c.chunk_target === 'string' && typeof c.chunk_known === 'string'
    && c.chunk_target.trim() && c.chunk_known.trim()
    && c.first_encounter !== false
    && !isIdentityChunk(c))
}

function extractConstructionTail(explainerText) {
  if (typeof explainerText !== 'string') return null
  const m = explainerText.match(/[—–-]\s*(so|literally)\b[\s\S]*$/i)
  if (!m) return null
  return m[0].replace(/^[—–\-]\s*/, '').trim().replace(/[.\s]*$/, '.')
}

/** Canonical narration string — the dedup key for the assembled clip. The
 *  one-time intro cue replaces the per-pair connector ("means"); each pair is
 *  just target then gloss. Changing this form re-keys the clips (intended when
 *  the audio structure changes). */
function narrationText(chunks, tail, introCue) {
  let s = introCue ? `${introCue} ` : ''
  s += chunks.map(c => `"${c.chunk_target}". ${c.chunk_known}. "${c.chunk_target}". "${c.chunk_target}".`).join(' ')
  if (tail) s += ` ${tail}`
  return s
}

// ── piece rendering ──────────────────────────────────────────────────────────

function buildTTSConfig(voice) {
  const base = { voiceId: voice.voice_id, speed: 1.0 }
  if (voice.provider === 'xai') {
    base.apiKey = process.env.XAI_API_KEY
    base.language = voice.locale || 'auto'
  } else {
    base.subscriptionKey = process.env.AZURE_SPEECH_KEY
    base.region = process.env.AZURE_SPEECH_REGION || 'westeurope'
    base.voiceName = voice.voice_id
  }
  return base
}

/** Render one piece to a temp mp3 file, cached per (voice, text) for the
 *  whole course run — chunk pieces repeat heavily across sentences.
 *  Every piece is re-encoded through the same ffmpeg→lame pipe as the
 *  silence pieces (48k mono CBR): the splicer's crossfade chain and its
 *  concat fallback both require UNIFORM formats, and raw provider mp3s
 *  (Azure = 24k) mixed with 48k silences truncated multi-pair splices. */
/** Strip provider edge-padding, keeping 40ms of natural breath each side.
 *  Internal pauses are untouched (only the first/last silence run goes). */
const EDGE_TRIM_FILTER = [
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04',
  'areverse',
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04',
  'areverse',
].join(',')

async function renderPiece(cache, tempDir, text, voice) {
  const key = `${voice.provider}|${voice.voice_id}|${text}`
  if (cache.has(key)) return cache.get(key)
  const { audioBuffer } = await ttsService.generateWithRetry(text, voice.provider, buildTTSConfig(voice))
  if (!audioBuffer || audioBuffer.length === 0) throw new Error(`empty TTS piece (${voice.voice_id}: "${text.slice(0, 40)}")`)
  const rawFile = path.join(tempDir, `raw-${cache.size}.mp3`)
  fs.writeFileSync(rawFile, audioBuffer)
  const file = path.join(tempDir, `piece-${cache.size}.mp3`)
  // Edge-trim voiced pieces only — the ensureSilence gap pieces must keep
  // their full authored length.
  await audioProcessor.ffmpegFilterToLameMp3(rawFile, file, { filterChain: EDGE_TRIM_FILTER })
  cache.set(key, file)
  return file
}

/** Silence pieces via lavfi — real decodable audio, so the splicer treats
 *  gaps as ordinary segments (loudnorm skips them harmlessly). */
async function ensureSilence(cache, tempDir, ms) {
  const key = `silence|${ms}`
  if (cache.has(key)) return cache.get(key)
  const file = path.join(tempDir, `sil-${ms}.mp3`)
  await audioProcessor.ffmpegFilterToLameMp3(null, file, {
    ffmpegInputArgs: ['-f', 'lavfi', '-t', String(ms / 1000)],
    inputOverride: 'anullsrc=r=48000:cl=mono',
  })
  cache.set(key, file)
  return file
}

// ── course context ───────────────────────────────────────────────────────────

async function getCourseVoices(courseCode) {
  const { target } = parseCourseCode(courseCode)
  const pool = resolveTargetPool(target)
  const targetVoice = (pool.f && pool.f[0]) || (pool.m && pool.m[0])
  if (!targetVoice) throw new Error(`no target voice resolvable for ${target}`)

  const { data: course, error } = await supabase
    .from('courses').select('known_lang, voice_config').eq('course_code', courseCode).single()
  if (error) throw new Error(`course not found: ${error.message}`)
  const kv = (course.voice_config && course.voice_config.voices && course.voice_config.voices.known) || {}
  const knownVoice = {
    voice_id: kv.voiceId || kv.voice_id || 'en-GB-SoniaNeural',
    provider: kv.provider || 'azure',
  }
  return { targetVoice, knownVoice }
}

// ── main ─────────────────────────────────────────────────────────────────────

/**
 * Build composite explainer audio for every pod-0 sentence in the course
 * that has explainer_text but no explainer_audio_id. Returns
 * { rendered, reused, failed }.
 */
async function compositeExplainersForCourse(courseCode, { log = console.log, limit = 0, onlyOrders = null } = {}) {
  const { target, learner } = parseCourseCode(courseCode)
  // `target` is the course-code prefix ('gle', 'fra_ca'), which is not always a
  // language code — the identity column takes the canonical, region-free form.
  const identityLanguage = canonicalLanguage(target)
  const connector = getConnectorForLearnerLang(learner)
  const { targetVoice, knownVoice } = await getCourseVoices(courseCode)

  // Per-speaker chunk voices (Tom 2026-06-11): the learner should hear the
  // chunk as THE CHARACTER ACTUALLY SAYS IT — the cast voice from the pod's
  // colouring — not a narrator re-saying it. Falls back to the course pool
  // voice for unmapped speakers.
  const { data: podRow } = await supabase
    .from('listening_pods').select('speakers').eq('id', `${courseCode}:${POD_SLUG}`).single()
  const speakersMap = (podRow && podRow.speakers) || {}
  const chunkVoiceFor = (speaker) => {
    const canon = canonicalSpeakerName(speaker || '')
    const entry = speakersMap[canon] || speakersMap._default
    const v = entry && entry.target
    return (v && v.voice_id) ? { provider: v.provider || 'azure', voice_id: v.voice_id, locale: v.locale || null } : targetVoice
  }
  log(`[${courseCode}] composite explainers: chunk voices = per-speaker cast (fallback ${targetVoice.voice_id}), known=${knownVoice.voice_id}, connector="${connector}"`)

  let q = supabase
    .from('listening_pod_sentences')
    .select('id, global_order, speaker, explainer_text, explainer_decomposition')
    .eq('pod_id', `${courseCode}:${POD_SLUG}`)
    .not('explainer_text', 'is', null)
    .neq('explainer_text', '')
    .is('explainer_audio_id', null)
  // onlyOrders: re-voice a specific set of global_orders (targeted re-voice
  // after a decomposition edit) instead of the whole missing-audio backlog.
  if (Array.isArray(onlyOrders) && onlyOrders.length) q = q.in('global_order', onlyOrders)
  const { data: rows, error } = await q.order('global_order')
  if (error) throw new Error(`load rows: ${error.message}`)
  if (!rows || rows.length === 0) { log(`[${courseCode}] composite: nothing to render`); return { rendered: 0, reused: 0, failed: 0 } }
  const work = limit > 0 ? rows.slice(0, limit) : rows

  const phase8 = getPhase8()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pod-composite-'))
  const cache = new Map()
  let rendered = 0, reused = 0
  let queue = work

  try {
    for (let round = 0; round <= 2 && queue.length; round++) {
      if (round > 0) {
        log(`[${courseCode}] composite retry round ${round}: ${queue.length} failed row(s)`)
        await new Promise(r => setTimeout(r, 3000 * round))
      }
      const failed = []
      for (const row of queue) {
        try {
          const chunks = activeChunks(row.explainer_decomposition)
          if (chunks.length === 0) continue // nothing narratable — leave unvoiced (player plays translation)
          const tail = extractConstructionTail(row.explainer_text)
          const introCue = introCueFor(learner)
          const text = narrationText(chunks, tail, introCue)
          const chunkVoice = chunkVoiceFor(row.speaker)
          // 'comp:' is a splice RECIPE, not a voice — it names the two takes
          // this clip was assembled from, so it keeps its own namespace and a
          // spliced explainer never collapses onto a plain single-voice render
          // of the same text. Each part is canonicalised the way any other
          // voice id is; the parts came from voice_config and the pod cast, so
          // they arrive in whatever spelling those happen to hold.
          const voiceTag = 'comp:' +
            [chunkVoice, knownVoice].map(v => phase8.canonicalClipVoiceId(v.voice_id, v.provider)).join('+')

          // Dedup: same narration + same recipe → relink the existing clip.
          const existing = await phase8.findExistingAudio(courseCode, text, identityLanguage, EXPLAINER_ROLE, voiceTag)
          let audioId = existing
          if (!audioId) {
            // Assemble: one-time cue, then for each chunk the pattern
            // target · meaning · target · target (Tom 2026-06-13: hearing the
            // target then its meaning ONCE locks the piece to awareness; two
            // more targets reinforce the sound — no need to repeat the meaning).
            // No "means" before each gloss — the cue set that up once.
            const files = []
            files.push(await renderPiece(cache, tempDir, introCue, knownVoice))
            files.push(await ensureSilence(cache, tempDir, GAP_AFTER_INTRO_MS))
            for (let i = 0; i < chunks.length; i++) {
              const c = chunks[i]
              const tgt = await renderPiece(cache, tempDir, c.chunk_target, chunkVoice)
              const gls = await renderPiece(cache, tempDir, c.chunk_known, knownVoice)
              const gap = await ensureSilence(cache, tempDir, GAP_CHUNK_TO_GLOSS_MS)
              files.push(tgt, gap, gls, gap, tgt, gap, tgt)
              if (i < chunks.length - 1) files.push(await ensureSilence(cache, tempDir, GAP_BETWEEN_PAIRS_MS))
            }
            if (tail) {
              files.push(await ensureSilence(cache, tempDir, GAP_BETWEEN_PAIRS_MS))
              files.push(await renderPiece(cache, tempDir, tail, knownVoice))
            }

            const outPath = path.join(tempDir, `out-${row.global_order}.mp3`)
            await spliceSegmentsToFile(files, outPath, { audioProcessor })

            // Master the assembled file like every other clip (loudness +
            // duration), then the standard S3 + course_audio path.
            const { buffer: masteredBuffer, durationMs } = await phase8.masterAudio(fs.readFileSync(outPath))
            const newId = uuidv4().toUpperCase()
            await phase8.s3.send(new PutObjectCommand({
              Bucket: phase8.S3_BUCKET,
              Key: `mastered/${newId}.mp3`,
              Body: masteredBuffer,
              ContentType: 'audio/mpeg',
              CacheControl: AUDIO_CACHE_CONTROL,
            }))
            const { data: ins, error: insErr } = await supabase.from('course_audio').upsert({
              course_code: courseCode,
              text,
              text_normalized: normalizeForAudio(text),
              language: identityLanguage,
              role: EXPLAINER_ROLE,
              voice_id: voiceTag,
              origin: 'tts',
              s3_key: `mastered/${newId}.mp3`,
              duration_ms: durationMs,
            }, { onConflict: 'course_code,text_normalized,language,role,voice_id' }).select('id').single()
            if (insErr) throw new Error(`course_audio insert: ${insErr.message}`)
            audioId = ins.id
            rendered++
          } else {
            reused++
          }

          const { error: linkErr } = await supabase
            .from('listening_pod_sentences')
            .update({ explainer_audio_id: audioId })
            .eq('id', row.id)
          if (linkErr) throw new Error(`link: ${linkErr.message}`)
        } catch (e) {
          failed.push(row)
          if (round === 2) log(`[${courseCode}] composite FAILED row ${row.global_order}: ${e.message}`)
        }
        if ((rendered + reused) % 25 === 0 && (rendered + reused) > 0) {
          log(`[${courseCode}] composite progress: ${rendered} rendered + ${reused} reused of ${work.length}`)
        }
      }
      queue = failed
    }
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch { /* best-effort */ }
  }

  log(`[${courseCode}] composite done: ${rendered} rendered, ${reused} reused, ${queue.length} failed`)
  return { rendered, reused, failed: queue.length }
}

module.exports = { compositeExplainersForCourse, narrationText, activeChunks }

// CLI: node services/pod-explainer-composite.cjs gle_for_eng [--limit=5]
if (require.main === module) {
  const course = process.argv[2]
  if (!course) { console.error('usage: node services/pod-explainer-composite.cjs <course_code>'); process.exit(1) }
  const limitArg = process.argv.find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0
  const ordersArg = process.argv.find(a => a.startsWith('--orders='))
  const onlyOrders = ordersArg ? ordersArg.split('=')[1].split(',').map(n => parseInt(n, 10)).filter(Number.isFinite) : null
  compositeExplainersForCourse(course, { limit, onlyOrders })
    .then(r => { console.log(JSON.stringify(r)); process.exit(r.failed > 0 ? 1 : 0) })
    .catch(e => { console.error('FATAL:', e.message); process.exit(1) })
}
