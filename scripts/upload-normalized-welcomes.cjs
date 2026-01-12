#!/usr/bin/env node
/**
 * Upload normalized welcome audio files to S3 and update database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const LANG_TO_COURSE = {
  'cmn': 'cmn_for_eng',
  'cym': 'cym_for_eng',
  'deu': 'deu_for_eng',
  'fin': 'fin_for_eng',
  'fra': 'fra_for_eng',
  'gle': 'gle_for_eng',
  'ita': 'ita_for_eng',
  'jpn': 'jpn_for_eng',
  'por': 'por_for_eng',
  'spa': 'spa_for_eng',
  'swe': 'swe_for_eng'
};

function getDuration(filePath) {
  try {
    const result = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, { encoding: 'utf8' });
    return Math.round(parseFloat(result.trim()) * 1000);
  } catch (e) {
    return 0;
  }
}

function uploadToS3(localPath, s3Key) {
  execSync(`aws s3 cp "${localPath}" "s3://ssi-audio-stage/${s3Key}" --content-type "audio/mpeg"`, { stdio: 'inherit' });
}

async function main() {
  const mp3Dir = './public/vfs/canonical/welcomes/mp3';
  const files = fs.readdirSync(mp3Dir).filter(f => f.endsWith('.mp3'));

  console.log('Uploading', files.length, 'welcome files...\n');

  for (const file of files) {
    const langCode = file.replace('.mp3', '');
    const courseCode = LANG_TO_COURSE[langCode];
    if (!courseCode) {
      console.log(`⚠ No mapping for ${langCode}, skipping`);
      continue;
    }

    const filePath = path.join(mp3Dir, file);
    const fileSize = fs.statSync(filePath).size;
    const durationMs = getDuration(filePath);

    // Check existing
    const { data: existing } = await supabase
      .from('course_audio')
      .select('id, s3_key')
      .eq('course_code', courseCode)
      .eq('role', 'welcome')
      .single();

    let s3Key, uuid;

    if (existing) {
      s3Key = existing.s3_key;
      uuid = s3Key.replace('mastered/', '').replace('.mp3', '');
      console.log(`${langCode} → ${courseCode}: UPDATE (UUID: ${uuid.substring(0,8)}...)`);
    } else {
      uuid = uuidv4().toUpperCase();
      s3Key = `mastered/${uuid}.mp3`;
      console.log(`${langCode} → ${courseCode}: NEW (UUID: ${uuid.substring(0,8)}...)`);
    }

    // Upload
    uploadToS3(filePath, s3Key);
    console.log('  ✓ S3 uploaded');

    // DB update/insert
    if (existing) {
      await supabase.from('course_audio').update({
        duration_ms: durationMs,
        file_size_bytes: fileSize
      }).eq('id', existing.id);
    } else {
      await supabase.from('course_audio').insert({
        course_code: courseCode,
        text: 'Course welcome audio',
        text_normalized: 'course welcome audio',
        language: 'eng',
        role: 'welcome',
        voice_id: 'human_recording',
        origin: 'human',
        s3_key: s3Key,
        duration_ms: durationMs,
        file_size_bytes: fileSize
      });
    }
    console.log(`  ✓ DB updated (duration: ${durationMs}ms)\n`);
  }

  console.log('All done!');
}

main().catch(console.error);
