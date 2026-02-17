#!/usr/bin/env node
/**
 * Fix systematic errors in eng_for_por
 *
 * Patterns:
 * 1. "talking English" → "speaking English" (6 phrases)
 * 2. "thinking if" → "thinking whether" (11 phrases)
 * 3. "surrpise" → "surprise" (15 phrases - spelling)
 * 4. "as often as possible" → "as much as possible" when known_text has "o máximo possível" (26 phrases - SEMANTIC)
 *
 * Total: 58 phrases
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const DRY_RUN = process.argv.includes('--dry-run');
const EXECUTE = process.argv.includes('--execute');

if (!DRY_RUN && !EXECUTE) {
  console.log('Usage: node fix-eng-for-por-systematic.cjs [--dry-run|--execute]');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const PATTERNS = [
  {
    name: 'talking→speaking',
    find: /\btalking English\b/gi,
    replace: 'speaking English',
    condition: null
  },
  {
    name: 'thinking if→whether',
    find: /\bthinking if\b/gi,
    replace: 'thinking whether',
    condition: null
  },
  {
    name: 'spelling: surrpise',
    find: /\bsurrpise\b/gi,
    replace: 'surprise',
    condition: null
  },
  {
    name: 'often→much (SEMANTIC)',
    find: /\bas often as possible\b/gi,
    replace: 'as much as possible',
    condition: (phrase) => /o máximo possível/i.test(phrase.known_text)
  }
];

async function main() {
  const courseCode = 'eng_for_por';

  console.log(`eng_for_por Systematic Error Fix`);
  console.log('='.repeat(80));
  console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}\n`);

  // Get all phrases
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text')
    .eq('course_code', courseCode);

  if (error) {
    console.error('Error fetching phrases:', error.message);
    process.exit(1);
  }

  console.log(`Loaded ${phrases.length} phrases\n`);

  const fixes = [];

  for (const pattern of PATTERNS) {
    console.log(`\nProcessing: ${pattern.name}`);
    console.log('-'.repeat(80));

    let matchCount = 0;

    for (const phrase of phrases) {
      if (!pattern.find.test(phrase.target_text)) continue;

      // Check condition if specified
      if (pattern.condition && !pattern.condition(phrase)) {
        console.log(`  SKIP: S${String(phrase.seed_number).padStart(4,'0')} - condition not met`);
        continue;
      }

      const newText = phrase.target_text.replace(pattern.find, pattern.replace);

      if (newText !== phrase.target_text) {
        matchCount++;
        fixes.push({
          id: phrase.id,
          seed_number: phrase.seed_number,
          old_text: phrase.target_text,
          new_text: newText,
          pattern: pattern.name
        });

        if (matchCount <= 3) {
          console.log(`  S${String(phrase.seed_number).padStart(4,'0')}:`);
          console.log(`    OLD: ${phrase.target_text.substring(0, 60)}`);
          console.log(`    NEW: ${newText.substring(0, 60)}`);
        }
      }
    }

    console.log(`\n  Total matches: ${matchCount}`);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`SUMMARY:`);
  console.log(`  Total fixes: ${fixes.length}`);
  console.log(`\nBreakdown by pattern:`);
  const byPattern = {};
  fixes.forEach(f => {
    byPattern[f.pattern] = (byPattern[f.pattern] || 0) + 1;
  });
  Object.entries(byPattern).forEach(([pattern, count]) => {
    console.log(`  ${pattern}: ${count}`);
  });

  if (EXECUTE) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`EXECUTING FIXES...`);

    let updated = 0;
    for (const fix of fixes) {
      const { error: updateError } = await supabase
        .from('course_practice_phrases')
        .update({ target_text: fix.new_text })
        .eq('id', fix.id);

      if (updateError) {
        console.error(`  ERROR updating phrase ${fix.id}:`, updateError.message);
      } else {
        updated++;
        if (updated % 10 === 0) {
          process.stdout.write(`\r  Updated: ${updated}/${fixes.length}`);
        }
      }
    }

    console.log(`\n\n✅ Updated ${updated} phrases`);
  } else {
    console.log(`\n[DRY-RUN] No changes made. Use --execute to apply fixes.`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
