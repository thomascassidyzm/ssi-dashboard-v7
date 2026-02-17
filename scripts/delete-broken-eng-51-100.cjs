const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const COURSE = 'fra_for_eng';

// Definite English bugs from QA review of seeds 51-100
const toDelete = [
  // S55 L2: "wanted to sleep" but French says "réveiller" (wake up) - mismatch
  { seed: 55, known: 'i wanted to sleep but i didn\'t sleep' },
  // S65 L3: subject-object conflict "I want to test yourself"
  { seed: 65, known: 'i want to test yourself' },
  // S70 L2: "i'm going to tell me something" - subject-object conflict
  { seed: 70, known: 'i\'m going to tell me something.' },
  // S70 L2: "i don't want to tell me something" - same
  { seed: 70, known: 'i don\'t want to tell me something.' },
  // S89 L1: "What have I've done?" - double auxiliary
  { seed: 89, known: 'What have I\'ve done?' },
  // S98 L2: ALL "consider playing" phrases - should be "consider doing"
  { seed: 98, known: 'i should consider playing something else' },
  { seed: 98, known: 'i want to consider playing something else' },
  { seed: 98, known: 'i\'m trying to consider playing something else' },
  { seed: 98, known: 'i should consider playing something else today' },
  { seed: 98, known: 'i\'m going to consider playing something' },
  { seed: 98, known: 'you should consider playing something else' },
  { seed: 98, known: 'i should consider playing something else now' },
  { seed: 98, known: 'i want to consider playing something' },
  // S61 L3: duplicate phrase
  // (will handle by checking for exact duplicates)
];

async function main() {
  let totalDeleted = 0;

  for (const item of toDelete) {
    // Find the phrase first
    const { data: found, error: findErr } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', item.seed)
      .ilike('known_text', item.known);

    if (findErr) {
      console.error(`  ERROR finding S${item.seed} "${item.known}":`, findErr.message);
      continue;
    }

    if (found.length === 0) {
      console.log(`  NOT FOUND: S${item.seed} "${item.known}"`);
      continue;
    }

    for (const row of found) {
      const { error: delErr } = await supabase
        .from('course_practice_phrases')
        .delete()
        .eq('id', row.id);

      if (delErr) {
        console.error(`  DELETE ERROR: ${row.id}:`, delErr.message);
      } else {
        console.log(`  DELETED S${item.seed} L${row.lego_index}: "${row.known_text}" → "${row.target_text}"`);
        totalDeleted++;
      }
    }
  }

  // Also delete the duplicate in S61 L3
  const { data: s61, error: s61err } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, position, known_text, target_text')
    .eq('course_code', COURSE)
    .eq('seed_number', 61)
    .ilike('known_text', 'If you can speak more slowly that would be great.');

  if (!s61err && s61.length > 1) {
    // Delete the second duplicate, keep the first
    const dup = s61[1];
    const { error: delErr } = await supabase
      .from('course_practice_phrases')
      .delete()
      .eq('id', dup.id);
    if (!delErr) {
      console.log(`  DELETED duplicate S61 L${dup.lego_index}: "${dup.known_text}"`);
      totalDeleted++;
    }
  } else if (s61 && s61.length <= 1) {
    console.log(`  S61 duplicate: only ${s61.length} found, no duplicate to delete`);
  }

  console.log(`\nTotal deleted: ${totalDeleted}`);
}

main();
