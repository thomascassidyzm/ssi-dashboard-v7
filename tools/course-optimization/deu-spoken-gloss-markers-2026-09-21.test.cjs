// The one test that proves the fix (job #507, 2026-09-21): every known text the
// tool removed would be read aloud as an annotation, and nothing it wrote would.
// Against the pre-fix wording (the `from` column) the annotation assertion
// fails; against the post-fix wording (`to`) it passes — the same check, both
// sides. The ZUT assertion pins the collision each rename exists to avoid: the
// bare English of every `from` is a known text some OTHER LEGO in deu_for_eng
// already owns with a different target (the live rows as read 2026-09-21), so
// "just strip the bracket" is provably the ZUT defect, not a fix.
import { describe, it, expect } from 'vitest';
const { RENAMES, SIDE_FIXES, DELETE, SPOKEN_ANNOTATION } = require('./deu-spoken-gloss-markers-2026-09-21.cjs');

// Live deu_for_eng LEGOs, 2026-09-21, whose known text is the bracket-stripped
// form of a marker below and whose target differs. Read from the database, not
// invented: see the `avoids` column of each rename for the LEGO ids.
const BARE_FORM_ALREADY_OWNED = {
  'can (modal)':           { bare: 'can',      owner: 'S0090L01', target: 'kannst' },
  'you feel (2sg fühlen)': { bare: 'you feel', owner: 'S0040L01', target: 'du fühlst dich' },
  'me (accusative)':       { bare: 'me',       owner: 'S0025L03', target: 'mir' },
  'children (dative pl.)': { bare: 'children', owner: 'S0455L03', target: 'Kinder' },
  'have (2sg)':            { bare: 'have',     owner: 'S0037L01', target: 'habe' },
  'you all (2pl dative)':  { bare: 'you all',  owner: 'S0529L03', target: 'ihr' },
};

describe('deu_for_eng spoken-aloud glosses on duplicate markers', () => {
  it('covers exactly the six bracketed markers the full-course scan found', () => {
    expect(RENAMES.map(r => r.legoId).sort()).toEqual(['S0469L03', 'S0542L03', 'S0548L03', 'S0567L04', 'S0616L01', 'S0656L01']);
  });

  it('every known text it removes would be read aloud as an annotation (the pre-fix state fails)', () => {
    for (const r of RENAMES) expect(r.from, r.legoId).toMatch(SPOKEN_ANNOTATION);
  });

  it('nothing it writes carries an annotation character (the post-fix state passes)', () => {
    for (const r of RENAMES) expect(r.to, r.legoId).not.toMatch(SPOKEN_ANNOTATION);
    for (const f of SIDE_FIXES) expect(f.to, f.id).not.toMatch(SPOKEN_ANNOTATION);
  });

  it('never just strips the bracket: the bare form is owned by another LEGO with a different target', () => {
    for (const r of RENAMES) {
      const owned = BARE_FORM_ALREADY_OWNED[r.from];
      expect(owned, r.legoId).toBeDefined();
      const stripped = r.from.replace(/\s*\(.*\)\s*$/, '');
      expect(stripped).toBe(owned.bare);
      expect(owned.target).not.toBe(r.target);
      expect(r.to.toLowerCase()).not.toBe(owned.bare);
      expect(r.avoids).toContain(owned.owner);
    }
  });

  it('the dangling marker is a bare duplicate marker, never an introduction', () => {
    expect(DELETE).toMatchObject({ legoId: 'S0661L01', known: 'makes', target: 'macht' });
    expect(DELETE.why).toContain('#502');
  });
});
