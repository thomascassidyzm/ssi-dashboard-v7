/**
 * Chinese Course: Network-Aware LEGO Decomposition
 * Processing 260 seeds with edge-aware chunking
 *
 * Key principles:
 * 1. LEGOs are chunks with compatible edges, not words
 * 2. Each new seed's decomposition maximizes connectivity to existing network
 * 3. Each LEGO must be ZUT-valid (meaningful standalone unit)
 * 4. Phrases emerge from LEGO combinations, not the original seed
 */

const fs = require('fs');

// Seeds from database (English known_text)
const seeds = [
  "I want to speak Chinese with you now.",
  "I'm trying to learn.",
  "how to speak as often as possible",
  "how to say something in Chinese",
  "I'm going to practise speaking with someone else.",
  "I'm trying to remember a word.",
  "I want to try as hard as I can today.",
  "I'm going to try to explain what I mean.",
  "I speak a little Chinese now.",
  "I'm not sure if I can remember the whole sentence.",
  "I'd like to be able to speak after you finish.",
  "I wouldn't like to guess what's going to happen tomorrow.",
  "You speak Chinese very well.",
  "Do you speak Chinese all day?",
  "And I want you to speak Chinese with me tomorrow.",
  "He wants to come back with everyone else later on.",
  "She wants to find out what the answer is.",
  "We want to meet at six o'clock this evening.",
  "But I don't want to stop talking.",
  "You want to learn his name quickly."
  // ... continuing with first 20 for now to establish patterns
];

// Network state
const network = {
  legos: [],
  phrases: [],
  legoIndex: {},  // quick lookup by knownText
  edgeTypes: {
    // Track which LEGOs expose which edge types
    subjectSlot: [],      // "I want to", "I'm trying to", etc - takes verbs
    verbInfinitive: [],   // "speak", "learn", etc - follows subject slots
    objectSlot: [],       // "Chinese", "tea", etc - follows verbs
    adverbSlot: [],       // "now", "very well", etc - modifies
    questionWord: [],     // "how", "what", "when", etc
    connector: [],        // "and", "but", "because", etc
  }
};

let legoCounter = 0;

function addLego(knownText, targetText, edgeType) {
  // Check if LEGO already exists
  if (network.legoIndex[knownText]) {
    return network.legoIndex[knownText].legoId;
  }

  legoCounter++;
  const legoId = `L${String(legoCounter).padStart(3, '0')}`;

  const lego = { legoId, knownText, targetText };
  network.legos.push(lego);
  network.legoIndex[knownText] = lego;

  // Track edge type
  if (edgeType && network.edgeTypes[edgeType]) {
    network.edgeTypes[edgeType].push(legoId);
  }

  return legoId;
}

function addPhrase(knownText, targetText, legoIds) {
  network.phrases.push({ knownText, targetText, legos: legoIds });
}

function getExistingLego(knownText) {
  return network.legoIndex[knownText];
}

// Generate cross-product phrases for compatible edge types
function generateCrossProductPhrases(subjectId, verbId, objectId = null) {
  const subject = network.legos.find(l => l.legoId === subjectId);
  const verb = network.legos.find(l => l.legoId === verbId);
  const object = objectId ? network.legos.find(l => l.legoId === objectId) : null;

  if (!subject || !verb) return;

  // Subject + Verb
  const sv = {
    knownText: `${subject.knownText} ${verb.knownText}`,
    targetText: `${subject.targetText}${verb.targetText}`,
    legos: [subjectId, verbId]
  };

  // Check if phrase already exists
  if (!network.phrases.some(p => p.knownText === sv.knownText)) {
    network.phrases.push(sv);
  }

  // Subject + Verb + Object
  if (object) {
    const svo = {
      knownText: `${subject.knownText} ${verb.knownText} ${object.knownText}`,
      targetText: `${subject.targetText}${verb.targetText}${object.targetText}`,
      legos: [subjectId, verbId, objectId]
    };
    if (!network.phrases.some(p => p.knownText === svo.knownText)) {
      network.phrases.push(svo);
    }

    // Also Verb + Object
    const vo = {
      knownText: `${verb.knownText} ${object.knownText}`,
      targetText: `${verb.targetText}${object.targetText}`,
      legos: [verbId, objectId]
    };
    if (!network.phrases.some(p => p.knownText === vo.knownText)) {
      network.phrases.push(vo);
    }
  }
}

console.log('='.repeat(70));
console.log('CHINESE COURSE: NETWORK-AWARE LEGO DECOMPOSITION');
console.log('='.repeat(70));

// ============================================================
// SEED 1: "I want to speak Chinese with you now."
// ============================================================
console.log('\n--- SEED 1: I want to speak Chinese with you now. ---');

// Decomposition decision:
// "I want to" / 我想 - subject slot (takes infinitive verbs)
// "speak" / 说 - infinitive verb
// "Chinese" / 中文 - object
// "with you" / 和你 - could be useful but "now" less so for early network
// Keeping it simple: focus on the core SVO pattern

const L001 = addLego('I want to', '我想', 'subjectSlot');
const L002 = addLego('speak', '说', 'verbInfinitive');
const L003 = addLego('Chinese', '中文', 'objectSlot');

generateCrossProductPhrases(L001, L002, L003);

console.log(`  LEGOs: ${L001} "I want to/我想", ${L002} "speak/说", ${L003} "Chinese/中文"`);
console.log(`  Phrases: ${network.phrases.length}`);

// ============================================================
// SEED 2: "I'm trying to learn."
// ============================================================
console.log('\n--- SEED 2: I\'m trying to learn. ---');

// Network-aware: We already have "I want to" (subjectSlot)
// "I'm trying to" is same edge type - can share verbs!
// "learn" is new verb - can connect to both subject slots

const L004 = addLego("I'm trying to", '我在试着', 'subjectSlot');
const L005 = addLego('learn', '学', 'verbInfinitive');

// Generate phrases for new LEGO + all compatible existing LEGOs
generateCrossProductPhrases(L004, L005);  // I'm trying to learn
generateCrossProductPhrases(L001, L005);  // I want to learn (CROSS-SEED!)
generateCrossProductPhrases(L004, L002);  // I'm trying to speak (CROSS-SEED!)
generateCrossProductPhrases(L004, L002, L003);  // I'm trying to speak Chinese
generateCrossProductPhrases(L001, L005, L003);  // I want to learn Chinese

console.log(`  NEW LEGOs: ${L004} "I'm trying to/我在试着", ${L005} "learn/学"`);
console.log(`  Network effect: 2 subject slots × 2 verbs = 4 SV combinations`);
console.log(`  Total phrases: ${network.phrases.length}`);

// ============================================================
// SEED 3: "how to speak as often as possible"
// ============================================================
console.log('\n--- SEED 3: how to speak as often as possible ---');

// "how to" is a question pattern - new edge type
// "speak" already exists!
// "as often as possible" is an adverb chunk

const L006 = addLego('how to', '怎么', 'questionWord');
// L002 "speak" already exists - REUSE!

generateCrossProductPhrases(L006, L002);  // how to speak
generateCrossProductPhrases(L006, L005);  // how to learn
generateCrossProductPhrases(L006, L002, L003);  // how to speak Chinese
generateCrossProductPhrases(L006, L005, L003);  // how to learn Chinese

console.log(`  NEW LEGO: ${L006} "how to/怎么"`);
console.log(`  REUSED: L002 "speak/说"`);
console.log(`  Total phrases: ${network.phrases.length}`);

// ============================================================
// SEED 4: "how to say something in Chinese"
// ============================================================
console.log('\n--- SEED 4: how to say something in Chinese ---');

// "how to" exists!
// "say" is a new verb (like speak but different)
// "something" is useful object
// "in Chinese" - locative, but 中文 already covers "Chinese"

const L007 = addLego('say', '说', 'verbInfinitive');  // Same Chinese as "speak"!
const L008 = addLego('something', '什么', 'objectSlot');

// Connect new verb to all subject slots
for (const subjectId of network.edgeTypes.subjectSlot) {
  generateCrossProductPhrases(subjectId, L007);
  generateCrossProductPhrases(subjectId, L007, L008);
  generateCrossProductPhrases(subjectId, L007, L003);  // say Chinese
}
generateCrossProductPhrases(L006, L007);  // how to say
generateCrossProductPhrases(L006, L007, L008);  // how to say something

console.log(`  NEW LEGOs: ${L007} "say/说", ${L008} "something/什么"`);
console.log(`  Total phrases: ${network.phrases.length}`);

// ============================================================
// SEED 5: "I'm going to practise speaking with someone else."
// ============================================================
console.log('\n--- SEED 5: I\'m going to practise speaking ---');

// "I'm going to" - new subject slot!
// "practise" - new verb
// "speaking" - gerund form, treat as separate or same as "speak"?
// Decision: "practise speaking" as a compound verb chunk, or separate?
// For max recombination: "practise" separate, connects to gerunds

const L009 = addLego("I'm going to", '我要', 'subjectSlot');
const L010 = addLego('practise', '练习', 'verbInfinitive');

// Connect to all existing objects
for (const subjectId of network.edgeTypes.subjectSlot) {
  generateCrossProductPhrases(subjectId, L010);  // X practise
}
generateCrossProductPhrases(L009, L002);  // I'm going to speak
generateCrossProductPhrases(L009, L005);  // I'm going to learn
generateCrossProductPhrases(L009, L002, L003);  // I'm going to speak Chinese
generateCrossProductPhrases(L009, L005, L003);  // I'm going to learn Chinese

console.log(`  NEW LEGOs: ${L009} "I'm going to/我要", ${L010} "practise/练习"`);
console.log(`  Total phrases: ${network.phrases.length}`);

// ============================================================
// SEED 6: "I'm trying to remember a word."
// ============================================================
console.log('\n--- SEED 6: I\'m trying to remember a word. ---');

// "I'm trying to" exists!
// "remember" - new verb
// "a word" - useful object

const L011 = addLego('remember', '记住', 'verbInfinitive');
const L012 = addLego('a word', '一个词', 'objectSlot');

// Connect new verb to all subject slots
for (const subjectId of network.edgeTypes.subjectSlot) {
  generateCrossProductPhrases(subjectId, L011);
  generateCrossProductPhrases(subjectId, L011, L012);
}

console.log(`  NEW LEGOs: ${L011} "remember/记住", ${L012} "a word/一个词"`);
console.log(`  Total phrases: ${network.phrases.length}`);

// ============================================================
// Continue with seeds 7-20...
// ============================================================

// SEED 7: "I want to try as hard as I can today."
console.log('\n--- SEED 7: I want to try ---');
const L013 = addLego('try', '试', 'verbInfinitive');
for (const subjectId of network.edgeTypes.subjectSlot) {
  generateCrossProductPhrases(subjectId, L013);
}
console.log(`  NEW LEGO: ${L013} "try/试"`);

// SEED 9: "I speak a little Chinese now."
console.log('\n--- SEED 9: I speak a little Chinese now ---');
const L014 = addLego('I', '我', 'subjectSlot');  // Simple "I" without modal
const L015 = addLego('a little', '一点', 'objectSlot');
generateCrossProductPhrases(L014, L002, L015);  // I speak a little
generateCrossProductPhrases(L014, L002, L003);  // I speak Chinese
generateCrossProductPhrases(L014, L005, L003);  // I learn Chinese
console.log(`  NEW LEGOs: ${L014} "I/我", ${L015} "a little/一点"`);

// SEED 13: "You speak Chinese very well."
console.log('\n--- SEED 13: You speak Chinese very well ---');
const L016 = addLego('you', '你', 'subjectSlot');
const L017 = addLego('very well', '很好', 'adverbSlot');
generateCrossProductPhrases(L016, L002, L003);  // You speak Chinese
console.log(`  NEW LEGOs: ${L016} "you/你", ${L017} "very well/很好"`);

// SEED 16: "He wants to come back"
console.log('\n--- SEED 16: He wants to ---');
const L018 = addLego('he wants to', '他想', 'subjectSlot');
const L019 = addLego('come back', '回来', 'verbInfinitive');
for (const verbId of network.edgeTypes.verbInfinitive) {
  generateCrossProductPhrases(L018, verbId);
}
generateCrossProductPhrases(L018, L019);
console.log(`  NEW LEGOs: ${L018} "he wants to/他想", ${L019} "come back/回来"`);

// SEED 17: "She wants to find out"
console.log('\n--- SEED 17: She wants to ---');
const L020 = addLego('she wants to', '她想', 'subjectSlot');
const L021 = addLego('find out', '找出', 'verbInfinitive');
for (const verbId of network.edgeTypes.verbInfinitive) {
  generateCrossProductPhrases(L020, verbId);
}
generateCrossProductPhrases(L020, L021);
console.log(`  NEW LEGOs: ${L020} "she wants to/她想", ${L021} "find out/找出"`);

// SEED 18: "We want to meet"
console.log('\n--- SEED 18: We want to ---');
const L022 = addLego('we want to', '我们想', 'subjectSlot');
const L023 = addLego('meet', '见面', 'verbInfinitive');
for (const verbId of network.edgeTypes.verbInfinitive) {
  generateCrossProductPhrases(L022, verbId);
}
console.log(`  NEW LEGOs: ${L022} "we want to/我们想", ${L023} "meet/见面"`);

// SEED 19: "But I don't want to stop talking."
console.log('\n--- SEED 19: I don\'t want to ---');
const L024 = addLego("I don't want to", '我不想', 'subjectSlot');
const L025 = addLego('stop', '停止', 'verbInfinitive');
for (const verbId of network.edgeTypes.verbInfinitive) {
  generateCrossProductPhrases(L024, verbId);
}
console.log(`  NEW LEGOs: ${L024} "I don't want to/我不想", ${L025} "stop/停止"`);

// SEED 20: "You want to learn his name quickly."
console.log('\n--- SEED 20: You want to ---');
const L026 = addLego('you want to', '你想', 'subjectSlot');
for (const verbId of network.edgeTypes.verbInfinitive) {
  generateCrossProductPhrases(L026, verbId);
}
console.log(`  NEW LEGO: ${L026} "you want to/你想"`);

// ============================================================
// FINAL SUMMARY
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('NETWORK SUMMARY (First 20 Seeds)');
console.log('='.repeat(70));
console.log(`Total LEGOs: ${network.legos.length}`);
console.log(`Total Phrases: ${network.phrases.length}`);
console.log(`\nEdge Types:`);
console.log(`  Subject slots: ${network.edgeTypes.subjectSlot.length}`);
console.log(`  Verbs: ${network.edgeTypes.verbInfinitive.length}`);
console.log(`  Objects: ${network.edgeTypes.objectSlot.length}`);
console.log(`  Question words: ${network.edgeTypes.questionWord.length}`);

// Calculate theoretical max phrases
const maxPhrases =
  network.edgeTypes.subjectSlot.length * network.edgeTypes.verbInfinitive.length +
  network.edgeTypes.subjectSlot.length * network.edgeTypes.verbInfinitive.length * network.edgeTypes.objectSlot.length;
console.log(`\nTheoretical max SV + SVO phrases: ~${maxPhrases}`);
console.log(`Actual phrases generated: ${network.phrases.length}`);

// Output in player format
const output = {
  course_code: 'zho_for_eng',
  legos: network.legos,
  phrases: network.phrases.map(p => ({
    knownText: p.knownText,
    targetText: p.targetText,
    legos: p.legos
  }))
};

fs.writeFileSync(
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/zho_260_output.json',
  JSON.stringify(output, null, 2)
);

console.log('\n\nOutput written to: scripts/zho_260_output.json');
console.log('\nSample phrases:');
network.phrases.slice(0, 20).forEach(p => {
  console.log(`  "${p.knownText}" → "${p.targetText}"`);
});
