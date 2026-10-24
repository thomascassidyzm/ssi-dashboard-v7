#!/usr/bin/env node
'use strict';
// PLAN-FIRST RENDER (job #393, ruling r-2026-10-24 plan-first). Tom 2026-10-24: "Surely intelligence means we plan in advance an
// analysis of everything that needs a recording to play to the learner. Then we build the minimal set of recordings we need to
// actually use TTS for? Make those. Then compile from these all the clips needed?" and "the joins are not worth it, but the cuts work
// great." So: a clip is either RENDERED, or CUT as ONE contiguous span of ONE longer rendered clip of a DIFFERENT text. No joins, ever;
// a source is never the clip's own text or own clip (the #340/#359 rule).
//
// READ-ONLY and zero spend: this tool renders nothing, writes no pointer, posts nothing. Output goes to ~/ssi-evidence.
//   source ~/ssi-restore/qa-copy.env && node tools/audio/plan-first-render.cjs --course fra_for_eng        # whole course, QA copy
//   node tools/audio/plan-first-render.cjs --list                                                         # course codes
//   node tools/audio/plan-first-render.cjs --course zho_for_eng --seeds 101-668 --outstanding            # asks left after #366 (live read)
//
// WHAT IS COUNTED (the clips a learner hears, as the round generator emits them — services/audio-reuse-planner.cjs enumerateRoundClips):
//   new LEGOs (course_legos.is_new): known + target1 + target2 text, plus the intro (presentation) clip's text when the LEGO has one;
//   practice phrases (build/use; phrase_role 'component' is skipped at runtime, ralph "Round Structure"): known + target1 + target2;
//   seed sentences (the generator reviews seeds): known + target1 + target2.
//   Reviews and consolidation replay clips that are already counted, so they add plays but no new clips. EXCLUDED: component rows,
//   pods, instructions, encouragements, non-new LEGO rows (never a round of their own). An intro with no authored presentation text
//   cannot be planned and is counted in `introsWithoutText`, not silently dropped.
// DEDUPE: (language, text). The library reuses by language+text+voice, and a course renders in ONE cast voice per role; target1 and
//   target2 are the same words at two speeds, so they are ONE recording here (speed is applied at play time, not by a second render).
//   The voice is therefore not part of the key and the plan ASSUMES the cast voice for every clip; cut sources must be in that voice.
// CLEAN-CUT RULES (both reported):
//   strict — the span opens and closes on a clause edge: the source's own edge or beside punctuation, so the engine left a pause.
//   loose  — the span opens and closes on a word boundary (unspaced scripts: any character).
// GREEDY: set cover over containment is NP-hard; this goes longest-first, renders any clip no already-rendered clip covers, and
//   marks every clip it contains. Not optimal; an upper bound on the saving is not claimed, a feasible plan is.
// HONEST LIMIT: the plan only knows the TEXT contains the span. Whether the audio cuts cleanly (tail clicks, onset bleed) is only
//   settled by the #374 ingest-cut audit at apply time, so every cut count here is an upper bound until then.
const path = require('path');
const fs = require('fs');

const PUNCT = /[\s\p{P}\p{S}]/u;
const SEP = '\u0001';

/** Spaced scripts separate words with spaces; chosen per LANGUAGE (a one-word clip has no space to tell by). */
function isSpaced(texts) {
  const t = texts.filter((x) => /[\p{L}]/u.test(x));
  return t.length > 0 && t.filter((x) => /[\p{L}]+\s+[\p{L}]+/u.test(String(x))).length / t.length > 0.5;
}

/** Tokens of a text plus where a clause break (punctuation) follows each token. Spaced scripts: words; unspaced: characters. */
function tokenise(text, spaced = true) {
  const s = String(text || '').normalize('NFKC').toLowerCase();
  const tokens = [], brk = [];
  if (spaced) {
    let cur = '';
    const flush = () => { if (cur) { tokens.push(cur); brk.push(false); cur = ''; } };
    for (const c of s) {
      if (/\s/u.test(c)) flush();
      else if (PUNCT.test(c)) { flush(); if (brk.length) brk[brk.length - 1] = true; }
      else cur += c;
    }
    flush();
  } else {
    for (const c of s) {
      if (/\s/u.test(c)) continue;
      if (PUNCT.test(c)) { if (brk.length) brk[brk.length - 1] = true; } else { tokens.push(c); brk.push(false); }
    }
  }
  return { tokens, brk, key: tokens.join(SEP) };
}

/** Contiguous spans [a,b) of a tokenised source, never the whole. `strict` demands clause edges. */
function* spansOf(tk, strict, maxLen = Infinity) {
  const n = tk.tokens.length;
  for (let a = 0; a < n; a++) {
    if (strict && a > 0 && !tk.brk[a - 1]) continue;
    for (let b = a + 1; b <= n && b - a <= maxLen; b++) {
      if (a === 0 && b === n) continue;
      if (strict && b < n && !tk.brk[b - 1]) continue;
      yield [a, b];
    }
  }
}

/**
 * clips: [{ id, text, have? }] — `have` = already rendered in the cast voice (a free source, never needs rendering itself).
 * Returns { render:[ids], cut:{id:{source,a,b}} }. Longest first. A source is always another clip with a DIFFERENT key and strictly more
 * tokens; a clip is never cut from itself or from a join of two clips.
 */
function plan(clips, { strict = false, spaced = isSpaced(clips.map((c) => c.text)) } = {}) {
  const info = clips.map((c) => ({ ...c, tk: tokenise(c.text, spaced) })).filter((c) => c.tk.tokens.length);
  const byKey = new Map();
  for (const c of info) if (!byKey.has(c.tk.key)) byKey.set(c.tk.key, c);
  const maxLen = Math.max(0, ...info.map((c) => c.tk.tokens.length));
  const order = [...byKey.values()].sort((x, y) => y.tk.tokens.length - x.tk.tokens.length || (x.tk.key < y.tk.key ? -1 : 1));
  const render = [], cut = {}, covered = new Set();
  const mark = (src) => {
    for (const [a, b] of spansOf(src.tk, strict, maxLen - 1)) {
      const hit = byKey.get(src.tk.tokens.slice(a, b).join(SEP));
      if (!hit || hit === src || hit.have || covered.has(hit.tk.key)) continue;
      covered.add(hit.tk.key);
      cut[hit.id] = { source: src.id, a, b };
    }
  };
  for (const c of order) if (c.have) mark(c); // free sources first
  for (const c of order) {
    if (c.have || covered.has(c.tk.key)) continue;
    render.push(c.id);
    mark(c);
  }
  return { render, cut };
}

/** Independent checker: every cut is one contiguous span of ONE other, longer clip; nothing is both rendered and cut. */
function verifyPlan(clips, p, { strict = false, spaced = isSpaced(clips.map((c) => c.text)) } = {}) {
  const by = new Map(clips.map((c) => [c.id, { ...c, tk: tokenise(c.text, spaced) }]));
  const errs = [];
  for (const id of p.render) if (p.cut[id]) errs.push(`${id} is both rendered and cut`);
  for (const [id, c] of Object.entries(p.cut)) {
    const me = by.get(id), src = by.get(c.source);
    if (!me || !src) { errs.push(`${id}: unknown clip or source`); continue; }
    if (c.source === id || src.tk.key === me.tk.key) { errs.push(`${id}: sourced from its own text`); continue; }
    if (src.tk.tokens.length <= me.tk.tokens.length) { errs.push(`${id}: source is not longer`); continue; }
    if (!p.render.includes(c.source) && !src.have) { errs.push(`${id}: source ${c.source} is neither rendered nor existing`); continue; }
    if (src.tk.tokens.slice(c.a, c.b).join(SEP) !== me.tk.key) errs.push(`${id}: not one contiguous span of its source (a join or a mismatch)`);
    else if (strict) {
      const edgeA = c.a === 0 || src.tk.brk[c.a - 1], edgeB = c.b === src.tk.tokens.length || src.tk.brk[c.b - 1];
      if (!edgeA || !edgeB) errs.push(`${id}: strict cut not on a clause edge`);
    }
  }
  for (const c of by.values()) if (!c.have && !p.cut[c.id] && !p.render.includes(c.id)) errs.push(`${c.id}: neither rendered nor cut`);
  return errs;
}

const chars = (list, by) => list.reduce((n, id) => n + [...by.get(id).text].length, 0);

/** Summary for one universe: naive vs strict vs loose. */
function summarise(clips) {
  const by = new Map(clips.map((c) => [c.id, c]));
  const need = clips.filter((c) => !c.have);
  const naive = chars(need.map((c) => c.id), by);
  const out = { uniqueClips: need.length, naiveChars: naive };
  const plans = {};
  for (const mode of ['strict', 'loose']) {
    const p = plan(clips, { strict: mode === 'strict' });
    const errs = verifyPlan(clips, p, { strict: mode === 'strict' });
    if (errs.length) throw new Error(`plan (${mode}) failed its own check: ${errs.slice(0, 3).join('; ')}`);
    const cuts = Object.keys(p.cut).length;
    const rc = chars(p.render, by);
    out[mode] = { renderSet: p.render.length, renderChars: rc, cuts, cutFraction: need.length ? +(cuts / need.length).toFixed(4) : 0, savingPct: naive ? +(100 * (1 - rc / naive)).toFixed(1) : 0 };
    plans[mode] = p;
  }
  return { out, plans };
}

async function loadCourse(pg, course, from, to) {
  const rng = [course, from, to];
  const q = (sql) => pg.query(sql, rng).then((r) => r.rows);
  const [seeds, legos, phr, pres] = await Promise.all([
    q(`SELECT seed_number, known_text, target_text, target1_audio_id, target2_audio_id FROM course_seeds WHERE course_code=$1 AND seed_number>=$2 AND seed_number<=$3`),
    q(`SELECT lego_id, seed_number, known_text, target_text, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND seed_number>=$2 AND seed_number<=$3 AND is_new = true AND lego_id IS NOT NULL`),
    q(`SELECT id, seed_number, known_text, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND seed_number>=$2 AND seed_number<=$3 AND phrase_role <> 'component'`),
    require('../../services/shared/agent-db.cjs').presentationClips(pg, course),
  ]);
  return { seeds, legos, phr, pres: pres.filter((p) => true) };
}

async function main() {
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
  const db = require('../../services/shared/agent-db.cjs');
  const pg = await db.connect();
  if (process.argv.includes('--list')) {
    const r = await pg.query(`SELECT course_code, known_lang, target_lang FROM courses ORDER BY course_code`);
    console.log(r.rows.map((x) => `${x.course_code} (${x.known_lang}->${x.target_lang})`).join('\n'));
    return pg.end();
  }
  const COURSE = arg('course'); if (!COURSE) throw new Error('--course required');
  const [from, to] = (arg('seeds', '1-100000')).split('-').map(Number);
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const course = (await pg.query(`SELECT known_lang, target_lang FROM courses WHERE course_code=$1`, [COURSE])).rows[0];
  if (!course) throw new Error(`no course ${COURSE}`);
  const d = await loadCourse(pg, COURSE, from, to);
  const slots = { known: 0, target1: 0, target2: 0, presentation: 0 };
  const uni = new Map(); // `${lang}|${text}` -> clip
  const add = (lang, text, have = false) => {
    if (!text || !String(text).trim()) return;
    const k = `${lang}|${tokenise(text, false).key}`;
    if (!uni.has(k)) uni.set(k, { id: k, lang, text: String(text).trim(), have });
    else if (have) uni.get(k).have = true;
  };
  const rows = [...d.seeds, ...d.legos, ...d.phr];
  const asks = process.argv.includes('--outstanding');
  let standing = null;
  if (asks) {
    // OUTSTANDING (zho after #366): what revoice-seeds-to-cast would still ask for — slots whose clip is TTS in a non-cast voice —
    // priced as target-language asks; clips already in the cast voice are free cut sources.
    const rv = require('./revoice-seeds-to-cast.cjs');
    const vc = await fetch(`${process.env.POPTY_URL || 'http://localhost:3470'}/api/courses/${COURSE}/voice-config/resolved`).then((r) => r.json()).catch(() => ({}));
    const { castByRole, missing } = rv.castFromVoiceConfig(vc);
    if (missing) throw new Error(`GAP: no cast for ${missing.role} — cannot price outstanding asks`);
    const clipRows = await db.clipMap(pg, rows.flatMap((r) => [r.target1_audio_id, r.target2_audio_id]), { cols: 'id::text AS id, text, voice_id, origin' });
    const bare = (v) => String(v || '').replace(/^[a-z]+_/, '');
    const staleRows = rows.map((r) => ({ ...r, slot: {} }));
    const list = rv.staleAsks(staleRows, clipRows, castByRole);
    for (const a of list) add(course.target_lang, a.text);
    for (const r of rows) for (const role of ['target1', 'target2']) {
      const c = clipRows.get(r[`${role}_audio_id`] ? String(r[`${role}_audio_id`]) : '');
      if (c && c.origin === 'tts' && bare(c.voice_id) === bare(castByRole[role])) add(course.target_lang, c.text, true);
    }
    standing = { asks: list.length, askChars: list.reduce((n, a) => n + a.chars, 0), cast: castByRole };
  } else {
    for (const r of rows) {
      add(course.known_lang, r.known_text); add(course.target_lang, r.target_text);
      slots.known += r.known_text ? 1 : 0; slots.target1 += 1; slots.target2 += 1;
    }
  }
  let introsWithoutText = 0;
  if (!asks) for (const l of d.legos) {
    const p = d.pres.find((x) => x.lego_id === l.lego_id);
    if (p && p.text) { add(course.known_lang, p.text); slots.presentation++; } else introsWithoutText++;
  }
  const clips = [...uni.values()];
  const byLang = {};
  for (const c of clips) (byLang[c.lang] ||= []).push(c);
  const result = { course: COURSE, seeds: [from, to], mode: asks ? 'outstanding' : 'whole-course', slots, introsWithoutText, standing, langs: {} };
  const tot = { uniqueClips: 0, naiveChars: 0, strict: { renderSet: 0, renderChars: 0, cuts: 0 }, loose: { renderSet: 0, renderChars: 0, cuts: 0 } };
  const full = {};
  for (const [lang, list] of Object.entries(byLang)) {
    const { out, plans } = summarise(list);
    result.langs[lang] = out; full[lang] = { plans, texts: Object.fromEntries(list.map((c) => [c.id, c.text])) };
    tot.uniqueClips += out.uniqueClips; tot.naiveChars += out.naiveChars;
    for (const m of ['strict', 'loose']) for (const f of ['renderSet', 'renderChars', 'cuts']) tot[m][f] += out[m][f];
  }
  for (const m of ['strict', 'loose']) { tot[m].savingPct = tot.naiveChars ? +(100 * (1 - tot[m].renderChars / tot.naiveChars)).toFixed(1) : 0; tot[m].cutFraction = tot.uniqueClips ? +(tot[m].cuts / tot.uniqueClips).toFixed(4) : 0; }
  result.total = tot;
  result.clipsPlayedSlots = Object.values(slots).reduce((a, b) => a + b, 0);
  const file = evidencePath(`audio/plan-first/${COURSE}-${asks ? 'outstanding' : 'full'}-${from}-${to}.json`);
  fs.writeFileSync(file, JSON.stringify({ summary: result, plans: full }));
  console.log(JSON.stringify({ ...result, evidenceFile: file }, null, 1));
  await pg.end();
}

module.exports = { isSpaced, tokenise, spansOf, plan, verifyPlan, summarise };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
