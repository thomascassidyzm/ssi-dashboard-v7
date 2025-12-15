#!/usr/bin/env node
/**
 * Check courses imported to database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCourses() {
  console.log('=== COURSES IN DATABASE ===\n');

  // Get seed counts by course
  const { data: seeds, error: seedErr } = await supabase
    .from('seeds')
    .select('course_code');

  if (seedErr) {
    console.error('Error fetching seeds:', seedErr.message);
    return;
  }

  // Count by course
  const courseCounts = {};
  seeds.forEach(s => {
    courseCounts[s.course_code] = (courseCounts[s.course_code] || 0) + 1;
  });

  console.log('Seeds by course:');
  if (Object.keys(courseCounts).length === 0) {
    console.log('  (none)');
  } else {
    Object.entries(courseCounts).sort().forEach(([course, count]) => {
      console.log(`  ${course}: ${count} seeds`);
    });
  }

  // Get LEGO counts
  const { data: legos, error: legoErr } = await supabase
    .from('legos')
    .select('seed_id, seeds!inner(course_code)');

  if (legoErr) {
    console.error('Error fetching legos:', legoErr.message);
    return;
  }

  const legoCounts = {};
  legos.forEach(l => {
    const course = l.seeds.course_code;
    legoCounts[course] = (legoCounts[course] || 0) + 1;
  });

  console.log('\nLEGOs by course:');
  if (Object.keys(legoCounts).length === 0) {
    console.log('  (none)');
  } else {
    Object.entries(legoCounts).sort().forEach(([course, count]) => {
      console.log(`  ${course}: ${count} legos`);
    });
  }

  // Get basket phrase counts
  const { data: baskets, error: basketErr } = await supabase
    .from('basket_phrases')
    .select('lego_id, legos!inner(seed_id, seeds!inner(course_code))');

  if (!basketErr && baskets) {
    const basketCounts = {};
    baskets.forEach(b => {
      const course = b.legos.seeds.course_code;
      basketCounts[course] = (basketCounts[course] || 0) + 1;
    });

    console.log('\nBasket phrases by course:');
    if (Object.keys(basketCounts).length === 0) {
      console.log('  (none)');
    } else {
      Object.entries(basketCounts).sort().forEach(([course, count]) => {
        console.log(`  ${course}: ${count} phrases`);
      });
    }
  }

  console.log('\n=== END ===');
}

checkCourses().catch(err => console.error(err));
