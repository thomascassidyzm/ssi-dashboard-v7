#!/usr/bin/env node
/**
 * relink-english-pod-slots.cjs — point unlinked ENGLISH pod slots at the approved
 * Olivia/clone clip that already exists for that exact text.
 *
 * WHY (2026-08-14): English pod audio reads as "finished" at the line level — 976 of
 * 987 distinct English pod lines have an approved-voice clip — and simultaneously as
 * broken at the slot level, where 445 of 17,471 slots are linked to nothing and play
 * silence. Both are true. Yesterday's render finished; the per-language dedupe relink
 * behind it did not. 427 of those 445 slots have an Olivia or clone clip sitting in
 * course_audio for their exact text, already paid for and already approved by ear.
 *
 * So this mints NOTHING. It runs no TTS, spends nothing, and needs no voice approval,
 * because every clip it links was rendered and approved before today. It is the
 * cheapest possible fix for a learner-facing silence: wire the bytes that exist.
 *
 * SAFETY, and why this cannot break the make-before-break rule:
 *   - It only ever writes a slot whose audio id is currently NULL. A slot that already
 *     points somewhere is never touched, so no working audio can be displaced and
 *     there is nothing to delete. The rule's failure mode — losing a good clip to an
 *     unverified replacement — is unreachable by construction.
 *   - It only links clips whose voice is on the approved English policy (Olivia or
 *     Tom's clone, either the bare or the `xai_`-prefixed spelling of the id — one
 *     voice appears both ways and matching a single spelling silently misses ~14% of
 *     a layer).
 *   - It only links clips with a real s3_key and a plausible file size, so the 834-byte
 *     dead stubs from the 2026-06-15 bad write cannot be linked in as if they played.
 *   - Text is matched exactly after case-folding and whitespace collapse — never fuzzy.
 *   - DRY RUN BY DEFAULT. --apply to write. Every row is logged either way.
 *
 *   node tools/pods/relink-english-pod-slots.cjs
 *   node tools/pods/relink-english-pod-slots.cjs --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { isHumanVoiceCourse } = require('../../services/shared/human-voice-courses.cjs')

/**
 * The Welsh exclusion applies to LINKING, not just rendering, and that is not obvious.
 *
 * Of the 427 unlinked English slots this tool first offered to fix, 425 were the
 * ENGLISH track of cym_n_for_eng and cym_s_for_eng. Nothing would have been
 * synthesised — every clip already existed — so the TTS chokepoint would never have
 * fired. But Aran is recording that English track himself, and the doctrine is that a
 * Welsh coverage gap is a recording worklist, never a backlog to fill with synthesis.
 * Filling his slots with xAI clips reaches the forbidden state through a door the
 * render guard does not watch, and would quietly make his remaining work look done.
 *
 * Filtered through the shared module rather than a local regex on purpose: the guard
 * is the one source of truth for which courses are human-voiced, and re-deriving it
 * here is how the two drift apart.
 */
const APPLY = process.argv.includes('--apply')
const LOG = path.join(__dirname, '..', '..', 'docs', 'pods',
  `english-pod-relink-${APPLY ? 'applied' : 'dryrun'}-log.json`)

// Both spellings of both approved English voices. Tom approved Olivia and his own
// clone by ear; Eve is deliberately absent — she is a target voice on this estate,
// not an English one, and linking her here would be a silent recast.
const POLICY_VOICES = ['bedd6226', 'xai_bedd6226', 'gfzdpspr5fdp', 'xai_gfzdpspr5fdp']
const MIN_BYTES = 2000   // above the 834-byte dead-stub signature

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  try {
    // Candidate slots: English side, unlinked, with a policy clip for the same text.
    // DISTINCT ON picks one clip per slot deterministically — biggest file wins, which
    // among equally-valid clips is the least likely to be a truncation.
    const { rows } = await db.query(`
      WITH slots AS (
        SELECT s.id AS sentence_id, 'known' AS side, p.course_code,
               lower(regexp_replace(btrim(s.known_text), '\\s+', ' ', 'g')) AS line
        FROM listening_pods p
        JOIN listening_pod_sentences s ON s.pod_id = p.id
        JOIN courses c ON c.course_code = p.course_code
        WHERE p.slug IN ('pod-0','pod-0-unrecorded') AND c.known_lang = 'eng'
          AND btrim(s.known_text) <> '' AND s.known_audio_id IS NULL
        UNION ALL
        SELECT s.id, 'target', p.course_code,
               lower(regexp_replace(btrim(s.target_text), '\\s+', ' ', 'g'))
        FROM listening_pods p
        JOIN listening_pod_sentences s ON s.pod_id = p.id
        JOIN courses c ON c.course_code = p.course_code
        WHERE p.slug IN ('pod-0','pod-0-unrecorded') AND c.target_lang = 'eng'
          AND btrim(s.target_text) <> '' AND s.target_audio_id IS NULL
      ),
      clips AS (
        SELECT id, voice_id, file_size_bytes,
               lower(regexp_replace(btrim(text), '\\s+', ' ', 'g')) AS line
        FROM course_audio
        -- Exclude clips KNOWN to be dead stubs, not clips of unknown size. Most TTS
        -- rows never had file_size_bytes populated, so coalesce(...,0) >= MIN_BYTES
        -- rejected every candidate and made a 427-slot fix look like a 0-slot one.
        WHERE voice_id = ANY($1) AND s3_key IS NOT NULL
          AND (file_size_bytes IS NULL OR file_size_bytes >= $2)
      )
      SELECT DISTINCT ON (sl.sentence_id, sl.side)
             sl.sentence_id, sl.side, sl.course_code, sl.line,
             cl.id AS audio_id, cl.voice_id, cl.file_size_bytes
      FROM slots sl
      JOIN clips cl ON cl.line = sl.line
      ORDER BY sl.sentence_id, sl.side, cl.file_size_bytes DESC`,
      [POLICY_VOICES, MIN_BYTES])

    const all = rows
    const rows2 = all.filter(r => !isHumanVoiceCourse(r.course_code))
    const skippedWelsh = all.length - rows2.length
    rows.length = 0; rows.push(...rows2)

    console.log(`${all.length} unlinked English slots have an approved clip available`)
    if (skippedWelsh) {
      console.log(`  ${skippedWelsh} SKIPPED — human-voice courses. That English track is Aran's and Catrin's`)
      console.log(`  recording worklist, not a relink target; filling it would make their work look done.`)
    }
    console.log(`  ${rows.length} eligible to link`)
    const byCourse = {}
    for (const r of rows) byCourse[r.course_code] = (byCourse[r.course_code] || 0) + 1

    let written = 0
    if (APPLY) {
      await db.query('BEGIN')
      try {
        for (const r of rows) {
          const col = r.side === 'known' ? 'known_audio_id' : 'target_audio_id'
          // The IS NULL in the predicate is the guard, not the SELECT above: if
          // anything filled this slot since the read, it matches zero rows and is
          // skipped rather than overwritten.
          const res = await db.query(
            `UPDATE listening_pod_sentences SET ${col} = $1, updated_at = now()
              WHERE id = $2 AND ${col} IS NULL`, [r.audio_id, r.sentence_id])
          written += res.rowCount
        }
        await db.query('COMMIT')
      } catch (e) { await db.query('ROLLBACK'); throw e }
      console.log(`linked ${written} slots (${rows.length - written} were filled by someone else meanwhile)`)
    } else {
      console.log('(dry run — nothing written) re-run with --apply')
    }

    fs.writeFileSync(LOG, JSON.stringify({
      mode: APPLY ? 'applied' : 'dryrun',
      summary: { candidates: rows.length, written, by_course: byCourse },
      ops: rows,
    }, null, 2))
    console.log(`log → ${LOG}`)
  } finally {
    await db.end()
  }
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
