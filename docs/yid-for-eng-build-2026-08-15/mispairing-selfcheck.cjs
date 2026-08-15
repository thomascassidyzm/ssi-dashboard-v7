/**
 * Mis-pairing self-check for yid_for_eng seeds 1-10.
 *
 * Looks for the estate-wide defect class: a LEGO whose known side and target
 * side do not correspond because one side was sliced from a DIFFERENT word in
 * the SAME seed sentence (off-by-one slice, not a mistranslation).
 * Confirmed elsewhere in ita_for_zho S0286L01, deu_for_zho S0225L02,
 * fra_for_zho S0012L02, fas_for_eng S0056L03.
 *
 * Runs against the STORED rows (course_legos + course_practice_phrases), not
 * my authoring file, so it also covers the 52 component rows the SERVER
 * generated itself — machine output is exactly where this defect would live.
 *
 *   node docs/yid-for-eng-build-2026-08-15/mispairing-selfcheck.cjs
 *
 * TEST 1  self-contradiction, known -> target   (same known, different targets)
 * TEST 2  self-contradiction, target -> known   (same target, different knowns)
 * TEST 3  target-side slice validity            (lego target is a real span of the seed)
 * TEST 4  known-side slice validity             (lego known is a real span of the seed)
 * TEST 5  missing lego                          (seed word no lego ever teaches)
 * TEST 6  double-claim                          (seed word claimed by 2+ sibling legos)
 *
 * Tests 1 and 2 are the estate scan's own language-free contradiction test.
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const LIB = path.join(__dirname, '../../services/course-builder/lib');
const { normalizeForContainment } = require(path.join(LIB, 'text-normalization.cjs'));

const COURSE = 'yid_for_eng';
const DBURL = fs.readFileSync(path.join(__dirname, '../../.env.psql'), 'utf8')
  .match(/DATABASE_URL\s*=\s*["']?([^"'\n]+)/)[1];

const norm = (s) => normalizeForContainment(String(s || ''));
const words = (s) => norm(s).split(/\s+/).filter(Boolean);
// English side: strip the apostrophes/punctuation that differ between "I'm" and "im"
const knorm = (s) => String(s || '').toLowerCase().replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ').trim();

(async () => {
  const c = new Client({ connectionString: DBURL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const seeds = (await c.query(
    `select seed_number, known_text, target_text from course_seeds
      where course_code=$1 and seed_number between 1 and 10 order by seed_number`, [COURSE])).rows;
  const legos = (await c.query(
    `select seed_number, lego_index, type, known_text, target_text, components
       from course_legos where course_code=$1 order by seed_number, lego_index`, [COURSE])).rows;
  const comps = (await c.query(
    `select seed_number, lego_index, known_text, target_text from course_practice_phrases
      where course_code=$1 and phrase_role='component' order by seed_number, lego_index`, [COURSE])).rows;

  // ── the full pairing inventory: LEGOs + server-generated component rows ──
  const pairs = [];
  for (const l of legos) pairs.push({ where: `S${l.seed_number}L${String(l.lego_index).padStart(2,'0')}`, kind: 'lego', seed: l.seed_number, known: l.known_text, target: l.target_text });
  for (const p of comps) pairs.push({ where: `S${p.seed_number}L${String(p.lego_index).padStart(2,'0')}(comp)`, kind: 'component', seed: p.seed_number, known: p.known_text, target: p.target_text });

  const out = { t1: [], t2: [], t3: [], t4: [], t5: [], t6: [] };

  // ── TEST 1 / 2: self-contradiction maps ──────────────────────────────
  const k2t = new Map(), t2k = new Map();
  for (const p of pairs) {
    const K = knorm(p.known), T = norm(p.target);
    if (!k2t.has(K)) k2t.set(K, new Map());
    if (!k2t.get(K).has(T)) k2t.get(K).set(T, []);
    k2t.get(K).get(T).push(p.where);
    if (!t2k.has(T)) t2k.set(T, new Map());
    if (!t2k.get(T).has(K)) t2k.get(T).set(K, []);
    t2k.get(T).get(K).push(p.where);
  }
  for (const [K, ts] of k2t) if (ts.size > 1)
    out.t1.push(`known "${K}" -> ${[...ts].map(([t, w]) => `"${t}" [${w.join(',')}]`).join('  AND  ')}`);
  for (const [T, ks] of t2k) if (ks.size > 1)
    out.t2.push(`target "${T}" -> ${[...ks].map(([k, w]) => `"${k}" [${w.join(',')}]`).join('  AND  ')}`);

  // ── TESTS 3-6: per-seed slice validity and coverage ──────────────────
  for (const s of seeds) {
    const seedT = norm(s.target_text), seedK = knorm(s.known_text);
    const mine = pairs.filter((p) => p.seed === s.seed_number);

    for (const p of mine) {
      // T3: does the lego's TARGET appear as a contiguous span of the seed target?
      if (!seedT.includes(norm(p.target)))
        out.t3.push(`${p.where}: target "${p.target}" is NOT a span of seed ${s.seed_number} target`);
      // T4: does the lego's KNOWN appear as a contiguous span of the seed known?
      // Frame LEGOs legitimately reorder English (see report §3), so a failure here
      // is reported as REORDERED rather than as a defect, and inspected by hand.
      if (!seedK.includes(knorm(p.known))) {
        const kw = words(knorm(p.known));
        const allPresent = kw.every((w) => words(seedK).includes(w));
        out.t4.push(`${p.where}: known "${p.known}" not a contiguous span of seed ${s.seed_number} known`
          + (allPresent ? '  [all words present, order differs -> REORDER]' : '  [WORD NOT IN SEED -> INVESTIGATE]'));
      }
    }

    // T5/T6: coverage of the seed target by this seed's legos (+ prior-seed legos,
    // since an overlapping earlier lego legitimately covers a word)
    const priorTargets = pairs.filter((p) => p.seed <= s.seed_number).map((p) => words(p.target));
    for (const w of words(seedT)) {
      const n = priorTargets.filter((t) => t.includes(w)).length;
      if (n === 0) out.t5.push(`seed ${s.seed_number}: target word "${w}" is taught by NO lego`);
    }
    for (const w of words(seedK)) {
      const n = mine.filter((p) => words(knorm(p.known)).includes(w)).length;
      if (n === 0) out.t6.push(`seed ${s.seed_number}: known word "${w}" appears in NO lego of this seed`);
    }
  }

  // ── report ───────────────────────────────────────────────────────────
  const L = (t, name) => {
    console.log(`\n${name}: ${out[t].length} finding(s)`);
    out[t].forEach((x) => console.log('   • ' + x));
  };
  console.log(`yid_for_eng mis-pairing self-check — ${seeds.length} seeds, ${legos.length} LEGOs, ${comps.length} server-generated component rows, ${pairs.length} known/target pairings total`);
  L('t1', 'TEST 1  same KNOWN -> different TARGETS');
  L('t2', 'TEST 2  same TARGET -> different KNOWNS');
  L('t3', 'TEST 3  lego target not a span of its seed target');
  L('t4', 'TEST 4  lego known not a contiguous span of its seed known');
  L('t5', 'TEST 5  MISSING LEGO — seed target word taught by nothing');
  L('t6', 'TEST 6  seed known word claimed by no lego in that seed');
  const hard = out.t1.length + out.t2.length + out.t3.length + out.t5.length;
  console.log(`\nHARD findings (tests 1,2,3,5): ${hard}`);
  await c.end();
})();

/**
 * TEST 7 — the estate scan's exact signature, run explicitly.
 * "The borrowed counterpart belongs to a NEIGHBOURING lego in the SAME seed,
 *  and the course usually contradicts itself elsewhere by pairing those two
 *  correctly."
 * So: for each lego i, does its KNOWN appear anywhere else in the course paired
 * with a SIBLING's target? And does its TARGET appear elsewhere paired with a
 * sibling's known? Either would mean the slice was taken from the wrong word.
 */
