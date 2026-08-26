/**
 * Unit tests for the BUILD-phrase self-teaching gate.
 *
 * The specimen this gate exists for: deu_for_jpn S0017L03 taught 見つけ出す (herausfinden) and
 * all three of its BUILD phrases prompted the learner with 知る. Those rows have since been
 * deleted from the database, so the case is reconstructed here from the 2026-08-26 diagnosis
 * and lives on as a test rather than as data.
 *
 * Run: npx vitest run services/course-builder/lib/build-teaches-word
 */

import { describe, it, expect } from 'vitest'

const {
  STATUS, TEACH_REASON, checkBuildTeachesWord, checkBuildBasketTeachesWord,
  japaneseCores, cleanGloss, glossAlternatives,
} = require('./build-teaches-word.cjs')

const JP = { knownLang: 'jpn', script: 'Jpan' }
const check = (gloss, prompt, opts = JP) => checkBuildTeachesWord(gloss, prompt, opts)

describe('the specimen — deu_for_jpn S0017L03', () => {
  const LEGO = {
    known: '見つけ出す',
    build: [
      { known: '知りたい', target: 'herausfinden wollen' },
      { known: '答えを知りたい', target: 'die Antwort herausfinden' },
      { known: '彼女は答えが何か知りたい', target: 'sie will herausfinden was die Antwort ist' },
    ],
  }

  it('flags all three BUILD rows', () => {
    const r = checkBuildBasketTeachesWord(LEGO, JP)
    expect(r.violations).toHaveLength(3)
    expect(r.valid).toBe(false)
  })

  it('names the missing part of the taught word, not just "failed"', () => {
    const r = check('見つけ出す', '答えを知りたい')
    expect(r.status).toBe(STATUS.VIOLATION)
    expect(r.missing).toContain('見')
    expect(r.detail).toContain('見つけ出す')
  })

  it('passes once the prompt actually uses the taught word', () => {
    expect(check('見つけ出す', '答えを見つけ出したい').status).toBe(STATUS.PASS)
  })
})

describe('inflection is tolerated — methodology rule K6', () => {
  // 知る 知り 知っ 知ら 知れ are one word. A gate that cannot see that is worthless.
  it.each([
    ['知る', '知りたい'],
    ['知る', '答えを知っている'],
    ['知る', 'まだ知らない'],
    ['知っている', '知りませんでした'],
    ['見つけ出す', '見つけ出しました'],
    ['助ける', '助けてくれますか'],
    ['話す', '話せるようになりたい'],
    ['会う', '今晩会いたい'],
  ])('%s is the same word as the prompt %s', (gloss, prompt) => {
    expect(check(gloss, prompt).status).toBe(STATUS.PASS)
  })
})

describe('a different lexeme is never tolerated, however close the meaning', () => {
  it.each([
    ['見つけ出す', '答えを知りたい'],
    ['知る', 'わかりません'],
    ['知っている', 'わかっている'],
    ['助ける', '手伝ってくれますか'],
    ['愛している', '好きな人'],
    ['意味する', '何を言っているの'],
    ['留まる', 'ここにいたい'],
    ['劣る', 'うまくできない'],
    ['部分', 'こちら側'],
    ['お年寄り', '老人です'],
    ['思い込む', 'そう思っていた'],
  ])('%s taught, %s prompted is a violation', (gloss, prompt) => {
    expect(check(gloss, prompt).status).toBe(STATUS.VIOLATION)
  })
})

describe('cores never collide distinct lexemes', () => {
  // This is the property the 2026-08-26 Yoruba stemmer burn was about: a matcher that truncates
  // or folds can silently merge two different words and wave a defect through. Nothing here
  // truncates — cores are substrings of the gloss compared by exact equality — so kanji-distinct
  // words stay distinct. The shape-only lexeme test used by the known-side gate would excuse
  // every pair below, because each shares a leading character and a one-character tail.
  it.each([
    ['全部', '全員が来ました'],
    ['大人', '大学に行く'],
    ['会議', '会社にいます'],
    ['意味', '意見があります'],
    ['自分', '自身でやる'],
  ])('%s is not satisfied by %s', (gloss, prompt) => {
    expect(check(gloss, prompt).status).toBe(STATUS.VIOLATION)
  })

  it('distinct glosses yield distinct cores', () => {
    const glosses = ['全部', '全員', '大人', '大学', '知る', '知識', '見つけ出す', '見る', '話', '物語']
    const seen = new Map()
    for (const g of glosses) {
      const key = japaneseCores(cleanGloss(g)).join('|')
      expect(seen.has(key)).toBe(false)
      seen.set(key, g)
    }
  })
})

describe('authoring annotations are not part of the word', () => {
  it('strips a parenthesised disambiguation', () => {
    expect(cleanGloss('私の（女性複数）')).toBe('私の')
    expect(check('眠った（私が）', '昨夜よく眠れなかった').status).toBe(STATUS.PASS)
  })

  it('strips the slot marker on a bound form', () => {
    expect(cleanGloss('〜冊')).toBe('冊')
    expect(check('〜冊', '本を三冊読んだ').status).toBe(STATUS.PASS)
  })
})

describe("the author's alternatives are disjunctive", () => {
  it('splits on ・ ／ / and 、', () => {
    expect(glossAlternatives('嬉しい・満足している')).toEqual(['嬉しい', '満足している'])
    expect(glossAlternatives('お願いする／頼む')).toEqual(['お願いする', '頼む'])
  })

  it('using either alternative teaches the word', () => {
    expect(check('嬉しい・満足している', 'あなたが来て嬉しい').status).toBe(STATUS.PASS)
    expect(check('嬉しい・満足している', '満足しています').status).toBe(STATUS.PASS)
  })

  it('using neither is still a violation, and says so', () => {
    const r = check('嬉しい・満足している', '悲しいです')
    expect(r.status).toBe(STATUS.VIOLATION)
    expect(r.detail).toContain('none of the taught alternatives')
  })
})

describe('Japanese drops its pronouns', () => {
  it('does not demand a subject the prompt legitimately omits', () => {
    expect(check('私が残した', '鍵をオフィスに残しました').status).toBe(STATUS.PASS)
  })

  it('but still demands the verb', () => {
    expect(check('私が残した', '鍵をオフィスに置きました').status).toBe(STATUS.VIOLATION)
  })
})

describe('UNCHECKED is a refusal, never a soft pass', () => {
  it('refuses an all-kana gloss too short to have an invariant', () => {
    // する inflects to し — the single stem character itself changes.
    const r = check('やる', 'する')
    expect(r.status).toBe(STATUS.UNCHECKED)
    expect(r.reason).toBe(TEACH_REASON.KANA_UNDECIDABLE)
  })

  it('refuses an all-kana construction rather than guessing its invariant', () => {
    const r = check('どうもありがとうございます', '手伝ってくれてありがとう')
    expect(r.status).toBe(STATUS.UNCHECKED)
  })

  it('refuses an all-kana bound pattern, which inflects inside itself', () => {
    const r = check('〜しましょう', '行きましょう')
    expect(r.status).toBe(STATUS.UNCHECKED)
    expect(r.reason).toBe(TEACH_REASON.BOUND_KANA_PATTERN)
  })

  it('refuses a prompt written in the wrong script instead of mis-filing it as word choice', () => {
    // por_for_jpn has 135 BUILD phrases with Portuguese sitting in the Japanese field. That is a
    // separate defect and calling it a near-synonym swap would hide it.
    const r = check('見つけ出す', 'estou surpreendido')
    expect(r.status).toBe(STATUS.UNCHECKED)
    expect(r.reason).toBe('mixed_script')
  })

  it('refuses an empty gloss and an empty prompt', () => {
    expect(check('', '知りたい').reason).toBe(TEACH_REASON.NO_GLOSS)
    expect(check('見つけ出す', '').reason).toBe(TEACH_REASON.EMPTY_PROMPT)
  })

  it('a refused row never fails a basket, and is reported separately', () => {
    const r = checkBuildBasketTeachesWord({ known: 'やる', build: [{ known: 'する' }, { known: '今日する' }] }, JP)
    expect(r.valid).toBe(true)
    expect(r.unchecked).toHaveLength(2)
    expect(r.checked).toBe(0)
  })
})

describe('a mid-band all-kana word does get checked', () => {
  it('passes when the prompt uses it', () => {
    expect(check('または', 'または話すかどうか').status).toBe(STATUS.PASS)
  })
  it('flags a different kana word', () => {
    expect(check('または', 'あるいは話す').status).toBe(STATUS.VIOLATION)
    expect(check('ほとんど', 'もうすぐ終わる').status).toBe(STATUS.VIOLATION)
  })
})

describe('space-segmented known sides', () => {
  const EN = { knownLang: 'eng' }

  it('passes on exact word containment', () => {
    expect(checkBuildTeachesWord('find out', 'I want to find out the answer', EN).status).toBe(STATUS.PASS)
  })

  it('refuses rather than guessing morphology with no contract', () => {
    const r = checkBuildTeachesWord('find out', 'I found out the answer', EN)
    expect(r.status).toBe(STATUS.UNCHECKED)
    expect(r.reason).toBe('morphology_unresolved')
  })

  it('resolves inflection where the pair-contract licenses it', () => {
    const contract = { known_lang: 'eng', morphology: 'fusional', stemStrip: ['ing', 'ed', 's'], stemMinLen: 3 }
    const r = checkBuildTeachesWord('want', 'she wanted the answer', { knownLang: 'eng', contract })
    expect(r.status).toBe(STATUS.PASS)
  })

  it('convicts a different lexeme once a contract is in play', () => {
    const contract = { known_lang: 'eng', morphology: 'fusional', stemStrip: ['ing', 'ed', 's'], stemMinLen: 3 }
    const r = checkBuildTeachesWord('discover', 'she learned the answer', { knownLang: 'eng', contract })
    expect(r.status).toBe(STATUS.VIOLATION)
  })
})
