#!/usr/bin/env node
/**
 * Audio Segmentation Tool
 *
 * Uses whisper.cpp to segment recorded audio into extractable LEGO components.
 *
 * Input: Audio file + expected phrase text
 * Output: JSON with word-level timestamps ready for extraction
 *
 * Usage:
 *   node segment-audio.cjs <audio_file> --phrase "Quiero hablar español"
 *   node segment-audio.cjs recording.mp3 --phrases phrases.json --output segments.json
 *
 * Requires:
 *   - whisper.cpp installed (brew install whisper-cpp)
 *   - ggml model downloaded to /tmp/whisper-models/
 *   - ffmpeg for audio conversion
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  WHISPER_CLI: '/opt/homebrew/opt/whisper-cpp/bin/whisper-cli',
  MODEL_PATH: '/tmp/whisper-models/ggml-base.bin',
  TEMP_DIR: os.tmpdir(),
  // Padding to add around extracted segments (ms)
  SEGMENT_PADDING_MS: 20,
  // Minimum gap between words to consider them separate (ms)
  MIN_WORD_GAP_MS: 50,
};

// =============================================================================
// AUDIO CONVERSION
// =============================================================================

/**
 * Convert audio to 16kHz mono WAV (whisper requirement)
 */
function convertToWav(inputPath) {
  const outputPath = path.join(CONFIG.TEMP_DIR, `whisper_input_${Date.now()}.wav`);

  try {
    execSync(
      `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 "${outputPath}" 2>/dev/null`,
      { stdio: 'pipe' }
    );
    return outputPath;
  } catch (err) {
    throw new Error(`Failed to convert audio: ${err.message}`);
  }
}

/**
 * Get audio duration in milliseconds
 */
function getAudioDuration(audioPath) {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
      { encoding: 'utf8' }
    );
    return Math.round(parseFloat(result.trim()) * 1000);
  } catch (err) {
    return 0;
  }
}

// =============================================================================
// WHISPER TRANSCRIPTION
// =============================================================================

/**
 * Run whisper.cpp and get token-level timestamps
 */
function runWhisper(wavPath, language = 'auto') {
  const outputBase = path.join(CONFIG.TEMP_DIR, `whisper_out_${Date.now()}`);

  const args = [
    '-m', CONFIG.MODEL_PATH,
    '-f', wavPath,
    '-l', language,
    '--output-json-full',
    '-of', outputBase,
  ];

  try {
    execSync(`"${CONFIG.WHISPER_CLI}" ${args.join(' ')}`, {
      stdio: 'pipe',
      timeout: 120000, // 2 minute timeout
    });

    const jsonPath = `${outputBase}.json`;
    if (!fs.existsSync(jsonPath)) {
      throw new Error('Whisper did not produce JSON output');
    }

    const result = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Cleanup temp files
    try {
      fs.unlinkSync(jsonPath);
    } catch (e) {}

    return result;
  } catch (err) {
    throw new Error(`Whisper failed: ${err.message}`);
  }
}

// =============================================================================
// TOKEN PROCESSING
// =============================================================================

/**
 * Merge sub-word tokens into complete words
 * Whisper sometimes splits words: "contigo" → ["cont", "igo"]
 */
function mergeTokensIntoWords(tokens) {
  const words = [];
  let currentWord = null;

  for (const token of tokens) {
    // Skip special tokens
    if (token.text.startsWith('[') && token.text.endsWith(']')) continue;

    const text = token.text.trim();
    if (!text) continue;

    // Check if this starts a new word (has leading space in original)
    const startsNewWord = token.text.startsWith(' ');

    if (startsNewWord || !currentWord) {
      // Save previous word
      if (currentWord) {
        words.push(currentWord);
      }
      // Start new word
      currentWord = {
        text: text,
        startMs: token.offsets.from,
        endMs: token.offsets.to,
        confidence: token.p,
        tokens: [token],
      };
    } else {
      // Continue current word (merge sub-token)
      currentWord.text += text;
      currentWord.endMs = token.offsets.to;
      currentWord.confidence = Math.min(currentWord.confidence, token.p);
      currentWord.tokens.push(token);
    }
  }

  // Don't forget last word
  if (currentWord) {
    words.push(currentWord);
  }

  // Clean up punctuation
  for (const word of words) {
    word.text = word.text.replace(/[.,!?;:]+$/, '').toLowerCase();
  }

  return words.filter(w => w.text.length > 0);
}

/**
 * Extract segments from whisper output
 */
function extractSegments(whisperResult) {
  const segments = [];

  for (const transcription of whisperResult.transcription || []) {
    const tokens = transcription.tokens || [];
    const words = mergeTokensIntoWords(tokens);

    segments.push({
      fullText: transcription.text.trim(),
      startMs: transcription.offsets.from,
      endMs: transcription.offsets.to,
      words,
    });
  }

  return segments;
}

// =============================================================================
// LEGO ALIGNMENT
// =============================================================================

/**
 * Normalize text for matching
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
 * Align detected words with expected LEGOs
 */
function alignWithLegos(segments, expectedLegos) {
  const results = [];
  const allWords = segments.flatMap(s => s.words);

  // Create lookup map for expected LEGOs
  const legoMap = new Map();
  for (const lego of expectedLegos) {
    const key = normalize(lego.target || lego.text || lego);
    if (!legoMap.has(key)) {
      legoMap.set(key, []);
    }
    legoMap.get(key).push(lego);
  }

  // Try to match each word
  for (const word of allWords) {
    const normalized = normalize(word.text);
    const matched = legoMap.has(normalized);

    results.push({
      detected: word.text,
      normalized,
      startMs: word.startMs,
      endMs: word.endMs,
      durationMs: word.endMs - word.startMs,
      confidence: word.confidence,
      isLego: matched,
      legoMatch: matched ? legoMap.get(normalized)[0] : null,
    });
  }

  // Also try multi-word matches (M-type LEGOs)
  for (const [key, legos] of legoMap) {
    const keyWords = key.split(/\s+/);
    if (keyWords.length < 2) continue;

    // Slide window over detected words
    for (let i = 0; i <= allWords.length - keyWords.length; i++) {
      const slice = allWords.slice(i, i + keyWords.length);
      const sliceNormalized = slice.map(w => normalize(w.text)).join(' ');

      if (sliceNormalized === key) {
        results.push({
          detected: slice.map(w => w.text).join(' '),
          normalized: key,
          startMs: slice[0].startMs,
          endMs: slice[slice.length - 1].endMs,
          durationMs: slice[slice.length - 1].endMs - slice[0].startMs,
          confidence: Math.min(...slice.map(w => w.confidence)),
          isLego: true,
          legoMatch: legos[0],
          isMultiWord: true,
        });
      }
    }
  }

  return results;
}

// =============================================================================
// AUDIO EXTRACTION
// =============================================================================

/**
 * Extract a segment from audio file
 */
function extractSegment(inputPath, outputPath, startMs, endMs, padding = CONFIG.SEGMENT_PADDING_MS) {
  const startSec = Math.max(0, (startMs - padding) / 1000);
  const durationSec = (endMs - startMs + padding * 2) / 1000;

  try {
    execSync(
      `ffmpeg -y -i "${inputPath}" -ss ${startSec} -t ${durationSec} -c:a libmp3lame -q:a 2 "${outputPath}" 2>/dev/null`,
      { stdio: 'pipe' }
    );
    return true;
  } catch (err) {
    return false;
  }
}

// =============================================================================
// MAIN PIPELINE
// =============================================================================

async function segmentAudio(audioPath, options = {}) {
  const {
    phrase = null,        // Single expected phrase
    phrases = null,       // Array of expected phrases/LEGOs
    language = 'auto',    // Language hint for whisper
    outputDir = null,     // Directory to extract segments to
    verbose = false,
  } = options;

  console.log(`\n🎙️  Audio Segmentation Tool`);
  console.log(`   Input: ${path.basename(audioPath)}`);
  console.log('─'.repeat(50) + '\n');

  // 1. Convert to WAV
  if (verbose) console.log('📀 Converting to 16kHz WAV...');
  const wavPath = convertToWav(audioPath);
  const duration = getAudioDuration(wavPath);
  console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);

  // 2. Run Whisper
  if (verbose) console.log('\n🎤 Running Whisper transcription...');
  const whisperResult = runWhisper(wavPath, language);
  const detectedLang = whisperResult.result?.language || 'unknown';
  console.log(`   Detected language: ${detectedLang}`);

  // 3. Extract segments
  const segments = extractSegments(whisperResult);
  const allWords = segments.flatMap(s => s.words);
  console.log(`   Words detected: ${allWords.length}`);

  // 4. Build expected LEGOs list
  let expectedLegos = [];
  if (phrase) {
    expectedLegos = phrase.split(/\s+/).map(w => ({ text: w }));
  } else if (phrases) {
    expectedLegos = Array.isArray(phrases) ? phrases : [phrases];
  }

  // 5. Align with expected LEGOs (if provided)
  let aligned = null;
  if (expectedLegos.length > 0) {
    if (verbose) console.log('\n🔗 Aligning with expected LEGOs...');
    aligned = alignWithLegos(segments, expectedLegos);
    const matched = aligned.filter(a => a.isLego).length;
    console.log(`   LEGOs matched: ${matched}/${expectedLegos.length}`);
  }

  // 6. Extract segments to files (if outputDir provided)
  let extractedFiles = [];
  if (outputDir) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (verbose) console.log(`\n📁 Extracting segments to ${outputDir}...`);

    for (let i = 0; i < allWords.length; i++) {
      const word = allWords[i];
      const filename = `${String(i + 1).padStart(3, '0')}_${word.text.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
      const outputPath = path.join(outputDir, filename);

      if (extractSegment(audioPath, outputPath, word.startMs, word.endMs)) {
        extractedFiles.push({
          file: filename,
          word: word.text,
          startMs: word.startMs,
          endMs: word.endMs,
        });
      }
    }
    console.log(`   Extracted: ${extractedFiles.length} segments`);
  }

  // 7. Cleanup temp WAV
  try {
    fs.unlinkSync(wavPath);
  } catch (e) {}

  // 8. Build result
  const result = {
    inputFile: path.basename(audioPath),
    durationMs: duration,
    language: detectedLang,
    transcription: segments.map(s => s.fullText).join(' '),
    words: allWords.map(w => ({
      text: w.text,
      startMs: w.startMs,
      endMs: w.endMs,
      durationMs: w.endMs - w.startMs,
      confidence: w.confidence,
    })),
    aligned: aligned,
    extractedFiles: extractedFiles.length > 0 ? extractedFiles : undefined,
  };

  // Print summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 RESULTS');
  console.log('═'.repeat(50));
  console.log(`Transcription: "${result.transcription}"`);
  console.log(`\nWord timestamps:`);
  for (const word of result.words) {
    const bar = '█'.repeat(Math.ceil(word.durationMs / 50));
    console.log(`  ${word.startMs.toString().padStart(5)}ms - ${word.endMs.toString().padStart(5)}ms: "${word.text}" ${bar}`);
  }

  return result;
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Audio Segmentation Tool - Extract word-level timestamps using Whisper

Usage:
  node segment-audio.cjs <audio_file> [options]

Options:
  --phrase "text"      Expected phrase text (for alignment)
  --language <code>    Language hint (es, en, cy, etc.) [default: auto]
  --output-dir <dir>   Extract segments to directory
  --output <file>      Write JSON results to file
  --verbose            Show detailed progress

Examples:
  node segment-audio.cjs recording.mp3
  node segment-audio.cjs recording.mp3 --phrase "Quiero hablar español" --language es
  node segment-audio.cjs recording.mp3 --output-dir ./segments --output results.json
`);
    process.exit(0);
  }

  // Parse arguments
  const audioPath = args[0];
  const phraseIdx = args.indexOf('--phrase');
  const langIdx = args.indexOf('--language');
  const outDirIdx = args.indexOf('--output-dir');
  const outFileIdx = args.indexOf('--output');
  const verbose = args.includes('--verbose');

  const options = {
    phrase: phraseIdx !== -1 ? args[phraseIdx + 1] : null,
    language: langIdx !== -1 ? args[langIdx + 1] : 'auto',
    outputDir: outDirIdx !== -1 ? args[outDirIdx + 1] : null,
    verbose,
  };

  // Check prerequisites
  if (!fs.existsSync(CONFIG.WHISPER_CLI)) {
    console.error('❌ whisper-cpp not found. Install with: brew install whisper-cpp');
    process.exit(1);
  }
  if (!fs.existsSync(CONFIG.MODEL_PATH)) {
    console.error(`❌ Whisper model not found at ${CONFIG.MODEL_PATH}`);
    console.error('   Download from: https://huggingface.co/ggerganov/whisper.cpp');
    process.exit(1);
  }
  if (!fs.existsSync(audioPath)) {
    console.error(`❌ Audio file not found: ${audioPath}`);
    process.exit(1);
  }

  try {
    const result = await segmentAudio(audioPath, options);

    // Write output file if requested
    if (outFileIdx !== -1) {
      const outFile = args[outFileIdx + 1];
      fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
      console.log(`\n💾 Results written to: ${outFile}`);
    }

    console.log('\n✨ Done!\n');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
