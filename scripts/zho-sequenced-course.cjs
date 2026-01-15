/**
 * Chinese Course - SEQUENCED LEGO approach
 *
 * Each LEGO is added in learning order.
 * Each LEGO specifies which PREVIOUS LEGOs it can connect to.
 * Phrases are built incrementally from valid connections only.
 * Quality over quantity - every phrase must work in BOTH languages.
 */

const fs = require('fs');

const legos = [];
const phrases = [];
const registry = {}; // knownText -> lego

function addLego(knownText, targetText, canFollow = []) {
  const legoId = `L${String(legos.length + 1).padStart(3, '0')}`;

  const lego = {
    legoId,
    knownText,
    targetText,
    canFollow, // IDs of LEGOs this can follow
    introducedAt: legos.length + 1
  };

  legos.push(lego);
  registry[knownText] = lego;

  // Generate phrases from this LEGO
  generatePhrases(lego);

  console.log(`\n${legoId}: "${knownText}" / "${targetText}"`);
  console.log(`  Can follow: [${canFollow.join(', ') || 'none - sentence starter'}]`);
  console.log(`  Total phrases now: ${phrases.length}`);

  return legoId;
}

function generatePhrases(newLego) {
  // The LEGO itself is a phrase (single LEGO)
  addPhrase([newLego.legoId]);

  // Find all paths ending at this LEGO
  findPathsTo(newLego.legoId, [newLego.legoId]);
}

function findPathsTo(legoId, currentPath) {
  const lego = legos.find(l => l.legoId === legoId);
  if (!lego) return;

  // For each LEGO this can follow...
  for (const parentId of lego.canFollow) {
    const parent = legos.find(l => l.legoId === parentId);
    if (!parent) continue;

    // Create path: parent -> current path
    const newPath = [parentId, ...currentPath];
    addPhrase(newPath);

    // Recurse: find paths to the parent
    findPathsTo(parentId, newPath);
  }
}

function addPhrase(legoIds) {
  const key = legoIds.join('→');
  if (phrases.some(p => p.legos.join('→') === key)) return;

  const legoObjs = legoIds.map(id => legos.find(l => l.legoId === id));

  const phrase = {
    knownText: legoObjs.map(l => l.knownText).join(' '),
    targetText: legoObjs.map(l => l.targetText).join(''),
    legos: legoIds,
    legoCount: legoIds.length
  };

  phrases.push(phrase);
}

console.log('='.repeat(60));
console.log('CHINESE COURSE - SEQUENCED LEGO BUILD');
console.log('='.repeat(60));

// ============================================================
// BUILD THE COURSE - LEGOs in learning sequence
// ============================================================

// LEGO 1: Start with "I want" - foundational
const L001 = addLego('I want', '我想', []);

// LEGO 2: "to speak" - connects to "I want"
const L002 = addLego('to speak', '说', [L001]);

// LEGO 3: "Chinese" - connects to "to speak"
const L003 = addLego('Chinese', '中文', [L002]);

// LEGO 4: "to learn" - connects to "I want", and can precede "Chinese"
const L004 = addLego('to learn', '学', [L001]);
// Now manually add: "to learn Chinese" since L003 can follow L004
legos.find(l => l.legoId === L003).canFollow.push(L004);
generatePhrases(legos.find(l => l.legoId === L003)); // regenerate

// LEGO 5: "I'm trying" - same pattern as "I want"
const L005 = addLego("I'm trying", '我在努力', []);

// "to speak" and "to learn" can now also follow "I'm trying"
legos.find(l => l.legoId === L002).canFollow.push(L005);
legos.find(l => l.legoId === L004).canFollow.push(L005);
generatePhrases(legos.find(l => l.legoId === L002));
generatePhrases(legos.find(l => l.legoId === L004));

// LEGO 6: "with you" - connects after "Chinese" or "to speak"
const L006 = addLego('with you', '和你', [L003, L002]);

// LEGO 7: "now" - time marker, can end many phrases
const L007 = addLego('now', '现在', [L003, L006, L002, L004]);

// LEGO 8: "I'm going to" - another subject pattern
const L008 = addLego("I'm going to", '我要', []);
legos.find(l => l.legoId === L002).canFollow.push(L008);
legos.find(l => l.legoId === L004).canFollow.push(L008);
generatePhrases(legos.find(l => l.legoId === L002));
generatePhrases(legos.find(l => l.legoId === L004));

// LEGO 9: "to practise" - new verb
const L009 = addLego('to practise', '练习', [L001, L005, L008]);

// LEGO 10: "a little" - quantity
const L010 = addLego('a little', '一点', [L002, L004, L009]);

// LEGO 11: "to remember" - new verb
const L011 = addLego('to remember', '记住', [L001, L005, L008]);

// LEGO 12: "a word" - object for remember
const L012 = addLego('a word', '一个词', [L011, L004]);

// LEGO 13: "to try" - meta verb
const L013 = addLego('to try', '试', [L001, L005, L008]);

// LEGO 14: "as hard as I can" - intensity modifier
const L014 = addLego('as hard as I can', '尽我所能', [L013]);

// LEGO 15: "today" - time
const L015 = addLego('today', '今天', [L013, L009, L004, L002]);

// LEGO 16: "to explain"
const L016 = addLego('to explain', '解释', [L001, L005, L008, L013]);

// LEGO 17: "what I mean"
const L017 = addLego('what I mean', '我的意思', [L016]);

// LEGO 18: "I" - simple subject (for "I speak")
const L018 = addLego('I', '我', []);
// "to speak" can follow "I" directly for simple present
legos.find(l => l.legoId === L002).canFollow.push(L018);
generatePhrases(legos.find(l => l.legoId === L002));

// LEGO 19: "I'm not sure" - doubt expression
const L019 = addLego("I'm not sure", '我不确定', []);

// LEGO 20: "if I can" - conditional
const L020 = addLego('if I can', '如果我能', [L019]);

// ... continue building the course

// ============================================================
// OUTPUT
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('COURSE SUMMARY');
console.log('='.repeat(60));
console.log(`\nTotal LEGOs: ${legos.length}`);
console.log(`Total Phrases: ${phrases.length}`);
console.log(`\nPhrases per LEGO: ${(phrases.length / legos.length).toFixed(1)}`);

// Show phrase growth
console.log('\nPhrase examples by length:');
for (let len = 1; len <= 5; len++) {
  const examples = phrases.filter(p => p.legoCount === len).slice(0, 3);
  if (examples.length > 0) {
    console.log(`\n  ${len}-LEGO phrases:`);
    examples.forEach(p => {
      console.log(`    "${p.knownText}" → "${p.targetText}"`);
    });
  }
}

const output = {
  course_code: 'zho_for_eng',
  version: '2.0.0-sequenced',
  generated: new Date().toISOString(),
  stats: {
    legos: legos.length,
    phrases: phrases.length
  },
  legos: legos.map(l => ({
    legoId: l.legoId,
    knownText: l.knownText,
    targetText: l.targetText
  })),
  phrases: phrases.map(p => ({
    knownText: p.knownText,
    targetText: p.targetText,
    legos: p.legos
  }))
};

fs.writeFileSync(
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/zho_sequenced_course.json',
  JSON.stringify(output, null, 2)
);

console.log('\n\nOutput: scripts/zho_sequenced_course.json');
