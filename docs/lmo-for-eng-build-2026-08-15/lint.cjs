// Pre-flight lint for lmo_for_eng seed submissions.
// Mirrors the gates the course-builder API applies, so I catch problems before the round-trip:
//   - target-side vocabulary: every phrase must tile from already-introduced whole chunks
//   - known-side vocabulary: every English word must be an introduced gloss token or free glue
//   - duplicate phrases inside a LEGO, BUILD/USE minimums, LEGO containment
//   - seed tiling: the seed target must rebuild from its own LEGOs plus prior vocab
require('dotenv').config({ path: '.env.psql' });
const { Client } = require('pg');
const fs = require('fs');

const norm = s => (s || '').toLowerCase().trim().replace(/[.,!?;:¿¡«»""'']/g, '').replace(/\s+/g, ' ');
const w = s => norm(s).split(' ').filter(Boolean);

// The free glue class for an English-known course: function words, dummy auxiliaries,
// and inflection the learner is allowed to carry without an explicit debut.
const FREE = new Set(`a an the to of in on at for with and or but if is am are was were be been do does did
 not n't it its this that these those my your his her our their me you he she we they i
 so as than then there here when what why how who all any some no yes very just now again
 more most too very much many other else about from up down out into over under after before
 s ed ing d ll re ve m t`.split(/\s+/).filter(Boolean));

const CODE = 'lmo_for_eng';

(async () => {
  const files = process.argv.slice(2);
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Vocabulary already live in the DB from earlier seeds.
  const prior = (await c.query(
    `select seed_number, lego_index, known_text, target_text, components
       from course_legos where course_code=$1 order by seed_number, lego_index`, [CODE])).rows;
  await c.end();

  const targetVocab = [];   // introduced target chunks
  const knownGloss = new Set(); // introduced known gloss tokens
  const addPair = (k, t) => {
    targetVocab.push(norm(t));
    w(k).forEach(x => knownGloss.add(x));
  };
  const seedsInFiles = new Set();
  for (const f of files) for (const s of JSON.parse(fs.readFileSync(f, 'utf8'))) seedsInFiles.add(s.seed_number);
  for (const g of prior) {
    if (seedsInFiles.has(g.seed_number)) continue; // being resubmitted; its vocab is rebuilt below
    addPair(g.known_text, g.target_text);
    for (const cp of g.components || []) addPair(cp.known, cp.target);
  }

  // Can `text` be tiled from the introduced chunks?
  const untiled = text => {
    const chunks = targetVocab.map(v => v.split(' ').filter(Boolean));
    const t = w(text);
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

  let problems = 0;
  const bad = m => { problems++; console.log('  ✗ ' + m); };

  for (const f of files) {
    for (const s of JSON.parse(fs.readFileSync(f, 'utf8')).sort((a, b) => a.seed_number - b.seed_number)) {
      const skip = !!s.SKIP_VALIDATION;
      const n = s.seed_number;
      const minB = skip ? 0 : (n <= 3 ? 1 : 3);
      const minU = skip ? 0 : (n <= 3 ? 1 : 5);
      console.log(`\nS${n} "${s.target_text}"`);

      for (const l of s.legos) {
        const tag = `S${n}L${String(l.idx).padStart(2, '0')}`;
        if (l.type === 'M' && !(l.components || []).length) bad(`${tag} M-LEGO with no components[]`);

        // the LEGO's own target must tile from prior vocab + itself
        targetVocab.push(norm(l.target));
        for (const cp of l.components || []) targetVocab.push(norm(cp.target));
        w(l.known).forEach(x => knownGloss.add(x));
        for (const cp of l.components || []) w(cp.known).forEach(x => knownGloss.add(x));

        const seenTargets = new Set();
        const all = [...(l.build || []).map(p => ({ ...p, role: 'build' })),
                     ...(l.use || []).map(p => ({ ...p, role: 'use' }))];
        for (const p of all) {
          if (seenTargets.has(norm(p.target))) bad(`${tag} duplicate phrase "${p.target}"`);
          seenTargets.add(norm(p.target));
          if (!norm(p.target).includes(norm(l.target))) bad(`${tag} [${p.role}] "${p.target}" does not contain the LEGO "${l.target}"`);
          const u = untiled(p.target);
          if (u) bad(`${tag} [${p.role}] UNTAUGHT TARGET "${p.target}" -> "${u}"`);
          const missing = w(p.known).filter(x => !knownGloss.has(x) && !FREE.has(x));
          if (missing.length) bad(`${tag} [${p.role}] UNTAUGHT KNOWN "${p.known}" -> [${missing.join(', ')}]`);
          if (p.role === 'use' && !(p.score >= 5 && p.score <= 9)) bad(`${tag} use phrase missing/!5-9 score: "${p.known}"`);
        }
        const nb = (l.build || []).length, nu = (l.use || []).length;
        if (nb < minB) bad(`${tag} BUILD: need ${minB}+, got ${nb}`);
        if (nu < minU) bad(`${tag} USE: need ${minU}+, got ${nu}`);
        if (nb + nu > 13) bad(`${tag} ${nb + nu} phrases > cap 13`);
      }

      const u = untiled(s.target_text);
      if (u) bad(`S${n} SEED DOES NOT TILE — "${s.target_text}" leaves "${u}"`);
    }
  }
  console.log(`\n=== ${problems} problem(s) ===`);
  process.exit(problems ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(2); });
