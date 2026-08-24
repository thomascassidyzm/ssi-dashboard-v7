#!/usr/bin/env node
/**
 * Import Course Welcomes to Supabase
 *
 * Reads welcomes.json and inserts records into course_audio table.
 * Welcomes are course-specific audio played at course start.
 *
 * Usage:
 *   node database/import-welcomes.cjs <path-to-welcomes.json>
 *
 * Example:
 *   node database/import-welcomes.cjs ~/Downloads/welcomes-for-tom/welcomes.json
 */

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { tryCanonicalVoiceId } = require('../services/shared/clip-identity.cjs');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

/**
 * Normalize text for consistent matching
 */
function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Import welcomes from JSON file
 */
async function importWelcomes(welcomesPath) {
  console.log('\n=== Import Course Welcomes ===\n');

  // Read welcomes file
  if (!await fs.pathExists(welcomesPath)) {
    console.error(`Error: File not found: ${welcomesPath}`);
    process.exit(1);
  }

  const welcomesData = await fs.readJson(welcomesPath);
  const welcomes = welcomesData.welcomes;

  // Filter out metadata keys
  const courseCodes = Object.keys(welcomes).filter(
    key => !key.startsWith('_')
  );

  console.log(`Found ${courseCodes.length} welcomes to import\n`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const courseCode of courseCodes) {
    const welcome = welcomes[courseCode];

    if (!welcome.id || !welcome.text) {
      console.log(`⚠ Skipping ${courseCode}: missing id or text`);
      skipped++;
      continue;
    }

    // The welcomes JSON carries the voice as whatever the recording session
    // wrote — sometimes already canonical ('elevenlabs_FVdz…'), sometimes a
    // bare provider name with no voice in it at all. Only a canonicalisable
    // value is imported; the rest are named and skipped, because a welcome
    // filed under an unresolvable voice is a row no reader can match.
    const voiceId = tryCanonicalVoiceId(welcome.voice);
    if (!voiceId) {
      console.log(`⚠ Skipping ${courseCode}: voice ${JSON.stringify(welcome.voice)} is not a canonicalisable voice id`);
      skipped++;
      continue;
    }

    const s3Key = `mastered/${welcome.id}.mp3`;
    const durationMs = welcome.duration ? Math.round(welcome.duration * 1000) : null;

    console.log(`Processing ${courseCode}...`);
    console.log(`  UUID: ${welcome.id}`);
    console.log(`  Voice: ${welcome.voice}`);
    console.log(`  Duration: ${welcome.duration}s (${durationMs}ms)`);
    console.log(`  S3 Key: ${s3Key}`);

    try {
      // Check if welcome already exists for this course
      const { data: existing, error: checkError } = await supabase
        .from('course_audio')
        .select('id')
        .eq('course_code', courseCode)
        .eq('role', 'welcome')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        console.log(`  → Already exists, updating...`);

        const { error: updateError } = await supabase
          .from('course_audio')
          .update({
            text: welcome.text,
            text_normalized: normalizeText(welcome.text),
            voice_id: voiceId,
            s3_key: s3Key,
            duration_ms: durationMs
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
        console.log(`  ✓ Updated\n`);
      } else {
        // Insert new welcome
        const { error: insertError } = await supabase
          .from('course_audio')
          .insert({
            course_code: courseCode,
            text: welcome.text,
            text_normalized: normalizeText(welcome.text),
            language: 'eng', // Welcomes are in English (known language)
            role: 'welcome',
            voice_id: voiceId,
            origin: 'human', // These are human recordings
            s3_key: s3Key,
            duration_ms: durationMs
          });

        if (insertError) throw insertError;
        console.log(`  ✓ Inserted\n`);
      }

      inserted++;
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}\n`);
      errors++;
    }
  }

  console.log('=== Summary ===');
  console.log(`Processed: ${inserted}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

  if (errors > 0) {
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node database/import-welcomes.cjs <path-to-welcomes.json>');
  console.log('');
  console.log('Example:');
  console.log('  node database/import-welcomes.cjs ~/Downloads/welcomes-for-tom/welcomes.json');
  process.exit(1);
}

const welcomesPath = path.resolve(args[0]);
importWelcomes(welcomesPath).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
