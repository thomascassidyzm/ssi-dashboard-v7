/**
 * Known/target misalignment self-check for everything this session wrote to
 * yor_for_eng. Targets the estate defect class: a LEGO whose known side and
 * target side don't correspond because one side was sliced from a DIFFERENT
 * word in the same seed sentence (an off-by-one in the slice).
 *
 * Reads the LIVE rows back out of Postgres — checks what was actually stored,
 * not what the authoring file says. No language knowledge required by design.
 * Diacritic-exact throughout: nothing is stripped before comparison.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') });
const { Client } = require('pg');

const COURSE = 'yor_for_eng';
const norm = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.?!,]+$/, '');
const words = (s) => norm(s).split(' ').filter(Boolean);

/** Exact cover of `sentence` by `chunks`, in surface order, each chunk used at most once.
 *  Returns {ok, uncovered, unused, doubleClaimed}. */
function exactCover(sentence, chunks) {
  const sw = words(sentence);
  const cs = chunks.map((c, i) => ({ i, w: words(c) })).filter(c => c.w.length);
  const n = sw.length;
  // DP over (position, used-set) is exponential; n is small and chunks are few,
  // so do a bounded DFS with memo on position + used bitmask.
  const seen = new Set();
  let best = null;
  (function dfs(pos, used, picks) {
    if (best) return;
    if (pos === n) { best = picks.slice(); return; }
    const key = pos + '|' + used;
    if (seen.has(key)) return;
    seen.add(key);
    for (const c of cs) {
      if (used & (1 << c.i)) continue;
      if (pos + c.w.length > n) continue;
      let m = true;
      for (let j = 0; j < c.w.length; j++) if (sw[pos + j] !== c.w[j]) { m = false; break; }
      if (m) { picks.push(c.i); dfs(pos + c.w.length, used | (1 << c.i), picks); picks.pop(); }
    }
  })(0, 0, []);
  if (best) {
    const usedSet = new Set(best);
    return { ok: true, unused: cs.filter(c => !usedSet.has(c.i)).map(c => chunks[c.i]) };
  }
  // Not coverable — find how far a greedy prefix gets, for reporting.
  let pos = 0, guard = 0;
  const usedSet = new Set();
  while (pos < n && guard++ < 100) {
    const c = cs.find(c => !usedSet.has(c.i) && c.w.every((w, j) => sw[pos + j] === w));
    if (!c) break;
    usedSet.add(c.i); pos += c.w.length;
  }
  return { ok: false, uncovered: sw.slice(pos).join(' '),
           unused: cs.filter(c => !usedSet.has(c.i)).map(c => chunks[c.i]) };
}

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const seeds = (await db.query(
    `select seed_number, known_text, target_text from course_seeds
      where course_code=$1 and decomposed_at is not null order by seed_number`, [COURSE])).rows;
  const legos = (await db.query(
    `select seed_number, lego_index, lego_id, type, known_text, target_text, components
       from course_legos where course_code=$1 order by seed_number, lego_index`, [COURSE])).rows;
  await db.end();

  const R = { A: [], B: [], C: [], D: [], E: [], F: [] };
  console.log(`Checking ${legos.length} LEGOs across ${seeds.length} seeds (live rows).\n`);

  // ── A/B: do a LEGO's components reassemble the LEGO itself, on BOTH sides? ──
  // This is the direct analogue of the defect: a component sliced off the wrong
  // word would fail to reassemble.
  for (const l of legos) {
    const comps = Array.isArray(l.components) ? l.components : [];
    if (!comps.length) continue;
    const tgt = comps.map(c => norm(c.target)).join(' ');
    const kn = comps.map(c => norm(c.known)).join(' ');
    if (tgt !== norm(l.target_text))
      R.A.push(`${l.lego_id}: components → "${tgt}"  ≠  lego target "${norm(l.target_text)}"`);
    if (kn !== norm(l.known_text))
      R.B.push(`${l.lego_id}: components → "${kn}"  ≠  lego known "${norm(l.known_text)}"`);
  }

  // ── C/D: within each seed, do the LEGOs exactly cover the seed sentence, on
  //    BOTH sides, with nothing claimed twice and nothing left over? ──
  // A seed re-uses LEGOs taught in EARLIER seeds and only declares the new ones,
  // so the cover pool is this seed's LEGOs plus everything taught before it.
  // Every one of THIS seed's own LEGOs must still be used — an unused one means
  // it points at a piece of the sentence that isn't there.
  for (const s of seeds) {
    const mine = legos.filter(l => l.seed_number === s.seed_number);
    const prior = legos.filter(l => l.seed_number < s.seed_number);
    for (const [side, sentence, pick] of [['TARGET', s.target_text, l => l.target_text],
                                          ['KNOWN', s.known_text, l => l.known_text]]) {
      const pool = [...mine.map(pick), ...prior.map(pick)];
      const r = exactCover(sentence, pool);
      const bucket = side === 'TARGET' ? R.C : R.D;
      if (!r.ok) {
        bucket.push(`Seed ${s.seed_number} ${side}: no exact cover — first uncovered "${r.uncovered}"  ← MISSING LEGO or wrong slice`);
      } else {
        const unusedOwn = mine.map(pick).filter(x => r.unused.includes(x));
        if (unusedOwn.length)
          bucket.push(`Seed ${s.seed_number} ${side}: covered, but this seed's own lego(s) unused: ${unusedOwn.join(' | ')}  ← points at nothing in the sentence`);
      }
    }
  }

  // ── E: self-contradiction. Same known ↔ different target, or vice versa.
  //    Needs no language knowledge — this is the estate scan's own test. ──
  const k2t = new Map(), t2k = new Map();
  const add = (m, a, b, where) => {
    if (!m.has(a)) m.set(a, new Map());
    if (!m.get(a).has(b)) m.get(a).set(b, []);
    m.get(a).get(b).push(where);
  };
  for (const l of legos) {
    add(k2t, norm(l.known_text), norm(l.target_text), l.lego_id);
    add(t2k, norm(l.target_text), norm(l.known_text), l.lego_id);
    for (const [i, c] of (Array.isArray(l.components) ? l.components : []).entries()) {
      add(k2t, norm(c.known), norm(c.target), `${l.lego_id}C${i + 1}`);
      add(t2k, norm(c.target), norm(c.known), `${l.lego_id}C${i + 1}`);
    }
  }
  for (const [k, tm] of k2t) if (tm.size > 1)
    R.E.push(`KNOWN "${k}" → ${tm.size} different targets: ` +
      [...tm].map(([t, w]) => `"${t}" (${w.join(',')})`).join('  vs  '));
  for (const [t, km] of t2k) if (km.size > 1)
    R.F.push(`TARGET "${t}" → ${km.size} different knowns: ` +
      [...km].map(([k, w]) => `"${k}" (${w.join(',')})`).join('  vs  '));

  const secs = [
    ['A. Component targets reassemble their LEGO target', R.A],
    ['B. Component knowns reassemble their LEGO known', R.B],
    ['C. Seed TARGET exactly covered by its LEGOs (no gap, no double-claim)', R.C],
    ['D. Seed KNOWN exactly covered by its LEGOs (no gap, no double-claim)', R.D],
    ['E. Same known paired with different targets', R.E],
    ['F. Same target paired with different knowns', R.F],
  ];
  let total = 0;
  for (const [name, list] of secs) {
    console.log(`${list.length ? '⚠' : '✓'} ${name}: ${list.length}`);
    list.forEach(x => console.log(`     ${x}`));
    total += list.length;
  }
  console.log(`\n${'─'.repeat(60)}\nTOTAL flags: ${total}`);
})();
