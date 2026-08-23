#!/usr/bin/env node
/**
 * propagate-take-quality-wants.cjs — the second half of a take-quality mark.
 *
 * A take marked bad in recording_provenance.quality_notes.take_quality
 * (verdict:'bad' / status:'superseded-pending-rerecord') was, until now, a
 * fact nothing read. The recordist queue (services/voice-engine/
 * recordist-queue.cjs, finishQueue) only ever checks whether a line has a
 * take AND whether listening_pod_sentences.rerecord_wanted names the track —
 * it never looks at provenance. So a bad mark never reopened the line, and
 * Catrin's page kept counting three rejected takes as done (2026-08-23,
 * https://popty.app/r/human_catrinlliar_cym_n reading "4 of 154").
 *
 * WHAT THIS DOES: scans recording_provenance for bad marks, resolves each to
 * its pod sentence, and writes/merges listening_pod_sentences.rerecord_wanted
 * — the SAME want the queue already honours for every other re-record case.
 * No new mechanism; this file only makes the existing one see provenance.
 *
 * SCOPE: pod-mode TARGET-track takes only (kind/pod_side === 'target'; mode:
 * 'pod' with a sentence_id, or the older mark-aran-clipped-takes shape
 * carrying take_quality.evidence.pod_sentence_id / .voice_id / .pod_side
 * instead of top-level fields — both shapes exist live as of 2026-08-23).
 * KNOWN-track bad marks are deliberately left untouched: the recordist
 * surface this fixes (services/voice-engine/recordist-queue.cjs) is
 * TARGET-side only by design (its own header: "known_text rides along... as
 * the recordist's crib, never as something to record"), and at least one
 * line already carries a genuine, unrelated known-track want (a deliberate
 * voice change, not a quality mark) that this tool must not clobber or
 * second-guess. A bad mark with no resolvable sentence_id or voice_id, or
 * whose kind cannot be confirmed as 'target', is logged and skipped, never
 * guessed at — course_audio-only (non-pod) bad marks are out of scope for
 * this tool until one is actually observed.
 *
 * WHAT THIS DOES NOT DO:
 *   - delete or move any audio, or touch target_audio_id / course_audio;
 *   - drop any OTHER key already in a line's rerecord_wanted (a pre-existing
 *     {known: ...} want, for instance, is preserved untouched);
 *   - re-mark a line that already carries the want for this track — the
 *     write is idempotent, checked against the row's current state right
 *     before writing.
 *
 * RE-RUNNABLE BY DESIGN: this reads recording_provenance fresh every run, so
 * it is safe to run again as more bad marks land (e.g. a sibling job still
 * writing Aran's 137 marks while this runs). Rows already propagated are
 * reported as skipped, not re-written.
 *
 *   DRY_RUN=1 node tools/recording/propagate-take-quality-wants.cjs   # default
 *   DRY_RUN=0 node tools/recording/propagate-take-quality-wants.cjs   # write
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function parseNotes(raw) {
  if (raw == null) return null
  const obj = typeof raw === 'string' ? (() => { try { return JSON.parse(raw) } catch { return null } })() : raw
  return obj && typeof obj === 'object' ? obj : null
}

/** Pull the (sentenceId, voiceId, kind) triple out of either observed mark shape. */
function resolveIdentity(ctx) {
  const tq = ctx.take_quality
  if (!tq) return null
  const isBad = tq.verdict === 'bad' || tq.status === 'superseded-pending-rerecord'
  if (!isBad) return null
  const ev = tq.evidence || {}
  const sentenceId = ctx.sentence_id || ev.pod_sentence_id || null
  const voiceId = ctx.voice_id || ev.voice_id || null
  const kindRaw = ctx.kind || ev.pod_side || null
  return { sentenceId, voiceId, kind: kindRaw, reason: tq.reason || null }
}

async function run({ db: injectedDb } = {}) {
  const DRY_RUN = process.env.DRY_RUN !== '0'
  let db = injectedDb
  if (!db) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY required')
    db = createClient(url, key)
  }

  // Narrow the read as far as PostgREST allows, then filter precisely in JS —
  // same pattern as take-supersede.cjs, for the same reason (no JSON-path
  // filtering over PostgREST).
  const { data: rows, error } = await db
    .from('recording_provenance')
    .select('audio_uuid, quality_notes')
    .like('quality_notes', '%take_quality%')
  if (error) throw error

  const candidates = []
  const outOfScope = []
  for (const row of rows || []) {
    const ctx = parseNotes(row.quality_notes)
    if (!ctx) continue
    const id = resolveIdentity(ctx)
    if (!id) continue
    if (!id.sentenceId || !id.voiceId) {
      outOfScope.push({ audio_uuid: row.audio_uuid, reason: !id.sentenceId ? 'no sentence_id resolvable' : 'no voice_id resolvable' })
      continue
    }
    if (id.kind !== 'target') {
      outOfScope.push({ audio_uuid: row.audio_uuid, reason: `kind is '${id.kind}', not 'target' — known-track wants are a different surface, not touched by this tool` })
      continue
    }
    candidates.push({ audio_uuid: row.audio_uuid, ...id })
  }

  console.log(`${(rows || []).length} row(s) carry take_quality; ${candidates.length} resolvable to a pod sentence; ${outOfScope.length} out of scope.`)
  for (const o of outOfScope) console.log(`  OUT OF SCOPE ${o.audio_uuid}: ${o.reason}`)

  const log = []
  let propagated = 0, alreadyWanted = 0, missingRow = 0, drifted = 0

  for (const c of candidates) {
    const { data: sentence, error: sErr } = await db
      .from('listening_pod_sentences')
      .select('id, rerecord_wanted')
      .eq('id', c.sentenceId)
      .maybeSingle()
    if (sErr) { console.error(`ERROR reading ${c.sentenceId}: ${sErr.message}`); continue }
    if (!sentence) {
      missingRow += 1
      console.log(`SKIP ${c.audio_uuid} — no listening_pod_sentences row for ${c.sentenceId}`)
      log.push({ ...c, outcome: 'missing-sentence-row' })
      continue
    }

    const before = (sentence.rerecord_wanted && typeof sentence.rerecord_wanted === 'object') ? sentence.rerecord_wanted : {}
    const wantKey = 'target' // guaranteed by the kind==='target' filter above

    if (before[wantKey]) {
      alreadyWanted += 1
      log.push({ ...c, sentenceId: c.sentenceId, wantKey, outcome: 'already-wanted', before })
      continue
    }

    const next = { ...before, [wantKey]: c.voiceId }
    if (c.reason) next.reason = c.reason

    if (DRY_RUN) {
      console.log(`DRY RUN would set ${c.sentenceId}.rerecord_wanted.${wantKey} = ${c.voiceId}`)
      console.log('   before:', JSON.stringify(before), '-> after:', JSON.stringify(next))
      log.push({ ...c, sentenceId: c.sentenceId, wantKey, outcome: 'planned', before, after: next })
      continue
    }

    // Re-read immediately before writing — the row may have changed since the
    // plan pass (another agent, or this same want landing via a different
    // path). Any drift aborts THIS row's write, never the whole run.
    const { data: fresh, error: freshErr } = await db
      .from('listening_pod_sentences')
      .select('rerecord_wanted')
      .eq('id', c.sentenceId)
      .maybeSingle()
    if (freshErr) { console.error(`ERROR re-reading ${c.sentenceId}: ${freshErr.message}`); continue }
    const freshBefore = (fresh && fresh.rerecord_wanted && typeof fresh.rerecord_wanted === 'object') ? fresh.rerecord_wanted : {}
    if (JSON.stringify(freshBefore) !== JSON.stringify(before)) {
      drifted += 1
      console.log(`DRIFT ${c.sentenceId} — before-state changed since plan, skipping this run (safe to re-run)`)
      log.push({ ...c, sentenceId: c.sentenceId, wantKey, outcome: 'drifted', plannedBefore: before, actualBefore: freshBefore })
      continue
    }

    const { error: upErr } = await db
      .from('listening_pod_sentences')
      .update({ rerecord_wanted: next })
      .eq('id', c.sentenceId)
    if (upErr) { console.error(`ERROR writing ${c.sentenceId}: ${upErr.message}`); continue }

    const { data: after, error: afterErr } = await db
      .from('listening_pod_sentences')
      .select('rerecord_wanted')
      .eq('id', c.sentenceId)
      .maybeSingle()
    if (afterErr) { console.error(`ERROR verifying ${c.sentenceId}: ${afterErr.message}`); continue }
    if (!after || !after.rerecord_wanted || !after.rerecord_wanted[wantKey]) {
      throw new Error(`ABORT: want did not land on ${c.sentenceId}`)
    }

    propagated += 1
    console.log(`PROPAGATED ${c.sentenceId}.rerecord_wanted.${wantKey} = ${c.voiceId} ✅`)
    log.push({ ...c, sentenceId: c.sentenceId, wantKey, outcome: 'propagated', before, after: after.rerecord_wanted })
  }

  // Skip the on-disk log when a db was injected (unit tests) — a test run
  // must never overwrite the real evidence log next to this file.
  if (!injectedDb) {
    const out = path.join(__dirname, `propagate-take-quality-wants-${DRY_RUN ? 'dryrun' : 'applied'}-log.json`)
    fs.writeFileSync(out, JSON.stringify({ dryRun: DRY_RUN, rows: log, outOfScope }, null, 2))
    console.log(`Log: ${out}`)
  }
  console.log(`\n${DRY_RUN ? 'Planned' : 'Propagated'}: ${DRY_RUN ? candidates.length - alreadyWanted - missingRow : propagated}. Already-wanted: ${alreadyWanted}. Missing sentence row: ${missingRow}. Drifted (re-run to pick up): ${drifted}. Out of scope: ${outOfScope.length}.`)
}

module.exports = { parseNotes, resolveIdentity, run }

if (require.main === module) {
  run().catch((e) => { console.error(String(e.message || e)); process.exit(1) })
}
