#!/usr/bin/env node
/**
 * Generate Demo Spliced Audio - V2 (Deterministic)
 *
 * Creates spliced audio files using KNOWN text + silence detection.
 * NO AI transcription - we already know exactly what's in each recording!
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const COURSE_CODE = 'cym_n_for_eng';
const DEMO_DIR = path.join(__dirname, '../temp/demo-splices-v2');
const S3_BUCKET = 'ssi-audio-stage';
const AWS_REGION = 'eu-west-1';

// Source phrases - WE KNOW EXACTLY WHAT'S IN THEM
const SOURCE_PHRASES = [
  {
    seed: 1,
    text: 'dw i isio siarad Cymraeg',
    words: ['dw', 'i', 'isio', 'siarad', 'Cymraeg']
  },
  {
    seed: 6,
    text: 'fedra i ddim cofio sut i siarad Cymraeg',
    words: ['fedra', 'i', 'ddim', 'cofio', 'sut', 'i', 'siarad', 'Cymraeg']
  },
  {
    seed: 11,
    text: 'ond well i mi ymarfer siarad Cymraeg rŵan',
    words: ['ond', 'well', 'i', 'mi', 'ymarfer', 'siarad', 'Cymraeg', 'rŵan']
  }
];

// Target phrases to synthesize
const TARGET_PHRASES = [
  {
    id: 'demo1',
    text: 'dw i ddim isio siarad Cymraeg rŵan',
    english: "I don't want to speak Welsh now",
    build: [
      { word: 'dw', from: 1 },
      { word: 'i', from: 1 },
      { word: 'ddim', from: 6 },
      { word: 'isio', from: 1 },
      { word: 'siarad', from: 1 },
      { word: 'Cymraeg', from: 1 },
      { word: 'rŵan', from: 11 }
    ]
  },
  {
    id: 'demo2',
    text: 'fedra i ddim siarad Cymraeg',
    english: "I can't speak Welsh",
    build: [
      { word: 'fedra', from: 6 },
      { word: 'i', from: 6 },
      { word: 'ddim', from: 6 },
      { word: 'siarad', from: 6 },
      { word: 'Cymraeg', from: 6 }
    ]
  },
  {
    id: 'demo3',
    text: 'dw i isio ymarfer siarad Cymraeg',
    english: "I want to practice speaking Welsh",
    build: [
      { word: 'dw', from: 1 },
      { word: 'i', from: 1 },
      { word: 'isio', from: 1 },
      { word: 'ymarfer', from: 11 },
      { word: 'siarad', from: 1 },
      { word: 'Cymraeg', from: 1 }
    ]
  }
];

async function getAudioUrl(text) {
  const { data } = await supabase
    .from('course_audio')
    .select('id, s3_key')
    .eq('course_code', COURSE_CODE)
    .ilike('text', text)
    .eq('role', 'target1')
    .limit(1)
    .single();

  if (!data) return null;
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${data.s3_key}`;
}

async function downloadAudio(url, outputPath) {
  console.log(`  Downloading: ${path.basename(outputPath)}`);
  execSync(`curl -s -o "${outputPath}" "${url}"`);
}

function getAudioDuration(audioPath) {
  const output = execSync(
    `ffprobe -i "${audioPath}" -show_entries format=duration -v quiet -of csv="p=0"`,
    { encoding: 'utf8' }
  );
  return parseFloat(output.trim()) * 1000; // Return in ms
}

/**
 * Detect silences in audio file using FFmpeg
 * Returns array of { start, end } for each silence period
 * Filters out leading/trailing silences
 */
function detectSilences(audioPath, silenceThreshold = -35, minSilenceDuration = 0.08) {
  try {
    const output = execSync(
      `ffmpeg -i "${audioPath}" -af "silencedetect=noise=${silenceThreshold}dB:d=${minSilenceDuration}" -f null - 2>&1`,
      { encoding: 'utf8' }
    );

    const silences = [];
    const lines = output.split('\n');

    let currentStart = null;
    for (const line of lines) {
      const startMatch = line.match(/silence_start: ([\d.]+)/);
      const endMatch = line.match(/silence_end: ([\d.]+)/);

      if (startMatch) {
        currentStart = parseFloat(startMatch[1]) * 1000; // Convert to ms
      }
      if (endMatch && currentStart !== null) {
        silences.push({
          start: currentStart,
          end: parseFloat(endMatch[1]) * 1000
        });
        currentStart = null;
      }
    }

    // Filter out leading silence (starts before 100ms) and trailing silence
    const totalDuration = getAudioDuration(audioPath);
    const filtered = silences.filter(s =>
      s.start > 100 && // Not leading
      s.end < totalDuration - 100 // Not trailing
    );

    return filtered;
  } catch (e) {
    console.log(`    Warning: Silence detection failed`);
    return [];
  }
}

/**
 * Segment audio using known words + silence detection
 * This is the key function - NO AI, just deterministic segmentation
 */
function segmentAudioDeterministic(audioPath, words) {
  const totalDuration = getAudioDuration(audioPath);
  const silences = detectSilences(audioPath);

  console.log(`    Duration: ${totalDuration.toFixed(0)}ms, Inter-word silences: ${silences.length}`);

  // We need (words.length - 1) gaps between words
  const expectedGaps = words.length - 1;

  // Calculate character weights for proportional timing
  const charWeights = words.map(w => w.length);
  const totalChars = charWeights.reduce((a, b) => a + b, 0);

  let wordBoundaries = [];

  if (silences.length >= expectedGaps) {
    // We have enough silences - use them as word boundaries
    console.log(`    Using silence detection (${silences.length} silences for ${expectedGaps} gaps)`);

    // Sort silences by position
    const sortedSilences = [...silences].sort((a, b) => a.start - b.start);

    // Calculate expected positions based on character weighting
    let expectedPositions = [];
    let cumulative = 0;
    for (let i = 0; i < words.length - 1; i++) {
      cumulative += charWeights[i];
      expectedPositions.push((cumulative / totalChars) * totalDuration);
    }

    // Find the silence closest to each expected position (greedy matching)
    const usedSilences = [];
    const usedIndices = new Set();

    for (const expectedPos of expectedPositions) {
      let bestIdx = -1;
      let bestDist = Infinity;

      for (let j = 0; j < sortedSilences.length; j++) {
        if (usedIndices.has(j)) continue;
        const silence = sortedSilences[j];
        const midpoint = (silence.start + silence.end) / 2;
        const dist = Math.abs(midpoint - expectedPos);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = j;
        }
      }

      if (bestIdx >= 0) {
        usedIndices.add(bestIdx);
        usedSilences.push(sortedSilences[bestIdx]);
      }
    }

    // Sort used silences by position
    usedSilences.sort((a, b) => a.start - b.start);

    // Build word boundaries using silence midpoints as dividers
    let lastEnd = 0;
    for (let i = 0; i < words.length; i++) {
      let wordStart = lastEnd;
      let wordEnd;

      if (i < usedSilences.length) {
        // This word ends at the midpoint of the silence
        const silenceMid = (usedSilences[i].start + usedSilences[i].end) / 2;
        wordEnd = silenceMid;
        lastEnd = silenceMid;
      } else {
        // Last word goes to the end
        wordEnd = totalDuration;
      }

      // Ensure minimum duration
      if (wordEnd - wordStart < 50) {
        wordEnd = wordStart + 100;
      }

      wordBoundaries.push({
        word: words[i],
        start: Math.max(0, wordStart),
        end: Math.min(totalDuration, wordEnd)
      });
    }
  } else {
    // Fall back to character-weighted estimation
    console.log(`    Using character-weighted estimation (only ${silences.length} silences for ${expectedGaps} gaps)`);

    let currentTime = 0;
    for (let i = 0; i < words.length; i++) {
      const wordDuration = (charWeights[i] / totalChars) * totalDuration;
      wordBoundaries.push({
        word: words[i],
        start: currentTime,
        end: currentTime + wordDuration
      });
      currentTime += wordDuration;
    }
  }

  return wordBoundaries;
}

function extractWordSegment(audioPath, startMs, endMs, outputPath) {
  // Add small padding for smoother cuts
  const padding = 15; // ms
  const startSec = Math.max(0, (startMs - padding)) / 1000;
  const endSec = (endMs + padding) / 1000;
  const duration = endSec - startSec;

  execSync(
    `ffmpeg -y -i "${audioPath}" -ss ${startSec} -t ${duration} -af "afade=t=in:st=0:d=0.01,afade=t=out:st=${duration - 0.01}:d=0.01" -c:a libmp3lame -q:a 2 "${outputPath}" 2>/dev/null`
  );
}

function crossfadeConcat(inputFiles, outputPath, crossfadeMs = 25) {
  if (inputFiles.length === 0) return;
  if (inputFiles.length === 1) {
    fs.copyFileSync(inputFiles[0], outputPath);
    return;
  }

  // Build ffmpeg filter for crossfade concatenation
  const crossfadeSec = crossfadeMs / 1000;
  let filterComplex = '';
  let lastOutput = '[0:a]';

  for (let i = 1; i < inputFiles.length; i++) {
    const nextInput = `[${i}:a]`;
    const outputLabel = i === inputFiles.length - 1 ? '[out]' : `[a${i}]`;
    filterComplex += `${lastOutput}${nextInput}acrossfade=d=${crossfadeSec}:c1=tri:c2=tri${outputLabel}`;
    if (i < inputFiles.length - 1) filterComplex += ';';
    lastOutput = outputLabel;
  }

  const inputs = inputFiles.map(f => `-i "${f}"`).join(' ');
  execSync(
    `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[out]" -c:a libmp3lame -q:a 2 "${outputPath}" 2>/dev/null`
  );
}

async function main() {
  console.log('═'.repeat(60));
  console.log('LEGO AUDIO SYNTHESIS - V2 (Deterministic)');
  console.log('Using known text + silence detection - NO AI!');
  console.log('═'.repeat(60));

  // Setup directories
  await fs.ensureDir(path.join(DEMO_DIR, 'sources'));
  await fs.ensureDir(path.join(DEMO_DIR, 'segments'));
  await fs.ensureDir(path.join(DEMO_DIR, 'output'));

  // Step 1: Download source audio
  console.log('\n📥 STEP 1: Downloading source phrase audio...\n');

  const sourceAudio = {};
  for (const source of SOURCE_PHRASES) {
    const url = await getAudioUrl(source.text);
    if (url) {
      const filePath = path.join(DEMO_DIR, 'sources', `seed_${source.seed}.mp3`);
      await downloadAudio(url, filePath);
      sourceAudio[source.seed] = { path: filePath, words: source.words };
      console.log(`  ✓ Seed ${source.seed}: "${source.text}"`);
    } else {
      console.log(`  ✗ Seed ${source.seed}: Audio not found`);
    }
  }

  // Step 2: Segment using deterministic approach
  console.log('\n✂️  STEP 2: Segmenting audio (deterministic)...\n');

  const wordSegments = {}; // { seedNum: { word: { start, end, path } } }

  for (const source of SOURCE_PHRASES) {
    if (!sourceAudio[source.seed]) continue;

    console.log(`  Processing Seed ${source.seed}...`);
    const boundaries = segmentAudioDeterministic(
      sourceAudio[source.seed].path,
      source.words
    );

    wordSegments[source.seed] = {};

    for (const boundary of boundaries) {
      const key = boundary.word.toLowerCase();
      const outputPath = path.join(DEMO_DIR, 'segments', `${source.seed}_${key}.mp3`);

      extractWordSegment(
        sourceAudio[source.seed].path,
        boundary.start,
        boundary.end,
        outputPath
      );

      wordSegments[source.seed][key] = {
        start: boundary.start,
        end: boundary.end,
        path: outputPath
      };

      console.log(`    ${boundary.word}: ${boundary.start.toFixed(0)}-${boundary.end.toFixed(0)}ms`);
    }
  }

  // Step 3: Splice target phrases
  console.log('\n🧬 STEP 3: Splicing target phrases...\n');

  for (const target of TARGET_PHRASES) {
    console.log(`  Building: "${target.text}"`);
    console.log(`    English: "${target.english}"`);

    const wordFiles = [];
    let allFound = true;

    for (const { word, from } of target.build) {
      const key = word.toLowerCase();
      if (wordSegments[from] && wordSegments[from][key]) {
        wordFiles.push(wordSegments[from][key].path);
        console.log(`      ✓ "${word}" from Seed ${from}`);
      } else {
        console.log(`      ✗ "${word}" NOT FOUND in Seed ${from}`);
        allFound = false;
      }
    }

    if (allFound && wordFiles.length > 0) {
      const outputPath = path.join(DEMO_DIR, 'output', `${target.id}.mp3`);
      crossfadeConcat(wordFiles, outputPath, 25);

      const duration = getAudioDuration(outputPath);
      console.log(`    → Saved: ${target.id}.mp3 (${duration.toFixed(0)}ms)`);
    } else {
      console.log(`    → SKIPPED (missing words)`);
    }
  }

  // Step 4: Summary
  console.log('\n' + '═'.repeat(60));
  console.log('COMPLETE');
  console.log('═'.repeat(60));

  console.log(`\nOutput files in: ${path.join(DEMO_DIR, 'output')}`);
  const outputFiles = await fs.readdir(path.join(DEMO_DIR, 'output'));
  for (const file of outputFiles) {
    const filePath = path.join(DEMO_DIR, 'output', file);
    const stats = await fs.stat(filePath);
    const duration = getAudioDuration(filePath);
    console.log(`  ${file} (${Math.round(stats.size / 1024)}KB, ${duration.toFixed(0)}ms)`);
  }

  console.log('\n💡 To upload to S3:');
  console.log(`   aws s3 cp ${path.join(DEMO_DIR, 'output')}/ s3://ssi-audio-stage/demo-splices/ --recursive`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
