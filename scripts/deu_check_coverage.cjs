const {createClient} = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const fs = require('fs');

(async () => {
  const {data: legos, error: e1} = await sb.from('course_legos')
    .select('seed_number, lego_index, type, known_text, target_text, is_new')
    .eq('course_code', 'deu_for_eng')
    .gte('seed_number', 51)
    .eq('is_new', true)
    .order('seed_number');
  if (e1) { console.error('LEGO err:', e1); return; }

  // Fetch phrases in batches to avoid pagination issues
  const buildPhrases = [];
  const usePhrases = [];

  for (let offset = 0; ; offset += 1000) {
    const {data, error} = await sb.from('course_practice_phrases')
      .select('seed_number, lego_index, phrase_role')
      .eq('course_code', 'deu_for_eng')
      .gte('seed_number', 51)
      .eq('phrase_role', 'build')
      .range(offset, offset + 999);
    if (error) { console.error('Build fetch err:', error); break; }
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
    if (error) { console.error('Use fetch err:', error); break; }
    usePhrases.push(...data);
    if (data.length < 1000) break;
  }

  const allPhrases = [...buildPhrases, ...usePhrases];
  console.log('Total BUILD phrases (S51+):', buildPhrases.length);
  console.log('Total USE phrases (S51+):', usePhrases.length);

  const counts = {};
  for (const p of allPhrases) {
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
      need.push({
        s: l.seed_number, l: l.lego_index, t: l.type,
        k: l.known_text, tgt: l.target_text,
        hb: c.build, hu: c.use, nb, nu
      });
    }
  }

  fs.writeFileSync('/tmp/deu_need_phrases.json', JSON.stringify(need, null, 2));
  console.log('LEGOs needing phrases:', need.length);
  const seeds = [...new Set(need.map(n => n.s))];
  console.log('Across', seeds.length, 'seeds:', seeds.join(','));

  // Show summary
  let totalNeedBuild = 0, totalNeedUse = 0;
  for (const n of need) {
    totalNeedBuild += n.nb;
    totalNeedUse += n.nu;
  }
  console.log('Total BUILD phrases needed:', totalNeedBuild);
  console.log('Total USE phrases needed:', totalNeedUse);
})();
