/**
 * The lab's identity check is remembered per token for a few seconds: a warm
 * visit makes several lab calls and each used to re-run ~1 s of auth, twice.
 * Run: npx vitest run services/voicelab/router.gate-memo.test.cjs
 */
import { describe, it, expect, afterAll } from 'vitest'
import express from 'express'
import routerPkg from './router.cjs'
const { mount } = routerPkg

describe('lab gate memo', () => {
  let server
  afterAll(() => server && server.close())

  it('asks the real gate once per token, and re-asks after a refusal', async () => {
    let admin = 0
    const app = express()
    mount(app, {
      requireAdmin: async (req, res) => { admin += 1; if (req.headers.authorization === 'bad') { res.status(403).json({ error: 'no' }); return null } return { email: 'a@b' } },
      requireDashboardUser: async () => ({ email: 'a@b' }),
      logger: { log: () => {} },
      supabase: () => ({ from: () => ({}) }),
    })
    await new Promise((r) => { server = app.listen(0, r) })
    const url = `http://127.0.0.1:${server.address().port}/api/voicelab/params`
    const call = (tok) => fetch(url, { headers: { authorization: tok } }).then((r) => r.status)
    await call('good'); await call('good'); await call('good')
    expect(admin).toBe(1)
    expect(await call('bad')).toBe(403)
    expect(await call('bad')).toBe(403)
    expect(admin).toBe(3)
  })
})
