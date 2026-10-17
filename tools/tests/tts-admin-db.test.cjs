const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

test('TTS admin CLIs use the shared connection, print scalar results and close on success or failure', async () => {
  for (const tool of ['../tts-cap.cjs', '../audio/rerecord-permission.cjs']) {
    for (const fail of [false, true]) {
      let connected = 0, ended = 0, queries = 0
      const output = [], errors = []
      const client = {
        async query(sql) {
          queries++
          assert.match(sql, /^select /i)
          if (fail) throw new Error('query failed')
          return { rows: [{ result: 'mock status' }] }
        },
        async end() { ended++ },
      }
      const processMock = { argv: ['node', tool, 'status'], env: {}, exitCode: 0 }
      const context = vm.createContext({
        require(name) {
          if (name.endsWith('/agent-db.cjs')) return { async connect() { connected++; return client } }
          throw new Error(`Unexpected dependency: ${name}`)
        },
        process: processMock,
        console: { log: value => output.push(value), error: value => errors.push(String(value)) },
      })
      vm.runInContext(fs.readFileSync(path.join(__dirname, tool), 'utf8'), context)
      await new Promise(resolve => setImmediate(resolve))
      assert.equal(connected, 1, `${tool} must use shared connection`)
      assert.equal(ended, 1, `${tool} must close even after failure`)
      assert.equal(queries, fail ? 1 : tool.includes('tts-cap') ? 3 : 1)
      assert.deepEqual(output, fail ? [] : Array(queries).fill('mock status'))
      assert.equal(processMock.exitCode, fail ? 1 : 0)
      assert.deepEqual(errors, fail ? ['query failed'] : [])
    }
  }
})
