// services/pod-stage-draft.cjs
//
// STAGE A HELD DRAFT POD FROM SUPPLIED LINES, MIRRORING AN EXISTING POD'S SHAPE
// (job #794, 2026-10-15). The door behind
// POST /api/admin/pods/:courseCode/:slug/stage-draft.
//
// WHY. A topic pod translated into a second dialect (cym_s_for_eng health, from
// the North's cym_n_for_eng:health) existed only as a document and as
// canonical_pod_scenarios rows; nothing in Popty created the listening_pods row
// and its sentences, so the pod never appeared in the pods list and a
// proofreader (Deborah) had nowhere to read it. The existing creator,
// /api/admin/pods/generate, re-flexes the canonical through the Claude CLI — it
// cannot take a text a human has already written and Kai has already ruled on.
//
// WHAT IT GUARANTEES, each one asserted by pod-stage-draft.test.cjs:
//   - every staged line is a DRAFT (target_text_draft = true), so it shows in the
//     proofreading queue and the text-approval gate refuses to render it;
//   - NO AUDIO: every audio pointer is null — nothing is copied from the mirror;
//   - the pod is created HELD, explicitly. The column defaults to 'live'.
//   - visibility is NOT the guard (Tom, 2026-09-02): a serving slug and a core
//     pod are refused outright, so the learner app (which resolves pods by slug)
//     can never pick the staged pod up;
//   - NO CAST: the pod's `speakers` keeps the mirror's role names and genders and
//     drops every voice — a cast is a separate human decision;
//   - NOT INTO A BOOTH: the recordist queue routes a pod line by
//     voice_config.podCast[speaker] and does not read the draft flag, so if any
//     staged speaker is already cast on the course the stage is REFUSED — draft
//     text would otherwise land in a recorder's queue unproofread;
//   - structure (scene, order, flow/variant_key, speaker, beat, glue, jump-in) is copied from the
//     mirror line with the same id tail, and the supplied lines must cover the
//     mirror EXACTLY — no missing line, no extra, no duplicate, no empty text;
//   - never overwrites: an existing pod at the destination is refused.
//
// PURE. The route supplies the rows it read; this decides and builds.

'use strict'

const { SERVING_POD_SLUGS, LISTENING_EXTRA_POD_SLUGS } = require('../tools/pods/serving-slug.cjs')
const { castVoiceFor } = require('./voice-engine/pods-cast.cjs')

const SLUG = /^[a-z0-9][a-z0-9-]{1,63}$/
// pod-0 is the player's second serving slug (servedPod.ts SERVING_POD_SLUGS).
const NEVER_STAGE = new Set([...SERVING_POD_SLUGS, ...LISTENING_EXTRA_POD_SLUGS, 'pod-0'])

/** Parse the request body. lines: [{ id, target_text, known_text }] where id is the mirror's id tail. */
function parseStageDraftRequest(courseCode, slug, body) {
  const b = body || {}
  if (!courseCode || typeof courseCode !== 'string') return { error: 'courseCode required' }
  if (!SLUG.test(String(slug || ''))) return { error: `slug must match ${SLUG}` }
  if (NEVER_STAGE.has(slug)) return { error: `refusing to stage onto "${slug}": the learner app serves that slug` }
  const mirror = typeof b.mirror === 'string' ? b.mirror.trim() : ''
  if (!/^[a-z0-9_]+:[a-z0-9-]+$/.test(mirror)) return { error: 'mirror required: the pod id to copy structure from, e.g. cym_n_for_eng:health' }
  if (!Array.isArray(b.lines) || !b.lines.length) return { error: 'lines required: [{ id, target_text, known_text }]' }
  const lines = []
  for (const [i, l] of b.lines.entries()) {
    const id = l && typeof l.id === 'string' ? l.id.trim() : ''
    const target = l && typeof l.target_text === 'string' ? l.target_text.trim() : ''
    const known = l && typeof l.known_text === 'string' ? l.known_text.trim() : ''
    if (!id) return { error: `line ${i}: id required` }
    if (!target) return { error: `line ${i} (${id}): target_text is empty` }
    if (!known) return { error: `line ${i} (${id}): known_text is empty` }
    lines.push({ id, target_text: target, known_text: known })
  }
  if (b.apply !== undefined && typeof b.apply !== 'boolean') return { error: 'apply must be true or false' }
  const title = typeof b.title === 'string' && b.title.trim() ? b.title.trim() : null
  return { courseCode, slug, mirror, lines, title, apply: b.apply === true }
}

/**
 * Decide and build. Returns { error } or { pod, sentences, summary }.
 * @param {object} req          parseStageDraftRequest output
 * @param {object} facts
 *   existingPod     the destination listening_pods row, or null
 *   mirrorPod       the mirror listening_pods row, or null
 *   mirrorSentences the mirror's listening_pod_sentences rows
 *   podCast         the destination course's voice_config.podCast (or {})
 *   by              who is staging (agent id or admin email), for metadata
 */
function planStageDraft(req, { existingPod, mirrorPod, mirrorSentences, podCast, by }) {
  const { courseCode, slug, mirror, lines } = req
  const podId = `${courseCode}:${slug}`
  if (existingPod) return { error: `${podId} already exists — staging never overwrites a pod` }
  if (!mirrorPod) return { error: `mirror pod ${mirror} not found` }
  if (mirrorPod.pod_type !== 'choice') return { error: `mirror ${mirror} is a ${mirrorPod.pod_type} pod; only topic (choice) pods are staged` }

  const prefix = `${mirror}:`
  const byTail = new Map()
  for (const s of mirrorSentences || []) {
    if (!s.id.startsWith(prefix)) return { error: `mirror sentence ${s.id} is not under ${prefix}` }
    byTail.set(s.id.slice(prefix.length), s)
  }
  const seen = new Set()
  const dupes = []
  for (const l of lines) { if (seen.has(l.id)) dupes.push(l.id); seen.add(l.id) }
  if (dupes.length) return { error: `duplicate line ids: ${dupes.slice(0, 5).join(', ')}` }
  const extra = lines.filter(l => !byTail.has(l.id)).map(l => l.id)
  const missing = [...byTail.keys()].filter(t => !seen.has(t))
  if (extra.length || missing.length) {
    return { error: `lines must cover ${mirror} exactly — no mirror line for ${JSON.stringify(extra.slice(0, 5))}${extra.length > 5 ? ` (+${extra.length - 5})` : ''}; mirror lines not supplied ${JSON.stringify(missing.slice(0, 5))}${missing.length > 5 ? ` (+${missing.length - 5})` : ''}` }
  }

  const speakers = [...new Set(lines.map(l => byTail.get(l.id).speaker))]
  const cast = speakers.filter(sp => castVoiceFor(podCast || {}, sp))
  if (cast.length) {
    return { error: `refusing: ${cast.join(', ')} ${cast.length === 1 ? 'is' : 'are'} already cast on ${courseCode}, so these draft lines would enter a recorder's booth queue unproofread` }
  }

  // Role names and genders only — never a voice.
  const roleSpeakers = {}
  for (const [name, entry] of Object.entries(mirrorPod.speakers || {})) {
    if (name === '_default') continue
    roleSpeakers[name] = entry && entry.gender ? { gender: entry.gender } : {}
  }

  const pod = {
    id: podId,
    course_code: courseCode,
    pod_type: 'choice',
    slug,
    title: req.title || mirrorPod.title || slug,
    scene: mirrorPod.scene ?? null,
    difficulty: mirrorPod.difficulty ?? null,
    speakers: roleSpeakers,
    source_file: 'services/pod-stage-draft.cjs',
    visibility: 'held',
    required_role: null,
    metadata: { staged_draft: { mirror, by: by || null, at: new Date().toISOString(), lines: lines.length } },
  }

  const sentences = lines.map(l => {
    const m = byTail.get(l.id)
    return {
      id: `${podId}:${l.id}`,
      pod_id: podId,
      scene_number: m.scene_number,
      sentence_number: m.sentence_number,
      global_order: m.global_order,
      beat_label: m.beat_label ?? null,
      speaker: m.speaker,
      // The flow. (pod_id, scene, sentence, variant_key) is unique, so two flows
      // of one scene collide without it.
      variant_key: m.variant_key ?? null,
      glue_to_next: m.glue_to_next === true,
      jump_in: m.jump_in ?? null,
      target_text: l.target_text,
      known_text: l.known_text,
      target_text_draft: true,
      target_audio_id: null,
      known_audio_id: null,
    }
  }).sort((a, b) => a.global_order - b.global_order)

  return {
    pod,
    sentences,
    summary: { podId, mirror, lines: sentences.length, speakers, drafts: sentences.length, audio: 0, visibility: 'held' },
  }
}

module.exports = { parseStageDraftRequest, planStageDraft, NEVER_STAGE }
