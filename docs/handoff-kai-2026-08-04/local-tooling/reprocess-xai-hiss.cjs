#!/usr/bin/env node
/**
 * reprocess-xai-hiss.cjs — de-hiss existing xAI (eve) audio in place.
 *
 * xAI renders carry a steady ~-60dBFS broadband noise bed ("tape hiss");
 * the mastering chain never removed it. This applies a single mild FFT
 * denoise (afftdn=nf=-25:nt=w) to the ALREADY-MASTERED mp3 — NOT a re-master
 * (no second compressor/limiter pass) — re-encoded through the same iOS-safe
 * ffmpeg->lame path (96k CBR / 48k / mono / -q2). Duration is preserved, so
 * the only DB change is course_audio.s3_key (minimal-payload guardrail).
 *
 * Reversible: writes to a NEW s3 key (old object stays); every change is
 * logged old->new so it can be rolled back by reverting s3_key.
 *
 * Scope guardrail: filters course_code AND voice_id LIKE 'xai_%' — never
 * touches Azure/ElevenLabs (target-side) audio.
 *
 * Usage:
 *   node scripts/reprocess-xai-hiss.cjs --course spa_for_eng --limit 20        # pilot
 *   node scripts/reprocess-xai-hiss.cjs --course spa_for_eng                   # full
 *   node scripts/reprocess-xai-hiss.cjs --course spa_for_eng --dry-run
 *   node scripts/reprocess-xai-hiss.cjs --rollback <done-log.jsonl>            # undo
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');

// Load .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { ffmpegFilterToLameMp3, getAudioMetadata } = require('../services/audio-processor.cjs');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

// Persistent S3 client — spawning `aws` cli per file cost ~9s cold-start each.
const s3 = new S3Client({ region: process.env.AWS_REGION });

const DENOISE = 'afftdn=nf=-25:nt=w';
const {
  SUPABASE_URL, SUPABASE_SERVICE_KEY, S3_BUCKET,
} = process.env;

// ---- args
const argv = process.argv.slice(2);
const getArg = (k, def) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : def;
};
const COURSE = getArg('course', null);
const ALL = !!getArg('all', false);            // process every xAI course
const SKIP = String(getArg('skip', '') || '').split(',').filter(Boolean); // course codes to skip in --all
const LIMIT = getArg('limit', null) ? parseInt(getArg('limit'), 10) : null;
const DRY = !!getArg('dry-run', false);
const WORKERS = parseInt(getArg('workers', '8'), 10);
const ROLLBACK = getArg('rollback', null);

const OUT_DIR = path.join(__dirname, '..', 'temp', 'hiss-reprocess');
fs.mkdirSync(OUT_DIR, { recursive: true });

function sbHeaders() {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function sbGet(qs) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/course_audio?${qs}`, { headers: sbHeaders() });
  if (!res.ok) throw new Error(`GET ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sbPatchS3Key(id, newKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/course_audio?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...sbHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({ s3_key: newKey }),
  });
  if (!res.ok) throw new Error(`PATCH ${res.status}: ${await res.text()}`);
}

async function s3Download(key, destPath) {
  const out = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  await pipeline(out.Body, fs.createWriteStream(destPath));
}

async function s3Upload(srcPath, key) {
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET, Key: key,
    Body: fs.readFileSync(srcPath), ContentType: 'audio/mpeg',
  }));
}

// ---- exact count of xai_* rows for a course (fast: count doesn't sort/return)
async function countXai(course) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/course_audio?course_code=eq.${course}&voice_id=like.xai_*`,
    { method: 'HEAD', headers: { ...sbHeaders(), Prefer: 'count=exact', Range: '0-0' } });
  const cr = res.headers.get('content-range') || '';
  return parseInt(cr.split('/')[1] || '0', 10);
}

// ---- discover the distinct xai_* voice_ids present in a course.
// An unordered LIKE sample is fast (an ORDERED like scan times the table out);
// union it with the config-derived voices so the canonical voice is never missed.
async function discoverVoiceIds(course, configVoiceIds = []) {
  const set = new Set(configVoiceIds.map(v => `xai_${v}`));
  const sample = await sbGet(
    `select=voice_id&course_code=eq.${course}&voice_id=like.xai_*&limit=8000`);
  for (const r of sample) if (r.voice_id) set.add(r.voice_id);
  return [...set];
}

// ---- fetch full row set for a course (keyset pagination by id; IN-list stays fast)
async function fetchRows(course, voiceIds) {
  if (!voiceIds.length) return [];
  const rows = [];
  const page = 1000;
  const inList = `(${voiceIds.join(',')})`;
  let lastId = '';
  for (;;) {
    const qs = [
      'select=id,s3_key,duration_ms,role,voice_id',
      `course_code=eq.${course}`,
      `voice_id=in.${inList}`,
      's3_key=not.is.null',
      lastId ? `id=gt.${lastId}` : null,
      'order=id.asc',
      `limit=${page}`,
    ].filter(Boolean).join('&');
    const batch = await sbGet(qs);
    rows.push(...batch);
    if (batch.length < page) break;
    lastId = batch[batch.length - 1].id;
    if (LIMIT && rows.length >= LIMIT) break;
  }
  return LIMIT ? rows.slice(0, LIMIT) : rows;
}

// ---- all courses whose voice_config declares an xai provider -> {course, voiceIds[]}
async function fetchXaiCourses() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=course_code,voice_config&limit=2000`,
    { headers: sbHeaders() });
  if (!res.ok) throw new Error(`courses GET ${res.status}: ${await res.text()}`);
  const out = [];
  for (const c of await res.json()) {
    const voices = ((c.voice_config || {}).voices) || {};
    const vids = [...new Set(Object.values(voices)
      .filter(d => d && typeof d === 'object' && d.provider === 'xai' && d.voiceId)
      .map(d => d.voiceId))];
    if (vids.length) out.push({ course: c.course_code, voiceIds: vids });
  }
  return out;
}

async function processOne(row, tmpDir) {
  const inPath = path.join(tmpDir, `in-${row.id}.mp3`);
  const outPath = path.join(tmpDir, `out-${row.id}.mp3`);
  try {
    await s3Download(row.s3_key, inPath);
    await ffmpegFilterToLameMp3(inPath, outPath, { filterChain: DENOISE });
    const meta = await getAudioMetadata(outPath);
    const newDur = Math.round(meta.duration * 1000);
    const newKey = `mastered/${crypto.randomUUID().toUpperCase()}.mp3`;
    if (!DRY) {
      await s3Upload(outPath, newKey);
      await sbPatchS3Key(row.id, newKey);
    }
    return { id: row.id, role: row.role, oldKey: row.s3_key, newKey, oldDur: row.duration_ms, newDur, ok: true };
  } catch (e) {
    return { id: row.id, oldKey: row.s3_key, ok: false, error: String(e.message || e) };
  } finally {
    fs.rmSync(inPath, { force: true });
    fs.rmSync(outPath, { force: true });
  }
}

function priorDoneIds(course) {
  const done = new Set();
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.startsWith(`${course}-done-`) && f.endsWith('.jsonl')) {
      for (const line of fs.readFileSync(path.join(OUT_DIR, f), 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try { const r = JSON.parse(line); if (r.ok) done.add(r.id); } catch {}
      }
    }
  }
  return done;
}

async function reprocessCourse(course, configVoiceIds) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  // DRY logs use a distinct name so priorDoneIds() (matches `${course}-done-`)
  // never treats a dry-run row as actually processed.
  const logPath = path.join(OUT_DIR, `${course}-${DRY ? 'DRYRUN' : 'done'}-${stamp}.jsonl`);
  const expected = await countXai(course);
  if (expected === 0) { console.log(`[${course}] 0 xai_* rows — skip`); return { course, ok: 0, failed: 0, expected: 0 }; }

  const voiceIds = await discoverVoiceIds(course, configVoiceIds);
  const done = priorDoneIds(course);
  let rows = await fetchRows(course, voiceIds);
  const before = rows.length;
  rows = rows.filter(r => !done.has(r.id));
  console.log(`[${course}] expected=${expected} voiceIds=${voiceIds.join(',')} | fetched=${before} done=${before - rows.length} todo=${rows.length}`);
  if (!LIMIT && before < expected) console.warn(`  ⚠️  fetched ${before} < expected ${expected} — a voice_id may be undiscovered`);
  if (!rows.length) { console.log(`[${course}] nothing to do`); return { course, ok: done.size, failed: 0, expected }; }

  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hiss-'));
  let ok = 0, failed = 0, maxDrift = 0;
  const t0 = Date.now();
  let idx = 0;
  async function worker() {
    while (idx < rows.length) {
      const row = rows[idx++];
      const r = await processOne(row, tmpDir);
      logStream.write(JSON.stringify(r) + '\n');
      if (r.ok) { ok++; const d = Math.abs((r.newDur || 0) - (r.oldDur || 0)); if (d > maxDrift) maxDrift = d; }
      else { failed++; console.error(`  FAIL ${r.id}: ${r.error}`); }
      if ((ok + failed) % 200 === 0 || ok + failed === rows.length) {
        const rate = (ok + failed) / ((Date.now() - t0) / 1000);
        const eta = Math.round((rows.length - ok - failed) / (rate || 1));
        console.log(`  [${course}] ${ok + failed}/${rows.length} ok=${ok} fail=${failed} ${rate.toFixed(1)}/s eta=${eta}s drift=${maxDrift}ms`);
      }
    }
  }
  await Promise.all(Array.from({ length: WORKERS }, worker));
  logStream.end();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`[${course}] DONE ok=${ok} fail=${failed} maxDurDrift=${maxDrift}ms  log=${logPath}`);
  return { course, ok, failed, expected };
}

async function runReprocess() {
  console.log(`[reprocess] dry=${DRY} workers=${WORKERS} limit=${LIMIT || 'ALL'} mode=${ALL ? 'ALL-xai-courses' : COURSE}`);
  let targets;
  if (ALL) {
    targets = (await fetchXaiCourses()).filter(t => !SKIP.includes(t.course));
    console.log(`[reprocess] ${targets.length} xAI courses (skipping: ${SKIP.join(',') || 'none'})`);
  } else {
    if (!COURSE) throw new Error('--course or --all required');
    targets = [{ course: COURSE, voiceIds: [] }];
  }
  const summary = [];
  for (const t of targets) summary.push(await reprocessCourse(t.course, t.voiceIds));
  console.log('\n[reprocess] ===== SUMMARY =====');
  let tOk = 0, tFail = 0;
  for (const s of summary) { tOk += s.ok; tFail += s.failed; console.log(`  ${s.course.padEnd(18)} ok=${s.ok} fail=${s.failed} expected=${s.expected}`); }
  console.log(`  TOTAL ok=${tOk} fail=${tFail}`);
}

async function runRollback() {
  const lines = fs.readFileSync(ROLLBACK, 'utf8').split('\n').filter(Boolean);
  let n = 0;
  for (const line of lines) {
    const r = JSON.parse(line);
    if (!r.ok) continue;
    await sbPatchS3Key(r.id, r.oldKey);
    n++;
    if (n % 100 === 0) console.log(`  rolled back ${n}`);
  }
  console.log(`[rollback] restored ${n} rows to original s3_key`);
}

(async () => {
  if (ROLLBACK) return runRollback();
  return runReprocess();
})().catch(e => { console.error(e); process.exit(1); });
