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

// course_audio rows for the pod's clips. By default every clip is rendered on
// the voice the cast names for its speaker and track — the healthy case, and
// the only one in which a sample is evidence about the casting on screen.
// `AUDIO_ROWS` is reassigned per-test to model the unhealthy one.
const canon = (s) => String(s || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
function castVoiceId(speaker, track) {
  const e = SPEAKERS[canon(speaker)] || SPEAKERS[speaker] || SPEAKERS._default
  return (e && e[track] && e[track].voice_id) || (track === 'target' ? e && e.voice_id : null) || null
}
const ON_CAST_AUDIO = SENTENCES.flatMap((s) => [
  s.target_audio_id && { id: s.target_audio_id, voice_id: castVoiceId(s.speaker, 'target'), created_at: '2026-08-08T00:00:00Z' },
  s.known_audio_id && { id: s.known_audio_id, voice_id: castVoiceId(s.speaker, 'known'), created_at: '2026-08-08T00:00:00Z' },
].filter(Boolean))
let AUDIO_ROWS = ON_CAST_AUDIO

// listening_pod_sentences → the pod lines; course_audio → the clip voices
// (.in) and no fine-known clips (.eq).
vi.mock('../../services/supabase', () => {
  const table = (name) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      in: () => Promise.resolve({ data: name === 'course_audio' ? AUDIO_ROWS : [], error: null }),
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
    AUDIO_ROWS = ON_CAST_AUDIO
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
    const rows = w.findAll('.samples.primary .sample-row')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThanOrEqual(10)

    const exch = w.findAll('.samples.primary .sample-row.exch')
    expect(exch.length).toBeGreaterThanOrEqual(2)
    // The exchange is at the TOP of the list — it has to play as a conversation.
    expect(rows.slice(0, exch.length).every((r) => r.classes().includes('exch'))).toBe(true)
    // …and it puts two different voices in front of the ear.
    expect(new Set(exch.map((r) => r.find('.s-voice').text())).size).toBe(2)
    expect(w.text()).toMatch(/-line exchange/)
  })

  it('still covers every voice the exchange did not reach', async () => {
    const w = await mountLab()
    const rows = w.findAll('.samples.primary .sample-row')
    const exchVoices = new Set(
      w.findAll('.samples.primary .sample-row.exch').map((r) => r.find('.s-kind').text() + ':' + r.find('.s-voice').text()),
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

  // THE DEFECT THAT MADE THE T-14 SAMPLE MEANINGLESS, 2026-08-11.
  // A pod's audio accumulates over months while its casting moves underneath.
  // Measured on the live spa_for_eng:pod-0-unrecorded: only 16 of 119 target
  // clips were rendered on the current two-voice cast; the other 103 are five
  // older voices from June. The page used to label each clip with whatever the
  // CAST said, so a June clip on `yis75yfp` was presented as "Pablo" and
  // counted towards a two-voice exchange. Approving a cast on that evidence
  // approves nothing.
  it('excludes clips rendered on voices that are no longer cast, and says so', async () => {
    AUDIO_ROWS = ON_CAST_AUDIO.map((r, i) =>
      i % 2 === 0 ? { ...r, voice_id: 'yis75yfp', created_at: '2026-06-10T00:00:00Z' } : r)
    const w = await mountLab()
    const sampled = w.findAll('.samples.primary .sample-row')
    const off = w.findAll('.offcast .sample-row')

    expect(off.length).toBeGreaterThan(0)
    expect(sampled.length).toBeGreaterThan(0)
    // No sampled clip is one of the re-voiced ones.
    expect(sampled.some((r) => r.find('.s-voice').text().includes('yis75yfp'))).toBe(false)
    // The off-cast list shows the voice that ACTUALLY rendered the clip, not
    // the one the cast would like to claim.
    expect(off.some((r) => r.find('.s-voice').text().includes('yis75yfp'))).toBe(true)
    // And the count is stated in words rather than left to be noticed.
    expect(w.text()).toMatch(/clips on this pod\s+were rendered on the casting above/)
    expect(w.text()).toContain('yis75yfp')
  })

  it('refuses to pretend when NOTHING on the pod was rendered on this cast', async () => {
    AUDIO_ROWS = ON_CAST_AUDIO.map((r) => ({ ...r, voice_id: 'some_retired_voice' }))
    const w = await mountLab()
    expect(w.findAll('.samples.primary .sample-row')).toHaveLength(0)
    expect(w.text()).toContain('Nothing on this pod was rendered on the casting above')
  })

  it('a clip whose voice cannot be established is never counted as on-cast', async () => {
    AUDIO_ROWS = [] // course_audio returned nothing for these ids
    const w = await mountLab()
    expect(w.findAll('.samples.primary .sample-row')).toHaveLength(0)
    expect(w.text()).toContain('Nothing on this pod was rendered on the casting above')
  })

  it('treats `eve` and `xai_eve` as one voice', async () => {
    AUDIO_ROWS = ON_CAST_AUDIO.map((r) => ({ ...r, voice_id: `xai_${r.voice_id}` }))
    const w = await mountLab()
    expect(w.findAll('.samples.primary .sample-row').length).toBeGreaterThan(0)
    expect(w.findAll('.offcast .sample-row')).toHaveLength(0)
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
