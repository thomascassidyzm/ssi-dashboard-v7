#!/usr/bin/env node
/**
 * reuse-guard-probe — run phase8's OWN canon-reuse computation against the live
 * database and print what it decides, for the pods named on the command line.
 *
 * This is the artefact for the hazard #408 named: "phase8 refuses audio reuse for
 * a whole pod when canon and pod counts disagree, so an unguarded change here can
 * silently switch off cross-course audio reuse for every pod-1 course and spend
 * real TTS." It calls the exported functions, not a re-implementation, and it
 * writes nothing and renders nothing.
 *
 *   node docs/pods/reachable-2026-09-04/reuse-guard-probe.cjs deu_at_for_eng:pod-1 fra_for_eng:pod-1
 */
'use strict'
// The service must not boot: this file is required purely for its exported
// helpers. Same gate services/pod-bulk-migrate.cjs uses.
process.env.PHASE8_NO_LISTEN = '1'
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env'), quiet: true })
const phase8 = require('../../../services/phases/phase8-audio-v13.cjs')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
)

async function main() {
  const podIds = process.argv.slice(2)
  if (!podIds.length) { console.error('usage: reuse-guard-probe.cjs <pod_id> [pod_id...]'); process.exit(2) }

  const canon = await phase8.loadPod0Canon()
  console.log(`canon (loadPod0Canon, base rows only): ${canon.length} lines`)

  for (const podId of podIds) {
    const { data, error } = await supabase
      .from('listening_pod_sentences')
      .select('*').eq('pod_id', podId).order('global_order')
    if (error) throw new Error(`${podId}: ${error.message}`)
    const base = (data || []).filter(r => r.variant_key == null)
    // These pods are English-known courses, so canon compares against known_text.
    const texts = phase8.podCanonReuseTexts(canon, data || [], 'known_text')
    console.log(`${podId}: rows=${String((data || []).length).padStart(3)} `
      + `base=${String(base.length).padStart(3)} continuations=${String((data || []).length - base.length).padStart(2)}  `
      + `podCanonReuseTexts -> ${texts ? `${texts.size} shareable canon line(s)` : 'NULL (pod not aligned — no reuse, every clip renders fresh)'}`)
  }
}
main().catch(e => { console.error(e.message); process.exit(1) })
