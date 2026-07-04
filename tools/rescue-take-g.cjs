#!/usr/bin/env node
/**
 * rescue-take-g.cjs — re-render the Take G groups whose seams the slicer
 * refused to trust (voice didn't breathe at the " … " cue).
 *
 * Per failing group, by the cast voice's provider:
 *   azure       → force re-render the SAME cued text. The upsert hits the same
 *                 conflict key, so the row id (and takeg_audio_ids link) is
 *                 unchanged — but the row now carries word_boundaries, which
 *                 slice-take-g.cjs prefers over silence detection (exact cuts
 *                 even from a voice that never pauses).
 *   elevenlabs  → re-render with explicit <break time="0.40s"/> joins (EL
 *                 honours inline break tags; the raw " … " cue often doesn't
 *                 breathe). New text → new row → takeg_audio_ids[gi] relinked.
 *                 The old clip row is left in place (no asset deletion).
 *
 * Then re-run slice-take-g.cjs — it only touches groups still missing spans.
 *
 *   PHASE8_NO_LISTEN=1 node tools/rescue-take-g.cjs <course> [--dry]
 *
 * TTS costs money (pennies at this scale) — part of the approved fill plan.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const p8 = require('../services/phases/phase8-audio-v13.cjs')

const COURSE = process.argv[2]
const dry = process.argv.includes('--dry')
if (!COURSE) { console.error('usage: rescue-take-g.cjs <course> [--dry]'); process.exit(1) }
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ROLE = 'pod_take_g'
const CUE = ' … '
const EL_BREAK = ' <break time="0.40s"/> '
const SENTENCE_PUNCT = /[.!?…。！？]/

function atomGroups(targetText, atoms) {
  const text = targetText || ''
  const lower = text.toLowerCase()
  const groups = [[]]
  let cursor = 0
  for (let i = 0; i < atoms.length; i++) {
    const idx = lower.indexOf(atoms[i].target_surface.toLowerCase(), cursor)
    if (i > 0 && idx !== -1 && SENTENCE_PUNCT.test(text.slice(cursor, idx))) groups.push([])
    groups[groups.length - 1].push(atoms[i])
    if (idx !== -1) cursor = idx + atoms[i].target_surface.length
  }
  return groups.filter((g) => g.length)
}
function glueGroups(rawGroups) {
  const groups = []
  let carry = []
  rawGroups.forEach((g, i) => {
    // Only TURN-INITIAL one-unit groups (leading "Ciao!" interjections) glue
    // forward; a mid-turn one-unit group is a real sentence ("Impresioniran
    // sam.") and must stand alone — gluing it swallowed its known take.
    if (groups.length === 0 && g.length === 1 && i < rawGroups.length - 1) { carry.push(...g); return }
    groups.push([...carry, ...g])
    carry = []
  })
  if (carry.length) groups.push(carry)
  return groups
}
function cuedGroupText(turnText, group, cue) {
  const lower = turnText.toLowerCase()
  const marks = []
  let cursor = 0
  for (const a of group) {
    const idx = lower.indexOf(a.target_surface.toLowerCase(), cursor)
    if (idx === -1) return null
    marks.push({ start: idx, end: idx + a.target_surface.length })
    cursor = idx + a.target_surface.length
  }
  const pieces = marks.map((m, i) => {
    if (i < marks.length - 1) return turnText.slice(m.start, marks[i + 1].start).trim()
    const tail = turnText.slice(m.start)
    const stop = tail.search(/(?<=[.!?…。！？])/)
    return (stop === -1 ? tail : tail.slice(0, stop)).trim()
  })
  return pieces.join(cue)
}

;(async () => {
  const { data: pod } = await supabase.from('listening_pods').select('speakers').eq('id', `${COURSE}:pod-0`).single()
  const { data: course } = await supabase.from('courses').select('voice_config').eq('course_code', COURSE).single()
  const targetLang = (((course || {}).voice_config || {}).voices || {}).target1?.language || COURSE.split('_')[0]

  const { data: sents, error } = await supabase.from('listening_pod_sentences')
    .select('id, global_order, speaker, target_text, atom_map_fine, takeg_audio_ids')
    .eq('pod_id', `${COURSE}:pod-0`).not('takeg_audio_ids', 'is', null).order('global_order')
  if (error) { console.error(error.message); process.exit(1) }

  let azure = 0, eleven = 0, xai = 0, skipped = 0, failed = 0
  for (const s of sents || []) {
    const atoms = (s.atom_map_fine || []).filter((a) => a.kind !== 'note')
    if (!atoms.length) continue
    const groups = glueGroups(atomGroups(s.target_text, atoms))
    const ids = (s.takeg_audio_ids || []).slice()
    let relink = false
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      if (g.length < 2 || !ids[gi]) continue
      if (g.every((a) => a.target_start_ms != null && a.target_end_ms != null)) continue // already sliced
      const voice = p8.resolvePodSpeakerVoice(pod.speakers, s.speaker, 'target')
      if (!voice) { console.log(`S${s.global_order} g${gi}: ✗ no voice for "${s.speaker}"`); failed++; continue }

      try {
        if (voice.provider === 'elevenlabs') {
          const cued = cuedGroupText(s.target_text, g, EL_BREAK)
          if (!cued) { failed++; continue }
          if (dry) { console.log(`S${s.global_order} g${gi} [EL ${voice.voice_id}]: "${cued.slice(0, 100)}"`); continue }
          const res = await p8.generatePodAudio({ courseCode: COURSE, text: cued, language: targetLang, role: ROLE, voice })
          if (res.id !== ids[gi]) { ids[gi] = res.id; relink = true }
          eleven++
        } else if (voice.provider === 'xai') {
          // xAI: no word boundaries, and its pause at "…" varies take to
          // take — re-roll with ASCII dots (its normaliser treats "..." more
          // reliably) and force, so every rescue round is a fresh dice roll.
          const cued = cuedGroupText(s.target_text, g, ' ... ')
          if (!cued) { failed++; continue }
          if (dry) { console.log(`S${s.global_order} g${gi} [xai ${voice.voice_id}]: "${cued.slice(0, 100)}"`); continue }
          const res = await p8.generatePodAudio({ courseCode: COURSE, text: cued, language: targetLang, role: ROLE, voice, force: true })
          if (res.id !== ids[gi]) { ids[gi] = res.id; relink = true }
          xai++
        } else {
          // azure (and anything word-boundary-capable): same text, in place
          const cued = cuedGroupText(s.target_text, g, CUE)
          if (!cued) { failed++; continue }
          if (dry) { console.log(`S${s.global_order} g${gi} [AZ ${voice.voice_id}]: force re-render`); continue }
          await p8.generatePodAudio({ courseCode: COURSE, text: cued, language: targetLang, role: ROLE, voice, force: true })
          azure++
        }
      } catch (e) {
        console.log(`S${s.global_order} g${gi}: ✗ ${e.message.slice(0, 120)}`)
        failed++
      }
    }
    if (relink && !dry) {
      const { error: werr } = await supabase.from('listening_pod_sentences').update({ takeg_audio_ids: ids }).eq('id', s.id)
      if (werr) { console.log(`S${s.global_order}: LINK FAIL ${werr.message}`); failed++ }
    }
  }
  console.log(`\n${dry ? '[DRY] ' : ''}${COURSE}: ${azure} azure force re-renders, ${xai} xai ascii-dot re-rolls, ${eleven} elevenlabs break-tag re-renders, ${failed} failed.`)
  process.exit(failed ? 2 : 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
