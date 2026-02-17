/**
 * Expanded Grammar Audit for eng_for_por
 * More comprehensive patterns
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Additional error patterns
const EXPANDED_PATTERNS = [
  // Original patterns
  { name: 'PRESENT_PERFECT_WITH_PAST_TIME', regex: /I've been .*(last (month|week|night|year)|yesterday)/i },
  { name: 'PRESENT_CONTINUOUS_WITH_DURATION', regex: /I'm (learning|speaking|reading|thinking).* for about (a week|a month)/i },
  { name: 'PAST_TENSE_WITH_PRESENT_MODAL', regex: /(wanted|started) .* as soon as I can/i },
  { name: 'PAST_CONTINUOUS_WITH_PRESENT', regex: /I was (starting|learning|thinking) .* (at the moment|when I'm|when other people are)/i },
  { name: 'DOUBLE_OBJECT', regex: /(with me tonight.*with me|about it anything|with me.*with me)/i },
  { name: 'PRESENT_TENSE_WITH_PAST_TIME', regex: /it's a good thing .* last night/i },
  { name: 'GARBLED_WHAT_IS', regex: /what is (all day|and what|later on with)/i },
  { name: 'ADVERB_PLACEMENT_THIS', regex: /It's like this (easily|carefully),/i },
  { name: 'PRONOUN_MISMATCH_CAN', regex: /(We|You|He|She) (don't|doesn't) want .* as soon as I can/i },
  { name: 'FEEL_OKAY_BETTER', regex: /feel okay better than/i },
  { name: 'STARTING_WITH_DURATION', regex: /starting .* for about (a week|a month)/i },
  { name: 'TIRED_EASILY', regex: /tired easily/i },

  // New patterns to catch more errors
  { name: 'SELF_REFERENCE_WITH_ME', regex: /I wanted to (go|speak|learn) with me tonight/i },
  { name: 'YOU_WITH_ME', regex: /You wanted to .* with me tonight/i },
  { name: 'SEMANTIC_TAKING_TO_SPEAK', regex: /I don't like taking you to speak/i },
  { name: 'SEMANTIC_TAKING_HER', regex: /I (don't )?like taking her to/i },
  { name: 'LEARNING_BETTER_THAN', regex: /I was learning English better than last night/i },
  { name: 'SPEAKING_BETTER_THAN_PAST', regex: /I was starting to speak English better than/i },
  { name: 'WHAT_I_SPEAK', regex: /what I('m going to)? speak( in English)?$/i },
  { name: 'WHAT_YOU_SPEAK', regex: /what you speak$/i },
  { name: 'LEARN_THE_ANSWER', regex: /learning the answer/i },
  { name: 'PRESENT_CONTINUOUS_LAST_MONTH', regex: /I'm (learning|thinking).* last month/i },
  { name: 'STARTED_FOR_DURATION', regex: /I started to .* for about (a week|a month)/i },
  { name: 'INTERRUPT_CAREFULLY', regex: /interrupt .* carefully/i },
  { name: 'READ_LAST_MONTH', regex: /doesn't want to read anything last month/i },
];

async function expandedAudit() {
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('id, known_text, target_text, seed_number, lego_index')
    .eq('course_code', 'eng_for_por')
    .eq('phrase_role', 'use')
    .lte('seed_number', 50)
    .order('seed_number');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const allErrors = [];
  const seenIds = new Set();

  for (const phrase of phrases) {
    for (const pattern of EXPANDED_PATTERNS) {
      if (pattern.regex.test(phrase.target_text) && !seenIds.has(phrase.id + pattern.name)) {
        seenIds.add(phrase.id + pattern.name);
        allErrors.push({
          seed: phrase.seed_number,
          id: phrase.id,
          phrase: phrase.target_text,
          known: phrase.known_text,
          errorType: pattern.name
        });
      }
    }
  }

  // Deduplicate by ID (keep first error type found)
  const byId = {};
  allErrors.forEach(e => {
    if (!byId[e.id]) {
      byId[e.id] = e;
    }
  });

  const uniqueErrors = Object.values(byId).sort((a, b) => a.seed - b.seed);

  console.log('=' .repeat(80));
  console.log('EXPANDED GRAMMAR AUDIT - eng_for_por');
  console.log('=' .repeat(80));
  console.log(`\nTotal phrases: ${phrases.length}`);
  console.log(`Unique phrases with errors: ${uniqueErrors.length}`);
  console.log(`Error rate: ${(uniqueErrors.length / phrases.length * 100).toFixed(1)}%`);

  // Group by error type
  const byType = {};
  uniqueErrors.forEach(e => {
    if (!byType[e.errorType]) byType[e.errorType] = [];
    byType[e.errorType].push(e);
  });

  console.log('\n' + '-'.repeat(80));
  console.log('ERRORS BY TYPE:');
  console.log('-'.repeat(80));

  Object.entries(byType)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([type, errors]) => {
      console.log(`\n${type}: ${errors.length} instances`);
      errors.slice(0, 3).forEach(e => console.log(`  Seed ${e.seed}: "${e.phrase}"`));
      if (errors.length > 3) console.log(`  ... and ${errors.length - 3} more`);
    });

  // List all errors for fixing
  console.log('\n' + '-'.repeat(80));
  console.log('ALL ERRORS FOR CORRECTION:');
  console.log('-'.repeat(80));

  uniqueErrors.forEach((e, i) => {
    console.log(`\n${i + 1}. [Seed ${e.seed}] ${e.errorType}`);
    console.log(`   EN: "${e.phrase}"`);
    console.log(`   PT: "${e.known}"`);
  });

  return uniqueErrors;
}

expandedAudit();
