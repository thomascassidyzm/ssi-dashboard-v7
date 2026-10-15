// The booth home screen's decisions (job #347): Up next order, ticks, phrase locking.
import { describe, it, expect } from 'vitest'
import { upNext, groupTracks, batchTickId, trackLocked, firstOpenBatch, batchOpenable, splitTicked, shownBatches, loadSummarySnapshot, saveSummarySnapshot } from './booth-home.js'

const seeds = (key, newCourse, batches) => ({
  key, kind: 'seed', newCourse, seedExisting: true,
  total: batches.reduce((n, b) => n + b[0], 0), recorded: batches.reduce((n, b) => n + b[1], 0),
  batches: batches.map(([total, recorded], i) => ({ n: i + 1, total, recorded })),
})
const phrase = (pass, batches) => ({
  key: `phrase.${pass}`, kind: 'phrase', pass,
  total: batches.reduce((n, b) => n + b.total, 0), recorded: batches.reduce((n, b) => n + b.recorded, 0),
  batches: batches.map((b, i) => ({ n: i + 1, ...b })),
})
const pod = { key: 'pod.health-ladder-pilot', kind: 'pod', total: 10, recorded: 5, batches: [{ n: 1, total: 10, recorded: 5 }] }

// The queue's own order puts the pod first — the order that made Start open on a Health line.
const tracks = [
  pod,
  seeds('seed.cym_n_for_eng', false, [[100, 100], [100, 100]]),
  seeds('seed.cym_nv2_for_eng', true, [[100, 100], [100, 3], [40, 0]]),
  phrase(1, [{ total: 197, recorded: 0, current: true }, { total: 200, recorded: 0, current: false }]),
  phrase(2, [{ total: 150, recorded: 0, current: false }]),
]

describe('Up next', () => {
  it('offers new sentences before practice phrases and before the Health pod', () => {
    const u = upNext(tracks)
    expect(u.track.key).toBe('seed.cym_nv2_for_eng')
    expect(u.batch.n).toBe(2)
  })
  it('skips an unticked batch, then an unticked track', () => {
    expect(upNext(tracks, new Set([batchTickId('seed.cym_nv2_for_eng', 2)])).batch.n).toBe(3)
    const u = upNext(tracks, new Set(['seed.cym_nv2_for_eng']))
    expect(u.track.key).toBe('phrase.1')
    expect(u.batch.n).toBe(1)
  })
  it('never offers a phrase batch the queue is not serving, nor pass 2 before pass 1 is done', () => {
    expect(trackLocked(tracks[4], tracks)).toBe(true)
    const u = upNext(tracks, new Set(['seed.cym_nv2_for_eng', 'phrase.1']))
    expect(u.track.key).toBe('pod.health-ladder-pilot')
  })
  it('is null when everything ticked is done', () => {
    expect(upNext(tracks, new Set(['seed.cym_nv2_for_eng', 'phrase.1', 'pod.health-ladder-pilot']))).toBe(null)
  })
})

describe('groups', () => {
  it('puts the sandbox sentences under new work, the old ones under finished', () => {
    const g = groupTracks(tracks)
    expect(g.main.map((t) => t.key)).toEqual(['seed.cym_nv2_for_eng', 'phrase.1', 'phrase.2'])
    expect(g.other.map((t) => t.key)).toEqual(['pod.health-ladder-pilot'])
    expect(g.finished.map((t) => t.key)).toEqual(['seed.cym_n_for_eng'])
  })
  it('opens the current phrase batch from its card', () => {
    expect(firstOpenBatch(tracks[3], tracks).n).toBe(1)
  })
})

// Job #378 (Aran, 2026-10-14).
const legos = { key: 'lego.cym_nv2_for_eng', kind: 'lego', newCourse: true, total: 300, recorded: 100,
  batches: [{ n: 1, total: 100, recorded: 100 }, { n: 2, total: 100, recorded: 0 }, { n: 3, total: 100, recorded: 0 }] }
describe('LEGOs, ticks hiding cards, and the kept home screen (job #378)', () => {
  const withLegos = [...tracks, legos]
  it('puts LEGOs after new sentences and before practice phrases', () => {
    expect(groupTracks(withLegos).main.map(t => t.key)).toEqual(['seed.cym_nv2_for_eng', 'lego.cym_nv2_for_eng', 'phrase.1', 'phrase.2'])
    expect(upNext(withLegos, new Set(['seed.cym_nv2_for_eng'])).track.key).toBe('lego.cym_nv2_for_eng')
    expect(upNext(withLegos, new Set(['seed.cym_nv2_for_eng', batchTickId('lego.cym_nv2_for_eng', 2)])).batch.n).toBe(3)
  })
  it('hides an unticked card and an unticked batch, and shows them again when ticked', () => {
    const off = new Set(['lego.cym_nv2_for_eng', batchTickId('seed.cym_nv2_for_eng', 2)])
    const { shown, hidden } = splitTicked(withLegos, off)
    expect(hidden.map(t => t.key)).toEqual(['lego.cym_nv2_for_eng'])
    expect(shown.some(t => t.key === 'lego.cym_nv2_for_eng')).toBe(false)
    expect(shownBatches(tracks[2], off).map(b => b.n)).toEqual([1, 3])
    expect(splitTicked(withLegos, new Set()).hidden).toEqual([])
  })
  it('keeps the last home screen per voice and reads it back', () => {
    const mem = new Map()
    const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) }
    saveSummarySnapshot('human_aran_cym_n', { tracks: [legos] }, storage, 1000)
    expect(loadSummarySnapshot('human_aran_cym_n', storage, 2000).tracks[0].key).toBe('lego.cym_nv2_for_eng')
    expect(loadSummarySnapshot('human_aran_eng', storage, 2000)).toBe(null)
    expect(loadSummarySnapshot('human_aran_cym_n', storage, 1000 + 8 * 24 * 3600 * 1000)).toBe(null)
  })
})

// Job #697 (Aran): every batch opens by hand; Up next keeps its order.
describe('opening any batch (job #697)', () => {
  it('lets a future sentence batch and a future phrase batch (and pass 2) be opened', () => {
    expect(batchOpenable(tracks[2], tracks[2].batches[2], tracks)).toBe(true)
    expect(batchOpenable(tracks[3], tracks[3].batches[1], tracks)).toBe(true)
    expect(batchOpenable(tracks[4], tracks[4].batches[0], tracks)).toBe(true)
  })
  it('leaves Up next and a whole-card tap exactly as they were', () => {
    expect(upNext(tracks).batch.n).toBe(2)
    expect(upNext(tracks, new Set(['seed.cym_nv2_for_eng'])).track.key).toBe('phrase.1')
    expect(upNext(tracks, new Set(['seed.cym_nv2_for_eng'])).batch.n).toBe(1)
    expect(firstOpenBatch(tracks[3], tracks).n).toBe(1)
    expect(firstOpenBatch(tracks[4], tracks)).toBe(null)
  })
})
