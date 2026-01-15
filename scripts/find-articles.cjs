const fs = require('fs-extra');

async function findLego() {
  const legoPairs = await fs.readJson('./public/vfs/courses/ita_for_eng/lego_pairs.json');

  console.log('=== Searching for articles as LEGOs ===\n');

  const searchTerms = [
    { known: 'the', target: 'la' },
    { known: 'the', target: 'il' },
    { known: 'a', target: 'un' },
    { known: 'a', target: 'una' }
  ];

  for (const term of searchTerms) {
    console.log(`Looking for "${term.known}" / "${term.target}":`);
    let found = false;

    for (const seed of legoPairs.seeds) {
      for (const lego of seed.legos || []) {
        if (lego.known_text.toLowerCase() === term.known &&
            lego.target_text.toLowerCase() === term.target) {
          console.log(`  Found: ${lego.lego_id}`);
          found = true;
        }
      }
    }

    if (!found) {
      console.log(`  NOT FOUND as standalone LEGO`);
    }
    console.log();
  }

  // Check first 30 seeds for any article LEGOs
  console.log('=== All article-like LEGOs in first 30 seeds ===');
  for (const seed of legoPairs.seeds.slice(0, 30)) {
    for (const lego of seed.legos || []) {
      const k = lego.known_text.toLowerCase();
      const t = lego.target_text.toLowerCase();
      if (['the', 'a', 'an'].includes(k) ||
          ['il', 'la', 'lo', 'un', 'una', 'uno', 'i', 'gli', 'le'].includes(t)) {
        console.log(`  ${lego.lego_id}: "${lego.known_text}" / "${lego.target_text}"`);
      }
    }
  }
}

findLego().catch(console.error);
