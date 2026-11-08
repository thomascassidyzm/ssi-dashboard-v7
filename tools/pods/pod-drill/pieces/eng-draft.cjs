#!/usr/bin/env node
// For an eng_for_X course, print each turn with the shared English split (_eng-shared/split.txt) beside
// that course's whole known text, so its known side can be matched to the English pieces.
//   node tools/pods/pod-drill/pieces/eng-draft.cjs eng_for_spa
const fs = require('fs'), path = require('path');
const split = new Map();
for (const l of fs.readFileSync(path.join(require('./paths.cjs').DATA, '_eng-shared/split.txt'), 'utf8').split('\n')) if (l.trim()) split.set(l.replace(/ \|\| /g, ' '), l);
(async () => {
  const d = await (await fetch(`http://localhost:3470/api/pod-scripts/${process.argv[2]}`)).json();
  let miss = 0;
  for (const s of d.scenes) for (const l of s.lines) {
    if (l.scene_number > 10) continue;
    const e = split.get(l.target_text);
    if (!e) { miss++; console.log('NO SHARED SPLIT for: ' + l.target_text); }
    console.log(`${l.id.split(':').pop()} ${l.speaker}\n  EN: ${e || l.target_text}\n  KN: ${l.known_text}`);
  }
  if (miss) console.log(`\n${miss} turns with no shared split`);
})();
