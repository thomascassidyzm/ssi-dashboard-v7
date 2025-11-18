const fs = require('fs');
const files = fs.readdirSync('public/vfs/courses/spa_for_eng/phase5_outputs')
  .filter(f => f.startsWith('seed_s'))
  .filter(f => {
    const num = parseInt(f.match(/s(\d+)/)[1]);
    return num > 20;
  })
  .sort();

let issues = 0;
let total = 0;

console.log('Checking baskets for seeds after S0020...\n');

files.slice(0, 30).forEach(file => {
  const data = JSON.parse(fs.readFileSync('public/vfs/courses/spa_for_eng/phase5_outputs/' + file));

  Object.keys(data.legos || {}).forEach(legoId => {
    const lego = data.legos[legoId];
    total++;
    if (lego.practice_phrases.length !== 10) {
      issues++;
      console.log(`❌ ${legoId}: ${lego.practice_phrases.length} phrases (expected 10)`);
    }
  });
});

console.log(`\nAfter S0020: ${issues}/${total} LEGOs with wrong count (${Math.round(issues/total*100)}% error rate)`);
