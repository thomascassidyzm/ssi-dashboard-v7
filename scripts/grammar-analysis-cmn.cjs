#!/usr/bin/env node
/**
 * Grammar Validation Worker - Chinese (cmn_for_eng)
 * Seeds: S0051, S0052, S0053
 *
 * Analyzes practice phrases for grammatical correctness and reports errors via API.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const VFS_ROOT = path.join(__dirname, '../public/vfs/courses');
const COURSE_CODE = 'cmn_for_eng';
const API_URL = 'http://localhost:3460';

// Grammar error detection patterns
const grammarRules = {
  // Missing prepositions after verbs
  'enjoy X with': {
    pattern: /^I enjoy (?!doing|[a-z]+ (?:to|with|about|from|in|at|of|by)).*with/,
    test: (text) => /^I enjoy [a-z]+ with/.test(text) && !text.includes('doing') && !text.match(/enjoy (making|improving|answering|doing|knowing)/),
    desc: 'Missing gerund after "enjoy"'
  },
  'know to': {
    pattern: /I know to (?!mention)/,
    test: (text) => /I know to/.test(text),
    desc: '"know to" is incorrect grammar (should be "know about" or just "know")'
  },
  'thinking to': {
    pattern: /(?:was|wasn't) thinking to/,
    test: (text) => /(?:was|wasn't) thinking to/.test(text),
    desc: '"thinking to" is incorrect (should be "thinking about")'
  },
  'enjoy do': {
    pattern: /enjoy (do|answer|put) /,
    test: (text) => /enjoy (do|answer|put) (?!ing)/.test(text),
    desc: 'Missing -ing after "enjoy" + verb'
  },
  'think [verb]': {
    pattern: /I think (put|write|do|answer|make) [a-z]/,
    test: (text) => /^I think (put|write|do|answer|make) (?!making|writing|putting|doing|answering)/.test(text),
    desc: 'Verb should be gerund after "think"'
  },
  'whether need': {
    pattern: /whether need/,
    test: (text) => /whether need/.test(text),
    desc: '"whether need" missing subject pronoun (should be "whether I need" or "whether need")'
  },
  'was thinking [verb]': {
    pattern: /was thinking (put|write|do)/,
    test: (text) => /was thinking (put|write|do) (?!ing)/.test(text),
    desc: 'Missing -ing after "was thinking"'
  },
  'past tense time': {
    pattern: /^(I don't worry|I enjoy|I don't need) .* last week/,
    test: (text) => {
      if (!/last week$/.test(text)) return false;
      return /(^I don't worry|^I enjoy|^I don't need)/.test(text) && !text.includes('enjoyed') && !text.includes('didn\'t') && !text.includes('wasn\'t');
    },
    desc: 'Should use past tense with "last week"'
  },
  'mistakes to X': {
    pattern: /mistakes to [a-z]/,
    test: (text) => /mistakes to /.test(text),
    desc: '"mistakes to" is incorrect construction'
  },
  'in X know': {
    pattern: /I know in /,
    test: (text) => /I know in /.test(text),
    desc: '"know in" doesn\'t make sense'
  },
  'in X think': {
    pattern: /I (?:was|wasn't) thinking in /,
    test: (text) => /I (?:was|wasn't) thinking in /.test(text),
    desc: 'Should be "thinking about" not "thinking in"'
  },
  'think [verb] is': {
    pattern: /I think (put|write|do|make|improve) [a-z]+ is /,
    test: (text) => /^I think (put|write|do|make|improve) [a-z]+ is /.test(text),
    desc: 'Should use gerund: "I think (putting/writing/etc) is"'
  },
  'was thinking X bag': {
    pattern: /(?:was|wasn't) thinking (?:her|his) bag/,
    test: (text) => /(?:was|wasn't) thinking (?:her|his) bag/.test(text),
    desc: 'Should be "thinking about"'
  },
  'I want to put X': {
    pattern: /I want to put (?!his|the|in|her)(?!writing|doing)/,
    test: (text) => /^I want to put her bag[.,]?$/.test(text),
    desc: '"put her bag" is incomplete (missing where)'
  }
};

/**
 * Check if a phrase has grammar errors
 */
function hasGrammarError(knownPhrase) {
  // Check all rules
  for (const [ruleId, rule] of Object.entries(grammarRules)) {
    if (rule.test(knownPhrase)) {
      return {
        hasError: true,
        rule: ruleId,
        desc: rule.desc
      };
    }
  }
  return { hasError: false };
}

/**
 * Load basket data
 */
function loadBaskets() {
  const basketPath = path.join(VFS_ROOT, COURSE_CODE, 'lego_baskets.json');
  return JSON.parse(fs.readFileSync(basketPath, 'utf8'));
}

/**
 * Main validation process
 */
async function validateSeeds() {
  console.log('Starting grammar validation for Chinese course (cmn_for_eng)...\n');

  const basketData = loadBaskets();
  const seedsToValidate = ['S0051', 'S0052', 'S0053'];

  let totalKept = 0;
  let totalDeleted = 0;
  const deletionLog = [];

  for (const seedId of seedsToValidate) {
    console.log(`\nProcessing ${seedId}...`);

    // Find all baskets for this seed
    const seedBaskets = Object.entries(basketData.baskets)
      .filter(([key]) => key.startsWith(seedId));

    for (const [basketKey, basket] of seedBaskets) {
      console.log(`  ${basketKey}: ${basket.practice_phrases.length} phrases`);

      // Process phrases in reverse order to maintain indices
      const phrasesToDelete = [];

      basket.practice_phrases.forEach((phrase, idx) => {
        const check = hasGrammarError(phrase.known);

        if (check.hasError) {
          phrasesToDelete.push({
            index: idx,
            phrase: phrase,
            reason: check.desc
          });
        }
      });

      // Delete phrases (in reverse order to maintain indices)
      for (const deletion of phrasesToDelete.reverse()) {
        try {
          const response = await axios.post(`${API_URL}/delete-phrase`, {
            courseCode: COURSE_CODE,
            seed: seedId,
            legoIndex: parseInt(basketKey.match(/L(\d+)/)[1]) - 1,
            phraseIndex: deletion.index,
            reason: deletion.reason
          });

          totalDeleted++;
          deletionLog.push({
            basket: basketKey,
            index: deletion.index,
            phrase: deletion.phrase.known,
            reason: deletion.reason
          });

          console.log(`    ✗ Deleted [${deletion.index}]: "${deletion.phrase.known.substring(0, 50)}..." (${deletion.reason})`);
        } catch (error) {
          console.error(`    ERROR deleting phrase: ${error.message}`);
        }
      }

      // Count remaining phrases
      totalKept += basket.practice_phrases.length - phrasesToDelete.length;
    }
  }

  console.log(`\n✓ Validation complete`);
  console.log(`  Phrases kept: ${totalKept}`);
  console.log(`  Phrases deleted: ${totalDeleted}`);

  // Report completion
  try {
    await axios.post(`${API_URL}/worker-complete`, {
      keptCount: totalKept
    });
    console.log('\n✓ Reported to worker API');
  } catch (error) {
    console.error('Failed to report to worker API:', error.message);
  }

  // Write deletion log
  const logPath = path.join(VFS_ROOT, COURSE_CODE, 'grammar-deletions.json');
  fs.writeFileSync(logPath, JSON.stringify(deletionLog, null, 2));
  console.log(`\nDeletion log saved to: ${logPath}`);
}

// Run validation
validateSeeds().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});
