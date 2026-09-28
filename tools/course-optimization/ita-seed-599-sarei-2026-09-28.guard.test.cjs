// node --test tools/course-optimization/ita-seed-599-sarei-2026-09-28.guard.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filename = path.join(__dirname, 'ita-seed-599-sarei-2026-09-28.cjs');

function harness(conflicts = []) {
  const trace = [];
  const module = { exports: {} };
  // Execute the actual functions, exposing private entry points without changing product code.
  // No real environment, database, audit writes, refresh or audio service is reachable.
  vm.runInNewContext(fs.readFileSync(filename, 'utf8') +
    '\nmodule.exports = { ...module.exports, guardLive, applyContent };', {
    module, __dirname, console,
    require(id) {
      if (id === 'path') return path;
      if (id === 'fs') return {};
      if (id === 'dotenv') return { config() {} };
      if (id.endsWith('/editor-identity.cjs')) return { serviceIdentity: () => ({}) };
      if (id.endsWith('/content-edit-log.cjs')) return {
        recordContentEdit: async () => { trace.push('AUDIT'); return 'test-event'; },
      };
      if (id.endsWith('/round-index-refresh.cjs')) return { refreshNow: async () => {} };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  }, { filename });
  const T = module.exports;
  const pg = {
    async query(sql) {
      trace.push(sql);
      if (/FROM content_edit_events/i.test(sql)) return { rows: conflicts };
      if (/^SELECT .*FROM course_seeds/i.test(sql)) return { rows: [{
        known_text: T.OLD_SEED.known, target_text: T.OLD_SEED.target,
      }] };
      if (/^SELECT .*FROM course_legos/i.test(sql)) return { rows: [{
        known_text: T.OLD_LEGO.known, target_text: T.OLD_LEGO.target,
        components: T.OLD_LEGO.components, presentation_audio_id: T.PRESENTATION.audioId,
      }] };
      if (/^SELECT .*FROM course_audio/i.test(sql)) return { rows: [{ text: T.PRESENTATION.text }] };
      if (/^SELECT .*FROM course_practice_phrases/i.test(sql)) return { rows: [{
        known_text: T.CHANGES[0].before.known, target_text: T.CHANGES[0].before.target,
        phrase_role: T.CHANGES[0].role,
      }] };
      if (/^(BEGIN|COMMIT|ROLLBACK|UPDATE|LOCK TABLE)\b/i.test(sql) ||
          /pg_advisory_xact_lock/i.test(sql)) return { rows: [], rowCount: 1 };
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  return { T, pg, trace };
}

test('today starts at midnight, inclusive, rather than twelve hours ago (SQL contract)', async () => {
  const { T, pg, trace } = harness();
  assert.equal((await T.guardLive(pg)).problems.length, 0);
  const sql = trace.find(q => /FROM content_edit_events/i.test(q));
  assert.ok(sql, 'must query competing edits');
  // At 23:00 an edit at 00:00 is still today. At 01:00 yesterday is not today.
  // Inspect emitted SQL rather than pretending a JS database double executes PostgreSQL.
  assert.match(sql, /occurred_at\s*>=\s*(?:CURRENT_DATE\b|date_trunc\(\s*'day'\s*,\s*(?:now\(\)|CURRENT_TIMESTAMP)\s*\))/i,
    'guard must include midnight of the database calendar day; rolling 12 hours misses earlier edits');
  assert.doesNotMatch(sql, /interval\s*'12 hours'/i);
});

test('apply rechecks competing edits inside a locked transaction before the first content write', async () => {
  const { T, pg, trace } = harness();
  await T.guardLive(pg); // The earlier dry-run check cannot authorise a later write.
  const start = trace.length;
  await T.applyContent(pg, {}, {});
  const apply = trace.slice(start);
  const begin = apply.findIndex(q => /^BEGIN\b/i.test(q));
  const guard = apply.findIndex(q => /FROM content_edit_events/i.test(q));
  const write = apply.findIndex(q => /^UPDATE\b/i.test(q));
  const commit = apply.findIndex(q => /^COMMIT\b/i.test(q));
  assert.ok(begin >= 0 && guard > begin && write > guard && commit > write,
    'required order: BEGIN, competing-edit recheck, content UPDATE, COMMIT');
  // A row lock on existing audit rows cannot protect against a new audit insertion.
  // Advisory locks require other writers to use the same key (integration concern).
  const lock = apply.findIndex(q => /pg_advisory_xact_lock\s*\(/i.test(q) ||
    /LOCK TABLE\s+content_edit_events\s+IN\s+(?:SHARE(?: ROW EXCLUSIVE)?|EXCLUSIVE|ACCESS EXCLUSIVE)\s+MODE/i.test(q));
  assert.ok(lock > begin && lock < guard,
    'competing-edit recheck must follow a transaction-scoped writer lock');
  assert.equal(apply.slice(guard, write).some(q => /^(COMMIT|ROLLBACK)\b/i.test(q)), false);
});

test('an edit arriving after preflight refuses apply without changing content', async () => {
  const conflicts = [];
  const { T, pg, trace } = harness(conflicts);
  assert.equal((await T.guardLive(pg)).problems.length, 0);
  conflicts.push({ id: 'late-competing-edit', surface: 'another-worker' });
  const start = trace.length;
  await assert.rejects(T.applyContent(pg, {}, {}), /another surface edited seed 599 today/);
  const apply = trace.slice(start);
  assert.equal(apply.some(q => /^UPDATE\b/i.test(q)), false, 'conflict must prevent content writes');
  assert.ok(apply.some(q => /^ROLLBACK\b/i.test(q)), 'refusal must release the transaction');
});
