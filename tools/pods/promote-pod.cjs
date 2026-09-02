#!/usr/bin/env node
/**
 * promote-pod.cjs — swap a finished working pod onto the live slug, archiving
 * whatever was there. The other half of clone-pod.cjs.
 *
 * WHY THIS EXISTS. `clone-pod.cjs` takes a live pod off to a working slug so a
 * destructive rewrite can happen away from learners. Nothing ever put it back.
 * The gap got filled by hand: on 2026-08-06 someone gated Welsh pod-0 with a raw
 * `update ... set pod_id = '<course>:pod-0-unrecorded'`, which left the live pod
 * at ZERO sentence rows on two RELEASED courses. Learners opened the Pods tab and
 * got nothing for five days — the app reads the literal id `<course>:pod-0`
 * (player-vue `useListeningPods.ts`, `usePodLapScheduler.ts`) with no fallback.
 * The missing tool IS the outage. This is it, so the next promotion is boring.
 *
 * WHAT IT DOES, in one transaction:
 *   1. verifies the source pod is fit to go live (rows present, ids correctly
 *      slugged, no unproofread drafts, no empty target text, and — since
 *      2026-09-02 — a known side that is neither empty nor silent). The three
 *      target-side content checks each have an explicit --allow-* escape hatch so
 *      a knowing exception is visible on the command line and in the log, never
 *      silent; the known side has none.
 *
 *      CONTENT READINESS IS NOT DEFINED HERE. It is `readinessBlockers()` exported
 *      from pod-switchover.cjs — the other tool that can put a pod onto the slug
 *      the player serves. Both doors refuse the same content because they run the
 *      same predicate. Until 2026-09-02 this tool had never heard of `known_text`
 *      or `known_audio_id`, so a pod with a perfect target side and a silent known
 *      side promoted with nothing refusing: the identical hole job #91 closed on
 *      the switchover the same afternoon. An invariant guarded at one door is not
 *      guarded. Tests: tools/pods/promote-pod-readiness.test.cjs;
 *   2. renames the current live pod out to --archive-as, rows and all;
 *   3. renames the source pod onto the live slug, rows and all.
 *
 * MAKE-BEFORE-BREAK (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b).
 * NOTHING IS DELETED. The old live pod keeps every sentence row, every audio
 * pointer and its metadata under the archive slug — rollback is re-running this
 * tool with --from and --to swapped. The only rows deleted are the two now-childless
 * pod HEADER rows left behind by the renames, and only after asserting they have
 * zero children; their content lives on under the new slug. A pod id is
 * `<course>:<slug>` and the slug is baked into every child row's primary key, so a
 * rename is genuinely create-new / move-children / drop-empty-old, not an update.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write.
 *
 *   node tools/pods/promote-pod.cjs --course=cym_n_for_eng \
 *     --from=pod-0-unrecorded --to=pod-0 --archive-as=pod-0-gated-2026-08-06
 *   ... --apply
 *
 * PROMOTION IS NOT RELEASE (2026-08-23). listening_pods.visibility decides
 * whether learners can reach a pod at all, and this tool does NOT decide it:
 * the promoted pod inherits the source pod's visibility, so a pod held back
 * while a human is still recording it is still held after promotion. Pass
 * --release to make it live in the same run, or release it from the Popty pods
 * page. Either way it is a human act — passing the fitness checks above is a
 * precondition for release, never a trigger for it. The dry-run summary always
 * states, in words, what a learner will be able to see.
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const { Client } = require('pg')
// ONE definition of content readiness, shared with the other door onto the live slug.
// Do not reimplement it here: two implementations of one rule is how the known-side
// hole of 2026-09-02 came back (docs/pods/known-side-gate-2026-09-02.md).
const { readinessBlockers } = require('./pod-switchover.cjs')

const has = (n) => process.argv.includes(`--${n}`)
const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}

/**
 * Argument parsing lives in a function, not at module scope, so this file can be
 * REQUIRED by a test without process.exit() firing on the way in. The blocker
 * predicate below is the thing worth testing and it was unreachable while the
 * whole tool ran on import.
 */
function parseArgs () {
  const APPLY = process.argv.includes('--apply')
  const COURSE = arg('course')
  const FROM = arg('from')
  const TO = arg('to') || 'pod-0'
  const ARCHIVE_AS = arg('archive-as')
  const TITLE = arg('title')
  // Promotion moves content onto the live slug. It does NOT decide reachability:
  // the promoted pod inherits whatever visibility the source pod had, so a pod
  // held back while a human records it stays held after promotion. --release is
  // the deliberate human act that makes it live, and it is the only thing here
  // that can. Passing every fitness check is a PRECONDITION for release, never a
  // trigger for it (Tom's ruling, 2026-08-23).
  const RELEASE = has('release')
  const ALLOW_DRAFTS = has('allow-drafts')
  const ALLOW_EMPTY_TARGET = Number(arg('allow-empty-target') || 0)
  const ALLOW_MISSING_AUDIO = has('allow-missing-audio')

  if (!COURSE || !FROM || !ARCHIVE_AS) {
    console.error('FAILED: --course=<code>, --from=<slug> and --archive-as=<slug> are all required')
    process.exit(1)
  }
  for (const [n, v] of [['from', FROM], ['to', TO], ['archive-as', ARCHIVE_AS]]) {
    if (v.includes(':')) { console.error(`FAILED: --${n} is a slug, not a pod id — it must not contain ":"`); process.exit(1) }
  }
  if (new Set([FROM, TO, ARCHIVE_AS]).size !== 3) {
    console.error('FAILED: --from, --to and --archive-as must all differ')
    process.exit(1)
  }
  return { APPLY, COURSE, FROM, TO, ARCHIVE_AS, TITLE, RELEASE, ALLOW_DRAFTS, ALLOW_EMPTY_TARGET, ALLOW_MISSING_AUDIO }
}

/** `<course>:<slug>:<tail>`; null = unrecognisable shape, which is always a refusal. */
function retailOf (course, id) {
  const parts = String(id).split(':')
  if (parts.length < 3 || parts[0] !== course) return null
  return parts.slice(2).join(':') || null
}

/**
 * Is this source pod fit to go onto the live slug? PURE, so it is testable —
 * every DB read it needs is passed in.
 *
 *   rows      the source pod's sentence rows, as read
 *   clashes   rows on OTHER pods whose ids the renames would collide with
 *   allow     the operator's explicit --allow-* escapes
 *
 * Returns every failure, so one run tells you everything wrong rather than one
 * thing at a time.
 */
function promotionBlockers ({ rows, srcId, course, fromSlug, clashes = [], allow = {} }) {
  const { drafts: ALLOW_DRAFTS = false, emptyTarget: ALLOW_EMPTY_TARGET = 0, missingAudio: ALLOW_MISSING_AUDIO = false } = allow
  const retail = (id) => retailOf(course, id)
  const blockers = []
  if (!rows.length) blockers.push(`${srcId} has no sentence rows — nothing to promote`)

  const misSlugged = rows.filter(r => !r.id.startsWith(`${srcId}:`))
  if (misSlugged.length) {
    blockers.push(`${misSlugged.length} source row id(s) are not prefixed "${srcId}:" ` +
      `(e.g. ${misSlugged[0].id}) — run tools/pods/reslug-pod-rows.cjs --course=${course} --pod=${fromSlug} --apply first`)
  }
  const badShape = rows.filter(r => !retail(r.id))
  if (badShape.length) blockers.push(`${badShape.length} source row id(s) are not <course>:<slug>:<tail> (e.g. ${badShape[0].id})`)

  // ---- content readiness. NOT decided here — decided by the same exported
  // predicate `pod-switchover.cjs` uses, so the two tools that can put a pod onto
  // the live slug refuse exactly the same content. It counts six things; the three
  // this tool has always carried an --allow-* escape for are waived by zeroing the
  // count, which keeps the escapes working and keeps the rule in one place. The
  // known side has NO escape: it is new here, nobody has a documented waiver for
  // it, and a pod that plays nothing on the known side is not promotable.
  const trimmed = (v) => String(v || '').trim()
  const counts = {
    n: rows.length,
    no_text: ALLOW_EMPTY_TARGET >= rows.filter(r => !trimmed(r.target_text)).length
      ? 0 : rows.filter(r => !trimmed(r.target_text)).length,
    draft: ALLOW_DRAFTS ? 0 : rows.filter(r => r.target_text_draft).length,
    no_target_audio: ALLOW_MISSING_AUDIO ? 0 : rows.filter(r => !r.target_audio_id).length,
    no_known_text: rows.filter(r => !trimmed(r.known_text)).length,
    no_known_audio: rows.filter(r => !r.known_audio_id).length,
  }
  // The zero-row case is already said above, in this tool's own words.
  blockers.push(...readinessBlockers(counts).filter(b => b !== 'staged pod has no sentences'))
  if (blockers.some(b => /no target text|marked draft|no target audio/.test(b))) {
    blockers.push('escapes for the target side, if the state above is deliberate: ' +
      '--allow-drafts, --allow-empty-target=<N>, --allow-missing-audio. ' +
      'The known side has no escape.')
  }
  if (clashes.length) blockers.push(`${clashes.length} target id(s) already exist on other pods (e.g. ${clashes[0].id} on ${clashes[0].pod_id})`)
  return blockers
}

async function main () {
  const { APPLY, COURSE, FROM, TO, ARCHIVE_AS, TITLE, RELEASE,
    ALLOW_DRAFTS, ALLOW_EMPTY_TARGET, ALLOW_MISSING_AUDIO } = parseArgs()
  const podId = (slug) => `${COURSE}:${slug}`
  const srcId = podId(FROM)
  const dstId = podId(TO)
  const arcId = podId(ARCHIVE_AS)
  const retail = (id) => retailOf(COURSE, id)

  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  try {
    const getPod = async (id) => (await db.query(`select * from listening_pods where id=$1`, [id])).rows[0] || null
    const getRows = async (id) => (await db.query(
      `select * from listening_pod_sentences where pod_id=$1 order by global_order`, [id])).rows

    const src = await getPod(srcId)
    if (!src) throw new Error(`${srcId}: no such pod`)
    const dst = await getPod(dstId)
    if (await getPod(arcId)) throw new Error(`${arcId} already exists; pick a free --archive-as slug`)

    const srcRows = await getRows(srcId)
    const dstRows = dst ? await getRows(dstId) : []

    // ---- source fitness. Destination rows are archived, never merged, so an id
    // clash means the archive slug has been used before under a different pod id.
    const wouldBe = [
      ...srcRows.map(r => `${dstId}:${retail(r.id)}`),
      ...dstRows.map(r => `${arcId}:${retail(r.id)}`),
    ].filter(x => !x.endsWith(':null'))
    const clashes = (await db.query(
      `select id, pod_id from listening_pod_sentences where id = any($1::text[]) and pod_id not in ($2,$3)`,
      [wouldBe, srcId, dstId])).rows

    const drafts = srcRows.filter(r => r.target_text_draft)
    const noAudio = srcRows.filter(r => !r.target_audio_id)
    const blockers = promotionBlockers({
      rows: srcRows, srcId, course: COURSE, fromSlug: FROM, clashes,
      allow: { drafts: ALLOW_DRAFTS, emptyTarget: ALLOW_EMPTY_TARGET, missingAudio: ALLOW_MISSING_AUDIO },
    })

    // Never silent about reachability: a dry run states what learners will be
    // able to see, in words, before anyone types --apply.
    const promotedVisibility = RELEASE ? 'live' : (src.visibility || 'live')
    const summary = {
      course: COURSE,
      promote: `${srcId}  ->  ${dstId}`,
      visibility: promotedVisibility === 'live'
        ? (RELEASE
            ? 'LIVE — --release given, learners will be able to see this pod'
            : `LIVE — inherited from ${srcId}, which was already live`)
        : `HELD — inherited from ${srcId}. Learners will NOT see this pod. Pass --release to make it live, or release it from the Popty pods page.`,
      archive: dst ? `${dstId}  ->  ${arcId}` : `${dstId} has no pod row; nothing to archive`,
      source_rows: srcRows.length,
      source_scenes: new Set(srcRows.map(r => r.scene_number)).size,
      source_with_target_text: srcRows.filter(r => String(r.target_text || '').trim()).length,
      source_draft_rows: drafts.length,
      source_with_target_audio: srcRows.length - noAudio.length,
      archived_rows: dstRows.length,
      overrides: [ALLOW_DRAFTS && 'allow-drafts', ALLOW_MISSING_AUDIO && 'allow-missing-audio',
        ALLOW_EMPTY_TARGET && `allow-empty-target=${ALLOW_EMPTY_TARGET}`].filter(Boolean),
    }

    if (blockers.length) {
      console.error(JSON.stringify({ mode: 'REFUSED', summary, blockers }, null, 2))
      process.exit(1)
    }
    if (!APPLY) {
      console.log(JSON.stringify({ mode: 'DRY RUN', summary }, null, 2))
      return
    }

    const jsonCols = new Set((await db.query(
      `select column_name from information_schema.columns
        where table_name='listening_pods' and data_type in ('json','jsonb')`)).rows.map(r => r.column_name))
    const enc = (col, v) => (jsonCols.has(col) && v !== null && v !== undefined ? JSON.stringify(v) : v)

    /**
     * Rename a pod: insert the new header, move every child onto it while
     * rewriting the slug segment of the child's id, then drop the old header —
     * only after asserting it is childless.
     */
    const renamePod = async (pod, rows, newId, newSlug, newTitle, note, visibility) => {
      const metadata = { ...(pod.metadata || {}), ...note }
      await db.query(
        `insert into listening_pods (id, course_code, pod_type, slug, pod_order, title, scene, difficulty, speakers, source_file, metadata, visibility)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [newId, pod.course_code, pod.pod_type, newSlug, pod.pod_order, newTitle, pod.scene, pod.difficulty,
          enc('speakers', pod.speakers), pod.source_file, enc('metadata', metadata),
          visibility || pod.visibility || 'live'])
      for (const r of rows) {
        const res = await db.query(
          `update listening_pod_sentences set id=$1, pod_id=$2 where id=$3 and pod_id=$4`,
          [`${newId}:${retail(r.id)}`, newId, r.id, pod.id])
        if (res.rowCount !== 1) throw new Error(`move of ${r.id} affected ${res.rowCount} rows`)
      }
      const left = Number((await db.query(
        `select count(*) n from listening_pod_sentences where pod_id=$1`, [pod.id])).rows[0].n)
      if (left !== 0) throw new Error(`${pod.id} still holds ${left} row(s) after the move; refusing to drop its header`)
      const moved = Number((await db.query(
        `select count(*) n from listening_pod_sentences where pod_id=$1`, [newId])).rows[0].n)
      if (moved !== rows.length) throw new Error(`${newId} holds ${moved} rows, expected ${rows.length}`)
      const del = await db.query(`delete from listening_pods where id=$1`, [pod.id])
      if (del.rowCount !== 1) throw new Error(`drop of the empty header ${pod.id} affected ${del.rowCount} rows`)
    }

    const stamp = new Date().toISOString().slice(0, 10)
    await db.query('BEGIN')
    try {
      // Archive first: the live slug must be free before the source can take it.
      if (dst) {
        await renamePod(dst, dstRows, arcId, ARCHIVE_AS,
          `[ARCHIVED ${stamp}] ${dst.title || dstId} — superseded by ${FROM}, kept for rollback`,
          { archived: true, archived_on: stamp, archived_from: TO, superseded_by: FROM,
            rollback_by: `node tools/pods/promote-pod.cjs --course=${COURSE} --from=${ARCHIVE_AS} --to=${TO} --archive-as=<slug> --apply` })
      }
      await renamePod(src, srcRows, dstId, TO,
        TITLE || String(src.title || '').replace(/\s*—\s*UNRECORDED.*$/i, '').replace(/\s*\[GATED[^\]]*\]\s*/i, '').trim() || dstId,
        { gated: false, promoted_on: stamp, promoted_from: FROM, previous_live_archived_as: dst ? ARCHIVE_AS : null,
          ...(RELEASE ? { released_at: new Date().toISOString(), released_by: 'promote-pod.cjs --release' } : {}) },
        promotedVisibility)

      const live = Number((await db.query(
        `select count(*) n from listening_pod_sentences where pod_id=$1`, [dstId])).rows[0].n)
      if (live !== srcRows.length) throw new Error(`post-check: ${dstId} holds ${live} rows, expected ${srcRows.length}`)
      const arc = Number((await db.query(
        `select count(*) n from listening_pod_sentences where pod_id=$1`, [arcId])).rows[0].n)
      if (arc !== dstRows.length) throw new Error(`post-check: ${arcId} holds ${arc} rows, expected ${dstRows.length}`)
      const stray = Number((await db.query(
        `select count(*) n from listening_pod_sentences where pod_id=$1`, [srcId])).rows[0].n)
      if (stray !== 0) throw new Error(`post-check: ${srcId} still holds ${stray} rows`)
      const misfiled = Number((await db.query(
        `select count(*) n from listening_pod_sentences where pod_id=$1 and id not like $2`, [dstId, `${dstId}:%`])).rows[0].n)
      if (misfiled !== 0) throw new Error(`post-check: ${misfiled} live row(s) do not carry the ${dstId}: id prefix`)

      await db.query('COMMIT')
      console.log(JSON.stringify({ mode: 'APPLIED', summary, verified: { live_rows: live, archived_rows: arc } }, null, 2))
    } catch (e) {
      await db.query('ROLLBACK')
      throw e
    }
  } finally {
    await db.end()
  }
}

module.exports = { promotionBlockers, retailOf }

if (require.main === module) {
  main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
}
