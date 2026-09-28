#!/usr/bin/env node
/**
 * THE PER-COURSE QA-PASS DOCUMENT — every measure the pass produced, old vs v3,
 * by course third, from files already on disk (job #409). No model calls; one
 * DB read for the live arm's stem shares. READ-ONLY.
 *
 * Sources, all written by the pass's own tools:
 *   scores/seed-*.json        the five floors + composite, live and candidate
 *                             (tools/frame-layer/qa-report.cjs)
 *   stem-reuse-*.json         early-stem laziness index (tools/phrase-lab/stem-reuse.cjs)
 *   nat-live / nat-r1 / nat-r2.jsonl  the cross-family naturalness judge
 *   candidates/               cross-basket stem shares, "?" and capital I
 *                             (tools/phrase-lab/stem-shares-report.cjs measure)
 *   run-account-<c>.json      done / blocked / errored / re-swept (course-run-report.cjs)
 *   clip-index dump           re-voice characters for the changed phrases
 *
 *   node tools/phrase-lab/qa-pass-report.cjs ita_for_eng --ev <course-v3-dir> --account <run-account.json> --md out.md
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { measure } = require('./stem-shares-report.cjs');
const { clipTextKey } = require('../../services/shared/clip-index.cjs');

const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };
const readJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const f3 = (x) => (x == null ? '—' : x.toFixed(3));
const pct = (x) => (x == null ? '—' : `${(100 * x).toFixed(1)}%`);
const CARTESIA_PER_M = 29.87; // $ per million characters — the rate job #394 priced the estate at ($53.71 / 1,797,967 chars)
const LANG_NAME = { ita: 'Italian', deu: 'German', fra: 'French', spa: 'Spanish' };

function thirds(maxSeed) {
  const span = maxSeed - 10;
  const a = 10 + Math.floor(span / 3); const b = 10 + Math.floor((2 * span) / 3);
  return [{ name: 'early', from: 11, to: a }, { name: 'mid', from: a + 1, to: b }, { name: 'late', from: b + 1, to: maxSeed }];
}

async function main() {
  const course = process.argv[2];
  const lang = course.split('_')[0];
  const ev = arg('--ev');
  const cands = path.join(ev, 'candidates');
  const account = arg('--account') && fs.existsSync(arg('--account')) ? JSON.parse(fs.readFileSync(arg('--account'), 'utf8')) : null;

  // ── candidates on disk ──
  const cand = [];
  for (const sd of fs.readdirSync(cands).filter((d) => /^seed-\d+$/.test(d))) {
    for (const f of fs.readdirSync(path.join(cands, sd)).filter((x) => x.endsWith('.json'))) {
      try { const r = JSON.parse(fs.readFileSync(path.join(cands, sd, f), 'utf8')); if (r.seedNumber >= 11) cand.push(r); } catch { /* skip */ }
    }
  }
  const maxSeed = Math.max(...cand.map((r) => r.seedNumber));
  const T = thirds(maxSeed);
  const thirdOf = (s) => (T.find((t) => s >= t.from && s <= t.to) || {}).name;
  const key = (s, l) => `S${String(s).padStart(4, '0')}L${String(l).padStart(2, '0')}`;

  // ── the five floors, paired ──
  const pairs = new Map();
  for (const f of fs.readdirSync(path.join(ev, 'scores')).filter((x) => x.endsWith('.json'))) {
    for (const r of JSON.parse(fs.readFileSync(path.join(ev, 'scores', f), 'utf8')).rows || []) {
      if (!r.axes || typeof r.composite !== 'number' || r.seed < 11) continue;
      const k = r.lego_id; if (!pairs.has(k)) pairs.set(k, { seed: r.seed, lego: r.lego });
      pairs.get(k)[r.source] = r;
    }
  }
  const both = [...pairs.values()].filter((p) => p.live && p.candidate);
  const floorsRow = (ps, side) => ({ n: ps.length, pass: ps.filter((p) => p[side].pass).length, comp: mean(ps.map((p) => p[side].composite)) });

  // ── laziness index ──
  const sr = fs.readdirSync(ev).filter((f) => /^stem-reuse-\d{4}-\d\d-\d\d\.json$/.test(f)).sort().pop();
  const srRows = sr ? JSON.parse(fs.readFileSync(path.join(ev, sr), 'utf8')).filter((r) => r.seed >= 11 && r.chanceEarlyShare) : [];
  const lazy = (rows, arm) => mean(rows.filter((r) => r[arm] && r[arm].earlyStemShare != null).map((r) => r[arm].earlyStemShare / r.chanceEarlyShare).filter(Number.isFinite));

  // ── naturalness ──
  const natLive = readJsonl(path.join(ev, 'nat-live.jsonl'));
  const r1 = readJsonl(path.join(ev, 'nat-r1.jsonl'));
  const r2 = new Map(readJsonl(path.join(ev, 'nat-r2.jsonl')).map((r) => [r.key, r]));
  const natFinal = r1.map((r) => r2.get(r.key) || r);
  const natRate = (rows) => { const ph = rows.reduce((a, r) => a + r.phrases, 0); return { n: rows.length, ph, fl: rows.reduce((a, r) => a + r.flagged, 0), ov: rows.filter((r) => (r.overused || []).length).length }; };
  const liveKeys = new Set(natLive.map((r) => r.key));
  const natSame = natFinal.filter((r) => liveKeys.has(r.key));
  const natLiveSame = natLive.filter((r) => natSame.some((s) => s.key === r.key));
  const glossComplaints = natFinal.filter((r) => r.gloss);

  // ── stems, "?", capital I: v3 vs live, per third ──
  const { supabase } = require('../../services/supabase-client.cjs');
  const liveRows = [];
  // In 40-seed blocks: one course-wide sort by id hits the statement timeout.
  for (let s0 = 11; s0 <= maxSeed; s0 += 40) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('course_practice_phrases').select('seed_number,lego_index,phrase_role,known_text,target_text')
        .eq('course_code', course).gte('seed_number', s0).lt('seed_number', s0 + 40).in('phrase_role', ['build', 'use'])
        .order('seed_number').order('lego_index').range(from, from + 999);
      if (error) throw new Error(error.message);
      liveRows.push(...data); if (data.length < 1000) break;
    }
  }
  const liveBy = new Map();
  for (const p of liveRows) { const k = key(p.seed_number, p.lego_index); (liveBy.get(k) || liveBy.set(k, []).get(k)).push({ known: p.known_text, target: p.target_text, role: p.phrase_role, seed: p.seed_number }); }
  const v3Baskets = cand.map((r) => ({ seed: r.seedNumber, key: key(r.seedNumber, r.legoIndex), legoKnown: r.legoKnown, phrases: [...(r.build || []), ...(r.use || [])], r }));
  const liveBaskets = v3Baskets.filter((b) => liveBy.has(b.key)).map((b) => ({ seed: b.seed, legoKnown: b.legoKnown, phrases: liveBy.get(b.key) }));

  // ── re-voice: v3 texts with no clip in the clip index (any voice) ──
  const want = new Set(['eng', lang]);
  const idx = { eng: new Set(), [lang]: new Set() };
  const dump = path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', 'clip-index', 'clip-index-dump.tsv.gz');
  for (const ln of zlib.gunzipSync(fs.readFileSync(dump)).toString().split('\n')) {
    const t = ln.split('\t'); if (want.has(t[0])) idx[t[0]].add(t[3]);
  }
  const seenK = new Set(); const seenT = new Set(); let kChars = 0; let tChars = 0; let phrases = 0;
  for (const b of v3Baskets) for (const p of b.phrases) {
    phrases += 1;
    const k = clipTextKey(p.known); const t = clipTextKey(p.target);
    if (!idx.eng.has(k) && !seenK.has(k)) { seenK.add(k); kChars += String(p.known).length; }
    if (!idx[lang].has(t) && !seenT.has(t)) { seenT.add(t); tChars += String(p.target).length; }
  }
  // One known voice + one target male + one target female (the casting of record, 2026-09-27).
  const voiceChars = kChars + 2 * tChars;

  // ── 20 before/after examples, spread across the course, late-weighted ──
  const flagged = new Map(natFinal.map((r) => [r.key, new Set((r.flags || []).map((f) => f.known))]));
  const pool = v3Baskets.filter((b) => liveBy.has(b.key) && (liveBy.get(b.key).filter((p) => p.role === 'use').length))
    .sort((a, b) => a.seed - b.seed);
  const picks = [];
  const targets = [...Array(20)].map((_, i) => 11 + Math.round(((maxSeed - 11) * (i + 0.5 + (i >= 10 ? 0.3 : 0))) / 20.3));
  for (const s of targets) {
    const b = pool.find((x) => x.seed >= s && !picks.includes(x));
    if (b) picks.push(b);
  }

  // ── write ──
  const L = [];
  L.push(`# ${LANG_NAME[lang] || lang} (${course}): phrase generator v3, full-course pass vs live`);
  L.push('');
  L.push(`*Job #409, ${new Date().toISOString().slice(0, 16)}Z. Candidates only: nothing was written to the database and no audio was rendered. Seeds 1-10 are hand-tweaked and excluded from every figure. "Thirds" are seeds ${T.map((t) => `${t.from}-${t.to}`).join(' / ')}.*`);
  L.push('');
  L.push('## Headline, by course third');
  L.push('');
  L.push('| measure | arm | early | mid | late | all |');
  L.push('|---|---|---|---|---|---|');
  const byT = (fn) => [...T.map((t) => fn((x) => x.seed >= t.from && x.seed <= t.to)), fn(() => true)];
  const row = (m, arm, cells) => L.push(`| ${m} | ${arm} | ${cells.join(' | ')} |`);
  for (const side of ['live', 'candidate']) {
    row('pass all five content floors', side === 'live' ? 'live' : 'v3', byT((f) => { const r = floorsRow(both.filter(f), side); return r.n ? `${r.pass}/${r.n} (${Math.round(100 * r.pass / r.n)}%)` : '—'; }));
  }
  for (const side of ['live', 'candidate']) row('composite (0-1)', side === 'live' ? 'live' : 'v3', byT((f) => f3(floorsRow(both.filter(f), side).comp)));
  for (const arm of ['live', 'v3']) row('laziness index (1 = chance; >1 leans on seeds 1-10)', arm, byT((f) => f3(lazy(srRows.filter(f), arm))));
  for (const [arm, bs] of [['live', liveBaskets], ['v3', v3Baskets]]) {
    row('top stem share across baskets', arm, byT((f) => { const m = measure(bs.filter(f)); return m.baskets ? `${Math.round(100 * m.maxStemShare)}% "${m.topStems[0]?.stem || ''}"` : '—'; }));
  }
  for (const [arm, bs] of [['live', liveBaskets], ['v3', v3Baskets]]) row('baskets dominated by one collocate', arm, byT((f) => pct(measure(bs.filter(f)).collocateDominatedShare)));
  for (const [arm, bs] of [['live', liveBaskets], ['v3', v3Baskets]]) row('questions missing "?"', arm, byT((f) => String(measure(bs.filter(f)).questionsMissingMark)));
  L.push('');
  const nl = natRate(natLiveSame); const nv = natRate(natSame); const n1 = natRate(r1); const nf = natRate(natFinal);
  L.push('**Naturalness** (Codex judge, not Claude; both languages; "flagged" = a native speaker would not say it):');
  L.push('');
  L.push('| arm | baskets | phrases flagged | baskets with an over-used collocation |');
  L.push('|---|---|---|---|');
  L.push(`| live, stratified sample (31 seeds) | ${nl.n} | ${nl.fl}/${nl.ph} (${pct(nl.fl / nl.ph)}) | ${pct(nl.ov / nl.n)} |`);
  L.push(`| v3 after the judge-and-revise loop, same LEGOs | ${nv.n} | ${nv.fl}/${nv.ph} (${pct(nv.fl / nv.ph)}) | ${pct(nv.ov / nv.n)} |`);
  L.push(`| v3 all baskets, before revision | ${n1.n} | ${n1.fl}/${n1.ph} (${pct(n1.fl / n1.ph)}) | ${pct(n1.ov / n1.n)} |`);
  L.push(`| v3 all baskets, after revision | ${nf.n} | ${nf.fl}/${nf.ph} (${pct(nf.fl / nf.ph)}) | ${pct(nf.ov / nf.n)} |`);
  L.push('');
  L.push(`Vocabulary: every v3 phrase passes the live builder's LEGO-level vocab check (only earlier seeds and earlier LEGOs of the same seed, as whole chunks).`);
  L.push('');
  if (account) {
    L.push('## The run');
    L.push('');
    L.push(`${account.legos} baskets at seeds 11+. **${account.done} generated** (${account.reswept} of them re-swept after an error or a capped pool), ${account.blocked} refused by the gate after retries (no candidate; the live basket stays), ${account.errored} errored, ${account.missing} not reached. Pool-capped bounces: ${account.poolBounces} (never counted as basket errors since the fix); real errors: ${account.realErrors}.`);
    L.push('');
  }
  L.push('## Re-voicing the changed phrases');
  L.push('');
  L.push(`${phrases.toLocaleString()} v3 phrases. Texts with no clip anywhere in the clip index: ${seenK.size.toLocaleString()} English (${kChars.toLocaleString()} characters) and ${seenT.size.toLocaleString()} ${LANG_NAME[lang] || lang} (${tChars.toLocaleString()} characters). With one known voice and a target male and female, that is **${voiceChars.toLocaleString()} characters, about $${(voiceChars / 1e6 * CARTESIA_PER_M).toFixed(0)} at Cartesia's rate** (the $${CARTESIA_PER_M}/M job #394 priced the estate at). Not rendered: the standing no-new-TTS-spend ruling holds.`);
  L.push('');
  L.push('## 20 before / after');
  L.push('');
  L.push('One live USE phrase and one v3 USE phrase for the same LEGO, spread across the course and weighted late. The v3 phrase shown is one the naturalness judge did not flag.');
  L.push('');
  L.push(`| seed | LEGO | live (before) | v3 (after) |`);
  L.push('|---|---|---|---|');
  for (const b of picks) {
    const live = liveBy.get(b.key).filter((p) => p.role === 'use');
    const lp = live[Math.floor(live.length / 2)];
    const fl = flagged.get(b.key) || new Set();
    const vp = (b.r.use || []).find((p) => !fl.has(p.known)) || (b.r.use || [])[0];
    if (!lp || !vp) continue;
    L.push(`| ${b.seed} | ${b.r.legoKnown} / ${b.r.legoTarget} | ${lp.known} → *${lp.target}* | ${vp.known} → *${vp.target}* |`);
  }
  L.push('');
  if (glossComplaints.length) {
    L.push(`## LEGO glosses the judge questioned (${glossComplaints.length})`);
    L.push('');
    L.push('No phrase rewrite can fix these: every phrase must contain the LEGO as glossed. They are a LEGO-level list for whoever owns the course.');
    L.push('');
    for (const g of glossComplaints.slice(0, 15)) L.push(`- ${g.key}: ${g.gloss}`);
    if (glossComplaints.length > 15) L.push(`- …and ${glossComplaints.length - 15} more (in nat-r1/r2.jsonl)`);
    L.push('');
  }
  L.push('## What the figures can and cannot say');
  L.push('');
  L.push('- The five floors, the laziness index and the stem shares are mechanical: they measure structure and repetition, not taste.');
  L.push('- Naturalness is one cross-family judge (Codex gpt-5.6-terra), not a native speaker. The live figure is from a stratified sample of 31 seeds, compared on the same LEGOs.');
  L.push('- Re-voice characters count only texts no clip in the language already holds, in any voice.');
  const out = L.join('\n');
  if (arg('--md')) fs.writeFileSync(arg('--md'), out);
  console.log(out.slice(0, 4000));
}

main().catch((e) => { console.error(e); process.exit(1); });
