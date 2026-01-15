/**
 * Build Chinese (zho_for_eng) course - Part 3 (Seeds 21-30)
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
  console.log('Building Chinese course - Part 3 (Seeds 21-30)...\n');

  // ═══════════════════════════════════════════════════════════════
  // SEED 21: why are you learning her name
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 21, idx: 1, type: 'A',
    known: 'why', target: '为什么',
    phrases: [
      { known: 'why', target: '为什么' },
      { known: 'why do you want', target: '你为什么想' },
      { known: 'why do you speak', target: '你为什么说' },
      { known: 'why are you learning', target: '你为什么在学' },
      { known: 'why does he want', target: '他为什么想' },
      { known: 'why does she want', target: '她为什么想' },
      { known: "why don't you want", target: '你为什么不想' },
      { known: 'why do you want to stop', target: '你为什么想停止' },
      { known: 'why do you want to know', target: '你为什么想知道' }
    ]
  });

  await postLego({
    seed: 21, idx: 2, type: 'A',
    known: 'are you learning', target: '你在学',
    phrases: [
      { known: 'are you learning', target: '你在学' },
      { known: 'are you learning Chinese', target: '你在学中文' },
      { known: 'why are you learning', target: '你为什么在学' },
      { known: 'why are you learning Chinese', target: '你为什么在学中文' },
      { known: 'are you learning how to speak', target: '你在学怎么说' },
      { known: 'are you learning to speak Chinese', target: '你在学说中文' },
      { known: 'are you learning a word', target: '你在学一个词' },
      { known: 'are you learning quickly', target: '你在快学' },
      { known: 'are you learning with someone else', target: '你在跟别人学' }
    ]
  });

  await postLego({
    seed: 21, idx: 3, type: 'A',
    known: 'her name', target: '她的名字',
    phrases: [
      { known: 'her name', target: '她的名字' },
      { known: 'why are you learning her name', target: '你为什么在学她的名字' },
      { known: 'do you know her name', target: '你知道她的名字吗' },
      { known: 'I want to know her name', target: '我想知道她的名字' },
      { known: "I don't know her name", target: '我不知道她的名字' },
      { known: 'to remember her name', target: '记住她的名字' },
      { known: "I'm trying to remember her name", target: '我在努力记住她的名字' },
      { known: 'his name and her name', target: '他的名字和她的名字' },
      { known: 'what is her name', target: '她的名字是什么' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 22: because people who speak Chinese
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 22, idx: 1, type: 'A',
    known: 'because', target: '因为',
    phrases: [
      { known: 'because', target: '因为' },
      { known: 'because I want', target: '因为我想' },
      { known: 'because I want to learn', target: '因为我想学' },
      { known: "because I don't know", target: '因为我不知道' },
      { known: 'because he wants', target: '因为他想' },
      { known: 'because she wants', target: '因为她想' },
      { known: 'because we want', target: '因为我们想' },
      { known: "because I'm trying", target: '因为我在努力' },
      { known: "because I'm not sure", target: '因为我不确定' }
    ]
  });

  await postLego({
    seed: 22, idx: 2, type: 'A',
    known: 'people', target: '人',
    phrases: [
      { known: 'people', target: '人' },
      { known: 'people who speak', target: '说话的人' },
      { known: 'people who speak Chinese', target: '说中文的人' },
      { known: 'people who learn', target: '学习的人' },
      { known: 'people who want', target: '想要的人' },
      { known: 'some people', target: '一些人' },
      { known: 'a lot of people', target: '很多人' },
      { known: 'people who know', target: '知道的人' },
      { known: 'people who want to learn Chinese', target: '想学中文的人' }
    ]
  });

  await postLego({
    seed: 22, idx: 3, type: 'A',
    known: 'who speak Chinese', target: '说中文的',
    phrases: [
      { known: 'who speak Chinese', target: '说中文的' },
      { known: 'people who speak Chinese', target: '说中文的人' },
      { known: 'because people who speak Chinese', target: '因为说中文的人' },
      { known: 'someone who speaks Chinese', target: '说中文的人' },
      { known: 'I want to meet people who speak Chinese', target: '我想见说中文的人' },
      { known: 'do you know anyone who speaks Chinese', target: '你认识说中文的人吗' },
      { known: 'he wants to meet people who speak Chinese', target: '他想见说中文的人' },
      { known: 'people who speak Chinese very well', target: '中文说得很好的人' },
      { known: 'why do people who speak Chinese', target: '说中文的人为什么' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 23: to start more soon
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 23, idx: 1, type: 'A',
    known: 'to start', target: '开始',
    phrases: [
      { known: 'to start', target: '开始' },
      { known: 'I want to start', target: '我想开始' },
      { known: 'to start learning', target: '开始学' },
      { known: 'to start speaking Chinese', target: '开始说中文' },
      { known: "I'm going to start", target: '我要开始' },
      { known: 'to start practising', target: '开始练习' },
      { known: 'when to start', target: '什么时候开始' },
      { known: 'I would like to start', target: '我想要开始' },
      { known: 'to start and stop', target: '开始和停止' }
    ]
  });

  await postLego({
    seed: 23, idx: 2, type: 'A',
    known: 'more', target: '更多',
    phrases: [
      { known: 'more', target: '更多' },
      { known: 'to learn more', target: '学更多' },
      { known: 'I want to learn more', target: '我想学更多' },
      { known: 'to speak more', target: '说更多' },
      { known: 'to practise more', target: '练习更多' },
      { known: 'more people', target: '更多人' },
      { known: 'to know more', target: '知道更多' },
      { known: 'I want to start learning more', target: '我想开始学更多' },
      { known: 'more Chinese', target: '更多中文' },
      { known: 'to remember more', target: '记住更多' }
    ]
  });

  await postLego({
    seed: 23, idx: 3, type: 'A',
    known: 'soon', target: '很快',
    phrases: [
      { known: 'soon', target: '很快' },
      { known: 'to start soon', target: '很快开始' },
      { known: 'I want to start soon', target: '我想很快开始' },
      { known: 'to learn more soon', target: '很快学更多' },
      { known: "I'm going to come back soon", target: '我要很快回来' },
      { known: 'to meet soon', target: '很快见面' },
      { known: 'we want to meet soon', target: '我们想很快见面' },
      { known: 'to speak Chinese soon', target: '很快说中文' },
      { known: 'I would like to start more soon', target: '我想要很快开始更多' },
      { known: 'to find out soon', target: '很快发现' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 24: I'm not going to stop easily
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 24, idx: 1, type: 'A',
    known: "I'm not going to", target: '我不会',
    phrases: [
      { known: "I'm not going to", target: '我不会' },
      { known: "I'm not going to stop", target: '我不会停止' },
      { known: "I'm not going to speak", target: '我不会说' },
      { known: "I'm not going to try", target: '我不会试' },
      { known: "I'm not going to guess", target: '我不会猜' },
      { known: "I'm not going to come back", target: '我不会回来' },
      { known: "I'm not going to meet", target: '我不会见面' },
      { known: "I'm not going to start", target: '我不会开始' },
      { known: "I'm not going to stop learning", target: '我不会停止学' }
    ]
  });

  await postLego({
    seed: 24, idx: 2, type: 'A',
    known: 'easily', target: '容易',
    phrases: [
      { known: 'easily', target: '容易' },
      { known: 'to stop easily', target: '容易停止' },
      { known: "I'm not going to stop easily", target: '我不会容易停止' },
      { known: 'to learn easily', target: '容易学' },
      { known: 'to speak easily', target: '容易说' },
      { known: 'to remember easily', target: '容易记住' },
      { known: 'Chinese is not easily', target: '中文不容易' },
      { known: 'to understand easily', target: '容易理解' },
      { known: "I can't learn easily", target: '我不能容易学' },
      { known: 'to start easily', target: '容易开始' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 25: are you going to help before I have to go
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 25, idx: 1, type: 'A',
    known: 'are you going to', target: '你会',
    phrases: [
      { known: 'are you going to', target: '你会' },
      { known: 'are you going to speak', target: '你会说' },
      { known: 'are you going to learn', target: '你会学' },
      { known: 'are you going to try', target: '你会试' },
      { known: 'are you going to come back', target: '你会回来' },
      { known: 'are you going to start', target: '你会开始' },
      { known: 'are you going to stop', target: '你会停止' },
      { known: 'are you going to help', target: '你会帮' },
      { known: 'are you going to meet us', target: '你会见我们' }
    ]
  });

  await postLego({
    seed: 25, idx: 2, type: 'A',
    known: 'to help', target: '帮',
    phrases: [
      { known: 'to help', target: '帮' },
      { known: 'are you going to help', target: '你会帮' },
      { known: 'I want to help', target: '我想帮' },
      { known: 'to help me', target: '帮我' },
      { known: 'can you help', target: '你能帮吗' },
      { known: 'he wants to help', target: '他想帮' },
      { known: 'to help learn', target: '帮学' },
      { known: "I'm trying to help", target: '我在努力帮' },
      { known: 'to help speak Chinese', target: '帮说中文' }
    ]
  });

  await postLego({
    seed: 25, idx: 3, type: 'A',
    known: 'before I have to go', target: '在我必须走之前',
    phrases: [
      { known: 'before I have to go', target: '在我必须走之前' },
      { known: 'are you going to help before I have to go', target: '你会在我必须走之前帮吗' },
      { known: 'I want to learn before I have to go', target: '我想在我必须走之前学' },
      { known: 'to speak Chinese before I have to go', target: '在我必须走之前说中文' },
      { known: 'to start before I have to go', target: '在我必须走之前开始' },
      { known: 'can you help before I have to go', target: '你能在我必须走之前帮吗' },
      { known: 'to practise before I have to go', target: '在我必须走之前练习' },
      { known: "I'm trying to learn before I have to go", target: '我在努力在我必须走之前学' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 26: I like feeling as if I'm nearly ready
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 26, idx: 1, type: 'A',
    known: 'I like', target: '我喜欢',
    phrases: [
      { known: 'I like', target: '我喜欢' },
      { known: 'I like speaking', target: '我喜欢说' },
      { known: 'I like speaking Chinese', target: '我喜欢说中文' },
      { known: 'I like learning', target: '我喜欢学' },
      { known: 'I like talking', target: '我喜欢说话' },
      { known: 'I like people who speak Chinese', target: '我喜欢说中文的人' },
      { known: 'I like to practise', target: '我喜欢练习' },
      { known: 'I like to help', target: '我喜欢帮' },
      { known: 'I like to start soon', target: '我喜欢很快开始' }
    ]
  });

  await postLego({
    seed: 26, idx: 2, type: 'A',
    known: 'feeling', target: '感觉',
    phrases: [
      { known: 'feeling', target: '感觉' },
      { known: 'I like feeling', target: '我喜欢感觉' },
      { known: 'the feeling', target: '感觉' },
      { known: 'a good feeling', target: '好感觉' },
      { known: "I'm feeling", target: '我感觉' },
      { known: "I don't like feeling", target: '我不喜欢感觉' },
      { known: 'feeling very well', target: '感觉很好' },
      { known: 'the feeling of learning', target: '学的感觉' },
      { known: 'I like the feeling of speaking Chinese', target: '我喜欢说中文的感觉' }
    ]
  });

  await postLego({
    seed: 26, idx: 3, type: 'A',
    known: 'as if', target: '好像',
    phrases: [
      { known: 'as if', target: '好像' },
      { known: 'feeling as if', target: '感觉好像' },
      { known: 'I like feeling as if', target: '我喜欢感觉好像' },
      { known: 'as if I can', target: '好像我能' },
      { known: 'as if I know', target: '好像我知道' },
      { known: "as if I'm learning", target: '好像我在学' },
      { known: 'as if he wants', target: '好像他想' },
      { known: 'it feels as if', target: '感觉好像' },
      { known: 'as if I can speak Chinese', target: '好像我能说中文' }
    ]
  });

  await postLego({
    seed: 26, idx: 4, type: 'A',
    known: "I'm nearly ready", target: '我快准备好了',
    phrases: [
      { known: "I'm nearly ready", target: '我快准备好了' },
      { known: "as if I'm nearly ready", target: '好像我快准备好了' },
      { known: "I like feeling as if I'm nearly ready", target: '我喜欢感觉好像我快准备好了' },
      { known: "I'm nearly ready to speak", target: '我快准备好说了' },
      { known: "I'm nearly ready to start", target: '我快准备好开始了' },
      { known: "I'm nearly ready to help", target: '我快准备好帮了' },
      { known: "are you nearly ready", target: '你快准备好了吗' },
      { known: "he's nearly ready", target: '他快准备好了' },
      { known: "we're nearly ready", target: '我们快准备好了' },
      { known: "I'm nearly ready to speak Chinese", target: '我快准备好说中文了' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 27: I don't like taking too much time to answer
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 27, idx: 1, type: 'A',
    known: "I don't like", target: '我不喜欢',
    phrases: [
      { known: "I don't like", target: '我不喜欢' },
      { known: "I don't like speaking", target: '我不喜欢说' },
      { known: "I don't like waiting", target: '我不喜欢等' },
      { known: "I don't like feeling", target: '我不喜欢感觉' },
      { known: "I don't like stopping", target: '我不喜欢停止' },
      { known: "I don't like guessing", target: '我不喜欢猜' },
      { known: "I don't like talking", target: '我不喜欢说话' },
      { known: "I don't like people who", target: '我不喜欢...的人' },
      { known: "I don't like the feeling", target: '我不喜欢感觉' }
    ]
  });

  await postLego({
    seed: 27, idx: 2, type: 'A',
    known: 'taking', target: '花',
    phrases: [
      { known: 'taking', target: '花' },
      { known: 'taking time', target: '花时间' },
      { known: "I don't like taking", target: '我不喜欢花' },
      { known: 'taking a long time', target: '花很长时间' },
      { known: "I'm taking time", target: '我在花时间' },
      { known: 'taking time to learn', target: '花时间学' },
      { known: 'taking time to speak', target: '花时间说' },
      { known: 'why are you taking', target: '你为什么花' },
      { known: 'taking time to start', target: '花时间开始' }
    ]
  });

  await postLego({
    seed: 27, idx: 3, type: 'A',
    known: 'too much time', target: '太多时间',
    phrases: [
      { known: 'too much time', target: '太多时间' },
      { known: 'taking too much time', target: '花太多时间' },
      { known: "I don't like taking too much time", target: '我不喜欢花太多时间' },
      { known: "I'm taking too much time", target: '我在花太多时间' },
      { known: 'too much time to learn', target: '太多时间学' },
      { known: "don't take too much time", target: '不要花太多时间' },
      { known: 'it takes too much time', target: '花太多时间' },
      { known: 'too much time to start', target: '太多时间开始' },
      { known: 'why are you taking too much time', target: '你为什么花太多时间' }
    ]
  });

  await postLego({
    seed: 27, idx: 4, type: 'A',
    known: 'to answer', target: '回答',
    phrases: [
      { known: 'to answer', target: '回答' },
      { known: 'to answer quickly', target: '快回答' },
      { known: 'taking too much time to answer', target: '花太多时间回答' },
      { known: "I don't like taking too much time to answer", target: '我不喜欢花太多时间回答' },
      { known: 'I want to answer', target: '我想回答' },
      { known: "I'm trying to answer", target: '我在努力回答' },
      { known: 'to answer in Chinese', target: '用中文回答' },
      { known: 'can you answer', target: '你能回答吗' },
      { known: 'how to answer', target: '怎么回答' },
      { known: 'I would like to answer', target: '我想要回答' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 28: it's useful to start as soon as you can
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 28, idx: 1, type: 'A',
    known: "it's useful", target: '有用',
    phrases: [
      { known: "it's useful", target: '有用' },
      { known: "it's useful to learn", target: '学有用' },
      { known: "it's useful to speak Chinese", target: '说中文有用' },
      { known: "it's useful to know", target: '知道有用' },
      { known: "it's useful to start", target: '开始有用' },
      { known: "it's useful to practise", target: '练习有用' },
      { known: "it's useful to help", target: '帮有用' },
      { known: "it's very useful", target: '很有用' },
      { known: "I think it's useful", target: '我觉得有用' }
    ]
  });

  await postLego({
    seed: 28, idx: 2, type: 'A',
    known: 'as soon as you can', target: '尽快',
    phrases: [
      { known: 'as soon as you can', target: '尽快' },
      { known: 'to start as soon as you can', target: '尽快开始' },
      { known: "it's useful to start as soon as you can", target: '尽快开始有用' },
      { known: 'to learn as soon as you can', target: '尽快学' },
      { known: 'to speak as soon as you can', target: '尽快说' },
      { known: 'to come back as soon as you can', target: '尽快回来' },
      { known: 'I want to start as soon as I can', target: '我想尽快开始' },
      { known: 'please answer as soon as you can', target: '请尽快回答' },
      { known: 'to help as soon as you can', target: '尽快帮' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 29: I'm looking forward to getting better as soon as I can
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 29, idx: 1, type: 'A',
    known: "I'm looking forward to", target: '我期待',
    phrases: [
      { known: "I'm looking forward to", target: '我期待' },
      { known: "I'm looking forward to speaking", target: '我期待说' },
      { known: "I'm looking forward to learning", target: '我期待学' },
      { known: "I'm looking forward to meeting", target: '我期待见面' },
      { known: "I'm looking forward to starting", target: '我期待开始' },
      { known: "I'm looking forward to practising", target: '我期待练习' },
      { known: "I'm looking forward to coming back", target: '我期待回来' },
      { known: "I'm looking forward to speaking Chinese", target: '我期待说中文' },
      { known: "I'm looking forward to tomorrow", target: '我期待明天' }
    ]
  });

  await postLego({
    seed: 29, idx: 2, type: 'A',
    known: 'getting better', target: '变好',
    phrases: [
      { known: 'getting better', target: '变好' },
      { known: "I'm looking forward to getting better", target: '我期待变好' },
      { known: "I'm getting better", target: '我在变好' },
      { known: 'getting better at speaking', target: '说得变好' },
      { known: 'getting better at Chinese', target: '中文变好' },
      { known: 'I want to get better', target: '我想变好' },
      { known: "I'm trying to get better", target: '我在努力变好' },
      { known: 'getting better soon', target: '很快变好' },
      { known: 'getting better quickly', target: '快变好' }
    ]
  });

  await postLego({
    seed: 29, idx: 3, type: 'A',
    known: 'as soon as I can', target: '我尽快',
    phrases: [
      { known: 'as soon as I can', target: '我尽快' },
      { known: 'getting better as soon as I can', target: '我尽快变好' },
      { known: "I'm looking forward to getting better as soon as I can", target: '我期待我尽快变好' },
      { known: 'I want to start as soon as I can', target: '我想我尽快开始' },
      { known: 'I want to learn as soon as I can', target: '我想我尽快学' },
      { known: 'I want to speak Chinese as soon as I can', target: '我想我尽快说中文' },
      { known: "I'm going to come back as soon as I can", target: '我要我尽快回来' },
      { known: 'I want to help as soon as I can', target: '我想我尽快帮' },
      { known: 'I want to answer as soon as I can', target: '我想我尽快回答' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // SEED 30: I wanted to ask yesterday
  // ═══════════════════════════════════════════════════════════════

  await postLego({
    seed: 30, idx: 1, type: 'A',
    known: 'I wanted', target: '我想要',
    phrases: [
      { known: 'I wanted', target: '我想要' },
      { known: 'I wanted to speak', target: '我想要说' },
      { known: 'I wanted to learn', target: '我想要学' },
      { known: 'I wanted to try', target: '我想要试' },
      { known: 'I wanted to ask', target: '我想要问' },
      { known: 'I wanted to help', target: '我想要帮' },
      { known: 'I wanted to know', target: '我想要知道' },
      { known: 'I wanted to start', target: '我想要开始' },
      { known: 'I wanted to meet', target: '我想要见面' }
    ]
  });

  await postLego({
    seed: 30, idx: 2, type: 'A',
    known: 'to ask', target: '问',
    phrases: [
      { known: 'to ask', target: '问' },
      { known: 'I wanted to ask', target: '我想要问' },
      { known: 'I want to ask', target: '我想问' },
      { known: 'to ask you', target: '问你' },
      { known: 'I wanted to ask you', target: '我想要问你' },
      { known: 'can I ask', target: '我能问吗' },
      { known: 'to ask a question', target: '问一个问题' },
      { known: "I'm trying to ask", target: '我在努力问' },
      { known: 'why do you want to ask', target: '你为什么想问' }
    ]
  });

  await postLego({
    seed: 30, idx: 3, type: 'A',
    known: 'yesterday', target: '昨天',
    phrases: [
      { known: 'yesterday', target: '昨天' },
      { known: 'I wanted to ask yesterday', target: '我昨天想要问' },
      { known: 'yesterday and today', target: '昨天和今天' },
      { known: 'I learned yesterday', target: '我昨天学了' },
      { known: 'what happened yesterday', target: '昨天发生了什么' },
      { known: 'I started yesterday', target: '我昨天开始了' },
      { known: 'I met someone yesterday', target: '我昨天见了人' },
      { known: 'I wanted to speak Chinese yesterday', target: '我昨天想要说中文' },
      { known: 'did you practise yesterday', target: '你昨天练习了吗' },
      { known: 'I was trying yesterday', target: '我昨天在努力' }
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // CHECKPOINT @ ~90 LEGOs (Seeds 21-30)
  // ═══════════════════════════════════════════════════════════════

  await checkpoint('Seeds 21-30 complete (~90 LEGOs)');

  console.log('\n✓ Seeds 21-30 complete! First 30 seeds done.');
}

main().catch(console.error);
