/**
 * Dice and splice (services/shared/intro-splice.cjs): an English-known presentation intro is built from existing Charlotte
 * clips; only a piece that exists nowhere is rendered. These are the cases that fail without the assembly (job #516).
 */
import { describe, it, expect, vi } from 'vitest'
import splice from './intro-splice.cjs'
import policy from './voicing-policy.cjs'
const { parseIntro, planIntro, spliceIntro, joinPcm, encodeWav, SAMPLE_RATE } = splice

const SPA_MX = { course_code: 'spa_mx_for_eng', known_lang: 'eng', target_lang: 'spa', voice_pool_key: 'spa_mx' }
const ENG_FOR_SPA = { course_code: 'eng_for_spa', known_lang: 'spa', target_lang: 'eng' }
const tone = (ms, amp, hz = 220) => Float32Array.from({ length: Math.round(ms * SAMPLE_RATE / 1000) }, (_, i) => amp * Math.sin(2 * Math.PI * hz * i / SAMPLE_RATE))
const maxStep = x => { let m = 0; for (let i = 1; i < x.length; i++) m = Math.max(m, Math.abs(x[i] - x[i - 1])); return m }

describe('parseIntro', () => {
  it('reads both stored templates, with and without the colon and the em dash', () => {
    expect(parseIntro("The Spanish for: 'last week', as in — 'He wrote last week.', is:")).toMatchObject({ x: 'last week', context: 'He wrote last week.' })
    expect(parseIntro("The Spanish for 'I think', as in 'I think you left them at work.', is:")).toMatchObject({ x: 'I think', context: 'I think you left them at work.' })
    expect(parseIntro("The German for: 'job', is:")).toMatchObject({ x: 'job', context: null })
    expect(parseIntro("The German for: 'I need', as in — 'I don't know who you mean', is:").context).toBe("I don't know who you mean")
  })
  it('refuses a text that is not a standard intro', () => {
    expect(parseIntro('hello there')).toBeNull()
    expect(parseIntro("The Spanish for: 'a', as in — '', is:")).toBeNull()
  })
})

describe('planIntro', () => {
  it("spa_mx names the BASE language: 'The Spanish for', never 'The Mexican Spanish for'", () => {
    const plan = planIntro("The Mexican Spanish for: 'five', as in — 'I have five', is:", SPA_MX)
    expect(plan.pieces.map(p => p.text)).toEqual(['The Spanish for', 'five', 'as in', 'I have five', 'is'])
    expect(plan.pieces[0].role).toBe('presentation')
    expect(plan.voiceId).toBe(policy.config.englishVoice)
  })
  it('is null for a course not taught from English', () => {
    expect(planIntro("The Spanish for: 'five', is:", ENG_FOR_SPA)).toBeNull()
  })
})

describe('joinPcm — the seam', () => {
  it('every piece starts and ends on zero, so a seam cannot click; a naive butt-join of the same pieces does', () => {
    const a = tone(301.3, 0.5), b = tone(253.1, 0.5, 330), c = tone(207.7, 0.5, 180)
    const naive = new Float32Array(a.length + b.length + c.length); naive.set(a, 0); naive.set(b, a.length); naive.set(c, a.length + b.length)
    const { pcm, seams } = joinPcm([a, b, c], [180, 220])
    expect(maxStep(naive)).toBeGreaterThan(0.2)           // the click a butt-join makes (a tone cut mid-cycle)
    expect(maxStep(pcm)).toBeLessThan(0.1)                // the fade removes it
    for (const s of seams) { expect(pcm[s.at - 1]).toBe(0); expect(pcm[s.at + s.len]).toBe(0) }
    expect(pcm[0]).toBe(0); expect(pcm[pcm.length - 1]).toBe(0)
  })
  it('leaves the natural gap between pieces', () => {
    const { seams } = joinPcm([tone(200, 0.4), tone(200, 0.4)], [200])
    expect(seams[0].len).toBe(Math.round(0.2 * SAMPLE_RATE))
  })
  it('evens a quiet piece against a loud one, within 6 dB', () => {
    const rms = x => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length)
    const quiet = tone(300, 0.04), loud = tone(300, 0.4), mid = tone(300, 0.15)
    const { pcm, seams } = joinPcm([quiet, mid, loud], [100, 100])
    const first = pcm.slice(0, seams[0].at), last = pcm.slice(seams[1].at + seams[1].len)
    expect(rms(last) / rms(first)).toBeLessThan(10 ** (12 / 20) + 0.01)   // was 10x (20 dB) apart; ±6 dB each side leaves ≤ 12 dB
    expect(rms(last) / rms(first)).toBeLessThan(10)
  })
  it('refuses an empty piece instead of splicing silence', () => {
    expect(() => joinPcm([tone(200, 0.4), new Float32Array(4000)], [100])).toThrow(/silent/)
  })
})

describe('spliceIntro — only what exists nowhere is rendered', () => {
  const TEXT = "The Mexican Spanish for: 'five', as in — 'I have five', is:"
  const wav = () => encodeWav(tone(300, 0.4))
  const deps = (existing, extra = {}) => {
    const d = {
      findClip: vi.fn(async text => (existing.includes(text) ? { id: `id:${text}`, s3_key: `k/${text}` } : null)),
      renderPiece: vi.fn(async ({ text }) => ({ audioId: `new:${text}`, s3Key: `k/${text}`, charsSpent: text.length })),
      fetchObject: vi.fn(async () => wav()),
      master: vi.fn(async buf => ({ buffer: buf, durationMs: 1500 })),
      store: vi.fn(async () => ({ audioId: 'spliced-1', s3Key: 'mastered/X.mp3' })),
      ...extra,
    }
    return d
  }
  const req = (o = {}) => ({ text: TEXT, course: SPA_MX, courseCode: 'spa_mx_for_eng', legoId: 'S0001L01', ...o })

  it('zero new characters when every piece exists', async () => {
    const d = deps(['The Spanish for', 'five', 'as in', 'I have five', 'is'])
    const out = await spliceIntro(req(), d)
    expect(out).toMatchObject({ ok: true, source: 'spliced', charsSpent: 0, audioId: 'spliced-1' })
    expect(d.renderPiece).not.toHaveBeenCalled()
    const call = d.store.mock.calls[0][0]
    expect(call.text).toBe(TEXT)                                   // stored under the intro's own text, as a normal presentation clip
    expect(call.splicedFrom.map(p => p.audio_id)).toEqual(['id:The Spanish for', 'id:five', 'id:as in', 'id:I have five', 'id:is'])
    expect(call.durationMs).toBe(1500)
  })
  it("renders just the one missing piece ('The Spanish for'), as a presentation fragment", async () => {
    const d = deps(['five', 'as in', 'I have five', 'is'])
    const out = await spliceIntro(req(), d)
    expect(d.renderPiece).toHaveBeenCalledTimes(1)
    expect(d.renderPiece).toHaveBeenCalledWith({ text: 'The Spanish for', role: 'presentation' })
    expect(out.charsSpent).toBe('The Spanish for'.length)
    expect(out.pieces.find(p => p.kind === 'fragment').reused).toBe(false)
  })
  it('a dry run spends and writes nothing and says what it would render', async () => {
    const d = deps(['five', 'is'])
    const out = await spliceIntro(req({ dryRun: true }), d)
    expect(out).toMatchObject({ source: 'would-splice', charsSpent: 0, wouldSpendChars: 'The Spanish for'.length + 'as in'.length + 'I have five'.length })
    expect(d.renderPiece).not.toHaveBeenCalled(); expect(d.store).not.toHaveBeenCalled(); expect(d.fetchObject).not.toHaveBeenCalled()
  })
  it('is null (normal path) for a text that is not an intro', async () => {
    expect(await spliceIntro(req({ text: 'five' }), deps([]))).toBeNull()
  })
  it('fails loudly, storing nothing, when a missing piece cannot be rendered', async () => {
    const d = deps([], { renderPiece: vi.fn(async () => null) })
    await expect(spliceIntro(req(), d)).rejects.toThrow(/could not render/)
    expect(d.store).not.toHaveBeenCalled()
  })
})

describe('the voicing policy still guards the whole intro', () => {
  // spa_mx_for_eng is a Tom-006 intro course now (resolveVoice intro-tom006), so the Charlotte splice rule is shown on deu_at_for_eng.
  it('refuses to render a whole intro but allows the base-language fragment for a Charlotte-intro variety (deu_at)', () => {
    const DEU_AT = { course_code: 'deu_at_for_eng', known_lang: 'eng', target_lang: 'deu', voice_pool_key: 'deu_at' }
    const base = { language: 'eng', voiceId: policy.config.englishVoice, course: DEU_AT, role: 'presentation' }
    expect(policy.checkRender({ ...base, text: "The German for: 'five', is:" }).allowed).toBe(false)
    expect(policy.checkRender({ ...base, text: 'The German for' }).allowed).toBe(true)
    expect(policy.checkRender({ ...base, text: 'The Austrian German for' }).allowed).toBe(false)
    expect(policy.checkRender({ ...base, course: SPA_MX, text: 'The Spanish for' }).allowed).toBe(false)
  })
})
const TEXT_WHOLE = "The Spanish for: 'five', is:"

describe('the render route hook', () => {
  it('a presentation request is answered by the splice and bound to its LEGO; a library hit still wins; the provider is never called', async () => {
    const { renderClip } = await import('./audio-render-entry.cjs')
    const base = () => ({
      resolve: async () => ({ language: 'eng', voiceId: policy.config.englishVoice, provider: 'cartesia', providerConfig: {} }),
      link: vi.fn(async () => null), speak: vi.fn(), store: vi.fn(),
      linkLego: vi.fn(async () => ({ linked: true })),
      spliceIntro: vi.fn(async () => ({ ok: true, source: 'spliced', audioId: 'sp1', s3Key: 'k', charsSpent: 15 })),
    })
    const body = { courseCode: 'spa_mx_for_eng', role: 'presentation', text: "The Spanish for: 'five', is:", legoId: 'S0001L01', purpose: 't', requestedBy: 't' }
    const d = base()
    const out = await renderClip(body, d)
    expect(out).toMatchObject({ source: 'spliced', audioId: 'sp1', legoLinked: true })
    expect(d.linkLego).toHaveBeenCalledWith({ courseCode: 'spa_mx_for_eng', legoId: 'S0001L01', audioId: 'sp1' })
    expect(d.speak).not.toHaveBeenCalled()
    const hit = base(); hit.link = vi.fn(async () => ({ audioId: 'lib', s3Key: 'k2' }))
    expect(await renderClip(body, hit)).toMatchObject({ source: 'library', audioId: 'lib' })
    expect(hit.spliceIntro).not.toHaveBeenCalled()
    const known = base(); await renderClip({ ...body, role: 'known' }, known).catch(() => {})
    expect(known.spliceIntro).not.toHaveBeenCalled()
  })
})
