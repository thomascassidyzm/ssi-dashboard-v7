#!/usr/bin/env node
// ITEM 12 — seed sentence never said (canon P26; ita #635·I method). cs #717·AI, Kai approved 18 Nov.
// For every seed whose sentence is not a played row (build/use under an is_new LEGO), plan a USE row under
// the seed's own LAST new LEGO whose pair the sentence contains, carrying the seed's own three clips
// (audio.link ops: Popty refuses a clip that does not speak the row's words). 0 characters.
// Not planned, LISTED (taste-safe):
//   covered        — a played row already says it, differing only by a contraction (scan verdict NOT, eng_for_spa 127)
//   variant_zut    — a played row has the same known prompt over a different target: adding the seed would be one
//                    prompt, two answers (P16 ZUT) — listed, never added
//   variant_form   — a played row has the same target and a known within 2 characters (gender / subject-dropped form):
//                    the scan judged these NOT (eng_for_fra seed 10)
//   (same target, clearly different known wording: the seed's own prompt is never practised — PLANNED, as the scan's
//    REAL verdicts in ara_for_eng did; one answer under two prompts is fine, Kai 12 Nov)
//   lego_is_seed   — the seed IS a new LEGO; its debut plays it (scan: deu_at 275 "NOT A DEFECT")
//   sibling        — the seed row itself is in a running sibling job's family (items 3-9): its words may change
//   no_home        — no new LEGO of the seed is contained in the sentence (scan: "list for Kai")
//   clip           — a seed slot is empty or its clip does not speak the seed's words (not rendered here)
//   node plan12.cjs [course…]  → ops/paid-cleanup-717/item12/<course>/plan.json
'use strict';
const path = require('path');
const L = require('./lib.cjs');

const EN_CONTR = [[/\bcan't\b/g, 'can not'], [/\bwon't\b/g, 'will not'], [/n't\b/g, ' not'], [/'m\b/g, ' am'], [/'re\b/g, ' are'],
  [/'ll\b/g, ' will'], [/'ve\b/g, ' have'], [/'d\b/g, ' would'], [/'s\b/g, ' is'], [/\bcannot\b/g, 'can not']];
const decontract = (s) => EN_CONTR.reduce((t, [re, r]) => t.replace(re, r), String(s).toLowerCase().replace(/’/g, "'")).replace(/\s+/g, ' ').trim();

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) { const cur = [i]; for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[b.length];
}
function plan(course) {
  const C = L.load(course);
  const sib = L.siblingOwned(course);
  const out = { course, db: C.db, at: new Date().toISOString(), ops: [], rows: [], listed: {} };
  const list = (why, o) => (out.listed[why] ||= []).push(o);
  const playedRows = [];
  for (const l of C.legos) for (const p of l.rows) if (C.played(p, l)) playedRows.push(p);
  for (const p of playedRows) { p._k = C.zk(p.known_text); p._t = C.zt(p.target_text); }
  const byK = new Map(), byT = new Map();
  for (const p of playedRows) { if (!byK.has(p._k)) byK.set(p._k, p); (byT.get(p._t) || byT.set(p._t, []).get(p._t)).push(p); }
  const keys = new Set(playedRows.map((p) => p._k + ' | ' + p._t));
  const dkeys = new Set(playedRows.map((p) => decontract(p._k) + '|' + decontract(p._t)));
  const newLegoKeys = new Set(C.legos.filter((l) => l.is_new).map((l) => C.key(l.known_text, l.target_text)));
  const nextId = new Map(); // lego_id → {u, pos}
  for (const s of C.seeds.values()) {
    const n = s.seed_number, k = C.key(s.known_text, s.target_text);
    if (keys.has(k)) continue;
    const brief = { seed: n, known: s.known_text, target: s.target_text };
    if (dkeys.has(decontract(C.zk(s.known_text)) + '|' + decontract(C.zt(s.target_text)))) { list('covered', brief); continue; }
    if (newLegoKeys.has(k)) { list('lego_is_seed', brief); continue; }
    const sameK = byK.get(C.zk(s.known_text));
    if (sameK) { list('variant_zut', { ...brief, row: sameK.sid, row_known: sameK.known_text, row_target: sameK.target_text }); continue; }
    const sameT = byT.get(C.zt(s.target_text)) || [];
    const near = sameT.find((p) => lev(p._k, C.zk(s.known_text)) <= 2);
    if (near) { list('variant_form', { ...brief, row: near.sid, row_known: near.known_text, row_target: near.target_text }); continue; }
    const sid = `S${String(n).padStart(4, '0')}`;
    if (sib.has(`seed ${n}`) || sib.has(`seed:${n}`) || sib.has(sid) || sib.has(String(n))) { list('sibling', brief); continue; }
    const mine = C.legos.filter((l) => l.seed_number === n);
    if (!mine.length) { list('not_built', brief); continue; }   // seed has no LEGOs: outside the built course, not a P26 defect
    const sub = (lego, sent) => L.normalizeForContainment(sent).replace(/\s/g, '').includes(L.normalizeForContainment(lego).replace(/\s/g, ''));
    const kSpaceless = ['zho', 'jpn'].includes(course.split('_for_')[1]);
    const own = mine.filter((l) => l.is_new
      && (C.spaceless ? sub(l.target_text, s.target_text) : L.checkWordContainment(l.target_text, s.target_text))
      && (kSpaceless ? sub(l.known_text, s.known_text) : L.checkWordContainment(l.known_text, s.known_text)));
    const home = own.sort((a, b) => b.lego_index - a.lego_index)[0];
    if (!home) { list('no_home', { ...brief, legos: mine.map((l) => `${l.lego_id}${l.is_new ? '' : '(old)'} ${l.known_text} | ${l.target_text}`) }); continue; }
    const clipOk = (id, text) => id && C.clips[id] && C.zt(C.clips[id].text) === C.zt(text);
    const clipOkK = (id, text) => id && C.clips[id] && C.zk(C.clips[id].text) === C.zk(text);
    const bad = [!clipOkK(s.ka, s.known_text) && 'known', !clipOk(s.t1, s.target_text) && 'target1', !clipOk(s.t2, s.target_text) && 'target2'].filter(Boolean);
    if (bad.length) { list('clip', { ...brief, slots: bad, ids: { known: s.ka, target1: s.t1, target2: s.t2 } }); continue; }
    if (!nextId.has(home.lego_id)) {
      let u = 0; for (const r of home.rows) { const m = r.sid.match(/U(\d+)$/); if (m) u = Math.max(u, +m[1]); }
      nextId.set(home.lego_id, { u, pos: home.rows.reduce((m, r) => Math.max(m, r.position || 0), 0) });
    }
    const nx = nextId.get(home.lego_id); nx.u++; nx.pos++;
    const id = L.makePhraseId(course, home.seed_number, home.lego_index, 'use', nx.u);
    const row = { id, seed_number: home.seed_number, lego_index: home.lego_index, position: nx.pos, known_text: s.known_text, target_text: s.target_text,
      phrase_role: 'use', introduce: true, connected_lego_ids: [], status: 'draft',
      metadata: { format: 'build_use', pipeline: 'cs717-item12-seed-sentence', seed_sentence_of: n, canon: 'P26' },
      word_count: s.target_text.length, lego_count: (s.known_text.match(/\s+/g) || []).length + 1,
      lego_position: L.computeLegoPosition(s.target_text, home.target_text) };
    if (s.target_text_roman) row.target_text_roman = s.target_text_roman;
    const group = [{ op: 'phrase.insert', row },
      { op: 'audio.link', target: 'phrase', phrase_id: id, slot: 'known', audio_id: s.ka },
      { op: 'audio.link', target: 'phrase', phrase_id: id, slot: 'target1', audio_id: s.t1 },
      { op: 'audio.link', target: 'phrase', phrase_id: id, slot: 'target2', audio_id: s.t2 }];
    out.rows.push({ seed: n, id: L.short(id), lego: home.lego_id, known: s.known_text, target: s.target_text, ops: group });
  }
  out.counts = { planned: out.rows.length, ...Object.fromEntries(Object.entries(out.listed).map(([k, v]) => [k, v.length])) };
  L.wr(path.join(L.ITEM_DIR, 'item12', course, 'plan.json'), out);
  return out.counts;
}
const tot = {};
for (const c of process.argv.slice(2).length ? process.argv.slice(2) : L.COURSES) {
  const n = plan(c); for (const [k, v] of Object.entries(n)) tot[k] = (tot[k] || 0) + v;
  console.log(c.padEnd(16), JSON.stringify(n));
}
console.log('TOTAL', JSON.stringify(tot));
