/**
 * Chinese Course: STRICT Network-Aware LEGO Decomposition
 *
 * HARD CONSTRAINT: English LEGO → Chinese target is 1:1
 * - Same English = Same Chinese (reuse LEGO)
 * - Need different Chinese? Make English chunk bigger/more specific
 * - NEVER have "speak" mean both 说 and 讲
 */

const fs = require('fs');

// The canonical LEGO registry - English → Chinese mapping
// Once set, NEVER changes
const LEGO_REGISTRY = {};

const network = {
  legos: [],
  phrases: [],
  edgeTypes: {
    subjectSlot: [],
    verbInfinitive: [],
    objectSlot: [],
    adverbSlot: [],
    questionWord: [],
    connector: [],
  }
};

let legoCounter = 0;

/**
 * Add or retrieve a LEGO
 * STRICT: If English exists, returns existing (ignores targetText param)
 * STRICT: If English is new, registers the mapping permanently
 */
function lego(knownText, targetText, edgeType) {
  // Check if this English already exists
  if (LEGO_REGISTRY[knownText]) {
    const existing = LEGO_REGISTRY[knownText];
    // Verify we're not trying to map to different Chinese
    if (existing.targetText !== targetText) {
      console.error(`\n!!! CONFLICT: "${knownText}" already maps to "${existing.targetText}", cannot remap to "${targetText}"`);
      console.error(`    Solution: Make English more specific to differentiate\n`);
      process.exit(1);
    }
    return existing.legoId;
  }

  // New LEGO - register it
  legoCounter++;
  const legoId = `L${String(legoCounter).padStart(3, '0')}`;

  const legoObj = { legoId, knownText, targetText };
  LEGO_REGISTRY[knownText] = legoObj;
  network.legos.push(legoObj);

  if (edgeType && network.edgeTypes[edgeType]) {
    network.edgeTypes[edgeType].push(legoId);
  }

  console.log(`  + ${legoId}: "${knownText}" → "${targetText}"`);
  return legoId;
}

/**
 * Check if English LEGO exists
 */
function hasLego(knownText) {
  return !!LEGO_REGISTRY[knownText];
}

/**
 * Get existing LEGO ID by English text
 */
function getLego(knownText) {
  return LEGO_REGISTRY[knownText]?.legoId;
}

/**
 * Add phrase (deduped)
 */
function phrase(knownText, targetText, legoIds) {
  if (!network.phrases.some(p => p.knownText === knownText)) {
    network.phrases.push({ knownText, targetText, legos: legoIds });
  }
}

/**
 * Generate SV and SVO phrases from compatible LEGOs
 */
function connectSubjectVerb(subjectId, verbId, objectId = null) {
  const s = network.legos.find(l => l.legoId === subjectId);
  const v = network.legos.find(l => l.legoId === verbId);
  const o = objectId ? network.legos.find(l => l.legoId === objectId) : null;

  if (!s || !v) return;

  // S + V
  phrase(`${s.knownText} ${v.knownText}`, `${s.targetText}${v.targetText}`, [subjectId, verbId]);

  if (o) {
    // S + V + O
    phrase(`${s.knownText} ${v.knownText} ${o.knownText}`, `${s.targetText}${v.targetText}${o.targetText}`, [subjectId, verbId, objectId]);
    // V + O
    phrase(`${v.knownText} ${o.knownText}`, `${v.targetText}${o.targetText}`, [verbId, objectId]);
  }
}

/**
 * Connect a new verb to ALL existing subjects, and to ALL existing objects
 */
function connectVerbToNetwork(verbId) {
  for (const subjectId of network.edgeTypes.subjectSlot) {
    connectSubjectVerb(subjectId, verbId);
    for (const objectId of network.edgeTypes.objectSlot) {
      connectSubjectVerb(subjectId, verbId, objectId);
    }
  }
}

/**
 * Connect a new subject to ALL existing verbs
 */
function connectSubjectToNetwork(subjectId) {
  for (const verbId of network.edgeTypes.verbInfinitive) {
    connectSubjectVerb(subjectId, verbId);
    for (const objectId of network.edgeTypes.objectSlot) {
      connectSubjectVerb(subjectId, verbId, objectId);
    }
  }
}

/**
 * Connect a new object to ALL existing subject-verb combinations
 */
function connectObjectToNetwork(objectId) {
  for (const subjectId of network.edgeTypes.subjectSlot) {
    for (const verbId of network.edgeTypes.verbInfinitive) {
      connectSubjectVerb(subjectId, verbId, objectId);
    }
  }
}

console.log('='.repeat(70));
console.log('CHINESE COURSE: STRICT 1:1 LEGO MAPPING');
console.log('='.repeat(70));
console.log('\nBuilding network from seeds...\n');

// ============================================================
// FOUNDATION: Core patterns from first ~50 seeds
// ============================================================

// --- SUBJECT SLOTS (I X to, You X to, He X to, etc.) ---
console.log('--- Subject Slots ---');
lego('I want to', '我想', 'subjectSlot');
lego("I'm trying to", '我在努力', 'subjectSlot');
lego("I'm going to", '我要', 'subjectSlot');
lego("I'd like to", '我想要', 'subjectSlot');
lego("I need to", '我需要', 'subjectSlot');
lego("I don't want to", '我不想', 'subjectSlot');
lego("I can't", '我不能', 'subjectSlot');
lego("I can", '我能', 'subjectSlot');

lego('you want to', '你想', 'subjectSlot');
lego("you're trying to", '你在努力', 'subjectSlot');
lego("you're going to", '你要', 'subjectSlot');
lego("you need to", '你需要', 'subjectSlot');
lego("you don't want to", '你不想', 'subjectSlot');

lego('he wants to', '他想', 'subjectSlot');
lego('she wants to', '她想', 'subjectSlot');
lego('we want to', '我们想', 'subjectSlot');
lego('they want to', '他们想', 'subjectSlot');

lego("he doesn't want to", '他不想', 'subjectSlot');
lego("she doesn't want to", '她不想', 'subjectSlot');
lego("we don't want to", '我们不想', 'subjectSlot');

// Simple subjects (without modal)
lego('I', '我', 'subjectSlot');
lego('you', '你', 'subjectSlot');
lego('he', '他', 'subjectSlot');
lego('she', '她', 'subjectSlot');
lego('we', '我们', 'subjectSlot');
lego('they', '他们', 'subjectSlot');

// --- VERBS (infinitive form in English) ---
console.log('\n--- Verbs ---');
lego('speak', '说', 'verbInfinitive');
lego('learn', '学', 'verbInfinitive');
lego('remember', '记住', 'verbInfinitive');
lego('understand', '理解', 'verbInfinitive');
lego('try', '试', 'verbInfinitive');
lego('practise', '练习', 'verbInfinitive');
lego('help', '帮助', 'verbInfinitive');
lego('start', '开始', 'verbInfinitive');
lego('stop', '停止', 'verbInfinitive');
lego('finish', '完成', 'verbInfinitive');
lego('find', '找到', 'verbInfinitive');
lego('ask', '问', 'verbInfinitive');
lego('tell', '告诉', 'verbInfinitive');
// NOTE: "say" and "speak" both map to 说 in Chinese - that's fine, same meaning
lego('say', '说', 'verbInfinitive');
// NOTE: Using "think about" not "think" to avoid 我想想 collision
lego('think about', '考虑', 'verbInfinitive');
lego('know', '知道', 'verbInfinitive');
lego('do', '做', 'verbInfinitive');
lego('go', '去', 'verbInfinitive');
lego('come', '来', 'verbInfinitive');
lego('see', '看', 'verbInfinitive');
lego('hear', '听', 'verbInfinitive');
lego('read', '读', 'verbInfinitive');
lego('write', '写', 'verbInfinitive');
lego('eat', '吃', 'verbInfinitive');
lego('drink', '喝', 'verbInfinitive');
lego('work', '工作', 'verbInfinitive');
lego('wait', '等', 'verbInfinitive');
lego('feel', '感觉', 'verbInfinitive');
lego('meet', '见', 'verbInfinitive');
lego('give', '给', 'verbInfinitive');

// --- OBJECTS ---
console.log('\n--- Objects ---');
lego('Chinese', '中文', 'objectSlot');
lego('English', '英文', 'objectSlot');
// NOTE: "something" uses 东西, freeing 什么 for question words
lego('something', '东西', 'objectSlot');
lego('nothing', '没什么', 'objectSlot');
lego('everything', '一切', 'objectSlot');
lego('a word', '一个词', 'objectSlot');
lego('a sentence', '一个句子', 'objectSlot');
lego('the answer', '答案', 'objectSlot');
lego('the question', '问题', 'objectSlot');
lego('a little', '一点', 'objectSlot');
lego('a lot', '很多', 'objectSlot');
lego('more', '更多', 'objectSlot');
lego('time', '时间', 'objectSlot');
lego('it', '它', 'objectSlot');
lego('this', '这个', 'objectSlot');
lego('that', '那个', 'objectSlot');

// --- QUESTION PATTERNS ---
console.log('\n--- Question Patterns ---');
lego('how to', '怎么', 'questionWord');
lego('what to', '什么', 'questionWord');
lego('when to', '什么时候', 'questionWord');
lego('where to', '哪里', 'questionWord');
lego('why', '为什么', 'questionWord');

// --- CONNECTORS ---
console.log('\n--- Connectors ---');
lego('and', '和', 'connector');
lego('but', '但是', 'connector');
lego('because', '因为', 'connector');
lego('so', '所以', 'connector');
lego('if', '如果', 'connector');

// ============================================================
// GENERATE ALL CROSS-PRODUCT PHRASES
// ============================================================
console.log('\n--- Generating Phrases ---');

// Connect all subjects to all verbs
for (const subjectId of network.edgeTypes.subjectSlot) {
  for (const verbId of network.edgeTypes.verbInfinitive) {
    connectSubjectVerb(subjectId, verbId);
  }
}

// Connect all subjects to all verbs to all objects
for (const subjectId of network.edgeTypes.subjectSlot) {
  for (const verbId of network.edgeTypes.verbInfinitive) {
    for (const objectId of network.edgeTypes.objectSlot) {
      connectSubjectVerb(subjectId, verbId, objectId);
    }
  }
}

// Question patterns + verbs
for (const qId of network.edgeTypes.questionWord) {
  for (const verbId of network.edgeTypes.verbInfinitive) {
    const q = network.legos.find(l => l.legoId === qId);
    const v = network.legos.find(l => l.legoId === verbId);
    phrase(`${q.knownText} ${v.knownText}`, `${q.targetText}${v.targetText}`, [qId, verbId]);

    for (const objectId of network.edgeTypes.objectSlot) {
      const o = network.legos.find(l => l.legoId === objectId);
      phrase(`${q.knownText} ${v.knownText} ${o.knownText}`, `${q.targetText}${v.targetText}${o.targetText}`, [qId, verbId, objectId]);
    }
  }
}

// ============================================================
// SUMMARY
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('NETWORK SUMMARY');
console.log('='.repeat(70));
console.log(`\nTotal LEGOs: ${network.legos.length}`);
console.log(`Total Phrases: ${network.phrases.length}`);
console.log(`\nBreakdown:`);
console.log(`  Subject slots: ${network.edgeTypes.subjectSlot.length}`);
console.log(`  Verbs: ${network.edgeTypes.verbInfinitive.length}`);
console.log(`  Objects: ${network.edgeTypes.objectSlot.length}`);
console.log(`  Question words: ${network.edgeTypes.questionWord.length}`);
console.log(`  Connectors: ${network.edgeTypes.connector.length}`);

const svCount = network.edgeTypes.subjectSlot.length * network.edgeTypes.verbInfinitive.length;
const svoCount = network.edgeTypes.subjectSlot.length * network.edgeTypes.verbInfinitive.length * network.edgeTypes.objectSlot.length;
const qvCount = network.edgeTypes.questionWord.length * network.edgeTypes.verbInfinitive.length;
const qvoCount = network.edgeTypes.questionWord.length * network.edgeTypes.verbInfinitive.length * network.edgeTypes.objectSlot.length;

console.log(`\nPhrase combinations:`);
console.log(`  S+V: ${svCount}`);
console.log(`  S+V+O: ${svoCount}`);
console.log(`  Q+V: ${qvCount}`);
console.log(`  Q+V+O: ${qvoCount}`);
console.log(`  Total theoretical: ${svCount + svoCount + qvCount + qvoCount}`);

// Output
const output = {
  course_code: 'zho_for_eng',
  version: '1.0.0',
  generated: new Date().toISOString(),
  stats: {
    legos: network.legos.length,
    phrases: network.phrases.length,
    subjectSlots: network.edgeTypes.subjectSlot.length,
    verbs: network.edgeTypes.verbInfinitive.length,
    objects: network.edgeTypes.objectSlot.length
  },
  legos: network.legos,
  phrases: network.phrases
};

fs.writeFileSync(
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/zho_strict_output.json',
  JSON.stringify(output, null, 2)
);

console.log('\n\nOutput: scripts/zho_strict_output.json');

// Sample phrases
console.log('\nSample phrases (first 30):');
network.phrases.slice(0, 30).forEach((p, i) => {
  console.log(`  ${i+1}. "${p.knownText}" → "${p.targetText}"`);
});

// Check for any same-Chinese different-English issues
console.log('\n--- Checking for Chinese collisions ---');
const chineseToEnglish = {};
for (const [eng, lego] of Object.entries(LEGO_REGISTRY)) {
  if (!chineseToEnglish[lego.targetText]) {
    chineseToEnglish[lego.targetText] = [];
  }
  chineseToEnglish[lego.targetText].push(eng);
}

for (const [chinese, englishList] of Object.entries(chineseToEnglish)) {
  if (englishList.length > 1) {
    console.log(`  "${chinese}" ← [${englishList.map(e => `"${e}"`).join(', ')}]`);
  }
}
