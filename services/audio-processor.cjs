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

const { exec } = require('child_process');
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
    // Use ffmpeg atempo filter for time stretching
    // atempo has range limits (0.5-2.0), so we may need to chain multiple filters
    const atempoFilters = buildAtempoFilterChain(factor);

    await execAsync(
      `ffmpeg -y -i "${inputPath}" -filter:a "${atempoFilters}" -q:a 2 "${outputPath}"`
    );
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
async function normalizeAudio(inputPath, outputPath, targetLUFS = -16.0) {
  try {
    // Use ffmpeg loudnorm filter for EBU R128 loudness normalization
    await execAsync(
      `ffmpeg -y -i "${inputPath}" -filter:a "loudnorm=I=${targetLUFS}:LRA=11:TP=-1.5" -q:a 2 "${outputPath}"`
    );
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

  // Ensure ffmpeg is installed
  if (!(await checkFfmpegInstalled())) {
    throw new Error('ffmpeg is not installed. Please install ffmpeg to process audio.');
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

module.exports = {
  checkFfmpegInstalled,
  checkSoxInstalled,
  getAudioDuration,
  timeStretchAudio,
  normalizeAudio,
  processAudio,
  processBatch,
  getAudioMetadata
};
