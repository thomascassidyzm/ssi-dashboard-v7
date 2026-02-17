#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzePhraseLengths() {
  const courseCode = 'bre_for_fra';

  // Sample 10 seeds from 20-260 range
  const seedsToSample = [];
  const min = 20, max = 260;
  const sampleSize = 10;

  // Generate random seeds
  const step = Math.floor((max - min) / sampleSize);
  for (let i = 0; i < sampleSize; i++) {
    seedsToSample.push(min + (i * step) + Math.floor(Math.random() * step));
  }
  seedsToSample.sort((a, b) => a - b);

  console.log(`\nSampling seeds: ${seedsToSample.join(', ')}\n`);

  // Fetch phrases for these seeds
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, phrase_role, known_text, target_text')
    .eq('course_code', courseCode)
    .in('seed_number', seedsToSample);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Fetched ${phrases.length} phrases\n`);

  // Analyze by seed
  const seedStats = {};

  phrases.forEach(p => {
    const seed = p.seed_number;
    const role = p.phrase_role;
    const targetLen = p.target_text.length;

    if (!seedStats[seed]) {
      seedStats[seed] = {
        build: [],
        use: [],
        practice: [],
        component: []
      };
    }

    if (seedStats[seed][role]) {
      seedStats[seed][role].push(targetLen);
    }
  });

  // Calculate stats
  function calcStats(lengths) {
    if (lengths.length === 0) return { count: 0, min: 0, max: 0, avg: 0, median: 0 };

    const sorted = [...lengths].sort((a, b) => a - b);
    const sum = lengths.reduce((a, b) => a + b, 0);

    return {
      count: lengths.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(sum / lengths.length * 10) / 10,
      median: sorted[Math.floor(sorted.length / 2)]
    };
  }

  // Print per-seed analysis
  console.log('=' .repeat(80));
  console.log('SEED-BY-SEED ANALYSIS (target_text character length)');
  console.log('=' .repeat(80));

  seedsToSample.forEach(seed => {
    if (!seedStats[seed]) {
      console.log(`\nSeed ${seed}: No phrases found`);
      return;
    }

    const stats = seedStats[seed];
    const buildStats = calcStats(stats.build);
    const useStats = calcStats(stats.use);

    console.log(`\nSeed ${seed}:`);
    console.log(`  BUILD:   ${buildStats.count} phrases | avg: ${buildStats.avg} chars | range: ${buildStats.min}-${buildStats.max}`);
    console.log(`  USE:     ${useStats.count} phrases | avg: ${useStats.avg} chars | range: ${useStats.min}-${useStats.max}`);

    if (useStats.avg > 0 && buildStats.avg > 0) {
      const ratio = (useStats.avg / buildStats.avg).toFixed(1);
      console.log(`  📊 USE phrases are ${ratio}x longer than BUILD phrases`);
    }
  });

  // Overall statistics
  console.log('\n' + '=' .repeat(80));
  console.log('OVERALL STATISTICS');
  console.log('=' .repeat(80));

  const allBuild = phrases.filter(p => p.phrase_role === 'build').map(p => p.target_text.length);
  const allUse = phrases.filter(p => p.phrase_role === 'use').map(p => p.target_text.length);
  const allPractice = phrases.filter(p => p.phrase_role === 'practice').map(p => p.target_text.length);
  const allComponent = phrases.filter(p => p.phrase_role === 'component').map(p => p.target_text.length);

  const buildStats = calcStats(allBuild);
  const useStats = calcStats(allUse);
  const practiceStats = calcStats(allPractice);
  const componentStats = calcStats(allComponent);

  console.log(`\nBUILD phrases (${buildStats.count}):`);
  console.log(`  Min: ${buildStats.min} | Max: ${buildStats.max} | Avg: ${buildStats.avg} | Median: ${buildStats.median}`);

  console.log(`\nUSE phrases (${useStats.count}):`);
  console.log(`  Min: ${useStats.min} | Max: ${useStats.max} | Avg: ${useStats.avg} | Median: ${useStats.median}`);

  console.log(`\nPRACTICE phrases (${practiceStats.count}):`);
  console.log(`  Min: ${practiceStats.min} | Max: ${practiceStats.max} | Avg: ${practiceStats.avg} | Median: ${practiceStats.median}`);

  console.log(`\nCOMPONENT phrases (${componentStats.count}):`);
  console.log(`  Min: ${componentStats.min} | Max: ${componentStats.max} | Avg: ${componentStats.avg} | Median: ${componentStats.median}`);

  // Length distribution
  console.log('\n' + '=' .repeat(80));
  console.log('LENGTH DISTRIBUTION');
  console.log('=' .repeat(80));

  function distributionBuckets(lengths) {
    const buckets = {
      'short (1-10)': 0,
      'medium (11-25)': 0,
      'long (26-40)': 0,
      'very long (41+)': 0
    };

    lengths.forEach(len => {
      if (len <= 10) buckets['short (1-10)']++;
      else if (len <= 25) buckets['medium (11-25)']++;
      else if (len <= 40) buckets['long (26-40)']++;
      else buckets['very long (41+)']++;
    });

    return buckets;
  }

  const buildDist = distributionBuckets(allBuild);
  const useDist = distributionBuckets(allUse);

  console.log('\nBUILD phrases:');
  Object.entries(buildDist).forEach(([bucket, count]) => {
    const pct = ((count / buildStats.count) * 100).toFixed(1);
    console.log(`  ${bucket.padEnd(20)}: ${String(count).padStart(4)} (${pct}%)`);
  });

  console.log('\nUSE phrases:');
  Object.entries(useDist).forEach(([bucket, count]) => {
    const pct = ((count / useStats.count) * 100).toFixed(1);
    console.log(`  ${bucket.padEnd(20)}: ${String(count).padStart(4)} (${pct}%)`);
  });

  console.log('\n' + '=' .repeat(80));
  console.log('DIAGNOSIS');
  console.log('=' .repeat(80));

  const buildAvg = buildStats.avg;
  const useAvg = useStats.avg;

  console.log(`\n✓ BUILD phrases average ${buildAvg} characters`);
  console.log(`✓ USE phrases average ${useAvg} characters`);
  console.log(`\n📊 USE phrases are ${(useAvg / buildAvg).toFixed(1)}x longer than BUILD phrases`);

  const mediumBuild = buildDist['medium (11-25)'];
  const mediumUse = useDist['medium (11-25)'];
  const mediumTotal = mediumBuild + mediumUse;
  const totalPhrases = buildStats.count + useStats.count;
  const mediumPct = ((mediumTotal / totalPhrases) * 100).toFixed(1);

  console.log(`\n📊 Medium-length phrases (11-25 chars):`);
  console.log(`   BUILD: ${mediumBuild} | USE: ${mediumUse} | Total: ${mediumTotal} (${mediumPct}% of sample)`);

  if (mediumPct < 30) {
    console.log(`\n⚠️  Only ${mediumPct}% are medium-length - may need more medium phrases!`);
  } else {
    console.log(`\n✓ ${mediumPct}% are medium-length - good variety!`);
  }
}

analyzePhraseLengths();
