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
 * WHY THIS POD IS NOT IN FRONT OF LEARNERS — AND IT IS NOT THE VISIBILITY.
 *
 * Tom's ruling, 2026-09-02, verbatim: "do not let visibility stand in for a
 * guard anywhere." A 'held' pod on a serving slug IS served;
 * tools/pods/serving-slug.cjs says so in as many words and reads visibility only
 * to report it in a refusal. The guard is the SLUG: the learning app resolves a
 * course's pod by `pod_type = 'core'` AND `slug = 'pod-1'` (plus 'method-pod' in
 * Listening Mode). This pod is `pod_type: 'choice'` on the slug
 * 'health-ladder-pilot', which is neither, so nothing serves it — and it would
 * still be unserved if it were marked live.
 *
 * `visibility: 'held'` is set anyway, as a second, honest statement of intent and
 * because 61 of the estate's 128 pods already carry it. It is never the reason.
 *
 * THE BOOTH, SEPARATELY, SEES IT. The recordist queue reads no visibility at all,
 * so a held pod reaches Aran and Catrin exactly like a live one. That asymmetry —
 * recordable here, served nowhere — is what staging a pilot needs, and it needed
 * no new column and no new flag.
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
const { assertNoCharacters, soloReaders } = require('../../../services/shared/pod-solo-readers.cjs')

const APPLY = process.argv.includes('--apply')
const BATCH = Number((process.argv.find((a) => a.startsWith('--batch=')) || '').split('=')[1] ||
  (process.argv.includes('--batch') ? process.argv[process.argv.indexOf('--batch') + 1] : 1))

const COURSE = 'cym_n_for_eng'
const SLUG = 'health-ladder-pilot'
const POD_ID = `${COURSE}:${SLUG}`

// READ SOLO BY BOTH VOICES, AND BY NO CHARACTER (Tom's ruling, 2026-09-16).
//
// This set was first staged with a character per voice — Nurse Siân and Wil
// Hughes — because a pod line is cast by its speaker and each character could
// then own an audio slot. That wrote every seed TWICE, and Aran opened the pod
// page and found it: "two versions of each translation, one for Nurse Sian and
// one for Wil Hughes."
//
// These are SEEDS. One line per seed, no character at all, read solo by each
// voice — Aran and Catrin reading the same sentence, the way target1 and target2
// of a seed are read. The pod says so by naming its readers, and
// services/shared/pod-solo-readers.cjs is what the queue, the take route and the
// Take G route all read that declaration from.
const SOLO_READERS = ['human_aran_cym_n', 'human_catrinlliar_cym_n']

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
  return seeds.map((seed, i) => ({
    id: `${POD_ID}:${seed.code.toLowerCase()}`,
    pod_id: POD_ID,
    scene_number: 1,
    sentence_number: i + 1,
    global_order: i + 1,
    // NO CHARACTER. The column is NOT NULL, so the empty string is how a line
    // with no character says so; assertNoCharacters refuses anything else.
    speaker: '',
    target_text: seed.welsh,
    known_text: seed.english,
    atom_map_fine: atomMap(seed),
    target_text_draft: true,
  }))
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
  const podRow = {
    id: POD_ID,
    course_code: COURSE,
    pod_type: 'choice',
    slug: SLUG,
    pod_order: 900,
    title: 'Health ladder pilot — seed-and-splice (job #993)',
    scene: 'Health — ward and surgery',
    // EMPTY, DELIBERATELY. A seed set has no cast of characters; its readers are
    // named in metadata.solo_readers and nowhere else.
    speakers: {},
    visibility: 'held',
    metadata: { pilot: 'seed-and-splice', job: '993', batch: BATCH, solo_readers: SOLO_READERS },
  }
  // THE GUARD, before anything is printed or written: a seed-set staging can
  // never attach pod characters, and can never write one seed twice.
  assertNoCharacters(podRow, sentences)

  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — batch ${BATCH}, ${seeds.length} seed(s)`)
  console.log(`pod ${POD_ID}  pod_type=choice  slug=${SLUG}  visibility=held`)
  console.log(`  served by nothing: the learner resolves core/pod-1, and this is neither.`)
  console.log(`  reachable in the booth: the recordist queue reads no visibility at all.`)
  console.log(`${sentences.length} sentence(s): one per seed, no character`)
  console.log(`read solo by ${soloReaders(podRow).join(' and ')} — two takes on one line`)
  console.log(`each declares its chunks, so each yields TWO queue lines — natural + Take G.`)
  for (const row of sentences) {
    console.log(`  ${row.id}`)
    console.log(`    ${row.target_text}`)
    console.log(`    seams: ${row.atom_map_fine.map((a) => a.target_surface).join(' … ')}`)
  }
  console.log('')
  console.log(`queue lines: ${sentences.length} natural + ${sentences.length} gapped PER READER` +
    ` = ${sentences.length * 2} each, ${sentences.length * 2 * SOLO_READERS.length} in all`)

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply.')
    return
  }

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const { error: podErr } = await db.from('listening_pods').upsert(podRow, { onConflict: 'id' })
  if (podErr) throw new Error(`pod upsert failed: ${podErr.message}`)
  console.log(`pod ${POD_ID} upserted (held).`)

  // THE DEDUPE RUNS FIRST — (pod_id, global_order) is unique, and the character
  // rows hold the very orders the solo rows are about to take.
  // IT NEVER TOUCHES AUDIO. Anything left in this pod that the
  // solo shape does not name is a character row from the first staging (…:hg20:aran).
  // A row holding a take is REFUSED, never deleted: the clip stays, the pointer
  // stays, and a human decides where it belongs. Make-before-break, on a row.
  const keep = new Set(sentences.map((r) => r.id))
  const { data: existing, error: exErr } = await db
    .from('listening_pod_sentences')
    .select('id, target_audio_id, takeg_audio_ids')
    .eq('pod_id', POD_ID)
  if (exErr) throw new Error(`existing sentence read failed: ${exErr.message}`)
  const stale = (existing || []).filter((r) => !keep.has(r.id))
  const withTakes = stale.filter((r) => r.target_audio_id || (Array.isArray(r.takeg_audio_ids) && r.takeg_audio_ids.filter(Boolean).length))
  if (withTakes.length) {
    throw new Error(`REFUSING to dedupe: ${withTakes.length} character row(s) already hold takes — ` +
      `${withTakes.map((r) => r.id).join(', ')}. Move the pointer onto the solo line by hand first; nothing here deletes audio.`)
  }
  if (stale.length) {
    const { error: delErr } = await db.from('listening_pod_sentences').delete().in('id', stale.map((r) => r.id))
    if (delErr) throw new Error(`dedupe failed: ${delErr.message}`)
    console.log(`${stale.length} character row(s) removed — no audio was linked to any of them:`)
    for (const r of stale) console.log(`  - ${r.id}`)
  }

  const { error: sErr } = await db.from('listening_pod_sentences').upsert(sentences, { onConflict: 'id' })
  if (sErr) throw new Error(`sentence upsert failed: ${sErr.message}`)
  console.log(`${sentences.length} sentence(s) upserted.`)

  console.log('\nNothing was recorded and no audio was generated. The lines are now in the booth.')
}

main().catch((err) => { console.error(err.message); process.exit(1) })
