#!/usr/bin/env node
'use strict';
// Aran 2026-10-23 (job #916):
//  (A) 'rhan gyntaf y X' / 'rhan gyntaf yr X' -> 'rhan gynta’r X' (the article contracts after the vowel).
//  (B) a standalone 'rhan gyntaf' (no genitive after it) takes the article: 'gwylio rhan gyntaf' -> 'gwylio’r rhan gyntaf',
//      bare 'rhan gyntaf' -> 'y rhan gyntaf' (phrase S0295L02B06, LEGOs nv2 S0277L03 + sv2 S1494L03).
// LEGOs keep their natural standalone form, so segments carry the surface form tagged with the LEGO id
// (the #890 precedent: 'rhan gynta’' + 'r sioe').
// Reads both v2 courses IN FULL through Popty (/seeds?status=all); every row containing 'rhan gynt' must be
// decided below (CHANGE or STAY) or the run aborts. One edit-batch per course; every op carries `expect`
// on the old values. Dry run unless --apply. Popty only.
const fs = require('fs');
const path = require('path');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-916';
const apply = process.argv.includes('--apply');
const out = path.dirname(__filename);
const A = '’';

const STAY = {
  cym_nv2_for_eng: {
    'phrase:S0277L03B02': "already 'gwylio’r rhan gyntaf' (retile only)",
    'phrase:S0281L05B03': "'a chau’r rhan gyntaf' — article already in", 'phrase:S0281L05B04': 'same', 'phrase:S0281L05B05': 'same',
    'seed:1494': "done by #890 ('rhan gynta’r sioe')",
    'phrase:S1494L04B03': 'done by #890', 'phrase:S1494L04U02': 'done by #890', 'phrase:S1494L04U04': 'done by #890', 'phrase:S1494L04U06': 'done by #890',
    'lego:S1494L03': "done by #878 ('ar ôl y rhan gynta’')",
    ...Object.fromEntries(['B01', 'B02', 'B03', 'B04', 'U01', 'U02', 'U03', 'U04', 'U05', 'U06', 'U07']
      .map((x) => [`phrase:S1494L03${x}`, "'ar ôl y rhan gynta’' — done by #878"])),
  },
  cym_sv2_for_eng: {
    'phrase:S1494L03B01': "'rhan gyntaf ei llyfr hi' — possessive, no article", 'phrase:S1494L03B03': 'same',
    'phrase:S1494L03U01': 'same', 'phrase:S1494L03U02': 'same', 'phrase:S1494L03U05': 'same', 'phrase:S1494L03U06': 'same',
  },
};
// nv2 S0277L03 phrases where ' y'/'’r' already precedes the LEGO: retile so the LEGO segment is 'y rhan gyntaf'.
const RETILE = { cym_nv2_for_eng: ['S0277L03B01', 'S0277L03B03', 'S0277L03B04', 'S0277L03B06', 'S0277L03B02', 'S0278L02B01'] };
const BARE_LEGO = { cym_nv2_for_eng: 'S0277L03', cym_sv2_for_eng: 'S1494L03' };

const RXA = /rhan gyntaf (y|yr) /g; // (A)
const fixA = (t) => t.replace(RXA, `rhan gynta${A}r `);
const has = (t) => /rhan gynt/i.test(t || '');
const join = (dec) => dec.map((s) => s.target).join('');

// (A) on a decomposition: segment ending 'gyntaf' followed by a segment starting ' y'/' yr'.
function decA(dec) {
  const d = dec.map((s) => ({ ...s }));
  for (let i = 0; i < d.length - 1; i++) {
    if (/gyntaf$/.test(d[i].target) && /^ yr?( |$)/.test(d[i + 1].target)) {
      d[i].target = d[i].target.replace(/gyntaf$/, `gynta${A}`);
      d[i + 1].target = d[i + 1].target.replace(/^ yr?/, 'r');
    }
  }
  return d;
}
// Merge an article segment (None ' y' / 'y' / '’r') into the following LEGO segment.
function decMerge(dec, legoId) {
  const d = [];
  for (let i = 0; i < dec.length; i++) {
    const s = dec[i], n = dec[i + 1];
    if (!s.legoId && /^ ?(y|’r)$/.test(s.target) && n && n.legoId === legoId) {
      d.push({ ...n, target: s.target + n.target }); i++;
    } else d.push({ ...s });
  }
  return d;
}

async function get(c) {
  let last;
  for (let i = 1; i <= 4; i++) {
    try {
      const r = await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': AGENT } });
      const j = await r.json();
      if (Array.isArray(j.seeds)) return j;
      last = `HTTP ${r.status} ${JSON.stringify(j).slice(0, 300)}`;
    } catch (e) { last = e.message; }
    console.error(`${c}: read ${i} failed: ${last}`);
    await new Promise((res) => setTimeout(res, 20000));
  }
  throw new Error(`${c}: full read failed 4 times: ${last}`);
}

(async () => {
  for (const c of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) {
    const data = await get(c);
    const ops = []; const changed = []; const unlisted = []; const seen = new Set();
    const stay = STAY[c] || {}; const retile = new Set(RETILE[c] || []); const bare = BARE_LEGO[c];
    const note = (kind, id, row, nt) => changed.push({ kind, id, old: row.target_text, new: nt,
      recorded: ['target1_audio_id', 'target2_audio_id', 'presentation_audio_id'].filter((k) => row[k]) });
    for (const s of data.seeds) {
      if (has(s.target_text)) {
        const k = `seed:${s.seed_number}`; seen.add(k);
        const nt = fixA(s.target_text);
        if (nt !== s.target_text) { ops.push({ op: 'seed.update', seed_number: s.seed_number, set: { target_text: nt }, expect: { target_text: s.target_text } }); note('seed', k, s, nt); }
        else if (!stay[k]) unlisted.push(k);
      }
      for (const l of s.legos) {
        const lk = `lego:${l.lego_id}`;
        if (l.lego_id === bare) {
          seen.add(lk);
          if (l.target_text !== 'rhan gyntaf') throw new Error(`${c} ${lk} is '${l.target_text}', expected 'rhan gyntaf'`);
          const set = { target_text: 'y rhan gyntaf' }; const expect = { target_text: l.target_text };
          if (l.components) { set.components = l.components.map((x) => (x.target === 'rhan gyntaf' ? { ...x, target: 'y rhan gyntaf' } : x)); expect.components = l.components; }
          ops.push({ op: 'lego.update', lego_id: l.lego_id, set, expect }); note('lego', lk, l, set.target_text);
        } else if (has(l.target_text) || (l.components || []).some((x) => has(x.target))) {
          seen.add(lk); if (!stay[lk]) unlisted.push(lk);
        }
        for (const p of l.basket_phrases || []) {
          if (!has(p.target_text)) continue;
          const pid = p.id.split(':')[1]; const pk = `phrase:${pid}`; seen.add(pk);
          let nt = fixA(p.target_text); let dec = decA(p.decomposition || []);
          // (B) standalone 'rhan gyntaf' after gwylio -> gwylio’r; bare phrase -> 'y rhan gyntaf'.
          if (/gwylio rhan gyntaf( os|$)/.test(nt)) {
            nt = nt.replace('gwylio rhan gyntaf', `gwylio${A}r rhan gyntaf`);
            dec = dec.map((x) => (x.legoId === bare && x.target === ' rhan gyntaf' ? { ...x, target: `${A}r rhan gyntaf` } : x));
          }
          if (nt === 'rhan gyntaf') { nt = 'y rhan gyntaf'; dec = [{ known: 'the', legoId: null, target: 'y', isGhost: false }, ...dec.map((x, i) => (i === 0 ? { ...x, target: ' ' + x.target } : x))]; }
          if (retile.has(pid)) dec = decMerge(dec, bare);
          const textChanged = nt !== p.target_text; const decChanged = JSON.stringify(dec) !== JSON.stringify(p.decomposition);
          if (!textChanged && !decChanged) { if (!stay[pk]) unlisted.push(pk); continue; }
          // A tiling that already differed from its text before this edit only by end punctuation stays that way.
          const np = (t) => t.replace(/[?.!]+$/, '');
          const wasOff = join(p.decomposition || []) !== p.target_text;
          if (join(dec) !== nt && !(wasOff && np(join(dec)) === np(nt))) throw new Error(`${c} ${pk}: tiling '${join(dec)}' != text '${nt}'`);
          ops.push({ op: 'phrase.update', phrase_id: p.id, set: { target_text: nt, decomposition: dec }, expect: { target_text: p.target_text, decomposition: p.decomposition } });
          if (textChanged) note('phrase', pk, p, nt); else changed.push({ kind: 'phrase-retile', id: pk, text: nt, dec: dec.map((x) => [x.legoId, x.target]) });
        }
      }
    }
    for (const k of Object.keys(stay)) if (!seen.has(k)) unlisted.push(`stay-list row not found: ${k}`);
    fs.writeFileSync(`${out}/${c}.ops.json`, JSON.stringify({ ops, changed, unlisted }, null, 1));
    console.log(c, 'seeds', data.seeds.length, 'ops', ops.length, 'unlisted', unlisted);
    if (unlisted.length) throw new Error(`${c}: undecided rows — add them to CHANGE logic or STAY`);
    const r = await (await fetch(`${BASE}/api/production/${c}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops, apply }) })).json();
    fs.writeFileSync(`${out}/${c}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(r, null, 1));
    console.log(JSON.stringify({ ok: r.ok, applied: r.applied, error: r.error, n: (r.results || []).length }));
  }
})().catch((e) => { console.error(e); process.exit(1); });
