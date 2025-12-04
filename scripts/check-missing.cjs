const fs = require("fs-extra");

const manifest = fs.readJsonSync("public/vfs/courses/cmn_for_eng/course_manifest.json");
const mar = fs.readJsonSync("temp/audio-index.json");

const missing = { target1: 0, target2: 0, source: 0, presentation: 0 };

for (const slice of manifest.slices) {
  for (const [text, sampleList] of Object.entries(slice.samples)) {
    for (const sample of sampleList) {
      const { role, cadence } = sample;
      // Default language same as populate script
      const language = sample.language || (role === 'source' || role === 'presentation' ? 'eng' : 'cmn');
      const marKey = `${language}|${text}|${role}|${cadence}`;

      if (!mar.samples[marKey]) {
        missing[role] = (missing[role] || 0) + 1;
      }
    }
  }
}

console.log("Missing by role:", missing);
