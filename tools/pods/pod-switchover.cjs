#!/usr/bin/env node
/**
 * pod-switchover.cjs — promote a course's staged pod canon onto the live slug, and
 * put the old one beyond reach of a learner but not beyond reach of a rollback.
 *
 * THE POINTER ALREADY EXISTS AND IT IS THE SLUG `pod-0`. Every player read path
 * hardcodes the pod id `${courseCode}:pod-0` — useListeningPods.ts:161,
 * listeningMetaCache.ts:269, usePodLapScheduler.ts:483, generateLearningScript.ts:491,
 * usePodStage0.ts:96 — so there is nothing to add and nothing for those five call
 * sites to learn. The flip is: move the finished content into the slug they already
 * read, and move the old content out. `tools/pods/clone-pod.cjs` built the staging
 * half of this on 2026-08-06 and states the same convention in its header.
 *
 * MAKE BEFORE BREAK (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b). The staged
 * pod is proven complete BEFORE the live pod is touched, and the live pod is RENAMED,
 * never deleted. Audio ids are carried across untouched, so no clip is orphaned and no
 * clip is regenerated. There is no delete path in this tool except for the two now-empty
 * pod header rows whose sentences have already been moved.
 *
 * IT REFUSES TO MIS-CREDIT. `learner_pod_state.sentence_id` is a SLOT key
 * (`<course>:pod-0:SC03-S003`), and the staged canon inserts sentences mid-scene, so a
 * naive swap leaves the slot alive with a different sentence in it — the learner is
 * credited with something they never heard. Measured estate-wide on 2026-08-14: 538
 * rows, 4,837 exposures. `cym_n_for_eng` and `cym_s_for_eng` were swapped in place on
 * 2026-08-11 and carry that damage today. So: if the course has learner pod state and
 * no migration has been recorded for it, this tool STOPS. The migration rules are in
 * docs/pods/pod-migration-rules-2026-08-14.md and are awaiting Tom's blessing; the
 * migration code does not exist yet, by design.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write. Everything happens in one transaction.
 *
 *   node tools/pods/pod-switchover.cjs --course=fra_for_eng
 *   node tools/pods/pod-switchover.cjs --course=fra_for_eng --apply
 *   node tools/pods/pod-switchover.cjs --course=fra_for_eng --rollback --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const { Client } = require('pg')

const APPLY = process.argv.includes('--apply')
const ROLLBACK = process.argv.includes('--rollback')
const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const COURSE = arg('course')
const LIVE = arg('live') || 'pod-0'
const STAGED = arg('staged') || 'pod-0-unrecorded'
const STAMP = arg('stamp') || '2026-08-14'
const RETIRED = `${LIVE}-retired-${STAMP}`
/** Escape hatch for a course we have consciously decided to swap without migrating
 *  (a draft course with throwaway state). Never use it on a released course. */
const FORCE_NO_MIGRATION = process.argv.includes('--accept-miscredit')

if (!COURSE) {
  console.error('FAILED: --course=<code> is required')
  process.exit(1)
}

const log = (...a) => console.log(...a)
const fail = (m) => { console.error(`REFUSED: ${m}`); process.exit(1) }

/** Rewrite `<course>:<oldSlug>:<rest>` → `<course>:<newSlug>:<rest>`. */
const reslug = (id, oldSlug, newSlug) => {
  const prefix = `${COURSE}:${oldSlug}:`
  if (!id.startsWith(prefix)) throw new Error(`sentence id ${id} does not sit under ${prefix}`)
  return `${COURSE}:${newSlug}:${id.slice(prefix.length)}`
}

/** Move a whole pod — header row and every sentence — from one slug to another.
 *  Insert-then-delete rather than UPDATE, because listening_pod_sentences.pod_id is a
 *  foreign key with no ON UPDATE CASCADE. */
async function movePod (db, fromSlug, toSlug, title) {
  const fromId = `${COURSE}:${fromSlug}`
  const toId = `${COURSE}:${toSlug}`

  await db.query(
    `insert into listening_pods (id, course_code, pod_type, slug, pod_order, title, scene, difficulty, speakers, source_file, metadata)
     select $1, course_code, pod_type, $2, pod_order, coalesce($3, title), scene, difficulty, speakers, source_file, metadata
       from listening_pods where id = $4`,
    [toId, toSlug, title, fromId]
  )

  const { rows } = await db.query('select id from listening_pod_sentences where pod_id = $1 order by global_order', [fromId])
  for (const r of rows) {
    await db.query('update listening_pod_sentences set pod_id = $1, id = $2 where id = $3', [toId, reslug(r.id, fromSlug, toSlug), r.id])
  }
  await db.query('delete from listening_pods where id = $1', [fromId])
  return rows.length
}

async function main () {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  const podOf = async (slug) => (await db.query('select * from listening_pods where id = $1', [`${COURSE}:${slug}`])).rows[0] || null
  const countOf = async (slug) => Number((await db.query('select count(*) c from listening_pod_sentences where pod_id = $1', [`${COURSE}:${slug}`])).rows[0].c)

  if (ROLLBACK) {
    const retired = await podOf(RETIRED)
    const live = await podOf(LIVE)
    if (!retired) fail(`no retired pod ${COURSE}:${RETIRED} to roll back to`)
    if (!live) fail(`no live pod ${COURSE}:${LIVE} — nothing to displace`)
    log(`ROLLBACK ${COURSE}: ${LIVE} (${await countOf(LIVE)}) → ${STAGED}, ${RETIRED} (${await countOf(RETIRED)}) → ${LIVE}`)
    if (!APPLY) { log('\nDRY RUN — pass --apply to write.'); await db.end(); return }
    await db.query('begin')
    try {
      await movePod(db, LIVE, STAGED, null)
      await movePod(db, RETIRED, LIVE, null)
      await db.query('commit')
      log('rolled back.')
    } catch (e) { await db.query('rollback'); throw e }
    await db.end()
    return
  }

  // ---- preconditions, all refusing loudly -------------------------------------
  const live = await podOf(LIVE)
  const staged = await podOf(STAGED)
  if (!live) fail(`no live pod ${COURSE}:${LIVE}`)
  if (!staged) fail(`no staged pod ${COURSE}:${STAGED} — nothing to promote`)
  if (await podOf(RETIRED)) fail(`${COURSE}:${RETIRED} already exists — this course looks already switched`)

  const { rows: [s] } = await db.query(
    `select count(*) n,
            count(*) filter (where coalesce(btrim(target_text),'') = '') no_text,
            count(*) filter (where target_text_draft) draft,
            count(*) filter (where target_audio_id is null) no_target_audio,
            count(*) filter (where known_audio_id is null) no_known_audio
       from listening_pod_sentences where pod_id = $1`,
    [`${COURSE}:${STAGED}`]
  )
  const liveN = await countOf(LIVE)

  log(`${COURSE}: live ${LIVE}=${liveN} sentences, staged ${STAGED}=${s.n} sentences`)
  log(`  staged readiness: ${s.no_text} untranslated, ${s.draft} draft, ${s.no_target_audio} without target audio, ${s.no_known_audio} without known audio`)

  const blockers = []
  if (Number(s.n) === 0) blockers.push('staged pod has no sentences')
  if (Number(s.no_text) > 0) blockers.push(`${s.no_text} staged sentences have no target text`)
  if (Number(s.draft) > 0) blockers.push(`${s.draft} staged sentences are still marked draft`)
  if (Number(s.no_target_audio) > 0) blockers.push(`${s.no_target_audio} staged sentences have no target audio`)

  // The mis-credit gate. See the header.
  const { rows: [st] } = await db.query(
    'select count(*) rows, count(distinct learner_id) learners from learner_pod_state where course_code = $1', [COURSE]
  )
  if (Number(st.rows) > 0) {
    log(`  learner state: ${st.rows} rows across ${st.learners} learners`)
    if (!FORCE_NO_MIGRATION) {
      blockers.push(
        `${st.rows} learner pod state rows exist and no migration has been applied — ` +
        'promoting now would credit learners with sentences they have not heard ' +
        '(see docs/pods/pod-migration-rules-2026-08-14.md)'
      )
    } else {
      log('  --accept-miscredit given: proceeding WITHOUT migrating learner state')
    }
  }

  if (blockers.length) {
    console.error(`REFUSED: ${COURSE} is not ready to switch:`)
    for (const b of blockers) console.error(`  - ${b}`)
    process.exit(1)
  }

  const newTitle = (staged.title || '').replace(/ — UNRECORDED working copy, not learner-facing$/, '')
  log(`\nplan:`)
  log(`  1. ${COURSE}:${LIVE} (${liveN} sentences) → ${COURSE}:${RETIRED}   [archived, not deleted]`)
  log(`  2. ${COURSE}:${STAGED} (${s.n} sentences) → ${COURSE}:${LIVE}      [now learner-facing]`)
  log(`  rollback: node tools/pods/pod-switchover.cjs --course=${COURSE} --rollback --apply`)

  if (!APPLY) { log('\nDRY RUN — pass --apply to write.'); await db.end(); return }

  await db.query('begin')
  try {
    const archived = await movePod(db, LIVE, RETIRED, `[RETIRED ${STAMP}] ${live.title || LIVE}`)
    const promoted = await movePod(db, STAGED, LIVE, newTitle || null)
    // Post-conditions asserted inside the transaction: nothing lost, slug now live.
    const after = Number((await db.query('select count(*) c from listening_pod_sentences where pod_id = $1', [`${COURSE}:${LIVE}`])).rows[0].c)
    if (after !== Number(s.n)) throw new Error(`post-check failed: live pod holds ${after} sentences, expected ${s.n}`)
    const kept = Number((await db.query('select count(*) c from listening_pod_sentences where pod_id = $1', [`${COURSE}:${RETIRED}`])).rows[0].c)
    if (kept !== liveN) throw new Error(`post-check failed: archived pod holds ${kept} sentences, expected ${liveN}`)
    await db.query('commit')
    log(`\nswitched. archived ${archived}, promoted ${promoted}.`)
  } catch (e) { await db.query('rollback'); throw e }

  await db.end()
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
