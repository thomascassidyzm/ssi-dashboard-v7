#!/usr/bin/env node
/**
 * Full QA Report for zho_for_eng course
 *
 * 1. Seeds needing full translations
 * 2. Phrase violations by type (vocab, length, punctuation)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE_CODE = 'zho_for_eng';
const MAX_SYLLABLES = 20;

async function generateReport() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           QA REPORT: zho_for_eng                                 ║');
  console.log('║           Generated: ' + new Date().toISOString().split('T')[0] + '                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // ========================================================================
  // PART 1: SEEDS NEEDING FULL TRANSLATIONS
  // ========================================================================

  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', COURSE_CODE)
    .order('seed_number');

  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, target_text, type, components')
    .eq('course_code', COURSE_CODE)
    .order('seed_number')
    .order('lego_index');

  // Group LEGOs by seed
  const legosBySeed = {};
  for (const l of legos) {
    if (!legosBySeed[l.seed_number]) legosBySeed[l.seed_number] = [];
    legosBySeed[l.seed_number].push(l);
  }

  // Identify seeds with fragments (not full translations)
  const fragmentSeeds = [];
  for (const s of seeds) {
    const targetLen = s.target_text?.length || 0;
    const hasEnding = /[。！？]$/.test(s.target_text || '');
    const isFragment = targetLen < 5 || (!hasEnding && targetLen < 8);

    if (isFragment) {
      const seedLegos = legosBySeed[s.seed_number] || [];
      fragmentSeeds.push({
        seed_number: s.seed_number,
        known_text: s.known_text,
        current_target: s.target_text,
        lego_count: seedLegos.length,
        lego_targets: seedLegos.map(l => l.target_text)
      });
    }
  }

  console.log('════════════════════════════════════════════════════════════════════');
  console.log('PART 1: SEEDS NEEDING FULL TRANSLATIONS');
  console.log('════════════════════════════════════════════════════════════════════\n');
  console.log(`Total seeds: ${seeds.length}`);
  console.log(`Seeds with full translations: ${seeds.length - fragmentSeeds.length}`);
  console.log(`Seeds needing translation: ${fragmentSeeds.length}\n`);

  console.log('─────────────────────────────────────────────────────────────────────');
  console.log('SEEDS REQUIRING FULL CHINESE TRANSLATION:');
  console.log('─────────────────────────────────────────────────────────────────────\n');

  for (const s of fragmentSeeds) {
    console.log(`S${String(s.seed_number).padStart(4, '0')}:`);
    console.log(`  English: "${s.known_text}"`);
    console.log(`  Current: "${s.current_target}" (fragment - last LEGO only)`);
    console.log(`  LEGOs:   ${s.lego_targets.join(' + ')}`);
    console.log('');
  }

  // ========================================================================
  // PART 2: PHRASE VIOLATIONS BY TYPE
  // ========================================================================

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('PART 2: PHRASE VIOLATIONS BY TYPE');
  console.log('════════════════════════════════════════════════════════════════════\n');

  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, position, known_text, target_text')
    .eq('course_code', COURSE_CODE)
    .order('seed_number')
    .order('lego_index')
    .order('position');

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

  // Categorize violations
  const vocabViolations = [];
  const lengthViolations = [];
  const punctuationIssues = [];

  for (const p of phrases) {
    const legoId = `S${String(p.seed_number).padStart(4,'0')}L${String(p.lego_index).padStart(2,'0')}`;
    const availableVocab = vocabByLegoId.get(legoId);

    // Clean target for analysis
    const cleanTarget = (p.target_text || '').replace(/[\s\u3000。，！？、：；""'']/g, '');
    const targetChars = [...cleanTarget];

    // Check vocab violations
    if (availableVocab) {
      const unknownChars = targetChars.filter(c => !availableVocab.has(c));
      if (unknownChars.length > 0) {
        vocabViolations.push({
          legoId,
          position: p.position,
          target: p.target_text,
          known: p.known_text,
          unknown: unknownChars
        });
      }
    }

    // Check length (syllables = characters for Chinese)
    if (targetChars.length > MAX_SYLLABLES) {
      lengthViolations.push({
        legoId,
        position: p.position,
        target: p.target_text,
        known: p.known_text,
        length: targetChars.length
      });
    }

    // Check punctuation issues (missing or wrong)
    const hasChinesePunctuation = /[。！？]$/.test(p.target_text || '');
    const hasEnglishPunctuation = /[.!?]$/.test(p.target_text || '');
    const knownEndsWithPunct = /[.!?]$/.test(p.known_text || '');

    if (hasEnglishPunctuation && !hasChinesePunctuation) {
      punctuationIssues.push({
        legoId,
        position: p.position,
        target: p.target_text,
        known: p.known_text,
        issue: 'English punctuation in Chinese text'
      });
    }
  }

  console.log(`Total phrases analyzed: ${phrases.length}\n`);

  // Vocabulary violations
  console.log('─────────────────────────────────────────────────────────────────────');
  console.log(`A. VOCABULARY VIOLATIONS: ${vocabViolations.length} phrases`);
  console.log('   (Using characters not yet introduced)');
  console.log('─────────────────────────────────────────────────────────────────────\n');

  // Show first 30
  vocabViolations.slice(0, 30).forEach((v, i) => {
    console.log(`${i+1}. ${v.legoId} P${v.position}:`);
    console.log(`   Target:  "${v.target}"`);
    console.log(`   Unknown: [${v.unknown.join('')}]`);
    console.log(`   English: "${v.known}"`);
    console.log('');
  });
  if (vocabViolations.length > 30) {
    console.log(`   ... and ${vocabViolations.length - 30} more\n`);
  }

  // Most common unknown characters
  const charCounts = {};
  vocabViolations.forEach(v => v.unknown.forEach(c => charCounts[c] = (charCounts[c] || 0) + 1));
  const topUnknown = Object.entries(charCounts).sort((a, b) => b[1] - a[1]).slice(0, 20);

  console.log('   Most common unknown characters:');
  topUnknown.forEach(([char, count]) => console.log(`      "${char}": ${count} occurrences`));

  // Length violations
  console.log('\n─────────────────────────────────────────────────────────────────────');
  console.log(`B. LENGTH VIOLATIONS: ${lengthViolations.length} phrases`);
  console.log(`   (Exceeding ${MAX_SYLLABLES} characters/syllables)`);
  console.log('─────────────────────────────────────────────────────────────────────\n');

  lengthViolations.slice(0, 20).forEach((v, i) => {
    console.log(`${i+1}. ${v.legoId} P${v.position}: ${v.length} chars`);
    console.log(`   "${v.target}"`);
    console.log(`   "${v.known}"`);
    console.log('');
  });
  if (lengthViolations.length > 20) {
    console.log(`   ... and ${lengthViolations.length - 20} more\n`);
  }

  // Length distribution
  const lengthDist = {};
  lengthViolations.forEach(v => {
    const bucket = Math.floor(v.length / 5) * 5;
    lengthDist[bucket] = (lengthDist[bucket] || 0) + 1;
  });
  console.log('   Length distribution:');
  Object.entries(lengthDist).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).forEach(([bucket, count]) => {
    console.log(`      ${bucket}-${parseInt(bucket)+4} chars: ${count} phrases`);
  });

  // Punctuation issues
  console.log('\n─────────────────────────────────────────────────────────────────────');
  console.log(`C. PUNCTUATION ISSUES: ${punctuationIssues.length} phrases`);
  console.log('─────────────────────────────────────────────────────────────────────\n');

  punctuationIssues.slice(0, 10).forEach((v, i) => {
    console.log(`${i+1}. ${v.legoId} P${v.position}: ${v.issue}`);
    console.log(`   "${v.target}"`);
    console.log('');
  });
  if (punctuationIssues.length > 10) {
    console.log(`   ... and ${punctuationIssues.length - 10} more\n`);
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         SUMMARY                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log(`SEEDS:`);
  console.log(`  Total: ${seeds.length}`);
  console.log(`  Needing full translation: ${fragmentSeeds.length}`);
  console.log(`  Seed numbers: ${fragmentSeeds.map(s => s.seed_number).join(', ')}`);

  console.log(`\nPHRASES:`);
  console.log(`  Total: ${phrases.length}`);
  console.log(`  Vocabulary violations: ${vocabViolations.length}`);
  console.log(`  Length violations (>${MAX_SYLLABLES}): ${lengthViolations.length}`);
  console.log(`  Punctuation issues: ${punctuationIssues.length}`);

  // Overlap analysis
  const vocabLegoIds = new Set(vocabViolations.map(v => `${v.legoId}-${v.position}`));
  const lengthLegoIds = new Set(lengthViolations.map(v => `${v.legoId}-${v.position}`));
  const bothViolations = [...vocabLegoIds].filter(id => lengthLegoIds.has(id)).length;

  console.log(`\nOVERLAP:`);
  console.log(`  Phrases with BOTH vocab AND length issues: ${bothViolations}`);
  console.log(`  Unique phrases with any issue: ${new Set([...vocabLegoIds, ...lengthLegoIds]).size}`);

  console.log('\n════════════════════════════════════════════════════════════════════\n');
}

generateReport().catch(console.error);
