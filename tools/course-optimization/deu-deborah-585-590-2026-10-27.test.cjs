'use strict';
// Job #499, 2026-10-27: Deborah's notes on deu_for_eng seeds 585/587/589. The fixture is the live rows as they stood
// before the fix (read from the sanctioned dump), plus one stand-in LEGO for everything taught before seed 585.
// The invariants FAIL on that pre-state and PASS on the plan's post-state. Run: node --test <this file>
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('./deu-deborah-585-590-2026-10-27.cjs');

const C = 'deu_for_eng';
const PRE_LEGOS = [["S0585L01","M","out of my bedroom window","aus meinem Schlafzimmerfenster",[{"known":"out of my bedroom window","target":"aus meinem Schlafzimmerfenster"}]],["S0585L02","A","bedroom window","Schlafzimmerfenster",[]],["S0587L01","A","on it","darauf",[]],["S0587L02","A","insisted on","bestanden",[]],["S0587L04","M","that we had eggs for supper","dass wir Eier zum Abendessen hatten",[{"known":"that we had eggs for supper","target":"dass wir Eier zum Abendessen hatten"}]],["S0589L04","M","the last bus","den letzten Bus",[{"known":"the last bus","target":"den letzten Bus"}]]];
const PRE_ROWS = [
  ["S0585L01B01","build","my","meinem"],
  ["S0585L01B02","build","out of my house","aus meinem Haus"],
  ["S0585L01B03","build","he wants out of my house","er will aus meinem Haus"],
  ["S0585L01U01","use","she wants out of my house","sie will aus meinem Haus"],
  ["S0585L01U02","use","she was out of my house","sie war aus meinem Haus"],
  ["S0585L01U03","use","she wants to go out of my house","sie will aus meinem Haus gehen"],
  ["S0585L01U04","use","she went out of my house","sie ist aus meinem Haus gegangen"],
  ["S0585L01U05","use","she said it was out of my house","sie hat gesagt, es war aus meinem Haus"],
  ["S0585L01U06","use","she wants to be out of my house","sie will aus meinem Haus sein"],
  ["S0585L01U07","use","she tried to go out of my house","sie hat versucht, aus meinem Haus zu gehen"],
  ["S0585L02B01","build","bedroom window","Schlafzimmerfenster"],
  ["S0585L02B02","build","my bedroom window","meinem Schlafzimmerfenster"],
  ["S0585L02B03","build","he can see it from the bedroom window","er kann es aus dem Schlafzimmerfenster sehen"],
  ["S0585L02U01","use","I can see the mountains out of my bedroom window","ich kann die Berge aus meinem Schlafzimmerfenster sehen"],
  ["S0585L02U02","use","she can see it from the bedroom window","sie kann es aus dem Schlafzimmerfenster sehen"],
  ["S0585L02U03","use","she saw it from the bedroom window","sie hat es aus dem Schlafzimmerfenster gesehen"],
  ["S0585L02U04","use","the bedroom window is lovely","das Schlafzimmerfenster ist schön"],
  ["S0585L02U05","use","she wants to see the mountains from the bedroom window","sie will die Berge aus dem Schlafzimmerfenster sehen"],
  ["S0585L02U06","use","she was at the bedroom window","sie war an dem Schlafzimmerfenster"],
  ["S0585L02U07","use","she can see the mountains from the bedroom window","sie kann die Berge aus dem Schlafzimmerfenster sehen"],
  ["S0587L01B01","build","on it","darauf"],
  ["S0587L01B02","build","we waited for it","wir haben darauf gewartet"],
  ["S0587L01B03","build","I waited for it","ich habe darauf gewartet"],
  ["S0587L01U01","use","she waited for it","sie hat darauf gewartet"],
  ["S0587L01U02","use","she had waited a long time for it","sie hat lange darauf gewartet"],
  ["S0587L01U03","use","she waited earlier for it","sie hat früher darauf gewartet"],
  ["S0587L01U04","use","she said she waited for it","sie hat gesagt, sie hat darauf gewartet"],
  ["S0587L01U05","use","she would like to wait for it","sie möchte darauf warten"],
  ["S0587L01U06","use","she has always waited for it","sie hat immer darauf gewartet"],
  ["S0587L01U07","use","she tried waiting for it","sie hat versucht, darauf zu warten"],
  ["S0587L02B01","build","insisted","bestanden"],
  ["S0587L02B02","build","I have insisted on it","ich habe darauf bestanden"],
  ["S0587L02B03","build","we have insisted on it","wir haben darauf bestanden"],
  ["S0587L02U01","use","she has insisted","sie hat bestanden"],
  ["S0587L02U02","use","she has insisted on it","sie hat darauf bestanden"],
  ["S0587L02U03","use","she has often insisted on it","sie hat oft darauf bestanden"],
  ["S0587L02U04","use","she has always insisted","sie hat immer bestanden"],
  ["S0587L02U05","use","she said she insisted on it","sie hat gesagt, sie hat darauf bestanden"],
  ["S0587L02U06","use","she had insisted on it before","sie hat früher darauf bestanden"],
  ["S0587L02U07","use","she has insisted that we do it","sie hat bestanden, dass wir das machen"],
  ["S0587L04U04","use","she insisted that we had it","sie hat bestanden, dass wir das hatten"],
  ["S0589L04B01","build","last","letzten"],
  ["S0589L04B02","build","she did it last time","sie hat es letztes Mal gemacht"],
  ["S0589L04B03","build","he was there last time","er war letztes Mal dort"],
  ["S0589L04U01","use","the last time","das letzte Mal"],
  ["S0589L04U02","use","she was there last time","sie war letztes Mal dort"],
  ["S0589L04U03","use","she wants to try it last time","sie will es letztes Mal versuchen"],
  ["S0589L04U04","use","she was here last time","sie war letztes Mal hier"],
  ["S0589L04U05","use","she said it was the last time","sie hat gesagt, es war das letzte Mal"],
  ["S0589L04U06","use","she will try it last time","sie wird es letztes Mal versuchen"],
  ["S0589L04U07","use","she wants to be there last time","sie will letztes Mal dort sein"],
  ["S0589L04U08","use","she told me she'd just seen the last bus","Sie hat mir gesagt, sie hätte gerade den letzten Bus gesehen"],
];

// Words the course teaches before seed 585 (measured on the dump: aus, meinem, letzten, Bus, darauf, früher, gerade
// is S0589L03 itself, ...). Schlafzimmerfenster and bestanden are deliberately absent: seeds 585/587 teach them.
const EARLIER = 'ich du er sie es wir haben habe hat hast kann kannst können will möchte ist war sind die der das den dem ' +
  'aus meinem Haus gehen gegangen sein gesagt versucht zu Berge sehen gesehen schön an letztes letzte letzten Mal Bus ' +
  'gemacht dort hier mir hätte darauf gewartet warten lange früher immer oft dass das machen hatten Eier Abendessen zum gerade auf warum';

function pre() {
  const legos = [{ lego_id: 'S0001L01', seed_number: 1, lego_index: 1, known_text: 'x', target_text: EARLIER, is_new: true, type: 'A' },
    { lego_id: 'S0589L03', seed_number: 589, lego_index: 3, known_text: 'just now', target_text: 'gerade', is_new: true, type: 'A' },
    ...PRE_LEGOS.map(([id, type, k, t, components]) => ({ lego_id: id, seed_number: +id.slice(1, 5), lego_index: +id.slice(6, 8), type, known_text: k, target_text: t, components, is_new: true,
      known_audio_id: `${id}k`, target1_audio_id: `${id}t1`, target2_audio_id: `${id}t2`, presentation_audio_id: `${id}p` }))];
  const phrases = PRE_ROWS.map(([id, role, k, t]) => ({ id: `${C}:${id}`, seed_number: +id.slice(1, 5), lego_index: +id.slice(6, 8), phrase_role: role, known_text: k, target_text: t,
    known_audio_id: `${id}k`, target1_audio_id: `${id}t1`, target2_audio_id: `${id}t2` }));
  return { legos, phrases };
}

test('the course as Deborah read it fails; the plan passes', () => {
  const before = F.invariants(pre());
  assert.ok(before.some((p) => /S0585L01 "aus meinem Schlafzimmerfenster" already holds the later S0585L02/.test(p)), 'R1224 taught R1225 early');
  assert.ok(before.some((p) => /S0587L01B02 .* does not drill S0587L01 "on it/.test(p)), 'R1229 drills "for it"');
  assert.ok(before.some((p) => /S0587L02U01 bare "bestanden"/.test(p)), 'R1230 "sie hat bestanden" = she passed');
  assert.ok(before.some((p) => /S0589L04U06 "last time" in a future/.test(p)), 'R1238 "she will try it last time"');
  assert.ok(before.some((p) => /S0589L04B02 .* does not drill S0589L04/.test(p)), 'R1238 drills "last time", not "the last bus"');
  const { problems } = F.checkPlan(pre());
  assert.deepEqual(problems, []);
});

test('the rotation carries words, clips and intros together; moved rows keep their clips', () => {
  const ops = F.editOps(pre(), 585);
  const link = (k, s) => ops.find((o) => o.op === 'audio.link' && (o.lego_id === k || o.phrase_id === `${C}:${k}`) && o.slot === s)?.audio_id;
  assert.equal(link('S0585L01', 'presentation'), 'S0585L02p', '"bedroom window" intro now on L01');
  assert.equal(link('S0585L02', 'target1'), 'S0585L01t1');
  assert.equal(link('S0585L01U01', 'known'), 'S0585L02U02k');
  assert.equal(link('S0585L02B01', 'target2'), 'S0585L01t2', 'B01 says the LEGO, so it takes the LEGO clips');
  assert.ok(ops.some((o) => o.op === 'phrase.delete' && o.phrase_id === `${C}:S0585L01U07`));
  assert.ok(ops.some((o) => o.op === 'seed.update' && o.seed_number === 585 && o.set.approved_at === null), 'an edit unapproves the seed');
  assert.ok(ops.every((o) => !/S0587|S0589/.test(o.lego_id || o.phrase_id || '')), 'one seed per batch');
});

test('new words with no library clip are reported stale, not silenced', () => {
  const stale = F.staleClips(pre(), {});
  assert.ok(stale.some((s) => s.row === 'S0589L04U06' && s.slot === 'target1' && s.audio_id === 'S0589L04U06t1'));
  assert.ok(stale.some((s) => s.row === 'LEGO S0587L01' && s.slot === 'presentation'));
  assert.ok(!stale.some((s) => s.row === 'S0585L01U01'), 'moved rows are not stale');
});
