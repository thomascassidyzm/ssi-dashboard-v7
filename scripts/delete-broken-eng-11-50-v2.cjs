const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const COURSE = 'fra_for_eng';

const toDelete = [
  // S15 L3: subject-object conflict "I ... with me"
  { seed: 15, known: "I want to speak French with me tomorrow." },
  { seed: 15, known: "I'd like to speak with me now." },
  { seed: 15, known: "I'm going to practise speaking with me." },

  // S26 L2: "want feeling" instead of "want to feel"
  { seed: 26, known: "I want feeling as if I'm nearly ready to go." },
  { seed: 26, known: "you want feeling as if you're nearly ready to go." },
  { seed: 26, known: "he wants feeling as if he's nearly ready to go." },
  { seed: 26, known: "we want feeling as if we're nearly ready to go soon." },

  // S27 L2: "doesn't want taking" instead of "doesn't want to take"
  { seed: 27, known: "he doesn't want taking too much time to answer." },
  { seed: 27, known: "she doesn't want taking too much time to answer tomorrow." },
  { seed: 27, known: "we don't want taking too much time to answer this evening." },
  { seed: 27, known: "I like taking too much time to answer tomorrow." },

  // S33 L1: "because" + question = nonsensical
  { seed: 33, known: "because how long have you been learning French." },

  // S40 L2: embedded question errors (4 already deleted in first run, but include for completeness)
  { seed: 40, known: "i want to try how do you feel" },
  { seed: 40, known: "i'm trying to learn how do you feel" },
  { seed: 40, known: "can you say how do you feel" },
  { seed: 40, known: "i'm going to try how do you feel" },

  // S41 L1: "I feel" missing adjective (7 already deleted in first run, but include for completeness)
  { seed: 41, known: "i feel now" },
  { seed: 41, known: "i feel today" },
  { seed: 41, known: "i feel at the moment" },
  { seed: 41, known: "i feel this morning" },
  { seed: 41, known: "i feel this afternoon" },
  { seed: 41, known: "i feel at the moment with you" },
  { seed: 41, known: "i feel as often as possible" },

  // S41 L4: same issue
  { seed: 41, known: "i'm starting to feel this morning" },

  // S42 L3: wrong comparative syntax
  { seed: 42, known: "i feel okay now than last night" },

  // S44 L1: nonsensical time-swaps
  { seed: 44, known: "today or yesterday" },
  { seed: 44, known: "i'm trying now or yesterday" },
  { seed: 44, known: "now or at the moment" },

  // S46 L1: present tense + "yesterday"
  { seed: 46, known: "but i don't worry yesterday" },

  // S47 L1: incomplete sentences (1 already deleted in first run, but include for completeness)
  { seed: 47, known: "because i think that at the moment" },
  { seed: 47, known: "because i think that now" },
];

async function main() {
  let totalDeleted = 0;
  let notFound = 0;
  let flagsDeleted = 0;

  for (const item of toDelete) {
    const { data: found, error: findErr } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', item.seed)
      .ilike('known_text', item.known);

    if (findErr) {
      console.error(`  ERROR S${item.seed}: "${item.known}":`, findErr.message);
      continue;
    }

    if (found.length === 0) {
      // Already deleted in first run
      continue;
    }

    for (const row of found) {
      // First delete any QA flags referencing this phrase
      const { data: flags, error: flagErr } = await supabase
        .from('course_qa_flags')
        .delete()
        .eq('phrase_id', row.id)
        .select('id');

      if (flagErr) {
        console.error(`  FLAG DELETE ERROR ${row.id}:`, flagErr.message);
      } else if (flags && flags.length > 0) {
        flagsDeleted += flags.length;
      }

      // Now delete the phrase
      const { error: delErr } = await supabase
        .from('course_practice_phrases')
        .delete()
        .eq('id', row.id);

      if (delErr) {
        console.error(`  DELETE ERROR ${row.id}:`, delErr.message);
      } else {
        console.log(`  DELETED S${item.seed} L${row.lego_index}: "${row.known_text}"`);
        totalDeleted++;
      }
    }
  }

  console.log(`\nTotal deleted: ${totalDeleted}, QA flags removed: ${flagsDeleted}`);
}

main();
