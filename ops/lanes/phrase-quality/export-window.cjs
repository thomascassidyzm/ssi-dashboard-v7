#!/usr/bin/env node
// READ-ONLY export of one queue window for review: the seeds, their LEGOs, every phrase row
// (component rows included, marked), and the course-wide ZUT collisions that touch the window —
// the same known (normalised) mapping to a different target anywhere in the course, on LEGO /
// BUILD / USE rows only (component rows are exempt on the known side, Tom 2026-07-04).
// Usage: node ops/lanes/phrase-quality/export-window.cjs <course> <from> <to> > window.json
'use strict'
const { select, norm } = require('./lib.cjs')
const [course, from, to] = process.argv.slice(2)
if (!course || !from || !to) { console.error('usage: export-window.cjs <course> <from> <to>'); process.exit(2) }

;(async () => {
  const q = `course_code=eq.${course}`
  const seeds = await select('course_seeds', `select=seed_number,known_text,target_text,status&${q}&seed_number=gte.${from}&seed_number=lte.${to}&order=seed_number`)
  const legos = await select('course_legos', `select=seed_number,lego_index,lego_id,type,known_text,target_text,components&${q}&seed_number=gte.${from}&seed_number=lte.${to}&order=seed_number,lego_index`)
  const phrases = await select('course_practice_phrases', `select=id,seed_number,lego_index,position,phrase_role,known_text,target_text,status&${q}&seed_number=gte.${from}&seed_number=lte.${to}&order=seed_number,lego_index,position`)
  // course-wide map for ZUT, non-component rows only
  const allP = await select('course_practice_phrases', `select=id,seed_number,phrase_role,known_text,target_text&${q}&phrase_role=neq.component`)
  const allL = await select('course_legos', `select=lego_id,seed_number,known_text,target_text&${q}`)
  const byKnown = new Map()
  for (const r of [...allL.map((l) => ({ id: l.lego_id, seed_number: l.seed_number, role: 'lego', known_text: l.known_text, target_text: l.target_text })),
                   ...allP.map((p) => ({ id: p.id, seed_number: p.seed_number, role: p.phrase_role, known_text: p.known_text, target_text: p.target_text }))]) {
    const k = norm(r.known_text); if (!k) continue
    if (!byKnown.has(k)) byKnown.set(k, []); byKnown.get(k).push(r)
  }
  const zut = []
  for (const [k, rows] of byKnown) {
    if (!rows.some((r) => r.seed_number >= +from && r.seed_number <= +to)) continue
    const targets = new Set(rows.map((r) => norm(r.target_text)))
    if (targets.size > 1) zut.push({ known: k, rows: rows.map((r) => ({ id: r.id, role: r.role, seed: r.seed_number, target: r.target_text })) })
  }
  const legosBySeed = {}
  for (const l of legos) (legosBySeed[l.seed_number] ||= []).push(l)
  const phrasesByLego = {}
  for (const p of phrases) (phrasesByLego[`${p.seed_number}:${p.lego_index}`] ||= []).push(p)
  console.log(JSON.stringify({ course, from: +from, to: +to, exported: new Date().toISOString(),
    seeds: seeds.map((s) => ({ ...s, legos: (legosBySeed[s.seed_number] || []).map((l) => ({ ...l, phrases: phrasesByLego[`${l.seed_number}:${l.lego_index}`] || [] })) })),
    zutCollisions: zut }, null, 1))
})().catch((e) => { console.error(e.message); process.exit(1) })
