#!/usr/bin/env node
/**
 * CROSS-COURSE UNION ZUT — cheap self-test. No DB, no network, one process.
 *
 * The defect this file exists for (sector-helix design, §7 failure mode 1):
 * every ZUT query in services/course-builder/lib/validation.cjs carried
 * `.eq('course_code', courseCode)`, so a sector SEGMENT — which by the settled
 * design is registered as its OWN course code and draws on its declared core
 * anchor — could mint a known text that collides with the base course's
 * mapping and nothing would catch it. To the learner it is one course; to the
 * validator it was two, and the validator was the one that was wrong.
 *
 * What this file has to hold:
 *   (a) a segment minting a DIFFERENT target for a known the base already owns
 *       is a ZUT violation, and the message names the course it collided with;
 *   (b) a segment re-using the base's EXACT mapping is a duplicate (legal
 *       shared chunk, is_new = false), not a violation;
 *   (c) phrase-level ZUT sees the union too;
 *   (d) the base course sees its segments (ZUT is content-keyed and family-wide
 *       in both directions — §5b, "same known → same target across the whole
 *       family");
 *   (e) A COURSE WITH NO REGISTRY ROW BEHAVES EXACTLY AS IT DOES NOW. This is
 *       the safety argument for the 130 courses submitting seeds today;
 *   (f) the AVAILABILITY window is anchor-bounded (base up to core_anchor_lego_id
 *       plus the segment's own rows) while ZUT is not — a learner has not met
 *       base material past the anchor, but a fork is a fork whenever it lands;
 *   (g) THE y usted CASE, VERBATIM: the family owns "and" and owns "you" and
 *       still cannot say "and you", in BOTH threads — and is admitted the day
 *       either thread's authoring cuts the pivot, with no config change.
 *
 * Run: node tools/union-zut/union-zut.test.cjs
 */
const path = require('path');
const V = require(path.join(__dirname, '..', '..', 'services', 'course-builder', 'lib', 'validation.cjs'));
const { availableVocab, instantiableFrameSet } = require(path.join(__dirname, '..', 'frame-layer', 'availability.cjs'));

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('FAIL ' + m); } };

// ─── a Supabase stub: in-memory rows, the same chain the validator calls ────
function stub(tables) {
  const build = (rows) => {
    const filters = [];
    const api = {
      select: () => api,
      eq: (col, val) => (filters.push(r => r[col] === val), api),
      lt: (col, val) => (filters.push(r => r[col] < val), api),
      lte: (col, val) => (filters.push(r => r[col] <= val), api),
      in: (col, vals) => (filters.push(r => vals.includes(r[col])), api),
      order: () => api,
      range: () => api,
      run: () => ({ data: rows.filter(r => filters.every(f => f(r))), error: null }),
      maybeSingle: () => Promise.resolve({ data: api.run().data[0] || null, error: null }),
      then: (res, rej) => Promise.resolve(api.run()).then(res, rej),
    };
    return api;
  };
  return { from: (t) => build(tables[t] || []) };
}

const lego = (course, seed, idx, known, target, type = 'A') =>
  ({ course_code: course, seed_number: seed, lego_index: idx, known_text: known, target_text: target, type });
const phrase = (course, seed, idx, known, target, role = 'build') =>
  ({ course_code: course, seed_number: seed, lego_index: idx, known_text: known, target_text: target, phrase_role: role });

// The base course, and a LABELLED STAND-IN segment. No sector seeds exist
// anywhere in the estate yet (verified on the sector branches, which hold
// source conversations and mappings only), so the segment rows below are a
// stand-in and are labelled as one. They are never to be read as attested.
const BASE = 'spa_for_eng', SEG = 'spa_health_for_eng';
const ANCHOR = 'S0040L02';

const DB = {
  course_legos: [
    lego(BASE, 12, 1, 'you', 'usted'),
    lego(BASE, 12, 2, 'and', 'y'),
    lego(BASE, 30, 1, 'i want', 'quiero'),
    lego(BASE, 90, 1, 'the appointment', 'la cita'),   // AFTER the anchor
  ],
  course_practice_phrases: [
    phrase(BASE, 30, 1, 'i want to speak', 'quiero hablar'),
    phrase(BASE, 12, 2, 'and', 'y', 'component'),
  ],
  course_sectors: [{
    base_course_code: BASE, sector_slug: 'health', sector_course_code: SEG,
    core_anchor_lego_id: ANCHOR, status: 'draft',
  }],
};
// the stand-in segment's own authored rows
const SEG_ROWS = [
  lego(SEG, 1, 1, 'the pain', 'el dolor'),
  lego(SEG, 2, 1, 'i want', 'quiero'),      // exact re-use of the base mapping
];

const FAMILY_SEG = { courseCode: SEG, baseCourseCode: BASE, segmentCourseCodes: [SEG],
                     zutCourseCodes: [BASE, SEG], anchor: { seed_number: 40, lego_index: 2 } };
const FAMILY_BASE = { courseCode: BASE, baseCourseCode: BASE, segmentCourseCodes: [SEG],
                      zutCourseCodes: [BASE, SEG], anchor: null };

(async () => {

// ─── (a) the defect: a segment forking a known the base already owns ───────
{
  const sb = stub({ ...DB, course_legos: [...DB.course_legos, ...SEG_ROWS] });
  const r = await V.checkLegoConflict(sb, SEG, 'you', 'vosotros', 3, { family: FAMILY_SEG });
  ok(r.conflict === 'zut',
     `(a) a segment minting "you" → "vosotros" while ${BASE} owns "you" → "usted" must be a ZUT violation; got ${JSON.stringify(r.conflict)}`);
  ok(r.conflict === 'zut' && /usted/.test(r.error || ''),
     '(a) the error must name the target it collided with');
  ok(r.conflict === 'zut' && (r.existing || []).some(e => e.courseCode === BASE),
     '(a) the collision must name the COURSE it came from — a family message that reads like a same-course one is a message that lies');
}

// ─── (b) the exact same mapping is a shared chunk, not a violation ─────────
{
  const sb = stub({ ...DB, course_legos: [...DB.course_legos, ...SEG_ROWS] });
  const r = await V.checkLegoConflict(sb, SEG, 'i want', 'quiero', 3, { family: FAMILY_SEG });
  ok(r.conflict === 'duplicate',
     `(b) re-using the base's exact mapping is a shared chunk (is_new = false), not a fork; got ${JSON.stringify(r.conflict)}`);
}

// ─── (c) phrase-level ZUT sees the union ───────────────────────────────────
{
  const sb = stub({ ...DB, course_legos: [...DB.course_legos, ...SEG_ROWS] });
  const cs = await V.checkPhraseZUT(sb, SEG, [{ known: 'i want to speak', target: 'deseo hablar' }], 3, { family: FAMILY_SEG });
  ok(cs.length === 1 && cs[0].existing_target === 'quiero hablar',
     `(c) a segment phrase forking a base PHRASE must collide; got ${JSON.stringify(cs)}`);
  ok(cs.length === 1 && cs[0].existing_course === BASE,
     '(c) the phrase collision must name the course it came from');
}

// ─── (d) the base course sees its segments (both directions) ───────────────
{
  const sb = stub({ ...DB, course_legos: [...DB.course_legos, ...SEG_ROWS] });
  const r = await V.checkLegoConflict(sb, BASE, 'the pain', 'la pena', 200, { family: FAMILY_BASE });
  ok(r.conflict === 'zut',
     `(d) the BASE forking a known its own segment already owns must be caught; got ${JSON.stringify(r.conflict)}`);
}

// ─── (e) BACKWARD COMPATIBILITY — no registry row, byte-identical behaviour ─
{
  const sb = stub({ ...DB, course_legos: [...DB.course_legos, ...SEG_ROWS] });
  const before = await V.checkLegoConflict(sb, SEG, 'you', 'vosotros', 3);
  ok(before.conflict === false,
     '(e) with NO family, a segment code sees only its own course — exactly as the 130 live courses do today');
  const own = await V.checkLegoConflict(sb, BASE, 'you', 'vosotros', 30);
  ok(own.conflict === 'zut' && !('courseCode' in (own.existing[0] || {})),
     '(e) a plain single-course collision must carry NO course field — the message stays byte-identical for the courses that have no family');
  const cs = await V.checkPhraseZUT(sb, SEG, [{ known: 'i want to speak', target: 'deseo hablar' }], 3);
  ok(cs.length === 0, '(e) with no family, phrase ZUT is single-course as before');
}

// ─── (f) availability IS anchor-bounded where ZUT is not ───────────────────
{
  const U = require(path.join(__dirname, '..', 'frame-layer', 'union.cjs'));
  const vocab = U.unionVocab({
    base: { legos: DB.course_legos.filter(l => l.course_code === BASE), components: [] },
    segment: { legos: SEG_ROWS, components: [] },
    family: FAMILY_SEG, seed: 3, legoIndex: null,
  });
  const has = (k) => vocab.some(v => v.known_text === k);
  ok(has('you') && has('and'), '(f) base material BEFORE the anchor is available to the segment');
  ok(!has('the appointment'),
     '(f) base material AFTER the core anchor is NOT available — the learner has not met it (yet ZUT above still sees it: a fork is a fork whenever it lands)');
  ok(has('the pain'), "(f) the segment's own material is available");
}

// ─── (g) THE y usted CASE, VERBATIM, IN BOTH THREADS ───────────────────────
{
  const U = require(path.join(__dirname, '..', 'frame-layer', 'union.cjs'));
  const D6 = { id: 'D6', name: 'and you?', grain: 'exchange', fixed_material: [['and you']] };
  const vocab = U.unionVocab({
    base: { legos: DB.course_legos.filter(l => l.course_code === BASE), components: [] },
    segment: { legos: SEG_ROWS, components: [] },
    family: FAMILY_SEG, seed: 3, legoIndex: null,
  });
  const pool = instantiableFrameSet({ vocab, priorSeeds: [], dialogueFrames: [D6] });
  ok(!pool.some(f => f.id === 'D6'),
     '(g) the family owns "and" and owns "you" and STILL cannot say "and you" — no cut mints the pivot, so D6 stays out of the union pool');

  // ...and enters automatically the day EITHER thread's authoring cuts it.
  const cutInSegment = [...SEG_ROWS, lego(SEG, 3, 1, 'and you', 'y usted')];
  const vocab2 = U.unionVocab({
    base: { legos: DB.course_legos.filter(l => l.course_code === BASE), components: [] },
    segment: { legos: cutInSegment, components: [] },
    family: FAMILY_SEG, seed: 4, legoIndex: null,
  });
  ok(instantiableFrameSet({ vocab: vocab2, priorSeeds: [], dialogueFrames: [D6] }).some(f => f.id === 'D6'),
     '(g) the day the SEGMENT thread cuts the pivot, D6 is admitted — no config change anywhere');

  const cutInBase = [...DB.course_legos.filter(l => l.course_code === BASE), lego(BASE, 20, 1, 'and you', 'y usted')];
  const vocab3 = U.unionVocab({
    base: { legos: cutInBase, components: [] }, segment: { legos: SEG_ROWS, components: [] },
    family: FAMILY_SEG, seed: 3, legoIndex: null,
  });
  ok(instantiableFrameSet({ vocab: vocab3, priorSeeds: [], dialogueFrames: [D6] }).some(f => f.id === 'D6'),
     '(g) the day the BASE thread cuts the pivot before the anchor, D6 is admitted in the segment too — one ledger, two threads');
}

// ─── the registry resolver: reads course_sectors, degrades honestly ────────
{
  const F = require(path.join(__dirname, '..', '..', 'services', 'course-builder', 'lib', 'course-family.cjs'));
  const sb = stub(DB);
  const fam = await F.resolveCourseFamily(sb, SEG);
  ok(fam && fam.baseCourseCode === BASE, 'registry: a segment resolves to its base course');
  ok(fam && fam.anchor && fam.anchor.seed_number === 40 && fam.anchor.lego_index === 2,
     'registry: the core anchor lego id parses to a (seed, lego) bound');
  ok(fam && fam.zutCourseCodes.length === 2, 'registry: ZUT scope is the whole family');

  const famBase = await F.resolveCourseFamily(sb, BASE);
  ok(famBase && famBase.segmentCourseCodes.includes(SEG), 'registry: a base course resolves to its segments');

  const plain = await F.resolveCourseFamily(sb, 'fra_for_eng');
  ok(plain === null, 'registry: a course with no row resolves to null — no family, no behaviour change');

  // the table does not exist in the database today; a missing table must read
  // as "no family", never as an error that blocks a live seed submission.
  const noTable = { from: () => { throw new Error('relation "course_sectors" does not exist'); } };
  ok((await F.resolveCourseFamily(noTable, SEG)) === null,
     'registry: a MISSING course_sectors table degrades to no-family, never to a 500 on a live submission');

  ok(F.parseLegoId('S0040L02').seed_number === 40 && F.parseLegoId('S0040L02').lego_index === 2,
     'registry: lego id parses');
  ok(F.parseLegoId('nonsense') === null, 'registry: an unparseable anchor is null, not a guess');
}

// ─── pairOf must resolve a segment course code (the standing bug) ──────────
{
  const { pairOf, knownSideIsEnglish } = require(path.join(__dirname, '..', 'frame-layer', 'corpus.cjs'));
  ok(pairOf('spa_for_eng').target === 'spa' && pairOf('spa_for_eng').known === 'eng',
     'pairOf: the plain case is unchanged');
  ok(pairOf('cym_n_for_eng').known === 'eng',
     'pairOf: the standing bug — cym_n_for_eng has an English known side and the regex said null');
  ok(pairOf(SEG).target === 'spa' && pairOf(SEG).known === 'eng' && pairOf(SEG).variant === 'health',
     'pairOf: a segment course code resolves to its base pair, carrying the variant');
  ok(knownSideIsEnglish(SEG), 'pairOf: the frame layer may run its English patterns on a segment');
  ok(pairOf('rubbish').target === null, 'pairOf: genuine rubbish is still null');
}

console.log(fail
  ? `${fail} failing assertion(s)`
  : 'ok — ZUT is family-wide in both directions, availability is anchor-bounded, "and you" is still refused in both threads, and a course with no registry row behaves exactly as it does today');
process.exit(fail ? 1 : 0);
})();
