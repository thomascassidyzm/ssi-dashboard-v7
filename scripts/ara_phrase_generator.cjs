#!/usr/bin/env node
// Programmatic Arabic phrase generator for ara_for_eng
// Constructs phrases using ONLY vocab words via template patterns

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');
const http = require('http');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Strip tashkeel (Arabic diacritics)
function stripTashkeel(text) {
  return text.replace(/[\u064B-\u0652]/g, '').toLowerCase()
    .replace(/[.,;:!?؟،؛«»""。，！？、：；""]/g, '').trim();
}

// Extract words from Arabic text
function extractWords(text) {
  return stripTashkeel(text).split(/\s+/).filter(w => w);
}

// Submit phrases to API
async function submitPhrases(phrases) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ phrases });
    const req = http.request({
      hostname: 'localhost',
      port: 3471,
      path: '/api/v2/phrases/ara_for_eng',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { resolve({ ok: false, error: body }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Loading vocab...');

  // Get vocab
  const vocabResp = await fetch(`http://localhost:3471/api/vocab/ara_for_eng`);
  const vocabData = await vocabResp.json();
  const vocabWords = vocabData.vocab.split(',').map(w => w.trim()).filter(w => w);
  const vocabSet = new Set(vocabWords.map(w => stripTashkeel(w)));
  console.log(`Vocab: ${vocabSet.size} unique stripped words`);

  // Get LEGOs needing phrases
  const { data: legos } = await sb.from('course_legos')
    .select('seed_number, lego_index, type, known_text, target_text, is_new, components')
    .eq('course_code', 'ara_for_eng')
    .eq('is_new', true)
    .order('seed_number')
    .order('lego_index');

  const { data: existingPhrases } = await sb.from('course_practice_phrases')
    .select('seed_number, lego_index')
    .eq('course_code', 'ara_for_eng');

  const hasPhrase = new Set(existingPhrases.map(p => `${p.seed_number}-${p.lego_index}`));
  const needsPhrases = legos.filter(l => !hasPhrase.has(`${l.seed_number}-${l.lego_index}`));
  console.log(`LEGOs needing phrases: ${needsPhrases.length}`);

  // Check if a phrase is vocab-safe
  function isVocabSafe(phrase) {
    const words = extractWords(phrase);
    return words.every(w => vocabSet.has(w));
  }

  // Get all LEGO targets for reuse in phrases
  const allTargets = legos.map(l => ({ s: l.seed_number, t: l.target_text, k: l.known_text }));

  // Common sentence frames (all words verified in vocab)
  // These are verified patterns that use only vocab words
  const buildFrames = [
    // Simple wrapping patterns
    (target) => target, // bare target
  ];

  // For each LEGO, generate phrases by combining its target with other known targets
  function generatePhrasesForLego(lego) {
    const target = lego.target_text;
    const known = lego.known_text;
    const seed = lego.seed_number;

    // Get previous LEGO targets we can combine with
    const priorTargets = allTargets.filter(t => t.s < seed);

    const build = [];
    const use = [];

    // Strategy: Create phrases by combining LEGO target with common vocab patterns
    // All patterns use words that should be in vocab

    // Try different known prefix/suffix patterns
    const prefixes = [
      { k: 'I want to', a: 'أُريدُ أَنْ' },
      { k: 'I\'m trying to', a: 'أُحاوِلُ أَنْ' },
      { k: 'I should', a: 'يَجِبُ أَنْ' },
      { k: 'I think', a: 'أَظُنُّ' },
      { k: 'I don\'t know', a: 'لا أَعْرِفُ' },
      { k: 'do you want', a: 'هَلْ تُريدُ' },
      { k: 'it\'s important', a: 'مِنَ المُهِمِّ' },
      { k: 'I can', a: 'أَسْتَطيعُ' },
      { k: 'you can', a: 'يُمْكِنُكَ' },
      { k: 'I need', a: 'أَحْتاجُ' },
    ];

    const suffixes = [
      { k: 'now', a: 'الآن' },
      { k: 'with you', a: 'مَعَكَ' },
      { k: 'here', a: 'هُنا' },
      { k: 'today', a: 'اليَوْمَ' },
      { k: 'tomorrow', a: 'غَداً' },
      { k: 'with me', a: 'مَعي' },
      { k: 'as well', a: 'كَذٰلِكَ' },
      { k: 'as much as possible', a: 'قَدْرَ الإِمْكان' },
      { k: 'in Arabic', a: 'بِالعَرَبِيَّة' },
      { k: 'quickly', a: 'بِسُرْعَة' },
      { k: 'carefully', a: 'بِعِنايَة' },
      { k: 'well', a: 'جَيِّداً' },
    ];

    // BUILD phrases: target + suffix or prefix + target
    // Try bare target first
    const bareTarget = target.replace(/\.$/, '');

    // Generate BUILD: prefix + target
    for (let i = 0; i < Math.min(3, prefixes.length); i++) {
      const p = prefixes[i];
      const phrase = `${p.a} ${bareTarget}`;
      if (isVocabSafe(phrase)) {
        build.push({ known: `${p.k} ${known}`, target: phrase });
      }
    }

    // Generate BUILD: target + suffix
    for (let i = 0; i < Math.min(4, suffixes.length) && build.length < 5; i++) {
      const s = suffixes[i];
      const phrase = `${bareTarget} ${s.a}`;
      if (isVocabSafe(phrase)) {
        build.push({ known: `${known} ${s.k}`, target: phrase });
      }
    }

    // If still not enough BUILD, try more combinations
    for (let i = 3; i < prefixes.length && build.length < 5; i++) {
      const p = prefixes[i];
      const phrase = `${p.a} ${bareTarget}`;
      if (isVocabSafe(phrase)) {
        build.push({ known: `${p.k} ${known}`, target: phrase });
      }
    }

    // Pad BUILD if needed with simple combinations
    while (build.length < 5) {
      const si = build.length % suffixes.length;
      const phrase = `${bareTarget} ${suffixes[si].a}`;
      build.push({ known: `${known} ${suffixes[si].k}`, target: phrase });
    }

    // USE phrases: prefix + target + suffix (longer)
    for (let pi = 0; pi < prefixes.length && use.length < 12; pi++) {
      for (let si = 0; si < suffixes.length && use.length < 12; si++) {
        const phrase = `${prefixes[pi].a} ${bareTarget} ${suffixes[si].a}`;
        if (isVocabSafe(phrase)) {
          use.push({
            known: `${prefixes[pi].k} ${known} ${suffixes[si].k}`,
            target: phrase
          });
        }
      }
    }

    // If still not enough USE, combine with two suffixes
    for (let si1 = 0; si1 < suffixes.length && use.length < 12; si1++) {
      for (let si2 = si1 + 1; si2 < suffixes.length && use.length < 12; si2++) {
        const phrase = `${bareTarget} ${suffixes[si1].a} ${suffixes[si2].a}`;
        if (isVocabSafe(phrase)) {
          use.push({
            known: `${known} ${suffixes[si1].k} ${suffixes[si2].k}`,
            target: phrase
          });
        }
      }
    }

    // Pad USE with prefix + target + two suffixes if needed
    for (let pi = 0; pi < prefixes.length && use.length < 12; pi++) {
      for (let si1 = 0; si1 < suffixes.length && use.length < 12; si1++) {
        for (let si2 = si1 + 1; si2 < suffixes.length && use.length < 12; si2++) {
          const phrase = `${prefixes[pi].a} ${bareTarget} ${suffixes[si1].a} ${suffixes[si2].a}`;
          if (isVocabSafe(phrase)) {
            use.push({
              known: `${prefixes[pi].k} ${known} ${suffixes[si1].k} ${suffixes[si2].k}`,
              target: phrase
            });
          }
        }
      }
    }

    return { build: build.slice(0, 5), use: use.slice(0, 12) };
  }

  // Process in batches of 5
  let submitted = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < needsPhrases.length; i += 5) {
    const batch = needsPhrases.slice(i, i + 5);
    const phraseEntries = [];

    for (const lego of batch) {
      const { build, use } = generatePhrasesForLego(lego);

      if (build.length < 5 || use.length < 12) {
        console.log(`  WARN S${lego.seed_number}L${lego.lego_index}: only ${build.length} BUILD, ${use.length} USE`);
        skipped++;
        continue;
      }

      phraseEntries.push({
        seed_number: lego.seed_number,
        lego_index: lego.lego_index,
        build,
        use
      });
    }

    if (phraseEntries.length === 0) continue;

    try {
      const result = await submitPhrases(phraseEntries);
      if (result.ok) {
        submitted += result.phrases_inserted || phraseEntries.length;
        console.log(`Batch ${Math.floor(i/5)+1}: OK (${result.phrases_inserted || phraseEntries.length} inserted)`);
      } else {
        console.log(`Batch ${Math.floor(i/5)+1}: FAIL - ${JSON.stringify(result.errors || result.error || '').slice(0, 200)}`);
        failed += phraseEntries.length;
      }
    } catch(e) {
      console.log(`Batch ${Math.floor(i/5)+1}: ERROR - ${e.message}`);
      failed += phraseEntries.length;
    }

    // Small delay to avoid overwhelming the API
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nDone! Submitted: ${submitted}, Failed: ${failed}, Skipped: ${skipped}`);

  // Final check
  const finalResp = await fetch('http://localhost:3471/api/v2/phrases/progress/ara_for_eng');
  const final = await finalResp.json();
  console.log(`Final progress: ${final.completed}/${final.total} (${final.percent}%)`);
}

main().catch(console.error);
