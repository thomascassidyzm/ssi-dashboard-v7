#!/usr/bin/env node
/**
 * verify-senedd-pod.cjs — does Steve's pod play as one continuous ordered
 * session, and did any of it cost Aran a line?
 *
 * READ-ONLY. Four questions, each answered against the live DB rather than
 * against the build log, because the build log only says what was intended:
 *
 *   1. is `global_order` 1..N with no gaps and no duplicates;
 *   2. does every line have audio to play — Welsh lines need Aran (not yet
 *      recorded, so they are counted, never asserted), English lines need a
 *      rendered known clip and every line needs its English;
 *   3. do the three holes Tom named read coherently now — the 13-turn hole at
 *      contribution orders 259-273, the "sorry, I turned to English" line at
 *      327, and Chris Jones's interjection at 217-219;
 *   4. is every English floor line still invisible to the Welsh recording
 *      queue: blank target_text, no rerecord want.
 *
 *   node tools/pods/senedd/verify-senedd-pod.cjs
 */
'use strict'
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const POD_ID = 'cym_n_for_eng:senedd-s4c-steve'
const HOLES = [[217, 219], [259, 273], [326, 327]]

async function main() {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data: pod } = await db.from('listening_pods')
    .select('id, visibility, required_role, speakers, metadata').eq('id', POD_ID).single()

  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('listening_pod_sentences')
      .select('id, global_order, scene_number, speaker, target_text, known_text, target_audio_id, known_audio_id, rerecord_wanted, beat_label')
      .eq('pod_id', POD_ID).order('global_order').range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }

  const orders = rows.map(r => r.global_order)
  const gaps = []
  for (let i = 1; i <= rows.length; i++) if (orders[i - 1] !== i) { gaps.push(i); break }
  const dupes = orders.length - new Set(orders).size

  const welsh = rows.filter(r => (r.target_text || '').trim())
  const english = rows.filter(r => !(r.target_text || '').trim())
  const noEnglishAudio = rows.filter(r => !r.known_audio_id)
  const wants = rows.filter(r => r.rerecord_wanted)

  console.log(`pod ${pod.id} — ${pod.visibility}, required_role=${pod.required_role || 'none'}`)
  console.log(`lines               ${rows.length} (welsh ${welsh.length}, english floor ${english.length})`)
  console.log(`global_order        ${orders[0]}..${orders[orders.length - 1]}  gaps: ${gaps.length ? gaps.join(',') : 'NONE'}  duplicates: ${dupes}`)
  console.log(`english audio        ${rows.length - noEnglishAudio.length}/${rows.length} linked` +
    (noEnglishAudio.length ? `  MISSING: ${noEnglishAudio.slice(0, 5).map(r => r.global_order).join(',')}…` : ''))
  console.log(`welsh audio          ${welsh.filter(r => r.target_audio_id).length}/${welsh.length} linked (Aran has not recorded yet — expected 0)`)
  console.log(`rerecord wants       ${wants.length} (must be 0: a want on the known side puts English in a Welsh queue)`)
  console.log(`english target_text  ${english.every(r => r.target_text === '') ? 'all empty — invisible to the Welsh queue' : 'NOT ALL EMPTY — QUEUE LEAK'}`)

  const orderOf = (r) => {
    const src = pod.metadata && pod.metadata.source_lines && pod.metadata.source_lines[r.id]
    return src ? src.contribution_order : null
  }
  for (const [lo, hi] of HOLES) {
    console.log(`\n--- contribution orders ${lo}..${hi} ---`)
    for (const r of rows) {
      const o = orderOf(r)
      if (o == null || o < lo || o > hi) continue
      const lang = (r.target_text || '').trim() ? 'Cy' : 'En'
      const text = ((r.target_text || '').trim() || r.known_text)
      console.log(`[${String(r.global_order).padStart(3)}] ord${String(o).padStart(4)} ${lang} ${r.speaker.padEnd(16).slice(0, 16)} | ${text.slice(0, 96)}`)
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
