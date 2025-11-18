const fs = require('fs');
const files = fs.readdirSync('public/vfs/courses/spa_for_eng/phase5_outputs').filter(f => f.startsWith('seed_s'));

let wrongCount = 0;
let total = 0;

console.log('Checking basket quality...\n');

files.slice(0, 20).forEach(file => {
  const data = JSON.parse(fs.readFileSync('public/vfs/courses/spa_for_eng/phase5_outputs/' + file));

  Object.keys(data.legos || {}).forEach(legoId => {
    const lego = data.legos[legoId];
    total++;
    if (lego.practice_phrases.length !== 10) {
      wrongCount++;
      console.log(`❌ ${legoId}: ${lego.practice_phrases.length} phrases (expected 10)`);
    }
  });
});

console.log(`\n📊 Summary: ${wrongCount}/${total} LEGOs have wrong phrase count (${Math.round(wrongCount/total*100)}% error rate)`);
