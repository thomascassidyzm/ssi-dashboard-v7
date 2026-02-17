const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data } = await supabase.from('course_legos')
    .select('known_text, target_text, is_new, seed_number')
    .eq('course_code', 'ita_for_eng')
    .order('seed_number').order('lego_index')
    .limit(2000);

  // How many unique known_text values?
  const uniqueKnown = new Set(data.map(l => l.known_text));
  const uniqueKnownTarget = new Set(data.map(l => l.known_text + '|' + l.target_text));

  console.log('Total records:', data.length);
  console.log('Unique known_text:', uniqueKnown.size);
  console.log('Unique known+target:', uniqueKnownTarget.size);

  // For each unique known_text, how many distinct targets?
  const knownToTargets = new Map();
  data.forEach(l => {
    if (!knownToTargets.has(l.known_text)) knownToTargets.set(l.known_text, new Set());
    knownToTargets.get(l.known_text).add(l.target_text);
  });

  const multiTarget = [...knownToTargets.entries()].filter(([k, v]) => v.size > 1);
  console.log('known_text with multiple targets:', multiTarget.length);
  multiTarget.forEach(([k, v]) => console.log('  "' + k + '" ->', [...v].join(' / ')));

  // The real test: for each unique known+target, is the FIRST occurrence is_new=true?
  const firstSeen = new Map(); // known+target -> first seed_number
  let incorrectDups = 0;
  let correctDups = 0;
  const wrongFirstOccurrences = [];

  data.forEach(l => {
    const key = l.known_text + '|' + l.target_text;
    if (!firstSeen.has(key)) {
      firstSeen.set(key, l.seed_number);
      if (l.is_new === false) {
        incorrectDups++;
        if (wrongFirstOccurrences.length < 20) {
          wrongFirstOccurrences.push({ seed: l.seed_number, known: l.known_text, target: l.target_text });
        }
      }
    } else {
      if (l.is_new === false) correctDups++;
      if (l.is_new === true) {
        console.log('WRONGLY is_new=true: S' + l.seed_number + ' "' + l.known_text + '" (first in S' + firstSeen.get(key) + ')');
      }
    }
  });

  console.log('\nFirst-occurrence LEGOs wrongly marked is_new=false:', incorrectDups);
  console.log('Repeat-occurrence LEGOs correctly marked is_new=false:', correctDups);

  if (wrongFirstOccurrences.length > 0) {
    console.log('\nSample first-occurrences wrongly marked false:');
    wrongFirstOccurrences.forEach(l =>
      console.log('  S' + l.seed + ': "' + l.known + '" -> "' + l.target + '"')
    );
  }

  // Also: seed range distribution
  const newByRange = { '1-10': 0, '11-34': 0, '35-300': 0 };
  const falseByRange = { '1-10': 0, '11-34': 0, '35-300': 0 };
  data.forEach(l => {
    const range = l.seed_number <= 10 ? '1-10' : l.seed_number <= 34 ? '11-34' : '35-300';
    if (l.is_new) newByRange[range]++;
    else falseByRange[range]++;
  });
  console.log('\nis_new=true by range:', newByRange);
  console.log('is_new=false by range:', falseByRange);
})();
