#!/usr/bin/env node
/**
 * apply-italian-zut-corrections-2026-09-01.cjs — land the three ZUT forks the
 * 1 September Italian pair overlay resolved on paper and never wrote down.
 *
 * THE DEFECT THIS FIXES IS THAT THE DOCUMENT WAS THE DELIVERABLE. The overlay
 * (docs/pods/method-pod-italian-pair-overlay-2026-09-01.md, on the unmerged
 * branch docs/italian-pair-overlays-2026-09-01, commit 88f04f036) resolved three
 * forks in its §3 and stopped there. Every row it names still carries the old
 * form, with updated_at frozen at 2026-08-30 — the rows are the course and the
 * document is not.
 *
 *   F-A  "Go on."   forked three ways   → standardised to "Vai."
 *   F-B  "Tell me." forked              → standardised to "Dimmi."
 *   F-C  pivot-"So —" forked            → standardised to "Allora"
 *
 * BOTH CUTS, MATCHED BY TEXT AND NEVER BY SCENE NUMBER. The same Italian lives
 * in the chapter cut and the 43-scene cut under different scene numbers. ZUT is
 * a property of the content, not of a cut, so a form eliminated in one cut and
 * left standing in the other re-forks the moment anybody records from the other
 * one. A row is corrected only when its English AND its current Italian match
 * this file's before-state exactly; anything else is reported as residue and
 * left alone.
 *
 * GATED. Every row is asserted against its expected before-state and the whole
 * run aborts on the first drift — if a row does not say what this script thinks
 * it says, somebody else has been here and a blind update would destroy their
 * work. Dry run is the default.
 *
 * Usage:
 *   node tools/pods/apply-italian-zut-corrections-2026-09-01.cjs            # dry run
 *   node tools/pods/apply-italian-zut-corrections-2026-09-01.cjs --execute
 */

'use strict'

require('dotenv').config({ quiet: true })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const EXECUTE = process.argv.includes('--execute')
const LOG_DIR = path.join(__dirname, '..', '..', 'docs', 'pods')
const LOG = path.join(LOG_DIR, `italian-zut-corrections-2026-09-01-${EXECUTE ? 'applied' : 'dryrun'}-log.json`)

const MORTGAGE_BEFORE = 'Non li prende. Guarda — io faccio la banca, tu fai te. Tu entri, ti siedi, e dici: «Vorrei un mutuo». Dai.'
const MORTGAGE_AFTER = 'Non li prende. Guarda — io faccio la banca, tu fai te. Tu entri, ti siedi, e dici: «Vorrei un mutuo». Vai.'
const PIVOT_BEFORE = 'Allora me la prendo. Perché è la stessa chiesa. Un tedesco su un tedesco, una studentessa su una studentessa, e uno di noi due su se stesso con un pesce gallese. Quindi — aspetta. Come lo sappiamo?'
const PIVOT_AFTER = 'Allora me la prendo. Perché è la stessa chiesa. Un tedesco su un tedesco, una studentessa su una studentessa, e uno di noi due su se stesso con un pesce gallese. Allora — aspetta. Come lo sappiamo?'

/** Every row this sweep may touch, with the exact words it expects to find. */
const CORRECTIONS = [
  { fork: 'F-A', id: 'method-pod-chapters:SC02-S02', english: 'Go on.', before: 'Dai, racconta.', after: 'Vai.' },
  { fork: 'F-A', id: 'method-pod-43-scene:SC02-S02', english: 'Go on.', before: 'Dai, racconta.', after: 'Vai.' },
  { fork: 'F-A', id: 'method-pod-chapters:SC11-S02', english: null, before: MORTGAGE_BEFORE, after: MORTGAGE_AFTER },
  { fork: 'F-A', id: 'method-pod-43-scene:SC15-S02', english: null, before: MORTGAGE_BEFORE, after: MORTGAGE_AFTER },
  { fork: 'F-B', id: 'method-pod-chapters:SC08-S11', english: 'Tell me.', before: 'Racconta.', after: 'Dimmi.' },
  { fork: 'F-C', id: 'method-pod-chapters:SC02-S18', english: null, before: PIVOT_BEFORE, after: PIVOT_AFTER },
]

function db() {
  const url = (process.env.SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_KEY || '').trim()
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY missing from .env')
  return createClient(url, key)
}

async function main() {
  const client = db()
  const ids = CORRECTIONS.map((c) => c.id)
  const { data: rows, error } = await client
    .from('canonical_pod_scenarios')
    .select('id, pod_slug, target_lang, english_text, target_text, updated_at')
    .in('id', ids)
    .eq('target_lang', 'ita')
  if (error) throw new Error(`read failed: ${error.message}`)
  const byId = new Map((rows || []).map((r) => [r.id, r]))

  // ── THE GATE. Assert every before-state before writing anything at all. ──
  const plan = []
  const residue = []
  for (const c of CORRECTIONS) {
    const row = byId.get(c.id)
    if (!row) { residue.push({ ...c, why: 'no such ita row' }); continue }
    if (row.target_text === c.after) { residue.push({ ...c, why: 'already corrected' }); continue }
    if (row.target_text !== c.before) {
      throw new Error(`DRIFT on ${c.id}: expected ${JSON.stringify(c.before)}, found ${JSON.stringify(row.target_text)} — stopping without writing anything`)
    }
    if (c.english && row.english_text !== c.english) {
      throw new Error(`DRIFT on ${c.id}: English is ${JSON.stringify(row.english_text)}, expected ${JSON.stringify(c.english)} — stopping`)
    }
    plan.push({ fork: c.fork, id: c.id, pod_slug: row.pod_slug, english_text: row.english_text, before: row.target_text, after: c.after, updated_at_before: row.updated_at })
  }

  const log = { generatedAt: new Date().toISOString(), mode: EXECUTE ? 'applied' : 'dryrun', matched: rows.length, planned: plan.length, residue, rows: plan }

  if (EXECUTE) {
    for (const p of plan) {
      // Guarded write: the before-state is part of the WHERE, so a row that
      // moved between the read and the write is not overwritten.
      const { data, error: updErr } = await client
        .from('canonical_pod_scenarios')
        .update({ target_text: p.after, updated_at: new Date().toISOString() })
        .eq('id', p.id)
        .eq('target_lang', 'ita')
        .eq('target_text', p.before)
        .select('id, updated_at, target_text')
      if (updErr) throw new Error(`write failed on ${p.id}: ${updErr.message}`)
      if (!data || data.length !== 1) throw new Error(`write matched ${data ? data.length : 0} rows on ${p.id} — stopping`)
      p.updated_at_after = data[0].updated_at
      p.verified_text = data[0].target_text
    }
    log.changed = plan.length
  }

  fs.writeFileSync(LOG, JSON.stringify(log, null, 2) + '\n')
  console.log(`${EXECUTE ? 'APPLIED' : 'DRY RUN'}: ${plan.length} row(s), ${residue.length} residue. Log: ${LOG}`)
  for (const p of plan) console.log(`  ${p.fork} ${p.id}: ${JSON.stringify(p.before.slice(-40))} -> ${JSON.stringify(p.after.slice(-40))}${p.updated_at_after ? ` [${p.updated_at_before} -> ${p.updated_at_after}]` : ''}`)
  for (const r of residue) console.log(`  RESIDUE ${r.id}: ${r.why}`)
}

main().catch((err) => { console.error(err.message); process.exit(1) })
