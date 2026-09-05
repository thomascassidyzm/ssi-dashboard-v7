import { describe, it, expect, beforeEach, afterEach } from 'vitest'

const fs = require('fs-extra')
const os = require('os')
const path = require('path')
const { markWorkInFlight, clearWorkInFlight, reportWorkLostOnRestart } = require('./phase8-in-flight.cjs')

// The rule: a phase 8 restart that ate an in-flight render must not look like a clean start.

let dir, breadcrumbPath, logged

const logger = {
  error: (m) => logged.push(['error', m]),
  warn: (m) => logged.push(['warn', m])
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase8-inflight-'))
  breadcrumbPath = path.join(dir, 'in-flight.json')
  logged = []
})
afterEach(() => fs.removeSync(dir))

const WORK = {
  operation: 'generate', courseCode: 'eng_for_hin', role: 'target1',
  current: 412, total: 4000, startedAt: '2026-09-05T10:00:00.000Z'
}

describe('phase 8 in-flight breadcrumb', () => {
  it('a restart with work in flight reports the loss loudly, naming the operation and course', () => {
    markWorkInFlight(WORK, { breadcrumbPath, logger })

    const lost = reportWorkLostOnRestart({ breadcrumbPath, logger })

    expect(lost.courseCode).toBe('eng_for_hin')
    expect(lost.current).toBe(412)
    const [level, message] = logged.find(([, m]) => m.includes('LOST WORK'))
    expect(level).toBe('error')
    expect(message).toContain('generate')
    expect(message).toContain('eng_for_hin')
    expect(message).toContain('412/4000')
    expect(message).toContain('NOT resumed')
  })

  it('work that ended cleanly leaves nothing to report', () => {
    markWorkInFlight(WORK, { breadcrumbPath, logger })
    clearWorkInFlight({ breadcrumbPath, logger })

    expect(reportWorkLostOnRestart({ breadcrumbPath, logger })).toBeNull()
    expect(logged).toHaveLength(0)
  })

  it('the loss is reported once, not on every subsequent restart', () => {
    markWorkInFlight(WORK, { breadcrumbPath, logger })
    reportWorkLostOnRestart({ breadcrumbPath, logger })

    expect(reportWorkLostOnRestart({ breadcrumbPath, logger })).toBeNull()
    expect(logged.filter(([, m]) => m.includes('LOST WORK'))).toHaveLength(1)
  })

  it('an unreadable breadcrumb still says work was in flight', () => {
    fs.writeFileSync(breadcrumbPath, '{ not json')

    expect(reportWorkLostOnRestart({ breadcrumbPath, logger })).toBeNull()
    expect(logged[0][0]).toBe('error')
    expect(logged[0][1]).toContain('in flight')
  })
})
