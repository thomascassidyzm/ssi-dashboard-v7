#!/usr/bin/env node
/**
 * hrv-pod0-contrast-cast-2026-08-21.cjs — the ONE scoped correction that has to sit
 * on top of tools/pod-recast.cjs for the Croatian pod-0 pilot, and why.
 *
 * WHAT RAN FIRST. `node tools/pod-recast.cjs --course=hrv_for_eng
 * --pod=hrv_for_eng:pod-0-unrecorded --apply` collapsed the stored cast from FIVE
 * target voices to Tom's approved TWO (Srećko + Gabrijela, ear-verified and approved
 * 2026-08-17, docs/pods/t21-casting-rulings-2026-08-17.md). That was the right tool
 * and it did the right thing: every ElevenLabs voice is gone from the stored cast.
 *
 * WHAT IT COULD NOT KNOW. pod-recast defaults a speaker with no explicit (F)/(M)
 * marker to MALE, and this pod has seven of them — Narrator, Passenger, Customer,
 * Customer 1, Customer 2, Customer 3, Assistant. Defaulted male, SEVEN SCENES end up
 * with every character on one voice:
 *
 *     8 Pub (16 lines), 9 Restaurant (18), 10 Shop (10), 12 Chemist's (10),
 *     13 Directions (11), 14 Taxi (10)   — plus 7 Coffee Shop inverted to all-female
 *
 * That breaks Tom's rider on Aran's voicing note, quoted verbatim in
 * docs/pods/pod0-english-canonical.md: "a minimum of two voices where needed,
 * especially for less-well-served TTS languages." A sixteen-line pub scene delivered
 * as a monologue is exactly the case the rider is about. The tool's own remedy —
 * "add (F) or (M) in the markdown speaker column, then re-sync" — is not available
 * here: this pod has no markdown, and a re-sync DELETEs and re-INSERTs every sentence
 * row (tools/pod-sync.cjs upsert semantics), which would take the 113 existing clip
 * links with it.
 *
 * THE RULE THIS APPLIES, stated so it can be argued with: within a scene, the
 * customer/visitor side and the service/local side take DIFFERENT voices. That single
 * rule fixes every affected scene and leaves all 22 scenes two-voiced.
 *
 *   Barista      -> m  (Srećko)     so 3 Coffee-at-3pm contrasts Sarah, and 7 contrasts the customers
 *   Customer     -> f  (Gabrijela)  contrasts Assistant (10) and Pharmacist (12)
 *   Customer 1/2/3 -> f (Gabrijela) contrasts Barista (7), Bartender (8), Waiter (9)
 *   Tourist      -> f  (Gabrijela)  contrasts Local (13)
 *   Driver       -> f  (Gabrijela)  contrasts Passenger (14)
 *
 * GENDER IS READ OFF THE TEXT, NOT CHOSEN. Croatian marks the speaker's gender audibly
 * in the past tense and in predicate adjectives, so a voice that disagrees with its own
 * line is a defect a learner can hear. Every assignment above is forced by what the
 * character actually says, and the already-recorded lines are the authority because
 * they are the ones Aran field-tested:
 *
 *   Learner    m   `Nisam siguran`, `da bih se ispravno izrazio`, `Stvarno sam sretan` (22)
 *   Friend     m   `sutra sam zauzet` (4), `Impresioniran sam` (22)
 *   Customer   m   `Jako sam zahvalan`, `da bih bolje govorio` (10)
 *   Customer 1 f   `Željela bih`, `Nisam sigurna` (7, 8)
 *   Customer 3 f   `Željela bih veliku čašu` (8)
 *   Sarah      f   `Željela bih kavu` (3), `jako umorna` (5)
 *   Anna       f · James m   `nisam te razumio` (6)
 *   Assistant, Pharmacist, Narrator, Tourist, Driver, Receptionist, Barista, Bartender,
 *   Waiter, Local, Guest, Passenger — no gendered token anywhere, so free for contrast.
 *
 * Where the text left a character free, contrast decided it: Assistant and Pharmacist go
 * female so the masculine Customer has someone to talk to in scenes 10 and 12, and the
 * Narrator goes female so scenes 15-21 — where the masculine Learner is otherwise the
 * only voice — carry a second one on the drill tail. The Narrator is already on
 * Gabrijela, so that costs nothing.
 *
 * THE ONE RESIDUAL, flagged rather than hidden: SCENE 22 IS TWO MEN. The Learner and the
 * Friend are both masculine in Aran's recorded text, so the flagship eleven-line "first
 * conversation" runs on a single voice, and no casting choice can fix it — only a text
 * change can, and that text is his. Two words would do it (`zauzeta` in scene 4,
 * `Impresionirana sam` in scene 22, making the Friend female), but re-gendering a
 * field-tested character is his call and not a model's. Every other scene in the pod
 * carries two voices. Job #823 separately recommended re-gendering the Learner instead;
 * that is rejected here because it would mean rewriting the FRIEND's lines about him
 * (`da si spreman`, `Trebao bi već biti samopouzdan`) — more of his text, not less.
 * The five UNRECORDED drafts in scenes 15-21 that drafted the Learner feminine are
 * corrected to masculine to agree with scene 22, which is the cheap half of #823's finding.
 *
 * MAKE BEFORE BREAK. This tool writes `listening_pods.speakers` and, with
 * --null-stale, NULLS `target_audio_id` on rows of THIS POD whose current clip is not
 * on the voice the corrected cast resolves. Nulling a pointer is not a deletion: all
 * 113 existing clips are course_audio rows SHARED with the live `hrv_for_eng:pod-0`,
 * which keeps its own pointers and keeps playing. No course_audio row is touched,
 * ever. The nulled rows are then re-rendered by the phase8 pod-audio path, which only
 * generates where the id is null.
 *
 *   node tools/pods/hrv-pod0-contrast-cast-2026-08-21.cjs                 # dry run
 *   node tools/pods/hrv-pod0-contrast-cast-2026-08-21.cjs --apply
 *   node tools/pods/hrv-pod0-contrast-cast-2026-08-21.cjs --apply --null-stale
 *
 * Refuses to run against any pod id but the working copy. Vocabulary: known / target / seed.
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const POD_ID = 'hrv_for_eng:pod-0-unrecorded'
const LIVE_POD = 'hrv_for_eng:pod-0'

const SRECKO = { name: 'Srećko', locale: 'hr-HR', provider: 'azure', voice_id: 'hr-HR-SreckoNeural' }
const GABRIJELA = { name: 'Gabrijela', locale: 'hr-HR', provider: 'azure', voice_id: 'hr-HR-GabrijelaNeural' }

/** speaker key -> the gender/voice the contrast rule requires. */
const CONTRAST = {
  'Barista': 'm',
  'Customer': 'm',   // `Jako sam zahvalan`, `da bih bolje govorio` (scene 10)
  'Customer 1': 'f',
  'Customer 2': 'f',
  'Customer 3': 'f',
  'Tourist': 'f',
  'Driver': 'f',
  'Assistant': 'f',
  'Pharmacist': 'f',
  // The Learner block — see "GENDER IS READ OFF THE TEXT" below.
  'Learner': 'm',
  'Narrator': 'f',
  'Friend': 'm',
}

const APPLY = process.argv.includes('--apply')
const NULL_STALE = process.argv.includes('--null-stale')

/** The two approved voices are the only legal target voices. Anything else is stale. */
const normVoice = (v) => String(v || '').replace(/^azure_/, '')

/** Mirrors phase8 resolvePodSpeakerVoice / tools/pod-sync canonicalSpeakerName. */
const canonicalSpeakerName = (s) => (s || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()

async function main () {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  const log = { pod_id: POD_ID, applied: APPLY, null_stale: NULL_STALE, cast_changes: [], nulled: [], kept: [] }

  const { rows: podRows } = await db.query('select id, speakers from listening_pods where id = $1', [POD_ID])
  if (!podRows.length) throw new Error(`pod not found: ${POD_ID}`)
  const speakers = JSON.parse(JSON.stringify(podRows[0].speakers || {}))

  // ---- 1. the cast correction -------------------------------------------------
  for (const [key, gender] of Object.entries(CONTRAST)) {
    const entry = speakers[key]
    if (!entry) { log.cast_changes.push({ speaker: key, skipped: 'not in cast' }); continue }
    const want = gender === 'f' ? GABRIJELA : SRECKO
    const before = entry.target ? `${entry.target.voice_id}|${entry.gender}` : '(none)'
    if (normVoice(entry.target && entry.target.voice_id) === want.voice_id && entry.gender === gender) {
      log.cast_changes.push({ speaker: key, unchanged: before }); continue
    }
    entry.gender = gender
    entry.target = { ...want }
    log.cast_changes.push({ speaker: key, before, after: `${want.voice_id}|${gender}` })
  }

  // Nothing may leave this pass on a voice other than the two Tom approved.
  const illegal = Object.entries(speakers)
    .filter(([, e]) => e && e.target && ![SRECKO.voice_id, GABRIJELA.voice_id].includes(normVoice(e.target.voice_id)))
    .map(([k, e]) => `${k}=${e.target.voice_id}`)
  if (illegal.length) throw new Error(`REFUSING: cast still holds unapproved target voices: ${illegal.join(', ')}`)

  console.log(`\n${POD_ID} — contrast cast correction${APPLY ? ' (APPLY)' : ' (DRY RUN)'}`)
  for (const c of log.cast_changes) {
    if (c.skipped) console.log(`  ·  ${c.speaker.padEnd(12)} skipped — ${c.skipped}`)
    else if (c.unchanged) console.log(`  ·  ${c.speaker.padEnd(12)} already ${c.unchanged}`)
    else console.log(`  ✎  ${c.speaker.padEnd(12)} ${c.before}  ->  ${c.after}`)
  }

  if (APPLY) {
    // Drift guard: the cast must not have moved since it was read.
    const { rows: now } = await db.query('select speakers from listening_pods where id = $1', [POD_ID])
    if (JSON.stringify(now[0].speakers) !== JSON.stringify(podRows[0].speakers)) {
      throw new Error('DRIFT: listening_pods.speakers changed since it was read — nothing written')
    }
    await db.query('update listening_pods set speakers = $1, updated_at = now() where id = $2', [speakers, POD_ID])
    console.log('  cast written.')
  }

  // ---- 2. stale-pointer sweep -------------------------------------------------
  // A row is stale when its clip is not on the voice the corrected cast resolves for
  // its speaker. Nulling the POINTER only; the clip row is shared with the live pod.
  const { rows: sents } = await db.query(
    `select s.id, s.speaker, s.target_audio_id, a.voice_id
       from listening_pod_sentences s
       left join course_audio a on a.id = s.target_audio_id
      where s.pod_id = $1 and s.target_audio_id is not null
      order by s.global_order`, [POD_ID])

  for (const r of sents) {
    const entry = speakers[canonicalSpeakerName(r.speaker)] || speakers[r.speaker] || speakers._default
    const want = entry && entry.target ? entry.target.voice_id : null
    if (want && normVoice(r.voice_id) === want) { log.kept.push({ id: r.id, voice: r.voice_id }); continue }
    log.nulled.push({ id: r.id, speaker: r.speaker, was_voice: r.voice_id, was_audio_id: r.target_audio_id, wanted: want })
  }

  console.log(`\n  clips on the corrected cast, kept   : ${log.kept.length}`)
  console.log(`  clips on a superseded voice, stale : ${log.nulled.length}`)
  const byVoice = log.nulled.reduce((m, n) => { m[n.was_voice] = (m[n.was_voice] || 0) + 1; return m }, {})
  console.log(`  stale by voice: ${JSON.stringify(byVoice)}`)

  if (APPLY && NULL_STALE && log.nulled.length) {
    // Prove, before writing, that every clip we are unlinking is still reachable
    // from the live pod. If one is not, this pass would be the only thing pointing
    // at it and unlinking becomes a loss — refuse rather than orphan it.
    const ids = log.nulled.map(n => n.was_audio_id)
    const { rows: live } = await db.query(
      `select distinct target_audio_id from listening_pod_sentences
        where pod_id = $1 and target_audio_id = any($2::uuid[])`, [LIVE_POD, ids])
    const reachable = new Set(live.map(r => r.target_audio_id))
    const orphans = log.nulled.filter(n => !reachable.has(n.was_audio_id))
    if (orphans.length) {
      throw new Error(`REFUSING: ${orphans.length} clip(s) would be unreachable after unlink (not held by ${LIVE_POD}): ${orphans.slice(0, 5).map(o => o.id).join(', ')}`)
    }
    await db.query('begin')
    try {
      for (const n of log.nulled) {
        const r = await db.query(
          `update listening_pod_sentences set target_audio_id = null, updated_at = now()
            where id = $1 and target_audio_id = $2`, [n.id, n.was_audio_id])
        if (r.rowCount !== 1) throw new Error(`drift: expected 1 row for ${n.id}, got ${r.rowCount}`)
      }
      await db.query('commit')
      console.log(`  unlinked ${log.nulled.length} stale pointers (clips themselves untouched and still served by ${LIVE_POD}).`)
    } catch (e) { await db.query('rollback'); throw e }
  } else if (log.nulled.length) {
    console.log('  DRY RUN — no pointer nulled. Re-run with --apply --null-stale.')
  }

  const out = path.join(__dirname, '..', '..', 'docs', 'pods',
    `hrv-pod0-contrast-cast-2026-08-21-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`  wrote ${out}\n`)
  await db.end()
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
