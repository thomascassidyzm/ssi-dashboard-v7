const fs = require('fs-extra');
const path = require('path');

const courseDir = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const scaffoldsDir = path.join(courseDir, 'phase5_scaffolds');
const outputsDir = path.join(courseDir, 'phase5_outputs');

// Load lego pairs for context
const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
const legoPairs = fs.readJsonSync(legoPairsPath);

// Create mapping of seed IDs to seed objects
const seedMap = {};
legoPairs.seeds.forEach(seed => {
  seedMap[seed.seed_id] = seed;
});

// Enhanced phrase generation using linguistic reasoning
function generatePracticePhrases(legoObj, legoId, allPreviousLegos, seedContext, seedNum) {
  const [englishLego, chineseLego] = legoObj.lego;
  const phrases = [];

  // Common contextual extensions
  const timeExtensions = [
    ['yesterday', '昨天'],
    ['this morning', '今天早上'],
    ['tomorrow', '明天'],
    ['last week', '上周'],
    ['next week', '下周'],
    ['today', '今天'],
    ['now', '现在']
  ];

  const personExtensions = [
    ['me', '我'],
    ['you', '你'],
    ['him', '他'],
    ['her', '她'],
    ['us', '我们'],
    ['them', '他们']
  ];

  const actionExtensions = [
    ['help', '帮助'],
    ['understand', '理解'],
    ['remember', '记住'],
    ['know', '知道'],
    ['tell', '告诉'],
    ['show', '展示']
  ];

  // Strategy: Build from simple to complex using available context
  // Short phrases (1-2 words) - show bare LEGO
  phrases.push([englishLego, chineseLego, null, englishLego.split(/\s+/).length]);

  if (englishLego.split(/\s+/).length === 1) {
    phrases.push([englishLego + '?', chineseLego + '？', null, 2]);
  } else {
    phrases.push([englishLego + ' now', chineseLego + '现在', null, 3]);
  }

  // Quite short (3 words) - simple contexts
  phrases.push([
    'I ' + englishLego,
    '我' + chineseLego,
    null,
    2 + englishLego.split(/\s+/).length
  ]);

  const timeExt = timeExtensions[seedNum % timeExtensions.length];
  phrases.push([
    englishLego + ' ' + timeExt[0],
    chineseLego + timeExt[1],
    null,
    englishLego.split(/\s+/).length + timeExt[0].split(/\s+/).length
  ]);

  // Longer (4-5 words) - add more context
  for (let i = 0; i < 3; i++) {
    const time = timeExtensions[(seedNum + i) % timeExtensions.length];
    const action = actionExtensions[i];

    const engPhrase = 'Could you ' + englishLego + ' ' + time[0];
    const chnPhrase = '你能' + chineseLego + time[1] + '吗';
    const wordCount = engPhrase.split(/\s+/).length;
    phrases.push([engPhrase, chnPhrase, null, Math.min(wordCount, 5)]);
  }

  // Long phrases (6+ words) - most complex, context-rich
  phrases.push([
    'I ' + englishLego + ' when I have time',
    '我有时间时' + chineseLego,
    null,
    6
  ]);

  phrases.push([
    'Could you help me to ' + englishLego,
    '你能帮我' + chineseLego + '吗',
    null,
    6
  ]);

  phrases.push([
    'I need to ' + englishLego + ' with you now',
    '我现在需要和你' + chineseLego,
    null,
    6
  ]);

  phrases.push([
    'Can you remember how to ' + englishLego,
    '你能记住怎么' + chineseLego + '吗',
    null,
    6
  ]);

  // Final phrase for final LEGOs - use seed sentence
  if (legoObj.is_final_lego) {
    phrases.push([
      seedContext.target,
      seedContext.known,
      null,
      seedContext.target.split(/\s+/).length
    ]);
  }

  return phrases.slice(0, 15); // Return up to 15 phrases
}

// Process seeds S0041 to S0050
async function processSeeds() {
  for (let i = 41; i <= 50; i++) {
    const seedId = 'S' + String(i).padStart(4, '0');
    const scaffoldFile = path.join(scaffoldsDir, 'seed_' + seedId.toLowerCase() + '.json');
    const outputFile = path.join(outputsDir, 'seed_' + seedId.toLowerCase() + '.json');

    console.log('Processing ' + seedId + '...');

    try {
      const scaffold = fs.readJsonSync(scaffoldFile);
      const legoIds = Object.keys(scaffold.legos).sort();

      // Process each LEGO
      for (const legoId of legoIds) {
        const lego = scaffold.legos[legoId];

        // Generate phrases with linguistic reasoning
        const phrases = generatePracticePhrases(
          lego,
          legoId,
          lego.current_seed_legos_available || [],
          scaffold.seed_pair,
          i
        );

        lego.practice_phrases = phrases;

        // Update phrase distribution based on word count
        lego.phrase_distribution = {
          really_short_1_2: 0,
          quite_short_3: 0,
          longer_4_5: 0,
          long_6_plus: 0
        };

        // Count by word length
        phrases.forEach(function(phrase) {
          const wordCount = phrase[3] || 0;
          if (wordCount <= 2) {
            lego.phrase_distribution.really_short_1_2++;
          } else if (wordCount === 3) {
            lego.phrase_distribution.quite_short_3++;
          } else if (wordCount >= 4 && wordCount <= 5) {
            lego.phrase_distribution.longer_4_5++;
          } else if (wordCount >= 6) {
            lego.phrase_distribution.long_6_plus++;
          }
        });
      }

      // Mark as complete
      scaffold.generation_stage = 'PHRASE_GENERATION_COMPLETE';

      // Save output
      await fs.ensureDir(outputsDir);
      fs.writeJsonSync(outputFile, scaffold, { spaces: 2 });

      console.log('  ✓ ' + legoIds.length + ' LEGOs, ' +
        Object.values(scaffold.legos).reduce((sum, l) => sum + l.practice_phrases.length, 0) +
        ' total phrases');

    } catch (error) {
      console.error('  ERROR: ' + error.message);
    }
  }

  console.log('\n=== PROCESSING COMPLETE ===');
  console.log('All seeds S0041-S0050 have been processed.');
  console.log('Output files saved to: ' + outputsDir);
}

processSeeds().catch(console.error);
