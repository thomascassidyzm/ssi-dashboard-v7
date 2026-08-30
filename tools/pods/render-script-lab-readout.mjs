/**
 * The Script Lab's read-out, rendered headlessly.
 *
 * It fetches from the SAME endpoint the page fetches (`GET /api/admin/canonical-
 * pods/:slug`) and runs the SAME modules the page runs (`fromStore.js`,
 * `walk.js`, `coverage.js`), then prints the strings the template puts on screen.
 * It exists because this box has no browser that will launch (chromium is missing
 * libnspr4 and there is no passwordless sudo), so a screenshot is not available —
 * this is the honest equivalent artefact, and it is closer to the data than a PNG.
 *
 *   API=http://localhost:3491 JWT=<admin jwt> node tools/pods/render-script-lab-readout.mjs <slug…>
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { graphFromStore } from '../../src/lib/metagraph/fromStore.js'
import { walkFromStoredPod, walkFromCanonicalRows } from '../../src/lib/metagraph/walk.js'
import { computeCoverage } from '../../src/lib/metagraph/coverage.js'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const j = f => JSON.parse(fs.readFileSync(path.join(REPO, 'services/shared/metagraph', f), 'utf8'))
const graph = graphFromStore({
  nodes: j('nodes.json'), edges: j('edges.json'), moves: j('moves.json'),
  outcomeShapes: j('outcome-shapes.json'), walkSets: { 'pod-0': j('walks/pod-0.json') }
})

const API = process.env.API || 'http://localhost:3491'
const JWT = process.env.JWT || ''
const slugs = process.argv.slice(2)
const SHOW = Number(process.env.SHOW_SCENE || 1)

for (const slug of slugs) {
  const r = await fetch(`${API}/api/admin/canonical-pods/${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${JWT}` } })
  const b = await r.json()
  if (!r.ok) { console.log(`\n═══ ${slug}: ${b.error}`); continue }
  const walk = (b.walk || []).length
    ? walkFromStoredPod(b.scenarios, b.walk, graph, { id: slug, slug })
    : walkFromCanonicalRows(b.scenarios, graph, { id: slug, slug })
  const c = computeCoverage(graph, walk)
  const byReg = {}
  for (const d of walk.unresolved || []) byReg[d.register] = (byReg[d.register] || 0) + 1

  console.log(`\n${'═'.repeat(78)}\n  /canonical/scripts/${slug}\n${'═'.repeat(78)}`)
  console.log(`  Coverage — this script as a walk over the graph`)
  console.log(`    ${c.totals.traversed}/${c.totals.nodes} shapes traversed   ${c.totals.hitTwice} hit twice or more   ${c.totals.neverReached} never reached`)
  console.log(`  Never reached — the deficit list`)
  for (const n of c.neverReached) console.log(`    ${n.id.padEnd(4)} ${n.title}`)
  console.log(`  Outcome shapes — ${c.totals.outcomesDelivered} delivered, ${c.totals.outcomesMissing} missing`)
  for (const o of c.outcomes) console.log(`    ${o.delivered ? '✓' : '·'} ${o.id} ${o.name}`)
  console.log(`  ${c.totals.steps} lines · ${c.totals.mapped} mapped to a shape · ${c.totals.unmapped} UNMAPPED`)
  if ((walk.declarations || []).length) {
    console.log(`  Shape declarations: ${walk.declarations.length} declared · ${walk.declarations.length - walk.unresolved.length} resolved against the store · ${walk.unresolved.length} UNRESOLVED (${Object.entries(byReg).map(([k, v]) => `${v} ${k}`).join(', ')})`)
  }
  const scene = walk.scenes.find(s => s.number === SHOW) || walk.scenes[0]
  if (!scene) continue
  const shapes = [...new Set(scene.steps.flatMap(s => s.nodeIds || []))]
  const unres = (scene.declarations || []).filter(d => d.resolution === 'unresolved').map(d => d.declared_as)
  console.log(`\n  ── ${scene.label} · ${scene.title}${scene.subtitle ? ' — ' + scene.subtitle : ''}`)
  console.log(`     shapes: ${shapes.join(' ') || 'no shape'}`)
  if (unres.length) console.log(`     declared, unresolved: ${unres.join(' · ')}`)
  for (const s of scene.steps.slice(0, 8)) {
    console.log(`     ${(s.nodeId || (s.kind === 'unmapped' ? 'UNMAPPED' : '')).padEnd(9)} ${String(s.payload.speaker).padEnd(5)} ${String(s.payload.text).slice(0, 92)}`)
    if (s.payload.target) console.log(`     ${' '.repeat(9)} ${' '.repeat(5)} ${s.payload.target.slice(0, 92)}   [${s.payload.targetLang}]`)
  }
  if (scene.steps.length > 8) console.log(`     … ${scene.steps.length - 8} more lines in this ${scene.label.split(' ')[0].toLowerCase()}`)
}
