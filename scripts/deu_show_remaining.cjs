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
          const words = j.vocab ? j.vocab.split(',').map(w => w.trim()).filter(Boolean) : [];
          resolve(words);
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

(async () => {
  const need = JSON.parse(fs.readFileSync('/tmp/deu_need_phrases.json', 'utf8'));

  // Show each LEGO with its vocab
  for (const n of need.slice(0, 15)) {
    const vocab = await fetchVocab(n.s);
    console.log(`\nS${n.s} L${n.l} (${n.t}): "${n.k}" → "${n.tgt}"`);
    console.log(`  Have: ${n.hb}B/${n.hu}U | Need: ${n.nb}B/${n.nu}U`);
    console.log(`  Vocab (${vocab.length} words): ${vocab.join(', ')}`);

    // Check if LEGO target words are in vocab
    const tgtWords = n.tgt.toLowerCase().replace(/[.,!?;:'"()]/g, '').split(/\s+/).filter(Boolean);
    const missing = tgtWords.filter(w => !vocab.map(v => v.toLowerCase()).includes(w));
    if (missing.length > 0) {
      console.log(`  ⚠️ LEGO TARGET WORDS NOT IN VOCAB: ${missing.join(', ')}`);
    }
  }
})();
