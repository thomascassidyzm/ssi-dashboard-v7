#!/usr/bin/env node
// Audit: every phrase must contain its LEGO's target_text as a substring
// This is required by the learning app for character matching

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function audit() {
  const course = 'ita_for_eng';

  // 1. Get all LEGOs
  console.log('Fetching LEGOs...');
  const { data: legos, error: legoErr } = await supabase
    .from('course_legos')
    .select('id, seed_number, lego_index, known_text, target_text, type')
    .eq('course_code', course)
    .gte('seed_number', 11)
    .order('seed_number')
    .order('lego_index');

  if (legoErr) { console.error(legoErr); return; }
  console.log(`Found ${legos.length} LEGOs`);

  // 2. Get all phrases
  console.log('Fetching phrases...');
  let allPhrases = [];
  for (let offset = 0; ; offset += 1000) {
    const { data: batch, error: pErr } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, known_text, target_text, phrase_role, position')
      .eq('course_code', course)
      .gte('seed_number', 11)
      .order('seed_number')
      .order('lego_index')
      .order('position')
      .range(offset, offset + 999);

    if (pErr) { console.error(pErr); return; }
    allPhrases = allPhrases.concat(batch);
    if (batch.length < 1000) break;
  }
  console.log(`Found ${allPhrases.length} phrases`);

  // 3. Build LEGO lookup
  const legoMap = {};
  for (const l of legos) {
    legoMap[`${l.seed_number}-${l.lego_index}`] = l;
  }

  // 4. Check containment
  const failures = [];
  let checked = 0;

  for (const phrase of allPhrases) {
    const key = `${phrase.seed_number}-${phrase.lego_index}`;
    const lego = legoMap[key];
    if (!lego) continue;

    checked++;
    const legoTarget = lego.target_text.toLowerCase().trim();
    const phraseTarget = phrase.target_text.toLowerCase().trim();

    // Exact substring check
    if (!phraseTarget.includes(legoTarget)) {
      // Try normalized (strip accents)
      const normLego = stripAccents(legoTarget);
      const normPhrase = stripAccents(phraseTarget);

      const exactFail = true;
      const normMatch = normPhrase.includes(normLego);

      failures.push({
        seed: phrase.seed_number,
        lego_idx: phrase.lego_index,
        phrase_id: phrase.id,
        position: phrase.position,
        role: phrase.phrase_role,
        lego_target: lego.target_text,
        phrase_target: phrase.target_text,
        exact_fail: true,
        norm_match: normMatch,
        type: normMatch ? 'ACCENT_MISMATCH' : 'MISSING_LEGO'
      });
    }
  }

  console.log(`\nChecked ${checked} phrases`);
  console.log(`Failures: ${failures.length}`);

  // Group by type
  const accentMismatches = failures.filter(f => f.type === 'ACCENT_MISMATCH');
  const missingLego = failures.filter(f => f.type === 'MISSING_LEGO');

  console.log(`\n=== ACCENT MISMATCHES (${accentMismatches.length}) ===`);
  console.log('(LEGO text matches after stripping accents, but not exact)\n');
  for (const f of accentMismatches.slice(0, 30)) {
    console.log(`S${f.seed}L${f.lego_idx} pos:${f.position} [${f.role}]`);
    console.log(`  LEGO:   "${f.lego_target}"`);
    console.log(`  PHRASE: "${f.phrase_target}"`);
    console.log();
  }
  if (accentMismatches.length > 30) {
    console.log(`  ... and ${accentMismatches.length - 30} more`);
  }

  console.log(`\n=== MISSING LEGO TEXT (${missingLego.length}) ===`);
  console.log('(LEGO text NOT found in phrase even after stripping accents)\n');
  for (const f of missingLego.slice(0, 50)) {
    console.log(`S${f.seed}L${f.lego_idx} pos:${f.position} [${f.role}]`);
    console.log(`  LEGO:   "${f.lego_target}"`);
    console.log(`  PHRASE: "${f.phrase_target}"`);
    console.log();
  }
  if (missingLego.length > 50) {
    console.log(`  ... and ${missingLego.length - 50} more`);
  }

  // Summary by seed
  console.log('\n=== SUMMARY BY SEED ===');
  const bySeed = {};
  for (const f of failures) {
    if (!bySeed[f.seed]) bySeed[f.seed] = { accent: 0, missing: 0 };
    if (f.type === 'ACCENT_MISMATCH') bySeed[f.seed].accent++;
    else bySeed[f.seed].missing++;
  }
  for (const [seed, counts] of Object.entries(bySeed).sort((a,b) => +a[0] - +b[0])) {
    console.log(`  S${seed}: ${counts.accent} accent, ${counts.missing} missing`);
  }

  console.log(`\nTOTAL: ${accentMismatches.length} accent mismatches, ${missingLego.length} missing LEGO text`);
}

function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

audit().catch(console.error);
