// PAUSE-CUE SPLIT: generatePodAudio inserts a " … " cue between the sentences
// of a multi-sentence pod turn so the engine pauses audibly at each boundary —
// which is the silence the splicer later cuts on.
//
// The cue never reached CJK. The old expression was /(?<=[.!?…])\s+/: it has
// neither the terminals 。！？ nor a way to fire without following whitespace,
// and CJK carries no space after a terminator. So a 5-sentence Japanese turn
// looked like one sentence and got no cue at all. The 2026-08-24 Pod 1 splice
// pass withdrew 3 Chinese turns because of it — with no engineered pause the
// splice margin could not tell a comma pause from a sentence end.
//
// The fix adopts, verbatim, the expression the splicer already cuts on
// (tools/pods/splice-sentence-clips.cjs SENTENCE_SPLIT). Generator and splicer
// must agree about where a sentence ends.
//
// Every CJK/Korean fixture below is REAL pod text, pulled from
// listening_pod_sentences on 2026-08-24 (row id in the comment). No network,
// no DB, no TTS — the split is a pure exported helper.
//
// Run: npx vitest run services/voice-engine/__tests__/pods-pause-cue-split.test.mjs
import { describe, it, expect, beforeAll } from 'vitest'
import { createRequire } from 'node:module'

const requireCjs = createRequire(import.meta.url)

let splitPodTurnSentences

beforeAll(() => {
  process.env.PHASE8_NO_LISTEN = '1'   // helpers-only mode; no port bind
  ;({ splitPodTurnSentences } = requireCjs('../../phases/phase8-audio-v13.cjs'))
})

// What generatePodAudio does with the split result, reproduced exactly.
const cue = (text) => {
  const sents = splitPodTurnSentences(text)
  return sents.length > 1 ? sents.join(' … ') : text
}

describe('splitPodTurnSentences — CJK', () => {
  // zho_for_eng:pod-1-retired-2026-08-24:SC22-S009
  it('splits a 4-sentence Chinese turn on 。 and ！ with no spaces', () => {
    const t = '这正是我需要的那种练习。我觉得我能感觉到我们说话的时候我的大脑在变化！真的很感谢你的帮助。不过用一门自己说得不太好的语言说话，会累得出乎意料。'
    expect(splitPodTurnSentences(t)).toEqual([
      '这正是我需要的那种练习。',
      '我觉得我能感觉到我们说话的时候我的大脑在变化！',
      '真的很感谢你的帮助。',
      '不过用一门自己说得不太好的语言说话，会累得出乎意料。',
    ])
  })

  // zho_for_eng:pod-1-retired-2026-08-24:SC06-S008 — the failure mode that lost
  // the 3 withdrawn turns: a comma INSIDE sentence 1, a ？ at the real end.
  it('cuts a Chinese turn at ？ and not at the internal ，', () => {
    const t = '我是护士，在附近的医院工作。你呢？'
    expect(splitPodTurnSentences(t)).toEqual(['我是护士，在附近的医院工作。', '你呢？'])
    expect(cue(t)).toBe('我是护士，在附近的医院工作。 … 你呢？')
  })

  // jpn_for_eng:pod-1-retired-2026-08-24:SC14-S010
  it('splits a 5-sentence Japanese drill turn', () => {
    const t = '百。二百。千。日曜日。十二時。'
    expect(splitPodTurnSentences(t)).toEqual(['百。', '二百。', '千。', '日曜日。', '十二時。'])
    expect(cue(t)).toBe('百。 … 二百。 … 千。 … 日曜日。 … 十二時。')
  })

  // jpn_for_eng:pod-1-retired-2026-08-24:SC03-S001 — includes ？
  it('splits a Japanese turn on 。 then ？', () => {
    expect(splitPodTurnSentences('こんにちは。ご注文は？')).toEqual(['こんにちは。', 'ご注文は？'])
  })

  // jpn_for_eng:pod-1-retired-2026-08-24:SC02-S005 — ideographic comma 、 is
  // NOT a terminator and must not cut ("三、四マイル" is one number range).
  it('does not cut a Japanese turn at 、', () => {
    expect(splitPodTurnSentences('あまり遠くないですよ。三、四マイルくらいです。'))
      .toEqual(['あまり遠くないですよ。', '三、四マイルくらいです。'])
  })
})

describe('splitPodTurnSentences — Korean was never broken', () => {
  // Korean orthography uses Latin . ! ? with a following space, so the OLD
  // expression already split these correctly and the cue was already being
  // inserted. 0 of 604 live kor_for_eng pod rows contain 。！？ (census
  // 2026-08-24). These assertions pin that: they pass before AND after the fix.

  // kor_for_eng:pod-0-retired-2026-08-22:SC03-S002
  it('splits a 4-sentence Korean turn on Latin marks', () => {
    const t = '안녕하세요. 커피 한 잔 주세요. 우유는 넣어 주시고 설탕은 빼 주세요. 테이크아웃으로요.'
    expect(splitPodTurnSentences(t)).toEqual([
      '안녕하세요.', '커피 한 잔 주세요.', '우유는 넣어 주시고 설탕은 빼 주세요.', '테이크아웃으로요.',
    ])
  })

  // kor_for_eng:pod-0-retired-2026-08-22:SC01-S003
  it('cuts a Korean turn at ? and not at the internal ,', () => {
    expect(splitPodTurnSentences('저는 아주 잘 지내요, 감사합니다. 일하러 가세요?'))
      .toEqual(['저는 아주 잘 지내요, 감사합니다.', '일하러 가세요?'])
  })
})

describe('splitPodTurnSentences — Latin behaviour is unchanged', () => {
  const OLD = /(?<=[.!?…])\s+/
  const oldSplit = (t) => String(t || '').split(OLD).map(s => s.trim()).filter(Boolean)

  const latin = [
    'Hello there. How are you today?',
    "I'm very well, thanks. Are you off to work?",
    'Guten Morgen! Wie geht es Ihnen? Mir geht es gut.',
    'Buenos días. ¿Cómo estás? Muy bien, gracias.',
    'It costs 3.5 euros. That is fine.',              // decimal must not cut
    'Dr. Smith arrived. Mrs. Jones did not.',          // abbreviations
    '  Leading and trailing space.  Second one.   ',   // trimming
    'One sentence only, no cue.',
    '',
    'Wait… then what? Nothing.',                       // ellipsis
  ]

  for (const t of latin) {
    it(`identical to the old splitter: ${JSON.stringify(t).slice(0, 46)}`, () => {
      expect(splitPodTurnSentences(t)).toEqual(oldSplit(t))
    })
  }

  it('leaves "3.5" intact inside one sentence', () => {
    expect(splitPodTurnSentences('It costs 3.5 euros. That is fine.'))
      .toEqual(['It costs 3.5 euros.', 'That is fine.'])
  })

  it('inserts no cue for a single-sentence turn', () => {
    expect(cue('Just the one.')).toBe('Just the one.')
  })
})

describe('splitPodTurnSentences — Arabic', () => {
  // ara_for_eng — ؟ behaves like a Latin ? (whitespace required).
  it('splits an Arabic turn on ؟', () => {
    expect(splitPodTurnSentences('ممكن أدفع بكارت؟ عندكم دفع إلكتروني؟'))
      .toEqual(['ممكن أدفع بكارت؟', 'عندكم دفع إلكتروني؟'])
  })
})

describe('splitPodTurnSentences — Devanagari danda is knowingly NOT handled', () => {
  // hin_for_eng:pod-0-retired-2026-08-24:SC04-S002. The splicer does not handle
  // ।/॥ either; generator and splicer stay identical by decision. This test
  // PINS the current behaviour so the follow-up that adds ।/॥ has to change
  // both files, and this assertion, together.
  it('does not cut at ।', () => {
    const t = 'हेलो! माफ़ कीजिए, लेकिन मैं अभी बात नहीं कर सकती। मुझे अभी घर जाना है। क्या हम कल बात कर सकते हैं?'
    expect(splitPodTurnSentences(t)).toEqual([
      'हेलो!',
      'माफ़ कीजिए, लेकिन मैं अभी बात नहीं कर सकती। मुझे अभी घर जाना है। क्या हम कल बात कर सकते हैं?',
    ])
  })
})
