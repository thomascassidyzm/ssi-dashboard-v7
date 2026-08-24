#!/usr/bin/env node
/**
 * verify-promoted-clips-serve — prove promoted clips reach a learner unchanged.
 *
 * The promotion tool verifies at the S3 layer (presigned GET, SHA-256 either
 * side). This verifies one layer up, on the path a learner's browser actually
 * uses: GET https://saysomethingin.app/api/audio/:audioId, the credentialed
 * proxy in ssi-learning-app/api/audio/[audioId].ts. It re-reads the stored
 * s3_key from the live DB, fetches the bytes through the proxy, and requires
 * the SHA-256 to equal the source SHA recorded in the applied log — i.e. the
 * bytes Tom accepted are the bytes the learner now receives.
 *
 *   node tools/verify-promoted-clips-serve.cjs [--sample 60] [--log <applied.json>]
 *
 * Samples are stratified: Tom's own acceptances are always over-represented,
 * because §6 of the brief asks for them specifically.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const BASE = process.env.LEARNER_BASE_URL || 'https://saysomethingin.app';
const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const SAMPLE = parseInt(arg('--sample') || '60', 10);
const LOGS = (arg('--log') || [
  path.join(__dirname, '..', 'docs', 'canonical-audio', 'promote-accepted-to-mastered-applied.json'),
].join(',')).split(',');
const OUT = arg('--out') || path.join(__dirname, '..', 'docs', 'canonical-audio',
  'promote-accepted-to-mastered-serving-verification.json');

function databaseUrl() {
  const m = fs.readFileSync(path.join(__dirname, '..', '.env.psql'), 'utf8')
    .match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
  if (!m) throw new Error('.env.psql has no DATABASE_URL');
  return m[1].trim();
}

/** Deterministic pick, so a re-run checks the same clips and the log is stable. */
function pick(list, n) {
  const sorted = [...list].sort((a, b) => (a.audioId < b.audioId ? -1 : 1));
  if (sorted.length <= n) return sorted;
  const step = sorted.length / n;
  return Array.from({ length: n }, (_, i) => sorted[Math.floor(i * step)]);
}

async function main() {
  const entries = LOGS.flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')).promoted)
    .filter((e) => e.verdict === 'PASS');
  const toms = entries.filter((e) => e.tomsOwn);
  const rest = entries.filter((e) => !e.tomsOwn);

  // Half the sample from Tom's 292, half from everything else.
  const sample = [...pick(toms, Math.ceil(SAMPLE / 2)), ...pick(rest, Math.floor(SAMPLE / 2))];
  console.log(`promoted PASS rows: ${entries.length} (${toms.length} Tom's own)`);
  console.log(`sampling ${sample.length} through ${BASE}/api/audio/:id\n`);

  const pg = new Client({ connectionString: databaseUrl() });
  await pg.connect();

  const results = [];
  for (const e of sample) {
    const { rows: [row] } = await pg.query(
      'SELECT s3_key, course_code FROM course_audio WHERE id=$1', [e.audioId],
    );
    const r = {
      audioId: e.audioId, course: e.course, tomsOwn: e.tomsOwn, decidedBy: e.decidedBy,
      oldKey: e.oldKey, expectedKey: e.newKey, storedKey: row ? row.s3_key : null,
      expectedSha256: e.srcSha256, keyStrategy: e.keyStrategy,
    };
    try {
      const resp = await fetch(`${BASE}/api/audio/${e.audioId}`);
      r.httpStatus = resp.status;
      r.contentType = resp.headers.get('content-type');
      const buf = Buffer.from(await resp.arrayBuffer());
      r.bytes = buf.length;
      r.sha256 = crypto.createHash('sha256').update(buf).digest('hex');
      r.isMp3 = buf.length > 2 && (buf[0] === 0x49 || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0));
    } catch (err) {
      r.error = err.message;
    }
    r.verdict = r.storedKey === e.newKey && r.httpStatus === 200 && r.isMp3
      && r.sha256 === e.srcSha256 ? 'PASS' : 'FAIL';
    results.push(r);
    console.log(`  ${r.verdict}  ${r.tomsOwn ? 'TOM ' : '    '} ${r.storedKey}  ${r.bytes || 0}B  ${r.httpStatus}`);
  }
  await pg.end();

  const pass = results.filter((r) => r.verdict === 'PASS');
  const out = {
    base: BASE, ranAt: new Date().toISOString(), sampled: results.length,
    pass: pass.length, fail: results.length - pass.length,
    tomsOwnSampled: results.filter((r) => r.tomsOwn).length,
    tomsOwnPass: pass.filter((r) => r.tomsOwn).length,
    results,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`\n=== SERVING VERIFICATION ===`);
  console.log(`sampled : ${out.sampled}   PASS ${out.pass}   FAIL ${out.fail}`);
  console.log(`Tom's own: ${out.tomsOwnPass}/${out.tomsOwnSampled} PASS`);
  console.log(`→ ${OUT}`);
  if (out.fail) process.exitCode = 1;
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
