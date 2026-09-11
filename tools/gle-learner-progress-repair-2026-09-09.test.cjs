// tools/gle-learner-progress-repair-2026-09-09.test.cjs
//
// Runs the learner-progress repair TWICE against a copy of the data and proves
// the second run swaps nothing back. REAL POSTGRES, IN PROCESS (PGlite); the
// unique keys the '#tmp' two-step exists for are enforced by Postgres itself.
// Nothing here touches the live database.
//
// Confirmed defect (foreign-eyes, 2026-09-10): a second --apply silently
// re-swapped S0002L01/S0002L02. A swap leaves the data unable to testify —
// the same two ids exist before and after — so the guard is the application
// record written in the same transaction, plus the script's own history.
//
//   NODE_PATH=<dir holding @electric-sql/pglite> node --test tools/gle-learner-progress-repair-2026-09-09.test.cjs

const test = require('node:test');
const assert = require('node:assert');

let PGlite = null;
try { ({ PGlite } = require('@electric-sql/pglite')); } catch (_) { /* skipped below */ }

const { repair, DEFAULT_EVENT } = require('./gle-learner-progress-repair-2026-09-09.cjs');

const COURSE = 'gle_for_eng';
const EVENT = Object.assign({}, DEFAULT_EVENT, { priorApplications: [] });
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

const SCHEMA = `
CREATE TABLE public.lego_progress (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  learner_id uuid NOT NULL,
  lego_id text NOT NULL,
  course_id text NOT NULL,
  thread_id smallint NOT NULL DEFAULT 1,
  reps_completed smallint DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT lego_progress_learner_id_lego_id_course_id_key UNIQUE (learner_id, lego_id, course_id)
);
CREATE TABLE public.learner_lego_metrics (
  learner_id uuid NOT NULL,
  lego_id text NOT NULL,
  course_code text NOT NULL,
  n_samples integer DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (learner_id, lego_id)
);
CREATE TABLE public.learner_l1_state (
  learner_id uuid NOT NULL,
  course_code text NOT NULL,
  lego_id text NOT NULL,
  fire_count integer DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (learner_id, course_code, lego_id)
);
CREATE TABLE public.app_config (
  key text NOT NULL PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
`;

async function fixture() {
  const db = new PGlite();
  await db.exec(SCHEMA);
  // Learner A holds BOTH ends of the seed-2 swap — the case the '#tmp' step exists for.
  await db.query(`INSERT INTO lego_progress (learner_id, lego_id, course_id, reps_completed) VALUES
    ($1,'S0002L01',$3,5), ($1,'S0002L02',$3,9), ($1,'S0001L01',$3,2),
    ($2,'S0002L01',$3,7), ($2,'S0002L01','cym_for_eng',3)`, [A, B, COURSE]);
  await db.query(`INSERT INTO learner_lego_metrics (learner_id, lego_id, course_code, n_samples) VALUES
    ($1,'S0002L01',$2,4)`, [B, COURSE]);
  return db;
}

async function image(db) {
  const q = async (sql) => (await db.query(sql)).rows;
  return {
    lego_progress: await q('SELECT learner_id, lego_id, course_id, reps_completed FROM lego_progress ORDER BY learner_id, course_id, lego_id'),
    learner_lego_metrics: await q('SELECT learner_id, lego_id, course_code, n_samples FROM learner_lego_metrics ORDER BY 1,2'),
    learner_l1_state: await q('SELECT * FROM learner_l1_state'),
  };
}
const quiet = () => {};
const skip = PGlite ? false : 'SKIPPED: @electric-sql/pglite is not resolvable — point NODE_PATH at a directory that has it';

const reps = (img, learner, lego, course = COURSE) =>
  img.lego_progress.find((r) => r.learner_id === learner && r.lego_id === lego && r.course_id === course)?.reps_completed;

test('first --apply swaps S0002L01/S0002L02 for gle_for_eng learners and nothing else', { skip }, async () => {
  const db = await fixture();
  const res = await repair(db, { apply: true, event: EVENT, log: quiet });
  assert.strictEqual(res.applied, true);
  const img = await image(db);
  assert.strictEqual(reps(img, A, 'S0002L02'), 5, 'A: the chunk that was L01 is now L02');
  assert.strictEqual(reps(img, A, 'S0002L01'), 9);
  assert.strictEqual(reps(img, A, 'S0001L01'), 2, 'not in the plan: untouched');
  assert.strictEqual(reps(img, B, 'S0002L02'), 7);
  assert.strictEqual(reps(img, B, 'S0002L01', 'cym_for_eng'), 3, 'other course: untouched');
  assert.strictEqual(img.learner_lego_metrics[0].lego_id, 'S0002L02');
  await db.close();
});

test('second --apply is a no-op: nothing swaps back and the run says so', { skip }, async () => {
  const db = await fixture();
  await repair(db, { apply: true, event: EVENT, log: quiet });
  const once = await image(db);
  const lines = [];
  const res = await repair(db, { apply: true, event: EVENT, log: (l) => lines.push(String(l)) });
  assert.deepStrictEqual(await image(db), once, 'a second --apply must not swap anything back');
  assert.strictEqual(res.applied, false);
  assert.ok(lines.some((l) => /already applied/i.test(l)), lines.join('\n'));
  await db.close();
});

test('--dry-run writes nothing', { skip }, async () => {
  const db = await fixture();
  const start = await image(db);
  await repair(db, { apply: false, event: EVENT, log: quiet });
  assert.deepStrictEqual(await image(db), start);
  await db.close();
});

test('the shipped event refuses --apply: it records its own 2026-09-09 application', { skip }, async () => {
  const db = await fixture();
  const start = await image(db);
  const lines = [];
  const res = await repair(db, { apply: true, log: (l) => lines.push(String(l)) });
  assert.strictEqual(res.applied, false);
  assert.ok(lines.some((l) => /already applied/i.test(l) && /2026-09-09/.test(l)), lines.join('\n'));
  assert.deepStrictEqual(await image(db), start);
  await db.close();
});
