#!/usr/bin/env node
'use strict';
// node tools/course-optimization/deu-lego-quality-scan-2026-10-14.cjs <dump.json> <out.json>
// READ-ONLY, offline: reads a dump from course-dump-readonly-2026-10-14.cjs and flags LEGOs against Kai's standard (14 Oct, seed 534):
//  P1 bare function-word LEGO; P2 bigger LEGO taught before a piece it contains; P3 basket mostly not containing its LEGO;
//  P4 dangling/nonsense build phrase (known side ends on a function word, or sits under a bare function-word LEGO).
// Seed 534 is being re-cut (#499): reported under `excluded`, never counted.
const fs = require('fs');
const EXCLUDED = new Set([534]);
const K_FUNC = new Set('in at by to on for of the a an with from into onto about under over after before as'.split(' '));
const T_FUNC = new Set('der die das den dem des ein eine einen einem einer eines in an auf für von mit bei nach zu zum zur um aus und oder aber dass ob als wie am im vom beim ins ans aufs durch gegen ohne über unter vor bis seit zwischen so auch nur noch schon'.split(' '));
const norm = (s) => (s || '').toLowerCase().replace(/[.,!?;:"„“”'’]/g, ' ').replace(/\s+/g, ' ').trim();
const toks = (s) => norm(s).split(' ').filter(Boolean);
const hasSeq = (hay, needle) => { // word-bounded contiguous match
  if (!needle.length || needle.length > hay.length) return false;
  for (let i = 0; i + needle.length <= hay.length; i++) if (needle.every((w, j) => hay[i + j] === w)) return true;
  return false;
};
function scan(d) {
  const seeds = new Map(d.seeds.map((s) => [s.seed_number, s]));
  const by = new Map();
  for (const l of d.legos) { if (!by.has(l.seed_number)) by.set(l.seed_number, []); by.get(l.seed_number).push(l); }
  const phr = new Map();
  for (const p of d.phrases) { if (p.phrase_role === 'component') continue; const k = p.seed_number + ':' + p.lego_index; if (!phr.has(k)) phr.set(k, []); phr.get(k).push(p); }
  const out = { P1: [], P2: [], P3: [], P4: [], excluded: [] };
  for (const [sn, legos] of by) {
    legos.sort((a, b) => a.lego_index - b.lego_index);
    const push = (pat, row) => (EXCLUDED.has(sn) ? out.excluded : out[pat]).push({ pattern: pat, seed: sn, ...row });
    for (const l of legos) {
      const kt = toks(l.known_text), tt = toks(l.target_text);
      const id = l.lego_id;
      // P1: bare function word(s) alone, either side
      const kBare = kt.length >= 1 && kt.length <= 2 && kt.every((w) => K_FUNC.has(w));
      const tBare = tt.length >= 1 && tt.length <= 2 && tt.every((w) => T_FUNC.has(w));
      let bare = false;
      if (l.is_new && (kBare || tBare)) bare = true;
      // hard = preposition/article (Kai's named case); soft = conjunction/adverb/determiner (judgement: Welsh teaches some of these alone)
      const SOFT = new Set('and but or whether that than already yet like too how as since such so one until'.split(' '));
      const hard = bare && !kt.some((w) => SOFT.has(w)) && !tt.some((w) => ['und', 'aber', 'oder', 'dass', 'ob', 'als', 'wie', 'schon', 'noch', 'so', 'zu', 'eines', 'eine', 'ein', 'seit'].includes(w) && kt.length <= 2 && !K_FUNC.has('zzz'));
      if (bare) push('P1', { lego: id, known: l.known_text, target: l.target_text, type: l.type, isNew: l.is_new, kind: hard ? 'hard' : 'soft' });
      // P2: a later NEW lego B (shorter) lives inside this earlier lego A (new): A taught before its piece
      if (l.is_new && tt.length > 1) {
        for (const b of d.legos) {
          // later = later (seed, lego_index) anywhere in the course, not just inside this seed
          const later = b.seed_number > l.seed_number || (b.seed_number === l.seed_number && b.lego_index > l.lego_index);
          if (!later || !b.is_new) continue;
          const bt = toks(b.target_text), bk = toks(b.known_text);
          if (bt.length >= tt.length || !hasSeq(tt, bt) || !hasSeq(kt, bk)) continue;
          push('P2', { lego: id, known: l.known_text, target: l.target_text, laterLego: b.lego_id, laterKnown: b.known_text, laterTarget: b.target_text });
        }
      }
      // P3: basket drills its own LEGO? (all LEGO tokens present in phrase target; for 1-token LEGOs, prefix of 4 chars to allow inflection)
      if (l.is_new) {
        const ps = phr.get(sn + ':' + l.lego_index) || [];
        if (ps.length >= 6) {
          const has = (p) => { const pt = toks(p.target_text); return tt.every((w) => pt.some((x) => x === w || (w.length >= 5 && x.length >= 5 && x.slice(0, 4) === w.slice(0, 4)))); };
          const hit = ps.filter(has).length;
          if (hit / ps.length <= 0.2) push('P3', { lego: id, known: l.known_text, target: l.target_text, containing: hit, of: ps.length, sample: ps.filter((p) => !has(p)).slice(0, 3).map((p) => p.known_text + ' | ' + p.target_text) });
        }
      }
      // P4: every phrase under a hard bare-function LEGO is built around a piece with no meaning of its own; list them for eyeballing
      const ps4 = (phr.get(sn + ':' + l.lego_index) || []).filter((p) => p.phrase_role === 'build');
      if (bare && hard && ps4.length) push('P4', { lego: id, known: l.known_text, target: l.target_text, of: ps4.length, sample: ps4.slice(0, 6).map((p) => p.known_text + ' | ' + p.target_text) });
    }
  }
  return { out, seeds, by };
}
if (require.main === module) {
  const [inp, outp] = process.argv.slice(2);
  if (!inp || !outp) throw new Error('usage: <dump.json> <out.json>');
  const d = JSON.parse(fs.readFileSync(inp, 'utf8'));
  const { out } = scan(d);
  fs.writeFileSync(outp, JSON.stringify(out));
  for (const k of ['P1', 'P2', 'P3', 'P4']) console.log(k, out[k].length, 'seeds', new Set(out[k].map((r) => r.seed)).size);
  console.log('excluded (seed 534)', out.excluded.length);
}
module.exports = { scan, toks };
