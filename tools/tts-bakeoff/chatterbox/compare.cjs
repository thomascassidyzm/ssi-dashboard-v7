#!/usr/bin/env node
/**
 * compare.cjs — signal-level comparison of two Chatterbox renders.
 *
 * There is no numpy on watson-1, so all signal maths goes through ffmpeg.
 * For each pair we compute:
 *   - duration of each render (ffprobe)
 *   - RMS level of render A (volumedetect)
 *   - RMS level of the DIFFERENCE signal A-B, obtained by INVERTING B with
 *     volume=-1 and summing with amix normalize=0.
 *
 *     Do not "simplify" this to amix=weights="1 -1": that does NOT invert.
 *     Negative control, a file against ITSELF:
 *       weights "1 -1"        -> mean -11.7 dB, max 0.0 dB   (WRONG, no cancellation)
 *       volume=-1 then amix   -> mean -91.0 dB, max -91.0 dB (correct, 16-bit floor)
 *     So -91 dB is the noise floor of this measurement, and any pair reading
 *     near it is the same waveform.
 *   - the residual ratio, i.e. how far the difference sits below the signal.
 *
 * Reading the residual: -inf dB (or a difference RMS at the noise floor) means
 * the two renders are the same waveform. A residual only ~10-20 dB below the
 * signal means the two renders are audibly different takes, not jitter.
 *
 * Note amix truncates to the shorter input, so a duration difference is
 * reported separately and is itself the stronger evidence when it is non-zero.
 *
 * Usage: node compare.cjs <manifest.json> <wavdir> [--out report.json]
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function ffprobeDuration(file) {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ]).toString().trim();
  return parseFloat(out);
}

function volumeStats(args) {
  // volumedetect writes to stderr; capture it.
  let stderr = '';
  try {
    execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    stderr = (e.stderr || '').toString();
    if (!stderr) throw e;
  }
  // execFileSync only populates e.stderr on non-zero exit; on success we need it too.
  if (!stderr) {
    const r = require('child_process').spawnSync('ffmpeg', args, { encoding: 'utf8' });
    stderr = r.stderr || '';
  }
  const mean = /mean_volume:\s*(-?[\d.]+|-inf) dB/.exec(stderr);
  const max = /max_volume:\s*(-?[\d.]+|-inf) dB/.exec(stderr);
  const p = (m) => (m ? (m[1] === '-inf' ? -Infinity : parseFloat(m[1])) : null);
  return { mean_db: p(mean), max_db: p(max) };
}

function selfLevel(file) {
  return volumeStats(['-v', 'info', '-i', file, '-af', 'volumedetect', '-f', 'null', '-']);
}

function diffLevel(a, b) {
  return volumeStats([
    '-v', 'info', '-i', a, '-i', b,
    '-filter_complex', '[1:a]volume=-1[inv];[0:a][inv]amix=inputs=2:normalize=0,volumedetect',
    '-f', 'null', '-',
  ]);
}

function comparePair(a, b) {
  const da = ffprobeDuration(a);
  const db = ffprobeDuration(b);
  const sa = selfLevel(a);
  const sha = fs.statSync(a).size, shb = fs.statSync(b).size;
  const d = diffLevel(a, b);
  const residual =
    d.mean_db === -Infinity ? -Infinity
    : (d.mean_db !== null && sa.mean_db !== null ? +(d.mean_db - sa.mean_db).toFixed(2) : null);
  return {
    a: path.basename(a), b: path.basename(b),
    dur_a: +da.toFixed(4), dur_b: +db.toFixed(4),
    dur_delta_s: +Math.abs(da - db).toFixed(4),
    bytes_a: sha, bytes_b: shb,
    signal_rms_db: sa.mean_db,
    diff_rms_db: d.mean_db === -Infinity ? '-inf' : d.mean_db,
    diff_peak_db: d.max_db === -Infinity ? '-inf' : d.max_db,
    residual_below_signal_db: residual === -Infinity ? '-inf' : residual,
    // -91 dB is this measurement's floor (see the negative control in the header),
    // so anything at or below -90 dB is the same waveform.
    identical_waveform: d.max_db === -Infinity || (d.max_db !== null && d.max_db <= -90),
  };
}

function main() {
  const [manifestPath, wavdir] = process.argv.slice(2);
  if (!manifestPath || !wavdir) {
    console.error('usage: node compare.cjs <manifest.json> <wavdir> [--out report.json]');
    process.exit(2);
  }
  const outIdx = process.argv.indexOf('--out');
  const outPath = outIdx > -1 ? process.argv[outIdx + 1] : null;
  const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const p = (f) => path.join(wavdir, f);
  const report = { engine: m.engine, temperature: m.temperature, base_seed: m.base_seed, sections: {} };

  // A — every repeat compared against repeat 00
  const A = m.experiments.A_repeat_same_seed;
  if (A) {
    const ref = A.renders[0].file;
    report.sections.A_repeat_same_seed = {
      text: A.text, seed: A.seed,
      byte_identical_all: A.byte_identical,
      distinct_sha256: A.distinct_sha256,
      durations: A.renders.map((r) => r.duration_s),
      pairs: A.renders.slice(1).map((r) => comparePair(p(ref), p(r.file))),
    };
  }

  // B — every varied seed compared against the base seed
  const B = m.experiments.B_seed_vary;
  if (B) {
    const ref = B.renders[0].file;
    report.sections.B_seed_vary = {
      text: B.text,
      all_seeds_identical: B.all_seeds_identical,
      pairs: B.renders.slice(1).map((r) => comparePair(p(ref), p(r.file))),
    };
  }

  // C — pass1 vs pass2 for each corpus utterance
  const C = m.experiments.C_corpus_two_passes;
  if (C) {
    report.sections.C_corpus_two_passes = {
      n_byte_identical: C.n_byte_identical, n_total: C.n_total,
      pairs: C.pairs.map((pr) =>
        Object.assign({ id: pr.id, text: pr.text },
          comparePair(p(`C_${pr.id}_pass1.wav`), p(`C_${pr.id}_pass2.wav`)))),
    };
  }

  const json = JSON.stringify(report, null, 2);
  if (outPath) fs.writeFileSync(outPath, json);
  console.log(json);
}

main();
