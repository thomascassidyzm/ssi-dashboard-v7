#!/usr/bin/env node
/**
 * Insert missing build-up phrases for M-LEGOs
 * (Shifts already happened, just need to fill in the gaps)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE_CODE = 'zho_for_eng';

const PARTICLES = ['了', '着', '过', '的', '地', '得', '吗', '呢', '吧', '啊', '把', '被'];

function isParticle(target) {
  return PARTICLES.includes(target.trim());
}

function getMeaningfulComponents(components, legoTarget) {
  return (components || []).filter(c =>
    !isParticle(c.target) && c.target !== legoTarget
  );
}

async function insertBuildups() {
  console.log('INSERTING BUILD-UP PHRASES\n');
  console.log('='.repeat(70) + '\n');

  // Get all M-type LEGOs
  const { data: mLegos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, components')
    .eq('course_code', COURSE_CODE)
    .eq('type', 'M')
    .not('components', 'is', null)
    .order('seed_number')
    .order('lego_index');

  // Get all phrases to check for gaps
  const { data: allPhrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, position')
    .eq('course_code', COURSE_CODE);

  // Group phrases by LEGO
  const phraseMap = {};
  for (const p of allPhrases) {
    const key = `${p.seed_number}-${p.lego_index}`;
    if (!phraseMap[key]) phraseMap[key] = [];
    phraseMap[key].push(p.position);
  }

  let inserted = 0;
  let errors = 0;
  let skipped = 0;

  for (const lego of mLegos) {
    const key = `${lego.seed_number}-${lego.lego_index}`;
    const positions = phraseMap[key] || [];

    if (positions.length === 0) continue;

    const components = getMeaningfulComponents(lego.components, lego.target_text);
    if (components.length === 0) continue;

    const minPos = Math.min(...positions);
    const expectedBuildupCount = components.length + 1; // components + LEGO

    // Check if there's a gap at the start (positions don't start at 1)
    if (minPos === 1) {
      // Already has build-up or didn't get shifted
      skipped++;
      continue;
    }

    // Need to insert build-up phrases at P1 through P(expectedBuildupCount)
    const toInsert = [];

    // Component phrases
    for (let i = 0; i < components.length; i++) {
      const pos = i + 1;
      if (!positions.includes(pos)) {
        toInsert.push({
          course_code: COURSE_CODE,
          seed_number: lego.seed_number,
          lego_index: lego.lego_index,
          position: pos,
          known_text: components[i].known,
          target_text: components[i].target,
          word_count: components[i].target.length,
          lego_count: 1,
          status: 'draft',
          version: 1,
          metadata: {}
        });
      }
    }

    // LEGO phrase
    const legoPos = components.length + 1;
    if (!positions.includes(legoPos)) {
      toInsert.push({
        course_code: COURSE_CODE,
        seed_number: lego.seed_number,
        lego_index: lego.lego_index,
        position: legoPos,
        known_text: lego.known_text,
        target_text: lego.target_text,
        word_count: lego.target_text.length,
        lego_count: 1,
        status: 'draft',
        version: 1,
        metadata: {}
      });
    }

    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('course_practice_phrases')
        .insert(toInsert);

      if (error) {
        console.error(`✗ S${lego.seed_number}L${lego.lego_index}: ${error.message}`);
        errors++;
      } else {
        inserted += toInsert.length;
      }
    }
  }

  console.log('='.repeat(70));
  console.log('RESULTS:');
  console.log(`  Phrases inserted: ${inserted}`);
  console.log(`  Skipped (no gap): ${skipped}`);
  console.log(`  Errors: ${errors}`);

  return { inserted, skipped, errors };
}

insertBuildups().catch(console.error);
