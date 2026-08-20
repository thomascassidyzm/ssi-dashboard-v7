#!/usr/bin/env node
/**
 * checkpoint.cjs <from_seed> <to_seed> — the five-point check from §8 of the build brief.
 *
 * (a) no word used before it was introduced   (R5)
 * (b) no bare frames                          (R2)
 * (c) dialect forms consistent                (R1, R6)
 * (d) English present and plausibly natural   (R4) — reported, not judged; a human reads these
 * (e) still zero audio rows
 *
 * Exit 1 if any hard check fails, so it can gate a loop.
 */
const { sb } = require('./q.cjs');
const { vocabBefore, words, knownWords } = require('./vocab.cjs');

const COURSE = 'gle_cn_for_eng';

// (c) Forms Kai has ruled against. Each is [pattern, what to write instead].
// The finite present of `labhair` (R6) is the one that keeps coming back: the verbal noun
// `labhairt` is correct and must NOT be flagged, so the patterns match only the finite endings.
const BANNED = [
  [/\bamárach\b/i, 'amáireach (R1 — Ó Curnáin asterisks amárach as non-attested)'],
  [/\béigin\b/i, 'eicínt (R1 — 213:1 in Connemara; Ó Curnáin asterisks éigin)'],
  [/\btáimid\b/i, 'tá muid (R1)'],
  [/\bas Gaeilge\b/i, 'i nGaeilge (R1 — as Gaeilge is 0 across 2,700pp)'],
  [/\bgach uile\b/i, 'chuile (R1)'],
  [/\bcad\b/i, 'céard (R1)'],
  [/\blabhra(?:ím|íonn|íomid|aíonn)\b/i, 'NOT the finite present of labhair (R6) — use tá … agam for proficiency, ag caint for the speech act'],
  [/\bchaoi le\b/i, 'cén chaoi with no le (chaoi le is 0 in 2,700pp)'],
  [/\bag triail\b/i, 'iarracht a dhéanamh (standing ban on ag triail)'],
];

// (b) A bare frame is a tile taught with a hole in it rather than in a whole sentence.
const FRAME = /(_{2,}|\.\.\.|\[[^\]]*\]|\bsomething\/\w|\bX\b|<[^>]+>)/;

async function main() {
  const from = parseInt(process.argv[2], 10) || 1;
  const to = parseInt(process.argv[3], 10) || 300;
  const fails = [];
  const warns = [];

  // ─── (e) audio, first and loudest ────────────────────────────────────────
  const { count: audio } = await sb.from('course_audio')
    .select('*', { count: 'exact', head: true }).eq('course_code', COURSE);
  if (audio !== 0) fails.push(`(e) AUDIO ROWS EXIST: ${audio}. This build must have zero. STOP.`);

  const { data: seeds } = await sb.from('course_seeds')
    .select('seed_number,known_text,target_text')
    .eq('course_code', COURSE).gte('seed_number', from).lte('seed_number', to).order('seed_number');

  const legos = [];
  const phrases = [];
  for (const [table, sink] of [['course_legos', legos], ['course_practice_phrases', phrases]]) {
    for (let off = 0; ; off += 1000) {
      const { data, error } = await sb.from(table)
        .select(table === 'course_legos'
          ? 'seed_number,known_text,target_text,components'
          : 'seed_number,known_text,target_text')
        .eq('course_code', COURSE).gte('seed_number', from).lte('seed_number', to)
        .order('seed_number').order('id').range(off, off + 999);
      if (error) throw new Error(error.message);
      sink.push(...data);
      if (data.length < 1000) break;
    }
  }

  const rows = [
    ...seeds.map(r => ({ ...r, what: `seed ${r.seed_number}` })),
    ...legos.map(r => ({ ...r, what: `lego @ seed ${r.seed_number}` })),
    ...phrases.map(r => ({ ...r, what: `phrase @ seed ${r.seed_number}` })),
  ];

  // ─── (b) and (c) ─────────────────────────────────────────────────────────
  for (const r of rows) {
    for (const [re, fix] of BANNED) {
      if (re.test(r.target_text || '')) {
        fails.push(`(c) ${r.what}: "${r.target_text}" — use ${fix}`);
      }
    }
    for (const side of ['known_text', 'target_text']) {
      if (FRAME.test(r[side] || '')) {
        fails.push(`(b) ${r.what}: bare frame in ${side}: "${r[side]}"`);
      }
    }
    // (d) is reported for a human to read, not auto-judged — naturalness is not machine-checkable.
    if (!(r.known_text || '').trim()) warns.push(`(d) ${r.what}: empty known side`);
  }

  // ─── (a) R5, the important one ───────────────────────────────────────────
  const bySeed = new Map();
  for (const p of phrases) {
    if (!bySeed.has(p.seed_number)) bySeed.set(p.seed_number, []);
    bySeed.get(p.seed_number).push(p);
  }
  for (const seedNum of [...bySeed.keys()].sort((a, b) => a - b)) {
    const { known, target } = await vocabBefore(seedNum);
    // The seed's own new tiles count as introduced at this seed.
    for (const l of legos.filter(l => l.seed_number === seedNum)) {
      for (const w of knownWords(l.known_text)) known.set(w, seedNum);
      for (const w of words(l.target_text)) target.set(w, seedNum);
      // A component tile IS its own introduction — the learner meets "is"/"atá" as a piece of the
      // seed being built, so it must not be reported as used-before-introduced.
      for (const c of l.components || []) {
        for (const w of knownWords(c.known)) known.set(w, seedNum);
        for (const w of words(c.target)) target.set(w, seedNum);
      }
    }
    for (const p of bySeed.get(seedNum)) {
      const newK = knownWords(p.known_text).filter(w => !known.has(w));
      const newT = words(p.target_text).filter(w => !target.has(w));
      if (newK.length || newT.length) {
        fails.push(`(a) seed ${seedNum} phrase "${p.known_text}" / "${p.target_text}" — `
          + `unintroduced${newK.length ? ` known: ${newK.join(', ')}` : ''}`
          + `${newT.length ? ` target: ${newT.join(', ')}` : ''}`);
      }
    }
  }

  // ─── report ──────────────────────────────────────────────────────────────
  const translated = seeds.filter(s => (s.target_text || '').trim()).length;
  const decomposed = new Set(legos.map(l => l.seed_number)).size;
  console.log(`=== CHECKPOINT seeds ${from}–${to} ===`);
  console.log(`translated ${translated}/${seeds.length} · decomposed ${decomposed}/${seeds.length}`
    + ` · legos ${legos.length} · phrases ${phrases.length} · audio ${audio}`);
  for (const w of warns) console.log('WARN  ' + w);
  if (!fails.length) {
    console.log('\nPASS — all five checks clean.');
    console.log('(d) naturalness of the English still needs a human read; this tool cannot judge it.');
    return;
  }
  console.log(`\nFAIL — ${fails.length} problem(s). Fix before continuing (brief §8):\n`);
  for (const f of fails.slice(0, 200)) console.log('  ' + f);
  if (fails.length > 200) console.log(`  … and ${fails.length - 200} more`);
  process.exitCode = 1;
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
