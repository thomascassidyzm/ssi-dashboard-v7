// The one test that proves the fix (job #866, 2026-09-23): every English text the tool
// rewrites is read aloud with a bracketed gloss in it, and nothing it writes is. Against the
// pre-fix wording (`from`) the annotation assertion fails; against the post-fix wording (`to`)
// it passes — the same check, both sides. The strip is the ONLY change: word for word, the
// new text is the old text minus "(who)", so no wording drifts under cover of the gloss fix.
import { describe, it, expect } from 'vitest';
const { LEGO, PHRASES, SEEDS, SPOKEN_ANNOTATION, stripWho } = require('./eng-for-hin-seed-128-strip-who-2026-09-23.cjs');

describe('eng_for_hin seed 128: "someone (who)" → "someone"', () => {
  it('every text it rewrites carries the spoken gloss (the pre-fix state fails)', () => {
    expect(LEGO.from).toMatch(SPOKEN_ANNOTATION);
    for (const p of PHRASES) expect(p.from, p.id).toMatch(SPOKEN_ANNOTATION);
  });

  it('nothing it writes carries an annotation character (the post-fix state passes)', () => {
    expect(LEGO.to).not.toMatch(SPOKEN_ANNOTATION);
    for (const p of PHRASES) expect(p.to, p.id).not.toMatch(SPOKEN_ANNOTATION);
  });

  it('the strip removes exactly "(who)" and nothing else', () => {
    expect(stripWho('someone (who)')).toBe('someone');
    expect(stripWho("i think you're like someone (who) i used to know")).toBe("i think you're like someone i used to know");
    expect(stripWho('who wants to work')).toBe('who wants to work'); // bare "who" is a real word, never touched
    for (const p of PHRASES) expect(p.to, p.id).toBe(p.from.replace(' (who)', ''));
  });

  it('every phrase still contains the whole LEGO and the S0128L03 chunk where it had it', () => {
    for (const p of PHRASES) expect(p.to.toLowerCase(), p.id).toContain('someone');
    for (const p of PHRASES.filter(p => p.id.includes('S0128L03'))) expect(p.to, p.id).toContain('someone i used to know');
  });

  it('touches seeds 128 and 140 only', () => {
    expect(SEEDS).toEqual([128, 140]);
  });
});
