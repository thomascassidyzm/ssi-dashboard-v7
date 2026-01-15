#!/usr/bin/env node
/**
 * Audit zho_for_eng course for issues
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE_CODE = 'zho_for_eng';

async function auditCourse() {
  console.log('ZHO_FOR_ENG COURSE AUDIT');
  console.log('='.repeat(60));

  // 1. Basic counts
  const { count: seedCount } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE_CODE);

  const { count: legoCount } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE_CODE);

  const { count: phraseCount } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE_CODE);

  console.log('\nCOUNTS:');
  console.log(`  Seeds: ${seedCount}`);
  console.log(`  LEGOs: ${legoCount}`);
  console.log(`  Phrases: ${phraseCount}`);
  console.log(`  Ratio: ${(phraseCount / legoCount).toFixed(1)} phrases/LEGO`);

  // 2. Seeds without translations
  const { data: emptySeeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', COURSE_CODE);

  const seedsNoTranslation = (emptySeeds || []).filter(s => !s.target_text || s.target_text.trim() === '');

  console.log(`\nSEEDS WITHOUT TRANSLATIONS: ${seedsNoTranslation.length}`);
  if (seedsNoTranslation.length > 0) {
    seedsNoTranslation.slice(0, 5).forEach(s =>
      console.log(`  S${String(s.seed_number).padStart(4,'0')}: ${(s.known_text || '').slice(0, 50)}`)
    );
    if (seedsNoTranslation.length > 5) console.log(`  ... and ${seedsNoTranslation.length - 5} more`);
  }

  // 3. LEGOs with is_new: false (duplicates we've already fixed)
  const { count: duplicateCount } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE_CODE)
    .eq('is_new', false);

  console.log(`\nDUPLICATE LEGOS (is_new=false): ${duplicateCount}`);

  // 4. M-type LEGOs check
  const { data: mLegos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, components')
    .eq('course_code', COURSE_CODE)
    .eq('type', 'M');

  console.log(`\nM-TYPE LEGOS: ${mLegos?.length || 0}`);

  // 5. Check M-LEGOs for build-up structure
  let correctBuildup = 0;
  let missingBuildup = 0;

  for (const lego of (mLegos || [])) {
    const { data: phrases } = await supabase
      .from('course_practice_phrases')
      .select('position')
      .eq('course_code', COURSE_CODE)
      .eq('seed_number', lego.seed_number)
      .eq('lego_index', lego.lego_index)
      .order('position');

    if (phrases && phrases.length > 0 && phrases[0].position === 1) {
      correctBuildup++;
    } else {
      missingBuildup++;
    }
  }
  console.log(`  With correct build-up (starts P1): ${correctBuildup}`);
  console.log(`  Missing build-up (gap at start): ${missingBuildup}`);

  // 6. Check for ZUT violations
  const { data: allLegos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text')
    .eq('course_code', COURSE_CODE);

  const byKnown = {};
  for (const l of (allLegos || [])) {
    if (!byKnown[l.known_text]) byKnown[l.known_text] = [];
    byKnown[l.known_text].push(l);
  }

  const zutViolations = [];
  for (const [known, group] of Object.entries(byKnown)) {
    if (group.length > 1) {
      const targets = new Set(group.map(l => l.target_text));
      if (targets.size > 1) {
        zutViolations.push({ known, targets: [...targets], legos: group });
      }
    }
  }

  console.log(`\nZUT VIOLATIONS (same known, diff targets): ${zutViolations.length}`);
  if (zutViolations.length > 0) {
    zutViolations.slice(0, 5).forEach(v => {
      console.log(`  "${v.known}" maps to:`);
      v.legos.forEach(l => {
        console.log(`    S${String(l.seed_number).padStart(4,'0')}L${String(l.lego_index).padStart(2,'0')}: "${l.target_text}"`);
      });
    });
  }

  // 7. Check seed tiling (do LEGOs tile to seed translation?)
  console.log(`\nSEED TILING CHECK:`);
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', COURSE_CODE)
    .not('target_text', 'is', null);

  let tilingOk = 0;
  let tilingIssues = [];

  for (const seed of (seeds || [])) {
    if (!seed.target_text) continue;

    const { data: seedLegos } = await supabase
      .from('course_legos')
      .select('target_text')
      .eq('course_code', COURSE_CODE)
      .eq('seed_number', seed.seed_number)
      .order('lego_index');

    if (!seedLegos || seedLegos.length === 0) continue;

    let remaining = seed.target_text;
    for (const lego of seedLegos) {
      remaining = remaining.replace(lego.target_text, '');
    }

    // Check if only punctuation remains
    const onlyPunctuation = /^[。，！？、：；""''（）【】《》\s]*$/.test(remaining.trim());

    if (onlyPunctuation) {
      tilingOk++;
    } else {
      tilingIssues.push({
        seed: seed.seed_number,
        known: seed.known_text,
        target: seed.target_text,
        remaining: remaining.trim(),
        legos: seedLegos.map(l => l.target_text)
      });
    }
  }

  console.log(`  Seeds with valid tiling: ${tilingOk}`);
  console.log(`  Seeds with tiling issues: ${tilingIssues.length}`);
  if (tilingIssues.length > 0) {
    tilingIssues.slice(0, 5).forEach(t => {
      console.log(`  S${String(t.seed).padStart(4,'0')}: "${t.target}"`);
      console.log(`    LEGOs: ${t.legos.join(' + ')}`);
      console.log(`    Remaining: "${t.remaining}"`);
    });
    if (tilingIssues.length > 5) console.log(`  ... and ${tilingIssues.length - 5} more`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY:');

  const issues = [];
  if (seedsNoTranslation.length > 0) issues.push(`${seedsNoTranslation.length} seeds without translations`);
  if (missingBuildup > 0) issues.push(`${missingBuildup} M-LEGOs missing build-up`);
  if (zutViolations.length > 0) issues.push(`${zutViolations.length} ZUT violations`);
  if (tilingIssues.length > 0) issues.push(`${tilingIssues.length} seed tiling issues`);

  if (issues.length === 0) {
    console.log('  ✓ Course looks clean!');
  } else {
    console.log('  Issues found:');
    issues.forEach(i => console.log(`    ✗ ${i}`));
  }
}

async function listGoodSeeds() {
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', COURSE_CODE)
    .order('seed_number');

  const goodSeeds = [];

  for (const seed of seeds) {
    if (!seed.target_text) continue;

    const { data: legos } = await supabase
      .from('course_legos')
      .select('target_text')
      .eq('course_code', COURSE_CODE)
      .eq('seed_number', seed.seed_number);

    if (!legos || legos.length === 0) continue;

    let remaining = seed.target_text;
    for (const lego of legos) {
      remaining = remaining.replace(lego.target_text, '');
    }

    const onlyPunctuation = /^[。，！？、：；""''（）【】《》\s]*$/.test(remaining.trim());

    if (onlyPunctuation) {
      goodSeeds.push(seed.seed_number);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`SEEDS WITH VALID TILING (${goodSeeds.length}):`);
  console.log(goodSeeds.join(', '));
}

auditCourse().then(() => listGoodSeeds()).catch(console.error);
