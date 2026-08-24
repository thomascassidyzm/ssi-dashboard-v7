// Mis-pairing self-check for vec_for_eng, per the estate scan brief (2026-08-15).
// Inherits two false-positive corrections from the nap build (field note, same night):
//   (a) APOSTROPHES ARE LETTERS on the target side. Venetian "l'ora", "no'l", "che'l"
//       are distinct words from "lora"/"nol"/"chel". Stripping them manufactures
//       false contradictions. Only sentence punctuation is normalised away.
//   (b) INTENTIONAL OVERLAP is not double-claiming. The discriminator: intentional
//       overlap has one target a literal SUBSTRING of the other with the glosses
//       nesting the same way; a REAL defect has two rows pointing at DIFFERENT
//       parts of the sentence with swapped counterparts.
require('dotenv').config({ path: '.env.psql' });
const { Client } = require('pg');
const fs = require('fs');

// NOTE: ' and ’ deliberately NOT stripped. Only sentence punctuation.
const norm = s => (s || '').toLowerCase().trim().replace(/[.,!?;:¿¡«»""]/g, '').replace(/\s+/g, ' ');
const words = s => norm(s).split(' ').filter(Boolean);

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const seeds = (await c.query(
    "select seed_number, known_text, target_text from course_seeds where course_code='vec_for_eng' and seed_number<=30 order by seed_number")).rows;
  const legos = (await c.query(
    "select seed_number, lego_index, type, known_text, target_text, components from course_legos where course_code='vec_for_eng' order by seed_number, lego_index")).rows;

  let hard = 0;
  const flag = (t, m) => { hard++; console.log(`  [${t}] ${m}`); };

  // ── T1 ROUND-TRIP ─────────────────────────────────────────────────────
  console.log('\n=== T1  ROUND-TRIP: submitted JSON vs stored rows ===');
  const authored = new Map();
  for (const f of fs.readdirSync('.a108-vec').filter(f => /^seeds-\d+-\d+\.json$/.test(f)))
    for (const s of JSON.parse(fs.readFileSync(`.a108-vec/${f}`, 'utf8')))
      for (const l of s.legos) authored.set(`${s.seed_number}|${l.idx}`, { known: l.known, target: l.target, comps: l.components || [] });
  let rt = 0, rtBad = 0;
  for (const g of legos) {
    const a = authored.get(`${g.seed_number}|${g.lego_index}`);
    if (!a) { flag('T1', `S${g.seed_number}L${g.lego_index} in DB but not authored`); continue; }
    rt++;
    // BYTE-exact, not normalised — this is the tool-corruption test.
    if (a.known !== g.known_text) { rtBad++; flag('T1', `S${g.seed_number}L${g.lego_index} KNOWN drift: sent "${a.known}" / stored "${g.known_text}"`); }
    if (a.target !== g.target_text) { rtBad++; flag('T1', `S${g.seed_number}L${g.lego_index} TARGET drift: sent "${a.target}" / stored "${g.target_text}"`); }
    const ac = a.comps.map(x => `${x.known}=>${x.target}`).join('|');
    const dc = (g.components || []).map(x => `${x.known}=>${x.target}`).join('|');
    if (ac !== dc) { rtBad++; flag('T1', `S${g.seed_number}L${g.lego_index} COMPONENT drift: sent [${ac}] / stored [${dc}]`); }
  }
  console.log(`  ${rt} legos round-tripped byte-for-byte, ${rtBad} drifted`);

  // ── T2 SELF-CONTRADICTION ─────────────────────────────────────────────
  console.log('\n=== T2  SELF-CONTRADICTION (apostrophes preserved) ===');
  const pairs = [];
  for (const g of legos) {
    pairs.push({ seed: g.seed_number, idx: g.lego_index, k: g.known_text, t: g.target_text, kind: 'lego' });
    for (const cp of g.components || []) pairs.push({ seed: g.seed_number, idx: g.lego_index, k: cp.known, t: cp.target, kind: 'component' });
  }
  const group = (keyf) => { const m = new Map(); for (const p of pairs) { const k = keyf(p); if (!m.has(k)) m.set(k, []); m.get(k).push(p); } return m; };
  let forks = 0, sameSeedForks = 0, convs = 0, sameSeedConvs = 0;
  for (const [k, ps] of group(p => norm(p.k))) {
    const ts = [...new Set(ps.map(p => norm(p.t)))];
    if (ts.length < 2) continue;
    forks++;
    const sameSeed = ps.some(a => ps.some(b => a.seed === b.seed && norm(a.t) !== norm(b.t)));
    console.log(`  ${sameSeed ? '*** SAME-SEED FORK (estate signature)' : 'cross-seed fork'}: known "${k}" -> ${ts.map(t => `"${t}"`).join(' / ')}`);
    ps.forEach(p => console.log(`        S${p.seed}L${p.idx} (${p.kind})`));
    if (sameSeed) { sameSeedForks++; hard++; }
  }
  for (const [t, ps] of group(p => norm(p.t))) {
    const ks = [...new Set(ps.map(p => norm(p.k)))];
    if (ks.length < 2) continue;
    convs++;
    const sameSeed = ps.some(a => ps.some(b => a.seed === b.seed && norm(a.k) !== norm(b.k)));
    console.log(`  ${sameSeed ? '*** SAME-SEED CONVERGENCE' : 'cross-seed convergence (ZUT-legal reception)'}: target "${t}" <- ${ks.map(k => `"${k}"`).join(' / ')}`);
    ps.forEach(p => console.log(`        S${p.seed}L${p.idx} (${p.kind})`));
    if (sameSeed) sameSeedConvs++;
  }
  console.log(`  known-side forks: ${forks} (same-seed: ${sameSeedForks}) · target-side convergences: ${convs} (same-seed: ${sameSeedConvs})`);

  // ── T3 COVERAGE + OVERLAP CLASSIFICATION ──────────────────────────────
  console.log('\n=== T3  SEED COVERAGE: missing legos / double-claims ===');
  const priorVocab = new Set();
  let gaps = 0, nested = 0, realDouble = 0, disjoint = 0;
  for (const s of seeds) {
    const mine = legos.filter(l => l.seed_number === s.seed_number);
    const sw = words(s.target_text);
    const cover = new Array(sw.length).fill(false);
    const apply = chunks => { for (const ch of chunks) for (let i = 0; i + ch.length <= sw.length; i++)
      if (ch.every((x, j) => x === sw[i + j])) for (let j = 0; j < ch.length; j++) cover[i + j] = true; };
    apply(mine.map(l => words(l.target_text)));
    apply(mine.flatMap(l => (l.components || []).map(cp => words(cp.target))));
    apply([...priorVocab].map(v => words(v)));
    const unclaimed = sw.filter((w, i) => !cover[i]);
    if (unclaimed.length) { gaps++; flag('T3', `S${s.seed_number} MISSING LEGO — "${s.target_text}" leaves [${unclaimed.join(' ')}] taught by nothing`); }
    // overlap classification between this seed's own legos
    for (let a = 0; a < mine.length; a++) for (let b = a + 1; b < mine.length; b++) {
      const ta = norm(mine[a].target_text), tb = norm(mine[b].target_text);
      const shares = words(ta).some(w => words(tb).includes(w));
      if (!shares) continue;
      const substring = ta.includes(tb) || tb.includes(ta);
      const ka = norm(mine[a].known_text), kb = norm(mine[b].known_text);
      const glossNests = ka.includes(kb) || kb.includes(ka);
      // SPAN TEST: where does each lego actually sit in the seed sentence?
      // Disjoint spans => the shared word is simply a word that occurs twice
      // (Venetian "ła" is both the fem. article and the fem. subject clitic).
      // That is not a claim on the same material and cannot be a mis-pairing.
      const spansOf = t => { const ch = words(t), out = [];
        for (let i = 0; i + ch.length <= sw.length; i++) if (ch.every((x, j) => x === sw[i + j])) out.push([i, i + ch.length - 1]);
        return out; };
      const sa = spansOf(ta), sb = spansOf(tb);
      const overlaps = sa.some(x => sb.some(y => x[0] <= y[1] && y[0] <= x[1]));
      if (!overlaps) { disjoint++; }
      else if (substring && glossNests) { nested++; }
      else { realDouble++; flag('T3', `S${s.seed_number} NON-NESTING OVERLAP L${mine[a].lego_index}"${ta}"(${ka}) vs L${mine[b].lego_index}"${tb}"(${kb})`); }
    }
    for (const l of mine) { priorVocab.add(l.target_text); for (const cp of l.components || []) priorVocab.add(cp.target); }
  }
  console.log(`  seeds with a missing lego: ${gaps} · intentional nested overlaps: ${nested} · shared-word-but-disjoint-span (not a claim): ${disjoint} · non-nesting overlaps: ${realDouble}`);
  console.log(`\n=== HARD ISSUES (T1 drift + same-seed forks + missing legos + non-nesting overlaps): ${hard} ===`);
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
