/**
 * Chinese Course v2 - Word Order Aware LEGO Network
 *
 * KEY INSIGHT: Chinese word order differs from English:
 * - English: S + V + O + Adv (I want to speak Chinese now)
 * - Chinese: S + Adv + V + O (我想现在说中文)
 *
 * SOLUTION: Each LEGO has a "slot" type that determines position in Chinese.
 * Phrases are built with correct word order for BOTH languages.
 */

const fs = require('fs');

// LEGO Registry
const legos = [];
const phrases = [];
const registry = {};
let counter = 0;

// Slot types for Chinese word order
const SLOTS = {
  SUBJECT: 'subject',      // I, you, he, she, we, they
  MODAL: 'modal',          // want to, trying to, going to
  TIME: 'time',            // now, today, tomorrow
  MANNER: 'manner',        // as hard as I can, carefully
  PREP: 'prep',            // with you, with someone
  VERB: 'verb',            // speak, learn, try
  OBJECT: 'object',        // Chinese, a word, something
  SENTENCE: 'sentence'     // Complete standalone expression
};

function addLego(knownText, targetText, slot, canFollow = []) {
  // Check if already exists
  if (registry[knownText]) {
    return registry[knownText].legoId;
  }

  counter++;
  const legoId = `L${String(counter).padStart(3, '0')}`;

  const lego = {
    legoId,
    knownText,
    targetText,
    slot,
    canFollow,
    introducedAt: counter
  };

  legos.push(lego);
  registry[knownText] = lego;

  console.log(`${legoId}: "${knownText}" → "${targetText}" [${slot}]`);
  return legoId;
}

/**
 * Build a phrase from LEGO IDs with correct word order for both languages
 */
function buildPhrase(legoIds) {
  const legoObjs = legoIds.map(id => legos.find(l => l.legoId === id));
  if (legoObjs.some(l => !l)) return null;

  // English: just concatenate in order
  const knownText = legoObjs.map(l => l.knownText).join(' ');

  // Chinese: reorder based on slot
  const slotOrder = [SLOTS.SUBJECT, SLOTS.MODAL, SLOTS.TIME, SLOTS.MANNER, SLOTS.PREP, SLOTS.VERB, SLOTS.OBJECT, SLOTS.SENTENCE];

  const sorted = [...legoObjs].sort((a, b) => {
    const aIdx = slotOrder.indexOf(a.slot);
    const bIdx = slotOrder.indexOf(b.slot);
    return aIdx - bIdx;
  });

  const targetText = sorted.map(l => l.targetText).join('');

  return { knownText, targetText, legos: legoIds, legoCount: legoIds.length };
}

/**
 * Generate all valid phrases from paths through the network
 */
function generatePhrasesFromNetwork() {
  // Clear existing phrases
  phrases.length = 0;
  const seen = new Set();

  // For each LEGO, find all valid paths ending at that LEGO
  for (const lego of legos) {
    findAllPaths(lego.legoId, [lego.legoId], seen);
  }
}

function findAllPaths(legoId, currentPath, seen) {
  const lego = legos.find(l => l.legoId === legoId);
  if (!lego) return;

  // Add current path as phrase
  const key = currentPath.join('→');
  if (!seen.has(key)) {
    seen.add(key);
    const phrase = buildPhrase(currentPath);
    if (phrase) {
      phrases.push(phrase);
    }
  }

  // Extend path by finding what this LEGO can follow
  for (const parentId of lego.canFollow) {
    const parent = legos.find(l => l.legoId === parentId);
    if (!parent) continue;

    // Avoid cycles
    if (currentPath.includes(parentId)) continue;

    // Recurse with extended path
    findAllPaths(parentId, [parentId, ...currentPath], seen);
  }
}

console.log('='.repeat(70));
console.log('CHINESE COURSE v2 - WORD ORDER AWARE');
console.log('='.repeat(70));
console.log('\n--- Building LEGO Network ---\n');

// ============================================================
// SEED 1: "I want to speak Chinese with you now."
// ============================================================
const L001 = addLego('I want to', '我想', SLOTS.MODAL, []);
const L002 = addLego('speak', '说', SLOTS.VERB, [L001]);
const L003 = addLego('Chinese', '中文', SLOTS.OBJECT, [L002]);
const L004 = addLego('with you', '和你', SLOTS.PREP, [L002, L003]);
const L005 = addLego('now', '现在', SLOTS.TIME, [L002, L003, L004]);

// ============================================================
// SEED 2: "I'm trying to learn."
// ============================================================
const L006 = addLego("I'm trying to", '我在努力', SLOTS.MODAL, []);
const L007 = addLego('learn', '学', SLOTS.VERB, [L001, L006]);
// L003 "Chinese" can also follow "learn"
legos.find(l => l.legoId === L003).canFollow.push(L007);

// ============================================================
// SEED 3: "how to speak as often as possible"
// ============================================================
const L008 = addLego('how to', '怎么', SLOTS.MODAL, []);
const L009 = addLego('as often as possible', '尽可能经常', SLOTS.MANNER, [L002, L007]);

// ============================================================
// SEED 4: "how to say something in Chinese"
// ============================================================
const L010 = addLego('say', '说', SLOTS.VERB, [L001, L006, L008]);  // say = speak = 说
const L011 = addLego('something', '东西', SLOTS.OBJECT, [L002, L007, L010]);
const L012 = addLego('in Chinese', '用中文', SLOTS.MANNER, [L010, L011]);

// ============================================================
// SEED 5: "I'm going to practise speaking with someone else."
// ============================================================
const L013 = addLego("I'm going to", '我要', SLOTS.MODAL, []);
const L014 = addLego('practise', '练习', SLOTS.VERB, [L001, L006, L013]);
const L015 = addLego('speaking', '说', SLOTS.OBJECT, [L014]); // gerund form
const L016 = addLego('with someone else', '和别人', SLOTS.PREP, [L014, L015]);

// ============================================================
// SEED 6: "I'm trying to remember a word."
// ============================================================
const L017 = addLego('remember', '记住', SLOTS.VERB, [L001, L006, L013]);
const L018 = addLego('a word', '一个词', SLOTS.OBJECT, [L017, L007]);

// ============================================================
// SEED 7: "I want to try as hard as I can today."
// ============================================================
const L019 = addLego('try', '试', SLOTS.VERB, [L001, L006, L013]);
const L020 = addLego('as hard as I can', '尽我所能', SLOTS.MANNER, [L019]);
const L021 = addLego('today', '今天', SLOTS.TIME, [L002, L007, L014, L017, L019]);

// ============================================================
// SEED 8: "I'm going to try to explain what I mean."
// ============================================================
const L022 = addLego('explain', '解释', SLOTS.VERB, [L001, L006, L013, L019]);
const L023 = addLego('what I mean', '我的意思', SLOTS.OBJECT, [L022]);

// ============================================================
// SEED 9: "I speak a little Chinese now."
// ============================================================
const L024 = addLego('I', '我', SLOTS.SUBJECT, []);
const L025 = addLego('a little', '一点', SLOTS.OBJECT, [L002, L007]);
// "I" needs to connect to verbs for simple present
legos.find(l => l.legoId === L002).canFollow.push(L024);
legos.find(l => l.legoId === L007).canFollow.push(L024);

// ============================================================
// SEED 10: "I'm not sure if I can remember the whole sentence."
// ============================================================
const L026 = addLego("I'm not sure", '我不确定', SLOTS.SENTENCE, []);
const L027 = addLego('if I can', '如果我能', SLOTS.MODAL, [L026]);
const L028 = addLego('the whole sentence', '整个句子', SLOTS.OBJECT, [L017]);

// ============================================================
// SEED 11-20: Continue building vocabulary
// ============================================================
const L029 = addLego("I'd like to", '我想要', SLOTS.MODAL, []);
const L030 = addLego('be able to', '能够', SLOTS.VERB, [L001, L006, L013, L029]);
const L031 = addLego('after you finish', '你完成之后', SLOTS.TIME, [L002, L007]);

const L032 = addLego("I wouldn't like to", '我不想', SLOTS.MODAL, []);
const L033 = addLego('guess', '猜', SLOTS.VERB, [L001, L006, L013, L029, L032]);
const L034 = addLego("what's going to happen", '会发生什么', SLOTS.OBJECT, [L033]);
const L035 = addLego('tomorrow', '明天', SLOTS.TIME, [L002, L007, L014, L019, L033]);

const L036 = addLego('you', '你', SLOTS.SUBJECT, []);
const L037 = addLego('very well', '很好', SLOTS.MANNER, [L002, L007]);
// L002 and L007 can follow "you"
legos.find(l => l.legoId === L002).canFollow.push(L036);
legos.find(l => l.legoId === L007).canFollow.push(L036);

const L038 = addLego('do you', '你', SLOTS.SUBJECT, []);
const L039 = addLego('all day', '一整天', SLOTS.TIME, [L002]);

const L040 = addLego('and', '和', SLOTS.SUBJECT, []);
const L041 = addLego('I want you to', '我想让你', SLOTS.MODAL, [L040]);
const L042 = addLego('with me', '和我', SLOTS.PREP, [L002, L003]);

// ============================================================
// SEED 21-30
// ============================================================
const L043 = addLego('he wants to', '他想', SLOTS.MODAL, []);
const L044 = addLego('come back', '回来', SLOTS.VERB, [L043, L001, L006, L013]);
const L045 = addLego('with everyone else', '和大家', SLOTS.PREP, [L044]);
const L046 = addLego('later on', '稍后', SLOTS.TIME, [L044]);

const L047 = addLego('she wants to', '她想', SLOTS.MODAL, []);
const L048 = addLego('find out', '发现', SLOTS.VERB, [L043, L047, L001, L006, L013]);
const L049 = addLego('what the answer is', '答案是什么', SLOTS.OBJECT, [L048]);

const L050 = addLego('we want to', '我们想', SLOTS.MODAL, []);
const L051 = addLego('meet', '见', SLOTS.VERB, [L043, L047, L050, L001, L006, L013]);
const L052 = addLego('at six o\'clock', '六点', SLOTS.TIME, [L051]);
const L053 = addLego('this evening', '今晚', SLOTS.TIME, [L051]);

const L054 = addLego("but I don't want to", '但我不想', SLOTS.MODAL, []);
const L055 = addLego('stop', '停止', SLOTS.VERB, [L054, L001, L006, L013]);
const L056 = addLego('talking', '说话', SLOTS.OBJECT, [L055]);

// ============================================================
// SEED 31-40
// ============================================================
const L057 = addLego('you want to', '你想', SLOTS.MODAL, []);
const L058 = addLego('his name', '他的名字', SLOTS.OBJECT, [L007, L017]);
const L059 = addLego('quickly', '快', SLOTS.MANNER, [L007, L017]);

const L060 = addLego('why are you', '你为什么', SLOTS.MODAL, []);
const L061 = addLego('learning', '在学', SLOTS.VERB, [L060]);
const L062 = addLego('her name', '她的名字', SLOTS.OBJECT, [L007, L017, L061]);

const L063 = addLego('because', '因为', SLOTS.SUBJECT, []);
const L064 = addLego('people', '人', SLOTS.OBJECT, [L051]);
const L065 = addLego('who speak Chinese', '说中文的', SLOTS.OBJECT, [L051]);

const L066 = addLego('start', '开始', SLOTS.VERB, [L001, L006, L013]);
const L067 = addLego('talking more', '说更多', SLOTS.OBJECT, [L066]);
const L068 = addLego('soon', '很快', SLOTS.TIME, [L066, L044]);

// ============================================================
// SEED 41-50
// ============================================================
const L069 = addLego("I'm not going to", '我不会', SLOTS.MODAL, []);
const L070 = addLego('easily', '容易地', SLOTS.MANNER, [L017]);

const L071 = addLego('are you going to', '你要', SLOTS.MODAL, []);
const L072 = addLego('help', '帮助', SLOTS.VERB, [L071, L001, L006, L013]);
const L073 = addLego('me', '我', SLOTS.OBJECT, [L072]);
const L074 = addLego('before I have to go', '在我必须走之前', SLOTS.TIME, [L072]);

const L075 = addLego('I like', '我喜欢', SLOTS.MODAL, []);
const L076 = addLego('feeling', '感觉', SLOTS.VERB, [L075]);
const L077 = addLego('as if', '好像', SLOTS.PREP, [L076]);
const L078 = addLego("I'm nearly ready to go", '我快准备好走了', SLOTS.OBJECT, [L076, L077]);

const L079 = addLego("I don't like", '我不喜欢', SLOTS.MODAL, []);
const L080 = addLego('taking', '花', SLOTS.VERB, [L079, L075]);
const L081 = addLego('too much time', '太多时间', SLOTS.OBJECT, [L080]);
const L082 = addLego('to answer', '来回答', SLOTS.OBJECT, [L081]);

// ============================================================
// SEED 51-60
// ============================================================
const L083 = addLego("it's useful to", '有用', SLOTS.SENTENCE, []);
const L084 = addLego('as soon as you can', '尽快', SLOTS.TIME, [L066, L002]);

const L085 = addLego("I'm looking forward to", '我期待', SLOTS.MODAL, []);
const L086 = addLego('speaking better', '说得更好', SLOTS.OBJECT, [L085]);
const L087 = addLego('as soon as I can', '尽快', SLOTS.TIME, [L085]);

const L088 = addLego('I wanted to', '我想要', SLOTS.MODAL, []);
const L089 = addLego('ask', '问', SLOTS.VERB, [L088, L001, L006, L013]);
const L090 = addLego('you something', '你一些事情', SLOTS.OBJECT, [L089]);
const L091 = addLego('yesterday', '昨天', SLOTS.TIME, [L089]);

const L092 = addLego('you wanted to', '你想要', SLOTS.MODAL, []);
const L093 = addLego('with me', '和我', SLOTS.PREP, [L002]);
const L094 = addLego('tonight', '今晚', SLOTS.TIME, [L002]);

const L095 = addLego('did you want to', '你想要', SLOTS.MODAL, []);
const L096 = addLego('show', '展示', SLOTS.VERB, [L095, L088, L001, L006, L013]);
const L097 = addLego('me something', '给我看东西', SLOTS.OBJECT, [L096]);

// Generate all phrases
console.log('\n--- Generating Phrases ---\n');
generatePhrasesFromNetwork();

// ============================================================
// OUTPUT
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('COURSE SUMMARY');
console.log('='.repeat(70));
console.log(`\nTotal LEGOs: ${legos.length}`);
console.log(`Total Phrases: ${phrases.length}`);
console.log(`Phrases per LEGO: ${(phrases.length / legos.length).toFixed(1)}`);

// Show phrase examples with correct word order
console.log('\n--- Sample Phrases (English → Chinese with correct order) ---');
phrases.slice(0, 30).forEach((p, i) => {
  console.log(`${i + 1}. "${p.knownText}" → "${p.targetText}"`);
});

// Check Chinese word order in longer phrases
console.log('\n--- Longer Phrases (checking word order) ---');
phrases.filter(p => p.legoCount >= 3).slice(0, 15).forEach((p, i) => {
  console.log(`${i + 1}. [${p.legoCount}] "${p.knownText}" → "${p.targetText}"`);
});

// Output JSON
const output = {
  course_code: 'zho_for_eng',
  version: '2.0.0',
  generated: new Date().toISOString(),
  stats: {
    legos: legos.length,
    phrases: phrases.length,
    phrasesPerLego: (phrases.length / legos.length).toFixed(1)
  },
  legos: legos.map(l => ({
    legoId: l.legoId,
    knownText: l.knownText,
    targetText: l.targetText,
    slot: l.slot
  })),
  phrases: phrases.map(p => ({
    knownText: p.knownText,
    targetText: p.targetText,
    legos: p.legos,
    legoCount: p.legoCount
  }))
};

fs.writeFileSync(
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/zho_course_v2.json',
  JSON.stringify(output, null, 2)
);

console.log('\n\nOutput: scripts/zho_course_v2.json');
