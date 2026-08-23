#!/usr/bin/env node
/**
 * pod-switchover.cjs — promote a course's staged pod canon onto the live slug, and
 * put the old one beyond reach of a learner but not beyond reach of a rollback.
 *
 * THE POINTER IS THE SLUG THE PLAYER SERVES. It used to be `pod-0` everywhere: all five
 * player read paths — useListeningPods.ts, listeningMetaCache.ts, usePodLapScheduler.ts,
 * generateLearningScript.ts, usePodStage0.ts — hardcoded `${courseCode}:pod-0`. Since Tom's
 * ruling of 2026-08-22 ("We want to not have a Pod 0 from now on. We want this first one to
 * be called Pod 1.") those five sites share ONE resolver that prefers `pod-1` and falls back
 * to `pod-0`, so the served slug is now a per-course fact. Croatian is the first course
 * across; the other ~68 stay on `pod-0` and this tool's default keeps them byte-identical.
 * Pass --promote-to= to land the staged pod on a different slug from the one being retired.
 * The flip is still: move the finished content into the slug the player reads, and move the
 * old content out. `tools/pods/clone-pod.cjs` built the staging half of this on 2026-08-06.
 *
 * IT WILL NOT PROMOTE ONTO AN OCCUPIED SLUG. If --promote-to names a pod that already
 * exists, it refuses: archive the occupant first with `tools/pods/archive-pod.cjs`.
 *
 * MAKE BEFORE BREAK (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b). The staged
 * pod is proven complete BEFORE the live pod is touched, and the live pod is RENAMED,
 * never deleted. Audio ids are carried across untouched, so no clip is orphaned and no
 * clip is regenerated. There is no delete path in this tool except for the two now-empty
 * pod header rows whose sentences have already been moved.
 *
 * IT MIGRATES LEARNER PROGRESS, IN THE SAME TRANSACTION. `learner_pod_state.sentence_id`
 * is a SLOT key (`<course>:pod-0:SC03-S003`), and the staged canon inserts sentences
 * mid-scene, so a naive swap leaves the slot alive with a different sentence in it — the
 * learner is credited with something they never heard. Measured estate-wide on
 * 2026-08-14: 528 rows / 4,827 exposures across the 27 courses still to flip, plus the
 * 20 rows on `cym_n_for_eng` and `cym_s_for_eng` that were swapped in place on
 * 2026-08-11 and repaired on 2026-08-14.
 *
 * Since Tom's A-107 ruling (2026-08-14) the migration is no longer a thing to wait for:
 * `pod-state-migrate.cjs` plans it, this tool applies it between the archive and the
 * promote, and the whole flip is one transaction — so learner progress can never be
 * observed against a canon it was not mapped to. Rules and rationale:
 * docs/pods/pod-migration-protocol.md.
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
const { planMigration, POSITION_BOUND } = require('./pod-state-migrate.cjs')

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
/** THE SLUG THE STAGED POD LANDS ON. Defaults to LIVE, so every course that does not pass
 *  this flag behaves byte-identically to how this tool behaved before the flag existed.
 *
 *  It exists because of Tom's ruling of 2026-08-22 — "We want to not have a Pod 0 from now
 *  on. We want this first one to be called Pod 1." — which makes the convention 1-based.
 *  Croatian is the first course across: it archives `pod-0` and promotes onto `pod-1`. The
 *  other ~68 courses stay on `pod-0` until somebody decides to move them, so this is a
 *  per-course fact, not a fleet rename, and the default keeps it that way. */
const PROMOTE_TO = arg('promote-to') || LIVE
/** Override the promoted pod's title. Without it the staged title is reused with the
 *  "— UNRECORDED working copy" suffix stripped, which under the new convention would leave
 *  a pod-1 titled "Pod 0". */
const NEW_TITLE = arg('title')
/** Escape hatch for a course we have consciously decided to swap without migrating
 *  (a draft course with throwaway state). Never use it on a released course.
 *  It does NOT mean "leave the rows alone" — leaving them alone is the mis-credit.
 *  It means "discard this course's pod progress outright". */
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
 *  foreign key with no ON UPDATE CASCADE.
 *
 *  `visibility` is CARRIED FORWARD explicitly (2026-08-23). It is a real column
 *  now, and this is an insert-then-delete with a hand-written column list, so a
 *  column left off the list does not "stay as it was" — the new row silently
 *  takes the table default 'live'. A pod held back because a human is still
 *  recording it would have come out the other side of a switchover LIVE, with
 *  nothing in the output saying so. Moving a pod must never decide its
 *  reachability; only a deliberate human release does that. */
async function movePod (db, fromSlug, toSlug, title) {
  const fromId = `${COURSE}:${fromSlug}`
  const toId = `${COURSE}:${toSlug}`

  await db.query(
    `insert into listening_pods (id, course_code, pod_type, slug, pod_order, title, scene, difficulty, speakers, source_file, metadata, visibility)
     select $1, course_code, pod_type, $2, pod_order, coalesce($3, title), scene, difficulty, speakers, source_file, metadata, visibility
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
    // The promoted pod sits on PROMOTE_TO, which is LIVE unless the flip moved the
    // convention. Roll back from where the content actually is, not from where it used to go.
    const live = await podOf(PROMOTE_TO)
    if (!retired) fail(`no retired pod ${COURSE}:${RETIRED} to roll back to`)
    if (!live) fail(`no promoted pod ${COURSE}:${PROMOTE_TO} — nothing to displace`)
    if (PROMOTE_TO !== LIVE && await podOf(LIVE)) fail(`${COURSE}:${LIVE} already exists — the retired pod has nowhere to return to`)
    log(`ROLLBACK ${COURSE}: ${PROMOTE_TO} (${await countOf(PROMOTE_TO)}) → ${STAGED}, ${RETIRED} (${await countOf(RETIRED)}) → ${LIVE}`)

    // Rollback has to migrate learner progress BACK, by the same rules. Restoring the old
    // content while leaving progress mapped to the new canon is the mis-credit in reverse,
    // and it is the failure a rollback is least likely to be checked for.
    const canon = async (slug) => (await db.query(
      `select id, scene_number, sentence_number, global_order, known_text
         from listening_pod_sentences where pod_id = $1 order by global_order`, [`${COURSE}:${slug}`])).rows
    const { rows: backRows } = await db.query(
      `select learner_id, course_code, sentence_id, exposures, updated_at
         from learner_pod_state where course_code = $1 order by learner_id, sentence_id`, [COURSE])
    const backPlan = backRows.length ? planMigration(await canon(PROMOTE_TO), await canon(RETIRED), backRows) : null
    if (backPlan) {
      const t = backPlan.actions.reduce((m, a) => { m[a.action] = (m[a.action] || 0) + 1; return m }, {})
      log(`  learner progress migrated back: carry ${t.carry || 0}, keep ${t.keep || 0}, merge ${t.merge || 0}, drop ${t.drop || 0}`)
    }
    if (!APPLY) { log('\nDRY RUN — pass --apply to write.'); await db.end(); return }
    await db.query('begin')
    try {
      await movePod(db, PROMOTE_TO, STAGED, null)
      // Strip the retirement marker as the pod comes back to life, so a rolled-back course
      // is not left showing learners a title that says [RETIRED].
      await movePod(db, RETIRED, LIVE, (retired.title || '').replace(/^\[RETIRED [^\]]+\] /, '') || null)
      if (backPlan) {
        for (const a of backPlan.actions) {
          const del = () => db.query(
            `delete from learner_pod_state where learner_id=$1 and course_code=$2 and sentence_id=$3 and exposures=$4`,
            [a.learner_id, COURSE, a.sentence_id, a.exposures])
          if (a.action === 'drop' || a.action === 'merge') {
            const r = await del()
            if (r.rowCount !== 1) throw new Error(`drift: expected 1 state row for ${a.sentence_id}, got ${r.rowCount}`)
          } else {
            const target = reslug(a.to.replace(/:s\d+$/, ''), RETIRED, LIVE) + (/:s\d+$/.exec(a.to)?.[0] || '')
            if (target === a.sentence_id) continue
            const r = await del()
            if (r.rowCount !== 1) throw new Error(`drift: expected 1 state row for ${a.sentence_id}, got ${r.rowCount}`)
            await db.query(
              `insert into learner_pod_state (learner_id, course_code, sentence_id, exposures)
               values ($1,$2,$3,$4)
               on conflict (learner_id, course_code, sentence_id)
               do update set exposures = greatest(learner_pod_state.exposures, excluded.exposures)`,
              [a.learner_id, COURSE, target, a.exposures])
          }
        }
      }
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
  // Promoting onto a slug that is already occupied would merge two pods into one id.
  // The occupant must be archived out of the way first (tools/pods/archive-pod.cjs).
  if (PROMOTE_TO !== LIVE && await podOf(PROMOTE_TO)) {
    fail(`${COURSE}:${PROMOTE_TO} already exists — archive it out of the way first (tools/pods/archive-pod.cjs)`)
  }

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

  // ---- the learner-progress migration, planned before anything moves ----------
  // Planned here, against the two canons as they stand now, and applied inside the same
  // transaction as the move. `to` targets are computed against the STAGED slug and
  // reslugged onto LIVE at apply time, because promotion re-keys every sentence id.
  const { rows: stateRows } = await db.query(
    `select learner_id, course_code, sentence_id, exposures, updated_at
       from learner_pod_state where course_code = $1 order by learner_id, sentence_id`, [COURSE]
  )
  let plan = null
  if (stateRows.length) {
    const canon = async (slug) => (await db.query(
      `select id, scene_number, sentence_number, global_order, known_text
         from listening_pod_sentences where pod_id = $1 order by global_order`, [`${COURSE}:${slug}`])).rows
    plan = planMigration(await canon(LIVE), await canon(STAGED), stateRows)
    const t = plan.actions.reduce((m, a) => { m[a.action] = (m[a.action] || 0) + 1; return m }, {})
    const learners = new Set(stateRows.map(r => r.learner_id)).size
    log(`  learner state: ${stateRows.length} rows across ${learners} learners`)
    log(`    migration (${POSITION_BOUND}):`)
    log(`      carry ${t.carry || 0}, keep ${t.keep || 0}, merge ${t.merge || 0}, drop ${t.drop || 0}` +
        `  — prevents ${plan.actions.filter(a => a.miscredit_avoided).length} mis-credits`)
    // Ambiguity would make matching a guess rather than a lookup. Refuse rather than guess.
    if (plan.ambiguous > 0) blockers.push(`${plan.ambiguous} duplicate sentence texts across the two canons — content matching would be a guess, not a lookup`)
    if (FORCE_NO_MIGRATION) log('  --accept-miscredit given: learner pod progress for this course will be DISCARDED, not mapped')
  }

  if (blockers.length) {
    console.error(`REFUSED: ${COURSE} is not ready to switch:`)
    for (const b of blockers) console.error(`  - ${b}`)
    process.exit(1)
  }

  const newTitle = NEW_TITLE || (staged.title || '').replace(/ — UNRECORDED working copy, not learner-facing$/, '')
  log(`\nplan:`)
  log(`  1. ${COURSE}:${LIVE} (${liveN} sentences) → ${COURSE}:${RETIRED}   [archived, not deleted]`)
  log(`  2. ${COURSE}:${STAGED} (${s.n} sentences) → ${COURSE}:${PROMOTE_TO}      [now learner-facing]`)
  log(`     title: ${JSON.stringify(newTitle)}`)
  if (plan) log(`  3. ${stateRows.length} learner pod state rows migrated by content + position, re-keyed onto ${PROMOTE_TO}`)
  // The stamp is part of the rollback, because it is the name the old pod is archived
  // under. Print it, so the line can be copied without silently defaulting to 2026-08-14.
  log(`  rollback: node tools/pods/pod-switchover.cjs --course=${COURSE} --stamp=${STAMP}` +
      (PROMOTE_TO !== LIVE ? ` --promote-to=${PROMOTE_TO}` : '') + ` --rollback --apply`)

  if (!APPLY) { log('\nDRY RUN — pass --apply to write.'); await db.end(); return }

  await db.query('begin')
  try {
    const archived = await movePod(db, LIVE, RETIRED, `[RETIRED ${STAMP}] ${live.title || LIVE}`)
    const promoted = await movePod(db, STAGED, PROMOTE_TO, newTitle || null)
    // Post-conditions asserted inside the transaction: nothing lost, slug now live.
    const after = Number((await db.query('select count(*) c from listening_pod_sentences where pod_id = $1', [`${COURSE}:${PROMOTE_TO}`])).rows[0].c)
    if (after !== Number(s.n)) throw new Error(`post-check failed: live pod holds ${after} sentences, expected ${s.n}`)
    const kept = Number((await db.query('select count(*) c from listening_pod_sentences where pod_id = $1', [`${COURSE}:${RETIRED}`])).rows[0].c)
    if (kept !== liveN) throw new Error(`post-check failed: archived pod holds ${kept} sentences, expected ${liveN}`)

    // The learner-progress migration, in the same transaction as the move so progress is
    // never observable against a canon it was not mapped to.
    let carried = 0, dropped = 0
    if (plan) {
      for (const a of plan.actions) {
        const del = () => db.query(
          `delete from learner_pod_state where learner_id=$1 and course_code=$2 and sentence_id=$3 and exposures=$4`,
          [a.learner_id, COURSE, a.sentence_id, a.exposures])
        if (FORCE_NO_MIGRATION || a.action === 'drop' || a.action === 'merge') {
          const r = await del()
          if (r.rowCount !== 1) throw new Error(`drift: expected 1 state row for ${a.sentence_id}, got ${r.rowCount}`)
          dropped++
        } else if (a.action === 'carry' || a.action === 'keep') {
          // `to` targets were planned against the STAGED canon; promotion re-keyed every
          // sentence id onto PROMOTE_TO, so progress must follow onto the same slug.
          const target = reslug(a.to.replace(/:s\d+$/, ''), STAGED, PROMOTE_TO) + (/:s\d+$/.exec(a.to)?.[0] || '')
          if (target === a.sentence_id) continue
          const r = await del()
          if (r.rowCount !== 1) throw new Error(`drift: expected 1 state row for ${a.sentence_id}, got ${r.rowCount}`)
          await db.query(
            `insert into learner_pod_state (learner_id, course_code, sentence_id, exposures)
             values ($1,$2,$3,$4)
             on conflict (learner_id, course_code, sentence_id)
             do update set exposures = greatest(learner_pod_state.exposures, excluded.exposures)`,
            [a.learner_id, COURSE, target, a.exposures])
          carried++
        }
      }
      // No state row may be left pointing at a sentence that does not exist.
      const { rows: [orph] } = await db.query(
        `select count(*) n from learner_pod_state ls
          where ls.course_code = $1
            and not exists (select 1 from listening_pod_sentences s
                             where s.id = regexp_replace(ls.sentence_id, ':s\\d+$', ''))`, [COURSE])
      if (Number(orph.n) > 0) throw new Error(`post-check failed: ${orph.n} learner state rows point at no sentence`)
    }

    await db.query('commit')
    log(`\nswitched. archived ${archived} → ${RETIRED}, promoted ${promoted} → ${PROMOTE_TO}.`)
    if (plan) log(`learner progress: ${carried} carried, ${dropped} dropped.`)
  } catch (e) { await db.query('rollback'); throw e }

  await db.end()
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
