const { createClient } = require('@supabase/supabase-js');
const http = require('http');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function fetchVocab(seed) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3471/api/vocab/deu_for_eng?seed=${seed}`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

(async () => {
  // Get all phrases for seeds 51-300
  let allPhrases = [];
  let offset = 0;
  while (true) {
    const { data } = await sb.from('course_practice_phrases')
      .select('id, seed_number, lego_index, phrase_role, target_text')
      .eq('course_code', 'deu_for_eng')
      .gte('seed_number', 51)
      .in('phrase_role', ['build', 'use'])
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allPhrases.push(...data);
    offset += data.length;
    if (data.length < 1000) break;
  }
  
  console.log(`Total BUILD/USE phrases (S51+): ${allPhrases.length}`);
  
  // Get unique seeds
  const seeds = [...new Set(allPhrases.map(p => p.seed_number))].sort((a,b) => a - b);
  
  // Fetch vocab for all seeds
  const vocabBySeed = {};
  for (const s of seeds) {
    const v = await fetchVocab(s);
    const words = (v.vocab || '').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
    vocabBySeed[s] = new Set(words);
  }
  
  // Find phrases with vocab violations
  const toDelete = [];
  for (const p of allPhrases) {
    const vocab = vocabBySeed[p.seed_number];
    if (!vocab) continue;
    const words = p.target_text.toLowerCase().replace(/[.,!?;:'"()]/g, '').split(/\s+/).filter(Boolean);
    const unknowns = words.filter(w => !vocab.has(w));
    if (unknowns.length > 0) {
      toDelete.push({ id: p.id, seed: p.seed_number, lego: p.lego_index, role: p.phrase_role, unknowns });
    }
  }
  
  console.log(`Phrases with vocab violations: ${toDelete.length}`);
  
  // Delete them
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 50) {
    const batch = toDelete.slice(i, i + 50);
    const ids = batch.map(p => p.id);
    const { error } = await sb.from('course_practice_phrases')
      .delete()
      .in('id', ids);
    if (error) console.log('Delete error:', error.message);
    else deleted += batch.length;
  }
  
  console.log(`Deleted: ${deleted} phrases`);
  
  // Now check which LEGOs fall below minimums
  let remaining = [];
  offset = 0;
  while (true) {
    const { data } = await sb.from('course_practice_phrases')
      .select('seed_number, lego_index, phrase_role')
      .eq('course_code', 'deu_for_eng')
      .gte('seed_number', 51)
      .in('phrase_role', ['build', 'use'])
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    remaining.push(...data);
    offset += data.length;
    if (data.length < 1000) break;
  }
  
  // Count per LEGO
  const counts = {};
  for (const p of remaining) {
    const key = p.seed_number + '-' + p.lego_index;
    if (!counts[key]) counts[key] = { build: 0, use: 0 };
    counts[key][p.phrase_role === 'build' ? 'build' : 'use']++;
  }
  
  // Find shortfalls
  let shortfalls = 0;
  const needMore = [];
  for (const [key, c] of Object.entries(counts)) {
    if (c.build < 3 || c.use < 8) {
      shortfalls++;
      needMore.push({ key, build: c.build, use: c.use });
    }
  }
  
  console.log(`\nAfter cleanup:`);
  console.log(`Remaining BUILD/USE: ${remaining.length}`);
  console.log(`LEGOs below minimums: ${shortfalls}`);
  if (shortfalls > 0 && shortfalls <= 30) {
    for (const n of needMore) {
      console.log(`  ${n.key}: BUILD=${n.build} USE=${n.use}`);
    }
  }
})();
