const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function sampleCourse(courseCode) {
  // Get random 10 seeds from first 260
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .lte('seed_number', 260)
    .order('seed_number');

  if (!seeds || seeds.length === 0) {
    console.log(courseCode + ': No seeds found');
    return;
  }

  // Random sample of 10
  const shuffled = seeds.sort(() => Math.random() - 0.5);
  const sample = shuffled.slice(0, 10).sort((a,b) => a.seed_number - b.seed_number);

  console.log('\n=== ' + courseCode.toUpperCase() + ' ===');
  console.log('Total seeds (<=260):', seeds.length);
  console.log('Sampled:', sample.map(s => s.seed_number).join(', '));

  let issues = [];

  for (const seed of sample) {
    // Get LEGOs for this seed
    const { data: legos } = await supabase
      .from('course_legos')
      .select('lego_index, type, known_text, target_text, components')
      .eq('course_code', courseCode)
      .eq('seed_number', seed.seed_number)
      .order('lego_index');

    // Get phrases for this seed
    const { data: phrases } = await supabase
      .from('course_practice_phrases')
      .select('lego_index, known_text, target_text, phrase_role, metadata')
      .eq('course_code', courseCode)
      .eq('seed_number', seed.seed_number)
      .order('lego_index')
      .order('position');

    console.log('\n--- SEED ' + seed.seed_number + ' ---');
    console.log('Known:', seed.known_text);
    console.log('Target:', seed.target_text);
    console.log('LEGOs:', legos?.length || 0);

    if (!legos || legos.length === 0) {
      issues.push(`S${seed.seed_number}: No LEGOs`);
      continue;
    }

    for (const lego of (legos || [])) {
      const legoId = 'L' + lego.lego_index;
      const legoPhrases = (phrases || []).filter(p => p.lego_index === lego.lego_index);
      const buildPhrases = legoPhrases.filter(p => p.phrase_role === 'build');
      const usePhrases = legoPhrases.filter(p => p.phrase_role === 'use');
      const oldPhrases = legoPhrases.filter(p => !p.phrase_role || p.phrase_role === 'practice');
      const scores = usePhrases.map(p => p.metadata?.score).filter(s => typeof s === 'number');

      console.log('  ' + legoId + ' [' + lego.type + ']: "' + lego.known_text + '" → "' + lego.target_text + '"');

      if (lego.type === 'M' && lego.components) {
        console.log('    Components:', JSON.stringify(lego.components));
      } else if (lego.type === 'M' && !lego.components) {
        issues.push(`S${seed.seed_number}${legoId}: M-LEGO missing components`);
        console.log('    ⚠️  M-LEGO MISSING COMPONENTS!');
      }

      if (buildPhrases.length > 0 || usePhrases.length > 0) {
        console.log('    BUILD:', buildPhrases.length, '| USE:', usePhrases.length);
        if (buildPhrases.length !== 4) {
          issues.push(`S${seed.seed_number}${legoId}: BUILD count ${buildPhrases.length} (need 4)`);
        }
        if (usePhrases.length !== 6) {
          issues.push(`S${seed.seed_number}${legoId}: USE count ${usePhrases.length} (need 6)`);
        }
        if (scores.length > 0) {
          const avg = scores.reduce((a,b)=>a+b,0)/scores.length;
          console.log('    Scores:', scores.join(', '), '(avg:', avg.toFixed(1) + ')');
          if (avg < 5) {
            issues.push(`S${seed.seed_number}${legoId}: Low avg score ${avg.toFixed(1)}`);
          }
        } else if (usePhrases.length > 0) {
          issues.push(`S${seed.seed_number}${legoId}: USE phrases missing scores`);
          console.log('    ⚠️  NO SCORES ON USE PHRASES!');
        }
      } else if (oldPhrases.length > 0) {
        console.log('    OLD FORMAT phrases:', oldPhrases.length);
        issues.push(`S${seed.seed_number}${legoId}: Old format (${oldPhrases.length} phrases, no BUILD/USE)`);
      } else {
        console.log('    ⚠️  NO PHRASES!');
        issues.push(`S${seed.seed_number}${legoId}: No phrases`);
      }
    }
  }

  console.log('\n=== ' + courseCode.toUpperCase() + ' ISSUES ===');
  if (issues.length === 0) {
    console.log('No issues found!');
  } else {
    issues.forEach(i => console.log('  • ' + i));
  }
  console.log('Total issues:', issues.length);
}

async function main() {
  await sampleCourse('jpn_for_eng');
  await sampleCourse('kor_for_eng');
}

main().catch(console.error);
