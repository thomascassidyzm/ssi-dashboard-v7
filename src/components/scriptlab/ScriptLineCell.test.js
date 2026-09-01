// The three-column Script Lab cell — CANONICAL || KNOWN || TARGET.
//
// Two things are worth a test here, and they are the two ways this screen could
// hurt somebody:
//
//   1. The KNOWN column has no source of truth yet. canonical_pod_scenarios
//      carries english_text, target_text and target_lang and nothing else, so a
//      known cell that ACCEPTED an edit would take Aran's correction and write
//      it nowhere, with no error. It must be read-only, and it must say why.
//   2. Splitting the stacked cell into columns must not cost the editing
//      behaviour repaired the same day. The cell reimplements nothing: every
//      handler comes from the parent through `ed`, and this asserts the tap and
//      the save actually reach it.
//
// The rows are real health-general-welsh rows out of canonical_pod_scenarios,
// not invented Welsh.
//
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ScriptLineCell from './ScriptLineCell.vue'

const ENGLISH = "If I say anything that isn't clear, please stop me and I'll say it again."
const WELSH = "Os dw i'n deud rhywbeth sydd ddim yn glir, stopiwch fi, plîs — ac mi ddeuda i o eto."

const step = (over = {}) => ({
  ref: null,
  payload: { id: 'health-general-welsh:HG01', speaker: 'HG01', text: ENGLISH, target: WELSH, targetLang: 'cym_n', ...over }
})

/** A stand-in for the parent view's editing surface, so we can see what it is asked to do. */
function editor (over = {}) {
  return {
    drafts: {},
    stored: (s, f) => (f === 'target' ? s.payload.target : s.payload.text) ?? '',
    isEditing: () => false,
    isDirty: () => false,
    displayText: (s, f) => (f === 'target' ? s.payload.target : s.payload.text) ?? '',
    startEdit: vi.fn(),
    commitEdit: vi.fn(),
    discardEdit: vi.fn(),
    registerGrower: vi.fn(),
    autoGrow: vi.fn(),
    ...over
  }
}

const KNOWN = { key: 'known', label: 'Known', editable: false, readsFrom: 'text', mirrorsCanonical: true }
const TARGET = { key: 'target', label: 'Target · cym_n', field: 'target', editable: true, saveLabel: s => `Save ${s.payload.targetLang}` }

describe('ScriptLineCell', () => {
  it('renders the known column read-only, marked as coinciding with canonical', async () => {
    const ed = editor()
    const w = mount(ScriptLineCell, { props: { step: step(), col: KNOWN, ed } })

    expect(w.text()).toContain(ENGLISH)
    expect(w.text()).toContain('= canonical')
    // No editor is offered, and no tap opens one — the failure mode is a cell
    // that looks editable and writes nowhere.
    expect(w.find('.canonical-read').exists()).toBe(false)
    await w.find('.ro-cell').trigger('click')
    expect(ed.startEdit).not.toHaveBeenCalled()
  })

  it('hands taps and saves on an editable column back to the parent, never to its own logic', async () => {
    const ed = editor()
    const w = mount(ScriptLineCell, { props: { step: step(), col: TARGET, ed } })

    expect(w.text()).toContain(WELSH)
    await w.find('.canonical-read').trigger('click')
    expect(ed.startEdit).toHaveBeenCalledTimes(1)
    expect(ed.startEdit.mock.calls[0][1]).toBe('target')
  })

  it('names the target language on the save button while an editor is open', () => {
    const s = step()
    const ed = editor({ isEditing: () => true, isDirty: () => true, drafts: { 'target:health-general-welsh:HG01': WELSH } })
    const w = mount(ScriptLineCell, { props: { step: s, col: TARGET, ed } })

    expect(w.find('.btn-confirm').text()).toBe('Save cym_n')
  })

  it('offers no target editor on a line with no declared target language', () => {
    const w = mount(ScriptLineCell, { props: { step: step({ target: null, targetLang: null }), col: TARGET, ed: editor() } })

    expect(w.find('.canonical-read').exists()).toBe(false)
    expect(w.find('textarea').exists()).toBe(false)
    expect(w.text()).toContain('—')
  })

  it('shows a target with no declared language as a specimen rather than an overlay to save into', () => {
    const w = mount(ScriptLineCell, { props: { step: step({ targetLang: null }), col: TARGET, ed: editor() } })

    expect(w.text()).toContain(WELSH)
    expect(w.text()).toContain('specimen · no language declared')
    expect(w.find('.canonical-read').exists()).toBe(false)
  })
})
