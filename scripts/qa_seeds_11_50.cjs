const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const course = 'deu_for_eng';

  // Get seeds 11-50
  const { data: seeds, error: e1 } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', course)
    .gte('seed_number', 11)
    .lte('seed_number', 50)
    .order('seed_number');
  if (e1) { console.error('Seeds error:', e1); return; }

  // Get LEGOs for seeds 11-50
  const { data: legos, error: e2 } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, type, known_text, target_text, is_new, components')
    .eq('course_code', course)
    .gte('seed_number', 11)
    .lte('seed_number', 50)
    .order('seed_number')
    .order('lego_index');
  if (e2) { console.error('LEGOs error:', e2); return; }

  // Get phrases for seeds 11-50 (may exceed 1000, paginate)
  let allPhrases = [];
  let offset = 0;
  while (true) {
    const { data: batch, error: e3 } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, phrase_role, known_text, target_text, score')
      .eq('course_code', course)
      .gte('seed_number', 11)
      .lte('seed_number', 50)
      .order('seed_number')
      .order('lego_index')
      .order('phrase_role')
      .order('score')
      .range(offset, offset + 999);
    if (e3) { console.error('Phrases error:', e3); return; }
    if (!batch || batch.length === 0) break;
    allPhrases = allPhrases.concat(batch);
    if (batch.length < 1000) break;
    offset += 1000;
  }

  // Output structured data
  for (const seed of seeds) {
    const sn = seed.seed_number;
    const seedLegos = (legos || []).filter(l => l.seed_number === sn);
    const seedPhrases = allPhrases.filter(p => p.seed_number === sn);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`SEED ${sn}: "${seed.known_text}"`);
    console.log(`TARGET: "${seed.target_text}"`);
    console.log(`LEGOs: ${seedLegos.length} | Phrases: ${seedPhrases.length}`);
    console.log('='.repeat(80));

    for (const lego of seedLegos) {
      const lPhrases = seedPhrases.filter(p => p.lego_index === lego.lego_index);
      const builds = lPhrases.filter(p => p.phrase_role === 'build');
      const uses = lPhrases.filter(p => p.phrase_role === 'use');

      console.log(`\n  L${lego.lego_index} [${lego.type}] "${lego.known_text}" → "${lego.target_text}" ${lego.is_new ? '' : '(DUP)'}`);
      if (lego.components) {
        const c = typeof lego.components === 'string' ? JSON.parse(lego.components) : lego.components;
        console.log(`    Components: ${c.map(x => `"${x.known}"→"${x.target}"`).join(', ')}`);
      }

      if (builds.length > 0) {
        console.log(`    BUILD (${builds.length}):`);
        for (const b of builds) {
          console.log(`      [${b.score}] "${b.known_text}" → "${b.target_text}"`);
        }
      }
      if (uses.length > 0) {
        console.log(`    USE (${uses.length}):`);
        for (const u of uses) {
          console.log(`      [${u.score}] "${u.known_text}" → "${u.target_text}"`);
        }
      }
    }
  }

  // Summary stats
  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log(`Seeds: ${(seeds || []).length}`);
  console.log(`Total LEGOs: ${(legos || []).length} (${(legos || []).filter(l => l.is_new).length} new, ${(legos || []).filter(l => !l.is_new).length} dup)`);
  console.log(`Total Phrases: ${allPhrases.length}`);
  console.log(`  BUILD: ${allPhrases.filter(p => p.phrase_role === 'build').length}`);
  console.log(`  USE: ${allPhrases.filter(p => p.phrase_role === 'use').length}`);
  console.log(`  COMPONENT: ${allPhrases.filter(p => p.phrase_role === 'component').length}`);
}

main().catch(console.error);
