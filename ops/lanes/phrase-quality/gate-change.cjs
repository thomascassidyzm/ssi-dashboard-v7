#!/usr/bin/env node
// THE GATE STEP of the phrase-quality lane (Tom 2026-10-11 20:54/20:55/20:57).
// Input: the AGREED lines of one window — phrases BOTH models judged bad, each with the replacement
// both agreed (or none). For each: the replacement goes through the strict Popty course-builder gate
// (tools/phrase-gate/gate-check.cjs → checkPhraseSet, the replay of /api/seed/complete: ZUT, allowed
// vocab only, must contain the LEGO, known side, bare-LEGO, BUILD/USE floors, recombination). Pass →
// REPLACE. Fail or no agreed replacement → DELETE, unless that would leave the LEGO with fewer than 4
// USE phrases → KEEP. Only BUILD/USE practice phrases; seeds and LEGOs are never touched.
// READ-ONLY: it writes a decisions file; apply-staged.cjs is the only writer.
// Usage: node ops/lanes/phrase-quality/gate-change.cjs <course> <agreed.jsonl> <decisions.jsonl>
'use strict'
const fs = require('fs')
const { USE_FLOOR } = require('./lib.cjs')

// Gates that judge each phrase on its own: a replacement must pass them by itself.
const PHRASE_GATES = ['bareLego', 'containment', 'vocab', 'zut', 'knownSide']
// Gates that judge the LEGO's whole set: a change must not turn one of them from pass to fail.
const SET_GATES = ['buildUseFloors', 'buildRecombination', 'separableContrast', 'buildCountSpec']
const failed = (r, g) => r && r.gates && r.gates[g] && r.gates[g].pass === false

// judgeReplacement(entryBase, before[], rowId, after{known,target}, checkPhraseSet, ctx)
//   → {pass, phraseFails:[], setRegressions:[]}
async function judgeReplacement(entryBase, before, rowId, after, checkPhraseSet, ctx) {
  const row = before.find((p) => p.id === rowId)
  const next = { role: row.role, known: after.known ?? row.known, target: after.target ?? row.target }
  const alone = await checkPhraseSet({ ...entryBase, phrases: [next] }, ctx)
  const phraseFails = PHRASE_GATES.filter((g) => failed(alone, g))
  const pre = await checkPhraseSet({ ...entryBase, phrases: before.map(({ role, known, target }) => ({ role, known, target })) }, ctx)
  const post = await checkPhraseSet({ ...entryBase, phrases: before.map((p) => (p.id === rowId ? next : { role: p.role, known: p.known, target: p.target })) }, ctx)
  const setRegressions = SET_GATES.filter((g) => !failed(pre, g) && failed(post, g))
  return { pass: !phraseFails.length && !setRegressions.length, phraseFails, setRegressions, detail: { alone: pick(alone), post: pick(post) } }
}
const pick = (r) => Object.fromEntries(Object.entries((r && r.gates) || {}).filter(([, v]) => v && v.pass === false))

// plan(changes, sets, judge) — pure. sets: Map legoKey → {entryBase, phrases:[{id,role,known,target}]}.
// Deletions within one LEGO are counted against the floor together, in input order.
async function plan(changes, sets, judge) {
  const out = []
  const useLeft = new Map([...sets].map(([k, s]) => [k, s.phrases.filter((p) => p.role === 'use').length]))
  for (const c of changes) {
    const key = `${c.seed_number}:${c.lego_index}`
    const set = sets.get(key)
    const row = set && set.phrases.find((p) => p.id === c.row_id)
    if (!row || !['build', 'use'].includes(row.role)) { out.push({ ...c, decision: 'skip', why: row ? `role ${row.role} is not a BUILD/USE practice phrase` : 'row not found in its LEGO' }); continue }
    if (c.before && (c.before.known !== row.known || c.before.target !== row.target)) { out.push({ ...c, decision: 'skip', why: 'row changed since the models read it' }); continue }
    let gate = null
    if (c.after && (c.after.known || c.after.target)) {
      gate = await judge(set.entryBase, set.phrases, row.id, c.after)
      if (gate.pass) { out.push({ ...c, role: row.role, decision: 'replace', gate }); continue }
    }
    const left = useLeft.get(key)
    if (row.role === 'use' && left - 1 < USE_FLOOR) { out.push({ ...c, role: row.role, decision: 'keep', why: `deleting would leave ${left - 1} USE phrases, under the floor of ${USE_FLOOR}`, gate }); continue }
    if (row.role === 'use') useLeft.set(key, left - 1)
    out.push({ ...c, role: row.role, decision: 'delete', why: gate ? 'agreed replacement failed the gate' : 'no agreed replacement', gate })
  }
  return out
}

// The LEGO sets a window's changes touch, read live.
async function loadSets(course, changes) {
  const { client } = require('./lib.cjs')
  const sets = new Map()
  for (const key of new Set(changes.map((c) => `${c.seed_number}:${c.lego_index}`))) {
    const [seed, idx] = key.split(':').map(Number)
    const { data: lego, error: le } = await client().from('course_legos').select('lego_id,known_text,target_text,components').eq('course_code', course).eq('seed_number', seed).eq('lego_index', idx).maybeSingle()
    if (le || !lego) continue
    const { data: ph, error: pe } = await client().from('course_practice_phrases').select('id,phrase_role,known_text,target_text').eq('course_code', course).eq('seed_number', seed).eq('lego_index', idx).in('phrase_role', ['build', 'use'])
    if (pe) throw new Error(pe.message)
    sets.set(key, {
      entryBase: { courseCode: course, seedNumber: seed, legoIndex: idx, legoId: lego.lego_id, legoKnown: lego.known_text, legoTarget: lego.target_text, components: lego.components },
      phrases: ph.map((p) => ({ id: p.id, role: p.phrase_role, known: p.known_text, target: p.target_text })),
    })
  }
  return sets
}

async function main() {
  const [course, agreedPath, outPath] = process.argv.slice(2)
  if (!course || !agreedPath || !outPath) { console.error('usage: gate-change.cjs <course> <agreed.jsonl> <decisions.jsonl>'); process.exit(2) }
  const { makeCourseCtx, checkPhraseSet } = require('../../../tools/phrase-gate/gate-check.cjs')
  const { client } = require('./lib.cjs')
  const changes = fs.readFileSync(agreedPath, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
  const ctx = makeCourseCtx(client(), course)
  const sets = await loadSets(course, changes)
  const judge = (entryBase, phrases, rowId, after) => judgeReplacement(entryBase, phrases, rowId, after, checkPhraseSet, ctx)
  const decisions = await plan(changes, sets, judge)
  fs.writeFileSync(outPath, decisions.map((d) => JSON.stringify(d)).join('\n') + (decisions.length ? '\n' : ''))
  const n = (k) => decisions.filter((d) => d.decision === k).length
  console.error(`${course}: ${n('replace')} replace, ${n('delete')} delete, ${n('keep')} kept at the floor, ${n('skip')} skipped → ${outPath}`)
}
if (require.main === module) main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1) })
module.exports = { plan, judgeReplacement, loadSets, PHRASE_GATES, SET_GATES }
