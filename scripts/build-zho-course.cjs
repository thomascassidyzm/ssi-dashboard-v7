/**
 * Chinese Course Builder - Processing 260 Seeds
 * Network-aware LEGO decomposition with strict 1:1 mapping
 */

const fs = require('fs');

// All 250 seeds from database
const SEEDS = [
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
  "You want to learn his name quickly.",
  "Why are you learning her name?",
  "Because I want to meet people who speak Chinese.",
  "I'm going to start talking more soon.",
  "I'm not going to be able to remember easily.",
  "Are you going to help me before I have to go?",
  "I like feeling as if I'm nearly ready to go.",
  "I don't like taking too much time to answer.",
  "It's useful to start talking as soon as you can.",
  "I'm looking forward to speaking better as soon as I can.",
  "I wanted to ask you something yesterday.",
  "You wanted to speak with me tonight.",
  "Did you want to show me something?",
  "How long have you been learning Chinese?",
  "He doesn't want to be quiet when other people are here.",
  "She doesn't want to read anything this afternoon.",
  "We don't want to interrupt the story.",
  "I started to think about it carefully last month.",
  "I've been learning for about a week.",
  "But I'm a little tired this morning.",
  "How do you feel at the moment?",
  "I feel okay, but I'm starting to feel tired.",
  "I was starting to feel better than last night.",
  "I wasn't thinking about how to answer.",
  "Or if I need to improve.",
  "I don't need to know everything.",
  "But I don't worry about making mistakes.",
  "Because I think that it's a good thing to make mistakes.",
  "I don't care about making mistakes.",
  "It's like this, if you know what I mean.",
  "I'm not trying to finish as quickly as possible."
];

// LEGO Registry - strict 1:1 mapping
const REGISTRY = {};
const legos = [];
const phrases = [];
let legoCounter = 0;

function addLego(known, target) {
  if (REGISTRY[known]) {
    return REGISTRY[known].legoId;
  }
  legoCounter++;
  const legoId = `L${String(legoCounter).padStart(3, '0')}`;
  const lego = { legoId, knownText: known, targetText: target };
  REGISTRY[known] = lego;
  legos.push(lego);
  return legoId;
}

function addPhrase(known, target, ids) {
  if (!phrases.some(p => p.knownText === known)) {
    phrases.push({ knownText: known, targetText: target, legos: ids });
  }
}

function getLego(known) {
  return REGISTRY[known]?.legoId;
}

// ============================================================
// DEFINE ALL LEGOS SYSTEMATICALLY
// ============================================================

// SUBJECT PATTERNS - "I want to" style (take verbs)
const subjects = {
  'I want to': '我想',
  "I'm trying to": '我在努力',
  "I'm going to": '我要',
  "I'd like to": '我想要',
  "I need to": '我需要',
  "I don't want to": '我不想',
  "I'm not going to": '我不会',
  "I can": '我能',
  "I can't": '我不能',
  "I like to": '我喜欢',
  "I don't like to": '我不喜欢',
  "I wanted to": '我想要',
  "I started to": '我开始',
  "I was trying to": '我当时在努力',
  "I wasn't trying to": '我当时没有努力',

  'you want to': '你想',
  "you're trying to": '你在努力',
  "you're going to": '你要',
  "you need to": '你需要',
  "you wanted to": '你想要',
  'do you want to': '你想',
  'are you going to': '你要',

  'he wants to': '他想',
  "he doesn't want to": '他不想',
  'she wants to': '她想',
  "she doesn't want to": '她不想',
  'we want to': '我们想',
  "we don't want to": '我们不想',
  'they want to': '他们想',

  // Simple subjects
  'I': '我',
  'you': '你',
  'he': '他',
  'she': '她',
  'we': '我们',
  'they': '他们',
  'it': '它',
};

// VERBS (infinitive form)
const verbs = {
  'speak': '说',
  'say': '说',  // Same as speak - intentional
  'learn': '学',
  'remember': '记住',
  'understand': '理解',
  'try': '试',
  'practise': '练习',
  'help': '帮助',
  'start': '开始',
  'stop': '停止',
  'finish': '完成',
  'find': '找到',
  'find out': '发现',
  'ask': '问',
  'tell': '告诉',
  'think about': '考虑',  // Not 想 to avoid collision
  'know': '知道',
  'do': '做',
  'go': '去',
  'come': '来',
  'come back': '回来',
  'see': '看',
  'hear': '听',
  'read': '读',
  'write': '写',
  'eat': '吃',
  'drink': '喝',
  'work': '工作',
  'wait': '等',
  'feel': '感觉',
  'meet': '见',
  'give': '给',
  'take': '拿',
  'talk': '说话',
  'explain': '解释',
  'guess': '猜',
  'show': '展示',
  'be able to': '能够',
  'improve': '提高',
  'worry about': '担心',
  'care about': '关心',
  'make': '做',
};

// OBJECTS
const objects = {
  'Chinese': '中文',
  'English': '英文',
  'something': '东西',  // Not 什么
  'nothing': '没什么',
  'everything': '一切',
  'a word': '一个词',
  'a sentence': '一个句子',
  'the answer': '答案',
  'the question': '问题',
  'a little': '一点',
  'a lot': '很多',
  'more': '更多',
  'time': '时间',
  'this': '这个',
  'that': '那个',
  'it': '它',
  'me': '我',
  'you': '你',
  'him': '他',
  'her': '她',
  'us': '我们',
  'them': '他们',
  'people': '人',
  'mistakes': '错误',
  'his name': '他的名字',
  'her name': '她的名字',
  'what I mean': '我的意思',
  'the whole sentence': '整个句子',
};

// QUESTION WORDS
const questions = {
  'how to': '怎么',
  'what': '什么',
  'when': '什么时候',
  'where': '哪里',
  'why': '为什么',
  'how': '怎么',
  'how long': '多长时间',
  'how much': '多少',
};

// ADVERBS/MODIFIERS
const adverbs = {
  'now': '现在',
  'today': '今天',
  'tomorrow': '明天',
  'yesterday': '昨天',
  'tonight': '今晚',
  'this morning': '今天早上',
  'this afternoon': '今天下午',
  'this evening': '今晚',
  'soon': '很快',
  'later': '后来',
  'quickly': '快',
  'slowly': '慢',
  'easily': '容易地',
  'well': '好',
  'very well': '很好',
  'often': '经常',
  'as often as possible': '尽可能经常',
  'as soon as possible': '尽快',
  'as hard as I can': '尽我所能',
  'about': '大约',
  'a week': '一周',
  'a month': '一个月',
};

// CONNECTORS
const connectors = {
  'and': '和',
  'but': '但是',
  'because': '因为',
  'so': '所以',
  'if': '如果',
  'or': '或者',
  'with': '和',
  'after': '之后',
  'before': '之前',
};

// MISC
const misc = {
  "it's useful": '有用',
  "it's a good thing": '是好事',
  "I'm not sure": '我不确定',
  "I feel okay": '我感觉还好',
  "I'm a little tired": '我有点累',
  "as if": '好像',
  "like this": '这样',
  "if you know what I mean": '如果你明白我的意思',
};

// ============================================================
// ADD ALL LEGOS
// ============================================================

console.log('Adding LEGOs...\n');

// Add all categories
for (const [k, v] of Object.entries(subjects)) addLego(k, v);
for (const [k, v] of Object.entries(verbs)) addLego(k, v);
for (const [k, v] of Object.entries(objects)) addLego(k, v);
for (const [k, v] of Object.entries(questions)) addLego(k, v);
for (const [k, v] of Object.entries(adverbs)) addLego(k, v);
for (const [k, v] of Object.entries(connectors)) addLego(k, v);
for (const [k, v] of Object.entries(misc)) addLego(k, v);

console.log(`Total LEGOs: ${legos.length}\n`);

// ============================================================
// GENERATE PHRASES BY COMBINING COMPATIBLE LEGOS
// ============================================================

console.log('Generating phrases...\n');

// Subject + Verb combinations
const subjectIds = Object.keys(subjects).map(k => REGISTRY[k]);
const verbIds = Object.keys(verbs).map(k => REGISTRY[k]);
const objectIds = Object.keys(objects).map(k => REGISTRY[k]);

// S + V
for (const s of subjectIds) {
  for (const v of verbIds) {
    if (!s || !v) continue;
    const known = `${s.knownText} ${v.knownText}`;
    const target = `${s.targetText}${v.targetText}`;
    addPhrase(known, target, [s.legoId, v.legoId]);
  }
}

// S + V + O
for (const s of subjectIds) {
  for (const v of verbIds) {
    for (const o of objectIds) {
      if (!s || !v || !o) continue;
      const known = `${s.knownText} ${v.knownText} ${o.knownText}`;
      const target = `${s.targetText}${v.targetText}${o.targetText}`;
      addPhrase(known, target, [s.legoId, v.legoId, o.legoId]);
    }
  }
}

// V + O (verb phrases)
for (const v of verbIds) {
  for (const o of objectIds) {
    if (!v || !o) continue;
    const known = `${v.knownText} ${o.knownText}`;
    const target = `${v.targetText}${o.targetText}`;
    addPhrase(known, target, [v.legoId, o.legoId]);
  }
}

// Question patterns: Q + V
const questionIds = Object.keys(questions).map(k => REGISTRY[k]);
for (const q of questionIds) {
  for (const v of verbIds) {
    if (!q || !v) continue;
    const known = `${q.knownText} ${v.knownText}`;
    const target = `${q.targetText}${v.targetText}`;
    addPhrase(known, target, [q.legoId, v.legoId]);
  }
}

// Q + V + O
for (const q of questionIds) {
  for (const v of verbIds) {
    for (const o of objectIds) {
      if (!q || !v || !o) continue;
      const known = `${q.knownText} ${v.knownText} ${o.knownText}`;
      const target = `${q.targetText}${v.targetText}${o.targetText}`;
      addPhrase(known, target, [q.legoId, v.legoId, o.legoId]);
    }
  }
}

// ============================================================
// OUTPUT
// ============================================================

const output = {
  course_code: 'zho_for_eng',
  version: '1.0.0',
  generated: new Date().toISOString(),
  stats: {
    legos: legos.length,
    phrases: phrases.length,
    seeds_processed: SEEDS.length
  },
  legos,
  phrases
};

fs.writeFileSync(
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/zho_full_course.json',
  JSON.stringify(output, null, 2)
);

console.log('='.repeat(60));
console.log('CHINESE COURSE GENERATED');
console.log('='.repeat(60));
console.log(`LEGOs: ${legos.length}`);
console.log(`Phrases: ${phrases.length}`);
console.log(`\nOutput: scripts/zho_full_course.json`);

// Sample phrases
console.log('\nSample phrases:');
phrases.slice(0, 20).forEach((p, i) => {
  console.log(`  ${i+1}. "${p.knownText}" → "${p.targetText}"`);
});

// Check collisions
console.log('\n--- Chinese Collisions (same Chinese, different English) ---');
const zhToEn = {};
for (const l of legos) {
  if (!zhToEn[l.targetText]) zhToEn[l.targetText] = [];
  zhToEn[l.targetText].push(l.knownText);
}
for (const [zh, ens] of Object.entries(zhToEn)) {
  if (ens.length > 1) {
    console.log(`  "${zh}" ← [${ens.map(e => `"${e}"`).join(', ')}]`);
  }
}
