// @vitest-environment jsdom
/**
 * NO SCREEN MAY EVER TELL A RECORDIST THEY HAVE RECORDED NOTHING WHEN CLIPS
 * EXIST.
 *
 * The "Already recorded" stat used to be rendered only when the session was in
 * course order (`v-if="scriptInfo.order === 'course'"`), so the coverage-order
 * screen — the default, the one a plain recorder link opens — said nothing at
 * all about the 225 takes already in the can (Sascha, 2026-08-23).
 *
 * This mounts the real Script Ready panel out of AutocueStudio.vue's template
 * rather than a copy of it, so a future edit that re-hides the stat fails here.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { computed, reactive } from 'vue'

// The panel as it actually ships: pulled out of the single-file component by
// its comment markers so the assertions run against the shipped markup.
const sfc = readFileSync(join(__dirname, 'AutocueStudio.vue'), 'utf8')
const panelStart = sfc.indexOf('<!-- Phase: Script Loaded Confirmation')
const panel = sfc.slice(panelStart, sfc.indexOf('<!-- Phase:', panelStart + 10))

function panelWith(scriptInfo) {
  const state = reactive({ currentPhase: 'script-loaded', maxSeed: null, scriptInfo })
  return mount({
    // The panel is a v-else-if branch in the real template; give it the v-if
    // it expects rather than editing the extracted markup.
    template: `<div><div v-if="false"></div>${panel}</div>`,
    setup() {
      return {
        state,
        alreadyRecordedDisplay: computed(() => {
          const n = state.scriptInfo?.alreadyRecorded
          return (typeof n === 'number' && Number.isFinite(n)) ? n : '—'
        }),
        onBeginContinuous() {},
        resetSession() {}
      }
    }
  })
}

const stat = (w, label) => w.findAll('.script-stat')
  .find(s => s.find('.script-stat-label').text() === label)

const COVERAGE = { order: 'coverage', totalPhrases: 477, totalDirect: 0, totalItems: 954, estimatedMinutes: 95, alreadyRecorded: 225, totalInCourse: 11942, naturalOnly: false }
const COURSE = { order: 'course', totalItems: 11717, totalInCourse: 11942, alreadyRecorded: 225, estimatedMinutes: 1172, naturalOnly: true }

describe('the Script Ready panel says what is already recorded', () => {
  it('shows the count in coverage order — the mode that used to say nothing', () => {
    const w = panelWith(COVERAGE)
    expect(stat(w, 'Already recorded').find('.script-stat-value').text()).toBe('225')
    expect(w.text()).toContain('225 lines are already recorded')
  })

  it('shows the same count in course order', () => {
    const w = panelWith(COURSE)
    expect(stat(w, 'Already recorded').find('.script-stat-value').text()).toBe('225')
  })

  it('says a dash, never zero, when the server could not check', () => {
    const w = panelWith({ ...COVERAGE, alreadyRecorded: null })
    expect(stat(w, 'Already recorded').find('.script-stat-value').text()).toBe('—')
    expect(w.text()).toContain("doesn't mean none exist")
  })

  it('says zero only when zero is the truth', () => {
    const w = panelWith({ ...COVERAGE, alreadyRecorded: 0 })
    expect(stat(w, 'Already recorded').find('.script-stat-value').text()).toBe('0')
    expect(w.text()).not.toContain('lines are already recorded')
  })

  it('explains which reading order this script is, in both modes', () => {
    expect(panelWith(COVERAGE).text()).toMatch(/jump around/i)
    expect(panelWith(COURSE).text()).toMatch(/in order — start to finish/i)
  })
})
