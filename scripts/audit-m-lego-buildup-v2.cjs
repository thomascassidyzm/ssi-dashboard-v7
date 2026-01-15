#!/usr/bin/env node
/**
 * Audit M-LEGO baskets for proper build-up structure (v2 - corrected logic)
 *
 * CORRECT M-LEGO basket structure:
 * P1: Component 1 target (exactly) - if meaningful
 * P2: Component 2 target (exactly) - if meaningful
 * ...
 * P(N+1): LEGO target (exactly)
 * P(N+2)+: Practice phrases
 *
 * Particles (了, 着, etc.) are skipped - they appear in the LEGO but don't get own phrase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE_CODE = 'zho_for_eng';

// Chinese particles that don't make sense alone - skip in build-up
const PARTICLES = ['了', '着', '过', '的', '地', '得', '吗', '呢', '吧', '啊', '把', '被'];

function isParticle(target) {
  return PARTICLES.includes(target.trim());
}

async function audit() {
  console.log('M-LEGO BUILD-UP AUDIT (v2)\n');
  console.log('Correct structure: Components (non-particles) → LEGO → Practice phrases\n');
  console.log('='.repeat(70) + '\n');

  // Get all M-type LEGOs with components
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
    .select('seed_number, lego_index, position, known_text, target_text')
    .eq('course_code', COURSE_CODE)
    .order('position');

  // Group phrases by LEGO
  const phraseMap = {};
  for (const p of allPhrases) {
    const key = `${p.seed_number}-${p.lego_index}`;
    if (!phraseMap[key]) phraseMap[key] = [];
    phraseMap[key].push(p);
  }

  let hasBuildup = 0;
  let noBuildup = 0;
  let partial = 0;
  const needsWork = [];

  for (const lego of mLegos) {
    const key = `${lego.seed_number}-${lego.lego_index}`;
    const phrases = (phraseMap[key] || []).sort((a, b) => a.position - b.position);

    if (phrases.length === 0) continue;

    // Get meaningful components (exclude particles and LEGO itself)
    const components = (lego.components || []).filter(c =>
      !isParticle(c.target) && c.target !== lego.target_text
    );

    if (components.length === 0) {
      // No meaningful components to build up - just check LEGO is P1
      if (phrases[0]?.target_text === lego.target_text) {
        hasBuildup++;
      } else {
        noBuildup++;
      }
      continue;
    }

    // Check build-up structure
    let buildupScore = 0;
    const expectedPositions = [];

    // Check each component position
    for (let i = 0; i < components.length; i++) {
      const phrase = phrases.find(p => p.position === i + 1);
      expectedPositions.push({
        pos: i + 1,
        expected: components[i].target,
        actual: phrase?.target_text || '(missing)',
        match: phrase?.target_text === components[i].target
      });
      if (phrase?.target_text === components[i].target) buildupScore++;
    }

    // Check LEGO position
    const legoPos = components.length + 1;
    const legoPhrase = phrases.find(p => p.position === legoPos);
    expectedPositions.push({
      pos: legoPos,
      expected: lego.target_text + ' (LEGO)',
      actual: legoPhrase?.target_text || '(missing)',
      match: legoPhrase?.target_text === lego.target_text
    });
    if (legoPhrase?.target_text === lego.target_text) buildupScore++;

    const totalExpected = components.length + 1;

    if (buildupScore === totalExpected) {
      hasBuildup++;
    } else if (buildupScore > 0) {
      partial++;
      needsWork.push({
        seed: lego.seed_number,
        lego: lego.lego_index,
        known: lego.known_text,
        target: lego.target_text,
        components: components.map(c => ({ known: c.known, target: c.target })),
        score: `${buildupScore}/${totalExpected}`,
        positions: expectedPositions,
        currentFirst3: phrases.slice(0, 3).map(p => ({ pos: p.position, target: p.target_text }))
      });
    } else {
      noBuildup++;
      needsWork.push({
        seed: lego.seed_number,
        lego: lego.lego_index,
        known: lego.known_text,
        target: lego.target_text,
        components: components.map(c => ({ known: c.known, target: c.target })),
        score: `0/${totalExpected}`,
        positions: expectedPositions,
        currentFirst3: phrases.slice(0, 3).map(p => ({ pos: p.position, target: p.target_text }))
      });
    }
  }

  // Summary
  console.log('SUMMARY');
  console.log('='.repeat(40));
  console.log(`Total M-LEGOs with components: ${mLegos.length}`);
  console.log(`✓ Has correct build-up: ${hasBuildup}`);
  console.log(`◐ Partial build-up: ${partial}`);
  console.log(`✗ No build-up: ${noBuildup}`);
  console.log(`\nNeed work: ${needsWork.length}`);
  console.log('');

  // Show examples
  if (needsWork.length > 0) {
    console.log('='.repeat(70));
    console.log('EXAMPLES NEEDING BUILD-UP (first 15):\n');

    for (const item of needsWork.slice(0, 15)) {
      console.log(`S${String(item.seed).padStart(4,'0')}L${String(item.lego).padStart(2,'0')}: "${item.known}" → "${item.target}"`);
      console.log(`  Components: ${item.components.map(c => c.target).join(' + ')}`);
      console.log(`  Build-up score: ${item.score}`);
      console.log(`  Expected vs Actual:`);
      for (const p of item.positions) {
        const status = p.match ? '✓' : '✗';
        console.log(`    P${p.pos}: ${status} expected "${p.expected}" got "${p.actual}"`);
      }
      console.log(`  Current phrases: ${item.currentFirst3.map(p => `P${p.pos}:${p.target}`).join(', ')}`);
      console.log('');
    }
  }

  return { hasBuildup, partial, noBuildup, needsWork };
}

audit().catch(console.error);
