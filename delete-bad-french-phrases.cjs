#!/usr/bin/env node

/**
 * Delete problematic USE phrases from French course (seeds 1-20)
 * Based on QA review findings
 */

require('dotenv').config({ path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const COURSE_CODE = 'fra_for_eng';
const DRY_RUN = !process.argv.includes('--execute');

// Phrases to delete (exact matches on known_text + target_text)
const BAD_PHRASES = [
  // S2 L3 - Missing "à"
  { seed: 2, known: "I'm trying to learn to speak French.", target: "J'essaie d'apprendre parler français." },
  { seed: 2, known: "I'm trying to learn to speak French with you.", target: "J'essaie d'apprendre parler français avec toi." },

  // S6 - "se souvenir comment" + wrong translation
  { seed: 6, known: "I'm going to try to remember.", target: "Je vais me souvenir." },
  { seed: 6, known: "I want to remember how to say something in French.", target: "Je veux me souvenir comment dire quelque chose en français." },
  { seed: 6, known: "I want to remember how to speak French.", target: "Je veux me souvenir comment parler français." },
  { seed: 6, known: "I'm going to remember how to say something.", target: "Je vais me souvenir comment dire quelque chose." },
  { seed: 6, known: "I'm trying to remember how to say something in French.", target: "J'essaie de me souvenir comment dire quelque chose en français." },
  { seed: 6, known: "I'm trying to remember how to speak French.", target: "J'essaie de me souvenir comment parler français." },
  { seed: 6, known: "I'm trying to remember how to say something.", target: "J'essaie de me souvenir comment dire quelque chose." },

  // S10 L3 - "se souvenir comment"
  { seed: 10, known: "I want to remember how to say the whole sentence.", target: "Je veux me souvenir comment dire toute la phrase." },

  // S13 L2 - Fragments
  { seed: 13, known: "To say very well", target: "Dire très bien" },
  { seed: 13, known: "To practise very well", target: "M'entraîner très bien" },
  { seed: 13, known: "To learn very well", target: "Apprendre très bien" },
  { seed: 13, known: "To remember very well", target: "Me souvenir très bien" },
  { seed: 13, known: "To try very well", target: "Essayer très bien" },
  { seed: 13, known: "To guess very well", target: "Deviner très bien" },

  // S14 L2 - Fragments
  { seed: 14, known: "To speak French all day", target: "Parler français toute la journée" },
  { seed: 14, known: "To remember all day", target: "Me souvenir toute la journée" },
  { seed: 14, known: "To explain all day", target: "Expliquer toute la journée" },

  // S15 L3 - Fragments
  { seed: 15, known: "To speak French with me", target: "Parler français avec moi" },
  { seed: 15, known: "To speak French with me now", target: "Parler français avec moi maintenant" },

  // S16 - Nonsensical + Fragments
  { seed: 16, known: "He wants to come back very well.", target: "Il veut revenir très bien." },
  { seed: 16, known: "To come back tomorrow", target: "Revenir demain" },
  { seed: 16, known: "To come back after you finish", target: "Revenir après que tu termines" },
  { seed: 16, known: "To come back with everyone", target: "Revenir avec tout le monde" },
  { seed: 16, known: "To come back later", target: "Revenir plus tard" },
  { seed: 16, known: "To explain later", target: "Expliquer plus tard" },

  // S17 - Wrong word order + unnatural + fragment
  { seed: 17, known: "I want to know everything.", target: "Je veux savoir tout." },
  { seed: 17, known: "I can know French.", target: "Je peux savoir français." },
  { seed: 17, known: "I'd like to know French.", target: "J'aimerais savoir français." },
  { seed: 17, known: "He wants to know very well.", target: "Il veut savoir très bien." },
  { seed: 17, known: "To know what is the answer", target: "Savoir quelle est la réponse" },

  // S18 - Fragments
  { seed: 18, known: "To meet with someone else", target: "Nous retrouver avec quelqu'un d'autre" },
  { seed: 18, known: "at six o'clock", target: "à six heures" },
  { seed: 18, known: "at six o'clock today", target: "à six heures aujourd'hui" },
  { seed: 18, known: "at six o'clock tomorrow", target: "à six heures demain" },
  { seed: 18, known: "at six o'clock with everyone", target: "à six heures avec tout le monde" },
  { seed: 18, known: "at six o'clock now", target: "à six heures maintenant" },
  { seed: 18, known: "this evening", target: "ce soir" },
  { seed: 18, known: "at six o'clock this evening", target: "à six heures ce soir" },
  { seed: 18, known: "this evening at six o'clock", target: "ce soir à six heures" },
];

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN MODE - No deletions will be made\n' : '⚠️  EXECUTE MODE - Deletions will be permanent\n');

  let totalDeleted = 0;
  const deletionResults = [];

  for (const phrase of BAD_PHRASES) {
    const { seed, known, target } = phrase;

    // Find matching phrase(s)
    const { data: matches, error: findError } = await supabase
      .from('course_practice_phrases')
      .select('id, lego_index, position, phrase_role')
      .eq('course_code', COURSE_CODE)
      .eq('seed_number', seed)
      .eq('known_text', known)
      .eq('target_text', target)
      .eq('phrase_role', 'use');

    if (findError) {
      console.error(`❌ Error finding phrase in S${seed}: ${findError.message}`);
      continue;
    }

    if (!matches || matches.length === 0) {
      console.log(`⚠️  S${seed}: Phrase not found (already deleted or doesn't match exactly)`);
      console.log(`    Known: "${known}"`);
      console.log(`    Target: "${target}"\n`);
      continue;
    }

    for (const match of matches) {
      if (DRY_RUN) {
        console.log(`🗑️  Would delete S${seed} L${match.lego_index} pos${match.position}:`);
        console.log(`    "${known}" -> "${target}"\n`);
        totalDeleted++;
      } else {
        const { error: deleteError } = await supabase
          .from('course_practice_phrases')
          .delete()
          .eq('id', match.id);

        if (deleteError) {
          console.error(`❌ Error deleting S${seed} L${match.lego_index}: ${deleteError.message}`);
        } else {
          console.log(`✅ Deleted S${seed} L${match.lego_index} pos${match.position}:`);
          console.log(`    "${known}" -> "${target}"\n`);
          totalDeleted++;
        }
      }

      deletionResults.push({
        seed,
        lego_index: match.lego_index,
        known,
        target,
        deleted: !DRY_RUN
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`📊 Summary: ${totalDeleted} phrases ${DRY_RUN ? 'would be' : 'were'} deleted`);
  console.log('='.repeat(80));

  if (DRY_RUN) {
    console.log('\n💡 To execute deletions, run: node /tmp/delete-bad-french-phrases.cjs --execute');
  } else {
    console.log('\n✅ Deletions complete!');
  }
}

main().catch(console.error);
