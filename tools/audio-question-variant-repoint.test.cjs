'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const fs = require('node:fs')
const path = require('node:path')

test('--render checks each library miss against the remaining character allowance before spending', async () => {
  for (const max of [1, 10, 18]) {
    const requests = [], evidence = []
    const rows = ['Onde era?', 'Onde foi?'].map((txt, i) => ({ kind: 'phrase', row_id: String(i), course_code: 'por_for_eng', side: 'target1', txt, aid: `old${i}`, language: 'por', role: 'target1', voice_id: 'voice', origin: 'tts', want_key: txt }))
    class Client {
      async connect() {}
      async end() {}
      async query(sql) { return sql.includes('WITH links') ? { rows } : { rowCount: 1 } }
    }
    const context = {
      require(name) {
        if (name === 'fs') return { writeFileSync(p, s) { evidence.push(JSON.parse(s)) } }
        if (name === 'pg') return { Client }
        if (name === './lib/evidence-path.cjs') return { evidencePath: x => x }
        return require(name)
      },
      module: { exports: {} }, __dirname: __dirname,
      process: { argv: ['node', 'tool', '--render', '--max-chars', String(max)], env: { DATABASE_URL: 'stub' } },
      console: { log() {} }, AbortSignal, setTimeout,
      async fetch(url, opts) {
        const body = JSON.parse(opts.body)
        requests.push(body)
        return { ok: true, status: 200, async json() { return body.dryRun ? { ok: true, source: 'rendered', wouldSpendChars: body.text.length } : { ok: true, source: 'rendered', charsSpent: body.text.length, audioId: 'new' } } }
      },
    }
    vm.createContext(context)
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'audio-question-variant-repoint.cjs'), 'utf8'), context)
    await vm.runInContext('main()', context)
    const paid = requests.filter(r => !r.dryRun)
    assert.equal(paid.length, max === 1 ? 0 : max === 10 ? 1 : 2)
    assert.ok(paid.reduce((n, r) => n + r.text.length, 0) <= max)
    assert.equal(evidence.at(-1).spent, paid.length * 9)
  }
})
