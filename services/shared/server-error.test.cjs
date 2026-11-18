// serverError must be byte-for-byte what the folded catches did: the logger
// gets (tag, err) — the error OBJECT, so the stack still reaches the log —
// and the response is status 500 with exactly { error: err.message }.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { serverErrorResponder } = require('./server-error.cjs')

function fakes() {
  const log = []
  const logger = { error: (...args) => log.push(args) }
  const sent = {}
  const res = { status(code) { sent.status = code; return res }, json(body) { sent.body = body; return res } }
  return { logger, log, res, sent }
}

describe('serverErrorResponder', () => {
  it('logs the tag and the error object itself, then answers 500 { error: message }', () => {
    const { logger, log, res, sent } = fakes()
    const serverError = serverErrorResponder(logger)
    const err = new Error('canceling statement due to statement timeout')
    serverError(res, 'Failed to get stats for fra_for_eng:', err)
    expect(log).toEqual([['Failed to get stats for fra_for_eng:', err]])
    expect(log[0][1]).toBe(err) // the object, not its message: the stack reaches the log
    expect(sent.status).toBe(500)
    expect(sent.body).toEqual({ error: 'canceling statement due to statement timeout' })
    expect(Object.keys(sent.body)).toEqual(['error']) // no envelope, no extra keys
  })

  it('passes a message-less throw through unchanged (error: undefined, as err.message was)', () => {
    const { logger, res, sent } = fakes()
    const serverError = serverErrorResponder(logger)
    serverError(res, 'tag', { code: 'PGRST116' })
    expect(sent.status).toBe(500)
    expect(sent.body).toEqual({ error: undefined })
    expect(JSON.stringify(sent.body)).toBe('{}')
  })
})
