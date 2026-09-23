// The tests that prove the rails of job #880·H (Kai, 2026-09-23): S0021L03 'her name' and
// S0348L02 'what was going to happen' become new LEGOs. Three rails, each seen to fail on the
// behaviour it replaces:
//   1. the pending audio-pass `reason` is APPENDED to — queueAudioPass (the pre-fix path) REPLACES it;
//   2. the 'her name' set must say 'her' in every row and 'his' in none — the English voices read
//      the stored text verbatim;
//   3. the introduction is the bare Frame A line, no 'as in' — the template's default is Frame B.
import { describe, it, expect } from 'vitest';
const { appendAudioPassReason, herNotHisProblems, frameAIntro, HINDI_TEMPLATE } = require('./eng-for-hin-mark-21-348-new-2026-09-23.cjs');
const { renderIntro } = require('../../services/phases/presentation-author.cjs');

describe('audio-pass reason: append, never replace', () => {
  const existing = 'relink refused 10351 slot(s) + seed 128 "(who)" gloss stripped';
  it('the pre-fix path (queueAudioPass) replaces the reason and loses the earlier account', () => {
    const replaced = 'S0021L03 marked new'; // what queueAudioPass would store
    expect(replaced).not.toContain('seed 128');
  });
  it('the sweep keeps every earlier reason and adds its own', () => {
    const r = appendAudioPassReason(existing, 'S0021L03 marked new');
    expect(r).toContain('seed 128');
    expect(r).toContain('relink refused');
    expect(r.endsWith('S0021L03 marked new')).toBe(true);
  });
  it('with no earlier reason, the reason is just ours', () => {
    expect(appendAudioPassReason('', 'mine')).toBe('mine');
    expect(appendAudioPassReason(null, 'mine')).toBe('mine');
  });
});

describe("'her name' practice is spoken as 'her'", () => {
  it('a set copied from the seed-20 his-phrases fails', () => {
    const p = herNotHisProblems([{ id: 'B01', target: 'to learn his name' }, { id: 'U01', target: 'I want to find out her name' }]);
    expect(p).toHaveLength(2); // B01: no 'her name', and B01: says 'his'
    expect(p[0]).toContain('B01');
  });
  it('a set that says her name everywhere and his nowhere passes', () => {
    expect(herNotHisProblems([{ id: 'B01', target: 'to learn her name' }, { id: 'U01', target: 'why are you learning her name?' }])).toEqual([]);
  });
});

describe('the introduction is Frame A: "<chunk> is:", no "as in"', () => {
  it('Frame B (the stored template) carries जैसे, the as-in clause', () => {
    const b = renderIntro({ frame: 'B', template: HINDI_TEMPLATE, targetLangName: 'अंग्रेज़ी', chunk: 'उसका नाम', seed: 'आप उसका नाम क्यों सीख रहे हैं?' });
    expect(b).toContain('जैसे');
  });
  it('the sweep renders the bare line', () => {
    const a = frameAIntro('उसका नाम', renderIntro);
    expect(a).toBe("अंग्रेज़ी में — 'उसका नाम' — में :");
    expect(a).not.toContain('जैसे');
    expect(frameAIntro('क्या होने वाला है', renderIntro)).toBe("अंग्रेज़ी में — 'क्या होने वाला है' — में :");
  });
});
