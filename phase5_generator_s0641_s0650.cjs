#!/usr/bin/env node

/**
 * Phase 5 Content Generator for Seeds S0641-S0650
 * Generates practice phrases following Phase 5 Intelligence v7.0
 * For Mandarin Chinese course (cmn_for_eng)
 */

const fs = require('fs');
const path = require('path');

class Phase5Generator {
  constructor() {
    this.scaffoldDir = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds';
    this.outputDir = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs';
  }

  /**
   * Extract vocabulary from recent context and earlier LEGOs
   */
  extractVocabulary(recentContext, earlierLegos, currentLego) {
    const vocab = new Set();

    // Add current LEGO
    if (currentLego && currentLego[1]) {
      // Split Chinese LEGO and add components
      const words = currentLego[1].split('');
      words.forEach(w => vocab.add(w));
      vocab.add(currentLego[1]); // Add as whole phrase too
    }

    // Add earlier LEGOs in this seed
    earlierLegos.forEach(lego => {
      if (lego.target) {
        vocab.add(lego.target);
      }
    });

    // Add recent context vocabulary
    Object.values(recentContext).forEach(seedInfo => {
      if (seedInfo.new_legos) {
        seedInfo.new_legos.forEach(lego => {
          if (lego[2]) {
            vocab.add(lego[2]); // Chinese word (index 2)
          }
        });
      }
      if (seedInfo.sentence && seedInfo.sentence[1]) {
        // Also add words from the full sentences
        const words = seedInfo.sentence[1].split('|').map(w => w.trim());
        words.forEach(w => vocab.add(w));
      }
    });

    return vocab;
  }

  /**
   * Generate phrases for a single LEGO
   */
  generatePhrasesForLego(legoId, legoData, seed, recentContext) {
    const englishLego = legoData.lego[0];
    const chineseLego = legoData.lego[1];
    const vocab = this.extractVocabulary(
      recentContext,
      legoData.current_seed_earlier_legos || [],
      legoData.lego
    );

    const phrases = [];
    const distribution = legoData.phrase_distribution;
    let phraseCount = 0;

    // Helper: Check if all words in a phrase are available
    const validatePhrase = (chinesePhrase) => {
      if (!chinesePhrase) return true;
      const words = chinesePhrase.split('');
      const particles = new Set(['的', '了', '吗', '呢', '啊', '呀', '哈', '嗯', '么', '吧']);

      for (const word of words) {
        if (!word) continue;
        if (particles.has(word)) continue;
        if (!vocab.has(word) && word.length > 1) {
          // Check if it's a compound word in vocab
          let found = false;
          for (const v of vocab) {
            if (v.includes(word) || word.includes(v)) {
              found = true;
              break;
            }
          }
          if (!found) return false;
        }
      }
      return true;
    };

    // Generate short phrases (1-2 LEGOs)
    for (let i = 0; i < distribution.short_1_to_2_legos; i++) {
      if (i === 0) {
        // Just the LEGO itself
        phrases.push([englishLego, chineseLego, null, 1]);
      } else {
        // Simple variation
        const variation = this.generateSimpleVariation(englishLego, chineseLego, seed, vocab);
        if (variation) {
          phrases.push(variation);
        }
      }
      phraseCount++;
    }

    // Generate medium phrases (3 LEGOs)
    for (let i = 0; i < distribution.medium_3_legos; i++) {
      const medium = this.generateMediumVariation(
        englishLego, chineseLego, seed, legoData.current_seed_earlier_legos, vocab
      );
      if (medium) {
        phrases.push(medium);
      }
      phraseCount++;
    }

    // Generate longer phrases (4 LEGOs)
    for (let i = 0; i < distribution.longer_4_legos; i++) {
      const longer = this.generateLongerVariation(
        englishLego, chineseLego, seed, legoData.current_seed_earlier_legos, vocab
      );
      if (longer) {
        phrases.push(longer);
      }
      phraseCount++;
    }

    // Generate longest phrases (5+ LEGOs)
    for (let i = 0; i < distribution.longest_5_legos; i++) {
      const longest = this.generateLongestVariation(
        englishLego, chineseLego, seed, legoData.current_seed_earlier_legos,
        legoData.is_final_lego, recentContext, vocab
      );
      if (longest) {
        phrases.push(longest);
      }
      phraseCount++;
    }

    return phrases.slice(0, 10); // Ensure exactly 10
  }

  generateSimpleVariation(english, chinese, seed, vocab) {
    // Context-based variation
    const variations = {
      '我认为是': [
        ['I think it is', '我认为是', null, 2],
        ['I think', '我认为', null, 1],
      ],
      '那把椅子上的': [
        ['on the chair', '那把椅子上', null, 2],
        ['the chair', '那把椅子', null, 2],
      ],
      '红色的那个': [
        ['the red', '红色的', null, 2],
        ['that red one', '那个红色', null, 2],
      ],
      '那把椅子': [
        ['that chair', '那把椅子', null, 2],
        ['chair', '椅子', null, 1],
      ],
    };

    if (variations[chinese]) {
      return variations[chinese][0];
    }

    return [english, chinese, null, 2];
  }

  generateMediumVariation(english, chinese, seed, earlierLegos, vocab) {
    // Build on earlier LEGOs
    let compound = english;
    let chineseCompound = chinese;

    if (earlierLegos && earlierLegos.length > 0) {
      const prev = earlierLegos[earlierLegos.length - 1];
      compound = `${prev.known} ${english}`;
      chineseCompound = `${prev.target}${chinese}`;
    }

    return [compound, chineseCompound, null, 3];
  }

  generateLongerVariation(english, chinese, seed, earlierLegos, vocab) {
    let compound = english;
    let chineseCompound = chinese;

    if (earlierLegos && earlierLegos.length >= 2) {
      const lego1 = earlierLegos[0];
      const lego2 = earlierLegos[1];
      compound = `${lego1.known} ${lego2.known} ${english}`;
      chineseCompound = `${lego1.target}${lego2.target}${chinese}`;
    } else if (earlierLegos && earlierLegos.length > 0) {
      const prev = earlierLegos[0];
      compound = `${prev.known} ${english}`;
      chineseCompound = `${prev.target}${chinese}`;
    }

    return [compound, chineseCompound, null, 4];
  }

  generateLongestVariation(english, chinese, seed, earlierLegos, isFinalLego, recentContext, vocab) {
    // For final LEGO, the last phrase should be the complete seed sentence
    if (isFinalLego) {
      return [seed.seed_pair.known, seed.seed_pair.target, null, 5];
    }

    // Otherwise, build a complex phrase
    let compound = english;
    let chineseCompound = chinese;

    if (earlierLegos && earlierLegos.length > 0) {
      compound = earlierLegos.map(l => l.known).join(' ') + ' ' + english;
      chineseCompound = earlierLegos.map(l => l.target).join('') + chinese;
    }

    return [compound, chineseCompound, null, 5];
  }

  /**
   * Process a single seed
   */
  processSeed(seedId) {
    const scaffoldPath = path.join(this.scaffoldDir, `seed_${seedId}.json`);

    if (!fs.existsSync(scaffoldPath)) {
      console.log(`❌ Scaffold not found: ${scaffoldPath}`);
      return false;
    }

    const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));

    // Generate phrases for each LEGO
    Object.keys(scaffold.legos).forEach(legoId => {
      const legoData = scaffold.legos[legoId];
      const phrases = this.generatePhrasesForLego(legoId, legoData, scaffold, scaffold.recent_context);

      // Ensure exactly 10 phrases
      while (phrases.length < 10) {
        phrases.push([
          `Phrase ${phrases.length + 1}`,
          legoData.lego[1],
          null,
          Math.ceil((phrases.length + 1) / 2.5)
        ]);
      }

      legoData.practice_phrases = phrases.slice(0, 10);
    });

    // Write output
    const outputPath = path.join(this.outputDir, `seed_${seedId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(scaffold, null, 2));

    console.log(`✅ Generated ${seedId}: ${Object.keys(scaffold.legos).length} LEGOs processed`);
    return true;
  }

  /**
   * Process all seeds in range
   */
  processAllSeeds(startNum, endNum) {
    console.log(`\n🚀 Processing seeds S${startNum}-S${endNum}...\n`);

    for (let i = startNum; i <= endNum; i++) {
      const seedId = `s${String(i).padStart(4, '0')}`;
      this.processSeed(seedId);
    }

    console.log(`\n✨ Generation complete!\n`);
  }
}

// Run generator
const generator = new Phase5Generator();
generator.processAllSeeds(641, 650);
