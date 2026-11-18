'use strict';
// node --test tools/course-optimization/welsh-question-marks.test.cjs
// Aran's ruling, 2026-10-21 (job #504): a row whose English is a question carries '?' on both
// sides; rows where the Welsh could go either way go to Aran, never to a guess.
const test = require('node:test');
const assert = require('node:assert');
const { classify, withQuestionMark } = require('./welsh-question-marks.cjs');

const cls = (k, t, o) => classify(k, t, o).cls;

test('Aran\'s specimen: a bare Welsh verb under a statement English is UNSURE', () => {
  assert.equal(cls('she will be able to throw some postcards', 'fedrith hi daflu ychydig o gardiau post'), 'UNSURE');
});

test('English questions with a Welsh question form are CERTAIN, with or without a "?"', () => {
  assert.equal(cls('did you throw a book', 'wnest ti daflu llyfr'), 'CERTAIN_Q');
  assert.equal(cls('why do you want to stop now?', 'pam ti isio stopio rŵan'), 'CERTAIN_Q');
  assert.equal(cls('have you heard', 'dach chi ’di clywed?'), 'CERTAIN_Q');
  assert.equal(cls('will you be ready on Wednesday?', 'fyddi di’n barod ddydd Mercher'), 'CERTAIN_Q');
  assert.equal(cls('do you have to get enough money?', 'oes rhaid i ti gael digon o bres'), 'CERTAIN_Q');
  assert.equal(cls('thank you, but why?', 'diolch yn fawr ond pam'), 'CERTAIN_Q');
  assert.equal(cls('could we have food please', 'gawn ni fwyd plîs'), 'CERTAIN_Q');
  assert.equal(cls('don’t you want more time', 'nag wyt ti’n moyn mwy o amser'), 'CERTAIN_Q');
});

test('statements stay statements', () => {
  assert.equal(cls('yes, we’ve got one boy', 'oes, mae gynnon ni un hogyn'), 'CERTAIN_S');
  assert.equal(cls('I wanted to go out', 'o’n i isio mynd allan'), 'CERTAIN_S');
  assert.equal(cls('when', 'pan'), 'CERTAIN_S');
  assert.equal(cls('who wants', 'sydd isio'), 'CERTAIN_S');
  assert.equal(cls('is that they’re not sick', 'ydy nad ydyn nhw ddim yn sâl'), 'CERTAIN_S');
  assert.equal(cls('we need to improve', 'ŷn ni angen gwella'), 'CERTAIN_S');
  assert.equal(cls('they could find out if they wanted', 'gallen nhw ffeindio mas ’sen nhw’n moyn'), 'CERTAIN_S');
  assert.equal(cls('I can’t remember', 'fedra i ddim cofio'), 'CERTAIN_S');
  assert.equal(cls('why it’s not working today', 'pam dyw e ddim yn gweithio heddiw'), 'CERTAIN_S');
});

test('disagreements and fragments go to Aran', () => {
  assert.equal(cls('I’m not sure why not', 'dw i ddim yn siŵr pam ddim?'), 'UNSURE');
  assert.equal(cls('you feel', 'sut wyt ti’n teimlo?'), 'UNSURE');
  assert.equal(cls('do you mind if', 'oes ots gen ti os'), 'UNSURE');
  assert.equal(cls('what', 'beth'), 'UNSURE');
  assert.equal(cls('what was going to happen', 'beth oedd yn mynd i ddigwydd', { seedKnown: 'I didn’t know what was going to happen' }), 'UNSURE');
  assert.equal(cls('what was going to happen', 'beth oedd yn mynd i ddigwydd', { seedKnown: 'what was going to happen to us' }), 'CERTAIN_Q');
});

test('the question mark: exactly one, at the end, no space before it', () => {
  assert.equal(withQuestionMark('pam ti isio stopio rŵan'), 'pam ti isio stopio rŵan?');
  assert.equal(withQuestionMark('pam ti isio stopio rŵan ?'), 'pam ti isio stopio rŵan?');
  assert.equal(withQuestionMark('do you need?'), 'do you need?');
  assert.equal(withQuestionMark('are you ready.'), 'are you ready?');
});

test('a question after a pan clause is not left a statement', () => {
  const { welshSignal } = require('./welsh-question-marks.cjs');
  assert.notStrictEqual(welshSignal('pan wyt ti yma, ydy hi yma?').form, 'relative');
});
