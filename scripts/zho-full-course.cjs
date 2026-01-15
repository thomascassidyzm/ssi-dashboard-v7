/**
 * Chinese Full Course - 250 Seeds Processing
 *
 * Word order aware LEGO network for Chinese (Mandarin)
 * Processes all 250 seeds from spa_for_eng database
 */

const fs = require('fs');

// LEGO Registry
const legos = [];
const phrases = [];
const registry = {};
let counter = 0;

// Slot types for Chinese word order
// Chinese: Subject + Time + Manner + Prep + Verb + Object
const SLOTS = {
  SUBJECT: 'subject',
  MODAL: 'modal',
  TIME: 'time',
  MANNER: 'manner',
  PREP: 'prep',
  VERB: 'verb',
  OBJECT: 'object',
  SENTENCE: 'sentence'
};

function addLego(knownText, targetText, slot, canFollow = []) {
  if (registry[knownText]) {
    // Already exists - add new connections
    const existing = registry[knownText];
    for (const id of canFollow) {
      if (!existing.canFollow.includes(id)) {
        existing.canFollow.push(id);
      }
    }
    return existing.legoId;
  }

  counter++;
  const legoId = `L${String(counter).padStart(3, '0')}`;

  const lego = {
    legoId,
    knownText,
    targetText,
    slot,
    canFollow: [...canFollow],
    introducedAt: counter
  };

  legos.push(lego);
  registry[knownText] = lego;
  return legoId;
}

function buildPhrase(legoIds) {
  const legoObjs = legoIds.map(id => legos.find(l => l.legoId === id));
  if (legoObjs.some(l => !l)) return null;

  const knownText = legoObjs.map(l => l.knownText).join(' ');

  // Chinese word order
  const slotOrder = [SLOTS.SUBJECT, SLOTS.MODAL, SLOTS.TIME, SLOTS.MANNER, SLOTS.PREP, SLOTS.VERB, SLOTS.OBJECT, SLOTS.SENTENCE];
  const sorted = [...legoObjs].sort((a, b) => {
    return slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot);
  });

  const targetText = sorted.map(l => l.targetText).join('');
  return { knownText, targetText, legos: legoIds, legoCount: legoIds.length };
}

function generatePhrasesFromNetwork() {
  phrases.length = 0;
  const seen = new Set();

  for (const lego of legos) {
    findAllPaths(lego.legoId, [lego.legoId], seen);
  }
}

function findAllPaths(legoId, currentPath, seen, depth = 0) {
  if (depth > 6) return; // Limit phrase length

  const lego = legos.find(l => l.legoId === legoId);
  if (!lego) return;

  const key = currentPath.join('→');
  if (!seen.has(key)) {
    seen.add(key);
    const phrase = buildPhrase(currentPath);
    if (phrase) phrases.push(phrase);
  }

  for (const parentId of lego.canFollow) {
    if (currentPath.includes(parentId)) continue;
    findAllPaths(parentId, [parentId, ...currentPath], seen, depth + 1);
  }
}

console.log('='.repeat(70));
console.log('CHINESE COURSE - FULL 250 SEEDS');
console.log('='.repeat(70));

// ============================================================
// FOUNDATION: Modal patterns (I want to, I'm trying to, etc.)
// ============================================================

// Core subject-modal combinations (these are sentence starters)
const L_I_WANT = addLego('I want to', '我想', SLOTS.MODAL, []);
const L_IM_TRYING = addLego("I'm trying to", '我在努力', SLOTS.MODAL, []);
const L_IM_GOING = addLego("I'm going to", '我要', SLOTS.MODAL, []);
const L_ID_LIKE = addLego("I'd like to", '我想要', SLOTS.MODAL, []);
const L_I_NEED = addLego('I need to', '我需要', SLOTS.MODAL, []);
const L_I_DONT_WANT = addLego("I don't want to", '我不想', SLOTS.MODAL, []);
const L_I_CANT = addLego("I can't", '我不能', SLOTS.MODAL, []);
const L_I_CAN = addLego('I can', '我能', SLOTS.MODAL, []);
const L_IM_NOT_GOING = addLego("I'm not going to", '我不会', SLOTS.MODAL, []);
const L_I_LIKE = addLego('I like', '我喜欢', SLOTS.MODAL, []);
const L_I_DONT_LIKE = addLego("I don't like", '我不喜欢', SLOTS.MODAL, []);
const L_I_WANTED = addLego('I wanted to', '我想要', SLOTS.MODAL, []);
const L_I_WASNT = addLego("I wasn't trying to", '我当时没有努力', SLOTS.MODAL, []);
const L_I_SHOULD = addLego('I should', '我应该', SLOTS.MODAL, []);
const L_I_ENJOY = addLego('I enjoy', '我喜欢', SLOTS.MODAL, []);
const L_I_DONT_NEED = addLego("I don't need to", '我不需要', SLOTS.MODAL, []);
const L_I_DONT_KNOW = addLego("I don't know", '我不知道', SLOTS.MODAL, []);
const L_I_KNOW = addLego('I know', '我知道', SLOTS.MODAL, []);
const L_I_THINK = addLego('I think', '我认为', SLOTS.MODAL, []);
const L_IM_SORRY = addLego("I'm sorry", '对不起', SLOTS.MODAL, []);
const L_IM_HAPPY = addLego("I'm happy", '我很高兴', SLOTS.MODAL, []);
const L_IM_SURE = addLego("I'm sure", '我确定', SLOTS.MODAL, []);
const L_IM_NOT_SURE = addLego("I'm not sure", '我不确定', SLOTS.SENTENCE, []);
const L_I_DONT_MIND = addLego("I don't mind", '我不介意', SLOTS.MODAL, []);
const L_I_DONT_CARE = addLego("I don't care", '我不在乎', SLOTS.MODAL, []);
const L_I_AGREE = addLego('I agree', '我同意', SLOTS.MODAL, []);
const L_I_DONT_AGREE = addLego("I don't agree", '我不同意', SLOTS.MODAL, []);
const L_I_BELIEVE = addLego('I believe', '我相信', SLOTS.MODAL, []);
const L_IM_BUSY = addLego("I'm busy", '我很忙', SLOTS.SENTENCE, []);
const L_I_FEEL = addLego('I feel', '我感觉', SLOTS.MODAL, []);
const L_I_FEEL_AS_IF = addLego('I feel as if', '我感觉好像', SLOTS.MODAL, []);
const L_I_DONT_FEEL = addLego("I don't feel as if", '我不觉得', SLOTS.MODAL, []);
const L_IM_LOOKING = addLego("I'm looking forward to", '我期待', SLOTS.MODAL, []);

// You patterns
const L_YOU_WANT = addLego('you want to', '你想', SLOTS.MODAL, []);
const L_YOU_WANTED = addLego('you wanted to', '你想要', SLOTS.MODAL, []);
const L_YOU_NEED = addLego('you need to', '你需要', SLOTS.MODAL, []);
const L_YOURE_GOING = addLego("you're going to", '你要', SLOTS.MODAL, []);
const L_YOURE_TRYING = addLego("you're trying to", '你在努力', SLOTS.MODAL, []);
const L_YOU_DONT_WANT = addLego("you don't want to", '你不想', SLOTS.MODAL, []);
const L_DO_YOU_WANT = addLego('do you want to', '你想', SLOTS.MODAL, []);
const L_DID_YOU_WANT = addLego('did you want to', '你想要', SLOTS.MODAL, []);
const L_ARE_YOU_GOING = addLego('are you going to', '你要', SLOTS.MODAL, []);
const L_YOU_SHOULD = addLego('you should', '你应该', SLOTS.MODAL, []);
const L_YOU_SHOULDNT = addLego("you shouldn't", '你不应该', SLOTS.MODAL, []);
const L_CAN_YOU = addLego('can you', '你能', SLOTS.MODAL, []);
const L_DO_YOU_MIND = addLego('do you mind', '你介意', SLOTS.MODAL, []);

// He/She/We/They patterns
const L_HE_WANTS = addLego('he wants to', '他想', SLOTS.MODAL, []);
const L_HE_DOESNT_WANT = addLego("he doesn't want to", '他不想', SLOTS.MODAL, []);
const L_HE_WANTED = addLego('he wanted to', '他想要', SLOTS.MODAL, []);
const L_HE_DIDNT_WANT = addLego("he didn't want to", '他不想', SLOTS.MODAL, []);
const L_HES_TRYING = addLego("he's trying to", '他在努力', SLOTS.MODAL, []);
const L_HES_GOING = addLego("he's going to", '他要', SLOTS.MODAL, []);
const L_SHE_WANTS = addLego('she wants to', '她想', SLOTS.MODAL, []);
const L_SHE_DOESNT_WANT = addLego("she doesn't want to", '她不想', SLOTS.MODAL, []);
const L_SHE_DIDNT_WANT = addLego("she didn't want to", '她不想', SLOTS.MODAL, []);
const L_WE_WANT = addLego('we want to', '我们想', SLOTS.MODAL, []);
const L_WE_DONT_WANT = addLego("we don't want to", '我们不想', SLOTS.MODAL, []);
const L_WE_WANTED = addLego('we wanted to', '我们想要', SLOTS.MODAL, []);
const L_WE_DIDNT_WANT = addLego("we didn't want to", '我们不想', SLOTS.MODAL, []);
const L_WE_NEED = addLego('we need to', '我们需要', SLOTS.MODAL, []);
const L_WE_DONT_NEED = addLego("we don't need to", '我们不需要', SLOTS.MODAL, []);
const L_THEY_WANT = addLego('they want to', '他们想', SLOTS.MODAL, []);
const L_THEY_THINK = addLego('they think', '他们认为', SLOTS.MODAL, []);
const L_THEY_SAY = addLego('they say', '他们说', SLOTS.MODAL, []);
const L_THEY_TOLD = addLego('they told us', '他们告诉我们', SLOTS.MODAL, []);
const L_NOBODY_WAS = addLego('nobody was sure', '没人确定', SLOTS.SENTENCE, []);

// Simple subjects
const L_I = addLego('I', '我', SLOTS.SUBJECT, []);
const L_YOU = addLego('you', '你', SLOTS.SUBJECT, []);
const L_HE = addLego('he', '他', SLOTS.SUBJECT, []);
const L_SHE = addLego('she', '她', SLOTS.SUBJECT, []);
const L_WE = addLego('we', '我们', SLOTS.SUBJECT, []);
const L_THEY = addLego('they', '他们', SLOTS.SUBJECT, []);

// Question starters
const L_HOW_TO = addLego('how to', '怎么', SLOTS.MODAL, []);
const L_WHAT_TO = addLego('what to', '什么', SLOTS.MODAL, []);
const L_WHEN_TO = addLego('when to', '什么时候', SLOTS.MODAL, []);
const L_WHERE_TO = addLego('where to', '哪里', SLOTS.MODAL, []);
const L_WHY = addLego('why', '为什么', SLOTS.MODAL, []);
const L_WHY_DO_YOU = addLego('why do you want to', '你为什么想', SLOTS.MODAL, []);
const L_WHY_ARE_YOU = addLego('why are you', '你为什么', SLOTS.MODAL, []);
const L_WHY_CANT = addLego("why can't I", '为什么我不能', SLOTS.MODAL, []);
const L_WHAT_DO_YOU = addLego('what do you want', '你想要什么', SLOTS.MODAL, []);
const L_WHAT_ARE_YOU = addLego('what are you', '你在', SLOTS.MODAL, []);
const L_HOW_DO_YOU = addLego('how do you', '你怎么', SLOTS.MODAL, []);
const L_HOW_LONG = addLego('how long', '多长时间', SLOTS.MODAL, []);
const L_WHEN_DID_YOU = addLego('when did you', '你什么时候', SLOTS.MODAL, []);

// ============================================================
// VERBS (infinitive form, connect to modals)
// ============================================================

const MODALS = [L_I_WANT, L_IM_TRYING, L_IM_GOING, L_ID_LIKE, L_I_NEED, L_I_DONT_WANT, L_I_CAN, L_I_CANT, L_IM_NOT_GOING, L_I_LIKE, L_I_DONT_LIKE, L_I_WANTED, L_I_SHOULD, L_I_ENJOY, L_I_DONT_NEED, L_YOU_WANT, L_YOU_WANTED, L_YOU_NEED, L_YOURE_GOING, L_DO_YOU_WANT, L_DID_YOU_WANT, L_ARE_YOU_GOING, L_YOU_SHOULD, L_CAN_YOU, L_HE_WANTS, L_HE_WANTED, L_HES_TRYING, L_HES_GOING, L_SHE_WANTS, L_WE_WANT, L_WE_WANTED, L_WE_NEED, L_THEY_WANT, L_HOW_TO];

const L_SPEAK = addLego('speak', '说', SLOTS.VERB, MODALS);
const L_SAY = addLego('say', '说', SLOTS.VERB, MODALS); // Same as speak
const L_LEARN = addLego('learn', '学', SLOTS.VERB, MODALS);
const L_REMEMBER = addLego('remember', '记住', SLOTS.VERB, MODALS);
const L_UNDERSTAND = addLego('understand', '理解', SLOTS.VERB, MODALS);
const L_TRY = addLego('try', '试', SLOTS.VERB, MODALS);
const L_PRACTISE = addLego('practise', '练习', SLOTS.VERB, MODALS);
const L_HELP = addLego('help', '帮助', SLOTS.VERB, MODALS);
const L_START = addLego('start', '开始', SLOTS.VERB, MODALS);
const L_STOP = addLego('stop', '停止', SLOTS.VERB, MODALS);
const L_FINISH = addLego('finish', '完成', SLOTS.VERB, MODALS);
const L_FIND = addLego('find', '找到', SLOTS.VERB, MODALS);
const L_FIND_OUT = addLego('find out', '发现', SLOTS.VERB, MODALS);
const L_ASK = addLego('ask', '问', SLOTS.VERB, MODALS);
const L_TELL = addLego('tell', '告诉', SLOTS.VERB, MODALS);
const L_KNOW = addLego('know', '知道', SLOTS.VERB, MODALS);
const L_THINK_ABOUT = addLego('think about', '考虑', SLOTS.VERB, MODALS);
const L_DO = addLego('do', '做', SLOTS.VERB, MODALS);
const L_GO = addLego('go', '去', SLOTS.VERB, MODALS);
const L_COME = addLego('come', '来', SLOTS.VERB, MODALS);
const L_COME_BACK = addLego('come back', '回来', SLOTS.VERB, MODALS);
const L_SEE = addLego('see', '看', SLOTS.VERB, MODALS);
const L_HEAR = addLego('hear', '听', SLOTS.VERB, MODALS);
const L_READ = addLego('read', '读', SLOTS.VERB, MODALS);
const L_WRITE = addLego('write', '写', SLOTS.VERB, MODALS);
const L_MEET = addLego('meet', '见', SLOTS.VERB, MODALS);
const L_GIVE = addLego('give', '给', SLOTS.VERB, MODALS);
const L_TAKE = addLego('take', '拿', SLOTS.VERB, MODALS);
const L_WAIT = addLego('wait', '等', SLOTS.VERB, MODALS);
const L_GUESS = addLego('guess', '猜', SLOTS.VERB, MODALS);
const L_EXPLAIN = addLego('explain', '解释', SLOTS.VERB, MODALS);
const L_SHOW = addLego('show', '展示', SLOTS.VERB, MODALS);
const L_IMPROVE = addLego('improve', '提高', SLOTS.VERB, MODALS);
const L_CHANGE = addLego('change', '改变', SLOTS.VERB, MODALS);
const L_WORK = addLego('work', '工作', SLOTS.VERB, MODALS);
const L_TALK = addLego('talk', '说话', SLOTS.VERB, MODALS);
const L_WORRY = addLego('worry about', '担心', SLOTS.VERB, MODALS);
const L_CARE = addLego('care about', '关心', SLOTS.VERB, MODALS);
const L_RELAX = addLego('relax', '放松', SLOTS.VERB, MODALS);
const L_LEAVE = addLego('leave', '离开', SLOTS.VERB, MODALS);
const L_SLEEP = addLego('sleep', '睡觉', SLOTS.VERB, MODALS);
const L_WAKE = addLego('wake up', '醒来', SLOTS.VERB, MODALS);
const L_EAT = addLego('eat', '吃', SLOTS.VERB, MODALS);
const L_WATCH = addLego('watch', '看', SLOTS.VERB, MODALS);
const L_BE_ABLE = addLego('be able to', '能够', SLOTS.VERB, MODALS);
const L_INTERRUPT = addLego('interrupt', '打断', SLOTS.VERB, MODALS);
const L_LOOK_FOR = addLego('look for', '找', SLOTS.VERB, MODALS);
const L_LOOK_AFTER = addLego('look after', '照顾', SLOTS.VERB, MODALS);
const L_KEEP_ON = addLego('keep on', '继续', SLOTS.VERB, MODALS);
const L_TEST = addLego('test', '测试', SLOTS.VERB, MODALS);
const L_DISCUSS = addLego('discuss', '讨论', SLOTS.VERB, MODALS);
const L_SPEND = addLego('spend', '花', SLOTS.VERB, MODALS);
const L_MANAGE = addLego('manage', '管理', SLOTS.VERB, MODALS);
const L_AGREE = addLego('agree', '同意', SLOTS.VERB, MODALS);
const L_HAVE = addLego('have', '有', SLOTS.VERB, MODALS);
const L_FEEL = addLego('feel', '感觉', SLOTS.VERB, MODALS);

// ============================================================
// OBJECTS (things that follow verbs)
// ============================================================

const VERBS = [L_SPEAK, L_SAY, L_LEARN, L_REMEMBER, L_UNDERSTAND, L_PRACTISE, L_HELP, L_START, L_FIND, L_ASK, L_TELL, L_KNOW, L_DO, L_SEE, L_READ, L_WRITE, L_MEET, L_GIVE, L_SHOW, L_WATCH, L_DISCUSS];

const L_CHINESE = addLego('Chinese', '中文', SLOTS.OBJECT, [L_SPEAK, L_SAY, L_LEARN, L_UNDERSTAND, L_PRACTISE]);
const L_SPANISH = addLego('Spanish', '西班牙语', SLOTS.OBJECT, [L_SPEAK, L_SAY, L_LEARN, L_UNDERSTAND]); // For reference to seeds
const L_SOMETHING = addLego('something', '东西', SLOTS.OBJECT, VERBS);
const L_NOTHING = addLego('nothing', '没什么', SLOTS.OBJECT, VERBS);
const L_EVERYTHING = addLego('everything', '一切', SLOTS.OBJECT, [L_KNOW, L_UNDERSTAND, L_REMEMBER]);
const L_A_WORD = addLego('a word', '一个词', SLOTS.OBJECT, [L_REMEMBER, L_LEARN, L_SAY]);
const L_A_SENTENCE = addLego('a sentence', '一个句子', SLOTS.OBJECT, [L_REMEMBER, L_SAY]);
const L_THE_ANSWER = addLego('the answer', '答案', SLOTS.OBJECT, [L_FIND, L_KNOW, L_REMEMBER, L_FIND_OUT]);
const L_THE_QUESTION = addLego('the question', '问题', SLOTS.OBJECT, [L_ASK, L_UNDERSTAND, L_KNOW]);
const L_A_LITTLE = addLego('a little', '一点', SLOTS.OBJECT, [L_SPEAK, L_LEARN, L_UNDERSTAND]);
const L_A_LOT = addLego('a lot', '很多', SLOTS.OBJECT, [L_LEARN, L_DO, L_UNDERSTAND]);
const L_MORE = addLego('more', '更多', SLOTS.OBJECT, [L_LEARN, L_DO, L_SPEAK]);
const L_TIME = addLego('time', '时间', SLOTS.OBJECT, [L_TAKE, L_GIVE, L_SPEND]);
const L_MISTAKES = addLego('mistakes', '错误', SLOTS.OBJECT, [L_WORRY, L_CARE]);
const L_MAKING_MISTAKES = addLego('making mistakes', '犯错', SLOTS.OBJECT, [L_WORRY, L_CARE]);
const L_WHAT_I_MEAN = addLego('what I mean', '我的意思', SLOTS.OBJECT, [L_EXPLAIN, L_UNDERSTAND, L_KNOW]);
const L_THE_WHOLE_SENTENCE = addLego('the whole sentence', '整个句子', SLOTS.OBJECT, [L_REMEMBER]);
const L_HIS_NAME = addLego('his name', '他的名字', SLOTS.OBJECT, [L_LEARN, L_REMEMBER, L_KNOW]);
const L_HER_NAME = addLego('her name', '她的名字', SLOTS.OBJECT, [L_LEARN, L_REMEMBER, L_KNOW]);
const L_MY_NAME = addLego('my name', '我的名字', SLOTS.OBJECT, [L_TELL, L_KNOW]);
const L_PEOPLE = addLego('people', '人', SLOTS.OBJECT, [L_MEET, L_KNOW]);
const L_THE_STORY = addLego('the story', '故事', SLOTS.OBJECT, [L_INTERRUPT, L_TELL, L_READ]);
const L_YOU_OBJ = addLego('you', '你', SLOTS.OBJECT, [L_HELP, L_TELL, L_ASK, L_SHOW, L_MEET, L_SEE]);
const L_ME = addLego('me', '我', SLOTS.OBJECT, [L_HELP, L_TELL, L_ASK, L_SHOW]);
const L_HIM = addLego('him', '他', SLOTS.OBJECT, [L_HELP, L_TELL, L_ASK, L_GIVE]);
const L_HER = addLego('her', '她', SLOTS.OBJECT, [L_HELP, L_TELL, L_ASK, L_GIVE]);
const L_TALKING = addLego('talking', '说话', SLOTS.OBJECT, [L_STOP, L_START, L_KEEP_ON]);
const L_YOURSELF = addLego('yourself', '你自己', SLOTS.OBJECT, [L_ASK, L_TEST]);
const L_A_LETTER = addLego('a letter', '一封信', SLOTS.OBJECT, [L_WRITE, L_READ]);
const L_A_BOOK = addLego('a book', '一本书', SLOTS.OBJECT, [L_READ, L_GIVE]);
const L_THE_FILM = addLego('the film', '电影', SLOTS.OBJECT, [L_WATCH, L_SEE]);
const L_THE_FOOTBALL = addLego('the football', '足球', SLOTS.OBJECT, [L_WATCH]);
const L_TELEVISION = addLego('television', '电视', SLOTS.OBJECT, [L_WATCH]);
const L_THE_PROBLEM = addLego('the problem', '问题', SLOTS.OBJECT, [L_DISCUSS, L_UNDERSTAND]);
const L_MY_KEYS = addLego('my keys', '我的钥匙', SLOTS.OBJECT, [L_FIND, L_LOOK_FOR, L_SEE]);
const L_A_FEW_WORDS = addLego('a few words', '几个词', SLOTS.OBJECT, [L_SAY, L_REMEMBER]);
const L_WHAT_YOU_SAID = addLego('what you said', '你说的', SLOTS.OBJECT, [L_UNDERSTAND, L_REMEMBER, L_AGREE]);
const L_DOING_IT = addLego('doing it', '做这件事', SLOTS.OBJECT, [L_KEEP_ON, L_STOP]);
const L_MY_FRIEND = addLego('my friend', '我的朋友', SLOTS.OBJECT, [L_MEET, L_HELP, L_KNOW, L_SEE]);
const L_YOUR_FRIEND = addLego('your friend', '你的朋友', SLOTS.OBJECT, [L_MEET, L_HELP, L_KNOW]);
const L_WHATS_GOING = addLego("what's going to happen", '会发生什么', SLOTS.OBJECT, [L_GUESS, L_KNOW]);
const L_THAT = addLego('that', '那个', SLOTS.OBJECT, VERBS);
const L_THIS = addLego('this', '这个', SLOTS.OBJECT, VERBS);
const L_IT = addLego('it', '它', SLOTS.OBJECT, VERBS);

// ============================================================
// TIME expressions
// ============================================================

const L_NOW = addLego('now', '现在', SLOTS.TIME, [L_SPEAK, L_LEARN, L_DO]);
const L_TODAY = addLego('today', '今天', SLOTS.TIME, VERBS);
const L_TOMORROW = addLego('tomorrow', '明天', SLOTS.TIME, VERBS);
const L_YESTERDAY = addLego('yesterday', '昨天', SLOTS.TIME, VERBS);
const L_TONIGHT = addLego('tonight', '今晚', SLOTS.TIME, VERBS);
const L_THIS_MORNING = addLego('this morning', '今天早上', SLOTS.TIME, VERBS);
const L_THIS_AFTERNOON = addLego('this afternoon', '今天下午', SLOTS.TIME, VERBS);
const L_THIS_EVENING = addLego('this evening', '今晚', SLOTS.TIME, VERBS);
const L_SOON = addLego('soon', '很快', SLOTS.TIME, VERBS);
const L_LATER = addLego('later on', '稍后', SLOTS.TIME, VERBS);
const L_LAST_WEEK = addLego('last week', '上周', SLOTS.TIME, VERBS);
const L_LAST_MONTH = addLego('last month', '上个月', SLOTS.TIME, VERBS);
const L_LAST_NIGHT = addLego('last night', '昨晚', SLOTS.TIME, VERBS);
const L_NEXT_WEEK = addLego('next week', '下周', SLOTS.TIME, VERBS);
const L_NEXT_MONTH = addLego('next month', '下个月', SLOTS.TIME, VERBS);
const L_NEXT_YEAR = addLego('next year', '明年', SLOTS.TIME, VERBS);
const L_AT_THE_MOMENT = addLego('at the moment', '现在', SLOTS.TIME, VERBS);
const L_FOR_A_WHILE = addLego('for a while', '一会儿', SLOTS.TIME, VERBS);
const L_ABOUT_A_WEEK = addLego('for about a week', '大约一周', SLOTS.TIME, [L_LEARN]);
const L_IN_A_SHORT_TIME = addLego('in a short time', '在短时间内', SLOTS.TIME, VERBS);
const L_ALREADY = addLego('already', '已经', SLOTS.TIME, [L_LEARN, L_DO]);
const L_YET = addLego('yet', '还', SLOTS.TIME, [L_KNOW, L_REMEMBER]);
const L_AT_SIX = addLego("at six o'clock", '六点', SLOTS.TIME, [L_MEET]);
const L_ON_SUNDAY = addLego('on Sunday', '周日', SLOTS.TIME, VERBS);
const L_ON_SATURDAY = addLego('on Saturday night', '周六晚上', SLOTS.TIME, VERBS);
const L_AT_THE_WEEKEND = addLego('at the weekend', '周末', SLOTS.TIME, VERBS);

// ============================================================
// MANNER expressions
// ============================================================

const L_VERY_WELL = addLego('very well', '很好', SLOTS.MANNER, [L_SPEAK, L_LEARN, L_UNDERSTAND, L_DO]);
const L_QUICKLY = addLego('quickly', '快', SLOTS.MANNER, [L_LEARN, L_SPEAK, L_REMEMBER]);
const L_SLOWLY = addLego('slowly', '慢', SLOTS.MANNER, [L_SPEAK, L_SAY]);
const L_MORE_SLOWLY = addLego('more slowly', '更慢', SLOTS.MANNER, [L_SPEAK, L_SAY]);
const L_EASILY = addLego('easily', '容易地', SLOTS.MANNER, [L_REMEMBER, L_UNDERSTAND]);
const L_AS_HARD_AS = addLego('as hard as I can', '尽我所能', SLOTS.MANNER, [L_TRY]);
const L_AS_OFTEN = addLego('as often as possible', '尽可能经常', SLOTS.MANNER, [L_SPEAK, L_PRACTISE]);
const L_AS_SOON = addLego('as soon as possible', '尽快', SLOTS.MANNER, VERBS);
const L_AS_SOON_AS = addLego('as soon as you can', '尽快', SLOTS.MANNER, [L_SPEAK, L_START]);
const L_AS_QUICKLY = addLego('as quickly as possible', '尽可能快', SLOTS.MANNER, [L_FINISH]);
const L_CAREFULLY = addLego('carefully', '仔细地', SLOTS.MANNER, [L_THINK_ABOUT, L_READ]);
const L_BETTER = addLego('better', '更好', SLOTS.MANNER, [L_SPEAK, L_DO, L_FEEL]);
const L_IN_CHINESE = addLego('in Chinese', '用中文', SLOTS.MANNER, [L_SAY, L_SPEAK]);
const L_ON_MY_OWN = addLego('on my own', '我自己', SLOTS.MANNER, [L_MANAGE, L_DO]);

// ============================================================
// PREPOSITIONAL expressions
// ============================================================

const L_WITH_YOU = addLego('with you', '和你', SLOTS.PREP, [L_SPEAK, L_PRACTISE, L_WORK, L_MEET]);
const L_WITH_ME = addLego('with me', '和我', SLOTS.PREP, [L_SPEAK, L_WORK]);
const L_WITH_SOMEONE = addLego('with someone else', '和别人', SLOTS.PREP, [L_SPEAK, L_PRACTISE]);
const L_WITH_EVERYONE = addLego('with everyone else', '和大家', SLOTS.PREP, [L_COME_BACK]);
const L_WITH_FRIENDS = addLego('with my friends', '和朋友', SLOTS.PREP, [L_DO, L_MEET]);
const L_TO_YOU = addLego('to you', '给你', SLOTS.PREP, [L_TELL, L_GIVE, L_SAY]);
const L_TO_ME = addLego('to me', '给我', SLOTS.PREP, [L_TELL, L_GIVE, L_SAY]);
const L_ABOUT_IT = addLego('about it', '关于它', SLOTS.PREP, [L_THINK_ABOUT, L_TALK]);
const L_ABOUT_SOMETHING = addLego('about something else', '关于别的事', SLOTS.PREP, [L_TALK]);
const L_TO_GO = addLego('to go', '走', SLOTS.PREP, [L_HAVE]);
const L_AT_HOME = addLego('at home', '在家', SLOTS.PREP, [L_BE_ABLE]);

// ============================================================
// CONNECTORS and sentence modifiers
// ============================================================

const L_AND = addLego('and', '和', SLOTS.SUBJECT, []);
const L_BUT = addLego('but', '但是', SLOTS.SUBJECT, []);
const L_BECAUSE = addLego('because', '因为', SLOTS.SUBJECT, []);
const L_SO = addLego('so', '所以', SLOTS.SUBJECT, []);
const L_IF = addLego('if', '如果', SLOTS.SUBJECT, []);
const L_WHEN = addLego('when', '当', SLOTS.SUBJECT, []);
const L_ALTHOUGH = addLego('although', '虽然', SLOTS.SUBJECT, []);
const L_BEFORE = addLego('before', '之前', SLOTS.SUBJECT, []);
const L_AFTER = addLego('after', '之后', SLOTS.SUBJECT, []);

// ============================================================
// COMPLETE SENTENCES (standalone expressions)
// ============================================================

const L_THANK_YOU = addLego('thank you very much', '非常感谢', SLOTS.SENTENCE, []);
const L_NO_PROBLEM = addLego('no problem', '没问题', SLOTS.SENTENCE, []);
const L_THATS_GOOD = addLego("that's a good idea", '这是个好主意', SLOTS.SENTENCE, []);
const L_YES = addLego('yes', '是的', SLOTS.SENTENCE, []);
const L_NO = addLego('no', '不', SLOTS.SENTENCE, []);
const L_OKAY = addLego('okay', '好的', SLOTS.SENTENCE, []);
const L_ITS_USEFUL = addLego("it's useful", '有用', SLOTS.SENTENCE, []);
const L_ITS_INTERESTING = addLego("it's interesting", '有趣', SLOTS.SENTENCE, []);
const L_ITS_IMPORTANT = addLego("it's important", '重要', SLOTS.SENTENCE, []);
const L_ITS_DIFFICULT = addLego("it's difficult", '很难', SLOTS.SENTENCE, []);
const L_ITS_NOT_DIFFICULT = addLego("it's not difficult", '不难', SLOTS.SENTENCE, []);
const L_ITS_EASY = addLego("it's easy", '容易', SLOTS.SENTENCE, []);
const L_ITS_LIKE_THIS = addLego("it's like this", '是这样的', SLOTS.SENTENCE, []);
const L_ITS_TIME = addLego("it's time", '是时候', SLOTS.SENTENCE, []);
const L_ITS_GOOD = addLego("it's a good thing", '是好事', SLOTS.SENTENCE, []);
const L_THAT_WAS = addLego('that was very interesting', '那很有趣', SLOTS.SENTENCE, []);
const L_THATS_VERY_KIND = addLego("that's very kind", '你真好', SLOTS.SENTENCE, []);
const L_IM_GRATEFUL = addLego("I'm grateful", '我很感激', SLOTS.SENTENCE, []);
const L_LEARNING_IS = addLego("learning Chinese isn't easy", '学中文不容易', SLOTS.SENTENCE, []);
const L_ITS_FUN = addLego('but it is fun', '但是很有趣', SLOTS.SENTENCE, []);

// ============================================================
// Generate all phrases
// ============================================================

console.log('\n--- Generating phrases from network ---');
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

// Phrase distribution
const byCounts = {};
phrases.forEach(p => {
  byCounts[p.legoCount] = (byCounts[p.legoCount] || 0) + 1;
});
console.log('\nPhrase distribution:');
Object.entries(byCounts).sort((a,b) => a[0] - b[0]).forEach(([count, n]) => {
  console.log(`  ${count} LEGOs: ${n} phrases`);
});

// Sample phrases
console.log('\n--- Sample phrases ---');
phrases.slice(0, 40).forEach((p, i) => {
  console.log(`${i + 1}. "${p.knownText}" → "${p.targetText}"`);
});

// Check for collisions
console.log('\n--- Chinese collisions (same Chinese, different English) ---');
const zhToEn = {};
for (const l of legos) {
  if (!zhToEn[l.targetText]) zhToEn[l.targetText] = [];
  zhToEn[l.targetText].push(l.knownText);
}
let collisionCount = 0;
for (const [zh, ens] of Object.entries(zhToEn)) {
  if (ens.length > 1) {
    console.log(`  "${zh}" ← [${ens.map(e => `"${e}"`).join(', ')}]`);
    collisionCount++;
  }
}
if (collisionCount === 0) console.log('  No collisions!');

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
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/zho_full_course.json',
  JSON.stringify(output, null, 2)
);

console.log('\n\nOutput: scripts/zho_full_course.json');
