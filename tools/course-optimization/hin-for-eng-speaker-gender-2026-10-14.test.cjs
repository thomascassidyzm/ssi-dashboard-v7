'use strict';
// The speaker-gender reading of hin_for_eng: only words that agree with a first-person-singular SPEAKER move
// (Kai 2026-09-29: "a female form only where the word refers to the speaker"). Run: node <this file>
const test = require('node:test');
const assert = require('node:assert');
const T = require('./hin-for-eng-speaker-gender-2026-10-14.cjs');
const f = (t, en, frag = false) => T.femaleReading(t, en, { fragmentFallback: frag });

test('the speaker\'s own verb group takes the female form', () => {
  assert.strictEqual(f('मैं हिंदी बोलना चाहता हूँ।'), 'मैं हिंदी बोलना चाहती हूँ।');
  assert.strictEqual(f('मैं सीखने की कोशिश कर रहा हूँ।'), 'मैं सीखने की कोशिश कर रही हूँ।');
  assert.strictEqual(f('मैं कल आपसे कुछ पूछना चाहता था।'), 'मैं कल आपसे कुछ पूछना चाहती थी।');
  assert.strictEqual(f('मैं आसानी से याद नहीं कर पाऊँगा।'), 'मैं आसानी से याद नहीं कर पाऊँगी।');
  assert.strictEqual(f('मैं थका हुआ हूँ।'), 'मैं थकी हुई हूँ।');
  assert.strictEqual(f('मैं थका हुआ महसूस करना नहीं चाहता।'), 'मैं थकी हुई महसूस करना नहीं चाहती।');
  assert.strictEqual(f('मैं जाने वाला हूँ।'), 'मैं जाने वाली हूँ।');
  assert.strictEqual(f('मैं आज सुबह जितना चाहता था उससे पहले उठ गया।'), 'मैं आज सुबह जितना चाहती थी उससे पहले उठ गई।');
});

test('a stem before a light verb, and an infinitive, never move', () => {
  assert.strictEqual(f('मैं आपको बता रहा हूँ।'), 'मैं आपको बता रही हूँ।');
  assert.strictEqual(f('मैं जा नहीं सकता।'), 'मैं जा नहीं सकती।');
  assert.strictEqual(f('तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा।'), 'तो मैं फिर कभी किसी पर भरोसा नहीं करूँगी।');
  assert.strictEqual(f('लेकिन मैं गलतियाँ करने की चिंता नहीं करता।'), 'लेकिन मैं गलतियाँ करने की चिंता नहीं करती।');
  assert.strictEqual(f('मैं उसे थोड़ा और समय देना चाहता हूँ।'), 'मैं उसे थोड़ा और समय देना चाहती हूँ।');
});

test('nobody else changes: third person, आप, मुझे-frames, मैंने, the next clause', () => {
  for (const t of ['वो जा रहा है।', 'आप क्या ढूँढ रहे हैं?', 'मुझे लगता है।', 'मुझे पता था।', 'मैंने सोचा था।', 'नहीं मुझे यकीन है सब ठीक होगा।', 'मुझे पहले दिन ही परफेक्ट घर मिल गया।'])
    assert.strictEqual(f(t, 'I think'), t, t);
  assert.strictEqual(f('जब मैं जवाब नहीं दे पाया तो वो बहुत धैर्यवान नहीं था।'), 'जब मैं जवाब नहीं दे पाई तो वो बहुत धैर्यवान नहीं था।');
  assert.strictEqual(f('मैं किसी ऐसे से मिला जिसने कहा कि वो आपको कुछ बताना चाहता था।'), 'मैं किसी ऐसे से मिली जिसने कहा कि वो आपको कुछ बताना चाहता था।');
  assert.strictEqual(f('मैं समझ नहीं पाया आपने क्या कहा।'), 'मैं समझ नहीं पाई आपने क्या कहा।');
  assert.strictEqual(f('अगर मैं मदद माँगूँ तो क्या होगा?'), 'अगर मैं मदद माँगूँ तो क्या होगा?');
});

test('a subjectless fragment is first person only by its English, and never an impersonal frame', () => {
  assert.strictEqual(f('नहीं पाया', "I couldn't", true), 'नहीं पाई');
  assert.strictEqual(f('कहना नहीं आता।', "I don't know how to say", true), 'कहना नहीं आता।');
  assert.strictEqual(f('मेरा', 'i-gen-m', true), 'मेरा');
  assert.strictEqual(f('नहीं पाया', "he couldn't", true), 'नहीं पाया');
});

test('rows written in the female form get a male reading for Kunal instead', () => {
  assert.strictEqual(T.writtenFemale('मैं उससे पूछूँगी कि वो क्या चाहती है।'), true);
  assert.strictEqual(T.maleReading('मैं उससे पूछूँगी कि वो क्या चाहती है।'), 'मैं उससे पूछूँगा कि वो क्या चाहती है।');
  assert.strictEqual(T.maleReading('मैं आपकी मदद कर सकती हूँ मैडम।'), 'मैं आपकी मदद कर सकता हूँ मैडम।');
  assert.strictEqual(T.writtenFemale('मैं हिंदी बोलना चाहता हूँ।'), false);
});

test('rows job #349·Q owns are left alone', () => {
  assert.strictEqual(T.ownedBy349({ sn: 127, k: 'x', t: 'y' }), true);
  assert.strictEqual(T.ownedBy349({ sn: 3, k: 'I want to learn Hindi as often as possible', t: 'मैं जितना हो सके उतनी बार हिंदी सीखने की कोशिश कर रहा हूँ।' }), true);
  assert.strictEqual(T.ownedBy349({ sn: 1, k: 'I want to speak Hindi', t: 'मैं हिंदी बोलना चाहता हूँ।' }), false);
});

test('plan: one expansion per text, f for male-written, m for female-written, none for neutral text', () => {
  const p = T.plan([
    { kind: 'use', id: 'a', sn: 1, k: 'I want', t: 'मैं चाहता हूँ।' },
    { kind: 'build', id: 'b', sn: 1, k: 'I want', t: 'मैं चाहता हूँ।' },
    { kind: 'use', id: 'c', sn: 177, k: "I'll ask", t: 'मैं पूछूँगी' },
    { kind: 'use', id: 'd', sn: 5, k: 'he goes', t: 'वो जाता है।' },
    { kind: 'component', id: 'e', sn: 1, k: 'want', t: 'चाहता' },
  ]);
  assert.deepStrictEqual(p.expansions.map((e) => [e.original_text, e.expanded_f, e.expanded_m, e.rows.length]),
    [['मैं चाहता हूँ।', 'मैं चाहती हूँ।', null, 2], ['मैं पूछूँगी', null, 'मैं पूछूँगा', 1]]);
});
