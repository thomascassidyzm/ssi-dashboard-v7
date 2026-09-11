// tools/gle-round-realign-2026-09-10.test.cjs
//
// Runs the round realign TWICE against a copy of the data and proves the
// second run writes nothing. REAL POSTGRES, IN PROCESS: @electric-sql/pglite
// is PostgreSQL compiled to wasm, so the UPDATE, the CASE arithmetic, the
// scalar subqueries against course_round_index and the ratchet trigger are
// executed by Postgres itself. Nothing here touches the live database.
//
// Confirmed defect (foreign-eyes, 2026-09-11): the script shifted every value
// >= 23 by +1 with no guard, so a second --apply moved 23 -> 24 -> 25, and a
// row already written under the post-insertion numbering was shifted too.
// This file is the test that FAILED on that code and PASSES on the fix.
//
//   NODE_PATH=<dir holding @electric-sql/pglite> node --test tools/gle-round-realign-2026-09-10.test.cjs
//
// Without @electric-sql/pglite resolvable the suite SKIPS, loudly, by name.

const test = require('node:test');
const assert = require('node:assert');

let PGlite = null;
try { ({ PGlite } = require('@electric-sql/pglite')); } catch (_) { /* skipped below */ }

const { realign, COLUMNS, DEFAULT_EVENT } = require('./gle-round-realign-2026-09-10.cjs');

const COURSE = 'gle_for_eng';

// The event under test: the shipped one, but WITHOUT its recorded prior
// application, so the fixture can be the "first run" the live database had
// on 2026-09-10. A separate test below proves the shipped default refuses.
const EVENT = Object.assign({}, DEFAULT_EVENT, { priorApplications: [] });

// The learner-facing player stores the round as a 0-based array position
// (LearningPlayer.vue: `cachedRounds.value[roundIndex]`), i.e. course_round_index.round_index - 1.
// course_round_index (1-based r) AFTER the insertion of S0008L03 at r=23:
const ROUND_MAP = [];
{
  // Seeds 1-5 with four LEGOs each (r 1-20), seed 8 with three (r 21-23, the
  // inserted S0008L03 at 23 exactly as live), then seeds 9-12.
  const shape = [[1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [8, 3], [9, 4], [10, 3], [11, 3], [12, 3]];
  let r = 0;
  for (const [seed, n] of shape) {
    for (let i = 1; i <= n; i++) {
      r += 1;
      ROUND_MAP.push({ r, lego: `S${String(seed).padStart(4, '0')}L${String(i).padStart(2, '0')}`, seed, idx: i });
    }
  }
}
const rOf = (lego) => ROUND_MAP.find((x) => x.lego === lego).r;
assert.strictEqual(rOf('S0008L03'), 23, 'fixture: S0008L03 must sit at r=23 like live');

// Verbatim from ssi-learning-app/supabase/schema.sql (ratchet_highest_completed_round):
// the trigger the script disables for its transaction.
const RATCHET_FN = `
CREATE FUNCTION public.ratchet_highest_completed_round() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  prev_high_round INTEGER;
  prev_high_lego TEXT;
  explicit_round_reset BOOLEAN;
  explicit_lego_reset BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    prev_high_round := NULL;
    prev_high_lego := NULL;
    explicit_round_reset := FALSE;
    explicit_lego_reset := FALSE;
  ELSE
    prev_high_round := OLD.highest_completed_round_index;
    prev_high_lego  := OLD.highest_completed_lego_id;
    explicit_round_reset := (NEW.highest_completed_round_index IS NULL);
    explicit_lego_reset  := (NEW.highest_completed_lego_id IS NULL);
  END IF;
  IF explicit_round_reset THEN
    NEW.highest_completed_round_index := NULL;
  ELSIF NEW.last_completed_round_index IS NOT NULL AND
     (prev_high_round IS NULL OR NEW.last_completed_round_index > prev_high_round) THEN
    NEW.highest_completed_round_index := NEW.last_completed_round_index;
  ELSE
    NEW.highest_completed_round_index := prev_high_round;
  END IF;
  IF explicit_lego_reset THEN
    NEW.highest_completed_lego_id := NULL;
  ELSIF NEW.last_completed_lego_id IS NOT NULL AND
     (prev_high_lego IS NULL OR NEW.last_completed_lego_id > prev_high_lego) THEN
    NEW.highest_completed_lego_id := NEW.last_completed_lego_id;
  ELSE
    NEW.highest_completed_lego_id := prev_high_lego;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER course_enrollments_ratchet_highest_round BEFORE INSERT OR UPDATE OF
  last_completed_round_index, last_completed_lego_id, highest_completed_round_index, highest_completed_lego_id
  ON public.course_enrollments FOR EACH ROW EXECUTE FUNCTION public.ratchet_highest_completed_round();
`;

const SCHEMA = `
CREATE TABLE public.course_enrollments (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  learner_id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id text NOT NULL,
  last_completed_lego_id text,
  last_completed_round_index integer,
  highest_completed_lego_id text,
  highest_completed_round_index integer,
  infplay_round_index integer DEFAULT 0 NOT NULL,
  pod_activation_round integer,
  last_practiced_at timestamptz
);
-- Live, this is a materialised view over course_legos; the script only ever
-- SELECTs from it, so a plain table with the same columns stands in.
CREATE TABLE public.course_round_index (
  course_code text NOT NULL,
  round_index integer NOT NULL,
  lego_id text NOT NULL,
  seed_number integer,
  lego_index integer
);
CREATE TABLE public.app_config (
  key text NOT NULL PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
${RATCHET_FN}
`;

// Representative enrollments. `stored` values are 0-based, as the player writes them.
//   pre  = written under PRE-insertion numbering (needs +1 if >= 22)
//   post = already written under POST-insertion numbering (must NOT move)
const ROWS = [
  // name, course, last_lego, last_stored, high_lego, high_stored, infplay, pod
  ['early',        COURSE, 'S0003L01', 8,  'S0003L01', 8,  0,  null],           // below the insertion: never moves
  ['pre-next',     COURSE, 'S0009L01', 22, 'S0009L01', 22, 0,  null],           // old R23 (0-based 22) -> 23
  ['pre-far',      COURSE, 'S0011L02', 27, 'S0011L02', 27, 28, 30],             // deep in: all four shift
  ['post-already', COURSE, 'S0009L01', 23, 'S0009L01', 23, 0,  null],           // already post-insertion: stays 23
  ['post-far',     COURSE, 'S0012L01', rOf('S0012L01') - 1, 'S0012L01', rOf('S0012L01') - 1, 0, null],
  ['no-anchor',    COURSE, 'S0099L01', 40, 'S0099L01', 40, 0,  null],           // lego no longer in the course: shift (no evidence against)
  ['blank',        COURSE, null,       null, null,     null, 0,  null],
  ['last<high',    COURSE, 'S0004L01', 12, 'S0010L01', 26, 0,  null],           // ratchet would clamp this without the trigger off
  ['other-course', 'cym_for_eng', 'S0009L01', 22, 'S0009L01', 22, 22, 22],      // never touched
];

async function fixture({ withInsertedLego = true } = {}) {
  const db = new PGlite();
  await db.exec(SCHEMA);
  for (const x of ROUND_MAP) {
    if (!withInsertedLego && x.lego === 'S0008L03') continue;
    await db.query(
      'INSERT INTO course_round_index (course_code, round_index, lego_id, seed_number, lego_index) VALUES ($1,$2,$3,$4,$5)',
      [COURSE, withInsertedLego ? x.r : (x.r > 23 ? x.r - 1 : x.r), x.lego, x.seed, x.idx],
    );
  }
  const ids = {};
  for (const [name, course, ll, lr, hl, hr, inf, pod] of ROWS) {
    const { rows } = await db.query(
      `INSERT INTO course_enrollments (course_id, last_completed_lego_id, last_completed_round_index,
         highest_completed_lego_id, highest_completed_round_index, infplay_round_index, pod_activation_round)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [course, ll, lr, hl, hr, inf, pod],
    );
    ids[name] = rows[0].id;
  }
  // The ratchet trigger ran on INSERT; pin the exact stored values we mean.
  for (const [name, , , lr, , hr] of ROWS) {
    await db.query(
      'ALTER TABLE course_enrollments DISABLE TRIGGER course_enrollments_ratchet_highest_round',
    );
    await db.query(
      'UPDATE course_enrollments SET last_completed_round_index=$2, highest_completed_round_index=$3 WHERE id=$1',
      [ids[name], lr, hr],
    );
    await db.query('ALTER TABLE course_enrollments ENABLE TRIGGER course_enrollments_ratchet_highest_round');
  }
  return { db, ids };
}

async function image(db) {
  const { rows } = await db.query(
    `SELECT id, course_id, ${COLUMNS.join(', ')} FROM course_enrollments ORDER BY id`,
  );
  return rows;
}
const rowNamed = (img, ids, name) => img.find((r) => r.id === ids[name]);
const quiet = () => {};

const skip = PGlite ? false : 'SKIPPED: @electric-sql/pglite is not resolvable — point NODE_PATH at a directory that has it';

test('first --apply realigns exactly the rows the insertion moved, and nothing else', { skip }, async () => {
  const { db, ids } = await fixture();
  const res = await realign(db, { apply: true, event: EVENT, log: quiet });
  assert.strictEqual(res.applied, true);
  const img = await image(db);

  const early = rowNamed(img, ids, 'early');
  assert.deepStrictEqual([early.last_completed_round_index, early.highest_completed_round_index], [8, 8]);

  const pre = rowNamed(img, ids, 'pre-next');
  assert.deepStrictEqual([pre.last_completed_round_index, pre.highest_completed_round_index], [23, 23]);

  const far = rowNamed(img, ids, 'pre-far');
  assert.deepStrictEqual(
    [far.last_completed_round_index, far.highest_completed_round_index, far.infplay_round_index, far.pod_activation_round],
    [28, 28, 29, 31],
  );

  // Astra's second half: a row already written under the NEW numbering is not shifted.
  const post = rowNamed(img, ids, 'post-already');
  assert.deepStrictEqual([post.last_completed_round_index, post.highest_completed_round_index], [23, 23]);
  const postFar = rowNamed(img, ids, 'post-far');
  assert.strictEqual(postFar.last_completed_round_index, rOf('S0012L01') - 1);

  const none = rowNamed(img, ids, 'no-anchor');
  assert.strictEqual(none.last_completed_round_index, 41);

  const lh = rowNamed(img, ids, 'last<high');
  assert.deepStrictEqual([lh.last_completed_round_index, lh.highest_completed_round_index], [12, 27]);

  const other = rowNamed(img, ids, 'other-course');
  assert.deepStrictEqual(
    [other.last_completed_round_index, other.highest_completed_round_index, other.infplay_round_index, other.pod_activation_round],
    [22, 22, 22, 22],
  );
  await db.close();
});

test('second --apply is a no-op: the copy is byte-identical and the run says so', { skip }, async () => {
  const { db } = await fixture();
  await realign(db, { apply: true, event: EVENT, log: quiet });
  const once = await image(db);

  const lines = [];
  const res = await realign(db, { apply: true, event: EVENT, log: (l) => lines.push(String(l)) });
  const twice = await image(db);

  assert.deepStrictEqual(twice, once, 'a second --apply must not move a single value');
  assert.strictEqual(res.applied, false, 'the second run must not report an application');
  assert.ok(lines.some((l) => /already applied/i.test(l)), `stdout must say it was already applied, got:\n${lines.join('\n')}`);
  await db.close();
});

test('--dry-run writes nothing, on a first run and on an already-applied one', { skip }, async () => {
  const { db } = await fixture();
  const start = await image(db);
  await realign(db, { apply: false, event: EVENT, log: quiet });
  assert.deepStrictEqual(await image(db), start);
  await realign(db, { apply: true, event: EVENT, log: quiet });
  const once = await image(db);
  await realign(db, { apply: false, event: EVENT, log: quiet });
  assert.deepStrictEqual(await image(db), once);
  await db.close();
});

test('refuses when course_round_index does not show the inserted LEGO at its round', { skip }, async () => {
  const { db } = await fixture({ withInsertedLego: false });
  const start = await image(db);
  await assert.rejects(
    () => realign(db, { apply: true, event: EVENT, log: quiet }),
    /S0008L03/,
  );
  assert.deepStrictEqual(await image(db), start);
  await db.close();
});

test('the shipped event refuses --apply: it records its own 2026-09-10 application', { skip }, async () => {
  const { db } = await fixture();
  const start = await image(db);
  const lines = [];
  const res = await realign(db, { apply: true, log: (l) => lines.push(String(l)) });
  assert.strictEqual(res.applied, false);
  assert.ok(lines.some((l) => /already applied/i.test(l) && /2026-09-10/.test(l)), lines.join('\n'));
  assert.deepStrictEqual(await image(db), start);
  await db.close();
});
