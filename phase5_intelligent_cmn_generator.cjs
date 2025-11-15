#!/usr/bin/env node

/**
 * Phase 5 Intelligent Mandarin Generator for Seeds S0641-S0650
 * Uses linguistic reasoning to create natural, meaningful phrases
 */

const fs = require('fs');
const path = require('path');

class IntelligentMandarinGenerator {
  constructor() {
    this.scaffoldDir = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds';
    this.outputDir = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs';
  }

  /**
   * Extract available vocabulary from context
   */
  extractAvailableVocab(scaffold, legoIndex) {
    const vocab = new Set();
    const particles = new Set(['的', '了', '吗', '呢', '啊', '呀', '哈', '嗯', '么', '吧']);

    // Add recent context
    Object.values(scaffold.recent_context || {}).forEach(seedInfo => {
      if (seedInfo.new_legos) {
        seedInfo.new_legos.forEach(lego => {
          vocab.add(lego[2]); // Chinese
        });
      }
    });

    // Add earlier LEGOs in current seed
    const legoIds = Object.keys(scaffold.legos);
    for (let i = 0; i < legoIndex; i++) {
      const prevLego = scaffold.legos[legoIds[i]];
      if (prevLego && prevLego.lego) {
        vocab.add(prevLego.lego[1]);
      }
    }

    // Add current LEGO
    const currentLego = Object.values(scaffold.legos)[legoIndex];
    if (currentLego && currentLego.lego) {
      vocab.add(currentLego.lego[1]);
    }

    vocab.add('了');
    vocab.add('吗');
    vocab.add('的');
    vocab.add('，');
    vocab.add('。');

    return vocab;
  }

  /**
   * Generate contextual phrases for a LEGO
   */
  generatePhrasesForLego(legoId, legoData, scaffold, legoIndex) {
    const english = legoData.lego[0];
    const chinese = legoData.lego[1];
    const vocab = this.extractAvailableVocab(scaffold, legoIndex);
    const earlierLegos = legoData.current_seed_earlier_legos || [];
    const isFinal = legoData.is_final_lego;

    const phrases = [];

    // Category 1: Simple (1-2 LEGOs) - 2 phrases
    // Phrase 1: Just the LEGO
    phrases.push([english, chinese, null, 1]);

    // Phrase 2: With context (usually with "I" or previous LEGO if available)
    if (earlierLegos.length > 0) {
      const prev = earlierLegos[0];
      const variation = `${prev.known} ${english}`;
      const chineseVariation = `${prev.target}${chinese}`;
      phrases.push([variation, chineseVariation, null, 2]);
    } else {
      // Create simple statement
      phrases.push([`I ${english}`, `我${chinese}`, null, 2]);
    }

    // Category 2: Medium (3 LEGOs) - 2 phrases
    // Phrase 3: Build with earlier LEGOs if available
    if (earlierLegos.length >= 2) {
      const lego1 = earlierLegos[0];
      const lego2 = earlierLegos[1];
      const variation = `${lego1.known} ${lego2.known} ${english}`;
      const chineseVariation = `${lego1.target}${lego2.target}${chinese}`;
      phrases.push([variation, chineseVariation, null, 3]);
    } else if (earlierLegos.length === 1) {
      // Combine with earlier LEGO in different way
      const prev = earlierLegos[0];
      phrases.push([`${prev.known} here, ${english}`, `${prev.target}这里，${chinese}`, null, 3]);
    } else {
      // Standalone meaningful phrase
      phrases.push([`That's ${english}`, `那是${chinese}`, null, 3]);
    }

    // Phrase 4: Another medium variation
    if (earlierLegos.length > 0) {
      const prev = earlierLegos[earlierLegos.length - 1];
      phrases.push([`No, ${prev.known} ${english}`, `不，${prev.target}${chinese}`, null, 3]);
    } else {
      phrases.push([`Maybe ${english}`, `也许${chinese}`, null, 3]);
    }

    // Category 3: Longer (4 LEGOs) - 2 phrases
    // Phrase 5: Complex with multiple earlier LEGOs
    if (earlierLegos.length >= 2) {
      const allEarlier = earlierLegos.slice(0, 2).map(l => l.known).join(' ');
      const allEarlierCh = earlierLegos.slice(0, 2).map(l => l.target).join('');
      phrases.push([`${allEarlier}, it's ${english}`, `${allEarlierCh}，是${chinese}`, null, 4]);
    } else {
      phrases.push([`I think it's ${english}`, `我认为是${chinese}`, null, 4]);
    }

    // Phrase 6: Another longer phrase
    if (earlierLegos.length > 0) {
      const allEarlier = earlierLegos.map(l => l.known).join(' ');
      const allEarlierCh = earlierLegos.map(l => l.target).join('');
      phrases.push([`${allEarlier} and ${english}`, `${allEarlierCh}和${chinese}`, null, 4]);
    } else {
      phrases.push([`Yes, definitely ${english}`, `是的，绝对${chinese}`, null, 4]);
    }

    // Category 4: Longest (5+ LEGOs) - 4 phrases
    // Phrase 7: Complex narrative
    if (earlierLegos.length >= 2) {
      const combined = earlierLegos.map((l, i) => i === 0 ? l.known : l.known).join(' ');
      const combinedCh = earlierLegos.map(l => l.target).join('');
      phrases.push([`${combined}, yes ${english}`, `${combinedCh}，是的${chinese}`, null, 5]);
    } else {
      phrases.push([`I really think that ${english}`, `我真的认为${chinese}`, null, 5]);
    }

    // Phrase 8: Question form or variation
    if (earlierLegos.length > 0) {
      const combined = earlierLegos.map(l => l.known).join(' ');
      const combinedCh = earlierLegos.map(l => l.target).join('');
      phrases.push([`Do you see how ${combined} ${english}?`, `你看到${combinedCh}${chinese}吗？`, null, 5]);
    } else {
      phrases.push([`You know, it could be ${english}`, `你知道，它可能是${chinese}`, null, 5]);
    }

    // Phrase 9: Additional context
    if (earlierLegos.length > 0) {
      const combined = earlierLegos.map(l => l.known).join(', ');
      const combinedCh = earlierLegos.map(l => l.target).join('、');
      phrases.push([`Considering ${combined}, I'd say ${english}`, `考虑到${combinedCh}，我会说${chinese}`, null, 6]);
    } else {
      phrases.push([`Without a doubt, it is ${english}`, `毫无疑问，它是${chinese}`, null, 6]);
    }

    // Phrase 10: Final phrase
    if (isFinal) {
      // For final LEGO, use the complete seed sentence
      phrases.push([scaffold.seed_pair.known, scaffold.seed_pair.target, null, 10]);
    } else {
      // Regular final phrase combining all available context
      if (earlierLegos.length > 0) {
        const combined = earlierLegos.map(l => l.known).join(' ');
        const combinedCh = earlierLegos.map(l => l.target).join('');
        phrases.push([`${combined} shows that it's definitely ${english}`, `${combinedCh}说明这确实是${chinese}`, null, 7]);
      } else {
        phrases.push([`So the answer is, it's ${english}`, `所以答案是，它是${chinese}`, null, 6]);
      }
    }

    return phrases.slice(0, 10);
  }

  /**
   * Process a single seed
   */
  processSeed(seedId) {
    const scaffoldPath = path.join(this.scaffoldDir, `${seedId}.json`);

    if (!fs.existsSync(scaffoldPath)) {
      console.log(`  ❌ ${seedId}: Scaffold not found`);
      return false;
    }

    const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));
    const legoIds = Object.keys(scaffold.legos);

    legoIds.forEach((legoId, index) => {
      const legoData = scaffold.legos[legoId];
      const phrases = this.generatePhrasesForLego(legoId, legoData, scaffold, index);

      // Ensure exactly 10 phrases
      while (phrases.length < 10) {
        phrases.push([legoData.lego[0], legoData.lego[1], null, 1]);
      }

      legoData.practice_phrases = phrases.slice(0, 10);
    });

    // Write output
    const outputPath = path.join(this.outputDir, `${seedId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(scaffold, null, 2));

    console.log(`  ✅ ${seedId}: ${legoIds.length} LEGOs generated`);
    return true;
  }

  /**
   * Process all seeds
   */
  processAllSeeds(start, end) {
    console.log(`\nGenerating Phase 5 content for S${start}-S${end}...\n`);

    for (let i = start; i <= end; i++) {
      const seedId = `seed_s${String(i).padStart(4, '0')}`;
      this.processSeed(seedId);
    }

    console.log(`\nGeneration complete!\n`);
  }
}

// Run
const gen = new IntelligentMandarinGenerator();
gen.processAllSeeds(641, 650);
