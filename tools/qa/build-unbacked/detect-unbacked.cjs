#!/usr/bin/env node
/*
 * detect-unbacked.cjs — UNBACKED-TARGET-WORD detector for BUILD phrases.
 *
 * The defect class (Tom, 2026-08-31, from spa_for_eng:S0403L03B02):
 *   the target text carries a word the known/English prompt never asked for
 *   and the phrase's own decomposition does not back — a "ghost segment".
 *   The English prompt is AUTHORITATIVE; the target is what gets corrected.
 *
 * Why a new detector: tools/qa/known-target-mismatch/detect-mismatch.cjs
 * returns immediately on `kt.length < 4`. Build phrases are 1-4 known words,
 * so that sweep structurally could not see them.
 *
 * SIGNAL (reverse direction only — this class is target-side surplus):
 *   for each target content token, ask the course-derived reverse lexicon
 *   (target -> known, Dice co-occurrence over the course's own corpus)
 *   whether any of its confident known correspondents appears in known_text.
 *   A token with a confident correspondent and no rendering is UNBACKED.
 *
 * PRECISION GATES (build-specific, and this is what makes one token enough):
 *   - the token must lie OUTSIDE the parent LEGO's own target surface. The
 *     parent LEGO is backed by definition; its gloss is not the phrase's
 *     known_text, so it must never be judged against it.
 *   - the token must be a GHOST in the stored decomposition where that
 *     decomposition is still live (recomposes to the current target_text) —
 *     i.e. no introduced LEGO tiles it either. Reported as a separate flag so
 *     it can be scored, not required.
 *   - function words are excluded by corpus frequency, never a word list.
 *
 * Language-agnostic: no dictionary, no morphology, no pack. Ports to any pair.
 *
 * USAGE  node detect-unbacked.cjs <course_code> [--json out.json] [--min 1]
 */
const path = require('path');
const fs = require('fs');
const KTM = path.resolve(__dirname, '../known-target-mismatch');
const { tokens, norm } = require(path.join(KTM, 'lib/text.cjs'));
const { buildLexicon, buildBigramLexicon, bigramRendered, rendered, confidence } = require(path.join(KTM, 'lib/align.cjs'));

function functionWords(side, topFrac = 0.02) {
  const c = new Map();
  for (const s of side) for (const t of tokens(s)) c.set(t, (c.get(t) || 0) + 1);
  const sorted = [...c.entries()].sort((a, b) => b[1] - a[1]);
  const n = Math.max(25, Math.round(sorted.length * topFrac));
  return new Set(sorted.slice(0, n).map(x => x[0]));
}

// Tokens of the target that fall inside the parent LEGO's surface. Whole-word,
// case/punctuation-folded, order-free (containment is enough here).
function parentTokens(parentTarget) {
  return new Set(tokens(parentTarget || ''));
}

function liveGhosts(row) {
  // Stored decomposition is only usable if it still recomposes to the CURRENT
  // target_text — a text edit leaves it stale (that is exactly what today's
  // hand-fix left behind). Stale => report null, never a false ghost.
  const d = row.decomposition;
  if (!Array.isArray(d) || !d.length) return null;
  const recomposed = d.map(b => b && b.target || '').join('');
  if (norm(recomposed) !== norm(row.target_text)) return null;
  const g = new Set();
  for (const b of d) if (b && b.isGhost) for (const t of tokens(b.target)) g.add(t);
  return g;
}

function analyse(row, ctx) {
  const kt = tokens(row.known_text || ''), tt = tokens(row.target_text || '');
  if (!kt.length || !tt.length) return null;
  // lego_id is NULL on ~96% of build rows (11,718 of 295,914 estate-wide), so
  // the parent is keyed off seed_number+lego_index — the same construction the
  // phrase id itself uses (S0403L03B02 -> S0403L03).
  const pKey = `S${String(row.seed_number).padStart(4, '0')}L${String(row.lego_index).padStart(2, '0')}`;
  const pTok = parentTokens(ctx.parentByLego.get(pKey));
  const ghosts = liveGhosts(row);

  const findings = [];
  tt.forEach((w, i) => {
    if (ctx.tFunc.has(w)) return;              // structural: not this class
    if (pTok.has(w)) return;                   // inside the parent LEGO: backed
    let r = rendered(ctx.revLex, w, kt, ctx.kFunc);
    if (r === null) return;                    // lexicon has no opinion
    if (r === 0 && bigramRendered(ctx.revBlex, tt, i, kt)) r = 0.5;
    if (r !== 0) return;
    findings.push({ tok: w, conf: Math.round(confidence(ctx.revLex, w) * 100) / 100,
                    ghost: ghosts ? ghosts.has(w) : null });
  });
  if (!findings.length) return null;

  // SYMMETRY TEST — the single biggest precision lever on this class.
  // If a known content word is ALSO unrendered in the target, the two are
  // almost always each other's rendering under a lexicon the corpus aligned
  // differently ("it is fine"/"está bien" — "fine" and "bien" both look
  // orphaned). A genuine surplus word looks the other way round: every known
  // content word IS rendered, and the target still carries something extra
  // ("watch the film"/"ver la película aquí").
  let kUncovered = 0;
  kt.forEach((w, i) => {
    if (ctx.kFunc.has(w)) return;
    let r = rendered(ctx.fwdLex, w, tt, ctx.tFunc);
    if (r === null) return;
    if (r === 0 && bigramRendered(ctx.fwdBlex, kt, i, tt)) r = 0.5;
    if (r === 0) kUncovered++;
  });

  // Score: confidence of the reverse lexicon + ghost corroboration + the
  // build-phrase brevity bonus (a short prompt has nowhere to hide a surplus).
  let score = 0;
  for (const f of findings) {
    score += f.conf >= 0.7 ? 1.6 : f.conf >= 0.5 ? 1.1 : 0.6;
    if (f.ghost === true) score += 0.8;
    else if (f.ghost === false) score -= 0.4;   // a taught LEGO tiles it: weaker
  }
  if (kt.length <= 4) score += 0.4;
  if (kUncovered > 0) score -= 1.4 * Math.min(2, kUncovered);
  score = Math.round(score * 100) / 100;
  return { findings, score, kUncovered };
}

const band = s => (s >= 2.4 ? 'HIGH' : s >= 1.3 ? 'MEDIUM' : 'LOW');

async function load(course) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../../.env.psql') });
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  for (let a = 1; ; a++) {
    try { await c.connect(); break; }
    catch (e) { if (a >= 5) throw e; await new Promise(r => setTimeout(r, 3000 * a)); }
  }
  const p = await c.query(
    `select id, seed_number, lego_index, position, known_text, target_text, phrase_role,
            lego_id, decomposition, status, target1_audio_id, target2_audio_id
       from course_practice_phrases where course_code=$1
      order by seed_number, lego_index, position`, [course]);
  const l = await c.query(
    `select seed_number, lego_index, known_text, target_text
       from course_legos where course_code=$1`, [course]);
  await c.end();
  return { phrases: p.rows, legos: l.rows };
}

async function main() {
  const argv = process.argv.slice(2);
  const course = argv[0];
  if (!course) { console.error('usage: detect-unbacked.cjs <course_code> [--json out]'); process.exit(2); }
  const opt = k => { const i = argv.indexOf(k); return i > -1 ? argv[i + 1] : null; };
  const outJson = opt('--json');
  const min = parseFloat(opt('--min') || '1.3');

  const { phrases, legos } = await load(course);
  const parentByLego = new Map();
  for (const l of legos) {
    parentByLego.set(`S${String(l.seed_number).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`, l.target_text);
  }
  const pairs = phrases.filter(r => r.known_text && r.target_text).map(r => [r.known_text, r.target_text]);
  if (pairs.length < 200) { console.error(`SKIP ${course}: only ${pairs.length} pairs — lexicon unreliable`); process.exit(3); }
  const revLex = buildLexicon(pairs.map(([k, t]) => [t, k]));
  const revBlex = buildBigramLexicon(pairs.map(([k, t]) => [t, k]));
  const fwdLex = buildLexicon(pairs);
  const fwdBlex = buildBigramLexicon(pairs);
  const kFunc = functionWords(pairs.map(p => p[0]));
  const tFunc = functionWords(pairs.map(p => p[1]));
  const ctx = { revLex, revBlex, fwdLex, fwdBlex, kFunc, tFunc, parentByLego };

  const builds = phrases.filter(r => r.phrase_role === 'build' && r.known_text && r.target_text);
  const out = [];
  for (const r of builds) {
    const a = analyse(r, ctx);
    if (!a || a.score < min) continue;
    out.push({
      course, id: r.id, seed: r.seed_number, lego_id: r.lego_id,
      known: r.known_text, target: r.target_text,
      parent_lego_target: parentByLego.get(`S${String(r.seed_number).padStart(4, '0')}L${String(r.lego_index).padStart(2, '0')}`) || null,
      unbacked: a.findings, known_uncovered: a.kUncovered, score: a.score, band: band(a.score),
      has_audio: !!(r.target1_audio_id || r.target2_audio_id),
      target1_audio_id: r.target1_audio_id, status: r.status,
    });
  }
  out.sort((a, b) => b.score - a.score);
  const c = out.reduce((m, r) => (m[r.band] = (m[r.band] || 0) + 1, m), {});
  console.error(`${course}\tbuild=${builds.length}\tflagged=${out.length}\tHIGH=${c.HIGH || 0}\tMED=${c.MEDIUM || 0}`);
  if (outJson) fs.writeFileSync(outJson, JSON.stringify(out, null, 1));
  else for (const r of out) console.log(`${r.score}\t${r.band}\t${r.id}\t${r.known}\t||\t${r.target}\t<<${r.unbacked.map(f => f.tok + (f.ghost ? '*' : '')).join(' ')}>>`);
}
if (require.main === module) main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
module.exports = { analyse, functionWords, band };
