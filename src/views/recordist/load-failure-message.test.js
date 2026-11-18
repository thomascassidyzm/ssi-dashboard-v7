import { describe, it, expect } from 'vitest'
import { loadFailureMessage } from './load-failure-message.js'

describe('loadFailureMessage', () => {
  it("shows the API's own sentence for a retryable 503 (practice phrases still loading)", () => {
    const body = { error: 'The practice phrases are still loading. Please try again in a minute.', retryable: true }
    expect(loadFailureMessage({ status: 503 }, body)).toBe(body.error)
  })
  it('keeps the status code for a failure that is not retryable', () => {
    expect(loadFailureMessage({ status: 500 }, { error: 'boom' })).toBe('Could not load your lines (500)')
    expect(loadFailureMessage({ status: 502 }, {})).toBe('Could not load your lines (502)')
  })
})
