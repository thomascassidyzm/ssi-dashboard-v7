#!/usr/bin/env node
/**
 * Import Course Audio to v12 Schema
 *
 * Parses a course JSON manifest and imports audio data into:
 * - texts (unique text strings per language)
 * - audio_files (renderings with UUID from JSON for S3 match)
 * - course_audio (links course to audio with role)
 * - courses.welcome (course welcome audio UUID)
 *
 * Prerequisites:
 * - voices table must have entries for course voices
 * - Course structure already imported (seeds, legos, phrases)
 *
 * Usage:
 *   node database/import-welsh-audio-v12.cjs <json-path> [--dry-run]
 *   node database/import-welsh-audio-v12.cjs ~/Downloads/course.json --dry-run
 *   node database/import-welsh-audio-v12.cjs ~/Downloads/course.json
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 2-letter to 3-letter ISO language code mapping
const LANG_MAP = {
  en: 'eng', es: 'spa', cy: 'cym', it: 'ita', fr: 'fra',
  de: 'deu', pt: 'por', zh: 'zho', ja: 'jpn', ko: 'kor',
  ar: 'ara', nl: 'nld', ru: 'rus', pl: 'pol'
};

// Course code aliases → canonical codes (from naming-conventions-v1.apml)
const COURSE_ALIASES = {
  'en-cy-north': 'cym_n_for_eng',
  'en-cy-south': 'cym_s_for_eng',
  'en-es': 'spa_for_eng',
  'cmn_for_eng': 'zho_for_eng'
};

const S3_BUCKET = 'ssi-audio-stage';

// Parse args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const JSON_PATH = args.find(a => !a.startsWith('--'));

if (!JSON_PATH) {
  console.error('Usage: node import-welsh-audio-v12.cjs <json-path> [--dry-run]');
  console.error('Example: node import-welsh-audio-v12.cjs ~/Downloads/course.json');
  process.exit(1);
}

async function main() {
  // Load JSON first to get course info
  console.log('Loading JSON...');
  const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

  // Extract course info from JSON
  // Resolve alias to canonical code (e.g., 'en-cy-north' → 'cym_n_for_eng')
  const JSON_COURSE_ID = jsonData.id;
  const COURSE_CODE = COURSE_ALIASES[JSON_COURSE_ID] || JSON_COURSE_ID;
  const LANG_KNOWN = LANG_MAP[jsonData.known] || jsonData.known;
  const LANG_TARGET = LANG_MAP[jsonData.target] || jsonData.target;

  // Build voice config from course code
  // Note: Legacy JSON uses 'source' but we use 'known' as the canonical term
  const VOICE_CONFIG = {
    source: `human_${COURSE_CODE}_known`,  // 'source' in JSON maps to 'known' voice
    target1: `human_${COURSE_CODE}_target1`,
    target2: `human_${COURSE_CODE}_target2`,
    presentation: `human_${COURSE_CODE}_presentation`
  };

  console.log('='.repeat(60));
  console.log('Course Audio Import (v12 Schema)');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE IMPORT'}`);
  console.log(`JSON: ${JSON_PATH}`);
  console.log(`Course JSON ID: ${JSON_COURSE_ID}`);
  console.log(`Course code (canonical): ${COURSE_CODE}`);
  console.log(`Languages: ${LANG_KNOWN} → ${LANG_TARGET}`);
  console.log('');

  const slice = jsonData.slices[0];
  const samples = slice.samples;

  console.log(`Course ID in JSON: ${jsonData.id}`);
  console.log(`Known lang: ${jsonData.known}, Target lang: ${jsonData.target}`);
  console.log('');

  // Analyze samples
  const stats = {
    uniqueTexts: new Set(),
    textsByLang: { [LANG_KNOWN]: new Set(), [LANG_TARGET]: new Set() },
    samplesByRole: { source: 0, target1: 0, target2: 0, presentation: 0 },
    totalSamples: 0
  };

  const textsToInsert = [];  // { content, language }
  const audioToInsert = [];  // { uuid, text, language, role, duration_ms, cadence }

  for (const [text, sampleList] of Object.entries(samples)) {
    stats.uniqueTexts.add(text);

    for (const sample of sampleList) {
      const role = sample.role;
      const language = role === 'source' ? LANG_KNOWN : LANG_TARGET;

      stats.samplesByRole[role] = (stats.samplesByRole[role] || 0) + 1;
      stats.totalSamples++;
      stats.textsByLang[language].add(text);

      audioToInsert.push({
        uuid: sample.id,
        text: text,
        language: language,
        role: role,
        duration_ms: Math.round(sample.duration * 1000),
        cadence: sample.cadence || 'natural'
      });
    }
  }

  // Build texts list (deduplicated by content+language)
  const textMap = new Map();  // "content|language" -> { content, language }
  for (const audio of audioToInsert) {
    const key = `${audio.text}|${audio.language}`;
    if (!textMap.has(key)) {
      textMap.set(key, { content: audio.text, language: audio.language });
    }
  }

  console.log('Analysis:');
  console.log(`  Unique text strings: ${stats.uniqueTexts.size}`);
  console.log(`  Texts in ${LANG_KNOWN}: ${stats.textsByLang[LANG_KNOWN].size}`);
  console.log(`  Texts in ${LANG_TARGET}: ${stats.textsByLang[LANG_TARGET].size}`);
  console.log(`  Total unique (content, language) pairs: ${textMap.size}`);
  console.log('');
  console.log('  Audio samples by role:');
  for (const [role, count] of Object.entries(stats.samplesByRole)) {
    console.log(`    ${role}: ${count}`);
  }
  console.log(`  Total audio samples: ${stats.totalSamples}`);
  console.log('');

  // Course welcome audio
  const welcomeAudio = jsonData.introduction;
  console.log('Course welcome:');
  console.log(`  UUID: ${welcomeAudio.id}`);
  console.log(`  Duration: ${welcomeAudio.duration}s`);
  console.log('');

  if (DRY_RUN) {
    console.log('DRY RUN - No database changes made.');
    console.log('');
    console.log('Would insert:');
    console.log(`  ${textMap.size} rows into texts`);
    console.log(`  ${audioToInsert.length} rows into audio_files`);
    console.log(`  ${audioToInsert.length} rows into course_audio`);

    // Show sample data
    console.log('');
    console.log('Sample texts (first 5):');
    let i = 0;
    for (const [key, value] of textMap) {
      if (i++ >= 5) break;
      console.log(`  [${value.language}] "${value.content.substring(0, 50)}${value.content.length > 50 ? '...' : ''}"`);
    }

    console.log('');
    console.log('Sample audio_files (first 5):');
    for (let j = 0; j < 5 && j < audioToInsert.length; j++) {
      const a = audioToInsert[j];
      console.log(`  ${a.uuid} | ${a.role} | ${a.duration_ms}ms | "${a.text.substring(0, 30)}..."`);
    }

    return;
  }

  // Connect to Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('Connected to Supabase.');

  // Note: Using voice_id strings directly (voices table uses voice_id as text, not UUID)
  console.log('\nVoice configuration:');
  for (const [role, voiceId] of Object.entries(VOICE_CONFIG)) {
    console.log(`  ${role}: ${voiceId}`);
  }

  // Step 1: Insert texts (upsert to handle existing)
  console.log('\nStep 1: Inserting texts...');
  const textsArray = Array.from(textMap.values());

  // Insert in batches to avoid timeout
  const BATCH_SIZE = 500;
  let textsInserted = 0;

  for (let i = 0; i < textsArray.length; i += BATCH_SIZE) {
    const batch = textsArray.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('texts')
      .upsert(batch, {
        onConflict: 'content_normalized,language',
        ignoreDuplicates: true
      });

    if (error) {
      console.error('Error inserting texts:', error);
      process.exit(1);
    }

    textsInserted += batch.length;
    process.stdout.write(`\r  Inserted: ${textsInserted}/${textsArray.length}`);
  }
  console.log('\n  Done.');

  // Step 2: Look up text IDs (paginated query to avoid URL length limits)
  console.log('\nStep 2: Looking up text IDs...');
  const textIdMap = new Map();  // "content|language" -> UUID

  // Query all texts with pagination (Supabase default limit is 1000)
  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('texts')
      .select('id, content_normalized, language')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Error looking up texts:', error);
      process.exit(1);
    }

    for (const row of data) {
      const key = `${row.content_normalized}|${row.language}`;
      textIdMap.set(key, row.id);
    }

    offset += data.length;
    hasMore = data.length === PAGE_SIZE;
    process.stdout.write(`\r  Looked up: ${textIdMap.size} texts...`);
  }
  console.log(`\n  Done. Total: ${textIdMap.size} texts mapped.`);

  // Step 3: Insert audio_files (deduplicate by UUID first)
  console.log('\nStep 3: Inserting audio_files...');

  // Deduplicate audioToInsert by UUID (same audio can appear for text variants)
  const seenUuids = new Set();
  const dedupedAudio = audioToInsert.filter(a => {
    const key = a.uuid.toLowerCase();
    if (seenUuids.has(key)) return false;
    seenUuids.add(key);
    return true;
  });
  console.log(`  Deduplicated: ${audioToInsert.length} → ${dedupedAudio.length} unique UUIDs`);

  let audioInserted = 0;
  let audioSkipped = 0;

  for (let i = 0; i < dedupedAudio.length; i += BATCH_SIZE) {
    const batch = dedupedAudio.slice(i, i + BATCH_SIZE);

    const rows = batch.map(a => {
      const textKey = `${a.text.toLowerCase().trim()}|${a.language}`;
      const textId = textIdMap.get(textKey);

      if (!textId) {
        console.warn(`\nWARNING: No text_id for "${a.text.substring(0, 30)}..." [${a.language}]`);
        return null;
      }

      return {
        id: a.uuid,  // Use UUID from JSON to match S3 paths
        text_id: textId,
        voice_id: VOICE_CONFIG[a.role],  // Use voice_id string directly
        cadence: a.cadence,
        s3_bucket: S3_BUCKET,
        s3_key: `mastered/${a.uuid.toLowerCase()}.mp3`,
        duration_ms: a.duration_ms
        // Note: source field has check constraint, leaving null
      };
    }).filter(r => r !== null);

    const { error } = await supabase
      .from('audio_files')
      .upsert(rows, {
        onConflict: 'id',
        ignoreDuplicates: true
      });

    if (error) {
      console.error('Error inserting audio_files:', error);
      // Continue with next batch
      audioSkipped += rows.length;
    } else {
      audioInserted += rows.length;
    }

    process.stdout.write(`\r  Inserted: ${audioInserted}/${dedupedAudio.length}, Skipped: ${audioSkipped}`);
  }
  console.log('\n  Done.');

  // Step 4: Insert course_audio links
  console.log('\nStep 4: Inserting course_audio links...');
  let linksInserted = 0;

  for (let i = 0; i < audioToInsert.length; i += BATCH_SIZE) {
    const batch = audioToInsert.slice(i, i + BATCH_SIZE);

    const rows = batch.map((a, idx) => ({
      course_code: COURSE_CODE,
      audio_id: a.uuid,
      role: a.role === 'source' ? 'known' : a.role,  // Map 'source' to 'known'
      context: `sample_${i + idx}`,  // Generic context
      position: i + idx
    }));

    const { error } = await supabase
      .from('course_audio')
      .upsert(rows, {
        onConflict: 'course_code,audio_id,role,context',
        ignoreDuplicates: true
      });

    if (error) {
      console.error('Error inserting course_audio:', error);
    } else {
      linksInserted += rows.length;
    }

    process.stdout.write(`\r  Inserted: ${linksInserted}`);
  }
  console.log('\n  Done.');

  // Step 5: Update course with welcome audio UUID
  if (welcomeAudio?.id) {
    console.log('\nStep 5: Setting course welcome audio...');
    const { error } = await supabase
      .from('courses')
      .update({ welcome: welcomeAudio.id })
      .eq('course_code', COURSE_CODE);

    if (error) {
      console.error('Error setting welcome audio:', error);
    } else {
      console.log(`  Set welcome = ${welcomeAudio.id}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Import Complete');
  console.log('='.repeat(60));
  console.log(`  Texts: ${textsInserted}`);
  console.log(`  Audio files: ${audioInserted}`);
  console.log(`  Course links: ${linksInserted}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
