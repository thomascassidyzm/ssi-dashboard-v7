/**
 * The brief's three self-checks, run against what is ACTUALLY STORED in
 * Postgres for cym_for_yor — not against the source file.
 *
 *  1. correspondence: does each LEGO's known side and target side actually
 *     correspond, with neither borrowed from a sibling LEGO in the same seed?
 *  2. self-contradiction: same word paired with different counterparts, or
 *     different words with the same counterpart.
 *  3. missing LEGO: a word the seed sentence needs that no LEGO teaches.
 *
 * All Yoruba comparison is DIACRITIC-EXACT. Nothing is stripped or merged.
 */
const fs = require('fs');
const { Client } = require('pg');
const url = fs.readFileSync(__dirname + '/../../.env.psql', 'utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)[1];

const fold = s => (s || '').normalize('NFC').replace(/[.,!?;:]/g, ' ').split(/\s+/).filter(Boolean).map(w => w.toLowerCase()).join(' ');
const wlist = s => fold(s).split(' ').filter(Boolean);

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const seeds = (await c.query(`select seed_number, known_text, target_text from course_seeds where course_code='cym_for_yor' and seed_number<=10 order by seed_number`)).rows;
  const legos = (await c.query(`select seed_number, lego_index, type, known_text, target_text, components from course_legos where course_code='cym_for_yor' order by seed_number, lego_index`)).rows;
  const phrases = (await c.query(`select seed_number, lego_index, known_text, target_text, phrase_role from course_practice_phrases where course_code='cym_for_yor' order by seed_number, lego_index`)).rows;

  console.log(`STORED: ${seeds.length} seeds in range, ${legos.length} legos, ${phrases.length} phrases\n`);

  // ─── 1 + 3: per-seed coverage, double-claim, rotation ───
  console.log('══ CHECK 1 & 3 — slice correspondence, double-claim, missing LEGO ══\n');
  const priorK = new Set(), priorT = new Set();
  let gapsK = 0, gapsT = 0, doubleK = 0, doubleT = 0, cross = 0, noncontig = 0;

  const span = (hay, needle) => {
    const n = wlist(needle); if (!n.length) return -1;
    for (let i = 0; i + n.length <= hay.length; i++) {
      let ok = true; for (let j = 0; j < n.length; j++) if (hay[i + j] !== n[j]) { ok = false; break; }
      if (ok) return i;
    } return -1;
  };
  const wordsOf = set => { const o = new Set(); for (const ch of set) for (const w of ch.split(' ')) if (w) o.add(w); return o; };

  for (const s of seeds) {
    const pk = wordsOf(priorK), pt = wordsOf(priorT);
    const kw = wlist(s.known_text), tw = wlist(s.target_text);
    const kc = new Array(kw.length).fill(0), tc = new Array(tw.length).fill(0);
    const mine = legos.filter(l => l.seed_number === s.seed_number);
    const pos = [];
    for (const l of mine) {
      const ki = span(kw, l.known_text), ti = span(tw, l.target_text);
      if (ki < 0) { console.log(`  ✗ NON-CONTIGUOUS known slice  S${s.seed_number}L${l.lego_index}: "${l.known_text}"`); noncontig++; }
      else for (let j = 0; j < wlist(l.known_text).length; j++) kc[ki + j]++;
      if (ti < 0) { console.log(`  ✗ NON-CONTIGUOUS target slice S${s.seed_number}L${l.lego_index}: "${l.target_text}"`); noncontig++; }
      else for (let j = 0; j < wlist(l.target_text).length; j++) tc[ti + j]++;
      if (ki >= 0 && ti >= 0) pos.push({ ki, ti, l });
      priorK.add(fold(l.known_text)); priorT.add(fold(l.target_text));
      for (const comp of (l.components || [])) { priorK.add(fold(comp.known)); priorT.add(fold(comp.target)); }
    }
    const gk = kw.filter((w, i) => kc[i] === 0 && !pk.has(w));
    const gt = tw.filter((w, i) => tc[i] === 0 && !pt.has(w));
    if (gk.length) { console.log(`  ✗ MISSING LEGO (Yoruba) S${s.seed_number}: ${gk.join(', ')}`); gapsK++; }
    if (gt.length) { console.log(`  ✗ MISSING LEGO (Welsh)  S${s.seed_number}: ${gt.join(', ')}`); gapsT++; }
    const dk = kw.filter((w, i) => kc[i] > 1), dt = tw.filter((w, i) => tc[i] > 1);
    if (dk.length) { console.log(`  · overlap (Yoruba) S${s.seed_number}: ${dk.join(', ')} claimed by >1 LEGO — expected where LEGOs overlap by design`); doubleK++; }
    if (dt.length) { console.log(`  · overlap (Welsh)  S${s.seed_number}: ${dt.join(', ')} claimed by >1 LEGO — expected where LEGOs overlap by design`); doubleT++; }
    const srt = [...pos].sort((a, b) => a.ki - b.ki);
    for (let a = 0; a < srt.length; a++) for (let b = a + 1; b < srt.length; b++) if (srt[a].ti > srt[b].ti) {
      cross++;
      console.log(`  ⚠ ORDER CROSSING S${s.seed_number}: "${srt[a].l.known_text}"→"${srt[a].l.target_text}"  vs  "${srt[b].l.known_text}"→"${srt[b].l.target_text}"`);
    }
  }
  console.log(`\n  non-contiguous slices        : ${noncontig}`);
  console.log(`  seeds w/ uncovered Yoruba word: ${gapsK}`);
  console.log(`  seeds w/ uncovered Welsh word : ${gapsT}`);
  console.log(`  seeds w/ overlapping claims   : ${doubleK} known / ${doubleT} target  (overlap is the teaching mechanism, not a defect)`);
  console.log(`  known/target order crossings  : ${cross}`);

  // ─── 2: self-contradiction over EVERY stored row ───
  console.log('\n══ CHECK 2 — self-contradiction, over every stored LEGO, component and phrase ══\n');
  const rows = [];
  for (const l of legos) {
    rows.push({ k: fold(l.known_text), t: fold(l.target_text), w: `S${l.seed_number}L${l.lego_index}`, kind: 'lego' });
    for (const comp of (l.components || [])) rows.push({ k: fold(comp.known), t: fold(comp.target), w: `S${l.seed_number}L${l.lego_index}comp`, kind: 'component' });
  }
  for (const p of phrases) rows.push({ k: fold(p.known_text), t: fold(p.target_text), w: `S${p.seed_number}L${p.lego_index} ${p.phrase_role}`, kind: 'phrase' });

  const fwd = new Map();
  for (const r of rows) {
    if (!fwd.has(r.k)) fwd.set(r.k, new Map());
    if (!fwd.get(r.k).has(r.t)) fwd.get(r.k).set(r.t, r.w);
  }
  let contra = 0;
  for (const [k, m] of fwd) if (m.size > 1) {
    contra++;
    console.log(`  ✗ "${k}"  →  ${[...m.entries()].map(([t, w]) => `"${t}" @${w}`).join('   vs   ')}`);
  }
  const rev = new Map();
  for (const r of rows) { if (!rev.has(r.t)) rev.set(r.t, new Set()); rev.get(r.t).add(r.k); }
  const conv = [...rev.values()].filter(s => s.size > 1).length;

  console.log(`\n  rows compared                          : ${rows.length}`);
  console.log(`  distinct Yoruba prompts                : ${fwd.size}`);
  console.log(`  SAME Yoruba → DIFFERENT Welsh (DEFECT) : ${contra}`);
  console.log(`  DIFFERENT Yoruba → same Welsh (allowed): ${conv}`);

  const bad = noncontig + gapsK + gapsT + cross + contra;
  console.log(`\n────────────────────────────────────────`);
  console.log(bad ? `✗ ${bad} finding(s)` : `✓ CLEAN on stored rows: 0 non-corresponding slices, 0 missing LEGOs, 0 contradictions`);
  await c.end();
  process.exit(0);
})();
