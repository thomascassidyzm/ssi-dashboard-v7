#!/usr/bin/env node
/**
 * Bootstrap canonical_seed_translations from existing courses
 *
 * For each *_for_eng course, extracts the target language translations
 * and stores them as canonical seeds in that language.
 *
 * Usage: node scripts/bootstrap-canonical-translations.cjs [--dry-run]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');

async function getExistingCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('course_code, known_lang, target_lang')
    .like('course_code', '%_for_eng');

  if (error) throw error;
  return data || [];
}

async function getSeedsForCourse(courseCode) {
  const { data, error } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .not('target_text', 'is', null)
    .not('target_text', 'eq', '')
    .order('seed_number');

  if (error) throw error;
  return data || [];
}

async function getExistingTranslations(languageCode) {
  const { data, error } = await supabase
    .from('canonical_seed_translations')
    .select('seed_number')
    .eq('language_code', languageCode);

  if (error) throw error;
  return new Set((data || []).map(r => r.seed_number));
}

async function insertTranslations(translations) {
  if (translations.length === 0) return 0;

  const { error } = await supabase
    .from('canonical_seed_translations')
    .upsert(translations, { onConflict: 'seed_number,language_code' });

  if (error) throw error;
  return translations.length;
}

async function main() {
  console.log('Bootstrap Canonical Seed Translations');
  console.log('=====================================');
  if (DRY_RUN) console.log('[DRY RUN - no changes will be made]\n');

  // Get all *_for_eng courses
  const courses = await getExistingCourses();
  console.log(`Found ${courses.length} *_for_eng courses\n`);

  let totalInserted = 0;

  for (const course of courses) {
    const targetLang = course.target_lang;
    console.log(`Processing ${course.course_code} (${targetLang})...`);

    // Get seeds with target translations
    const seeds = await getSeedsForCourse(course.course_code);
    console.log(`  Found ${seeds.length} seeds with translations`);

    // Get existing translations for this language
    const existing = await getExistingTranslations(targetLang);
    console.log(`  Already have ${existing.size} canonical translations for ${targetLang}`);

    // Prepare new translations
    const newTranslations = seeds
      .filter(s => !existing.has(s.seed_number))
      .map(s => ({
        seed_number: s.seed_number,
        language_code: targetLang,
        translated_text: s.target_text,
        source_course: course.course_code
      }));

    console.log(`  New translations to add: ${newTranslations.length}`);

    if (!DRY_RUN && newTranslations.length > 0) {
      const inserted = await insertTranslations(newTranslations);
      totalInserted += inserted;
      console.log(`  Inserted ${inserted} translations`);
    }

    console.log('');
  }

  console.log('=====================================');
  console.log(`Total translations added: ${totalInserted}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
