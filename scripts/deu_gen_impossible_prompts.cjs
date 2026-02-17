const {createClient} = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const fs = require('fs');
const http = require('http');

function fetchFullVocab() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3471/api/vocab/deu_for_eng', res => {
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
  const impossible = JSON.parse(fs.readFileSync('/tmp/deu_impossible.json', 'utf8'));
  const fullVocab = await fetchFullVocab();
  console.log('Full vocab:', fullVocab.length, 'words');
  console.log('Impossible LEGOs:', impossible.length);

  // Split into 2 batches of 7
  const batches = [];
  const BATCH_SIZE = 7;
  for (let i = 0; i < impossible.length; i += BATCH_SIZE) {
    batches.push(impossible.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    let prompt = `You are generating German BUILD and USE practice phrases for the deu_for_eng course.

## API Endpoint
POST http://localhost:3471/api/v2/phrases/deu_for_eng
Content-Type: application/json

Body: {"phrases": [{"seed_number": N, "lego_index": N, "build": [...], "use": [...]}]}

Each build phrase: {"known": "English text", "target": "German text"}
Each use phrase: {"known": "English text", "target": "German text"}

## CRITICAL RULES

1. **Containment**: Every phrase target MUST contain the LEGO target as an EXACT substring (case-insensitive)
2. **Vocab**: The API uses the FULL COURSE VOCAB (all words from all LEGOs in the entire course). You may use ANY word from the vocab list below.
3. **BUILD phrases**: Short (3-8 words), contain the LEGO target. Need 3 per LEGO.
4. **USE phrases**: Longer (8-15 words), natural German sentences. Need 8 per LEGO.
5. **No parenthetical disambiguators** in English known text

## FULL COURSE VOCAB (${fullVocab.length} words)
${fullVocab.join(', ')}

## LEGOs to fill:\n\n`;

    for (const l of batch) {
      prompt += `### Seed ${l.s}, LEGO ${l.l} (${l.t}-type)
- Known: "${l.k}"
- Target: "${l.tgt}"
- Need: 3 BUILD phrases and 8 USE phrases
- Note: LEGO target words ${l.missing_words.join(', ')} ARE in the full course vocab above

`;
    }

    prompt += `## Submit
curl -s -X POST "http://localhost:3471/api/v2/phrases/deu_for_eng" -H "Content-Type: application/json" -d '{"phrases": [...]}'

Work through ALL ${batch.length} LEGOs. Generate 3 BUILD + 8 USE for each. Submit in a single API call.
If validation fails, fix and resubmit. VERIFY every word against the vocab list above.`;

    fs.writeFileSync(`/tmp/deu_imp_${i}.txt`, prompt);
  }

  console.log(`Generated ${batches.length} prompts: /tmp/deu_imp_0.txt through /tmp/deu_imp_${batches.length-1}.txt`);
})();
