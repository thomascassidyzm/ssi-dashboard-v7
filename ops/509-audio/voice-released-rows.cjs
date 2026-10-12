#!/usr/bin/env node
// Job #29: the 509 phrase replacements released by #13 (ids = replace entries in the phrase-quality undo ledgers
// stamped 2026-10-12 >= 13:00Z) have NULL audio ids on every replaced side, so the player skips them. Voice each
// missing side through phase8 /regenerate-phrase (library-first, cast voices: target1 Charlotte, target2 Tom-006,
// known = course cast), which persists nothing but the audio ids. Roles = only the sides whose audio id is NULL.
//   node ops/509-audio/voice-released-rows.cjs ids.txt [--go] [--course X] [--concurrency 4]
const fs = require('fs'), path = require('path'), http = require('http')
require('dotenv').config({ path: path.join(__dirname, '../../.env.psql'), quiet: true })
const { Client } = require('pg')
const argv = process.argv.slice(2), has = f => argv.includes(f), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const ids = fs.readFileSync(argv[0], 'utf8').split('\n').map(s => s.trim()).filter(Boolean)
const only = opt('--course'), conc = Number(opt('--concurrency', 4)), GO = has('--go')
const logf = path.join(__dirname, 'voice-log.jsonl')
const post = (p, body) => new Promise((ok, no) => {
  const d = JSON.stringify(body), r = http.request({ host: 'localhost', port: 3465, path: p, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d) } }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { ok({ status: res.statusCode, body: JSON.parse(b) }) } catch { ok({ status: res.statusCode, body: b.slice(0, 200) }) } }) })
  r.setTimeout(300000, () => r.destroy(new Error('timeout'))); r.on('error', no); r.end(d)
})
;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect()
  const { rows } = await c.query('select id, course_code, known_audio_id k, target1_audio_id t1, target2_audio_id t2 from course_practice_phrases where id = any($1)', [ids]); await c.end()
  const todo = rows.filter(r => !only || r.course_code === only).map(r => ({ ...r, roles: [!r.k && 'known', !r.t1 && 'target1', !r.t2 && 'target2'].filter(Boolean) })).filter(r => r.roles.length)
  console.log(`${rows.length} rows, ${todo.length} need audio (${todo.reduce((n, r) => n + r.roles.length, 0)} clips)${GO ? '' : ' — plan only, pass --go'}`)
  if (!GO) return
  const q = [...todo]; let okN = 0, bad = 0
  await Promise.all(Array.from({ length: conc }, async () => {
    for (let r; (r = q.shift()); ) {
      // phase8 is restarted by deploys mid-run: a dropped connection (status 0) waits and retries; a real refusal (4xx/5xx answer) never does.
      let out
      for (let a = 0; a < 8; a++) {
        try { out = await post(`/regenerate-phrase/${r.course_code}/${encodeURIComponent(r.id)}`, { roles: r.roles }) } catch (e) { out = { status: 0, body: String(e.message) } }
        if (out.status !== 0) break
        await new Promise(res => setTimeout(res, 20000))
      }
      const good = out.status === 200; good ? okN++ : bad++
      fs.appendFileSync(logf, JSON.stringify({ at: new Date().toISOString(), id: r.id, roles: r.roles, status: out.status, body: good ? undefined : out.body }) + '\n')
      if (!good) console.log('FAIL', r.id, out.status, JSON.stringify(out.body).slice(0, 200))
    }
  }))
  console.log(`done: ${okN} ok, ${bad} failed`)
})()
