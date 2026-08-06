/**
 * Gate the unrecorded Welsh listening pods off live.
 *
 * Tom, 2026-08-06: "Welsh pods should not be live yet — Aran and Catrin have
 * yet to record them."
 *
 * Mechanism: the existing convention. Every learner-facing pod path queries the
 * exact id `<course>:pod-0` (useListeningPods, listeningMetaCache,
 * usePodLapScheduler, generateLearningScript). A pod on any other slug is
 * invisible to learners — which is already how spa_for_eng:music and
 * spa_for_eng:travel-situations sit unrecorded and unreachable.
 *
 * So we re-parent the Welsh sentences onto a `pod-0-unrecorded` slug.
 * Additive-first (INSERT the new pod row before re-parenting) so the
 * listening_pod_sentences_pod_id_fkey is satisfied at every instant.
 * NOTHING is deleted: the old pod-0 row stays in place, childless and inert.
 *
 * Reversal when the recordings land: RESTORE=1 node gate-welsh-pods.mjs
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = Object.fromEntries(fs.readFileSync('.env','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()]}))
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

const DRY_RUN = process.env.DRY_RUN !== '0'
const RESTORE = process.env.RESTORE === '1'
const COURSES = ['cym_n_for_eng', 'cym_s_for_eng']
const SUFFIX = '-unrecorded'
const log = []

for (const course of COURSES) {
  const liveId = `${course}:pod-0`
  const gatedId = `${course}:pod-0${SUFFIX}`
  const from = RESTORE ? gatedId : liveId
  const to   = RESTORE ? liveId  : gatedId

  // --- snapshot / assert before-state -------------------------------------
  const { data: src } = await sb.from('listening_pods').select('*').eq('id', from).maybeSingle()
  const { data: dst } = await sb.from('listening_pods').select('*').eq('id', to).maybeSingle()
  let sents = [], off = 0
  while (true) {
    const { data, error } = await sb.from('listening_pod_sentences').select('id, pod_id').eq('pod_id', from).range(off, off+999)
    if (error) throw new Error(`${course} read: ${error.message}`)
    sents.push(...data); if (data.length < 1000) break; off += 1000
  }
  console.log(`\n=== ${course} ===`)
  console.log(`  source pod row ${from}: ${src ? 'present' : 'ABSENT'}`)
  console.log(`  target pod row ${to}: ${dst ? 'present' : 'absent'}`)
  console.log(`  sentences to re-parent: ${sents.length}`)

  if (!sents.length) { console.log('  nothing to do — skipping'); continue }
  if (!src && !dst) { console.log('  ✗ no pod row on either id — ABORT'); process.exit(1) }

  if (DRY_RUN) { console.log('  [DRY RUN] would insert pod row + re-parent', sents.length, 'sentences'); continue }

  // --- 1. ensure the destination pod row exists (additive, FK-safe) --------
  if (!dst) {
    const row = { ...src, id: to, slug: `pod-0${RESTORE ? '' : SUFFIX}` }
    if (!RESTORE) {
      row.title = `${src.title} — UNRECORDED, gated off live 2026-08-06`
      row.metadata = { ...(src.metadata || {}), gated: true, gated_on: '2026-08-06',
        gated_reason: 'Aran/Catrin have not recorded these pods yet (Tom, 2026-08-06)',
        restore_by: 'move listening_pod_sentences.pod_id back to <course>:pod-0' }
    }
    delete row.created_at; delete row.updated_at
    const { error } = await sb.from('listening_pods').insert(row)
    if (error) throw new Error(`${course} insert ${to}: ${error.message}`)
    console.log(`  ✓ inserted pod row ${to}`)
  }

  // --- 1b. on restore, give pod-0 its real title back ---------------------
  if (RESTORE) {
    const { data: ph } = await sb.from('listening_pods').select('title, metadata').eq('id', to).single()
    if (ph?.metadata?.gated_placeholder) {
      const meta = { ...ph.metadata }
      const title = meta.original_title || ph.title
      delete meta.gated_placeholder; delete meta.gated_on; delete meta.original_title; delete meta.note
      await sb.from('listening_pods').update({ title, metadata: meta }).eq('id', to)
      console.log(`  ✓ restored original title on ${to}`)
    }
  }

  // --- 2. re-parent the sentences ----------------------------------------
  const { error: upErr } = await sb.from('listening_pod_sentences').update({ pod_id: to }).eq('pod_id', from)
  if (upErr) throw new Error(`${course} update: ${upErr.message}`)

  // --- 3. verify: old id empty, new id has exactly the same count ---------
  const { count: oldCount } = await sb.from('listening_pod_sentences').select('*', { count:'exact', head:true }).eq('pod_id', from)
  const { count: newCount } = await sb.from('listening_pod_sentences').select('*', { count:'exact', head:true }).eq('pod_id', to)
  console.log(`  ✓ re-parented — ${from}: ${oldCount} rows, ${to}: ${newCount} rows`)
  if (oldCount !== 0 || newCount !== sents.length) { console.log('  ✗ COUNT MISMATCH — investigate'); process.exit(1) }
  log.push({ course, from, to, moved: sents.length, sentenceIds: sents.map(s=>s.id) })
}

if (!DRY_RUN && log.length) {
  const f = `welsh-pod-gate-${RESTORE?'restore':'applied'}-log.json`
  fs.writeFileSync(f, JSON.stringify(log, null, 2))
  console.log(`\nlog written: ${f}`)
}
console.log(DRY_RUN ? '\n[DRY RUN — no writes made]' : '\nDONE')
