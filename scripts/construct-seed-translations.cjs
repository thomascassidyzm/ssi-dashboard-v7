#!/usr/bin/env node
/**
 * Construct seed translations from LEGOs
 * The translation must be the LEGOs tiled together in proper Chinese word order
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE_CODE = 'zho_for_eng';

// Seeds with fragment translations
const FRAGMENT_SEEDS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,48];

async function constructTranslations() {
  console.log('CONSTRUCTING SEED TRANSLATIONS FROM LEGOS\n');
  console.log('='.repeat(80) + '\n');

  // Get all seeds
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', COURSE_CODE)
    .in('seed_number', FRAGMENT_SEEDS)
    .order('seed_number');

  // Get all LEGOs for these seeds
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type, components')
    .eq('course_code', COURSE_CODE)
    .in('seed_number', FRAGMENT_SEEDS)
    .order('seed_number')
    .order('lego_index');

  // Group LEGOs by seed
  const legosBySeed = {};
  for (const l of legos) {
    if (!legosBySeed[l.seed_number]) legosBySeed[l.seed_number] = [];
    legosBySeed[l.seed_number].push(l);
  }

  const translations = [];

  for (const seed of seeds) {
    const seedLegos = legosBySeed[seed.seed_number] || [];

    // Get LEGO targets in order
    const legoTargets = seedLegos.map(l => l.target_text);

    // For Chinese, we need to arrange in proper word order
    // Generally: Subject + Time + Verb + Object pattern, but varies
    // The LEGOs are usually in a reasonable order already

    // Construct translation by joining LEGOs
    // Remove any duplicate characters at boundaries
    let constructed = constructChineseFromLegos(seedLegos, seed.known_text);

    // Add punctuation based on English
    if (seed.known_text.endsWith('?')) {
      constructed = constructed.replace(/[。？]?$/, '？');
    } else if (seed.known_text.endsWith('.')) {
      constructed = constructed.replace(/[。？]?$/, '。');
    }

    translations.push({
      seed_number: seed.seed_number,
      known_text: seed.known_text,
      current: seed.target_text,
      legos: legoTargets,
      constructed
    });

    console.log(`S${String(seed.seed_number).padStart(4, '0')}:`);
    console.log(`  EN: "${seed.known_text}"`);
    console.log(`  LEGOs: ${legoTargets.join(' + ')}`);
    console.log(`  Current: "${seed.target_text}" (fragment)`);
    console.log(`  Constructed: "${constructed}"`);
    console.log('');
  }

  // Output as JSON for batch update
  console.log('\n' + '='.repeat(80));
  console.log('JSON FOR BATCH UPDATE:');
  console.log('='.repeat(80) + '\n');

  console.log(JSON.stringify({
    translations: translations.map(t => ({
      seed: t.seed_number,
      target_text: t.constructed
    }))
  }, null, 2));

  return translations;
}

/**
 * Construct Chinese sentence from LEGOs
 * This handles word order which can differ from English
 */
function constructChineseFromLegos(legos, englishSeed) {
  if (legos.length === 0) return '';
  if (legos.length === 1) return legos[0].target_text;

  const targets = legos.map(l => l.target_text);
  const knowns = legos.map(l => l.known_text.toLowerCase());

  // Chinese word order patterns based on English structure
  // Most seeds follow: [Subject] [Time] [Adverb] [Verb] [Object] pattern

  const english = englishSeed.toLowerCase();

  // Special handling for specific patterns

  // "I want to speak Chinese with you now" → 我想现在跟你说中文
  // Subject + want + time + with-you + verb + object
  if (english.includes('i want to') && english.includes('now')) {
    // Reorder: subject + want + time + preposition + verb + object
    return reorderForPattern(legos, ['我想', '现在', '跟你', '说', '中文']);
  }

  // "How long have you been learning" → 你学中文多久了
  if (english.includes('how long')) {
    // Question pattern: subject + verb + object + how-long + aspect
    const howLong = targets.find(t => t.includes('多久'));
    const aspect = targets.find(t => t === '了');
    const others = targets.filter(t => t !== howLong && t !== aspect);
    if (howLong) {
      return others.join('') + howLong + (aspect || '');
    }
  }

  // "Do you speak Chinese all day?" → 你一整天都说中文吗？
  if (english.startsWith('do you') && english.includes('all day')) {
    // Reorder: subject + time + adverb + verb + object + question
    const allDay = targets.find(t => t.includes('整天'));
    const others = targets.filter(t => !t.includes('整天'));
    if (allDay) {
      // 你 + 一整天 + 说中文 + 吗
      return '你' + allDay + '都说中文吗';
    }
  }

  // "I'm not sure if I can" → 我不确定我能不能
  if (english.includes("i'm not sure if")) {
    return targets.join('');
  }

  // Time expressions usually come after subject in Chinese
  // "today", "tomorrow", "this morning", "tonight", etc.
  const timeWords = ['今天', '明天', '今晚', '早上', '下午', '晚上', '昨天', '昨晚', '上个月', '一个星期'];
  const hasTime = targets.some(t => timeWords.some(tw => t.includes(tw)));

  if (hasTime) {
    // Find subject, time, and rest
    const subject = targets.find(t => t.startsWith('我') || t.startsWith('你') || t.startsWith('他') || t.startsWith('她') || t.startsWith('我们'));
    const time = targets.find(t => timeWords.some(tw => t.includes(tw)));
    const rest = targets.filter(t => t !== subject && t !== time);

    if (subject && time) {
      // Subject + Time + Rest (but handle 但是 specially)
      const butWord = rest.find(r => r === '但是');
      const restWithoutBut = rest.filter(r => r !== '但是');

      if (butWord) {
        // 但是 goes at the beginning
        return butWord + subject.replace(/^(我|你|他|她|我们)/, '') + time + restWithoutBut.join('');
      }
      return subject + time + rest.join('');
    }
  }

  // Default: join in LEGO order (often correct for Chinese)
  // But handle some common reorderings

  // "with someone else" → 跟别人 should come before verb
  // "very well" → 很好 should come after verb

  // For now, use LEGO order as default
  return targets.join('');
}

function reorderForPattern(legos, pattern) {
  const targets = legos.map(l => l.target_text);
  const result = [];

  for (const p of pattern) {
    const match = targets.find(t => t.includes(p) || p.includes(t));
    if (match && !result.includes(match)) {
      result.push(match);
    }
  }

  // Add any remaining
  for (const t of targets) {
    if (!result.includes(t)) {
      result.push(t);
    }
  }

  return result.join('');
}

constructTranslations().catch(console.error);
