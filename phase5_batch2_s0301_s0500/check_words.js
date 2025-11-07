import fs from 'fs';

const registry = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/registry/lego_registry_s0001_s0500.json', 'utf8'));

function getWhitelistUpTo(seedNum) {
  const whitelist = [];
  for (const legoId in registry.legos) {
    const legoSeedNum = parseInt(legoId.substring(1, 5));
    if (legoSeedNum <= seedNum) {
      const lego = registry.legos[legoId];
      if (lego.spanish_words) {
        lego.spanish_words.forEach(w => {
          const word = w.toLowerCase();
          if (!whitelist.includes(word)) {
            whitelist.push(word);
          }
        });
      }
    }
  }
  return whitelist.sort();
}

const seedNum = parseInt(process.argv[2] || '481');
const whitelist = getWhitelistUpTo(seedNum);

if (process.argv[3]) {
  // Check specific words
  const words = process.argv.slice(3);
  console.log(`Checking words for S${seedNum.toString().padStart(4, '0')}:\n`);
  words.forEach(word => {
    const clean = word.toLowerCase();
    const available = whitelist.includes(clean);
    console.log(`  ${word}: ${available ? '✅' : '❌'}`);
  });
} else {
  console.log(`Total words available by S${seedNum.toString().padStart(4, '0')}: ${whitelist.length}`);
  console.log('\nRecent 50 words:');
  console.log(whitelist.slice(-50).join(', '));
}
