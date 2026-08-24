// @vitest-environment jsdom
/**
 * Deborah (SSi's native Arabic reviewer) reported on 2026-08-17 that `!` was
 * landing on the WRONG side of Arabic target text in Popty — "appearing right,
 * like English, should be left/end-of-sentence" — while `؟` was fine.
 *
 * That asymmetry is the diagnosis, and it is what these tests pin:
 *   - `؟` U+061F is bidi class AL (strong RTL). It joins the Arabic run and
 *     lands correctly whatever the paragraph direction — which is why she never
 *     saw it break, and why a passing `؟` proved nothing about `!`.
 *   - `!` U+0021 is bidi class ON (neutral). A trailing neutral resolves against
 *     the PARAGRAPH direction, so inside an LTR paragraph it is pushed to the
 *     visual right.
 *
 * The stored text is correct (mark at the logical end); only the display was
 * wrong. So the assertion here is on the `dir` attribute of the element that
 * actually paints the target string — the primitive that fixes it — and NOT on
 * `text-align`, which moves the block but still resolves the neutral against
 * the wrong paragraph direction.
 *
 * The fixtures are real `ara_lb_for_eng` rows, not invented Arabic.
 */
import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import PhraseRow from './PhraseRow.vue'

// Real ara_lb_for_eng rows. The first two end in the neutral `!` that Deborah
// reported; the third ends in a neutral `.` — same bidi class, same bug.
const ARABIC_BANG = 'أحكي عربي هلق!'
const ARABIC_COMMA_BANG = 'بدي أحكي عربي، معك!'
const ARABIC_FULL_STOP = 'بدي أحكي معك عربي هلق.'

function mountRow(phrase) {
  return shallowMount(PhraseRow, {
    props: {
      phrase: {
        phrase_id: 'ara_lb_for_eng:S0001L01U01',
        known_text: 'speak Arabic now!',
        phrase_role: 'use',
        ...phrase
      },
      position: 1,
      courseCode: 'ara_lb_for_eng'
    }
  })
}

/** The span that paints `phrase.target_text` in the row header. */
function targetSpan(wrapper) {
  return wrapper.get('.target-text span[dir]')
}

describe('PhraseRow — target text direction', () => {
  it('marks Arabic target text rtl, so a trailing neutral `!` stays at the logical end', () => {
    const wrapper = mountRow({ target_text: ARABIC_BANG })
    const span = targetSpan(wrapper)

    expect(span.attributes('dir')).toBe('rtl')
    expect(span.text()).toBe(ARABIC_BANG)
  })

  it.each([
    ['trailing `!` after an internal comma', ARABIC_COMMA_BANG],
    ['trailing `.`', ARABIC_FULL_STOP]
  ])('marks Arabic rtl regardless of which neutral punctuation it carries: %s', (_label, target) => {
    expect(targetSpan(mountRow({ target_text: target })).attributes('dir')).toBe('rtl')
  })

  it('leaves English target text ltr — the known side of these courses must not flip', () => {
    const wrapper = mountRow({ target_text: 'speak Arabic now!' })

    expect(targetSpan(wrapper).attributes('dir')).toBe('ltr')
  })

  it('isolates the target run, so it cannot reorder against the English "Target:" label', () => {
    // The label and the target share one line. Without isolation the Arabic run
    // and the surrounding LTR chrome resolve as a single bidi paragraph, which
    // is the mixed-direction case the bug actually lives in.
    const wrapper = mountRow({ target_text: ARABIC_BANG })

    expect(targetSpan(wrapper).attributes('style')).toContain('unicode-bidi: isolate')
  })

  it('does not put `dir` on the parent, which would drag the English label rightwards', () => {
    const wrapper = mountRow({ target_text: ARABIC_BANG })

    // TARGET SIDE ONLY: the fix is a `dir` on the run that paints the string,
    // never a blanket direction on a container, a page or <html>.
    expect(wrapper.get('.target-text').attributes('dir')).toBeUndefined()
  })

  it('keeps the known side ltr even when the target is Arabic', () => {
    const wrapper = mountRow({ target_text: ARABIC_BANG, known_text: 'speak Arabic now!' })

    expect(wrapper.get('.known-text').attributes('dir')).toBeUndefined()
  })

  it('gives an RTL KNOWN side its own direction — eng_for_ara, not just ara_*', () => {
    // eng_for_ara and eng_for_urd have 668 seeds each with Arabic/Urdu on the
    // KNOWN side and English as the target, so a target-only fix would leave
    // those courses mis-rendered on the side the reviewer actually reads.
    const wrapper = mountRow({
      known_text: 'أريد أن أتكلم الإنجليزية معك الآن.',
      target_text: 'I want to speak English with you now.',
    })
    expect(wrapper.html()).toContain('dir="rtl"')
  })
})
