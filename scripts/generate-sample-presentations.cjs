#!/usr/bin/env node

/**
 * Generate Sample Presentation Audio
 *
 * Creates a few sample presentation audio files to verify:
 * 1. The audio text is correct (English in "as in" clause)
 * 2. Voice tags are stripped from TTS text
 * 3. The pause before explanation sounds natural (1.8s)
 * 4. Voice switching works for Chinese target words
 */

require('dotenv').config();

const fs = require('fs-extra');
const path = require('path');
const { v5: uuidv5 } = require('uuid');
const presentationService = require('../services/presentation-service.cjs');

const COURSE = 'cmn_for_eng';
const VFS_BASE = path.join(__dirname, '../public/vfs');
const OUTPUT_DIR = path.join(__dirname, '../temp/sample-presentations');

// UUID namespace for deterministic UUIDs
const SSI_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// Sample LEGOs to generate
const TEST_LEGOS = [
  'S0001L01', // Atomic: "now" - simple case
  'S0001L02', // Molecular: "I want to" - 2 components
  'S0071L01', // Molecular: "We didn't want" - 3 components
];

async function loadCourseData() {
  const manifestPath = path.join(VFS_BASE, 'courses', COURSE, 'course_manifest.json');
  const introPath = path.join(VFS_BASE, 'courses', COURSE, 'introductions.json');
  const voicesPath = path.join(VFS_BASE, 'canonical', 'voices.json');

  const manifest = await fs.readJson(manifestPath);
  const introductions = await fs.readJson(introPath);
  const voices = await fs.readJson(voicesPath);

  return { manifest, introductions, voices };
}

function generateUUID(text) {
  return uuidv5(text, SSI_NAMESPACE).toUpperCase();
}

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log(' GENERATE SAMPLE PRESENTATION AUDIO');
  console.log(' Course: ' + COURSE);
  console.log('═'.repeat(70));

  try {
    const { manifest, introductions, voices } = await loadCourseData();

    // Check voice configuration
    console.log('\nVoice Configuration:');
    const langPair = voices.language_pair_assignments?.['en-zh'];
    if (langPair) {
      console.log(`  source (English): ${langPair.source}`);
      console.log(`  target1 (Chinese female): ${langPair.target1}`);
      console.log(`  target2 (Chinese male): ${langPair.target2}`);
      console.log(`  presentation: ${langPair.presentation}`);
    } else {
      console.error('  ERROR: en-zh voice assignment not found!');
      process.exit(1);
    }

    // Get the voice details
    const presentationVoiceId = langPair.presentation;
    const voiceDetails = voices.voices[presentationVoiceId];
    if (!voiceDetails) {
      console.error(`  ERROR: Voice "${presentationVoiceId}" not found in registry!`);
      process.exit(1);
    }

    // Create output directory
    await fs.ensureDir(OUTPUT_DIR);
    console.log(`\nOutput directory: ${OUTPUT_DIR}`);

    // Generate samples
    console.log('\n' + '-'.repeat(70));
    console.log('Generating samples...');
    console.log('-'.repeat(70));

    for (const legoId of TEST_LEGOS) {
      const presentationText = introductions.presentations?.[legoId];
      if (!presentationText) {
        console.log(`\n[${legoId}] SKIP - no presentation found`);
        continue;
      }

      console.log(`\n[${legoId}] Processing...`);
      console.log(`  Raw text: "${presentationText.substring(0, 80)}..."`);

      // Strip tags for display
      const displayText = presentationService.stripDisplayTags(presentationText);
      console.log(`  Display text: "${displayText.substring(0, 80)}..."`);

      // Create sample object for the service
      const sampleUUID = generateUUID(`${COURSE}:presentation:${legoId}`);
      const sample = {
        text: presentationText,
        uuid: sampleUUID,
        voiceId: presentationVoiceId,
        role: 'presentation',
        cadence: 'natural'
      };

      // Voice assignments
      const voiceAssignments = {
        source: langPair.source,
        target1: langPair.target1,
        target2: langPair.target2,
        presentation: langPair.presentation
      };

      try {
        // Generate the presentation audio
        console.log(`  Generating audio...`);
        const result = await presentationService.generatePresentationAudio(
          sample,
          manifest,
          voiceAssignments,
          {
            tempDir: OUTPUT_DIR
          }
        );

        if (result && result.success) {
          // Rename to descriptive name
          const outputPath = path.join(OUTPUT_DIR, `${legoId}_presentation.mp3`);
          if (await fs.pathExists(result.outputPath)) {
            await fs.move(result.outputPath, outputPath, { overwrite: true });
          }
          console.log(`  ✅ Generated: ${outputPath}`);
        } else {
          console.log(`  ⚠️ Generation failed: ${result?.error || 'unknown error'}`);
        }

      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        if (error.stack) {
          console.error(`  Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
        }
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log(' COMPLETE');
    console.log('═'.repeat(70));
    console.log(`\nSample files saved to: ${OUTPUT_DIR}`);
    console.log('Play these files to verify audio quality.\n');

  } catch (error) {
    console.error('\nError:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
