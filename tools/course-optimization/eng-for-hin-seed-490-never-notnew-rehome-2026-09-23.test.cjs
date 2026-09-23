// Proves the not-new + re-home (job #931·H, Kai's ruling 2026-09-23 19:37Z): S0490L01 is byte-identical to the seed 309
// component on both sides (so it is NOT new), the 9 lines it carried are exactly the #914·H basket after the #918·H
// tighten (retired, never re-labelled — none contains another 490 LEGO), and every re-homed line contains its host LEGO
// on both sides, keeps कभी = never, and the set still drills "never" in 4+ English frames. Offline: no DB.
import { describe, it, expect } from 'vitest';
const R = require('./eng-for-hin-seed-490-never-notnew-rehome-2026-09-23.cjs');
const P = require('./eng-for-hin-seed-489-if-fold-490-kabhi-2026-09-23.cjs');
const N = require('./eng-for-hin-seed-490-never-lego-2026-09-23.cjs');
describe('S0490L01 not new, never re-homed', () => {
  it('the not-new LEGO is the 309 component on both sides', () => {
    expect(R.NOT_NEW.known).toBe('कभी नहीं'); expect(R.NOT_NEW.target).toBe('never');
    expect(R.NOT_NEW.component.id).toBe('eng_for_hin:S0309L01C02');
  });
  it('the retired 9 are the S0490L01 basket, and none of them fits another 490 LEGO (so re-labelling was never an option)', () => {
    expect(R.RETIRED.map(p => p.id.split(':')[1])).toEqual(['S0490L01B01', 'S0490L01B02', 'S0490L01B03', 'S0490L01B04', 'S0490L01U01', 'S0490L01U02', 'S0490L01U03', 'S0490L01U04', 'S0490L01U05']);
    for (const p of R.RETIRED) { expect(P.phraseContainsLego(N.OLD_LEGOS[0], p)).toBe(false); expect(P.phraseContainsLego(R.HOSTS.S0490L03, p)).toBe(false); }
  });
  it('every re-homed line contains its host on both sides, keeps never, and the set drills it', () => {
    expect(R.offlineCheck()).toEqual([]);
    expect(R.NEW_LINES.filter(l => l.host === 'S0490L03')).toHaveLength(6);
    expect(R.NEW_LINES.filter(l => l.host === 'S0495L01')).toHaveLength(2);
    for (const l of R.NEW_LINES) expect(P.phraseContainsLego(R.HOSTS[l.host], l)).toBe(true);
    expect(N.neverFrames(R.NEW_LINES).size).toBeGreaterThanOrEqual(4);
    expect(R.newRows().map(r => r.id.split(':')[1])).toEqual(['S0490L03U06', 'S0490L03U07', 'S0490L03U08', 'S0490L03U09', 'S0490L03U10', 'S0490L03U11', 'S0495L01U06', 'S0495L01U07']);
  });
});
