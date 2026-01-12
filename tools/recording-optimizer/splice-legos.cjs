#!/usr/bin/env node
/**
 * LEGO Audio Splice Tool
 *
 * Concatenates extracted LEGO audio segments into new phrases with crossfade.
 *
 * Usage:
 *   node splice-legos.cjs --legos <dir> --phrase "quiero hablar" --output phrase.mp3
 *   node splice-legos.cjs --legos <dir> --phrases phrases.json --output-dir ./spliced
 *
 * Input:
 *   - Directory of extracted LEGO audio files (from segment-audio.cjs)
 *   - Phrase(s) to synthesize
 *
 * Output:
 *   - Concatenated audio with crossfade between segments
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  TEMP_DIR: os.tmpdir(),
  // Crossfade duration between segments (ms)
  CROSSFADE_MS: 20,
  // Silence to insert between words if no natural gap (ms)
  WORD_GAP_MS: 80,
  // Output audio quality
  OUTPUT_BITRATE: '192k',
  // Normalization target (LUFS)
  NORMALIZE_LUFS: -16,
};

// =============================================================================
// LEGO LIBRARY
// =============================================================================

/**
 * Load LEGO library from directory
 * Maps normalized text → file path
 */
function loadLegoLibrary(legoDir) {
  const library = new Map();

  if (!fs.existsSync(legoDir)) {
    throw new Error(`LEGO directory not found: ${legoDir}`);
  }

  const files = fs.readdirSync(legoDir).filter(f => f.endsWith('.mp3'));

  for (const file of files) {
    // Extract word from filename: "001_quiero.mp3" → "quiero"
    const match = file.match(/^\d+_(.+)\.mp3$/);
    if (match) {
      const word = match[1].replace(/_/g, ' ').toLowerCase();
      library.set(word, path.join(legoDir, file));
    }
  }

  return library;
}

/**
 * Get audio duration in seconds
 */
function getAudioDuration(audioPath) {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
      { encoding: 'utf8' }
    );
    return parseFloat(result.trim());
  } catch (err) {
    return 0;
  }
}

// =============================================================================
// SPLICE ENGINE
// =============================================================================

/**
 * Normalize text for LEGO lookup
 */
function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[.,!?;:]+/g, '')
    .trim();
}

/**
 * Find LEGO file for a word
 */
function findLego(library, word) {
  const normalized = normalize(word);

  // Direct match
  if (library.has(normalized)) {
    return library.get(normalized);
  }

  // Try without accents in library keys
  for (const [key, path] of library) {
    if (normalize(key) === normalized) {
      return path;
    }
  }

  return null;
}

/**
 * Concatenate audio files with crossfade using ffmpeg
 */
function concatenateWithCrossfade(inputFiles, outputPath, crossfadeMs = CONFIG.CROSSFADE_MS) {
  if (inputFiles.length === 0) {
    throw new Error('No input files to concatenate');
  }

  if (inputFiles.length === 1) {
    // Single file, just copy
    fs.copyFileSync(inputFiles[0], outputPath);
    return;
  }

  // Build ffmpeg filter for crossfade concatenation
  // This is complex because ffmpeg's acrossfade only works on pairs
  // We need to chain them: [0][1]acrossfade → [01][2]acrossfade → ...

  const crossfadeSec = crossfadeMs / 1000;
  let filterParts = [];
  let currentLabel = '[0]';

  for (let i = 1; i < inputFiles.length; i++) {
    const nextLabel = `[${i}]`;
    const outputLabel = i === inputFiles.length - 1 ? '[out]' : `[a${i}]`;

    filterParts.push(
      `${currentLabel}${nextLabel}acrossfade=d=${crossfadeSec}:c1=tri:c2=tri${outputLabel}`
    );

    currentLabel = outputLabel;
  }

  // Build input arguments
  const inputArgs = inputFiles.map(f => `-i "${f}"`).join(' ');
  const filterComplex = filterParts.join(';');

  const cmd = `ffmpeg -y ${inputArgs} -filter_complex "${filterComplex}" -map "[out]" -c:a libmp3lame -b:a ${CONFIG.OUTPUT_BITRATE} "${outputPath}" 2>/dev/null`;

  try {
    execSync(cmd, { stdio: 'pipe' });
  } catch (err) {
    // Fallback: simple concatenation without crossfade
    console.warn('  ⚠ Crossfade failed, using simple concatenation');
    simpleConcatenate(inputFiles, outputPath);
  }
}

/**
 * Simple concatenation without crossfade (fallback)
 */
function simpleConcatenate(inputFiles, outputPath) {
  const listFile = path.join(CONFIG.TEMP_DIR, `concat_${Date.now()}.txt`);
  const listContent = inputFiles.map(f => `file '${f}'`).join('\n');
  fs.writeFileSync(listFile, listContent);

  try {
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:a libmp3lame -b:a ${CONFIG.OUTPUT_BITRATE} "${outputPath}" 2>/dev/null`,
      { stdio: 'pipe' }
    );
  } finally {
    try { fs.unlinkSync(listFile); } catch (e) {}
  }
}

/**
 * Normalize audio to target LUFS
 */
function normalizeAudio(inputPath, outputPath) {
  try {
    execSync(
      `ffmpeg -y -i "${inputPath}" -af loudnorm=I=${CONFIG.NORMALIZE_LUFS}:LRA=11:TP=-1.5 -c:a libmp3lame -b:a ${CONFIG.OUTPUT_BITRATE} "${outputPath}" 2>/dev/null`,
      { stdio: 'pipe' }
    );
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Splice LEGOs into a phrase
 */
function splicePhrase(library, phrase, outputPath, options = {}) {
  const { verbose = false, normalize: doNormalize = true } = options;

  const words = phrase.trim().split(/\s+/);
  const legoFiles = [];
  const missing = [];

  // Find LEGO file for each word
  for (const word of words) {
    const legoPath = findLego(library, word);
    if (legoPath) {
      legoFiles.push(legoPath);
    } else {
      missing.push(word);
    }
  }

  if (missing.length > 0) {
    return {
      success: false,
      phrase,
      error: `Missing LEGOs: ${missing.join(', ')}`,
      missing,
    };
  }

  // Concatenate with crossfade
  const tempOutput = path.join(CONFIG.TEMP_DIR, `splice_${Date.now()}.mp3`);
  concatenateWithCrossfade(legoFiles, tempOutput);

  // Normalize if requested
  if (doNormalize) {
    normalizeAudio(tempOutput, outputPath);
    try { fs.unlinkSync(tempOutput); } catch (e) {}
  } else {
    fs.renameSync(tempOutput, outputPath);
  }

  const duration = getAudioDuration(outputPath);

  return {
    success: true,
    phrase,
    outputFile: outputPath,
    durationSec: duration,
    legoCount: legoFiles.length,
  };
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
LEGO Audio Splice Tool - Concatenate LEGOs into new phrases

Usage:
  node splice-legos.cjs --legos <dir> --phrase "text" --output <file>
  node splice-legos.cjs --legos <dir> --phrases <file.json> --output-dir <dir>

Options:
  --legos <dir>        Directory containing extracted LEGO audio files
  --phrase "text"      Single phrase to synthesize
  --phrases <file>     JSON file with array of phrases
  --output <file>      Output audio file (for single phrase)
  --output-dir <dir>   Output directory (for multiple phrases)
  --no-normalize       Skip loudness normalization

Examples:
  node splice-legos.cjs --legos ./legos --phrase "quiero hablar" --output quiero_hablar.mp3
  node splice-legos.cjs --legos ./legos --phrases to_generate.json --output-dir ./spliced
`);
    process.exit(0);
  }

  // Parse arguments
  const legosIdx = args.indexOf('--legos');
  const phraseIdx = args.indexOf('--phrase');
  const phrasesIdx = args.indexOf('--phrases');
  const outputIdx = args.indexOf('--output');
  const outputDirIdx = args.indexOf('--output-dir');
  const noNormalize = args.includes('--no-normalize');

  if (legosIdx === -1) {
    console.error('❌ --legos <dir> is required');
    process.exit(1);
  }

  const legoDir = args[legosIdx + 1];

  console.log(`\n🔧 LEGO Audio Splice Tool`);
  console.log('─'.repeat(50));

  // Load LEGO library
  console.log(`\n📚 Loading LEGO library from: ${legoDir}`);
  const library = loadLegoLibrary(legoDir);
  console.log(`   Found ${library.size} LEGOs`);

  if (library.size === 0) {
    console.error('❌ No LEGO files found');
    process.exit(1);
  }

  // Show available LEGOs
  console.log(`   Available: ${[...library.keys()].slice(0, 10).join(', ')}${library.size > 10 ? '...' : ''}`);

  // Single phrase mode
  if (phraseIdx !== -1) {
    const phrase = args[phraseIdx + 1];
    const output = outputIdx !== -1 ? args[outputIdx + 1] : `spliced_${Date.now()}.mp3`;

    console.log(`\n🎵 Splicing phrase: "${phrase}"`);

    const result = splicePhrase(library, phrase, output, { normalize: !noNormalize });

    if (result.success) {
      console.log(`   ✅ Created: ${result.outputFile}`);
      console.log(`   Duration: ${result.durationSec.toFixed(2)}s`);
      console.log(`   LEGOs used: ${result.legoCount}`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  }

  // Multi-phrase mode
  if (phrasesIdx !== -1) {
    const phrasesFile = args[phrasesIdx + 1];
    const outputDir = outputDirIdx !== -1 ? args[outputDirIdx + 1] : './spliced';

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const phrases = JSON.parse(fs.readFileSync(phrasesFile, 'utf8'));
    console.log(`\n🎵 Splicing ${phrases.length} phrases to: ${outputDir}`);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < phrases.length; i++) {
      const phrase = typeof phrases[i] === 'string' ? phrases[i] : phrases[i].phrase || phrases[i].target;
      const filename = `${String(i + 1).padStart(4, '0')}_${phrase.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
      const outputPath = path.join(outputDir, filename);

      const result = splicePhrase(library, phrase, outputPath, { normalize: !noNormalize });

      if (result.success) {
        success++;
        process.stdout.write(`\r   Progress: ${success + failed}/${phrases.length} (${success} OK, ${failed} failed)`);
      } else {
        failed++;
        console.log(`\n   ⚠ "${phrase}": ${result.error}`);
      }
    }

    console.log(`\n\n   ✅ Spliced: ${success}`);
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed}`);
    }
  }

  console.log('\n✨ Done!\n');
}

main();
