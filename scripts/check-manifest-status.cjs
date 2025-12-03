#!/usr/bin/env node
const m = require('../public/vfs/courses/cmn_for_eng/course_manifest.json');
const s = m.slices[0].samples;
let total = 0, withId = 0, noId = 0;
for (const [t, arr] of Object.entries(s)) {
  for (const samp of arr) {
    total++;
    if (samp.id && samp.id !== '') withId++;
    else noId++;
  }
}
console.log('Total samples:', total);
console.log('With ID:', withId);
console.log('No ID (need generation):', noId);
