/**
 * Build Chinese (zho_for_eng) course v2 - Part 2 (Seeds 11-20)
 * Continuing with proper M-type LEGOs
 */
const fetch = require('node-fetch');
require('dotenv').config();

const API = 'http://localhost:3471';
const COURSE_CODE = 'zho_for_eng';

// We need to rebuild vocab from existing LEGOs
async function loadExistingVocab() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data: legos } = await supabase
    .from('course_legos')
    .select('target_text, type, components')
    .eq('course_code', COURSE_CODE);

  const vocabSet = new Set();
  for (const lego of legos || []) {
    [...lego.target_text].filter(c => c.trim()).forEach(c => vocabSet.add(c));
    if (lego.type === 'M' && lego.components) {
      for (const comp of lego.components) {
        [...comp.target].filter(c => c.trim()).forEach(c => vocabSet.add(c));
      }
    }
  }
  return vocabSet;
}

let vocabSet;

function addVocab(text) {
  [...text].filter(c => c.trim()).forEach(c => vocabSet.add(c));
}

function checkVocab(text) {
  const chars = [...text].filter(c => c.trim());
  return chars.filter(c => !vocabSet.has(c));
}

async function postLego(lego) {
  addVocab(lego.target);
  if (lego.type === 'M' && lego.components) {
    lego.components.forEach(c => addVocab(c.target));
  }

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
}

async function main() {
  vocabSet = await loadExistingVocab();
  console.log(`Loaded ${vocabSet.size} characters from existing LEGOs\n`);
  console.log('Building Chinese course v2 - Part 2 (Seeds 11-20)...\n');

  // ═══════════════════════════════════════════════════════════════
  // SEED 11: I would like to be able to
  // Introduces 想要, 能够
  // ═══════════════════════════════════════════════════════════════
  console.log('--- SEED 11: I would like to be able to ---');

  await postLego({
    seed: 11, idx: 1, type: 'M',
    known: 'I would like', target: '我想要',
    components: [
      { known: 'want', target: '想要' },
      { known: 'I would like', target: '我想要' }
    ],
    phrases: [
      { known: 'I would like', target: '我想要' },
      { known: 'I would like to speak', target: '我想要说' },
      { known: 'I would like to speak Chinese', target: '我想要说中文' },
      { known: 'I would like to learn', target: '我想要学' },
      { known: 'I would like to try', target: '我想要试' },
      { known: 'I would like to practise', target: '我想要练习' },
      { known: 'I would like to explain', target: '我想要解释' },
      { known: 'I would like to remember', target: '我想要记住' },
      { known: 'I would like to speak with you', target: '我想要跟你说' },
      { known: 'I would like to speak Chinese with you now', target: '我想要现在跟你说中文' }
    ]
  });

  await postLego({
    seed: 11, idx: 2, type: 'M',
    known: 'to be able to', target: '能够',
    components: [
      { known: 'able', target: '够' },
      { known: 'to be able to', target: '能够' }
    ],
    phrases: [
      { known: 'to be able to', target: '能够' },
      { known: 'to be able to speak', target: '能够说' },
      { known: 'to be able to speak Chinese', target: '能够说中文' },
      { known: 'I would like to be able to', target: '我想要能够' },
      { known: 'I would like to be able to speak', target: '我想要能够说' },
      { known: 'I would like to be able to speak Chinese', target: '我想要能够说中文' },
      { known: "I'm trying to be able to", target: '我在试着能够' },
      { known: 'to be able to explain what I mean', target: '能够解释我的意思' },
      { known: 'I would like to be able to remember', target: '我想要能够记住' },
      { known: "I'm not sure if I can be able to", target: '我不确定我能不能够' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 12: I wouldn't like to guess what will happen tomorrow
  // Introduces 不想, 猜, 会, 发生, 明天
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 12: I wouldn\'t like to guess what will happen tomorrow ---');

  await postLego({
    seed: 12, idx: 1, type: 'M',
    known: "I wouldn't like", target: '我不想要',
    components: [
      { known: "wouldn't like", target: '不想要' },
      { known: "I wouldn't like", target: '我不想要' }
    ],
    phrases: [
      { known: "I wouldn't like", target: '我不想要' },
      { known: "I wouldn't like to speak", target: '我不想要说' },
      { known: "I wouldn't like to try", target: '我不想要试' },
      { known: "I wouldn't like to explain", target: '我不想要解释' },
      { known: "I wouldn't like to speak Chinese now", target: '我不想要现在说中文' },
      { known: "I wouldn't like to practise today", target: '我不想要今天练习' },
      { known: "I wouldn't like to speak with someone else", target: '我不想要跟别人说' },
      { known: "I wouldn't like to try as hard as I can", target: '我不想要尽力试' },
      { known: "I wouldn't like to remember", target: '我不想要记住' }
    ]
  });

  await postLego({
    seed: 12, idx: 2, type: 'A',
    known: 'to guess', target: '猜',
    phrases: [
      { known: 'to guess', target: '猜' },
      { known: 'I want to guess', target: '我想猜' },
      { known: "I wouldn't like to guess", target: '我不想要猜' },
      { known: "I'm trying to guess", target: '我在试着猜' },
      { known: 'guess what I mean', target: '猜我的意思' },
      { known: "I'm going to guess", target: '我要猜' },
      { known: "I'm not sure if I can guess", target: '我不确定我能不能猜' },
      { known: 'try to guess', target: '试着猜' },
      { known: 'I would like to guess', target: '我想要猜' }
    ]
  });

  await postLego({
    seed: 12, idx: 3, type: 'M',
    known: 'what will happen', target: '会发生什么',
    components: [
      { known: 'will', target: '会' },
      { known: 'happen', target: '发生' },
      { known: 'what', target: '什么' },
      { known: 'what will happen', target: '会发生什么' }
    ],
    phrases: [
      { known: 'what will happen', target: '会发生什么' },
      { known: 'guess what will happen', target: '猜会发生什么' },
      { known: "I wouldn't like to guess what will happen", target: '我不想要猜会发生什么' },
      { known: "I'm not sure what will happen", target: '我不确定会发生什么' },
      { known: "I'm trying to explain what will happen", target: '我在试着解释会发生什么' },
      { known: 'remember what will happen', target: '记住会发生什么' },
      { known: 'what will happen today', target: '今天会发生什么' },
      { known: "I'm trying to guess what will happen", target: '我在试着猜会发生什么' },
      { known: 'explain what will happen', target: '解释会发生什么' }
    ]
  });

  await postLego({
    seed: 12, idx: 4, type: 'A',
    known: 'tomorrow', target: '明天',
    phrases: [
      { known: 'tomorrow', target: '明天' },
      { known: 'what will happen tomorrow', target: '明天会发生什么' },
      { known: "I wouldn't like to guess what will happen tomorrow", target: '我不想要猜明天会发生什么' },
      { known: 'practise tomorrow', target: '明天练习' },
      { known: "I'm going to speak Chinese tomorrow", target: '我要明天说中文' },
      { known: 'I want to try tomorrow', target: '我想明天试' },
      { known: 'learn tomorrow', target: '明天学' },
      { known: "I'm not sure if I can speak tomorrow", target: '我不确定明天我能不能说' },
      { known: 'I would like to practise tomorrow', target: '我想要明天练习' },
      { known: 'remember something tomorrow', target: '明天记住东西' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 13: you speak very well
  // Introduces 得 via M-type
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 13: you speak very well (introduces 得) ---');

  await postLego({
    seed: 13, idx: 1, type: 'A',
    known: 'you speak', target: '你说',
    phrases: [
      { known: 'you speak', target: '你说' },
      { known: 'you speak Chinese', target: '你说中文' },
      { known: 'you speak with me', target: '你跟我说' },
      { known: 'you speak a little', target: '你说一点' },
      { known: 'you speak as often as possible', target: '你尽量多说' },
      { known: 'you speak now', target: '你现在说' },
      { known: 'you speak Chinese with someone else', target: '你跟别人说中文' },
      { known: 'you speak a little Chinese', target: '你说一点中文' },
      { known: 'you speak Chinese now', target: '你现在说中文' }
    ]
  });

  await postLego({
    seed: 13, idx: 2, type: 'M',
    known: 'very well', target: '很好',
    components: [
      { known: 'very', target: '很' },
      { known: 'good/well', target: '好' },
      { known: 'very well', target: '很好' }
    ],
    phrases: [
      { known: 'very well', target: '很好' },
      { known: 'speak very well', target: '说很好' },
      { known: 'I speak very well', target: '我说很好' },
      { known: 'you speak very well', target: '你说很好' },
      { known: 'speak Chinese very well', target: '说中文很好' },
      { known: 'I want to speak very well', target: '我想说很好' },
      { known: "I'm trying to speak very well", target: '我在试着说很好' },
      { known: 'I would like to speak Chinese very well', target: '我想要说中文很好' },
      { known: 'remember very well', target: '记住很好' },
      { known: 'you practise very well', target: '你练习很好' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 14: do you speak all day
  // Introduces 吗 (question particle)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 14: do you speak all day (introduces 吗) ---');

  await postLego({
    seed: 14, idx: 1, type: 'M',
    known: 'do you speak', target: '你说吗',
    components: [
      { known: 'question particle', target: '吗' },
      { known: 'do you speak', target: '你说吗' }
    ],
    phrases: [
      { known: 'do you speak', target: '你说吗' },
      { known: 'do you speak Chinese', target: '你说中文吗' },
      { known: 'do you speak very well', target: '你说很好吗' },
      { known: 'do you speak with someone else', target: '你跟别人说吗' },
      { known: 'do you speak Chinese very well', target: '你说中文很好吗' },
      { known: 'do you speak now', target: '你现在说吗' },
      { known: 'do you speak a little Chinese', target: '你说一点中文吗' },
      { known: 'do you speak as often as possible', target: '你尽量多说吗' },
      { known: 'do you want to speak Chinese', target: '你想说中文吗' }
    ]
  });

  await postLego({
    seed: 14, idx: 2, type: 'M',
    known: 'all day', target: '一整天',
    components: [
      { known: 'whole', target: '整' },
      { known: 'day', target: '天' },
      { known: 'all day', target: '一整天' }
    ],
    phrases: [
      { known: 'all day', target: '一整天' },
      { known: 'speak all day', target: '说一整天' },
      { known: 'do you speak all day', target: '你说一整天吗' },
      { known: 'I speak Chinese all day', target: '我说中文一整天' },
      { known: 'practise all day', target: '练习一整天' },
      { known: 'I want to practise all day', target: '我想练习一整天' },
      { known: "I'm going to learn all day", target: '我要学一整天' },
      { known: 'try all day', target: '试一整天' },
      { known: 'I would like to speak Chinese all day', target: '我想要说中文一整天' },
      { known: "I'm trying to remember all day", target: '我在试着记住一整天' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 15: and I want you to speak with me
  // Introduces 和, 让
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 15: and I want you to speak with me ---');

  await postLego({
    seed: 15, idx: 1, type: 'A',
    known: 'and', target: '和',
    phrases: [
      { known: 'and', target: '和' },
      { known: 'you and I', target: '你和我' },
      { known: 'today and tomorrow', target: '今天和明天' },
      { known: 'speak and learn', target: '说和学' },
      { known: 'I want to speak and learn', target: '我想说和学' },
      { known: 'Chinese and something else', target: '中文和东西' },
      { known: 'try and practise', target: '试和练习' },
      { known: 'remember and explain', target: '记住和解释' },
      { known: 'now and tomorrow', target: '现在和明天' }
    ]
  });

  await postLego({
    seed: 15, idx: 2, type: 'M',
    known: 'I want you to', target: '我想让你',
    components: [
      { known: 'let/make', target: '让' },
      { known: 'I want you to', target: '我想让你' }
    ],
    phrases: [
      { known: 'I want you to', target: '我想让你' },
      { known: 'I want you to speak', target: '我想让你说' },
      { known: 'I want you to speak Chinese', target: '我想让你说中文' },
      { known: 'I want you to learn', target: '我想让你学' },
      { known: 'I want you to try', target: '我想让你试' },
      { known: 'I want you to explain', target: '我想让你解释' },
      { known: 'I want you to remember', target: '我想让你记住' },
      { known: 'I want you to practise', target: '我想让你练习' },
      { known: 'I want you to speak with me', target: '我想让你跟我说' },
      { known: 'I want you to speak Chinese very well', target: '我想让你说中文很好' }
    ]
  });

  await postLego({
    seed: 15, idx: 3, type: 'A',
    known: 'with me', target: '跟我',
    phrases: [
      { known: 'with me', target: '跟我' },
      { known: 'speak with me', target: '跟我说' },
      { known: 'I want you to speak with me', target: '我想让你跟我说' },
      { known: 'speak Chinese with me', target: '跟我说中文' },
      { known: 'practise with me', target: '跟我练习' },
      { known: 'I want you to practise with me', target: '我想让你跟我练习' },
      { known: 'you speak with me', target: '你跟我说' },
      { known: 'do you speak with me', target: '你跟我说吗' },
      { known: 'learn with me', target: '跟我学' },
      { known: 'I would like you to speak Chinese with me', target: '我想要让你跟我说中文' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 16: he wants to come back later
  // Introduces 他, 回来, 稍后
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 16: he wants to come back later ---');

  await postLego({
    seed: 16, idx: 1, type: 'M',
    known: 'he wants', target: '他想',
    components: [
      { known: 'he', target: '他' },
      { known: 'he wants', target: '他想' }
    ],
    phrases: [
      { known: 'he wants', target: '他想' },
      { known: 'he wants to speak', target: '他想说' },
      { known: 'he wants to speak Chinese', target: '他想说中文' },
      { known: 'he wants to learn', target: '他想学' },
      { known: 'he wants to try', target: '他想试' },
      { known: 'he wants to practise', target: '他想练习' },
      { known: 'he wants to speak with you', target: '他想跟你说' },
      { known: 'he wants to explain', target: '他想解释' },
      { known: 'he wants to be able to', target: '他想能够' },
      { known: 'he wants to speak very well', target: '他想说很好' }
    ]
  });

  await postLego({
    seed: 16, idx: 2, type: 'M',
    known: 'to come back', target: '回来',
    components: [
      { known: 'return', target: '回' },
      { known: 'come', target: '来' },
      { known: 'to come back', target: '回来' }
    ],
    phrases: [
      { known: 'to come back', target: '回来' },
      { known: 'he wants to come back', target: '他想回来' },
      { known: 'I want to come back', target: '我想回来' },
      { known: "I'm going to come back", target: '我要回来' },
      { known: 'come back tomorrow', target: '明天回来' },
      { known: 'I would like to come back', target: '我想要回来' },
      { known: 'come back and speak', target: '回来说' },
      { known: 'he wants to come back and practise', target: '他想回来练习' },
      { known: "I'm not sure if I can come back", target: '我不确定我能不能回来' }
    ]
  });

  await postLego({
    seed: 16, idx: 3, type: 'A',
    known: 'later', target: '稍后',
    phrases: [
      { known: 'later', target: '稍后' },
      { known: 'come back later', target: '稍后回来' },
      { known: 'he wants to come back later', target: '他想稍后回来' },
      { known: 'I want to speak later', target: '我想稍后说' },
      { known: 'practise later', target: '稍后练习' },
      { known: "I'm going to try later", target: '我要稍后试' },
      { known: 'speak Chinese later', target: '稍后说中文' },
      { known: 'I would like to explain later', target: '我想要稍后解释' },
      { known: "I'm not sure if I can come back later", target: '我不确定稍后我能不能回来' },
      { known: 'do you want to come back later', target: '你想稍后回来吗' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 17: she wants to find out what the answer is
  // Introduces 她, 发现, 答案
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 17: she wants to find out what the answer is ---');

  await postLego({
    seed: 17, idx: 1, type: 'M',
    known: 'she wants', target: '她想',
    components: [
      { known: 'she', target: '她' },
      { known: 'she wants', target: '她想' }
    ],
    phrases: [
      { known: 'she wants', target: '她想' },
      { known: 'she wants to speak', target: '她想说' },
      { known: 'she wants to speak Chinese', target: '她想说中文' },
      { known: 'she wants to learn', target: '她想学' },
      { known: 'she wants to try', target: '她想试' },
      { known: 'she wants to come back', target: '她想回来' },
      { known: 'she wants to practise', target: '她想练习' },
      { known: 'she wants to speak very well', target: '她想说很好' },
      { known: 'she wants to be able to', target: '她想能够' },
      { known: 'he and she want', target: '他和她想' }
    ]
  });

  await postLego({
    seed: 17, idx: 2, type: 'M',
    known: 'to find out', target: '发现',
    components: [
      { known: 'discover/find', target: '发现' }
    ],
    phrases: [
      { known: 'to find out', target: '发现' },
      { known: 'she wants to find out', target: '她想发现' },
      { known: 'I want to find out', target: '我想发现' },
      { known: 'find out what I mean', target: '发现我的意思' },
      { known: "I'm trying to find out", target: '我在试着发现' },
      { known: 'find out what will happen', target: '发现会发生什么' },
      { known: 'he wants to find out', target: '他想发现' },
      { known: "I'm going to find out", target: '我要发现' },
      { known: 'find out how to say', target: '发现怎么说' }
    ]
  });

  await postLego({
    seed: 17, idx: 3, type: 'M',
    known: 'what the answer is', target: '答案是什么',
    components: [
      { known: 'answer', target: '答案' },
      { known: 'is', target: '是' },
      { known: 'what the answer is', target: '答案是什么' }
    ],
    phrases: [
      { known: 'what the answer is', target: '答案是什么' },
      { known: 'find out what the answer is', target: '发现答案是什么' },
      { known: 'she wants to find out what the answer is', target: '她想发现答案是什么' },
      { known: "I'm not sure what the answer is", target: '我不确定答案是什么' },
      { known: 'guess what the answer is', target: '猜答案是什么' },
      { known: 'explain what the answer is', target: '解释答案是什么' },
      { known: 'he wants to find out what the answer is', target: '他想发现答案是什么' },
      { known: "I'm trying to find out what the answer is", target: '我在试着发现答案是什么' },
      { known: 'do you want to find out what the answer is', target: '你想发现答案是什么吗' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 18: we want to meet this evening
  // Introduces 我们, 见面, 今晚
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 18: we want to meet this evening ---');

  await postLego({
    seed: 18, idx: 1, type: 'M',
    known: 'we want', target: '我们想',
    components: [
      { known: 'we', target: '我们' },
      { known: 'we want', target: '我们想' }
    ],
    phrases: [
      { known: 'we want', target: '我们想' },
      { known: 'we want to speak', target: '我们想说' },
      { known: 'we want to speak Chinese', target: '我们想说中文' },
      { known: 'we want to learn', target: '我们想学' },
      { known: 'we want to try', target: '我们想试' },
      { known: 'we want to practise', target: '我们想练习' },
      { known: 'we want to come back', target: '我们想回来' },
      { known: 'we want to find out', target: '我们想发现' },
      { known: 'we want to speak very well', target: '我们想说很好' },
      { known: 'we want to be able to', target: '我们想能够' }
    ]
  });

  await postLego({
    seed: 18, idx: 2, type: 'M',
    known: 'to meet', target: '见面',
    components: [
      { known: 'see', target: '见' },
      { known: 'face', target: '面' },
      { known: 'to meet', target: '见面' }
    ],
    phrases: [
      { known: 'to meet', target: '见面' },
      { known: 'we want to meet', target: '我们想见面' },
      { known: 'I want to meet', target: '我想见面' },
      { known: 'meet with you', target: '跟你见面' },
      { known: 'I want to meet with you', target: '我想跟你见面' },
      { known: 'meet later', target: '稍后见面' },
      { known: 'we want to meet tomorrow', target: '我们想明天见面' },
      { known: 'he wants to meet', target: '他想见面' },
      { known: 'she wants to meet', target: '她想见面' }
    ]
  });

  await postLego({
    seed: 18, idx: 3, type: 'M',
    known: 'this evening', target: '今晚',
    components: [
      { known: 'evening', target: '晚' },
      { known: 'this evening', target: '今晚' }
    ],
    phrases: [
      { known: 'this evening', target: '今晚' },
      { known: 'meet this evening', target: '今晚见面' },
      { known: 'we want to meet this evening', target: '我们想今晚见面' },
      { known: 'speak Chinese this evening', target: '今晚说中文' },
      { known: 'I want to practise this evening', target: '我想今晚练习' },
      { known: "I'm going to try this evening", target: '我要今晚试' },
      { known: 'come back this evening', target: '今晚回来' },
      { known: 'he wants to meet this evening', target: '他想今晚见面' },
      { known: 'what will happen this evening', target: '今晚会发生什么' },
      { known: "I'm not sure if I can meet this evening", target: '我不确定今晚我能不能见面' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 19: but I don't want to stop talking
  // Introduces 但是, 停止, 说话
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 19: but I don\'t want to stop talking ---');

  await postLego({
    seed: 19, idx: 1, type: 'A',
    known: 'but', target: '但是',
    phrases: [
      { known: 'but', target: '但是' },
      { known: 'but I want', target: '但是我想' },
      { known: 'but I want to speak', target: '但是我想说' },
      { known: "but I'm not sure", target: '但是我不确定' },
      { known: 'but he wants', target: '但是他想' },
      { known: 'but she wants', target: '但是她想' },
      { known: 'but we want', target: '但是我们想' },
      { known: "but I wouldn't like", target: '但是我不想要' },
      { known: 'but I want to try', target: '但是我想试' }
    ]
  });

  await postLego({
    seed: 19, idx: 2, type: 'M',
    known: "I don't want", target: '我不想',
    components: [
      { known: "don't want", target: '不想' },
      { known: "I don't want", target: '我不想' }
    ],
    phrases: [
      { known: "I don't want", target: '我不想' },
      { known: "I don't want to speak", target: '我不想说' },
      { known: "I don't want to try", target: '我不想试' },
      { known: "I don't want to guess", target: '我不想猜' },
      { known: "I don't want to come back", target: '我不想回来' },
      { known: "I don't want to meet", target: '我不想见面' },
      { known: "but I don't want", target: '但是我不想' },
      { known: "I don't want to speak Chinese now", target: '我不想现在说中文' },
      { known: "I don't want to explain", target: '我不想解释' }
    ]
  });

  await postLego({
    seed: 19, idx: 3, type: 'M',
    known: 'to stop', target: '停止',
    components: [
      { known: 'stop', target: '停' },
      { known: 'to stop', target: '停止' }
    ],
    phrases: [
      { known: 'to stop', target: '停止' },
      { known: "I don't want to stop", target: '我不想停止' },
      { known: 'stop speaking', target: '停止说' },
      { known: "I don't want to stop speaking", target: '我不想停止说' },
      { known: 'stop learning', target: '停止学' },
      { known: 'stop practising', target: '停止练习' },
      { known: "but I don't want to stop", target: '但是我不想停止' },
      { known: 'he wants to stop', target: '他想停止' },
      { known: "I wouldn't like to stop", target: '我不想要停止' }
    ]
  });

  await postLego({
    seed: 19, idx: 4, type: 'M',
    known: 'talking', target: '说话',
    components: [
      { known: 'words', target: '话' },
      { known: 'talking', target: '说话' }
    ],
    phrases: [
      { known: 'talking', target: '说话' },
      { known: 'stop talking', target: '停止说话' },
      { known: "I don't want to stop talking", target: '我不想停止说话' },
      { known: "but I don't want to stop talking", target: '但是我不想停止说话' },
      { known: 'talking in Chinese', target: '用中文说话' },
      { known: 'practise talking', target: '练习说话' },
      { known: "I'm trying to stop talking", target: '我在试着停止说话' },
      { known: 'talking with you', target: '跟你说话' },
      { known: 'talking with someone else', target: '跟别人说话' },
      { known: 'I want to practise talking in Chinese', target: '我想练习用中文说话' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 20: you want to know his name quickly
  // Introduces 知道, 名字, 快
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- SEED 20: you want to know his name quickly ---');

  await postLego({
    seed: 20, idx: 1, type: 'A',
    known: 'you want', target: '你想',
    phrases: [
      { known: 'you want', target: '你想' },
      { known: 'you want to speak', target: '你想说' },
      { known: 'you want to learn', target: '你想学' },
      { known: 'you want to try', target: '你想试' },
      { known: 'you want to meet', target: '你想见面' },
      { known: 'you want to come back', target: '你想回来' },
      { known: 'you want to stop', target: '你想停止' },
      { known: 'you want to find out', target: '你想发现' },
      { known: 'do you want to speak Chinese', target: '你想说中文吗' }
    ]
  });

  await postLego({
    seed: 20, idx: 2, type: 'M',
    known: 'to know', target: '知道',
    components: [
      { known: 'know', target: '知' },
      { known: 'path/way', target: '道' },
      { known: 'to know', target: '知道' }
    ],
    phrases: [
      { known: 'to know', target: '知道' },
      { known: 'you want to know', target: '你想知道' },
      { known: 'I want to know', target: '我想知道' },
      { known: 'know what will happen', target: '知道会发生什么' },
      { known: 'know what the answer is', target: '知道答案是什么' },
      { known: "I don't know", target: '我不知道' },
      { known: 'do you know', target: '你知道吗' },
      { known: 'he wants to know', target: '他想知道' },
      { known: 'I want to know how to say', target: '我想知道怎么说' }
    ]
  });

  await postLego({
    seed: 20, idx: 3, type: 'M',
    known: 'his name', target: '他的名字',
    components: [
      { known: 'his', target: '他的' },
      { known: 'name', target: '名字' },
      { known: 'his name', target: '他的名字' }
    ],
    phrases: [
      { known: 'his name', target: '他的名字' },
      { known: 'know his name', target: '知道他的名字' },
      { known: 'you want to know his name', target: '你想知道他的名字' },
      { known: 'I want to know his name', target: '我想知道他的名字' },
      { known: 'do you know his name', target: '你知道他的名字吗' },
      { known: "I don't know his name", target: '我不知道他的名字' },
      { known: 'remember his name', target: '记住他的名字' },
      { known: "I'm trying to remember his name", target: '我在试着记住他的名字' },
      { known: 'what is his name', target: '他的名字是什么' }
    ]
  });

  await postLego({
    seed: 20, idx: 4, type: 'A',
    known: 'quickly', target: '快',
    phrases: [
      { known: 'quickly', target: '快' },
      { known: 'know his name quickly', target: '快知道他的名字' },
      { known: 'you want to know his name quickly', target: '你想快知道他的名字' },
      { known: 'speak quickly', target: '快说' },
      { known: 'learn quickly', target: '快学' },
      { known: 'I want to learn Chinese quickly', target: '我想快学中文' },
      { known: 'come back quickly', target: '快回来' },
      { known: 'find out quickly', target: '快发现' },
      { known: 'he wants to learn quickly', target: '他想快学' },
      { known: "I'm trying to remember quickly", target: '我在试着快记住' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // CHECKPOINT @ ~55 LEGOs (Seeds 11-20)
  // ═══════════════════════════════════════════════════════════════
  await checkpoint('Seeds 11-20 complete');

  console.log('Seeds 11-20 complete! Running validation...\n');
}

main().catch(console.error);
