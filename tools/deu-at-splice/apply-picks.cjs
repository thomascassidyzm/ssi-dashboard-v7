#!/usr/bin/env node
/**
 * Put Kai's four picked splices into the live Austrian German course.
 *
 * Kai chose four clips off the candidate page on 2026-08-25 — one per phrase he
 * had rejected in seeds 1–9. Every millisecond of every one of them is audio
 * Sascha (they/them) already recorded; nothing here generates audio, ever, and
 * nothing here deletes anything.
 *
 * Usage:
 *   node tools/deu-at-splice/apply-picks.cjs --plan
 *   node tools/deu-at-splice/apply-picks.cjs --apply
 *   node tools/deu-at-splice/apply-picks.cjs --rollback <batch-file.json>
 *
 * WHY BOTH INSTRUMENTS ARE USED, AND WHERE.
 * The live database says the two halves of this job are different shapes:
 *
 *   1. Each of the four phrases ALREADY has a Sascha `course_audio` row
 *      (`origin='human'`, `voice_id='human_sasha_wanasky_deu_at'`, `role='target2'`)
 *      — the take Kai rejected. Its bytes are what is wrong, so the bytes are
 *      what get replaced: `swapClipInPlace` (services/shared/audio-revision-swap.cjs).
 *      The row id never moves, `audio_revision` is bumped so the learner-facing
 *      address changes, and a `course_audio_revisions` row is written BEFORE the
 *      swap as the rollback ledger. Verified beforehand: none of those four rows
 *      is bound to any other slot in the course, so the swap cannot reach past
 *      the phrase it belongs to.
 *
 *   2. Those four rows are bound to NO slot right now — all nine affected slots
 *      currently point at the Azure synthetic twin. Restoring a human voice to a
 *      slot is a foreign-key repoint, not a byte swap: the Azure row stays
 *      exactly as it is, and the slot's `target2_audio_id` moves to the human
 *      row. `target2_duration_ms` moves with it, because the player reads that
 *      column for its pause timing (CourseDataProvider.ts:304) and a stale value
 *      would cut the new clip short.
 *
 * MAKE BEFORE BREAK. Nothing in the database moves until the new object is
 * proved present in the bucket with `HeadObject` AND its own `coursecode`
 * metadata is read back as `deu_at_for_eng` — the check that caught five
 * "Austrian" takes being Welsh in job #628.
 *
 * ORDER: upload → verify → swap bytes → repoint slots. The byte swap is
 * invisible to learners while it happens, because the row it touches is bound to
 * nothing; the repoint is the single instant anything a learner hears changes,
 * and it moves a slot from a live clip straight to another live clip. No slot is
 * ever NULL, at any instant.
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFileSync } = require('child_process')

const REPO = path.join(__dirname, '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env') })

const { createClient } = require('@supabase/supabase-js')
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3')
const { swapClipInPlace } = require(path.join(REPO, 'services', 'shared', 'audio-revision-swap.cjs'))
const { uploadRecording } = require(path.join(REPO, 'services', 's3-production-service.cjs'))

const COURSE = 'deu_at_for_eng'
const HUMAN_VOICE = 'human_sasha_wanasky_deu_at'
const MAX_SEED = 9
const SOURCE = 'deu-at-apply-picks'
const ACCEPTED_BY = 'kai'

const BATCH_DIR = process.env.DEU_AT_SPLICE_DATA_DIR ||
  path.join(REPO, 'scripts', 'deu-at-splice')

/**
 * Kai's picks, exported from the candidate page at 2026-08-25T23:30Z. These ids
 * are his, verbatim — the tool resolves them, it never substitutes.
 *
 * A FIFTH id is in that export and is deliberately absent here: `part-a1-p170`
 * ("i wü iatz" from "i wü iatz wos lernen") was a half-phrase pick made before
 * he settled the full line, and the full line he chose (`long-on-your-half-c226`)
 * is built on a different source. It is superseded, not applied — and nothing
 * below depends on it.
 */
const PICKS = [
  { id: 'i-wue-p41', text: 'i wü' },
  { id: 'reden-s48', text: 'reden' },
  { id: 'i-wue-reden-g94', text: 'i wü reden' },
  { id: 'long-on-your-half-c226', text: 'i wü iatz mit dir Deitsch reden' },
]

/** The evidence host's copy of the candidate build is the authority for bytes. */
const MANIFEST_DIR = process.env.DEU_AT_SPLICE_EVIDENCE_DIR ||
  '/home/tomcassidy/command-surface/public/evidence/deu-at-splice-candidates-2026-08-25'

/** The three content tables a clip can be bound into, and how each is keyed. */
const SLOT_TABLES = [
  { table: 'course_seeds', durationCol: null },
  { table: 'course_legos', durationCol: 'target2_duration_ms' },
  { table: 'course_practice_phrases', durationCol: 'target2_duration_ms' },
]

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})
const BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'

const norm = (s) => (s || '').trim().toLowerCase().replace(/[.?!]+$/, '')
const arg = (flag) => (process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : null)

function durationMs (file) {
  const out = execFileSync('ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' })
  return Math.round(parseFloat(out.trim()) * 1000)
}

/** Alive in the bucket, and does the object itself claim this course? */
async function headObject (key) {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return { alive: true, size: head.ContentLength, coursecode: (head.Metadata || {}).coursecode || null }
  } catch (err) {
    return { alive: false, error: String(err.name || err) }
  }
}

// ── Plan ─────────────────────────────────────────────────────────────────────

async function buildPlan () {
  const manifest = JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, 'candidates.json'), 'utf8'))
  const byId = new Map(manifest.candidates.map((c) => [c.id, c]))

  const plan = []
  const refused = []

  for (const pick of PICKS) {
    const cand = byId.get(pick.id)
    if (!cand) {
      refused.push({ ...pick, why: 'id is not in the candidate manifest — STOP, do not rebuild it from the recipe' })
      continue
    }
    const file = path.join(MANIFEST_DIR, cand.file)
    if (!fs.existsSync(file)) {
      refused.push({ ...pick, why: `manifest names ${cand.file}, which is not on the evidence host — STOP` })
      continue
    }

    // The human row whose bytes this pick replaces: exactly one, or refuse.
    const { data: rows, error } = await supabase.from('course_audio')
      .select('id, text, text_normalized, role, voice_id, s3_key, audio_revision, duration_ms, origin')
      .eq('course_code', COURSE).eq('voice_id', HUMAN_VOICE)
    if (error) throw new Error(`reading course_audio: ${error.message}`)
    const hits = rows.filter((r) => norm(r.text) === norm(pick.text))
    if (hits.length !== 1) {
      refused.push({ ...pick, why: `${hits.length} human rows carry this text — which one is a question for a human, not a coin toss` })
      continue
    }
    const human = hits[0]

    // Every slot in seeds 1–9 whose target text is this phrase.
    const slots = []
    for (const { table, durationCol } of SLOT_TABLES) {
      const { data, error: e2 } = await supabase.from(table)
        .select('*').eq('course_code', COURSE).lte('seed_number', MAX_SEED)
      if (e2) throw new Error(`reading ${table}: ${e2.message}`)
      for (const r of data) {
        if (norm(r.target_text) !== norm(pick.text)) continue
        slots.push({
          table,
          ref: r.id,
          seed: r.seed_number,
          role: r.phrase_role || r.type || null,
          durationCol,
          current_audio_id: r.target2_audio_id || null,
          current_duration_ms: durationCol ? (r[durationCol] ?? null) : null,
        })
      }
    }
    if (!slots.length) {
      refused.push({ ...pick, why: 'no slot in seeds 1–9 carries this text — nothing to bind to' })
      continue
    }
    // A slot already on some THIRD clip is not ours to move silently.
    for (const s of slots) {
      if (!s.current_audio_id) {
        refused.push({ ...pick, why: `${s.table} ${s.ref} has a NULL target2 — a hole this tool did not make` })
      }
    }

    const buf = fs.readFileSync(file)
    plan.push({
      pick_id: pick.id,
      text: pick.text,
      file,
      sha256: crypto.createHash('sha256').update(buf).digest('hex'),
      bytes: buf.length,
      duration_ms: durationMs(file),
      how: cand.how,
      detail: cand.detail,
      sources: cand.sources,
      audio_id: human.id,
      previous_s3_key: human.s3_key,
      previous_duration_ms: human.duration_ms,
      previous_revision: human.audio_revision ?? 1,
      slots,
    })
  }
  return { plan, refused }
}

function describePlan ({ plan, refused }) {
  for (const p of plan) {
    console.log(`\n"${p.text}"  ← ${p.pick_id}  (${p.duration_ms}ms, ${p.bytes} bytes, sha256 ${p.sha256.slice(0, 12)}…)`)
    console.log(`   ${p.how}`)
    console.log(`   ${p.detail}`)
    console.log(`   bytes replace course_audio ${p.audio_id} (rev ${p.previous_revision} → ${p.previous_revision + 1}, was ${p.previous_s3_key}, ${p.previous_duration_ms}ms)`)
    console.log(`   ${p.slots.length} slot(s):`)
    for (const s of p.slots) {
      console.log(`     ${s.table} seed${s.seed}${s.role ? ` ${s.role}` : ''} ${s.ref} — target2 ${s.current_audio_id}${s.durationCol ? ` (${s.current_duration_ms}ms)` : ''}`)
    }
  }
  console.log(`\n${plan.length} picks · ${plan.reduce((n, p) => n + p.slots.length, 0)} slots`)
  if (refused.length) {
    console.log(`\nREFUSED (${refused.length}) — nothing is guessed:`)
    for (const r of refused) console.log(`  ${r.id || r.text}: ${r.why}`)
  }
}

// ── Apply ────────────────────────────────────────────────────────────────────

async function apply () {
  const { plan, refused } = await buildPlan()
  if (refused.length) {
    describePlan({ plan, refused })
    throw new Error('refusals present — nothing applied. A human decides these.')
  }

  const batch = {
    tool: 'tools/deu-at-splice/apply-picks.cjs',
    course: COURSE,
    applied_at: new Date().toISOString(),
    accepted_by: ACCEPTED_BY,
    picks: [],
  }

  for (const p of plan) {
    // 1. Upload the picked bytes to a fresh mastered object.
    const uuid = crypto.randomUUID().toUpperCase()
    const newKey = `mastered/${uuid}.mp3`
    await uploadRecording(COURSE, uuid, fs.readFileSync(p.file), {
      recordist: 'sascha',
      voiceId: HUMAN_VOICE,
      origin: 'human-splice',
      candidateId: p.pick_id,
      pickedBy: 'kai',
      text: p.text,
      builtFrom: p.sources.map((s) => s.uuid).join(','),
    }, { s3Key: newKey })

    // 2. Prove it — alive, and it claims THIS course.
    const head = await headObject(newKey)
    if (!head.alive) throw new Error(`${newKey} is not in the bucket after upload — refusing to go further`)
    if (head.coursecode !== COURSE) {
      throw new Error(`${newKey} claims coursecode=${head.coursecode}, not ${COURSE} — refusing to go further`)
    }

    // 3. Swap the bytes under the human row. Ledger first, id never moves.
    const swap = await swapClipInPlace({
      supabase,
      audioId: p.audio_id,
      newS3Key: newKey,
      durationMs: p.duration_ms,
      fileSizeBytes: p.bytes,
      patch: { origin: 'human' },
      source: SOURCE,
      acceptedBy: ACCEPTED_BY,
      reason: `Kai picked ${p.pick_id} for "${p.text}" — ${p.detail}`,
      verifyObject: async (key) => (await headObject(key)).alive,
      logger: console,
    })

    // 4. Repoint the slots, guarded: a slot something else has moved is
    //    reported, never clobbered.
    const slotResults = []
    for (const s of p.slots) {
      const update = { target2_audio_id: p.audio_id }
      if (s.durationCol) update[s.durationCol] = p.duration_ms
      const { data, error } = await supabase.from(s.table)
        .update(update)
        .eq('id', s.ref)
        .eq('target2_audio_id', s.current_audio_id)
        .select('id')
      if (error) throw new Error(`repointing ${s.table} ${s.ref}: ${error.message}`)
      if (!data || !data.length) {
        slotResults.push({ ...s, moved: false, why: 'slot no longer holds the clip the plan saw — left alone' })
        console.error(`[ApplyPicks] SKIPPED ${s.table} ${s.ref}: it moved under us`)
        continue
      }
      slotResults.push({ ...s, moved: true, new_audio_id: p.audio_id, new_duration_ms: s.durationCol ? p.duration_ms : null })
    }

    batch.picks.push({
      pick_id: p.pick_id,
      text: p.text,
      sha256: p.sha256,
      audio_id: p.audio_id,
      new_s3_key: newKey,
      new_duration_ms: p.duration_ms,
      previous_s3_key: p.previous_s3_key,
      previous_duration_ms: p.previous_duration_ms,
      previous_revision: swap.previousRevision,
      revision: swap.revision,
      slots: slotResults,
    })
    console.log(`[ApplyPicks] "${p.text}" ← ${p.pick_id}: rev ${swap.previousRevision}→${swap.revision}, ${slotResults.filter((s) => s.moved).length}/${slotResults.length} slots repointed`)
  }

  fs.mkdirSync(BATCH_DIR, { recursive: true })
  const batchFile = path.join(BATCH_DIR, `apply-picks-${batch.applied_at.replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(batchFile, JSON.stringify(batch, null, 2))
  console.log(`\nBatch: ${batchFile}`)
  console.log(`Reverse the whole batch with:\n  node tools/deu-at-splice/apply-picks.cjs --rollback ${path.relative(REPO, batchFile)}`)
  return batchFile
}

// ── Rollback ─────────────────────────────────────────────────────────────────

async function rollback (batchFile) {
  const batch = JSON.parse(fs.readFileSync(path.resolve(REPO, batchFile), 'utf8'))
  for (const p of batch.picks) {
    // Slots back to the clip they held, guarded the same way.
    for (const s of p.slots) {
      if (!s.moved) continue
      const update = { target2_audio_id: s.current_audio_id }
      if (s.durationCol) update[s.durationCol] = s.current_duration_ms
      const { data, error } = await supabase.from(s.table)
        .update(update).eq('id', s.ref).eq('target2_audio_id', p.audio_id).select('id')
      if (error) throw new Error(`rolling back ${s.table} ${s.ref}: ${error.message}`)
      if (!data || !data.length) console.error(`[Rollback] SKIPPED ${s.table} ${s.ref}: it moved under us`)
    }
    // Bytes back to the object the row held. Forward, as a new revision: the
    // old object was never deleted, so pointing at it again is the free rollback.
    const swap = await swapClipInPlace({
      supabase,
      audioId: p.audio_id,
      newS3Key: p.previous_s3_key,
      durationMs: p.previous_duration_ms,
      source: `${SOURCE}-rollback`,
      acceptedBy: ACCEPTED_BY,
      reason: `rollback of ${p.pick_id} (batch ${batch.applied_at})`,
      verifyObject: async (key) => (await headObject(key)).alive,
      logger: console,
    })
    console.log(`[Rollback] "${p.text}": rev ${swap.previousRevision}→${swap.revision}, back on ${p.previous_s3_key}`)
  }
  console.log(`\nRolled back ${batch.picks.length} picks from ${batchFile}`)
}

async function main () {
  if (process.argv.includes('--rollback')) return rollback(arg('--rollback'))
  if (process.argv.includes('--apply')) return apply()
  describePlan(await buildPlan())
  console.log('\n(--plan wrote nothing. Use --apply to write.)')
}

if (require.main === module) {
  main().catch((err) => { console.error(err.message); process.exit(1) })
}

module.exports = { buildPlan, PICKS }
