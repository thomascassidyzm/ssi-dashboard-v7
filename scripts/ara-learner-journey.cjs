/**
 * Detailed learner journey analysis for ara_for_eng seeds 1-50
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  // Get seeds
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('*')
    .eq('course_code', 'ara_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number');

  // Get all LEGOs for seeds 1-50
  const { data: legos } = await supabase
    .from('course_legos')
    .select('*')
    .eq('course_code', 'ara_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number')
    .order('lego_index');

  // Get all practice phrases for seeds 1-50
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('*')
    .eq('course_code', 'ara_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number')
    .order('lego_index')
    .order('position');

  // Group by seed
  const seedMap = {};
  for (const seed of seeds) {
    seedMap[seed.seed_number] = {
      known: seed.known_text,
      target: seed.target_text,
      legos: [],
      phrases: []
    };
  }

  // Add LEGOs to seeds
  for (const lego of legos) {
    if (seedMap[lego.seed_number]) {
      seedMap[lego.seed_number].legos.push(lego);
    }
  }

  // Add phrases to seeds
  for (const phrase of phrases) {
    if (seedMap[phrase.seed_number]) {
      seedMap[phrase.seed_number].phrases.push(phrase);
    }
  }

  // Track vocabulary introduced
  const introducedVocab = new Map(); // target_text -> seed where introduced

  // Analyze each seed
  const analysis = [];

  for (let seedNum = 1; seedNum <= 50; seedNum++) {
    const seed = seedMap[seedNum];
    if (!seed) continue;

    const seedAnalysis = {
      seedNum,
      known: seed.known,
      target: seed.target,
      legoCount: seed.legos.length,
      legos: [],
      issues: [],
      vocabViolations: []
    };

    // Group phrases by LEGO
    const phrasesByLego = {};
    for (const p of seed.phrases) {
      if (!phrasesByLego[p.lego_index]) {
        phrasesByLego[p.lego_index] = [];
      }
      phrasesByLego[p.lego_index].push(p);
    }

    // Analyze each LEGO
    for (const lego of seed.legos) {
      const legoPhrasesAll = phrasesByLego[lego.lego_index] || [];

      const components = legoPhrasesAll.filter(p => p.phrase_role === 'component');
      const practice = legoPhrasesAll.filter(p => p.phrase_role === 'practice');
      const build = legoPhrasesAll.filter(p => p.phrase_role === 'build');
      const use = legoPhrasesAll.filter(p => p.phrase_role === 'use');

      const legoAnalysis = {
        index: lego.lego_index,
        type: lego.type || 'unknown',
        known: lego.known_text,
        target: lego.target_text,
        isNew: lego.is_new,
        componentCount: components.length,
        practiceCount: practice.length,
        buildCount: build.length,
        useCount: use.length,
        components: components.map(c => ({ known: c.known_text, target: c.target_text })),
        build: build.map(b => ({ known: b.known_text, target: b.target_text, syllables: b.target_syllable_count })),
        use: use.map(u => ({ known: u.known_text, target: u.target_text, syllables: u.target_syllable_count }))
      };

      // Track vocabulary introduction
      if (!introducedVocab.has(lego.target_text)) {
        introducedVocab.set(lego.target_text, seedNum);
      }
      for (const comp of components) {
        if (!introducedVocab.has(comp.target_text)) {
          introducedVocab.set(comp.target_text, seedNum);
        }
      }

      seedAnalysis.legos.push(legoAnalysis);

      // Check for issues
      if (build.length === 0 && use.length === 0) {
        seedAnalysis.issues.push(`LEGO ${lego.lego_index}: No BUILD or USE phrases`);
      }
      if (use.length > 0 && use.length < 5 && seedNum > 5) {
        seedAnalysis.issues.push(`LEGO ${lego.lego_index}: Only ${use.length} USE phrases (minimum 5 expected after seed 5)`);
      }
    }

    analysis.push(seedAnalysis);
  }

  // Output detailed report
  console.log('=' .repeat(80));
  console.log('LEARNER JOURNEY ANALYSIS: ara_for_eng Seeds 1-50');
  console.log('=' .repeat(80));
  console.log('');

  // Summary stats
  let totalLegos = 0;
  let totalBuild = 0;
  let totalUse = 0;
  let seedsWithIssues = 0;

  for (const s of analysis) {
    totalLegos += s.legoCount;
    for (const l of s.legos) {
      totalBuild += l.buildCount;
      totalUse += l.useCount;
    }
    if (s.issues.length > 0) seedsWithIssues++;
  }

  console.log('SUMMARY:');
  console.log(`  Seeds analyzed: ${analysis.length}`);
  console.log(`  Total LEGOs: ${totalLegos}`);
  console.log(`  Total BUILD phrases: ${totalBuild}`);
  console.log(`  Total USE phrases: ${totalUse}`);
  console.log(`  Seeds with issues: ${seedsWithIssues}`);
  console.log(`  Unique vocabulary items: ${introducedVocab.size}`);
  console.log('');
  console.log('=' .repeat(80));
  console.log('');

  // Output each seed
  for (const s of analysis) {
    console.log(`--- SEED ${s.seedNum} ---`);
    console.log(`KNOWN: "${s.known}"`);
    console.log(`TARGET: "${s.target}"`);
    console.log(`LEGOs: ${s.legoCount}`);
    console.log('');

    for (const l of s.legos) {
      console.log(`  [LEGO ${l.index}] "${l.known}" => "${l.target}" ${l.isNew ? '(NEW)' : '(SEEN)'}`);

      if (l.components.length > 0) {
        console.log(`    Components (${l.componentCount}):`);
        for (const c of l.components) {
          console.log(`      - "${c.known}" => "${c.target}"`);
        }
      }

      if (l.build.length > 0) {
        console.log(`    BUILD (${l.buildCount}):`);
        for (const b of l.build) {
          console.log(`      - "${b.known}" => "${b.target}" [${b.syllables || '?'} syl]`);
        }
      }

      if (l.use.length > 0) {
        console.log(`    USE (${l.useCount}):`);
        for (const u of l.use) {
          console.log(`      - "${u.known}" => "${u.target}" [${u.syllables || '?'} syl]`);
        }
      }
      console.log('');
    }

    if (s.issues.length > 0) {
      console.log('  ISSUES:');
      for (const issue of s.issues) {
        console.log(`    [!] ${issue}`);
      }
      console.log('');
    }

    console.log('');
  }

  // Output issues summary
  console.log('=' .repeat(80));
  console.log('ISSUES FOUND:');
  console.log('=' .repeat(80));

  for (const s of analysis) {
    if (s.issues.length > 0) {
      console.log(`\nSeed ${s.seedNum}:`);
      for (const issue of s.issues) {
        console.log(`  - ${issue}`);
      }
    }
  }

  // Analyze phrase quality
  console.log('\n');
  console.log('=' .repeat(80));
  console.log('PHRASE QUALITY SAMPLES:');
  console.log('=' .repeat(80));

  // Sample some USE phrases from different seeds
  console.log('\nUSE Phrase Samples (checking for complete sentences):');
  for (const s of [analysis[0], analysis[9], analysis[24], analysis[49]]) {
    if (!s) continue;
    console.log(`\n  Seed ${s.seedNum}:`);
    for (const l of s.legos.slice(0, 2)) {
      for (const u of l.use.slice(0, 3)) {
        const isCompleteSentence = u.known.endsWith('.') || u.known.endsWith('?') || u.known.endsWith('!') || u.known.length > 15;
        console.log(`    "${u.known}" => "${u.target}" ${isCompleteSentence ? '[OK]' : '[SHORT?]'}`);
      }
    }
  }

  // Check BUILD phrase lengths
  console.log('\n\nBUILD Phrase Length Analysis:');
  let shortBuild = 0;
  let longBuild = 0;
  for (const s of analysis) {
    for (const l of s.legos) {
      for (const b of l.build) {
        if (b.syllables && b.syllables <= 5) shortBuild++;
        else if (b.syllables && b.syllables > 10) longBuild++;
      }
    }
  }
  console.log(`  BUILD phrases with <= 5 syllables: ${shortBuild}`);
  console.log(`  BUILD phrases with > 10 syllables: ${longBuild} (may be too long)`);

  // Check vocabulary progression
  console.log('\n\nVocabulary Introduction Order (first 30 items):');
  const vocabList = Array.from(introducedVocab.entries()).slice(0, 30);
  for (const [vocab, seed] of vocabList) {
    console.log(`  Seed ${seed}: "${vocab}"`);
  }
}

main().catch(console.error);
