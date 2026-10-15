// @vitest-environment jsdom
// EVERY SECTION, ALWAYS LISTED (Aran, 2026-10-15, job #823: "This page should always show all the
// available sets. They should all be listed in the right-hand side, and if they're checked in the
// right-hand side they should appear on the left as well."). Whole sections kept vanishing from
// his booth home: the North LEGOs, then the North sentences. These pin his three rules:
//   1. "What I'm doing" lists every section — finished ones and ones still being counted too.
//   2. Every ticked section is on the left: the Up next hero, a card, or a finished row.
//   3. A partial summary (a count that failed) never drops a section.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BoothHome from './BoothHome.vue'
import { homeLayout, keepListedSections, withDeviceTakes, batchTickId } from './booth-home.js'

const batches = (sizes) => {
  let at = 0
  return sizes.map(([total, recorded], i) => { const from = at + 1; at += total; return { n: i + 1, from, to: at, total, recorded } })
}
const track = (key, kind, sizes, extra = {}) => {
  const b = batches(sizes)
  return {
    key, kind, courseCode: key.split('.')[1], title: key, short: kind, what: '', cls: '',
    total: b.reduce((n, x) => n + x.total, 0), recorded: b.reduce((n, x) => n + x.recorded, 0), batches: b, ...extra,
  }
}
// ARAN'S LIVE SUMMARY, read 15 Oct (job #823), cut down: ten sections, three of them fully recorded.
const live = () => [
  track('pod.guess-i-love-you', 'pod', [[1, 1]]),
  track('pod.health', 'pod', [[218, 218]]),
  track('pod.health-ladder-pilot', 'pod', [[10, 5]]),
  track('seed.cym_n_for_eng', 'seed', [[100, 100], [100, 100], [100, 100], [5, 5]], { seedExisting: true }),
  // 616 of 640 recorded on the server; the last 24 he read are still uploading from his device.
  track('seed.cym_nv2_for_eng', 'seed', [[100, 100], [100, 100], [100, 100], [100, 100], [100, 100], [100, 100], [40, 16]], { newCourse: true }),
  track('lego.cym_nv2_for_eng', 'lego', [[100, 26], [100, 0], [91, 0]], { newCourse: true }),
  track('phrase.1', 'phrase', [[197, 17], [200, 0]], { pass: 1 }),
  track('phrase.2', 'phrase', [[150, 3]], { pass: 2 }),
]
const withHisUploads = (tracks) => withDeviceTakes(tracks, {
  unsent: Array.from({ length: 24 }, (_, i) => `seed:${i}`),
  placeOf: () => ({ track: 'seed.cym_nv2_for_eng', batch: 7, recorded: false }),
})
const mountHome = (tracks, unticked = new Set()) => mount(BoothHome, {
  props: { tracks, unticked, displayName: 'Aran' },
  global: { stubs: { BoothTeamStats: true } },
})
// Where a section is drawn on the left, or null.
function onLeft(w, key) {
  const hero = w.find('[data-test="up-next"]')
  if (hero.exists() && hero.find('.bh-h2').text() === key) return 'hero'
  if (w.find(`[data-test="card-${key}"]`).exists()) return 'card'
  if (w.find(`[data-test="finished-${key}"]`).exists()) return 'finished'
  return null
}

describe('every section is always listed (job #823)', () => {
  beforeEach(() => { localStorage.clear(); window.innerWidth = 1280 })

  it('rule 1: the tick panel lists every section, finished ones included', () => {
    const tracks = withHisUploads(live())
    const w = mountHome(tracks)
    for (const t of tracks) expect(w.find(`[data-test="tick-${t.key}"]`).exists(), t.key).toBe(true)
    // The North sentences read as finished (the last 24 are amber) and are still listed, marked so.
    expect(w.find('[data-test="tick-seed.cym_nv2_for_eng"]').text()).toContain('24 still uploading')
    expect(w.find('[data-test="tick-pod.health"]').text()).toContain('all 218 recorded')
  })

  it('rule 2: every ticked section is on the left — hero, card or finished row', () => {
    const tracks = withHisUploads(live())
    const w = mountHome(tracks)
    for (const t of tracks) expect(onLeft(w, t.key), t.key).not.toBeNull()
    // The hero's section is drawn once, as the hero (#708).
    const heroKey = w.find('[data-test="up-next"] .bh-h2').text()
    expect(onLeft(w, heroKey)).toBe('hero')
    expect(w.find(`[data-test="card-${heroKey}"]`).exists()).toBe(false)
  })

  it('rule 2: an unticked section leaves the left but never the tick panel', () => {
    const tracks = live()
    const off = new Set(['pod.health', 'lego.cym_nv2_for_eng'])
    const w = mountHome(tracks, off)
    for (const t of tracks) expect(w.find(`[data-test="tick-${t.key}"]`).exists(), t.key).toBe(true)
    expect(onLeft(w, 'pod.health')).toBeNull()
    expect(onLeft(w, 'lego.cym_nv2_for_eng')).toBeNull()
    expect(w.find('[data-test="hidden-cards"]').text()).toContain('pod.health')
  })

  it('homeLayout: ticked = on the left, for every tick pattern of his sections', () => {
    const tracks = withHisUploads(live())
    const keys = tracks.map((t) => t.key)
    for (let mask = 0; mask < (1 << keys.length); mask += 7) {
      const off = new Set(keys.filter((_, i) => mask & (1 << i)))
      off.add(batchTickId('seed.cym_nv2_for_eng', 7))
      const L = homeLayout(tracks, off)
      expect(L.tickables.map((t) => t.key).sort()).toEqual([...keys].sort())
      const left = new Set([...(L.hero ? [L.hero.track.key] : []), ...L.main, ...L.other, ...L.finished].map((t) => t.key || t))
      for (const k of keys) expect(left.has(k) || L.hidden.some((t) => t.key === k), k).toBe(true)
      for (const k of keys) if (!off.has(k)) expect(left.has(k), `${k} ticked but not on the left`).toBe(true)
    }
  })

  it('rule 3: a summary whose phrase count failed keeps the phrase sections, "counting…"', () => {
    const before = { home: true, phrases: { pass: 1, batch: 1 }, tracks: live() }
    const failed = { home: true, phrases: { unavailable: true }, partial: ['phrase'], tracks: live().filter((t) => t.kind !== 'phrase') }
    const kept = keepListedSections(failed, before)
    expect(kept.tracks.map((t) => t.key)).toEqual(before.tracks.map((t) => t.key).filter((k) => !k.startsWith('phrase.')).concat(['phrase.1', 'phrase.2']))
    expect(kept.tracks.find((t) => t.key === 'phrase.1')).toMatchObject({ counting: true, total: 397, recorded: 17 })
    const w = mountHome(kept.tracks)
    expect(w.find('[data-test="tick-phrase.1"]').text()).toContain('counting')
    // A full answer replaces the carried sections; a section the server stops sending in a FULL
    // answer (a real recast) is not resurrected.
    const full = { home: true, phrases: { pass: 1 }, tracks: live().filter((t) => t.key !== 'pod.guess-i-love-you') }
    expect(keepListedSections(full, before).tracks.map((t) => t.key)).not.toContain('pod.guess-i-love-you')
  })
})
