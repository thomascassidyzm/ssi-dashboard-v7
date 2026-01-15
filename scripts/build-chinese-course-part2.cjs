/**
 * Build Chinese (zho_for_eng) course - Part 2 (Seeds 11-20)
 */
const fetch = require('node-fetch');
require('dotenv').config();

const API = 'http://localhost:3471';
const COURSE_CODE = 'zho_for_eng';

async function postLego(lego) {
  const res = await fetch(API + '/api/lego', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_code: COURSE_CODE, ...lego })
  });
  const data = await res.json();
  if (!res.ok) {
    console.log('✗', `S${String(lego.seed).padStart(4,'0')}L${String(lego.idx).padStart(2,'0')}`, data.error, data.hint || '');
    return false;
  }
  console.log('✓', data.lego_id, lego.known, '→', lego.target, `(${lego.phrases?.length || 0} phrases)`);
  return true;
}

async function getStats() {
  const res = await fetch(`${API}/api/stats/${COURSE_CODE}`);
  return res.json();
}

async function checkpoint(label) {
  const stats = await getStats();
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║  CHECKPOINT: ${label}`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  LEGOs: ${stats.legos}  Phrases: ${stats.phrases}  Ratio: ${stats.ratio}`);
  console.log(`║  Quality: ${stats.quality}`);
  console.log('╚══════════════════════════════════════════════════╝\n');
  return stats;
}

async function main() {
  console.log('Building Chinese course - Part 2 (Seeds 11-20)...\n');

  // ═══════════════════════════════════════════════════════════════
  // SEED 11: I would like to be able to
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 11, idx: 1, type: 'A',
    known: 'I would like', target: '我想要',
    phrases: [
      { known: 'I would like', target: '我想要' },
      { known: 'I would like to speak', target: '我想要说' },
      { known: 'I would like to speak Chinese', target: '我想要说中文' },
      { known: 'I would like to learn', target: '我想要学' },
      { known: 'I would like to try', target: '我想要试' },
      { known: 'I would like to practise', target: '我想要练习' },
      { known: 'I would like to explain', target: '我想要解释' },
      { known: 'I would like to remember', target: '我想要记住' },
      { known: 'I would like to speak with you', target: '我想要跟你说' }
    ]
  });

  await postLego({
    seed: 11, idx: 2, type: 'A',
    known: 'to be able to', target: '能够',
    phrases: [
      { known: 'to be able to', target: '能够' },
      { known: 'to be able to speak', target: '能够说' },
      { known: 'to be able to speak Chinese', target: '能够说中文' },
      { known: 'I would like to be able to', target: '我想要能够' },
      { known: 'I would like to be able to speak', target: '我想要能够说' },
      { known: 'I would like to be able to speak Chinese', target: '我想要能够说中文' },
      { known: "I'm trying to be able to", target: '我在努力能够' },
      { known: 'to be able to explain what I mean', target: '能够解释我的意思' },
      { known: 'I would like to be able to remember', target: '我想要能够记住' },
      { known: "I'm not sure if I can be able to", target: '我不确定能不能够' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 12: I wouldn't like to guess what will happen tomorrow
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 12, idx: 1, type: 'A',
    known: "I wouldn't like", target: '我不想',
    phrases: [
      { known: "I wouldn't like", target: '我不想' },
      { known: "I wouldn't like to speak", target: '我不想说' },
      { known: "I wouldn't like to try", target: '我不想试' },
      { known: "I wouldn't like to explain", target: '我不想解释' },
      { known: "I wouldn't like to speak Chinese now", target: '我不想现在说中文' },
      { known: "I wouldn't like to practise today", target: '我不想今天练习' },
      { known: "I wouldn't like to speak with someone else", target: '我不想跟别人说' },
      { known: "I wouldn't like to try as hard as I can", target: '我不想尽力试' },
      { known: "I wouldn't like to remember", target: '我不想记住' }
    ]
  });

  await postLego({
    seed: 12, idx: 2, type: 'A',
    known: 'to guess', target: '猜',
    phrases: [
      { known: 'to guess', target: '猜' },
      { known: 'I want to guess', target: '我想猜' },
      { known: "I wouldn't like to guess", target: '我不想猜' },
      { known: "I'm trying to guess", target: '我在努力猜' },
      { known: 'to guess what I mean', target: '猜我的意思' },
      { known: "I don't want to guess", target: '我不想猜' },
      { known: "I'm going to guess", target: '我要猜' },
      { known: "I'm not sure if I can guess", target: '我不确定能不能猜' },
      { known: 'to try to guess', target: '试着猜' }
    ]
  });

  await postLego({
    seed: 12, idx: 3, type: 'A',
    known: 'what will happen', target: '会发生什么',
    phrases: [
      { known: 'what will happen', target: '会发生什么' },
      { known: 'to guess what will happen', target: '猜会发生什么' },
      { known: "I wouldn't like to guess what will happen", target: '我不想猜会发生什么' },
      { known: "I'm not sure what will happen", target: '我不确定会发生什么' },
      { known: 'I want to know what will happen', target: '我想知道会发生什么' },
      { known: "I'm trying to explain what will happen", target: '我在努力解释会发生什么' },
      { known: 'to remember what will happen', target: '记住会发生什么' },
      { known: "I don't know what will happen", target: '我不知道会发生什么' },
      { known: 'what will happen today', target: '今天会发生什么' }
    ]
  });

  await postLego({
    seed: 12, idx: 4, type: 'A',
    known: 'tomorrow', target: '明天',
    phrases: [
      { known: 'tomorrow', target: '明天' },
      { known: 'what will happen tomorrow', target: '明天会发生什么' },
      { known: "I wouldn't like to guess what will happen tomorrow", target: '我不想猜明天会发生什么' },
      { known: 'to practise tomorrow', target: '明天练习' },
      { known: "I'm going to speak Chinese tomorrow", target: '我要明天说中文' },
      { known: 'I want to try tomorrow', target: '我想明天试' },
      { known: 'to learn tomorrow', target: '明天学' },
      { known: "I'm not sure if I can speak tomorrow", target: '我不确定明天能不能说' },
      { known: "I would like to practise tomorrow", target: '我想要明天练习' },
      { known: 'to remember something tomorrow', target: '明天记住一些东西' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 13: you speak very well
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 13, idx: 1, type: 'A',
    known: 'you speak', target: '你说',
    phrases: [
      { known: 'you speak', target: '你说' },
      { known: 'you speak Chinese', target: '你说中文' },
      { known: 'you speak very well', target: '你说得很好' },
      { known: 'you speak Chinese very well', target: '你说中文说得很好' },
      { known: 'you speak with me', target: '你跟我说' },
      { known: 'you speak a little', target: '你说一点' },
      { known: 'you speak as often as possible', target: '你尽量多说' },
      { known: 'you speak now', target: '你现在说' },
      { known: 'you speak Chinese with someone else', target: '你跟别人说中文' }
    ]
  });

  await postLego({
    seed: 13, idx: 2, type: 'A',
    known: 'very well', target: '很好',
    phrases: [
      { known: 'very well', target: '很好' },
      { known: 'you speak very well', target: '你说得很好' },
      { known: 'I speak very well', target: '我说得很好' },
      { known: 'to speak Chinese very well', target: '中文说得很好' },
      { known: 'I want to speak very well', target: '我想说得很好' },
      { known: "I'm trying to speak very well", target: '我在努力说得很好' },
      { known: 'to explain very well', target: '解释得很好' },
      { known: 'I would like to speak Chinese very well', target: '我想要中文说得很好' },
      { known: 'to remember very well', target: '记住得很好' },
      { known: 'you practise very well', target: '你练习得很好' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 14: do you speak all day
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 14, idx: 1, type: 'A',
    known: 'do you speak', target: '你说吗',
    phrases: [
      { known: 'do you speak', target: '你说吗' },
      { known: 'do you speak Chinese', target: '你说中文吗' },
      { known: 'do you speak very well', target: '你说得很好吗' },
      { known: 'do you speak with someone else', target: '你跟别人说吗' },
      { known: 'do you speak Chinese very well', target: '你中文说得很好吗' },
      { known: 'do you speak now', target: '你现在说吗' },
      { known: 'do you speak a little Chinese', target: '你说一点中文吗' },
      { known: 'do you speak as often as possible', target: '你尽量多说吗' },
      { known: 'do you speak Chinese with you', target: '你跟你说中文吗' }
    ]
  });

  await postLego({
    seed: 14, idx: 2, type: 'A',
    known: 'all day', target: '一整天',
    phrases: [
      { known: 'all day', target: '一整天' },
      { known: 'to speak all day', target: '说一整天' },
      { known: 'do you speak all day', target: '你说一整天吗' },
      { known: 'I speak Chinese all day', target: '我说中文一整天' },
      { known: 'to practise all day', target: '练习一整天' },
      { known: 'I want to practise all day', target: '我想练习一整天' },
      { known: "I'm going to learn all day", target: '我要学一整天' },
      { known: 'to try all day', target: '试一整天' },
      { known: 'I would like to speak Chinese all day', target: '我想要说中文一整天' },
      { known: "I'm trying to remember all day", target: '我在努力记住一整天' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 15: and I want you to speak with me
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 15, idx: 1, type: 'A',
    known: 'and', target: '和',
    phrases: [
      { known: 'and', target: '和' },
      { known: 'you and I', target: '你和我' },
      { known: 'today and tomorrow', target: '今天和明天' },
      { known: 'to speak and learn', target: '说和学' },
      { known: 'I want to speak and learn', target: '我想说和学' },
      { known: 'Chinese and something else', target: '中文和别的东西' },
      { known: 'to try and practise', target: '试和练习' },
      { known: 'to remember and explain', target: '记住和解释' },
      { known: 'now and tomorrow', target: '现在和明天' }
    ]
  });

  await postLego({
    seed: 15, idx: 2, type: 'A',
    known: 'I want you to', target: '我想让你',
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
      { known: 'I want you to speak Chinese very well', target: '我想让你中文说得很好' }
    ]
  });

  await postLego({
    seed: 15, idx: 3, type: 'A',
    known: 'with me', target: '跟我',
    phrases: [
      { known: 'with me', target: '跟我' },
      { known: 'to speak with me', target: '跟我说' },
      { known: 'I want you to speak with me', target: '我想让你跟我说' },
      { known: 'to speak Chinese with me', target: '跟我说中文' },
      { known: 'to practise with me', target: '跟我练习' },
      { known: 'I want you to practise with me', target: '我想让你跟我练习' },
      { known: 'you speak with me', target: '你跟我说' },
      { known: 'do you speak with me', target: '你跟我说吗' },
      { known: 'to learn with me', target: '跟我学' },
      { known: 'I would like you to speak Chinese with me', target: '我想要让你跟我说中文' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 16: he wants to come back with everyone else later
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 16, idx: 1, type: 'A',
    known: 'he wants', target: '他想',
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
      { known: 'he wants to speak very well', target: '他想说得很好' }
    ]
  });

  await postLego({
    seed: 16, idx: 2, type: 'A',
    known: 'to come back', target: '回来',
    phrases: [
      { known: 'to come back', target: '回来' },
      { known: 'he wants to come back', target: '他想回来' },
      { known: 'I want to come back', target: '我想回来' },
      { known: "I'm going to come back", target: '我要回来' },
      { known: 'to come back tomorrow', target: '明天回来' },
      { known: 'I would like to come back', target: '我想要回来' },
      { known: 'to come back and speak', target: '回来说' },
      { known: 'he wants to come back and practise', target: '他想回来练习' },
      { known: "I'm not sure if I can come back", target: '我不确定能不能回来' }
    ]
  });

  await postLego({
    seed: 16, idx: 3, type: 'A',
    known: 'with everyone else', target: '跟大家',
    phrases: [
      { known: 'with everyone else', target: '跟大家' },
      { known: 'to speak with everyone else', target: '跟大家说' },
      { known: 'he wants to come back with everyone else', target: '他想跟大家回来' },
      { known: 'to practise with everyone else', target: '跟大家练习' },
      { known: 'I want to speak Chinese with everyone else', target: '我想跟大家说中文' },
      { known: 'to learn with everyone else', target: '跟大家学' },
      { known: "I'm going to practise with everyone else", target: '我要跟大家练习' },
      { known: 'he wants to speak with everyone else', target: '他想跟大家说' },
      { known: 'do you speak with everyone else', target: '你跟大家说吗' }
    ]
  });

  await postLego({
    seed: 16, idx: 4, type: 'A',
    known: 'later', target: '稍后',
    phrases: [
      { known: 'later', target: '稍后' },
      { known: 'to come back later', target: '稍后回来' },
      { known: 'he wants to come back later', target: '他想稍后回来' },
      { known: 'I want to speak later', target: '我想稍后说' },
      { known: 'to practise later', target: '稍后练习' },
      { known: "I'm going to try later", target: '我要稍后试' },
      { known: 'to speak Chinese later', target: '稍后说中文' },
      { known: 'he wants to come back with everyone else later', target: '他想稍后跟大家回来' },
      { known: 'I would like to explain later', target: '我想要稍后解释' },
      { known: "I'm not sure if I can come back later", target: '我不确定稍后能不能回来' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 17: she wants to find out what the answer is
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 17, idx: 1, type: 'A',
    known: 'she wants', target: '她想',
    phrases: [
      { known: 'she wants', target: '她想' },
      { known: 'she wants to speak', target: '她想说' },
      { known: 'she wants to speak Chinese', target: '她想说中文' },
      { known: 'she wants to learn', target: '她想学' },
      { known: 'she wants to try', target: '她想试' },
      { known: 'she wants to come back', target: '她想回来' },
      { known: 'she wants to practise', target: '她想练习' },
      { known: 'she wants to speak very well', target: '她想说得很好' },
      { known: 'she wants to be able to', target: '她想能够' },
      { known: 'he and she want', target: '他和她想' }
    ]
  });

  await postLego({
    seed: 17, idx: 2, type: 'A',
    known: 'to find out', target: '发现',
    phrases: [
      { known: 'to find out', target: '发现' },
      { known: 'she wants to find out', target: '她想发现' },
      { known: 'I want to find out', target: '我想发现' },
      { known: 'to find out what I mean', target: '发现我的意思' },
      { known: "I'm trying to find out", target: '我在努力发现' },
      { known: 'to find out what will happen', target: '发现会发生什么' },
      { known: 'he wants to find out', target: '他想发现' },
      { known: "I'm going to find out", target: '我要发现' },
      { known: 'to find out how to say', target: '发现怎么说' }
    ]
  });

  await postLego({
    seed: 17, idx: 3, type: 'A',
    known: 'what the answer is', target: '答案是什么',
    phrases: [
      { known: 'what the answer is', target: '答案是什么' },
      { known: 'to find out what the answer is', target: '发现答案是什么' },
      { known: 'she wants to find out what the answer is', target: '她想发现答案是什么' },
      { known: 'I want to know what the answer is', target: '我想知道答案是什么' },
      { known: "I'm not sure what the answer is", target: '我不确定答案是什么' },
      { known: 'to guess what the answer is', target: '猜答案是什么' },
      { known: 'to explain what the answer is', target: '解释答案是什么' },
      { known: 'he wants to find out what the answer is', target: '他想发现答案是什么' },
      { known: "I'm trying to find out what the answer is", target: '我在努力发现答案是什么' },
      { known: 'do you know what the answer is', target: '你知道答案是什么吗' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 18: we want to meet at six o'clock this evening
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 18, idx: 1, type: 'A',
    known: 'we want', target: '我们想',
    phrases: [
      { known: 'we want', target: '我们想' },
      { known: 'we want to speak', target: '我们想说' },
      { known: 'we want to speak Chinese', target: '我们想说中文' },
      { known: 'we want to learn', target: '我们想学' },
      { known: 'we want to try', target: '我们想试' },
      { known: 'we want to practise', target: '我们想练习' },
      { known: 'we want to come back', target: '我们想回来' },
      { known: 'we want to find out', target: '我们想发现' },
      { known: 'we want to speak very well', target: '我们想说得很好' },
      { known: 'we want to be able to', target: '我们想能够' }
    ]
  });

  await postLego({
    seed: 18, idx: 2, type: 'A',
    known: 'to meet', target: '见面',
    phrases: [
      { known: 'to meet', target: '见面' },
      { known: 'we want to meet', target: '我们想见面' },
      { known: 'I want to meet', target: '我想见面' },
      { known: 'to meet with you', target: '跟你见面' },
      { known: 'I want to meet with you', target: '我想跟你见面' },
      { known: 'to meet later', target: '稍后见面' },
      { known: 'we want to meet tomorrow', target: '我们想明天见面' },
      { known: 'he wants to meet', target: '他想见面' },
      { known: 'she wants to meet with everyone else', target: '她想跟大家见面' }
    ]
  });

  await postLego({
    seed: 18, idx: 3, type: 'A',
    known: "at six o'clock", target: '六点',
    phrases: [
      { known: "at six o'clock", target: '六点' },
      { known: "to meet at six o'clock", target: '六点见面' },
      { known: "we want to meet at six o'clock", target: '我们想六点见面' },
      { known: "I want to speak at six o'clock", target: '我想六点说' },
      { known: "to come back at six o'clock", target: '六点回来' },
      { known: "to practise at six o'clock", target: '六点练习' },
      { known: "I'm going to come back at six o'clock", target: '我要六点回来' },
      { known: "he wants to meet at six o'clock", target: '他想六点见面' },
      { known: "we want to meet at six o'clock tomorrow", target: '我们想明天六点见面' }
    ]
  });

  await postLego({
    seed: 18, idx: 4, type: 'A',
    known: 'this evening', target: '今晚',
    phrases: [
      { known: 'this evening', target: '今晚' },
      { known: 'to meet this evening', target: '今晚见面' },
      { known: "we want to meet at six o'clock this evening", target: '我们想今晚六点见面' },
      { known: 'to speak Chinese this evening', target: '今晚说中文' },
      { known: 'I want to practise this evening', target: '我想今晚练习' },
      { known: "I'm going to try this evening", target: '我要今晚试' },
      { known: 'to come back this evening', target: '今晚回来' },
      { known: 'he wants to meet this evening', target: '他想今晚见面' },
      { known: 'what will happen this evening', target: '今晚会发生什么' },
      { known: "I'm not sure if I can meet this evening", target: '我不确定今晚能不能见面' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 19: but I don't want to stop talking
  // ═══════════════════════════════════════════════════════════════

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
      { known: "but I wouldn't like", target: '但是我不想' },
      { known: 'but I want to try', target: '但是我想试' }
    ]
  });

  await postLego({
    seed: 19, idx: 2, type: 'A',
    known: "I don't want", target: '我不想',
    phrases: [
      { known: "I don't want", target: '我不想' },
      { known: "I don't want to speak", target: '我不想说' },
      { known: "I don't want to try", target: '我不想试' },
      { known: "I don't want to guess", target: '我不想猜' },
      { known: "I don't want to come back", target: '我不想回来' },
      { known: "I don't want to meet", target: '我不想见面' },
      { known: "but I don't want to", target: '但是我不想' },
      { known: "I don't want to speak Chinese now", target: '我不想现在说中文' },
      { known: "I don't want to explain", target: '我不想解释' }
    ]
  });

  await postLego({
    seed: 19, idx: 3, type: 'A',
    known: 'to stop', target: '停止',
    phrases: [
      { known: 'to stop', target: '停止' },
      { known: "I don't want to stop", target: '我不想停止' },
      { known: 'to stop speaking', target: '停止说' },
      { known: "I don't want to stop speaking", target: '我不想停止说' },
      { known: 'to stop learning', target: '停止学' },
      { known: 'to stop practising', target: '停止练习' },
      { known: "but I don't want to stop", target: '但是我不想停止' },
      { known: 'he wants to stop', target: '他想停止' },
      { known: "I wouldn't like to stop", target: '我不想停止' }
    ]
  });

  await postLego({
    seed: 19, idx: 4, type: 'A',
    known: 'talking', target: '说话',
    phrases: [
      { known: 'talking', target: '说话' },
      { known: 'to stop talking', target: '停止说话' },
      { known: "I don't want to stop talking", target: '我不想停止说话' },
      { known: "but I don't want to stop talking", target: '但是我不想停止说话' },
      { known: 'I like talking', target: '我喜欢说话' },
      { known: 'talking in Chinese', target: '用中文说话' },
      { known: 'to practise talking', target: '练习说话' },
      { known: "I'm trying to stop talking", target: '我在努力停止说话' },
      { known: 'talking with you', target: '跟你说话' },
      { known: 'talking with everyone else', target: '跟大家说话' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 20: you want to know his name quickly
  // ═══════════════════════════════════════════════════════════════

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
    seed: 20, idx: 2, type: 'A',
    known: 'to know', target: '知道',
    phrases: [
      { known: 'to know', target: '知道' },
      { known: 'you want to know', target: '你想知道' },
      { known: 'I want to know', target: '我想知道' },
      { known: 'to know what will happen', target: '知道会发生什么' },
      { known: 'to know what the answer is', target: '知道答案是什么' },
      { known: "I don't know", target: '我不知道' },
      { known: 'do you know', target: '你知道吗' },
      { known: 'he wants to know', target: '他想知道' },
      { known: 'I want to know how to say', target: '我想知道怎么说' }
    ]
  });

  await postLego({
    seed: 20, idx: 3, type: 'A',
    known: 'his name', target: '他的名字',
    phrases: [
      { known: 'his name', target: '他的名字' },
      { known: 'to know his name', target: '知道他的名字' },
      { known: 'you want to know his name', target: '你想知道他的名字' },
      { known: 'I want to know his name', target: '我想知道他的名字' },
      { known: 'do you know his name', target: '你知道他的名字吗' },
      { known: "I don't know his name", target: '我不知道他的名字' },
      { known: 'to remember his name', target: '记住他的名字' },
      { known: "I'm trying to remember his name", target: '我在努力记住他的名字' },
      { known: 'what is his name', target: '他的名字是什么' }
    ]
  });

  await postLego({
    seed: 20, idx: 4, type: 'A',
    known: 'quickly', target: '快',
    phrases: [
      { known: 'quickly', target: '快' },
      { known: 'to know his name quickly', target: '快知道他的名字' },
      { known: 'you want to know his name quickly', target: '你想快知道他的名字' },
      { known: 'to speak quickly', target: '快说' },
      { known: 'to learn quickly', target: '快学' },
      { known: 'I want to learn Chinese quickly', target: '我想快学中文' },
      { known: 'to come back quickly', target: '快回来' },
      { known: 'to find out quickly', target: '快发现' },
      { known: 'he wants to learn quickly', target: '他想快学' },
      { known: "I'm trying to remember quickly", target: '我在努力快记住' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // CHECKPOINT @ ~50 LEGOs (Seeds 11-20)
  // ═══════════════════════════════════════════════════════════════

  await checkpoint('Seeds 11-20 complete');

  console.log('Seeds 11-20 complete!');
}

main().catch(console.error);
