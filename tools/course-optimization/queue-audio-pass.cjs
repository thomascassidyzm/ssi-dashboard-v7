#!/usr/bin/env node
/**
 * Queue an audio-pass request for a course — the standing END STEP of every
 * content pass (see services/shared/audio-pass-queue.cjs). Queues only; TTS
 * itself stays approval-gated, and nothing here renders.
 *
 * Usage:
 *   node tools/course-optimization/queue-audio-pass.cjs <course_code> --reason "<pass name>" [--by "@agent"] [--rows N] [--append]
 *   node tools/course-optimization/queue-audio-pass.cjs --list          # show open (pending + held) requests
 *
 * --append joins an open pending/held request without erasing it: its reason gains
 * this pass's reason, its requester is kept, and --rows lands under its own metadata
 * key (derived from --reason) instead of overwriting rowsTouched. Use it whenever the
 * course may already carry another pass's open request. A held request stays held.
 *
 * Ported off supabase-js onto pg (cs #854, 21 Nov 2026): the REST client was refused
 * by the DB guard since the 2026-11-05 bulk-read rule, which blocked #113, #431·AI,
 * #696·AI and #840·AJ from queueing. --list reads live too (one indexed-size table).
 *
 * @db-live-write: queues one audio_pass_requests row per call on live; a request on the read-only copy is no request
 */
const db = require('../../services/shared/agent-db.cjs')
const { queueAudioPassPg } = require('../../services/shared/audio-pass-queue.cjs')

const USAGE = 'Usage: queue-audio-pass.cjs <course_code> --reason "<pass name>" [--by "@agent"] [--rows N] [--append] | --list'

/** The metadata key an --append pass files its numbers under: a slug of its reason. */
function metadataKeyFor(reason) {
  return 'pass:' + reason.toLowerCase().replace(/[^a-z0-9#·]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

async function main() {
  const args = process.argv.slice(2)
  const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
  const valued = new Set(['--reason', '--by', '--rows'])
  const courseCode = args.find((a, i) => !a.startsWith('-') && !valued.has(args[i - 1]))
  const reason = flag('--reason')
  if (!args.includes('--list') && (!courseCode || !reason)) { console.error(USAGE); process.exit(1) }

  const pg = await db.connect()
  try {
    if (args.includes('--list')) {
      const { rows } = await pg.query(
        `select course_code, status, reason, requested_by, metadata, created_at, updated_at
           from audio_pass_requests where status = any($1::text[]) order by created_at`,
        [['pending', 'held']]
      )
      if (!rows.length) return console.log('No open audio-pass requests.')
      for (const r of rows) {
        console.log(`${r.course_code}  [${r.status}]  since ${r.created_at.toISOString()}  updated ${r.updated_at.toISOString()}  — ${r.reason} (${r.requested_by || 'unknown'})${r.metadata?.rowsTouched ? ` rows=${r.metadata.rowsTouched}` : ''}`)
      }
      return
    }

    const rowsArg = flag('--rows')
    const append = args.includes('--append')
    const result = await queueAudioPassPg(pg, {
      courseCode,
      reason,
      requestedBy: flag('--by'),
      metadata: rowsArg ? { rowsTouched: Number(rowsArg) } : {},
      append,
      metadataKey: append ? metadataKeyFor(reason) : null,
    })
    if (result.error) { console.error(`FAILED: ${result.error}`); process.exit(1) }
    if (result.refused) {
      console.error(
        `REFUSED: ${courseCode} is a human-voice course — no TTS is ever queued for it ` +
        '(Tom 2026-08-13). Changed content there is a recording task for Aran and Catrin.'
      )
      process.exit(2)
    }
    console.log(result.queued
      ? `Queued audio-pass request for ${courseCode} (id ${result.id}).`
      : `Open ${result.held ? 'HELD' : 'pending'} request for ${courseCode} already existed — ${append ? 'joined' : 'touched'} it (id ${result.id}).`)
  } finally {
    await pg.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
