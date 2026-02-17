const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const fs = require('fs');

(async () => {
  const remaining = JSON.parse(fs.readFileSync('/tmp/deu_remaining_legos.json', 'utf8'));

  // Get unique seeds
  const seeds = [...new Set(remaining.map(l => l.seed_number))].sort((a, b) => a - b);
  console.log(`Fetching vocab for ${seeds.length} seeds...`);

  // Fetch vocab for each seed via Supabase directly
  const vocabMap = {};

  for (const seed of seeds) {
    // Get all legos up to this seed for translation vocab
    const { data: legos } = await sb
      .from('course_legos')
      .select('target_text, type, components')
      .eq('course_code', 'deu_for_eng')
      .lte('seed_number', seed)
      .order('seed_number');

    if (!legos) continue;

    const words = new Set();
    for (const l of legos) {
      // Add LEGO target words
      const target = (l.target_text || '').toLowerCase();
      target.split(/[\s,]+/).forEach(w => { if (w.trim()) words.add(w.trim()); });

      // Add component words
      if (l.components && Array.isArray(l.components)) {
        for (const c of l.components) {
          const ct = (c.target || '').toLowerCase();
          ct.split(/[\s,]+/).forEach(w => { if (w.trim()) words.add(w.trim()); });
        }
      }
    }

    vocabMap[seed] = [...words].sort().join(', ');
  }

  // Build output: each remaining LEGO with its vocab
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
  console.log(`Written ${enriched.length} enriched LEGOs to /tmp/deu_remaining_with_vocab.json`);
  console.log(`Sample vocab size for seed 51: ${(vocabMap[51] || '').split(',').length} words`);
})();
