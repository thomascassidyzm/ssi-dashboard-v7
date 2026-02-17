/**
 * Grammar Audit for eng_for_por
 * Identifies all English grammar errors in USE phrases
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Error patterns to check
const ERROR_PATTERNS = [
  {
    name: 'PRESENT_PERFECT_WITH_PAST_TIME',
    description: "Present perfect (continuous) cannot be used with specific past time markers",
    regex: /I've been .*(last (month|week|night|year)|yesterday)/i,
    examples: ["I've been learning English carefully last month"]
  },
  {
    name: 'PRESENT_CONTINUOUS_WITH_DURATION',
    description: "Present continuous with 'for' duration should be present perfect continuous",
    regex: /I'm (learning|speaking|reading|thinking).* for about (a week|a month)/i,
    examples: ["I'm learning English for about a week"]
  },
  {
    name: 'PAST_TENSE_WITH_PRESENT_MODAL',
    description: "Past tense verbs should use past modals (can→could)",
    regex: /(wanted|started) .* as soon as I can/i,
    examples: ["I wanted to go as soon as I can"]
  },
  {
    name: 'PAST_CONTINUOUS_WITH_PRESENT',
    description: "Past continuous mixed with present tense context",
    regex: /I was (starting|learning|thinking) .* (at the moment|when I'm|when other people are)/i,
    examples: ["I was starting to feel better at the moment"]
  },
  {
    name: 'DOUBLE_OBJECT',
    description: "Double object or pronoun error",
    regex: /(with me tonight.*with me|about it anything|with me.*with me)/i,
    examples: ["I wanted to go with me tonight"]
  },
  {
    name: 'PRESENT_TENSE_WITH_PAST_TIME',
    description: "Present tense used with past time markers",
    regex: /it's a good thing .* last night/i,
    examples: ["it's a good thing to make mistakes last night"]
  },
  {
    name: 'GARBLED_CONSTRUCTION',
    description: "Incomplete or garbled sentence construction",
    regex: /what is (all day|and what|later on with)/i,
    examples: ["I want to find out what is all day"]
  },
  {
    name: 'ADVERB_PLACEMENT',
    description: "Adverb doesn't fit the sentence structure",
    regex: /It's like this (easily|carefully),/i,
    examples: ["It's like this easily, if you know what I mean"]
  },
  {
    name: 'PRONOUN_MISMATCH',
    description: "Subject pronoun doesn't match modal pronoun",
    regex: /(We|You|He|She) (don't|doesn't) want .* as soon as I can/i,
    examples: ["We don't want to learn English as soon as I can"]
  },
  {
    name: 'FEEL_OKAY_BETTER',
    description: "Grammar error with 'feel okay better'",
    regex: /feel okay better than/i,
    examples: ["I feel okay better than last night"]
  },
  {
    name: 'STARTING_WITH_DURATION',
    description: "'Starting' cannot take a duration",
    regex: /starting .* for about (a week|a month)/i,
    examples: ["I'm starting to learn for about a week"]
  },
  {
    name: 'TIRED_EASILY',
    description: "Semantic error: 'tired easily' doesn't make sense",
    regex: /tired easily/i,
    examples: ["I'm a little tired easily"]
  }
];

async function auditPhrases() {
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('id, known_text, target_text, seed_number, lego_index')
    .eq('course_code', 'eng_for_por')
    .eq('phrase_role', 'use')
    .lte('seed_number', 50)
    .order('seed_number')
    .order('lego_index');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Auditing ${phrases.length} USE phrases...\n`);

  const errorsByType = {};
  const errorsBySeed = {};
  const allErrors = [];

  for (const phrase of phrases) {
    for (const pattern of ERROR_PATTERNS) {
      if (pattern.regex.test(phrase.target_text)) {
        const errorEntry = {
          seed: phrase.seed_number,
          lego: phrase.lego_index,
          id: phrase.id,
          phrase: phrase.target_text,
          known: phrase.known_text,
          errorType: pattern.name,
          description: pattern.description
        };

        allErrors.push(errorEntry);

        if (!errorsByType[pattern.name]) {
          errorsByType[pattern.name] = [];
        }
        errorsByType[pattern.name].push(errorEntry);

        if (!errorsBySeed[phrase.seed_number]) {
          errorsBySeed[phrase.seed_number] = [];
        }
        errorsBySeed[phrase.seed_number].push(errorEntry);
      }
    }
  }

  // Output summary
  console.log('=' .repeat(80));
  console.log('GRAMMAR AUDIT SUMMARY - eng_for_por (Seeds 1-50)');
  console.log('=' .repeat(80));
  console.log(`\nTotal phrases audited: ${phrases.length}`);
  console.log(`Total errors found: ${allErrors.length}`);
  console.log(`Error rate: ${(allErrors.length / phrases.length * 100).toFixed(1)}%`);

  // Errors by type
  console.log('\n' + '-'.repeat(80));
  console.log('ERRORS BY TYPE:');
  console.log('-'.repeat(80));

  const sortedTypes = Object.entries(errorsByType)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [type, errors] of sortedTypes) {
    const pattern = ERROR_PATTERNS.find(p => p.name === type);
    console.log(`\n### ${type} (${errors.length} instances)`);
    console.log(`Description: ${pattern.description}`);
    console.log('Examples:');
    errors.slice(0, 5).forEach(e => {
      console.log(`  - Seed ${e.seed}: "${e.phrase}"`);
    });
    if (errors.length > 5) {
      console.log(`  ... and ${errors.length - 5} more`);
    }
  }

  // Errors by seed
  console.log('\n' + '-'.repeat(80));
  console.log('ERRORS BY SEED:');
  console.log('-'.repeat(80));

  const sortedSeeds = Object.entries(errorsBySeed)
    .sort((a, b) => Number(a[0]) - Number(b[0]));

  for (const [seed, errors] of sortedSeeds) {
    console.log(`\nSeed ${seed}: ${errors.length} errors`);
    errors.forEach(e => {
      console.log(`  [${e.errorType}] "${e.phrase}"`);
    });
  }

  // Full error list for fixing
  console.log('\n' + '-'.repeat(80));
  console.log('FULL ERROR LIST (for database updates):');
  console.log('-'.repeat(80));
  console.log(JSON.stringify(allErrors.map(e => ({
    id: e.id,
    seed: e.seed,
    current: e.phrase,
    error_type: e.errorType
  })), null, 2));

  return allErrors;
}

auditPhrases();
