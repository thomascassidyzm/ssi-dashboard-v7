#!/usr/bin/env node
/**
 * Turn Kai's Good verdicts into what learners actually hear.
 *
 * Usage:
 *   node tools/deu-at-listen/apply.cjs --plan              show what would change, write nothing
 *   node tools/deu-at-listen/apply.cjs --apply             do it
 *   node tools/deu-at-listen/apply.cjs --rollback <batch>  reverse one batch, entirely
 *
 * THE ONLY INPUT IS AN EXPLICIT GOOD TAP. Not a whisper transcript, not a
 * duration, not "the newest take", not this tool's opinion. A take with no
 * verdict is never touched, and a take marked Bad is never touched either.
 *
 * WHAT A CHANGE IS. Every line the course teaches already has exactly one
 * `course_audio` row, and that row's id is the address a learner's app asks for.
 * Applying a Good verdict means pointing THAT ROW at the Good take's bytes —
 * `swapClipInPlace` (services/shared/audio-revision-swap.cjs), which:
 *   - proves the object is really in the bucket before the row moves
 *     (make-before-break; the 2026-08-03 fra purge is why that rule exists),
 *   - writes the rollback row FIRST into `course_audio_revisions`, carrying the
 *     previous s3_key,
 *   - bumps `audio_revision`, which is the ONLY thing that changes a learner's
 *     cache address — a swap without it reaches first-time listeners and nobody
 *     else,
 *   - never moves the row id and never deletes the old object, so no clip is
 *     ever missing for an instant and the old take stays exactly where it was,
 *   - reads the row back and throws if the write did not take.
 *
 * WHAT IT REFUSES, out loud rather than silently:
 *   - a slow read (cadence 'slow'/'isolated'): the pipeline never files those as
 *     clips at all (services/script-take-filing.cjs refuses them), so binding one
 *     would put a deliberately halting read in front of a learner,
 *   - a refused take: it has no provenance, so there is no line it belongs to,
 *   - a line with no course_audio row: there is no slot to point at, and minting
 *     one would be adding content, not fixing audio,
 *   - a line with more than one take marked Good: that is a question for Kai,
 *     not a coin toss.
 *
 * NO AUDIO IS EVER GENERATED HERE. It only ever re-points at bytes that already
 * exist in the bucket.
 */
const fs = require('fs')
const path = require('path')

const REPO = path.join(__dirname, '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env') })

const { createClient } = require('@supabase/supabase-js')
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3')
const { swapClipInPlace } = require(path.join(REPO, 'services/shared/audio-revision-swap.cjs'))

const COURSE = 'deu_at_for_eng'
const SOURCE_PREFIX = 'deu-at-listen'
const ACCEPTED_BY = 'Kai — deu_at listening page (explicit Good tap)'

function supa() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY missing from .env')
  return createClient(url, key)
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

/** Make-before-break: does this object really exist in the bucket? */
async function verifyObject(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }))
    return true
  } catch { return false }
}

/**
 * What would change, and what would not, and why not — computed from the
 * manifest and the verdict file. Pure: it writes nothing.
 *
 * @returns {{actions: Array, skipped: Array, noop: Array, summary: string}}
 */
function buildPlan(manifest, verdicts) {
  const actions = []
  const skipped = []
  const noop = []

  for (const grp of manifest.groups || []) {
    const good = grp.takes.filter((t) => verdicts[t.uuid]?.verdict === 'good')
    if (!good.length) continue

    if (grp.refused_group) {
      for (const t of good) skipped.push({ uuid: t.uuid, why: 'refused before it was recorded, so there is no line to point it at' })
      continue
    }

    const slow = good.filter((t) => t.cadence === 'slow' || t.cadence === 'isolated')
    for (const t of slow) skipped.push({ uuid: t.uuid, prompted_text: grp.prompted_text, why: 'a slow read is never used as a clip' })

    const eligible = good.filter((t) => !slow.includes(t) && t.s3_key)
    if (!eligible.length) continue

    const liveTake = grp.takes.find((t) => t.is_live)

    // Kai marking two takes of a line Good is not a contradiction — both reads
    // can be fine. It only needs resolving when it would force a CHOICE: if one
    // of the Good takes is already what learners hear, the line is settled and
    // nothing should move. Otherwise the tool refuses rather than picking.
    if (eligible.length > 1) {
      if (liveTake && eligible.some((t) => t.uuid === liveTake.uuid)) {
        noop.push({ uuid: liveTake.uuid, prompted_text: grp.prompted_text, why: 'more than one take here is marked Good, and one of them is already what learners hear' })
      } else {
        for (const t of eligible) {
          skipped.push({ uuid: t.uuid, prompted_text: grp.prompted_text, why: 'more than one take on this line is marked Good and none of them is the live one — which should it be?' })
        }
      }
      continue
    }

    const chosen = eligible[0]
    if (!liveTake || !liveTake.course_audio_id) {
      skipped.push({ uuid: chosen.uuid, prompted_text: grp.prompted_text, why: 'no clip in the course points at this line, so there is nothing to swap' })
      continue
    }
    if (chosen.uuid === liveTake.uuid) {
      noop.push({ uuid: chosen.uuid, prompted_text: grp.prompted_text, why: 'already what learners hear' })
      continue
    }

    actions.push({
      prompted_text: grp.prompted_text,
      seed: grp.seed,
      audio_id: liveTake.course_audio_id,
      from_uuid: liveTake.uuid,
      from_s3_key: liveTake.s3_key,
      to_uuid: chosen.uuid,
      to_s3_key: chosen.s3_key,
      to_flow: chosen.flow,
      to_recorded_at: chosen.recorded_at,
    })
  }

  const summary = `${actions.length} line(s) would change, ${noop.length} Good take(s) are already live, ${skipped.length} cannot be applied.`
  return { actions, skipped, noop, summary }
}

/**
 * Apply a plan. Each swap is independent: one failure never rolls back the rest,
 * and every result — applied or failed — is returned with its reason.
 */
async function applyPlan(plan, { batch = null, logger = console } = {}) {
  const supabase = supa()
  const batchId = batch || `${SOURCE_PREFIX}-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`
  const source = `${SOURCE_PREFIX}:${batchId}`
  const applied = []
  const failed = []

  for (const a of plan.actions) {
    try {
      const out = await swapClipInPlace({
        supabase,
        audioId: a.audio_id,
        newS3Key: a.to_s3_key,
        patch: { origin: 'human' },
        source,
        acceptedBy: ACCEPTED_BY,
        reason: `Kai marked take ${a.to_uuid} Good on "${String(a.prompted_text).slice(0, 60)}"`,
        verifyObject,
        logger,
      })
      applied.push({ ...a, revision: out.revision, previous_revision: out.previousRevision, previous_s3_key: out.previousS3Key })
    } catch (err) {
      failed.push({ ...a, error: err.message })
    }
  }
  return { batch: batchId, source, applied, failed }
}

/**
 * Reverse a batch, entirely, in one call. Every swap this tool made wrote a
 * `course_audio_revisions` row carrying the key the clip pointed at before —
 * this walks them newest-first and swaps each row back to that key.
 *
 * It reverses FORWARD, as a new revision, rather than rewinding the number: a
 * learner who already cached revision N must be given a new address to fetch, or
 * the reversal reaches nobody. Rewinding would also collide with the unique
 * (audio_id, revision) key.
 */
async function rollbackBatch(batchId, { logger = console } = {}) {
  const supabase = supa()
  const source = batchId.startsWith(`${SOURCE_PREFIX}:`) ? batchId : `${SOURCE_PREFIX}:${batchId}`
  const { data: rows, error } = await supabase
    .from('course_audio_revisions')
    .select('audio_id, revision, previous_s3_key, new_s3_key')
    .eq('source', source)
    .order('revision', { ascending: false })
  if (error) throw new Error(`reading batch ${source}: ${error.message}`)
  if (!rows?.length) return { source, reversed: [], failed: [], note: 'no revisions carry that batch id — nothing to reverse' }

  const reversed = []
  const failed = []
  // Newest first, and only once per clip: if a clip were swapped twice in one
  // batch, the OLDEST previous_s3_key is the one that restores it.
  const oldestPerClip = new Map()
  for (const r of rows) oldestPerClip.set(r.audio_id, r)   // rows are desc, so the last write wins = lowest revision
  for (const r of oldestPerClip.values()) {
    try {
      const out = await swapClipInPlace({
        supabase,
        audioId: r.audio_id,
        newS3Key: r.previous_s3_key,
        source: `${source}:rollback`,
        acceptedBy: `rollback of ${source}`,
        reason: 'reversing a listening-page apply',
        verifyObject,
        logger,
      })
      reversed.push({ audio_id: r.audio_id, restored_s3_key: r.previous_s3_key, revision: out.revision })
    } catch (err) {
      failed.push({ audio_id: r.audio_id, error: err.message })
    }
  }
  return { source, reversed, failed }
}

module.exports = { buildPlan, applyPlan, rollbackBatch, verifyObject, COURSE, SOURCE_PREFIX }

// ---------------- CLI ----------------
if (require.main === module) {
  const argv = process.argv.slice(2)
  const arg = (f, d) => { const i = argv.indexOf(f); return i > -1 ? argv[i + 1] : d }
  const DATA_DIR = process.env.DEU_AT_LISTEN_DATA_DIR || path.join(REPO, 'scripts', 'deu-at-listen')
  const loadJson = (p, dflt) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return dflt } }

  ;(async () => {
    if (argv.includes('--rollback')) {
      const batch = arg('--rollback')
      if (!batch) { console.error('--rollback needs a batch id'); process.exit(2) }
      const out = await rollbackBatch(batch)
      console.log(JSON.stringify(out, null, 1))
      process.exit(out.failed.length ? 1 : 0)
    }

    const manifest = loadJson(path.join(DATA_DIR, `manifest-${COURSE}.json`), null)
    const verdicts = loadJson(path.join(DATA_DIR, `verdicts-${COURSE}.json`), { verdicts: {} }).verdicts || {}
    if (!manifest) { console.error(`no manifest in ${DATA_DIR} — run manifest.cjs first`); process.exit(2) }

    const plan = buildPlan(manifest, verdicts)
    if (!argv.includes('--apply')) {
      console.log(plan.summary)
      for (const a of plan.actions) console.log(`  ${a.audio_id}  ${a.from_uuid} -> ${a.to_uuid}   ${a.prompted_text}`)
      for (const s of plan.skipped) console.log(`  SKIP ${s.uuid}: ${s.why}`)
      process.exit(0)
    }
    const out = await applyPlan(plan)
    console.log(`batch ${out.batch}: ${out.applied.length} applied, ${out.failed.length} failed`)
    for (const f of out.failed) console.log(`  FAILED ${f.audio_id}: ${f.error}`)
    console.log(`reverse the whole batch with:\n  node tools/deu-at-listen/apply.cjs --rollback ${out.batch}`)
    process.exit(out.failed.length ? 1 : 0)
  })().catch((e) => { console.error(e.message); process.exit(1) })
}
