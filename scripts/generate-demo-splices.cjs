#!/usr/bin/env node
/**
 * Generate Demo Spliced Audio
 *
 * Creates spliced audio files for the LEGO Audio Synthesis demo.
 * Downloads source phrases, segments with Whisper, splices LEGOs together.
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
const DEMO_DIR = path.join(__dirname, '../temp/demo-splices');
const S3_BUCKET = 'ssi-audio-stage';
const AWS_REGION = 'eu-west-1';

// Source phrases we'll extract LEGOs from
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

// Target phrases to synthesize (built from the source LEGOs)
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

function segmentWithWhisper(audioPath, outputDir) {
  const baseName = path.basename(audioPath, '.mp3');
  const wavPath = path.join(outputDir, `${baseName}.wav`);

  // Convert to WAV for Whisper
  execSync(`ffmpeg -y -i "${audioPath}" -ar 16000 -ac 1 "${wavPath}" 2>/dev/null`);

  // Run Whisper with word-level timestamps
  const whisperModel = '/usr/local/share/whisper-models/ggml-base.bin';
  const whisperOutput = path.join(outputDir, baseName);

  try {
    execSync(`whisper-cpp -m "${whisperModel}" -f "${wavPath}" -ml 1 -ojf -of "${whisperOutput}" 2>/dev/null`);
  } catch (e) {
    console.log(`  Warning: Whisper segmentation failed, using fallback`);
    return null;
  }

  // Read the JSON output
  const jsonPath = `${whisperOutput}.json`;
  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return data;
  }
  return null;
}

function extractWordSegment(audioPath, startMs, endMs, outputPath) {
  const startSec = startMs / 1000;
  const duration = (endMs - startMs) / 1000;
  execSync(`ffmpeg -y -i "${audioPath}" -ss ${startSec} -t ${duration} -c:a libmp3lame -q:a 2 "${outputPath}" 2>/dev/null`);
}

function crossfadeConcat(inputFiles, outputPath, crossfadeMs = 20) {
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
  execSync(`ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[out]" -c:a libmp3lame -q:a 2 "${outputPath}" 2>/dev/null`);
}

async function main() {
  console.log('═'.repeat(60));
  console.log('LEGO AUDIO SYNTHESIS - Demo Generator');
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
      sourceAudio[source.seed] = filePath;
      console.log(`  ✓ Seed ${source.seed}: ${source.text}`);
    } else {
      console.log(`  ✗ Seed ${source.seed}: Audio not found`);
    }
  }

  // Step 2: Segment with Whisper
  console.log('\n🎯 STEP 2: Segmenting audio with Whisper...\n');

  const wordSegments = {}; // { seedNum: { word: { start, end } } }

  for (const source of SOURCE_PHRASES) {
    if (!sourceAudio[source.seed]) continue;

    console.log(`  Processing Seed ${source.seed}...`);
    const whisperData = segmentWithWhisper(sourceAudio[source.seed], path.join(DEMO_DIR, 'segments'));

    if (whisperData && whisperData.transcription) {
      wordSegments[source.seed] = {};

      // Extract word timings from Whisper output
      for (const segment of whisperData.transcription) {
        if (segment.tokens) {
          for (const token of segment.tokens) {
            const word = token.text.trim().toLowerCase();
            if (word && token.offsets) {
              wordSegments[source.seed][word] = {
                start: token.offsets.from,
                end: token.offsets.to
              };
            }
          }
        }
      }
      console.log(`    Found ${Object.keys(wordSegments[source.seed]).length} word segments`);
    } else {
      // Fallback: estimate word boundaries based on equal division
      console.log(`    Using estimated word boundaries (fallback)`);
      wordSegments[source.seed] = {};

      // Get audio duration
      const durationOutput = execSync(`ffprobe -i "${sourceAudio[source.seed]}" -show_entries format=duration -v quiet -of csv="p=0"`, { encoding: 'utf8' });
      const totalMs = parseFloat(durationOutput.trim()) * 1000;
      const wordCount = source.words.length;
      const msPerWord = totalMs / wordCount;

      source.words.forEach((word, idx) => {
        wordSegments[source.seed][word.toLowerCase()] = {
          start: Math.round(idx * msPerWord),
          end: Math.round((idx + 1) * msPerWord)
        };
      });
    }
  }

  // Step 3: Extract individual word segments
  console.log('\n✂️  STEP 3: Extracting word segments...\n');

  const extractedWords = {}; // { 'seedNum_word': filePath }

  for (const [seedNum, words] of Object.entries(wordSegments)) {
    for (const [word, timing] of Object.entries(words)) {
      const key = `${seedNum}_${word}`;
      const outputPath = path.join(DEMO_DIR, 'segments', `${key}.mp3`);

      extractWordSegment(
        sourceAudio[seedNum],
        timing.start,
        timing.end,
        outputPath
      );
      extractedWords[key] = outputPath;
    }
  }
  console.log(`  Extracted ${Object.keys(extractedWords).length} word segments`);

  // Step 4: Splice target phrases
  console.log('\n🧬 STEP 4: Splicing target phrases...\n');

  for (const target of TARGET_PHRASES) {
    console.log(`  Building: "${target.text}"`);
    console.log(`    English: "${target.english}"`);

    const wordFiles = [];
    let allFound = true;

    for (const { word, from } of target.build) {
      const key = `${from}_${word.toLowerCase()}`;
      if (extractedWords[key]) {
        wordFiles.push(extractedWords[key]);
        console.log(`      ✓ "${word}" from Seed ${from}`);
      } else {
        console.log(`      ✗ "${word}" NOT FOUND in Seed ${from}`);
        allFound = false;
      }
    }

    if (allFound && wordFiles.length > 0) {
      const outputPath = path.join(DEMO_DIR, 'output', `${target.id}.mp3`);
      crossfadeConcat(wordFiles, outputPath, 30);
      console.log(`    → Saved: ${outputPath}`);
    } else {
      console.log(`    → SKIPPED (missing words)`);
    }
  }

  // Step 5: Summary
  console.log('\n' + '═'.repeat(60));
  console.log('COMPLETE');
  console.log('═'.repeat(60));

  console.log(`\nOutput files in: ${path.join(DEMO_DIR, 'output')}`);
  const outputFiles = await fs.readdir(path.join(DEMO_DIR, 'output'));
  for (const file of outputFiles) {
    const stats = await fs.stat(path.join(DEMO_DIR, 'output', file));
    console.log(`  ${file} (${Math.round(stats.size / 1024)}KB)`);
  }

  console.log('\nThese files can be uploaded to S3 or served directly for the demo.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
