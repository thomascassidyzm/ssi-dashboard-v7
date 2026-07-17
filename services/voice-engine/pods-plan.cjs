/**
 * pods-plan.cjs — pure construction of the per-voice RECORDING PLAN
 * ("same voice calculations", keystone §2): one human records ALL their pod
 * lines in one autocue sitting, with cue lines for context.
 *
 * Queue order: pod → scene → global_order. Each item carries:
 *   - cues: the preceding N (default 2) dialogue lines of the SAME scene —
 *     speaker label + target_text + known_text gloss (context never bleeds
 *     across a scene boundary; the boundary itself carries the scene title)
 *   - line: the text to record (target / known / explainer per kind)
 *   - identity: podId, sentenceId, kind ('target'|'known'|'explainer');
 *     glue_to_next chains are ONE item (sentenceIds lists every glued row)
 *   - scene: { number, title } + sceneStart flag on scene boundaries
 *
 * Explainer queue: when the requested voice is cast as __explainer__, the
 * plan carries every known-language line (kind 'known') plus every non-empty
 * explainer_text (kind 'explainer') — keystone §1's explainer cast entry.
 *
 * Pure module — no DB, no I/O. Vocabulary: known / target / seed.
 */

'use strict'

const { canonicalSpeakerName } = require('../../tools/pod-voice-colour-n.cjs')
const { EXPLAINER_SPEAKER, castVoiceFor } = require('./pods-cast.cjs')

const DEFAULT_CUE_COUNT = 2

// Speaking-time heuristic for the "how long is my sitting" estimate:
// ~12 chars/sec of read speech + 3s per item to breathe/settle the autocue.
// Deliberately rough — it sizes a sitting, it doesn't bill anyone.
const CHARS_PER_SECOND = 12
const ITEM_OVERHEAD_SECONDS = 3

function estimateSeconds(text) {
  return ITEM_OVERHEAD_SECONDS + String(text || '').length / CHARS_PER_SECOND
}

/** Scene title from pod.metadata.sections (recon §4), fallback "Scene N". */
function sceneTitleFor(pod, sceneNumber) {
  const sections = pod && pod.metadata && Array.isArray(pod.metadata.sections)
    ? pod.metadata.sections : []
  const hit = sections.find(s => s && Number(s.number) === Number(sceneNumber))
  return (hit && (hit.title || hit.label)) || `Scene ${sceneNumber}`
}

/**
 * Group one pod's ordered sentence rows into dialogue items: a row with
 * glue_to_next=true and the SAME character on the next row chains into one
 * utterance (live data has zero glued rows post canon-v2, but the column is
 * live — recon §5). A speaker change breaks the chain defensively (glue
 * across characters would be a data error, never a recording instruction).
 *
 * @returns {Array<{rows:Array, speaker:string, canon:string, sceneNumber:number}>}
 */
function groupGlueItems(sentenceRows) {
  const items = []
  let current = null
  for (const s of sentenceRows) {
    const canon = canonicalSpeakerName(s.speaker)
    const scene = s.scene_number == null ? 0 : s.scene_number
    if (current && current.gluing && current.canon === canon && current.sceneNumber === scene) {
      current.rows.push(s)
      current.gluing = s.glue_to_next === true
      continue
    }
    current = {
      rows: [s],
      speaker: s.speaker,
      canon,
      sceneNumber: scene,
      gluing: s.glue_to_next === true,
    }
    items.push(current)
  }
  for (const it of items) delete it.gluing
  return items
}

function joinedText(rows, field) {
  return rows.map(r => (r[field] || '').trim()).filter(Boolean).join(' ')
}

/**
 * Build the recording queue for one voice across a course's pods.
 *
 * @param {object} args
 * @param {Array} args.pods       listening_pods rows ({ id, slug, title, pod_order, metadata })
 * @param {Array} args.sentences  listening_pod_sentences rows for those pods
 *   ({ id, pod_id, scene_number, global_order, speaker, target_text,
 *      known_text, explainer_text, glue_to_next })
 * @param {object} args.podCast   courses.voice_config.podCast (may be {} / null)
 * @param {string} args.voiceId   the human voice whose queue this is
 * @param {number} [args.cueCount=2]
 *
 * @returns {{
 *   voiceId: string,
 *   castSpeakers: string[],         // characters this voice plays
 *   isExplainer: boolean,
 *   items: Array<{
 *     podId, podTitle, sentenceId, sentenceIds, kind, speaker, line,
 *     knownGloss, cues:[{speaker,target,known}], scene:{number,title},
 *     sceneStart:boolean, estimatedSeconds:number,
 *   }>,
 *   counts: { target:number, known:number, explainer:number, total:number },
 *   estimatedMinutes: number,
 * }}
 */
function buildRecordingPlan({ pods, sentences, podCast, voiceId, cueCount = DEFAULT_CUE_COUNT }) {
  if (!voiceId) throw new Error('buildRecordingPlan: voiceId required')
  const cast = podCast && typeof podCast === 'object' ? podCast : {}
  const explainerEntry = cast[EXPLAINER_SPEAKER]
  const isExplainer = !!(explainerEntry && explainerEntry.voiceId === voiceId)

  const orderedPods = [...(pods || [])].sort((a, b) =>
    (a.pod_order || 0) - (b.pod_order || 0) || (a.slug < b.slug ? -1 : 1))
  const byPod = new Map(orderedPods.map(p => [p.id, []]))
  for (const s of sentences || []) {
    if (byPod.has(s.pod_id)) byPod.get(s.pod_id).push(s)
  }

  const castSpeakers = new Set()
  const items = []
  const counts = { target: 0, known: 0, explainer: 0 }
  let totalSeconds = 0
  let lastSceneKey = null   // scene boundaries relative to THIS voice's queue

  const push = (item) => {
    const sceneKey = `${item.podId}::${item.scene.number}`
    item.sceneStart = sceneKey !== lastSceneKey
    lastSceneKey = sceneKey
    item.estimatedSeconds = Math.round(estimateSeconds(item.line) * 10) / 10
    totalSeconds += item.estimatedSeconds
    counts[item.kind]++
    items.push(item)
  }

  for (const pod of orderedPods) {
    const rows = (byPod.get(pod.id) || []).sort((a, b) => (a.global_order || 0) - (b.global_order || 0))
    const dialogueItems = groupGlueItems(rows)

    let cueTrail = []          // last N dialogue lines of the CURRENT scene
    let cueScene = null
    for (const di of dialogueItems) {
      if (di.sceneNumber !== cueScene) { cueTrail = []; cueScene = di.sceneNumber }
      const scene = { number: di.sceneNumber, title: sceneTitleFor(pod, di.sceneNumber) }
      const cues = cueTrail.slice(-cueCount)
      const target = joinedText(di.rows, 'target_text')
      const known = joinedText(di.rows, 'known_text')
      const base = {
        podId: pod.id,
        podTitle: pod.title || pod.slug || pod.id,
        sentenceId: di.rows[0].id,
        sentenceIds: di.rows.map(r => r.id),
        speaker: di.canon,
        cues,
        scene,
      }

      const entry = castVoiceFor(cast, di.speaker)
      if (entry && entry.voiceId === voiceId && target) {
        castSpeakers.add(di.canon)
        push({ ...base, kind: 'target', line: target, knownGloss: known || null })
      }

      if (isExplainer) {
        if (known) {
          push({ ...base, kind: 'known', line: known, knownGloss: null })
        }
        for (const r of di.rows) {
          const explainer = (r.explainer_text || '').trim()
          if (!explainer) continue   // '' = deliberately none (recon §5)
          push({
            ...base, sentenceId: r.id, sentenceIds: [r.id],
            kind: 'explainer', line: explainer, knownGloss: null,
          })
        }
      }

      // The dialogue context everyone reads against — every line enters the
      // cue trail regardless of whose voice records it.
      if (target || known) {
        cueTrail.push({ speaker: di.canon, target: target || null, known: known || null })
        if (cueTrail.length > cueCount) cueTrail = cueTrail.slice(-cueCount)
      }
    }
  }

  return {
    voiceId,
    castSpeakers: [...castSpeakers],
    isExplainer,
    items,
    counts: { ...counts, total: items.length },
    estimatedMinutes: Math.round((totalSeconds / 60) * 10) / 10,
  }
}

/**
 * Finalize a plan for the wire: canonical item shape (pinned by
 * pod-recording-plan-contract.test.mjs — drift here rendered empty cue lines,
 * integration map fix #1) + recorded/audioId stamping (fix #2: resume and
 * progress need to know what this voice already recorded).
 *
 * recorded = the sentence's {kind}_audio_id points at a HUMAN course_audio
 * row carrying THIS queue's voiceId. audioId is the current pointer either way
 * (the client echoes it as replacesAudioId provenance on re-records).
 *
 * @param {object} args
 * @param {object} args.plan - buildRecordingPlan output
 * @param {Array}  args.sentences - the same rows the plan was built from (with *_audio_id columns)
 * @param {string} args.voiceId
 * @param {Set<string>} [args.acceptVoiceIds] - voice ids whose takes count as
 *   recorded (the queue's id plus its collapsed-away aliases); defaults to
 *   just voiceId
 * @param {(ids:string[])=>Promise<Array<{id,origin,voice_id}>>} args.fetchAudioRows
 */
async function finalizeRecordingPlan({ plan, sentences, voiceId, acceptVoiceIds = null, fetchAudioRows }) {
  const accept = acceptVoiceIds && acceptVoiceIds.size ? acceptVoiceIds : new Set([voiceId])
  const AUDIO_COL = { target: 'target_audio_id', known: 'known_audio_id', explainer: 'explainer_audio_id' }
  const rowById = new Map((sentences || []).map(r => [r.id, r]))

  const wanted = new Set()
  for (const it of plan.items) {
    const row = rowById.get(it.sentenceId)
    const aid = row ? row[AUDIO_COL[it.kind]] : null
    if (aid) wanted.add(aid)
  }
  const audioRows = wanted.size ? await fetchAudioRows([...wanted]) : []
  const audioById = new Map(audioRows.map(r => [r.id, r]))

  let recorded = 0
  const items = plan.items.map(it => {
    const row = rowById.get(it.sentenceId) || {}
    const audioId = row[AUDIO_COL[it.kind]] || null
    const a = audioId ? audioById.get(audioId) : null
    const isRecorded = !!(a && a.origin === 'human' && accept.has(a.voice_id))
    if (isRecorded) recorded++
    const isTarget = it.kind === 'target'
    const out = {
      podId: it.podId,
      podTitle: it.podTitle,
      sentenceId: it.sentenceId,
      sentenceIds: it.sentenceIds,
      kind: it.kind,
      speaker: it.speaker,
      sceneNumber: it.scene ? it.scene.number : null,
      // boundary-only by contract: the teleprompter shows scene headers once
      sceneTitle: it.sceneStart && it.scene ? (it.scene.title || null) : null,
      sceneStart: !!it.sceneStart,
      cues: (it.cues || []).map(c => ({
        speaker: c.speaker,
        targetText: c.target != null ? c.target : null,
        knownText: c.known != null ? c.known : null,
      })),
      line: isTarget
        ? { targetText: it.line, knownText: it.knownGloss != null ? it.knownGloss : null }
        : { targetText: null, knownText: it.line },
      estimatedSeconds: it.estimatedSeconds,
      recorded: isRecorded,
      audioId,
    }
    if (it.sentenceIds && it.sentenceIds.length > 1) out.glueSentenceIds = it.sentenceIds
    return out
  })

  return {
    ...plan,
    items,
    totals: { items: items.length, recorded, remaining: items.length - recorded },
  }
}

module.exports = {
  DEFAULT_CUE_COUNT,
  finalizeRecordingPlan,
  estimateSeconds,
  sceneTitleFor,
  groupGlueItems,
  buildRecordingPlan,
}
