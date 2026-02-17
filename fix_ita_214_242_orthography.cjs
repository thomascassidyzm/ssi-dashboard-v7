#!/usr/bin/env node

/**
 * Fix orthographic errors in ita_for_eng seeds 214-242
 *
 * Issues to fix:
 * - puo → può (missing accent)
 * - perche → perché (missing accent)
 * - quell uomo → quell'uomo (missing apostrophe)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixOrthography() {
  console.log('Fixing orthographic errors in ita_for_eng seeds 214-242...\n');

  try {
    // Fix 1: puo → può
    console.log('1. Fixing "puo" → "può"...');
    const { data: puoFixes, error: puoError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE course_practice_phrases
        SET target_text = REPLACE(target_text, ' puo ', ' può ')
        WHERE course_code = 'ita_for_eng'
          AND seed_number BETWEEN 214 AND 242
          AND target_text LIKE '% puo %'
        RETURNING id, seed_number, target_text;
      `
    });

    if (puoError) {
      console.error('Error fixing puo:', puoError);
    } else {
      console.log(`   ✓ Fixed ${puoFixes?.length || 0} phrases\n`);
    }

    // Fix 2: perche → perché
    console.log('2. Fixing "perche" → "perché"...');
    const { data: percheFixes, error: percheError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE course_practice_phrases
        SET target_text = REPLACE(target_text, ' perche ', ' perché ')
        WHERE course_code = 'ita_for_eng'
          AND seed_number BETWEEN 214 AND 242
          AND target_text LIKE '% perche %'
        RETURNING id, seed_number, target_text;
      `
    });

    if (percheError) {
      console.error('Error fixing perche:', percheError);
    } else {
      console.log(`   ✓ Fixed ${percheFixes?.length || 0} phrases\n`);
    }

    // Fix 3: quell uomo → quell'uomo
    console.log('3. Fixing "quell uomo" → "quell\'uomo"...');
    const { data: quellFixes, error: quellError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE course_practice_phrases
        SET target_text = REPLACE(target_text, 'quell uomo', 'quell''uomo')
        WHERE course_code = 'ita_for_eng'
          AND seed_number BETWEEN 214 AND 242
          AND target_text LIKE '%quell uomo%'
        RETURNING id, seed_number, target_text;
      `
    });

    if (quellError) {
      console.error('Error fixing quell uomo:', quellError);
    } else {
      console.log(`   ✓ Fixed ${quellFixes?.length || 0} phrases\n`);
    }

    // Alternative: Direct update using Supabase client
    // Since RPC might not be available, let's do it directly

    console.log('\nUsing direct update method...\n');

    // Get all phrases that need fixing
    const { data: phrases, error: fetchError } = await supabase
      .from('course_practice_phrases')
      .select('*')
      .eq('course_code', 'ita_for_eng')
      .gte('seed_number', 214)
      .lte('seed_number', 242)
      .or('target_text.like.% puo %,target_text.like.% perche %,target_text.like.%quell uomo%');

    if (fetchError) {
      console.error('Error fetching phrases:', fetchError);
      return;
    }

    console.log(`Found ${phrases.length} phrases to check`);

    let fixCount = 0;
    for (const phrase of phrases) {
      let newText = phrase.target_text;
      let changed = false;

      // Apply fixes
      if (newText.includes(' puo ')) {
        newText = newText.replace(/ puo /g, ' può ');
        changed = true;
      }
      if (newText.includes(' perche ')) {
        newText = newText.replace(/ perche /g, ' perché ');
        changed = true;
      }
      if (newText.includes('quell uomo')) {
        newText = newText.replace(/quell uomo/g, "quell'uomo");
        changed = true;
      }

      if (changed) {
        const { error: updateError } = await supabase
          .from('course_practice_phrases')
          .update({ target_text: newText })
          .eq('id', phrase.id);

        if (updateError) {
          console.error(`Error updating phrase ${phrase.id}:`, updateError);
        } else {
          fixCount++;
          console.log(`   ✓ Seed ${phrase.seed_number}: Fixed phrase ${phrase.id}`);
          console.log(`      OLD: ${phrase.target_text}`);
          console.log(`      NEW: ${newText}`);
        }
      }
    }

    console.log(`\n✓ COMPLETE: Fixed ${fixCount} phrases`);

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixOrthography();
