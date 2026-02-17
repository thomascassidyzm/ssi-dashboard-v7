#!/usr/bin/env node
// Detailed containment audit - outputs deletion candidates + role breakdown

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function audit() {
  const course = 'ita_for_eng';

  // 1. Get all LEGOs
  const { data: legos, error: legoErr } = await supabase
    .from('course_legos')
    .select('id, seed_number, lego_index, known_text, target_text, type')
    .eq('course_code', course)
    .order('seed_number')
    .order('lego_index');

  if (legoErr) { console.error(legoErr); return; }

  // 2. Get all phrases
  let allPhrases = [];
  for (let offset = 0; ; offset += 1000) {
    const { data: batch, error: pErr } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, known_text, target_text, phrase_role, position')
      .eq('course_code', course)
      .order('seed_number')
      .order('lego_index')
      .order('position')
      .range(offset, offset + 999);

    if (pErr) { console.error(pErr); return; }
    allPhrases = allPhrases.concat(batch);
    if (batch.length < 1000) break;
  }

  // 3. Build LEGO lookup
  const legoMap = {};
  for (const l of legos) {
    legoMap[`${l.seed_number}-${l.lego_index}`] = l;
  }

  // 4. Check containment - collect ALL failures with IDs
  const failures = [];
  let checked = 0;
  let passed = 0;

  for (const phrase of allPhrases) {
    const key = `${phrase.seed_number}-${phrase.lego_index}`;
    const lego = legoMap[key];
    if (!lego) continue;

    checked++;
    const legoTarget = lego.target_text.toLowerCase().trim();
    const phraseTarget = phrase.target_text.toLowerCase().trim();

    if (phraseTarget.includes(legoTarget)) {
      passed++;
      continue;
    }

    // Check if accent-only mismatch
    const normLego = legoTarget.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normPhrase = phraseTarget.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isAccentOnly = normPhrase.includes(normLego);

    failures.push({
      id: phrase.id,
      seed: phrase.seed_number,
      lego_idx: phrase.lego_index,
      position: phrase.position,
      role: phrase.phrase_role,
      lego_type: lego.type,
      lego_target: lego.target_text,
      phrase_target: phrase.target_text,
      accent_only: isAccentOnly
    });
  }

  // 5. Stats
  const accentOnly = failures.filter(f => f.accent_only);
  const missing = failures.filter(f => !f.accent_only);

  console.log(`Total phrases: ${allPhrases.length}`);
  console.log(`Checked: ${checked}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failures.length}`);
  console.log(`  Accent-only: ${accentOnly.length} (fixable)`);
  console.log(`  Missing LEGO: ${missing.length} (must delete)`);
  console.log();

  // Role breakdown
  const byRole = {};
  for (const f of missing) {
    byRole[f.role] = (byRole[f.role] || 0) + 1;
  }
  console.log('=== MISSING LEGO BY ROLE ===');
  for (const [role, count] of Object.entries(byRole)) {
    console.log(`  ${role}: ${count}`);
  }

  // By LEGO type
  const byType = {};
  for (const f of missing) {
    byType[f.lego_type] = (byType[f.lego_type] || 0) + 1;
  }
  console.log('\n=== MISSING LEGO BY LEGO TYPE ===');
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}-type: ${count}`);
  }

  // How many LEGOs are affected
  const affectedLegos = new Set(missing.map(f => `${f.seed}-${f.lego_idx}`));
  console.log(`\nAffected LEGOs: ${affectedLegos.size} out of ${legos.length}`);

  // Per-LEGO breakdown: how many phrases will remain after deletion
  console.log('\n=== PER-LEGO IMPACT (LEGOs that will lose phrases) ===');

  // Count current phrases per LEGO
  const phrasesPerLego = {};
  for (const p of allPhrases) {
    const key = `${p.seed_number}-${p.lego_index}`;
    if (!phrasesPerLego[key]) phrasesPerLego[key] = { total: 0, build: 0, use: 0, practice: 0 };
    phrasesPerLego[key].total++;
    if (p.phrase_role === 'build') phrasesPerLego[key].build++;
    else if (p.phrase_role === 'use') phrasesPerLego[key].use++;
    else phrasesPerLego[key].practice++;
  }

  // Count failures per LEGO
  const failsPerLego = {};
  for (const f of missing) {
    const key = `${f.seed}-${f.lego_idx}`;
    if (!failsPerLego[key]) failsPerLego[key] = { total: 0, build: 0, use: 0, practice: 0 };
    failsPerLego[key].total++;
    if (f.role === 'build') failsPerLego[key].build++;
    else if (f.role === 'use') failsPerLego[key].use++;
    else failsPerLego[key].practice++;
  }

  // Show LEGOs that will be critically short after deletion
  let criticalCount = 0;
  let needBackfill = 0;
  for (const [key, fails] of Object.entries(failsPerLego)) {
    const current = phrasesPerLego[key] || { total: 0 };
    const remaining = current.total - fails.total;
    const lego = legoMap[key];
    if (remaining < 8) {
      criticalCount++;
      if (remaining < 5) needBackfill++;
    }
  }
  console.log(`LEGOs that will have <8 phrases after deletion: ${criticalCount}`);
  console.log(`LEGOs that will have <5 phrases after deletion: ${needBackfill}`);

  // Output deletion IDs to file
  const deleteIds = missing.map(f => f.id);
  const accentIds = accentOnly.map(f => ({ id: f.id, phrase: f.phrase_target, lego: f.lego_target }));

  require('fs').writeFileSync('/tmp/containment-delete-ids.json', JSON.stringify(deleteIds, null, 2));
  require('fs').writeFileSync('/tmp/containment-accent-fixes.json', JSON.stringify(accentIds, null, 2));

  console.log(`\nWrote ${deleteIds.length} phrase IDs to /tmp/containment-delete-ids.json`);
  console.log(`Wrote ${accentIds.length} accent fix records to /tmp/containment-accent-fixes.json`);
}

audit().catch(console.error);
