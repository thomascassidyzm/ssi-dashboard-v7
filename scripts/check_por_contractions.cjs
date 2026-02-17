const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('course_legos')
    .select('target_text, type, seed_number')
    .eq('course_code', 'por_for_eng')
    .lte('seed_number', 300)
    .order('seed_number');

  if (error) { console.error('Error:', error.message); return; }
  if (!data || data.length === 0) { console.log('No LEGOs found'); return; }

  const allTargets = data.map(l => l.target_text.toLowerCase().trim());
  const uniqueTargets = [...new Set(allTargets)].sort();

  const contractionMap = {
    'do': 'de+o', 'da': 'de+a', 'dos': 'de+os', 'das': 'de+as',
    'dele': 'de+ele', 'dela': 'de+ela', 'deles': 'de+eles', 'delas': 'de+elas',
    'deste': 'de+este', 'desta': 'de+esta', 'desse': 'de+esse', 'dessa': 'de+essa',
    'disto': 'de+isto', 'disso': 'de+isso', 'daquilo': 'de+aquilo',
    'daquela': 'de+aquela', 'daquele': 'de+aquele',
    'no': 'em+o', 'na': 'em+a', 'nos': 'em+os', 'nas': 'em+as',
    'nele': 'em+ele', 'nela': 'em+ela',
    'neste': 'em+este', 'nesta': 'em+esta', 'nesse': 'em+esse', 'nessa': 'em+essa',
    'nisto': 'em+isto', 'nisso': 'em+isso', 'naquilo': 'em+aquilo',
    'naquela': 'em+aquela', 'naquele': 'em+aquele',
    'ao': 'a+o', 'aos': 'a+os',
    'pelo': 'por+o', 'pela': 'por+a', 'pelos': 'por+os', 'pelas': 'por+as',
  };

  const foundInTargets = {};
  const missingContractions = {};

  for (const [contraction, expansion] of Object.entries(contractionMap)) {
    let found = false;
    for (const target of uniqueTargets) {
      const words = target.split(/\s+/);
      if (words.includes(contraction)) {
        if (!foundInTargets[contraction]) foundInTargets[contraction] = [];
        foundInTargets[contraction].push(target);
        found = true;
      }
    }
    if (!found) missingContractions[contraction] = expansion;
  }

  console.log('Total unique LEGO targets:', uniqueTargets.length);
  console.log('Total LEGOs:', data.length);
  console.log();
  console.log(`=== CONTRACTIONS FOUND IN LEGO TARGETS (${Object.keys(foundInTargets).length}) ===`);
  for (const [c, targets] of Object.entries(foundInTargets)) {
    console.log(`  OK  ${c} (${contractionMap[c]}) — in: ${targets.slice(0, 3).join(', ')}`);
  }
  console.log();
  console.log(`=== CONTRACTIONS MISSING (${Object.keys(missingContractions).length}) ===`);
  for (const [c, exp] of Object.entries(missingContractions)) {
    console.log(`  --  ${c} (${exp})`);
  }

  // Check expanded (uncontracted) forms that shouldn't be there
  console.log();
  console.log('=== EXPANDED (WRONG) FORMS IN LEGO TARGETS ===');
  const expandedPatterns = [
    'de o ', 'de a ', 'de os ', 'de as ',
    'de isso', 'de isto', 'de esse', 'de essa', 'de este', 'de esta',
    'em o ', 'em a ', 'em isso', 'em isto',
    'a o ', 'por o ', 'por a '
  ];
  for (const pat of expandedPatterns) {
    const matches = uniqueTargets.filter(t => t.includes(pat));
    if (matches.length > 0) {
      console.log(`  BAD "${pat}" — ${matches.length} LEGOs: ${matches.slice(0, 5).join('; ')}`);
    }
  }

  // Also check seed targets for contractions
  console.log();
  console.log('=== CHECKING SEED TARGETS FOR CONTRACTIONS ===');
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, target_text')
    .eq('course_code', 'por_for_eng')
    .lte('seed_number', 300)
    .order('seed_number');

  if (seeds) {
    const seedContractions = {};
    for (const seed of seeds) {
      const target = seed.target_text.toLowerCase();
      for (const [contraction] of Object.entries(contractionMap)) {
        const re = new RegExp(`\\b${contraction}\\b`);
        if (re.test(target)) {
          if (!seedContractions[contraction]) seedContractions[contraction] = [];
          seedContractions[contraction].push(`S${seed.seed_number}`);
        }
      }
    }
    console.log(`Contractions appearing in seed targets: ${Object.keys(seedContractions).length}`);
    for (const [c, seeds2] of Object.entries(seedContractions).sort()) {
      console.log(`  ${c} (${contractionMap[c]}): ${seeds2.length} seeds — ${seeds2.slice(0, 5).join(', ')}${seeds2.length > 5 ? '...' : ''}`);
    }
  }
}

main().catch(e => console.error(e));
