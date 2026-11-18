#!/usr/bin/env node
'use strict';
// cs #690·AI: plan.cjs + out/audio.json (the render answers) → batch-<A|C>.ops.json. Every text op carries an "expect" on
// the row's current text (read 18 Nov), so drift since the read aborts the batch. Clips are linked in the SAME batch as the
// text they speak. --text-only leaves out links to clips not yet rendered (for the pre-render dry run).
// Item 2 (S0657L02 intro) is a re-record in place of the deu-owned clip: no link moves, so it has no batch.
const fs = require('fs'); const path = require('path');
const { C, L654, P654, P660, INTRO_654 } = require('./plan.cjs');
const TEXT_ONLY = process.argv.includes('--text-only');
const A = TEXT_ONLY ? {} : JSON.parse(fs.readFileSync(path.join(__dirname, 'out/audio.json'), 'utf8'));
const clip = (role, text) => { const v = A[`new|${role}|${text}`]; if (!v || !v.ok || !v.audioId) throw new Error(`no clip ${role}|${text}`); return v.audioId; };
const P = (id) => `${C}:${id}`;
const link = (target, key, slot, audio_id) => ({ op: 'audio.link', target, ...(target === 'lego' ? { lego_id: key } : { phrase_id: P(key) }), slot, audio_id });
const linkAll = (target, key, known, t) => (TEXT_ONLY ? [] : [link(target, key, 'known', clip('known', known)), link(target, key, 'target1', clip('target1', t)), link(target, key, 'target2', clip('target2', t))]);
const upd = (id, expect, [known, target]) => ({ op: 'phrase.update', phrase_id: P(id), expect: { known_text: expect[0], target_text: expect[1] }, set: { known_text: known, target_text: target } });
const ins = (seed, idx, code, pos, [known, target]) => ({ op: 'phrase.insert', row: { id: P(`S0${seed}L0${idx}${code}`), course_code: C, seed_number: seed, lego_index: idx, position: pos,
  known_text: known, target_text: target, phrase_role: code.startsWith('B') ? 'build' : 'use', status: 'draft', introduce: true, lego_position: 'end',
  metadata: { format: 'build_use', authored: 'cs #690·AI, deu proofreader items passed by Kai 18 Nov 2026' }, connected_lego_ids: [], word_count: target.split(/\s+/).length, lego_count: 2 } });
// S0062L01 "I'm not sure if" = "ich bin mir nicht sicher, ob": its live clips (read 18 Nov), reused for S0654L02.
const L062 = { known: 'c4c663ea-a0a5-480b-8433-797f33e9e121', t1: '5df924e5-480b-4884-956b-14a46bce40ea', t2: '127734fb-2530-434e-aa23-e3156e2fa76f' };
const B = {};
// A · item 1: S0654 re-cut. L01 = the new LEGO, L02 = the taught "I'm not sure if"; L01's builds contain L01; 4 uses added.
B.A = [
  { op: 'lego.update', lego_id: 'S0654L01', expect: { known_text: "I'm not sure if I can help you, sir", target_text: 'Ich bin mir nicht sicher, ob ich Ihnen helfen kann, mein Herr' },
    set: { known_text: L654.known, target_text: L654.target, type: 'M',
      components: [{ known: 'I', target: 'ich' }, { known: 'you', target: 'Ihnen' }, { known: 'help', target: 'helfen' }, { known: 'can', target: 'kann' }, { known: 'sir', target: 'mein Herr' }] } },
  ...linkAll('lego', 'S0654L01', L654.known, L654.target),
  ...(TEXT_ONLY ? [] : [link('lego', 'S0654L01', 'presentation', clip('presentation', INTRO_654))]),
  { op: 'lego.update', lego_id: 'S0654L02', expect: { known_text: 'sure', target_text: 'sicher', is_new: false },
    set: { known_text: "I'm not sure if", target_text: 'ich bin mir nicht sicher, ob', type: 'M',
      components: [{ known: "I'm not sure,", target: 'ich bin mir nicht sicher,' }, { known: 'if', target: 'ob' }] } },
  link('lego', 'S0654L02', 'known', L062.known), link('lego', 'S0654L02', 'target1', L062.t1), link('lego', 'S0654L02', 'target2', L062.t2),
  upd('S0654L01B01', ['me', 'mir'], P654.B01), ...linkAll('phrase', 'S0654L01B01', ...P654.B01),
  upd('S0654L01B02', ['he also told me that', 'er hat mir auch das gesagt'], P654.B02), ...linkAll('phrase', 'S0654L01B02', ...P654.B02),
  upd('S0654L01B03', ['I also told myself that', 'ich habe mir auch das gesagt'], P654.B03), ...linkAll('phrase', 'S0654L01B03', ...P654.B03),
  ...['U01', 'U02', 'U03', 'U04'].flatMap((u, i) => [ins(654, 1, `U${String(9 + i).padStart(2, '0')}`, 12 + i, P654[u]), ...linkAll('phrase', `S0654L01U${String(9 + i).padStart(2, '0')}`, ...P654[u])]),
  // L02 is not new (never played, P25); its "sure" phrases no longer contain it (P17). Keep U01 (the seed sentence, which
  // does contain it); delete the other nine. Their clips are not touched; the undo puts the rows back.
  ...['B01', 'B02', 'B03', 'U02', 'U03', 'U04', 'U05', 'U06', 'U07'].map((x) => ({ op: 'phrase.delete', phrase_id: P(`S0654L02${x}`) })),
];
// C · item 3: S0660L01 "I can help you all" gets builds that contain the whole LEGO.
B.C = [
  upd('S0660L01B01', ['to help', 'helfen'], P660.B01), ...linkAll('phrase', 'S0660L01B01', ...P660.B01),
  upd('S0660L01B02', ['he also wants to help', 'er will auch helfen'], P660.B02), ...linkAll('phrase', 'S0660L01B02', ...P660.B02),
  upd('S0660L01B03', ['I also tried to help', 'ich habe auch versucht zu helfen'], P660.B03), ...linkAll('phrase', 'S0660L01B03', ...P660.B03),
];
for (const [k, ops] of Object.entries(B)) fs.writeFileSync(path.join(__dirname, `batch-${k}.ops.json`), JSON.stringify(ops, null, 1));
console.log(TEXT_ONLY ? 'TEXT-ONLY' : 'FULL', Object.entries(B).map(([k, o]) => `${k}:${o.length}`).join(' '));
