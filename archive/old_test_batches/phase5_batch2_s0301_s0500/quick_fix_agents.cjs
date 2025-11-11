const fs = require('fs');

// Fix Agent 05 - remove phrases with caminando/hacia
console.log('Fixing Agent 05...');
const a05 = JSON.parse(fs.readFileSync('batch_output/agent_05_baskets.json', 'utf8'));
for (const sid in a05.seeds) {
  for (const lid in a05.seeds[sid].legos) {
    const lego = a05.seeds[sid].legos[lid];
    if (lego.practice_phrases) {
      lego.practice_phrases = lego.practice_phrases.filter(p => {
        const spa = p[1].toLowerCase();
        return !spa.includes('caminando') && !spa.includes('hacia') && !spa.includes('prepararnos');
      });
    }
  }
}
fs.writeFileSync('batch_output/agent_05_baskets.json', JSON.stringify(a05, null, 2));
console.log('✅ Agent 05 fixed\n');

// Fix Agent 10 - remove phrases with serios
console.log('Fixing Agent 10...');
const a10 = JSON.parse(fs.readFileSync('batch_output/agent_10_baskets.json', 'utf8'));
for (const sid in a10.seeds) {
  for (const lid in a10.seeds[sid].legos) {
    const lego = a10.seeds[sid].legos[lid];
    if (lego.practice_phrases) {
      lego.practice_phrases = lego.practice_phrases.filter(p => {
        const spa = p[1].toLowerCase();
        return !spa.includes('serios');
      });
    }
  }
}
fs.writeFileSync('batch_output/agent_10_baskets.json', JSON.stringify(a10, null, 2));
console.log('✅ Agent 10 fixed');
