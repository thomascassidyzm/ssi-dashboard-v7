#!/usr/bin/env node
/**
 * Audit M-LEGO baskets for proper build-up structure
 *
 * Correct M-LEGO basket structure:
 * P1: Component 1 (if meaningful - not a particle)
 * P2: Component 2 (if meaningful)
 * ...
 * P(N): LEGO itself
 * P(N+1)+: Practice phrases
 *
 * Particles (了, 着, 过, 的, 吗, 呢, 吧, etc.) don't get their own build-up phrase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE_CODE = 'zho_for_eng';

// Chinese particles that don't make sense alone
const PARTICLES = [
  '了', '着', '过',           // Aspect markers
  '的', '地', '得',           // Structural particles
  '吗', '呢', '吧', '啊',     // Sentence-final particles
  '把', '被', '让', '给',     // Prepositions/coverbs (sometimes particles)
  '就', '才', '都', '也',     // Adverbs that might appear as components
];

function isParticle(target) {
  // Check if component is a single-character particle
  return PARTICLES.includes(target.trim());
}

function getMeaningfulComponents(components, legoTarget) {
  // Filter out:
  // 1. Particles (no standalone meaning)
  // 2. The LEGO itself (sometimes incorrectly included as a "component")
  return components.filter(c => {
    if (isParticle(c.target)) return false;
    if (c.target === legoTarget) return false; // LEGO itself, not a component
    return true;
  });
}

async function auditMLegoBuildup() {
  console.log('AUDITING M-LEGO BUILD-UP STRUCTURE\n');
  console.log('Expected structure:');
  console.log('  P1..P(N-1): Meaningful components (not particles)');
  console.log('  P(N): LEGO itself');
  console.log('  P(N+1)+: Practice phrases\n');
  console.log('='.repeat(80) + '\n');

  // Get all M-type LEGOs
  const { data: mLegos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, components')
    .eq('course_code', COURSE_CODE)
    .eq('type', 'M')
    .order('seed_number')
    .order('lego_index');

  // Get all phrases
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, position, known_text, target_text')
    .eq('course_code', COURSE_CODE)
    .order('seed_number')
    .order('lego_index')
    .order('position');

  // Group phrases by LEGO
  const phrasesByLego = {};
  for (const p of phrases) {
    const key = `${p.seed_number}-${p.lego_index}`;
    if (!phrasesByLego[key]) phrasesByLego[key] = [];
    phrasesByLego[key].push(p);
  }

  const results = {
    correct: [],
    needsBuildup: [],
    hasBuildup: [],
    noComponents: [],
    noPhrases: []
  };

  for (const lego of mLegos) {
    const key = `${lego.seed_number}-${lego.lego_index}`;
    const legoPhrases = phrasesByLego[key] || [];
    const components = lego.components || [];

    if (legoPhrases.length === 0) {
      results.noPhrases.push({
        seed: lego.seed_number,
        lego: lego.lego_index,
        known: lego.known_text,
        target: lego.target_text
      });
      continue;
    }

    if (components.length === 0) {
      results.noComponents.push({
        seed: lego.seed_number,
        lego: lego.lego_index,
        known: lego.known_text,
        target: lego.target_text
      });
      continue;
    }

    // Get meaningful components (non-particles, excluding LEGO itself)
    const meaningfulComponents = getMeaningfulComponents(components, lego.target_text);
    const particleComponents = components.filter(c => isParticle(c.target));
    const selfAsComponent = components.filter(c => c.target === lego.target_text);

    // Expected structure:
    // Positions 1..M = meaningful components
    // Position M+1 = LEGO itself
    // Position M+2+ = practice phrases
    const expectedLegoPosition = meaningfulComponents.length + 1;

    // Check current structure
    const sortedPhrases = legoPhrases.sort((a, b) => a.position - b.position);

    // Check if build-up exists
    let hasCorrectBuildup = true;
    let buildupIssues = [];

    // Check each meaningful component has a phrase
    for (let i = 0; i < meaningfulComponents.length; i++) {
      const expectedPos = i + 1;
      const component = meaningfulComponents[i];
      const phrase = sortedPhrases.find(p => p.position === expectedPos);

      if (!phrase) {
        hasCorrectBuildup = false;
        buildupIssues.push(`Missing P${expectedPos}: component "${component.known}" (${component.target})`);
      } else if (phrase.target_text !== component.target) {
        // Check if the phrase at least contains just the component
        // (might be slightly different form)
        if (!phrase.target_text.includes(component.target) || phrase.target_text.length > component.target.length + 2) {
          hasCorrectBuildup = false;
          buildupIssues.push(`P${expectedPos} should be component "${component.target}" but is "${phrase.target_text}"`);
        }
      }
    }

    // Check LEGO position
    const legoPhrase = sortedPhrases.find(p => p.position === expectedLegoPosition);
    if (!legoPhrase) {
      hasCorrectBuildup = false;
      buildupIssues.push(`Missing P${expectedLegoPosition}: LEGO itself "${lego.target_text}"`);
    } else if (legoPhrase.target_text !== lego.target_text) {
      // Allow slight variations
      if (!legoPhrase.target_text.includes(lego.target_text)) {
        buildupIssues.push(`P${expectedLegoPosition} should be LEGO "${lego.target_text}" but is "${legoPhrase.target_text}"`);
      }
    }

    const legoInfo = {
      seed: lego.seed_number,
      lego: lego.lego_index,
      known: lego.known_text,
      target: lego.target_text,
      components: components.map(c => ({
        known: c.known,
        target: c.target,
        isParticle: isParticle(c.target)
      })),
      meaningfulCount: meaningfulComponents.length,
      particleCount: particleComponents.length,
      expectedLegoPosition,
      phraseCount: legoPhrases.length,
      firstPhrases: sortedPhrases.slice(0, expectedLegoPosition + 2).map(p => ({
        pos: p.position,
        known: p.known_text,
        target: p.target_text
      })),
      issues: buildupIssues
    };

    if (hasCorrectBuildup && buildupIssues.length === 0) {
      results.correct.push(legoInfo);
    } else if (buildupIssues.some(i => i.startsWith('Missing'))) {
      results.needsBuildup.push(legoInfo);
    } else {
      results.hasBuildup.push(legoInfo);
    }
  }

  // Output summary
  console.log('SUMMARY');
  console.log('='.repeat(40));
  console.log(`Total M-LEGOs: ${mLegos.length}`);
  console.log(`Correct build-up: ${results.correct.length}`);
  console.log(`Has build-up (minor issues): ${results.hasBuildup.length}`);
  console.log(`Needs build-up: ${results.needsBuildup.length}`);
  console.log(`No components defined: ${results.noComponents.length}`);
  console.log(`No phrases at all: ${results.noPhrases.length}`);
  console.log('');

  // Show examples of each category
  if (results.correct.length > 0) {
    console.log('='.repeat(80));
    console.log('CORRECT BUILD-UP (first 3 examples):\n');
    for (const l of results.correct.slice(0, 3)) {
      printLego(l);
    }
  }

  if (results.needsBuildup.length > 0) {
    console.log('='.repeat(80));
    console.log(`NEEDS BUILD-UP (${results.needsBuildup.length} total, first 10):\n`);
    for (const l of results.needsBuildup.slice(0, 10)) {
      printLego(l);
    }
  }

  if (results.hasBuildup.length > 0) {
    console.log('='.repeat(80));
    console.log('HAS BUILD-UP WITH MINOR ISSUES (first 5):\n');
    for (const l of results.hasBuildup.slice(0, 5)) {
      printLego(l);
    }
  }

  // Output JSON for fixing
  console.log('\n' + '='.repeat(80));
  console.log('LEGOS NEEDING BUILD-UP (JSON):');
  console.log('='.repeat(80) + '\n');

  const fixList = results.needsBuildup.map(l => ({
    seed: l.seed,
    lego: l.lego,
    known: l.known,
    target: l.target,
    meaningfulComponents: l.components.filter(c => !c.isParticle).map(c => ({
      known: c.known,
      target: c.target
    })),
    expectedLegoPosition: l.expectedLegoPosition,
    issues: l.issues
  }));

  console.log(JSON.stringify({ needsBuildup: fixList.slice(0, 50) }, null, 2));

  return results;
}

function printLego(l) {
  console.log(`S${String(l.seed).padStart(4,'0')}L${String(l.lego).padStart(2,'0')}: "${l.known}" → "${l.target}"`);
  console.log(`  Components: ${l.components.map(c => c.target + (c.isParticle ? '(particle)' : '')).join(' + ')}`);
  console.log(`  Meaningful: ${l.meaningfulCount}, Particles: ${l.particleCount}`);
  console.log(`  Expected: P1-P${l.meaningfulCount}=components, P${l.expectedLegoPosition}=LEGO`);
  console.log(`  Current phrases:`);
  for (const p of l.firstPhrases) {
    console.log(`    P${p.pos}: "${p.known}" → "${p.target}"`);
  }
  if (l.issues.length > 0) {
    console.log(`  Issues:`);
    for (const i of l.issues) {
      console.log(`    - ${i}`);
    }
  }
  console.log('');
}

auditMLegoBuildup().catch(console.error);
