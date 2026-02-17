/**
 * Fix Grammar Errors in eng_for_por Course
 *
 * This script corrects 56 English grammar errors identified in the QA audit.
 * Run with --dry-run first to review changes.
 *
 * Usage:
 *   node scripts/fix-grammar-errors-eng-for-por.cjs --dry-run
 *   node scripts/fix-grammar-errors-eng-for-por.cjs --execute
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Corrections map: { id: { current, corrected, reason } }
const CORRECTIONS = [
  // Seed 13: WHAT_YOU_SPEAK
  {
    id: null, // Will be looked up by text
    current: "I wouldn't like to guess what you speak",
    corrected: "I wouldn't like to guess what you're saying",
    reason: "Semantic: 'what you speak' -> 'what you're saying'"
  },
  {
    current: "I'd like to try to explain what you speak",
    corrected: "I'd like to try to explain what you mean",
    reason: "Semantic: 'what you speak' -> 'what you mean'"
  },

  // Seed 17: GARBLED_CONSTRUCTION
  {
    current: "I'm not sure what is and what's going to happen tomorrow",
    corrected: "I'm not sure what's happening and what's going to happen tomorrow",
    reason: "Incomplete 'what is' needs object"
  },
  {
    current: "He wants to find out what is and what you mean",
    corrected: "He wants to find out what's going on and what you mean",
    reason: "Incomplete 'what is' needs context"
  },
  {
    current: "I want to find out what is all day with everyone else",
    corrected: "I want to find out what's happening all day with everyone else",
    reason: "Incomplete 'what is' -> 'what's happening'"
  },
  {
    current: "Do you want to find out what is later on with everyone else?",
    corrected: "Do you want to find out what's happening later on with everyone else?",
    reason: "Incomplete 'what is' -> 'what's happening'"
  },

  // Seed 27: SEMANTIC_TAKING
  {
    current: "I don't like taking you to speak English",
    corrected: "I don't like asking you to speak English",
    reason: "Semantic: can't 'take someone to speak'"
  },
  {
    current: "Because I like taking her to learn English",
    corrected: "Because I like helping her to learn English",
    reason: "Semantic: 'taking her to learn' -> 'helping her to learn'"
  },
  {
    current: "I don't like taking her to remember the answer",
    corrected: "I don't like asking her to remember the answer",
    reason: "Semantic: 'taking her to remember' -> 'asking her to remember'"
  },

  // Seed 30: PAST_TENSE_WITH_PRESENT_MODAL
  {
    current: "I wanted to learn English as soon as I can",
    corrected: "I wanted to learn English as soon as I could",
    reason: "Tense agreement: past 'wanted' requires past modal 'could'"
  },
  {
    current: "I wanted to speak English as soon as I can",
    corrected: "I wanted to speak English as soon as I could",
    reason: "Tense agreement"
  },
  {
    current: "I wanted to ask you as soon as I can",
    corrected: "I wanted to ask you as soon as I could",
    reason: "Tense agreement"
  },
  {
    current: "I wanted to ask you something as soon as I can",
    corrected: "I wanted to ask you something as soon as I could",
    reason: "Tense agreement"
  },
  {
    current: "I wanted to go yesterday as soon as I can",
    corrected: "I wanted to go yesterday as soon as I could",
    reason: "Tense agreement"
  },

  // Seed 31: PAST_TENSE_WITH_PRESENT_MODAL + SELF_REFERENCE
  {
    current: "You wanted to go as soon as I can",
    corrected: "You wanted to go as soon as you could",
    reason: "Tense + pronoun agreement"
  },
  {
    current: "You wanted to speak with me tonight",
    corrected: "You wanted to speak with me tonight",
    reason: "Actually OK - keeping for completeness check",
    skip: true
  },
  {
    current: "I wanted to speak with me tonight as soon as I can",
    corrected: "I wanted to speak with you tonight as soon as I could",
    reason: "Self-reference error + tense agreement"
  },
  {
    current: "You wanted to learn with me tonight",
    corrected: "You wanted to learn with me tonight",
    reason: "Actually OK - keeping for completeness check",
    skip: true
  },
  {
    current: "I wanted to go with me tonight",
    corrected: "I wanted to go with you tonight",
    reason: "Self-reference: 'with me' -> 'with you'"
  },
  {
    current: "You wanted to ask me something with me tonight",
    corrected: "You wanted to ask me something tonight",
    reason: "Remove duplicate 'with me'"
  },

  // Seed 33: LEARN_THE_ANSWER - This one is actually semantically odd but grammatical
  // Keeping for reference but not changing
  {
    current: "How long have you been learning the answer?",
    corrected: "How long have you been learning the answer?",
    reason: "Semantically unusual but grammatically OK",
    skip: true
  },

  // Seed 34: PRONOUN_MISMATCH + PAST_TENSE
  {
    current: "He doesn't want to learn English as soon as I can",
    corrected: "He doesn't want to learn English as soon as he can",
    reason: "Pronoun agreement: 'I' -> 'he'"
  },
  {
    current: "I wanted to be quiet as soon as I can",
    corrected: "I wanted to be quiet as soon as I could",
    reason: "Tense agreement"
  },

  // Seed 35: PRONOUN_MISMATCH + PAST_TENSE
  {
    current: "She doesn't want to learn English as soon as I can",
    corrected: "She doesn't want to learn English as soon as she can",
    reason: "Pronoun agreement: 'I' -> 'she'"
  },
  {
    current: "I wanted to read as soon as I can",
    corrected: "I wanted to read as soon as I could",
    reason: "Tense agreement"
  },

  // Seed 36: PRONOUN_MISMATCH + PAST_TENSE
  {
    current: "We don't want to learn English as soon as I can",
    corrected: "We don't want to learn English as soon as we can",
    reason: "Pronoun agreement: 'I' -> 'we'"
  },
  {
    current: "I wanted to interrupt as soon as I can",
    corrected: "I wanted to interrupt as soon as I could",
    reason: "Tense agreement"
  },
  {
    current: "I wanted to read the story as soon as I can",
    corrected: "I wanted to read the story as soon as I could",
    reason: "Tense agreement"
  },

  // Seed 37: PAST_TENSE + DOUBLE_OBJECT + SEMANTIC
  {
    current: "I started to learn English as soon as I can",
    corrected: "I started to learn English as soon as I could",
    reason: "Tense agreement"
  },
  {
    current: "I wanted to think about it as soon as I can",
    corrected: "I wanted to think about it as soon as I could",
    reason: "Tense agreement"
  },
  {
    current: "She doesn't want to think about it anything this afternoon",
    corrected: "She doesn't want to think about anything this afternoon",
    reason: "Remove extra 'it' - double object"
  },
  {
    current: "We don't want to interrupt the story carefully",
    corrected: "We don't want to interrupt the story",
    reason: "Semantic: can't 'interrupt carefully'"
  },
  {
    current: "She doesn't want to read anything last month",
    corrected: "She didn't want to read anything last month",
    reason: "Tense: present 'doesn't' + past 'last month'"
  },

  // Seed 38: PRESENT_PERFECT + STARTED_FOR_DURATION
  {
    current: "I've been learning English carefully last month",
    corrected: "I was learning English carefully last month",
    reason: "Present perfect cannot take 'last month'"
  },
  {
    current: "I started to think about it for about a month",
    corrected: "I've been thinking about it for about a month",
    reason: "'Started' cannot take duration - use perfect continuous"
  },
  {
    current: "I started to think about it for about a week",
    corrected: "I've been thinking about it for about a week",
    reason: "'Started' cannot take duration"
  },

  // Seed 39: PRESENT_CONTINUOUS + SEMANTIC
  {
    current: "But I'm learning English for about a week",
    corrected: "But I've been learning English for about a week",
    reason: "Duration requires present perfect continuous"
  },
  {
    current: "But I'm learning to think about it carefully last month",
    corrected: "But I was learning to think about it carefully last month",
    reason: "Present continuous cannot take 'last month'"
  },
  {
    current: "But I'm learning English easily for about a week",
    corrected: "But I've been learning English easily for about a week",
    reason: "Duration requires present perfect continuous"
  },
  {
    current: "But I'm a little tired easily",
    corrected: "But I get tired easily",
    reason: "Semantic: 'I'm tired easily' -> 'I get tired easily'"
  },

  // Seed 41: STARTING_WITH_DURATION + SEMANTIC
  {
    current: "I feel okay but I'm starting to learn for about a week",
    corrected: "I feel okay but I've been learning for about a week",
    reason: "'Starting' cannot take duration"
  },
  {
    current: "I feel okay but I'm starting to feel tired for about a week",
    corrected: "I feel okay but I've been feeling tired for about a week",
    reason: "'Starting' cannot take duration"
  },
  {
    current: "I feel okay but I'm starting to feel tired easily",
    corrected: "I feel okay but I get tired easily",
    reason: "Semantic: simplify awkward construction"
  },

  // Seed 42: PAST_CONTINUOUS + VARIOUS
  {
    current: "I was starting to learn English when other people are here",
    corrected: "I was starting to learn English when other people were here",
    reason: "Tense agreement in time clause"
  },
  {
    current: "I was starting to think about it carefully at the moment",
    corrected: "I'm starting to think about it carefully at the moment",
    reason: "'At the moment' requires present tense"
  },
  {
    current: "I was starting to learn English for about a week",
    corrected: "I'd been learning English for about a week",
    reason: "Past duration requires past perfect continuous"
  },
  {
    current: "I was starting to feel better when other people are here",
    corrected: "I was starting to feel better when other people were here",
    reason: "Tense agreement"
  },
  {
    current: "I was starting to feel better at the moment",
    corrected: "I'm starting to feel better at the moment",
    reason: "'At the moment' requires present"
  },
  {
    current: "I was starting to feel better for about a week",
    corrected: "I'd been feeling better for about a week",
    reason: "Past duration requires past perfect"
  },
  {
    current: "I was starting to feel better when I'm learning English",
    corrected: "I was starting to feel better when I was learning English",
    reason: "Tense agreement"
  },
  {
    current: "I feel okay better than last night",
    corrected: "I feel better than last night",
    reason: "Remove conflicting 'okay'"
  },
  {
    current: "I was starting to speak English better than last night",
    corrected: "I was speaking English better than last night",
    reason: "Simplify - 'starting to speak better' is awkward"
  },
  {
    current: "I was learning English better than last night",
    corrected: "I was learning English better than the night before",
    reason: "Semantic: 'better than last night' needs context"
  },

  // Seed 47: PRESENT_TENSE_WITH_PAST_TIME
  {
    current: "Because I think that it's a good thing to make mistakes last night",
    corrected: "Because I think that it was a good thing to make mistakes last night",
    reason: "Tense: 'is' + 'last night' conflict"
  },

  // Seed 49: ADVERB_PLACEMENT
  {
    current: "It's like this carefully, if you know what I mean",
    corrected: "It's like this, if you know what I mean, you need to be careful",
    reason: "Restructure - adverb doesn't fit original position"
  },
  {
    current: "It's like this easily, if you know what I mean",
    corrected: "It's easy like this, if you know what I mean",
    reason: "Reposition adverb"
  }
];

async function lookupPhraseIds() {
  const results = [];

  for (const correction of CORRECTIONS) {
    if (correction.skip) continue;

    // Look up by current text
    const { data, error } = await supabase
      .from('course_practice_phrases')
      .select('id, target_text, seed_number')
      .eq('course_code', 'eng_for_por')
      .eq('target_text', correction.current)
      .single();

    if (error || !data) {
      console.log(`⚠️  NOT FOUND: "${correction.current}"`);
      continue;
    }

    results.push({
      ...correction,
      id: data.id,
      seed: data.seed_number
    });
  }

  return results;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const isExecute = process.argv.includes('--execute');

  if (!isDryRun && !isExecute) {
    console.log('Usage:');
    console.log('  --dry-run   Show changes without applying');
    console.log('  --execute   Apply changes to database');
    process.exit(1);
  }

  console.log('=' .repeat(80));
  console.log('GRAMMAR ERROR CORRECTION - eng_for_por');
  console.log('=' .repeat(80));
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log('');

  // Look up all phrase IDs
  console.log('Looking up phrase IDs...');
  const corrections = await lookupPhraseIds();

  console.log(`\nFound ${corrections.length} phrases to correct\n`);

  // Show all corrections
  for (const c of corrections) {
    console.log(`Seed ${c.seed} [${c.id}]`);
    console.log(`  BEFORE: "${c.current}"`);
    console.log(`  AFTER:  "${c.corrected}"`);
    console.log(`  REASON: ${c.reason}`);
    console.log('');
  }

  if (isDryRun) {
    console.log('-'.repeat(80));
    console.log('DRY RUN COMPLETE - No changes made');
    console.log(`Would update ${corrections.length} phrases`);
    console.log('\nRun with --execute to apply changes');
    return;
  }

  // Execute corrections
  console.log('-'.repeat(80));
  console.log('EXECUTING CORRECTIONS...');
  console.log('-'.repeat(80));

  let successCount = 0;
  let errorCount = 0;

  for (const c of corrections) {
    const { error } = await supabase
      .from('course_practice_phrases')
      .update({ target_text: c.corrected })
      .eq('id', c.id);

    if (error) {
      console.log(`❌ FAILED: ${c.id} - ${error.message}`);
      errorCount++;
    } else {
      console.log(`✅ Updated: Seed ${c.seed} - "${c.corrected.substring(0, 50)}..."`);
      successCount++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('CORRECTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`Total: ${corrections.length}`);

  if (errorCount === 0) {
    console.log('\n✅ All corrections applied successfully!');
    console.log('Re-run grammar audit to verify: node scripts/grammar-audit-expanded.cjs');
  }
}

main().catch(console.error);
