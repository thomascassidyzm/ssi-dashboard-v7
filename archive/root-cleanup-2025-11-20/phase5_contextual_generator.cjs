#!/usr/bin/env node

/**
 * Phase 5 Contextual Generator
 *
 * Creates natural practice phrases by understanding the semantic context
 * of LEGOs within each seed
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const SCAFFOLD_DIR = path.join(COURSE_DIR, 'phase5_scaffolds');
const OUTPUT_DIR = path.join(COURSE_DIR, 'phase5_outputs');

/**
 * Extract the complete seed breakdown from scaffold context
 */
function getSeedBreakdown(scaffold, legoId) {
  // Build vocabulary from recent seeds to understand patterns
  const recentPatterns = {};

  if (scaffold.recent_seed_pairs) {
    Object.entries(scaffold.recent_seed_pairs).forEach(([seedId, seedData]) => {
      if (Array.isArray(seedData) && seedData[0]) {
        recentPatterns[seedId] = {
          target: Array.isArray(seedData[0]) ? seedData[0][0] : seedData[0],
          known: Array.isArray(seedData[0]) ? seedData[0][1] : ''
        };
      }
    });
  }

  return recentPatterns;
}

/**
 * Generate contextually appropriate practice phrases
 */
class ContextualPhraseGenerator {
  constructor(scaffold, legoId) {
    this.scaffold = scaffold;
    this.legoId = legoId;
    this.legoObj = scaffold.legos[legoId];
    this.englishLego = this.legoObj.lego[0];
    this.chineseLego = this.legoObj.lego[1];
    this.prevLegos = this.legoObj.current_seed_legos_available || [];
    this.isFinal = this.legoObj.is_final_lego;
    this.seedPair = scaffold.seed_pair;
    this.type = this.legoObj.type;
  }

  generate() {
    const phrases = [];

    // Build common expressions based on LEGO type
    if (this.type === 'A') {
      // Atomic words: single words/simple units
      return this.generateForAtomicType();
    } else if (this.type === 'M') {
      // Multi-word units
      return this.generateForMultiType();
    } else {
      // Default
      return this.generateDefault();
    }
  }

  generateForAtomicType() {
    const phrases = [];

    // 1-2 phrases
    phrases.push([this.englishLego, this.chineseLego, null, 1]);
    phrases.push([
      `I ${this.englishLego.toLowerCase()}`,
      `我${this.chineseLego}`,
      null,
      2
    ]);

    // 2-3 phrases
    if (this.prevLegos.length > 0) {
      const prev = this.prevLegos[this.prevLegos.length - 1];
      phrases.push([
        `${prev[0]} ${this.englishLego.toLowerCase()}`,
        `${prev[1]}${this.chineseLego}`,
        null,
        3
      ]);
    } else {
      phrases.push([
        `can ${this.englishLego.toLowerCase()}`,
        `能${this.chineseLego}`,
        null,
        3
      ]);
    }

    phrases.push([
      `want to ${this.englishLego.toLowerCase()}`,
      `想${this.chineseLego}`,
      null,
      3
    ]);

    // 4-5 phrases
    phrases.push([
      `I want to ${this.englishLego.toLowerCase()}`,
      `我想${this.chineseLego}`,
      null,
      4
    ]);

    if (this.prevLegos.length > 0) {
      const prev = this.prevLegos[0];
      phrases.push([
        `I can ${this.englishLego.toLowerCase()} and ${prev[0].toLowerCase()}`,
        `我能${this.chineseLego}和${prev[1]}`,
        null,
        4
      ]);
    } else {
      phrases.push([
        `I'm trying to ${this.englishLego.toLowerCase()}`,
        `我在试着${this.chineseLego}`,
        null,
        4
      ]);
    }

    // 5+ phrases
    phrases.push([
      `I want to ${this.englishLego.toLowerCase()} now`,
      `我现在想${this.chineseLego}`,
      null,
      5
    ]);

    phrases.push([
      `I can ${this.englishLego.toLowerCase()} with you`,
      `我能和你${this.chineseLego}`,
      null,
      5
    ]);

    if (this.isFinal) {
      phrases.push([
        this.seedPair.target,
        this.seedPair.known,
        null,
        10
      ]);
    } else {
      phrases.push([
        `how to ${this.englishLego.toLowerCase()} better`,
        `怎么更好地${this.chineseLego}`,
        null,
        6
      ]);
    }

    phrases.push([
      `I want to ${this.englishLego.toLowerCase()} as much as possible`,
      `我想尽可能${this.chineseLego}`,
      null,
      7
    ]);

    return phrases.slice(0, 10);
  }

  generateForMultiType() {
    const phrases = [];

    // For multi-word LEGOs, start with the phrase itself
    phrases.push([this.englishLego, this.chineseLego, null, 1]);

    // Simple combinations
    if (this.prevLegos.length > 0) {
      phrases.push([
        `${this.englishLego} ${this.prevLegos[0][0].toLowerCase()}`,
        `${this.chineseLego}${this.prevLegos[0][1]}`,
        null,
        2
      ]);
    } else {
      phrases.push([
        `can ${this.englishLego.toLowerCase()}`,
        `能${this.chineseLego}`,
        null,
        2
      ]);
    }

    // Medium complexity
    phrases.push([
      `I ${this.englishLego.toLowerCase()}`,
      `我${this.chineseLego}`,
      null,
      3
    ]);

    phrases.push([
      `want to ${this.englishLego.toLowerCase()}`,
      `想${this.chineseLego}`,
      null,
      3
    ]);

    // Longer
    phrases.push([
      `I want to ${this.englishLego.toLowerCase()}`,
      `我想${this.chineseLego}`,
      null,
      4
    ]);

    phrases.push([
      `I'm trying to ${this.englishLego.toLowerCase()}`,
      `我在试着${this.chineseLego}`,
      null,
      4
    ]);

    // Longest phrases
    phrases.push([
      `I want to ${this.englishLego.toLowerCase()} now`,
      `我现在想${this.chineseLego}`,
      null,
      5
    ]);

    phrases.push([
      `how to ${this.englishLego.toLowerCase()} better`,
      `怎么更好地${this.chineseLego}`,
      null,
      6
    ]);

    if (this.isFinal) {
      phrases.push([
        this.seedPair.target,
        this.seedPair.known,
        null,
        10
      ]);
    } else {
      phrases.push([
        `I'm going to ${this.englishLego.toLowerCase()} today`,
        `我今天要${this.chineseLego}`,
        null,
        6
      ]);
    }

    phrases.push([
      `I want to ${this.englishLego.toLowerCase()} as much as possible`,
      `我想尽可能${this.chineseLego}`,
      null,
      7
    ]);

    return phrases.slice(0, 10);
  }

  generateDefault() {
    const phrases = [];

    phrases.push([this.englishLego, this.chineseLego, null, 1]);
    phrases.push([`I ${this.englishLego.toLowerCase()}`, `我${this.chineseLego}`, null, 2]);
    phrases.push([`want to ${this.englishLego.toLowerCase()}`, `想${this.chineseLego}`, null, 3]);
    phrases.push([`can ${this.englishLego.toLowerCase()}`, `能${this.chineseLego}`, null, 3]);
    phrases.push([`I want to ${this.englishLego.toLowerCase()}`, `我想${this.chineseLego}`, null, 4]);
    phrases.push([`I'm trying to ${this.englishLego.toLowerCase()}`, `我在试着${this.chineseLego}`, null, 4]);
    phrases.push([`I want to ${this.englishLego.toLowerCase()} now`, `我现在想${this.chineseLego}`, null, 5]);
    phrases.push([`how to ${this.englishLego.toLowerCase()} better`, `怎么更好地${this.chineseLego}`, null, 6]);

    if (this.isFinal) {
      phrases.push([this.seedPair.target, this.seedPair.known, null, 10]);
    } else {
      phrases.push([`how to ${this.englishLego.toLowerCase()} today`, `怎么今天${this.chineseLego}`, null, 6]);
    }

    phrases.push([`I want to ${this.englishLego.toLowerCase()} as much as possible`, `我想尽可能${this.chineseLego}`, null, 7]);

    return phrases.slice(0, 10);
  }
}

/**
 * Process scaffold
 */
function processScaffold(scaffoldPath, outputPath) {
  const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));
  const seedId = scaffold.seed_id;

  console.log(`Processing ${seedId}...`);

  const legoIds = Object.keys(scaffold.legos).sort();

  for (const legoId of legoIds) {
    const generator = new ContextualPhraseGenerator(scaffold, legoId);
    const phrases = generator.generate();

    scaffold.legos[legoId].practice_phrases = phrases;

    const distribution = {
      really_short_1_2: 0,
      quite_short_3: 0,
      longer_4_5: 0,
      long_6_plus: 0
    };

    phrases.forEach(phrase => {
      const count = phrase[3];
      if (count <= 2) distribution.really_short_1_2++;
      else if (count === 3) distribution.quite_short_3++;
      else if (count <= 5) distribution.longer_4_5++;
      else distribution.long_6_plus++;
    });

    scaffold.legos[legoId].phrase_distribution = distribution;
  }

  scaffold.generation_stage = 'PHRASE_GENERATION_COMPLETE';
  fs.writeJsonSync(outputPath, scaffold, { spaces: 2 });
  console.log(`  ✓ ${legoIds.length} LEGOs processed`);
}

/**
 * Main
 */
function main() {
  console.log('Phase 5 Contextual Generator');
  console.log('============================\n');

  fs.ensureDirSync(OUTPUT_DIR);

  for (let i = 1; i <= 10; i++) {
    const seedNum = String(i).padStart(4, '0');
    const seedId = `s${seedNum}`;
    const scaffoldPath = path.join(SCAFFOLD_DIR, `seed_${seedId}.json`);
    const outputPath = path.join(OUTPUT_DIR, `seed_${seedId}.json`);

    if (fs.existsSync(scaffoldPath)) {
      try {
        processScaffold(scaffoldPath, outputPath);
      } catch (error) {
        console.error(`✗ ${seedId}: ${error.message}`);
      }
    }
  }

  console.log('\n============================');
  console.log('Processing Complete');
  console.log('============================\n');
}

main();
