'use strict';
// node --test tools/quality-census/checks.test.cjs
//
// Each check is pinned to a defect we KNOW existed (git history, Kai's rulings, or live in ita_for_eng on
// 2026-10-19) in its pre-fix shape → caught, and its post-fix shape → silent. The specimens are named in the tests.
const test = require('node:test');
const assert = require('node:assert');
const C = require('./checks.cjs');

let n = 0;
const lego = (seed, idx, known, target, is_new = true) => ({ lego_id: `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`, seed_number: seed, lego_index: idx, known_text: known, target_text: target, is_new });
const phrase = (l, role, known, target, extra = {}) => ({ id: `x:${l.lego_id}${role[0].toUpperCase()}${++n}`, seed_number: l.seed_number, lego_index: l.lego_index, lego_id: l.lego_id, lego_is_new: l.is_new !== false, phrase_role: role, known_text: known, target_text: target, ...extra });
const seed = (num, known, target) => ({ seed_id: `S${String(num).padStart(4, '0')}`, seed_number: num, known_text: known, target_text: target });

// A small clean Italian course every check must stay silent on.
function clean() {
  const l1 = lego(1, 1, 'I want', 'voglio'); const l2 = lego(1, 2, 'to speak', 'parlare'); const l3 = lego(2, 1, 'Italian', 'italiano');
  const legos = [l1, l2, l3];
  const phrases = [
    phrase(l2, 'build', 'I want to speak', 'voglio parlare'), phrase(l2, 'use', 'I want to speak now', 'voglio parlare adesso'), phrase(l2, 'use', 'I want to speak', 'voglio parlare'),
    phrase(l3, 'build', 'Italian', 'italiano'), phrase(l3, 'build', 'to speak Italian', 'parlare italiano'),
    phrase(l3, 'use', 'I want to speak Italian', 'voglio parlare italiano'), phrase(l3, 'use', 'I want to speak Italian now', 'voglio parlare italiano adesso'),
  ];
  return { course: 'ita_for_eng', known_lang: 'eng', target_lang: 'ita', seeds: [seed(1, 'I want to speak', 'voglio parlare'), seed(2, 'I want to speak Italian', 'voglio parlare italiano')], legos, phrases };
}
const withRow = (c, mut) => { const x = JSON.parse(JSON.stringify(c)); mut(x); return x; };
const refs = (hits) => hits.map((h) => h.ref);

test('clean course: every check is silent (the negative control)', () => {
  const c = clean();
  for (const ch of C.CHECKS) {
    if (ch.id === 'content-mismatch') continue; // needs a real corpus to learn a lexicon; covered by calibrate.cjs
    assert.deepStrictEqual(ch.run(c), [], ch.id);
  }
});

test('Check 1 parentheticals — cat_for_eng K42 specimen "is changing (continuous)" (job #881) caught; post-fix silent', () => {
  const c = withRow(clean(), (x) => x.legos.push(lego(3, 1, 'is changing (continuous)', 'sta cambiando')));
  assert.deepStrictEqual(refs(C.parentheticals(c)), ['S0003L01']);
  assert.deepStrictEqual(C.parentheticals(withRow(c, (x) => { x.legos[3].known_text = 'is changing'; })), []);
});

test('Check 2 slashes — "he/she" caught', () => {
  const c = withRow(clean(), (x) => x.legos.push(lego(3, 1, 'he/she wants', 'vuole')));
  assert.deepStrictEqual(refs(C.slashes(c)), ['S0003L01']);
});

test('Checks 3+4 wrong language — Italian on the known side and English on the target side caught; names are not', () => {
  const c = clean();
  const l = c.legos[2];
  // markers are learned from the course: give it enough rows that voglio/parlare and want/speak are markers
  for (let i = 0; i < 10; i++) c.phrases.push(phrase(l, 'use', `I want to speak Italian ${i}`, `voglio parlare italiano ${i}`));
  c.phrases.push(phrase(l, 'use', 'voglio parlare italiano', 'voglio parlare italiano adesso'));
  c.phrases.push(phrase(l, 'use', 'I want to speak Italian now', 'I want to speak'));
  c.phrases.push(phrase(l, 'use', 'I want to speak Italian with Marco', 'voglio parlare italiano con Marco'));
  const hits = C.wrongLanguage(c);
  assert.deepStrictEqual(hits.map((h) => h.sub), ['known', 'target']);
});

test('Check 5 multi-sentence — ita seed 82 shape "I want to. Why not?" caught; "Mr. Rossi" is one sentence', () => {
  assert.strictEqual(C.sentenceCount('I want to. Why not?'), 2);
  assert.strictEqual(C.sentenceCount('who was that? An old man'), 2);
  assert.strictEqual(C.sentenceCount('I saw Mr. Rossi today'), 1);
  assert.strictEqual(C.sentenceCount('why not?'), 1);
});

test('Checks 6/7/8/9 — unpronounceable, wrapping quotes, trailing full stop, lowercase i', () => {
  const l = clean().legos[2];
  const c = withRow(clean(), (x) => x.phrases.push(
    phrase(l, 'use', '...', 'italiano'), phrase(l, 'use', '"I want Italian"', 'voglio italiano'),
    phrase(l, 'use', 'I want Italian.', 'voglio italiano'), phrase(l, 'use', 'i want Italian', 'voglio italiano'), phrase(l, 'use', "i'm here", 'sono qui')));
  assert.strictEqual(C.unpronounceable(c).length, 1);
  assert.strictEqual(C.wrappingQuotes(c).length, 1);
  assert.strictEqual(C.trailingPeriod(c).length, 1);
  assert.strictEqual(C.lowercaseI(c).length, 2);
  // "i.e." and words containing i are not the pronoun; "I'm" is fine
  assert.strictEqual(C.lowercaseI(withRow(clean(), (x) => x.phrases.push(phrase(l, 'use', 'i.e. it is Italian', 'cioè'), phrase(l, 'use', "I'm in Italy", 'sono in Italia')))).length, 0);
});

test('Check 10 ZUT — live ita 72/655 "I think that you\'re speaking" (tu / no tu, canon K38) is a conflict; K23-explained "anywhere" is not', () => {
  const c = withRow(clean(), (x) => x.legos.push(
    lego(72, 2, "I think that you're speaking", 'penso che tu stia parlando'), lego(655, 1, "I think that you're speaking", 'penso che stia parlando'),
    lego(182, 2, 'anywhere', 'da qualche parte'), lego(376, 2, 'anywhere', 'da nessuna parte'),
    lego(5, 1, 'busy', 'occupato'), lego(6, 1, 'busy', 'occupata'),
    lego(7, 1, 'tired', 'stanco', false), lego(8, 1, 'tired', 'stanca', false)));
  x2: {
    c.presentations = { S0182L02: "The Italian for: 'anywhere', as in — 'did you see that anywhere?', is:", S0376L02: 'The Italian for "anywhere" in a negative phrase like \'I didn\'t go anywhere\', is:' };
  }
  const by = Object.fromEntries(C.zutLego(c).map((h) => [h.ref, h.sub]));
  assert.deepStrictEqual(by, { S0072L02: 'conflict', S0655L01: 'conflict', S0182L02: 'k23-explained', S0376L02: 'k23-explained', S0005L01: 'gender', S0006L01: 'gender' });
  // K3: two Englishes → one Italian is not a ZUT failure
  assert.deepStrictEqual(C.zutLego(withRow(clean(), (x) => x.legos.push(lego(9, 1, 'to talk', 'parlare')))), []);
});

test('Check 13 capitalisation — #883·I specimen "An interesting book" vs "an interesting book" caught; 13b outlier "Perché…" on a lowercase course', () => {
  const l = clean().legos[2];
  const c = withRow(clean(), (x) => { x.seeds.push(seed(164, 'An interesting book', 'un libro interessante')); x.phrases.push(phrase(l, 'build', 'an interesting book', 'un libro interessante')); });
  assert.deepStrictEqual(C.capitalisation(c).map((h) => h.sub), ['case-dup', 'case-dup']);
  const d = clean();
  for (let i = 0; i < 10; i++) d.phrases.push(phrase(l, 'use', `why ${i}`, `perché ${i}`));
  d.phrases.push(phrase(l, 'use', 'because it is Italian', 'Perché è italiano'));
  d.phrases.push(phrase(l, 'use', 'I want it', 'lo voglio')); // English "I" opening is required, never an outlier
  assert.deepStrictEqual(C.capitalisation(d).map((h) => [h.target, h.sub]), [['Perché è italiano', 'outlier']]);
});

test('Check 15 identical — "I want | I want" caught; cognates, "in | in" and proper nouns ("Africa", ita S0379L04C02) are not', () => {
  const l = clean().legos[2];
  const c = withRow(clean(), (x) => x.phrases.push(phrase(l, 'use', 'I want', 'I want'), phrase(l, 'component', 'in', 'in'), phrase(l, 'component', 'Africa', 'Africa'), phrase(l, 'use', 'pizza', 'pizza')));
  assert.deepStrictEqual(C.identical(c).map((h) => h.known), ['I want']);
});

test('Check 16 underpopulated — S0190L01 after #887·I (BUILD only) is no-use; an empty debut is empty; S0001L01 and not-new LEGOs exempt', () => {
  const c = withRow(clean(), (x) => {
    const a = lego(190, 1, 'do you mind if I ask you', 'ti dispiace se ti chiedo'); const b = lego(191, 1, 'never', 'mai'); const nn = lego(192, 1, 'Italian', 'italiano', false);
    x.legos.push(a, b, nn);
    x.phrases.push(phrase(a, 'build', 'do you mind if I ask you', 'ti dispiace se ti chiedo'), phrase(a, 'build', 'do you mind if I ask you now', 'ti dispiace se ti chiedo adesso'));
  });
  assert.deepStrictEqual(C.underpopulated(c).map((h) => [h.ref, h.sub]), [['S0190L01', 'no-use'], ['S0191L01', 'empty']]);
});

test('Check 17b Italian subjunctive — "penso che lui ha ragione" caught; relative clause, 1pl and subjunctive are not', () => {
  const l = clean().legos[2];
  const c = withRow(clean(), (x) => x.phrases.push(
    phrase(l, 'use', "I think he's right", 'penso che lui ha ragione'),
    phrase(l, 'use', 'I think that what you said is interesting', 'penso che quello che hai detto sia interessante'),
    phrase(l, 'use', "I think we're friends", 'penso che siamo amici'),
    phrase(l, 'use', "I think he's right", 'penso che abbia ragione')));
  assert.deepStrictEqual(C.italianSubjunctive(c).map((h) => h.target), ['penso che lui ha ragione']);
});

test('duplicate LEGO — both sides must match (Kai 2026-09-23): eng_for_hin S0240L02 shape (same English, other target) is NOT a duplicate', () => {
  const c = withRow(clean(), (x) => x.legos.push(
    lego(19, 2, 'to stop talking', 'बात करना बंद करना'), lego(240, 2, 'to stop talking', 'बोलना बंद करना'),   // not a dup: stays new
    lego(30, 1, 'but', 'लेकिन'), lego(41, 1, 'but', 'लेकिन'),                                               // repeat debut
    lego(50, 1, 'the sensible thing', 'la cosa sensata', false)));                                          // not-new, no twin
  assert.deepStrictEqual(C.duplicateLego(c).map((h) => [h.ref, h.sub]), [['S0041L01', 'repeat-debut'], ['S0050L01', 'orphan-not-new']]);
  // post-fix: the repeat marked not-new is silent (it has its earlier twin)
  const fixed = withRow(c, (x) => { x.legos.find((l) => l.lego_id === 'S0041L01').is_new = false; x.legos.pop(); });
  assert.deepStrictEqual(C.duplicateLego(fixed), []);
});

test('P26 seed placement — live ita specimens: 451 drifted (che cosa / quello che), 668 copy under a not-new LEGO, 272 early, missing, placed', () => {
  const c = clean();
  const a = lego(451, 1, 'they said', 'hanno detto'); const nn = lego(668, 2, 'you\'ll all be able to go', 'possiate andare tutti', false); const own = lego(668, 1, 'I hope', 'spero che');
  const e1 = lego(272, 1, 'that sounds like', 'sembra'); const e2 = lego(272, 2, 'a great idea', "un'ottima idea"); const m = lego(55, 1, 'I don\'t enjoy', 'non mi piace');
  c.legos.push(a, own, nn, e1, e2, m);
  c.seeds.push(seed(451, 'they said what they wanted to do', 'hanno detto che cosa volevano fare'),
    seed(668, "I hope you'll all be able to go", 'spero che possiate andare tutti'),
    seed(272, 'yes that sounds like a great idea', "sì, sembra un'ottima idea"),
    seed(55, "I don't enjoy waking up", 'non mi piace svegliarmi'));
  c.phrases.push(phrase(a, 'use', 'they said what they wanted to do', 'hanno detto quello che volevano fare'),
    phrase(nn, 'use', "I hope you'll all be able to go", 'spero che possiate andare tutti'),
    phrase(e1, 'use', 'yes that sounds like a great idea', "sì, sembra un'ottima idea"));
  const by = Object.fromEntries(C.seedPlacement(c).map((h) => [h.seed, h.sub]));
  assert.deepStrictEqual(by, { 451: 'drifted', 668: 'drifted', 272: 'early', 55: 'missing' });
  // post-fix: the exact sentence under the seed's last new LEGO → silent for 272
  c.phrases.push(phrase(e2, 'use', 'yes that sounds like a great idea', "sì, sembra un'ottima idea"));
  assert.ok(!C.seedPlacement(c).some((h) => h.seed === 272));
});

test('17a/c/d/e language patterns (uncalibrated: they fire only on their own language) — recipe specimens', () => {
  const mk = (course, known, target, rows) => { const l = lego(1, 1, 'x', 'y'); return { course, known_lang: known, target_lang: target, seeds: [], legos: [], phrases: rows.map((t) => phrase(l, 'use', 'x', t)) }; };
  // Deborah's spa_for_eng 2nd pass, 2026-04-30
  const spa = mk('spa_for_eng', 'eng', 'spa', ['llevo aprendiendo español una semana', 'llevo aprendiendo español', 'llevo una semana aprendiendo español', 'cuánto tiempo llevas hablando']);
  assert.deepStrictEqual(C.spanishLlevar(spa).map((h) => h.sub), ['wrong-order', 'no-time']);
  const deu = mk('deu_for_eng', 'eng', 'deu', ['ich weiß, dass er hat das Buch', 'ich weiß, dass er das Buch hat']);
  assert.deepStrictEqual(C.germanVerbFinal(deu).map((h) => h.target), ['ich weiß, dass er hat das Buch']);
  const jpn = mk('jpn_for_eng', 'eng', 'jpn', ['行きますか？', '食べますか？', '見ますか']);
  assert.deepStrictEqual(C.japaneseKa(jpn).map((h) => h.target), ['見ますか']);
  // eng_for_por review, 442 rows; vocês (plural) is standard pt-PT and never a hit
  const por = mk('por_for_eng', 'eng', 'por', ['você fala inglês?', 'vocês falam inglês?', 'fala inglês?']);
  assert.deepStrictEqual(C.europeanVoce(por).map((h) => h.target), ['você fala inglês?']);
  assert.deepStrictEqual(C.europeanVoce({ ...por, course: 'por_br_for_eng' }), []);
  // and every one of them is silent on Italian
  for (const f of [C.spanishLlevar, C.germanVerbFinal, C.japaneseKa, C.europeanVoce]) assert.deepStrictEqual(f(clean()), []);
});
