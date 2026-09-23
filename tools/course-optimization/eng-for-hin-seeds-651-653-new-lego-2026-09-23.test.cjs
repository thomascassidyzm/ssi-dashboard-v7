// Proves the 651/653 re-cut (job #931·H): the new L01 is the seed's CURRENT (proofread) Hindi, not the pre-proofread
// string the 2 Sept rebuild stored; the English does not change; L01 + मैडम tile the seed on both sides; each basket
// is 3 build + 5 use, every line containing the LEGO on both sides with sir/madam matched across sides. Offline: no DB.
import { describe, it, expect } from 'vitest';
const S = require('./eng-for-hin-seeds-651-653-new-lego-2026-09-23.cjs');
describe('seeds 651 and 653 get their new LEGO', () => {
  it('the new L01 is the proofread Hindi with the old English', () => {
    const by = Object.fromEntries(S.SEEDS.map(s => [s.seed, s]));
    expect(by[651].lego).toEqual({ known: 'आपका क्या ख़्याल है', target: 'what do you think' });
    expect(by[653].lego).toEqual({ known: 'आपको आपत्ति तो नहीं है', target: 'do you mind' });
    for (const s of S.SEEDS) { expect(s.lego.known).not.toBe(s.old.known); expect(s.lego.target).toBe(s.old.target); expect(s.text.known.startsWith(s.lego.known)).toBe(true); }
  });
  it('the cut passes the offline rules; मैडम stays the bare duplicate', () => {
    expect(S.offlineCheck()).toEqual([]);
    for (const s of S.SEEDS) { const body = S.legoBody(s); expect(body[1]).toMatchObject({ known: 'मैडम', target: 'madam', build: [], use: [] }); expect(body[0].build).toHaveLength(3); expect(body[0].use).toHaveLength(5); }
    expect(S.allRows().filter(r => r.role === 'build' || r.role === 'use')).toHaveLength(16);
  });
});
