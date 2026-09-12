#!/usr/bin/env node
/**
 * repoint-refused-known-splits-ita-2026-08-25.cjs — fill the known-side split
 * arrays the 2026-08-24 splice pass REFUSED, from clips that already exist.
 *
 * THE BUG TOM HEARD (2026-08-25 ~02:00Z, reviewing Italian Pod 1 by ear):
 * "a couple of phrases didn't exist just then for me" — English lines playing
 * no audio at all.
 *
 * THE CHAIN, established end to end before anything was written:
 *
 *   1. `splice-known-sentence-clips.cjs` ran on ita_for_eng on 2026-08-24 and
 *      REFUSED 12 rows on its audio gates — margin_below_floor (6),
 *      too_few_gaps (5), seam_not_silent (1). Refusing was right: those
 *      whole-turn English takes have no clean interior silence to cut at.
 *   2. A refusal leaves `sentence_known_audio_ids` NULL. The pass's premise was
 *      that a refused row simply falls back to its whole-turn known clip.
 *   3. IT DOES NOT, whenever the TARGET side of that row IS split. All 12 have
 *      2-5 target clips. `podSentenceSplit.splitRowUnits` pairs the known array
 *      in only when `knownClips.length === clips.length`; otherwise every unit
 *      gets `knownAudioId: null`. There is no whole-turn fallback on that path
 *      — the split has already been committed to by the target side.
 *   4. Net: 41 per-sentence cards render Italian audio and English TEXT with no
 *      English AUDIO. Both doors agree (overlay, with the textById oracle, and
 *      the main-flow scheduler without it) — simulated row by row against the
 *      live rows before this tool was written.
 *
 * WHY THE PASS COULDN'T SEE THE FREE FIX. It looks for an existing clip with
 * `p8.findExistingAudio(COURSE, ...)` — scoped to the course. But the English
 * narration of Pod 1 is ONE POOLED CORPUS: the canonical scenario is the same
 * in every course, clips are matched to rows BY TEXT, and 110 distinct known
 * clips already serve 649 rows across 59 pods (measured 2026-08-24). 39 of the
 * 41 refused sentences already exist as standalone clips in the same voice —
 * they were simply filed under another course's `course_code`. Course-scoping
 * the lookup is what hid them.
 *
 * WHAT THIS TOOL DOES. Pure link update: writes `sentence_known_audio_ids` on
 * the 10 rows where EVERY sentence has such a clip. No TTS, no S3 write, no
 * money, no text touched, nothing deleted.
 *
 * ALL-OR-NOTHING PER ROW, deliberately. A known array shorter than the target
 * array is not a partial win, it is no win at all (see 3 above) — so the two
 * rows with one un-poolable sentence each are left NULL rather than written
 * half-filled, and reported as the explicit residue.
 *
 * THE PREMISE IS PROVED PER ROW BEFORE THE WRITE, not assumed:
 *   - the row still exists in the live pod and its target array still has N;
 *   - `sentence_known_audio_ids` is still NULL (abort on drift — another pass
 *     may have filled it since the census);
 *   - the row's own known_text still splits into exactly those N sentences;
 *   - every candidate clip exists in course_audio, is language eng, role known,
 *     carries the SAME VOICE as the row's own whole-turn known clip (bare and
 *     `xai_`-prefixed ids are the same voice), has a non-null s3_key, and its
 *     stored text matches the sentence EXACTLY — the clip's text is what the
 *     overlay displays on the card, so a lower-cased variant would be a visible
 *     regression;
 *   - every candidate clip SERVES over HTTP with a non-trivial body. Pointing a
 *     live pod at a dead key is worse than leaving it silent — the lesson of
 *     the fra Azure purge.
 *
 * Usage:  node tools/pods/repoint-refused-known-splits-ita-2026-08-25.cjs [--apply]
 * Writes: docs/pods/ita_for_eng-known-repoint-2026-08-25-{dryrun,applied}-log.json
 */

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const REPO = path.resolve(__dirname, '..', '..')
const POD_ID = 'ita_for_eng:pod-1'
const APPLY = process.argv.includes('--apply')
const AUDIO_URL = (id) => `https://saysomethingin.app/api/audio/${id}`

// Same boundary the client uses (podSentenceSplit.POD_SENTENCE_BOUNDARY).
const BOUNDARY = /(?<=[.!?])\s+/
const splitText = (t) => (t || '').split(BOUNDARY).map((s) => s.trim()).filter(Boolean)
// Bare and `xai_`-prefixed voice ids are the same voice.
const canonVoice = (v) => (v || '').replace(/^xai_/, '')

const dbUrl = () => {
  const raw = fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8')
  const m = raw.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)
  if (!m) throw new Error('.env.psql: no DATABASE_URL')
  return m[1]
}

async function serves(id) {
  try {
    const res = await fetch(AUDIO_URL(id), { headers: { Range: 'bytes=0-1023' } })
    if (res.status !== 200 && res.status !== 206) return { ok: false, status: res.status }
    const bytes = Buffer.from(await res.arrayBuffer()).length
    return { ok: bytes > 200, status: res.status, bytes }
  } catch (e) {
    return { ok: false, status: 'error', error: e.message }
  }
}

;(async () => {
  const db = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()

  // The candidate rows: target side split, known side absent or mis-counted.
  const { rows } = await db.query(`
    select s.id, s.global_order, s.scene_number, s.known_text,
           s.known_audio_id, ka.voice_id known_voice,
           array_length(s.sentence_audio_ids, 1) n_target,
           s.sentence_known_audio_ids
      from listening_pod_sentences s
      join course_audio ka on ka.id = s.known_audio_id
     where s.pod_id = $1
       and coalesce(array_length(s.sentence_audio_ids, 1), 0) >= 2
       and coalesce(array_length(s.sentence_known_audio_ids, 1), 0)
           <> coalesce(array_length(s.sentence_audio_ids, 1), 0)
     order by s.global_order`, [POD_ID])

  const log = {
    pod: POD_ID, apply: APPLY, at: new Date().toISOString(),
    candidates: rows.length, written: 0, residue: 0,
    rows: [], residue_rows: [], errors: [],
  }

  for (const row of rows) {
    const sentences = splitText(row.known_text)
    const rec = { id: row.id, at: `${row.scene_number}.${row.id.slice(-3).replace(/^0+/, '')}`,
                  n_target: row.n_target, sentences, picks: [] }

    if (row.sentence_known_audio_ids !== null) {
      rec.skipped = 'drift: sentence_known_audio_ids no longer NULL'
      log.errors.push(rec); continue
    }
    if (sentences.length !== row.n_target) {
      rec.skipped = `known_text splits into ${sentences.length}, target array is ${row.n_target}`
      log.residue_rows.push(rec); log.residue += row.n_target; continue
    }

    let complete = true
    for (const sentence of sentences) {
      const { rows: cands } = await db.query(`
        select ca.id, ca.course_code, ca.voice_id, ca.text, ca.duration_ms,
               (select count(*) from listening_pod_sentences s
                 where s.known_audio_id = ca.id or ca.id = any(s.sentence_known_audio_ids)) nrefs
          from course_audio ca
         where ca.language = 'eng'
           and ca.role in ('known', 'pod_fine_known')
           and ca.s3_key is not null
           and coalesce(ca.duration_ms, 0) > 0
           and replace(ca.voice_id, 'xai_', '') = $1
           and btrim(ca.text) = $2
         order by (ca.course_code = 'ita_for_eng') desc, nrefs desc, ca.id
         limit 1`, [canonVoice(row.known_voice), sentence])

      const pick = cands[0]
      if (!pick) { rec.picks.push({ sentence, pick: null, reason: 'no pooled clip in this voice' }); complete = false; continue }
      const health = await serves(pick.id)
      if (!health.ok) { rec.picks.push({ sentence, pick: pick.id, reason: 'clip does not serve', health }); complete = false; continue }
      rec.picks.push({ sentence, pick: pick.id, from_course: pick.course_code,
                       voice: pick.voice_id, duration_ms: pick.duration_ms, nrefs: +pick.nrefs, health })
    }

    if (!complete) {
      rec.outcome = 'RESIDUE — left NULL (a short known array is no win at all)'
      log.residue_rows.push(rec); log.residue += row.n_target; continue
    }

    const ids = rec.picks.map((p) => p.pick)
    if (APPLY) {
      // Re-assert NULL inside the UPDATE: the only writer of this column, and
      // the guard against a concurrent pass having filled it since the read.
      const res = await db.query(
        `update listening_pod_sentences set sentence_known_audio_ids = $1, updated_at = now()
          where id = $2 and pod_id = $3 and sentence_known_audio_ids is null`,
        [ids, row.id, POD_ID])
      if (res.rowCount !== 1) { rec.skipped = `drift: update matched ${res.rowCount} rows`; log.errors.push(rec); continue }
    }
    rec.outcome = APPLY ? 'WRITTEN' : 'WOULD WRITE'
    rec.wrote = ids
    log.written += row.n_target
    log.rows.push(rec)
  }

  const out = path.join(REPO, 'docs', 'pods',
    `ita_for_eng-known-repoint-2026-08-25-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 1))

  console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'} — ${log.rows.length}/${log.candidates} rows ` +
    `${APPLY ? 'written' : 'writable'}, ${log.written} sentence units recovered; ` +
    `${log.residue_rows.length} rows / ${log.residue} units residue; ${log.errors.length} errors`)
  console.log(`log: ${path.relative(REPO, out)}`)
  await db.end()
})().catch((e) => { console.error('FAIL', e.message); process.exit(1) })
