#!/usr/bin/env node

// Analyze phrase lengths for a single course
// Usage: node analyze-single-course-lengths.cjs <course_code>

const { createClient } = require('@supabase/supabase-js');

const courseCode = process.argv[2];
if (!courseCode) {
  console.error('Usage: node analyze-single-course-lengths.cjs <course_code>');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzeCourse() {
  // Fetch ALL phrases for the course
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('phrase_role, target_text')
    .eq('course_code', courseCode);

  if (error) {
    console.error(`ERROR for ${courseCode}:`, error.message);
    return;
  }

  if (!phrases || phrases.length === 0) {
    console.log(`${courseCode}: No phrases found`);
    return;
  }

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

  function distributionBuckets(lengths) {
    const buckets = { short: 0, medium: 0, long: 0, veryLong: 0 };
    lengths.forEach(len => {
      if (len <= 10) buckets.short++;
      else if (len <= 25) buckets.medium++;
      else if (len <= 40) buckets.long++;
      else buckets.veryLong++;
    });
    return buckets;
  }

  const buildLengths = phrases.filter(p => p.phrase_role === 'build').map(p => p.target_text.length);
  const useLengths = phrases.filter(p => p.phrase_role === 'use').map(p => p.target_text.length);

  const buildStats = calcStats(buildLengths);
  const useStats = calcStats(useLengths);

  const buildDist = distributionBuckets(buildLengths);
  const useDist = distributionBuckets(useLengths);

  const mediumCount = buildDist.medium + useDist.medium;
  const totalPhrases = buildStats.count + useStats.count;
  const mediumPct = totalPhrases > 0 ? ((mediumCount / totalPhrases) * 100).toFixed(1) : 0;

  const ratio = buildStats.avg > 0 && useStats.avg > 0 ? (useStats.avg / buildStats.avg).toFixed(1) : 'N/A';

  // Output in parseable format
  console.log(JSON.stringify({
    course: courseCode,
    build: {
      count: buildStats.count,
      avg: buildStats.avg,
      dist: {
        short: buildDist.short,
        medium: buildDist.medium,
        long: buildDist.long,
        veryLong: buildDist.veryLong
      }
    },
    use: {
      count: useStats.count,
      avg: useStats.avg,
      dist: {
        short: useDist.short,
        medium: useDist.medium,
        long: useDist.long,
        veryLong: useDist.veryLong
      }
    },
    mediumPct: parseFloat(mediumPct),
    ratio: ratio === 'N/A' ? null : parseFloat(ratio)
  }));
}

analyzeCourse().catch(err => {
  console.error(`FATAL ERROR for ${courseCode}:`, err.message);
  process.exit(1);
});
