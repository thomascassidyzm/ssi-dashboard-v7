/**
 * Build Chinese (zho_for_eng) course - LEGOs with quality phrases
 */
const fetch = require('node-fetch');
require('dotenv').config();

const API = 'http://localhost:3471';
const COURSE_CODE = 'zho_for_eng';

// Track all LEGOs for phrase generation
const allLegos = [];

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
  allLegos.push(lego);
  return true;
}

async function getStats() {
  const res = await fetch(`${API}/api/stats/${COURSE_CODE}`);
  return res.json();
}

async function checkpoint(legoCount) {
  const stats = await getStats();
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║  CHECKPOINT @ ${legoCount} LEGOs`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  LEGOs: ${stats.legos}  Phrases: ${stats.phrases}  Ratio: ${stats.ratio}`);
  console.log(`║  Quality: ${stats.quality}`);
  console.log('╚══════════════════════════════════════════════════╝\n');
  return stats;
}

async function main() {
  console.log('Building Chinese course (zho_for_eng)...\n');

  // ═══════════════════════════════════════════════════════════════
  // SEED 1: I want to speak Chinese with you now
  // ═══════════════════════════════════════════════════════════════

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
      { known: 'I want to speak Chinese', target: '我想说中文' },
      { known: 'to speak Chinese', target: '说中文' }
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
      { known: 'to speak now', target: '现在说' },
      { known: 'I want to speak now', target: '我想现在说' },
      { known: 'to speak Chinese now', target: '现在说中文' },
      { known: 'I want to speak Chinese now', target: '我想现在说中文' },
      { known: 'to speak with you now', target: '现在跟你说' },
      { known: 'I want to speak with you now', target: '我想现在跟你说' },
      { known: 'to speak Chinese with you now', target: '现在跟你说中文' },
      { known: 'I want to speak Chinese with you now', target: '我想现在跟你说中文' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 2: I'm trying to learn
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 2, idx: 1, type: 'A',
    known: "I'm trying", target: '我在努力',
    phrases: [
      { known: "I'm trying", target: '我在努力' },
      { known: "I'm trying to speak", target: '我在努力说' },
      { known: "I'm trying to speak Chinese", target: '我在努力说中文' },
      { known: "I'm trying to speak with you", target: '我在努力跟你说' },
      { known: "I'm trying to speak now", target: '我在努力现在说' },
      { known: "I'm trying to speak Chinese with you", target: '我在努力跟你说中文' },
      { known: "I'm trying to speak Chinese now", target: '我在努力现在说中文' },
      { known: "I'm trying to speak Chinese with you now", target: '我在努力现在跟你说中文' }
    ]
  });

  await postLego({
    seed: 2, idx: 2, type: 'A',
    known: 'to learn', target: '学',
    phrases: [
      { known: 'to learn', target: '学' },
      { known: "I'm trying to learn", target: '我在努力学' },
      { known: 'I want to learn', target: '我想学' },
      { known: 'to learn Chinese', target: '学中文' },
      { known: "I'm trying to learn Chinese", target: '我在努力学中文' },
      { known: 'I want to learn Chinese', target: '我想学中文' },
      { known: 'I want to learn now', target: '我想现在学' },
      { known: "I'm trying to learn Chinese now", target: '我在努力现在学中文' },
      { known: 'I want to learn Chinese with you', target: '我想跟你学中文' },
      { known: "I'm trying to learn to speak Chinese", target: '我在努力学说中文' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 3: how to speak as often as possible
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 3, idx: 1, type: 'A',
    known: 'how to speak', target: '怎么说',
    phrases: [
      { known: 'how to speak', target: '怎么说' },
      { known: 'how to speak Chinese', target: '怎么说中文' },
      { known: 'I want to learn how to speak', target: '我想学怎么说' },
      { known: 'I want to learn how to speak Chinese', target: '我想学怎么说中文' },
      { known: "I'm trying to learn how to speak", target: '我在努力学怎么说' },
      { known: "I'm trying to learn how to speak Chinese", target: '我在努力学怎么说中文' },
      { known: 'how to speak with you', target: '怎么跟你说' },
      { known: 'I want to learn how to speak Chinese with you', target: '我想学怎么跟你说中文' }
    ]
  });

  await postLego({
    seed: 3, idx: 2, type: 'A',
    known: 'as often as possible', target: '尽量多',
    phrases: [
      { known: 'as often as possible', target: '尽量多' },
      { known: 'to speak as often as possible', target: '尽量多说' },
      { known: 'to speak Chinese as often as possible', target: '尽量多说中文' },
      { known: 'I want to speak as often as possible', target: '我想尽量多说' },
      { known: 'I want to speak Chinese as often as possible', target: '我想尽量多说中文' },
      { known: "I'm trying to speak as often as possible", target: '我在努力尽量多说' },
      { known: 'to learn as often as possible', target: '尽量多学' },
      { known: 'I want to learn Chinese as often as possible', target: '我想尽量多学中文' },
      { known: "I'm trying to learn as often as possible", target: '我在努力尽量多学' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 4: how to say something in Chinese
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 4, idx: 1, type: 'A',
    known: 'something', target: '一些东西',
    phrases: [
      { known: 'something', target: '一些东西' },
      { known: 'to say something', target: '说一些东西' },
      { known: 'I want to say something', target: '我想说一些东西' },
      { known: 'to learn something', target: '学一些东西' },
      { known: 'I want to learn something', target: '我想学一些东西' },
      { known: "I'm trying to say something", target: '我在努力说一些东西' },
      { known: "I'm trying to learn something", target: '我在努力学一些东西' },
      { known: 'to say something now', target: '现在说一些东西' }
    ]
  });

  await postLego({
    seed: 4, idx: 2, type: 'A',
    known: 'to say', target: '说',
    phrases: [
      { known: 'to say', target: '说' },
      { known: 'I want to say', target: '我想说' },
      { known: "I'm trying to say", target: '我在努力说' },
      { known: 'how to say', target: '怎么说' },
      { known: 'I want to learn how to say', target: '我想学怎么说' },
      { known: 'to say something in Chinese', target: '用中文说一些东西' },
      { known: 'I want to say something now', target: '我想现在说一些东西' },
      { known: "I'm trying to say something in Chinese", target: '我在努力用中文说一些东西' }
    ]
  });

  await postLego({
    seed: 4, idx: 3, type: 'A',
    known: 'in Chinese', target: '用中文',
    phrases: [
      { known: 'in Chinese', target: '用中文' },
      { known: 'to speak in Chinese', target: '用中文说' },
      { known: 'to say something in Chinese', target: '用中文说一些东西' },
      { known: 'I want to speak in Chinese', target: '我想用中文说' },
      { known: 'I want to say something in Chinese', target: '我想用中文说一些东西' },
      { known: "I'm trying to speak in Chinese", target: '我在努力用中文说' },
      { known: 'how to say something in Chinese', target: '怎么用中文说一些东西' },
      { known: 'I want to learn how to say something in Chinese', target: '我想学怎么用中文说一些东西' },
      { known: "I'm trying to say something in Chinese now", target: '我在努力现在用中文说一些东西' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 5: I'm going to practise with someone else
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 5, idx: 1, type: 'A',
    known: "I'm going to", target: '我要',
    phrases: [
      { known: "I'm going to", target: '我要' },
      { known: "I'm going to speak", target: '我要说' },
      { known: "I'm going to speak Chinese", target: '我要说中文' },
      { known: "I'm going to learn", target: '我要学' },
      { known: "I'm going to learn Chinese", target: '我要学中文' },
      { known: "I'm going to say something", target: '我要说一些东西' },
      { known: "I'm going to speak with you", target: '我要跟你说' },
      { known: "I'm going to learn how to speak Chinese", target: '我要学怎么说中文' },
      { known: "I'm going to say something in Chinese", target: '我要用中文说一些东西' }
    ]
  });

  await postLego({
    seed: 5, idx: 2, type: 'A',
    known: 'to practise', target: '练习',
    phrases: [
      { known: 'to practise', target: '练习' },
      { known: 'I want to practise', target: '我想练习' },
      { known: "I'm going to practise", target: '我要练习' },
      { known: "I'm trying to practise", target: '我在努力练习' },
      { known: 'to practise speaking', target: '练习说' },
      { known: 'to practise speaking Chinese', target: '练习说中文' },
      { known: 'I want to practise speaking Chinese', target: '我想练习说中文' },
      { known: "I'm going to practise speaking Chinese", target: '我要练习说中文' },
      { known: 'to practise as often as possible', target: '尽量多练习' },
      { known: 'I want to practise speaking Chinese with you', target: '我想跟你练习说中文' }
    ]
  });

  await postLego({
    seed: 5, idx: 3, type: 'A',
    known: 'with someone else', target: '跟别人',
    phrases: [
      { known: 'with someone else', target: '跟别人' },
      { known: 'to speak with someone else', target: '跟别人说' },
      { known: 'to practise with someone else', target: '跟别人练习' },
      { known: 'I want to speak with someone else', target: '我想跟别人说' },
      { known: "I'm going to practise with someone else", target: '我要跟别人练习' },
      { known: 'to speak Chinese with someone else', target: '跟别人说中文' },
      { known: 'I want to practise with someone else', target: '我想跟别人练习' },
      { known: "I'm trying to speak with someone else", target: '我在努力跟别人说' },
      { known: "I'm going to practise speaking Chinese with someone else", target: '我要跟别人练习说中文' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 6: trying to remember a word
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 6, idx: 1, type: 'A',
    known: 'to remember', target: '记住',
    phrases: [
      { known: 'to remember', target: '记住' },
      { known: 'I want to remember', target: '我想记住' },
      { known: "I'm trying to remember", target: '我在努力记住' },
      { known: 'trying to remember', target: '努力记住' },
      { known: 'to remember something', target: '记住一些东西' },
      { known: 'I want to remember how to say', target: '我想记住怎么说' },
      { known: "I'm trying to remember how to say something", target: '我在努力记住怎么说一些东西' },
      { known: "I'm going to remember", target: '我要记住' }
    ]
  });

  await postLego({
    seed: 6, idx: 2, type: 'A',
    known: 'a word', target: '一个词',
    phrases: [
      { known: 'a word', target: '一个词' },
      { known: 'to remember a word', target: '记住一个词' },
      { known: 'I want to remember a word', target: '我想记住一个词' },
      { known: "I'm trying to remember a word", target: '我在努力记住一个词' },
      { known: 'to learn a word', target: '学一个词' },
      { known: 'I want to learn a word', target: '我想学一个词' },
      { known: 'a word in Chinese', target: '一个中文词' },
      { known: 'to say a word', target: '说一个词' },
      { known: 'I want to remember a word in Chinese', target: '我想记住一个中文词' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 7: I want to try as hard as I can today
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 7, idx: 1, type: 'A',
    known: 'to try', target: '试',
    phrases: [
      { known: 'to try', target: '试' },
      { known: 'I want to try', target: '我想试' },
      { known: "I'm going to try", target: '我要试' },
      { known: 'to try to speak', target: '试着说' },
      { known: 'I want to try to speak Chinese', target: '我想试着说中文' },
      { known: "I'm going to try to remember", target: '我要试着记住' },
      { known: 'to try to say something', target: '试着说一些东西' },
      { known: 'I want to try to practise', target: '我想试着练习' },
      { known: "I'm trying to try as often as possible", target: '我在努力尽量多试' }
    ]
  });

  await postLego({
    seed: 7, idx: 2, type: 'A',
    known: 'as hard as I can', target: '尽力',
    phrases: [
      { known: 'as hard as I can', target: '尽力' },
      { known: 'to try as hard as I can', target: '尽力试' },
      { known: 'I want to try as hard as I can', target: '我想尽力试' },
      { known: "I'm going to try as hard as I can", target: '我要尽力试' },
      { known: "I'm trying as hard as I can", target: '我在尽力努力' },
      { known: 'to practise as hard as I can', target: '尽力练习' },
      { known: 'I want to learn as hard as I can', target: '我想尽力学' },
      { known: "I'm going to practise as hard as I can", target: '我要尽力练习' },
      { known: 'to speak Chinese as hard as I can', target: '尽力说中文' }
    ]
  });

  await postLego({
    seed: 7, idx: 3, type: 'A',
    known: 'today', target: '今天',
    phrases: [
      { known: 'today', target: '今天' },
      { known: 'to speak today', target: '今天说' },
      { known: 'I want to try today', target: '我想今天试' },
      { known: "I'm going to practise today", target: '我要今天练习' },
      { known: 'to learn Chinese today', target: '今天学中文' },
      { known: 'I want to speak Chinese today', target: '我想今天说中文' },
      { known: "I'm trying to remember a word today", target: '我在努力今天记住一个词' },
      { known: 'I want to try as hard as I can today', target: '我想今天尽力试' },
      { known: "I'm going to practise speaking Chinese today", target: '我要今天练习说中文' },
      { known: 'to practise with someone else today', target: '今天跟别人练习' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 8: I'm going to try to explain what I mean
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 8, idx: 1, type: 'A',
    known: 'to explain', target: '解释',
    phrases: [
      { known: 'to explain', target: '解释' },
      { known: 'I want to explain', target: '我想解释' },
      { known: "I'm trying to explain", target: '我在努力解释' },
      { known: "I'm going to explain", target: '我要解释' },
      { known: 'to try to explain', target: '试着解释' },
      { known: 'I want to try to explain', target: '我想试着解释' },
      { known: 'to explain something', target: '解释一些东西' },
      { known: "I'm going to try to explain", target: '我要试着解释' },
      { known: 'to explain in Chinese', target: '用中文解释' }
    ]
  });

  await postLego({
    seed: 8, idx: 2, type: 'A',
    known: 'what I mean', target: '我的意思',
    phrases: [
      { known: 'what I mean', target: '我的意思' },
      { known: 'to explain what I mean', target: '解释我的意思' },
      { known: 'I want to explain what I mean', target: '我想解释我的意思' },
      { known: "I'm trying to explain what I mean", target: '我在努力解释我的意思' },
      { known: "I'm going to explain what I mean", target: '我要解释我的意思' },
      { known: 'to say what I mean', target: '说我的意思' },
      { known: 'I want to say what I mean', target: '我想说我的意思' },
      { known: "I'm trying to say what I mean in Chinese", target: '我在努力用中文说我的意思' },
      { known: 'how to explain what I mean', target: '怎么解释我的意思' },
      { known: 'I want to learn how to explain what I mean', target: '我想学怎么解释我的意思' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 9: I speak a little Chinese
  // ═══════════════════════════════════════════════════════════════

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
    seed: 9, idx: 2, type: 'A',
    known: 'a little', target: '一点',
    phrases: [
      { known: 'a little', target: '一点' },
      { known: 'a little Chinese', target: '一点中文' },
      { known: 'I speak a little', target: '我说一点' },
      { known: 'I speak a little Chinese', target: '我说一点中文' },
      { known: 'to learn a little', target: '学一点' },
      { known: 'I want to learn a little Chinese', target: '我想学一点中文' },
      { known: "I'm trying to remember a little", target: '我在努力记住一点' },
      { known: 'to say a little something', target: '说一点东西' },
      { known: 'I know a little', target: '我知道一点' },
      { known: 'to practise a little today', target: '今天练习一点' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 10: I'm not sure if I can remember
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 10, idx: 1, type: 'A',
    known: "I'm not sure", target: '我不确定',
    phrases: [
      { known: "I'm not sure", target: '我不确定' },
      { known: "I'm not sure if I can", target: '我不确定能不能' },
      { known: "I'm not sure how to say", target: '我不确定怎么说' },
      { known: "I'm not sure how to explain", target: '我不确定怎么解释' },
      { known: "I'm not sure what I mean", target: '我不确定我的意思' },
      { known: "I'm not sure if I can remember", target: '我不确定能不能记住' },
      { known: "I'm not sure how to say it in Chinese", target: '我不确定怎么用中文说' },
      { known: "I'm not sure if I can speak Chinese", target: '我不确定能不能说中文' },
      { known: "I'm not sure if I can try today", target: '我不确定今天能不能试' }
    ]
  });

  await postLego({
    seed: 10, idx: 2, type: 'A',
    known: 'if I can', target: '能不能',
    phrases: [
      { known: 'if I can', target: '能不能' },
      { known: 'if I can speak', target: '能不能说' },
      { known: 'if I can remember', target: '能不能记住' },
      { known: 'if I can learn', target: '能不能学' },
      { known: 'if I can try', target: '能不能试' },
      { known: 'if I can explain', target: '能不能解释' },
      { known: "I'm not sure if I can speak Chinese", target: '我不确定能不能说中文' },
      { known: "I'm not sure if I can remember a word", target: '我不确定能不能记住一个词' },
      { known: 'if I can practise today', target: '今天能不能练习' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // CHECKPOINT @ ~23 LEGOs
  // ═══════════════════════════════════════════════════════════════

  await checkpoint(23);

  console.log('First 10 seeds complete. Ready for more!');
}

main().catch(console.error);
