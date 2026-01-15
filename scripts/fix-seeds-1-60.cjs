/**
 * Fix seeds 1-60:
 * 1. Update seed target_text with full sentence translation
 * 2. Inject seed sentence into final LEGO's phrases
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE_CODE = 'zho_for_eng';

async function fixSeeds() {
  console.log('Fixing seeds 1-60 for', COURSE_CODE);
  console.log('='.repeat(60));

  for (let seedNum = 1; seedNum <= 60; seedNum++) {
    // Get the seed
    const { data: seed } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', COURSE_CODE)
      .eq('seed_number', seedNum)
      .single();

    if (!seed) {
      console.log(`S${String(seedNum).padStart(4, '0')}: No seed found, skipping`);
      continue;
    }

    // Get all LEGOs for this seed, ordered by index
    const { data: legos } = await supabase
      .from('course_legos')
      .select('lego_index, known_text, target_text')
      .eq('course_code', COURSE_CODE)
      .eq('seed_number', seedNum)
      .order('lego_index', { ascending: true });

    if (!legos || legos.length === 0) {
      console.log(`S${String(seedNum).padStart(4, '0')}: No LEGOs found, skipping`);
      continue;
    }

    // Build the full sentence from LEGOs (combine all targets)
    // The full sentence should combine all LEGO targets in order
    const fullTarget = legos.map(l => l.target_text).join('');
    const fullKnown = seed.known_text;

    // Update seed target_text if it's a placeholder or incomplete
    if (seed.target_text.includes('placeholder') || seed.target_text.length < 5) {
      const { error: seedError } = await supabase
        .from('course_seeds')
        .update({ target_text: fullTarget, status: 'complete' })
        .eq('course_code', COURSE_CODE)
        .eq('seed_number', seedNum);

      if (seedError) {
        console.log(`S${String(seedNum).padStart(4, '0')}: Error updating seed -`, seedError.message);
      } else {
        console.log(`S${String(seedNum).padStart(4, '0')}: Updated target → ${fullTarget}`);
      }
    } else {
      console.log(`S${String(seedNum).padStart(4, '0')}: Target OK → ${seed.target_text}`);
    }

    // Find the final LEGO (highest index)
    const finalLego = legos[legos.length - 1];
    const finalLegoIndex = finalLego.lego_index;

    // Get existing phrases for final LEGO
    const { data: existingPhrases } = await supabase
      .from('course_practice_phrases')
      .select('known_text, target_text, position')
      .eq('course_code', COURSE_CODE)
      .eq('seed_number', seedNum)
      .eq('lego_index', finalLegoIndex)
      .order('position', { ascending: true });

    // Check if seed sentence is already in phrases
    const seedInPhrases = existingPhrases?.some(p =>
      p.known_text.toLowerCase().trim() === fullKnown.toLowerCase().trim() ||
      p.target_text === fullTarget ||
      p.target_text === seed.target_text
    );

    if (!seedInPhrases && existingPhrases) {
      // Add the seed sentence as a new phrase (at the end, it's an ETERNAL phrase)
      const newPosition = (existingPhrases.length > 0
        ? Math.max(...existingPhrases.map(p => p.position)) + 1
        : 1);

      const targetToUse = seed.target_text.includes('placeholder') ? fullTarget : seed.target_text;

      const { error: phraseError } = await supabase
        .from('course_practice_phrases')
        .insert({
          course_code: COURSE_CODE,
          seed_number: seedNum,
          lego_index: finalLegoIndex,
          position: newPosition,
          known_text: fullKnown,
          target_text: targetToUse,
          word_count: targetToUse.length,
          lego_count: fullKnown.split(/\s+/).length,
          metadata: { is_seed_sentence: true },
          status: 'draft',
          version: 1
        });

      if (phraseError) {
        console.log(`  └─ L${String(finalLegoIndex).padStart(2, '0')}: Error adding seed phrase -`, phraseError.message);
      } else {
        console.log(`  └─ L${String(finalLegoIndex).padStart(2, '0')}: Added seed sentence as phrase #${newPosition}`);
      }
    } else if (seedInPhrases) {
      console.log(`  └─ L${String(finalLegoIndex).padStart(2, '0')}: Seed sentence already in phrases`);
    }

    // Mark final LEGO as is_new (it's the culminating LEGO)
    await supabase
      .from('course_legos')
      .update({ is_new: true })
      .eq('course_code', COURSE_CODE)
      .eq('seed_number', seedNum)
      .eq('lego_index', finalLegoIndex);
  }

  console.log('='.repeat(60));
  console.log('Done!');
}

fixSeeds().catch(console.error);
