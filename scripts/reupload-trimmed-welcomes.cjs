#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Map local files to course codes
const FILE_TO_COURSE = {
  'cmn.mp3': 'zho_for_eng',
  'cym.mp3': ['cym_n_for_eng', 'cym_s_for_eng'], // shared
  'deu.mp3': 'deu_for_eng',
  'fin.mp3': 'fin_for_eng',
  'fra.mp3': 'fra_for_eng',
  'gle.mp3': 'gle_for_eng',
  'ita.mp3': 'ita_for_eng',
  'jpn.mp3': 'jpn_for_eng',
  'por.mp3': 'por_for_eng',
  'spa.mp3': 'spa_for_eng',
  'swe.mp3': 'swe_for_eng'
};

function getDuration(filePath) {
  const result = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, { encoding: 'utf8' });
  return Math.round(parseFloat(result.trim()) * 1000);
}

function uploadToS3(localPath, s3Key) {
  execSync(`aws s3 cp "${localPath}" "s3://ssi-audio-stage/${s3Key}" --content-type "audio/mpeg"`, { stdio: 'pipe' });
}

async function main() {
  const trimmedDir = './public/vfs/canonical/welcomes/mp3/trimmed';
  const files = fs.readdirSync(trimmedDir).filter(f => f.endsWith('.mp3'));

  console.log('Re-uploading', files.length, 'trimmed welcome files...\n');

  for (const file of files) {
    const courseCodes = FILE_TO_COURSE[file];
    if (!courseCodes) {
      console.log(`⚠ No mapping for ${file}`);
      continue;
    }

    const courses = Array.isArray(courseCodes) ? courseCodes : [courseCodes];
    const filePath = path.join(trimmedDir, file);
    const fileSize = fs.statSync(filePath).size;
    const durationMs = getDuration(filePath);

    for (const courseCode of courses) {
      // Get existing entry
      const { data: existing } = await supabase
        .from('course_audio')
        .select('id, s3_key')
        .eq('course_code', courseCode)
        .eq('role', 'welcome')
        .single();

      if (!existing) {
        console.log(`⚠ No welcome entry for ${courseCode}`);
        continue;
      }

      const s3Key = existing.s3_key;
      console.log(`${file} → ${courseCode}`);

      // Upload
      uploadToS3(filePath, s3Key);
      console.log('  ✓ S3 uploaded');

      // Update DB
      await supabase.from('course_audio').update({
        duration_ms: durationMs,
        file_size_bytes: fileSize
      }).eq('id', existing.id);
      console.log(`  ✓ DB updated (${(durationMs/1000).toFixed(1)}s)\n`);
    }
  }

  console.log('Done!');
}

main().catch(console.error);
