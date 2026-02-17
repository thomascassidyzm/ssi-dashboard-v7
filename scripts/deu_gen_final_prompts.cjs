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
  // Refresh the need list
  const buildPhrases = [];
  const usePhrases = [];

  for (let offset = 0; ; offset += 1000) {
    const {data, error} = await sb.from('course_practice_phrases')
      .select('seed_number, lego_index, phrase_role')
      .eq('course_code', 'deu_for_eng')
      .gte('seed_number', 51)
      .eq('phrase_role', 'build')
      .range(offset, offset + 999);
    if (error) break;
    buildPhrases.push(...data);
    if (data.length < 1000) break;
  }
  for (let offset = 0; ; offset += 1000) {
    const {data, error} = await sb.from('course_practice_phrases')
      .select('seed_number, lego_index, phrase_role')
      .eq('course_code', 'deu_for_eng')
      .gte('seed_number', 51)
      .eq('phrase_role', 'use')
      .range(offset, offset + 999);
    if (error) break;
    usePhrases.push(...data);
    if (data.length < 1000) break;
  }

  const {data: legos} = await sb.from('course_legos')
    .select('seed_number, lego_index, type, known_text, target_text, is_new')
    .eq('course_code', 'deu_for_eng')
    .gte('seed_number', 51)
    .eq('is_new', true)
    .order('seed_number');

  const counts = {};
  for (const p of [...buildPhrases, ...usePhrases]) {
    const key = p.seed_number + ':' + p.lego_index;
    if (!counts[key]) counts[key] = {build: 0, use: 0};
    counts[key][p.phrase_role]++;
  }

  const need = [];
  for (const l of legos) {
    const key = l.seed_number + ':' + l.lego_index;
    const c = counts[key] || {build: 0, use: 0};
    const nb = Math.max(0, 3 - c.build);
    const nu = Math.max(0, 8 - c.use);
    if (nb > 0 || nu > 0) {
      need.push({s: l.seed_number, l: l.lego_index, t: l.type, k: l.known_text, tgt: l.target_text, hb: c.build, hu: c.use, nb, nu});
    }
  }

  console.log('LEGOs still needing phrases:', need.length);

  const fullVocab = await fetchFullVocab();
  console.log('Full vocab:', fullVocab.length, 'words');

  // Create batches of 7
  const BATCH_SIZE = 7;
  const batches = [];
  for (let i = 0; i < need.length; i += BATCH_SIZE) {
    batches.push(need.slice(i, i + BATCH_SIZE));
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

1. **Containment**: Every phrase target MUST contain the LEGO target as an EXACT substring (case-insensitive).
   Example: LEGO target "sie wollte" → phrase "ich weiß, dass sie wollte" ✓
   Example: LEGO target "sie wollte" → phrase "sie wollten" ✗ (wollten ≠ wollte)

2. **Vocab**: The API validates against the FULL COURSE VOCAB. You may use ANY word from this list:
${fullVocab.join(', ')}

3. **BUILD phrases**: Short (3-8 words), must contain the LEGO target as substring. Need at least 3 per LEGO.
4. **USE phrases**: Longer (8-15+ words), natural German sentences. Must contain LEGO target as substring. Need at least 8 per LEGO.
5. **No parenthetical disambiguators** in English
6. Pass build: [] if the LEGO already has enough BUILD phrases (have >= 3)

## LEGOs:\n\n`;

    for (const l of batch) {
      prompt += `### Seed ${l.s}, LEGO ${l.l} (${l.t}-type)
- Known: "${l.k}"
- Target: "${l.tgt}"
- Have: ${l.hb} build, ${l.hu} use
- Need: ${l.nb} more build, ${l.nu} more use

`;
    }

    prompt += `## Submit
curl -s -X POST "http://localhost:3471/api/v2/phrases/deu_for_eng" -H "Content-Type: application/json" -d '{"phrases": [...]}'

IMPORTANT: Work through ALL ${batch.length} LEGOs. Do not stop after the first few. If any fail, fix and resubmit only the failed ones.`;

    fs.writeFileSync(`/tmp/deu_final_${i}.txt`, prompt);
  }

  console.log(`Generated ${batches.length} prompts: /tmp/deu_final_0.txt through /tmp/deu_final_${batches.length-1}.txt`);
  for (let i = 0; i < batches.length; i++) {
    const b = batches[i];
    const seedRange = [...new Set(b.map(x => x.s))];
    console.log(`Batch ${i}: ${b.length} LEGOs, seeds ${seedRange[0]}-${seedRange[seedRange.length-1]}`);
  }
})();
