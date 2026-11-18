// FREE-ALLOWANCE PROVIDERS (job #525): ABAIR's alerts are allowance, not spend, and go to Kai's room, never Tom's board;
// a daily fair-use cap still stops it. Run: npx vitest run services/shared/tts-spend-guard.allowance.test.cjs
import { describe, it, expect } from 'vitest'
const fs = require('fs'), os = require('os'), path = require('path')
const { createSpendGuard, noticeRoute, dailyLineMessage, DEFAULT_BUDGETS } = require('./tts-spend-guard.cjs')

const lookedUp = async (voiceId, text) => (await require('./clip-library.cjs').lookupForRender({ text, language: 'gle', voiceId, voiceBound: true }, require('./clip-library.cjs').memoryClipLibrary([]))).ticket

describe('ABAIR is a free allowance with a fair-use cap', () => {
  it('has its own budget: the key\'s 100k tokens/day = 12,500 chars stop, alert at 10,000', () => {
    expect(DEFAULT_BUDGETS.abair).toMatchObject({ dailyCapChars: 12_500, alertDailyChars: 10_000 })
  })

  it('its alert says allowance, not spend, and goes to Kai\'s room — never the needs-you board', () => {
    const msg = dailyLineMessage('abair', 10_004, DEFAULT_BUDGETS.abair)
    expect(msg).toMatch(/free allowance/); expect(msg).toMatch(/80,032 ABAIR tokens/); expect(msg).not.toMatch(/spend today/)
    const r = noticeRoute({ provider: 'abair', level: 'warn', message: msg }, 'h')
    expect(r).toMatchObject({ kind: 'person', toPerson: 'kai', relay: 'abair-allowance' })
    expect(r.text).toMatch(/^ABAIR ALLOWANCE NOTICE on h:/)
    expect(noticeRoute({ provider: 'abair', level: 'trip', message: 'x' }, 'h').text).toMatch(/FAIR-USE GUARD STOPPED/)
  })

  it('a paid provider is unchanged: spend wording, needs-you card', () => {
    expect(dailyLineMessage('cartesia', 300_001, DEFAULT_BUDGETS.cartesia)).toMatch(/^cartesia spend today has reached/)
    expect(noticeRoute({ provider: 'cartesia', level: 'warn', message: 'm' }, 'h')).toEqual({ kind: 'needs-you', text: 'TTS SPEND ALERT on h: m' })
  })

  it('the guard alerts at 10,000 with the allowance words and stops past 12,500', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'allowance-'))
    const sent = []
    const g = createSpendGuard({ ledgerPath: path.join(dir, 'ledger.jsonl'), budgetPath: null, now: () => Date.parse('2026-11-09T12:00:00Z'), notify: (e) => sent.push(e), usageReaders: {}, logger: { warn() {}, error() {} } })
    g.store.totalCapChars = Infinity; g.store.totalCeilingChars = Infinity
    const text = 'x'.repeat(250)
    let refused = null
    for (let i = 0; i < 60 && !refused; i++) {
      const t = `${text}${i}`
      await g.beforeProviderCall({ provider: 'abair', voiceId: 'abair_neasa', text: t, courseCode: 'gle_for_eng', job: '#525', ticket: await lookedUp('abair_neasa', t) }).catch(e => { refused = e })
    }
    expect(refused && refused.code).toBe('DAILY_CAP')
    const daily = sent.find(e => /free allowance used today/.test(e.message))
    expect(daily).toBeTruthy()
    expect(sent.some(e => /abair spend today/.test(e.message))).toBe(false)
  })
})
