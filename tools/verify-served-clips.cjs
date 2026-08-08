#!/usr/bin/env node
/**
 * verify-served-clips.cjs — prove, per clip, that what the SERVING layer hands
 * back is the new object and not the old one.
 *
 * Written 2026-08-06 alongside regen-seed-clips-from-scratch.cjs. Producing a
 * file is not the deliverable; the deliverable is that the bytes a consumer
 * receives have changed. This checks the three resolution paths that exist,
 * independently, because they disagreed with each other and that disagreement
 * is what made the overnight repair invisible:
 *
 *   1. CONVENTION  — `mastered/<ID>.mp3` derived from the audio id, which is
 *      what Popty's script viewer builds (src/composables/useScriptPlayer.js,
 *      src/services/api.js). Fetched straight from the bucket.
 *   2. S3_KEY      — the object `course_audio.s3_key` actually names, which is
 *      what the learner app's /api/audio/<id> resolves at request time.
 *   3. LEDGER      — the previous key recorded in course_audio_revisions, to
 *      confirm the OLD object is still alive and still comparable.
 *
 * A clip only passes when 1 and 2 name the SAME object, that object is present,
 * and its bytes differ from the old one. Convention and s3_key agreeing is not
 * a formality: it is the exact property the overnight run lacked.
 *
 *   node tools/verify-served-clips.cjs deu_for_eng --seeds 1-5
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const crypto = require('crypto')
const path = require('path')
const { GetObjectCommand } = require('@aws-sdk/client-s3')
const { createClient } = require('@supabase/supabase-js')

process.env.PHASE8_NO_LISTEN = '1'
const p8 = require('../services/phases/phase8-audio-v13.cjs')

const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null }
const COURSE = process.argv[2]
const SEEDS = arg('--seeds') || '1-5'
const OUT = arg('--out') || path.join(__dirname, '..', 'docs', 'audio-repair-2026-08-06', `${COURSE}-seeds${SEEDS}-serving-verification.json`)
const [SEED_FROM, SEED_TO] = SEEDS.split('-').map(Number)

const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const SLOT = {
  known: 'known_audio_id', target1: 'target1_audio_id',
  target2: 'target2_audio_id', presentation: 'presentation_audio_id',
}

async function fetchKey (key) {
  try {
    const r = await p8.s3.send(new GetObjectCommand({ Bucket: p8.S3_BUCKET, Key: key }))
    const chunks = []
    for await (const c of r.Body) chunks.push(c)
    const buf = Buffer.concat(chunks)
    return { ok: true, bytes: buf.length, md5: crypto.createHash('md5').update(buf).digest('hex'), cacheControl: r.CacheControl || null }
  } catch (e) {
    return { ok: false, error: e.name || e.message }
  }
}

;(async () => {
  const { data: legos } = await supabase.from('course_legos')
    .select('id, lego_id, seed_number, lego_index, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
    .eq('course_code', COURSE).gte('seed_number', SEED_FROM).lte('seed_number', SEED_TO)
    .order('seed_number').order('lego_index')

  const results = []
  let pass = 0, fail = 0

  for (const l of legos || []) {
    for (const [role, col] of Object.entries(SLOT)) {
      const id = l[col]
      if (!id) { results.push({ lego: l.lego_id, role, verdict: 'EMPTY-SLOT' }); fail++; continue }

      const { data: row } = await supabase.from('course_audio')
        .select('id, s3_key, audio_revision, duration_ms, text, voice_id, veracity_pass, veracity_checked_at').eq('id', id).single()
      if (!row) { results.push({ lego: l.lego_id, role, id, verdict: 'ROW-MISSING' }); fail++; continue }

      const conventionKey = `mastered/${id.toUpperCase()}.mp3`
      const convention = await fetchKey(conventionKey)
      const viaKey = row.s3_key === conventionKey ? convention : await fetchKey(row.s3_key)

      const { data: led } = await supabase.from('course_audio_revisions')
        .select('previous_s3_key, previous_duration_ms, previous_revision, new_s3_key, revision')
        .eq('audio_id', id).order('revision', { ascending: false }).limit(1)
      const ledger = (led || [])[0] || null
      const previous = ledger ? await fetchKey(ledger.previous_s3_key) : null

      const agreed = row.s3_key === conventionKey
      const changed = previous && previous.ok && convention.ok ? previous.md5 !== convention.md5 : null
      const verdict = (agreed && convention.ok && changed === true) ? 'PASS'
        : (agreed && convention.ok && !ledger) ? 'PASS-NO-LEDGER'
          : !agreed ? 'FAIL-CONVENTION-MISMATCH'
            : !convention.ok ? 'FAIL-OBJECT-MISSING'
              : changed === false ? 'FAIL-BYTES-IDENTICAL' : 'FAIL-OLD-OBJECT-GONE'
      if (verdict.startsWith('PASS')) pass++; else fail++

      results.push({
        lego: l.lego_id, role, knownText: l.known_text, targetText: l.target_text,
        newId: id, revision: row.audio_revision, voice: row.voice_id,
        s3Key: row.s3_key, conventionKey, conventionMatchesS3Key: agreed,
        newObject: convention, newDurationMs: row.duration_ms,
        veracityPass: row.veracity_pass, veracityCheckedAt: row.veracity_checked_at,
        oldKey: ledger ? ledger.previous_s3_key : null,
        oldRevision: ledger ? ledger.previous_revision : null,
        oldDurationMs: ledger ? ledger.previous_duration_ms : null,
        oldObjectStillAlive: previous ? previous.ok : null,
        oldObject: previous,
        bytesChanged: changed,
        publicUrl: `https://${p8.S3_BUCKET}.s3.eu-west-1.amazonaws.com/${row.s3_key}`,
        learnerUrl: `/api/audio/${id}`,
        verdict,
      })
      console.log(`${l.lego_id} ${role.padEnd(13)} ${verdict.padEnd(26)} rev${row.audio_revision} ${row.s3_key}`)
    }
  }

  require('fs').mkdirSync(path.dirname(OUT), { recursive: true })
  require('fs').writeFileSync(OUT, JSON.stringify({ course: COURSE, seeds: SEEDS, checkedAt: new Date().toISOString(), pass, fail, results }, null, 2))
  console.log(`\n${pass} pass, ${fail} fail`)
  console.log(`→ ${OUT}`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('FATAL', e); process.exit(1) })
