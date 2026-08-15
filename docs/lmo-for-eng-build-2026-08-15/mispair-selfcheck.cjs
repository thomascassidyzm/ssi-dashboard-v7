// Mis-pairing self-check for lmo_for_eng, per the estate scan brief (2026-08-15).
//
// Four language-agnostic tests:
//   T1 round-trip        — does the DB hold byte-for-byte what I submitted? (catches the tool mutating rows)
//   T2 self-contradiction— same known -> different targets, or same target -> different knowns.
//                          SAME-SEED cases are the estate signature (one side sliced from a sibling LEGO).
//   T3 coverage          — every word of the seed target claimed by a LEGO; nothing unclaimed (missing-LEGO
//                          defect). Overlaps are classified, not blindly flagged — see the discriminator.
//   T4 untaught-word     — every practice phrase tiles from vocabulary introduced at or before its LEGO.
//
// TWO FALSE-POSITIVE CLASSES DELIBERATELY AVOIDED (inherited from the nap_for_eng run, 2026-08-15):
//   (a) APOSTROPHES ARE LETTERS ON THE TARGET SIDE. Lombard has l'è, l'ora, gh'abbia, quell'.
//       Stripping the apostrophe merges distinct words and manufactures fake contradictions.
//       normT keeps it; only the ENGLISH side is apostrophe-stripped (normK), where it is punctuation.
//   (b) INTENTIONAL OVERLAP IS NOT DOUBLE-CLAIMING. The methodology teaches a small unit inside a
//       larger one on purpose. DISCRIMINATOR: intentional overlap has one target as a literal
//       SUBSTRING of the other AND the glosses nesting the same way. A real defect has two rows
//       pointing at DIFFERENT parts of the sentence with swapped counterparts.
require('dotenv').config({ path: '.env.psql' });
const { Client } = require('pg');
const fs = require('fs');

const CODE = 'lmo_for_eng';
// Target side: apostrophe is a LETTER. Strip sentence punctuation only.
const normT = s => (s || '').toLowerCase().trim().replace(/[.,!?;:¿¡«»""]/g, '').replace(/\s+/g, ' ');
// Known side: English, apostrophe is punctuation.
const normK = s => (s || '').toLowerCase().trim().replace(/[.,!?;:¿¡«»""'']/g, '').replace(/\s+/g, ' ');
const wT = s => normT(s).split(' ').filter(Boolean);

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const seeds = (await c.query(
    `select seed_number, known_text, target_text from course_seeds
      where course_code=$1 and seed_number <= 30 order by seed_number`, [CODE])).rows;
  const legos = (await c.query(
    `select seed_number, lego_index, type, known_text, target_text, components
       from course_legos where course_code=$1 order by seed_number, lego_index`, [CODE])).rows;
  const phrases = (await c.query(
    `select seed_number, lego_index, position, phrase_role, known_text, target_text
       from course_practice_phrases where course_code=$1 order by seed_number, lego_index, position`, [CODE])).rows;
  await c.end();

  let hard = 0;
  const flag = (t, m) => { hard++; console.log(`  [${t}] ${m}`); };

  // ── T1  round-trip: authored JSON vs stored rows ───────────────────────────
  console.log('\n=== T1  ROUND-TRIP: what I submitted vs what the DB stored ===');
  const authored = new Map();
  for (const f of fs.readdirSync('.a108-lmo').filter(f => /^seeds-\d+-\d+\.json$/.test(f)))
    for (const s of JSON.parse(fs.readFileSync(`.a108-lmo/${f}`, 'utf8')))
      for (const l of s.legos)
        authored.set(`${s.seed_number}|${l.idx}`, { known: l.known, target: l.target, comps: l.components || [] });

  let rt = 0, rtBad = 0;
  for (const g of legos) {
    const a = authored.get(`${g.seed_number}|${g.lego_index}`);
    if (!a) { flag('T1', `S${g.seed_number}L${g.lego_index} in DB but in no authored file`); continue; }
    rt++;
    if (normK(a.known) !== normK(g.known_text)) { rtBad++; flag('T1', `S${g.seed_number}L${g.lego_index} KNOWN drift: sent "${a.known}" / stored "${g.known_text}"`); }
    if (normT(a.target) !== normT(g.target_text)) { rtBad++; flag('T1', `S${g.seed_number}L${g.lego_index} TARGET drift: sent "${a.target}" / stored "${g.target_text}"`); }
    const ac = a.comps.map(x => `${normK(x.known)}=>${normT(x.target)}`).join('|');
    const dc = (g.components || []).map(x => `${normK(x.known)}=>${normT(x.target)}`).join('|');
    if (ac !== dc) { rtBad++; flag('T1', `S${g.seed_number}L${g.lego_index} COMPONENT drift: sent [${ac}] / stored [${dc}]`); }
  }
  console.log(`  ${rt} LEGOs round-tripped, ${rtBad} drifted`);

  // ── T2  self-contradiction ─────────────────────────────────────────────────
  console.log('\n=== T2  SELF-CONTRADICTION across every LEGO + component pairing ===');
  const pairs = [];
  for (const g of legos) {
    pairs.push({ seed: g.seed_number, idx: g.lego_index, k: g.known_text, t: g.target_text, kind: 'lego' });
    for (const cp of g.components || []) pairs.push({ seed: g.seed_number, idx: g.lego_index, k: cp.known, t: cp.target, kind: 'component' });
  }
  const group = (arr, keyfn) => {
    const m = new Map();
    for (const p of arr) { const k = keyfn(p); if (!m.has(k)) m.set(k, []); m.get(k).push(p); }
    return m;
  };
  const byKnown = group(pairs, p => normK(p.k));
  const byTarget = group(pairs, p => normT(p.t));

  let forks = 0, convs = 0, signature = 0;
  for (const [k, ps] of byKnown) {
    const ts = [...new Set(ps.map(p => normT(p.t)))];
    if (ts.length < 2) continue;
    forks++;
    const sameSeed = ps.some(a => ps.some(b => a.seed === b.seed && normT(a.t) !== normT(b.t)));
    console.log(`  ${sameSeed ? '*** SAME-SEED FORK (estate signature)' : 'cross-seed FORK'}: known "${k}" -> ${ts.map(t => `"${t}"`).join(' / ')}`);
    ps.forEach(p => console.log(`        S${p.seed}L${p.idx} (${p.kind}) "${p.k}" -> "${p.t}"`));
    if (sameSeed) { signature++; hard++; }
  }
  for (const [t, ps] of byTarget) {
    const ks = [...new Set(ps.map(p => normK(p.k)))];
    if (ks.length < 2) continue;
    convs++;
    const sameSeed = ps.some(a => ps.some(b => a.seed === b.seed && normK(a.k) !== normK(b.k)));
    console.log(`  ${sameSeed ? '*** SAME-SEED CONVERGENCE' : 'cross-seed CONVERGENCE'}: target "${t}" <- ${ks.map(k => `"${k}"`).join(' / ')}`);
    ps.forEach(p => console.log(`        S${p.seed}L${p.idx} (${p.kind}) "${p.k}" -> "${p.t}"`));
    if (sameSeed) { signature++; hard++; }
  }
  console.log(`  known-side forks: ${forks} · target-side convergences: ${convs} · SAME-SEED (estate signature): ${signature}`);

  // ── T3  seed coverage + overlap classification ─────────────────────────────
  console.log('\n=== T3  SEED COVERAGE: unclaimed words (missing LEGO) and overlap classification ===');
  const priorVocab = new Set();
  let gaps = 0, intentional = 0, suspicious = 0;
  for (const s of seeds) {
    const mine = legos.filter(l => l.seed_number === s.seed_number);
    if (!mine.length) continue;
    const sw = wT(s.target_text);
    const cover = new Array(sw.length).fill(false);
    const spans = [];
    const place = (chunkWords, label) => {
      for (let i = 0; i + chunkWords.length <= sw.length; i++)
        if (chunkWords.every((x, j) => x === sw[i + j])) {
          for (let j = 0; j < chunkWords.length; j++) cover[i + j] = true;
          if (label) spans.push({ label, start: i, end: i + chunkWords.length });
        }
    };
    for (const l of mine) place(wT(l.target_text), l);
    for (const v of priorVocab) place(wT(v), null);

    const unclaimed = sw.filter((_, i) => !cover[i]);
    if (unclaimed.length) { gaps++; flag('T3', `S${s.seed_number} MISSING LEGO — "${s.target_text}" leaves [${unclaimed.join(' ')}] taught by nothing`); }

    // classify every pair of this seed's LEGO spans that overlap
    for (let a = 0; a < spans.length; a++) for (let b = a + 1; b < spans.length; b++) {
      const A = spans[a], B = spans[b];
      if (A.end <= B.start || B.end <= A.start) continue; // disjoint — fine
      const ta = normT(A.label.target_text), tb = normT(B.label.target_text);
      const ka = normK(A.label.known_text), kb = normK(B.label.known_text);
      const targetNests = ta.includes(tb) || tb.includes(ta);
      const knownNests = ka.includes(kb) || kb.includes(ka);
      // Intentional: one target is a literal substring of the other AND the glosses nest the same way.
      if (targetNests && knownNests) {
        intentional++;
        continue;
      }
      suspicious++; hard++;
      console.log(`  *** SUSPICIOUS OVERLAP S${s.seed_number}: L${A.label.lego_index} "${ka}"->"${ta}"  vs  L${B.label.lego_index} "${kb}"->"${tb}"`);
      console.log(`        targets nest: ${targetNests} · glosses nest: ${knownNests}  (real defect = different parts, swapped counterparts)`);
    }
    for (const l of mine) { priorVocab.add(l.target_text); for (const cp of l.components || []) priorVocab.add(cp.target); }
  }
  console.log(`  seeds with a missing LEGO: ${gaps} · intentional nested overlaps: ${intentional} · SUSPICIOUS overlaps: ${suspicious}`);

  // ── T4  untaught-word rule ─────────────────────────────────────────────────
  console.log('\n=== T4  UNTAUGHT-WORD RULE: every phrase tiles from already-introduced chunks ===');
  const vocab = new Set();
  const tile = text => {
    const chunks = [...vocab].map(v => wT(v));
    const t = wT(text);
    const dp = new Array(t.length + 1).fill(false); dp[0] = true;
    for (let i = 0; i < t.length; i++) {
      if (!dp[i]) continue;
      for (const ch of chunks) {
        if (i + ch.length > t.length) continue;
        if (ch.every((x, j) => x === t[i + j])) dp[i + ch.length] = true;
      }
    }
    if (dp[t.length]) return null;
    let last = 0; for (let i = 0; i <= t.length; i++) if (dp[i]) last = i;
    return t.slice(last).join(' ');
  };
  let checked = 0, untaught = 0;
  for (const g of legos) {
    vocab.add(g.target_text);
    for (const cp of g.components || []) vocab.add(cp.target);
    for (const p of phrases.filter(p => p.seed_number === g.seed_number && p.lego_index === g.lego_index)) {
      if (p.phrase_role === 'component') continue;
      checked++;
      const u = tile(p.target_text);
      if (u) { untaught++; flag('T4', `S${p.seed_number}L${p.lego_index} [${p.phrase_role}] "${p.target_text}" needs untaught "${u}"`); }
    }
  }
  console.log(`  ${checked} phrases checked, ${untaught} untaught-word violations`);

  // ── seed reconstructability ────────────────────────────────────────────────
  console.log('\n=== T5  SEED RECONSTRUCTABILITY: each seed target tiles from vocab up to its own end ===');
  const v2 = new Set(); let rec = 0, recBad = 0;
  for (const s of seeds) {
    const mine = legos.filter(l => l.seed_number === s.seed_number);
    if (!mine.length) continue;
    for (const l of mine) { v2.add(l.target_text); for (const cp of l.components || []) v2.add(cp.target); }
    const saved = new Set(vocab); vocab.clear(); v2.forEach(x => vocab.add(x));
    const u = tile(s.target_text);
    vocab.clear(); saved.forEach(x => vocab.add(x));
    rec++;
    if (u) { recBad++; flag('T5', `S${s.seed_number} does NOT reconstruct — "${s.target_text}" leaves "${u}"`); }
  }
  console.log(`  ${rec} seeds tested, ${recBad} failed to reconstruct`);

  console.log(`\n=== HARD ISSUES TOTAL (T1 drift + same-seed forks/convergences + missing LEGOs + suspicious overlaps + untaught words + non-reconstructing seeds): ${hard} ===`);
})().catch(e => { console.error(e.message); process.exit(1); });
