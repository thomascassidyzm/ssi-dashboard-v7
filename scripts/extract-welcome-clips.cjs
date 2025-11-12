#!/usr/bin/env node

/**
 * Extract individual welcome clips from a long audio file
 * Uses silence detection to find boundaries between clips
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const INPUT_FILE = '/Users/kaisaraceno/Downloads/cyrsia-intros.wav';
const OUTPUT_DIR = '/Users/kaisaraceno/Documents/GitHub/ssi-dashboard-v7/extracted-welcomes';
const WELCOMES_REGISTRY = '/Users/kaisaraceno/Documents/GitHub/ssi-dashboard-v7/vfs/canonical/welcomes.json';
const RECORDING_DATE = '2025-03-07T12:00:00.000Z';

// Welcome languages in order (extract Italian but don't add to registry)
const LANGUAGES = [
  { code: 'cmn', name: 'Chinese Mandarin', courseCode: 'cmn_for_eng' },
  { code: 'fin', name: 'Finnish', courseCode: 'fin_for_eng' },
  { code: 'fra', name: 'French', courseCode: 'fra_for_eng' },
  { code: 'deu', name: 'German', courseCode: 'deu_for_eng' },
  { code: 'gle', name: 'Irish', courseCode: 'gle_for_eng' },
  { code: 'ita', name: 'Italian', courseCode: 'ita_for_eng_10seeds', skipRegistry: true }, // Extract but don't add to registry
  { code: 'jpn', name: 'Japanese', courseCode: 'jpn_for_eng' },
  { code: 'spa', name: 'Spanish', courseCode: 'spa_for_eng' },
  { code: 'swe', name: 'Swedish', courseCode: 'swe_for_eng' },
  { code: 'cym', name: 'Welsh', courseCode: 'cym_for_eng' },
  { code: 'por', name: 'Portuguese', courseCode: 'por_for_eng' }
];

// Base welcome text template
const BASE_TEMPLATE = "Welcome to this unusual game that will help you to become a {LANGUAGE} speaker. Here's how it works - I teach you something in {LANGUAGE}, then I say something in English and give you a chance to say it out loud in {LANGUAGE}. Then, you listen carefully to the {LANGUAGE} speakers who will model it for you. It's important that you say something in the gaps, because that's how you learn. Even if you aren't sure, have a go at saying whatever you can, and you'll be starting to speak in {LANGUAGE} sooner than you think. The more you treat it as a game, the more playful you are with it, the more you laugh when you make mistakes, the better it will go and the faster you will learn. So, let's start playing.";

const PORTUGUESE_EXTRA = " The first voice will have a European Portuguese accent, and the second voice will have a Brazilian accent.";

function generateUUID() {
  return crypto.randomUUID().toUpperCase();
}

function getWelcomeText(language) {
  let text = BASE_TEMPLATE.replace(/{LANGUAGE}/g, language.name);

  if (language.code === 'por') {
    // Insert the extra text after "who will model it for you."
    text = text.replace(
      'who will model it for you.',
      'who will model it for you.' + PORTUGUESE_EXTRA
    );
  }

  return text;
}

function detectSilence(inputFile) {
  console.log('🔍 Detecting silence to find clip boundaries...');

  try {
    // Detect silence (longer than 1.5 seconds, below -40dB)
    const cmd = `ffmpeg -i "${inputFile}" -af silencedetect=noise=-40dB:d=1.5 -f null - 2>&1 | grep silence`;
    const output = execSync(cmd, { encoding: 'utf8' });

    // Parse silence detection output
    const silenceRanges = [];
    const lines = output.split('\n');
    let currentSilence = {};

    for (const line of lines) {
      if (line.includes('silence_start')) {
        const match = line.match(/silence_start: ([\d.]+)/);
        if (match) currentSilence.start = parseFloat(match[1]);
      }
      if (line.includes('silence_end')) {
        const match = line.match(/silence_end: ([\d.]+)/);
        if (match) {
          currentSilence.end = parseFloat(match[1]);
          currentSilence.duration = currentSilence.end - currentSilence.start;
          silenceRanges.push({ ...currentSilence });
          currentSilence = {};
        }
      }
    }

    return silenceRanges;
  } catch (error) {
    console.error('Error detecting silence:', error.message);
    return [];
  }
}

function extractClips(inputFile, silenceRanges) {
  console.log('\n✂️  Extracting clips...\n');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const clips = [];
  let clipIndex = 0;
  let startTime = 0;

  for (let i = 0; i < silenceRanges.length; i++) {
    const silence = silenceRanges[i];
    const language = LANGUAGES[clipIndex];

    if (!language) break;

    // Calculate clip boundaries with padding
    const clipStart = Math.max(0, startTime - 0.5); // 0.5s padding before
    const clipEnd = silence.start + 0.5; // 0.5s padding after
    const duration = clipEnd - clipStart;

    const outputFile = path.join(OUTPUT_DIR, `welcome_${language.code}.wav`);

    console.log(`📼 Extracting ${language.name}...`);
    console.log(`   Time: ${clipStart.toFixed(2)}s - ${clipEnd.toFixed(2)}s (${duration.toFixed(2)}s)`);

    try {
      // Extract clip with padding
      execSync(
        `ffmpeg -y -i "${inputFile}" -ss ${clipStart} -t ${duration} -c copy "${outputFile}" 2>&1`,
        { stdio: 'ignore' }
      );

      // Get actual duration of extracted clip
      const probeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputFile}"`;
      const actualDuration = parseFloat(execSync(probeCmd, { encoding: 'utf8' }).trim());

      clips.push({
        language,
        file: outputFile,
        duration: actualDuration,
        startTime: clipStart,
        endTime: clipEnd
      });

      console.log(`   ✓ Saved: ${outputFile} (${actualDuration.toFixed(3)}s)\n`);
    } catch (error) {
      console.error(`   ✗ Failed to extract ${language.name}:`, error.message);
    }

    // Move to next clip
    clipIndex++;
    startTime = silence.end;
  }

  return clips;
}

function updateWelcomesRegistry(clips) {
  console.log('📝 Updating welcomes registry...\n');

  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(WELCOMES_REGISTRY, 'utf8'));
  } catch (error) {
    console.error('Error reading registry:', error.message);
    return;
  }

  for (const clip of clips) {
    const { language, duration } = clip;

    if (language.skipRegistry) {
      console.log(`⊘ Skipped ${language.name} (already in registry)\n`);
      continue;
    }

    const welcomeText = getWelcomeText(language);
    const uuid = generateUUID();

    registry.welcomes[language.courseCode] = {
      text: welcomeText,
      id: uuid,
      generated_date: RECORDING_DATE,
      voice: 'human_cyrsia',
      duration: duration
    };

    console.log(`✓ Added ${language.name} (${language.courseCode})`);
    console.log(`  UUID: ${uuid}`);
    console.log(`  Duration: ${duration.toFixed(3)}s\n`);
  }

  fs.writeFileSync(WELCOMES_REGISTRY, JSON.stringify(registry, null, 2));
  console.log('✅ Registry updated successfully!');
}

// Main execution
console.log('🎬 Welcome Clip Extractor\n');
console.log(`Input file: ${INPUT_FILE}`);
console.log(`Output directory: ${OUTPUT_DIR}\n`);

// Check if input file exists
if (!fs.existsSync(INPUT_FILE)) {
  console.error('❌ Input file not found:', INPUT_FILE);
  process.exit(1);
}

// Detect silence
const silenceRanges = detectSilence(INPUT_FILE);
console.log(`Found ${silenceRanges.length} silence ranges\n`);

if (silenceRanges.length === 0) {
  console.error('❌ No silence detected. You may need to adjust detection parameters.');
  process.exit(1);
}

// Show detected silence ranges
console.log('Silence ranges:');
silenceRanges.forEach((s, i) => {
  console.log(`  ${i + 1}. ${s.start.toFixed(2)}s - ${s.end.toFixed(2)}s (${s.duration.toFixed(2)}s)`);
});

// Extract clips
const clips = extractClips(INPUT_FILE, silenceRanges);

console.log(`\n✅ Extracted ${clips.length} clips`);

// Update registry
updateWelcomesRegistry(clips);

console.log('\n🎉 All done!');
