#!/usr/bin/env node

/**
 * Phase 3 Basket Generation for cmn_for_eng
 * Seeds: S0527, S0530, S0540
 *
 * Generates baskets with proper Chinese characters (汉字)
 */

import axios from 'axios';

const COURSE = 'cmn_for_eng';
const API_URL = 'http://localhost:3459/upload-basket';

// LEGO data extracted from lego_pairs.json
const SEEDS = {
  S0527: {
    legos: [
      { id: 'S0527L01', lego: { known: 'guess', target: '猜猜' } },
      { id: 'S0527L02', lego: { known: 'who', target: '是谁' } },
      { id: 'S0527L03', lego: { known: 'tell', target: '告诉' } },
      { id: 'S0527L04', lego: { known: 'tell me', target: '告诉我' } },
      { id: 'S0527L05', lego: { known: 'story', target: '故事' } },
      { id: 'S0527L06', lego: { known: 'funny', target: '有趣的' } },
      { id: 'S0527L07', lego: { known: 'funny story', target: '有趣的故事' } },
      { id: 'S0527L08', lego: { known: 'that', target: '那个' } },
      { id: 'S0527L09', lego: { known: 'that funny story', target: '那个有趣的故事' } },
      { id: 'S0527L10', lego: { known: 'told me that funny story', target: '告诉我那个有趣的故事' } },
      { id: 'S0527L11', lego: { known: 'who told me that funny story', target: '是谁告诉我那个有趣的故事' } }
    ]
  },
  S0530: {
    legos: [
      { id: 'S0530L01', lego: { known: 'so', target: '这样' } },
      { id: 'S0530L02', lego: { known: 'can', target: '能' } },
      { id: 'S0530L03', lego: { known: 'then can', target: '就能' } },
      { id: 'S0530L04', lego: { known: 'count', target: '数' } },
      { id: 'S0530L05', lego: { known: 'count them', target: '数它们' } },
      { id: 'S0530L06', lego: { known: 'can count them', target: '能数它们' } },
      { id: 'S0530L07', lego: { known: 'then can count them', target: '就能数它们了' } },
      { id: 'S0530L08', lego: { known: 'so I can count them', target: '这样我就能数它们了' } }
    ]
  },
  S0540: {
    legos: [
      { id: 'S0540L01', lego: { known: 'if you want', target: '如果你想' } },
      { id: 'S0540L02', lego: { known: 'without the car', target: '不开车' } },
      { id: 'S0540L03', lego: { known: 'leave', target: '离开' } },
      { id: 'S0540L04', lego: { known: 'leave without the car', target: '不开车离开' } },
      { id: 'S0540L05', lego: { known: "I don't mind", target: '我不介意' } }
    ]
  }
};

// Practice phrase templates for Chinese
const PRACTICE_TEMPLATES = {
  S0527: {
    S0527L01: [
      { known: 'Can you guess?', target: '你能猜猜吗？' },
      { known: 'Let me guess.', target: '让我猜猜。' },
      { known: 'I like to guess.', target: '我喜欢猜猜。' },
      { known: 'Guess what happened.', target: '猜猜发生了什么。' },
      { known: 'Try to guess.', target: '试着猜猜。' },
      { known: "Don't guess randomly.", target: '不要随便猜猜。' },
      { known: 'I want to guess.', target: '我想猜猜。' },
      { known: 'Can we guess together?', target: '我们可以一起猜猜吗？' },
      { known: 'Please guess first.', target: '请先猜猜。' },
      { known: 'He likes to guess.', target: '他喜欢猜猜。' }
    ],
    S0527L02: [
      { known: 'Who is this?', target: '这是谁？' },
      { known: 'Who came here?', target: '是谁来这里了？' },
      { known: 'Who said that?', target: '是谁说的？' },
      { known: 'Who knows?', target: '是谁知道？' },
      { known: 'Who did this?', target: '是谁做的？' },
      { known: 'Who can help?', target: '是谁能帮忙？' },
      { known: 'Who wants to go?', target: '是谁想去？' },
      { known: 'Who is calling?', target: '是谁在打电话？' },
      { known: 'Who told you?', target: '是谁告诉你的？' },
      { known: 'Who is responsible?', target: '是谁负责的？' }
    ],
    S0527L03: [
      { known: 'I can tell.', target: '我能告诉。' },
      { known: 'Please tell him.', target: '请告诉他。' },
      { known: 'Tell the truth.', target: '告诉真相。' },
      { known: "Don't tell anyone.", target: '不要告诉任何人。' },
      { known: 'I want to tell.', target: '我想告诉。' },
      { known: 'Can you tell her?', target: '你能告诉她吗？' },
      { known: 'I will tell later.', target: '我晚点会告诉。' },
      { known: 'Tell them now.', target: '现在告诉他们。' },
      { known: 'I need to tell you.', target: '我需要告诉你。' },
      { known: 'Tell me everything.', target: '告诉我一切。' }
    ],
    S0527L04: [
      { known: 'Tell me your name.', target: '告诉我你的名字。' },
      { known: 'Tell me the answer.', target: '告诉我答案。' },
      { known: 'Please tell me.', target: '请告诉我。' },
      { known: 'Tell me why.', target: '告诉我为什么。' },
      { known: 'Can you tell me?', target: '你能告诉我吗？' },
      { known: 'Tell me the truth.', target: '告诉我真相。' },
      { known: 'Tell me about it.', target: '告诉我关于它的事。' },
      { known: 'Tell me when.', target: '告诉我什么时候。' },
      { known: 'Tell me how.', target: '告诉我怎么做。' },
      { known: 'Tell me where.', target: '告诉我在哪里。' }
    ],
    S0527L05: [
      { known: 'This is a good story.', target: '这是一个好故事。' },
      { known: 'I love this story.', target: '我喜欢这个故事。' },
      { known: 'The story is long.', target: '这个故事很长。' },
      { known: 'What story?', target: '什么故事？' },
      { known: 'Tell a story.', target: '讲一个故事。' },
      { known: 'I heard that story.', target: '我听过那个故事。' },
      { known: 'The story is interesting.', target: '这个故事很有趣。' },
      { known: 'Every story matters.', target: '每个故事都很重要。' },
      { known: 'Read this story.', target: '读这个故事。' },
      { known: 'The story continues.', target: '故事还在继续。' }
    ],
    S0527L06: [
      { known: 'That is funny.', target: '那很有趣的。' },
      { known: 'A funny person.', target: '一个有趣的人。' },
      { known: 'Something funny.', target: '有趣的东西。' },
      { known: 'Very funny thing.', target: '很有趣的事情。' },
      { known: 'Funny ideas.', target: '有趣的想法。' },
      { known: 'Not funny at all.', target: '一点也不有趣的。' },
      { known: 'Funny moments.', target: '有趣的时刻。' },
      { known: 'Really funny.', target: '真的很有趣的。' },
      { known: 'Funny games.', target: '有趣的游戏。' },
      { known: 'How funny!', target: '多么有趣的！' }
    ],
    S0527L07: [
      { known: 'I heard a funny story.', target: '我听到了一个有趣的故事。' },
      { known: 'That was a funny story.', target: '那是个有趣的故事。' },
      { known: 'Tell me a funny story.', target: '告诉我一个有趣的故事。' },
      { known: 'I know a funny story.', target: '我知道一个有趣的故事。' },
      { known: 'What a funny story!', target: '多么有趣的故事！' },
      { known: 'Is it a funny story?', target: '这是个有趣的故事吗？' },
      { known: 'The funny story continues.', target: '这个有趣的故事继续着。' },
      { known: 'Everyone loves a funny story.', target: '每个人都喜欢有趣的故事。' },
      { known: 'I want to hear a funny story.', target: '我想听一个有趣的故事。' },
      { known: 'Share your funny story.', target: '分享你的有趣的故事。' }
    ],
    S0527L08: [
      { known: 'Look at that.', target: '看那个。' },
      { known: 'I want that.', target: '我想要那个。' },
      { known: 'Give me that.', target: '给我那个。' },
      { known: 'That is mine.', target: '那个是我的。' },
      { known: 'What is that?', target: '那个是什么？' },
      { known: 'Take that one.', target: '拿那个。' },
      { known: 'Not that one.', target: '不是那个。' },
      { known: 'I like that.', target: '我喜欢那个。' },
      { known: 'That belongs here.', target: '那个属于这里。' },
      { known: 'Remember that.', target: '记住那个。' }
    ],
    S0527L09: [
      { known: 'I remember that funny story.', target: '我记得那个有趣的故事。' },
      { known: 'That funny story was great.', target: '那个有趣的故事很棒。' },
      { known: 'Do you know that funny story?', target: '你知道那个有趣的故事吗？' },
      { known: 'I love that funny story.', target: '我喜欢那个有趣的故事。' },
      { known: 'Tell me that funny story again.', target: '再给我讲那个有趣的故事。' },
      { known: 'That funny story is famous.', target: '那个有趣的故事很有名。' },
      { known: 'I want to hear that funny story.', target: '我想听那个有趣的故事。' },
      { known: 'That funny story made me laugh.', target: '那个有趣的故事让我笑了。' },
      { known: 'Everyone knows that funny story.', target: '每个人都知道那个有趣的故事。' },
      { known: 'Share that funny story.', target: '分享那个有趣的故事。' }
    ],
    S0527L10: [
      { known: 'She told me that funny story.', target: '她告诉我那个有趣的故事。' },
      { known: 'He told me that funny story yesterday.', target: '他昨天告诉我那个有趣的故事。' },
      { known: 'They told me that funny story already.', target: '他们已经告诉我那个有趣的故事了。' },
      { known: 'Someone told me that funny story.', target: '有人告诉我那个有趣的故事。' },
      { known: 'My friend told me that funny story.', target: '我的朋友告诉我那个有趣的故事。' },
      { known: 'Nobody told me that funny story.', target: '没人告诉我那个有趣的故事。' },
      { known: 'Everyone told me that funny story.', target: '每个人都告诉我那个有趣的故事。' },
      { known: 'The teacher told me that funny story.', target: '老师告诉我那个有趣的故事。' },
      { known: 'She always told me that funny story.', target: '她总是告诉我那个有趣的故事。' },
      { known: 'They just told me that funny story.', target: '他们刚刚告诉我那个有趣的故事。' }
    ],
    S0527L11: [
      { known: 'Who told me that funny story?', target: '是谁告诉我那个有趣的故事？' },
      { known: 'I forgot who told me that funny story.', target: '我忘了是谁告诉我那个有趣的故事。' },
      { known: 'Do you know who told me that funny story?', target: '你知道是谁告诉我那个有趣的故事吗？' },
      { known: 'I wonder who told me that funny story.', target: '我想知道是谁告诉我那个有趣的故事。' },
      { known: 'Can you guess who told me that funny story?', target: '你能猜出是谁告诉我那个有趣的故事吗？' },
      { known: 'Who exactly told me that funny story?', target: '到底是谁告诉我那个有趣的故事？' },
      { known: 'I remember who told me that funny story.', target: '我记得是谁告诉我那个有趣的故事。' },
      { known: "I don't know who told me that funny story.", target: '我不知道是谁告诉我那个有趣的故事。' },
      { known: 'Who was it that told me that funny story?', target: '是谁告诉我那个有趣的故事来着？' },
      { known: 'Tell me who told me that funny story.', target: '告诉我是谁告诉我那个有趣的故事。' }
    ]
  },
  S0530: {
    S0530L01: [
      { known: 'Do it so.', target: '这样做。' },
      { known: 'Think so.', target: '这样想。' },
      { known: 'So we can.', target: '这样我们能。' },
      { known: 'So it works.', target: '这样就行。' },
      { known: 'So is better.', target: '这样更好。' },
      { known: 'Not so.', target: '不这样。' },
      { known: 'Why so?', target: '为什么这样？' },
      { known: 'So quickly.', target: '这样快。' },
      { known: 'Arrange it so.', target: '这样安排。' },
      { known: 'So we understand.', target: '这样我们明白。' }
    ],
    S0530L02: [
      { known: 'I can do it.', target: '我能做。' },
      { known: 'You can try.', target: '你能试试。' },
      { known: 'We can go.', target: '我们能去。' },
      { known: 'Can you help?', target: '你能帮忙吗？' },
      { known: 'They can come.', target: '他们能来。' },
      { known: "I can't now.", target: '我现在不能。' },
      { known: 'Can we start?', target: '我们能开始吗？' },
      { known: 'She can speak.', target: '她能说。' },
      { known: 'Can he understand?', target: '他能明白吗？' },
      { known: 'We can wait.', target: '我们能等。' }
    ],
    S0530L03: [
      { known: 'Then I can go.', target: '那我就能去。' },
      { known: 'Then we can start.', target: '那我们就能开始。' },
      { known: 'Then you can help.', target: '那你就能帮忙。' },
      { known: 'Then it can work.', target: '那就能行。' },
      { known: 'Then she can come.', target: '那她就能来。' },
      { known: 'Then we can eat.', target: '那我们就能吃。' },
      { known: 'Then he can leave.', target: '那他就能离开。' },
      { known: 'Then they can play.', target: '那他们就能玩。' },
      { known: 'Then we can rest.', target: '那我们就能休息。' },
      { known: 'Then you can speak.', target: '那你就能说。' }
    ],
    S0530L04: [
      { known: 'I can count.', target: '我能数。' },
      { known: 'Can you count?', target: '你能数吗？' },
      { known: 'Count slowly.', target: '慢慢数。' },
      { known: 'Count to ten.', target: '数到十。' },
      { known: 'Let me count.', target: '让我数。' },
      { known: 'Count again.', target: '再数一次。' },
      { known: 'Count together.', target: '一起数。' },
      { known: 'I like to count.', target: '我喜欢数。' },
      { known: 'Count carefully.', target: '仔细地数。' },
      { known: 'Count faster.', target: '快点数。' }
    ],
    S0530L05: [
      { known: 'I can count them.', target: '我能数它们。' },
      { known: 'Count them all.', target: '把它们都数一下。' },
      { known: 'Count them now.', target: '现在数它们。' },
      { known: 'Can you count them?', target: '你能数它们吗？' },
      { known: 'Let me count them.', target: '让我数它们。' },
      { known: 'Count them carefully.', target: '仔细地数它们。' },
      { known: 'Count them again.', target: '再数一次它们。' },
      { known: 'I will count them.', target: '我会数它们。' },
      { known: 'Count them one by one.', target: '一个一个地数它们。' },
      { known: 'Help me count them.', target: '帮我数它们。' }
    ],
    S0530L06: [
      { known: 'I can count them easily.', target: '我能很容易地数它们。' },
      { known: 'We can count them together.', target: '我们能一起数它们。' },
      { known: 'You can count them now.', target: '你能现在数它们。' },
      { known: 'Can she count them?', target: '她能数它们吗？' },
      { known: 'They can count them quickly.', target: '他们能快速地数它们。' },
      { known: 'He can count them all.', target: '他能把它们都数完。' },
      { known: 'Can we count them first?', target: '我们能先数它们吗？' },
      { known: 'I can count them later.', target: '我能稍后数它们。' },
      { known: 'Can you count them for me?', target: '你能帮我数它们吗？' },
      { known: 'Who can count them?', target: '谁能数它们？' }
    ],
    S0530L07: [
      { known: 'Then I can count them.', target: '那我就能数它们了。' },
      { known: 'Then we can count them together.', target: '那我们就能一起数它们了。' },
      { known: 'Then you can count them.', target: '那你就能数它们了。' },
      { known: 'Then she can count them easily.', target: '那她就能很容易地数它们了。' },
      { known: 'Then they can count them all.', target: '那他们就能把它们都数完了。' },
      { known: 'Then he can count them quickly.', target: '那他就能快速地数它们了。' },
      { known: 'Then we can count them carefully.', target: '那我们就能仔细地数它们了。' },
      { known: 'Then I can count them again.', target: '那我就能再数一次它们了。' },
      { known: 'Then you can count them slowly.', target: '那你就能慢慢地数它们了。' },
      { known: 'Then we can count them now.', target: '那我们就能现在数它们了。' }
    ],
    S0530L08: [
      { known: 'So I can count them all.', target: '这样我就能把它们都数完了。' },
      { known: 'So I can count them easily.', target: '这样我就能很容易地数它们了。' },
      { known: 'So I can count them quickly.', target: '这样我就能快速地数它们了。' },
      { known: 'So I can count them carefully.', target: '这样我就能仔细地数它们了。' },
      { known: 'So I can count them one by one.', target: '这样我就能一个一个地数它们了。' },
      { known: 'So I can count them now.', target: '这样我就能现在数它们了。' },
      { known: 'So I can count them later.', target: '这样我就能稍后数它们了。' },
      { known: 'So I can count them together.', target: '这样我就能一起数它们了。' },
      { known: 'So I can count them again.', target: '这样我就能再数一次它们了。' },
      { known: 'So I can count them properly.', target: '这样我就能正确地数它们了。' }
    ]
  },
  S0540: {
    S0540L01: [
      { known: 'If you want to go.', target: '如果你想去。' },
      { known: 'If you want to try.', target: '如果你想试试。' },
      { known: 'If you want to stay.', target: '如果你想留下。' },
      { known: 'If you want to help.', target: '如果你想帮忙。' },
      { known: 'If you want to come.', target: '如果你想来。' },
      { known: 'If you want to eat.', target: '如果你想吃。' },
      { known: 'If you want to leave.', target: '如果你想离开。' },
      { known: 'If you want to know.', target: '如果你想知道。' },
      { known: 'If you want to rest.', target: '如果你想休息。' },
      { known: 'If you want to talk.', target: '如果你想说话。' }
    ],
    S0540L02: [
      { known: 'Go without the car.', target: '不开车去。' },
      { known: 'Leave without the car.', target: '不开车离开。' },
      { known: 'Travel without the car.', target: '不开车旅行。' },
      { known: 'Come without the car.', target: '不开车来。' },
      { known: 'Return without the car.', target: '不开车回来。' },
      { known: 'Arrive without the car.', target: '不开车到达。' },
      { known: 'Move without the car.', target: '不开车移动。' },
      { known: 'Continue without the car.', target: '不开车继续。' },
      { known: 'Start without the car.', target: '不开车开始。' },
      { known: 'Manage without the car.', target: '不开车也能应付。' }
    ],
    S0540L03: [
      { known: 'I want to leave.', target: '我想离开。' },
      { known: 'Can I leave?', target: '我能离开吗？' },
      { known: 'Let me leave.', target: '让我离开。' },
      { known: 'Time to leave.', target: '该离开了。' },
      { known: 'I must leave.', target: '我必须离开。' },
      { known: 'Leave now.', target: '现在离开。' },
      { known: 'Leave quickly.', target: '快点离开。' },
      { known: 'Leave together.', target: '一起离开。' },
      { known: "Don't leave.", target: '不要离开。' },
      { known: 'Leave here.', target: '从这里离开。' }
    ],
    S0540L04: [
      { known: 'I can leave without the car.', target: '我能不开车离开。' },
      { known: 'We should leave without the car.', target: '我们应该不开车离开。' },
      { known: 'Can we leave without the car?', target: '我们能不开车离开吗？' },
      { known: 'They want to leave without the car.', target: '他们想不开车离开。' },
      { known: 'Let me leave without the car.', target: '让我不开车离开。' },
      { known: 'I prefer to leave without the car.', target: '我更喜欢不开车离开。' },
      { known: 'She decided to leave without the car.', target: '她决定不开车离开。' },
      { known: 'Is it possible to leave without the car?', target: '不开车离开可能吗？' },
      { known: "It's better to leave without the car.", target: '不开车离开更好。' },
      { known: 'Try to leave without the car.', target: '试着不开车离开。' }
    ],
    S0540L05: [
      { known: "I don't mind waiting.", target: '我不介意等。' },
      { known: "I don't mind helping.", target: '我不介意帮忙。' },
      { known: "I don't mind at all.", target: '我一点也不介意。' },
      { known: "I don't mind going.", target: '我不介意去。' },
      { known: "I don't mind staying.", target: '我不介意留下。' },
      { known: "I don't mind trying.", target: '我不介意试试。' },
      { known: "I don't mind doing it.", target: '我不介意做这个。' },
      { known: "I don't mind the cold.", target: '我不介意冷。' },
      { known: "I don't mind working.", target: '我不介意工作。' },
      { known: "I don't mind walking.", target: '我不介意走路。' }
    ]
  }
};

/**
 * Generate baskets for a seed
 */
function generateBaskets(seedId) {
  const seedData = SEEDS[seedId];
  if (!seedData) {
    throw new Error(`No data for seed ${seedId}`);
  }

  const baskets = {};
  const totalLegos = seedData.legos.length;

  seedData.legos.forEach((legoData, index) => {
    const legoId = legoData.id;
    const isFinalLego = (index === totalLegos - 1);

    // Get practice phrases for this LEGO
    const practicePhrases = PRACTICE_TEMPLATES[seedId][legoId];

    if (!practicePhrases) {
      throw new Error(`No practice phrases for ${legoId}`);
    }

    baskets[legoId] = {
      lego: legoData.lego,
      is_final_lego: isFinalLego,
      practice_phrases: practicePhrases,
      phrase_count: practicePhrases.length
    };
  });

  return baskets;
}

/**
 * Submit basket to API
 */
async function submitBasket(seedId, baskets) {
  const payload = {
    course: COURSE,
    seed: seedId,
    baskets: baskets
  };

  console.log(`\nSubmitting ${seedId}...`);
  console.log(`  - LEGOs: ${Object.keys(baskets).length}`);
  console.log(`  - Total phrases: ${Object.values(baskets).reduce((sum, b) => sum + b.phrase_count, 0)}`);

  try {
    const response = await axios.post(API_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    console.log(`  ✓ SUCCESS: ${response.status} ${response.statusText}`);
    if (response.data) {
      console.log(`    Response:`, JSON.stringify(response.data, null, 2));
    }
    return { seedId, success: true, status: response.status };
  } catch (error) {
    console.error(`  ✗ FAILED: ${error.message}`);
    if (error.response) {
      console.error(`    Status: ${error.response.status}`);
      console.error(`    Data:`, error.response.data);
    }
    return { seedId, success: false, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Phase 3 Basket Generation - cmn_for_eng');
  console.log('Seeds: S0527, S0530, S0540');
  console.log('='.repeat(60));

  const results = [];

  for (const seedId of ['S0527', 'S0530', 'S0540']) {
    try {
      const baskets = generateBaskets(seedId);
      const result = await submitBasket(seedId, baskets);
      results.push(result);

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`\n✗ Error processing ${seedId}:`, error.message);
      results.push({ seedId, success: false, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  results.forEach(r => {
    const status = r.success ? '✓ SUCCESS' : '✗ FAILED';
    console.log(`${r.seedId}: ${status}`);
    if (!r.success && r.error) {
      console.log(`  Error: ${r.error}`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\nTotal: ${successCount}/${results.length} seeds submitted successfully`);

  process.exit(successCount === results.length ? 0 : 1);
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
