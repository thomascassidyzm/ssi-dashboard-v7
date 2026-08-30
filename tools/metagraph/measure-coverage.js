#!/usr/bin/env node
/**
 * Measure shape coverage for the canonical pods, from the command line.
 * Read-only: it reads `canonical_pod_scenarios` and writes nothing.
 *   node tools/metagraph/measure-coverage.js [slug ...]
 */
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { graphFromStore } from '../../src/lib/metagraph/fromStore.js'
import { parseMethodPod } from '../../src/lib/metagraph/parseMethodPod.js'
import { walkFromCanonicalRows, walkFromFlow } from '../../src/lib/metagraph/walk.js'
import { computeCoverage } from '../../src/lib/metagraph/coverage.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(import.meta.url)
// The dashboard checkout carries the credentials; this worktree may not.
const envDir = process.env.SSI_ENV_DIR || root
require('dotenv').config({ path: path.join(envDir, '.env'), quiet: true })

const j = f => JSON.parse(fs.readFileSync(path.join(root, 'services/shared/metagraph', f), 'utf8'))
const graph = graphFromStore({
  nodes: j('nodes.json'),
  edges: j('edges.json'),
  moves: j('moves.json'),
  outcomeShapes: j('outcome-shapes.json'),
  walkSets: { 'pod-0': j('walks/pod-0.json') }
})

function report (title, cov) {
  console.log(`\n══ ${title}`)
  const t = cov.totals
  console.log(`   ${t.steps} lines in ${t.scenes} scenes — ${t.mapped} mapped, ${t.codas} codas, ${t.alternatives} alternatives, ${t.unmapped} UNMAPPED`)
  console.log(`   shapes: ${t.traversed}/${t.nodes} traversed, ${t.hitTwice} hit twice or more, ${t.neverReached} NEVER REACHED`)
  console.log(`   traversed : ${cov.traversed.map(n => `${n.id}×${n.traversals}`).join(' ') || '—'}`)
  console.log(`   never     : ${cov.neverReached.map(n => `${n.id} ${n.title}`).join(' · ') || '—'}`)
  console.log(`   outcomes  : ${t.outcomesDelivered} delivered, ${t.outcomesMissing} missing — ${cov.outcomes.filter(o => !o.delivered).map(o => o.id).join(' ')}`)
  const never = cov.survivability.filter(s => s.exercised && s.recoveryRank === 0)
  console.log(`   survivability: ${cov.survivability.filter(s => s.exercised).length}/${cov.survivability.length} edges exercised; ${never.length} with NO attested recovery (${never.map(s => s.id).join(' ') || '—'})`)
}

const slugs = process.argv.slice(2).filter(a => !a.startsWith('-'))
const podSlugs = slugs.length ? slugs : ['pod-0']

const sb = require(path.join(root, 'services/supabase-client.cjs'))
const client = sb.getClient()
for (const slug of podSlugs) {
  let rows = []; let from = 0
  while (true) {
    const { data, error } = await client.from('canonical_pod_scenarios')
      .select('id, scene_number, scene_label, scene_title, scene_subtitle, sentence_number, global_order, speaker, english_text, author_notes')
      .eq('pod_slug', slug).order('global_order', { ascending: true }).range(from, from + 999)
    if (error) throw new Error(error.message)
    rows = rows.concat(data); if (data.length < 1000) break; from += 1000
  }
  const walk = walkFromCanonicalRows(rows, graph, { id: slug, title: slug, slug })
  report(`${slug} (canonical_pod_scenarios)`, computeCoverage(graph, walk))
}

const method = parseMethodPod(fs.readFileSync(path.join(root, 'docs/pods/method-pod-re-cut-2026-08-30.md'), 'utf8'))
report('the Method Pod (re-cut, markdown)', computeCoverage(graph, walkFromFlow(method, graph)))
console.log()
