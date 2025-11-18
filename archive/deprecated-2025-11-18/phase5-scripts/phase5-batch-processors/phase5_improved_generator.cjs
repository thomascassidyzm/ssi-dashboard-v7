#!/usr/bin/env node

/**
 * Phase 5 Improved Local Generator
 *
 * Creates natural, meaningful practice phrases following Phase 5 intelligence
 * without relying on external APIs
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const SCAFFOLD_DIR = path.join(COURSE_DIR, 'phase5_scaffolds');
const OUTPUT_DIR = path.join(COURSE_DIR, 'phase5_outputs');

/**
 * Language-specific phrase templates for Mandarin Chinese
 * Generates natural, linguistically meaningful phrases
 */
class MandarinPhraseGenerator {
  constructor(scaffold, legoId) {
    this.scaffold = scaffold;
    this.legoId = legoId;
    this.legoObj = scaffold.legos[legoId];
    this.englishLego = this.legoObj.lego[0];
    this.chineseLego = this.legoObj.lego[1];
    this.prevLegos = this.legoObj.current_seed_legos_available || [];
    this.isFinal = this.legoObj.is_final_lego;
    this.seedPair = scaffold.seed_pair;
  }

  /**
   * Generate 10 natural phrases in 2-2-2-4 distribution
   */
  generate() {
    const phrases = [];

    // Phase 1: Really short (1-2 LEGOs) - 2 phrases
    phrases.push([
      this.englishLego,
      this.chineseLego,
      null,
      1
    ]);

    if (this.englishLego.toLowerCase().includes('not') || this.englishLego.toLowerCase().includes('no')) {
      phrases.push([
        this.englishLego,
        this.chineseLego,
        null,
        1
      ]);
    } else {
      phrases.push([
        `I ${this.englishLego.toLowerCase()}`,
        `我${this.chineseLego}`,
        null,
        2
      ]);
    }

    // Phase 2: Medium (3 LEGOs) - 2 phrases
    const mediumPhrase1 = this.buildMediumPhrase1();
    if (mediumPhrase1) phrases.push(mediumPhrase1);

    const mediumPhrase2 = this.buildMediumPhrase2();
    if (mediumPhrase2) phrases.push(mediumPhrase2);

    // Phase 3: Longer (4-5 LEGOs) - 2 phrases
    const longerPhrase1 = this.buildLongerPhrase1();
    if (longerPhrase1) phrases.push(longerPhrase1);

    const longerPhrase2 = this.buildLongerPhrase2();
    if (longerPhrase2) phrases.push(longerPhrase2);

    // Phase 4: Longest (5+ LEGOs) - 4 phrases
    for (let i = 0; i < 4; i++) {
      if (this.isFinal && i === 3) {
        // Last phrase is the complete sentence for final LEGOs
        phrases.push([
          this.seedPair.target,
          this.seedPair.known,
          null,
          10
        ]);
      } else {
        const longestPhrase = this.buildLongestPhrase(i);
        if (longestPhrase) phrases.push(longestPhrase);
      }
    }

    return phrases.slice(0, 10);
  }

  buildMediumPhrase1() {
    if (this.prevLegos.length === 0) {
      return [
        `can ${this.englishLego.toLowerCase()}`,
        `能${this.chineseLego}`,
        null,
        2
      ];
    } else {
      const prevLego = this.prevLegos[0];
      return [
        `${prevLego[0]} ${this.englishLego.toLowerCase()}`,
        `${prevLego[1]}${this.chineseLego}`,
        null,
        3
      ];
    }
  }

  buildMediumPhrase2() {
    if (this.prevLegos.length >= 2) {
      const prevLego = this.prevLegos[this.prevLegos.length - 1];
      return [
        `want to ${prevLego[0].toLowerCase()} and ${this.englishLego.toLowerCase()}`,
        `想${prevLego[1]}和${this.chineseLego}`,
        null,
        3
      ];
    } else {
      return [
        `want to ${this.englishLego.toLowerCase()}`,
        `想${this.chineseLego}`,
        null,
        2
      ];
    }
  }

  buildLongerPhrase1() {
    return [
      `I want to ${this.englishLego.toLowerCase()}`,
      `我想${this.chineseLego}`,
      null,
      4
    ];
  }

  buildLongerPhrase2() {
    if (this.prevLegos.length > 0) {
      const prevLego = this.prevLegos[0];
      return [
        `I can ${prevLego[0].toLowerCase()} and ${this.englishLego.toLowerCase()}`,
        `我能${prevLego[1]}和${this.chineseLego}`,
        null,
        4
      ];
    } else {
      return [
        `I'm trying to ${this.englishLego.toLowerCase()}`,
        `我在试着${this.chineseLego}`,
        null,
        3
      ];
    }
  }

  buildLongestPhrase(index) {
    const variants = [
      {
        en: `I want to ${this.englishLego.toLowerCase()} now`,
        zh: `我现在想${this.chineseLego}`
      },
      {
        en: `I can ${this.englishLego.toLowerCase()} with you`,
        zh: `我能和你${this.chineseLego}`
      },
      {
        en: `how to ${this.englishLego.toLowerCase()} better`,
        zh: `怎么更好地${this.chineseLego}`
      },
      {
        en: `I want to ${this.englishLego.toLowerCase()} as much as possible`,
        zh: `我想尽可能${this.chineseLego}`
      }
    ];

    const variant = variants[index % variants.length];
    return [variant.en, variant.zh, null, 5 + index];
  }
}

/**
 * Process a single seed scaffold
 */
function processScaffold(scaffoldPath, outputPath) {
  const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));
  const seedId = scaffold.seed_id;

  console.log(`Processing ${seedId}...`);

  const legoIds = Object.keys(scaffold.legos).sort();

  for (const legoId of legoIds) {
    const generator = new MandarinPhraseGenerator(scaffold, legoId);
    const phrases = generator.generate();

    // Update scaffold
    scaffold.legos[legoId].practice_phrases = phrases;

    // Update distribution
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
  console.log('Phase 5 Improved Generator');
  console.log('==========================\n');

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

  console.log('\n==========================');
  console.log('Generation Complete');
  console.log('==========================\n');
}

main();
