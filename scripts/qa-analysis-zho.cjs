#!/usr/bin/env node
/**
 * QA Analysis for zho_for_eng course
 * Checks for:
 * 1. Placeholder text in course_seeds (target_text still has {target} or is null)
 * 2. Vocabulary violations in practice phrases
 * 3. Phrases exceeding 20 characters (syllable limit for Chinese)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE_CODE = 'zho_for_eng';
const MAX_CHINESE_LENGTH = 20;

async function analyze() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`QA ANALYSIS: ${COURSE_CODE}`);
  console.log(`${'='.repeat(70)}\n`);

  // 1. CHECK COURSE_SEEDS FOR PLACEHOLDER TEXT
  console.log(`\n📋 1. SEED PLACEHOLDER CHECK`);
  console.log(`${'─'.repeat(50)}`);

  const { data: seeds, error: seedErr } = await supabase
    .from('course_seeds')
    .select('seed_number, seed_id, known_text, target_text')
    .eq('course_code', COURSE_CODE)
    .order('seed_number');

  if (seedErr) {
    console.error('Error fetching seeds:', seedErr.message);
    return;
  }

  const placeholderIssues = [];
  const missingTargets = [];

  for (const seed of seeds || []) {
    if (!seed.target_text || seed.target_text.trim() === '') {
      missingTargets.push(seed);
    } else if (seed.target_text.includes('{target}') || seed.target_text.includes('{')) {
      placeholderIssues.push(seed);
    }
  }

  console.log(`Total seeds: ${seeds?.length || 0}`);
  console.log(`Missing target_text: ${missingTargets.length}`);
  console.log(`Contains placeholder: ${placeholderIssues.length}`);

  if (missingTargets.length > 0) {
    console.log(`\n⚠️  Seeds with MISSING target_text (first 10):`);
    missingTargets.slice(0, 10).forEach(s => {
      console.log(`   S${String(s.seed_number).padStart(4,'0')}: "${s.known_text}"`);
    });
    if (missingTargets.length > 10) console.log(`   ... and ${missingTargets.length - 10} more`);
  }

  if (placeholderIssues.length > 0) {
    console.log(`\n⚠️  Seeds with PLACEHOLDER text (first 10):`);
    placeholderIssues.slice(0, 10).forEach(s => {
      console.log(`   S${String(s.seed_number).padStart(4,'0')}: "${s.target_text}"`);
    });
  }

  // 2. BUILD VOCABULARY FROM LEGOS (in order)
  console.log(`\n\n📚 2. VOCABULARY VIOLATION CHECK`);
  console.log(`${'─'.repeat(50)}`);

  const { data: legos, error: legoErr } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type, components')
    .eq('course_code', COURSE_CODE)
    .order('seed_number')
    .order('lego_index');

  if (legoErr) {
    console.error('Error fetching legos:', legoErr.message);
    return;
  }

  console.log(`Total LEGOs: ${legos?.length || 0}`);

  // Build cumulative vocabulary by LEGO position
  const vocabByLegoId = new Map();
  const cumulativeVocab = new Set();

  for (const lego of legos || []) {
    const legoId = `S${String(lego.seed_number).padStart(4,'0')}L${String(lego.lego_index).padStart(2,'0')}`;

    // Add LEGO's own characters to vocab
    const chars = [...lego.target_text].filter(c => c.trim() && !c.match(/[\s\u3000]/));
    chars.forEach(c => cumulativeVocab.add(c));

    // Add M-type component characters
    if (lego.type === 'M' && lego.components) {
      for (const comp of lego.components) {
        const compChars = [...(comp.target || '')].filter(c => c.trim() && !c.match(/[\s\u3000]/));
        compChars.forEach(c => cumulativeVocab.add(c));
      }
    }

    // Store snapshot of vocab available at this LEGO
    vocabByLegoId.set(legoId, new Set(cumulativeVocab));
  }

  console.log(`Final vocabulary size: ${cumulativeVocab.size} characters`);

  // 3. CHECK PRACTICE PHRASES
  console.log(`\n\n🔍 3. PRACTICE PHRASE ANALYSIS`);
  console.log(`${'─'.repeat(50)}`);

  const { data: phrases, error: phraseErr } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, position, known_text, target_text')
    .eq('course_code', COURSE_CODE)
    .order('seed_number')
    .order('lego_index')
    .order('position');

  if (phraseErr) {
    console.error('Error fetching phrases:', phraseErr.message);
    return;
  }

  console.log(`Total phrases: ${phrases?.length || 0}`);

  const vocabViolations = [];
  const lengthViolations = [];

  for (const phrase of phrases || []) {
    const legoId = `S${String(phrase.seed_number).padStart(4,'0')}L${String(phrase.lego_index).padStart(2,'0')}`;
    const availableVocab = vocabByLegoId.get(legoId);

    if (!availableVocab) {
      console.warn(`   Warning: No vocab found for ${legoId}`);
      continue;
    }

    // Check vocab violations
    const phraseChars = [...phrase.target_text].filter(c => c.trim() && !c.match(/[\s\u3000。，！？、：；""'']/));
    const unknownChars = phraseChars.filter(c => !availableVocab.has(c));

    if (unknownChars.length > 0) {
      vocabViolations.push({
        legoId,
        position: phrase.position,
        phrase: phrase.target_text,
        known: phrase.known_text,
        unknown: unknownChars
      });
    }

    // Check length violations (Chinese characters = syllables)
    if (phraseChars.length > MAX_CHINESE_LENGTH) {
      lengthViolations.push({
        legoId,
        position: phrase.position,
        phrase: phrase.target_text,
        known: phrase.known_text,
        length: phraseChars.length
      });
    }
  }

  // Report vocab violations
  console.log(`\nVocabulary violations: ${vocabViolations.length}`);
  if (vocabViolations.length > 0) {
    console.log(`\n⚠️  Phrases with UNKNOWN CHARACTERS (first 20):`);
    vocabViolations.slice(0, 20).forEach((v, i) => {
      console.log(`   ${i+1}. ${v.legoId} P${v.position}: "${v.phrase}"`);
      console.log(`      Unknown: [${v.unknown.join('')}]`);
      console.log(`      English: "${v.known}"`);
    });
    if (vocabViolations.length > 20) console.log(`   ... and ${vocabViolations.length - 20} more`);

    // Analyze most common unknown characters
    const charCounts = {};
    vocabViolations.forEach(v => {
      v.unknown.forEach(c => {
        charCounts[c] = (charCounts[c] || 0) + 1;
      });
    });
    const sortedChars = Object.entries(charCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);
    console.log(`\n   Most common unknown characters:`);
    sortedChars.forEach(([char, count]) => console.log(`      "${char}": ${count} occurrences`));
  }

  // Report length violations
  console.log(`\n\n📏 4. LENGTH VIOLATIONS (>${MAX_CHINESE_LENGTH} characters)`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`Phrases exceeding limit: ${lengthViolations.length}`);

  if (lengthViolations.length > 0) {
    console.log(`\n⚠️  Phrases TOO LONG (first 20):`);
    lengthViolations.slice(0, 20).forEach((v, i) => {
      console.log(`   ${i+1}. ${v.legoId} P${v.position}: ${v.length} chars`);
      console.log(`      "${v.phrase}"`);
      console.log(`      "${v.known}"`);
    });
    if (lengthViolations.length > 20) console.log(`   ... and ${lengthViolations.length - 20} more`);

    // Length distribution
    const lengthBuckets = {};
    lengthViolations.forEach(v => {
      const bucket = Math.floor(v.length / 5) * 5;
      lengthBuckets[bucket] = (lengthBuckets[bucket] || 0) + 1;
    });
    console.log(`\n   Length distribution:`);
    Object.entries(lengthBuckets).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).forEach(([bucket, count]) => {
      console.log(`      ${bucket}-${parseInt(bucket)+4} chars: ${count} phrases`);
    });
  }

  // SUMMARY
  console.log(`\n\n${'='.repeat(70)}`);
  console.log(`SUMMARY`);
  console.log(`${'='.repeat(70)}`);
  console.log(`
Seeds:          ${seeds?.length || 0}
  - Missing target:   ${missingTargets.length}
  - Has placeholder:  ${placeholderIssues.length}

LEGOs:          ${legos?.length || 0}
Vocabulary:     ${cumulativeVocab.size} characters

Phrases:        ${phrases?.length || 0}
  - Vocab violations: ${vocabViolations.length}
  - Too long (>${MAX_CHINESE_LENGTH}): ${lengthViolations.length}
`);

  // Exit code
  const hasIssues = missingTargets.length > 0 || placeholderIssues.length > 0 ||
                    vocabViolations.length > 0 || lengthViolations.length > 0;

  if (hasIssues) {
    console.log(`❌ QA ISSUES FOUND - Review above\n`);
    process.exit(1);
  } else {
    console.log(`✅ ALL CHECKS PASSED\n`);
    process.exit(0);
  }
}

analyze().catch(console.error);
