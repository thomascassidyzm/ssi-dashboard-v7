'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const filename = path.join(__dirname, 'basecamp-column-watch.cjs');
const source = fs.readFileSync(filename, 'utf8');

// Exercise the CLI entry point without Basecamp, database access or real HTTP.
async function notice(args, env, files) {
  const calls = [];
  const reads = [];
  let finish;
  let exited = false;
  const done = new Promise((resolve) => { finish = resolve; });
  vm.runInNewContext(source, {
    __dirname,
    require(name) {
      if (!['fs', 'path', 'os', 'child_process', 'crypto'].includes(name)) {
        throw new Error(`Unexpected dependency: ${name}`);
      }
      if (name === 'child_process') return { execFileSync() { throw new Error('Basecamp forbidden in this test'); } };
      if (name !== 'fs') return require(name);
      return {
        readFileSync(file) {
          reads.push(file);
          if (!(file in files)) throw new Error('fixture file missing');
          return files[file];
        },
      };
    },
    process: {
      argv: ['node', filename, '--test-notice', ...args], env,
      exit(code) {
        if (exited) return;
        exited = true;
        finish(code);
        throw new Error('mock process exit');
      },
    },
    console: { log() {}, error() {} },
    AbortSignal,
    fetch: async (url, options) => {
      calls.push({ url, ...options });
      return { ok: true };
    },
  }, { filename });
  const code = await done;
  return { code, calls, reads };
}

test('--test-notice honours --dry-run without sending a notice', async () => {
  const r = await notice(['--dry-run'], { CS_SESSION_FILE: '/fleet' }, { '/fleet': 'v2.fixture' });
  assert.equal(r.calls.length, 0, 'dry-run must not POST to Watson');
});

test('--test-notice uses the configured Deborah session without a fleet session', async () => {
  const r = await notice([], {
    DEBORAH_WATCH_SESSION: '/kai', CS_SESSION_FILE: '/missing-fleet',
  }, { '/kai': 'v2.kai-fixture' });
  assert.equal(r.calls.length, 1, 'the configured Kai session should allow the test notice');
  assert.equal(r.calls[0].headers.Cookie, 'cs_user=v2.kai-fixture');
  assert.equal(r.code, 0);
});
