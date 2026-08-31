/**
 * The sample picker's two pure decisions — which course, and which line.
 *
 * Both were WRONG on real data the first time they ran, which is why they are
 * tested rather than trusted: the picker offered German an Austrian line and
 * Welsh a Yoruba-known one because those courses were biggest, and it returned
 * nothing at all for Chinese because a 25-character floor is a fact about Latin
 * script and not about how long a sentence takes to say.
 */
import { describe, it, expect } from 'vitest'
import samples from './samples.cjs'

const { chooseFrom, preferCourses, isRenderable, renderPlan } = samples

const line = (text, order = 1) => ({ text, knownText: '', order })

describe('preferCourses — which course the line comes from', () => {
  const courses = [
    { course_code: 'deu_at_for_eng', known_lang: 'eng', seed_count: 900 },
    { course_code: 'deu_for_zho', known_lang: 'zho', seed_count: 400 },
    { course_code: 'deu_for_eng', known_lang: 'eng', seed_count: 300 },
    { course_code: 'deu_for_cym', known_lang: 'cym', seed_count: 0 },
  ]

  it('prefers the plain language over a regional variant, however big', () => {
    expect(preferCourses(courses, 'deu')[0].course_code).toBe('deu_for_eng')
  })

  it('drops courses with no seeds — there is nothing to pick from', () => {
    expect(preferCourses(courses, 'deu').map((c) => c.course_code)).not.toContain('deu_for_cym')
  })

  it('falls back to the biggest when nothing is plainer', () => {
    const only = [
      { course_code: 'cym_s_for_eng', known_lang: 'eng', seed_count: 100 },
      { course_code: 'cym_n_for_eng', known_lang: 'eng', seed_count: 900 },
    ]
    expect(preferCourses(only, 'cym')[0].course_code).toBe('cym_n_for_eng')
  })

  it('is a total order — same input, same answer, every time', () => {
    const a = preferCourses(courses, 'deu').map((c) => c.course_code)
    const b = preferCourses([...courses].reverse(), 'deu').map((c) => c.course_code)
    expect(a).toEqual(b)
  })
})

describe('chooseFrom — which line, in any script', () => {
  it('picks the line nearest the corpus median', () => {
    const rows = [line('a'.repeat(10), 1), line('b'.repeat(40), 2), line('c'.repeat(120), 3)]
    expect(chooseFrom(rows).text.length).toBe(40)
  })

  it('WORKS FOR CHINESE — the bug that made this file exist', () => {
    const rows = [
      line('我不想猜', 1),
      line('我不想猜明天会发生什么', 2),
      line('我不想猜明天会发生什么事情因为那没有意义', 3),
    ]
    expect(chooseFrom(rows).text).toBe('我不想猜明天会发生什么')
  })

  it('refuses lines with brackets, quotes or digits — they read oddly out of context', () => {
    const rows = [line('a normal sentence of ordinary length here', 1), line('a sentence (with an aside) in it too', 2)]
    expect(chooseFrom(rows).text).not.toContain('(')
  })

  it('returns null rather than a bad line when there is nothing usable', () => {
    expect(chooseFrom([line('x'), line('(1)')])).toBe(null)
  })

  it('is deterministic — ties break on the seed order, not on input order', () => {
    const rows = [line('aaaaaaaaaaaaaaaaaaaa', 7), line('bbbbbbbbbbbbbbbbbbbb', 2)]
    expect(chooseFrom(rows).order).toBe(2)
    expect(chooseFrom([...rows].reverse()).order).toBe(2)
  })
})

describe('renderPlan — who can be previewed, on whose provider', () => {
  it('sends a Cartesia voice to Cartesia, steered by the language', () => {
    const plan = renderPlan('cartesia_3597a26f-80ef-4bd5-8101-9699bc764917', 'spa')
    expect(plan.provider).toBe('cartesia')
    expect(plan.voiceId).toBe('3597a26f-80ef-4bd5-8101-9699bc764917')
    expect(plan.language).toBe('spa')
  })

  it('refuses a Cartesia voice in a language the lab cannot steer — its API throws without a locale', () => {
    const plan = renderPlan('cartesia_3597a26f-80ef-4bd5-8101-9699bc764917', 'cym')
    expect(plan.provider).toBeUndefined()
    expect(plan.why).toMatch(/steer/)
  })

  it('SENDS AN AZURE VOICE TO AZURE — the fix of 2026-08-31, in both spellings', () => {
    // Tom saw a Chinese row of seventeen voices with four play buttons. These
    // are the voices that had none, and they are the provider that will speak
    // them in a real course.
    expect(renderPlan('azure_es-ES-TrianaNeural', 'spa')).toEqual({
      provider: 'azure', voiceId: 'es-ES-TrianaNeural', language: 'spa',
    })
    expect(renderPlan('zh-CN-XiaoxiaoNeural', 'zho')).toEqual({
      provider: 'azure', voiceId: 'zh-CN-XiaoxiaoNeural', language: 'zho',
    })
  })

  it('previews Azure in a language params.cjs has no Cartesia steer for — the locale rides on the voice name', () => {
    expect(renderPlan('azure_cy-GB-NiaNeural', 'cym').provider).toBe('azure')
  })

  it('never synthesises a human recordist, and says which it is', () => {
    const plan = renderPlan('human_spa_for_eng_target1', 'spa')
    expect(plan.provider).toBeUndefined()
    expect(plan.why).toMatch(/human/)
  })

  it('refuses ElevenLabs rather than growing a path to it quietly', () => {
    expect(renderPlan('elevenlabs_pTOe8BQRdydOEIgv0wFL', 'zho').provider).toBeUndefined()
  })

  it('isRenderable is the same decision, asked as a yes or no', () => {
    expect(isRenderable('azure_es-ES-TrianaNeural', 'spa')).toBe(true)
    expect(isRenderable('human_spa_for_eng_target1', 'spa')).toBe(false)
  })
})

/**
 * THE JUDGING SET (2026-08-31). Tom: "one clip is not enough to judge a voice
 * on - it may be flattering or unrepresentative." So the set has to be
 * genuinely varied, deterministic — two voices compared on different words is
 * not a comparison — and its first line has to stay the line this module has
 * always picked, or every clip already cached in the estate is orphaned.
 */
describe('chooseSet — several lines, deliberately different', () => {
  const corpus = [
    line('va', 1),
    line('je vais bien', 2),
    line('est-ce que tu viens ?', 3),
    line('je pense que oui', 4),
    line('nous allons au marché', 5),
    line('il fait beau aujourd hui', 6),
    line('je voudrais un café et un croissant', 7),
    line('je ne sais pas encore ce que je vais faire demain', 8),
    line('elle a dit que tout le monde serait là avant midi', 9),
  ]

  it('starts with exactly the line the single picker returns', () => {
    expect(samples.chooseSet(corpus)[0]).toEqual(samples.chooseFrom(corpus))
  })

  it('gives three distinct lines', () => {
    const set = samples.chooseSet(corpus)
    expect(set).toHaveLength(3)
    expect(new Set(set.map((l) => l.text)).size).toBe(3)
  })

  it('varies the length — the axis a voice actually fails on', () => {
    const lengths = samples.chooseSet(corpus).map((l) => l.text.length)
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeGreaterThan(10)
  })

  it('prefers a question for the short slot, where a clone gives itself away', () => {
    expect(samples.chooseSet(corpus).some((l) => l.text.endsWith('?'))).toBe(true)
  })

  it('is deterministic — the same set every visit, or it is not a comparison', () => {
    expect(samples.chooseSet(corpus)).toEqual(samples.chooseSet(corpus))
  })

  it('never returns more lines than a tiny corpus holds', () => {
    expect(samples.chooseSet([line('bonjour', 1)])).toHaveLength(1)
  })

  it('returns nothing for a corpus with nothing sayable in it', () => {
    expect(samples.chooseSet([line('(4)', 1)])).toEqual([])
  })

  it('count 1 is exactly the old behaviour', () => {
    expect(samples.chooseSet(corpus, 1)).toEqual([samples.chooseFrom(corpus)])
  })
})
