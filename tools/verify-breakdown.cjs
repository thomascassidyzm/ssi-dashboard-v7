#!/usr/bin/env node
/**
 * verify-breakdown.cjs — does the per-INTENTION 4-movement breakdown compose
 * COMPLETELY for a pod course? Replicates the real composer's resolution path
 * (splitRowUnits → partitionAtomMap → resolveAtoms, case-insensitive surface
 * match) over every turn and reports any holes: partition failures, missing
 * [atom] slices / means clips / whole / known takes. Pure read, no writes.
 * Run this after breakdown-flat to confirm 100% before marking a course done.
 *
 *   node tools/verify-breakdown.cjs <course>
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const COURSE = process.argv[2]
if (!COURSE) { console.error('usage: verify-breakdown.cjs <course>'); process.exit(1) }
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const BOUNDARY = /(?<=[.!?…])\s+/
const splitText = (t) => (t || '').split(BOUNDARY).map((s) => s.trim()).filter(Boolean)
const alnum = (s) => (s || '').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, '')
const normSurface = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim() // MUST match the composers

function splitRowUnits(row) {
  const clips = (row.sentence_audio_ids || []).filter(Boolean)
  const knownClips = (row.sentence_known_audio_ids || []).filter(Boolean)
  if (clips.length < 2) return [{ targetText: row.target_text || '', targetAudioId: row.target_audio_id || null, knownAudioId: row.known_audio_id || null }]
  const tSents = splitText(row.target_text)
  const knownMatches = knownClips.length === clips.length
  return clips.map((clip, i) => ({ targetText: tSents[i] || tSents[tSents.length - 1] || '', targetAudioId: clip, knownAudioId: knownMatches ? knownClips[i] : null }))
}
function partitionAtomMap(atomMap, sentenceTexts) {
  if (sentenceTexts.length < 2) return [atomMap || []]
  if (!Array.isArray(atomMap) || !atomMap.length) return null
  const targets = sentenceTexts.map(alnum)
  if (targets.some((t) => !t)) return null
  const groups = sentenceTexts.map(() => [])
  let si = 0, acc = ''
  for (const e of atomMap) {
    if (si >= groups.length) return null
    groups[si].push(e)
    if (e.kind === 'atom' || e.kind === 'passthrough') {
      const s = alnum(e.target_surface || '')
      if (s) { acc += s; if (acc === targets[si]) { si++; acc = '' } else if (!targets[si].startsWith(acc)) return null }
    }
  }
  if (si !== groups.length || acc !== '') return null
  if (groups.some((g) => g.length === 0)) return null
  return groups
}

;(async () => {
  const [{ data: legos }, { data: atomClips }] = await Promise.all([
    sb.from('pod_legos').select('lego_key, explainer_audio_id').eq('course_code', COURSE),
    sb.from('course_audio').select('id, text').eq('course_code', COURSE).eq('role', 'pod_explainer').like('text', '[atom] %'),
  ])
  const glossMap = new Map(), targetClipMap = new Map()
  for (const l of legos || []) if (l.explainer_audio_id) glossMap.set(l.lego_key, l.explainer_audio_id)
  for (const a of atomClips || []) { const s = normSurface(a.text.slice('[atom] '.length)); if (!targetClipMap.has(s)) targetClipMap.set(s, a.id) }

  const { data: turns } = await sb.from('listening_pod_sentences')
    .select('global_order, target_text, target_audio_id, known_audio_id, atom_map, sentence_audio_ids, sentence_known_audio_ids')
    .eq('pod_id', `${COURSE}:pod-0`).order('global_order')

  let nIntentions = 0, partitionFail = 0, missWhole = 0, missKnown = 0, nAtoms = 0, missSlice = 0, missMeans = 0
  const holes = []
  for (const t of turns || []) {
    const units = splitRowUnits(t)
    const groups = units.length > 1 ? partitionAtomMap(t.atom_map, units.map((u) => u.targetText)) : [t.atom_map || []]
    if (units.length > 1 && !groups) { partitionFail++; holes.push(`S${t.global_order}: PARTITION FAIL (${units.length} sentences)`); continue }
    units.forEach((u, i) => {
      nIntentions++
      if (!u.targetAudioId) { missWhole++; holes.push(`S${t.global_order}.${i}: no whole-take`) }
      if (!u.knownAudioId) missKnown++
      for (const e of (groups[i] || [])) {
        if (e.kind !== 'atom') continue
        nAtoms++
        if (!targetClipMap.get(normSurface(e.target_surface))) { missSlice++; holes.push(`S${t.global_order}.${i}: no [atom] slice "${e.target_surface}"`) }
        if (!glossMap.get(e.lego_key)) { missMeans++; holes.push(`S${t.global_order}.${i}: no means "${e.target_surface}" (${e.lego_key})`) }
      }
    })
  }
  const pct = (n, d) => d ? (100 * (d - n) / d).toFixed(1) + '%' : 'n/a'
  console.log(`\n${COURSE} pod-0 — per-intention 4-movement resolution`)
  console.log(`  turns: ${(turns || []).length}  intentions: ${nIntentions}  atoms(drillable): ${nAtoms}`)
  console.log(`  partition holds: ${(turns || []).length - partitionFail}/${(turns || []).length}  (${partitionFail} fail)`)
  console.log(`  whole-take: ${pct(missWhole, nIntentions)}  known: ${pct(missKnown, nIntentions)}  [atom] slice: ${pct(missSlice, nAtoms)}  means: ${pct(missMeans, nAtoms)}`)
  if (holes.length) { console.log(`\n  HOLES (${holes.length}):`); holes.slice(0, 30).forEach((h) => console.log('   · ' + h)); if (holes.length > 30) console.log(`   … +${holes.length - 30} more`) }
  else console.log(`\n  ✓ NO HOLES — every intention composes a complete breakdown.`)
  process.exit(holes.length ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
