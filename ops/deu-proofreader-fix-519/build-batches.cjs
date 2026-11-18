#!/usr/bin/env node
'use strict';
// cs #519·AI: out/audio.json (the render answers) → batch-<A..D>.ops.json. Every text op carries an "expect" on the row's
// current text, so drift since the read aborts the batch. Clips are linked in the SAME batch as the text they speak.
const fs = require('fs'); const path = require('path');
const A = JSON.parse(fs.readFileSync(path.join(__dirname, 'out/audio.json'), 'utf8'));
const clip = (role, text) => { const v = A[`new|${role}|${text}`]; if (!v || !v.ok || !v.audioId) throw new Error(`no clip ${role}|${text}`); return v.audioId; };
const C = 'deu_for_eng'; const P = (id) => `${C}:${id}`;
const link = (target, key, slot, audio_id, extra = {}) => ({ op: 'audio.link', target, ...(target === 'lego' ? { lego_id: key } : { phrase_id: P(key) }), slot, audio_id, ...extra });
// Items 1/3: the re-record carries a clip_spoken_text verdict (its spoken text is the IPA form of the SAME word), so the
// link's word check reads it as other words. It is the same word, said as the verb / as /æm/: linked with the override.
const IPA_SAME_WORD = { allow_text_mismatch: true };
const upd = (id, expect, known, target) => ({ op: 'phrase.update', phrase_id: P(id), expect, set: { known_text: known, target_text: target } });
const linkAll = (id, known, target) => [link('phrase', id, 'known', clip('known', known)), link('phrase', id, 'target1', clip('target1', target)), link('phrase', id, 'target2', clip('target2', target))];
const ins = (seed, idx, n, pos, known, target) => ({ op: 'phrase.insert', row: { id: P(`S0${seed}L0${idx}U${String(n).padStart(2, '0')}`), course_code: C, seed_number: seed, lego_index: idx, position: pos,
  known_text: known, target_text: target, phrase_role: 'use', status: 'draft', introduce: true, lego_position: 'middle',
  metadata: { format: 'build_use', authored: 'cs #519·AI, deu proofreader items passed by Kai 17 Nov 2026' }, connected_lego_ids: [], word_count: target.split(/\s+/).length, lego_count: 1 } });
const LEGO616 = { known: 'ece965a6-c57c-490c-8cad-f00a1d36d5f8', t1: 'a196d777-e3a5-488f-aff3-dbadd20ed7fd', t2: '6b9c43c1-7c8d-4325-b55a-9faa99e366e5' };
const LEGO630 = { known: 'dc4ffacb-a203-42ae-89d2-25da0b7e9a27', t1: 'd87c3551-58e6-4b22-aa03-36dc05f1dfb0', t2: 'bf9b70ca-25c4-47f8-8384-2e320b368608' };
const legoLinks = (id, L) => [link('phrase', id, 'known', L.known), link('phrase', id, 'target1', L.t1), link('phrase', id, 'target2', L.t2)];
const B = {};
// A · items 1 + 3: link the deu re-records (IPA spoken form) to the LEGO + B01 known slots
B.A = [
  link('lego', 'S0614L04', 'known', A['re2|lives'].audioId, IPA_SAME_WORD), link('phrase', 'S0614L04B01', 'known', A['re2|lives'].audioId, IPA_SAME_WORD),
  link('lego', 'S0626L02', 'known', A['re2|am'].audioId, IPA_SAME_WORD), link('phrase', 'S0626L02B01', 'known', A['re2|am'].audioId, IPA_SAME_WORD),
];
// B · item 2: S0616L02 "you thought that" = "du das gedacht hast" gets builds that contain it, + 2 uses
B.B = [
  upd('S0616L02B01', { known_text: 'thought', target_text: 'gedacht' }, 'you thought that', 'du das gedacht hast'), ...legoLinks('S0616L02B01', LEGO616),
  upd('S0616L02B02', { known_text: 'he has also thought about it', target_text: 'er hat auch darüber gedacht' }, 'that you thought that', 'dass du das gedacht hast'), ...linkAll('S0616L02B02', 'that you thought that', 'dass du das gedacht hast'),
  upd('S0616L02B03', { known_text: 'I have also thought about it', target_text: 'ich habe auch darüber gedacht' }, 'I know that you thought that', 'ich weiß, dass du das gedacht hast'), ...linkAll('S0616L02B03', 'I know that you thought that', 'ich weiß, dass du das gedacht hast'),
  ins(616, 2, 8, 11, 'she said that you thought that', 'sie hat gesagt, dass du das gedacht hast'), ...linkAll('S0616L02U08', 'she said that you thought that', 'sie hat gesagt, dass du das gedacht hast'),
  ins(616, 2, 9, 12, 'because you thought that', 'weil du das gedacht hast'), ...linkAll('S0616L02U09', 'because you thought that', 'weil du das gedacht hast'),
];
// C · item 4: S0630L01 "can I" = "kann ich" gets builds that contain it, + 2 uses
B.C = [
  upd('S0630L01B01', { known_text: 'I can', target_text: 'ich kann' }, 'can I', 'kann ich'), ...legoLinks('S0630L01B01', LEGO630),
  upd('S0630L01B02', { known_text: 'he also can do it', target_text: 'er kann das auch machen' }, 'can I stay?', 'kann ich bleiben?'), ...linkAll('S0630L01B02', 'can I stay?', 'kann ich bleiben?'),
  upd('S0630L01B03', { known_text: 'I can stay', target_text: 'ich kann bleiben' }, 'can I do it?', 'kann ich das machen?'), ...linkAll('S0630L01B03', 'can I do it?', 'kann ich das machen?'),
  ins(630, 1, 8, 11, 'can I also stay?', 'kann ich auch bleiben?'), ...linkAll('S0630L01U08', 'can I also stay?', 'kann ich auch bleiben?'),
  ins(630, 1, 9, 12, 'can I do it today?', 'kann ich das heute machen?'), ...linkAll('S0630L01U09', 'can I do it today?', 'kann ich das heute machen?'),
];
// D · item 8: S0642L01 gracious → dear (the word every build and the seed's own phrases use), known clip + intro
B.D = [
  { op: 'lego.update', lego_id: 'S0642L01', expect: { known_text: 'gracious', target_text: 'gnädige' }, set: { known_text: 'dear' } },
  link('lego', 'S0642L01', 'known', clip('known', 'dear')), link('lego', 'S0642L01', 'presentation', clip('presentation', `The German for: 'dear', is: <break time="300ms"/> <break time="10ms"/>`)),
  { op: 'phrase.update', phrase_id: P('S0642L01B01'), expect: { known_text: 'gracious', target_text: 'gnädige' }, set: { known_text: 'dear' } },
  link('phrase', 'S0642L01B01', 'known', clip('known', 'dear')),
];
for (const [k, ops] of Object.entries(B)) fs.writeFileSync(path.join(__dirname, `batch-${k}.ops.json`), JSON.stringify(ops, null, 1));
console.log(Object.entries(B).map(([k, o]) => `${k}:${o.length}`).join(' '));
