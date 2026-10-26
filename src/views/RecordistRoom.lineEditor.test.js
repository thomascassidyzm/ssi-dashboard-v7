// "EDIT THIS LINE" (Aran, 2026-10-15, job #709): "I need a way, just for me, to edit a sentence in
// the recording tool if I'm not happy with it."
//
// What this pins, on the real booth and the real editor, with a mocked mic, queue and server:
//   · the control is drawn ONLY when the server says this session is a God admin — never for an
//     ordinary artist or a private-link visitor (no session: not even a question to the server);
//   · it is never on screen while the mic is live, and the open editor goes when the mic opens;
//   · the editor CHECKS before it SAVES: there is no Save until a preview has come back, and a
//     word changed after the check takes Save away again; Save is the only thing that applies;
//   · a live course's line opens read-only with "editing live courses: ask Tom".
// The server's half (the refusals, the door's dry run vs apply) is booth-line-edit-router.test.cjs.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const api = vi.hoisted(() => ({
  canEditLines: null, readLine: null, previewEdit: null, applyEdit: null, undoEdit: null,
}))
vi.mock('./recordist/line-edit-api.js', async (importOriginal) => {
  const orig = await importOriginal()
  return {
    ...orig,
    canEditLines: (...a) => api.canEditLines(...a),
    readLine: (...a) => api.readLine(...a),
    previewEdit: (...a) => api.previewEdit(...a),
    applyEdit: (...a) => api.applyEdit(...a),
    undoEdit: (...a) => api.undoEdit(...a),
  }
})

vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(0),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(), reset: vi.fn(),
    queueTake: vi.fn(), markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: new Map(), failed: new Map(), flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))
vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  resolveCaptureProfile: () => 'phone',
  useTapRecorder: () => ({
    isRecording: ref(true), level: ref(0.3), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(true), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0.4), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    awaitLeadIn: vi.fn().mockResolvedValue(undefined), beginLine: vi.fn(),
    endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' }))),
    discardLine: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import RecordistRoom from './RecordistRoom.vue'
import BoothLineEditor from './recordist/BoothLineEditor.vue'

const SEED_LINE = 'seed:11111111-1111-4111-8111-111111111111:target1'
const LINES = [
  { id: SEED_LINE, kind: 'seed', role: 'target1', seedNumber: 3, courseCode: 'cym_nv2_for_eng', text: 'Dw i isio mynd', knownText: 'I want to go', recorded: false, clipUrl: null },
  { id: 'lego:l-2:target1', kind: 'lego', role: 'target1', text: 'mynd', knownText: 'to go', recorded: false, clipUrl: null },
]
const ROW = { kind: 'seed', role: 'target1', courseCode: 'cym_nv2_for_eng', seedNumber: 3, legoId: null, targetText: 'Dw i isio mynd', knownText: 'I want to go', editable: true, note: null }
const PREVIEW = {
  ok: true, dryRun: true, courseCode: 'cym_nv2_for_eng', kind: 'seed',
  changes: [{ side: 'target', before: 'Dw i isio mynd', after: 'Dw i isio aros', wordsChanged: true }],
  tiling: { checked: true, valid: false, untiled: 'aros', message: 'Seed 3 would no longer tile — not taught by any LEGO up to here: aros' },
  recordings: [{ slot: 'target1', fate: 'requeued', words: "the first Welsh voice's take goes back on the recording queue" }],
}

async function booth() {
  global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
    ok: true, status: 200,
    json: async () => ({ displayName: 'Aran', languageName: 'Welsh', total: 2, recorded: 0, remaining: 2, lines: LINES }),
  }))
  const w = mount(RecordistRoom, { props: { voiceId: 'human_aran_cym_n' }, global: { stubs: { RouterLink: true } } })
  await flushPromises()
  return w
}

beforeEach(() => {
  api.readLine = vi.fn().mockResolvedValue({ ...ROW })
  api.previewEdit = vi.fn().mockResolvedValue(PREVIEW)
  api.applyEdit = vi.fn().mockResolvedValue({ ok: true, applied: true, courseCode: 'cym_nv2_for_eng', recordings: PREVIEW.recordings, undoFile: 'u.json' })
  api.undoEdit = vi.fn().mockResolvedValue({ ok: true, undone: true })
})
afterEach(() => { vi.restoreAllMocks() })

describe('the booth draws "Edit this line" only for the allowlist', () => {
  it('an ordinary artist or a private-link visitor sees no edit control anywhere', async () => {
    api.canEditLines = vi.fn().mockResolvedValue(false)
    const w = await booth()
    expect(w.find('[data-test="ready-line"]').text()).toBe('Dw i isio mynd')
    expect(w.find('[data-test="admin-edit-line"]').exists()).toBe(false)
    await w.find('[data-test="open-sheet"]').trigger('click')
    await w.find('.roster-toggle').trigger('click')
    expect(w.find('[data-test="row-admin-edit"]').exists()).toBe(false)
    expect(w.find('[data-test="line-editor"]').exists()).toBe(false)
  })

  it('a God admin gets it under the line and on each line of the list; it is gone while the mic is live', async () => {
    api.canEditLines = vi.fn().mockResolvedValue(true)
    const w = await booth()
    expect(w.find('[data-test="admin-edit-line"]').text()).toBe('Edit this line')
    await w.find('[data-test="open-sheet"]').trigger('click')
    await w.find('.roster-toggle').trigger('click')
    await w.find('.sh-btn').trigger('click')
    expect(w.findAll('[data-test="row-admin-edit"]').length).toBeGreaterThan(0)
    await w.find('[data-test="close-sheet"]').trigger('click')

    await w.find('[data-test="admin-edit-line"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="line-editor"]').exists()).toBe(true)
    expect(api.readLine).toHaveBeenCalledWith(SEED_LINE)
    await w.find('[data-test="ble-close"]').trigger('click')

    await w.find('.btn-begin').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="admin-edit-line"]').exists()).toBe(false)
    expect(w.find('[data-test="line-editor"]').exists()).toBe(false)
  })
})

describe('the editor previews before it applies', () => {
  async function editor(row = ROW) {
    api.readLine = vi.fn().mockResolvedValue({ ...row })
    const w = mount(BoothLineEditor, { props: { line: LINES[0] } })
    await flushPromises()
    return w
  }

  it('there is no Save until the check has come back; Save applies; Undo replays the door undo', async () => {
    const w = await editor()
    expect(w.find('[data-test="ble-target"]').element.value).toBe('Dw i isio mynd')
    expect(w.find('[data-test="ble-known"]').element.value).toBe('I want to go')
    expect(w.find('[data-test="ble-save"]').exists()).toBe(false)
    await w.find('[data-test="ble-target"]').setValue('Dw i isio aros')
    await w.find('[data-test="ble-check"]').trigger('click')
    await flushPromises()
    expect(api.previewEdit).toHaveBeenCalledWith(SEED_LINE, { targetText: 'Dw i isio aros' })
    expect(api.applyEdit).not.toHaveBeenCalled()
    expect(w.find('[data-test="ble-tiling"]').text()).toContain('aros')
    expect(w.find('[data-test="ble-recordings"]').text()).toContain('goes back on the recording queue')
    // The seed would not tile: Save says so.
    expect(w.find('[data-test="ble-save"]').text()).toBe('Save anyway')

    // A word changed after the check: the check is void, Save goes.
    await w.find('[data-test="ble-target"]').setValue('Dw i isio aros adre')
    expect(w.find('[data-test="ble-save"]').exists()).toBe(false)
    await w.find('[data-test="ble-check"]').trigger('click')
    await flushPromises()

    await w.find('[data-test="ble-save"]').trigger('click')
    await flushPromises()
    expect(api.applyEdit).toHaveBeenCalledWith(SEED_LINE, { targetText: 'Dw i isio aros adre' })
    expect(w.find('[data-test="ble-saved"]').exists()).toBe(true)
    expect(w.emitted('applied')[0][0]).toMatchObject({ lineId: SEED_LINE, targetText: 'Dw i isio aros adre', knownText: 'I want to go' })

    await w.find('[data-test="ble-undo"]').trigger('click')
    await flushPromises()
    expect(api.undoEdit).toHaveBeenCalledWith('cym_nv2_for_eng', 'u.json')
    expect(w.find('[data-test="ble-undone"]').exists()).toBe(true)
  })

  it('a live course line is read-only: no box, no check, "editing live courses: ask Tom"', async () => {
    const w = await editor({ ...ROW, courseCode: 'cym_n_for_eng', editable: false, note: 'editing live courses: ask Tom' })
    expect(w.find('[data-test="ble-ro-target"]').text()).toBe('Dw i isio mynd')
    expect(w.find('[data-test="ble-live-note"]').text()).toContain('editing live courses: ask Tom')
    expect(w.find('textarea').exists()).toBe(false)
    expect(w.find('[data-test="ble-check"]').exists()).toBe(false)
    expect(api.previewEdit).not.toHaveBeenCalled()
  })
})
