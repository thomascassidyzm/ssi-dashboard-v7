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
import { walkFromCanonicalRows, walkFromStoredPod } from '../../src/lib/metagraph/walk.js'
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
  walkSets: { 'pod-1': j('walks/pod-1.json') }
})

function report (title, cov) {
  console.log(`\n══ ${title}`)
  const t = cov.totals
  console.log(`   ${t.steps} lines in ${t.scenes} scenes — ${t.mapped} mapped (${t.branches} on a branch), ${t.codas} codas, ${t.alternatives} surface variants, ${t.unmapped} UNMAPPED`)
  console.log(`   shapes: ${t.traversed}/${t.nodes} traversed, ${t.hitTwice} hit twice or more, ${t.neverReached} NEVER REACHED`)
  console.log(`   traversed : ${cov.traversed.map(n => `${n.id}×${n.traversals}`).join(' ') || '—'}`)
  console.log(`   never     : ${cov.neverReached.map(n => `${n.id} ${n.title}`).join(' · ') || '—'}`)
  console.log(`   outcomes  : ${t.outcomesDelivered} delivered, ${t.outcomesMissing} missing — ${cov.outcomes.filter(o => !o.delivered).map(o => o.id).join(' ')}`)
  const never = cov.survivability.filter(s => s.exercised && s.recoveryRank === 0)
  console.log(`   survivability: ${cov.survivability.filter(s => s.exercised).length}/${cov.survivability.length} edges exercised; ${never.length} with NO attested recovery (${never.map(s => s.id).join(' ') || '—'})`)
}

// The Method Pod used to be read here out of `method-pod-re-cut-2026-08-30.md`
// by a markdown parser. Its sixteen ratified scenes are scenes 1-16 of
// `method-pod-43-scene` in the store now, so it is read from the store like the
// rest — one home for the pods, no runtime markdown.
const slugs = process.argv.slice(2).filter(a => !a.startsWith('-'))
const podSlugs = slugs.length ? slugs : ['pod-1', 'method-pod-43-scene']

const sb = require(path.join(root, 'services/supabase-client.cjs'))
const client = sb.getClient()
async function all (table, slug, select) {
  let rows = []; let from = 0
  while (true) {
    const { data, error } = await client.from(table).select(select)
      .eq('pod_slug', slug).order(table === 'canonical_pod_scenarios' ? 'global_order' : 'step_order', { ascending: true })
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows = rows.concat(data); if (data.length < 1000) break; from += 1000
  }
  return rows
}
for (const slug of podSlugs) {
  const rows = await all('canonical_pod_scenarios', slug,
    'id, scene_number, scene_label, scene_title, scene_subtitle, sentence_number, global_order, speaker, english_text, target_text, target_lang, author_notes')
  const steps = await all('canonical_pod_walk_steps', slug,
    'pod_slug, walk_id, walk_name, scene_number, step_order, declared_as, register, resolution, node_id, note')
  // A pod that carries a stored walk is read through it; pod-1 carries none and
  // keeps the row-reference path the graph's g-numbers are written in.
  const walk = steps.length
    ? walkFromStoredPod(rows, steps, graph, { id: slug, title: slug, slug })
    : walkFromCanonicalRows(rows, graph, { id: slug, title: slug, slug })
  report(`${slug} (canonical_pod_scenarios${steps.length ? ' + stored walk' : ''})`, computeCoverage(graph, walk))
}
console.log()
