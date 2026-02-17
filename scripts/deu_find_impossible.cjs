const {createClient} = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const fs = require('fs');
const http = require('http');

function fetchVocab(seed) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3471/api/vocab/deu_for_eng?seed=${seed}`, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          const words = j.vocab ? j.vocab.split(',').map(w => w.trim().toLowerCase()).filter(Boolean) : [];
          resolve(words);
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

(async () => {
  const need = JSON.parse(fs.readFileSync('/tmp/deu_need_phrases.json', 'utf8'));

  const impossible = [];
  const fillable = [];

  for (const n of need) {
    const vocab = await fetchVocab(n.s);
    const vocabSet = new Set(vocab);

    // Check if LEGO target words are in vocab
    // Strip punctuation and split
    const tgtWords = n.tgt.toLowerCase().replace(/[.,!?;:'"()]/g, '').split(/\s+/).filter(Boolean);
    const missing = tgtWords.filter(w => !vocabSet.has(w));

    if (missing.length > 0) {
      impossible.push({...n, missing_words: missing, vocab_size: vocab.length});
    } else {
      fillable.push({...n, vocab_size: vocab.length});
    }
  }

  console.log('=== IMPOSSIBLE LEGOs (target words not in vocab) ===');
  console.log('Count:', impossible.length);
  for (const i of impossible) {
    console.log(`  S${i.s} L${i.l}: "${i.k}" → "${i.tgt}" | Missing: ${i.missing_words.join(', ')} | Need: ${i.nb}B/${i.nu}U`);
  }

  console.log('\n=== FILLABLE LEGOs (all target words in vocab) ===');
  console.log('Count:', fillable.length);
  for (const f of fillable) {
    console.log(`  S${f.s} L${f.l}: "${f.k}" → "${f.tgt}" | Need: ${f.nb}B/${f.nu}U`);
  }

  fs.writeFileSync('/tmp/deu_impossible.json', JSON.stringify(impossible, null, 2));
  fs.writeFileSync('/tmp/deu_fillable.json', JSON.stringify(fillable, null, 2));
})();
