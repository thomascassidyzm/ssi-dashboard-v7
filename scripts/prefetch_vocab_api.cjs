const fs = require('fs');
const http = require('http');

const remaining = JSON.parse(fs.readFileSync('/tmp/deu_remaining_legos.json', 'utf8'));
const seeds = [...new Set(remaining.map(l => l.seed_number))].sort((a, b) => a - b);

console.log(`Fetching vocab via API for ${seeds.length} seeds...`);

function fetchVocab(seed) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:3471/api/vocab/deu_for_eng?seed=${seed}`;
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ seed, vocab: result.vocab || '', size: result.vocab_size || 0 });
        } catch (e) {
          resolve({ seed, vocab: '', size: 0 });
        }
      });
    }).on('error', e => resolve({ seed, vocab: '', size: 0 }));
  });
}

(async () => {
  // Fetch in batches of 10 to avoid overwhelming the server
  const vocabMap = {};
  for (let i = 0; i < seeds.length; i += 10) {
    const batch = seeds.slice(i, i + 10);
    const results = await Promise.all(batch.map(s => fetchVocab(s)));
    for (const r of results) {
      vocabMap[r.seed] = r.vocab;
    }
    if (i % 50 === 0) process.stdout.write(`  ${i}/${seeds.length}...\n`);
  }

  // Build enriched output
  const enriched = remaining.map(l => ({
    seed_number: l.seed_number,
    lego_index: l.lego_index,
    type: l.type,
    known_text: l.known_text,
    target_text: l.target_text,
    components: l.components,
    vocab: vocabMap[l.seed_number] || ''
  }));

  fs.writeFileSync('/tmp/deu_remaining_with_vocab.json', JSON.stringify(enriched, null, 2));
  console.log(`\nDone. Written ${enriched.length} enriched LEGOs.`);
  console.log(`Sample: seed 51 vocab (first 200 chars): ${(vocabMap[51] || '').substring(0, 200)}`);
})();
