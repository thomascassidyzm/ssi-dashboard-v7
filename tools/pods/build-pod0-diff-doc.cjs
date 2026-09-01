#!/usr/bin/env node
/**
 * build-pod0-diff-doc.cjs — the three-way diff as something a person can read on a
 * phone: scene headings, per-scene counts, the SURVIVES and NEW buckets called out.
 * The machine-readable form stays in the alignment archive JSON.
 */
'use strict'
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { diffPod } = require('./pod0-recording-diff.cjs')

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ARCHIVE = path.join(__dirname, '..', '..', 'docs', 'pods', 'pod0-welsh-prealign-archive-2026-08-06')
const OUT = path.join(__dirname, '..', '..', 'docs', 'pods', 'pod0-welsh-recording-diff-2026-08-06.md')
const COURSES = [
  { code: 'cym_n_for_eng', label: 'Northern Welsh' },
  { code: 'cym_s_for_eng', label: 'Southern Welsh' },
]

;(async () => {
  const { data: canonRaw } = await db.from('canonical_pod_scenarios')
    .select('*').eq('pod_slug', 'pod-1').order('global_order')  // canonical slate, renamed from 'pod-0' 2026-09-01
  const canon = canonRaw.map(r => ({ ...r, english_text: r.english_text.replace(/\[target language\]/gi, 'Welsh') }))

  const L = []
  L.push('# Welsh pod-0 — what changed under the recording')
  L.push('')
  L.push("Aran's new pod-0 canonical is 231 sentences in 22 scenes. The Welsh recording")
  L.push('queue was still serving the old 142. This is the line-by-line comparison of the two,')
  L.push('per Welsh course, taken from the database rather than from any document.')
  L.push('')
  L.push('The short version: **the great majority of the old English survives word for word,')
  L.push('so the Welsh already recorded against it stays valid.** The work is almost all new')
  L.push('material, not rework.')
  L.push('')

  for (const c of COURSES) {
    const served = JSON.parse(fs.readFileSync(path.join(ARCHIVE, `${c.code}-pod0-sentences-prealign.json`), 'utf8')).sentences
    const d = diffPod(served, canon)
    L.push(`## ${c.label} — \`${c.code}\``)
    L.push('')
    L.push(`| | lines |`)
    L.push(`|---|---|`)
    L.push(`| **Survives unchanged** — no re-recording | **${d.buckets.survives_unchanged}** |`)
    L.push(`| Reworded — needs a fresh take | ${d.buckets.reworded} |`)
    L.push(`| Brand new — needs Welsh written, then recorded | ${d.buckets.new} |`)
    L.push(`| Gone from the canonical | ${d.buckets.stale} |`)
    L.push(`| Canonical total | ${d.canonical_total} |`)
    L.push('')
    L.push(`Of the ${d.buckets.reworded} reworded, ${d.reworded_subtypes.numerals_only} changed only in how a number is written ("One. Two." became "1. 2."), so the **Welsh is untouched and only the English guide line needs a fresh take**. The other ${d.reworded_subtypes.wording + d.reworded_subtypes.placeholder} are genuine rewordings.`)
    L.push('')
    L.push(`Welsh takes already recorded: **${d.takes.existing_target}**, of which **${d.takes.target_still_valid} stay valid** and ${d.takes.target_invalidated} are attached to a line whose English changed. English guide takes: ${d.takes.existing_known}, of which ${d.takes.known_still_valid} stay valid. **No recording has been deleted.**`)
    L.push('')
    L.push(`${d.survivors_moved_position} surviving lines moved position in the renumbering. Moving is not re-recording — those takes are still good.`)
    L.push('')

    // per-scene, in NEW canonical order
    const byScene = new Map()
    for (const s of d.detail.survives) push(byScene, s.canon.scene_number, 'survives', s.canon)
    for (const r of d.detail.reworded) push(byScene, r.canon.scene_number, r.subtype === 'numerals_only' ? 'numerals' : 'reworded', r.canon)
    for (const n of d.detail.brandNew) push(byScene, n.scene_number, 'new', n)
    L.push('### Scene by scene, in the new numbering')
    L.push('')
    for (const n of [...byScene.keys()].sort((a, b) => a - b)) {
      const s = byScene.get(n)
      const title = canon.find(r => r.scene_number === n).scene_title || `Scene ${n}`
      const total = s.survives.length + s.reworded.length + s.numerals.length + s.new.length
      const bits = []
      if (s.survives.length) bits.push(`${s.survives.length} unchanged`)
      if (s.numerals.length) bits.push(`${s.numerals.length} numerals-only`)
      if (s.reworded.length) bits.push(`${s.reworded.length} reworded`)
      if (s.new.length) bits.push(`${s.new.length} new`)
      L.push(`**Scene ${n} — ${title}** · ${total} lines · ${bits.join(', ')}`)
      L.push('')
      if (s.new.length && s.new.length === total) {
        L.push('  Entirely new scene.')
        L.push('')
      } else if (s.new.length) {
        for (const r of s.new) L.push(`  - NEW: ${r.english_text}`)
        L.push('')
      }
    }
    if (d.detail.stale.length) {
      L.push('### Gone from the canonical')
      L.push('')
      for (const r of d.detail.stale) L.push(`- Scene ${r.scene_number}, line ${r.sentence_number}: *${r.known_text}*`)
      L.push('')
    }
  }
  fs.writeFileSync(OUT, L.join('\n'))
  console.log(OUT)

  function push(m, scene, bucket, row) {
    if (!m.has(scene)) m.set(scene, { survives: [], reworded: [], numerals: [], new: [] })
    m.get(scene)[bucket].push(row)
  }
})().catch(e => { console.error(e); process.exit(1) })
