// NO SPINNER OUTLIVES ITS REQUEST (job #804, Kai 15 Oct): when Popty restarted mid-render the
// phrase editor kept "Regenerating…" on screen for ever. The parent now calls
// failPendingAuditions(message) on any failure; a role already finished is left as it was.
//
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PhraseEditModal from './PhraseEditModal.vue'

const phrase = { id: 'p1', known_text: 'I want', target_text: 'Ich will', known_audio_uuid: 'k', target1_audio_uuid: 't1', target2_audio_uuid: 't2' }

describe('PhraseEditModal — an interrupted render stops every spinner', () => {
  it('turns the roles still regenerating into the plain message, and keeps a finished one', async () => {
    const w = mount(PhraseEditModal, { props: { visible: true, phrase }, attachTo: document.body })
    w.vm.beginAudition(['target1', 'target2'])
    w.vm.setAuditionResult('target1', { url: null, durationMs: null })
    await nextTick()
    expect(document.body.textContent).toContain('Regenerating…')
    w.vm.failPendingAuditions('Interrupted — please try again')
    await nextTick()
    expect(document.body.textContent).not.toContain('Regenerating…')
    expect(document.body.textContent).toContain('Interrupted — please try again')
    expect(document.body.textContent).toContain('Regenerated (preview unavailable)')
    w.unmount()
  })
})
