const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data: allSeeds } = await supabase.from('course_seeds').select('course_code, seed_number');
  const { data: allLegos } = await supabase.from('course_legos').select('course_code, is_new');
  const { data: allPhrases } = await supabase.from('course_practice_phrases').select('course_code, phrase_role');

  // Aggregate
  const stats = {};

  for (const s of allSeeds || []) {
    if (!stats[s.course_code]) stats[s.course_code] = { seeds: 0, legos: 0, newLegos: 0, phrases: 0, usePhrases: 0 };
    stats[s.course_code].seeds++;
  }

  for (const l of allLegos || []) {
    if (!stats[l.course_code]) stats[l.course_code] = { seeds: 0, legos: 0, newLegos: 0, phrases: 0, usePhrases: 0 };
    stats[l.course_code].legos++;
    if (l.is_new) stats[l.course_code].newLegos++;
  }

  for (const p of allPhrases || []) {
    if (!stats[p.course_code]) stats[p.course_code] = { seeds: 0, legos: 0, newLegos: 0, phrases: 0, usePhrases: 0 };
    stats[p.course_code].phrases++;
    if (p.phrase_role === 'use') stats[p.course_code].usePhrases++;
  }

  // Sort and print
  const sorted = Object.entries(stats).sort((a, b) => b[1].phrases - a[1].phrases);

  console.log('COURSE OVERVIEW (sorted by phrase count)');
  console.log('='.repeat(80));
  console.log('Course'.padEnd(20) + 'Seeds'.padStart(8) + 'LEGOs'.padStart(8) + 'New'.padStart(6) + 'Phrases'.padStart(10) + 'USE'.padStart(10) + 'Ratio'.padStart(8));
  console.log('-'.repeat(80));

  for (const [code, s] of sorted) {
    const ratio = s.legos > 0 ? (s.phrases / s.legos).toFixed(1) : '0';
    console.log(
      code.padEnd(20) +
      String(s.seeds).padStart(8) +
      String(s.legos).padStart(8) +
      String(s.newLegos).padStart(6) +
      String(s.phrases).padStart(10) +
      String(s.usePhrases).padStart(10) +
      ratio.padStart(8)
    );
  }

  console.log('-'.repeat(80));
  console.log('Total courses: ' + sorted.length);

  // Group by type
  const xForEng = sorted.filter(([c]) => c.endsWith('_for_eng') && !c.startsWith('eng_'));
  const engForX = sorted.filter(([c]) => c.startsWith('eng_for_'));
  const other = sorted.filter(([c]) => !c.endsWith('_for_eng') && !c.startsWith('eng_for_'));

  console.log('\nBy type:');
  console.log('  X_for_eng: ' + xForEng.length + ' courses');
  console.log('  eng_for_X: ' + engForX.length + ' courses');
  console.log('  X_for_Y:   ' + other.length + ' courses');
})();
