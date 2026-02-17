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
  console.log('Total LEGOs needing phrases:', need.length);

  // Group by seed
  const bySeed = {};
  for (const n of need) {
    if (!bySeed[n.s]) bySeed[n.s] = [];
    bySeed[n.s].push(n);
  }

  const seeds = Object.keys(bySeed).map(Number).sort((a, b) => a - b);
  console.log('Unique seeds:', seeds.length);

  // Fetch vocab for all seeds
  const vocabs = {};
  for (const s of seeds) {
    try {
      vocabs[s] = await fetchVocab(s);
    } catch (e) {
      console.error(`Failed vocab for S${s}:`, e.message);
      vocabs[s] = [];
    }
  }

  // Create batches of ~8 LEGOs each
  const BATCH_SIZE = 8;
  const batches = [];
  let currentBatch = [];
  for (const s of seeds) {
    for (const lego of bySeed[s]) {
      currentBatch.push(lego);
      if (currentBatch.length >= BATCH_SIZE) {
        batches.push([...currentBatch]);
        currentBatch = [];
      }
    }
  }
  if (currentBatch.length > 0) batches.push(currentBatch);

  console.log('Created', batches.length, 'batches');

  // Generate prompts
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchSeeds = [...new Set(batch.map(b => b.s))];

    let prompt = `You are generating German BUILD and USE practice phrases for the deu_for_eng course.

## API Endpoint
POST http://localhost:3471/api/v2/phrases/deu_for_eng
Content-Type: application/json

Body: {"phrases": [{"seed_number": N, "lego_index": N, "build": [...], "use": [...]}]}

Each build phrase: {"known": "English text", "target": "German text"}
Each use phrase: {"known": "English text", "target": "German text"}

## CRITICAL RULES

1. **Containment**: Every phrase target MUST contain the LEGO target as an EXACT substring (case-insensitive)
   - LEGO target "brauche" → phrase target "ich brauche mehr Zeit" ✓
   - LEGO target "brauche" → phrase target "ich brauche" ✓

2. **Vocab**: Every German word in phrase targets MUST be in the vocab list for that seed
   - Check EVERY word against the vocab list
   - If a word is NOT in the vocab, do NOT use it

3. **BUILD phrases**: Short (3-8 words), contain the LEGO target. Min 3 per LEGO.
4. **USE phrases**: Longer (8-15 words), natural German sentences. Min 8 per LEGO. 10+ words preferred.
5. **No parenthetical disambiguators** in English known text
6. **No duplicate** known or target texts across phrases

## LEGOs to fill:\n\n`;

    for (const lego of batch) {
      const v = vocabs[lego.s] || [];
      prompt += `### Seed ${lego.s}, LEGO ${lego.l} (${lego.t}-type)
- Known: "${lego.k}"
- Target: "${lego.tgt}"
- Have: ${lego.hb} build, ${lego.hu} use
- Need: ${lego.nb} more build, ${lego.nu} more use
- Vocab for S${lego.s}: ${v.join(', ')}

`;
    }

    prompt += `## Instructions

For each LEGO above, generate the needed BUILD and USE phrases. Submit them all in a SINGLE API call.

Before submitting, verify EVERY phrase:
1. The German target contains the LEGO target text as an exact substring
2. Every German word in the target exists in the vocab list for that seed
3. BUILD phrases are 3-8 words, USE phrases are 8-15 words

Submit with curl:
curl -s -X POST "http://localhost:3471/api/v2/phrases/deu_for_eng" -H "Content-Type: application/json" -d '{"phrases": [...]}'

If any phrase fails validation, fix the specific issue and resubmit only the failed LEGOs.
If a word is not in vocab, find an alternative that IS in vocab or restructure the phrase.

IMPORTANT: Work through ALL LEGOs in this batch. Do not stop after the first few.`;

    fs.writeFileSync(`/tmp/deu_fill_${i}.txt`, prompt);
  }

  console.log(`Generated ${batches.length} prompts at /tmp/deu_fill_0.txt through /tmp/deu_fill_${batches.length - 1}.txt`);

  // Summary
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const seedRange = [...new Set(batch.map(b => b.s))];
    console.log(`Batch ${i}: ${batch.length} LEGOs, seeds ${seedRange[0]}-${seedRange[seedRange.length-1]}`);
  }
})();
