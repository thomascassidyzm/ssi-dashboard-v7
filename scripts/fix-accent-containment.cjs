#!/usr/bin/env node
// Fix 45 accent-only containment failures
// These phrases match the LEGO after stripping accents, but are missing the actual accents
// Fix: find the LEGO target in the normalized phrase, replace with accented version

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

async function fix() {
  const fixes = require('/tmp/containment-accent-fixes.json');
  console.log(`Fixing ${fixes.length} accent mismatches...\n`);

  let fixed = 0;
  let failed = 0;

  for (const { id, phrase, lego } of fixes) {
    // Find where the stripped-accent LEGO appears in the stripped-accent phrase
    const normLego = stripAccents(lego.toLowerCase());
    const normPhrase = stripAccents(phrase.toLowerCase());
    const idx = normPhrase.indexOf(normLego);

    if (idx === -1) {
      console.log(`SKIP: Can't find "${lego}" in "${phrase}" even after stripping accents`);
      failed++;
      continue;
    }

    // Replace the matching section with the properly accented LEGO text
    // We need to preserve the case of the original phrase
    const before = phrase.substring(0, idx);
    const after = phrase.substring(idx + lego.length);

    // Match the case: if the phrase section starts with uppercase, capitalize the LEGO
    const originalSection = phrase.substring(idx, idx + lego.length);
    let replacement = lego;
    if (originalSection[0] === originalSection[0].toUpperCase() && originalSection[0] !== originalSection[0].toLowerCase()) {
      replacement = lego[0].toUpperCase() + lego.substring(1);
    }

    const newPhrase = before + replacement + after;

    // Verify the fix works
    if (!newPhrase.toLowerCase().includes(lego.toLowerCase())) {
      console.log(`SKIP: Fix didn't work for "${phrase}" → "${newPhrase}" (LEGO: "${lego}")`);
      failed++;
      continue;
    }

    console.log(`FIX: "${phrase}" → "${newPhrase}"`);

    const { error } = await supabase
      .from('course_practice_phrases')
      .update({ target_text: newPhrase })
      .eq('id', id);

    if (error) {
      console.log(`  ERROR: ${error.message}`);
      failed++;
    } else {
      fixed++;
    }
  }

  console.log(`\nDone: ${fixed} fixed, ${failed} failed`);
}

fix().catch(console.error);
