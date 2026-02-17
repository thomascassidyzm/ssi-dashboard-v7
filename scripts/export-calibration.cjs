require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const { supabase } = require('../services/supabase-client.cjs');

async function main() {
  const courseCode = process.argv[2] || 'ita_for_eng';
  const maxSeed = parseInt(process.argv[3] || '50');

  // Get seeds
  const { data: seeds, error: seedErr } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .gte('seed_number', 1)
    .lte('seed_number', maxSeed)
    .not('decomposed_at', 'is', null)
    .order('seed_number');
  if (seedErr) throw new Error(`Seeds: ${seedErr.message}`);
  console.error(`Seeds: ${seeds.length}`);

  // Get LEGOs
  const { data: legos, error: legoErr } = await supabase
    .from('course_legos')
    .select('id, seed_number, lego_index, type, known_text, target_text, components')
    .eq('course_code', courseCode)
    .gte('seed_number', 1)
    .lte('seed_number', maxSeed)
    .order('seed_number')
    .order('lego_index');
  if (legoErr) throw new Error(`LEGOs: ${legoErr.message}`);
  console.error(`LEGOs: ${legos.length}`);

  // Get phrases — linked by course_code + seed_number + lego_index
  const { data: allPhrases, error: phraseErr } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, phrase_role, known_text, target_text, metadata')
    .eq('course_code', courseCode)
    .gte('seed_number', 1)
    .lte('seed_number', maxSeed)
    .order('seed_number')
    .order('lego_index')
    .order('position');
  if (phraseErr) throw new Error(`Phrases: ${phraseErr.message}`);
  console.error(`Phrases: ${allPhrases.length}`);

  // Build phrase lookup by seed_number:lego_index
  const phraseLookup = {};
  for (const p of allPhrases) {
    const key = `${p.seed_number}:${p.lego_index}`;
    if (!phraseLookup[key]) phraseLookup[key] = [];
    phraseLookup[key].push(p);
  }

  // Build calibration structure
  const golden = [];
  for (const seed of seeds) {
    const seedLegos = legos.filter(l => l.seed_number === seed.seed_number);
    const entry = {
      seed_number: seed.seed_number,
      known_text: seed.known_text,
      target_text: seed.target_text,
      legos: seedLegos.map(l => {
        const key = `${l.seed_number}:${l.lego_index}`;
        const lPhrases = phraseLookup[key] || [];
        const entry = {
          type: l.type,
          known: l.known_text,
          target: l.target_text,
          build_phrases: lPhrases
            .filter(p => p.phrase_role === 'build')
            .map(p => ({ known: p.known_text, target: p.target_text })),
          use_phrases: lPhrases
            .filter(p => p.phrase_role === 'use')
            .map(p => ({ known: p.known_text, target: p.target_text, score: p.metadata?.score || null }))
        };
        if (l.type === 'M') {
          if (l.components) {
            entry.components = l.components;
          } else {
            // Synthesize components by splitting known/target words
            const kWords = l.known_text.split(/\s+/);
            const tWords = l.target_text.split(/\s+/);
            entry.components = kWords.map((k, i) => ({
              known: k,
              target: tWords[i] || ''
            }));
          }
        }
        return entry;
      })
    };
    golden.push(entry);
  }

  // Count totals
  let totalBuild = 0, totalUse = 0, totalLegos = 0;
  for (const g of golden) {
    totalLegos += g.legos.length;
    for (const l of g.legos) {
      totalBuild += l.build_phrases.length;
      totalUse += l.use_phrases.length;
    }
  }

  console.log(JSON.stringify({
    golden_seed_count: maxSeed,
    golden_decompositions: golden
  }));
  console.error(`\nExported ${golden.length} seeds, ${totalLegos} LEGOs, ${totalBuild} BUILD, ${totalUse} USE phrases`);
}

main().catch(e => { console.error(e); process.exit(1); });
