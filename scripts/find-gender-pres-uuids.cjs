const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('public/vfs/courses/spa_for_eng/course_manifest.json', 'utf8'));

const targets = [
  'no estoy seguro',
  'estuviera casi preparado',
  'con mis amigos',
  'a su amigo',
  'estás seguro',
  'Pienso que estás',
  'ese niño'
];

const samples = manifest.slices?.[0]?.samples || {};
const found = [];

for (const slice of manifest.slices || []) {
  for (const seed of slice.seeds || []) {
    for (const item of seed.introduction_items || []) {
      if (!item.presentation) continue;
      const targetText = item.node?.target?.text || '';

      for (const t of targets) {
        if (targetText.toLowerCase() === t.toLowerCase()) {
          const sampleEntry = samples[item.presentation];
          const presSample = sampleEntry?.find(s => s.role === 'presentation');
          found.push({
            target: targetText,
            uuid: presSample?.id || 'NOT FOUND',
            presentation: item.presentation.substring(0, 100)
          });
        }
      }
    }
  }
}

console.log('=== 7 GENDER EXPLANATION PRESENTATIONS ===\n');
found.forEach((f, i) => {
  console.log((i + 1) + '. TARGET: "' + f.target + '"');
  console.log('   UUID: ' + f.uuid);
  console.log('   TEXT: "' + f.presentation + '..."');
  console.log();
});

// Output just UUIDs for download
console.log('=== UUIDs for download ===');
found.forEach(f => {
  if (f.uuid !== 'NOT FOUND') console.log(f.uuid);
});
