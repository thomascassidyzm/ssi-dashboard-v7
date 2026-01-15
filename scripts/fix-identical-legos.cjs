#!/usr/bin/env node
/**
 * Fix identical LEGOs (same known + same target)
 * - Mark 2nd+ occurrences as is_new: false
 * - Delete their practice phrases (baskets)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE_CODE = 'zho_for_eng';

async function fixIdenticalLegos() {
  console.log('FIXING IDENTICAL LEGOS');
  console.log('='.repeat(70));

  // Get all LEGOs
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, is_new')
    .eq('course_code', COURSE_CODE)
    .order('seed_number')
    .order('lego_index');

  // Group by known+target
  const byKnownTarget = {};
  for (const lego of legos) {
    const key = `${lego.known_text}|||${lego.target_text}`;
    if (!byKnownTarget[key]) byKnownTarget[key] = [];
    byKnownTarget[key].push(lego);
  }

  // Find duplicates (keep first, mark rest as is_new: false and delete baskets)
  let updatedLegos = 0;
  let deletedPhrases = 0;

  for (const [key, group] of Object.entries(byKnownTarget)) {
    if (group.length > 1) {
      // Sort by seed_number, lego_index to ensure first appearance is kept
      group.sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);

      const first = group[0];
      const duplicates = group.slice(1);

      console.log(`"${first.known_text}" → "${first.target_text}"`);
      console.log(`  Keep: S${String(first.seed_number).padStart(4,'0')}L${String(first.lego_index).padStart(2,'0')}`);

      for (const dup of duplicates) {
        const legoId = `S${String(dup.seed_number).padStart(4,'0')}L${String(dup.lego_index).padStart(2,'0')}`;

        // Mark as is_new: false
        const { error: updateErr } = await supabase
          .from('course_legos')
          .update({ is_new: false })
          .eq('course_code', COURSE_CODE)
          .eq('seed_number', dup.seed_number)
          .eq('lego_index', dup.lego_index);

        if (updateErr) {
          console.log(`  ✗ ${legoId}: update failed - ${updateErr.message}`);
          continue;
        }
        updatedLegos++;

        // Delete practice phrases for this LEGO
        const { data: deleted, error: deleteErr } = await supabase
          .from('course_practice_phrases')
          .delete()
          .eq('course_code', COURSE_CODE)
          .eq('seed_number', dup.seed_number)
          .eq('lego_index', dup.lego_index)
          .select('id');

        if (deleteErr) {
          console.log(`  ✗ ${legoId}: delete phrases failed - ${deleteErr.message}`);
        } else {
          const count = deleted?.length || 0;
          deletedPhrases += count;
          console.log(`  ✓ ${legoId}: is_new=false, deleted ${count} phrases`);
        }
      }
      console.log('');
    }
  }

  console.log('='.repeat(70));
  console.log('SUMMARY:');
  console.log(`  LEGOs marked is_new=false: ${updatedLegos}`);
  console.log(`  Practice phrases deleted: ${deletedPhrases}`);
}

fixIdenticalLegos().catch(console.error);
