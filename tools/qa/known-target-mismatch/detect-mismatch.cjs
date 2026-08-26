#!/usr/bin/env node
/*
 * detect-mismatch.cjs — known/target CONTENT-COMPLETENESS detector.
 *
 * Finds practice rows whose known side and target side do not say the same
 * thing: most often the target stops before the known does (a dropped final
 * clause), sometimes a tense contradicts.
 *
 * It is deliberately NOT a length-ratio hit list. Length ratio across two
 * languages is a false-positive machine; every signal below is about content
 * that is present on one side and absent on the other.
 *
 * SIGNALS
 *   tail_uncovered   the known side's final clause has content words with no
 *                    rendering anywhere in the target  -> dropped clause
 *   body_uncovered   uncovered known content anywhere (not just the tail)
 *   extra_tail       the target carries a trailing clause the known has not
 *   connective_gap   the known has a subordinator/conjunction the target lacks
 *   qmark            question on one side, statement on the other
 *   tense_conflict   the two sides' tense classes contradict
 *
 * PORTABILITY
 *   The bilingual lexicon is derived from the course's own parallel corpus by
 *   Dice co-occurrence (lib/align.cjs) — no dictionary, no morphology, works
 *   for any language pair. Only the connective list and the tense reader are
 *   language-specific, and they live in packs/. A pair with no pack runs on
 *   packs/generic.cjs: it keeps every content signal and reports the tense
 *   signal as UNAVAILABLE rather than guessing.
 *
 * USAGE
 *   node detect-mismatch.cjs <course_code> [--role use] [--json out.json]
 *                            [--min 0] [--from N] [--to N] [--offline file]
 */
const path = require('path');
const fs = require('fs');
const { tokens, terminal } = require('./lib/text.cjs');
const { buildLexicon, buildBigramLexicon, bigramRendered, rendered, confidence } = require('./lib/align.cjs');

const PACKS = { eng: 'eng', spa: 'spa' };
function loadPack(iso) {
  const f = PACKS[iso] ? path.join(__dirname, 'packs', PACKS[iso] + '.cjs') : path.join(__dirname, 'packs', 'generic.cjs');
  return require(f);
}

// ---------- corpus helpers ----------

// Function words are identified by corpus frequency, not by a word list, so
// this works in a language we know nothing about.
function functionWords(pairsSide, topFrac = 0.02) {
  const c = new Map();
  for (const s of pairsSide) for (const t of tokens(s)) c.set(t, (c.get(t) || 0) + 1);
  const sorted = [...c.entries()].sort((a, b) => b[1] - a[1]);
  const n = Math.max(25, Math.round(sorted.length * topFrac));
  return new Set(sorted.slice(0, n).map(x => x[0]));
}

function lastClauseTail(toks, connectives) {
  // The final clause = everything after the LAST connective, if that leaves a
  // reasonable chunk. Otherwise the final third of the sentence.
  for (let i = toks.length - 1; i >= 2; i--) {
    if (connectives.has(toks[i]) && toks.length - i - 1 >= 2) return toks.slice(i + 1);
  }
  const cut = Math.ceil(toks.length * 0.65);
  return toks.slice(cut);
}

// ---------- the detector ----------

function analyse(row, ctx) {
  const kt = tokens(row.known_text), tt = tokens(row.target_text);
  const sig = [];
  if (kt.length < 4 || tt.length < 2) return { signals: [], score: 0 };

  const contentK = kt.filter(w => !ctx.kFunc.has(w));
  const tail = lastClauseTail(kt, ctx.kPack.CONNECTIVES);
  const tailContent = tail.filter(w => !ctx.kFunc.has(w));

  // --- coverage of the known side's content words in the target ---
  // A token is cleared by its own correspondent OR by any bigram it belongs to.
  const covAt = (w, i) => {
    const r = rendered(ctx.lex, w, tt, ctx.tFunc);
    if (r === 0 && bigramRendered(ctx.blex, kt, i, tt)) return 0.5;
    return r;
  };
  const marks = kt.map((w, i) => ({ w, i, stop: ctx.kFunc.has(w) }));
  const judgedAll = marks.filter(m => !m.stop).map(m => ({ ...m, r: covAt(m.w, m.i) })).filter(m => m.r !== null);
  const tailStart = kt.length - tail.length;
  const judged = judgedAll;
  const uncoveredBody = judgedAll.filter(x => x.r === 0).map(x => x.w);
  const judgedTail = judgedAll.filter(m => m.i >= tailStart);
  const uncoveredTail = judgedTail.filter(x => x.r === 0).map(x => x.w);

  // Each unrendered known content word is scored by how confident the lexicon
  // is about that word, and by whether it sits in the final clause. A miss on
  // a word the course renders the same way every time ("things" -> cosas) is
  // evidence; a miss on a weakly-aligned word may just be the lexicon's limit.
  let score = 0;
  const wholeTail = judgedTail.length >= 1 && uncoveredTail.length === judgedTail.length;
  const wt = w => (confidence(ctx.lex, w) >= 0.6 ? 1.5 : 0.7);
  if (uncoveredTail.length) {
    let w = uncoveredTail.reduce((a, x) => a + wt(x), 0) + (wholeTail ? 1.0 : 0);
    w = Math.min(4.6, w);
    sig.push({
      id: 'tail_uncovered',
      detail: (wholeTail ? 'final clause unrendered: ' : 'unrendered at the end: ') + uncoveredTail.join(' '), w,
    });
    score += w;
  }
  const outsideTail = uncoveredBody.filter(w => !uncoveredTail.includes(w));
  if (outsideTail.length) {
    const w = Math.min(3.0, outsideTail.reduce((a, x) => a + 0.7 * wt(x), 0));
    sig.push({ id: 'body_uncovered', detail: 'unrendered known content: ' + outsideTail.join(' '), w });
    score += w;
  }

  // --- target carries content the known side does not ---
  const contentT = tt.filter(w => !ctx.tFunc.has(w));
  const revJudged = tt.map((w, i) => ({ w, i })).filter(m => !ctx.tFunc.has(m.w))
    .map(m => {
      let r = rendered(ctx.revLex, m.w, kt, ctx.kFunc);
      if (r === 0 && bigramRendered(ctx.revBlex, tt, m.i, kt)) r = 0.5;
      return { w: m.w, r };
    }).filter(x => x.r !== null);
  const extraT = revJudged.filter(x => x.r === 0).map(x => x.w);
  if (extraT.length >= 2) {
    const w = 0.8 + 0.5 * Math.min(2, extraT.length - 2);
    sig.push({ id: 'extra_tail', detail: 'target content with no known counterpart: ' + extraT.join(' '), w });
    score += w;
  }

  // --- clause connectives present on one side only ---
  const kConn = kt.filter(w => ctx.kPack.CONNECTIVES.has(w)).length;
  const tConn = tt.filter(w => ctx.tPack.CONNECTIVES.has(w)).length;
  if (ctx.tPack.code !== 'generic' && kConn - tConn >= 2) {
    sig.push({ id: 'connective_gap', detail: `known has ${kConn} clause links, target ${tConn}`, w: 0.8 });
    score += 0.8;
  }

  // --- question parity ---
  const kq = terminal(row.known_text) === '?', tq = terminal(row.target_text) === '?';
  if (kq !== tq) {
    sig.push({ id: 'qmark', detail: kq ? 'known is a question, target is not' : 'target is a question, known is not', w: 1.4 });
    score += 1.4;
  }

  // --- tense ---
  const kT = ctx.kPack.tenses(kt), tT = ctx.tPack.tenses(tt);
  if (kT && tT) {
    const conflicts = [];
    const has = (s, x) => s.has(x);
    if (has(kT, 'FUT') && !has(tT, 'FUT') && !has(tT, 'PROSP')) conflicts.push('known future, target not');
    if (has(kT, 'COND') && !has(tT, 'COND')) conflicts.push('known conditional, target not');
    if (has(kT, 'PLUP') && !has(tT, 'PLUP')) conflicts.push('known past perfect, target not');
    const ambig = ctx.tPack.ambiguousPast && ctx.tPack.ambiguousPast(tt);
    if (has(kT, 'PAST') && !has(tT, 'PAST') && !has(kT, 'PERF') && !has(tT, 'PERF') && !ambig) {
      conflicts.push('known past, target has no past form');
    }
    // English simple past rendered as a Spanish compound perfect. Castilian
    // tolerates this in general, but not when the known side is anchored to a
    // closed past time, so the anchored case is scored and the rest is not.
    if (has(kT, 'PAST') && !has(kT, 'PERF') && has(tT, 'PERF') && !has(tT, 'PAST') &&
        /(yesterday|last (week|month|year|night)|ago|when did|at that point|that day)/.test(' ' + kt.join(' ') + ' ')) {
      conflicts.push('known is an anchored simple past, target is a compound perfect');
    }
    if (has(tT, 'FUT') && !has(kT, 'FUT') && !has(kT, 'COND')) conflicts.push('target future, known not');
    if (conflicts.length) {
      // A tense contradiction on its own is a finding: it is one of the two
      // defect shapes, so it must clear the MEDIUM band unaided.
      const w = 2.0 + 0.9 * Math.min(1, conflicts.length - 1);
      sig.push({ id: 'tense_conflict', detail: conflicts.join('; ') + ` [known=${[...kT].join(',') || 'PRES'} target=${[...tT].join(',') || 'PRES'}]`, w });
      score += w;
    }
  } else {
    sig.push({ id: 'tense_unavailable', detail: 'no tense pack for this side', w: 0 });
  }

  return { signals: sig, score: Math.round(score * 100) / 100, kt, tt };
}

function band(score) {
  if (score >= 3.2) return 'HIGH';
  if (score >= 1.5) return 'MEDIUM';
  return 'CLEAN';
}

// ---------- data loading ----------

async function loadFromDb(course) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env.psql') });
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  for (let attempt = 1; ; attempt++) {
    try { await c.connect(); break; }
    catch (e) {
      if (attempt >= 5) throw new Error('DB connect failed after 5 attempts: ' + e.message);
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }
  const p = await c.query(
    `select id, seed_number, position, lego_index, known_text, target_text, phrase_role, status,
            target1_audio_id, target2_audio_id
       from course_practice_phrases where course_code = $1
      order by seed_number, lego_index, position`, [course]);
  await c.end();
  return { course, phrases: p.rows };
}

function isoPair(course) {
  const m = course.match(/^([a-z]{3})[a-z_]*_for_([a-z]{3})/);
  return m ? { target: m[1], known: m[2] } : { target: null, known: null };
}

async function main() {
  const argv = process.argv.slice(2);
  const course = argv[0];
  if (!course) { console.error('usage: detect-mismatch.cjs <course_code> [--role use] [--json out]'); process.exit(2); }
  const opt = k => { const i = argv.indexOf(k); return i > -1 ? argv[i + 1] : null; };
  const role = opt('--role') || 'use';
  const outJson = opt('--json');
  const min = parseFloat(opt('--min') || '0');
  const from = parseInt(opt('--from') || '0', 10), to = parseInt(opt('--to') || '99999', 10);
  const offline = opt('--offline');

  const data = offline ? JSON.parse(fs.readFileSync(offline, 'utf8')) : await loadFromDb(course);
  const all = data.phrases;

  const iso = isoPair(course);
  const kPack = loadPack(iso.known), tPack = loadPack(iso.target);

  // The lexicon is built from the WHOLE course (all roles): build phrases are
  // short and cleanly aligned, which is exactly what a co-occurrence lexicon
  // wants. Defective rows are a ~4% minority and do not move Dice materially.
  const pairs = all.filter(r => r.known_text && r.target_text).map(r => [r.known_text, r.target_text]);
  const lex = buildLexicon(pairs);
  const revLex = buildLexicon(pairs.map(([k, t]) => [t, k]));
  const kFunc = functionWords(pairs.map(p => p[0]));
  const tFunc = functionWords(pairs.map(p => p[1]));
  const blex = buildBigramLexicon(pairs);
  const revBlex = buildBigramLexicon(pairs.map(([k, t]) => [t, k]));
  const ctx = { lex, revLex, blex, revBlex, kFunc, tFunc, kPack, tPack };

  const rows = all.filter(r => (role === 'all' || r.phrase_role === role) &&
    r.seed_number >= from && r.seed_number <= to && r.known_text && r.target_text);

  const results = rows.map(r => {
    const a = analyse(r, ctx);
    return {
      id: r.id, seed: r.seed_number, position: r.position, role: r.phrase_role,
      known: r.known_text, target: r.target_text,
      score: a.score, band: band(a.score),
      signals: a.signals.filter(s => s.w > 0).map(s => s.id),
      detail: a.signals.filter(s => s.w > 0).map(s => s.id + ': ' + s.detail),
      target1_audio_id: r.target1_audio_id, target2_audio_id: r.target2_audio_id,
      status: r.status,
    };
  }).filter(r => r.score >= min);

  results.sort((a, b) => b.score - a.score);
  const counts = results.reduce((m, r) => (m[r.band] = (m[r.band] || 0) + 1, m), {});
  console.error(`swept ${rows.length} ${role} rows in ${course}; pack known=${kPack.code} target=${tPack.code}; ` +
    `HIGH ${counts.HIGH || 0} MEDIUM ${counts.MEDIUM || 0} CLEAN ${counts.CLEAN || 0}`);
  if (outJson) fs.writeFileSync(outJson, JSON.stringify(results, null, 1));
  else for (const r of results.filter(r => r.band !== 'CLEAN')) {
    console.log(`${r.score}\t${r.band}\t${r.id}\t${r.known}\t||\t${r.target}\t${r.signals.join(',')}`);
  }
}

if (require.main === module) main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
module.exports = { analyse, buildLexicon, band, functionWords, loadPack, isoPair };
