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

// GET /api/pod-cast-voices — the curated pool for the course's target language.
// eng_for_guj's target is ENGLISH, so this is the English pool, and the five
// zh-steered voices the pod is actually cast on are in none of it. That is the
// case the picker exists for.
const POOLS = {
  course_code: 'eng_for_guj',
  target_lang: 'eng',
  known_lang: 'guj',
  target: {
    pool_key: 'eng',
    exists: true,
    pool: {
      f: [{ name: 'Olivia', provider: 'xai', voice_id: 'bedd6226' }, { name: 'Sonia', provider: 'azure', voice_id: 'en-GB-SoniaNeural' }],
      m: [{ name: 'Tom', provider: 'xai', voice_id: 'gfzdpspr5fdp' }, { name: 'Ryan', provider: 'azure', voice_id: 'en-GB-RyanNeural' }],
    },
  },
  known: { pool_key: 'guj', exists: true, pool: { f: [], m: [] } },
  sibling_keys: [],
}
// POST /api/pod-cast-voices — what the route answers after writing the cast.
// `ok` is asserted by the page: an unrouted /api/* on Vercel answers 200 with
// the SPA's HTML, which parses to {} and would otherwise read as success.
const APPLIED = {
  ok: true,
  course_code: 'eng_for_guj',
  pods: [{ pod_id: 'eng_for_guj:pod-0', speakers: 22 }],
  cast_fingerprint: 'newfingerprint00',
  gate: { ok: false, reason: 'fingerprint_mismatch' },
  audio_touched: false,
}
const DISCOVERED = {
  success: true,
  provider: 'xai',
  voices: [
    { id: 'disc_f', name: 'Discovered F', gender: 'female', locale: 'en' },
    { id: 'disc_m', name: 'Discovered M', gender: 'male', locale: 'en' },
  ],
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
      const u = String(url)
      if (u.startsWith('/api/pod-voice-approval')) {
        return { ok: true, json: async () => CASTING }
      }
      if (u.includes('/api/pod-cast-voices')) {
        return { ok: true, json: async () => (u === '/api/pod-cast-voices' ? APPLIED : POOLS) }
      }
      if (u.includes('/api/voices/discover/')) {
        return { ok: true, json: async () => DISCOVERED }
      }
      if (u.includes('/api/voices/preview')) {
        return { ok: true, json: async () => ({ success: true, audio: 'data:audio/mpeg;base64,AAA' }) }
      }
      return { ok: true, json: async () => ({ rows: [] }) }
    })
    window.confirm = vi.fn(() => true)
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

  // MANUAL VOICE CHOICE (Tom, 2026-08-11, after rejecting the Spanish cast:
  // "it's worth choosing the voices manually if there's only 2 of them").
  // The load-bearing property is that opening the panel and changing nothing
  // changes nothing — so both dropdowns must open on what is cast TODAY.
  describe('the two voice dropdowns', () => {
    it('offers exactly two slots, male and female', async () => {
      const w = await mountLab()
      const rows = w.findAll('.vpick-row')
      expect(rows).toHaveLength(2)
      expect(rows.map((r) => r.find('.vp-slot').text())).toEqual(['Male', 'Female'])
      expect(w.findAll('.vpick-row select')).toHaveLength(2)
      expect(w.findAll('.vpick-row .vp-play')).toHaveLength(2)
    })

    it('initialises to the voices the current cast uses for each gender', async () => {
      const w = await mountLab()
      const [male, female] = w.findAll('.vpick-row select')
      // The fixture is a BROKEN five-voice cast — the case the picker exists
      // for — so each slot opens on the voice carrying the most lines of that
      // gender: Jian across the male labels, Xia across the female ones.
      expect(male.element.value).toBe('xai|jpi39icg|zh')
      expect(female.element.value).toBe('xai|33g9t0jl|zh')
      // …and the option they are sitting on names itself as the current cast.
      expect(male.find('option:checked').text()).toContain('cast now')
    })

    it('nothing to apply until the human actually moves a dropdown', async () => {
      const w = await mountLab()
      expect(w.find('.vp-apply').attributes('disabled')).toBeDefined()
    })

    it('marks a voice steered at the wrong language, and names the pool', async () => {
      const w = await mountLab()
      const opts = w.findAll('.vpick-row select option').map((o) => o.text())
      // The cast's own zh voice on an English course — flagged in the row.
      expect(opts.some((t) => t.includes('jpi39icg') && t.includes('WRONG LANGUAGE'))).toBe(true)
      // The curated pool is offered, marked as the pool, and is not flagged.
      const poolOpt = opts.find((t) => t.includes('gfzdpspr5fdp'))
      expect(poolOpt).toContain('pool eng')
      expect(poolOpt).not.toContain('WRONG LANGUAGE')
      // xAI is retired from selection (Tom, 2026-08-27): the wider discovered
      // inventory is never fetched, so it never appears in the picker.
      expect(opts.some((t) => t.includes('Discovered M'))).toBe(false)
    })

    it('previews the selected voice through the shared preview endpoint', async () => {
      const w = await mountLab()
      await w.findAll('.vpick-row .vp-play')[0].trigger('click')
      await flushPromises()
      const call = global.fetch.mock.calls.find((c) => String(c[0]).includes('/api/voices/preview'))
      expect(call).toBeTruthy()
      const body = JSON.parse(call[1].body)
      expect(body.voiceId).toBe('jpi39icg')
      expect(body.provider).toBe('xai')
      expect(body.text.length).toBeGreaterThan(0)
    })

    it('applies the chosen pair to the CURRENT pod, casting only', async () => {
      const w = await mountLab()
      const [male, female] = w.findAll('.vpick-row select')
      await male.setValue('xai|gfzdpspr5fdp|en')
      await female.setValue('xai|bedd6226|en')
      expect(w.find('.vp-apply').attributes('disabled')).toBeUndefined()

      await w.find('.vp-apply').trigger('click')
      await flushPromises()

      const post = global.fetch.mock.calls.find(
        (c) => String(c[0]) === '/api/pod-cast-voices' && c[1] && c[1].method === 'POST',
      )
      expect(post).toBeTruthy()
      expect(post[1].headers.Authorization).toBe('Bearer tok')
      const body = JSON.parse(post[1].body)
      expect(body).toMatchObject({
        course_code: 'eng_for_guj',
        pod_id: 'eng_for_guj:pod-0',
        cast_fingerprint: 'abc1234567890def',
      })
      expect(body.target.m).toMatchObject({ provider: 'xai', voice_id: 'gfzdpspr5fdp' })
      expect(body.target.f).toMatchObject({ provider: 'xai', voice_id: 'bedd6226' })
      // Casting only: the apply never reaches the audio-generation endpoint.
      expect(global.fetch.mock.calls.some((c) => String(c[0]).includes('generate-audio'))).toBe(false)
      // The new fingerprint and the re-locked gate are stated, not implied.
      expect(w.text()).toContain('newfingerprint00')
      expect(w.text()).toMatch(/generation is locked until you approve this cast/)
    })

    it('does not report success when the route is not deployed', async () => {
      // An unrouted /api/* on Vercel falls through to the SPA: 200, HTML body,
      // which parses to {}. Reading that as "applied" would tell Tom a cast was
      // written when nothing was.
      const w = await mountLab()
      global.fetch.mockImplementation(async () => ({ ok: true, json: async () => ({}) }))
      await w.findAll('.vpick-row select')[0].setValue('xai|gfzdpspr5fdp|en')
      await w.find('.vp-apply').trigger('click')
      await flushPromises()
      expect(w.text()).toMatch(/Failed: the endpoint did not confirm a write/)
    })
  })

  // CANDIDATE CASTS SIDE BY SIDE (Tom, 2026-08-11, having gone looking for the
  // Azure-vs-xAI Spanish samples on this page and found nothing: "I need it to
  // be where I can see it - you need to do whatever you need to do to make this
  // an actual tool that's usable").
  //
  // The load-bearing property is that the two casts DO NOT COLLAPSE INTO ONE:
  // each column's clips are the ones actually rendered on ITS pair, read from
  // course_audio. A candidate cannot borrow the cast's clips, and the cast
  // cannot claim the candidate's.
  describe('candidate casts, side by side', () => {
    async function addCandidatePair(w) {
      const [male, female] = w.findAll('.vpick-row select')
      await male.setValue('xai|gfzdpspr5fdp|en')
      await female.setValue('xai|bedd6226|en')
      await w.find('.vp-add').trigger('click')
      await flushPromises()
      return w
    }

    it('shows the pod\'s cast and a defined pair as two columns', async () => {
      const w = await mountLab()
      expect(w.findAll('.candidate')).toHaveLength(1) // just the cast
      await addCandidatePair(w)
      const cols = w.findAll('.candidate')
      expect(cols.length).toBe(2)
      expect(cols[0].classes()).toContain('cast')
      expect(cols[1].classes()).toContain('defined')
      // Each column names its own two voices with provider and id.
      expect(cols[1].text()).toContain('gfzdpspr5fdp')
      expect(cols[1].text()).toContain('bedd6226')
      // Adding a candidate writes nothing.
      expect(global.fetch.mock.calls.some((c) => c[1] && c[1].method === 'POST')).toBe(false)
    })

    it('is honest that a fresh candidate has no clips, and offers to render some', async () => {
      const w = await mountLab()
      await addCandidatePair(w)
      const cand = w.findAll('.candidate')[1]
      expect(cand.findAll('.sample-row')).toHaveLength(0)
      expect(cand.text()).toContain('Nothing on this pod has been rendered on this pair yet')
      expect(cand.find('.gen-sample').text()).toMatch(/generate a sample/i)
      // …while the cast column still has its own.
      expect(w.findAll('.candidate.cast .samples.primary .sample-row').length).toBeGreaterThan(0)
    })

    it('gives each column only the clips rendered on ITS pair — never the other\'s', async () => {
      // Half the pod is now rendered on the candidate's male voice: those clips
      // are off-cast, and they are the candidate's evidence, not the cast's.
      AUDIO_ROWS = ON_CAST_AUDIO.map((r, i) =>
        i % 2 === 0 ? { ...r, voice_id: 'gfzdpspr5fdp', created_at: '2026-08-10T00:00:00Z' } : r)
      const w = await mountLab()
      await addCandidatePair(w)
      const [castCol, candCol] = w.findAll('.candidate')

      const castVoices = castCol.findAll('.samples.primary .sample-row .s-voice').map((n) => n.text())
      const candVoices = candCol.findAll('.sample-row .s-voice').map((n) => n.text())
      expect(candVoices.length).toBeGreaterThan(0)
      // The candidate's clips are all on the candidate's own voice…
      expect(candVoices.every((v) => v.includes('gfzdpspr5fdp'))).toBe(true)
      // …and none of them are counted as evidence for the cast.
      expect(castVoices.some((v) => v.includes('gfzdpspr5fdp'))).toBe(false)
      expect(castCol.text()).toMatch(/clips on this pod\s+were rendered on the casting above/)
    })

    it('approving a candidate casts the pod on it, then approves that digest', async () => {
      const w = await mountLab()
      await addCandidatePair(w)
      await w.find('.candidate.defined .cand-approve').trigger('click')
      // The chain is cast-write → re-read → approve, and each hop resolves a
      // dynamic import, so it spans macrotasks rather than microtasks.
      for (let i = 0; i < 50; i++) {
        await flushPromises()
        await new Promise((r) => setTimeout(r, 0))
        if (global.fetch.mock.calls.some((c) => String(c[0]) === '/api/pod-voice-approval' && c[1] && c[1].method === 'POST')) break
      }

      const cast = global.fetch.mock.calls.find(
        (c) => String(c[0]) === '/api/pod-cast-voices' && c[1] && c[1].method === 'POST',
      )
      expect(cast, 'the pair is written as the cast').toBeTruthy()
      expect(JSON.parse(cast[1].body).target.m).toMatchObject({ voice_id: 'gfzdpspr5fdp' })

      const approval = global.fetch.mock.calls.find(
        (c) => String(c[0]) === '/api/pod-voice-approval' && c[1] && c[1].method === 'POST',
      )
      expect(approval, 'and the approval is recorded in the same action').toBeTruthy()
      // Against the digest the CAST WRITE returned — not the stale one the page
      // loaded with, which the gate would refuse with a 409.
      expect(JSON.parse(approval[1].body)).toMatchObject({
        decision: 'approve',
        cast_fingerprint: 'newfingerprint00',
      })
      // No audio was generated on the way.
      expect(global.fetch.mock.calls.some((c) => String(c[0]).includes('generate-audio'))).toBe(false)
    })

    it('rejecting a candidate writes nothing and leaves the cast alone', async () => {
      const w = await mountLab()
      await addCandidatePair(w)
      await w.find('.candidate.defined .reject').trigger('click')
      await flushPromises()
      expect(w.findAll('.candidate')).toHaveLength(1)
      expect(global.fetch.mock.calls.some((c) => c[1] && c[1].method === 'POST')).toBe(false)
    })

    it('surfaces the pair actually heard on the pod when the audio names exactly two voices', async () => {
      // Alternating per SENTENCE, not per row: the rows are target/known pairs,
      // so `i % 2` would put every target clip on one voice and every known
      // clip on the other — one target voice, and no pair to infer.
      AUDIO_ROWS = ON_CAST_AUDIO.map((r, i) => ({
        ...r,
        voice_id: Math.floor(i / 2) % 2 === 0 ? 'yis75yfp' : 'ekhwx401',
        created_at: '2026-06-10T00:00:00Z',
      }))
      const w = await mountLab()
      const heard = w.find('.candidate.heard')
      expect(heard.exists()).toBe(true)
      expect(heard.text()).toContain('yis75yfp')
      expect(heard.text()).toContain('ekhwx401')
      expect(heard.findAll('.sample-row').length).toBeGreaterThan(0)
      // It is not offered as approvable — a clip row records no provider.
      expect(heard.find('.cand-approve').exists()).toBe(false)
      // And the cast column still refuses to pretend.
      expect(w.text()).toContain('Nothing on this pod was rendered on the casting above')
    })
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
