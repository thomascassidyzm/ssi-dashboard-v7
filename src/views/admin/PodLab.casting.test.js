// Pod Lab — casting & approval mode (A-95, the sample-first gate's surface).
//
// The honest test is to mount the real component against the REAL stored cast
// of eng_for_guj (captured 2026-08-07: five xai voices all steered at locale
// 'zh' on an English target, known voices Azure en-GB on a Gujarati known side)
// and read the DOM. That course is one of the six live defects this page exists
// to make visible, so the assertions here are "the page still says so".
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import fixture from './__fixtures__/eng_for_guj-cast.json'

const SPEAKERS = fixture.pod.speakers
const SENTENCES = fixture.sentences

// listening_pod_sentences → the pod lines; course_audio → no fine-known clips.
vi.mock('../../services/supabase', () => {
  const table = (name) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => Promise.resolve({ data: name === 'listening_pod_sentences' ? SENTENCES : [], error: null }),
      then: (r) => Promise.resolve({ data: [], error: null }).then(r),
    }
    return chain
  }
  return {
    supabase: {
      from: table,
      auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
    },
  }
})
vi.mock('../../lib/podEngine', () => ({
  composeSentenceArc: () => [],
  loadStage0ClipMaps: async () => ({ glossMap: new Map(), targetClipMap: new Map() }),
  resolveAtoms: () => [],
  DEFAULT_STAGE0: { tiers: [] },
}))

const CASTING = {
  course_code: 'eng_for_guj',
  course: { course_code: 'eng_for_guj', target_lang: 'eng', known_lang: 'guj' },
  pods: [{ id: 'eng_for_guj:pod-0', speakers: SPEAKERS }],
  cast_fingerprint: 'abc1234567890def',
  record: null,
  gate: { ok: false, reason: 'no_approval' },
}

async function mountLab() {
  const PodLab = (await import('./PodLab.vue')).default
  const wrapper = mount(PodLab, {
    global: {
      stubs: {
        RouterLink: true,
        CoursePicker: { name: 'CoursePicker', props: ['modelValue'], emits: ['update:modelValue'], template: '<div class="picker-stub" />' },
      },
    },
  })
  await flushPromises()
  wrapper.findComponent({ name: 'CoursePicker' }).vm.$emit('update:modelValue', 'eng_for_guj')
  // loadCourse resolves a dynamic import, so the settle spans macrotasks, not
  // just microtasks — tick real timers, don't just flush promises.
  const settle = async (sel) => {
    for (let i = 0; i < 50 && !wrapper.find(sel).exists(); i++) {
      await flushPromises()
      await new Promise((r) => setTimeout(r, 0))
    }
  }
  await settle('.mode-switch')
  await wrapper.find('.mode-switch button:nth-child(3)').trigger('click')
  await settle('.cast-flags')
  return wrapper
}

describe('PodLab casting mode', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (url) => {
      if (String(url).startsWith('/api/pod-voice-approval')) {
        return { ok: true, json: async () => CASTING }
      }
      return { ok: true, json: async () => ({ rows: [] }) }
    })
    global.Audio = class {
      play() { setTimeout(() => this.onended && this.onended(), 0); return Promise.resolve() }
      pause() {}
    }
  })

  it('states the cast as stored, and names the locale defect in words', async () => {
    const w = await mountLab()
    const flags = w.findAll('.cast-flags li').map((n) => n.text())
    expect(flags.join(' | ')).toMatch(/target voices? steered at a locale that is not the course's target language/)
    expect(flags.join(' | ')).toMatch(/zh/)
    expect(flags.join(' | ')).toMatch(/distinct target voices? — Aran's rule is a two-hander/)
    expect(flags.join(' | ')).toMatch(/KNOWN voices? at a locale that is not the course's known language/)
    expect(flags.join(' | ')).toMatch(/Line share — female \d+%, male \d+%/)
    // the fingerprint the gate will compare against is shown verbatim
    expect(w.text()).toContain('abc1234567890def')
    expect(w.text()).toContain('awaiting approval')
  })

  // SEMANTICS CHANGED 2026-08-11 (Tom's T-14 rejection: "Pods are dialogue -
  // they need distinct speakers... so Tom can judge how the two voices sound
  // together"). The old assertion here was that the first four clips were four
  // DIFFERENT voices — pure coverage, and deliberately flipped: the sample now
  // LEADS with a contiguous exchange, which may repeat a voice inside it,
  // before covering the voices the exchange didn't reach.
  it('leads with an exchange — consecutive lines, two voices answering each other', async () => {
    const w = await mountLab()
    const rows = w.findAll('.sample-row')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThanOrEqual(10)

    const exch = w.findAll('.sample-row.exch')
    expect(exch.length).toBeGreaterThanOrEqual(2)
    // The exchange is at the TOP of the list — it has to play as a conversation.
    expect(rows.slice(0, exch.length).every((r) => r.classes().includes('exch'))).toBe(true)
    // …and it puts two different voices in front of the ear.
    expect(new Set(exch.map((r) => r.find('.s-voice').text())).size).toBe(2)
    expect(w.text()).toMatch(/-line exchange/)
  })

  it('still covers every voice the exchange did not reach', async () => {
    const w = await mountLab()
    const rows = w.findAll('.sample-row')
    const exchVoices = new Set(
      w.findAll('.sample-row.exch').map((r) => r.find('.s-kind').text() + ':' + r.find('.s-voice').text()),
    )
    // Every clip after the exchange is either a voice nobody has heard yet, or
    // (once the cast is exhausted) a repeat — never a repeat before a new one.
    const after = rows.slice(exchVoices.size).map((r) => r.find('.s-kind').text() + ':' + r.find('.s-voice').text())
    const seen = new Set(exchVoices)
    let sawRepeat = false
    for (const v of after) {
      if (seen.has(v)) sawRepeat = true
      else {
        expect(sawRepeat, `voice ${v} was heard after a repeat`).toBe(false)
        seen.add(v)
      }
    }
  })

  it('names the pod it is sampling, so a stale snapshot cannot pass unnoticed', async () => {
    const w = await mountLab()
    expect(w.find('.pod-source').text()).toContain('eng_for_guj:pod-0')
    expect(w.find('.pod-source').text()).toMatch(/\d+ live lines/)
  })

  it('POSTs the approval with the fingerprint it rendered', async () => {
    const w = await mountLab()
    await w.find('.cast-decide .approve').trigger('click')
    await flushPromises()
    const post = global.fetch.mock.calls.find((c) => c[1] && c[1].method === 'POST')
    expect(post[0]).toBe('/api/pod-voice-approval')
    expect(post[1].headers.Authorization).toBe('Bearer tok')
    expect(JSON.parse(post[1].body)).toMatchObject({
      course_code: 'eng_for_guj',
      decision: 'approve',
      cast_fingerprint: 'abc1234567890def',
    })
  })
})
