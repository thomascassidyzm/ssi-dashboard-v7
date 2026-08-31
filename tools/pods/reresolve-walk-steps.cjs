#!/usr/bin/env node
/**
 * reresolve-walk-steps — re-run declared-shape resolution over the stored walks.
 *
 * The 2026-08-31 ratification loaded the talk-bollocks shapes (N301–N306,
 * F301–F306), five method-pod mints (N902/3/7/8/9) and the m→store crosswalk
 * into the store. The walk steps in `canonical_pod_walk_steps` were resolved
 * against the PRE-ratification store, so their `resolution`/`node_id` columns
 * under-report what now resolves. This tool recomputes each step's resolution
 * from its own `declared_as` — the declaration itself is never touched — and
 * updates only the derived columns (node_id, register, resolution, note).
 *
 * Dialogue rows (`canonical_pod_scenarios`) are never read or written.
 *
 *   node tools/pods/reresolve-walk-steps.cjs             # dry run, writes a log
 *   node tools/pods/reresolve-walk-steps.cjs --execute
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { resolveShape } = require('./parse-pod-markdown.cjs')

const REPO = path.resolve(__dirname, '../..')
const EXECUTE = process.argv.includes('--execute')
const SLUGS = ['method-pod-43-scene', 'method-pod-chapters', 'learning-flagship']

function loadStore () {
  const p = f => JSON.parse(fs.readFileSync(path.join(REPO, 'services/shared/metagraph', f), 'utf8'))
  const nodes = p('nodes.json'), moves = p('moves.json'), outcomes = p('outcome-shapes.json')
  return {
    nodeIds: new Set([...(nodes.nodes || []), ...(nodes.bound_pairs || [])].map(n => n.id)),
    moveIds: new Set((moves.moves || []).map(m => m.id)),
    outcomeIds: new Set((outcomes.outcome_shapes || []).map(o => o.id))
  }
}

const URL = () => (process.env.SUPABASE_URL || '').trim()
const KEY = () => (process.env.SUPABASE_SERVICE_KEY || '').trim()
const H = () => ({ apikey: KEY(), Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' })

async function rest (pathname, init = {}) {
  const r = await fetch(`${URL()}/rest/v1/${pathname}`, { ...init, headers: { ...H(), ...(init.headers || {}) } })
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${pathname}: ${(await r.text()).slice(0, 300)}`)
  return r
}

async function allSteps (slug) {
  let rows = []; let from = 0
  while (true) {
    const r = await rest(`canonical_pod_walk_steps?pod_slug=eq.${encodeURIComponent(slug)}&select=id,pod_slug,scene_number,step_order,declared_as,register,resolution,node_id,note&order=scene_number,step_order&limit=1000&offset=${from}`)
    const d = await r.json(); rows = rows.concat(d); if (d.length < 1000) break; from += 1000
  }
  return rows
}

async function main () {
  const store = loadStore()
  const log = { ran: new Date().toISOString(), execute: EXECUTE, changes: [], unchanged: 0, stillUnresolved: [] }

  for (const slug of SLUGS) {
    const steps = await allSteps(slug)
    for (const s of steps) {
      const r = resolveShape({ declaredAs: s.declared_as }, store)
      const changed = r.nodeId !== s.node_id || r.resolution !== s.resolution || r.register !== s.register
      if (!changed) {
        log.unchanged++
        if (r.resolution === 'unresolved') log.stillUnresolved.push({ slug, scene: s.scene_number, declared_as: s.declared_as, note: r.note })
        continue
      }
      const change = {
        id: s.id, slug, scene: s.scene_number, declared_as: s.declared_as,
        before: { node_id: s.node_id, register: s.register, resolution: s.resolution },
        after: { node_id: r.nodeId, register: r.register, resolution: r.resolution, note: r.note }
      }
      log.changes.push(change)
      if (r.resolution === 'unresolved') log.stillUnresolved.push({ slug, scene: s.scene_number, declared_as: s.declared_as, note: r.note })
      if (EXECUTE) {
        // The before-state is asserted in the filter: if the row moved under us,
        // zero rows match and the read-back below catches it.
        await rest(`canonical_pod_walk_steps?id=eq.${encodeURIComponent(s.id)}&resolution=eq.${encodeURIComponent(s.resolution)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ node_id: r.nodeId, register: r.register, resolution: r.resolution, note: r.note })
        }).then(async resp => {
          const back = await resp.json()
          if (!Array.isArray(back) || back.length !== 1) throw new Error(`row ${s.id} drifted — expected 1 updated row, got ${Array.isArray(back) ? back.length : back}`)
        })
      }
    }
    console.log(`${slug}: ${steps.length} steps read`)
  }

  const resolvedNow = log.changes.filter(c => c.after.resolution !== 'unresolved').length
  console.log(`\n${log.changes.length} steps change (${resolvedNow} newly resolved), ${log.unchanged} unchanged, ${log.stillUnresolved.length} still unresolved${EXECUTE ? ' — APPLIED' : ' — DRY RUN'}`)
  for (const u of log.stillUnresolved) console.log(`   still unresolved: ${u.slug} scene ${u.scene} — ${JSON.stringify(u.declared_as)}`)
  const out = path.join(REPO, `docs/pods/walk-step-reresolve-2026-08-31-${EXECUTE ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`log → ${path.relative(REPO, out)}`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
