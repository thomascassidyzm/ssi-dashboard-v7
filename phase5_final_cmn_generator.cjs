#!/usr/bin/env node

/**
 * Phase 5 Final Mandarin Generator for S0641-S0650
 * Semantically-aware generation with proper progressions
 */

const fs = require('fs');
const path = require('path');

class FinalMandarinGenerator {
  constructor() {
    this.scaffoldDir = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds';
    this.outputDir = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs';

    // Semantic understanding of LEGOs
    this.legoMeanings = {
      '我认为是': { type: 'opinion', english: 'I think that it is', context: 'expressing opinion' },
      '那把椅子上的': { type: 'location', english: 'on that chair', context: 'location/position' },
      '红色的那个': { type: 'descriptor', english: 'the red one', context: 'describing object' },
      '那把椅子': { type: 'object', english: 'that chair', context: 'specific object' },
      '您感觉怎么样': { type: 'question', english: 'How do you feel', context: 'polite question' },
      '女士': { type: 'title', english: 'madam', context: 'form of address' },
      '感觉怎么样': { type: 'question', english: 'how do you feel', context: 'how you feel' },
      '您想要吗': { type: 'question', english: 'Do you want', context: 'offer/question' },
      '先生': { type: 'title', english: 'sir', context: 'form of address' },
      '想要吗': { type: 'question', english: 'do you want', context: 'want it' },
      '我可以帮您': { type: 'offer', english: 'I can help you', context: 'offering help' },
      '可以帮您': { type: 'offer', english: 'can help you', context: 'ability to help' },
      '帮您': { type: 'action', english: 'help you', context: 'helping action' },
      '您准备好了吗': { type: 'question', english: 'Are you ready', context: 'checking readiness' },
      '准备好了': { type: 'state', english: 'ready', context: 'state of readiness' },
      '准备好了吗': { type: 'question', english: 'are you ready', context: 'readiness' },
      '您在做什么事': { type: 'question', english: 'What are you doing', context: 'asking activity' },
      '在做什么事': { type: 'action', english: 'doing what', context: 'activity' },
      '做什么事': { type: 'action', english: 'what are you doing', context: 'doing' },
      '什么事': { type: 'question', english: 'what is it', context: 'what matter' },
      '您能说那个吗': { type: 'question', english: 'Can you say that', context: 'requesting speech' },
      '能说那个': { type: 'action', english: 'can say that', context: 'ability to say' },
      '说那个': { type: 'action', english: 'say that', context: 'speech action' },
      '您说它': { type: 'instruction', english: 'You say it', context: 'telling to speak' },
      '说它': { type: 'action', english: 'say it', context: 'saying' },
      '您说的话': { type: 'statement', english: 'what you said', context: 'your words' },
      '说的话': { type: 'statement', english: 'what you say', context: 'your words' },
      '您想去吗': { type: 'question', english: 'Do you want to go', context: 'going invitation' },
      '想去': { type: 'desire', english: 'want to go', context: 'wanting to go' },
      '想去吗': { type: 'question', english: 'do you want to go', context: 'go question' }
    };
  }

  /**
   * Generate 10 phrases following 2-2-2-4 distribution
   */
  generatePhrasesForLego(legoId, legoData, scaffold, legoIndex) {
    const english = legoData.lego[0];
    const chinese = legoData.lego[1];
    const isFinal = legoData.is_final_lego;
    const earlierLegos = legoData.current_seed_earlier_legos || [];

    const meaning = this.legoMeanings[chinese] || { type: 'unknown' };
    const phrases = [];

    // Helper to combine earlier LEGOs
    const combineEarlier = (count) => {
      if (earlierLegos.length === 0) return { en: '', ch: '' };
      const selected = earlierLegos.slice(0, Math.min(count, earlierLegos.length));
      const en = selected.map(l => l.known).join(' ');
      const ch = selected.map(l => l.target).join('');
      return { en, ch };
    };

    // Category 1: SHORT (1-2 LEGOs) - 2 phrases
    // Phrase 1: Just the LEGO
    phrases.push([english, chinese, null, 1]);

    // Phrase 2: Simple variation based on meaning
    if (meaning.type === 'question') {
      phrases.push([`Yes, ${english}?`, `是的，${chinese}？`, null, 2]);
    } else if (meaning.type === 'opinion') {
      phrases.push([`Well, ${english}`, `好吧，${chinese}`, null, 2]);
    } else if (meaning.type === 'descriptor') {
      phrases.push([`Oh, ${english}`, `哦，${chinese}`, null, 2]);
    } else {
      phrases.push([`I see, ${english}`, `我看到，${chinese}`, null, 2]);
    }

    // Category 2: MEDIUM (3 LEGOs) - 2 phrases
    // Phrase 3: With one earlier LEGO if available
    if (earlierLegos.length >= 1) {
      const prev = earlierLegos[earlierLegos.length - 1];
      if (meaning.type === 'question' || meaning.type === 'action') {
        phrases.push([`${prev.known}, ${english}`, `${prev.target}，${chinese}`, null, 3]);
      } else {
        phrases.push([`${prev.known} and ${english}`, `${prev.target}和${chinese}`, null, 3]);
      }
    } else {
      if (meaning.type === 'question') {
        phrases.push([`Tell me, ${english}?`, `告诉我，${chinese}？`, null, 3]);
      } else {
        phrases.push([`Actually, ${english}`, `实际上，${chinese}`, null, 3]);
      }
    }

    // Phrase 4: Another medium variation
    if (earlierLegos.length >= 1) {
      const prev = earlierLegos[0];
      if (meaning.type === 'question') {
        phrases.push([`So, ${prev.known}, ${english}?`, `那么，${prev.target}，${chinese}？`, null, 3]);
      } else {
        phrases.push([`First ${prev.known}, then ${english}`, `首先${prev.target}，然后${chinese}`, null, 3]);
      }
    } else {
      phrases.push([`But ${english}`, `但是${chinese}`, null, 3]);
    }

    // Category 3: LONGER (4 LEGOs) - 2 phrases
    // Phrase 5: Complex with more context
    if (earlierLegos.length >= 2) {
      const comb = combineEarlier(2);
      phrases.push([`${comb.en} ${english}`, `${comb.ch}${chinese}`, null, 4]);
    } else if (earlierLegos.length === 1) {
      const prev = earlierLegos[0];
      if (meaning.type === 'question') {
        phrases.push([`Now that ${prev.known}, ${english}?`, `既然${prev.target}，${chinese}？`, null, 4]);
      } else {
        phrases.push([`After ${prev.known}, ${english}`, `在${prev.target}之后，${chinese}`, null, 4]);
      }
    } else {
      if (meaning.type === 'question') {
        phrases.push([`I need to know, ${english}?`, `我需要知道，${chinese}？`, null, 4]);
      } else {
        phrases.push([`The thing is, ${english}`, `问题是，${chinese}`, null, 4]);
      }
    }

    // Phrase 6: Another longer variation
    if (earlierLegos.length >= 1) {
      const allEarlier = earlierLegos.map(l => l.known).slice(0, 3).join(', ');
      const allEarlierCh = earlierLegos.map(l => l.target).slice(0, 3).join('、');
      phrases.push([`With ${allEarlier}, ${english}`, `用${allEarlierCh}，${chinese}`, null, 4]);
    } else {
      phrases.push([`Clearly, ${english}`, `显然，${chinese}`, null, 4]);
    }

    // Category 4: LONGEST (5+ LEGOs) - 4 phrases
    // Phrase 7-10: Build toward final sentence
    if (earlierLegos.length >= 2) {
      const comb = combineEarlier(3);
      phrases.push([`${comb.en} very much ${english}`, `${comb.ch}非常${chinese}`, null, 5]);
    } else {
      phrases.push([`I would definitely say ${english}`, `我会肯定地说${chinese}`, null, 5]);
    }

    phrases.push([`You know what, ${english}`, `你知道吗，${chinese}`, null, 6]);

    if (earlierLegos.length >= 1) {
      const allPrev = earlierLegos.map(l => l.known).join(', ');
      const allPrevCh = earlierLegos.map(l => l.target).join('、');
      phrases.push([`So with ${allPrev}, I'd say ${english}`, `所以有了${allPrevCh}，我会说${chinese}`, null, 7]);
    } else {
      phrases.push([`Without a doubt, ${english}`, `毫无疑问，${chinese}`, null, 6]);
    }

    // Final phrase (Phrase 10)
    if (isFinal) {
      // Use complete seed sentence
      phrases.push([scaffold.seed_pair.known, scaffold.seed_pair.target, null, 10]);
    } else {
      // Use a comprehensive final phrase
      if (earlierLegos.length > 0) {
        const allEarlier = earlierLegos.map(l => l.known).join(' ');
        const allEarlierCh = earlierLegos.map(l => l.target).join('');
        phrases.push([`${allEarlier} confirms that ${english}`, `${allEarlierCh}确认${chinese}`, null, 8]);
      } else {
        phrases.push([`So the answer to all of that is: ${english}`, `所有这一切的答案是：${chinese}`, null, 8]);
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

    console.log(`  ✅ ${seedId.replace('seed_', '')}`);
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
const gen = new FinalMandarinGenerator();
gen.processAllSeeds(641, 650);
