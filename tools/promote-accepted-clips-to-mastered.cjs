#!/usr/bin/env node
/**
 * promote-accepted-clips-to-mastered — copy accepted clips that live on
 * non-standard prefixes onto the standard `mastered/` prefix, then repoint the
 * rows at the copy. A PLAIN BYTE COPY: nothing is re-rendered, nothing is
 * re-chosen, nothing is deleted.
 *
 * WHY. Job 1c5b0f9b measured 1,329 course_audio rows that a learner can hear
 * today but which sit outside the serving convention: 1,303 on
 * `repair-candidates/` (every one of them status='accepted' in
 * audio_repair_candidates, 292 of those decided by Tom himself) and 26 on
 * `mastered-v2/`. `mastered/` is the one prefix the bucket policy makes
 * anonymously readable, and the only one canon reuse will touch — so while the
 * bytes serve, the clips can never become canon. Tom approved the promotion on
 * 2026-08-14: these clips already play to learners, so standardising where they
 * live exposes nothing new.
 *
 * WHAT IT IS NOT. Not a re-render, not a re-selection. Tom's 292 personal
 * acceptances must come out the far side byte-identical to what he picked, so
 * the source object's bytes are the only thing that ever reaches `mastered/`.
 *
 * MAKE-BEFORE-BREAK (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b), in
 * this order, per clip:
 *   1. fetch the source object as a learner does (presigned GET), SHA-256 it;
 *   2. refuse to touch a `mastered/` key that already exists with different
 *      bytes — an existing identical object is treated as already promoted;
 *   3. CopyObject source -> mastered/<same basename>;
 *   4. re-fetch the NEW key and require SHA-256 equality with the source;
 *   5. only then log the supersede and swap the row, the UPDATE asserting the
 *      old key in its WHERE clause so a row that moved under us aborts;
 *   6. re-read the stored key and fetch it again — final PASS/FAIL.
 * No S3 object is ever deleted or overwritten, and the old key stays live.
 *
 *   node tools/promote-accepted-clips-to-mastered.cjs            # DRY RUN
 *   node tools/promote-accepted-clips-to-mastered.cjs --apply
 *   node tools/promote-accepted-clips-to-mastered.cjs --limit 20 # pilot slice
 *
 * Requires .env (S3 creds) and .env.psql.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const { HeadObjectCommand, GetObjectCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

process.env.PHASE8_NO_LISTEN = '1';
const p8 = require('../services/phases/phase8-audio-v13.cjs');
const { AUDIO_CACHE_CONTROL } = require('../services/shared/audio-cache-control.cjs');

const APPLY = process.argv.includes('--apply');
const PASS = 'promote-accepted-to-mastered-2026-08-14';
const BUCKET = p8.S3_BUCKET;
const CONCURRENCY = 8;
const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const LIMIT = arg('--limit') ? parseInt(arg('--limit'), 10) : null;
const OUT = arg('--out') || path.join(__dirname, '..', 'docs', 'canonical-audio',
  `promote-accepted-to-mastered-${APPLY ? 'applied' : 'dryrun'}-log.json`);

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
    return { ok: false, exists: false, stage: 'head', error: e.name || e.message };
  }
  try {
    const url = await getSignedUrl(p8.s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 900 });
    const r = await fetch(url);
    if (!r.ok) return { ok: false, exists: true, stage: 'get', status: r.status };
    const buf = Buffer.from(await r.arrayBuffer());
    const isMp3 = buf.length > 2 && (buf[0] === 0x49 || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0));
    return {
      ok: isMp3 && buf.length >= 1024,
      exists: true,
      status: r.status,
      bytes: buf.length,
      sha256: crypto.createHash('sha256').update(buf).digest('hex'),
      isMp3,
    };
  } catch (e) {
    return { ok: false, exists: true, stage: 'get', error: e.message };
  }
}

/** Run `fn` over `items` with a small fixed pool, preserving order. */
async function pool(items, fn, size = CONCURRENCY) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}

async function main() {
  const pg = new Client({ connectionString: databaseUrl() });
  await pg.connect();

  // The scope is recomputed live rather than trusted from the handover: every
  // course_audio row whose object sits off the `mastered/` convention and is
  // NOT one of the known-missing `pending/` rows (those are job 1c5b0f9b's
  // business and have no bytes to promote).
  const { rows: plan } = await pg.query(`
    SELECT ca.id AS audio_id, ca.course_code, ca.s3_key AS old_key, ca.language,
           ca.role, ca.voice_id, ca.text_normalized, ca.duration_ms, ca.clip_id,
           split_part(ca.s3_key, '/', 1) AS prefix,
           arc.status  AS candidate_status,
           arc.decided_by,
           arc.decided_at,
           (SELECT count(*) FROM audio_clips c WHERE c.s3_key = ca.s3_key) AS clip_rows
      FROM course_audio ca
      LEFT JOIN audio_repair_candidates arc
        ON arc.audio_id = ca.id AND arc.s3_key = ca.s3_key AND arc.status = 'accepted'
     WHERE ca.s3_key LIKE 'repair-candidates/%' OR ca.s3_key LIKE 'mastered-v2/%'
     ORDER BY ca.course_code, ca.s3_key
  `);

  const rows = LIMIT ? plan.slice(0, LIMIT) : plan;
  for (const r of rows) r.newKey = `mastered/${r.old_key.split('/').slice(1).join('/')}`;

  const tomsOwn = (r) => r.decided_by === 'tom' || r.decided_by === 'watson-on-behalf-of-tom';
  const byPrefix = {};
  for (const r of rows) byPrefix[r.prefix] = (byPrefix[r.prefix] || 0) + 1;
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${rows.length} rows${LIMIT ? ` (limited from ${plan.length})` : ''}`);
  console.log(`  by prefix : ${JSON.stringify(byPrefix)}`);
  console.log(`  accepted  : ${rows.filter((r) => r.candidate_status === 'accepted').length}`);
  console.log(`  Tom's own : ${rows.filter(tomsOwn).length}\n`);

  const log = {
    pass: PASS, apply: APPLY, bucket: BUCKET, ranAt: new Date().toISOString(),
    scope: { rows: rows.length, byPrefix, tomsOwn: rows.filter(tomsOwn).length },
    promoted: [], skipped: [],
  };

  // ---- 1. MAKE. Read the source bytes, refuse a differing destination, copy,
  //         and prove the copy is byte-identical BEFORE anything is repointed.
  let done = 0;
  await pool(rows, async (r) => {
    r.srcProbe = await fetchAsLearner(r.old_key);
    if (!r.srcProbe.ok) { r.stage = 'source-unreadable'; return; }

    const destBefore = await fetchAsLearner(r.newKey);
    if (destBefore.exists) {
      if (destBefore.sha256 === r.srcProbe.sha256) {
        r.stage = 'already-present';          // copy is a no-op; the swap still runs
        r.dstProbe = destBefore;
        return;
      }
      // Same basename, different bytes — every `mastered-v2/X.mp3` has an older
      // `mastered/X.mp3` of the same UUID, which is what "v2" meant. That object
      // is NEVER overwritten: the promotion takes a fresh `mastered/` UUID and
      // copies the same bytes there. Still a plain byte copy; only the key moves.
      r.collidedWith = { key: r.newKey, sha256: destBefore.sha256, bytes: destBefore.bytes };
      for (let attempt = 0; ; attempt++) {
        const candidate = `mastered/${crypto.randomUUID().toUpperCase()}.mp3`;
        // eslint-disable-next-line no-await-in-loop
        const probe = await fetchAsLearner(candidate);
        if (!probe.exists) { r.newKey = candidate; break; }
        if (attempt >= 4) { r.stage = 'no-free-key'; return; }
      }
      r.keyStrategy = 'fresh-uuid';
    }

    if (APPLY) {
      await p8.s3.send(new CopyObjectCommand({
        Bucket: BUCKET,
        Key: r.newKey,
        CopySource: `${BUCKET}/${encodeURIComponent(r.old_key).replace(/%2F/g, '/')}`,
        ContentType: 'audio/mpeg',
        CacheControl: AUDIO_CACHE_CONTROL,
        MetadataDirective: 'REPLACE',
      }));
      r.dstProbe = await fetchAsLearner(r.newKey);
      r.stage = r.dstProbe.ok && r.dstProbe.sha256 === r.srcProbe.sha256 ? 'copied' : 'copy-mismatch';
    } else {
      r.stage = 'would-copy';
    }
    if (++done % 100 === 0) console.log(`  copied/checked ${done}/${rows.length}`);
  });

  const ready = rows.filter((r) => r.stage === 'copied' || r.stage === 'already-present' || r.stage === 'would-copy');
  for (const r of rows.filter((x) => !ready.includes(x))) {
    log.skipped.push({
      audioId: r.audio_id, course: r.course_code, oldKey: r.old_key, newKey: r.newKey,
      reason: r.stage, srcProbe: r.srcProbe, dstProbe: r.dstProbe || null,
    });
  }
  console.log(`\nMAKE: ${ready.length} verified identical on mastered/, ${log.skipped.length} skipped`);
  for (const [k, n] of Object.entries(ready.reduce((a, r) => ((a[r.stage] = (a[r.stage] || 0) + 1), a), {}))) {
    console.log(`  ${k}: ${n}`);
  }

  // ---- 2. BREAK. Log the supersede, then swap course_audio and audio_clips,
  //         each UPDATE asserting the old key. Nothing is deleted.
  if (APPLY) {
    for (const r of ready) {
      await pg.query('BEGIN');
      try {
        await pg.query(
          `INSERT INTO audio_convergence_log
             (audio_id, course_code, old_s3_key, new_s3_key, old_duration_ms, new_duration_ms, bucket, pass)
           VALUES ($1,$2,$3,$4,$5,$5,$6,$7)`,
          [r.audio_id, r.course_code, r.old_key, r.newKey, r.duration_ms, r.prefix, PASS],
        );
        const upd = await pg.query(
          // course_audio has no updated_at column; audio_convergence_log above
          // is the timestamped record of this change.
          'UPDATE course_audio SET s3_key = $1 WHERE id = $2 AND s3_key = $3',
          [r.newKey, r.audio_id, r.old_key],
        );
        if (upd.rowCount !== 1) throw new Error(`before-state drift: ${upd.rowCount} course_audio rows matched`);
        const clips = await pg.query(
          'UPDATE audio_clips SET s3_key = $1, updated_at = now() WHERE s3_key = $2',
          [r.newKey, r.old_key],
        );
        r.clipsUpdated = clips.rowCount;
        await pg.query('COMMIT');
        r.applied = true;
      } catch (e) {
        await pg.query('ROLLBACK');
        r.applied = false;
        r.error = e.message;
      }
    }
  }

  // ---- 3. VERIFY AFTER. Re-read the stored key and fetch it as a learner; the
  //         SHA must still equal the bytes we started from.
  if (APPLY) {
    console.log('\nafter-swap re-fetch:');
    let n = 0;
    await pool(ready.filter((r) => r.applied), async (r) => {
      const { rows: [row] } = await pg.query('SELECT s3_key FROM course_audio WHERE id=$1', [r.audio_id]);
      r.storedKeyAfter = row ? row.s3_key : null;
      r.afterProbe = await fetchAsLearner(r.storedKeyAfter);
      r.verdict = r.storedKeyAfter === r.newKey && r.afterProbe.ok
        && r.afterProbe.sha256 === r.srcProbe.sha256 ? 'PASS' : 'FAIL';
      if (++n % 200 === 0) console.log(`  verified ${n}`);
    });
  }

  for (const r of ready) {
    log.promoted.push({
      audioId: r.audio_id, course: r.course_code, language: r.language, role: r.role,
      voiceId: r.voice_id, text: r.text_normalized,
      candidateStatus: r.candidate_status, decidedBy: r.decided_by, tomsOwn: tomsOwn(r),
      oldKey: r.old_key, newKey: r.newKey, stage: r.stage,
      keyStrategy: r.keyStrategy || 'same-basename', collidedWith: r.collidedWith || null,
      srcBytes: r.srcProbe.bytes, srcSha256: r.srcProbe.sha256,
      dstBytes: r.dstProbe ? r.dstProbe.bytes : null, dstSha256: r.dstProbe ? r.dstProbe.sha256 : null,
      byteIdentical: !!(r.dstProbe && r.dstProbe.sha256 === r.srcProbe.sha256),
      clipRowsAtOldKey: Number(r.clip_rows), clipRowsUpdated: r.clipsUpdated ?? null,
      applied: APPLY ? !!r.applied : false,
      storedKeyAfter: r.storedKeyAfter || null,
      afterSha256: r.afterProbe ? r.afterProbe.sha256 : null,
      verdict: r.verdict || null, error: r.error || null,
    });
  }

  await pg.end();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(log, null, 2));

  const pass = log.promoted.filter((r) => r.verdict === 'PASS').length;
  const fail = log.promoted.filter((r) => r.verdict === 'FAIL').length;
  console.log(`\n=== ${APPLY ? 'APPLIED' : 'DRY RUN'} ===`);
  console.log(`in scope       : ${rows.length}`);
  console.log(`byte-identical : ${log.promoted.filter((r) => r.byteIdentical).length}`);
  console.log(`promoted PASS  : ${pass}${fail ? `  FAIL: ${fail}` : ''}`);
  console.log(`Tom's own PASS : ${log.promoted.filter((r) => r.tomsOwn && r.verdict === 'PASS').length}/${log.promoted.filter((r) => r.tomsOwn).length}`);
  console.log(`skipped        : ${log.skipped.length}`);
  console.log(`→ ${OUT}`);
  if (fail) process.exitCode = 1;
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
