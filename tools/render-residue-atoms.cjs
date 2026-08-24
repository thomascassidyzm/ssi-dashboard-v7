#!/usr/bin/env node
/**
 * render-residue-atoms.cjs — per-unit "[atom] <surface>" clips for the fine
 * units of groups the Take G slicer could NOT gate (xAI voices that never
 * breathe at the cue, any punctuation, 10+ re-rolls). The Lab already butts
 * unit clips (dashed) wherever Take G spans are missing — but zho/spa/fra
 * never had the June atom-clip sweep, so their residue groups would play
 * SILENCE at sub-sentence rungs. This fills that fallback with real audio.
 *
 * Same conventions as breakdown-flat.cjs: role pod_explainer, text
 * "[atom] <surface>" (rendered as the bare surface), course target1 voice —
 * loadStage0ClipMaps resolves them with no Lab changes.
 *
 *   PHASE8_NO_LISTEN=1 node tools/render-residue-atoms.cjs <course> [--dry]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const p8 = require('../services/phases/phase8-audio-v13.cjs')

const COURSE = process.argv[2]
const dry = process.argv.includes('--dry')
if (!COURSE) { console.error('usage: render-residue-atoms.cjs <course> [--dry]'); process.exit(1) }
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const { XAI_OFFICIAL } = require('../services/shared/xai-catalogue.cjs')

const ROLE = 'pod_explainer'
const base = (l) => String(l || '').toLowerCase().split('-')[0]
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
    if (groups.length === 0 && g.length === 1 && i < rawGroups.length - 1) { carry.push(...g); return }
    groups.push([...carry, ...g])
    carry = []
  })
  if (carry.length) groups.push(carry)
  return groups
}

;(async () => {
  const { data: course } = await supabase.from('courses').select('voice_config').eq('course_code', COURSE).single()
  const t1 = (((course || {}).voice_config || {}).voices || {}).target1
  if (!t1 || !t1.voiceId) { console.error(`ERR: ${COURSE} voice_config missing target1`); process.exit(1) }
  const lang = t1.language || COURSE.split('_')[0]
  const VOICE = t1.provider === 'xai' ? { voice_id: t1.voiceId, provider: 'xai', locale: t1.language }
    : XAI_OFFICIAL.has(base(lang)) ? { voice_id: 'eve', provider: 'xai', locale: base(lang) }
    : { voice_id: t1.voiceId, provider: t1.provider, locale: t1.language }
  console.log(`${COURSE}: atom voice=${VOICE.voice_id}/${VOICE.provider}${dry ? '  [DRY]' : ''}`)

  const { data: sents } = await supabase.from('listening_pod_sentences')
    .select('global_order, target_text, atom_map_fine')
    .eq('pod_id', `${COURSE}:pod-0`).order('global_order')

  const surfaces = new Map() // lower surface → surface
  for (const s of sents || []) {
    const atoms = (s.atom_map_fine || []).filter((a) => a.kind !== 'note')
    if (!atoms.length) continue
    for (const g of glueGroups(atomGroups(s.target_text, atoms))) {
      if (g.length < 2) continue
      if (g.every((a) => a.target_start_ms != null && a.target_end_ms != null)) continue
      for (const a of g) {
        const k = a.target_surface.toLowerCase()
        if (!surfaces.has(k)) surfaces.set(k, a.target_surface)
      }
    }
  }
  const todo = [...surfaces.values()]
  console.log(`${COURSE}: ${todo.length} residue unit surfaces`)
  if (dry) { todo.slice(0, 12).forEach((t) => console.log(`  "${t}"`)); process.exit(0) }

  let rendered = 0, reused = 0, failed = 0
  const CONC = Number(process.env.RENDER_CONC || 6)
  let next = 0
  const worker = async () => {
    while (next < todo.length) {
      const surface = todo[next++]
      try {
        // render the bare surface; store under the "[atom] " key like
        // breakdown-flat (existing rows reused via the same normalised key)
        const key = `[atom] ${surface}`
        const existing = await p8.findExistingAudio(COURSE, key, lang, ROLE, VOICE.voice_id)
        if (existing) { reused++; continue }
        const res = await p8.generatePodAudio({ courseCode: COURSE, text: surface, language: lang, role: ROLE, voice: VOICE })
        const { normalizeForAudio } = require('../services/shared/text-normalize.cjs')
        await supabase.from('course_audio').update({ text: key, text_normalized: normalizeForAudio(key) }).eq('id', res.id)
        rendered++
      } catch (e) {
        failed++
        console.log(`  ✗ "${surface.slice(0, 40)}" — ${e.message.slice(0, 100)}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, todo.length) }, worker))
  console.log(`\n${COURSE}: ${rendered} rendered, ${reused} reused, ${failed} failed → role=${ROLE} "[atom]" clips.`)
  process.exit(failed ? 2 : 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
