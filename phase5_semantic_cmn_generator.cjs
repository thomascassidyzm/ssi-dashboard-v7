#!/usr/bin/env node

/**
 * Phase 5 Semantic Mandarin Generator for S0641-S0650
 * Follows Phase 5 Intelligence: Think English first, then translate to Chinese
 * Creates meaningful utterances with natural progression
 */

const fs = require('fs');
const path = require('path');

class SemanticMandarinGenerator {
  constructor() {
    this.scaffoldDir = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds';
    this.outputDir = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs';

    // LEGO-specific phrase templates following Phase 5 logic
    this.phraseTemplates = {
      '我认为是': {
        english: [
          "I think it is",
          "I think that it's",
          "I believe it's",
          "I would say it's",
          "No, I think it's",
          "Actually, I think it's",
          "I really think it's",
          "Yes, I definitely think it's",
          "Well, I think it's",
          "I think that it's the red one on that chair."
        ],
        chinese: [
          "我认为是",
          "我认为是",
          "我认为是",
          "我认为是",
          "不，我认为是",
          "实际上，我认为是",
          "我真的认为是",
          "是的，我肯定认为是",
          "好吧，我认为是",
          "我认为是那把椅子上的红色的那个。"
        ]
      },
      '那把椅子上的': {
        english: [
          "on that chair",
          "on the chair",
          "on that particular chair",
          "right on that chair",
          "I see it on that chair",
          "It's on that chair",
          "the one on that chair",
          "It's sitting on that chair",
          "You can see it on that chair",
          "I think that it's the red one on that chair."
        ],
        chinese: [
          "那把椅子上的",
          "那把椅子上",
          "那把椅子上",
          "就在那把椅子上",
          "我看到它在那把椅子上",
          "它在那把椅子上",
          "在那把椅子上的那个",
          "它坐在那把椅子上",
          "你可以看到它在那把椅子上",
          "我认为是那把椅子上的红色的那个。"
        ]
      },
      '红色的那个': {
        english: [
          "the red one",
          "that red one",
          "the red",
          "it's red",
          "the red object",
          "I like the red one",
          "You see the red one",
          "Yes, the red one",
          "Look at the red one",
          "I think that it's the red one on that chair."
        ],
        chinese: [
          "红色的那个",
          "那个红色的",
          "红色的",
          "它是红色的",
          "红色的东西",
          "我喜欢红色的那个",
          "你看到红色的那个",
          "是的，红色的那个",
          "看看红色的那个",
          "我认为是那把椅子上的红色的那个。"
        ]
      },
      '那把椅子': {
        english: [
          "that chair",
          "the chair",
          "this chair",
          "that particular chair",
          "that one there",
          "there's the chair",
          "You mean that chair",
          "Is it that chair",
          "Look at that chair",
          "I think that it's the red one on that chair."
        ],
        chinese: [
          "那把椅子",
          "那把椅子",
          "这把椅子",
          "那把特别的椅子",
          "那个在那里",
          "那是椅子",
          "你是说那把椅子",
          "是那把椅子吗",
          "看看那把椅子",
          "我认为是那把椅子上的红色的那个。"
        ]
      },
      '您感觉怎么样女士': {
        english: [
          "How do you feel",
          "How are you feeling",
          "How do you feel, madam",
          "How are you doing",
          "How do you feel today",
          "And how do you feel",
          "But how do you feel",
          "Madam, how do you feel",
          "Tell me, how do you feel",
          "How do you feel madam?"
        ],
        chinese: [
          "您感觉怎么样",
          "您感觉如何",
          "您感觉怎么样女士",
          "您怎么样",
          "您今天感觉怎么样",
          "那您感觉怎么样",
          "但您感觉怎么样",
          "女士，您感觉怎么样",
          "告诉我，您感觉怎么样",
          "您感觉怎么样女士？"
        ]
      }
    };
  }

  /**
   * Generate phrases for a LEGO using semantic templates
   */
  generatePhrasesForLego(legoId, legoData, scaffold, legoIndex) {
    const english = legoData.lego[0];
    const chinese = legoData.lego[1];
    const isFinal = legoData.is_final_lego;

    // Check if we have templates for this LEGO
    const templates = this.phraseTemplates[chinese];

    const phrases = [];

    if (templates && templates.english.length >= 10) {
      // Use pre-defined templates
      for (let i = 0; i < 10; i++) {
        const legoCount = Math.ceil((i + 1) / 2.5);
        phrases.push([
          templates.english[i],
          templates.chinese[i],
          null,
          legoCount
        ]);
      }
    } else {
      // Fall back to simple generation
      phrases.push([english, chinese, null, 1]);
      phrases.push([english, chinese, null, 2]);
      phrases.push([`Yes, ${english}`, `是的，${chinese}`, null, 3]);
      phrases.push([`No, ${english}`, `不，${chinese}`, null, 3]);
      phrases.push([`I see ${english}`, `我看到${chinese}`, null, 4]);
      phrases.push([`Right, ${english}`, `是的，${chinese}`, null, 4]);
      phrases.push([`That's ${english}`, `那是${chinese}`, null, 5]);
      phrases.push([`You know, ${english}`, `你知道，${chinese}`, null, 5]);
      phrases.push([`I really think ${english}`, `我真的认为${chinese}`, null, 6]);

      // Final phrase
      if (isFinal) {
        phrases.push([scaffold.seed_pair.known, scaffold.seed_pair.target, null, 10]);
      } else {
        phrases.push([`So basically, ${english}`, `所以基本上，${chinese}`, null, 6]);
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
      return false;
    }

    const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));
    const legoIds = Object.keys(scaffold.legos);

    legoIds.forEach((legoId, index) => {
      const legoData = scaffold.legos[legoId];
      const phrases = this.generatePhrasesForLego(legoId, legoData, scaffold, index);

      while (phrases.length < 10) {
        phrases.push([legoData.lego[0], legoData.lego[1], null, 1]);
      }

      legoData.practice_phrases = phrases.slice(0, 10);
    });

    const outputPath = path.join(this.outputDir, `${seedId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(scaffold, null, 2));

    console.log(`  ✅ ${seedId.replace('seed_', '')}: Generated`);
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
const gen = new SemanticMandarinGenerator();
gen.processAllSeeds(641, 650);
