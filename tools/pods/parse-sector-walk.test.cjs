#!/usr/bin/env node
/**
 * The sector-walk importer's own cheap test. Single process, no suite, no DB.
 *   node tools/pods/parse-sector-walk.test.cjs
 *
 * Matches parse-pod-markdown.test.cjs: the strongest available check is that the
 * parse agrees with figures computed independently of this code. Health, retail and
 * trades each have a published scenes/flows/turns count; the corpora each have a raw
 * ⚠-bullet count a grep can confirm. If a corpus or this parser moves, these fail.
 *
 * Hospitality has NO second source. Its numbers are asserted against what this
 * parser measured on 2026-09-01, and that is a REGRESSION pin, not a verification —
 * it catches drift, it does not prove correctness. Labelled as such below.
 */
const fs = require('fs')
const path = require('path')
const { parseSectorWalk, splitHeading, flowKey, declaredIds } = require('./parse-sector-walk.cjs')

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
  { slug: 'health',      file: 'docs/sector-pods/source/health-sector-conversations-v3.md',        scenes: 23, flows: 73, turns: 438, warn: 14, source: 'the corpus header: 23 contexts, 73 flows, 438 turns' },
  { slug: 'retail',      file: 'docs/sector-pods/source/retail-walk-conversations-2026-09-01.md',  scenes: 25, flows: 55, turns: 330, warn: 8,  source: "retail-walk-report §5's speaker table, which sums to 330" },
  { slug: 'trades',      file: 'docs/sector-pods/source/trades-conversations-v1.md',               scenes: 23, flows: 69, turns: 414, warn: 20, source: 'the corpus accounting section: 23 scenes, 69 flows, 414 turns' },
  { slug: 'hospitality', file: 'docs/sector-pods/source/hospitality-conversations-v1.md',          scenes: 21, flows: 55, turns: 330, warn: 15, source: 'REGRESSION PIN ONLY — no second source exists' }
]

const parsed = {}
for (const c of CASES) {
  const full = path.join(REPO, c.file)
  if (!fs.existsSync(full)) { console.log(` SKIP  ${c.slug} — corpus not in this checkout: ${c.file}`); continue }
  const r = parseSectorWalk(fs.readFileSync(full, 'utf8'), { slug: c.slug, store })
  parsed[c.slug] = r
  console.log(`\n${c.slug} — against ${c.source}`)
  eq(r.stats.scenes, c.scenes, 'scenes')
  eq(r.stats.flows, c.flows, 'flows')
  eq(r.stats.turns, c.turns, 'turns')
  eq(r.scenarios.filter(s => /⚠ safety-critical line/.test(s.author_notes || '')).length, c.warn,
    'turns flagged ⚠ match a raw grep of the corpus')
  ok(r.stats.keyCollisions.length === 0, 'no two flows in a scene derive the same variant_key')
  ok(new Set(r.scenarios.map(s => s.id)).size === r.scenarios.length, 'row ids are unique')
  ok(new Set(r.scenarios.map(s => `${s.scene_number}|${s.sentence_number}|${s.variant_key}`)).size === r.scenarios.length,
    'the (scene, sentence, variant) unique constraint holds')
  ok(new Set(r.scenarios.map(s => s.global_order)).size === r.scenarios.length, 'global_order is unique')
  eq(r.scenarios[r.scenarios.length - 1].global_order, r.scenarios.length, 'global_order is 1..N with no gaps')
  ok(r.scenarios.every(s => s.target_text === null && s.target_lang === null),
    'no target side — these corpora are the canonical English known side only')
  ok(r.scenarios.every(s => s.sentence_number >= 1 && s.scene_number >= 1), 'numbering is 1-based')
  ok(r.scenarios.every(s => !/^["“]/.test(s.english_text) || /\*/.test(s.english_text)),
    'wrapping quotes are stripped; a line opening on a stage direction keeps its own')
  ok(r.steps.every(s => s.node_id ? store.nodeIds.has(s.node_id) || store.moveIds.has(s.node_id) || store.outcomeIds.has(s.node_id) : true),
    'every resolved walk step names an id the store actually holds')
  console.log(`        ${r.steps.length} walk steps; ${r.stats.scenesWithoutDeclaration}/${r.stats.scenes} scenes declare no shape (none invented)`)
}

// The defining rule, on its own terms rather than on a corpus's.
console.log('\nthe defining rule')
const DOC = `# Doc title
## A subtitle with no flows under it
Some prose.

# Part 1 — the real thing
## Scene 1 — The call-out
*Walks:* N1 open · F21 the solicit; N999 [proposed]
*Branch set:* a / b / c
### Flow 1 *(happy path)*
- **T:** "One."
- **C:** ⚠ "Two."
### Flow 2 *(a flow with no turns at all)*

# Accounting
## The shape of the corpus
### A heading that is not a flow
- a bullet that is not a turn
`
const t = parseSectorWalk(DOC, { slug: 'demo', store })
eq(t.stats.sectionsSeen, 3, 'three ## sections seen')
eq(t.stats.scenes, 1, 'only the one holding a flow with a turn is a scene')
eq(t.stats.flows, 1, 'the turn-less flow is not a flow')
eq(t.stats.turns, 2, 'two turns')
eq(t.scenarios[0].id, 'demo:SC01-F01-S01', 'the id carries scene, flow and sentence')
eq(t.scenarios[0].scene_label, 'Scene 1', 'scene_label is the authored label')
eq(t.scenarios[0].scene_title, 'The call-out', 'scene_title is the heading title')
eq(t.scenarios[0].scene_subtitle, null, 'no italic tag, no subtitle')
eq(t.scenarios[0].variant_key, 'flow-01', 'a flow is a variant_key')
eq(t.scenarios[0].author_notes, 'Part 1 — the real thing · flow: happy path', 'group and flow tag land in author_notes')
ok(/⚠ safety-critical line/.test(t.scenarios[1].author_notes), 'the ⚠ flag lands in author_notes')
eq(t.scenarios[1].english_text, 'Two.', 'a marker ⚠ outside the quotes is stripped from the text')
eq(t.steps.length, 3, '*Walks:* declares three ids; *Branch set:* declares none')
eq(t.steps.filter(s => s.resolution === 'unresolved').length, 1, 'N999 stays unresolved rather than being aliased')

console.log('\nheadings and keys')
eq(splitHeading('R0. The contract at the counter *(prologue — re-instantiates CORE)*').label, 'R0.', 'R0. label')
eq(splitHeading('R0. The contract at the counter *(prologue — re-instantiates CORE)*').subtitle, 'prologue — re-instantiates CORE', 'italic tag is the subtitle')
eq(splitHeading('1.0 Linguistic situation opener (guest-facing)').label, '1.0', 'a dotted label')
eq(splitHeading('1.0 Linguistic situation opener (guest-facing)').title, 'Linguistic situation opener (guest-facing)', 'a bare parenthetical stays in the title')
eq(splitHeading('Scene 1 — The call-out').label, 'Scene 1', 'a Scene label')
eq(flowKey('Flow 1'), 'flow-01', 'Flow 1')
eq(flowKey('Welsh version - flow 1'), 'welsh-flow-01', 'health’s Welsh arm')
eq(flowKey('English version - flow 2'), 'english-flow-02', 'health’s English arm')
eq(declaredIds('E3 — admits F302, N109 [health, proposed]; survivability S703, under K4, walk W1201').join(','),
  'F302,N109', 'only the store’s own N/P/O/F registers are read as declarations')

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
