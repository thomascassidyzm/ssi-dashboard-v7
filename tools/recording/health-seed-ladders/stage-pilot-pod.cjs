#!/usr/bin/env node
/**
 * stage-pilot-pod.cjs — put the five pilot seeds where Aran and Catrin can read
 * them, and nowhere a learner can hear them.
 *
 *   node tools/recording/health-seed-ladders/stage-pilot-pod.cjs           # DRY RUN
 *   node tools/recording/health-seed-ladders/stage-pilot-pod.cjs --apply
 *   node tools/recording/health-seed-ladders/stage-pilot-pod.cjs --batch 2 --apply
 *
 * WHY A POD AND NOT A COURSE. The 57 health seeds are `canonical_pod_scenarios`
 * rows — a canon table with no audio FK, which no recordist queue source reads.
 * They are pod scenarios by construction, and the pod path is the one that
 * already carries everything this pilot needs: cast by speaker, a queue line per
 * sentence, `atom_map_fine` for the chunk split and `takeg_audio_ids` for the
 * gapped take, with tools/slice-take-g.cjs already able to turn one gapped take
 * into per-unit ms spans. Minting seeds inside the live 668-seed cym_n_for_eng
 * would move its numbering for nothing.
 *
 * WHY `visibility: 'held'` IS THE STAGING GATE. The recordist queue does not
 * read `listening_pods.visibility` at all — a held pod reaches the booth exactly
 * like a live one — while the learner path does. 61 of the estate's 128 pods are
 * already held. So held is precisely "recordable, not served", which is what
 * staging a pilot means, and it needed no new column and no new flag.
 * `pod_type: 'choice'` on top of it, because a choice pod is served by nothing.
 *
 * WHAT EACH SENTENCE CARRIES. The stored Welsh as `target_text` (the natural
 * read), and the #991 split as `atom_map_fine` — one `kind: 'atom'` entry per
 * chunk, carrying `target_surface` and `gloss`, with the ms spans left NULL for
 * tools/slice-take-g.cjs to fill from the recorded Take G. Declaring that map is
 * what makes the queue offer the sentence a second, gapped line: see
 * recordist-queue.cjs#takeGChunks.
 *
 * DRAFT, AND SAID SO. Every Welsh line here is a machine draft (#991's own
 * words), so `target_text_draft` is true. That is what stops the A-109 render
 * gate ever turning one into TTS, and it is the honest state until Aran reads it.
 *
 * Idempotent: re-running upserts the same ids. Nothing is deleted, no audio is
 * touched, no take is recorded and no audio pass is queued.
 */
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const SEEDS = require('./health-seeds.json')
const { classifySplit } = require('./partition.cjs')

const APPLY = process.argv.includes('--apply')
const BATCH = Number((process.argv.find((a) => a.startsWith('--batch=')) || '').split('=')[1] ||
  (process.argv.includes('--batch') ? process.argv[process.argv.indexOf('--batch') + 1] : 1))

const COURSE = 'cym_n_for_eng'
const SLUG = 'health-ladder-pilot'
const POD_ID = `${COURSE}:${SLUG}`

// SPEAKERS ALREADY CAST ON THIS COURSE, and chosen for that reason alone: a
// speaker with no podCast entry is `uncast` and lands in nobody's queue. Both
// voices read every pilot seed, solo, which is what Tom ruled for these seeds.
const READERS = [
  { speaker: 'Nurse Siân', who: 'Catrin', voiceId: 'human_catrinlliar_cym_n' },
  { speaker: 'Wil Hughes', who: 'Aran', voiceId: 'human_aran_cym_n' },
]

function atomMap(seed) {
  return seed.chunks.map((c, i) => ({
    kind: 'atom',
    lego_key: `${seed.code.toLowerCase()}-${i + 1}`,
    gloss: c.known,
    target_surface: c.target,
    // NULL until a Take G is recorded and tools/slice-take-g.cjs measures it.
    // Written as null rather than omitted so the shape matches every other
    // atom_map_fine on the estate and the slicer's own in-place update works.
    target_start_ms: null,
    target_end_ms: null,
  }))
}

function sentencesFor(seeds) {
  const rows = []
  let order = 0
  seeds.forEach((seed, si) => {
    READERS.forEach((r) => {
      order += 1
      rows.push({
        id: `${POD_ID}:${seed.code.toLowerCase()}:${r.who.toLowerCase()}`,
        pod_id: POD_ID,
        scene_number: 1,
        sentence_number: order,
        global_order: order,
        speaker: r.speaker,
        target_text: seed.welsh,
        known_text: seed.english,
        atom_map_fine: atomMap(seed),
        target_text_draft: true,
      })
    })
  })
  return rows
}

async function main() {
  const seeds = SEEDS.filter((s) => s.batch === BATCH)
  if (!seeds.length) { console.error(`no seeds in batch ${BATCH}`); process.exit(2) }
  for (const s of seeds) {
    const cls = classifySplit(s)
    if (cls.class === 'blocked') {
      console.error(`REFUSING: ${s.code} is not cuttable — ${cls.reason}`)
      process.exit(2)
    }
  }
  const sentences = sentencesFor(seeds)

  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — batch ${BATCH}, ${seeds.length} seed(s)`)
  console.log(`pod ${POD_ID}  visibility=held  pod_type=choice   (recordable, served to nobody)`)
  console.log(`${sentences.length} sentence(s): ${seeds.length} seed(s) × ${READERS.length} voice(s)`)
  console.log(`each declares its chunks, so each yields TWO queue lines — natural + Take G.`)
  for (const row of sentences) {
    console.log(`  ${row.id}`)
    console.log(`    ${row.speaker}: ${row.target_text}`)
    console.log(`    seams: ${row.atom_map_fine.map((a) => a.target_surface).join(' … ')}`)
  }
  console.log('')
  console.log(`queue lines added: ${sentences.length * 2} total, ${sentences.length} per voice`)

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply.')
    return
  }

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const { error: podErr } = await db.from('listening_pods').upsert({
    id: POD_ID,
    course_code: COURSE,
    pod_type: 'choice',
    slug: SLUG,
    pod_order: 900,
    title: 'Health ladder pilot — seed-and-splice (job #993)',
    scene: 'Health — ward and surgery',
    speakers: Object.fromEntries(READERS.map((r) => [r.speaker, { name: r.who, voiceId: r.voiceId }])),
    visibility: 'held',
    metadata: { pilot: 'seed-and-splice', job: '993', batch: BATCH },
  }, { onConflict: 'id' })
  if (podErr) throw new Error(`pod upsert failed: ${podErr.message}`)
  console.log(`pod ${POD_ID} upserted (held).`)

  const { error: sErr } = await db.from('listening_pod_sentences').upsert(sentences, { onConflict: 'id' })
  if (sErr) throw new Error(`sentence upsert failed: ${sErr.message}`)
  console.log(`${sentences.length} sentence(s) upserted.`)
  console.log('\nNothing was recorded and no audio was generated. The lines are now in the booth.')
}

main().catch((err) => { console.error(err.message); process.exit(1) })
