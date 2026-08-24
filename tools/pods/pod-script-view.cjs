/**
 * pod-script-view.cjs — turn a live pod into a READABLE SCRIPT with its casting
 * violations already marked, so Tom can see what is wrong with a pod without
 * listening to it.
 *
 * Commissioned 2026-08-24: "seriously though, the casting is hopeless. Scence 18
 * is the female voice ALL THE WAY THROUGH - apart from the Narrator??? what the
 * hell is all that about?" … "Can I not see the scripts anywhere in Popty to
 * have a quick butcher's at them?"
 *
 * The casting RULE is not defined here. It is Tom's, 2026-08-23 — "there's
 * always male talking to female, so that two voices can actually do the whole
 * thing, rather than per character" — and it is measured in exactly one place,
 * tools/pods/pod-cast-gate.cjs. This module CALLS that gate and positions its
 * verdict against lines on a screen. It adds no rule of its own except one, and
 * that one is declared out loud below.
 *
 * ---------------------------------------------------------------------------
 * THE ONE THING THIS ADDS, AND WHY — the same-voice RUN
 *
 * ita_for_eng pod-1 PASSES the gate today: two target voices, zero same-voice
 * exchange pairs. Tom's complaint about scene 18 is nonetheless entirely real.
 * Scene 18 is a drill: ten consecutive `Learner` lines, then one `Narrator`
 * line. The gate's exchange graph skips adjacent lines by the SAME character
 * (`a === b`) — correctly, because a character taking two turns is drama, not a
 * casting fault — so a ten-line single-character drill produces zero edges and
 * the pod measures clean. What Tom heard was the female voice for ten turns and
 * the male Narrator once, which is precisely what the data says.
 *
 * So this module also reports:
 *   - SAME-VOICE RUN: 3+ consecutive non-Narrator lines on one voice.
 *   - SINGLE-VOICE SCENE: every non-Narrator line in a scene on one voice, 3+
 *     lines. This is Tom's sentence, literally, and scene 18 is one.
 *
 * These are DISPLAY findings, reported at severity 'warn'. They are deliberately
 * NOT fed back into the gate's ok/fail: promotion is gated on Tom's two numbers,
 * and a viewer must not quietly widen a rule that flip and recast both solve to.
 * The run threshold is 3 because a run of 2 is one character answering a
 * question and then adding a sentence, which is normal everywhere in the fleet.
 *
 * ---------------------------------------------------------------------------
 * UNKNOWN GENDER IS NOT A PASS. The male-female check needs both voices'
 * genders, and gender is derived from catalogues, not read from a column (see
 * pod-voice-identity.cjs). Where a voice cannot be resolved, the exchange is
 * reported as 'gender-uncheckable' — never silently as good.
 *
 * Pure: rows + cast in, view model out. No DB, no env, no I/O.
 */

'use strict'

const { checkPodCast, exchangeEdges } = require('./pod-cast-gate.cjs')
const { canonicalSpeakerName } = require('../pod-voice-colour-n.cjs')
const { resolveVoice, genderLabel } = require('./pod-voice-identity.cjs')

/** Characters that narrate rather than converse — never part of an exchange. */
const NARRATORS = new Set(['narrator'])
const isNarrator = (name) => NARRATORS.has(String(name || '').trim().toLowerCase())

/** 3+ consecutive lines on one voice is a run worth showing. See header. */
const RUN_THRESHOLD = 3

// ---------------------------------------------------------------------------
// PLAYBACK — Tom, 2026-08-24: "this is pointless unless I can actually hear it
// … I need the clips right there, that the DB is expecting the app to play".
//
// So every line carries its clips, addressed EXACTLY as the learner app
// addresses them, or the tap and the learner's playback are not the same event.
//
// Two halves to that:
//
// (1) The BASE is the deployed learning-app proxy, never S3 and never a
//     presigned link. popty.app does not serve /api/audio; the same constant
//     with the same reason is in src/views/admin/PodLab.vue.
//
// (2) The REF is not always the bare uuid. A clip that has been revised is
//     addressed as `<uuid>.v<N>`; revision 1 or unknown stays bare. The rule
//     lives in ssi-learning-app/api/_utils/audioAccess.ts (parseAudioRef /
//     buildAudioRef) and the reason it is in the id rather than a query string
//     is that the id IS the IndexedDB cache key — a `?v=` would leave offline
//     learners on stale bytes for good. buildAudioRef below is a deliberate
//     mirror of that function; if the learner rule ever changes, this changes
//     with it, and the test in this directory is what will catch the drift.
// ---------------------------------------------------------------------------

const AUDIO_BASE = 'https://saysomethingin.app/api/audio'

/** Mirror of the learner app's buildAudioRef. Revision 1/unknown stays bare. */
function buildAudioRef (id, revision) {
  return revision && Number(revision) > 1 ? `${id}.v${Number(revision)}` : id
}

/**
 * @param {object} o
 * @param {{id:string, course_code:string, slug:string, title:string, speakers:object}} o.pod
 * @param {Array<object>} o.rows sentence rows in playing order (global_order)
 * @param {'target'|'known'} [o.track]
 * @param {object|null} [o.clips] optional id → {text, voice_id, audio_revision, duration_ms}.
 *        Enables the gate's six-column clip check AND the per-line playback refs.
 */
function buildPodScript ({ pod, rows, track = 'target', clips = null }) {
  const cast = (pod && pod.speakers) || {}
  const course = (pod && pod.course_code) || null
  const cRows = (rows || []).slice().sort((a, b) => (a.global_order || 0) - (b.global_order || 0))

  // --- voice per line, via the cast map, with a readable identity ------------
  const voiceCache = new Map()
  const voiceFor = (speakerRaw) => {
    const name = canonicalSpeakerName(speakerRaw)
    if (voiceCache.has(name)) return voiceCache.get(name)
    const entry = cast[name] || cast._default || null
    const slot = entry && (track === 'target' ? entry.target : entry.known)
    const v = slot && slot.voice_id
      ? resolveVoice(slot.voice_id, { name: slot.name, castGender: entry.gender })
      : null
    const out = v ? { ...v, label: genderLabel(v.gender) } : null
    voiceCache.set(name, out)
    return out
  }

  // --- the gate's verdict, unmodified ---------------------------------------
  const gate = checkPodCast({ rows: cRows, speakers: cast, track, clips, course })
  const edges = exchangeEdges({ rows: cRows, speakers: cast, track })

  const violations = []
  /** flags keyed by row index, so the view can decorate a line */
  const flagsByIndex = new Map()
  const flag = (index, v) => {
    if (index == null) return
    if (!flagsByIndex.has(index)) flagsByIndex.set(index, [])
    flagsByIndex.get(index).push(v)
  }
  /**
   * THE ADDRESSING RULE (Tom, 2026-08-24): "any same-voice finding must be
   * reported as (course, scene, speaker-pair, voice), never as a bare scene
   * number." Every violation therefore carries `course` and, where it is about
   * voices, structured `speakers` and `voice` fields alongside the prose — so a
   * consumer can tell that a finding belongs to THIS course's cast without
   * parsing the message, and cannot carry a scene number to a pod cast
   * differently. The Welsh audit's scene-number list fired on Italian scenes 13
   * and 14, which alternate perfectly, because it had no way to say this.
   *
   * This adds addressing only. Which findings fire is untouched.
   */
  const add = (v, indices = []) => {
    // One object, shared by the violations list and the per-line flags, exactly
    // as before — the addressing is added to it, not to a copy of it.
    const addressed = { course, ...v }
    violations.push(addressed)
    for (const i of indices) flag(i, addressed)
  }

  // (c) the cast is not exactly two target voices — the gate's own number.
  if (gate.voicesInUse.length !== 2) {
    add({
      type: 'cast-size',
      severity: 'fail',
      scene: null,
      message: `Cast uses ${gate.voicesInUse.length} ${track} voice(s), not 2` +
        (gate.voicesInUse.length ? `: ${gate.voicesInUse.join(', ')}` : ''),
    })
  }
  for (const name of gate.uncast) {
    add({ type: 'uncast-character', severity: 'fail', scene: null, message: `${name} has no ${track} voice in the cast` })
  }

  // (a) + (b) — walked over the gate's own positioned edges.
  for (const e of edges) {
    if (e.nonExchange) continue // two customers ordering in turn, not talking
    if (isNarrator(e.a) || isNarrator(e.b)) continue
    const va = e.voiceA ? voiceFor(cRows[e.fromIndex].speaker) : null
    const vb = e.voiceB ? voiceFor(cRows[e.toIndex].speaker) : null
    const where = [e.fromIndex, e.toIndex]

    if (e.sameVoice) {
      add({
        type: 'same-voice-exchange',
        severity: 'fail',
        scene: e.scene,
        speakers: [e.a, e.b],
        voice: e.voiceA,
        voice_name: (va && va.name) || null,
        message: `${course ? `${course} ` : ''}scene ${e.scene}: ${e.a} → ${e.b} both on ` +
          `${(va && va.name) || e.voiceA} — one voice talking to itself`,
      }, where)
      continue
    }
    if (!va || !vb || !va.gender || !vb.gender) {
      add({
        type: 'gender-uncheckable',
        severity: 'warn',
        scene: e.scene,
        speakers: [e.a, e.b],
        voice: [va ? va.voice_id : null, vb ? vb.voice_id : null],
        message: `${course ? `${course} ` : ''}scene ${e.scene}: ${e.a} → ${e.b}: cannot check male-female — ` +
          [[va, e.a], [vb, e.b]].filter(([v]) => !v || !v.gender).map(([v, n]) => `${n}'s voice ${v ? v.voice_id : '(none)'} has no known gender`).join('; '),
      }, where)
      continue
    }
    if (va.gender === vb.gender) {
      add({
        type: 'same-gender-exchange',
        severity: 'fail',
        scene: e.scene,
        speakers: [e.a, e.b],
        voice: [va.voice_id, vb.voice_id],
        voice_name: [va.name || null, vb.name || null],
        message: `${course ? `${course} ` : ''}scene ${e.scene}: ` +
          `${e.a} (${va.name || va.voice_id}, ${genderLabel(va.gender)}) → ${e.b} (${vb.name || vb.voice_id}, ${genderLabel(vb.gender)}) — not male-female`,
      }, where)
    }
  }

  // --- the display finding: same-voice runs and single-voice scenes ---------
  // Walked per scene, over non-Narrator lines only, in playing order.
  const sceneIndices = new Map()
  cRows.forEach((r, i) => {
    const k = r.scene_number == null ? '_' : r.scene_number
    if (!sceneIndices.has(k)) sceneIndices.set(k, [])
    sceneIndices.get(k).push(i)
  })

  for (const [sceneKey, idxs] of sceneIndices) {
    const spoken = idxs.filter(i => !isNarrator(canonicalSpeakerName(cRows[i].speaker)))
    if (!spoken.length) continue

    // runs of consecutive spoken lines on one voice
    let run = []
    const flushRun = () => {
      if (run.length >= RUN_THRESHOLD) {
        const v = voiceFor(cRows[run[0]].speaker)
        const who = [...new Set(run.map(i => canonicalSpeakerName(cRows[i].speaker)))]
        const sc = sceneKey === '_' ? null : sceneKey
        add({
          type: 'same-voice-run',
          severity: 'warn',
          scene: sc,
          speakers: who,
          voice: (v && v.voice_id) || null,
          voice_name: (v && v.name) || null,
          message: `${course ? `${course} ` : ''}scene ${sc == null ? '?' : sc}: ` +
            `${run.length} consecutive lines on one voice — ${(v && v.name) || 'unknown voice'}` +
            `${v && v.gender ? `, ${genderLabel(v.gender)}` : ''} (${who.join(', ')})`,
        }, run)
      }
      run = []
    }
    for (const i of spoken) {
      const v = voiceFor(cRows[i].speaker)
      const id = v ? v.voice_id : null
      if (!run.length) { run = [i]; continue }
      const prevV = voiceFor(cRows[run[run.length - 1]].speaker)
      const prevId = prevV ? prevV.voice_id : null
      if (id && prevId && id === prevId) run.push(i)
      else { flushRun(); run = [i] }
    }
    flushRun()

    // the whole scene on one voice — Tom's sentence, literally
    const sceneVoices = [...new Set(spoken.map(i => { const v = voiceFor(cRows[i].speaker); return v ? v.voice_id : null }))]
    if (spoken.length >= RUN_THRESHOLD && sceneVoices.length === 1 && sceneVoices[0]) {
      const v = voiceFor(cRows[spoken[0]].speaker)
      const hadNarrator = idxs.length > spoken.length
      const sc = sceneKey === '_' ? null : sceneKey
      add({
        type: 'single-voice-scene',
        severity: 'warn',
        scene: sc,
        speakers: [...new Set(spoken.map(i => canonicalSpeakerName(cRows[i].speaker)))],
        voice: sceneVoices[0],
        voice_name: (v && v.name) || null,
        message: `${course ? `${course} ` : ''}scene ${sc == null ? '?' : sc}: ` +
          `every one of the ${spoken.length} spoken lines in this scene is ${(v && v.name) || sceneVoices[0]}` +
          `${v && v.gender ? `, the ${genderLabel(v.gender)}` : ''}${hadNarrator ? ' — apart from the Narrator' : ''}`,
      }, spoken)
    }
  }

  // --- the clips, addressed the way the learner app addresses them ----------
  // A slot with no id and a slot whose id has no course_audio row are DIFFERENT
  // facts and both are shown: "no split clips" is information Tom asked for,
  // because half the 2026-08-24 incident was pods carrying split arrays that
  // pointed at another pod's clips. Never a dead button, never nothing.
  const clipRef = (id) => {
    if (!id) return null
    const c = clips ? clips[id] : null
    const revision = c ? (c.audio_revision ?? null) : null
    const ref = buildAudioRef(id, revision)
    return {
      id,
      ref,
      revision,
      url: `${AUDIO_BASE}/${ref}`,
      // null when clips were not loaded; false when loaded and this id is absent
      // from course_audio — a dangling reference, which is a real defect.
      found: clips ? Boolean(c) : null,
      text: c ? (c.text ?? null) : null,
      voice_id: c ? (c.voice_id ?? null) : null,
      duration_ms: c ? (c.duration_ms ?? null) : null,
    }
  }
  const audioFor = (r) => ({
    target: clipRef(r.target_audio_id),
    known: clipRef(r.known_audio_id),
    explainer: clipRef(r.explainer_audio_id),
    target_splits: (r.sentence_audio_ids || []).map(clipRef).filter(Boolean),
    known_splits: (r.sentence_known_audio_ids || []).map(clipRef).filter(Boolean),
    // present so the arrays can be told apart from "column not selected"
    has_split_arrays: Array.isArray(r.sentence_audio_ids),
    loaded: Boolean(clips),
  })

  // --- assemble the scenes ---------------------------------------------------
  const scenes = []
  for (const [sceneKey, idxs] of sceneIndices) {
    const lines = idxs.map(i => {
      const r = cRows[i]
      const v = voiceFor(r.speaker)
      const fl = flagsByIndex.get(i) || []
      return {
        id: r.id,
        scene_number: r.scene_number,
        sentence_number: r.sentence_number,
        global_order: r.global_order,
        beat_label: r.beat_label || null,
        speaker: canonicalSpeakerName(r.speaker) || r.speaker,
        speaker_raw: r.speaker,
        is_narrator: isNarrator(canonicalSpeakerName(r.speaker)),
        voice: v,
        target_text: r.target_text || '',
        known_text: r.known_text || '',
        audio: audioFor(r),
        flags: fl,
        worst: fl.some(f => f.severity === 'fail') ? 'fail' : (fl.length ? 'warn' : null),
      }
    })
    scenes.push({
      scene_number: sceneKey === '_' ? null : sceneKey,
      beat_label: lines.map(l => l.beat_label).find(Boolean) || null,
      line_count: lines.length,
      lines,
      violations: violations.filter(v => v.scene === (sceneKey === '_' ? null : sceneKey)),
    })
  }
  scenes.sort((a, b) => (a.scene_number ?? 1e9) - (b.scene_number ?? 1e9))

  // --- the cast, as voices rather than characters ---------------------------
  const byVoice = new Map()
  for (const r of cRows) {
    const name = canonicalSpeakerName(r.speaker)
    const v = voiceFor(r.speaker)
    const key = v ? v.voice_id : '(uncast)'
    if (!byVoice.has(key)) byVoice.set(key, { ...(v || { voice_id: null, name: null, gender: null, genderSource: 'unknown', resolved: false }), label: v ? v.label : 'no voice', characters: new Set(), lines: 0 })
    const e = byVoice.get(key)
    e.characters.add(name)
    e.lines += 1
  }
  const castOut = [...byVoice.values()]
    .map(e => ({ ...e, characters: [...e.characters].sort() }))
    .sort((a, b) => b.lines - a.lines)

  const counts = {}
  for (const v of violations) counts[v.type] = (counts[v.type] || 0) + 1

  // How much of this pod Tom can actually hear. Only meaningful once clips are
  // loaded; null otherwise, rather than a zero that reads like an answer.
  let audioSummary = null
  if (clips) {
    audioSummary = { lines: cRows.length, with_target: 0, without_target: 0, with_splits: 0, without_splits: 0, dangling: 0, split_clips: 0 }
    for (const r of cRows) {
      const a = audioFor(r)
      if (a.target) audioSummary.with_target++; else audioSummary.without_target++
      if (a.target_splits.length) { audioSummary.with_splits++; audioSummary.split_clips += a.target_splits.length } else audioSummary.without_splits++
      for (const c of [a.target, a.known, a.explainer, ...a.target_splits, ...a.known_splits]) {
        if (c && c.found === false) audioSummary.dangling++
      }
    }
  }

  return {
    pod_id: pod && pod.id,
    course_code: pod && pod.course_code,
    slug: pod && pod.slug,
    title: (pod && pod.title) || null,
    track,
    summary: {
      scenes: scenes.length,
      lines: cRows.length,
      cast: castOut,
      unknown_gender_voices: castOut.filter(c => !c.gender).map(c => c.voice_id).filter(Boolean),
      gate_ok: gate.ok,
      gate_failures: gate.failures,
      clip_check: gate.clipCheck,
      audio: audioSummary,
      violation_counts: counts,
      violations_total: violations.length,
      fails: violations.filter(v => v.severity === 'fail').length,
      warns: violations.filter(v => v.severity === 'warn').length,
    },
    violations,
    scenes,
  }
}

module.exports = { buildPodScript, buildAudioRef, AUDIO_BASE, RUN_THRESHOLD, isNarrator }
