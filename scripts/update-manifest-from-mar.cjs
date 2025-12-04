#!/usr/bin/env node
/**
 * Update manifest with UUIDs and durations from MAR
 *
 * This populates the manifest samples with IDs and durations
 * from the Master Audio Repository.
 */

const fs = require('fs-extra');

const MANIFEST_PATH = 'public/vfs/courses/cmn_for_eng/course_manifest.json';
const MAR_PATH = 'temp/audio-index.json';

async function main() {
  console.log('=== Updating Manifest from MAR ===\n');

  const manifest = await fs.readJson(MANIFEST_PATH);
  const mar = await fs.readJson(MAR_PATH);

  let updatedIds = 0;
  let updatedDurations = 0;
  let notInMar = 0;

  for (const slice of manifest.slices) {
    for (const [text, samples] of Object.entries(slice.samples)) {
      for (const sample of samples) {
        const { role, cadence } = sample;
        // Default language same as generation
        const language = sample.language || (role === 'source' || role === 'presentation' ? 'eng' : 'cmn');
        const marKey = `${language}|${text}|${role}|${cadence}`;

        const marEntry = mar.samples[marKey];

        if (marEntry) {
          // Update ID
          if (marEntry.uuid && sample.id !== marEntry.uuid) {
            sample.id = marEntry.uuid;
            updatedIds++;
          }

          // Update duration
          if (marEntry.duration > 0 && sample.duration !== marEntry.duration) {
            sample.duration = marEntry.duration;
            updatedDurations++;
          }
        } else {
          notInMar++;
        }
      }
    }
  }

  // Save manifest
  await fs.writeJson(MANIFEST_PATH, manifest, { spaces: 2 });

  console.log(`Updated IDs: ${updatedIds}`);
  console.log(`Updated durations: ${updatedDurations}`);
  console.log(`Not in MAR: ${notInMar}`);
  console.log('\n✓ Manifest saved');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
