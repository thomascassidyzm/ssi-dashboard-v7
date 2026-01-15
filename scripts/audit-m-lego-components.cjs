#!/usr/bin/env node
/**
 * Audit M-type LEGOs to check component phrase structure
 *
 * Required structure for M-type LEGOs:
 * P1 = Component 1 introduction
 * P2 = Component 2 introduction
 * ...
 * PN+1 = LEGO itself
 * PN+2... = Practice phrases
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE_CODE = 'zho_for_eng';

async function auditMLegoComponents() {
  console.log('AUDITING M-TYPE LEGO COMPONENT STRUCTURE\n');
  console.log('='.repeat(80) + '\n');

  // Get all M-type LEGOs with their components
  const { data: mLegos, error: legoError } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type, components')
    .eq('course_code', COURSE_CODE)
    .eq('type', 'M')
    .order('seed_number')
    .order('lego_index');

  if (legoError) {
    console.error('Error fetching LEGOs:', legoError);
    return;
  }

  console.log(`Found ${mLegos.length} M-type LEGOs\n`);

  // Get all phrases for these LEGOs
  const legoKeys = mLegos.map(l => `${l.seed_number}-${l.lego_index}`);

  const { data: phrases, error: phraseError } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, position, known_text, target_text')
    .eq('course_code', COURSE_CODE)
    .order('seed_number')
    .order('lego_index')
    .order('position');

  if (phraseError) {
    console.error('Error fetching phrases:', phraseError);
    return;
  }

  // Group phrases by LEGO
  const phrasesByLego = {};
  for (const p of phrases) {
    const key = `${p.seed_number}-${p.lego_index}`;
    if (!phrasesByLego[key]) phrasesByLego[key] = [];
    phrasesByLego[key].push(p);
  }

  const issues = [];
  const missingComponents = [];
  const correctLegos = [];

  for (const lego of mLegos) {
    const key = `${lego.seed_number}-${lego.lego_index}`;
    const legoPhrases = phrasesByLego[key] || [];
    const components = lego.components || [];

    // Expected structure:
    // positions 1..N = component introductions
    // position N+1 = LEGO itself
    // positions N+2+ = practice phrases

    const numComponents = components.length;
    const expectedMinPhrases = numComponents + 1; // components + LEGO itself

    const legoIssues = [];
    const missing = [];

    // Check if we have enough phrases
    if (legoPhrases.length < expectedMinPhrases) {
      legoIssues.push(`Only ${legoPhrases.length} phrases, need at least ${expectedMinPhrases} (${numComponents} components + LEGO)`);
    }

    // Check each component position
    for (let i = 0; i < numComponents; i++) {
      const expectedPosition = i + 1;
      const phrase = legoPhrases.find(p => p.position === expectedPosition);
      const component = components[i];
      // Components are objects with {known, target}
      const componentTarget = component.target || component;
      const componentKnown = component.known || component;

      if (!phrase) {
        missing.push({
          position: expectedPosition,
          component: component,
          type: 'component'
        });
        legoIssues.push(`Missing P${expectedPosition}: Component "${componentKnown}" (${componentTarget})`);
      } else {
        // Check if phrase target contains the component target
        if (!phrase.target_text.includes(componentTarget)) {
          legoIssues.push(`P${expectedPosition} target "${phrase.target_text}" doesn't contain component "${componentTarget}"`);
        }
      }
    }

    // Check LEGO position
    const legoPosition = numComponents + 1;
    const legoPhrase = legoPhrases.find(p => p.position === legoPosition);

    if (!legoPhrase) {
      missing.push({
        position: legoPosition,
        component: { known: lego.known_text, target: lego.target_text },
        type: 'lego'
      });
      legoIssues.push(`Missing P${legoPosition}: LEGO itself "${lego.known_text}" (${lego.target_text})`);
    } else {
      // Check if phrase target contains the full LEGO
      if (!legoPhrase.target_text.includes(lego.target_text)) {
        legoIssues.push(`P${legoPosition} target "${legoPhrase.target_text}" doesn't contain LEGO "${lego.target_text}"`);
      }
    }

    // Format components for display
    const componentStrings = components.map(c => `${c.known || c}(${c.target || c})`);

    if (legoIssues.length > 0) {
      issues.push({
        seed: lego.seed_number,
        lego: lego.lego_index,
        known: lego.known_text,
        target: lego.target_text,
        components: componentStrings,
        phraseCount: legoPhrases.length,
        issues: legoIssues,
        missing: missing,
        phrases: legoPhrases.slice(0, 5).map(p => ({
          pos: p.position,
          known: p.known_text,
          target: p.target_text
        }))
      });

      if (missing.length > 0) {
        missingComponents.push({
          seed: lego.seed_number,
          lego: lego.lego_index,
          known: lego.known_text,
          target: lego.target_text,
          components: components,
          missing: missing
        });
      }
    } else {
      correctLegos.push({
        seed: lego.seed_number,
        lego: lego.lego_index,
        known: lego.known_text,
        components: componentStrings,
        phraseCount: legoPhrases.length
      });
    }
  }

  // Output results
  console.log('SUMMARY\n');
  console.log(`Total M-type LEGOs: ${mLegos.length}`);
  console.log(`Correct structure: ${correctLegos.length}`);
  console.log(`With issues: ${issues.length}`);
  console.log(`Missing component phrases: ${missingComponents.length}`);
  console.log('');

  if (issues.length > 0) {
    console.log('='.repeat(80));
    console.log('LEGOS WITH ISSUES\n');

    for (const issue of issues) {
      console.log(`S${String(issue.seed).padStart(4,'0')}L${String(issue.lego).padStart(2,'0')}: "${issue.known}" → "${issue.target}"`);
      console.log(`  Components: ${issue.components.join(' + ')}`);
      console.log(`  Phrase count: ${issue.phraseCount}`);
      console.log(`  Issues:`);
      for (const i of issue.issues) {
        console.log(`    - ${i}`);
      }
      if (issue.phrases.length > 0) {
        console.log(`  Current phrases:`);
        for (const p of issue.phrases) {
          console.log(`    P${p.pos}: "${p.known}" → "${p.target}"`);
        }
      }
      console.log('');
    }
  }

  // Output missing components as JSON for regeneration
  if (missingComponents.length > 0) {
    console.log('='.repeat(80));
    console.log('MISSING COMPONENT PHRASES (JSON)\n');
    console.log(JSON.stringify({ missing_components: missingComponents }, null, 2));
  }

  return { issues, missingComponents, correctLegos };
}

auditMLegoComponents().catch(console.error);
