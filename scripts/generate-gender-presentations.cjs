#!/usr/bin/env node

/**
 * Generate Gender Explanation Presentations
 *
 * Generates the 6 presentations with new gender explanation text.
 */

require('dotenv').config();

const fs = require('fs-extra');
const path = require('path');

const presentationService = require('../services/presentation-service.cjs');
const s3Service = require('../services/s3-service.cjs');
const uuidService = require('../services/uuid-service.cjs');

const TEMP_DIR = path.join(__dirname, '../temp');
const MANIFEST_PATH = 'public/vfs/courses/spa_for_eng/course_manifest.json';

// The 6 presentations with gender explanations
const presentations = [
  {
    name: 'no estoy seguro',
    text: "The Spanish for 'I'm not sure', as in 'I'm not sure if I can remember the whole sentence.', is: ... 'no estoy seguro' ... 'no estoy seguro' - In Spanish, men and women say some words slightly differently when referring to themselves. If you listen closely, you will hear the female voice saying it one way, and the male voice saying it another way."
  },
  {
    name: 'estuviera casi preparado',
    text: "The Spanish for 'I were nearly ready', as in 'I like feeling as if I'm nearly ready to go.', is: ... 'estuviera casi preparado' ... 'estuviera casi preparado' - Here we have another one of those words that change based on gender. Since the speakers are referring to themselves, you'll heard them pronounce the end of the word slightly differently from each other. Don't worry about this as it'll come naturally to you, but do listen out for it from now on."
  },
  {
    name: 'con mis amigos',
    text: "The Spanish for 'with my friends', as in 'I enjoy doing interesting things with my friends.', is: ... 'con mis amigos' ... 'con mis amigos' - In Spanish, similarly to when referring to yourself, some words can change slightly based on who you're referring to. When referring to male friends or a mixed group of friends, you'll hear it with an 'o' at the end, and when referring to female friends you'll hear 'a' at the end. Both speakers could use either one based on who they're talking about, but to get you used to hearing both, we'll have the female voice refer to female friends and the male voice refer to male friends."
  },
  {
    name: 'a su amigo',
    text: "The Spanish for 'to his friend', as in 'He wanted to write a letter to his friend last week.', is: ... 'a su amigo' ... 'a su amigo' - just like with the plural, the female voice will usually refer to a female friend and a male voice will refer to a male friend. Listen out for the difference, but don't worry about it!"
  },
  {
    name: 'estás seguro',
    text: "The Spanish for 'are you sure', as in 'Are you sure you don't mind helping me?', is: ... 'estás seguro' ... 'estás seguro' - You might have noticed this is one of those words that change based on gender. When you're referring to someone else, the word will change based on their gender rather than yours. Like with when we talked about friends, we'll have the female voice speak as if she's talking to a female friend, and the male voice speak as if he's talking to a male friend, just to give you practice hearing both variations. You can say whichever pops into your head first."
  },
  {
    name: 'Pienso que estás',
    text: "The Spanish for 'I think that you're', as in 'I think that you're doing very well.', is: ... 'Pienso que estás' ... 'Pienso que estás' - Since you'll be referring to someone else, listen out for any words where you hear the gender difference!"
  }
];

async function main() {
  console.log('\n=== GENERATING 6 GENDER EXPLANATION PRESENTATIONS ===\n');

  // Load manifest for voice assignments
  const manifest = await fs.readJson(MANIFEST_PATH);

  // Voice assignments
  const voiceAssignments = {
    presentation: 'elevenlabs_FOIN928B9X0jwgJ95cLt',
    target1: 'azure_es-ES-TrianaNeural',
    target2: 'azure_es-ES-AlvaroNeural'
  };

  console.log('Voice assignments:', JSON.stringify(voiceAssignments, null, 2));
  console.log();

  // Build samples with correct UUIDs
  const samples = presentations.map(p => {
    const uuid = uuidService.generateSampleUUID(p.text, 'eng', 'presentation', 'natural', voiceAssignments.presentation);
    return {
      name: p.name,
      text: p.text,
      uuid: uuid,
      voiceId: voiceAssignments.presentation,
      role: 'presentation',
      cadence: 'natural',
      language: 'eng'
    };
  });

  console.log('Presentations to generate:');
  samples.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}: ${s.uuid}`);
  });
  console.log();

  // Setup directories
  const outputDir = path.join(TEMP_DIR, 'spa_for_eng', 'gender_presentations');
  await fs.ensureDir(outputDir);

  // Extract unique segments
  console.log('Extracting unique narration segments...');
  const { uniqueSegments, segmentMap } = presentationService.extractAllUniqueSegments(samples);
  console.log(`  Unique segments: ${uniqueSegments.size}`);
  console.log();

  // Generate segment cache
  console.log('Generating/loading segment cache...');
  const segmentCacheDir = path.join(TEMP_DIR, 'audio', 'segment_cache');
  const segmentCache = await presentationService.generateSegmentBatch(
    uniqueSegments,
    voiceAssignments.presentation,
    segmentCacheDir,
    { sourceLanguage: 'eng' }
  );
  console.log(`  Segment cache ready with ${segmentCache.size} entries\n`);

  // Generate presentations
  console.log('=== GENERATING PRESENTATIONS ===\n');

  const results = {
    success: 0,
    failed: 0,
    generated: []
  };

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    console.log(`[${i + 1}/${samples.length}] Generating: "${sample.name}"`);

    try {
      const result = await presentationService.generatePresentationAudio(
        sample,
        manifest,
        voiceAssignments,
        {
          courseCode: 'spa_for_eng',
          bucket: s3Service.STAGE_BUCKET,
          sourceLanguage: 'eng',
          targetLanguage: 'spa',
          segmentCache,
          outputDir
        }
      );

      if (result.success) {
        console.log(`  ✓ Generated: ${result.uuid}`);
        results.success++;
        results.generated.push({ name: sample.name, uuid: result.uuid, path: result.outputPath });
      } else {
        console.error(`  ✗ Failed: ${result.error}`);
        results.failed++;
      }
    } catch (error) {
      console.error(`  ✗ Exception: ${error.message}`);
      results.failed++;
    }
  }

  console.log(`\nGeneration complete: ${results.success}/${samples.length}`);

  // Upload to S3
  if (results.success > 0) {
    console.log('\n=== UPLOADING TO S3 ===\n');

    for (const gen of results.generated) {
      try {
        // Find the generated file
        const filePath = path.join(outputDir, `${gen.uuid}.mp3`);
        if (await fs.pathExists(filePath)) {
          await s3Service.uploadAudioFile(gen.uuid, filePath);
          console.log(`  ✓ Uploaded: ${gen.name} (${gen.uuid})`);
        } else {
          console.error(`  ✗ File not found: ${filePath}`);
        }
      } catch (error) {
        console.error(`  ✗ Upload failed: ${gen.name} - ${error.message}`);
      }
    }
  }

  // Copy to temp/gender-presentations for easy access
  console.log('\n=== COPYING FOR REVIEW ===');
  const reviewDir = path.join(TEMP_DIR, 'gender-presentations');
  await fs.ensureDir(reviewDir);

  for (let i = 0; i < results.generated.length; i++) {
    const gen = results.generated[i];
    const srcPath = path.join(outputDir, `${gen.uuid}.mp3`);
    const destPath = path.join(reviewDir, `0${i + 1}-${gen.name.replace(/\s+/g, '-')}.mp3`);
    if (await fs.pathExists(srcPath)) {
      await fs.copy(srcPath, destPath);
      console.log(`  Copied: ${destPath}`);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`  Generated: ${results.success}`);
  console.log(`  Failed: ${results.failed}`);
  console.log(`  Review files: temp/gender-presentations/`);
  console.log();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
