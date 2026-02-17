require('dotenv').config();
const {createClient} = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const stats = {
  seedsReviewed: 0,
  phrasesReviewed: 0,
  buildPhrases: 0,
  usePhrases: 0,
  flagged: 0,
  grammar: 0,
  fragment: 0,
  nonsensical: 0,
  unnatural: 0,
  wordOrder: 0,
  missingLego: 0,
  issues: []
};

// French grammar expertise check
function checkGrammar(known, target, isUse) {
  const issues = [];

  // Check common French grammar patterns

  // Pronoun + preposition combinations
  if (target.includes('avec tu') || target.includes('avec tu ')) issues.push('syntax: "tu" → "toi" after preposition');
  if (target.includes('sans tu') || target.includes('sans tu ')) issues.push('syntax: "tu" → "toi" after preposition');
  if (target.includes('pour tu') || target.includes('pour tu ')) issues.push('syntax: "tu" → "toi" after preposition');
  if (target.includes('chez tu ')) issues.push('syntax: "tu" → "toi" after preposition');

  // Article agreement
  const articleRegex = /\b(le|la|les)\s+([aeiouàâäéèêëïîôöœæ])/;
  if (target.match(articleRegex)) issues.push('article-vowel: might need l\'');

  // Infinitive without prepositions (common error: "apprendre parler" → "apprendre à parler")
  if (target.includes('apprendre parler')) issues.push('missing preposition: "apprendre à parler"');
  if (target.includes('essayer faire')) issues.push('missing preposition: "essayer de faire"');
  if (target.includes('essayer parler')) issues.push('missing preposition: "essayer de parler"');
  if (target.includes('commencer à')) {
    // "commencer à" is correct, so check for missing it
    if (known.includes('start to') && !target.includes('à')) issues.push('missing preposition: "commencer à"');
  }

  // Object pronoun word order
  if (target.includes('savoir tout')) issues.push('word order: "tout savoir" not "savoir tout"');
  if (target.includes('faire quelque chose')) {
    if (known.includes('do something')) {
      // This is actually correct, check pattern
    }
  }

  // Reflexive verb checks
  if (target.includes('s\'appeler') || target.includes('se appeler')) {
    if (target.includes('se appeler')) issues.push('reflexive: "s\'appeler" not "se appeler"');
  }

  // Avoir vs être for passé composé
  if (isUse && target.includes('je suis allé') && !known.includes('went')) {
    // This is correct pattern, no flag
  }

  // Agreement in passé composé with avoir
  if (target.includes('je l\'ai vu') && !known.includes('seen him')) {
    issues.push('passé composé agreement: check "vu" vs "vue" vs "vus" vs "vues"');
  }

  // Double negation checks
  if (target.includes('ne...pas') && target.split('ne').length > 2) {
    // Multiple negations might be intentional, check context
  }

  return issues;
}

function checkCompleteness(known, target, phraseRole) {
  const issues = [];

  // For BUILD phrases: fragments expected, just check grammar
  if (phraseRole === 'build') {
    return issues;
  }

  // For USE phrases: must be complete sentences
  if (phraseRole === 'use') {
    // Check for ending punctuation in French
    if (!target.match(/[.!?;:]$/)) {
      issues.push('fragment: missing ending punctuation');
      return issues;
    }

    // Check for basic sentence structure (subject + verb)
    const hasVerb = /\b(suis|es|est|sommes|êtes|sont|ai|as|a|avons|avez|ont|vais|vas|va|allons|allez|vont|dois|doit|devons|devez|doivent|veux|veut|voulons|voulez|veulent|peux|peut|pouvons|pouvez|peuvent|dis|dit|disons|dites|disent|fais|fait|faisons|faites|font|vois|voit|voyons|voyez|voient|viens|vient|venons|venez|viennent|comprends|comprend|comprenons|comprenez|comprennent|prends|prend|prenons|prenez|prennent|mets|met|mettons|mettez|mettent|tiens|tient|tenons|tenez|tiennent|donne|donnes|donnent|regarde|regardes|regardent|travaille|travailles|travaillent|parle|parles|parlent|écoute|écoutes|écoutent|lève|lèves|lèvent|assieds|assied|asseyons|asseyez|assieds|asseyez|paie|paies|paient|crie|cries|crient|essaie|essaies|essaient|suis|suis|suivons|suivez|suivent|commence|commences|commencent|demande|demandes|demandent|crois|croit|croyons|croyez|croient)\b/i;

    if (!hasVerb.test(target)) {
      issues.push('fragment: no recognizable verb');
    }

    // Check for common nonsensical patterns
    if (known.includes('very well') && target.includes('très bien') &&
        (known.includes('come back') || known.includes('want'))) {
      if (known === 'He wants to come back very well') {
        issues.push('nonsensical: mixing intention with adverb of manner');
      }
    }
  }

  return issues;
}

function isUnnatural(known, target, phraseRole) {
  const issues = [];

  // Check known side for naturalness first
  if (phraseRole === 'use') {
    // Some awkward English patterns
    if (known.includes('I would like that you') || known.includes('I want that you')) {
      issues.push('unnatural (known): awkward English phrasing');
    }

    // Check for overly formal/stiff patterns
    if (known.match(/I\s+(?:would\s+)?request\s+(?:that\s+)?you/) &&
        !target.match(/je\s+(?:vous\s+)?(?:prie|demande|sollicite|demande)/i)) {
      // Pattern exists but translation might be off
    }
  }

  return issues;
}

async function reviewSeed(seedNum) {
  try {
    const {data: phrases, error} = await supabase
      .from('course_practice_phrases')
      .select('*')
      .eq('course_code', 'fra_for_eng')
      .eq('seed_number', seedNum)
      .in('phrase_role', ['build', 'use'])
      .order('lego_index')
      .order('phrase_role')
      .order('position');

    if (error) {
      console.error(`  Error loading seed ${seedNum}:`, error.message);
      return;
    }

    if (!phrases || phrases.length === 0) {
      console.log(`  Seed ${seedNum}: No phrases found`);
      return;
    }

    let seedIssues = [];

    for (const phrase of phrases) {
      stats.phrasesReviewed++;
      if (phrase.phrase_role === 'build') stats.buildPhrases++;
      if (phrase.phrase_role === 'use') stats.usePhrases++;

      const issues = [];

      // Check grammar
      const grammarIssues = checkGrammar(phrase.known_text, phrase.target_text, phrase.phrase_role === 'use');
      issues.push(...grammarIssues);

      // Check completeness (fragments in USE)
      const completenessIssues = checkCompleteness(phrase.known_text, phrase.target_text, phrase.phrase_role);
      issues.push(...completenessIssues);

      // Check naturalness
      const naturalIssues = isUnnatural(phrase.known_text, phrase.target_text, phrase.phrase_role);
      issues.push(...naturalIssues);

      // Flag if issues found
      if (issues.length > 0) {
        stats.flagged++;

        // Categorize
        const allIssues = [...grammarIssues, ...completenessIssues, ...naturalIssues];
        if (grammarIssues.length > 0) stats.grammar++;
        if (completenessIssues.some(i => i.includes('fragment'))) stats.fragment++;
        if (completenessIssues.some(i => i.includes('nonsensical'))) stats.nonsensical++;
        if (naturalIssues.length > 0) stats.unnatural++;
        if (grammarIssues.some(i => i.includes('word order'))) stats.wordOrder++;

        seedIssues.push({
          phraseId: phrase.id,
          role: phrase.phrase_role,
          known: phrase.known_text,
          target: phrase.target_text,
          issues: allIssues
        });

        // Update database with flag
        const reason = allIssues[0].split(':')[0]; // First category
        await supabase
          .from('course_practice_phrases')
          .update({
            metadata: {
              ...(phrase.metadata || {}),
              qa_flag: 'review',
              qa_reason: reason,
              qa_detail: allIssues.join('; '),
              qa_date: '2026-02-07',
              qa_batch: 7
            }
          })
          .eq('id', phrase.id);
      }
    }

    if (seedIssues.length > 0) {
      stats.issues.push({seed: seedNum, issues: seedIssues});
      console.log(`  ⚠️  Seed ${seedNum}: ${seedIssues.length} issue(s) found`);
      seedIssues.slice(0, 2).forEach(i => {
        console.log(`    - [${i.role}] ${i.issues[0]}`);
      });
    } else {
      console.log(`  ✅ Seed ${seedNum}: All clear`);
    }
  } catch (err) {
    console.error(`Error reviewing seed ${seedNum}:`, err.message);
  }
}

async function main() {
  console.log('BATCH 7 QA: Seeds 181-210');
  console.log('=' .repeat(50));

  for (let seed = 181; seed <= 210; seed++) {
    await reviewSeed(seed);

    // Report progress every 5 seeds
    if ((seed - 180) % 5 === 0) {
      console.log(`\n📊 Progress: Seeds 181-${seed} | ${stats.phrasesReviewed} phrases reviewed | ${stats.flagged} flagged\n`);
    }
  }

  // Final report
  console.log('\n' + '='.repeat(50));
  console.log('BATCH 7 COMPLETE');
  console.log('='.repeat(50));
  console.log(`Seeds reviewed: 181-210 (${stats.seedsReviewed || 30} seeds)`);
  console.log(`Phrases reviewed: ${stats.phrasesReviewed} (${stats.buildPhrases} BUILD, ${stats.usePhrases} USE)`);
  console.log(`Flagged: ${stats.flagged} (${((stats.flagged / stats.phrasesReviewed) * 100).toFixed(2)}%)`);
  console.log('\nBy issue type:');
  console.log(`  - Grammar: ${stats.grammar}`);
  console.log(`  - Fragments (USE): ${stats.fragment}`);
  console.log(`  - Nonsensical: ${stats.nonsensical}`);
  console.log(`  - Unnatural: ${stats.unnatural}`);
  console.log(`  - Word order: ${stats.wordOrder}`);

  if (stats.issues.length > 0) {
    console.log('\n📋 Issue summary:');
    stats.issues.slice(0, 10).forEach(seedIssue => {
      console.log(`\n  Seed ${seedIssue.seed}:`);
      seedIssue.issues.slice(0, 3).forEach(issue => {
        console.log(`    [${issue.role}] ${issue.issues[0]}`);
        console.log(`      "${issue.known}" → "${issue.target}"`);
      });
    });
  }
}

main().catch(console.error);
