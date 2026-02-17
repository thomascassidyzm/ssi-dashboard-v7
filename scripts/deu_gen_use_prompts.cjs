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
  const fillable = JSON.parse(fs.readFileSync('/tmp/deu_fillable.json', 'utf8'));
  console.log('Fillable LEGOs:', fillable.length);

  // Create batches of ~8
  const BATCH_SIZE = 8;
  const batches = [];
  let cur = [];
  for (const l of fillable) {
    cur.push(l);
    if (cur.length >= BATCH_SIZE) { batches.push([...cur]); cur = []; }
  }
  if (cur.length > 0) batches.push(cur);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    let prompt = `You are generating German USE practice phrases for the deu_for_eng course. These LEGOs already have enough BUILD phrases - you ONLY need to generate USE phrases.

## API Endpoint
POST http://localhost:3471/api/v2/phrases/deu_for_eng
Content-Type: application/json

Body: {"phrases": [{"seed_number": N, "lego_index": N, "build": [], "use": [...]}]}

Each use phrase: {"known": "English text", "target": "German text"}

## CRITICAL RULES

1. **Containment**: Every USE phrase target MUST contain the LEGO target as an EXACT substring (case-insensitive)
2. **Vocab**: Every German word in phrase targets MUST be in the vocab list for that seed. Check EVERY word.
3. **USE phrases**: Natural German sentences, 8-15 words, contain the LEGO target. Min 8 per LEGO.
4. **No parenthetical disambiguators** in English known text
5. Submit with build: [] (empty array) since we only need USE phrases

## LEGOs:\n\n`;

    for (const l of batch) {
      const vocab = await fetchVocab(l.s);
      prompt += `### Seed ${l.s}, LEGO ${l.l} (${l.t}-type)
- Known: "${l.k}"
- Target: "${l.tgt}"
- Need: ${l.nu} more USE phrases
- Vocab: ${vocab.join(', ')}

`;
    }

    prompt += `## Submit
curl -s -X POST "http://localhost:3471/api/v2/phrases/deu_for_eng" -H "Content-Type: application/json" -d '{"phrases": [...]}'

VERIFY every word in every phrase target is in the vocab list. Fix and resubmit on failure.`;

    fs.writeFileSync(`/tmp/deu_use_${i}.txt`, prompt);
  }

  console.log(`Generated ${batches.length} prompts: /tmp/deu_use_0.txt through /tmp/deu_use_${batches.length-1}.txt`);
})();
