// @vitest-environment jsdom
/**
 * THE GATE ON A RE-RECORD SESSION GOING LIVE.
 *
 * When a recordist plays a take back, they must hear the PROCESSED, STORED
 * clip — the bytes served back off S3 after the server's trim chain — not the
 * raw local capture. The first few takes of a session are meant to verify the
 * just-fixed trim pipeline BY EAR, and a raw-buffer preview sounds perfect no
 * matter what the stored clip suffered. That is precisely how the head-clipping
 * bug went unheard for months (docs/audio-forensics-2026-08-14/).
 *
 * PodLongTakeStudio is the studio the T-20 pod-0 re-records actually use, and
 * before this it had no playback at all. These tests hold the line:
 *   - after upload, the played URL is the stored-clip route, never a blob: url
 *   - before upload, the control is disabled and labelled, never silently raw
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import StoredTakeButton from './StoredTakeButton.vue'
import PodLongTakeStudio from './PodLongTakeStudio.vue'
import { useUploadQueue } from '@/composables/useAudioUpload'
import { storedClipUrl, STORED_LABEL, PENDING_LABEL, FAILED_LABEL, LOCAL_LABEL } from '@/composables/useStoredClip'

const STORED_UUID = 'AAAA1111-BBBB-2222-CCCC-333344445555'

// A tap recorder that always yields a big-enough take.
const recorder = {
  isRecording: ref(false),
  level: ref(0),
  clipping: ref(false),
  devices: ref([]),
  appliedSettings: ref(null),
  error: ref(null),
  listDevices: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  beginLine: vi.fn(),
  endLine: vi.fn().mockResolvedValue(new Blob(['x'.repeat(4000)], { type: 'audio/webm' })),
  discardLine: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
}
vi.mock('@/composables/useTapRecorder', () => ({ useTapRecorder: () => recorder }))
vi.mock('@/composables/useMainOptions', () => ({
  useMainOptions: () => ({ hasMainOptions: ref(false), goToMainOptions: vi.fn() })
}))
vi.mock('@/services/api', () => ({ getApiUrl: () => 'http://api.test' }))

const PLAN = {
  speakers: ['Cai'],
  items: [
    { podId: 'cym_n:pod-0', podTitle: 'Pod 0', sentenceId: 's1', kind: 'target', speaker: 'Cai', line: { targetText: 'bore da', knownText: 'good morning' }, recorded: false },
    { podId: 'cym_n:pod-0', podTitle: 'Pod 0', sentenceId: 's2', kind: 'target', speaker: 'Cai', line: { targetText: 'sut wyt ti', knownText: 'how are you' }, recorded: false },
  ]
}

/** Mount the studio and get it into a recording session with one line read. */
async function studioWithOneTakeRead() {
  const w = mount(PodLongTakeStudio, { props: { courseCode: 'cym_n', voiceId: 'voice-cai' } })
  await flushPromises()
  await w.find('.btn-begin').trigger('click')   // Start
  await flushPromises()
  await w.find('.ctl-next').trigger('click')    // read line 0, advance to line 1
  await flushPromises()
  return w
}

describe('PodLongTakeStudio — the recordist hears the stored clip', () => {
  let played
  let uploadResolves

  beforeEach(() => {
    played = []
    uploadResolves = true
    // jsdom has no layout, so the autocue's scrollIntoView is absent.
    Element.prototype.scrollIntoView = vi.fn()
    useUploadQueue().resetQueue()
    vi.stubGlobal('Audio', class {
      constructor() { this.src = null }
      play() { played.push(this.src); return Promise.resolve() }
      pause() {}
    })
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('recording-plan')) {
        return { ok: true, status: 200, json: async () => PLAN }
      }
      if (String(url).includes('recording/upload')) {
        if (!uploadResolves) return { ok: false, status: 400, json: async () => ({ error: 'no audible speech' }) }
        return { ok: true, status: 200, json: async () => ({ success: true, uuid: STORED_UUID, s3Key: `mastered/${STORED_UUID}.mp3` }) }
      }
      return { ok: true, status: 200, json: async () => ({}) }
    }))
  })

  afterEach(() => { vi.unstubAllGlobals() })

  it('plays the STORED-clip route for an uploaded take — never a blob: url', async () => {
    const w = await studioWithOneTakeRead()
    // let the background queue land the upload
    await vi.waitUntil(() => useUploadQueue().storedUuidFor(0) === STORED_UUID, { timeout: 2000 })
    await flushPromises()

    const btn = w.find('.last-take-bar .stored-take-btn')
    expect(btn.attributes('disabled')).toBeUndefined()
    expect(btn.text()).toContain(STORED_LABEL)
    expect(btn.text()).toContain('STORED')

    await btn.trigger('click')
    expect(played).toEqual([storedClipUrl(STORED_UUID)])
    expect(played[0]).toContain(`/api/production/audio/${STORED_UUID}/stream`)
    expect(played[0].startsWith('blob:')).toBe(false)
  })

  it('disables and labels playback while the take is still uploading', async () => {
    // Hold the upload open so the take stays in flight.
    let release
    const held = new Promise(r => { release = r })
    fetch.mockImplementation(async (url) => {
      if (String(url).includes('recording-plan')) return { ok: true, status: 200, json: async () => PLAN }
      if (String(url).includes('recording/upload')) {
        await held
        return { ok: true, status: 200, json: async () => ({ success: true, uuid: STORED_UUID }) }
      }
      return { ok: true, status: 200, json: async () => ({}) }
    })

    const w = await studioWithOneTakeRead()
    const btn = w.find('.last-take-bar .stored-take-btn')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(btn.text()).toContain(PENDING_LABEL)
    // Never offers the raw local capture dressed up as the take.
    expect(btn.text()).not.toContain(STORED_LABEL)
    expect(btn.text()).not.toContain(LOCAL_LABEL)

    await btn.trigger('click')
    expect(played).toEqual([])

    release()
    await flushPromises()
  })

  it('says the take was not saved when the upload failed', async () => {
    uploadResolves = false
    const w = await studioWithOneTakeRead()
    await vi.waitUntil(() => useUploadQueue().failedIndices.has(0), { timeout: 2000 })
    await flushPromises()

    const btn = w.find('.last-take-bar .stored-take-btn')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(btn.text()).toContain(FAILED_LABEL)
    await btn.trigger('click')
    expect(played).toEqual([])
  })

  it('marks which line is playing, per line', async () => {
    const w = await studioWithOneTakeRead()
    await vi.waitUntil(() => useUploadQueue().storedUuidFor(0) === STORED_UUID, { timeout: 2000 })
    await flushPromises()

    const lineBtn = w.find('.cue-line .cue-play')
    expect(lineBtn.exists()).toBe(true)
    await lineBtn.trigger('click')
    await flushPromises()
    expect(w.find('.cue-line .cue-play').classes()).toContain('playing')
    expect(w.find('.cue-line .cue-play').text()).toContain('Playing stored clip')
  })

  it('tells the recordist, on screen, that playback is the server\'s processed clip', async () => {
    const w = await studioWithOneTakeRead()
    expect(w.find('.stored-note').text()).toContain('processed clip stored on the server')
    expect(w.find('.stored-note').text()).toContain('never your raw local recording')
  })
})

describe('StoredTakeButton labels bytes honestly', () => {
  it('says STORED only when there is a server uuid', () => {
    const w = mount(StoredTakeButton, { props: { uuid: STORED_UUID } })
    expect(w.text()).toContain('STORED')
    expect(w.text()).toContain(STORED_LABEL)
    expect(w.attributes('disabled')).toBeUndefined()
  })

  it('labels a pre-upload local blob as RAW LOCAL, never as stored', () => {
    const w = mount(StoredTakeButton, { props: { uuid: null, localUrl: 'blob:local-1' } })
    expect(w.text()).toContain('RAW LOCAL')
    expect(w.text()).not.toContain('STORED')
    expect(w.attributes('title')).toContain('before the server trims and masters it')
  })

  it('disables playback pre-upload when no local fallback is allowed', () => {
    const w = mount(StoredTakeButton, { props: { uuid: null, localUrl: 'blob:local-1', allowLocal: false } })
    expect(w.attributes('disabled')).toBeDefined()
    expect(w.text()).toContain(PENDING_LABEL)
  })
})

describe('the upload queue surfaces the stored identity', () => {
  beforeEach(() => {
    useUploadQueue().resetQueue()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true, uuid: STORED_UUID }) })))
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('records the uuid the server minted, keyed by item index', async () => {
    const q = useUploadQueue()
    q.queueUpload({ blob: new Blob(['x']), courseCode: 'cym_n', uuid: null, metadata: {}, provenance: {}, itemIndex: 4 })
    await vi.waitUntil(() => q.uploadedIndices.has(4), { timeout: 2000 })
    expect(q.storedUuidFor(4)).toBe(STORED_UUID)
  })

  it('drops the stored uuid when the slot is re-recorded, so the old take is never played as the new one', async () => {
    const q = useUploadQueue()
    q.queueUpload({ blob: new Blob(['x']), courseCode: 'cym_n', uuid: null, metadata: {}, provenance: {}, itemIndex: 2 })
    await vi.waitUntil(() => q.storedUuidFor(2) === STORED_UUID, { timeout: 2000 })

    let release
    const held = new Promise(r => { release = r })
    fetch.mockImplementation(async () => { await held; return { ok: true, status: 200, json: async () => ({ success: true, uuid: 'NEW-UUID' }) } })
    q.queueUpload({ blob: new Blob(['y']), courseCode: 'cym_n', uuid: null, metadata: {}, provenance: {}, itemIndex: 2 })
    expect(q.storedUuidFor(2)).toBeNull()

    release()
    await vi.waitUntil(() => q.storedUuidFor(2) === 'NEW-UUID', { timeout: 2000 })
  })
})
