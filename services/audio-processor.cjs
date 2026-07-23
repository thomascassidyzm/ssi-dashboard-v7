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

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs-extra');
const path = require('path');

const execAsync = promisify(exec);

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
 * Rule, on 2ms peak windows over the last tailMs, thresholds relative to the
 * clip's own peak: the LAST run of windows above −20dB-rel-peak is a click iff
 * it is short (≤ maxClickMs) AND separated from the audio before it by a gap
 * of ≥ minGapMs below threshold. A genuine speech ending is long and/or
 * contiguous with the phrase body, so it never matches.
 *
 * @returns {Promise<{click: boolean, trimSec?: number, peakDb?: number}>}
 *   trimSec = safe cut point (start of the pre-click gap), for repair tools.
 */
async function detectTailClick(audioPath, options = {}) {
  const { tailMs = 300, maxClickMs = 50, minGapMs = 20 } = options;
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
  const tailWins = Math.min(wins.length, Math.round(tailMs / 2));
  const first = wins.length - tailWins;

  // Last above-threshold run in the tail, and the quiet gap before it.
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
    trimSec: (gapStart * winSamples) / 48000,
    peakDb: Math.round(20 * Math.log10(clickPeak / peak) * 10) / 10
  };
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
  checkSoxInstalled,
  getAudioDuration,
  checkMp3Format,
  timeStretchAudio,
  normalizeAudio,
  processAudio,
  processBatch,
  concatenateAudio,
  getAudioMetadata,
  processRecordingBuffer
};
