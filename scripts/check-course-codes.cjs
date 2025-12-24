#!/usr/bin/env node
/**
 * Check course codes in database
 */
require('dotenv').config();
const { supabase } = require('../services/supabase-client.cjs');

async function main() {
  console.log('=== DATABASE COURSE CODES ===\n');

  // Get courses table
  const { data: courses } = await supabase.from('courses').select('course_code, known_lang, target_lang');
  console.log('Courses table:', JSON.stringify(courses, null, 2));

  // Check course_seeds
  const { data: seeds } = await supabase.from('course_seeds').select('course_code, seed_number').limit(5000);
  const seedCounts = {};
  seeds?.forEach(s => seedCounts[s.course_code] = (seedCounts[s.course_code] || 0) + 1);
  console.log('\ncourse_seeds by course_code:', seedCounts);

  // Check course_legos
  const { data: legos } = await supabase.from('course_legos').select('course_code').limit(5000);
  const legoCounts = {};
  legos?.forEach(l => legoCounts[l.course_code] = (legoCounts[l.course_code] || 0) + 1);
  console.log('\ncourse_legos by course_code:', legoCounts);

  // Check course_practice_phrases
  const { data: phrases } = await supabase.from('course_practice_phrases').select('course_code').limit(10000);
  const phraseCounts = {};
  phrases?.forEach(p => phraseCounts[p.course_code] = (phraseCounts[p.course_code] || 0) + 1);
  console.log('\ncourse_practice_phrases by course_code:', phraseCounts);
}

main().catch(console.error);
