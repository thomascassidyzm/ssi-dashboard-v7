#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const needMore = [
  'S0033L01', 'S0038L01', 'S0038L02', 'S0039L01', 'S0052L01', 'S0055L01',
  'S0070L01', 'S0106L01', 'S0126L02', 'S0133L01', 'S0137L03', 'S0181L01', 'S0220L01'
];

async function analyze() {
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type, components')
    .eq('course_code', 'zho_for_eng')
    .order('seed_number')
    .order('lego_index');

  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, position, known_text, target_text')
    .eq('course_code', 'zho_for_eng');

  // Build vocab by position
  const vocabByLegoId = new Map();
  const cumulativeVocab = new Set();

  for (const lego of legos) {
    const legoId = `S${String(lego.seed_number).padStart(4, '0')}L${String(lego.lego_index).padStart(2, '0')}`;

    const chars = [...(lego.target_text || '')].filter(c => c.trim() && !/[\s\u3000]/.test(c));
    chars.forEach(c => cumulativeVocab.add(c));

    if (lego.type === 'M' && lego.components) {
      for (const comp of lego.components) {
        const t = comp.t || comp.target || comp.target_text;
        if (t) {
          [...t].filter(c => c.trim() && !/[\s\u3000]/.test(c)).forEach(c => cumulativeVocab.add(c));
        }
      }
    }

    vocabByLegoId.set(legoId, new Set(cumulativeVocab));
  }

  // Group phrases by LEGO
  const phrasesByLego = {};
  for (const p of phrases) {
    const legoId = `S${String(p.seed_number).padStart(4, '0')}L${String(p.lego_index).padStart(2, '0')}`;
    if (!phrasesByLego[legoId]) phrasesByLego[legoId] = [];
    phrasesByLego[legoId].push(p);
  }

  console.log('BASKETS NEEDING MORE PHRASES\n');
  console.log('='.repeat(80) + '\n');

  for (const legoId of needMore) {
    const match = legoId.match(/S(\d+)L(\d+)/);
    const seedNum = parseInt(match[1]);
    const legoIdx = parseInt(match[2]);

    const lego = legos.find(l => l.seed_number === seedNum && l.lego_index === legoIdx);
    if (!lego) {
      console.log(`${legoId}: LEGO NOT FOUND\n`);
      continue;
    }

    const existingPhrases = phrasesByLego[legoId] || [];
    const vocab = vocabByLegoId.get(legoId);

    const longPhrases = existingPhrases.filter(p => {
      const clean = (p.target_text || '').replace(/[\s\u3000。，！？、：；""'']/g, '');
      return clean.length >= 10;
    });

    const needed = Math.max(0, 7 - existingPhrases.length);
    const longNeeded = Math.max(0, 3 - longPhrases.length);

    console.log(`${legoId}:`);
    console.log(`  LEGO: "${lego.known_text}" → "${lego.target_text}"`);
    console.log(`  Type: ${lego.type}`);
    if (lego.type === 'M' && lego.components) {
      const compStr = lego.components.map(c => `${c.k || c.known} → ${c.t || c.target}`).join(', ');
      console.log(`  Components: ${compStr}`);
    }
    console.log(`  Current phrases: ${existingPhrases.length} (need ${needed} more)`);
    console.log(`  Long phrases (10+): ${longPhrases.length} (need ${longNeeded} more with 10+ chars)`);
    console.log(`  Available vocab: ${vocab ? vocab.size : 0} characters`);
    console.log(`  Vocab sample: ${vocab ? [...vocab].slice(0, 50).join('') : 'N/A'}`);
    console.log(`  Existing phrases:`);
    existingPhrases.sort((a, b) => a.position - b.position).forEach(p => {
      const len = (p.target_text || '').replace(/[\s\u3000。，！？、：；""'']/g, '').length;
      console.log(`    P${p.position} [${len}ch]: "${p.target_text}" / "${p.known_text}"`);
    });
    console.log('');
  }
}

analyze().catch(console.error);
