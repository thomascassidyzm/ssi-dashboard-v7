#!/usr/bin/env node
/**
 * HAIKU AGAINST GOLD: per-frame precision / recall / F1, opener accuracy,
 * exact-set agreement, and every disagreement listed for the codex loop.
 *
 * Recall is reported twice: on the whole gold set, and on the RANDOM rows only
 * (select-gold.cjs). Enriched rows were chosen because the pre-pass tagged a
 * frame, which over-samples the tagger's own positives and flatters recall;
 * the random rows do not.
 *
 * Usage: node measure-gold.cjs [gold.json] [--model haiku] [--tag] [--json out.json]
 *   --tag   tag any gold text the cache lacks first (costs Haiku calls)
 */
const fs = require('fs');
const path = require('path');
const T = require('../frame-tagger.cjs');

function prf(rows, tagOf) {
  const per = {};
  for (const id of T.FRAME_IDS) per[id] = { tp: 0, fp: 0, fn: 0 };
  let exact = 0, openerOk = 0;
  const disagreements = [];
  for (const r of rows) {
    const h = tagOf(r);
    const g = new Set(r.gold.frames), hs = new Set(h.frames);
    for (const id of T.FRAME_IDS) {
      if (g.has(id) && hs.has(id)) per[id].tp++;
      else if (hs.has(id)) per[id].fp++;
      else if (g.has(id)) per[id].fn++;
    }
    const same = g.size === hs.size && [...g].every(x => hs.has(x));
    if (same) exact++;
    if (!!r.gold.opener === !!h.opener) openerOk++;
    if (!same || !!r.gold.opener !== !!h.opener) disagreements.push({ gid: r.gid, course: r.course, known: r.known_text,
      gold: r.gold.frames, haiku: h.frames, missed: [...g].filter(x => !hs.has(x)), extra: [...hs].filter(x => !g.has(x)),
      opener: { gold: !!r.gold.opener, haiku: !!h.opener }, note: r.gold.note });
  }
  const frames = T.FRAME_IDS.map(id => {
    const { tp, fp, fn } = per[id];
    const p = tp + fp ? tp / (tp + fp) : null, rc = tp + fn ? tp / (tp + fn) : null;
    return { id, name: T.CODEX.frames.find(f => f.id === id).name, gold_pos: tp + fn, tp, fp, fn,
      precision: p == null ? null : +p.toFixed(3), recall: rc == null ? null : +rc.toFixed(3),
      f1: p && rc ? +(2 * p * rc / (p + rc)).toFixed(3) : (tp ? 0 : null) };
  });
  const sum = (k) => frames.reduce((a, f) => a + f[k], 0);
  const micro = { tp: sum('tp'), fp: sum('fp'), fn: sum('fn') };
  micro.precision = +(micro.tp / (micro.tp + micro.fp)).toFixed(3);
  micro.recall = +(micro.tp / (micro.tp + micro.fn)).toFixed(3);
  micro.f1 = +(2 * micro.precision * micro.recall / (micro.precision + micro.recall)).toFixed(3);
  return { rows: rows.length, exact_set: +(exact / rows.length).toFixed(3), opener_accuracy: +(openerOk / rows.length).toFixed(3), micro, frames, disagreements };
}

async function measure(gold, { tag = false, model = 'haiku', cache = T.defaultCache() } = {}) {
  if (tag) {
    const byLang = {};
    for (const r of gold) (byLang[T.knownLanguageName(r.course)] ||= []).push(r.known_text);
    for (const [lang, texts] of Object.entries(byLang)) await T.ensureTagged(texts, { knownLanguage: lang, model, cache });
  }
  const tagOf = (r) => T.tagOf(r.known_text, cache);
  const english = gold.filter(r => T.knownLanguageOf(r.course) === 'eng');
  return { all: prf(gold, tagOf), random_rows: prf(gold.filter(r => r.selected === 'random'), tagOf),
    english_known: prf(english, tagOf), other_known: prf(gold.filter(r => T.knownLanguageOf(r.course) !== 'eng'), tagOf) };
}

function print(m) {
  const a = m.all;
  console.log(`rows ${a.rows}; exact frame set ${a.exact_set}; opener ${a.opener_accuracy}; micro P ${a.micro.precision} R ${a.micro.recall} F1 ${a.micro.f1}`);
  for (const k of ['random_rows', 'english_known', 'other_known']) console.log(`  ${k}: rows ${m[k].rows}, exact ${m[k].exact_set}, micro F1 ${m[k].micro.f1} (P ${m[k].micro.precision} R ${m[k].micro.recall})`);
  console.log('id   gold  P      R      F1     R(random)  name');
  for (const f of a.frames) {
    const rr = m.random_rows.frames.find(x => x.id === f.id);
    console.log(`${f.id.padEnd(4)} ${String(f.gold_pos).padStart(4)}  ${String(f.precision).padEnd(6)} ${String(f.recall).padEnd(6)} ${String(f.f1).padEnd(6)} ${String(rr.recall).padEnd(10)} ${f.name}`);
  }
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const goldFile = a.find(x => x.endsWith('.json') && a[a.indexOf(x) - 1] !== '--json') || path.join(__dirname, '..', 'frame-gold.json');
  const gold = JSON.parse(fs.readFileSync(goldFile, 'utf8'));
  measure(gold, { tag: a.includes('--tag') }).then(m => {
    print(m);
    const j = a.indexOf('--json'); if (j >= 0) fs.writeFileSync(a[j + 1], JSON.stringify(m, null, 1));
  }).catch(e => { console.error(e.message); process.exit(1); });
}
module.exports = { measure, prf };
