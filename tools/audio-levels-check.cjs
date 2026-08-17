#!/usr/bin/env node
/**
 * audio-levels-check.cjs — honest per-clip technical QC for human recordings.
 *
 * Fetches the real bytes from S3 (never trusts course_audio metadata) and measures,
 * per clip: decodability, duration, peak/RMS dBFS, clipped-sample count, leading and
 * trailing silence, sample rate / channels / codec / bitrate.
 *
 * Trailing silence is measured deliberately: damage that silences the END of a clip
 * leaves it full length, so every duration census reports it clean.
 *
 * Usage: node tools/audio-levels-check.cjs <manifest.json> <outdir>
 *   manifest.json = array of {id, s3_key, ...} — extra fields are passed through.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SILENCE_DB = -50;        // below this counts as silence for lead/tail measurement
const CLIP_DBFS = -0.5;        // peak at/above this is effectively clipped

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function fetchClip(key, dest) {
  const res = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
  const chunks = [];
  for await (const c of res.Body) chunks.push(c);
  const buf = Buffer.concat(chunks);
  fs.writeFileSync(dest, buf);
  return buf.length;
}

function ffprobe(file) {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const j = JSON.parse(out);
  const st = (j.streams || []).find((s) => s.codec_type === 'audio');
  if (!st) throw new Error('no audio stream');
  return {
    codec: st.codec_name,
    sample_rate: Number(st.sample_rate),
    channels: st.channels,
    bit_rate: Number(st.bit_rate || j.format.bit_rate) || null,
    duration_ms: Math.round(Number(j.format.duration) * 1000),
  };
}

/** astats over the whole file: peak, RMS, clipped samples. */
function levels(file) {
  const out = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file,
    '-af', 'astats=measure_perchannel=none:measure_overall=Peak_level+RMS_level',
    '-f', 'null', '-']);
  const num = (re) => { const m = out.match(re); return m ? Number(m[1]) : null; };
  return {
    peak_dbfs: num(/Peak level dB:\s*(-?[\d.]+|inf)/),
    rms_dbfs: num(/RMS level dB:\s*(-?[\d.]+|inf)/),
  };
}

/** Count samples at or above full scale — the honest clipping measure. */
function clippedSamples(file) {
  const out = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'volumedetect', '-f', 'null', '-']);
  const m = out.match(/histogram_0db:\s*(\d+)/);
  return m ? Number(m[1]) : 0;
}

/** Leading and trailing silence, in ms, via silencedetect over the decoded stream. */
function silenceEdges(file, durationMs) {
  const out = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file,
    '-af', `silencedetect=noise=${SILENCE_DB}dB:d=0.1`, '-f', 'null', '-']);
  const spans = [];
  const re = /silence_start:\s*(-?[\d.]+)[\s\S]*?silence_end:\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(out))) spans.push([Number(m[1]), Number(m[2])]);
  // an unterminated silence_start runs to end of file
  const starts = [...out.matchAll(/silence_start:\s*(-?[\d.]+)/g)].map((x) => Number(x[1]));
  const ends = [...out.matchAll(/silence_end:\s*([\d.]+)/g)].map((x) => Number(x[1]));
  if (starts.length > ends.length) spans.push([starts[starts.length - 1], durationMs / 1000]);

  let lead = 0; let tail = 0;
  for (const [s, e] of spans) {
    if (s <= 0.02) lead = Math.max(lead, e * 1000);
    if (e * 1000 >= durationMs - 30) tail = Math.max(tail, durationMs - s * 1000);
  }
  // fully silent file: lead covers everything
  return { lead_silence_ms: Math.round(lead), tail_silence_ms: Math.round(Math.max(0, tail)) };
}

/** ffmpeg writes filter reports to STDERR even on success — always read both streams. */
function run(bin, args) {
  const r = spawnSync(bin, args, { encoding: 'utf8' });
  return (r.stdout || '') + (r.stderr || '');
}

(async () => {
  const [manifestPath, outdir] = process.argv.slice(2);
  if (!manifestPath || !outdir) {
    console.error('usage: node tools/audio-levels-check.cjs <manifest.json> <outdir>');
    process.exit(1);
  }
  const clips = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const audioDir = path.join(outdir, 'audio');
  fs.mkdirSync(audioDir, { recursive: true });

  const results = [];
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const local = path.join(audioDir, `${c.id}.mp3`);
    const r = { ...c, checks: {} };
    try {
      r.checks.bytes_on_s3 = fs.existsSync(local) && fs.statSync(local).size
        ? fs.statSync(local).size
        : await fetchClip(c.s3_key, local);
    } catch (e) {
      r.checks.fetch_error = String(e.message || e);
      results.push(r);
      continue;
    }
    try {
      Object.assign(r.checks, ffprobe(local));
      Object.assign(r.checks, levels(local));
      r.checks.clipped_samples = clippedSamples(local);
      Object.assign(r.checks, silenceEdges(local, r.checks.duration_ms));
      r.checks.decodes = true;
    } catch (e) {
      r.checks.decodes = false;
      r.checks.decode_error = String(e.stderr || e.message || e).trim().split('\n').slice(-1)[0];
    }
    results.push(r);
    if ((i + 1) % 20 === 0) console.error(`  ${i + 1}/${clips.length}`);
  }

  fs.writeFileSync(path.join(outdir, 'levels.json'), JSON.stringify(results, null, 2));
  console.error(`wrote ${results.length} results to ${path.join(outdir, 'levels.json')}`);
})();
