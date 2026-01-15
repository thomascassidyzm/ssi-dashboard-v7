/**
 * Build Chinese (zho_for_eng) course v2 - With proper M-type LEGOs
 *
 * Key changes from v1:
 * - Grammar particles (着, 得, 的) introduced via M-type components
 * - Phrases ONLY use vocab from LEGOs already introduced
 * - Vocab tracking throughout to prevent violations
 */
const fetch = require('node-fetch');
require('dotenv').config();

const API = 'http://localhost:3471';
const COURSE_CODE = 'zho_for_eng';

// Track available vocabulary (characters)
const vocabSet = new Set();

function addVocab(text) {
  // Add each character to vocab set
  [...text].filter(c => c.trim()).forEach(c => vocabSet.add(c));
}

function checkVocab(text) {
  // Return any characters not yet in vocab
  const chars = [...text].filter(c => c.trim());
  return chars.filter(c => !vocabSet.has(c));
}

async function postLego(lego) {
  // Add LEGO's target to vocab FIRST
  addVocab(lego.target);

  // Add component targets to vocab if M-type
  if (lego.type === 'M' && lego.components) {
    lego.components.forEach(c => addVocab(c.target));
  }

  // Check phrases for vocab violations
  if (lego.phrases) {
    for (const p of lego.phrases) {
      const violations = checkVocab(p.target);
      if (violations.length > 0) {
        console.log(`  ⚠ VOCAB WARNING in "${p.target}": missing ${violations.join('')}`);
      }
    }
  }

  const res = await fetch(API + '/api/lego', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_code: COURSE_CODE, ...lego })
  });
  const data = await res.json();
  if (!res.ok) {
    console.log('✗', `S${String(lego.seed).padStart(4,'0')}L${String(lego.idx).padStart(2,'0')}`, data.error);
    return false;
  }
  const typeLabel = lego.type === 'M' ? '[M]' : '[A]';
  console.log('✓', data.lego_id, typeLabel, lego.known, '→', lego.target, `(${lego.phrases?.length || 0} phr)`);
  return true;
}

async function getStats() {
  const res = await fetch(`${API}/api/stats/${COURSE_CODE}`);
  return res.json();
}

async function checkpoint(label) {
  const stats = await getStats();
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log(`║  CHECKPOINT: ${label.padEnd(42)}║`);
  console.log(`╠════════════════════════════════════════════════════════╣`);
  console.log(`║  LEGOs: ${String(stats.legos).padEnd(6)} Phrases: ${String(stats.phrases).padEnd(6)} Ratio: ${stats.ratio.padEnd(6)}║`);
  console.log(`║  Vocab: ${String(vocabSet.size).padEnd(4)} characters                              ║`);
  console.log(`║  Quality: ${stats.quality.padEnd(44)}║`);
  console.log('╚════════════════════════════════════════════════════════╝\n');
  return stats;
}

async function main() {
  console.log('Building Chinese course v2 (proper M-types)...\n');

  // ═══════════════════════════════════════════════════════════════
  // SEED 1: I want to speak Chinese with you now
  // ═══════════════════════════════════════════════════════════════
  console.log('--- SEED 1: I want to speak Chinese with you now ---');

  await postLego({
    seed: 1, idx: 1, type: 'A',
    known: 'I want', target: '我想',
    phrases: [
      { known: 'I want', target: '我想' }
    ]
  });

  await postLego({
    seed: 1, idx: 2, type: 'A',
    known: 'to speak', target: '说',
    phrases: [
      { known: 'I want to speak', target: '我想说' }
    ]
  });

  await postLego({
    seed: 1, idx: 3, type: 'A',
    known: 'Chinese', target: '中文',
    phrases: [
      { known: 'to speak Chinese', target: '说中文' },
      { known: 'I want to speak Chinese', target: '我想说中文' }
    ]
  });

  await postLego({
    seed: 1, idx: 4, type: 'A',
    known: 'with you', target: '跟你',
    phrases: [
      { known: 'with you', target: '跟你' },
      { known: 'to speak with you', target: '跟你说' },
      { known: 'I want to speak with you', target: '我想跟你说' },
      { known: 'to speak Chinese with you', target: '跟你说中文' },
      { known: 'I want to speak Chinese with you', target: '我想跟你说中文' }
    ]
  });

  await postLego({
    seed: 1, idx: 5, type: 'A',
    known: 'now', target: '现在',
    phrases: [
      { known: 'now', target: '现在' },
      { known: 'speak now', target: '现在说' },
      { known: 'I want to speak now', target: '我想现在说' },
      { known: 'speak Chinese now', target: '现在说中文' },
      { known: 'I want to speak Chinese now', target: '我想现在说中文' },
      { known: 'speak with you now', target: '现在跟你说' },
      { known: 'I want to speak with you now', target: '我想现在跟你说' },
      { known: 'speak Chinese with you now', target: '现在跟你说中文' },
      { known: 'I want to speak Chinese with you now', target: '我想现在跟你说中文' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 2: I'm trying to learn
  // Introduces 着 via M-type "trying to"
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 2: I\'m trying to learn (introduces 着) ---');

  await postLego({
    seed: 2, idx: 1, type: 'M',
    known: "I'm trying to", target: '我在试着',
    components: [
      { known: 'I am', target: '我在' },
      { known: 'try', target: '试' },
      { known: "trying to", target: '试着' }  // Introduces 着
    ],
    phrases: [
      { known: "I'm trying to", target: '我在试着' },
      { known: "I'm trying to speak", target: '我在试着说' },
      { known: "I'm trying to speak Chinese", target: '我在试着说中文' },
      { known: "I'm trying to speak with you", target: '我在试着跟你说' },
      { known: "I'm trying to speak now", target: '我在试着现在说' },
      { known: "I'm trying to speak Chinese with you", target: '我在试着跟你说中文' },
      { known: "I'm trying to speak Chinese now", target: '我在试着现在说中文' },
      { known: "I'm trying to speak Chinese with you now", target: '我在试着现在跟你说中文' }
    ]
  });

  await postLego({
    seed: 2, idx: 2, type: 'A',
    known: 'to learn', target: '学',
    phrases: [
      { known: 'to learn', target: '学' },
      { known: "I'm trying to learn", target: '我在试着学' },
      { known: 'I want to learn', target: '我想学' },
      { known: 'to learn Chinese', target: '学中文' },
      { known: "I'm trying to learn Chinese", target: '我在试着学中文' },
      { known: 'I want to learn Chinese', target: '我想学中文' },
      { known: 'I want to learn now', target: '我想现在学' },
      { known: "I'm trying to learn Chinese now", target: '我在试着现在学中文' },
      { known: 'I want to learn Chinese with you', target: '我想跟你学中文' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 3: how to speak as often as possible
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 3: how to speak as often as possible ---');

  await postLego({
    seed: 3, idx: 1, type: 'A',
    known: 'how to', target: '怎么',
    phrases: [
      { known: 'how to', target: '怎么' },
      { known: 'how to speak', target: '怎么说' },
      { known: 'how to speak Chinese', target: '怎么说中文' },
      { known: 'I want to learn how to speak', target: '我想学怎么说' },
      { known: 'I want to learn how to speak Chinese', target: '我想学怎么说中文' },
      { known: "I'm trying to learn how to speak", target: '我在试着学怎么说' },
      { known: "I'm trying to learn how to speak Chinese", target: '我在试着学怎么说中文' },
      { known: 'how to speak with you', target: '怎么跟你说' }
    ]
  });

  await postLego({
    seed: 3, idx: 2, type: 'A',
    known: 'as often as possible', target: '尽量多',
    phrases: [
      { known: 'as often as possible', target: '尽量多' },
      { known: 'speak as often as possible', target: '尽量多说' },
      { known: 'speak Chinese as often as possible', target: '尽量多说中文' },
      { known: 'I want to speak as often as possible', target: '我想尽量多说' },
      { known: 'I want to speak Chinese as often as possible', target: '我想尽量多说中文' },
      { known: "I'm trying to speak as often as possible", target: '我在试着尽量多说' },
      { known: 'learn as often as possible', target: '尽量多学' },
      { known: 'I want to learn Chinese as often as possible', target: '我想尽量多学中文' },
      { known: "I'm trying to learn as often as possible", target: '我在试着尽量多学' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 4: how to say something in Chinese
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 4: how to say something in Chinese ---');

  await postLego({
    seed: 4, idx: 1, type: 'A',
    known: 'something', target: '东西',
    phrases: [
      { known: 'something', target: '东西' },
      { known: 'say something', target: '说东西' },
      { known: 'I want to say something', target: '我想说东西' },
      { known: 'learn something', target: '学东西' },
      { known: 'I want to learn something', target: '我想学东西' },
      { known: "I'm trying to say something", target: '我在试着说东西' },
      { known: "I'm trying to learn something", target: '我在试着学东西' },
      { known: 'say something now', target: '现在说东西' }
    ]
  });

  await postLego({
    seed: 4, idx: 2, type: 'M',
    known: 'in Chinese', target: '用中文',
    components: [
      { known: 'use', target: '用' },
      { known: 'in Chinese', target: '用中文' }
    ],
    phrases: [
      { known: 'in Chinese', target: '用中文' },
      { known: 'speak in Chinese', target: '用中文说' },
      { known: 'say something in Chinese', target: '用中文说东西' },
      { known: 'I want to speak in Chinese', target: '我想用中文说' },
      { known: 'I want to say something in Chinese', target: '我想用中文说东西' },
      { known: "I'm trying to speak in Chinese", target: '我在试着用中文说' },
      { known: 'how to say something in Chinese', target: '怎么用中文说东西' },
      { known: 'I want to learn how to say something in Chinese', target: '我想学怎么用中文说东西' },
      { known: "I'm trying to say something in Chinese now", target: '我在试着现在用中文说东西' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 5: I'm going to practise with someone else
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 5: I\'m going to practise with someone else ---');

  await postLego({
    seed: 5, idx: 1, type: 'A',
    known: "I'm going to", target: '我要',
    phrases: [
      { known: "I'm going to", target: '我要' },
      { known: "I'm going to speak", target: '我要说' },
      { known: "I'm going to speak Chinese", target: '我要说中文' },
      { known: "I'm going to learn", target: '我要学' },
      { known: "I'm going to learn Chinese", target: '我要学中文' },
      { known: "I'm going to say something", target: '我要说东西' },
      { known: "I'm going to speak with you", target: '我要跟你说' },
      { known: "I'm going to learn how to speak Chinese", target: '我要学怎么说中文' },
      { known: "I'm going to say something in Chinese", target: '我要用中文说东西' }
    ]
  });

  await postLego({
    seed: 5, idx: 2, type: 'A',
    known: 'to practise', target: '练习',
    phrases: [
      { known: 'to practise', target: '练习' },
      { known: 'I want to practise', target: '我想练习' },
      { known: "I'm going to practise", target: '我要练习' },
      { known: "I'm trying to practise", target: '我在试着练习' },
      { known: 'practise speaking', target: '练习说' },
      { known: 'practise speaking Chinese', target: '练习说中文' },
      { known: 'I want to practise speaking Chinese', target: '我想练习说中文' },
      { known: "I'm going to practise speaking Chinese", target: '我要练习说中文' },
      { known: 'practise as often as possible', target: '尽量多练习' },
      { known: 'I want to practise speaking Chinese with you', target: '我想跟你练习说中文' }
    ]
  });

  await postLego({
    seed: 5, idx: 3, type: 'M',
    known: 'with someone else', target: '跟别人',
    components: [
      { known: 'other people', target: '别人' },
      { known: 'with someone else', target: '跟别人' }
    ],
    phrases: [
      { known: 'with someone else', target: '跟别人' },
      { known: 'speak with someone else', target: '跟别人说' },
      { known: 'practise with someone else', target: '跟别人练习' },
      { known: 'I want to speak with someone else', target: '我想跟别人说' },
      { known: "I'm going to practise with someone else", target: '我要跟别人练习' },
      { known: 'speak Chinese with someone else', target: '跟别人说中文' },
      { known: 'I want to practise with someone else', target: '我想跟别人练习' },
      { known: "I'm trying to speak with someone else", target: '我在试着跟别人说' },
      { known: "I'm going to practise speaking Chinese with someone else", target: '我要跟别人练习说中文' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 6: trying to remember a word
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 6: trying to remember a word ---');

  await postLego({
    seed: 6, idx: 1, type: 'A',
    known: 'to remember', target: '记住',
    phrases: [
      { known: 'to remember', target: '记住' },
      { known: 'I want to remember', target: '我想记住' },
      { known: "I'm trying to remember", target: '我在试着记住' },
      { known: 'remember something', target: '记住东西' },
      { known: 'I want to remember how to say', target: '我想记住怎么说' },
      { known: "I'm trying to remember how to say something", target: '我在试着记住怎么说东西' },
      { known: "I'm going to remember", target: '我要记住' },
      { known: 'remember how to speak Chinese', target: '记住怎么说中文' }
    ]
  });

  await postLego({
    seed: 6, idx: 2, type: 'M',
    known: 'a word', target: '一个词',
    components: [
      { known: 'one', target: '一' },
      { known: 'measure word', target: '个' },
      { known: 'word', target: '词' },
      { known: 'a word', target: '一个词' }
    ],
    phrases: [
      { known: 'a word', target: '一个词' },
      { known: 'remember a word', target: '记住一个词' },
      { known: 'I want to remember a word', target: '我想记住一个词' },
      { known: "I'm trying to remember a word", target: '我在试着记住一个词' },
      { known: 'learn a word', target: '学一个词' },
      { known: 'I want to learn a word', target: '我想学一个词' },
      { known: 'a Chinese word', target: '一个中文词' },
      { known: 'say a word', target: '说一个词' },
      { known: 'I want to remember a Chinese word', target: '我想记住一个中文词' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 7: I want to try as hard as I can today
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 7: I want to try as hard as I can today ---');

  await postLego({
    seed: 7, idx: 1, type: 'A',
    known: 'to try', target: '试',
    phrases: [
      { known: 'to try', target: '试' },
      { known: 'I want to try', target: '我想试' },
      { known: "I'm going to try", target: '我要试' },
      { known: 'try to speak', target: '试着说' },
      { known: 'I want to try to speak Chinese', target: '我想试着说中文' },
      { known: "I'm going to try to remember", target: '我要试着记住' },
      { known: 'try to say something', target: '试着说东西' },
      { known: 'I want to try to practise', target: '我想试着练习' },
      { known: "I'm trying to try as often as possible", target: '我在试着尽量多试' }
    ]
  });

  await postLego({
    seed: 7, idx: 2, type: 'A',
    known: 'as hard as I can', target: '尽力',
    phrases: [
      { known: 'as hard as I can', target: '尽力' },
      { known: 'try as hard as I can', target: '尽力试' },
      { known: 'I want to try as hard as I can', target: '我想尽力试' },
      { known: "I'm going to try as hard as I can", target: '我要尽力试' },
      { known: 'practise as hard as I can', target: '尽力练习' },
      { known: 'I want to learn as hard as I can', target: '我想尽力学' },
      { known: "I'm going to practise as hard as I can", target: '我要尽力练习' },
      { known: 'speak Chinese as hard as I can', target: '尽力说中文' },
      { known: "I'm trying as hard as I can", target: '我在尽力试着' }
    ]
  });

  await postLego({
    seed: 7, idx: 3, type: 'A',
    known: 'today', target: '今天',
    phrases: [
      { known: 'today', target: '今天' },
      { known: 'speak today', target: '今天说' },
      { known: 'I want to try today', target: '我想今天试' },
      { known: "I'm going to practise today", target: '我要今天练习' },
      { known: 'learn Chinese today', target: '今天学中文' },
      { known: 'I want to speak Chinese today', target: '我想今天说中文' },
      { known: "I'm trying to remember a word today", target: '我在试着今天记住一个词' },
      { known: 'I want to try as hard as I can today', target: '我想今天尽力试' },
      { known: "I'm going to practise speaking Chinese today", target: '我要今天练习说中文' },
      { known: 'practise with someone else today', target: '今天跟别人练习' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 8: I'm going to try to explain what I mean
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 8: I\'m going to try to explain what I mean ---');

  await postLego({
    seed: 8, idx: 1, type: 'A',
    known: 'to explain', target: '解释',
    phrases: [
      { known: 'to explain', target: '解释' },
      { known: 'I want to explain', target: '我想解释' },
      { known: "I'm trying to explain", target: '我在试着解释' },
      { known: "I'm going to explain", target: '我要解释' },
      { known: 'try to explain', target: '试着解释' },
      { known: 'I want to try to explain', target: '我想试着解释' },
      { known: 'explain something', target: '解释东西' },
      { known: "I'm going to try to explain", target: '我要试着解释' },
      { known: 'explain in Chinese', target: '用中文解释' }
    ]
  });

  await postLego({
    seed: 8, idx: 2, type: 'M',
    known: 'what I mean', target: '我的意思',
    components: [
      { known: 'my', target: '我的' },
      { known: 'meaning', target: '意思' },
      { known: 'what I mean', target: '我的意思' }
    ],
    phrases: [
      { known: 'what I mean', target: '我的意思' },
      { known: 'explain what I mean', target: '解释我的意思' },
      { known: 'I want to explain what I mean', target: '我想解释我的意思' },
      { known: "I'm trying to explain what I mean", target: '我在试着解释我的意思' },
      { known: "I'm going to explain what I mean", target: '我要解释我的意思' },
      { known: 'say what I mean', target: '说我的意思' },
      { known: 'I want to say what I mean', target: '我想说我的意思' },
      { known: "I'm trying to say what I mean in Chinese", target: '我在试着用中文说我的意思' },
      { known: 'how to explain what I mean', target: '怎么解释我的意思' },
      { known: 'I want to learn how to explain what I mean', target: '我想学怎么解释我的意思' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 9: I speak a little Chinese
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 9: I speak a little Chinese ---');

  await postLego({
    seed: 9, idx: 1, type: 'A',
    known: 'I speak', target: '我说',
    phrases: [
      { known: 'I speak', target: '我说' },
      { known: 'I speak Chinese', target: '我说中文' },
      { known: 'I speak with you', target: '我跟你说' },
      { known: 'I speak Chinese with you', target: '我跟你说中文' },
      { known: 'I speak now', target: '我现在说' },
      { known: 'I speak Chinese now', target: '我现在说中文' },
      { known: 'I speak as often as possible', target: '我尽量多说' },
      { known: 'I speak Chinese as often as possible', target: '我尽量多说中文' },
      { known: 'I speak with someone else', target: '我跟别人说' }
    ]
  });

  await postLego({
    seed: 9, idx: 2, type: 'M',
    known: 'a little', target: '一点',
    components: [
      { known: 'one', target: '一' },
      { known: 'a bit', target: '点' },
      { known: 'a little', target: '一点' }
    ],
    phrases: [
      { known: 'a little', target: '一点' },
      { known: 'a little Chinese', target: '一点中文' },
      { known: 'I speak a little', target: '我说一点' },
      { known: 'I speak a little Chinese', target: '我说一点中文' },
      { known: 'learn a little', target: '学一点' },
      { known: 'I want to learn a little Chinese', target: '我想学一点中文' },
      { known: "I'm trying to remember a little", target: '我在试着记住一点' },
      { known: 'say a little something', target: '说一点东西' },
      { known: 'practise a little today', target: '今天练习一点' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 10: I'm not sure if I can remember
  // Introduces 能 (can/able)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 10: I\'m not sure if I can remember (introduces 能) ---');

  await postLego({
    seed: 10, idx: 1, type: 'M',
    known: "I'm not sure", target: '我不确定',
    components: [
      { known: 'not', target: '不' },
      { known: 'sure/certain', target: '确定' },
      { known: "I'm not sure", target: '我不确定' }
    ],
    phrases: [
      { known: "I'm not sure", target: '我不确定' },
      { known: "I'm not sure how to say", target: '我不确定怎么说' },
      { known: "I'm not sure how to explain", target: '我不确定怎么解释' },
      { known: "I'm not sure what I mean", target: '我不确定我的意思' },
      { known: "I'm not sure how to say it in Chinese", target: '我不确定怎么用中文说' },
      { known: "I'm not sure how to speak Chinese", target: '我不确定怎么说中文' },
      { known: "I'm not sure how to try today", target: '我不确定今天怎么试' },
      { known: "I'm not sure how to learn", target: '我不确定怎么学' }
    ]
  });

  await postLego({
    seed: 10, idx: 2, type: 'M',
    known: 'if I can', target: '我能不能',
    components: [
      { known: 'can/able', target: '能' },
      { known: 'or not', target: '不能' },
      { known: 'if I can', target: '我能不能' }
    ],
    phrases: [
      { known: 'if I can', target: '我能不能' },
      { known: 'if I can speak', target: '我能不能说' },
      { known: 'if I can remember', target: '我能不能记住' },
      { known: 'if I can learn', target: '我能不能学' },
      { known: 'if I can try', target: '我能不能试' },
      { known: 'if I can explain', target: '我能不能解释' },
      { known: "I'm not sure if I can speak Chinese", target: '我不确定我能不能说中文' },
      { known: "I'm not sure if I can remember a word", target: '我不确定我能不能记住一个词' },
      { known: 'if I can practise today', target: '今天我能不能练习' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // CHECKPOINT @ 20 LEGOs
  // ═══════════════════════════════════════════════════════════════
  await checkpoint('Seeds 1-10 complete');

  // Run validator
  console.log('Running validation...');
}

main().catch(console.error);
