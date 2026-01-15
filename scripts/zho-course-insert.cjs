/**
 * Chinese Course Builder - First 50 LEGOs
 * Inserts to Supabase course_legos and course_practice_phrases
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const COURSE_CODE = 'zho_for_eng';

// ============================================================
// LEGO DEFINITIONS - First 50
// ============================================================

const legos = [
  // SEED 1: I want to speak Chinese with you now
  { seed: 1, idx: 1, type: 'M', known: 'I want to', target: '我想',
    components: [{known: 'I', target: '我'}, {known: 'want to', target: '想'}] },
  { seed: 1, idx: 2, type: 'A', known: 'speak', target: '说', components: null },
  { seed: 1, idx: 3, type: 'A', known: 'Chinese', target: '中文', components: null },
  { seed: 1, idx: 4, type: 'M', known: 'with you', target: '和你',
    components: [{known: 'with', target: '和'}, {known: 'you', target: '你'}] },
  { seed: 1, idx: 5, type: 'A', known: 'now', target: '现在', components: null },

  // SEED 2: I'm trying to learn
  { seed: 2, idx: 1, type: 'M', known: "I'm trying to", target: '我在努力',
    components: [{known: "I'm", target: '我在'}, {known: 'trying to', target: '努力'}] },
  { seed: 2, idx: 2, type: 'A', known: 'learn', target: '学', components: null },

  // SEED 3: how to speak as often as possible
  { seed: 3, idx: 1, type: 'A', known: 'how to', target: '怎么', components: null },
  { seed: 3, idx: 2, type: 'M', known: 'as often as possible', target: '尽可能经常',
    components: [{known: 'as...as possible', target: '尽可能'}, {known: 'often', target: '经常'}] },

  // SEED 4: how to say something in Chinese
  { seed: 4, idx: 1, type: 'A', known: 'say', target: '说', components: null }, // Same as speak
  { seed: 4, idx: 2, type: 'A', known: 'something', target: '东西', components: null },
  { seed: 4, idx: 3, type: 'M', known: 'in Chinese', target: '用中文',
    components: [{known: 'in/using', target: '用'}, {known: 'Chinese', target: '中文'}] },

  // SEED 5: I'm going to practise speaking with someone else
  { seed: 5, idx: 1, type: 'M', known: "I'm going to", target: '我要',
    components: [{known: 'I', target: '我'}, {known: 'going to', target: '要'}] },
  { seed: 5, idx: 2, type: 'A', known: 'practise', target: '练习', components: null },
  { seed: 5, idx: 3, type: 'M', known: 'with someone else', target: '和别人',
    components: [{known: 'with', target: '和'}, {known: 'someone else', target: '别人'}] },

  // SEED 6: I'm trying to remember a word
  { seed: 6, idx: 1, type: 'A', known: 'remember', target: '记住', components: null },
  { seed: 6, idx: 2, type: 'M', known: 'a word', target: '一个词',
    components: [{known: 'a/one', target: '一个'}, {known: 'word', target: '词'}] },

  // SEED 7: I want to try as hard as I can today
  { seed: 7, idx: 1, type: 'A', known: 'try', target: '试', components: null },
  { seed: 7, idx: 2, type: 'M', known: 'as hard as I can', target: '尽力',
    components: [{known: 'exhaust', target: '尽'}, {known: 'strength', target: '力'}] },
  { seed: 7, idx: 3, type: 'A', known: 'today', target: '今天', components: null },

  // SEED 8: I'm going to try to explain what I mean
  { seed: 8, idx: 1, type: 'A', known: 'explain', target: '解释', components: null },
  { seed: 8, idx: 2, type: 'M', known: 'what I mean', target: '我的意思',
    components: [{known: 'my', target: '我的'}, {known: 'meaning', target: '意思'}] },

  // SEED 9: I speak a little Chinese now
  { seed: 9, idx: 1, type: 'M', known: 'a little', target: '一点',
    components: [{known: 'one', target: '一'}, {known: 'bit', target: '点'}] },

  // SEED 10: I'm not sure if I can remember the whole sentence
  { seed: 10, idx: 1, type: 'M', known: "I'm not sure", target: '我不确定',
    components: [{known: "I'm not", target: '我不'}, {known: 'sure', target: '确定'}] },
  { seed: 10, idx: 2, type: 'M', known: 'if I can', target: '能不能',
    components: [{known: 'can', target: '能'}, {known: "can't", target: '不能'}] },
  { seed: 10, idx: 3, type: 'M', known: 'the whole sentence', target: '整个句子',
    components: [{known: 'whole', target: '整个'}, {known: 'sentence', target: '句子'}] },

  // SEED 11: I'd like to be able to speak after you finish
  { seed: 11, idx: 1, type: 'M', known: "I'd like to", target: '我想要',
    components: [{known: 'I', target: '我'}, {known: 'would like to', target: '想要'}] },
  { seed: 11, idx: 2, type: 'M', known: 'be able to', target: '能够',
    components: [{known: 'able', target: '能'}, {known: 'to', target: '够'}] },
  { seed: 11, idx: 3, type: 'M', known: 'after you finish', target: '你说完以后',
    components: [{known: 'you finish', target: '你说完'}, {known: 'after', target: '以后'}] },

  // SEED 12: I wouldn't like to guess what's going to happen tomorrow
  { seed: 12, idx: 1, type: 'M', known: "I don't want to", target: '我不想',
    components: [{known: "I don't", target: '我不'}, {known: 'want to', target: '想'}] },
  { seed: 12, idx: 2, type: 'A', known: 'guess', target: '猜', components: null },
  { seed: 12, idx: 3, type: 'M', known: "what's going to happen", target: '会发生什么',
    components: [{known: 'will', target: '会'}, {known: 'happen', target: '发生'}, {known: 'what', target: '什么'}] },
  { seed: 12, idx: 4, type: 'A', known: 'tomorrow', target: '明天', components: null },

  // SEED 13: You speak Chinese very well
  { seed: 13, idx: 1, type: 'M', known: 'very well', target: '很好',
    components: [{known: 'very', target: '很'}, {known: 'good/well', target: '好'}] },

  // SEED 14: Do you speak Chinese all day?
  { seed: 14, idx: 1, type: 'M', known: 'all day', target: '一整天',
    components: [{known: 'one whole', target: '一整'}, {known: 'day', target: '天'}] },

  // SEED 15: And I want you to speak Chinese with me tomorrow
  { seed: 15, idx: 1, type: 'M', known: 'I want you to', target: '我想让你',
    components: [{known: 'I want', target: '我想'}, {known: 'let you', target: '让你'}] },
  { seed: 15, idx: 2, type: 'M', known: 'with me', target: '和我',
    components: [{known: 'with', target: '和'}, {known: 'me', target: '我'}] },

  // SEED 16: He wants to come back with everyone else later on
  { seed: 16, idx: 1, type: 'M', known: 'he wants to', target: '他想',
    components: [{known: 'he', target: '他'}, {known: 'wants to', target: '想'}] },
  { seed: 16, idx: 2, type: 'A', known: 'come back', target: '回来', components: null },
  { seed: 16, idx: 3, type: 'M', known: 'with everyone else', target: '和大家',
    components: [{known: 'with', target: '和'}, {known: 'everyone', target: '大家'}] },
  { seed: 16, idx: 4, type: 'A', known: 'later on', target: '稍后', components: null },

  // SEED 17: She wants to find out what the answer is
  { seed: 17, idx: 1, type: 'M', known: 'she wants to', target: '她想',
    components: [{known: 'she', target: '她'}, {known: 'wants to', target: '想'}] },
  { seed: 17, idx: 2, type: 'A', known: 'find out', target: '发现', components: null },
  { seed: 17, idx: 3, type: 'M', known: 'what the answer is', target: '答案是什么',
    components: [{known: 'answer', target: '答案'}, {known: 'is what', target: '是什么'}] },

  // SEED 18: We want to meet at six o'clock this evening
  { seed: 18, idx: 1, type: 'M', known: 'we want to', target: '我们想',
    components: [{known: 'we', target: '我们'}, {known: 'want to', target: '想'}] },
  { seed: 18, idx: 2, type: 'A', known: 'meet', target: '见面', components: null },
  { seed: 18, idx: 3, type: 'M', known: "at six o'clock", target: '六点',
    components: [{known: 'six', target: '六'}, {known: "o'clock", target: '点'}] },
  { seed: 18, idx: 4, type: 'A', known: 'this evening', target: '今晚', components: null },
];

// ============================================================
// PHRASE GENERATION
// ============================================================

// Track available LEGOs as we go
const available = [];
const phrases = [];

// Generate phrases for each LEGO
function generatePhrases(legoIndex, lego) {
  const legoPosition = legoIndex + 1;
  const newPhrases = [];

  // The LEGO itself is always phrase 1
  newPhrases.push({
    known: lego.known,
    target: lego.target,
    legos: [legoPosition],
    eternal: false
  });

  // Now find combinations with available LEGOs
  // Prioritize recent LEGOs (recency)
  const recentFirst = [...available].reverse();

  for (const prev of recentFirst) {
    // Try combining: new + prev
    const combo1 = tryPhrase(lego, prev);
    if (combo1) newPhrases.push({ ...combo1, legos: [legoPosition, prev.position], eternal: false });

    // Try combining: prev + new
    const combo2 = tryPhrase(prev.lego, lego);
    if (combo2 && combo2.known !== combo1?.known) {
      newPhrases.push({ ...combo2, legos: [prev.position, legoPosition], eternal: false });
    }
  }

  // Try 3-LEGO combinations (new + recent1 + recent2)
  for (let i = 0; i < Math.min(recentFirst.length, 10); i++) {
    for (let j = i + 1; j < Math.min(recentFirst.length, 10); j++) {
      const combo3 = tryThreeWay(lego, recentFirst[i].lego, recentFirst[j].lego);
      if (combo3) {
        newPhrases.push({
          ...combo3,
          legos: [legoPosition, recentFirst[i].position, recentFirst[j].position],
          eternal: false
        });
      }
    }
  }

  // Mark complete seeds as eternal
  markEternals(newPhrases, lego);

  return newPhrases;
}

// Try to make a valid phrase from two LEGOs
function tryPhrase(a, b) {
  // Define valid patterns based on LEGO types
  const patterns = [
    // Modal + Verb
    { aMatch: /^(I want to|I'm trying to|I'm going to|I'd like to|I don't want to|he wants to|she wants to|we want to)$/,
      bMatch: /^(speak|learn|try|practise|remember|explain|guess|find out|come back|meet)$/,
      combine: (a, b) => ({ known: `${a.known} ${b.known}`, target: `${a.target}${b.target}` }) },

    // Verb + Object
    { aMatch: /^(speak|learn|say|remember|explain)$/,
      bMatch: /^(Chinese|something|a word|a little|the whole sentence|what I mean)$/,
      combine: (a, b) => ({ known: `${a.known} ${b.known}`, target: `${a.target}${b.target}` }) },

    // Verb + Language
    { aMatch: /^(speak|learn|practise)$/,
      bMatch: /^Chinese$/,
      combine: (a, b) => ({ known: `${a.known} ${b.known}`, target: `${a.target}${b.target}` }) },

    // how to + Verb
    { aMatch: /^how to$/,
      bMatch: /^(speak|learn|say|remember|explain)$/,
      combine: (a, b) => ({ known: `${a.known} ${b.known}`, target: `${a.target}${b.target}` }) },

    // Prep phrase before verb (Chinese word order)
    { aMatch: /^(with you|with me|with someone else|with everyone else)$/,
      bMatch: /^(speak|learn|practise)$/,
      combine: (a, b) => ({ known: `${b.known} ${a.known}`, target: `${a.target}${b.target}` }) },

    // Time before verb (Chinese word order)
    { aMatch: /^(now|today|tomorrow|this evening|later on)$/,
      bMatch: /^(speak|learn|try|practise)$/,
      combine: (a, b) => ({ known: `${b.known} ${a.known}`, target: `${a.target}${b.target}` }) },

    // Modal + Verb + Object (3-way handled separately)
  ];

  for (const p of patterns) {
    if (p.aMatch.test(a.known) && p.bMatch.test(b.known)) {
      return p.combine(a, b);
    }
    if (p.aMatch.test(b.known) && p.bMatch.test(a.known)) {
      return p.combine(b, a);
    }
  }

  return null;
}

// Try 3-LEGO combinations
function tryThreeWay(a, b, c) {
  // Modal + Verb + Object
  const modals = /^(I want to|I'm trying to|I'm going to|I'd like to|I don't want to|he wants to|she wants to|we want to)$/;
  const verbs = /^(speak|learn|say|remember|explain|practise|try|guess)$/;
  const objects = /^(Chinese|something|a word|a little|the whole sentence|what I mean)$/;

  let modal, verb, obj;

  [a, b, c].forEach(x => {
    if (modals.test(x.known)) modal = x;
    else if (verbs.test(x.known)) verb = x;
    else if (objects.test(x.known)) obj = x;
  });

  if (modal && verb && obj) {
    return {
      known: `${modal.known} ${verb.known} ${obj.known}`,
      target: `${modal.target}${verb.target}${obj.target}`
    };
  }

  return null;
}

// Mark seed-completing phrases as eternal
function markEternals(phrases, currentLego) {
  // Check for complete seeds
  const seedPhrases = {
    1: 'I want to speak Chinese with you now',
    2: "I'm trying to learn",
    3: 'how to speak as often as possible',
    4: 'how to say something in Chinese',
    5: "I'm going to practise speaking with someone else",
    6: "I'm trying to remember a word",
    7: 'I want to try as hard as I can today',
  };

  for (const p of phrases) {
    for (const [seedNum, seedText] of Object.entries(seedPhrases)) {
      if (p.known.toLowerCase() === seedText.toLowerCase()) {
        p.eternal = true;
        p.seed = parseInt(seedNum);
      }
    }
  }
}

// ============================================================
// BUILD THE COURSE
// ============================================================

async function buildCourse() {
  console.log('Building Chinese course...\n');

  const legoRows = [];
  const phraseRows = [];

  for (let i = 0; i < legos.length; i++) {
    const lego = legos[i];
    const legoId = `S${String(lego.seed).padStart(4, '0')}L${String(lego.idx).padStart(2, '0')}`;

    // Add LEGO row (lego_id is auto-generated)
    legoRows.push({
      course_code: COURSE_CODE,
      seed_number: lego.seed,
      lego_index: lego.idx,
      type: lego.type,
      is_new: true,
      known_text: lego.known,
      target_text: lego.target,
      components: lego.components,
      status: 'draft',
      version: 1
    });

    // Generate phrases
    const newPhrases = generatePhrases(i, lego);

    // Add phrase rows
    newPhrases.forEach((p, pos) => {
      phraseRows.push({
        course_code: COURSE_CODE,
        seed_number: lego.seed,
        lego_index: lego.idx,
        position: pos + 1,
        known_text: p.known,
        target_text: p.target,
        word_count: p.target.length, // Chinese characters
        lego_count: p.legos.length,
        metadata: p.eternal ? { eternal: true, seed: p.seed } : {},
        status: 'draft',
        version: 1
      });
    });

    // Add to available
    available.push({ lego, position: i + 1 });

    console.log(`L${String(i+1).padStart(2, '0')}: ${lego.known} → ${lego.target} (${newPhrases.length} phrases)`);
  }

  console.log(`\nTotal: ${legoRows.length} LEGOs, ${phraseRows.length} phrases`);
  console.log(`Phrases per LEGO: ${(phraseRows.length / legoRows.length).toFixed(1)}`);

  // Insert to database
  console.log('\nInserting to database...');

  // Delete existing zho_for_eng data first
  await supabase.from('course_practice_phrases').delete().eq('course_code', COURSE_CODE);
  await supabase.from('course_legos').delete().eq('course_code', COURSE_CODE);

  // Insert LEGOs
  const { error: legoError } = await supabase.from('course_legos').insert(legoRows);
  if (legoError) {
    console.error('LEGO insert error:', legoError);
    return;
  }
  console.log(`✓ Inserted ${legoRows.length} LEGOs`);

  // Insert phrases in batches
  const batchSize = 100;
  for (let i = 0; i < phraseRows.length; i += batchSize) {
    const batch = phraseRows.slice(i, i + batchSize);
    const { error: phraseError } = await supabase.from('course_practice_phrases').insert(batch);
    if (phraseError) {
      console.error('Phrase insert error:', phraseError);
      return;
    }
  }
  console.log(`✓ Inserted ${phraseRows.length} phrases`);

  // Show sample phrases
  console.log('\n--- Sample phrases ---');
  phraseRows.slice(0, 20).forEach((p, i) => {
    const marker = p.metadata?.eternal ? ' ✓ ETERNAL' : '';
    console.log(`${i+1}. "${p.known_text}" → "${p.target_text}"${marker}`);
  });
}

buildCourse().catch(console.error);
