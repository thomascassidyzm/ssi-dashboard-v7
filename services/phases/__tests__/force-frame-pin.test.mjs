/**
 * A LEGO whose introduction MUST carry its "as in" context can say so, and the
 * LLM frame judge cannot overrule it.
 *
 * THE DEFECT THIS PINS (2026-09-03, eng_for_hin). Hindi कल means both
 * "yesterday" and "tomorrow", so a कल chunk's introduction is the only place
 * the learner is told which one is wanted. The judge was run live on the six
 * bare कल chunks and answered Frame A — no context — for three of them
 * (कल सुबह, कल दोपहर, कल रात), because its Frame A criterion was "a clear
 * standalone word", and a two-sense word is exactly that. Being clean as a
 * word is the reason it needs the context, not a reason to drop it.
 *
 * The prompt now names that case, but a prompt is a hope. `forceFrame` is the
 * invariant: state the frame for a chunk a human has ruled on and the judge's
 * answer for that item is discarded, while the rest of the batch is judged
 * normally. Frame B is still refused when the context does not contain the
 * chunk, because quoting a sentence that fails to demonstrate the chunk is the
 * worse of the two failures — the same rule judgeBatch applies to itself.
 */
import { describe, it, expect, vi } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const presentationAuthor = require('../presentation-author.cjs')

const HINDI = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :"
const OPTS = { template: HINDI, targetLangName: 'अंग्रेज़ी', knownLangName: 'Hindi' }

/** The judge's real, observed answer for these chunks: bare. */
const judgeSaysBare = (items) => ({ frames: items.map(() => 'A'), flags: [] })

describe('forceFrame', () => {
  it('keeps the "as in" context on a two-sense chunk the judge would strip', async () => {
    const spy = vi.spyOn(presentationAuthor, 'judgeBatch').mockImplementation(async (items) => judgeSaysBare(items))
    const { authored } = await presentationAuthor.authorPresentations(null, null, [
      { lego_id: 'S0155L04', chunk: 'कल सुबह', form: 'tomorrow morning', seed: 'मैं कल सुबह मिलना चाहूँगा।', forceFrame: 'B' }
    ], OPTS)
    expect(authored[0].frame).toBe('B')
    expect(authored[0].text).toContain('जैसे')
    expect(authored[0].text).toContain('मैं कल सुबह मिलना चाहूँगा।')
    spy.mockRestore()
  })

  it('leaves unpinned items to the judge, in the same batch', async () => {
    const spy = vi.spyOn(presentationAuthor, 'judgeBatch').mockImplementation(async (items) => judgeSaysBare(items))
    const { authored } = await presentationAuthor.authorPresentations(null, null, [
      { chunk: 'कल सुबह', form: 'tomorrow morning', seed: 'मैं कल सुबह मिलना चाहूँगा।', forceFrame: 'B' },
      { chunk: 'मेरे साथ', form: 'with me', seed: 'और मैं चाहता हूँ कि आप मेरे साथ बोलें।' }
    ], OPTS)
    expect(authored.map(a => a.frame)).toEqual(['B', 'A'])
    spy.mockRestore()
  })

  it('refuses a pinned B whose context does not contain the chunk', async () => {
    const spy = vi.spyOn(presentationAuthor, 'judgeBatch').mockImplementation(async (items) => judgeSaysBare(items))
    const { authored } = await presentationAuthor.authorPresentations(null, null, [
      { chunk: 'कल रात', form: 'tomorrow night', seed: 'मुझे बहुत खुशी है।', forceFrame: 'B' }
    ], OPTS)
    expect(authored[0].frame).toBe('A')
    expect(authored[0].text).not.toContain('जैसे')
    spy.mockRestore()
  })

  it('can pin A as well, against a judge that says B', async () => {
    const spy = vi.spyOn(presentationAuthor, 'judgeBatch')
      .mockImplementation(async (items) => ({ frames: items.map(() => 'B'), flags: [] }))
    const { authored } = await presentationAuthor.authorPresentations(null, null, [
      { chunk: 'कल सुबह', form: 'tomorrow morning', seed: 'मैं कल सुबह मिलना चाहूँगा।', forceFrame: 'A' }
    ], OPTS)
    expect(authored[0].frame).toBe('A')
    spy.mockRestore()
  })

  it('ignores a nonsense forceFrame rather than dropping the item', async () => {
    const spy = vi.spyOn(presentationAuthor, 'judgeBatch').mockImplementation(async (items) => judgeSaysBare(items))
    const { authored } = await presentationAuthor.authorPresentations(null, null, [
      { chunk: 'कल सुबह', form: 'tomorrow morning', seed: 'मैं कल सुबह मिलना चाहूँगा।', forceFrame: 'yes please' }
    ], OPTS)
    expect(authored).toHaveLength(1)
    expect(authored[0].frame).toBe('A')
    spy.mockRestore()
  })
})

describe('the judge prompt', () => {
  it('tells the judge that a single-word two-sense chunk needs the context', async () => {
    let seen = null
    const spy = vi.spyOn(presentationAuthor, 'judgeBatch').mockImplementation(async (items, opts) => {
      seen = { items, opts }
      return judgeSaysBare(items)
    })
    await presentationAuthor.authorPresentations(null, null, [{ chunk: 'कल', form: 'yesterday', seed: 'मैं कल आपसे कुछ पूछना चाहता था।' }], OPTS)
    expect(seen.opts.knownLangName).toBe('Hindi')
    spy.mockRestore()
  })
})
