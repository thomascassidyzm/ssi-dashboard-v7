/**
 * Chinese LEGO Network Builder
 * Network-aware decomposition with proper edge design
 *
 * Key insight: LEGOs are chunks with edges, not words.
 * Phrases are derived from LEGO combinations, not the original seed.
 */

const output = {
  course_code: 'zho_for_eng',
  legos: [],
  phrases: [],

  // Track what edges are exposed for network-aware decomposition
  exposedEdges: {
    // rightEdge: LEGOs that expose a right edge (can have something follow)
    // leftEdge: LEGOs that expose a left edge (can follow something)
  }
};

let legoCounter = 0;

function addLego(targetText, knownText, edgeType = 'both') {
  legoCounter++;
  const legoId = `L${String(legoCounter).padStart(3, '0')}`;

  const lego = {
    legoId,
    targetText,
    knownText,
    edgeType  // 'left', 'right', 'both', 'terminal'
  };

  output.legos.push(lego);
  console.log(`+ LEGO ${legoId}: "${knownText}" / "${targetText}" [${edgeType}]`);

  return legoId;
}

function addPhrase(knownText, targetText, legoIds) {
  const phrase = {
    knownText,
    targetText,
    legos: legoIds,
    legoCount: legoIds.length
  };

  output.phrases.push(phrase);
  console.log(`  → "${knownText}" / "${targetText}" [${legoIds.join('+')}]`);

  return phrase;
}

// ============================================================
// SEED 1: "I want to speak Chinese with you now"
// ============================================================
console.log('\n=== SEED 1: I want to speak Chinese ===\n');

// Decomposition strategy:
// - "I want to" is a chunk (Chinese 我想 includes the "to" sense)
// - "speak" / "说" is a verb that can follow "want to"
// - "Chinese" / "中文" is a noun that can follow verbs

const L1 = addLego('我想', 'I want to', 'right');    // Exposes right edge for infinitive verbs
const L2 = addLego('说', 'speak', 'both');           // Can follow "want to", can precede objects
const L3 = addLego('中文', 'Chinese', 'left');       // Terminal noun, follows verbs

// Phrases that emerge from these LEGOs
console.log('\nPhrases from Seed 1:');
addPhrase('I want to speak', '我想说', [L1, L2]);
addPhrase('I want to speak Chinese', '我想说中文', [L1, L2, L3]);
addPhrase('speak Chinese', '说中文', [L2, L3]);

// ============================================================
// SEED 2: "I'm trying to learn"
// ============================================================
console.log('\n=== SEED 2: I\'m trying to learn ===\n');

// Network-aware: We already have "I want to" - can we create similar pattern?
// "I'm trying to" / "我在试着" - same right edge as "I want to"

const L4 = addLego('我在试着', "I'm trying to", 'right');  // Same edge type as L1
const L5 = addLego('学', 'learn', 'both');                  // Verb like L2

console.log('\nPhrases from Seed 2:');
addPhrase("I'm trying to learn", '我在试着学', [L4, L5]);

// CROSS-SEED PHRASES - the network effect!
console.log('\nCross-seed phrases (network effect):');
addPhrase('I want to learn', '我想学', [L1, L5]);           // L1 + L5 (new combo!)
addPhrase("I'm trying to speak", '我在试着说', [L4, L2]);   // L4 + L2 (new combo!)
addPhrase("I'm trying to speak Chinese", '我在试着说中文', [L4, L2, L3]);
addPhrase('I want to learn Chinese', '我想学中文', [L1, L5, L3]);
addPhrase('learn Chinese', '学中文', [L5, L3]);

// ============================================================
// SEED 3: "I like to drink tea"
// ============================================================
console.log('\n=== SEED 3: I like to drink tea ===\n');

const L6 = addLego('我喜欢', 'I like to', 'right');   // Same edge pattern
const L7 = addLego('喝', 'drink', 'both');            // Verb
const L8 = addLego('茶', 'tea', 'left');              // Terminal noun

console.log('\nPhrases from Seed 3:');
addPhrase('I like to drink', '我喜欢喝', [L6, L7]);
addPhrase('I like to drink tea', '我喜欢喝茶', [L6, L7, L8]);
addPhrase('drink tea', '喝茶', [L7, L8]);

// CROSS-SEED PHRASES
console.log('\nCross-seed phrases:');
addPhrase('I want to drink', '我想喝', [L1, L7]);
addPhrase('I want to drink tea', '我想喝茶', [L1, L7, L8]);
addPhrase("I'm trying to drink", '我在试着喝', [L4, L7]);
addPhrase('I like to speak', '我喜欢说', [L6, L2]);
addPhrase('I like to speak Chinese', '我喜欢说中文', [L6, L2, L3]);
addPhrase('I like to learn', '我喜欢学', [L6, L5]);
addPhrase('I like to learn Chinese', '我喜欢学中文', [L6, L5, L3]);

// ============================================================
// SEED 4: "I need to eat"
// ============================================================
console.log('\n=== SEED 4: I need to eat ===\n');

const L9 = addLego('我需要', 'I need to', 'right');
const L10 = addLego('吃', 'eat', 'both');
const L11 = addLego('饭', 'food', 'left');  // 吃饭 = eat food/meal

console.log('\nPhrases from Seed 4:');
addPhrase('I need to eat', '我需要吃', [L9, L10]);
addPhrase('I need to eat food', '我需要吃饭', [L9, L10, L11]);
addPhrase('eat food', '吃饭', [L10, L11]);

// CROSS-SEED - now we have 4 "I X to" patterns!
console.log('\nCross-seed phrases (4 subject patterns x 4 verbs):');
addPhrase('I want to eat', '我想吃', [L1, L10]);
addPhrase('I want to eat food', '我想吃饭', [L1, L10, L11]);
addPhrase("I'm trying to eat", '我在试着吃', [L4, L10]);
addPhrase('I like to eat', '我喜欢吃', [L6, L10]);
addPhrase('I like to eat food', '我喜欢吃饭', [L6, L10, L11]);
addPhrase('I need to speak', '我需要说', [L9, L2]);
addPhrase('I need to learn', '我需要学', [L9, L5]);
addPhrase('I need to drink', '我需要喝', [L9, L7]);

// ============================================================
// SUMMARY
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('NETWORK SUMMARY');
console.log('='.repeat(60));
console.log(`Total LEGOs: ${output.legos.length}`);
console.log(`Total Phrases: ${output.phrases.length}`);

// Calculate edge statistics
const edgeMap = {};
for (const phrase of output.phrases) {
  for (let i = 0; i < phrase.legos.length - 1; i++) {
    const edge = `${phrase.legos[i]}→${phrase.legos[i+1]}`;
    edgeMap[edge] = (edgeMap[edge] || 0) + 1;
  }
}

console.log(`\nUnique Edges: ${Object.keys(edgeMap).length}`);
console.log('\nEdge frequency:');
Object.entries(edgeMap)
  .sort((a, b) => b[1] - a[1])
  .forEach(([edge, count]) => {
    console.log(`  ${edge}: ${count} occurrences`);
  });

// Output in player format
const playerFormat = {
  legos: output.legos.map(l => ({
    legoId: l.legoId,
    targetText: l.targetText,
    knownText: l.knownText
  })),
  phrases: output.phrases.map(p => ({
    knownText: p.knownText,
    targetText: p.targetText,
    legos: p.legos
  }))
};

console.log('\n' + '='.repeat(60));
console.log('PLAYER FORMAT OUTPUT');
console.log('='.repeat(60));
console.log(JSON.stringify(playerFormat, null, 2));

// Write to file
const fs = require('fs');
fs.writeFileSync(
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/zho_network_output.json',
  JSON.stringify(playerFormat, null, 2)
);
console.log('\nWritten to: scripts/zho_network_output.json');
