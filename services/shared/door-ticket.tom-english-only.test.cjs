// Tom 2026-10-12: "obviously we're not using my voice for non-English - why would you think that?" (job #113).
// Tom's voice clones speak English only: no paid render may send non-English words in them, whoever asks.
import { describe, it, expect } from 'vitest'
const chain = require('./chain-context.cjs')
const { issueTicket, ticketProblem } = require('./door-ticket.cjs')

const TOM_006 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const ask = (voiceId, language, text = 'hello there') => chain.run('test:tom-english-only', async () => {
  const ticket = issueTicket({ language, voiceId, text })
  return ticketProblem(ticket, { voiceId, text })
})

describe('Tom voices are English-only at the paid-render ticket', () => {
  it('refuses Tom-006 on a non-English line', async () => {
    expect((await ask(TOM_006, 'hin'))?.code).toBe('TOM_VOICE_ENGLISH_ONLY')
    expect((await ask(TOM_006, 'cym'))?.code).toBe('TOM_VOICE_ENGLISH_ONLY')
  })
  it('refuses the bare uuid spelling and the older Tom clones too', async () => {
    expect((await ask('d293d509-eb96-4df4-8cfd-80a693aa49a9', 'spa'))?.code).toBe('TOM_VOICE_ENGLISH_ONLY')
    expect((await ask('cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2', 'fra'))?.code).toBe('TOM_VOICE_ENGLISH_ONLY')
    expect((await ask('xai_gfzdpspr5fdp', 'deu'))?.code).toBe('TOM_VOICE_ENGLISH_ONLY')
  })
  it('refuses when the language is not stated (not knowing is not permission)', async () => {
    expect((await ask(TOM_006, null))?.code).toBe('TOM_VOICE_ENGLISH_ONLY')
  })
  it('lets Tom-006 speak English, in any spelling of English', async () => {
    expect(await ask(TOM_006, 'eng')).toBeNull()
    expect(await ask(TOM_006, 'en')).toBeNull()
  })
  it('leaves every other voice alone', async () => {
    expect(await ask('cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', 'hin')).toBeNull()
  })
})
