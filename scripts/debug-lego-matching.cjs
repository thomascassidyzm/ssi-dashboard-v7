#!/usr/bin/env node
/**
 * Debug script to find why some LEGOs don't match any phrase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const COURSE_CODE = 'cym_n_for_eng';

function normalizeForMatching(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function tokenize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);
}

function getAllSubsequences(words) {
  const result = new Set();
  for (const w of words) {
    result.add(w);
  }
  for (let len = 2; len <= Math.min(words.length, 6); len++) {
    for (let start = 0; start <= words.length - len; start++) {
      result.add(words.slice(start, start + len).join(' '));
    }
  }
  return result;
}

async function main() {
  console.log('Loading data for', COURSE_CODE, '...\n');

  // Get all NEW LEGOs
  const { data: legos } = await supabase
    .from('course_legos')
    .select('target_text, known_text, type, seed_number, lego_index')
    .eq('course_code', COURSE_CODE)
    .eq('is_new', true);

  // Get all seeds
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('target_text, seed_number')
    .eq('course_code', COURSE_CODE);

  // Get all practice phrases
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('target_text, seed_number, lego_index')
    .eq('course_code', COURSE_CODE);

  console.log(`LEGOs: ${legos.length}`);
  console.log(`Seeds: ${seeds.length}`);
  console.log(`Practice phrases: ${phrases.length}\n`);

  // Build universe of LEGOs (normalized)
  const legoMap = new Map();
  for (const lego of legos) {
    const normalized = normalizeForMatching(lego.target_text);
    legoMap.set(normalized, lego);
  }

  // Build set of all extractable subsequences from all phrases
  const allExtractable = new Set();
  const phraseTexts = [
    ...seeds.map(s => s.target_text),
    ...phrases.map(p => p.target_text)
  ];

  for (const text of phraseTexts) {
    const words = tokenize(text);
    const subsequences = getAllSubsequences(words);
    for (const s of subsequences) {
      allExtractable.add(s);
    }
  }

  console.log(`Unique extractable subsequences: ${allExtractable.size}\n`);

  // Find LEGOs that don't match
  const unmatched = [];
  for (const [normalized, lego] of legoMap) {
    if (!allExtractable.has(normalized)) {
      unmatched.push({ normalized, ...lego });
    }
  }

  console.log(`UNMATCHED LEGOs: ${unmatched.length}\n`);
  console.log('=' .repeat(60));

  // Show details for unmatched LEGOs
  for (const lego of unmatched.slice(0, 20)) {
    console.log(`\nLEGO: "${lego.target_text}"`);
    console.log(`  Known: "${lego.known_text}"`);
    console.log(`  Normalized: "${lego.normalized}"`);
    console.log(`  Type: ${lego.type}`);
    console.log(`  From: S${String(lego.seed_number).padStart(4, '0')}L${String(lego.lego_index).padStart(2, '0')}`);

    // Find the source seed
    const sourceSeed = seeds.find(s => s.seed_number === lego.seed_number);
    if (sourceSeed) {
      console.log(`  Source seed: "${sourceSeed.target_text}"`);
      const seedNorm = normalizeForMatching(sourceSeed.target_text);
      console.log(`  Seed normalized: "${seedNorm}"`);

      // Check if LEGO text is literally in the seed
      const isSubstring = seedNorm.includes(lego.normalized);
      console.log(`  Is substring of seed? ${isSubstring}`);

      if (!isSubstring) {
        // Show character comparison
        console.log(`  Character codes (LEGO): ${[...lego.normalized].map(c => c.charCodeAt(0)).join(',')}`);
      }
    }
  }

  if (unmatched.length > 20) {
    console.log(`\n... and ${unmatched.length - 20} more`);
  }

  // Group by type
  const byType = {};
  for (const l of unmatched) {
    byType[l.type] = (byType[l.type] || 0) + 1;
  }
  console.log('\n\nUnmatched by type:', byType);
}

main().catch(console.error);
