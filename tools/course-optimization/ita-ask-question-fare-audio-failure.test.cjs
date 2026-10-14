'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Exercise the merged CLI without connecting to a database or rendering audio.
test('AUDIO=1 reports failure when the render service refuses a missing slot', async () => {
  const filename = path.join(__dirname, 'ita-ask-question-fare-2026-10-14.cjs');
  const nativeRequire = createRequire(filename);
  let db, requests = 0;
  class Client {
    async connect() {}
    on() {}
    async end() {}
    async query(sql) {
      if (sql.includes('FROM course_practice_phrases')) return { rows: db.phrases };
      if (sql.includes('JOIN course_audio')) return { rows: db.intros };
      if (sql.includes('FROM course_legos')) return { rows: db.legos };
      if (sql.includes('FROM course_seeds')) return { rows: db.seeds };
      throw new Error(`Unexpected SQL: ${sql}`);
    }
  }
  const proc = { env: { AUDIO: '1' }, exitCode: 0 };
  const context = vm.createContext({
    require: (name) => name === 'pg' ? { Client } : name === 'dotenv' ? { config() {} } : nativeRequire(name),
    module: { exports: {} }, __dirname, process: proc,
    console: { log() {}, error() {} },
    fetch: async () => { requests++; return { status: 503, json: async () => ({ ok: false, error: 'Phase 8 unavailable' }) }; },
  });
  vm.runInContext(fs.readFileSync(filename, 'utf8') + '\nmodule.exports.reviewMain = main;', context, { filename });
  const T = context.module.exports;
  const clips = { known_audio_id: 'known', target1_audio_id: 'one', target2_audio_id: 'two' };
  db = {
    phrases: T.NEW_190.map(r => ({ ...clips, id: `ita_for_eng:${r.id}`, sid: r.id, seed_number: 190, phrase_role: r.role, known_text: r.known, target_text: r.target })),
    legos: T.NEW_LEGOS.map(l => ({ ...clips, lego_id: l.id, seed_number: 190, is_new: true, known_text: l.known, target_text: l.target, presentation_audio_id: 'intro' })),
    seeds: [], intros: [],
  };
  db.phrases.push({ ...clips, id: `ita_for_eng:${T.EDIT_223.id}`, sid: T.EDIT_223.id, seed_number: 223, phrase_role: 'use', known_text: T.EDIT_223.after[0], target_text: T.EDIT_223.after[1] });
  db.phrases[0].known_audio_id = null;
  await T.reviewMain();
  assert.equal(requests, 2, 'dry and real attempts both reached the refused slot');
  assert.notEqual(proc.exitCode, 0, 'failed audio must not be reported as CLI success');
});
