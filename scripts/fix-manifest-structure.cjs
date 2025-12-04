#!/usr/bin/env node

const fs = require('fs');
const path = process.argv[2] || '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng/course_manifest.json';

console.log('Loading manifest from:', path);
const manifest = JSON.parse(fs.readFileSync(path, 'utf8'));

let sampleFixes = 0;

// Fix 1: Remove 'language' key from samples
if (manifest.slices && manifest.slices[0] && manifest.slices[0].samples) {
  const samples = manifest.slices[0].samples;
  for (const [text, variants] of Object.entries(samples)) {
    for (const sample of variants) {
      if (sample.language !== undefined) {
        delete sample.language;
        sampleFixes++;
      }
    }
  }
}
console.log('Removed language key from', sampleFixes, 'samples');

// Fix 2: Add missing encouragement arrays
for (const slice of manifest.slices || []) {
  if (!slice.orderedEncouragements) {
    slice.orderedEncouragements = [];
    console.log('Added empty orderedEncouragements');
  }
  if (!slice.pooledEncouragements) {
    slice.pooledEncouragements = [];
    console.log('Added empty pooledEncouragements');
  }
}

// Save
fs.writeFileSync(path, JSON.stringify(manifest, null, 2));
console.log('Saved manifest');
