#!/usr/bin/env node
/**
 * Delete phrases with vocabulary violations from zho_for_eng
 *
 * Usage:
 *   node scripts/delete-vocab-violations.cjs --dry-run   # Preview only
 *   node scripts/delete-vocab-violations.cjs --execute   # Actually delete
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE_CODE = 'zho_for_eng';

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--execute');

async function main() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`DELETE VOCAB-VIOLATING PHRASES: ${COURSE_CODE}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : '🔴 EXECUTE (will delete)'}`);
  console.log(`${'═'.repeat(70)}\n`);

  // Get all LEGOs
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, target_text, type, components')
    .eq('course_code', COURSE_CODE)
    .order('seed_number')
    .order('lego_index');

  // Build cumulative vocab by LEGO position
  const vocabByLegoId = new Map();
  const cumulativeVocab = new Set();

  for (const lego of legos) {
    const legoId = `S${String(lego.seed_number).padStart(4,'0')}L${String(lego.lego_index).padStart(2,'0')}`;

    // Add LEGO's characters
    const chars = [...(lego.target_text || '')].filter(c => c.trim() && !c.match(/[\s\u3000]/));
    chars.forEach(c => cumulativeVocab.add(c));

    // Add M-type components
    if (lego.type === 'M' && lego.components) {
      for (const comp of lego.components) {
        const t = comp.t || comp.target || comp.target_text;
        if (t) {
          [...t].filter(c => c.trim() && !c.match(/[\s\u3000]/)).forEach(c => cumulativeVocab.add(c));
        }
      }
    }

    vocabByLegoId.set(legoId, new Set(cumulativeVocab));
  }

  // Get all phrases
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, position, known_text, target_text')
    .eq('course_code', COURSE_CODE)
    .order('seed_number')
    .order('lego_index')
    .order('position');

  console.log(`Total phrases: ${phrases.length}`);
  console.log(`Total LEGOs: ${legos.length}\n`);

  // Find violations
  const toDelete = [];
  const affectedBaskets = new Map(); // legoId -> { before, after, deleted[] }

  for (const p of phrases) {
    const legoId = `S${String(p.seed_number).padStart(4,'0')}L${String(p.lego_index).padStart(2,'0')}`;
    const availableVocab = vocabByLegoId.get(legoId);

    if (!affectedBaskets.has(legoId)) {
      affectedBaskets.set(legoId, { before: 0, deleted: [], remaining: 0 });
    }
    affectedBaskets.get(legoId).before++;

    if (!availableVocab) continue;

    // Clean target for analysis
    const cleanTarget = (p.target_text || '').replace(/[\s\u3000。，！？、：；""'']/g, '');
    const targetChars = [...cleanTarget];
    const unknownChars = targetChars.filter(c => !availableVocab.has(c));

    if (unknownChars.length > 0) {
      toDelete.push({
        id: p.id,
        legoId,
        position: p.position,
        target: p.target_text,
        known: p.known_text,
        unknown: unknownChars
      });
      affectedBaskets.get(legoId).deleted.push(p.position);
    }
  }

  // Calculate remaining
  for (const [legoId, stats] of affectedBaskets) {
    stats.remaining = stats.before - stats.deleted.length;
  }

  console.log(`Phrases with vocab violations: ${toDelete.length}\n`);

  // Show what will be deleted (first 30)
  console.log(`${'─'.repeat(70)}`);
  console.log('PHRASES TO DELETE (first 30):');
  console.log(`${'─'.repeat(70)}\n`);

  toDelete.slice(0, 30).forEach((p, i) => {
    console.log(`${i+1}. ${p.legoId} P${p.position}: "${p.target}"`);
    console.log(`   Unknown: [${p.unknown.join('')}]`);
  });
  if (toDelete.length > 30) {
    console.log(`\n   ... and ${toDelete.length - 30} more\n`);
  }

  // Show affected baskets summary
  const basketsNeedingReview = [...affectedBaskets.entries()]
    .filter(([_, stats]) => stats.deleted.length > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`AFFECTED BASKETS: ${basketsNeedingReview.length}`);
  console.log(`${'─'.repeat(70)}\n`);

  console.log('LegoId    | Before | Deleted | Remaining | Status');
  console.log('----------|--------|---------|-----------|--------');

  for (const [legoId, stats] of basketsNeedingReview) {
    const status = stats.remaining < 6 ? '⚠️  NEEDS MORE' : '✓ OK';
    console.log(`${legoId} | ${String(stats.before).padStart(6)} | ${String(stats.deleted.length).padStart(7)} | ${String(stats.remaining).padStart(9)} | ${status}`);
  }

  // Summary of baskets needing more phrases
  const basketsNeedingMore = basketsNeedingReview.filter(([_, stats]) => stats.remaining < 6);
  console.log(`\nBaskets with <6 phrases after deletion: ${basketsNeedingMore.length}`);
  if (basketsNeedingMore.length > 0) {
    console.log('LEGOs needing more phrases: ' + basketsNeedingMore.map(([id]) => id).join(', '));
  }

  // Execute deletion if not dry run
  if (!DRY_RUN) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log('EXECUTING DELETION...');
    console.log(`${'═'.repeat(70)}\n`);

    const idsToDelete = toDelete.map(p => p.id);

    // Delete in batches of 100
    let deleted = 0;
    for (let i = 0; i < idsToDelete.length; i += 100) {
      const batch = idsToDelete.slice(i, i + 100);
      const { error } = await supabase
        .from('course_practice_phrases')
        .delete()
        .in('id', batch);

      if (error) {
        console.error(`Error deleting batch ${i}-${i + batch.length}:`, error.message);
      } else {
        deleted += batch.length;
        console.log(`Deleted ${deleted}/${idsToDelete.length} phrases...`);
      }
    }

    console.log(`\n✅ DELETED ${deleted} phrases with vocabulary violations\n`);
  } else {
    console.log(`\n${'═'.repeat(70)}`);
    console.log('DRY RUN COMPLETE - No changes made');
    console.log('Run with --execute to delete these phrases');
    console.log(`${'═'.repeat(70)}\n`);
  }
}

main().catch(console.error);
