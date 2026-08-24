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
// ~/.local/bin is in this list because watson-1 has no usable sudo: ops/install-lame.sh
// builds lame there, and whisper-cli lives there too. On 2026-08-04 both binaries were
// present and working while the bare spawns still died with ENOENT, because that
// directory was not on the PATH the render process inherited — same failure class as
// the ffmpeg one above, same fix.
for (const dir of [`${process.env.HOME || ''}/.local/bin`, '/opt/homebrew/bin', '/usr/local/bin']) {
  if (dir && !(process.env.PATH || '').split(':').includes(dir)) {
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
// LAME_BIN — mirrors WHISPER_BIN below. ops/install-lame.sh builds lame into
// ~/.local/bin because watson-1 has no usable sudo, but that directory is not on
// PATH for every process that renders audio: on 2026-08-04 the binary was present
// and working while `spawn('lame')` still died with ENOENT, taking the whole
// render with it. Resolving through one constant means a working install can be
// pointed at explicitly instead of depending on the caller's environment.
const LAME_BIN = process.env.LAME_BIN
  || (fs.existsSync(`${process.env.HOME || ''}/.local/bin/lame`) ? `${process.env.HOME}/.local/bin/lame` : null)
  || (fs.existsSync('/opt/homebrew/bin/lame') ? '/opt/homebrew/bin/lame' : 'lame');

async function checkLameInstalled() {
  try {
    await execAsync(`"${LAME_BIN}" --version`);
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
    const lame = spawn(LAME_BIN, lameArgs);

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
 * THE TAIL-REPAIR MUTATION PATH IS DELETED. DO NOT REINTRODUCE IT.
 *
 * Tom's ruling, 2026-08-05, after the third recurrence: "DELETE the tail-repair
 * service's ability to modify audio entirely, do not just change its default."
 *
 * What used to live here: `repairTailDefect`, which trimmed a clip at the point
 * `detectTailClick` reported, re-padded 100 ms (`apad=pad_dur=0.1`) and re-faded.
 * It shipped a live course with taught words missing. deu_for_eng seeds 1-5 were
 * serving "Ich will jetzt mit dir Deutsch sprechen" WITHOUT "sprechen", and the
 * "how to speak" intro as "I'm trying to learn how to" — 27 clips in the first
 * five seeds alone (docs/deu-first5-clipping-emergency-2026-08-05.md).
 *
 * The mechanism, stated so nobody rebuilds it believing it can be made safe:
 * `detectTailClick` CANNOT distinguish a tail click from a natural mid-sentence
 * pause. German word order makes a pause before the final verb routine; the
 * resumed speech after it reads as tail energy; the trim deletes every word
 * after the pause. The 100 ms pad and the anti-click fade then leave a textbook
 * clean decay, so every physical probe reports the clip healthy and the damage
 * is invisible to everything except an ASR word-retention check.
 *
 * Its guards did not work and could not: AMPUTATION_MIN_KEEP_FRACTION only
 * blocked a trim discarding >50 % of a clip (eating one final word keeps far
 * more), the silence guard only fired on a silent result, and the whisper
 * `verifyTrimKeepsText` check returned null → proceed whenever whisper was
 * absent. Measured precision by ear was 7/76 = 9 %
 * (docs/audio-tail-gate-decision-memo-2026-08-04.md).
 *
 * A TAIL_REPAIR_MODE switch was tried first and is also gone. An env var that
 * has to be set correctly in every unit file, tool, cron and fresh checkout is
 * a default waiting to leak — which is exactly what kept happening. There is
 * now no code path in this module that can trim or rewrite course audio, so
 * there is nothing left for an environment to get wrong.
 *
 * Detection SURVIVES, read-only, below. It may report suspects for human ears
 * in the manual approval gate. It must NEVER gate, mutate or auto-act.
 */

/**
 * flagTailDefect — READ-ONLY. Reports whether `detectTailClick` sees a tail
 * defect. Writes nothing, modifies nothing, throws nothing.
 *
 * ⚠️ 9 % PRECISION. Nine out of ten flags are not defects — measured by ear on
 * 76 flagged clips, 2026-08-04. 83 % of its flags vanish if you merely append
 * 300 ms of silence, which cannot remove a real click, and 16 of 20 FRESH TTS
 * renders trip it. Treat output as "a human might want to listen", never as
 * evidence a clip is bad. Anything surfacing this MUST state the 9 % alongside.
 *
 * @returns {Promise<{defect: object|null, action: 'flagged'|'none', precision: string}>}
 */
async function flagTailDefect(inputPath, { text, mode } = {}) {
  const tailMode = mode || (isLongformText(text) ? 'longform' : 'phrase');
  const det = await detectTailClick(inputPath, { mode: tailMode }).catch(() => ({ click: false }));
  return {
    defect: det && det.click ? det : null,
    action: det && det.click ? 'flagged' : 'none',
    precision: '9% by ear (7/76, 2026-08-04) — suspects for human review only, never grounds to alter a clip',
  };
}

// =============================================================================
// END-OF-SPEECH TAIL (A-133) — the ONLY sanctioned trim in this module
// =============================================================================
//
// Read the deletion notice above detectTailClick first. That notice bans a
// REPAIR pass that cut already-shipped clips at a 9%-precise detector's guess.
// This is a different operation and must stay different:
//
//   - it decides where a BRAND-NEW file ends, at render time, on a clip that
//     does not exist yet. It never reads, rewrites or re-masters a shipped clip;
//   - the only operation permitted is "stop the file earlier". Nothing is
//     patched, padded, crossfaded, de-clicked, synthesised or rewritten;
//   - it cuts on SUSTAINED SPEECH ENERGY, not on flagTailDefect. That detector
//     is instrumentation and never decides a byte here;
//   - every guard FAILS OPEN. Uncertain detection, a decode error, a suspicious
//     cut — the clip passes through untouched and the reason is returned. There
//     is no input for which this function may produce a shorter clip than it can
//     justify, and no error path that ends in a cut.
//
// WHAT IT IS FOR (A-133, 2026-08-17, Tom's ruling after the ear check). The xAI
// clone cast on nld_for_eng pod-0 emits two isolated impulses in the RAW
// provider bytes, 260ms and 380ms after the last phonation, 42dB above the room
// floor they interrupt — the click Tom placed by ear as "after the voice ends".
// The 8ms ANTI_CLICK_FADE never touched them because the fade is at EOF and the
// impulses are half a second upstream of it. Ending the file at end-of-speech
// + 250ms leaves them outside the file. On clean voices the same pass removes
// only the provider's dead room tone (0-730ms observed across 18 voices) and on
// the tightest voices removes nothing at all.
// Evidence: docs/a108/a133-end-of-speech-tail-2026-08-17.md and
// docs/a108/a133-money-voices-ear-check-2026-08-17.md.

// Detection constants, lifted verbatim from tools/a108/a133-tail-probe.cjs so
// the render chain cuts at exactly the point the published ear-check measured.
const EOS_SR = 44100;
// Speech threshold, dB RELATIVE TO THE CLIP'S OWN SPEECH PEAK — not a fixed
// dBFS number, because xAI clones are peaky (crest factor ~19dB) and a fixed
// floor means something different on every voice.
const EOS_SPEECH_DB = -45;
const EOS_WIN_MS = 5;
// An event counts as SPEECH only if this much of it is ACTUALLY above threshold
// (summed window time, not the event's span). This is the load-bearing rule.
// The naive "last sample over -45dB" detector fails here because the clicks ARE
// over -45dB — they hit -25dB — but they are 10-20ms of energy. Speech is
// sustained. A word-final plosive burst can be shorter than 40ms and so could be
// mis-labelled an impulse; it is still protected, because EOS_DECAY_MS keeps
// 250ms past the previous speech event and no language has a 250ms word-internal
// closure. The trim can only ever reach something standing MORE than 250ms clear
// of the last sustained speech.
const EOS_MIN_SPEECH_MS = 40;
// Windows this close together belong to the same event (intra-word closures).
const EOS_EVENT_GAP_MS = 20;
// Natural decay kept past end-of-speech. 250ms, not the probe's original 150ms,
// and the reason is the learning app: at the cycle player's voice1→voice2 seam
// the app contributes NO gap at all (`transition_gap_ms` is dead config with no
// consumer), so this pad IS the entire audible separation between two
// consecutive phrases. 250ms separates them audibly on its own and still ends
// the file 10ms short of the earliest impulse on the known clicker.
const EOS_DECAY_MS = 250;
// Refusal guards. These bound a DETECTION FAILURE, not normal operation: the
// provider's dead tail is routinely 20%+ of a short clip, so a 15% fraction
// guard would refuse every good cut.
const EOS_MAX_TRIM_FRAC = 0.40;
const EOS_MAX_TRIM_MS = 2000;

// ── The trailing-artefact rule (A-133 iteration 2, Tom-approved 2026-08-17) ──
//
// The detector above asks one question of a trailing event: "is it long enough
// to be speech?" Noor's clicks carry 35-50ms and sit exactly on the 40ms line,
// so on 2 of her 5 lines they read as SPEECH — end-of-speech moves out past
// them, the chain then protects them, and pads a further 250ms beyond. Once a
// trailing artefact is long enough to be mistaken for speech, it is protected,
// and so is every artefact in front of it.
//
// So ask the question the detector is missing: DOES ANYTHING REAL PRECEDE IT?
// Take the speech BODY — the last event carrying >= EOS_BODY_MS of energy. If
// everything after the body is short AND the cluster starts >= EOS_MIN_CLEAR_MS
// after the body ends, the whole trailing cluster is artefact, whatever the
// individual event lengths say.
//
// THE CLUSTER FORM IS LOAD-BEARING, and I only know that because the pairwise
// form failed. Testing each trailing event against its immediate PREDECESSOR
// leaves Noor p1 untouched: her two artefacts are only 100ms apart, so they
// protect each other. Measuring the cluster against the speech body fixes it.
//
// THE ONE THING THIS COULD GET WRONG, stated rather than smoothed over: a line
// that genuinely ends in a short tag after a pause — "..., toch?", "..., hè?" —
// has the same shape to this rule as an artefact cluster. That is why the tag
// case is rendered fresh and ASR-checked in the validation batch, not asserted
// safe. The numbers below are set from that batch: real tags measured 150-430ms
// of energy, artefacts 35-50ms, and the 120ms line sits in the gap.
const EOS_BODY_MS = 150;          // what counts as the main speech body
const EOS_MAX_ARTEFACT_MS = 120;  // a trailing event longer than this is never dropped
const EOS_MIN_CLEAR_MS = 200;     // clearance the whole cluster needs from the body
// Companion rule, which Noor p3 needs on its own: NEVER PAD INTO A DETECTED
// ARTEFACT. p3's 45dB click at 2711ms sits inside the 250ms pad measured from a
// corrected end-of-speech at 2480ms, so a correct end-of-speech alone does not
// save it — the pad has to stop short of the artefact onset too.
//
// The clamp CANNOT amputate, and that is arithmetic rather than luck: the rule
// only fires when the cluster stands >= EOS_MIN_CLEAR_MS clear of end-of-speech,
// so the retained decay is never less than 200 - 10 = 190ms. Measured over the
// 55-clip sweep the tightest it ever went was 206ms.
const EOS_ARTEFACT_GUARD_MS = 10;

/** Decode to mono 16-bit PCM at EOS_SR. Streamed — no execSync buffer ceiling. */
function decodePcmMono(inputPath) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-v', 'quiet', '-i', inputPath, '-ac', '1',
      '-ar', String(EOS_SR), '-f', 's16le', '-']);
    const chunks = [];
    let err = '';
    ff.stdout.on('data', d => chunks.push(d));
    ff.stderr.on('data', d => { err += d.toString(); });
    ff.on('error', reject);
    ff.on('close', code => {
      if (code !== 0) return reject(new Error(`ffmpeg decode exited ${code}: ${err.slice(-300)}`));
      const pcm = Buffer.concat(chunks);
      const n = pcm.length >> 1;
      const s = new Int16Array(n);
      for (let i = 0; i < n; i++) s[i] = pcm.readInt16LE(i * 2);
      let peak = 1;
      for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(s[i]));
      resolve({ s, n, peak });
    });
  });
}

const eosDb = (v, peak) => 20 * Math.log10(Math.max(v, 1) / peak);

function eosWinPeak(s, from, to) {
  let p = 0;
  for (let i = Math.max(0, from); i < Math.min(s.length, to); i++) p = Math.max(p, Math.abs(s[i]));
  return p;
}

/** Envelope of 5ms window peaks, dB relative to the clip's own peak. */
function eosEnvelope(s, n, peak) {
  const win = Math.round(EOS_SR * EOS_WIN_MS / 1000);
  const e = [];
  for (let i = 0; i + win <= n; i += win) e.push({ i, end: i + win, db: eosDb(eosWinPeak(s, i, i + win), peak) });
  return e;
}

/** Group above-threshold windows into events; label each SPEECH or IMPULSE. */
function eosEvents(env) {
  const gapWin = Math.max(1, Math.round(EOS_EVENT_GAP_MS / EOS_WIN_MS));
  const out = [];
  let cur = null, gap = 0;
  for (const w of env) {
    if (w.db > EOS_SPEECH_DB) {
      if (cur && gap <= gapWin) { cur.end = w.end; cur.peakDb = Math.max(cur.peakDb, w.db); cur.aboveWins++; }
      else { if (cur) out.push(cur); cur = { start: w.i, end: w.end, peakDb: w.db, aboveWins: 1 }; }
      gap = 0;
    } else if (cur) gap++;
  }
  if (cur) out.push(cur);
  return out.map(e => ({
    ...e,
    ms: (e.end - e.start) / EOS_SR * 1000,
    aboveMs: e.aboveWins * EOS_WIN_MS,
    kind: e.aboveWins * EOS_WIN_MS >= EOS_MIN_SPEECH_MS ? 'speech' : 'impulse',
  }));
}

/** End of speech = end of the LAST event long enough to be speech. */
function endOfSpeech(env) {
  const sp = eosEvents(env).filter(e => e.kind === 'speech');
  return sp.length ? sp[sp.length - 1].end : null;
}

/**
 * End of speech, WITH the trailing-artefact rule applied.
 *
 * Returns the plain end-of-speech unchanged unless a trailing artefact cluster
 * is detected, in which case end-of-speech becomes the end of the speech body
 * and `artefactStart` marks where the pad must stop. Never moves end-of-speech
 * LATER, and never returns an eos the plain detector would not have reached.
 *
 * @param {Array} env - the 5ms envelope
 * @returns {{eos: number|null, artefactStart: number|null, dropped: Array}}
 */
function endOfSpeechWithArtefacts(env) {
  const evs = eosEvents(env);
  const sp = evs.filter(e => e.kind === 'speech');
  const plain = sp.length ? sp[sp.length - 1].end : null;
  const none = { eos: plain, artefactStart: null, dropped: [] };
  if (plain === null) return none;

  // The speech body: the last event carrying real, sustained energy.
  const bodies = evs.filter(e => e.aboveMs >= EOS_BODY_MS);
  if (!bodies.length) return none;          // nothing substantial to measure against
  const body = bodies[bodies.length - 1];

  const after = evs.filter(e => e.start >= body.end);
  if (!after.length) return none;           // the body IS the ending

  // Everything after the body must be short, and the FIRST of them must stand
  // clear of the body. Measured against the body, not against each other —
  // that is what stops two adjacent artefacts protecting one another.
  if (!after.every(e => e.aboveMs <= EOS_MAX_ARTEFACT_MS)) return none;
  const clearMs = (after[0].start - body.end) / EOS_SR * 1000;
  if (clearMs < EOS_MIN_CLEAR_MS) return none;

  return { eos: body.end, artefactStart: after[0].start, dropped: after };
}

/** Write mono 16-bit PCM as a WAV file. */
async function writeMonoWav(file, s, n) {
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) data.writeInt16LE(s[i], i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(EOS_SR, 24); h.writeUInt32LE(EOS_SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  await fs.writeFile(file, Buffer.concat([h, data]));
}

/**
 * trimToEndOfSpeech — end a NEW render at end-of-speech + 250ms.
 *
 * FAILS OPEN, always. Four refusal guards, any one of which keeps the clip
 * whole, plus a catch-all: no detected speech; a cut larger than 40% of the
 * clip; a cut longer than 2000ms; a cut whose removed region contains a speech
 * event (an independent second opinion on the plan — by construction it cannot,
 * so if it ever fires the detector has contradicted itself and we keep the take);
 * and any thrown error whatsoever.
 *
 * @param {string} inputPath - the raw provider bytes
 * @param {string} outputPath - where the trimmed WAV is written (only on a cut)
 * @returns {Promise<{trimmed: boolean, path: string, refused: string|null,
 *   removedMs: number, durationMs: number|null, eosMs: number|null}>}
 *   `path` is what the caller should master: outputPath on a cut, inputPath on
 *   any refusal. A refusal is never an error.
 */
async function trimToEndOfSpeech(inputPath, outputPath) {
  const untouched = (refused, extra = {}) => ({
    trimmed: false, path: inputPath, refused, removedMs: 0,
    durationMs: null, eosMs: null, ...extra,
  });
  try {
    const { s, n, peak } = await decodePcmMono(inputPath);
    if (!n) return untouched('decoded to zero samples — refused, kept untrimmed');
    const env = eosEnvelope(s, n, peak);
    const durationMs = Math.round(n / EOS_SR * 1000);

    // GUARD 1 — nothing in this clip reads as sustained speech. Could be a very
    // short take, a whisper, a decode we do not understand. We do not cut what
    // we cannot see.
    const { eos, artefactStart, dropped } = endOfSpeechWithArtefacts(env);
    if (eos === null) return untouched('no sustained speech event detected — refused, kept untrimmed', { durationMs });

    let want = Math.min(n, eos + Math.round(EOS_SR * EOS_DECAY_MS / 1000));
    // NEVER PAD INTO A DETECTED ARTEFACT. The pad stops 10ms short of the
    // artefact onset even when that is tighter than the 250ms it wants.
    if (artefactStart !== null) {
      want = Math.min(want, artefactStart - Math.round(EOS_SR * EOS_ARTEFACT_GUARD_MS / 1000));
    }
    want = Math.max(want, eos);
    const removed = n - want;
    const eosMs = Math.round(eos / EOS_SR * 1000);
    if (removed <= 0) return untouched(null, { durationMs, eosMs });   // already ends tight — no cut needed, not a refusal

    // GUARD 2 — removing this much of the clip means the detector, not the
    // provider's dead air, is driving the number.
    if (removed / n > EOS_MAX_TRIM_FRAC) {
      return untouched(`would remove ${(removed / n * 100).toFixed(1)}% of the clip (guard ${EOS_MAX_TRIM_FRAC * 100}%) — refused, kept untrimmed`, { durationMs, eosMs });
    }
    // GUARD 3 — same reasoning in absolute time, for long clips where a huge
    // cut is still a small fraction.
    const removedMs = Math.round(removed / EOS_SR * 1000);
    if (removedMs > EOS_MAX_TRIM_MS) {
      return untouched(`would remove ${removedMs}ms (guard ${EOS_MAX_TRIM_MS}ms) — refused, kept untrimmed`, { durationMs, eosMs });
    }
    // Never end before the detected end of speech, whatever the arithmetic says.
    const end = Math.max(want, eos);
    // GUARD 4 — independent assertion on the finished plan: whatever we are
    // about to drop must contain no speech event OTHER than the trailing
    // artefacts the rule has just ruled on. Without that exemption this guard
    // would veto the whole iteration, because dropping a 40ms burst the length
    // rule miscalled "speech" IS the fix. Everything in front of the artefact
    // cluster is still fully protected: an event that starts before
    // `artefactStart` and ends past the cut still refuses, exactly as before.
    const speechOutside = eosEvents(env).some(e =>
      e.kind === 'speech' && e.end > end && (artefactStart === null || e.start < artefactStart));
    if (speechOutside) {
      return untouched('planned cut would remove a speech event — refused, kept untrimmed', { durationMs, eosMs });
    }

    await writeMonoWav(outputPath, s.subarray(0, end), end);
    return {
      trimmed: true, path: outputPath, refused: null,
      removedMs: Math.round((n - end) / EOS_SR * 1000), durationMs, eosMs,
      // What the trailing-artefact rule ruled on, so a caller can report the
      // decision rather than infer it from the durations.
      artefacts: dropped.map(e => ({
        startMs: Math.round(e.start / EOS_SR * 1000),
        aboveMs: e.aboveMs,
        peakDb: +e.peakDb.toFixed(1),
        calledSpeechByLength: e.kind === 'speech',
      })),
    };
  } catch (error) {
    // FAIL OPEN. A trim we could not compute is a trim we do not do.
    return untouched(`detection failed (${error.message}) — refused, kept untrimmed`);
  }
}

async function normalizeAudio(inputPath, outputPath, targetLUFS = -16.0) {
  try {
    const measured = await measureIntegratedLoudness(inputPath, PRE_COMPRESS);
    const gain = (targetLUFS + 1.0 - measured).toFixed(2);
    await ffmpegFilterToLameMp3(inputPath, outputPath, {
      filterChain: `${PRE_COMPRESS},volume=${gain}dB,${TRUE_PEAK_LIMIT},${ANTI_CLICK_FADE}`
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
 * CONVERGENCE PLANNER — pure, and the only place the loop's decisions are made.
 *
 * Kept free of ffmpeg on purpose: "did we converge, and what gain next?" is the
 * part that can be wrong in a way no ear catches, and a test that needs a real
 * decode is a test nobody runs. Everything here is arithmetic.
 *
 * @param {object} s
 * @param {number} s.outputLufs   what the LAST render actually measured
 * @param {number} s.targetLufs   where it is supposed to land
 * @param {number} s.toleranceDb  how close is close enough
 * @param {number} s.gainDb       the total gain that produced outputLufs
 * @param {number} s.pass         passes completed so far (1-based)
 * @param {number} s.maxPasses    hard ceiling
 * @param {number} [s.bestErrorDb] smallest |error| seen before this pass
 * @param {number} [s.maxGainDb=20] refuse to boost a near-silent file into noise
 * @returns {{done:boolean, reason:string, nextGainDb:number|null, errorDb:number, improved:boolean}}
 */
function planNextPass (s) {
  const maxGain = Number.isFinite(s.maxGainDb) ? s.maxGainDb : 20
  const errorDb = Math.round((s.targetLufs - s.outputLufs) * 100) / 100
  const absErr = Math.abs(errorDb)
  const improved = !Number.isFinite(s.bestErrorDb) || absErr < s.bestErrorDb - 0.01

  if (absErr <= s.toleranceDb) {
    return { done: true, reason: `within ${s.toleranceDb} dB of target`, nextGainDb: null, errorDb, improved }
  }
  if (s.pass >= s.maxPasses) {
    return { done: true, reason: `pass ceiling (${s.maxPasses}) reached, still ${errorDb} dB out`, nextGainDb: null, errorDb, improved }
  }
  // A pass that did not get closer means the limiter is holding the level down
  // and more gain will only squash the signal harder. Stop and keep the best.
  if (!improved) {
    return { done: true, reason: `pass ${s.pass} did not improve on ${s.bestErrorDb} dB — the limiter is the floor`, nextGainDb: null, errorDb, improved }
  }
  const nextGainDb = Math.round((s.gainDb + errorDb) * 100) / 100
  if (nextGainDb > maxGain) {
    return { done: true, reason: `next gain ${nextGainDb} dB exceeds the ${maxGain} dB ceiling — input is too quiet to lift cleanly`, nextGainDb: null, errorDb, improved }
  }
  return { done: false, reason: `still ${errorDb} dB out, retrying at ${nextGainDb} dB`, nextGainDb, errorDb, improved }
}

/**
 * CONVERGING clean normalisation — same chain, a better gain number.
 *
 * WHY. Tom, 2026-08-24, on Italian Pod 1: "Enzo is quite a LOT quieter than Ara
 * and also the known language voices." normalizeAudioClean measures the INPUT,
 * computes one gain, applies it, and then runs TRUE_PEAK_LIMIT — which pulls
 * gain back out again on a peaky voice. Nothing ever measured the OUTPUT, so the
 * shortfall was invisible. Measured on live ita_for_eng pod-1 bytes, 2026-08-24:
 * the single pass lands 0.5 to 2.5 dB short of target, and it lands SHORTER the
 * more gain it had to apply — so a quiet voice like Enzo compounds its own
 * disadvantage. That is the whole defect.
 *
 * WHAT THIS DOES NOT DO. It does not reintroduce PRE_COMPRESS. Tom ruled the
 * compressor out on 2026-07-29 ("that hissy mastering stuff") because its make-up
 * gain drags an xAI clone's noise floor into audibility, and that ruling stands.
 *
 * THE MECHANISM, and why it adds no processing at all. Each pass re-renders from
 * the ORIGINAL input with a corrected TOTAL gain — it never re-limits an
 * already-limited file. So the output has been through exactly one volume stage,
 * one limiter and one fade, precisely as before; the only thing that changed is
 * that the gain number is now the right one. There is no extra colouration to
 * argue about because there is no extra processing.
 *
 * WHAT IT CANNOT FIX, stated here so nobody mistakes it for a cure. Integrated
 * LUFS is a full-band measure. The same 2026-08-24 measurement found that Enzo
 * loses 9.1 dB when everything below 500 Hz is removed where the pod's other
 * voices lose about 5 dB — so on a phone speaker he is ~4 dB quieter than his
 * neighbours even once every clip sits exactly on target. That is a SPECTRAL
 * difference and no gain stage can close it. See the report of that date.
 *
 * ADDITIVE: normalizeAudioClean is untouched and every existing caller of it
 * behaves exactly as it did. The return shape here is a superset of that one.
 *
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {number} [targetLUFS=-16.0]
 * @param {object} [opts]
 * @param {number} [opts.toleranceDb=0.5] how close counts as arrived. Tighter than
 *   the loudness GATE's +/-1.5 band on purpose: the gate says what is allowed in,
 *   this says what we aim for, and aiming at the edge of the allowed band is how
 *   two clips two dB apart both pass.
 * @param {number} [opts.maxPasses=3]
 * @param {number} [opts.maxGainDb=20]
 * @returns {Promise<{inputLUFS:number, outputLUFS:number, gainDb:number,
 *   passes:number, converged:boolean, reason:string, history:Array}>}
 */
async function normalizeAudioConverging (inputPath, outputPath, targetLUFS = -16.0, opts = {}) {
  const toleranceDb = Number.isFinite(opts.toleranceDb) ? opts.toleranceDb : 0.5
  const maxPasses = Number.isFinite(opts.maxPasses) ? opts.maxPasses : 3
  const maxGainDb = Number.isFinite(opts.maxGainDb) ? opts.maxGainDb : 20

  try {
    const inputLUFS = await measureIntegratedLoudness(inputPath, 'anull');
    let gainDb = Math.round((targetLUFS - inputLUFS) * 100) / 100
    const history = []
    let best = null

    for (let pass = 1; pass <= maxPasses; pass++) {
      await ffmpegFilterToLameMp3(inputPath, outputPath, {
        filterChain: `volume=${gainDb.toFixed(2)}dB,${TRUE_PEAK_LIMIT},${ANTI_CLICK_FADE}`
      });
      const outputLUFS = await measureIntegratedLoudness(outputPath, 'anull');
      const plan = planNextPass({
        outputLufs: outputLUFS, targetLufs: targetLUFS, toleranceDb,
        gainDb, pass, maxPasses, bestErrorDb: best ? best.absErr : undefined, maxGainDb
      })
      history.push({ pass, gainDb, outputLUFS, errorDb: plan.errorDb, reason: plan.reason })

      // Keep the best render we have SEEN, not merely the last one we made: a
      // final non-improving pass must never be what ships.
      if (!best || Math.abs(plan.errorDb) < best.absErr) {
        best = { gainDb, outputLUFS, absErr: Math.abs(plan.errorDb) }
      } else if (plan.done) {
        // The last render is worse than an earlier one — put the better gain back.
        await ffmpegFilterToLameMp3(inputPath, outputPath, {
          filterChain: `volume=${best.gainDb.toFixed(2)}dB,${TRUE_PEAK_LIMIT},${ANTI_CLICK_FADE}`
        });
      }

      if (plan.done) {
        return {
          inputLUFS, outputLUFS: best.outputLUFS, gainDb: best.gainDb,
          passes: pass, converged: best.absErr <= toleranceDb, reason: plan.reason, history
        }
      }
      gainDb = plan.nextGainDb
    }
    // Unreachable: planNextPass always stops at the pass ceiling.
    return { inputLUFS, outputLUFS: best.outputLUFS, gainDb: best.gainDb, passes: maxPasses, converged: false, reason: 'pass ceiling', history }
  } catch (error) {
    throw new Error(`Failed to converge-normalize audio: ${error.message}`);
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
// DETECT THE READ, THEN CUT WIDE OF IT.
//
// A level gate cannot do this job on its own. Set it high and it cuts at the
// first sample loud enough to clear it, throwing away the onset climbing
// underneath; set it low and it stops on a chair creak three seconds before
// the word and keeps all the dead air in between. Both were measured on real
// takes. So the level only DETECTS where the read is, and the cut is made a
// fixed margin outside it.
const TRIM_DETECT_DB = -40;         // where the read plainly is, not where it starts
const TRIM_MIN_SILENCE_SEC = 0.2;   // silence shorter than this is inside the read
const TRIM_MIN_SPEECH_SEC = 0.3;    // shorter than this is a click, not a word
const TRIM_MARGIN_SEC = 0.35;       // room left outside the read at each end
// A take whose raw input peaks above this has audible content in it, whatever
// the detector later makes of it.
//
// This is only the LAST-RESORT net, under a detector that now adapts to the
// take's own level and finds quiet reads on its own — a 3s read peaking at
// -50dB is detected and trimmed correctly without ever reaching it. So the line
// is drawn where the two real populations separate rather than as low as
// possible: refused takes on 2026-08-22 measured -1.2 to -37dB, and the room
// tone this must keep refusing sits around -55dB (the pink-noise fixture that
// pins the cym_n empty-stub hole shut). Dropping it further reopens that hole,
// which put 26 silent clips into a live course.
const INPUT_AUDIBLE_PEAK_DB = -45;

/**
 * What the INPUT actually contains, measured before anything is done to it.
 *
 * Nothing downstream may call a take silent without having measured the take.
 * On 2026-08-22 seventeen of Tom's takes were refused for containing no audible
 * speech, on the evidence of an 834-byte stub the processing itself had made.
 */
async function measureInputLevel(inputPath) {
  try {
    // volumedetect reports on stderr, and ffmpeg's exit status is not the
    // signal — a file it can only partly read still yields a measurement.
    const res = await execAsync(
      `ffmpeg -hide_banner -nostats -i "${inputPath}" -af volumedetect -f null -`,
      { maxBuffer: 1 << 22 }
    ).catch(e => e);
    const out = `${(res && res.stdout) || ''}${(res && res.stderr) || ''}`;
    const mean = /mean_volume:\s*(-?[\d.]+) dB/.exec(out);
    const peak = /max_volume:\s*(-?[\d.]+) dB/.exec(out);
    if (!peak) return null;
    return {
      meanDb: mean ? parseFloat(mean[1]) : null,
      peakDb: parseFloat(peak[1]),
    };
  } catch {
    return null;
  }
}

/**
 * Where the read actually is in this take, from ffmpeg's silencedetect.
 *
 * Returns {startSec, endSec} bounding the first-to-last substantial non-silent
 * region, or null when nothing in the file qualifies as a read (a muted mic, a
 * take of an empty room, a stray click) — which the caller turns into an empty
 * output so the upload handler's silent-take guard refuses it.
 */
async function detectReadBounds(inputPath) {
  const { stdout, stderr } = await execAsync(
    `ffmpeg -v info -i "${inputPath}" -af silencedetect=noise=${TRIM_DETECT_DB}dB:d=${TRIM_MIN_SILENCE_SEC} -f null - 2>&1`
  );
  const log = `${stdout || ''}${stderr || ''}`;

  // HOW LONG THE TAKE IS, MEASURED RATHER THAN DECLARED.
  //
  // The header's `Duration:` is not available on the audio this actually
  // processes. A browser's MediaRecorder muxes WebM as a live stream into a
  // non-seekable sink, so it never goes back to write the duration element:
  // every take the recorders upload reports `Duration: N/A`. Trusting that
  // header meant detection returned null for EVERY real take, the caller cut
  // it to `atrim=start=0:end=0.001`, and the upload handler's silent-take
  // guard then refused an 834-byte stub — a take that sounded perfect on
  // playback came back "FAILED, not saved". Kai hit it on 2026-08-21 within
  // minutes of the chain going live; the fixture takes the tests build are
  // written by ffmpeg to a seekable FILE, which does carry the header, which
  // is why the suite stayed green.
  //
  // `time=` is the far end of the same run: what the decoder actually played
  // out. It is present whether or not the container declared anything, so it
  // is the primary source here and the header is only the fallback. Take the
  // LAST one — ffmpeg emits progress lines throughout.
  const timeMatches = [...log.matchAll(/\btime=\s*(\d+):(\d+):([\d.]+)/g)];
  const lastTime = timeMatches[timeMatches.length - 1];
  const durMatch = /Duration:\s*(\d+):(\d+):([\d.]+)/.exec(log);
  const hms = (m) => (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
  const duration = lastTime ? hms(lastTime) : (durMatch ? hms(durMatch) : NaN);
  // Only a file ffmpeg could neither describe nor decode has no length at all.
  if (!Number.isFinite(duration) || duration <= 0) return null;

  // Silence intervals, in order. A trailing silence_start with no end runs to
  // the end of the file.
  const silences = [];
  const re = /silence_(start|end):\s*(-?[\d.]+)/g;
  let m;
  while ((m = re.exec(log)) !== null) {
    if (m[1] === 'start') silences.push({ start: Math.max(0, parseFloat(m[2])), end: duration });
    else if (silences.length) silences[silences.length - 1].end = parseFloat(m[2]);
  }

  // Invert to the non-silent regions, then keep only the ones long enough to be
  // a word. This is what steps over the click, the chair and the false start
  // that a plain level gate stops on.
  const reads = [];
  let cursor = 0;
  for (const s of silences) {
    if (s.start - cursor >= TRIM_MIN_SPEECH_SEC) reads.push({ start: cursor, end: s.start });
    cursor = Math.max(cursor, s.end);
  }
  if (duration - cursor >= TRIM_MIN_SPEECH_SEC) reads.push({ start: cursor, end: duration });
  if (!reads.length) return null;

  return { startSec: reads[0].start, endSec: reads[reads.length - 1].end, durationSec: duration };
}

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

    // Measure the INPUT before touching it, so every decision below — and every
    // caller above — is made against what arrived rather than what came out.
    const input = await measureInputLevel(inputPath);
    const inputAudible = !!input && input.peakDb > INPUT_AUDIBLE_PEAK_DB;

    // Build filter chain
    const filters = [];

    // 1. Trim to the read, leaving a margin of room at each end.
    //
    // WHERE TOM'S CLIPPING ACTUALLY WAS. Measured on his own 22 takes
    // (2026-08-21, /r/human_tom_zzz): the raw archived bytes carry 1.3-4.7s of
    // clean lead-in and a room floor of -75 to -88 dBFS, so nothing was lost at
    // capture on that surface at all. Every mastered clip nevertheless came out
    // with a head margin of 5-40ms, starting flush against the old fixed -40dB
    // gate's idea of where the word began. On several takes the onset was
    // audibly climbing for 375-525ms BELOW -40dB before it crossed: "maybe
    // tomorrow" (-40dB at 1115ms, audible from 740ms), "that is very kind of
    // you" (2525 vs 2000ms), "is there somewhere I can sit" (1870 vs 1380ms).
    // All of that is the front of the word, and this step threw it away.
    //
    // Lowering the gate is not the fix — tried, measured, rejected. At -60dB the
    // same takes stop on a click or a chair three seconds early and keep every
    // bit of the dead air after it: one 2.4s read came out 10.9s long. A single
    // level cannot tell an onset attached to a word from a noise that isn't.
    //
    // So the level DETECTS the read (detectReadBounds, above) and the cut is
    // made TRIM_MARGIN_SEC outside it at both ends. The margin covers the onset
    // climbing under the detector and leaves a real beat of the recordist's own
    // room in front, which is what makes a clip sound whole rather than
    // snatched. Tom's rule for this surface is to record around the signal and
    // leave every boundary to this step; the raw original is archived before
    // this runs (recording-upload-helpers.cjs), so keeping too much is
    // reversible and keeping too little is not.
    //
    // A take with no read in it at all — muted mic, empty room, a stray click —
    // yields no bounds and is cut to nothing, so the MIN_TAKE_MS guard in the
    // upload handler still refuses it (the 2026-08-06 Welsh silent-clip bug).
    //
    // The filter is atrim, NOT silenceremove. silenceremove's start_duration
    // once destroyed 100ms off each end of every human take and butchered 107
    // cym_n clips before anyone heard it (T-20, docs/audio-forensics-2026-08-14/).
    // Do not reintroduce either parameter here: the boundary is decided from a
    // measurement, in code that can be read, not from a filter's own idea of
    // where speech begins.
    //
    // THE MARGIN IS ASKED FOR, NOT GUARANTEED, and the difference is the whole
    // of the 2026-08-23 Aran finding. `from` clamps at 0 and `to` clamps at the
    // end of the input, so a raw take whose speaker started or stopped over
    // their own voice gets whatever room it had — which may be none. Nothing
    // here can invent the missing audio, and padding the gap with synthesised
    // silence would only make an amputated word LOOK unclipped to every
    // downstream check. So the ACHIEVED margin is measured and reported below
    // (trimLeadMarginSec / trimTailMarginSec) and the boundary gate on the
    // upload path (services/recording-speech-gate.cjs, checkTakeBoundaries)
    // refuses the take, which is the only honest repair: read it again.
    let trimBounds = null;
    let keptWhole = false;
    let achievedLeadSec = null;
    let achievedTailSec = null;
    if (trimSilence) {
      try {
        trimBounds = await detectReadBounds(inputPath);
      } catch (err) {
        console.warn(`[AudioProcessor] read detection failed (${err.message}) — take kept whole`);
      }
      if (trimBounds) {
        const from = Math.max(0, trimBounds.startSec - TRIM_MARGIN_SEC);
        const to = Math.min(trimBounds.durationSec, trimBounds.endSec + TRIM_MARGIN_SEC);
        achievedLeadSec = +(trimBounds.startSec - from).toFixed(3);
        achievedTailSec = +(to - trimBounds.endSec).toFixed(3);
        if (achievedLeadSec < TRIM_MARGIN_SEC || achievedTailSec < TRIM_MARGIN_SEC) {
          console.warn(`[AudioProcessor] take had less room than asked for — lead ${achievedLeadSec}s tail ${achievedTailSec}s against a ${TRIM_MARGIN_SEC}s margin; the capture, not the trim, is what is short`);
        }
        filters.push(`atrim=start=${from.toFixed(3)}:end=${to.toFixed(3)}`, 'asetpts=PTS-STARTPTS');
      } else if (inputAudible) {
        // THE DETECTOR MAY NOT DESTROY A TAKE IT MERELY FAILED TO UNDERSTAND.
        //
        // "No read found" and "no audio present" are different findings, and
        // cutting to nothing states the second on the evidence of the first. On
        // 2026-08-22 that cost seventeen consecutive takes: every one arrived
        // carrying audible signal and every one came back "no audible speech".
        //
        // Where the file demonstrably has audio in it, the take is kept WHOLE
        // instead. That is the trade this step already commits to three
        // paragraphs up — the raw original is archived before this runs, so
        // keeping too much is reversible and keeping too little is not — and an
        // untrimmed take is exactly what the catch above already falls back to.
        console.warn(`[AudioProcessor] no read detected in an audible take (peak ${input.peakDb}dB) — kept whole rather than cut to nothing`);
        keptWhole = true;
      } else {
        // Nothing in this file is a read, and nothing in it is audible either.
        // Cut it to nothing and let the upload handler refuse the take rather
        // than storing an unplayable stub.
        filters.push('atrim=start=0:end=0.001', 'asetpts=PTS-STARTPTS');
      }
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
        // What arrived, so no caller has to infer it from what left.
        inputPeakDb: input ? input.peakDb : null,
        inputMeanDb: input ? input.meanDb : null,
        inputAudible,
        keptWhole,
        filters: {
          trimSilence: trimSilence && !keptWhole,
          // The gate this take was actually cut at, and the room left in front
          // of it. Recorded so a clipped-sounding clip can be diagnosed from
          // the row rather than re-measured from the audio.
          // Where the read was found and how much room was left outside it.
          // Recorded so a clip that sounds clipped can be diagnosed from the
          // row rather than re-measured from the audio.
          trimReadStartSec: trimBounds ? trimBounds.startSec : null,
          trimReadEndSec: trimBounds ? trimBounds.endSec : null,
          trimMarginSec: trimSilence ? TRIM_MARGIN_SEC : null,
          // What was actually left outside the read, which is what the margin
          // above asked for only when the raw capture had that much to give.
          trimLeadMarginSec: achievedLeadSec,
          trimTailMarginSec: achievedTailSec,
          trimFoundRead: trimSilence ? trimBounds !== null : null,
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
  // repairTailDefect and verifyTrimKeepsText are DELETED, not renamed — see the
  // block above detectTailClick. A stale caller must fail loudly on an undefined
  // function, never silently fall back to something that looks like it worked.
  flagTailDefect,
  // A-133 end-of-speech tail. The one sanctioned trim, render-time only, fails
  // open on every guard — read the block above trimToEndOfSpeech before reusing.
  trimToEndOfSpeech,
  endOfSpeech,
  endOfSpeechWithArtefacts,
  // Exported so a validation tool measures with the CHAIN'S detector rather
  // than a second copy of it that can agree with itself while the chain differs.
  eosEnvelope,
  eosEvents,
  EOS_DECAY_MS,
  EOS_BODY_MS,
  EOS_MAX_ARTEFACT_MS,
  EOS_MIN_CLEAR_MS,
  EOS_ARTEFACT_GUARD_MS,
  checkSoxInstalled,
  getAudioDuration,
  checkMp3Format,
  timeStretchAudio,
  normalizeAudio,
  normalizeAudioClean,
  // Closed-loop variant (Tom 2026-08-24, "volume similarity"): measures its own
  // OUTPUT and corrects the gain, because the true-peak limiter eats 0.5-2.5 dB
  // of a single pass and eats more the quieter the voice is. planNextPass is
  // exported because it is the pure decision and it is where this breaks.
  normalizeAudioConverging,
  planNextPass,
  processAudio,
  processBatch,
  concatenateAudio,
  getAudioMetadata,
  processRecordingBuffer
};
