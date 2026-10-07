#!/usr/bin/env node
/**
 * GOLD SETS FOR THE NON-P CODEXES (D dialogue turns, X exchanges, C could-occupy
 * classes, S-spa split outcomes): the same shape as the P gold (sample-pool,
 * select-gold, adjudicate, measure-gold), generalised over a codex.
 *
 *   pool <D|X|C|S-spa> out.json         READ-ONLY draw of the texts that codex tags
 *   select pool.json out.json [--random N] [--per K]
 *                                        Haiku pre-tags the pool (cached), then the
 *                                        gold = N random rows + up to K Haiku-positive
 *                                        rows per class (enriched: rare classes need
 *                                        positives; recall is also reported on the
 *                                        random rows alone, which the pre-pass cannot flatter)
 *   adjudicate sel.json gold.json        Opus decides each row from the codex, blind to Haiku
 *   measure gold.json [--json out]       Haiku against gold: per-class P/R/F1
 *
 * No course content is written anywhere; every query is a SELECT.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const T = require('../frame-tagger.cjs');
const { D_CODEX, X_CODEX, exchangeText } = require('../dialogue-patterns.cjs');
const { C_CODEX } = require('../could-occupy.cjs');
const SPA = require('../split-codex-spa.json');

const CODEXES = { D: D_CODEX, X: X_CODEX, C: C_CODEX, 'S-spa': SPA };
const LANG = { D: 'English', X: 'English', C: 'English', 'S-spa': 'Spanish' };
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const byHash = (salt) => (a, b) => md5(a.text + salt).localeCompare(md5(b.text + salt));

// ------------------------------------------------------------------ pool
function podRows() {
  const { query } = require('../v4/db.cjs');
  const { loadSectorSource, SECTOR_SOURCES } = require('../extract-dialogue-patterns.cjs');
  const canon = query(`select pod_slug, scene_number, global_order, speaker, english_text from canonical_pod_scenarios
    where pod_slug = 'pod-1' order by global_order`);
  const sector = SECTOR_SOURCES.flatMap(s => loadSectorSource(s).rows);
  return [...canon, ...sector].filter(r => String(r.speaker || '').toLowerCase() !== 'narrator' && String(r.english_text || '').trim());
}

function pool(id) {
  const { query, lit } = require('../v4/db.cjs');
  if (id === 'D') {
    const seen = new Set();
    return podRows().filter(r => !seen.has(r.english_text) && seen.add(r.english_text))
      .map(r => ({ text: r.english_text, source: r.pod_slug, speaker: r.speaker }));
  }
  if (id === 'X') {
    const rows = podRows();
    const key = (r) => `${r.pod_slug}|${r.scene_number}`;
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1], b = rows[i];
      if (key(a) !== key(b)) continue;
      const c = rows[i + 1] && key(rows[i + 1]) === key(b) ? rows[i + 1] : null;
      out.push({ text: exchangeText(a.english_text, b.english_text), source: b.pod_slug, speakers: [a.speaker, b.speaker],
        triple: c ? exchangeText(a.english_text, b.english_text, c.english_text) : null });
    }
    return out;
  }
  if (id === 'C') {
    return query(`select known_text as text, count(distinct course_code) as courses from course_seeds
      where course_code like '%\\_for\\_eng' and known_text is not null group by known_text`)
      .sort(byHash('|C'));
  }
  if (id === 'S-spa') {
    const c = lit('spa_for_eng');
    return query(`select distinct on (target_text) target_text as text, kind from (
        select target_text, 'seed' as kind from course_seeds where course_code = ${c}
        union all select target_text, 'lego' from course_legos where course_code = ${c}
        union all select target_text, phrase_role from course_practice_phrases where course_code = ${c} and phrase_role in ('build','use')
      ) q where target_text is not null`).sort(byHash('|S'));
  }
  throw new Error(`no pool for codex ${id}`);
}

// ------------------------------------------------------------------ select
async function select(poolRows, codexId, { random = 40, per = 4, cap = 700 } = {}) {
  const codex = CODEXES[codexId];
  const rows = poolRows.slice().sort(byHash('|pool')).slice(0, cap);
  const ledger = await T.ensureTagged(rows.map(r => r.text), { codex, knownLanguage: LANG[codexId] });
  console.error(`pre-tagged ${rows.length} rows: ${ledger.calls} call(s), $${ledger.cost_usd.toFixed(3)}`);
  const tagged = rows.filter(r => T.defaultCache(codex).has(r.text));
  const pick = new Map();
  for (const r of tagged.slice(0, random)) pick.set(r.text, { ...r, why: 'random' });
  for (const f of codex.frames) {
    const pos = tagged.filter(r => T.framesOf(r.text, codex).includes(f.id) && !pick.has(r.text)).slice(0, per);
    for (const r of pos) pick.set(r.text, { ...r, why: `enriched:${f.id}` });
  }
  return [...pick.values()].map((r, i) => ({ gid: `${codexId}-${String(i + 1).padStart(3, '0')}`, ...r }));
}

// ------------------------------------------------------------------ adjudicate
async function adjudicate(sel, codexId, outFile, { batch = 30, parallel = 4 } = {}) {
  const codex = CODEXES[codexId];
  const ids = T.idsOf(codex);
  const SYSTEM = `You are the adjudicator for a gold set: for each item you decide, carefully and exactly by the codex below, which ids apply. Think about every definition and boundary rule; precision matters more than speed. You reply with JSON only.\n\n${T.renderCodex(codex)}`;
  const done = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : [];
  const have = new Set(done.map(d => d.gid));
  const todo = sel.filter(r => !have.has(r.gid));
  const batches = [];
  for (let i = 0; i < todo.length; i += batch) batches.push(todo.slice(i, i + batch));
  let next = 0, cost = 0;
  const worker = async () => {
    while (next < batches.length) {
      const b = batches[next++];
      const prompt = `Adjudicate each item (the items are in ${LANG[codexId]}). Reply with a JSON array, one object per item, in order:
{"gid": "...", "ids": ["..."], "note": "one short line on any borderline call, else empty"}

ITEMS:
${b.map(r => JSON.stringify({ gid: r.gid, text: r.text })).join('\n')}`;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const r = await T.callModel(prompt, { model: 'opus', system: SYSTEM, timeoutMs: 900000 });
          const arr = JSON.parse(r.text.slice(r.text.indexOf('['), r.text.lastIndexOf(']') + 1));
          for (const a of arr) {
            const row = b.find(x => x.gid === a.gid);
            if (row) done.push({ ...row, gold: { frames: [...new Set(a.ids || [])].filter(x => ids.includes(x)).sort((x, y) => ids.indexOf(x) - ids.indexOf(y)), note: a.note || '' } });
          }
          cost += r.usage.cost_usd;
          fs.writeFileSync(outFile, JSON.stringify(done, null, 1));
          console.error(`adjudicated ${arr.length}/${b.length}, ${Math.round(r.usage.ms / 1000)}s`);
          break;
        } catch (e) { console.error(`attempt ${attempt} failed: ${e.message}`); }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, batches.length) }, worker));
  console.error(`done ${done.length}/${sel.length}, opus $${cost.toFixed(2)}`);
}

// ------------------------------------------------------------------ measure
function measure(gold, codexId, { cache } = {}) {
  const codex = CODEXES[codexId];
  const ids = T.idsOf(codex);
  const c = cache || T.defaultCache(codex);
  const score = (rows) => {
    const per = Object.fromEntries(ids.map(id => [id, { tp: 0, fp: 0, fn: 0 }]));
    let exact = 0;
    const disagreements = [];
    for (const r of rows) {
      const g = new Set(r.gold.frames), h = new Set(T.tagOf(r.text, c).frames);
      for (const id of ids) {
        if (g.has(id) && h.has(id)) per[id].tp++; else if (h.has(id)) per[id].fp++; else if (g.has(id)) per[id].fn++;
      }
      if (g.size === h.size && [...g].every(x => h.has(x))) exact++;
      else disagreements.push({ gid: r.gid, text: r.text, gold: [...g], haiku: [...h], note: r.gold.note });
    }
    const classes = ids.map(id => {
      const { tp, fp, fn } = per[id];
      const p = tp + fp ? tp / (tp + fp) : null, rc = tp + fn ? tp / (tp + fn) : null;
      return { id, name: codex.frames.find(f => f.id === id).name, gold_pos: tp + fn, tp, fp, fn,
        precision: p == null ? null : +p.toFixed(3), recall: rc == null ? null : +rc.toFixed(3),
        f1: p && rc ? +(2 * p * rc / (p + rc)).toFixed(3) : (tp + fp + fn ? 0 : null) };
    });
    const tp = classes.reduce((a, x) => a + x.tp, 0), fp = classes.reduce((a, x) => a + x.fp, 0), fn = classes.reduce((a, x) => a + x.fn, 0);
    const P = tp / ((tp + fp) || 1), R = tp / ((tp + fn) || 1);
    return { rows: rows.length, exact_set: +(exact / (rows.length || 1)).toFixed(3),
      micro: { tp, fp, fn, precision: +P.toFixed(3), recall: +R.toFixed(3), f1: +(2 * P * R / ((P + R) || 1)).toFixed(3) },
      classes, disagreements };
  };
  return { codex: codex.id, version: codex.version, all: score(gold), random_only: score(gold.filter(r => r.why === 'random')) };
}

// ------------------------------------------------------------------ cli
if (require.main === module) {
  const [cmd, a, b] = process.argv.slice(2);
  const opt = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
  const codexOf = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))[0].gid.split('-').slice(0, -1).join('-');
  (async () => {
    if (cmd === 'pool') fs.writeFileSync(b, JSON.stringify(pool(a), null, 1));
    else if (cmd === 'select') {
      const id = opt('--codex');
      fs.writeFileSync(b, JSON.stringify(await select(JSON.parse(fs.readFileSync(a, 'utf8')), id,
        { random: +opt('--random', 40), per: +opt('--per', 4), cap: +opt('--cap', 700) }), null, 1));
    } else if (cmd === 'adjudicate') await adjudicate(JSON.parse(fs.readFileSync(a, 'utf8')), codexOf(a), b);
    else if (cmd === 'measure') {
      const gold = JSON.parse(fs.readFileSync(a, 'utf8'));
      const id = codexOf(a);
      if (process.argv.includes('--tag')) await T.ensureTagged(gold.map(r => r.text), { codex: CODEXES[id], knownLanguage: LANG[id] });
      const m = measure(gold, id);
      const out = opt('--json');
      if (out) fs.writeFileSync(out, JSON.stringify(m, null, 1));
      for (const [k, s] of [['all', m.all], ['random', m.random_only]]) {
        console.log(`${m.codex} ${m.version} ${k}: ${s.rows} rows, exact ${s.exact_set}, micro P ${s.micro.precision} R ${s.micro.recall} F1 ${s.micro.f1}`);
      }
      for (const c of m.all.classes) console.log(`  ${c.id.padEnd(5)} pos ${String(c.gold_pos).padStart(3)}  P ${c.precision ?? '—'}  R ${c.recall ?? '—'}  F1 ${c.f1 ?? '—'}  ${c.name}`);
      if (process.argv.includes('--why')) for (const d of m.all.disagreements) console.log(`  ${d.gid} gold ${d.gold.join(' ') || '-'} | haiku ${d.haiku.join(' ') || '-'} | ${d.text}${d.note ? '  [' + d.note + ']' : ''}`);
    } else console.error('usage: codex-gold.cjs pool|select|adjudicate|measure ...');
  })().catch(e => { console.error(e.stack || e.message); process.exit(1); });
}

module.exports = { pool, select, adjudicate, measure, CODEXES };
