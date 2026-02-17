/**
 * Analyze fra_for_eng learner journey for seeds 1-50
 */
require('dotenv').config();
const { getClient } = require('../services/supabase-client.cjs');

async function main() {
  const supabase = getClient();
  if (!supabase) {
    console.error('Supabase not initialized');
    process.exit(1);
  }

  // Get all LEGOs for seeds 1-50
  const { data: legos, error: legosError } = await supabase
    .from('course_legos')
    .select('*')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number')
    .order('lego_index');

  if (legosError) {
    console.error('LEGOs error:', legosError);
    process.exit(1);
  }

  // Get all practice phrases
  const { data: phrases, error: phrasesError } = await supabase
    .from('course_practice_phrases')
    .select('*')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number')
    .order('lego_index')
    .order('position');

  if (phrasesError) {
    console.error('Phrases error:', phrasesError);
    process.exit(1);
  }

  // Get seed info
  const { data: seeds, error: seedsError } = await supabase
    .from('course_seeds')
    .select('*')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number');

  if (seedsError) {
    console.error('Seeds error:', seedsError);
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('LEARNER JOURNEY ANALYSIS: fra_for_eng (Seeds 1-50)');
  console.log('='.repeat(80));
  console.log(`\nTotal: ${seeds.length} seeds, ${legos.length} LEGOs, ${phrases.length} phrases\n`);

  // Group by seed
  const seedMap = {};
  for (const seed of seeds) {
    seedMap[seed.seed_number] = {
      ...seed,
      legos: [],
      phrases: []
    };
  }
  for (const lego of legos) {
    if (seedMap[lego.seed_number]) {
      seedMap[lego.seed_number].legos.push(lego);
    }
  }
  for (const phrase of phrases) {
    if (seedMap[phrase.seed_number]) {
      seedMap[phrase.seed_number].phrases.push(phrase);
    }
  }

  // Track vocabulary as learner progresses
  const vocabIntroduced = new Map(); // known_text -> { seed, lego_id, target }
  const issues = [];
  const highlights = [];

  // Analyze each seed in order
  for (let seedNum = 1; seedNum <= 50; seedNum++) {
    const seedData = seedMap[seedNum];
    if (!seedData) continue;

    console.log('\n' + '='.repeat(80));
    console.log(`SEED ${seedNum}: "${seedData.known_text}"`);
    console.log(`         "${seedData.target_text}"`);
    console.log('-'.repeat(80));

    // Track LEGOs introduced this seed
    const seedNewLegos = [];
    const seedReusedLegos = [];

    for (const lego of seedData.legos) {
      const key = lego.known_text.toLowerCase();

      if (lego.is_new) {
        seedNewLegos.push(lego);
        vocabIntroduced.set(key, {
          seed: seedNum,
          lego_id: lego.lego_id,
          target: lego.target_text
        });
      } else {
        seedReusedLegos.push(lego);
      }

      console.log(`\n  LEGO ${lego.lego_index}: ${lego.is_new ? 'NEW' : 'reuse'} (${lego.type}) "${lego.known_text}" -> "${lego.target_text}"`);

      // Get phrases for this lego
      const legoIdx = lego.lego_index;
      const legoPhrases = seedData.phrases.filter(p => p.lego_index === legoIdx);

      const buildPhrases = legoPhrases.filter(p => p.phrase_role === 'build');
      const usePhrases = legoPhrases.filter(p => p.phrase_role === 'use');

      if (buildPhrases.length > 0) {
        console.log(`    BUILD (${buildPhrases.length}):`);
        for (const p of buildPhrases.slice(0, 3)) {
          console.log(`      - "${p.known_text}" -> "${p.target_text}"`);
        }
        if (buildPhrases.length > 3) {
          console.log(`      ... and ${buildPhrases.length - 3} more`);
        }
      }

      if (usePhrases.length > 0) {
        console.log(`    USE (${usePhrases.length}):`);
        for (const p of usePhrases.slice(0, 3)) {
          const scoreNote = p.score ? ` [score:${p.score}]` : '';
          console.log(`      - "${p.known_text}" -> "${p.target_text}"${scoreNote}`);
        }
        if (usePhrases.length > 3) {
          console.log(`      ... and ${usePhrases.length - 3} more`);
        }
      }

      // Check for issues
      if (lego.is_new && buildPhrases.length === 0 && seedNum > 1) {
        issues.push({
          type: 'NO_BUILD',
          seed: seedNum,
          lego: lego.lego_id,
          detail: `No BUILD phrases for new LEGO "${lego.known_text}"`
        });
      }

      if (lego.is_new && usePhrases.length < 3 && seedNum > 5) {
        issues.push({
          type: 'FEW_USE',
          seed: seedNum,
          lego: lego.lego_id,
          detail: `Only ${usePhrases.length} USE phrases for "${lego.known_text}"`
        });
      }

      // Check vocabulary constraints on phrases
      for (const p of legoPhrases) {
        // Simple vocabulary check: look for words that might not be introduced yet
        const knownWords = p.known_text.toLowerCase().split(/\s+/);
        // Skip checking for now - would need more sophisticated analysis
      }
    }

    // Highlight good patterns
    if (seedNewLegos.length > 0 && seedReusedLegos.length > 0) {
      highlights.push({
        seed: seedNum,
        detail: `Good reuse pattern: ${seedReusedLegos.length} reused LEGOs with ${seedNewLegos.length} new`
      });
    }
  }

  // Summary Report
  console.log('\n\n' + '='.repeat(80));
  console.log('SUMMARY ANALYSIS');
  console.log('='.repeat(80));

  // Count statistics
  const newLegos = legos.filter(l => l.is_new);
  const reusedLegos = legos.filter(l => !l.is_new);
  const aLegos = legos.filter(l => l.type === 'A');
  const mLegos = legos.filter(l => l.type === 'M');
  const buildPhrases = phrases.filter(p => p.phrase_role === 'build');
  const usePhrases = phrases.filter(p => p.phrase_role === 'use');

  console.log(`\nLEGO Statistics:`);
  console.log(`  Total LEGOs: ${legos.length}`);
  console.log(`  New LEGOs: ${newLegos.length}`);
  console.log(`  Reused LEGOs: ${reusedLegos.length}`);
  console.log(`  A-type (Atomic): ${aLegos.length}`);
  console.log(`  M-type (Molecular): ${mLegos.length}`);

  console.log(`\nPhrase Statistics:`);
  console.log(`  Total phrases: ${phrases.length}`);
  console.log(`  BUILD phrases: ${buildPhrases.length}`);
  console.log(`  USE phrases: ${usePhrases.length}`);
  console.log(`  Avg phrases per LEGO: ${(phrases.length / legos.length).toFixed(1)}`);

  // Vocabulary progression
  console.log(`\nVocabulary Progression:`);
  console.log(`  Unique vocabulary items introduced: ${vocabIntroduced.size}`);

  // Show when key vocabulary was introduced
  const keyVocab = ['I want', 'to speak', 'French', 'to learn', 'how', 'now', 'with you', 'I\'m going', 'to try'];
  console.log(`\n  Key vocabulary introduction:`);
  for (const v of keyVocab) {
    const info = vocabIntroduced.get(v.toLowerCase());
    if (info) {
      console.log(`    "${v}" -> Seed ${info.seed}`);
    }
  }

  // Issues summary
  if (issues.length > 0) {
    console.log(`\n\nISSUES FOUND (${issues.length}):`);
    const grouped = {};
    for (const issue of issues) {
      if (!grouped[issue.type]) grouped[issue.type] = [];
      grouped[issue.type].push(issue);
    }
    for (const [type, items] of Object.entries(grouped)) {
      console.log(`\n  ${type} (${items.length}):`);
      for (const item of items.slice(0, 5)) {
        console.log(`    - Seed ${item.seed}, ${item.lego}: ${item.detail}`);
      }
      if (items.length > 5) {
        console.log(`    ... and ${items.length - 5} more`);
      }
    }
  }

  // Check for M-LEGO / A-LEGO ordering
  console.log(`\n\nOVERLAPPING LEGO CHECK:`);
  let overlapsFound = 0;
  for (const lego of mLegos) {
    if (lego.components) {
      for (const comp of lego.components) {
        const compKey = comp.known.toLowerCase();
        const legoInfo = vocabIntroduced.get(compKey);
        if (legoInfo && legoInfo.seed <= lego.seed_number) {
          // Good - component was introduced before or in same seed
        } else {
          // Component not introduced as separate A-LEGO
        }
        overlapsFound++;
      }
    }
  }
  console.log(`  M-LEGOs with components: ${mLegos.filter(l => l.components).length}`);
  console.log(`  Total component overlaps: ${overlapsFound}`);

  // Phrase length analysis
  console.log(`\n\nPHRASE LENGTH ANALYSIS (syllable proxy - word count):`);
  const buildWordCounts = buildPhrases.map(p => p.target_text.split(/\s+/).length);
  const useWordCounts = usePhrases.map(p => p.target_text.split(/\s+/).length);

  const avg = arr => arr.length ? (arr.reduce((a,b) => a+b, 0) / arr.length).toFixed(1) : 0;
  const min = arr => arr.length ? Math.min(...arr) : 0;
  const max = arr => arr.length ? Math.max(...arr) : 0;

  console.log(`  BUILD phrases: avg ${avg(buildWordCounts)} words, range ${min(buildWordCounts)}-${max(buildWordCounts)}`);
  console.log(`  USE phrases: avg ${avg(useWordCounts)} words, range ${min(useWordCounts)}-${max(useWordCounts)}`);

  // Sample some phrases for quality review
  console.log(`\n\nSAMPLE PHRASES FOR QUALITY REVIEW:`);
  console.log(`\n  First 5 USE phrases (Seed 1):`);
  const seed1Use = usePhrases.filter(p => p.seed_number === 1).slice(0, 5);
  for (const p of seed1Use) {
    console.log(`    - "${p.known_text}" -> "${p.target_text}"`);
  }

  console.log(`\n  USE phrases from Seed 25 (mid-point):`);
  const seed25Use = usePhrases.filter(p => p.seed_number === 25).slice(0, 5);
  for (const p of seed25Use) {
    console.log(`    - "${p.known_text}" -> "${p.target_text}"`);
  }

  console.log(`\n  USE phrases from Seed 50 (end):`);
  const seed50Use = usePhrases.filter(p => p.seed_number === 50).slice(0, 5);
  for (const p of seed50Use) {
    console.log(`    - "${p.known_text}" -> "${p.target_text}"`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('END OF ANALYSIS');
  console.log('='.repeat(80));
}

main().catch(console.error);
