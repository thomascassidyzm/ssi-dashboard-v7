import { afterEach, describe, expect, it, vi } from 'vitest'
const createRouter = require('./activity.cjs')
afterEach(() => vi.restoreAllMocks())

async function remove(pid, tracked = true, status = 'running') {
  const kill = vi.spyOn(process, 'kill').mockReturnValue(true)
  const agent = { courseCode: 'spa_for_eng', status, submissions: [] }
  const ctx = { activeAgents: new Map(tracked ? [[Number(pid), agent]] : []) }
  const router = createRouter(ctx)
  const req = { method: 'DELETE', url: `/agents/${pid}`, headers: {} }
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this } }
  await new Promise((resolve, reject) => {
    res.json = function(body) { this.body = body; resolve() }
    router.handle(req, res, reject)
  })
  return { res, kill, agent }
}

describe('agent deletion only signals a tracked running positive PID', () => {
  it.each(['0', '-1', '-4242', '1.5', 'NaN', 'Infinity', '9007199254740992'])('rejects unsafe PID %s even if registered', async pid => {
    const { res, kill, agent } = await remove(pid)
    expect(res.statusCode).toBe(400)
    expect(kill).not.toHaveBeenCalled()
    expect(agent.status).toBe('running')
  })
  it('refuses an unregistered process', async () => {
    const { res, kill } = await remove('4242', false)
    expect(res.statusCode).toBe(404)
    expect(kill).not.toHaveBeenCalled()
  })
  it('refuses a completed agent whose PID could have been reused', async () => {
    const { res, kill } = await remove('4242', true, 'complete')
    expect(res.statusCode).toBe(409)
    expect(kill).not.toHaveBeenCalled()
  })
  it('terminates a tracked running agent', async () => {
    const { res, kill, agent } = await remove('4242')
    expect(res.statusCode).toBe(200)
    expect(kill).toHaveBeenCalledWith(4242, 'SIGTERM')
    expect(agent.status).toBe('complete')
  })
})
