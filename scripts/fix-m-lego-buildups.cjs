#!/usr/bin/env node
/**
 * Fix M-LEGO baskets to add proper build-up structure
 *
 * For each M-LEGO needing build-up:
 * 1. Shift existing phrases down by N+1 positions (N = meaningful components)
 * 2. Insert component phrases at P1, P2, ... PN
 * 3. Insert LEGO phrase at P(N+1)
 *
 * Usage:
 *   node fix-m-lego-buildups.cjs --preview    # Show what will be done
 *   node fix-m-lego-buildups.cjs --execute    # Actually do it
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE_CODE = 'zho_for_eng';

// Particles that don't get their own build-up phrase
const PARTICLES = ['了', '着', '过', '的', '地', '得', '吗', '呢', '吧', '啊', '把', '被'];

function isParticle(target) {
  return PARTICLES.includes(target.trim());
}

function getMeaningfulComponents(components, legoTarget) {
  return (components || []).filter(c =>
    !isParticle(c.target) && c.target !== legoTarget
  );
}

async function analyzeLegos() {
  // Get all M-type LEGOs
  const { data: mLegos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, components')
    .eq('course_code', COURSE_CODE)
    .eq('type', 'M')
    .not('components', 'is', null)
    .order('seed_number')
    .order('lego_index');

  // Get all phrases
  const { data: allPhrases } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, position, known_text, target_text')
    .eq('course_code', COURSE_CODE)
    .order('position');

  // Group phrases by LEGO
  const phraseMap = {};
  for (const p of allPhrases) {
    const key = `${p.seed_number}-${p.lego_index}`;
    if (!phraseMap[key]) phraseMap[key] = [];
    phraseMap[key].push(p);
  }

  const needsFix = [];

  for (const lego of mLegos) {
    const key = `${lego.seed_number}-${lego.lego_index}`;
    const phrases = (phraseMap[key] || []).sort((a, b) => a.position - b.position);

    if (phrases.length === 0) continue;

    const components = getMeaningfulComponents(lego.components, lego.target_text);
    if (components.length === 0) continue;

    // Check if build-up already exists
    let hasBuildup = true;
    for (let i = 0; i < components.length; i++) {
      const phrase = phrases.find(p => p.position === i + 1);
      if (!phrase || phrase.target_text !== components[i].target) {
        hasBuildup = false;
        break;
      }
    }
    // Check LEGO position
    const legoPos = components.length + 1;
    const legoPhrase = phrases.find(p => p.position === legoPos);
    if (!legoPhrase || legoPhrase.target_text !== lego.target_text) {
      hasBuildup = false;
    }

    if (!hasBuildup) {
      needsFix.push({
        seed: lego.seed_number,
        lego: lego.lego_index,
        known: lego.known_text,
        target: lego.target_text,
        components,
        shiftBy: components.length + 1, // components + LEGO
        existingPhrases: phrases,
        newPhrases: [
          ...components.map((c, i) => ({
            position: i + 1,
            known_text: c.known,
            target_text: c.target,
            type: 'component'
          })),
          {
            position: components.length + 1,
            known_text: lego.known_text,
            target_text: lego.target_text,
            type: 'lego'
          }
        ]
      });
    }
  }

  return needsFix;
}

async function preview() {
  console.log('M-LEGO BUILD-UP FIX - PREVIEW\n');
  console.log('='.repeat(70) + '\n');

  const needsFix = await analyzeLegos();

  console.log(`LEGOs needing build-up fix: ${needsFix.length}\n`);

  // Show first 10 examples
  console.log('EXAMPLES (first 10):\n');
  for (const item of needsFix.slice(0, 10)) {
    console.log(`S${String(item.seed).padStart(4,'0')}L${String(item.lego).padStart(2,'0')}: "${item.known}" → "${item.target}"`);
    console.log(`  Components: ${item.components.map(c => c.target).join(' + ')}`);
    console.log(`  Shift existing ${item.existingPhrases.length} phrases by +${item.shiftBy}`);
    console.log(`  Insert ${item.newPhrases.length} build-up phrases:`);
    for (const np of item.newPhrases) {
      console.log(`    P${np.position}: "${np.known_text}" → "${np.target_text}" [${np.type}]`);
    }
    console.log('');
  }

  // Summary stats
  const totalShifts = needsFix.reduce((sum, item) => sum + item.existingPhrases.length, 0);
  const totalInserts = needsFix.reduce((sum, item) => sum + item.newPhrases.length, 0);

  console.log('='.repeat(70));
  console.log('SUMMARY:');
  console.log(`  LEGOs to fix: ${needsFix.length}`);
  console.log(`  Phrases to shift: ${totalShifts}`);
  console.log(`  New phrases to insert: ${totalInserts}`);
  console.log('');
  console.log('Run with --execute to apply these changes.');

  return needsFix;
}

async function execute() {
  console.log('M-LEGO BUILD-UP FIX - EXECUTING\n');
  console.log('='.repeat(70) + '\n');

  const needsFix = await analyzeLegos();

  console.log(`Fixing ${needsFix.length} M-LEGOs...\n`);

  let fixed = 0;
  let errors = 0;

  for (const item of needsFix) {
    try {
      // Step 1: Shift existing phrases by incrementing their positions
      // We need to do this in reverse order to avoid conflicts
      const sortedPhrases = item.existingPhrases.sort((a, b) => b.position - a.position);

      for (const phrase of sortedPhrases) {
        const newPosition = phrase.position + item.shiftBy;
        const { error } = await supabase
          .from('course_practice_phrases')
          .update({ position: newPosition })
          .eq('id', phrase.id);

        if (error) throw new Error(`Shift failed for phrase ${phrase.id}: ${error.message}`);
      }

      // Step 2: Insert new build-up phrases
      const newRecords = item.newPhrases.map(np => ({
        course_code: COURSE_CODE,
        seed_number: item.seed,
        lego_index: item.lego,
        position: np.position,
        known_text: np.known_text,
        target_text: np.target_text
      }));

      const { error: insertError } = await supabase
        .from('course_practice_phrases')
        .insert(newRecords);

      if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

      fixed++;
      if (fixed % 50 === 0) {
        console.log(`  Progress: ${fixed}/${needsFix.length}`);
      }
    } catch (err) {
      console.error(`✗ S${item.seed}L${item.lego}: ${err.message}`);
      errors++;
    }
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('RESULTS:');
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Errors: ${errors}`);

  return { fixed, errors };
}

// Main
const args = process.argv.slice(2);
if (args.includes('--execute')) {
  execute().catch(console.error);
} else {
  preview().catch(console.error);
}
