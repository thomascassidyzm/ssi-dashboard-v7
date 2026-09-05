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
 * IT WILL NOT PROMOTE AN UNCAST POD. Since Part B of Tom's Pod 1 rulings (2026-08-23)
 * the staged pod must be cast PER CONVERSATION before it can go live: zero same-voice
 * exchange pairs, exactly two voices. movePod() carries `speakers` across verbatim, so
 * without this gate a flip promotes whatever cast the staged pod happens to hold — which
 * is why casting has been a separate recast sweep after every flip. The measurement lives
 * in `pod-cast-gate.cjs` and is shared with the solver (`pod1-percall-recast.cjs`).
 * Escape hatch, for a pod consciously shipping otherwise: --accept-uncast-pod.
 *
 * IT FOLDS IN WRITES THAT LAND WHILE IT IS WORKING. The migration is PLANNED from a
 * snapshot of `learner_pod_state` taken before the transaction opens, so a learner who
 * is mid-session while the flip runs can write rows the plan has never seen. On
 * 2026-08-24 that happened to nld_for_eng: learner 33344e24 wrote 14 rows against the
 * pod-0 canon around the 08:34:44Z switchover, and they were left keyed to a slug that
 * no longer existed — repaired by hand afterwards (job #227,
 * docs/pods/nld-inflight-session-repair-2026-08-24-applied-log.json).
 * So: immediately before the plan is applied — after the pods have moved, inside the
 * same transaction — every state row touched since the snapshot is re-read. Rows the
 * plan already knows about have their exposures refreshed (GREATEST then protects any
 * row that got BETTER in the window); rows it has never seen are run through one more
 * planMigration pass, retired canon → promoted canon, and folded into the same commit.
 * One extra pass, no retry loop, nothing for an operator to watch.
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
const { realHumanLearners } = require('../../services/shared/learner-counts.cjs')
const { checkPodCast, loadPodForCastCheck, sameVoiceAddress } = require('./pod-cast-gate.cjs')
const { findInheritedSplitAudio, SPLIT_AUDIO_FIELDS } = require('./split-audio-inheritance.cjs')
const { planPodLegoRemap } = require('./pod-legos-remap.cjs')
const { assertPodStateConservation } = require('./podStateConservation.cjs')
const fs = require('fs')
const path = require('path')

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
// --rehearsal waives the staged pod's CONTENT-readiness blockers (untranslated,
// draft, unrecorded) so that the progress migration itself can be proved end to
// end on a throwaway clone. Those blockers exist to stop a half-empty pod
// reaching a learner; a zzz_ scratch course has no learners and is dropped when
// the rehearsal ends. It is therefore refused outright on anything else, so it
// can never waive a gate on a real course. Every OTHER blocker still binds —
// duplicate-text ambiguity in particular, which is a migration correctness gate,
// not a content one.
const REHEARSAL = process.argv.includes('--rehearsal')
/** THE CAST GATE'S ONLY ESCAPE HATCH (2026-08-23, Part B of Tom's Pod 1 rulings).
 *  movePod() carries `speakers` across verbatim, so before this gate existed a flip
 *  promoted whatever cast the staged pod happened to hold — including none — and the
 *  casting had to be bolted on afterwards by a separate recast sweep, per flip, forever.
 *  The gate is ON BY DEFAULT and refuses the flip; this flag is for the conscious
 *  exception (a pod deliberately shipping on one voice), and it says so in the log. */
const ACCEPT_UNCAST = process.argv.includes('--accept-uncast-pod')
/** THE SPLIT-AUDIO GATE'S ONLY ESCAPE HATCH (2026-08-24). See the gate itself below. */
const ACCEPT_INHERITED_SPLIT = process.argv.includes('--accept-inherited-split-audio')

// Argument validation belongs to the CLI, not to the module: `planInflightFold` is
// exported for its unit tests, and a require() must not exit the process.
if (require.main === module) {
  if (!COURSE) {
    console.error('FAILED: --course=<code> is required')
    process.exit(1)
  }
  if (REHEARSAL && !/^zzz_/.test(COURSE)) {
    console.error(`FAILED: --rehearsal is only accepted on a zzz_ scratch course, not '${COURSE}'`)
    process.exit(1)
  }
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
/**
 * CARRY THE PROVENANCE POINTERS TOO (2026-09-03, job #157's residue).
 *
 * `pod_legos.first_seen_sentence` is a slot key like the rest, and this tool never
 * carried it — so all 22 courses that crossed to `pod-1` left it naming ids that no
 * longer existed. Measured 2026-09-03: 7,802 dangling rows across 19 courses,
 * repaired in one pass by `repair-pod-legos-first-seen.cjs`. Doing the carry HERE is
 * what stops it accruing one course at a time forever.
 *
 * Nothing joins on the column, so this is provenance, not plumbing — which is why it
 * is not a gate and never aborts the flip on its own. It runs inside the same
 * transaction as the pod move, using the same proved-remap rule
 * (`pod-legos-remap.cjs`): a row is rewritten only when the rewritten id already
 * exists, never guessed.
 */
async function carryPodLegos (db, course, fromSlug, toSlug) {
  const legos = (await db.query(
    `select id, first_seen_sentence from pod_legos
      where first_seen_sentence like $1`, [`${course}:${fromSlug}:%`])).rows
  if (!legos.length) return 0
  const live = new Set((await db.query(
    `select id from listening_pod_sentences where pod_id = $1`, [`${course}:${toSlug}`])).rows.map(r => r.id))
  const { remap } = planPodLegoRemap({ legos, liveSentenceIds: live })
  for (const r of remap) {
    await db.query(
      `update pod_legos set first_seen_sentence = $1 where id = $2 and first_seen_sentence = $3`,
      [r.to, r.legoId, r.from])
  }
  return remap.length
}

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

/**
 * THE GRACE GUARD, as a pure function so it can be tested without a database.
 *
 * `stragglers` are the `learner_pod_state` rows for this course that were written or
 * updated after the migration plan's snapshot was taken — read back inside the
 * transaction, after the pods have moved and before the plan is applied. Two kinds:
 *
 *   1. a row the plan ALREADY covers, whose exposures moved in the window. The planned
 *      action's exposures are stale, and the delete-by-exact-exposures would abort the
 *      whole flip on `drift:`. Reported as `refresh` so the caller can restamp the
 *      action; the insert's `greatest(...)` then keeps whichever count is higher, so a
 *      row that got BETTER in the window is never walked backwards.
 *   2. a row the plan has NEVER seen — the in-flight session case. It is keyed under the
 *      slug that has just been archived, so it is rekeyed onto the retired slug and run
 *      through planMigration against the promoted canon: exactly the mapping the flip
 *      itself would have given it had it existed a second earlier.
 *
 * Rows already sitting on the promoted slug are left alone (`ignored`) — they are
 * already where they belong. Anything under neither slug is returned as `unknown` and
 * the caller must refuse rather than guess.
 */
function planInflightFold ({ course, liveSlug, retiredSlug, promoteTo, plannedKeys, stragglers, retiredCanon, promotedCanon }) {
  const livePrefix = `${course}:${liveSlug}:`
  const promotedPrefix = `${course}:${promoteTo}:`
  const suffixOf = (id) => /:s\d+$/.exec(id)?.[0] || ''
  const base = (id) => id.replace(/:s\d+$/, '')

  const refresh = []      // rows the plan covers whose exposures moved
  const unseen = []       // rows the plan has never seen, on the old canon
  const ignored = []      // rows already on the promoted canon
  const unknown = []      // rows under neither slug — caller refuses

  for (const r of stragglers) {
    const key = `${r.learner_id}|${r.sentence_id}`
    if (plannedKeys.has(key)) {
      if (Number(plannedKeys.get(key)) !== Number(r.exposures)) refresh.push(r)
      continue
    }
    // Order matters when promoteTo === liveSlug (the default): the two prefixes are the
    // same string, and a learner mid-session was necessarily served the OLD canon, so the
    // old reading wins. When they differ, a row on the promoted slug is genuinely new.
    if (r.sentence_id.startsWith(livePrefix)) unseen.push(r)
    else if (r.sentence_id.startsWith(promotedPrefix)) ignored.push(r)
    else unknown.push(r)
  }

  let actions = []
  if (unseen.length) {
    // Rekey the lookups onto the retired slug — that is where the canon those rows were
    // written against now lives — and reuse planMigration verbatim. `to` therefore comes
    // back already keyed on the promoted slug; no reslugging afterwards.
    // planMigration spreads the input row onto every action, so `stored_sentence_id`
    // rides along with it — the row is deleted by the id actually in the table, never by
    // the rekeyed one used for the lookup.
    const rekeyed = unseen.map(r => ({
      ...r,
      stored_sentence_id: r.sentence_id,
      sentence_id: `${course}:${retiredSlug}:${base(r.sentence_id).slice(livePrefix.length)}${suffixOf(r.sentence_id)}`
    }))
    actions = planMigration(retiredCanon, promotedCanon, rekeyed).actions
    if (actions.some(a => !a.stored_sentence_id)) throw new Error('in-flight fold: action lost its stored sentence id')
  }
  return { actions, refresh, ignored, unknown }
}

/**
 * The staged pod's readiness blockers, as a pure function of one count row.
 *
 * Extracted from main() on 2026-09-02 so that it can be exercised by a test, because it
 * was NOT being exercised and it had a hole: `no_known_audio` was counted, printed in the
 * readiness line, and then silently dropped on the floor — never pushed onto `blockers` —
 * and `known_text` emptiness was not counted at all. A course could be promoted onto a live
 * slug with a complete target side and a SILENT KNOWN SIDE, and nothing would refuse.
 * The known side is half of what a learner hears; it refuses as loudly as the target side now.
 *
 * All four content blockers are waived under --rehearsal, exactly as the target-side pair
 * always was: a rehearsal proves the progress migration on a throwaway clone, and making the
 * known side bind there would break rehearsals for no safety gain (Tom's framing, 2026-09-02).
 * The zero-sentence blocker is NOT content readiness and binds in every mode.
 */
function readinessBlockers (counts, { rehearsal = false } = {}) {
  const num = (v) => Number(v || 0)
  const blockers = []
  if (num(counts.n) === 0) blockers.push('staged pod has no sentences')
  if (rehearsal) return blockers
  if (num(counts.no_text) > 0) blockers.push(`${counts.no_text} staged sentences have no target text`)
  if (num(counts.draft) > 0) blockers.push(`${counts.draft} staged sentences are still marked draft`)
  if (num(counts.no_target_audio) > 0) blockers.push(`${counts.no_target_audio} staged sentences have no target audio`)
  if (num(counts.no_known_text) > 0) blockers.push(`${counts.no_known_text} staged sentences have no known text`)
  if (num(counts.no_known_audio) > 0) blockers.push(`${counts.no_known_audio} staged sentences have no known audio`)
  return blockers
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
      await carryPodLegos(db, COURSE, PROMOTE_TO, LIVE)
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
            count(*) filter (where coalesce(btrim(known_text),'') = '') no_known_text,
            count(*) filter (where target_text_draft) draft,
            count(*) filter (where target_audio_id is null) no_target_audio,
            count(*) filter (where known_audio_id is null) no_known_audio
       from listening_pod_sentences where pod_id = $1`,
    [`${COURSE}:${STAGED}`]
  )
  const liveN = await countOf(LIVE)

  log(`${COURSE}: live ${LIVE}=${liveN} sentences, staged ${STAGED}=${s.n} sentences`)
  log(`  staged readiness: ${s.no_text} untranslated, ${s.draft} draft, ${s.no_target_audio} without target audio, ` +
      `${s.no_known_text} without known text, ${s.no_known_audio} without known audio`)

  const blockers = readinessBlockers(s, { rehearsal: REHEARSAL })
  if (REHEARSAL) {
    log(`  --rehearsal: content-readiness blockers WAIVED on scratch course ${COURSE} ` +
        `(${s.no_text} untranslated, ${s.draft} draft, ${s.no_target_audio} unrecorded, ` +
        `${s.no_known_text} without known text, ${s.no_known_audio} without known audio). ` +
        'Migration-correctness blockers still bind.')
  }

  // ---- the cast gate ---------------------------------------------------------
  // The pod being promoted must already be cast per conversation: ZERO same-voice
  // exchange pairs and EXACTLY TWO voices (Tom, 2026-08-23 — "there's always male
  // talking to female, so that two voices can actually do the whole thing, rather
  // than per character, which was the problem previously").
  //
  // Measured here rather than SOLVED here on purpose. Re-solving inside the flip
  // would mean rewriting speaker labels and courses.voice_config.podCast in the
  // same transaction that moves learner progress — three unrelated failure modes
  // sharing one commit — and it would swallow the recast's own blockers (a
  // non-bipartite exchange graph, glued rows inside the relabel set) that need a
  // human. The solver stays tools/pods/pod1-percall-recast.cjs; this refuses to
  // promote anything it has not been run on. Both share one definition of an
  // exchange edge, in pod-cast-gate.cjs, so they cannot drift.
  //
  // NOT applied on --rollback: a rollback restores a pod that was already live,
  // and a gate that can block the way back is worse than the thing it prevents.
  const castCheck = checkPodCast(await loadPodForCastCheck(db, `${COURSE}:${STAGED}`))
  log(`  staged cast: ${castCheck.voicesInUse.length} voice(s) [${castCheck.voicesInUse.join(', ')}], ` +
      `${castCheck.sameVoicePairs.length} same-voice exchange pair(s) across ${castCheck.exchangePairs} exchange pair(s), ` +
      `${castCheck.uncast.length} uncast character(s)`)
  // A bare count is exactly the shape the addressing rule bans (Tom, 2026-08-24) —
  // it reads as a property of the SCRIPT, so it travels to a differently-cast pod.
  // Each pair is therefore named as (course, scene, speaker-pair, voice).
  for (const p of castCheck.sameVoicePairs) log(`    same-voice: ${sameVoiceAddress(p)}`)
  if (!castCheck.ok) {
    if (ACCEPT_UNCAST) {
      log('  --accept-uncast-pod given: promoting a pod that is NOT cast-correct. Reasons:')
      for (const f of castCheck.failures) log(`    - ${f}`)
    } else {
      for (const f of castCheck.failures) blockers.push(`cast: ${f}`)
      blockers.push('run tools/pods/pod1-percall-recast.cjs --pod=' + `${COURSE}:${STAGED}` +
        ' --apply first (or pass --accept-uncast-pod to promote an uncast pod deliberately)')
    }
  }

  // ---- the split-audio gate --------------------------------------------------
  // A row has SIX audio slots. The cast gate above reads the two whole-turn ones,
  // which is why the 22-course pod-1 fleet flipped green on 2026-08-22 carrying
  // split arrays inherited positionally from the pod being retired. Where the
  // scene running order changed between the two canons — pod-0 scene 15 became
  // pod-1 scene 22 on ita_for_eng — those clips play AND display a different
  // conversation, in the retired pod's cast.
  //
  // The test is exact, not a heuristic: a staged row's split slot byte-identical
  // to the SAME (scene, sentence) slot on the pod being retired, while the text at
  // that slot has changed. No text similarity is involved, so it is script-safe —
  // the first blast-radius pass read a false 0% for jpn/zho because it stripped
  // non-Latin script. Definition shared with the aligner in
  // tools/pods/split-audio-inheritance.cjs, so the two cannot drift.
  //
  // Measured, not repaired, here: nulling a split array changes a learner's
  // progress key (`<row.id>:s<k>` → `<row.id>`), so the repair belongs to
  // tools/pods/repair-split-array-inheritance.cjs, which gates on exactly that.
  // NOT applied on --rollback, for the same reason the cast gate is not.
  const splitAudioRows = async (slug) => (await db.query(
    `select id, scene_number, sentence_number, target_text, known_text, ${SPLIT_AUDIO_FIELDS.join(', ')}
       from listening_pod_sentences where pod_id = $1 order by global_order`, [`${COURSE}:${slug}`])).rows
  const inherited = findInheritedSplitAudio(await splitAudioRows(LIVE), await splitAudioRows(STAGED))
  log(`  staged split audio: ${inherited.length} slot(s) inherited positionally from ${LIVE}`)
  if (inherited.length) {
    const byField = inherited.reduce((m, f) => { m[f.field] = (m[f.field] || 0) + 1; return m }, {})
    const rowsAffected = new Set(inherited.map(f => f.id)).size
    if (ACCEPT_INHERITED_SPLIT) {
      log(`  --accept-inherited-split-audio given: promoting ${rowsAffected} row(s) whose split ` +
          `audio belongs to the retired canon ${JSON.stringify(byField)}`)
    } else {
      blockers.push(`${inherited.length} split-audio slot(s) across ${rowsAffected} staged row(s) ` +
        `are byte-identical to ${LIVE}'s same (scene, sentence) slot while the text there has ` +
        `changed ${JSON.stringify(byField)} — the learner would hear and READ the retired pod's ` +
        'conversation')
      blockers.push(`run tools/pods/repair-split-array-inheritance.cjs ${COURSE}:${STAGED} --apply ` +
        'first (or pass --accept-inherited-split-audio to promote them deliberately)')
      for (const f of inherited.slice(0, 5)) {
        log(`    e.g. SC${f.scene_number}-S${f.sentence_number} ${f.field} (${f.changed} changed)`)
      }
    }
  }

  // ---- the learner-progress migration, planned before anything moves ----------
  // Planned here, against the two canons as they stand now, and applied inside the same
  // transaction as the move. `to` targets are computed against the STAGED slug and
  // reslugged onto LIVE at apply time, because promotion re-keys every sentence id.
  // The snapshot's high-water mark, taken BEFORE the snapshot rather than after: a row
  // written in between then shows up in both, and the fold treats an already-planned row
  // at unchanged exposures as a no-op. The other order would lose it entirely.
  const { rows: [{ t: planAt }] } = await db.query('select now() t')
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
    const distinctLearnerIds = new Set(stateRows.map(r => r.learner_id)).size
    // NOT a headcount: distinct learner_ids on the raw progress rows. See
    // services/shared/learner-counts.cjs for the honest real-human-learner figure.
    // realHumanLearners() refuses a zzz_ scratch code outright, which is correct
    // for reporting — a fixture must never be counted as a person — but it is the
    // code rehearse-switchover.cjs runs under, so calling it unconditionally made
    // the rehearsal tool unusable on any course that HAS progress to rehearse
    // (i.e. every course worth rehearsing). A scratch course has no real humans by
    // definition, so say that instead of asking.
    const isScratch = /^zzz_/.test(COURSE)
    const { humans, excluded } = isScratch
      ? { humans: 0, excluded: { scratch_rehearsal_fixture: distinctLearnerIds } }
      : await realHumanLearners(db, COURSE)
    log(`  learner state: ${stateRows.length} rows across ${distinctLearnerIds} distinct learner ids ` +
        `(${humans} real human learners — excluded ${JSON.stringify(excluded)})`)
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
    const legosCarried = await carryPodLegos(db, COURSE, LIVE, PROMOTE_TO)
    // Post-conditions asserted inside the transaction: nothing lost, slug now live.
    const after = Number((await db.query('select count(*) c from listening_pod_sentences where pod_id = $1', [`${COURSE}:${PROMOTE_TO}`])).rows[0].c)
    if (after !== Number(s.n)) throw new Error(`post-check failed: live pod holds ${after} sentences, expected ${s.n}`)
    const kept = Number((await db.query('select count(*) c from listening_pod_sentences where pod_id = $1', [`${COURSE}:${RETIRED}`])).rows[0].c)
    if (kept !== liveN) throw new Error(`post-check failed: archived pod holds ${kept} sentences, expected ${liveN}`)
    // The cast gate again, re-derived from the promoted pod inside the transaction.
    // The pre-flight check read the staged pod; this reads what a learner would
    // actually get, so a bug in movePod's cast carry-across cannot land silently.
    if (!ACCEPT_UNCAST) {
      const after2 = checkPodCast(await loadPodForCastCheck(db, `${COURSE}:${PROMOTE_TO}`))
      if (!after2.ok) throw new Error(`post-check failed: promoted pod is not cast-correct — ${after2.failures.join(' | ')}`)
    }

    // ---- the grace guard, immediately before the plan is applied ---------------
    // Everything above this line moved pods; nothing has touched learner_pod_state yet.
    // So this is the last moment at which a straggler is still distinguishable from our
    // own work — re-read, fold in, and let the one commit carry both.
    // Runs whether or not there was progress to plan: a learner can start a session
    // during the flip, and a course with no state rows at snapshot time can have some by
    // the time it commits.
    let folded = null
    {
      const plannedKeys = new Map(stateRows.map(r => [`${r.learner_id}|${r.sentence_id}`, r.exposures]))
      const { rows: stragglers } = await db.query(
        `select learner_id, course_code, sentence_id, exposures, updated_at
           from learner_pod_state where course_code = $1 and updated_at > $2
           order by learner_id, sentence_id`, [COURSE, planAt])
      if (stragglers.length) {
        const canonOf = async (slug) => (await db.query(
          `select id, scene_number, sentence_number, global_order, known_text
             from listening_pod_sentences where pod_id = $1 order by global_order`, [`${COURSE}:${slug}`])).rows
        folded = planInflightFold({
          course: COURSE, liveSlug: LIVE, retiredSlug: RETIRED, promoteTo: PROMOTE_TO,
          plannedKeys, stragglers,
          retiredCanon: await canonOf(RETIRED), promotedCanon: await canonOf(PROMOTE_TO)
        })
        if (folded.unknown.length) {
          throw new Error(`in-flight fold: ${folded.unknown.length} state row(s) under neither ${LIVE} nor ${PROMOTE_TO} ` +
            `(first: ${folded.unknown[0].sentence_id}) — refusing to guess`)
        }
        // A row the plan covers whose exposures moved in the window: restamp the planned
        // action, or its exact-exposures delete aborts the flip on drift. GREATEST on the
        // insert then keeps whichever count is higher, so the newer read never loses.
        const byKey = new Map(folded.refresh.map(r => [`${r.learner_id}|${r.sentence_id}`, r.exposures]))
        for (const a of plan.actions) {
          const now = byKey.get(`${a.learner_id}|${a.sentence_id}`)
          if (now !== undefined) a.exposures = now
        }
        log(`  in-flight writes since the plan: ${stragglers.length} row(s) — ` +
            `${folded.actions.length} folded into the migration, ${folded.refresh.length} exposure refresh(es), ` +
            `${folded.ignored.length} already on ${PROMOTE_TO}`)
      }
    }

    // The learner-progress migration, in the same transaction as the move so progress is
    // never observable against a canon it was not mapped to.
    //
    // Two lessons from the 2026-08-24 flip (jobs #648/#651: 275 carried rows destroyed
    // across 12 courses, invisible to every orphan check) are enforced here:
    //   1. every row-level action is recorded and the record is written to docs/pods/,
    //      not scratch — a migration whose evidence lives in a temp directory is
    //      unauditable by design, and it is why 6 of those courses could never be audited;
    //   2. the post-check asserts COUNT CONSERVATION, not merely absence of orphans —
    //      a deleted row leaves no key to fail resolution, so deletion passes any orphan
    //      census by construction; what it cannot pass is arithmetic.
    let carried = 0, dropped = 0, converged = 0
    const stateLog = []
    let beforeCount = 0
    if (plan || (folded && folded.actions.length)) {
      const { rows: [bc] } = await db.query(
        'select count(*) n from learner_pod_state where course_code=$1', [COURSE])
      beforeCount = Number(bc.n)
      const liveKeys = new Set((await db.query(
        'select learner_id, sentence_id from learner_pod_state where course_code=$1', [COURSE]))
        .rows.map(r => `${r.learner_id}|${r.sentence_id}`))
      for (const a of (plan ? plan.actions : []).concat(folded ? folded.actions : [])) {
        // Folded actions were planned against a rekeyed lookup id; the row in the table
        // still carries the id the learner wrote, so delete by that.
        const storedId = a.stored_sentence_id || a.sentence_id
        const del = () => db.query(
          `delete from learner_pod_state where learner_id=$1 and course_code=$2 and sentence_id=$3 and exposures=$4`,
          [a.learner_id, COURSE, storedId, a.exposures])
        if (FORCE_NO_MIGRATION || a.action === 'drop' || a.action === 'merge') {
          const r = await del()
          if (r.rowCount !== 1) throw new Error(`drift: expected 1 state row for ${a.sentence_id}, got ${r.rowCount}`)
          liveKeys.delete(`${a.learner_id}|${storedId}`)
          dropped++
          stateLog.push({ learner_id: a.learner_id, action: FORCE_NO_MIGRATION ? 'discarded' : a.action,
            stored_key: storedId, target_key: null, exposures: a.exposures, reason: a.reason ?? null })
        } else if (a.action === 'carry' || a.action === 'keep') {
          // `to` targets were planned against the STAGED canon; promotion re-keyed every
          // sentence id onto PROMOTE_TO, so progress must follow onto the same slug.
          // Folded actions were already planned against the PROMOTED canon, so their `to`
          // needs no reslugging — only the main plan's staged-canon targets do.
          const target = a.stored_sentence_id
            ? a.to
            : reslug(a.to.replace(/:s\d+$/, ''), STAGED, PROMOTE_TO) + (/:s\d+$/.exec(a.to)?.[0] || '')
          if (target === storedId) {
            stateLog.push({ learner_id: a.learner_id, action: 'kept_in_place',
              stored_key: storedId, target_key: target, exposures: a.exposures })
            continue
          }
          const r = await del()
          if (r.rowCount !== 1) throw new Error(`drift: expected 1 state row for ${a.sentence_id}, got ${r.rowCount}`)
          liveKeys.delete(`${a.learner_id}|${storedId}`)
          const targetOccupied = liveKeys.has(`${a.learner_id}|${target}`)
          await db.query(
            `insert into learner_pod_state (learner_id, course_code, sentence_id, exposures)
             values ($1,$2,$3,$4)
             on conflict (learner_id, course_code, sentence_id)
             do update set exposures = greatest(learner_pod_state.exposures, excluded.exposures)`,
            [a.learner_id, COURSE, target, a.exposures])
          if (targetOccupied) converged++
          else liveKeys.add(`${a.learner_id}|${target}`)
          carried++
          stateLog.push({ learner_id: a.learner_id, action: targetOccupied ? 'carried_converged' : 'carried',
            stored_key: storedId, target_key: target, exposures: a.exposures })
        }
      }
      // No state row may be left pointing at a sentence that does not exist.
      const { rows: [orph] } = await db.query(
        `select count(*) n from learner_pod_state ls
          where ls.course_code = $1
            and not exists (select 1 from listening_pod_sentences s
                             where s.id = regexp_replace(ls.sentence_id, ':s\\d+$', ''))`, [COURSE])
      if (Number(orph.n) > 0) throw new Error(`post-check failed: ${orph.n} learner state rows point at no sentence`)
      // Count conservation — the check deletion cannot pass. Throws (and rolls the whole
      // flip back) if any state row vanished or appeared beyond what the plan accounts for.
      const { rows: [ac] } = await db.query(
        'select count(*) n from learner_pod_state where course_code=$1', [COURSE])
      assertPodStateConservation({ course: COURSE, before: beforeCount, after: Number(ac.n),
        dropped, converged })
      log(`  state-count conservation: ${beforeCount} before, ${Number(ac.n)} after ` +
          `(${dropped} planned drop(s), ${converged} converged) — conserved`)
    }

    await db.query('commit')

    // The per-course row-level record, committed to docs/pods/ — never scratch.
    if (plan || stateLog.length) {
      const logPath = path.join(__dirname, '..', '..', 'docs', 'pods',
        `${COURSE}-pod-flip-${new Date().toISOString().slice(0, 10)}-state-applied-log.json`)
      fs.writeFileSync(logPath, JSON.stringify({
        course: COURSE, live: LIVE, staged: STAGED, promote_to: PROMOTE_TO, retired: RETIRED,
        at: new Date().toISOString(), before: beforeCount, carried, dropped, converged,
        actions: stateLog
      }, null, 2))
      log(`  state migration log: ${logPath} — commit this file with the flip.`)
    }
    log(`\nswitched. archived ${archived} → ${RETIRED}, promoted ${promoted} → ${PROMOTE_TO}.`)
    log(`  pod_legos.first_seen_sentence carried: ${legosCarried} row(s)`)
    if (plan) log(`learner progress: ${carried} carried, ${dropped} dropped.`)
  } catch (e) { await db.query('rollback'); throw e }

  await db.end()
}

module.exports = { planInflightFold, readinessBlockers }

if (require.main === module) {
  main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
}
