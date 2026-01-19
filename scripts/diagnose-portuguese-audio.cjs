#!/usr/bin/env node
/**
 * Diagnostic script to check why Portuguese practice phrase audio isn't being found.
 *
 * Usage: node scripts/diagnose-portuguese-audio.cjs [course_code]
 * Default: por_for_eng
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const courseCode = process.argv[2] || 'por_for_eng';

async function diagnose() {
  console.log(`\n=== Diagnosing audio join issues for: ${courseCode} ===\n`);

  // 1. Check course setup
  console.log('1. COURSE SETUP:');
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('course_code, known_lang, target_lang')
    .eq('course_code', courseCode)
    .single();

  if (courseErr) {
    console.error('   Error fetching course:', courseErr.message);
    return;
  }
  console.log(`   course_code: ${course.course_code}`);
  console.log(`   known_lang: ${course.known_lang}`);
  console.log(`   target_lang: ${course.target_lang}`);

  // 2. Check audio counts by language/role
  console.log('\n2. AUDIO COUNTS BY LANGUAGE/ROLE:');
  const { data: audioCounts } = await supabase
    .from('course_audio')
    .select('language, role')
    .eq('course_code', courseCode);

  const countMap = {};
  for (const row of audioCounts || []) {
    const key = `${row.language}|${row.role}`;
    countMap[key] = (countMap[key] || 0) + 1;
  }
  for (const [key, count] of Object.entries(countMap).sort()) {
    console.log(`   ${key}: ${count}`);
  }

  // 3. Check practice phrase counts
  console.log('\n3. PRACTICE PHRASE COUNT:');
  const { count: phraseCount } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);
  console.log(`   Total phrases: ${phraseCount}`);

  // 4. Sample phrases and check joins
  console.log('\n4. SAMPLE PHRASE JOIN DIAGNOSIS (first 5):');
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('known_text, target_text')
    .eq('course_code', courseCode)
    .limit(5);

  for (const phrase of phrases || []) {
    console.log(`\n   Phrase: "${phrase.known_text}" → "${phrase.target_text}"`);

    // Check known audio
    const knownNorm = phrase.known_text.toLowerCase().trim();
    const { data: knownAudio } = await supabase
      .from('course_audio')
      .select('id, text_normalized, language, role, s3_key')
      .eq('course_code', courseCode)
      .eq('text_normalized', knownNorm)
      .eq('role', 'known')
      .limit(1);

    if (knownAudio?.length > 0) {
      console.log(`   ✓ Known audio found: ${knownAudio[0].s3_key}`);
    } else {
      console.log(`   ✗ Known audio NOT FOUND for: "${knownNorm}"`);
      // Check if text exists with different language
      const { data: altKnown } = await supabase
        .from('course_audio')
        .select('language')
        .eq('course_code', courseCode)
        .eq('text_normalized', knownNorm)
        .eq('role', 'known');
      if (altKnown?.length > 0) {
        console.log(`     → Found with language: ${altKnown.map(a => a.language).join(', ')}`);
        console.log(`     → Expected language: ${course.known_lang}`);
      }
    }

    // Check target1 audio
    const targetNorm = phrase.target_text.toLowerCase().trim();
    const { data: target1Audio } = await supabase
      .from('course_audio')
      .select('id, text_normalized, language, role, s3_key')
      .eq('course_code', courseCode)
      .eq('text_normalized', targetNorm)
      .eq('role', 'target1')
      .limit(1);

    if (target1Audio?.length > 0) {
      console.log(`   ✓ Target1 audio found: ${target1Audio[0].s3_key}`);
    } else {
      console.log(`   ✗ Target1 audio NOT FOUND for: "${targetNorm}"`);
      // Check if text exists with different language
      const { data: altTarget } = await supabase
        .from('course_audio')
        .select('language')
        .eq('course_code', courseCode)
        .eq('text_normalized', targetNorm)
        .eq('role', 'target1');
      if (altTarget?.length > 0) {
        console.log(`     → Found with language: ${altTarget.map(a => a.language).join(', ')}`);
        console.log(`     → Expected language: ${course.target_lang}`);
      }
    }
  }

  // 5. Check for text normalization mismatches
  console.log('\n5. TEXT NORMALIZATION CHECK:');
  console.log('   Checking for phrases with no matching audio...');

  const { data: unmatchedKnown } = await supabase
    .rpc('check_unmatched_known_audio', { p_course_code: courseCode })
    .limit(5);

  // If RPC doesn't exist, do a manual check
  if (!unmatchedKnown) {
    const { data: allPhrases } = await supabase
      .from('course_practice_phrases')
      .select('known_text')
      .eq('course_code', courseCode)
      .limit(100);

    let missingCount = 0;
    for (const p of allPhrases || []) {
      const norm = p.known_text.toLowerCase().trim();
      const { data: audio } = await supabase
        .from('course_audio')
        .select('id')
        .eq('course_code', courseCode)
        .eq('text_normalized', norm)
        .eq('language', course.known_lang)
        .eq('role', 'known')
        .limit(1);

      if (!audio || audio.length === 0) {
        missingCount++;
        if (missingCount <= 3) {
          console.log(`   Missing known audio for: "${norm}"`);
        }
      }
    }
    console.log(`   Total phrases missing known audio: ${missingCount}/${allPhrases?.length || 0}`);
  }

  console.log('\n=== DIAGNOSIS COMPLETE ===\n');

  // Summary and recommendations
  console.log('POTENTIAL ISSUES:');
  console.log('1. If language codes don\'t match, update courses.known_lang or course_audio.language');
  console.log('2. If text_normalized doesn\'t match, check for Unicode/whitespace differences');
  console.log('3. Run the migration: 20260119_fix_practice_cycles_phrase_role.sql');
  console.log('');
}

diagnose().catch(console.error);
