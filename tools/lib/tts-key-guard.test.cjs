const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { mayHoldLiveKey, liveKeyLines } = require('./tts-key-guard.cjs')

function checkout(root, guarded) {
  fs.mkdirSync(path.join(root, '.git'), { recursive: true })
  if (guarded) {
    fs.mkdirSync(path.join(root, 'services', 'shared'), { recursive: true })
    fs.mkdirSync(path.join(root, 'ops', 'sql'), { recursive: true })
    fs.writeFileSync(path.join(root, 'services', 'shared', 'tts-spend-guard.cjs'), 'const DAILY_TOTAL_CAP = 1')
    fs.writeFileSync(path.join(root, 'ops', 'sql', '20260929-tts-spend-total-cap.sql'), '')
  }
  fs.writeFileSync(path.join(root, '.env'), 'CARTESIA_API_KEY=sk_live\n')
}

test('a live key may sit only in the real .env of a guarded checkout', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ttskey-'))
  checkout(path.join(d, 'guarded'), true)
  checkout(path.join(d, 'old'), false)
  assert.ok(mayHoldLiveKey(path.join(d, 'guarded', '.env')))
  assert.ok(!mayHoldLiveKey(path.join(d, 'old', '.env')))
  fs.copyFileSync(path.join(d, 'guarded', '.env'), path.join(d, 'guarded', '.env.bak'))
  assert.ok(!mayHoldLiveKey(path.join(d, 'guarded', '.env.bak')), 'a backup copy is not the checkout .env')
  // a guarded worktree whose .env links into a pre-guard checkout is only as guarded as that checkout
  checkout(path.join(d, 'wt'), true); fs.rmSync(path.join(d, 'wt', '.env')); fs.symlinkSync(path.join(d, 'old', '.env'), path.join(d, 'wt', '.env'))
  assert.ok(!mayHoldLiveKey(path.join(d, 'wt', '.env')))
  assert.equal(liveKeyLines(path.join(d, 'guarded', '.env')).length, 1)
  fs.writeFileSync(path.join(d, 'old', '.env'), 'CARTESIA_API_KEY=STOPPED-BY-TOM-x\n')
  assert.equal(liveKeyLines(path.join(d, 'old', '.env')).length, 0)
})
