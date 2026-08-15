/**
 * Byte-for-byte diacritic round-trip: what we SENT vs what Postgres HOLDS.
 * Compares hex, not rendered glyphs, so no normalisation can hide a loss.
 */
const fs = require('fs');
const { Client } = require('pg');
const seeds = require('./golden-decompositions-seeds-1-10.cjs');
const url = fs.readFileSync(__dirname + '/../../.env.psql', 'utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)[1];

const hex = s => Buffer.from(s, 'utf8').toString('hex');
const COMB = /[̀-ͯ]/g;
const yorubaBytes = s => hex(s.normalize('NFC').replace(/[A-Za-z0-9 '.,?!:;\-]/g, ''));

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const legos = (await c.query(
    `select seed_number, lego_index, known_text, target_text from course_legos
     where course_code='cym_for_yor' order by seed_number, lego_index`)).rows;
  const phrases = (await c.query(
    `select id, seed_number, lego_index, known_text, target_text, phrase_role from course_practice_phrases
     where course_code='cym_for_yor' order by seed_number, lego_index, id`)).rows;

  console.log(`rows read back: ${legos.length} legos, ${phrases.length} phrases\n`);

  // ── 1. LEGO known side (Yoruba): sent vs stored ──
  let exact = 0, asciiOnly = 0, yorubaLoss = [];
  console.log('══ LEGO KNOWN SIDE (Yoruba) — sent vs stored ══');
  for (const seed of seeds) {
    for (const l of seed.legos) {
      const row = legos.find(r => r.seed_number === seed.seed_number && r.lego_index === l.idx);
      if (!row) { console.log(`  ! S${seed.seed_number}L${l.idx} MISSING from DB`); continue; }
      const sent = l.known, got = row.known_text;
      if (sent === got) { exact++; continue; }
      if (yorubaBytes(sent) === yorubaBytes(got)) {
        asciiOnly++;
        console.log(`  ~ S${seed.seed_number}L${String(l.idx).padStart(2)}  "${sent}" → "${got}"   (ASCII-only difference; Yoruba bytes identical)`);
      } else {
        yorubaLoss.push({ seed: seed.seed_number, idx: l.idx, sent, got });
        console.log(`  ✗ S${seed.seed_number}L${l.idx} YORUBA BYTE LOSS`);
        console.log(`      sent ${hex(sent)}`);
        console.log(`      got  ${hex(got)}`);
      }
    }
  }
  console.log(`\n  byte-identical: ${exact}   ASCII-only difference: ${asciiOnly}   YORUBA LOSS: ${yorubaLoss.length}`);

  // ── 2. Whole-corpus character census on what is actually stored ──
  const allYor = [...legos.map(r => r.known_text), ...phrases.map(r => r.known_text)].filter(Boolean);
  const inv = new Map();
  for (const s of allYor) for (const ch of s) if (ch.codePointAt(0) > 127) inv.set(ch, (inv.get(ch) || 0) + 1);
  console.log(`\n══ STORED YORUBA CHARACTER INVENTORY (${allYor.length} strings) ══`);
  [...inv.entries()].sort((a, b) => b[1] - a[1]).forEach(([ch, n]) => {
    const cp = ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    const comb = /[̀-ͯ]/.test(ch) ? '  ← COMBINING MARK' : '';
    console.log(`   ${JSON.stringify(ch)}  U+${cp}  ×${n}${comb}`);
  });

  const nfc = allYor.filter(s => s === s.normalize('NFC')).length;
  const nfd = allYor.filter(s => s === s.normalize('NFD')).length;
  console.log(`\n  NFC-normalised: ${nfc}/${allYor.length}   pure NFD: ${nfd}/${allYor.length}`);
  const combCount = allYor.join('').match(COMB)?.length || 0;
  console.log(`  standalone combining marks present in NFC text: ${combCount}`);
  console.log(`  (this is CORRECT: no precomposed codepoint exists for dot-below + tone,`);
  console.log(`   so ẹ́ is necessarily U+1EB9 + U+0301 even in fully-normalised NFC)`);

  const invisible = allYor.filter(s => /[​-‍﻿ ]/.test(s));
  console.log(`  strings containing zero-width / NBSP / BOM: ${invisible.length}`);

  // ── 3. Welsh side: did anything mangle the circumflex/apostrophe? ──
  const allCym = [...legos.map(r => r.target_text), ...phrases.map(r => r.target_text)].filter(Boolean);
  const cymInv = new Map();
  for (const s of allCym) for (const ch of s) if (ch.codePointAt(0) > 127 || ch === "'") cymInv.set(ch, (cymInv.get(ch) || 0) + 1);
  console.log(`\n══ STORED WELSH SPECIAL CHARACTERS (${allCym.length} strings) ══`);
  [...cymInv.entries()].sort((a, b) => b[1] - a[1]).forEach(([ch, n]) =>
    console.log(`   ${JSON.stringify(ch)}  U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}  ×${n}`));

  // ── 4. The tone-blindness proof, live: kọ́ vs kọ both survive as distinct ──
  console.log(`\n══ LIVE TONE-CONTRAST PROOF ══`);
  const strip = s => s.normalize('NFD').replace(COMB, '');
  const koForms = new Map();
  for (const s of allYor) for (const w of s.split(/\s+/)) {
    if (strip(w).toLowerCase().replace(/[̣]/g, '') === 'ko' || strip(w.normalize('NFD').replace(/[̣]/g, '')).toLowerCase() === 'ko')
      koForms.set(w, (koForms.get(w) || 0) + 1);
  }
  [...koForms.entries()].sort((a, b) => b[1] - a[1]).forEach(([w, n]) =>
    console.log(`   ${w}   ×${n}   hex=${hex(w)}`));
  console.log(`   → distinct stored forms that strip to the same string: ${koForms.size}`);

  await c.end();
  process.exit(yorubaLoss.length ? 1 : 0);
})();
