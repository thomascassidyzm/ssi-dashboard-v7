#!/usr/bin/env node
'use strict';
// cs #440·AI: plan.cjs → edit-batch text ops per block, + the list of audio slots each block needs.
//   node build-ops.cjs <dump.json> <outdir>
// The dump is the read-only course dump (tools/course-optimization/course-dump-readonly-2026-10-14.cjs); every touched
// row carries an "expect" on its current text so live drift since the dump aborts the batch.
const fs = require('fs');
const path = require('path');
const { blocks } = require('./plan.cjs');
const [dumpFile, outDir] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(dumpFile, 'utf8'));
const C = d.course;
const pid = (s) => (s.includes(':') ? s : `${C}:${s}`);
const phrases = new Map(d.phrases.map((p) => [p.id, p]));
const legos = new Map(d.legos.map((l) => [l.lego_id, l]));
const seeds = new Map(d.seeds.map((s) => [s.seed_number, s]));
const pad = (n, w) => String(n).padStart(w, '0');
const legoId = (s, i) => `S${pad(s, 4)}L${pad(i, 2)}`;
const used = new Set(d.phrases.map((p) => p.id));
const nextId = (seed, idx, kind) => { for (let n = 1; n < 100; n++) { const id = `${C}:${legoId(seed, idx)}${kind}${pad(n, 2)}`; if (!used.has(id)) { used.add(id); return id; } } throw new Error('no id'); };
const maxPos = (seed, idx) => Math.max(0, ...d.phrases.filter((p) => p.seed_number === seed && p.lego_index === idx).map((p) => p.position || 0));
const posNext = new Map();
const nextPos = (seed, idx) => { const k = `${seed}:${idx}`; const v = (posNext.get(k) ?? Math.max(100, maxPos(seed, idx))) + 1; posNext.set(k, v); return v; };
// positions are unique per (seed, lego_index): a wanted early position is taken only if free (or freed earlier in this
// batch by a delete), else the nearest free slot below it, else the tail.
const occupied = new Map(); // `${seed}:${idx}` -> Set(position)
const occ = (seed, idx) => { const k = `${seed}:${idx}`; if (!occupied.has(k)) occupied.set(k, new Set(d.phrases.filter((p) => p.seed_number === seed && p.lego_index === idx).map((p) => p.position))); return occupied.get(k); };
const placeAt = (seed, idx, want) => { const o = occ(seed, idx); for (let p = want; p >= 0; p--) if (!o.has(p)) { o.add(p); return p; } const v = nextPos(seed, idx); o.add(v); return v; };
const words = (s) => String(s || '').split(/\s+/).filter(Boolean).length;
const AGENT = 'Kai (rulings 17 Nov 2026), applied by cs #440·AI';

const out = {}; const audio = {};
for (const [b, items] of Object.entries(blocks)) {
  const ops = []; const need = [];
  for (const it of items) {
    if (it.t === 'U') {
      const id = pid(it.id); const p = phrases.get(id); if (!p) throw new Error(`no phrase ${id}`);
      const set = {}; if (it.known != null && it.known !== p.known_text) set.known_text = it.known;
      if (it.target != null && it.target !== p.target_text) set.target_text = it.target;
      if (!Object.keys(set).length) { need.push({ kind: 'phrase', id, slots: [], note: 'no text change' }); continue; }
      ops.push({ op: 'phrase.update', phrase_id: id, expect: { known_text: p.known_text, target_text: p.target_text }, set });
      need.push({ kind: 'phrase', id, seed: p.seed_number, known: it.known ?? p.known_text, target: it.target ?? p.target_text,
        slots: [...(set.known_text ? ['known'] : []), ...(set.target_text ? ['target1', 'target2'] : [])],
        keep: { ...(set.known_text ? {} : { known: p.known_audio_id }), ...(set.target_text ? {} : { target1: p.target1_audio_id, target2: p.target2_audio_id }) } });
    } else if (it.t === 'N') {
      const id = nextId(it.seed, it.idx, it.kind);
      const role = it.kind === 'B' ? 'build' : it.kind === 'C' ? 'component' : 'use';
      const row = { id, course_code: C, seed_number: it.seed, lego_index: it.idx, position: it.position != null ? placeAt(it.seed, it.idx, it.position) : (() => { const v = nextPos(it.seed, it.idx); occ(it.seed, it.idx).add(v); return v; })(),
        known_text: it.known, target_text: it.target, phrase_role: role, status: 'draft', introduce: true,
        metadata: { format: 'build_use', authored: 'cs #440·AI, deu held items, Kai rulings 17 Nov 2026' + (it.seedClips ? ' (seed row, P26)' : '') },
        connected_lego_ids: [], word_count: words(it.target), lego_count: 1 };
      ops.push({ op: 'phrase.insert', row });
      need.push({ kind: 'phrase', id, seed: it.seed, known: it.known, target: it.target, slots: ['known', 'target1', 'target2'], seedClips: !!it.seedClips });
    } else if (it.t === 'D') {
      const id = pid(it.id); const p = phrases.get(id); if (!p) throw new Error(`no phrase ${id}`);
      ops.push({ op: 'phrase.delete', phrase_id: id, expect: { known_text: p.known_text, target_text: p.target_text } });
      occ(p.seed_number, p.lego_index).delete(p.position);
    } else if (it.t === 'L') {
      const l = legos.get(it.lego); if (!l) throw new Error(`no lego ${it.lego}`);
      const set = {}; for (const [k, v] of Object.entries(it.set)) if (JSON.stringify(v) !== JSON.stringify(l[k])) set[k] = v;
      ops.push({ op: 'lego.update', lego_id: it.lego, expect: { known_text: l.known_text, target_text: l.target_text }, set });
      const kc = set.known_text != null, tc = set.target_text != null;
      const isNew = set.is_new ?? l.is_new;
      need.push({ kind: 'lego', id: it.lego, seed: l.seed_number, known: set.known_text ?? l.known_text, target: set.target_text ?? l.target_text,
        slots: [...(kc ? ['known'] : []), ...(tc ? ['target1', 'target2'] : []), ...((kc || set.is_new === true) && isNew ? ['presentation'] : [])],
        keep: { ...(kc ? {} : { known: l.known_audio_id }), ...(tc ? {} : { target1: l.target1_audio_id, target2: l.target2_audio_id }) } });
    } else if (it.t === 'LI') {
      const lid = legoId(it.row.seed_number, it.row.lego_index);
      ops.push({ op: 'lego.insert', row: it.row });
      need.push({ kind: 'lego', id: lid, seed: it.row.seed_number, known: it.row.known_text, target: it.row.target_text, slots: ['known', 'target1', 'target2', 'presentation'], inserted: true });
    } else if (it.t === 'LD') {
      const l = legos.get(it.lego);
      ops.push({ op: 'lego.delete', lego_id: it.lego, cascade_phrases: true, expect: { known_text: l.known_text, target_text: l.target_text } });
      occupied.set(`${l.seed_number}:${l.lego_index}`, new Set());
    } else if (it.t === 'S') {
      const s = seeds.get(it.seed);
      ops.push({ op: 'seed.update', seed_number: it.seed, expect: { known_text: s.known_text, target_text: s.target_text }, set: it.set });
      need.push({ kind: 'seed', id: it.seed, seed: it.seed, known: it.set.known_text ?? s.known_text, target: it.set.target_text ?? s.target_text,
        slots: [...(it.set.known_text && it.set.known_text.toLowerCase() !== s.known_text.toLowerCase() ? ['known'] : []), ...(it.set.target_text ? ['target1', 'target2'] : [])],
        keep: { ...(it.set.target_text ? {} : { target1: s.target1_audio_id, target2: s.target2_audio_id }), ...(it.set.known_text && it.set.known_text.toLowerCase() !== s.known_text.toLowerCase() ? {} : { known: s.known_audio_id }) } });
    }
  }
  out[b] = ops; audio[b] = need;
}
fs.mkdirSync(outDir, { recursive: true });
for (const b of Object.keys(out)) fs.writeFileSync(path.join(outDir, `text-${b}.ops.json`), JSON.stringify({ ops: out[b] }, null, 1));
fs.writeFileSync(path.join(outDir, 'audio-need.json'), JSON.stringify(audio, null, 1));
console.log(Object.entries(out).map(([b, o]) => `${b}: ${o.length} ops, ${audio[b].reduce((n, x) => n + x.slots.length, 0)} slots`).join('\n'));
module.exports.AGENT = AGENT;
