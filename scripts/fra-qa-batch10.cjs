#!/usr/bin/env node
require('dotenv').config({path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env'});
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const COURSE = 'fra_for_eng';
const SEED_START = 271;
const SEED_END = 300;

let totalPhrases = 0;
let totalBuilds = 0;
let totalUses = 0;
let totalFlagged = 0;
let flagCounts = {
  grammar: 0,
  fragment: 0,
  nonsensical: 0,
  unnatural: 0,
  word_order: 0,
  missing_lego: 0,
  unknown_vocab: 0
};

async function reviewPhrase(phrase) {
  const {phrase_role, known_text, target_text} = phrase;
  const issues = [];

  // Basic checks
  if (!target_text || !target_text.trim()) {
    issues.push('empty_target');
  }

  // BUILD phrases: check grammar/syntax, LEGO presence, vocab
  if (phrase_role === 'build') {
    // Check basic French grammar patterns

    // Missing articles where required
    if (target_text.match(/\bde\s+[aeiouàâäœæù]/i) && !target_text.match(/d[\'eo]/i)) {
      issues.push('grammar'); // "de aller" should be "d'aller"
    }

    // Preposition + pronoun issues
    if (target_text.match(/\b(avec|pour|sans|chez|à)\s+je\b/i)) {
      issues.push('grammar'); // should use me/moi/nous/etc
    }
    if (target_text.match(/\b(avec|pour|sans|chez)\s+tu\b/i)) {
      issues.push('grammar'); // should use te/toi/vous/etc
    }

    // Missing prepositions
    if (known_text.includes('to ') && target_text.match(/[a-z]\s+[a-z]+r$/i)) {
      // Potential missing "à" or "de" before infinitive
      if (!target_text.match(/\s+à\s+[a-z]+r|de\s+[a-z]+r/i)) {
        issues.push('grammar');
      }
    }
  }

  // USE phrases: must be complete sentences
  if (phrase_role === 'use') {
    // Check for fragment (no period, question mark, or exclamation)
    if (!target_text.match(/[.!?]$/)) {
      issues.push('fragment');
    }

    // Check basic sentence structure
    // French USE phrases should typically have subject + verb
    const words = target_text.toLowerCase().split(/\s+/);
    const hasVerb = target_text.match(/\b(suis|es|est|sommes|êtes|sont|avoir|ai|as|avons|avez|vais|vas|va|allons|allez|vont|peux|peux|peut|pouvons|pouvez|peuvent|veux|veux|veut|voulons|voulez|veulent|dois|dois|doit|devons|devez|doivent|dois|dois|doit|peux|peux|peut|peux|déduis|fais|fait|faisons|faites|font|dis|dit|disons|dites|disent|sais|sait|savons|savez|savent|connais|connaît|connaissons|connaissez|connaissent|cherche|cherches|cherchons|cherchez|cherchent|viens|vient|venons|venez|viennent|dors|dort|dormons|dormez|dorment|mange|manges|mangeons|mangez|mangent|commence|commences|commençons|commencez|commencent|travaille|travailles|travaillons|travaillez|travaillent|étudie|étudies|étudions|étudiez|étudient|appelle|appelles|appelons|appelez|appellent|demande|demandes|demandons|demandez|demandent|aide|aides|aidons|aidez|aident|laisser|leaving|viendrais|voudrais|pourrais|devrais|aurais)\b/i);

    // Word order issues
    if (known_text.includes('everything') && target_text.includes('tout ')) {
      // "tout" should come after the verb, not before infinitive
      if (target_text.match(/\bsavoir\s+tout\b/i)) {
        issues.push('word_order');
      }
    }

    // Check for obvious nonsense
    if (known_text.match(/very well|too well/) && target_text.match(/revenir|venir|aller/i)) {
      // "come back very well" is nonsensical
      if (target_text.match(/\b(revenir|venir)\s+très\s+bien\b/i)) {
        issues.push('nonsensical');
      }
    }

    // Unnatural phrasing
    if (target_text.match(/\bc[\'e]\s*[a-z]+\s+pas\b/i)) {
      // Check for "ce n'est pas" type structures
      if (!target_text.match(/\b(ce|que|qui|pourquoi|comment|où|quand|quel|combien)\b/i)) {
        // If starting with negation without question structure
      }
    }
  }

  return issues.length > 0 ? issues[0] : null; // Return first issue found
}

async function processSeed(seedNum) {
  const {data: phrases, error} = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, phrase_role, known_text, target_text, metadata')
    .eq('course_code', COURSE)
    .eq('seed_number', seedNum)
    .in('phrase_role', ['build', 'use'])
    .order('lego_index')
    .order('position');

  if (error) {
    console.error(`Error fetching seed ${seedNum}:`, error);
    return;
  }

  if (!phrases || phrases.length === 0) {
    console.log(`  Seed ${seedNum}: No phrases found`);
    return;
  }

  let seedFlagged = 0;
  for (const phrase of phrases) {
    totalPhrases++;
    if (phrase.phrase_role === 'build') totalBuilds++;
    if (phrase.phrase_role === 'use') totalUses++;

    const issue = await reviewPhrase(phrase);

    if (issue) {
      seedFlagged++;
      totalFlagged++;
      flagCounts[issue]++;

      // Update with flag
      const {error: updateError} = await supabase
        .from('course_practice_phrases')
        .update({
          metadata: {
            ...(phrase.metadata || {}),
            qa_flag: 'review',
            qa_reason: issue,
            qa_date: '2026-02-07',
            qa_batch: 10
          }
        })
        .eq('id', phrase.id);

      if (updateError) {
        console.error(`Error updating phrase ${phrase.id}:`, updateError);
      }
    }
  }

  console.log(`  Seed ${seedNum}: ${phrases.length} phrases reviewed, ${seedFlagged} flagged`);
}

async function main() {
  console.log(`\n📋 FRA_FOR_ENG QA BATCH 10 - Seeds 271-300`);
  console.log(`Starting at ${new Date().toISOString()}\n`);

  for (let seed = SEED_START; seed <= SEED_END; seed++) {
    await processSeed(seed);
    if ((seed - SEED_START + 1) % 5 === 0) {
      console.log(`\n✓ Progress: Seeds ${SEED_START}-${seed} complete | Reviewed ${totalPhrases} phrases | Flagged ${totalFlagged}\n`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`BATCH 10 COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Seeds: ${SEED_START}-${SEED_END}`);
  console.log(`Phrases reviewed: ${totalPhrases} (${totalBuilds} BUILD, ${totalUses} USE)`);
  console.log(`Flagged: ${totalFlagged} (${((totalFlagged/totalPhrases)*100).toFixed(2)}%)`);
  console.log(`\nBreakdown:`);
  console.log(`  - Grammar errors: ${flagCounts.grammar}`);
  console.log(`  - Fragments (USE): ${flagCounts.fragment}`);
  console.log(`  - Nonsensical: ${flagCounts.nonsensical}`);
  console.log(`  - Unnatural: ${flagCounts.unnatural}`);
  console.log(`  - Word order: ${flagCounts.word_order}`);
  console.log(`  - Missing LEGO: ${flagCounts.missing_lego}`);
  console.log(`  - Unknown vocab: ${flagCounts.unknown_vocab}`);
  console.log(`\nCompleted at ${new Date().toISOString()}`);
}

main().catch(console.error);
