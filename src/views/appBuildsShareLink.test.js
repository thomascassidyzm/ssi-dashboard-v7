// @vitest-environment jsdom
//
// The rule this file exists to keep true (job #697, Tom 2026-09-06: "can we put this
// link now on /builds as well? so that there's no confusion"):
//
//   the URL shown as copyable text on /builds is the SAME string the download button
//   fetches — character for character, never a hand-kept second copy.
//
// Two things that must agree with nothing comparing them is exactly how a tester gets
// sent a dead link. So something compares them, here.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppBuilds from './AppBuilds.vue'
import manifest from '../content/app-builds.json'

const androidBuilds = (manifest.builds || []).filter(b => b.platform === 'android')

describe('/builds share link', () => {
  it('shows every build URL in full, identical to its download href', () => {
    const wrapper = mount(AppBuilds)
    const hrefs = wrapper.findAll('a.download-btn').map(a => a.attributes('href'))
    const shown = wrapper.findAll('code.share-url').map(c => c.text())

    expect(hrefs.length).toBe(androidBuilds.length)
    expect(shown).toEqual(hrefs)
    expect(shown).toEqual(androidBuilds.map(b => b.url))
  })

  it('never truncates the URL — no ellipsis a copy could swallow', () => {
    const wrapper = mount(AppBuilds)
    for (const c of wrapper.findAll('code.share-url')) {
      expect(c.text()).not.toContain('…')
      expect(c.text()).not.toContain('...')
      expect(c.text().startsWith('https://')).toBe(true)
    }
  })

  it('puts the sha256 beside the link, so link and checksum copy together', () => {
    const wrapper = mount(AppBuilds)
    const shas = wrapper.findAll('.share-sha').map(p => p.text())
    for (const [i, build] of androidBuilds.entries()) {
      expect(shas[i]).toContain(build.sha256)
    }
  })

  it('says in plain words that the link needs no Popty account', () => {
    const wrapper = mount(AppBuilds)
    expect(wrapper.find('.share-lede').text()).toMatch(/no Popty account/i)
  })
})
