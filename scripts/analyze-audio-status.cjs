#!/usr/bin/env node

/**
 * Analyze audio generation status for a course
 */

const fs = require('fs');
const path = require('path');

const manifestPath = process.argv[2] || 'public/vfs/courses/cmn_for_eng/course_manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const slice = manifest.slices[0];

let stats = {
  byRole: {},
  withDuration: 0,
  withoutDuration: 0,
  totalVariants: 0
};

for (const [text, variants] of Object.entries(slice.samples || {})) {
  for (const v of variants) {
    stats.totalVariants++;

    if (!stats.byRole[v.role]) {
      stats.byRole[v.role] = { total: 0, withDuration: 0, withoutDuration: 0 };
    }

    stats.byRole[v.role].total++;

    if (v.duration && v.duration > 0) {
      stats.byRole[v.role].withDuration++;
      stats.withDuration++;
    } else {
      stats.byRole[v.role].withoutDuration++;
      stats.withoutDuration++;
    }
  }
}

console.log('=== AUDIO STATUS ANALYSIS ===\n');
console.log('Manifest:', manifestPath);
console.log('Total unique texts:', Object.keys(slice.samples || {}).length);
console.log('Total sample variants:', stats.totalVariants);
console.log('');
console.log('| Role         | Total  | Has Duration | Needs Audio |');
console.log('|--------------|--------|--------------|-------------|');

for (const [role, data] of Object.entries(stats.byRole).sort((a,b) => b[1].total - a[1].total)) {
  console.log('| ' + role.padEnd(12) + ' | ' +
    String(data.total).padStart(6) + ' | ' +
    String(data.withDuration).padStart(12) + ' | ' +
    String(data.withoutDuration).padStart(11) + ' |');
}

console.log('');
console.log('Summary:');
console.log('  Samples with duration (audio exists):', stats.withDuration);
console.log('  Samples without duration (need generation):', stats.withoutDuration);

// Check for audio files on disk
const courseDir = path.dirname(manifestPath);
const audioDir = path.join(courseDir, 'audio');
const samplesDir = path.join(courseDir, 'samples');

console.log('');
console.log('=== AUDIO FILES ON DISK ===\n');

if (fs.existsSync(audioDir)) {
  const audioFiles = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));
  console.log('audio/ directory:', audioFiles.length, 'files');
} else {
  console.log('audio/ directory: not found');
}

if (fs.existsSync(samplesDir)) {
  const subdirs = fs.readdirSync(samplesDir);
  console.log('samples/ directory:', subdirs.length, 'subdirectories');
  for (const subdir of subdirs.slice(0, 5)) {
    const subPath = path.join(samplesDir, subdir);
    if (fs.statSync(subPath).isDirectory()) {
      const files = fs.readdirSync(subPath).filter(f => f.endsWith('.mp3'));
      console.log('  ' + subdir + ':', files.length, 'files');
    }
  }
} else {
  console.log('samples/ directory: not found');
}

// Check segment cache
const segmentCache = path.join(courseDir, 'segment_cache');
if (fs.existsSync(segmentCache)) {
  const segmentFiles = fs.readdirSync(segmentCache).filter(f => f.endsWith('.mp3'));
  console.log('segment_cache/ directory:', segmentFiles.length, 'files');
} else {
  console.log('segment_cache/ directory: not found');
}

// Check MAR
const marDir = 'public/vfs/mar';
console.log('');
console.log('=== MAR (Master Audio Repository) ===\n');

if (fs.existsSync(marDir)) {
  const marFiles = fs.readdirSync(marDir).filter(f => f.endsWith('.json'));
  for (const marFile of marFiles) {
    const marData = JSON.parse(fs.readFileSync(path.join(marDir, marFile), 'utf8'));
    const sampleCount = Object.keys(marData.samples || {}).length;
    console.log(marFile + ':', sampleCount, 'samples');
  }
} else {
  console.log('MAR directory not found at', marDir);
}
