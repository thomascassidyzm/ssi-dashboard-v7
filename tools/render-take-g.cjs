#!/usr/bin/env node
/**
 * render-take-g.cjs — render Take G: the gapped per-sentence TARGET take the
 * unified ladder slices every fusion chunk from.
 *
 * Take G = the sentence spoken by its turn's cast voice with a pause cue
 * (" … ") at every fine-unit seam — phase8's sentence-boundary cue trick
 * pushed one level down (Tom 2026-06-30 / 07-02). Any fusion window is then a
 * contiguous slice of this ONE take, internal gaps and all — chunks at every
 * rung come from ms spans, not thousands of per-chunk files. slice-take-g.cjs
 * detects the gaps afterwards and writes target_start_ms/target_end_ms into
 * atom_map_fine (code-gated: gap count must match the seam count exactly).
 *
 * The cued text is rebuilt by walking the ORIGINAL sentence text (unit
 * surfaces were punctuation-stripped at authoring): internal punctuation
 * stays with the unit it follows, the terminal mark stays on the last unit —
 * a question renders with question intonation.
 *
 * One render per multi-unit GLUED sentence group (leading interjections glue
 * forward, same as the Lab); single-unit groups keep null (their unit IS the
 * real sentence take). Links land in listening_pod_sentences.takeg_audio_ids
 * (uuid[] aligned to glued groups). Dedup is on the cued text, so re-renders
 * never collide with flat takes.
 *
 *   PHASE8_NO_LISTEN=1 node tools/render-take-g.cjs <course> [orders] [--dry]
 *
 * TTS costs money — run only under an approved plan.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const p8 = require('../services/phases/phase8-audio-v13.cjs')

const COURSE = process.argv[2]
const ORDERS = (process.argv[3] || '').split(',').map(Number).filter(Boolean)
const dry = process.argv.includes('--dry')
if (!COURSE) { console.error('usage: render-take-g.cjs <course> [orders] [--dry]'); process.exit(1) }
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ROLE = 'pod_take_g'
const CUE = ' … '
const SENTENCE_PUNCT = /[.!?…。！？]/

// ---- same grouping as the Lab / author-window-knowns ----
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
    if (g.length === 1 && i < rawGroups.length - 1) { carry.push(...g); return }
    groups.push([...carry, ...g])
    carry = []
  })
  if (carry.length) {
    if (groups.length) groups[groups.length - 1].push(...carry)
    else groups.push(carry)
  }
  return groups
}

/**
 * Rebuild the group's text with CUE at every unit seam, walking the original
 * turn text so punctuation survives. Each unit's slice runs from its own
 * match to just before the NEXT unit's match (so ", " after a unit stays with
 * it); the last unit keeps trailing text through its terminal mark.
 * Returns null when a unit can't be located (caller skips + reports).
 */
function cuedGroupText(turnText, group) {
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
    // last unit: keep trailing punctuation up to (and incl.) the terminal mark
    const tail = turnText.slice(m.start)
    const stop = tail.search(/(?<=[.!?…。！？])/)
    return (stop === -1 ? tail : tail.slice(0, stop)).trim()
  })
  return pieces.join(CUE)
}

;(async () => {
  const { data: pod } = await supabase.from('listening_pods').select('speakers').eq('id', `${COURSE}:pod-0`).single()
  if (!pod || !pod.speakers) { console.error(`ERR: no speakers cast on ${COURSE}:pod-0`); process.exit(1) }
  const { data: course } = await supabase.from('courses').select('voice_config').eq('course_code', COURSE).single()
  const targetLang = (((course || {}).voice_config || {}).voices || {}).target1?.language || COURSE.split('_')[0]

  let q = supabase.from('listening_pod_sentences')
    .select('id, global_order, speaker, target_text, atom_map_fine, takeg_audio_ids')
    .eq('pod_id', `${COURSE}:pod-0`).order('global_order')
  if (ORDERS.length) q = q.in('global_order', ORDERS)
  const { data: sents, error } = await q
  if (error) { console.error(error.message); process.exit(1) }

  let rendered = 0, reused = 0, singles = 0, failed = 0, turnsLinked = 0
  async function processTurn(s) {
    const atoms = (s.atom_map_fine || []).filter((a) => a.kind !== 'note')
    if (!atoms.length) return
    const groups = glueGroups(atomGroups(s.target_text, atoms))
    const voice = p8.resolvePodSpeakerVoice(pod.speakers, s.speaker, 'target')
    if (!voice) { console.log(`S${s.global_order}: ✗ no target voice for speaker "${s.speaker}"`); failed++; return }

    const ids = []
    for (const g of groups) {
      if (g.length < 2) { ids.push(null); singles++; continue }
      const cued = cuedGroupText(s.target_text, g)
      if (!cued) { console.log(`S${s.global_order}: ✗ unit not found in turn text — group skipped`); failed++; ids.push(null); continue }
      if (dry) { console.log(`S${s.global_order} [${s.speaker}→${voice.voice_id}]: "${cued}"`); ids.push(null); continue }
      try {
        const res = await p8.generatePodAudio({ courseCode: COURSE, text: cued, language: targetLang, role: ROLE, voice })
        res.reused ? reused++ : rendered++
        ids.push(res.id)
      } catch (e) {
        console.log(`S${s.global_order}: ✗ TTS fail — ${e.message.slice(0, 120)}`)
        failed++; ids.push(null)
      }
    }
    if (!dry && ids.some(Boolean)) {
      const { error: werr } = await supabase.from('listening_pod_sentences').update({ takeg_audio_ids: ids }).eq('id', s.id)
      if (werr) { console.log(`S${s.global_order}: LINK FAIL ${werr.message}`); failed++; return }
      turnsLinked++
    }
  }

  const CONC = Number(process.env.RENDER_CONC || 6)
  let next = 0
  const worker = async () => { while (next < (sents || []).length) await processTurn(sents[next++]) }
  await Promise.all(Array.from({ length: Math.min(CONC, (sents || []).length) }, worker))
  console.log(`\n${dry ? '[DRY] ' : ''}${COURSE}: ${rendered} rendered, ${reused} reused, ${singles} single-unit groups (no Take G), ${failed} failed; ${turnsLinked} turns linked.`)
  process.exit(failed ? 2 : 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
