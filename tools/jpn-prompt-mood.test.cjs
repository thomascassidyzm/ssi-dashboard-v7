/**
 * Calibrated on Deborah's own findings, 2026-09-08 (jpn_for_eng, rounds 2-13),
 * plus the false positives that made the first three drafts of this detector
 * useless. Each case below is a live row as it stood before the fix.
 */
import { describe, it, expect } from 'vitest'
import mood from './jpn-prompt-mood.cjs'
const { judgePhrase, componentVerbsNeverTaught, predicateIsAnswerable } = mood

describe('the English prompt must ask for exactly what the Japanese says', () => {
  it('catches "want to" that the Japanese does not carry — Deborah, S0003 R7/R8', () => {
    expect(judgePhrase({ known_text: 'I want to do a lot of Japanese', target_text: '日本語をたくさんやる' }))
      .toContain('want-in-english-only');
    expect(judgePhrase({ known_text: 'I want to do as much as possible', target_text: 'できるだけやる' }))
      .toContain('want-in-english-only');
  });

  it('catches the mirror: たい in the Japanese dropped from the prompt — Deborah, S0004 R11', () => {
    expect(judgePhrase({ known_text: 'say something in Japanese', target_text: '日本語で何か言ってみたい' }))
      .toContain('want-in-japanese-only');
  });

  it('catches the additive も with no "too" — Deborah, S0005 R13', () => {
    expect(judgePhrase({ known_text: 'I\'ll try speaking with other people', target_text: '他の人とも話してみる' }))
      .toContain('mo-without-too');
    expect(judgePhrase({ known_text: 'I want to do it with other people too', target_text: '他の人ともやる' }))
      .not.toContain('mo-without-too');
  });

  it('sees たい in the MIDDLE of a spaceless string, not just at the end', () => {
    // 聞きたいことがある ends on ある; a check that only read the tail called
    // this a defect, and it is not one.
    expect(judgePhrase({ known_text: 'there\'s something I want to ask', target_text: '聞きたいことがある' }))
      .toEqual([]);
  });

  it('does not read every も as "too"', () => {
    for (const [known, target] of [
      ['I intend to go home', '帰るつもり'],
      ['I don\'t know anything', '何も分からない'],
      ['she\'s done it many times', '何度もやったと言ってた'],
      ['very', 'とても'],
      ['did he say anything else?', '他にも何か言ってた？'],
      ['I didn\'t go anywhere last month', '先月はどこにも行かなかった'],
    ]) {
      expect(judgePhrase({ known_text: known, target_text: target })).not.toContain('mo-without-too');
    }
  });

  it('does not read "as soon as you want" as a desiderative', () => {
    expect(judgePhrase({ known_text: 'I can go as soon as you want', target_text: 'いつでも行ける' }))
      .toEqual([]);
  });
});

describe('a component verb is not a taught verb', () => {
  // 話す is a component of the M-LEGO 話したい at round 1 and is never a LEGO of
  // its own anywhere in jpn_for_eng — yet round 2's first BUILD asks for it.
  const legos = [
    { lego_id: 'S0001L01', target_text: '話したい', components: [{ known: 'speak', target: '話す' }, { known: 'want to speak', target: '話したい' }] },
    { lego_id: 'S0001L02', target_text: '日本語を', components: [] },
  ];

  it('lists a component verb the course never introduces on its own', () => {
    const never = componentVerbsNeverTaught(legos);
    expect(never.has('話す')).toBe(true);
  });

  it('flags a phrase whose whole predicate is that un-introduced verb', () => {
    const never = componentVerbsNeverTaught(legos);
    expect(predicateIsAnswerable('日本語を話す', never)).toBe('話す');
  });

  it('does not flag the phrase that uses the taught chunk itself', () => {
    const never = componentVerbsNeverTaught(legos);
    expect(predicateIsAnswerable('日本語を話したい', never)).toBe(null);
  });
});
