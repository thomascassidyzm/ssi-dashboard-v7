#!/usr/bin/env node
// READ-ONLY export of one queue window for review: the seeds, their LEGOs, every phrase row (component
// rows marked), and the course-wide ZUT groups touching the window, keyed by the course builder's own
// normalizeForZUT. Usage: node ops/lanes/phrase-quality/export-window.cjs <course> <from> <to> <out.json>
// (writes a FILE: the course-builder modules log to stdout on load, so stdout is not a clean channel)
'use strict'
const { selectAll, zutGroups } = require('./lib.cjs')
const [course, from, to, out] = process.argv.slice(2)
if (!course || !from || !to || !out) { console.error('usage: export-window.cjs <course> <from> <to> <out.json>'); process.exit(2) }

;(async () => {
  const win = (q) => q.eq('course_code', course).gte('seed_number', +from).lte('seed_number', +to)
  const seeds = await selectAll('course_seeds', 'seed_number,known_text,target_text,status', (q) => win(q).order('seed_number'))
  const legos = await selectAll('course_legos', 'seed_number,lego_index,lego_id,type,known_text,target_text,components', (q) => win(q).order('seed_number').order('lego_index'))
  const phrases = await selectAll('course_practice_phrases', 'id,seed_number,lego_index,position,phrase_role,known_text,target_text,status', (q) => win(q).order('seed_number').order('lego_index').order('position'))
  const allP = await selectAll('course_practice_phrases', 'id,seed_number,phrase_role,known_text,target_text', (q) => q.eq('course_code', course).neq('phrase_role', 'component'))
  const allL = await selectAll('course_legos', 'lego_id,seed_number,known_text,target_text', (q) => q.eq('course_code', course))
  const zut = zutGroups([...allL.map((l) => ({ id: l.lego_id, seed_number: l.seed_number, role: 'lego', known_text: l.known_text, target_text: l.target_text })),
    ...allP.map((p) => ({ id: p.id, seed_number: p.seed_number, role: p.phrase_role, known_text: p.known_text, target_text: p.target_text }))], course, +from, +to)
  const legosBySeed = {}, phrasesByLego = {}
  for (const l of legos) (legosBySeed[l.seed_number] ||= []).push(l)
  for (const p of phrases) (phrasesByLego[`${p.seed_number}:${p.lego_index}`] ||= []).push(p)
  require('fs').writeFileSync(out, JSON.stringify({ course, from: +from, to: +to, exported: new Date().toISOString(),
    seeds: seeds.map((s) => ({ ...s, legos: (legosBySeed[s.seed_number] || []).map((l) => ({ ...l, phrases: phrasesByLego[`${l.seed_number}:${l.lego_index}`] || [] })) })),
    zutCollisions: zut }, null, 1))
  console.error(`${seeds.length} seeds, ${phrases.length} phrase rows, ${zut.length} ZUT groups → ${out}`)
  process.exit(0)
})().catch((e) => { console.error(e.message); process.exit(1) })
