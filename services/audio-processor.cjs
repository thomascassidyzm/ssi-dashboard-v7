/**
 * Audio Processor Service
 *
 * Handles audio processing operations:
 * - Time-stretching (slow down audio without changing pitch)
 * - Normalization (volume leveling)
 * - Duration extraction
 *
 * Uses ffmpeg for audio processing.
 */

const { exec, execFile, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs-extra');
const path = require('path');

const execAsync = promisify(exec);

// ffmpeg is invoked bare (PATH lookup) throughout this module. A `pm2 restart
// --update-env` from a shell with a minimal PATH pushes that PATH into the
// service, ffmpeg silently disappears, and EVERY clip fails loudness
// normalisation AFTER its TTS render is already paid for — 719 wasted renders
// on 2026-07-28 before it was caught. The failure mode is expensive and
// invisible (the ebur128 probe runs under `|| true`), so pin the usual install
// locations onto PATH here rather than relying on whoever last restarted pm2.
for (const dir of ['/opt/homebrew/bin', '/usr/local/bin']) {
  if (!(process.env.PATH || '').split(':').includes(dir)) {
    process.env.PATH = `${process.env.PATH || ''}:${dir}`;
  }
}

/**
 * Check if ffmpeg is installed
 *
 * @returns {Promise<boolean>} True if ffmpeg is available
 */
async function checkFfmpegInstalled() {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if lame (the actual LAME binary, not libmp3lame inside ffmpeg) is installed.
 * Required because ffmpeg's MP3 muxer produces files iOS/AVPlayer can't reliably
 * decode (ID3v2 prefix + bogus LAME-extension enc_padding). The real lame binary
 * writes a clean Xing+LAME header CoreAudio trusts.
 */
async function checkLameInstalled() {
  try {
    await execAsync('lame --version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Encode audio to MP3 by piping ffmpeg's filtered WAV output through the real
 * lame binary. Replaces every `ffmpeg ... output.mp3` site in this file —
 * those produced files with the iOS playback bug.
 *
 * @param {string} inputPath - source audio
 * @param {string} outputPath - destination mp3
 * @param {object} opts
 * @param {string} [opts.filterChain] - ffmpeg -filter:a expression (e.g. loudnorm=...)
 * @param {number} [opts.bitrate=96] - lame CBR bitrate (kbps)
 * @param {number} [opts.sampleRate=48000] - intermediate WAV sample rate
 * @param {number} [opts.channels=1] - 1 (mono) or 2 (stereo)
 * @param {number} [opts.quality=2] - lame -q (0=best, 9=fastest); 2 matches the reference good file
 * @param {string[]} [opts.ffmpegInputArgs] - extra args to insert before -i (e.g. ['-f','lavfi'])
 * @param {string} [opts.inputOverride] - replace inputPath in the ffmpeg command (used by silence generator)
 */
async function ffmpegFilterToLameMp3(inputPath, outputPath, opts = {}) {
  const {
    filterChain = null,
    bitrate = 96,
    sampleRate = 48000,
    channels = 1,
    quality = 2,
    ffmpegInputArgs = [],
    inputOverride = null
  } = opts;

  const ffArgs = ['-y', '-hide_banner', '-loglevel', 'error', ...ffmpegInputArgs];
  if (inputOverride) {
    ffArgs.push('-i', inputOverride);
  } else {
    ffArgs.push('-i', inputPath);
  }
  if (filterChain) ffArgs.push('-filter:a', filterChain);
  ffArgs.push('-ac', String(channels), '-ar', String(sampleRate), '-f', 'wav', '-');

  const lameArgs = [
    '-m', channels === 1 ? 'm' : 'j',
    '-b', String(bitrate),
    '--cbr',
    '--noreplaygain',
    '-q', String(quality),
    '--silent',
    '-', outputPath
  ];

  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ffArgs);
    const lame = spawn('lame', lameArgs);

    let ffErr = '';
    let lameErr = '';
    ff.stderr.on('data', d => { ffErr += d.toString(); });
    lame.stderr.on('data', d => { lameErr += d.toString(); });

    ff.stdout.pipe(lame.stdin);

    ff.on('error', reject);
    lame.on('error', reject);

    let ffExit = null;
    let lameExit = null;
    const settle = () => {
      if (ffExit === null || lameExit === null) return;
      if (ffExit !== 0) return reject(new Error(`ffmpeg exited ${ffExit}: ${ffErr.slice(-500)}`));
      if (lameExit !== 0) return reject(new Error(`lame exited ${lameExit}: ${lameErr.slice(-500)}`));
      resolve();
    };
    ff.on('close', code => { ffExit = code; settle(); });
    lame.on('close', code => { lameExit = code; settle(); });
  });
}

/**
 * Check if sox is installed (fallback for duration extraction)
 *
 * @returns {Promise<boolean>} True if sox is available
 */
async function checkSoxInstalled() {
  try {
    await execAsync('sox --version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check an MP3's container format for the iOS-playback issues (Imdad's checks):
 *   1. No ID3v2 wrapper — file must start with an MP3 sync frame, not "ID3"
 *   2. Encoder must be the real LAME binary (LAME3.*), not ffmpeg's muxer (Lavf*)
 * Runs on a LOCAL file (e.g. one already downloaded for duration extraction).
 *
 * @param {string} audioPath - Path to local mp3
 * @returns {Promise<{ok: boolean, hasId3v2: boolean, encoder: string|null, issues: string[]}>}
 */
async function checkMp3Format(audioPath) {
  let hasId3v2 = false;
  try {
    const buf = await fs.readFile(audioPath);
    // "ID3" = 0x49 0x44 0x33
    hasId3v2 = buf.length >= 3 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33;
  } catch (e) { /* unreadable — caught below via empty issues */ }

  let encoder = null;
  try {
    const { stdout } = await execAsync(
      `ffprobe -hide_banner -v error -show_entries stream_tags=encoder:format_tags=encoder -select_streams a:0 -of default=noprint_wrappers=1 "${audioPath}"`
    );
    const line = stdout.split('\n').map(l => l.trim())
      .find(l => /^TAG:encoder=/i.test(l) || /^encoder=/i.test(l));
    if (line) encoder = line.split('=').slice(1).join('=').trim();
  } catch (e) { /* no encoder tag */ }

  const issues = [];
  if (hasId3v2) issues.push('has_ID3v2_wrapper');
  if (!encoder) issues.push('missing_encoder_tag');
  else if (/^Lav[fc]/i.test(encoder)) issues.push(`encoded_by_ffmpeg:${encoder}`);
  else if (!/^LAME/i.test(encoder)) issues.push(`unexpected_encoder:${encoder}`);

  return { ok: issues.length === 0, hasId3v2, encoder, issues };
}

/**
 * Get audio duration using sox stat (matches original Python workflow)
 *
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<number>} Duration in seconds
 */
async function getAudioDuration(audioPath) {
  try {
    const { stderr } = await execAsync(`sox "${audioPath}" -n stat`);

    // sox stat outputs to stderr
    const match = stderr.match(/Length \(seconds\):\s+([\d.]+)/);

    if (!match) {
      throw new Error('Could not parse duration from sox output');
    }

    const duration = parseFloat(match[1]);

    if (isNaN(duration)) {
      throw new Error(`Invalid duration value: ${match[1]}`);
    }

    return duration;
  } catch (error) {
    throw new Error(`Failed to get audio duration with sox: ${error.message}`);
  }
}

/**
 * Time-stretch audio (slow down or speed up without changing pitch)
 *
 * @param {string} inputPath - Input audio file path
 * @param {string} outputPath - Output audio file path
 * @param {number} factor - Stretch factor (1.0 = normal, 1.2 = slower, 0.8 = faster)
 * @returns {Promise<void>}
 */
async function timeStretchAudio(inputPath, outputPath, factor) {
  if (factor <= 0) {
    throw new Error('Stretch factor must be positive');
  }

  if (factor === 1.0) {
    // No stretching needed, just copy
    await fs.copyFile(inputPath, outputPath);
    return;
  }

  try {
    const atempoFilters = buildAtempoFilterChain(factor);
    await ffmpegFilterToLameMp3(inputPath, outputPath, { filterChain: atempoFilters });
  } catch (error) {
    throw new Error(`Failed to time-stretch audio: ${error.message}`);
  }
}

/**
 * Build atempo filter chain for ffmpeg
 * atempo is limited to 0.5-2.0, so we need to chain filters for larger changes
 *
 * @param {number} factor - Overall stretch factor
 * @returns {string} Filter chain string
 */
function buildAtempoFilterChain(factor) {
  if (factor === 1.0) return 'atempo=1.0';

  const filters = [];
  let remaining = 1.0 / factor; // Inverse because atempo speeds up

  // Break down into steps within atempo's 0.5-2.0 range
  while (remaining > 1.01 || remaining < 0.99) {
    if (remaining > 2.0) {
      filters.push('atempo=2.0');
      remaining /= 2.0;
    } else if (remaining < 0.5) {
      filters.push('atempo=0.5');
      remaining /= 0.5;
    } else {
      filters.push(`atempo=${remaining.toFixed(4)}`);
      break;
    }
  }

  return filters.join(',');
}

/**
 * Normalize audio volume
 *
 * @param {string} inputPath - Input audio file path
 * @param {string} outputPath - Output audio file path
 * @param {number} targetLUFS - Target loudness in LUFS (default: -16.0)
 * @returns {Promise<void>}
 */
// Short fade at both ends so a TTS endpoint discontinuity can NEVER click
// (Tom 2026-06-26: a click-off MUST never happen). 8ms in + 8ms out is
// imperceptible on speech but removes the DC step. The end fade uses the
// areverse trick (reverse → fade the new "start" → reverse back) so it works
// without knowing the clip's duration up front.
const ANTI_CLICK_FADE = 'afade=t=in:st=0:d=0.008,areverse,afade=t=in:st=0:d=0.008,areverse';

// Peaky voices (esp. xAI voice clones, crest factor ~19dB) hit the -1.5dBTP true-peak
// ceiling before a single loudnorm pass reaches targetLUFS, stalling 4-6 LUFS short
// (measured: Azure Sonia lands accurately at -16, xAI Tom clone lands at -20 to -22).
// Fix: tame the crest with a compressor, measure the resulting loudness, apply a plain
// gain to hit target (+1dB, which the final limiter's gain-reduction eats back), then
// true-peak-limit via 4x oversampling as a safety net. Verified this chain also still
// lands Azure/ElevenLabs clips accurately at target, so it's used universally rather
// than branching on provider.
const PRE_COMPRESS = 'acompressor=threshold=-24dB:ratio=8:attack=5:release=80:knee=8';
const TRUE_PEAK_LIMIT = 'aresample=176400,alimiter=limit=0.841:attack=1:release=50:level=false';

// xAI renders carry a steady ~-79dBFS broadband noise bed ("tape hiss") in the
// raw output that Azure/ElevenLabs don't (their raw between-word floor is true
// digital silence). PRE_COMPRESS + make-up gain then lift that bed to ~-67dB —
// audible ("that hissy mastering stuff"). Unlike normalizeAudioClean (which
// avoids the *amplification* by dropping the compressor, at a 4-6 LUFS loudness
// cost, and still ships the raw bed), this removes the bed at source with a mild
// FFT denoise while keeping the full -16 LUFS chain: gap bed -> ~-115dB, speech
// <0.5dB, duration bit-identical (probe 2026-07-30, docs/xai-hiss-chain-analysis).
// MUST run before PRE_COMPRESS. Applied only for provider==='xai' (normalizeAudio opts).
const PRE_DENOISE = 'afftdn=nf=-25:nt=w';

async function measureIntegratedLoudness(inputPath, preFilter) {
  const { stdout, stderr } = await execAsync(
    `ffmpeg -i "${inputPath}" -af "${preFilter},ebur128=framelog=quiet" -f null - 2>&1 || true`,
    { shell: '/bin/bash' }
  ).catch(e => ({ stdout: e.stdout || '', stderr: e.stderr || '' }));
  const output = `${stdout}${stderr}`;
  const match = (output.match(/I:\s*(-?[\d.]+)\s*LUFS/g) || []).pop();
  if (!match) throw new Error('Could not measure integrated loudness (no ebur128 I: line in ffmpeg output)');
  return parseFloat(match.match(/(-?[\d.]+)/)[1]);
}

/**
 * Detect an isolated click/thump transient in a clip's tail — a short burst of
 * energy that arrives AFTER the speech has decayed (mouth click, breath pop
 * baked into the raw TTS render). The boundary ANTI_CLICK_FADE cannot touch
 * these: they sit tens of ms inside the file, not at the last sample
 * (ita_for_eng "Come stai?" 2026-07-23: −9dBFS burst 70ms before EOF, speech
 * already down at −35dBFS — audibly a click, file still ends at exact zero).
 *
 * TWO rules, on 2ms peak windows over the last tailMs, thresholds relative to
 * the clip's own peak:
 *
 * 1. "burst" — the LAST run of windows above −20dB-rel-peak is a click iff it
 *    is short (≤ maxClickMs) AND separated from the audio before it by a gap
 *    of ≥ minGapMs below threshold. A genuine speech ending is long and/or
 *    contiguous with the phrase body, so it never matches.
 *
 * 2. "resurgence" — once the tail envelope has decayed below −34dB-rel-peak
 *    for ≥ minGapMs, ANY later window above −26dB-rel-peak is a defect,
 *    whatever its length. This catches the xAI-clone exhale/noise burst
 *    (ita_for_eng "Could I see the wine list?" 2026-07-24: speech decays to
 *    −46dBFS, then a −15dBFS broadband burst lasting ~110ms rides the last
 *    170ms — rule 1 passed it because the burst is both longer than
 *    maxClickMs and ragged around the −20dB threshold, so the "last run" was
 *    a 6ms blip with a 4ms gap).
 *
 * 3. "rise" — after the last strong-speech window (> −12dB-rel-peak), on a
 *    smoothed 10ms envelope, a later rise of ≥ riseDb above the running
 *    minimum that stays BELOW −9dB-rel-peak is a defect (real speech resuming
 *    comes back near clip peak; a breath/exhale burst does not). Catches the
 *    louder clone exhale that never lets the envelope reach the rule-2 arm
 *    level (ita_for_eng "I'm not sure if I'm hungry" 1bc798f1: speech ends
 *    −8dBFS, dips only to −23dBFS, then a broadband exhale rises back to
 *    −13dBFS for ~250ms).
 *
 * MODES (2026-07-24 calibration): rules 2 and 3 assume a SINGLE-UTTERANCE
 * clip — on long-form audio with scripted internal silences ([pause] markers,
 * ellipses) a soft resumed speech segment in the tail is indistinguishable
 * from an exhale burst by level/shape alone (61/139 false positives on the
 * eve [pause] era). Callers that know the clip text MUST pass
 * mode:'longform' for such texts (see isLongformText helper); longform runs
 * rule 1 only. All rules ignore content above −5dB-rel-peak: resumed real
 * speech returns near clip peak, while every measured defect sat at
 * −11…−19dB rel peak.
 *
 * @returns {Promise<{click: boolean, kind?: string, trimSec?: number, peakDb?: number}>}
 *   trimSec = safe cut point (start of the pre-click quiet gap), for repair
 *   tools. kind = 'burst' | 'resurgence'.
 */
// True when a clip's text implies scripted internal silences (long-form pod
// takes, explainers) — the tail can legitimately contain silence-then-speech,
// so only rule 1 of detectTailClick is safe. Keep in sync with the doc above.
function isLongformText(text) {
  return /\[pause\]|…|\.\.\./.test(text || '');
}

async function detectTailClick(audioPath, options = {}) {
  const { tailMs = 400, maxClickMs = 50, minGapMs = 20, riseDb = 8, mode = 'phrase' } = options;
  const { stdout } = await execAsync(
    `ffmpeg -hide_banner -loglevel error -i "${audioPath}" -f s16le -ac 1 -ar 48000 -`,
    { encoding: 'buffer', maxBuffer: 1 << 26 }
  );
  const n = Math.floor(stdout.length / 2);
  if (n === 0) return { click: false };
  const sample = i => stdout.readInt16LE(i * 2);
  let peak = 0;
  for (let i = 0; i < n; i++) { const a = Math.abs(sample(i)); if (a > peak) peak = a; }
  if (peak === 0) return { click: false };

  const winSamples = Math.round(48000 * 0.002); // 2ms windows
  const wins = [];
  for (let o = 0; o + winSamples <= n; o += winSamples) {
    let m = 0;
    for (let i = o; i < o + winSamples; i++) { const a = Math.abs(sample(i)); if (a > m) m = a; }
    wins.push(m);
  }
  const loud = peak * 0.1; // −20dB rel clip peak
  const quiet = peak * 0.02; // −34dB rel clip peak (resurgence arm level)
  const resurge = peak * 0.05; // −26dB rel clip peak (resurgence fire level)
  const speechLevel = peak * 0.5; // −6dB rel clip peak: content this loud is real speech, never a tail defect
  const tailWins = Math.min(wins.length, Math.round(tailMs / 2));
  const first = wins.length - tailWins;

  // Rule 2 — resurgence. Walk the tail in order: arm after a quiet run of
  // ≥ minGapMs; once armed, the first window back above the fire level is the
  // defect — unless it reaches speech level (resumed speech: disarm).
  // Trim point = start of the quiet run that armed us.
  if (mode !== 'longform') {
    let quietRunStart = -1;
    let armedAt = -1;
    for (let i = first; i >= 0 && i < wins.length; i++) {
      if (wins[i] <= quiet) {
        if (quietRunStart === -1) quietRunStart = i;
        if ((i - quietRunStart + 1) * 2 >= minGapMs) armedAt = quietRunStart;
      } else if (wins[i] > speechLevel) {
        quietRunStart = -1; armedAt = -1; // real speech resumed — start over
      } else {
        if (armedAt !== -1 && wins[i] > resurge) {
          let clickPeak = 0;
          for (let j = i; j < wins.length; j++) { if (wins[j] > clickPeak) clickPeak = wins[j]; }
          return {
            click: true,
            kind: 'resurgence',
            trimSec: (armedAt * winSamples) / 48000,
            peakDb: Math.round(20 * Math.log10(clickPeak / peak) * 10) / 10
          };
        }
        if (wins[i] > resurge) { quietRunStart = -1; } // still speech — reset the quiet run
        else if (quietRunStart !== -1 && wins[i] > quiet) { quietRunStart = -1; } // mid-level wobble breaks the run but not the arm
      }
    }
  }

  // Rule 3 — post-speech rise. Smoothed 10ms envelope (5-window max) over the
  // tail; after the last strong-speech point, a ≥ riseDb climb off the running
  // minimum that stays below speech level is exhale/noise, not speech.
  if (mode !== 'longform') {
    const env = [];
    for (let i = first; i < wins.length; i++) {
      let m = 0;
      for (let j = Math.max(0, i - 2); j <= Math.min(wins.length - 1, i + 2); j++) { if (wins[j] > m) m = wins[j]; }
      env.push(m);
    }
    let lastStrong = 0; // speech ended before the tail window: scan the whole tail
    for (let i = 0; i < env.length; i++) { if (env[i] > speechLevel) lastStrong = i; }
    if (lastStrong < env.length - 1) {
      let runMin = env[lastStrong];
      let runMinAt = lastStrong;
      for (let i = lastStrong + 1; i < env.length; i++) {
        if (env[i] > speechLevel) { runMin = env[i]; runMinAt = i; continue; } // resumed speech — re-anchor
        if (env[i] < runMin) { runMin = env[i]; runMinAt = i; }
        else if (
          runMin > 0 &&
          env[i] / runMin >= Math.pow(10, riseDb / 20) &&
          env[i] > peak * 0.02 // must be audible (−34dB rel peak)
        ) {
          let clickPeak = 0;
          for (let j = i; j < env.length; j++) { if (env[j] > clickPeak) clickPeak = env[j]; }
          return {
            click: true,
            kind: 'rise',
            trimSec: ((first + runMinAt) * winSamples) / 48000,
            peakDb: Math.round(20 * Math.log10(clickPeak / peak) * 10) / 10
          };
        }
      }
    }
  }

  // Rule 1 — short isolated burst.
  let runEnd = -1;
  for (let i = wins.length - 1; i >= first; i--) { if (wins[i] > loud) { runEnd = i; break; } }
  if (runEnd === -1) return { click: false };
  let runStart = runEnd;
  while (runStart > 0 && wins[runStart - 1] > loud) runStart--;
  if (runStart <= first) return { click: false }; // run reaches beyond the analysed tail = speech body
  let gapStart = runStart;
  while (gapStart > 0 && wins[gapStart - 1] <= loud) gapStart--;

  const runMs = (runEnd - runStart + 1) * 2;
  const gapMs = (runStart - gapStart) * 2;
  if (runMs > maxClickMs || gapMs < minGapMs) return { click: false };
  const clickPeak = Math.max(...wins.slice(runStart, runEnd + 1));
  return {
    click: true,
    kind: 'burst',
    trimSec: (gapStart * winSamples) / 48000,
    peakDb: Math.round(20 * Math.log10(clickPeak / peak) * 10) / 10
  };
}

/**
 * verifyTrimKeepsText — transcription safety gate for tail-defect repairs.
 *
 * The resurgence/rise rules cannot distinguish a breath/grunt burst from real
 * speech resuming after an unusually long intra-phrase pause (measured on the
 * 2026-07-24 sweep: 3 of 154 flagged clips were pausey renders — "Come stai?"
 * with 400ms before "stai", "…here, good" with the closing word detached —
 * where the DSP trim would have amputated a word). Whisper adjudicates: the
 * kept region [0, trimSec] must transcribe every word of the intended text,
 * OR the cut region [trimSec, end] must transcribe as silence/noise. Both
 * conditions failing together is the amputation signature. (Either alone is
 * whisper variance: homophones/plurals on the kept side, hallucinated words
 * on breath sounds on the cut side — both observed, both harmless.)
 *
 * Best-effort: returns null when whisper-cli or the model file is missing —
 * callers decide whether to proceed unverified (measured FP rate without this
 * gate: ~2% of flagged clips) or reject.
 *
 * @returns {Promise<null | {ok: boolean, kept: string, cut: string, missing: string[]}>}
 */
const WHISPER_MODEL = process.env.WHISPER_MODEL
  || '/Users/tomcassidy/SSi/whisper-models/ggml-small.bin';

// Bounded whisper concurrency: each whisper-cli process holds ~600MB of model
// weights, and repairTailDefect runs at the caller's batch concurrency — the
// 2026-07-27 BUILD batch stampeded 61 simultaneous processes on an 8GB machine
// (13.5GB swap, two kernel panics). Same semaphore shape as the xAI phonology
// gate in tts-service.cjs (XAI_PHONO_CONCURRENCY).
const WHISPER_MAX_CONCURRENT = Number(process.env.WHISPER_VERIFY_CONCURRENCY || 2);
let whisperActive = 0;
const whisperQueue = [];
function whisperAcquire() {
  if (whisperActive < WHISPER_MAX_CONCURRENT) { whisperActive++; return Promise.resolve(); }
  return new Promise((resolve) => whisperQueue.push(resolve));
}
function whisperRelease() {
  const next = whisperQueue.shift();
  if (next) next(); else whisperActive--;
}

// Stale trimverify-* temp dirs survive a crash/kill (the finally-cleanup never
// runs); sweep ones older than an hour once per process so they can't pile up.
let _staleSwept = false;
async function sweepStaleTrimDirs() {
  if (_staleSwept) return;
  _staleSwept = true;
  try {
    const tmp = require('os').tmpdir();
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const name of await fs.readdir(tmp)) {
      if (!name.startsWith('trimverify-')) continue;
      const dir = path.join(tmp, name);
      const st = await fs.stat(dir).catch(() => null);
      if (st && st.mtimeMs < cutoff) await fs.remove(dir).catch(() => {});
    }
  } catch { /* best-effort */ }
}

let _whisperReady = null;
async function whisperAvailable() {
  if (_whisperReady === null) {
    try {
      await execAsync('command -v whisper-cli');
      _whisperReady = await fs.pathExists(WHISPER_MODEL);
    } catch { _whisperReady = false; }
  }
  return _whisperReady;
}

async function verifyTrimKeepsText(audioPath, trimSec, text, language) {
  if (!text || !(await whisperAvailable())) return null;
  await sweepStaleTrimDirs();
  const tmpDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 'trimverify-'));
  try {
    const keepWav = path.join(tmpDir, 'keep.wav');
    const cutWav = path.join(tmpDir, 'cut.wav');
    const EXEC_OPTS = { timeout: 60000, killSignal: 'SIGKILL' };
    await execAsync(`ffmpeg -y -hide_banner -loglevel error -i "${audioPath}" -t ${trimSec} -ar 16000 -ac 1 "${keepWav}"`, EXEC_OPTS);
    await execAsync(`ffmpeg -y -hide_banner -loglevel error -i "${audioPath}" -ss ${trimSec} -ar 16000 -ac 1 "${cutWav}"`, EXEC_OPTS);
    const lang = language ? language.slice(0, 2) : 'auto';
    const run = async (wav) => {
      await whisperAcquire();
      try {
        // execFile (no shell) + timeout/SIGKILL: whisper-cli itself is the
        // child, so a hung or abandoned run is reaped, never orphaned.
        const stdout = await new Promise((resolve, reject) => {
          execFile('whisper-cli',
            ['-m', WHISPER_MODEL, '-l', lang, '-nt', '-t', String(process.env.WHISPER_THREADS || 4), '-f', wav],
            { encoding: 'utf8', maxBuffer: 1 << 22, timeout: 120000, killSignal: 'SIGKILL' },
            (err, out) => (err ? reject(err) : resolve(out)));
        });
        return stdout.trim().replace(/\s+/g, ' ');
      } finally {
        whisperRelease();
      }
    };
    const kept = await run(keepWav);
    const cut = await run(cutWav);
    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const keptWords = new Set(norm(kept).split(' ').filter(Boolean));
    const missing = norm(text).split(' ').filter(Boolean).filter((w) => !keptWords.has(w));
    const cutSpeaks = !!norm(cut.replace(/\[[^\]]*\]|\([^)]*\)/g, ''));
    return { ok: !(missing.length && cutSpeaks), kept, cut, missing };
  } catch (e) {
    return null; // whisper hiccup = unverified, not unsafe
  } finally {
    await fs.remove(tmpDir).catch(() => {});
  }
}

/**
 * repairTailDefect — detect + iteratively DSP-repair a tail defect, with the
 * whisper amputation guard at every cut. The one implementation behind both
 * the generation gate (phase8 masterAudio) and the stored-clip sweep tool
 * (tools/declick-tail.cjs) — they must never drift apart on this logic.
 *
 * Semantics (all measured on the 2026-07-24 sweep, 154 flagged clips):
 * - no defect → {defect: null}
 * - first detection sits on resumed SPEECH (pausey render, "Come stai?"):
 *   input is fine as-is → {action: 'held'} — caller ships/keeps the original.
 * - repaired clean → {action: 'repaired', outPath}
 * - a re-flag on the repaired clip that whisper says is soft trailing speech
 *   (a detached "please"/"yes") is accepted — the real burst is already gone
 *   → {action: 'repaired', residualSpeechFlag}
 * - stacked defects trim deeper, up to 3 passes; still dirty after 3 → throws.
 * - minKeepSec: a trim point earlier than this means the clip is substantially
 *   defective → throws (generation gate uses 0.2; sweeps use 0).
 *
 * @returns {Promise<{defect: null} | {defect: object, action: 'held'|'repaired', outPath?: string, passes?: number, verify?: object, residualSpeechFlag?: object}>}
 */
async function repairTailDefect(inputPath, workDir, { text, language, mode, minKeepSec = 0 } = {}) {
  const tailMode = mode || (isLongformText(text) ? 'longform' : 'phrase');
  const det = await detectTailClick(inputPath, { mode: tailMode });
  if (!det.click) return { defect: null };
  if (det.trimSec < minKeepSec) {
    throw new Error(`tail defect (${det.kind} ${det.peakDb}dB) with trim point at ${det.trimSec}s — clip is substantially defective`);
  }
  const v0 = await verifyTrimKeepsText(inputPath, det.trimSec, text, language);
  if (v0 && !v0.ok) return { defect: det, action: 'held', verify: v0 };
  let fixed = inputPath;
  let cutAt = det.trimSec;
  for (let pass = 0; pass < 3; pass++) {
    const next = path.join(workDir, `declick-pass${pass}.mp3`);
    await ffmpegFilterToLameMp3(fixed, next, {
      filterChain: `atrim=end=${cutAt},asetpts=PTS-STARTPTS,`
        + 'areverse,afade=t=in:st=0:d=0.008,areverse,apad=pad_dur=0.1',
    });
    fixed = next;
    const recheck = await detectTailClick(fixed, { mode: tailMode });
    if (!recheck.click) return { defect: det, action: 'repaired', outPath: fixed, passes: pass + 1 };
    const rv = await verifyTrimKeepsText(fixed, recheck.trimSec, text, language);
    if (rv && !rv.ok) {
      return { defect: det, action: 'repaired', outPath: fixed, passes: pass + 1, residualSpeechFlag: recheck };
    }
    if (pass === 2) {
      throw new Error(`tail defect (${det.kind} ${det.peakDb}dB) still detected (${recheck.kind} ${recheck.peakDb}dB) after 3 repair passes — refusing to ship`);
    }
    cutAt = recheck.trimSec;
  }
}

async function normalizeAudio(inputPath, outputPath, targetLUFS = -16.0, opts = {}) {
  try {
    // De-hiss xAI renders before compression (see PRE_DENOISE). No-op for other
    // providers, whose raw noise floor is already inaudible.
    const denoisePrefix = opts.denoise ? `${PRE_DENOISE},` : '';
    const measured = await measureIntegratedLoudness(inputPath, PRE_COMPRESS);
    const gain = (targetLUFS + 1.0 - measured).toFixed(2);
    await ffmpegFilterToLameMp3(inputPath, outputPath, {
      filterChain: `${denoisePrefix}${PRE_COMPRESS},volume=${gain}dB,${TRUE_PEAK_LIMIT},${ANTI_CLICK_FADE}`
    });
  } catch (error) {
    throw new Error(`Failed to normalize audio: ${error.message}`);
  }
}

/**
 * Clean-mastering variant (founder ruling 2026-07-29, VAD Lab clips): the
 * PRE_COMPRESS stage above (8:1 below -24dB) plus its make-up gain drags the
 * noise floor of peaky xAI voice clones into audibility — "that hissy
 * mastering stuff". This variant drops the compressor and the +1dB make-up
 * trick entirely: plain gain to target, true-peak limit as the safety net,
 * and the anti-click fades (which must never be dropped). Known consequence,
 * accepted for VAD Lab: without the crest-taming compressor, xAI clones stall
 * at roughly -20 to -22 LUFS instead of -16 — scores and contours are
 * level-invariant and the lab loudness-matches for A/B listening. ADDITIVE:
 * nothing in the default normalizeAudio() chain changes for existing callers.
 * Returns the measured input LUFS and the resulting output LUFS.
 */
async function normalizeAudioClean(inputPath, outputPath, targetLUFS = -16.0) {
  try {
    const measured = await measureIntegratedLoudness(inputPath, 'anull');
    const gain = (targetLUFS - measured).toFixed(2);
    await ffmpegFilterToLameMp3(inputPath, outputPath, {
      filterChain: `volume=${gain}dB,${TRUE_PEAK_LIMIT},${ANTI_CLICK_FADE}`
    });
    const resultLUFS = await measureIntegratedLoudness(outputPath, 'anull');
    return { inputLUFS: measured, outputLUFS: resultLUFS };
  } catch (error) {
    throw new Error(`Failed to clean-normalize audio: ${error.message}`);
  }
}

/**
 * Process audio file (time-stretch and/or normalize)
 *
 * @param {string} inputPath - Input audio file path
 * @param {string} outputPath - Output audio file path
 * @param {object} options - Processing options
 * @param {boolean} options.normalize - Apply normalization (default: true)
 * @param {number} options.timeStretch - Time stretch factor (default: 1.0 = no stretch)
 * @param {number} options.targetLUFS - Target loudness for normalization (default: -16.0)
 * @returns {Promise<void>}
 */
async function processAudio(inputPath, outputPath, options = {}) {
  const {
    normalize = true,
    timeStretch = 1.0,
    targetLUFS = -16.0
  } = options;

  // Ensure ffmpeg and lame are installed (lame writes the iOS-safe MP3 container)
  if (!(await checkFfmpegInstalled())) {
    throw new Error('ffmpeg is not installed. Please install ffmpeg to process audio.');
  }
  if (!(await checkLameInstalled())) {
    throw new Error('lame is not installed. Please install lame — ffmpeg\'s MP3 muxer produces files that fail on iOS.');
  }

  const tempDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 'audio-process-'));
  let currentPath = inputPath;

  try {
    // Step 1: Time-stretch if needed
    if (timeStretch !== 1.0) {
      const stretchedPath = path.join(tempDir, 'stretched.mp3');
      await timeStretchAudio(currentPath, stretchedPath, timeStretch);
      currentPath = stretchedPath;
    }

    // Step 2: Normalize if needed
    if (normalize) {
      await normalizeAudio(currentPath, outputPath, targetLUFS);
    } else {
      // No normalization, just copy/move
      if (currentPath !== inputPath) {
        await fs.move(currentPath, outputPath, { overwrite: true });
      } else {
        await fs.copyFile(inputPath, outputPath);
      }
    }
  } finally {
    // Cleanup temp directory
    await fs.remove(tempDir);
  }
}

/**
 * Process multiple audio files in parallel
 *
 * @param {Array<{input: string, output: string, options: object}>} files - Array of file processing configs
 * @param {number} maxConcurrent - Maximum concurrent processes (default: 4)
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<Array<{success: boolean, input: string, output: string, error: string}>>}
 */
async function processBatch(files, maxConcurrent = 4, onProgress = null) {
  const results = [];
  const queue = [...files];
  let completed = 0;

  const processOne = async (fileConfig) => {
    try {
      await processAudio(fileConfig.input, fileConfig.output, fileConfig.options || {});
      completed++;
      if (onProgress) onProgress(completed, files.length);
      return { success: true, input: fileConfig.input, output: fileConfig.output };
    } catch (error) {
      completed++;
      if (onProgress) onProgress(completed, files.length);
      return { success: false, input: fileConfig.input, output: fileConfig.output, error: error.message };
    }
  };

  // Process in batches
  while (queue.length > 0) {
    const batch = queue.splice(0, maxConcurrent);
    const batchResults = await Promise.all(batch.map(processOne));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Concatenate multiple audio files with optional pauses between segments
 * Each segment is individually normalized before concatenation
 *
 * @param {Array<string>} audioPaths - Array of audio file paths to concatenate
 * @param {string} outputPath - Output file path
 * @param {object} options - Concatenation options
 * @param {number} options.pauseDuration - Pause duration in milliseconds between segments (default: 1000)
 * @param {boolean} options.normalize - Normalize each segment individually (default: true)
 * @param {number} options.targetDBFS - Target dBFS level for normalization (default: -18.0)
 * @param {number} options.headroom - Headroom for normalization in dB (default: 0.1)
 * @returns {Promise<void>}
 */
async function concatenateAudio(audioPaths, outputPath, options = {}) {
  const {
    pauseDuration = 1000,
    normalize = true,
    targetDBFS = -18.0,
    headroom = 0.1
  } = options;

  console.log(`    [CONCAT DEBUG] Concatenating ${audioPaths.length} files`);
  console.log(`    [CONCAT DEBUG] Output: ${outputPath}`);

  if (audioPaths.length === 0) {
    throw new Error('No audio files provided for concatenation');
  }

  if (audioPaths.length === 1) {
    console.log(`    [CONCAT DEBUG] Single file, ${normalize ? 'normalizing' : 'copying'}`);
    // Single file, just copy (with optional normalization)
    if (normalize) {
      await normalizeAudio(audioPaths[0], outputPath);
    } else {
      await fs.copyFile(audioPaths[0], outputPath);
    }
    return;
  }

  const tempDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 'audio-concat-'));
  console.log(`    [CONCAT DEBUG] Temp directory: ${tempDir}`);

  try {
    // Step 1: Normalize each segment individually if requested
    const normalizedPaths = [];

    if (normalize) {
      console.log(`    [CONCAT DEBUG] Normalizing ${audioPaths.length} segments...`);
      for (let i = 0; i < audioPaths.length; i++) {
        console.log(`    [CONCAT DEBUG]   Normalizing segment ${i + 1}: ${audioPaths[i]}`);
        const normalizedPath = path.join(tempDir, `normalized_${i}.mp3`);

        // Check if input file exists
        if (!await fs.pathExists(audioPaths[i])) {
          throw new Error(`Input file does not exist: ${audioPaths[i]}`);
        }

        // Normalize with volume adjustment to target dBFS via ffmpeg→lame pipe
        // (ffmpeg's MP3 muxer writes headers iOS can't decode reliably)
        await ffmpegFilterToLameMp3(audioPaths[i], normalizedPath, {
          filterChain: 'loudnorm=I=-16:LRA=11:TP=-1.5'
        });

        console.log(`    [CONCAT DEBUG]   Normalized to: ${normalizedPath}`);
        normalizedPaths.push(normalizedPath);
      }
    } else {
      normalizedPaths.push(...audioPaths);
    }

    // Step 2: Create silence segment if pause is needed (via ffmpeg→lame pipe)
    let silencePath = null;
    if (pauseDuration > 0) {
      silencePath = path.join(tempDir, 'silence.mp3');
      const pauseDurationSec = pauseDuration / 1000;
      await ffmpegFilterToLameMp3(null, silencePath, {
        ffmpegInputArgs: ['-f', 'lavfi'],
        inputOverride: `anullsrc=r=44100:cl=stereo:d=${pauseDurationSec}`,
        channels: 2,
        sampleRate: 44100
      });
    }

    // Step 3: Create concat file list
    const concatListPath = path.join(tempDir, 'concat_list.txt');
    const concatList = [];

    for (let i = 0; i < normalizedPaths.length; i++) {
      concatList.push(`file '${normalizedPaths[i]}'`);

      // Add silence between segments (but not after the last one)
      if (silencePath && i < normalizedPaths.length - 1) {
        concatList.push(`file '${silencePath}'`);
      }
    }

    await fs.writeFile(concatListPath, concatList.join('\n'));

    // Step 4: Concatenate all files with RE-ENCODING (not stream copy)
    // This properly handles different sample rates/codecs (like pydub does)
    const tempOutput = path.join(tempDir, 'concatenated.mp3');
    console.log(`    [CONCAT DEBUG] Concatenating with re-encoding`);
    console.log(`    [CONCAT DEBUG] Temp output: ${tempOutput}`);

    // Use concat demuxer but with re-encoding via ffmpeg→lame pipe.
    // -ar 44100 -ac 2 -b:a 192k (original) — bitrate set on the lame side now.
    await ffmpegFilterToLameMp3(null, tempOutput, {
      ffmpegInputArgs: ['-f', 'concat', '-safe', '0'],
      inputOverride: concatListPath,
      channels: 2,
      sampleRate: 44100,
      bitrate: 192
    });

    console.log(`    [CONCAT DEBUG] Concatenation complete, checking file...`);
    const stats = await fs.stat(tempOutput);
    console.log(`    [CONCAT DEBUG] Concatenated file size: ${stats.size} bytes`);

    // Step 5: Final normalization of the combined audio
    if (normalize) {
      console.log(`    [CONCAT DEBUG] Final normalization...`);
      await normalizeAudio(tempOutput, outputPath);
    } else {
      await fs.move(tempOutput, outputPath, { overwrite: true });
    }

    console.log(`    [CONCAT DEBUG] Final file written to: ${outputPath}`);

  } finally {
    // Cleanup temp directory
    await fs.remove(tempDir);
  }
}

/**
 * Extract audio metadata
 *
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<object>} Audio metadata (duration, bitrate, sampleRate, etc.)
 */
async function getAudioMetadata(audioPath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_format -show_streams -of json "${audioPath}"`
    );

    const data = JSON.parse(stdout);
    const audioStream = data.streams.find(s => s.codec_type === 'audio');

    return {
      duration: parseFloat(data.format.duration),
      bitrate: parseInt(data.format.bit_rate),
      sampleRate: parseInt(audioStream?.sample_rate || 0),
      channels: parseInt(audioStream?.channels || 0),
      codec: audioStream?.codec_name || 'unknown',
      format: data.format.format_name
    };
  } catch (error) {
    throw new Error(`Failed to extract audio metadata: ${error.message}`);
  }
}

/**
 * Process recording buffer from browser upload
 * Designed for mobile phone recordings (iPhone etc) in quiet rooms
 *
 * Pipeline:
 * 1. Convert WebM/any format to MP3
 * 2. Trim silence from start/end
 * 3. High-pass filter (remove rumble below 80Hz)
 * 4. Normalize loudness (EBU R128, -16 LUFS)
 * 5. Output: 44.1kHz mono 128kbps MP3
 *
 * @param {Buffer} inputBuffer - Raw audio data from browser (typically WebM/Opus)
 * @param {object} options - Processing options
 * @param {string} options.inputFormat - Input format hint (default: 'webm')
 * @param {boolean} options.trimSilence - Trim leading/trailing silence (default: true)
 * @param {boolean} options.normalize - Apply loudness normalization (default: true)
 * @param {number} options.targetLUFS - Target loudness (default: -16)
 * @returns {Promise<{buffer: Buffer, metadata: object}>}
 */
async function processRecordingBuffer(inputBuffer, options = {}) {
  const {
    inputFormat = 'webm',
    trimSilence = true,
    normalize = true,
    targetLUFS = -16
  } = options;

  // Check FFmpeg
  if (!(await checkFfmpegInstalled())) {
    console.warn('[AudioProcessor] FFmpeg not available, returning unprocessed audio');
    return {
      buffer: inputBuffer,
      metadata: {
        processed: false,
        reason: 'ffmpeg_not_available'
      }
    };
  }

  const crypto = require('crypto');
  const os = require('os');
  const tempId = crypto.randomBytes(8).toString('hex');
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ssi-recording-'));
  const inputPath = path.join(tempDir, `input_${tempId}.${inputFormat}`);
  const outputPath = path.join(tempDir, `output_${tempId}.mp3`);

  try {
    // Write input buffer to temp file
    await fs.writeFile(inputPath, inputBuffer);

    // Build filter chain
    const filters = [];

    // 1. Trim silence from start and end (gentle threshold for speech)
    if (trimSilence) {
      filters.push('silenceremove=start_periods=1:start_threshold=-40dB:start_duration=0.1');
      filters.push('areverse');
      filters.push('silenceremove=start_periods=1:start_threshold=-40dB:start_duration=0.1');
      filters.push('areverse');
    }

    // 2. High-pass filter to remove low-frequency rumble (AC hum, handling noise)
    filters.push('highpass=f=80');

    // 3. Normalize loudness (EBU R128)
    if (normalize) {
      filters.push(`loudnorm=I=${targetLUFS}:TP=-1.5:LRA=11`);
    }

    // 4. Gentle limiter to catch any peaks
    filters.push('alimiter=limit=0.95:attack=5:release=50');

    const filterChain = filters.join(',');

    // Convert WebM → MP3 via ffmpeg→lame pipe (ffmpeg's MP3 muxer breaks iOS playback)
    await ffmpegFilterToLameMp3(inputPath, outputPath, {
      filterChain,
      bitrate: 128,
      sampleRate: 44100,
      channels: 1
    });

    // Read processed output
    const outputBuffer = await fs.readFile(outputPath);

    // Get duration
    let durationMs = 0;
    try {
      const { stdout } = await execAsync(
        `ffprobe -i "${outputPath}" -show_entries format=duration -v quiet -of csv="p=0"`
      );
      durationMs = Math.round(parseFloat(stdout.trim()) * 1000);
    } catch (e) {
      // Duration extraction failed, not critical
    }

    return {
      buffer: outputBuffer,
      metadata: {
        processed: true,
        format: 'mp3',
        sampleRate: 44100,
        channels: 1,
        bitrate: 128000,
        durationMs,
        inputFormat,
        inputSize: inputBuffer.length,
        outputSize: outputBuffer.length,
        filters: {
          trimSilence,
          normalize,
          targetLUFS,
          highpassHz: 80
        }
      }
    };

  } catch (error) {
    console.error('[AudioProcessor] Processing failed:', error.message);
    // Return original buffer on failure
    return {
      buffer: inputBuffer,
      metadata: {
        processed: false,
        reason: error.message
      }
    };
  } finally {
    // Cleanup temp files
    await fs.remove(tempDir).catch(() => {});
  }
}

module.exports = {
  checkFfmpegInstalled,
  checkLameInstalled,
  ffmpegFilterToLameMp3,
  ANTI_CLICK_FADE,
  detectTailClick,
  isLongformText,
  verifyTrimKeepsText,
  repairTailDefect,
  checkSoxInstalled,
  getAudioDuration,
  checkMp3Format,
  timeStretchAudio,
  normalizeAudio,
  normalizeAudioClean,
  processAudio,
  processBatch,
  concatenateAudio,
  getAudioMetadata,
  processRecordingBuffer
};
