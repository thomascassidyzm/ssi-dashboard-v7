// @vitest-environment jsdom
/**
 * The standing rule, as a test (Tom, 2026-09-03): "all dropdowns in popty, or
 * in general in ANY of my work should have search/filter at the very top. we do
 * NOT want people having to scan down a whole long list of choices."
 *
 * If someone deletes the filter field from FilterSelect, or breaks matching on
 * the course code, this file fails. That is the whole point of putting the rule
 * here rather than in a markdown file nobody re-reads.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import FilterSelect from './FilterSelect.vue'
import { filterOptions, normaliseOptions } from '../../utils/optionFilter'

const LANGS = [
  'Arabic', 'Azerbaijani', 'Bengali', 'Welsh', 'German', 'English', 'French',
  'Irish', 'Gujarati', 'Hindi', 'Italian', 'Japanese', 'Kannada', 'Korean',
  'Lithuanian', 'Marathi', 'Punjabi', 'Portuguese', 'Sinhala', 'Spanish',
  'Tamil', 'Telugu', 'Urdu', 'Yoruba', 'Chinese',
]

function mountSelect(props = {}) {
  return mount(FilterSelect, {
    props: { options: LANGS, ...props },
    attachTo: document.body,
  })
}

async function openPanel(wrapper) {
  await wrapper.find('button.fs-button').trigger('click')
  await nextTick()
  await nextTick()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('FilterSelect — the filter-at-the-top rule', () => {
  it('puts a filter field at the top of the open panel, and focuses it', async () => {
    const wrapper = mountSelect()
    await openPanel(wrapper)

    const panel = document.querySelector('.fs-panel')
    expect(panel).toBeTruthy()

    const filter = panel.querySelector('input.fs-filter')
    expect(filter).toBeTruthy()
    // "At the very top": the filter precedes every option in document order.
    const firstOption = panel.querySelector('.fs-option')
    expect(filter.compareDocumentPosition(firstOption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(document.activeElement).toBe(filter)

    wrapper.unmount()
  })

  it('shows every option while the filter is empty', async () => {
    const wrapper = mountSelect()
    await openPanel(wrapper)
    expect(document.querySelectorAll('.fs-panel .fs-option').length).toBe(LANGS.length)
    wrapper.unmount()
  })

  it('narrows the list as you type', async () => {
    const wrapper = mountSelect()
    await openPanel(wrapper)

    const filter = wrapper.findComponent(FilterSelect).vm
    filter.query = 'wel'
    await nextTick()

    const labels = [...document.querySelectorAll('.fs-panel .fs-option-label')].map((n) => n.textContent)
    expect(labels).toEqual(['Welsh'])
    wrapper.unmount()
  })

  it('selecting still works and closes the panel', async () => {
    const wrapper = mountSelect()
    await openPanel(wrapper)

    const options = [...document.querySelectorAll('.fs-panel .fs-option')]
    const french = options.find((o) => o.textContent.includes('French'))
    french.click()
    await nextTick()

    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['French'])
    expect(wrapper.emitted('change')[0]).toEqual(['French'])
    expect(document.querySelector('.fs-panel')).toBeNull()
    wrapper.unmount()
  })

  it('leaves genuinely short lists filter-free', async () => {
    const wrapper = mount(FilterSelect, {
      props: { options: ['Target', 'Known'] },
      attachTo: document.body,
    })
    await openPanel(wrapper)
    expect(document.querySelector('.fs-panel')).toBeTruthy()
    expect(document.querySelector('.fs-panel input.fs-filter')).toBeNull()
    wrapper.unmount()
  })

  it('renders group headings for optgroup-shaped options', async () => {
    const wrapper = mount(FilterSelect, {
      props: {
        options: [
          { label: 'Course content', options: ['course_legos', 'course_seeds'] },
          { label: 'Shared', options: ['voices', 'shared_audio'] },
        ],
      },
      attachTo: document.body,
    })
    await openPanel(wrapper)
    const groups = [...document.querySelectorAll('.fs-panel .fs-group')].map((n) => n.textContent)
    expect(groups).toEqual(['Course content', 'Shared'])
    wrapper.unmount()
  })
})

describe('option filtering', () => {
  it('matches on the course code as well as the visible label', () => {
    const [{ options }] = normaliseOptions([
      { value: 'fra_for_eng', label: 'French for English Speakers' },
      { value: 'spa_for_eng', label: 'Spanish for English Speakers' },
    ])
    expect(filterOptions('fra_for_eng', options).map((o) => o.value)).toEqual(['fra_for_eng'])
    expect(filterOptions('spanish', options).map((o) => o.value)).toEqual(['spa_for_eng'])
  })

  it('treats a null option value as selected when the model is null', async () => {
    const wrapper = mount(FilterSelect, {
      props: { options: [{ value: null, label: 'all voices' }, { value: 'v1', label: 'Voice one' }], modelValue: null },
      attachTo: document.body,
    })
    await openPanel(wrapper)
    const selected = [...document.querySelectorAll('.fs-panel .fs-option.selected')].map((n) => n.textContent.trim())
    expect(selected).toEqual(['all voices'])
    wrapper.unmount()
  })
})

describe('option filtering', () => {
  it('keeps numeric option values usable', () => {
    const [{ options }] = normaliseOptions([
      { value: 24, label: 'Last 24h' },
      { value: 168, label: 'Last 7 days' },
    ])
    expect(filterOptions('7 days', options).map((o) => o.value)).toEqual([168])
    expect(filterOptions('', options).length).toBe(2)
  })
})
