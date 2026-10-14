// Unit tests for tools/check-hin-want-try.cjs — English want/try vs Hindi चाहना/कोशिश (job #349·Q).
// Run: npx vitest run tools/check-hin-want-try.test.cjs
//
// Every pair below is a real hin_for_eng row, before and after the 14 Oct 2026 fix. The first block is
// James's forum report: the check must flag the live row he heard and pass the corrected one.
import { describe, it, expect } from 'vitest'
const { classify, scan, counts } = require('./check-hin-want-try.cjs')

const hard = (k, t) => classify(k, t).hard
const soft = (k, t) => classify(k, t).soft

describe('James (forum, 11–12 Oct): "want" voiced as "try"', () => {
  it('flags S0003L01U02 as it was', () => {
    expect(hard('I want to learn Hindi as often as possible', 'मैं जितना हो सके उतनी बार हिंदी सीखने की कोशिश कर रहा हूँ।')).toEqual(['hindi-try-english-not'])
  })
  it('passes S0003L01U02 as fixed', () => {
    expect(hard("I'm trying to learn Hindi as often as possible", 'मैं जितना हो सके उतनी बार हिंदी सीखने की कोशिश कर रहा हूँ।')).toEqual([])
  })
  it('flags English "try" with no कोशिश (S0159L01B03 before) and passes it after', () => {
    expect(hard('trying to say', 'कहना चाहता')).toEqual(['hindi-want-english-not', 'english-try-hindi-not'])
    expect(hard('want to say', 'कहना चाहता')).toEqual([])
  })
})

describe('Hindi says want, English does not', () => {
  it('flags "he started with a bag" = वो … शुरू करना चाहता था, passes "he wanted to start…"', () => {
    expect(hard('he started with a bag', 'वो एक बैग से शुरू करना चाहता था।')).toEqual(['hindi-want-english-not'])
    expect(hard('he wanted to start with a bag', 'वो एक बैग से शुरू करना चाहता था।')).toEqual([])
  })
  it('treats would/\'d … like as want (चाहूँगा / चाहेंगे)', () => {
    expect(hard("or I'd like to do it myself", 'या मैं खुद करना चाहूँगा।')).toEqual([])
    expect(hard('would you like to help?', 'क्या आप मदद करना चाहेंगे?')).toEqual([])
    expect(hard("or I'll do it myself", 'या मैं खुद करना चाहूँगा।')).toEqual(['hindi-want-english-not'])
  })
  it('does not read चाहिए (need/should) as want', () => {
    expect(hard('I should go when ready', 'मुझे जाना चाहिए जब मैं तैयार हूँ।')).toEqual([])
  })
  it('does not read concessive चाहे ("however much") as want (S0593)', () => {
    expect(hard('However much I argued I still had to share.', 'चाहे मैंने कितना भी बहस किया मुझे फिर भी बाँटना पड़ा।')).toEqual([])
  })
  it('still flags "whenever" for जब भी आप चाहें — that is "whenever you WANT"', () => {
    expect(hard('think whenever', 'सोचना जब भी आप चाहें।')).toEqual(['hindi-want-english-not'])
    expect(hard('think whenever you want', 'सोचना जब भी आप चाहें।')).toEqual([])
  })
})

describe('कोशिश as a noun', () => {
  it('accepts effort / attempt for कोशिश (S0050L03)', () => {
    expect(hard('attempt to finish', 'खत्म करने की कोशिश')).toEqual([])
    expect(hard("I don't need the effort to finish", 'मुझे खत्म करने की कोशिश की ज़रूरत नहीं है।')).toEqual([])
  })
  it('does not demand कोशिश for English "effort" (मेहनत, S0027L01U06)', () => {
    expect(hard("I'm putting a lot of effort into answering", 'मैं जवाब देने में बहुत मेहनत कर रहा हूँ।')).toEqual([])
  })
})

describe('soft: English want, Hindi "मुझे X-ना है" / चाहिए', () => {
  it('reports but never fails', () => {
    expect(hard('I want to think about this', 'मुझे इसके बारे में सोचना है।')).toEqual([])
    expect(soft('I want to think about this', 'मुझे इसके बारे में सोचना है।')).toEqual(['english-want-hindi-not'])
  })
})

describe('scan', () => {
  it('skips component rows and counts hard vs soft', () => {
    const rows = scan({
      seeds: [{ seed_number: 7, known_text: 'I want to try as hard as I can today.', target_text: 'मैं आज जितना हो सके उतनी मेहनत से कोशिश करना चाहता हूँ।' }],
      legos: [{ lego_id: 'S0002L01', seed_number: 2, known_text: "I'm trying to learn", target_text: 'सीखने की कोशिश कर रहा हूँ।' }],
      phrases: [
        { id: 'S0007L02C01', seed_number: 7, phrase_role: 'component', known_text: 'effort', target_text: 'कोशिश' },
        { id: 'S0009L01U04', seed_number: 9, phrase_role: 'use', known_text: 'I want to learn a little Hindi', target_text: 'मैं थोड़ी हिंदी सीखने की कोशिश कर रहा हूँ।' },
        { id: 'S0101L02U01', seed_number: 101, phrase_role: 'use', known_text: 'I want to find out more', target_text: 'मुझे और जानना है।' },
      ],
    })
    expect(rows.map((r) => r.id)).toEqual(['S0009L01U04', 'S0101L02U01'])
    expect(counts(rows)).toEqual({ hard: 1, soft: 1 })
  })
})
