#!/usr/bin/env node
/**
 * ingest-canonical-pods — put the three 2026-08-30 pods into the canonical store,
 * once, so the Script Lab can edit and score them.
 *
 * Tom's ruling, 2026-08-30: "it has to then be stored in the DB like everything
 * else in popty editing does." So this is a ONE-WAY, ONE-TIME import. After it
 * runs, THE DATABASE IS CANON and the markdown is a historical artefact.
 *
 * There is deliberately no sync, no startup check and no compare-and-fix. The only
 * way to write over live rows again is `--reimport-destructive`, which says what it
 * does, refuses to run without `--execute`, and prints the row count it is about to
 * destroy. Anything less explicit would silently overwrite Tom's edits, which is
 * exactly the failure this job exists to avoid.
 *
 *   node tools/pods/ingest-canonical-pods.cjs --pod=learning-flagship            # dry run
 *   node tools/pods/ingest-canonical-pods.cjs --pod=learning-flagship --execute
 *   node tools/pods/ingest-canonical-pods.cjs --pod=all --execute
 *   node tools/pods/ingest-canonical-pods.cjs --pod=X --reimport-destructive --execute
 *   node tools/pods/ingest-canonical-pods.cjs --ddl                              # print the DDL
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { parsePod } = require('./parse-pod-markdown.cjs')

const REPO = path.resolve(__dirname, '../..')
const arg = (n, d) => { const h = process.argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d }
const EXECUTE = process.argv.includes('--execute')
const REIMPORT = process.argv.includes('--reimport-destructive')
// --sections=1,2 restricts the import to those chapters/scenes. It exists for the
// pilot — prove the storage shape on one chapter before paying for ~1,500 rows.
const SECTIONS = (arg('sections', '') || '').split(',').filter(Boolean).map(Number)

const PODS = {
  'learning-flagship': {
    file: 'docs/pods/learning-flagship-pod-2026-08-30.md',
    unit: 'Chapter', targetLang: null,
    note: 'the Learning flagship — 11 chapters, English only'
  },
  'method-pod-chapters': {
    file: 'docs/pods/method-pod-chapters-2026-08-30.md',
    unit: 'Chapter', targetLang: 'ita',
    note: 'the Method Pod, chapter cut — 12 chapters, English beside Italian'
  },
  'method-pod-43-scene': {
    file: 'docs/pods/method-pod-full-2026-08-30.md',
    unit: 'Scene', targetLang: 'ita',
    note: 'the Method Pod, 43-scene cut — the CONTROL ARM the chapter cut is measured against'
  }
}

const DDL = `
-- The Italian specimen realisation written beside the English in both Method Pod
-- cuts. It is not author_notes (a live editable field with its own purpose) and it
-- is not a second scenarios table (that would be a second copy of the dialogue).
alter table canonical_pod_scenarios add column if not exists target_text text;
alter table canonical_pod_scenarios add column if not exists target_lang text;

-- The walk, in node-reference form (Watson's ruling, 2026-08-30; src/lib/metagraph/
-- walk.js). A chapter declares its shapes AT CHAPTER LEVEL, so a step cannot be a
-- column on a dialogue row without inventing per-turn claims. Steps are node
-- references; the text hangs off scenario_id, never the other way round.
create table if not exists canonical_pod_walk_steps (
  id           text primary key,
  pod_slug     text not null,
  walk_id      text not null,
  walk_name    text,
  scene_number integer not null,
  step_order   integer not null,
  kind         text not null,
  node_id      text,
  declared_as  text not null,
  register     text,
  resolution   text not null,
  scenario_id  text references canonical_pod_scenarios(id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists canonical_pod_walk_steps_slug_idx
  on canonical_pod_walk_steps (pod_slug, scene_number, step_order);
`

function loadStore () {
  const p = f => JSON.parse(fs.readFileSync(path.join(REPO, 'services/shared/metagraph', f), 'utf8'))
  const nodes = p('nodes.json'), moves = p('moves.json'), outcomes = p('outcome-shapes.json')
  return {
    nodeIds: new Set([...(nodes.nodes || []), ...(nodes.bound_pairs || [])].map(n => n.id)),
    moveIds: new Set((moves.moves || []).map(m => m.id)),
    outcomeIds: new Set((outcomes.outcome_shapes || []).map(o => o.id))
  }
}

// --- Supabase REST, the same door tools/seed-canonical-pods.cjs uses ---------
const URL = () => (process.env.SUPABASE_URL || '').trim()
const KEY = () => (process.env.SUPABASE_SERVICE_KEY || '').trim()
const H = () => ({ apikey: KEY(), Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' })

async function rest (pathname, init = {}) {
  const r = await fetch(`${URL()}/rest/v1/${pathname}`, { ...init, headers: { ...H(), ...(init.headers || {}) } })
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${pathname}: ${(await r.text()).slice(0, 300)}`)
  return r
}

async function countRows (table, slug) {
  const r = await rest(`${table}?pod_slug=eq.${encodeURIComponent(slug)}&select=id`, { headers: { Prefer: 'count=exact', Range: '0-0' } })
  const cr = r.headers.get('content-range') || '*/0'
  return Number(cr.split('/')[1] || 0)
}

async function insertBatched (table, rows) {
  let done = 0
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200)
    await rest(table, { method: 'POST', body: JSON.stringify(batch) })
    done += batch.length
  }
  return done
}

function summarise (slug, parsed) {
  const byRes = {}
  for (const s of parsed.steps) byRes[s.resolution] = (byRes[s.resolution] || 0) + 1
  const byReg = {}
  for (const s of parsed.steps) if (s.resolution === 'unresolved') byReg[s.register] = (byReg[s.register] || 0) + 1
  const scenes = new Set(parsed.scenarios.map(r => r.scene_number))
  const shapedScenes = new Set(parsed.steps.filter(s => s.node_id).map(s => s.scene_number))
  const nodes = [...new Set(parsed.steps.filter(s => s.node_id).map(s => s.node_id))].sort()
  return { slug, lines: parsed.scenarios.length, sections: scenes.size, walkSteps: parsed.steps.length, byRes, unresolvedByRegister: byReg, resolvedShapes: nodes, sectionsWithAShape: shapedScenes.size }
}

async function main () {
  if (process.argv.includes('--ddl')) { console.log(DDL); return }
  const which = arg('pod', '')
  const slugs = which === 'all' ? Object.keys(PODS) : (PODS[which] ? [which] : null)
  if (!slugs) { console.error(`--pod=<${Object.keys(PODS).join('|')}|all> required`); process.exit(1) }

  const store = loadStore()
  const report = []
  for (const slug of slugs) {
    const cfg = PODS[slug]
    const md = fs.readFileSync(path.join(REPO, cfg.file), 'utf8')
    let parsed = parsePod(md, { slug, unit: cfg.unit, targetLang: cfg.targetLang, store })
    if (SECTIONS.length) {
      parsed = {
        scenarios: parsed.scenarios.filter(r => SECTIONS.includes(r.scene_number)),
        steps: parsed.steps.filter(s => SECTIONS.includes(s.scene_number))
      }
      console.log(`   (--sections=${SECTIONS.join(',')} — partial import)`)
    }
    const sum = summarise(slug, parsed)
    console.log(`\n── ${slug} — ${cfg.note}`)
    console.log(`   ${sum.lines} lines across ${sum.sections} ${cfg.unit.toLowerCase()}s; ${sum.walkSteps} walk steps`)
    console.log(`   resolution: ${JSON.stringify(sum.byRes)}`)
    console.log(`   unresolved by register: ${JSON.stringify(sum.unresolvedByRegister)}`)
    console.log(`   resolved store shapes: ${sum.resolvedShapes.join(', ') || '(none)'}`)

    if (!EXECUTE) { console.log('   DRY RUN — nothing written. Add --execute.'); report.push(sum); continue }

    const existing = await countRows('canonical_pod_scenarios', slug)
    if (existing > 0 && !REIMPORT) {
      console.log(`   REFUSED: ${existing} rows already live under '${slug}'. The DB is canon; a re-import`)
      console.log('   would overwrite edits made in the Script Lab. Pass --reimport-destructive to destroy them.')
      report.push({ ...sum, wrote: 0, refused: existing })
      continue
    }
    if (existing > 0 && REIMPORT) {
      console.log(`   --reimport-destructive: DELETING ${existing} live scenario rows and their walk steps under '${slug}'.`)
      await rest(`canonical_pod_walk_steps?pod_slug=eq.${encodeURIComponent(slug)}`, { method: 'DELETE' })
      await rest(`canonical_pod_scenarios?pod_slug=eq.${encodeURIComponent(slug)}`, { method: 'DELETE' })
    }
    const wroteRows = await insertBatched('canonical_pod_scenarios', parsed.scenarios)
    const wroteSteps = await insertBatched('canonical_pod_walk_steps', parsed.steps)
    const backRows = await countRows('canonical_pod_scenarios', slug)
    const backSteps = await countRows('canonical_pod_walk_steps', slug)
    console.log(`   wrote ${wroteRows} lines / ${wroteSteps} walk steps; READ BACK ${backRows} lines / ${backSteps} walk steps`)
    report.push({ ...sum, wroteRows, wroteSteps, backRows, backSteps })
  }
  const out = path.join(REPO, 'docs/pods/pod-ingest-2026-08-30-log.json')
  fs.writeFileSync(out, JSON.stringify({ ran: new Date().toISOString(), execute: EXECUTE, report }, null, 2))
  console.log(`\nlog → ${path.relative(REPO, out)}`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
