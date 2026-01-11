#!/usr/bin/env node

// Phase 2 Worker 3: Conflict Resolution for zho_for_eng seeds S0031-S0045
// Applying FCFS (First Come First Served) + Upchunking

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const seedsData = JSON.parse(readFileSync(join(__dirname, 'phase2_worker3_raw_seeds.json'), 'utf8'));

// Resolution strategy based on conflict analysis:
//
// CONFLICT 1: "want" → "想" (S0032) vs "想要" (S0036)
//   - S0032 WINS (first occurrence)
//   - S0036: Check actual sentence - "我们不想打断故事。" uses "不想" not "不想要"
//   - ACTION: Fix S0036L01 to "想" and mark as new: false, ref: S0032L02
//   - ACTION: Fix S0036L02 M-type to use "想" not "想要"
//
// CONFLICT 2: "learning" → "学" (S0033) vs "学习" (S0038)
//   - S0033 WINS (first occurrence)
//   - S0038: Sentence uses "学习", but to avoid conflict, remove standalone A-type
//   - ACTION: Remove S0038L02, keep only M-type S0038L03 "I've been learning"
//
// CONFLICT 3: "but" → "但是" (S0039) vs "但" (S0041)
//   - S0039 WINS (first occurrence)
//   - S0041: Must upchunk to "but I" to provide context
//   - ACTION: Remove S0041L04 standalone, create M-type "but I" → "但我"
//
// CONFLICT 4: "feel" → "感觉" (S0040) vs "觉得" (S0041, S0042)
//   - S0040 WINS (first occurrence)
//   - S0041, S0042: Must upchunk to provide context
//   - ACTION: Remove standalone "feel" A-types, upchunk to M-types with context
//
// EXACT DUPLICATES:
//   - "you" → "你": S0032L01, S0033L02, S0040L03 → ref: S0031L01
//   - "me" → "我": S0032L03 → ref: S0031L05
//   - "does not want" → "不想": S0035L02 → ref: S0034L02
//   - "I" → "我": S0038-S0045 → ref: S0037L01
//   - "tired" → "累": S0041L06 → ref: S0039L03

function applyResolutions() {
  const seeds = JSON.parse(JSON.stringify(seedsData.seeds)); // Deep clone

  seeds.forEach(seed => {
    let newLegos = [];

    seed.legos.forEach((lego, idx) => {
      // Ensure all LEGOs have components property (fix S0041-S0045)
      if (!lego.components) {
        lego.components = lego.type === 'M' ? [] : [];
      }

      // Apply specific resolutions based on seed and LEGO
      let resolvedLego = { ...lego };
      let skip = false;

      // CONFLICT 1: "want" in S0036
      if (seed.seed_id === 'S0036' && lego.id === 'S0036L01') {
        // Fix: "want" → "想" (not "想要"), mark as duplicate
        resolvedLego.lego.target = '想';
        resolvedLego.new = false;
        resolvedLego.ref = 'S0032L02';
      }
      if (seed.seed_id === 'S0036' && lego.id === 'S0036L02') {
        // Fix M-type: "don't want" → "不想" (not "不想要")
        resolvedLego.lego.target = '不想';
        resolvedLego.components = [{ known: 'want', target: '想' }];
        resolvedLego.new = false; // This M-type pattern exists already
      }

      // CONFLICT 2: "learning" in S0038
      if (seed.seed_id === 'S0038' && lego.id === 'S0038L02') {
        // Remove standalone "learning" → "学习" to avoid conflict
        // Keep only the M-type S0038L03 which provides context
        skip = true;
      }
      // Update S0038L03 M-type components after removing L02
      if (seed.seed_id === 'S0038' && lego.id === 'S0038L03') {
        // "I've been learning" uses "I" and the verb phrase, not standalone "learning"
        resolvedLego.components = [
          { known: 'I', target: '我' }
          // The "学习" is part of the larger phrase, not referencing a standalone LEGO
        ];
      }

      // CONFLICT 3: "but" in S0041
      if (seed.seed_id === 'S0041' && lego.id === 'S0041L04') {
        // Upchunk: Change A-type "but" → "但" to M-type "but I" → "但我"
        resolvedLego.type = 'M';
        resolvedLego.lego.known = 'but I';
        resolvedLego.lego.target = '但我';
        resolvedLego.components = [
          { known: 'but', target: '但是' },  // Reference to the canonical form
          { known: 'I', target: '我' }
        ];
        resolvedLego.new = true; // New M-type pattern
      }

      // CONFLICT 4: "feel" in S0041 and S0042
      if (seed.seed_id === 'S0041' && lego.id === 'S0041L02') {
        // Upchunk: Change A-type "feel" → "觉得" to M-type "I feel" → "我觉得"
        resolvedLego.type = 'M';
        resolvedLego.lego.known = 'I feel';
        resolvedLego.lego.target = '我觉得';
        resolvedLego.components = [
          { known: 'I', target: '我' },
          { known: 'feel', target: '感觉' }  // Reference to canonical form
        ];
        resolvedLego.new = true;
      }
      if (seed.seed_id === 'S0042' && lego.id === 'S0042L03') {
        // Upchunk: Change A-type "feel" → "觉得" to M-type "to feel" → "觉得"
        // Looking at sentence context: "to feel better" is more appropriate
        resolvedLego.type = 'M';
        resolvedLego.lego.known = 'to feel';
        resolvedLego.lego.target = '觉得';
        resolvedLego.components = [
          { known: 'feel', target: '感觉' }  // Reference to canonical form
        ];
        resolvedLego.new = true;
      }

      // EXACT DUPLICATES: Mark as new: false with ref

      // "you" → "你"
      if ((seed.seed_id === 'S0032' && lego.id === 'S0032L01') ||
          (seed.seed_id === 'S0033' && lego.id === 'S0033L02') ||
          (seed.seed_id === 'S0040' && lego.id === 'S0040L03')) {
        resolvedLego.new = false;
        resolvedLego.ref = 'S0031L01';
      }

      // "me" → "我"
      if (seed.seed_id === 'S0032' && lego.id === 'S0032L03') {
        resolvedLego.new = false;
        resolvedLego.ref = 'S0031L05';
      }

      // "does not want" → "不想"
      if (seed.seed_id === 'S0035' && lego.id === 'S0035L02') {
        resolvedLego.new = false;
        resolvedLego.ref = 'S0034L02';
      }

      // "I" → "我"
      const iDuplicates = ['S0038L01', 'S0039L02', 'S0041L01', 'S0042L01', 'S0043L01', 'S0044L02', 'S0045L01'];
      if (iDuplicates.includes(lego.id)) {
        resolvedLego.new = false;
        resolvedLego.ref = 'S0037L01';
      }

      // "tired" → "累"
      if (seed.seed_id === 'S0041' && lego.id === 'S0041L06') {
        resolvedLego.new = false;
        resolvedLego.ref = 'S0039L03';
      }

      if (!skip) {
        newLegos.push(resolvedLego);
      }
    });

    seed.legos = newLegos;
  });

  return seeds;
}

const resolvedSeeds = applyResolutions();

// Output in the format expected by the upload API
const output = {
  course: 'zho_for_eng',
  seeds: resolvedSeeds
};

console.log(JSON.stringify(output, null, 2));
