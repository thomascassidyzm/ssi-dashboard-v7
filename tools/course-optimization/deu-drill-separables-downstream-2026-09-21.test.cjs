/**
 * Job #511 — the downstream separable-verb drill holds to Kai's ruling.
 * Run: npx vitest run tools/course-optimization/deu-drill-separables-downstream
 *
 * The defect is a census: after its introduction, does the verb recur in BOTH
 * shapes? The first block reproduces the live pre-fix state from the verbs'
 * own baskets (the #499 rows) and shows the census reporting the defect; the
 * second adds this tool's rows and shows the same census satisfied. The
 * remaining blocks hold each row to what the apply tool will demand of it.
 */
import { describe, it, expect } from 'vitest';
import { separableVerbsIn, VERBS } from '../../services/course-builder/lib/separable-verbs.cjs';
import { checkWordContainment } from '../../services/course-builder/lib/text-normalization.cjs';
import { PHRASES, PROTECTED, DRILL_FLOOR, drillCoverage, downstreamRecurrence } from './deu-drill-separables-downstream-2026-09-21.data.cjs';

/** The live state before this job, per verb: introduction seed and its own basket (from #499). */
const INTRO = { kennenlernen: 133, vorhaben: 496, zurückrufen: 524, fernsehen: 220, anfangen: 23 };
const PRE_FIX_ROWS = [
  { seed: 133, target: 'ich will dich kennenlernen' }, { seed: 133, target: 'man lernt Leute kennen' },
  { seed: 496, target: 'ich habe nicht vor zu verlieren' }, { seed: 496, target: 'was er vorhat' },
  { seed: 524, target: 'ich rufe dich zurück' }, { seed: 524, target: 'ich kann dich zurückrufen' },
  { seed: 288, target: 'sie sehen gern fern' }, { seed: 288, target: 'weil wir gern fernsehen' },
  { seed: 294, target: 'Ich glaube, ich werde heute Abend einfach zu Hause bleiben und fernsehen' },
  { seed: 122, target: 'es fängt jetzt an' }, { seed: 171, target: 'Sie fing an zu suchen aber konnte es nicht finden' },
  { seed: 601, target: 'wir haben darüber geredet, wie alles angefangen hat' },
];
const rowsOf = ps => ps.map(p => ({ seed: p.seed, target: p.target }));

describe('the census names the defect before the fix and not after', () => {
  it('pre-fix: kennenlernen, vorhaben and zurückrufen never recur; fernsehen and anfangen never recur split', () => {
    for (const v of ['kennenlernen', 'vorhaben', 'zurückrufen']) {
      const c = downstreamRecurrence(PRE_FIX_ROWS, v, INTRO[v], separableVerbsIn);
      expect(c.split + c.joined, v).toBe(0);
    }
    expect(downstreamRecurrence(PRE_FIX_ROWS, 'fernsehen', 288, separableVerbsIn).split).toBe(0);
    expect(downstreamRecurrence(PRE_FIX_ROWS, 'anfangen', 171, separableVerbsIn).split).toBe(0);
  });
  it('post-fix: every verb recurs in both shapes, at the floor, across the course', () => {
    const all = [...PRE_FIX_ROWS, ...rowsOf(PHRASES)];
    for (const [v, intro] of Object.entries(INTRO)) {
      const c = downstreamRecurrence(all, v, v === 'fernsehen' ? 288 : v === 'anfangen' ? 171 : intro, separableVerbsIn);
      expect(c.split, `${v} split`).toBeGreaterThanOrEqual(DRILL_FLOOR.eachShape);
      expect(c.joined, `${v} joined`).toBeGreaterThanOrEqual(DRILL_FLOOR.eachShape);
      expect(c.seeds.length, `${v} seeds`).toBeGreaterThanOrEqual(DRILL_FLOOR.distinctSeeds);
    }
  });
});

describe('each row is what the apply tool will demand of it', () => {
  it('the reader sees the declared verb in the declared shape', () => {
    for (const p of PHRASES) {
      const shapes = separableVerbsIn(p.target).filter(v => v.lemma === p.verb).map(v => v.realisation);
      expect(shapes, `${p.target}`).toContain(p.shape);
      expect(VERBS).toContain(p.verb);
    }
  });
  it('every row contains its host LEGO, by the gate\'s own word-containment check', () => {
    for (const p of PHRASES) expect(checkWordContainment(p.hostLego, p.target), p.target).toBe(true);
  });
  it('no row touches a protected seed or basket, and every row sits downstream of its verb', () => {
    for (const p of PHRASES) {
      expect(PROTECTED.seeds, p.target).not.toContain(p.seed);
      expect(p.seed, p.target).toBeGreaterThan(INTRO[p.verb]);
    }
  });
  it('one English maps to one German within the set (ZUT), and no target repeats', () => {
    const k = new Map(), t = new Set();
    for (const p of PHRASES) {
      const kk = p.known.toLowerCase().replace(/[?!.]$/, '');
      if (k.has(kk)) expect(k.get(kk), p.known).toBe(p.target);
      k.set(kk, p.target);
      expect(t.has(p.target.toLowerCase()), p.target).toBe(false); t.add(p.target.toLowerCase());
    }
  });
  it('is spread, not dumped: no basket carries more than three rows, and both shapes appear in each verb’s first and second half', () => {
    const per = {}; for (const p of PHRASES) per[`${p.seed}:${p.legoIndex}`] = (per[`${p.seed}:${p.legoIndex}`] || 0) + 1;
    for (const [k, n] of Object.entries(per)) expect(n, k).toBeLessThanOrEqual(3);
    const cov = drillCoverage(PHRASES);
    for (const [v, c] of Object.entries(cov)) {
      const mid = c.seeds[Math.floor(c.seeds.length / 2)];
      const early = PHRASES.filter(p => p.verb === v && p.seed < mid), late = PHRASES.filter(p => p.verb === v && p.seed >= mid);
      for (const half of [early, late]) {
        expect(half.some(p => p.shape === 'split'), `${v} half has a split`).toBe(true);
        expect(half.some(p => p.shape === 'joined'), `${v} half has a joined`).toBe(true);
      }
    }
  });
});
