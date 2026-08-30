#!/usr/bin/env node
/**
 * The importer's own cheap test. Single process, no suite, no DB.
 *   node tools/pods/parse-pod-markdown.test.cjs
 *
 * The strongest available check is that the parse agrees with the DOCUMENTS' OWN
 * measured turn counts (learning §12a/§12b, chapters §4b, full §5b), which were
 * computed independently of this code. If a table format changes under us, these
 * three numbers move and the test fails.
 */
const fs = require('fs')
const path = require('path')
const { parsePod, declaredShapes } = require('./parse-pod-markdown.cjs')

const REPO = path.resolve(__dirname, '../..')
const p = f => JSON.parse(fs.readFileSync(path.join(REPO, 'services/shared/metagraph', f), 'utf8'))
const n = p('nodes.json'), m = p('moves.json'), o = p('outcome-shapes.json')
const store = {
  nodeIds: new Set([...(n.nodes || []), ...(n.bound_pairs || [])].map(x => x.id)),
  moveIds: new Set((m.moves || []).map(x => x.id)),
  outcomeIds: new Set((o.outcome_shapes || []).map(x => x.id))
}

let fails = 0
const ok = (cond, msg) => { console.log(`${cond ? '  ok  ' : ' FAIL '} ${msg}`); if (!cond) fails++ }
const eq = (a, b, msg) => ok(a === b, `${msg} (got ${a}, want ${b})`)

const CASES = [
  { slug: 'learning-flagship',    file: 'docs/pods/learning-flagship-pod-2026-08-30.md', unit: 'Chapter', lang: null,  turns: 367, sections: 11 },
  { slug: 'method-pod-chapters',  file: 'docs/pods/method-pod-chapters-2026-08-30.md',   unit: 'Chapter', lang: 'ita', turns: 309, sections: 12 },
  { slug: 'method-pod-43-scene',  file: 'docs/pods/method-pod-full-2026-08-30.md',       unit: 'Scene',   lang: 'ita', turns: 276, sections: 43 }
]

const parsed = {}
for (const c of CASES) {
  const md = fs.readFileSync(path.join(REPO, c.file), 'utf8')
  const r = parsePod(md, { slug: c.slug, unit: c.unit, targetLang: c.lang, store })
  parsed[c.slug] = r
  console.log(`\n${c.slug}`)
  eq(r.scenarios.length, c.turns, 'turns match the document’s own measured total')
  eq(new Set(r.scenarios.map(x => x.scene_number)).size, c.sections, `${c.unit.toLowerCase()}s`)
  ok(r.scenarios.every(x => x.global_order > 0), 'every row has a global_order')
  ok(new Set(r.scenarios.map(x => x.id)).size === r.scenarios.length, 'ids are unique')
  ok(r.scenarios.every(x => /^(TOM|ARAN)$/.test(x.speaker)), 'every row has a known speaker')
  ok(r.scenarios.every(x => x.english_text && !x.english_text.startsWith('|')), 'english_text is a line, not a table row')
  if (c.lang) ok(r.scenarios.some(x => x.target_text), 'the Italian specimen is carried')
  else ok(r.scenarios.every(x => !x.target_text), 'English-only pod carries no target text')
  // A walk is node references: no step carries dialogue text.
  ok(r.steps.every(s => !('text' in s) && !('surface' in s)), 'no walk step carries text — node references only')
  ok(r.steps.every(s => s.resolution !== 'unresolved' || s.node_id === null), 'unresolved steps hold no node id')
  ok(r.steps.every(s => s.node_id === null || store.nodeIds.has(s.node_id) || store.outcomeIds.has(s.node_id) || store.moveIds.has(s.node_id)),
    'every resolved node id exists in the store')
  ok(r.steps.every(s => s.scenario_id === null || r.scenarios.some(x => x.id === s.scenario_id)), 'walk steps hang off a real scenario row')
}

console.log('\nregisters')
// The m register is the control arm's own numbering and MUST NOT resolve.
const allSteps = Object.values(parsed).flatMap(r => r.steps)
ok(allSteps.filter(s => /^m\d+$/.test(s.declared_as)).every(s => s.resolution === 'unresolved' && s.register === 'corpus-move-m'),
  'm1–m23 are recorded UNRESOLVED, never crosswalked to the store’s F register')
ok(allSteps.some(s => s.register === 'summit-shape' && s.resolution === 'unresolved'),
  'the eight summit shapes are recorded UNRESOLVED, never aliased')
ok(allSteps.some(s => s.resolution === 'id' && s.register === 'node'), 'N ids resolve')
ok(allSteps.some(s => s.resolution === 'id' && s.register === 'outcome'), 'O ids resolve')

console.log('\ndeclaredShapes')
eq(declaredShapes('**Shapes traversed:** N1 open · m2, three times · **the specimen** · **planted for Chapter 9:** a phrase.').length, 3,
  'a "planted for" segment is a long-arc plant, not a shape')
eq(declaredShapes('**Shape witnessed:** JOINT CONSTRUCTION — one speaker leaves a clause open, the other closes it.', 'witnessed').length, 1,
  'a witnessed line declares one shape, not one per clause of its definition')

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
