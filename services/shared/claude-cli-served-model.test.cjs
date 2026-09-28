/**
 * A provenance stamp names the model that ACTUALLY answered (#675, Astra #664 finding 3).
 * The shape below is real `claude --print --output-format json` output (2026-09-28, CLI 2.1.284),
 * trimmed; the error shape is the one a logged-out or limited account returns.
 */
import { describe, it, expect } from 'vitest'
import pkg from './claude-cli.cjs'
const { parseCliJson } = pkg

describe('parseCliJson', () => {
  it('reads the served id from modelUsage, not from any catalogue', () => {
    const raw = JSON.stringify({ type: 'result', is_error: false, result: '{"verdicts":[]}',
      modelUsage: { 'claude-haiku-4-5-20251001': { outputTokens: 32 } } })
    expect(parseCliJson(raw)).toEqual({ text: '{"verdicts":[]}', model: 'claude-haiku-4-5-20251001',
      models: ['claude-haiku-4-5-20251001'], isError: false })
  })
  it('picks the model that wrote the answer when a helper model also ran', () => {
    const raw = JSON.stringify({ is_error: false, result: 'x',
      modelUsage: { 'claude-haiku-4-5': { outputTokens: 12 }, 'claude-opus-7': { outputTokens: 900 } } })
    expect(parseCliJson(raw).model).toBe('claude-opus-7')
  })
  it('says unknown rather than guessing when nothing ran', () => {
    const r = parseCliJson(JSON.stringify({ is_error: true, result: 'Not logged in · Please run /login', modelUsage: {} }))
    expect(r.model).toBe(null); expect(r.isError).toBe(true)
    expect(parseCliJson('claude: command not found').model).toBe(null)
  })
})
