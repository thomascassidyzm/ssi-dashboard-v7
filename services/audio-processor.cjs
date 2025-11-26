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

        // Normalize with volume adjustment to target dBFS
        // Using loudnorm for initial normalization, then adjusting to target dBFS
        await execAsync(
          `ffmpeg -y -i "${audioPaths[i]}" ` +
          `-filter:a "loudnorm=I=-16:LRA=11:TP=-1.5" ` +
          `-q:a 2 "${normalizedPath}"`
        );

        console.log(`    [CONCAT DEBUG]   Normalized to: ${normalizedPath}`);
        normalizedPaths.push(normalizedPath);
      }
    } else {
      normalizedPaths.push(...audioPaths);
    }

    // Step 2: Create silence segment if pause is needed
    let silencePath = null;
    if (pauseDuration > 0) {
      silencePath = path.join(tempDir, 'silence.mp3');
      const pauseDurationSec = pauseDuration / 1000;
      await execAsync(
        `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t ${pauseDurationSec} ` +
        `-q:a 2 "${silencePath}"`
      );
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

    // Use concat demuxer but with re-encoding instead of -c copy
    // This matches pydub's behavior: load -> process -> export
    await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -ar 44100 -ac 2 -b:a 192k "${tempOutput}"`
    );

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

module.exports = {
  checkFfmpegInstalled,
  checkSoxInstalled,
  getAudioDuration,
  timeStretchAudio,
  normalizeAudio,
  processAudio,
  processBatch,
  concatenateAudio,
  getAudioMetadata
};
