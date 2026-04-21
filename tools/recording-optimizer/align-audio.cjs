#!/usr/bin/env node
/**
 * Audio Alignment Tool — drop-in replacement for segment-audio.cjs
 *
 * Forced alignment of known text against recorded audio.
 * We already know what the speaker said (they read from an autocue), so this
 * is NOT a transcription problem — it's an alignment problem.
 *
 * Aligns at LEGO-chunk boundaries rather than word boundaries. Speakers pause
 * naturally between LEGOs (prosodic units), not between individual words.
 *
 * Two modes:
 *   - slow-gap  : energy-based silence detection (for recordings where the
 *                 speaker pauses between LEGO chunks). Zero ML dependencies.
 *   - natural   : aeneas forced alignment (DTW on MFCCs). For continuous speech.
 *   - auto      : try slow-gap first, fall back to natural if chunk-count mismatch.
 *
 * Output JSON is drop-in compatible with segment-audio.cjs (the `words` key
 * now holds chunks — a chunk may be a single word or a multi-word LEGO).
 *
 * Usage:
 *   node align-audio.cjs <audio_file> --chunks "I want to|learn|Welsh" --language cym
 *   node align-audio.cjs recording.mp3 --chunks "..." --mode slow-gap --output-dir ./chunks
 *   node align-audio.cjs recording.mp3 --phrase "..." --mode natural     # legacy word-level
 *
 * Requires:
 *   - ffmpeg + ffprobe (already in use elsewhere)
 *   - For --mode natural only: `pip install aeneas` (pure Python, CPU, ~30MB)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG = {
  TEMP_DIR: os.tmpdir(),
  SEGMENT_PADDING_MS: 20,      // pad extracted word clips by Nms each side
  SILENCE_DB: -35,             // ffmpeg silencedetect threshold
  SILENCE_MIN_MS: 150,         // minimum silence between words for slow-gap mode
  MIN_WORD_MS: 60,             // discard voiced regions shorter than this (clicks, breaths)
};

// ---------------------------------------------------------------------------
// Text / audio utilities
// ---------------------------------------------------------------------------

/**
 * Parse expected alignment chunks. Input is either:
 *   - a pipe-delimited string of LEGO chunks (preferred): "I want to|learn|Welsh"
 *   - a plain phrase (legacy), split on whitespace: "quiero hablar español"
 *
 * Chunks may be multi-word (LEGO-level) — internal whitespace is preserved.
 * Leading/trailing punctuation on each chunk is stripped but internal spaces are not.
 */
function parseChunks(text, { delimiter = '|' } = {}) {
  const raw = delimiter && text.includes(delimiter)
    ? text.split(delimiter)
    : text.trim().split(/\s+/);
  return raw
    .map(c => c.trim().replace(/^[¿¡"'(\[]+/, '').replace(/[?!.,;:"'\)\]]+$/, ''))
    .filter(c => c.length > 0);
}

function safeFilename(s) {
  return s
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-áéíóúàèìòùâêîôûãñçăâîşțäöüßñç]/gi, '_')
    .slice(0, 60);
}

function getAudioDurationMs(audioPath) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
    { encoding: 'utf8' }
  );
  return Math.round(parseFloat(out.trim()) * 1000);
}

function extractSegment(inputPath, outputPath, startMs, endMs, padding = CONFIG.SEGMENT_PADDING_MS) {
  const startSec = Math.max(0, (startMs - padding) / 1000);
  const durationSec = (endMs - startMs + padding * 2) / 1000;
  try {
    execSync(
      `ffmpeg -y -i "${inputPath}" -ss ${startSec} -t ${durationSec} -c:a libmp3lame -q:a 2 "${outputPath}" 2>/dev/null`,
      { stdio: 'pipe' }
    );
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// MODE 1 — SLOW GAP: silence-based alignment (no ML)
// ---------------------------------------------------------------------------

/**
 * Use ffmpeg's silencedetect filter to find silence intervals.
 * Returns array of { startMs, endMs } silence spans.
 */
function detectSilenceSpans(audioPath) {
  const result = execSync(
    `ffmpeg -i "${audioPath}" -af silencedetect=noise=${CONFIG.SILENCE_DB}dB:d=${CONFIG.SILENCE_MIN_MS / 1000} -f null - 2>&1`,
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );

  const spans = [];
  const lines = result.split('\n');
  let currentStart = null;
  for (const line of lines) {
    const startMatch = line.match(/silence_start:\s*([\d.]+)/);
    const endMatch = line.match(/silence_end:\s*([\d.]+)/);
    if (startMatch) currentStart = Math.round(parseFloat(startMatch[1]) * 1000);
    if (endMatch && currentStart !== null) {
      spans.push({ startMs: currentStart, endMs: Math.round(parseFloat(endMatch[1]) * 1000) });
      currentStart = null;
    }
  }
  return spans;
}

/**
 * Invert silence spans to get voiced regions.
 */
function voicedRegions(audioPath, silenceSpans) {
  const duration = getAudioDurationMs(audioPath);
  const voiced = [];
  let cursor = 0;
  for (const s of silenceSpans) {
    if (s.startMs > cursor) voiced.push({ startMs: cursor, endMs: s.startMs });
    cursor = s.endMs;
  }
  if (cursor < duration) voiced.push({ startMs: cursor, endMs: duration });
  return voiced.filter(r => (r.endMs - r.startMs) >= CONFIG.MIN_WORD_MS);
}

function alignSlowGap(audioPath, expectedChunks) {
  const silences = detectSilenceSpans(audioPath);
  const voiced = voicedRegions(audioPath, silences);

  if (voiced.length !== expectedChunks.length) {
    return {
      ok: false,
      reason: `chunk-count mismatch — expected ${expectedChunks.length}, detected ${voiced.length} voiced regions`,
      expectedCount: expectedChunks.length,
      detectedCount: voiced.length,
      voiced,
    };
  }

  const chunks = voiced.map((r, i) => ({
    text: expectedChunks[i],
    startMs: r.startMs,
    endMs: r.endMs,
    durationMs: r.endMs - r.startMs,
    confidence: 1.0,  // energy-based; no probabilistic confidence
    method: 'slow-gap',
  }));

  return { ok: true, chunks };
}

// ---------------------------------------------------------------------------
// MODE 2 — NATURAL: aeneas forced alignment
// ---------------------------------------------------------------------------

function alignNatural(audioPath, expectedChunks, language) {
  const textPath = path.join(CONFIG.TEMP_DIR, `aeneas_text_${Date.now()}.txt`);
  const outPath = path.join(CONFIG.TEMP_DIR, `aeneas_out_${Date.now()}.json`);

  // aeneas aligns by "fragment" (one per text line). One LEGO chunk per line.
  // Multi-word chunks are fine — aeneas is grain-agnostic.
  fs.writeFileSync(textPath, expectedChunks.join('\n') + '\n');

  const config = [
    `task_language=${language}`,
    'is_text_type=plain',
    'os_task_file_format=json',
  ].join('|');

  try {
    execSync(
      `python3 -m aeneas.tools.execute_task "${audioPath}" "${textPath}" "${config}" "${outPath}" 2>&1`,
      { stdio: 'pipe', encoding: 'utf8', timeout: 120000 }
    );
  } catch (err) {
    return {
      ok: false,
      reason: `aeneas failed — ${err.message.split('\n')[0]}. Is it installed? pip install aeneas`,
    };
  }

  if (!fs.existsSync(outPath)) {
    return { ok: false, reason: 'aeneas produced no output' };
  }

  const parsed = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  fs.unlinkSync(textPath);
  fs.unlinkSync(outPath);

  // aeneas output: { fragments: [{ id, language, begin, end, lines: [text] }] }
  const fragments = parsed.fragments || [];
  if (fragments.length !== expectedChunks.length) {
    return {
      ok: false,
      reason: `aeneas returned ${fragments.length} fragments for ${expectedChunks.length} expected chunks`,
    };
  }

  const chunks = fragments.map((f, i) => ({
    text: expectedChunks[i],
    startMs: Math.round(parseFloat(f.begin) * 1000),
    endMs: Math.round(parseFloat(f.end) * 1000),
    durationMs: Math.round((parseFloat(f.end) - parseFloat(f.begin)) * 1000),
    confidence: 1.0,  // aeneas doesn't give confidence
    method: 'aeneas',
  }));

  return { ok: true, chunks };
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function alignAudio(audioPath, options = {}) {
  const {
    chunks = null,       // preferred: "I want to|learn|Welsh"
    phrase = null,       // legacy: falls back to whitespace split
    language = 'eng',    // ISO 639-3
    mode = 'auto',
    outputDir = null,
    verbose = false,
  } = options;

  if (!chunks && !phrase) throw new Error('--chunks or --phrase required');
  if (!fs.existsSync(audioPath)) throw new Error(`Audio file not found: ${audioPath}`);

  const rawInput = chunks || phrase;
  const expectedChunks = parseChunks(rawInput);
  const durationMs = getAudioDurationMs(audioPath);

  console.log(`\n🎙️  Audio Alignment Tool`);
  console.log(`   Input:    ${path.basename(audioPath)}`);
  console.log(`   Duration: ${(durationMs / 1000).toFixed(2)}s`);
  console.log(`   Chunks:   ${expectedChunks.length} (${expectedChunks.map(c => `"${c}"`).join(' / ')})`);
  console.log(`   Mode:     ${mode}`);
  console.log(`   Language: ${language}`);
  console.log('─'.repeat(60));

  let result = null;
  let usedMode = null;

  if (mode === 'slow-gap' || mode === 'auto') {
    if (verbose) console.log('\n🔇 Trying silence-based alignment (slow-gap)...');
    const r = alignSlowGap(audioPath, expectedChunks);
    if (r.ok) {
      result = r;
      usedMode = 'slow-gap';
    } else {
      console.log(`   slow-gap failed: ${r.reason}`);
      if (mode === 'slow-gap') {
        throw new Error(`slow-gap alignment failed: ${r.reason}`);
      }
    }
  }

  if (!result && (mode === 'natural' || mode === 'auto')) {
    if (verbose) console.log('\n🎯 Running aeneas forced alignment (natural)...');
    const r = alignNatural(audioPath, expectedChunks, language);
    if (r.ok) {
      result = r;
      usedMode = 'aeneas';
    } else {
      throw new Error(`aeneas alignment failed: ${r.reason}`);
    }
  }

  console.log(`\n✅ Aligned via ${usedMode}`);

  // Extract LEGO-chunk audio segments if requested
  let extractedFiles = [];
  if (outputDir) {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    if (verbose) console.log(`\n📁 Extracting chunk segments to ${outputDir}...`);
    for (let i = 0; i < result.chunks.length; i++) {
      const c = result.chunks[i];
      const filename = `${String(i + 1).padStart(3, '0')}_${safeFilename(c.text)}.mp3`;
      const outPath = path.join(outputDir, filename);
      if (extractSegment(audioPath, outPath, c.startMs, c.endMs)) {
        extractedFiles.push({ file: filename, chunk: c.text, startMs: c.startMs, endMs: c.endMs });
      }
    }
    console.log(`   Extracted: ${extractedFiles.length}/${result.chunks.length}`);
  }

  // Build output. Keep `words` key for backward compatibility with any downstream
  // consumers of the old segment-audio.cjs format; values are chunks (which may
  // be single-word or multi-word LEGOs).
  const output = {
    inputFile: path.basename(audioPath),
    durationMs,
    language,
    method: usedMode,
    expected: expectedChunks,
    words: result.chunks.map(c => ({
      text: c.text,
      startMs: c.startMs,
      endMs: c.endMs,
      durationMs: c.durationMs,
      confidence: c.confidence,
    })),
    chunks: result.chunks.map(c => ({
      text: c.text,
      startMs: c.startMs,
      endMs: c.endMs,
      durationMs: c.durationMs,
      confidence: c.confidence,
    })),
    extractedFiles: extractedFiles.length > 0 ? extractedFiles : undefined,
  };

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESULTS');
  console.log('═'.repeat(60));
  for (const c of result.chunks) {
    const bar = '█'.repeat(Math.max(1, Math.ceil(c.durationMs / 50)));
    console.log(`  ${String(c.startMs).padStart(5)}ms - ${String(c.endMs).padStart(5)}ms  "${c.text}"  ${bar}`);
  }

  return output;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Audio Alignment Tool — forced alignment of known text against audio

Aligns at LEGO-chunk boundaries. Speakers pause naturally between LEGOs
(prosodic units), not between every word, so this gives cleaner splices.

Usage:
  node align-audio.cjs <audio_file> --chunks "chunk1|chunk2|chunk3" [options]

Options:
  --chunks "..."       Pipe-delimited LEGO chunks (preferred):
                         --chunks "I want to|learn|Welsh"
  --phrase "..."       Legacy: plain phrase, split on whitespace (word-level)
  --language <iso>     ISO 639-3 language code for natural mode [default: eng]
                       Examples: eng, spa, cym, gle, fra, deu
  --mode <mode>        slow-gap | natural | auto [default: auto]
  --output-dir <dir>   Extract per-chunk MP3 segments to this directory
  --output <file>      Write JSON results to file
  --verbose            Show progress

Examples:
  # LEGO-level (preferred) — speaker pauses between LEGO chunks
  node align-audio.cjs recording.mp3 \\
    --chunks "I want to|learn|Welsh|quickly" --language cym --mode slow-gap

  # Natural speech, LEGO-level alignment via aeneas
  node align-audio.cjs natural.mp3 \\
    --chunks "quiero|hablar|español" --language spa --mode natural

  # Legacy word-level (splits on whitespace)
  node align-audio.cjs recording.mp3 --phrase "quiero hablar español" --language spa

Setup:
  For --mode natural (or auto fallback), install aeneas:
    pip install aeneas
  ffmpeg + ffprobe must be on PATH (already used elsewhere).
`);
    process.exit(0);
  }

  const audioPath = args[0];
  const getArg = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };

  const chunks = getArg('--chunks');
  const phrase = getArg('--phrase');
  const language = getArg('--language') || 'eng';
  const mode = getArg('--mode') || 'auto';
  const outputDir = getArg('--output-dir');
  const outputFile = getArg('--output');
  const verbose = args.includes('--verbose');

  if (!chunks && !phrase) {
    console.error('❌ --chunks or --phrase is required');
    process.exit(1);
  }

  try {
    const result = await alignAudio(audioPath, { chunks, phrase, language, mode, outputDir, verbose });
    if (outputFile) {
      fs.writeFileSync(path.resolve(outputFile), JSON.stringify(result, null, 2));
      console.log(`\n💾 Written to: ${outputFile}`);
    }
    console.log('\n✨ Done!\n');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { alignAudio, alignSlowGap, alignNatural, detectSilenceSpans };
