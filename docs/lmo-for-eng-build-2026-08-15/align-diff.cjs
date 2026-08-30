// Diff my authored LEGO boundaries against the INDEPENDENT blind alignment (#705).
//
// The estate defect: a LEGO's known side and target side fail to correspond because one side was
// sliced from a DIFFERENT WORD IN THE SAME SEED. The blind alignment is a word-map produced without
// ever reading course_legos, so it is an independent opinion on which English goes with which Lombard.
//
// Test per LEGO:
//   1. Take my LEGO's target T. Ask the alignment which English corresponds to the tokens of T
//      -> predicted English E.
//   2. Compare E against my LEGO's known K on content words.
//   3. If K and E share nothing, that is a DISAGREEMENT. Then check the swap signature: does K
//      instead match the English of some OTHER span of this same seed? That is the defect.
//
// Apostrophes are LETTERS on the Lombard side and are never stripped.
require('dotenv').config({ path: '.env.psql' });
const { Client } = require('pg');
const fs = require('fs');

const normT = s => (s || '').toLowerCase().trim().replace(/[.,!?;:«»""]/g, '').replace(/\s+/g, ' ');
const normK = s => (s || '').toLowerCase().trim().replace(/[.,!?;:«»""'']/g, '').replace(/\s+/g, ' ');
// English words that carry no identifying content — ignore them when testing correspondence.
const STOP = new Set('a an the to of in on at for with and or but if is am are was were be been do does did i you he she it we they my your his her not so as that this'.split(' '));
const content = s => normK(s).split(' ').filter(w => w && !STOP.has(w));

(async () => {
  const align = JSON.parse(fs.readFileSync('.a108-lmo-align/alignment.json', 'utf8'));
  const bySeed = new Map(align.map(a => [a.seed, a]));

  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const legos = (await c.query(
    `select seed_number, lego_index, known_text, target_text from course_legos
      where course_code='lmo_for_eng' order by seed_number, lego_index`)).rows;
  await c.end();

  let checked = 0, agree = 0, partial = 0, disagree = 0, noCover = 0, swaps = 0;
  const issues = [];

  for (const g of legos) {
    const a = bySeed.get(g.seed_number);
    if (!a) continue;
    checked++;
    const T = normT(g.target_text);
    const Ttok = T.split(' ');

    // which alignment pairs sit inside my LEGO's target?
    const inside = a.pairs.filter(p => {
      const l = normT(p.lmo);
      return l && (T === l || T.startsWith(l + ' ') || T.endsWith(' ' + l) || T.includes(' ' + l + ' ') || Ttok.includes(l));
    });
    if (!inside.length) { noCover++; continue; }

    const E = content(inside.map(p => p.eng).join(' '));
    const K = content(g.known_text);
    if (!K.length || !E.length) { noCover++; continue; }

    const shared = K.filter(w => E.includes(w));
    if (shared.length === K.length || shared.length === E.length) { agree++; continue; }
    if (shared.length > 0) { partial++; continue; }

    // No shared content word: candidate disagreement. Check the SWAP signature —
    // does my known match the English of a DIFFERENT part of this same seed?
    disagree++;
    const elsewhere = a.pairs.filter(p => !inside.includes(p) && content(p.eng).some(w => K.includes(w)));
    const isSwap = elsewhere.length > 0;
    if (isSwap) swaps++;
    issues.push({ g, E, K, inside, elsewhere, isSwap });
  }

  console.log(`\n=== BLIND-ALIGNMENT DIFF — my ${checked} LEGOs vs independent word-map (#705) ===\n`);
  console.log(`  agree (my gloss matches the alignment's English for my target)   : ${agree}`);
  console.log(`  partial agreement (overlapping but not identical content words)  : ${partial}`);
  console.log(`  not testable (alignment has no pair covering my target span)     : ${noCover}`);
  console.log(`  DISAGREEMENT (no shared content word)                            : ${disagree}`);
  console.log(`  of which SWAP SIGNATURE (my gloss belongs to another span)       : ${swaps}\n`);

  for (const it of issues) {
    console.log(`${it.isSwap ? '*** SWAP SIGNATURE' : '--- disagreement'} S${it.g.seed_number}L${it.g.lego_index}`);
    console.log(`      mine      : "${it.g.known_text}" -> "${it.g.target_text}"`);
    console.log(`      alignment : target maps to English [${it.E.join(' ')}]  (pairs: ${it.inside.map(p => `${p.lmo}=${p.eng}`).join(' | ')})`);
    if (it.isSwap) console.log(`      my gloss instead matches ELSEWHERE in this seed: ${it.elsewhere.map(p => `${p.lmo}=${p.eng}`).join(' | ')}`);
    console.log('');
  }
})().catch(e => { console.error(e.message); process.exit(1); });
