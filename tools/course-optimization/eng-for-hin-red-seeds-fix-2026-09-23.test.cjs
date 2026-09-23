// The one test that proves the change (job #943·H, 2026-09-23, spec d/92221f8f). Against the REAL vocabulary gate
// (checkVocabViolations) the pre-fix rows FAIL and the post-fix rows PASS, for the four shapes of fix this tool
// makes: a component added to an early M-LEGO ("should"), a word taught as a component of a new M-LEGO ("is"),
// a component re-cut so chunks stop overlapping ("look for"), and a LEGO re-cut with its lump split ("he's" + "hurt").
// Then the engine: components become rows the way /seed/complete writes them, build/use rows shift to make room,
// every bare-LEGO row this tool rewrites really was bare and is bare no longer, and every rewritten phrase contains
// its LEGO on both sides. Offline: no DB.
import { describe, it, expect } from 'vitest';
const T = require('./eng-for-hin-red-seeds-fix-2026-09-23.cjs');
const { checkVocabViolations } = require('../../services/course-builder/lib/validation.cjs');

const COURSE = 'eng_for_hin';
const chunks = (...xs) => new Set(xs);
const legoEdit = (id) => T.LEGOS.find(l => l.id === id);
const compTargets = (comps) => (comps || []).map(c => c.target);
const fails = (phrase, vocab) => checkVocabViolations([{ target: phrase }], vocab, COURSE, { seedNumber: 999 }).length > 0;

describe('the vocabulary gate: pre-fix fails, post-fix passes', () => {
  it('106: "you should feel happy at the moment" needs "should" as a component of S0098L02', () => {
    const before = chunks('you', 'feel happy', 'at the moment', 'I think that', ...compTargets(legoEdit('S0098L02').expect.components));
    const after = chunks('you', 'feel happy', 'at the moment', 'I think that', ...compTargets(legoEdit('S0098L02').set.components));
    expect(fails('you should feel happy at the moment', before)).toBe(true);
    expect(fails('you should feel happy at the moment', after)).toBe(false);
    expect(fails('I think that you should feel happy', after)).toBe(false);
  });
  it('637: "her bag is here" needs "is" — taught as a component of S0420L02 (an A-LEGO before)', () => {
    const e = legoEdit('S0420L02');
    expect(e.expect.type).toBe('A');
    expect(e.set.type).toBe('M');
    const before = chunks('her bag', 'here', 'where', 'ready', e.expect.target);
    const after = chunks('her bag', 'here', 'where', 'ready', e.expect.target, ...compTargets(e.set.components));
    for (const p of ['her bag is here', 'where is her bag', 'her bag is ready']) { expect(fails(p, before), p).toBe(true); expect(fails(p, after), p).toBe(false); }
  });
  it('610: "he needs to look for work" overlaps on "to" until the component is "look for"', () => {
    const e = legoEdit('S0610L01');
    const before = chunks('he', 'needs to', 'to', 'we need to', e.expect.target, ...compTargets(e.expect.components));
    const after = chunks('he', 'needs to', 'to', 'we need to', e.expect.target, ...compTargets(e.set.components));
    expect(fails('he needs to look for work', before)).toBe(true);
    expect(fails('he needs to look for work', after)).toBe(false);
    expect(fails('we need to look for work', after)).toBe(false);
  });
  it('339: "he\'s hurt me" needs "he\'s" and "hurt" as components of the re-cut LEGO', () => {
    const e = legoEdit('S0339L02');
    expect(e.expect.components).toEqual([]);
    const before = chunks('me', 'himself', 'quite badly', 'I think', e.expect.target);
    const after = chunks('me', 'himself', 'quite badly', 'I think', e.set.target, ...compTargets(e.set.components));
    expect(fails("he's hurt me", before)).toBe(true);
    expect(fails("he's hurt me", after)).toBe(false);
    expect(fails("he's hurt himself quite badly", after)).toBe(false);
  });
});

describe('the engine', () => {
  const fixture = () => ({
    seeds: [{ seed_number: 5, known_text: 'क', target_text: 'x y z' }],
    legos: [{ lego_id: 'S0345L04', seed_number: 345, lego_index: 4, type: 'M', is_new: true, known_text: 'वह तैयार नहीं है', target_text: "he's not ready", components: [{ known: 'वह', target: 'he' }, { known: 'तैयार नहीं है', target: 'not ready' }] }],
    phrases: [
      { id: 'eng_for_hin:S0345L04C01', seed_number: 345, lego_index: 4, position: 1, phrase_role: 'component', known_text: 'वह', target_text: 'he', introduce: true },
      { id: 'eng_for_hin:S0345L04C02', seed_number: 345, lego_index: 4, position: 2, phrase_role: 'component', known_text: 'तैयार नहीं है', target_text: 'not ready', introduce: true },
      { id: 'eng_for_hin:S0345L04B01', seed_number: 345, lego_index: 4, position: 3, phrase_role: 'build', known_text: 'वह तैयार नहीं है', target_text: "he's not ready", introduce: true },
      { id: 'eng_for_hin:S0345L04B02', seed_number: 345, lego_index: 4, position: 4, phrase_role: 'build', known_text: 'वह अभी तैयार नहीं है', target_text: "he's not ready now", introduce: true },
      { id: 'eng_for_hin:S0345L04B03', seed_number: 345, lego_index: 4, position: 5, phrase_role: 'build', known_text: 'वह पूरी तरह तैयार नहीं है', target_text: "he's not quite ready", introduce: true },
      { id: 'eng_for_hin:S0345L04U01', seed_number: 345, lego_index: 4, position: 6, phrase_role: 'use', known_text: 'क', target_text: "I think he's not ready", introduce: true },
    ],
  });
  it('re-cut components become C rows like /seed/complete writes them, and the basket shifts down to make room', () => {
    const only = { LEGOS: T.LEGOS.filter(l => l.id === 'S0345L04'), PHRASES: T.PHRASES.filter(p => p.id.includes('S0345L04')) };
    // run the engine with just this LEGO's edits by feeding a dump that contains only it
    const saveL = T.LEGOS.splice(0, T.LEGOS.length, ...only.LEGOS); const saveP = T.PHRASES.splice(0, T.PHRASES.length, ...only.PHRASES);
    try {
      const { dump, plan } = T.applyToDump(fixture());
      const rows = dump.phrases.filter(p => p.phrase_role === 'component').sort((a, b) => a.position - b.position);
      expect(rows.map(r => [r.id.split(':')[1], r.position, r.target_text, r.known_text, r.introduce])).toEqual([
        ['S0345L04C01', 1, 'he', 'वह', true], ['S0345L04C02', 2, 'not', 'नहीं', false], ['S0345L04C03', 3, 'ready', 'तैयार', true],
      ]);
      expect(plan.phraseInserts.map(i => i.id.split(':')[1])).toEqual(['S0345L04C03']);
      expect(plan.positionShifts.map(s => [s.id.split(':')[1], s.from, s.to])).toEqual([['S0345L04U01', 6, 7], ['S0345L04B03', 5, 6], ['S0345L04B02', 4, 5], ['S0345L04B01', 3, 4]]);
      expect(dump.phrases.find(p => p.id.endsWith('B01')).target_text).toBe("he's not ready this evening");
      expect(dump.phrases.find(p => p.id.endsWith('B03')).target_text).toBe("he's not ready yet");
    } finally { T.LEGOS.splice(0, T.LEGOS.length, ...saveL); T.PHRASES.splice(0, T.PHRASES.length, ...saveP); }
  });
  it('every bare row this tool rewrites was the LEGO itself, and is a real phrase afterwards', () => {
    const bare = T.PHRASES.filter(p => p.why.startsWith('bare'));
    expect(bare.length).toBeGreaterThanOrEqual(25);
    for (const p of bare) {
      const legoId = p.id.split(':')[1].slice(0, 8);
      const e = legoEdit(legoId);
      const legoTarget = e ? e.expect.target : p.expect.target; // a bare row's own text IS its LEGO's
      expect(T.isBare({ target: legoTarget }, { target: p.expect.target }), p.id).toBe(true);
      expect(T.isBare({ target: e && e.set.target ? e.set.target : legoTarget }, { target: p.set.target }), p.id).toBe(false);
    }
  });
  it('every rewritten phrase under a re-cut LEGO contains the new LEGO on both sides; 478 is a whole-seed LEGO', () => {
    for (const legoId of ['S0339L02', 'S0478L01', 'S0610L01']) {
      const e = legoEdit(legoId);
      const lego = { known: e.set.known || e.expect.known, target: e.set.target || e.expect.target };
      for (const p of T.PHRASES.filter(x => x.id.includes(legoId))) expect(T.phraseContainsLego(lego, { known: p.set.known ?? p.expect.known, target: p.set.target ?? p.expect.target }), p.id).toBe(true);
    }
    expect(legoEdit('S0478L01').set).toEqual({ known: 'उसका दिल बहुत दयालु है', target: 'she has such a kind heart' });
  });
  it('Hindi containment allows gaps and the named oblique; English is contiguous', () => {
    expect(T.containsInOrder('हमारे दोस्त छुट्टियों के दूसरे दिन आए', 'दूसरे दिन', true)).toBe(true);
    expect(T.phraseContainsLego({ known: 'दूसरा दिन', target: 'the second day' }, { known: 'हमारे दोस्त छुट्टियों के दूसरे दिन आए', target: 'our friends came round on the second day of the holidays' })).toBe(true);
    expect(T.containsInOrder("yes she's worried", "she's worried", false)).toBe(true);
    expect(T.containsInOrder("she's very worried", "she's worried", false)).toBe(false);
  });
  it('no seed is unapproved and the validator is untouched: the tool never names approved_at, and RED_SEEDS are the 32 of the spec', () => {
    const src = require('fs').readFileSync(__dirname + '/eng-for-hin-red-seeds-fix-2026-09-23.cjs', 'utf8');
    expect(src.includes('approved_at:')).toBe(false);
    expect(T.RED_SEEDS).toHaveLength(32);
  });
});
