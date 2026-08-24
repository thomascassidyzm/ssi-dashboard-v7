#!/usr/bin/env node
/**
 * repair-nonserving-course-audio — repoint course_audio rows whose object a
 * learner genuinely cannot fetch onto a take that is proven alive first.
 *
 * WHAT COUNTS AS "CANNOT FETCH" — this matters, and the obvious answer is wrong.
 *
 * Both learner read paths use SERVER credentials:
 *   * `/api/audio/:id`        (api/audio/[audioId].ts) — S3 GetObject, service creds
 *   * `/api/audio/batch-urls` (api/audio/batch-urls.ts) — presigned GET URLs
 * `AUDIO_CONFIG.s3BaseUrl` exists in player-vue but has NO consumer, so the
 * anonymous public URL is on nobody's playback path. An anonymous 403 therefore
 * says the bucket prefix is private — NOT that a learner hears silence.
 *
 * The real test is whether the OBJECT EXISTS. Measured across all 1,379
 * non-`mastered/` rows (scripts/probe-broken-rows.cjs, 2026-08-14):
 *   repair-candidates/ 1,303 — object EXISTS, presigned GET 200  → audible
 *   mastered-v2/          26 — object EXISTS, presigned GET 200  → audible
 *   pending/              50 — object MISSING                    → SILENT
 * Only the `pending/` rows are a learner-facing defect; this tool repairs those.
 *
 * MAKE-BEFORE-BREAK (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b):
 * every replacement is fetched and proven to be real audio BEFORE any row is
 * written, every write is logged to audio_convergence_log with the superseded
 * key, and every repaired row is re-fetched afterwards. No S3 object is ever
 * deleted or overwritten.
 *
 * Rows with no serving take anywhere are NOT invented — they are queued for a
 * re-render through the normal audio-pass queue and counted as queued.
 *
 *   node tools/repair-nonserving-course-audio.cjs            # DRY RUN
 *   node tools/repair-nonserving-course-audio.cjs --apply
 *
 * Requires _fix_plan (scripts/build-repair-plan.sql) and .env.psql.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const { HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

process.env.PHASE8_NO_LISTEN = '1';
const p8 = require('../services/phases/phase8-audio-v13.cjs');
const { queueAudioPass } = require('../services/shared/audio-pass-queue.cjs');

const APPLY = process.argv.includes('--apply');
const PASS = 'repair-nonserving-2026-08-14';
const BUCKET = p8.S3_BUCKET;
const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || path.join(__dirname, '..', 'docs', 'canonical-audio',
  `nonserving-course-audio-${APPLY ? 'applied' : 'dryrun'}-log.json`);

function databaseUrl() {
  const p = path.join(__dirname, '..', '.env.psql');
  const m = fs.readFileSync(p, 'utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
  if (!m) throw new Error('.env.psql has no DATABASE_URL');
  return m[1].trim();
}

/** Fetch a key the way a learner's browser does: presigned URL, no credentials. */
async function fetchAsLearner(key) {
  try {
    await p8.s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (e) {
    return { ok: false, stage: 'head', error: e.name || e.message };
  }
  try {
    const url = await getSignedUrl(p8.s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 300 });
    const r = await fetch(url);
    if (!r.ok) return { ok: false, stage: 'get', status: r.status };
    const buf = Buffer.from(await r.arrayBuffer());
    const isMp3 = buf.length > 2 && (buf[0] === 0x49 || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0));
    return {
      ok: isMp3 && buf.length >= 1024,
      status: r.status,
      bytes: buf.length,
      sha256: crypto.createHash('sha256').update(buf).digest('hex'),
      isMp3,
    };
  } catch (e) {
    return { ok: false, stage: 'get', error: e.message };
  }
}

async function main() {
  const pg = new Client({ connectionString: databaseUrl() });
  await pg.connect();

  // Only the rows a learner genuinely cannot fetch. The plan's own reachability
  // is recomputed here rather than trusted, so the log stands on its own.
  const { rows: plan } = await pg.query(`
    SELECT p.audio_id, p.course_code, p.prefix, p.old_s3_key, p.action,
           p.canon_s3_key, p.serving_s3_key, p.serving_audio_id, p.serving_course,
           ca.text_normalized, ca.language, ca.role, ca.voice_id,
           ca.duration_ms AS old_duration_ms, ca.audio_revision,
           c.id AS canon_clip_id, c.duration_ms AS canon_duration_ms,
           (EXISTS (SELECT 1 FROM course_legos l WHERE l.known_audio_id=p.audio_id OR l.target1_audio_id=p.audio_id OR l.target2_audio_id=p.audio_id OR l.presentation_audio_id=p.audio_id::text)
         OR EXISTS (SELECT 1 FROM course_practice_phrases f WHERE f.known_audio_id=p.audio_id OR f.target1_audio_id=p.audio_id OR f.target2_audio_id=p.audio_id OR f.presentation_audio_id=p.audio_id)
         OR EXISTS (SELECT 1 FROM course_seeds s WHERE s.known_audio_id=p.audio_id OR s.target1_audio_id=p.audio_id OR s.target2_audio_id=p.audio_id)
         OR EXISTS (SELECT 1 FROM lego_introductions li WHERE li.presentation_audio_id=p.audio_id)) AS reachable
    FROM _fix_plan p
    JOIN course_audio ca ON ca.id = p.audio_id
    LEFT JOIN audio_clips c
      ON c.text_key=p.text_key AND c.language=p.language
     AND c.role=p.role AND c.voice_id=p.voice_id
    WHERE p.prefix = 'pending'
    ORDER BY p.action, p.course_code
  `);

  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${plan.length} pending/ rows\n`);

  const log = { pass: PASS, apply: APPLY, bucket: BUCKET, ranAt: new Date().toISOString(), repointed: [], queued: [], skipped: [] };

  // ---- 1. Confirm the OLD object really is missing. A row whose bytes are
  //         alive is not this pass's business, whatever the prefix says.
  for (const r of plan) {
    r.oldProbe = await fetchAsLearner(r.old_s3_key);
    if (r.oldProbe.ok) {
      log.skipped.push({ audioId: r.audio_id, reason: 'old object is alive and serves — not a defect', key: r.old_s3_key, probe: r.oldProbe });
    }
  }
  const broken = plan.filter((r) => !r.oldProbe.ok);
  console.log(`old-object probe: ${broken.length} genuinely missing, ${plan.length - broken.length} alive (skipped)\n`);

  // ---- 2. MAKE: prove every replacement is real audio BEFORE any write.
  const repoints = broken.filter((r) => r.action !== 'no_serving_take');
  for (const r of repoints) {
    r.newKey = r.canon_s3_key && r.canon_s3_key.startsWith('mastered/') ? r.canon_s3_key : r.serving_s3_key;
    r.newProbe = await fetchAsLearner(r.newKey);
    console.log(`  ${r.newProbe.ok ? 'ALIVE ' : 'DEAD  '} ${r.newKey}  ${r.newProbe.bytes || 0}B  "${r.text_normalized}"`);
  }
  const ready = repoints.filter((r) => r.newProbe.ok);
  const notReady = repoints.filter((r) => !r.newProbe.ok);
  for (const r of notReady) {
    log.skipped.push({ audioId: r.audio_id, reason: 'replacement did not verify — never swapped', key: r.newKey, probe: r.newProbe });
  }
  console.log(`\nverified replacements: ${ready.length}/${repoints.length}`);

  if (ready.length !== repoints.length && APPLY) {
    console.log('Some replacements failed verification; they are skipped, not swapped.');
  }

  // ---- 3. BREAK: log first, then swap. Nothing is deleted.
  if (APPLY && ready.length) {
    for (const r of ready) {
      await pg.query('BEGIN');
      try {
        await pg.query(
          `INSERT INTO audio_convergence_log
             (audio_id, course_code, old_s3_key, new_s3_key, old_duration_ms, new_duration_ms, bucket, pass)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [r.audio_id, r.course_code, r.old_s3_key, r.newKey, r.old_duration_ms, r.canon_duration_ms ?? null, 'pending_object_missing', PASS],
        );
        // Assert the before-state, so a row that moved under us aborts rather
        // than being silently overwritten.
        const upd = await pg.query(
          // course_audio has no updated_at column; audio_convergence_log above
          // is the timestamped record of this change.
          `UPDATE course_audio
              SET s3_key = $1,
                  clip_id = COALESCE($2, clip_id)
            WHERE id = $3 AND s3_key = $4`,
          [r.newKey, r.canon_clip_id || null, r.audio_id, r.old_s3_key],
        );
        if (upd.rowCount !== 1) throw new Error(`before-state drift: ${upd.rowCount} rows matched`);
        await pg.query('COMMIT');
        r.applied = true;
      } catch (e) {
        await pg.query('ROLLBACK');
        r.applied = false;
        r.error = e.message;
      }
    }
  }

  for (const r of ready) {
    log.repointed.push({
      audioId: r.audio_id, course: r.course_code, language: r.language, role: r.role,
      voiceId: r.voice_id, text: r.text_normalized, action: r.action,
      oldKey: r.old_s3_key, oldProbe: r.oldProbe,
      newKey: r.newKey, newProbe: r.newProbe,
      fromCourse: r.serving_course, reachableByLearner: r.reachable,
      applied: APPLY ? !!r.applied : false, error: r.error || null,
    });
  }

  // ---- 4. Verify AFTER: re-fetch each repaired row's stored key as a learner.
  if (APPLY && ready.length) {
    console.log('\nafter-swap re-fetch:');
    for (const e of log.repointed.filter((x) => x.applied)) {
      const { rows: [row] } = await pg.query('SELECT s3_key FROM course_audio WHERE id=$1', [e.audioId]);
      e.storedKeyAfter = row.s3_key;
      e.afterProbe = await fetchAsLearner(row.s3_key);
      e.verdict = e.storedKeyAfter === e.newKey && e.afterProbe.ok
        && e.afterProbe.sha256 === e.newProbe.sha256 ? 'PASS' : 'FAIL';
      console.log(`  ${e.verdict}  ${e.storedKeyAfter}  ${e.afterProbe.bytes || 0}B`);
    }
  }

  // ---- 5. Queue what genuinely has nothing fetchable anywhere. Never fabricate.
  const orphans = broken.filter((r) => r.action === 'no_serving_take').concat(notReady);
  const byCourse = {};
  for (const r of orphans) (byCourse[r.course_code] ||= []).push(r);

  const supabase = createClient(
    (process.env.SUPABASE_URL || '').trim(),
    (process.env.SUPABASE_SERVICE_KEY || '').trim(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  for (const [course, rows] of Object.entries(byCourse)) {
    const reachable = rows.filter((r) => r.reachable).length;
    const entry = {
      course,
      rows: rows.length,
      reachableByLearner: reachable,
      lines: rows.map((r) => ({ audioId: r.audio_id, role: r.role, language: r.language, voiceId: r.voice_id, text: r.text_normalized, deadKey: r.old_s3_key, reachable: r.reachable })),
      queueResult: null,
    };
    if (APPLY) {
      entry.queueResult = await queueAudioPass(supabase, {
        courseCode: course,
        reason: `re-render ${rows.length} clips whose pending/ object never existed (${reachable} learner-reachable)`,
        requestedBy: '@watson/repair-nonserving-course-audio',
        metadata: { pass: PASS, deadRows: rows.length, reachable, audioIds: rows.map((r) => r.audio_id) },
      });
    }
    log.queued.push(entry);
    console.log(`\nqueue ${course}: ${rows.length} rows (${reachable} reachable)${APPLY ? ` → ${JSON.stringify(entry.queueResult)}` : ' [dry run]'}`);
  }

  await pg.end();

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(log, null, 2));

  const passed = log.repointed.filter((r) => r.verdict === 'PASS').length;
  console.log(`\n=== ${APPLY ? 'APPLIED' : 'DRY RUN'} ===`);
  console.log(`repointed : ${APPLY ? passed : ready.length}${APPLY ? ` (verified PASS)` : ' (would repoint)'}`);
  console.log(`queued    : ${orphans.length} rows across ${Object.keys(byCourse).length} courses`);
  console.log(`skipped   : ${log.skipped.length}`);
  console.log(`→ ${OUT}`);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
