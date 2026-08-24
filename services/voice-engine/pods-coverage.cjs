/**
 * voice-engine/pods-coverage.cjs — per-voice recording coverage for listening
 * pods (keystone §5: feeds the casting UI + PodDetailView).
 *
 * For every cast voice in courses.voice_config.podCast: lines recorded
 * (origin='human') / remaining, with a per-pod breakdown, plus the human-vs-tts
 * status of every sentence line (target / known).
 *
 * Explainer narration was deprecated 2026-08-24: it is no longer a line, no
 * longer counted and no longer reported. Existing rows and clips are untouched.
 *
 * Line → voice assignment mirrors registration (pods-registration.cjs):
 *   target lines → podCast[canonical speaker]
 *   known lines  → podCast["__explainer__"]
 * Lines with no cast entry are counted under unassigned (cast UI work-to-do).
 *
 * Pure math in summarizePodCoverage (unit-testable, no DB); computePodsCoverage
 * loads from Supabase (read-only) and delegates. No writes of any kind.
 */

const {
  canonicalSpeakerName,
  EXPLAINER_CAST_KEY,
} = require('./pods-registration.cjs')

const KINDS = ['target', 'known']

const KIND_TEXT = { target: 'target_text', known: 'known_text' }
const KIND_AUDIO = { target: 'target_audio_id', known: 'known_audio_id' }

/** Cast entry (voiceId/name) for one line, or null when uncast. */
function castEntryForLine(podCast, speaker, kind) {
  const cast = podCast || {}
  if (kind === 'target') {
    return cast[canonicalSpeakerName(speaker)] || cast[speaker] || null
  }
  return cast[EXPLAINER_CAST_KEY] || null
}

/**
 * Pure coverage math.
 *
 * @param {object} args
 * @param {object} args.podCast - courses.voice_config.podCast (may be empty/missing)
 * @param {Array}  args.pods - [{ id, slug, title }]
 * @param {Array}  args.sentences - listening_pod_sentences rows (id, pod_id,
 *   speaker, *_text, *_audio_id)
 * @param {Map|object} args.audioById - course_audio id → { origin, voice_id }
 * @returns coverage report (see bottom shape)
 */
function summarizePodCoverage({ podCast = {}, pods = [], sentences = [], audioById = new Map() }) {
  const lookupAudio = (id) => {
    if (!id) return null
    if (audioById instanceof Map) return audioById.get(id) || null
    return audioById[id] || null
  }

  // One bucket per distinct human voice (several characters can share a voice).
  const voiceBuckets = new Map() // voiceId -> { voiceId, name, castKeys:Set, lines, perPod:Map }
  for (const [castKey, entry] of Object.entries(podCast || {})) {
    if (!entry || !entry.voiceId) continue
    if (!voiceBuckets.has(entry.voiceId)) {
      voiceBuckets.set(entry.voiceId, {
        voiceId: entry.voiceId,
        name: entry.name || null,
        castKeys: new Set(),
        total: 0, recorded: 0, tts: 0, missing: 0,
        perPod: new Map(),
      })
    }
    voiceBuckets.get(entry.voiceId).castKeys.add(castKey)
  }

  const podMeta = new Map(pods.map(p => [p.id, p]))
  const podReports = new Map() // podId -> { podId, slug, title, sentences: [] }
  for (const p of pods) podReports.set(p.id, { podId: p.id, slug: p.slug || null, title: p.title || null, sentences: [] })

  const totals = { lines: 0, recorded: 0, tts: 0, missing: 0, unassignedLines: 0 }
  const unassignedSpeakers = new Set()

  for (const s of sentences) {
    const sentReport = { sentenceId: s.id, speaker: s.speaker || null, kinds: {} }
    for (const kind of KINDS) {
      const text = (s[KIND_TEXT[kind]] || '').trim()
      if (!text) continue // empty lines aren't lines
      const audioId = s[KIND_AUDIO[kind]] || null
      const audio = lookupAudio(audioId)
      const origin = audio ? (audio.origin || null) : null
      const castEntry = castEntryForLine(podCast, s.speaker, kind)
      const castVoiceId = castEntry ? castEntry.voiceId : null
      const recordedHuman = origin === 'human'

      sentReport.kinds[kind] = {
        audioId,
        origin,                       // 'human' | 'tts' | null (no/unknown audio)
        voiceId: audio ? (audio.voice_id || null) : null,
        castVoiceId,
        recorded: recordedHuman,
        voiceMatch: recordedHuman && castVoiceId ? audio.voice_id === castVoiceId : null,
      }

      totals.lines++
      if (recordedHuman) totals.recorded++
      else if (origin === 'tts') totals.tts++
      else totals.missing++

      if (castVoiceId && voiceBuckets.has(castVoiceId)) {
        const bucket = voiceBuckets.get(castVoiceId)
        bucket.total++
        if (recordedHuman) bucket.recorded++
        else if (origin === 'tts') bucket.tts++
        else bucket.missing++
        if (!bucket.perPod.has(s.pod_id)) {
          const meta = podMeta.get(s.pod_id) || {}
          bucket.perPod.set(s.pod_id, { podId: s.pod_id, slug: meta.slug || null, total: 0, recorded: 0, remaining: 0 })
        }
        const pp = bucket.perPod.get(s.pod_id)
        pp.total++
        if (recordedHuman) pp.recorded++
        pp.remaining = pp.total - pp.recorded
      } else {
        totals.unassignedLines++
        if (kind === 'target') unassignedSpeakers.add(canonicalSpeakerName(s.speaker))
        else unassignedSpeakers.add(EXPLAINER_CAST_KEY)
      }
    }
    if (podReports.has(s.pod_id)) podReports.get(s.pod_id).sentences.push(sentReport)
  }

  const voices = [...voiceBuckets.values()].map(b => ({
    voiceId: b.voiceId,
    name: b.name,
    castKeys: [...b.castKeys].sort(),
    lines: { total: b.total, recorded: b.recorded, remaining: b.total - b.recorded, tts: b.tts, missing: b.missing },
    perPod: [...b.perPod.values()],
  }))

  return {
    voices,
    totals,
    pods: [...podReports.values()],
    unassignedSpeakers: [...unassignedSpeakers].sort(),
  }
}

/** Chunk helper for .in() queries. */
function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Load + summarize for a course. deps: { supabase, logger? }. Read-only.
 */
async function computePodsCoverage(deps, courseCode) {
  const supabase = deps.supabase
  const logger = deps.logger || console

  const { data: course, error: courseErr } = await supabase
    .from('courses').select('course_code, voice_config').eq('course_code', courseCode).maybeSingle()
  if (courseErr) throw new Error(`course load failed: ${courseErr.message}`)
  if (!course) throw Object.assign(new Error(`Course not found: ${courseCode}`), { status: 404 })
  const podCast = course.voice_config?.podCast || {}

  const { data: pods, error: podsErr } = await supabase
    .from('listening_pods').select('id, slug, title').eq('course_code', courseCode).order('slug')
  if (podsErr) throw new Error(`pods load failed: ${podsErr.message}`)

  // Sentences (paginated — a .limit/.range default must never silently truncate).
  const sentences = []
  const podIds = (pods || []).map(p => p.id)
  if (podIds.length) {
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data: page, error: sErr } = await supabase
        .from('listening_pod_sentences')
        .select('id, pod_id, speaker, target_text, known_text, target_audio_id, known_audio_id, global_order')
        .in('pod_id', podIds)
        .order('pod_id').order('global_order')
        .range(from, from + PAGE - 1)
      if (sErr) throw new Error(`sentences load failed: ${sErr.message}`)
      sentences.push(...(page || []))
      if (!page || page.length < PAGE) break
    }
  }

  // origin/voice for every linked clip.
  const audioIds = [...new Set(sentences.flatMap(s =>
    [s.target_audio_id, s.known_audio_id].filter(Boolean)))]
  const audioById = new Map()
  for (const ids of chunk(audioIds, 200)) {
    const { data: rows, error: aErr } = await supabase
      .from('course_audio').select('id, origin, voice_id').in('id', ids)
    if (aErr) throw new Error(`audio load failed: ${aErr.message}`)
    for (const r of rows || []) audioById.set(r.id, { origin: r.origin, voice_id: r.voice_id })
  }

  const summary = summarizePodCoverage({ podCast, pods: pods || [], sentences, audioById })
  logger.log?.(`[PodsCoverage] ${courseCode}: ${summary.totals.lines} lines, ${summary.totals.recorded} human, ${summary.totals.tts} tts, ${summary.totals.missing} missing`)
  return {
    courseCode,
    generatedAt: new Date().toISOString(),
    cast: podCast,
    ...summary,
  }
}

module.exports = { summarizePodCoverage, computePodsCoverage, castEntryForLine, KINDS }
