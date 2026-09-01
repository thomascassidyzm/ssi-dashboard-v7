import { describe, it, expect } from 'vitest'
import { buildGroups, decorateWalk } from './walkGroups.js'
import CORPORA from '../../tools/pods/pod-corpora.json'

// The canonical store as it actually stood on 2026-09-01, AFTER the pod-0 →
// pod-1 rename: four slugs, Italian on the two Method cuts and nowhere else.
const DB_AFTER = [
  { slug: 'learning-flagship', lines: 367, scenes: 11 },
  { slug: 'method-pod-43-scene', lines: 276, scenes: 43 },
  { slug: 'method-pod-chapters', lines: 309, scenes: 12 },
  { slug: 'pod-1', lines: 231, scenes: 22 },
]

// The same store BEFORE the rename, sacked slates and all. The page must be
// correct against both without a code change — that is the whole design.
const DB_BEFORE = [
  { slug: 'learning-flagship', lines: 367, scenes: 11 },
  { slug: 'method-pod-43-scene', lines: 276, scenes: 43 },
  { slug: 'method-pod-chapters', lines: 309, scenes: 12 },
  { slug: 'pod-0', lines: 231, scenes: 22 },
  { slug: 'pod-0.5', lines: 27, scenes: 7 },
  { slug: 'pod-1', lines: 236, scenes: 16 },
]

const flat = groups => groups.flatMap(g => g.walks)
const find = (groups, slug) => flat(groups).find(w => w.slug === slug)

describe('the walk registry, joined to the canonical store', () => {
  it('shows every walk in the registry, plus the parked pair', () => {
    const groups = buildGroups(CORPORA, { dbPods: DB_AFTER })
    const slugs = flat(groups).map(w => w.slug)
    for (const w of CORPORA.walks) expect(slugs).toContain(w.slug)
    for (const p of CORPORA.parked) expect(slugs).toContain(p.slug)
  })

  it('marks the core walk core and the themed walks themed', () => {
    const groups = buildGroups(CORPORA, { dbPods: DB_AFTER })
    expect(find(groups, 'pod-1').category).toBe('core')
    expect(find(groups, 'health').category).toBe('themed')
  })

  it('never calls the themed category "sector pods"', () => {
    const groups = buildGroups(CORPORA, { dbPods: DB_AFTER })
    const text = JSON.stringify(groups).toLowerCase()
    expect(text).not.toContain('sector pod')
  })

  it('pairs the two Method cuts into one framed decision', () => {
    const groups = buildGroups(CORPORA, { dbPods: DB_AFTER })
    const method = groups.find(g => g.id === 'method')
    expect(method.paired).toBe(true)
    expect(method.walks.map(w => w.slug).sort()).toEqual(['method-pod-43-scene', 'method-pod-chapters'])
  })

  it('carries the target counts it was given and claims none it was not', () => {
    const targets = {
      'method-pod-43-scene': { rows: 276, langs: ['ita'] },
      'method-pod-chapters': { rows: 309, langs: ['ita'] },
    }
    const groups = buildGroups(CORPORA, { dbPods: DB_AFTER, targets })
    expect(find(groups, 'method-pod-43-scene').target).toEqual({ rows: 276, langs: ['ita'] })
    expect(find(groups, 'pod-1').target).toBeNull()
    expect(find(groups, 'learning-flagship').target).toBeNull()
  })

  it('links only slugs that exist in the store — a mapping is not a walk', () => {
    const groups = buildGroups(CORPORA, { dbPods: DB_AFTER })
    expect(find(groups, 'pod-1').to).toBe('/canonical/scripts/pod-1')
    expect(find(groups, 'care-work').to).toBeNull()
    expect(find(groups, 'care-work').status).toBe('mapping-only')
    expect(find(groups, 'health').to).toBeNull() // authored, not ingested
  })

  it('shows the parked pair as parked, out of the canonical store', () => {
    const groups = buildGroups(CORPORA, { dbPods: DB_AFTER })
    const parked = groups.find(g => g.id === 'parked')
    expect(parked.walks.map(w => w.slug).sort()).toEqual(['music', 'travel-situations'])
    for (const w of parked.walks) {
      expect(w.inStore).toBe(false)
      expect(w.to).toBeNull()
    }
  })

  it('labels the Welsh health overlay DRAFT FOR ARAN', () => {
    const groups = buildGroups(CORPORA, { dbPods: DB_AFTER })
    expect(find(groups, 'health').draftOverlay).toBe(true)
    expect(find(groups, 'retail').draftOverlay).toBe(false)
  })

  it('has nothing unregistered after the rename', () => {
    const groups = buildGroups(CORPORA, { dbPods: DB_AFTER })
    expect(groups.find(g => g.id === 'unregistered')).toBeUndefined()
    expect(find(groups, 'pod-1').lines).toBe(231)
  })

  it('shows the sacked slates as UNREGISTERED with real counts, before the rename', () => {
    const groups = buildGroups(CORPORA, { dbPods: DB_BEFORE })
    const unreg = groups.find(g => g.id === 'unregistered')
    expect(unreg.walks.map(w => w.slug).sort()).toEqual(['pod-0', 'pod-0.5'])
    expect(unreg.walks.find(w => w.slug === 'pod-0.5').lines).toBe(27)
    // And the registry's pod-1 joins whatever the DB called pod-1 that day.
    expect(find(groups, 'pod-1').lines).toBe(236)
  })

  it('drops empty groups rather than rendering an empty heading', () => {
    const groups = buildGroups({ walks: [], parked: [] }, { dbPods: [] })
    expect(groups).toEqual([])
  })
})

describe('decorateWalk', () => {
  it('reports a walk absent from the store honestly', () => {
    const w = decorateWalk({ slug: 'nope', status: 'authored' }, { dbPods: [] })
    expect(w.inStore).toBe(false)
    expect(w.lines).toBeNull()
    expect(w.to).toBeNull()
  })
})

describe('ingestability — the same rule the ingest tool uses', () => {
  it('is authored + corpus + format, and nothing else', () => {
    const groups = buildGroups(CORPORA, { dbPods: DB_AFTER })
    // Authored with a corpus file and a format: the tool will take these.
    for (const slug of ['health', 'retail', 'trades', 'hospitality']) {
      expect(find(groups, slug).ingestable).toBe(true)
    }
    // A mapping is not a walk — skipped with a reason, never an error.
    expect(find(groups, 'care-work').ingestable).toBe(false)
    expect(find(groups, 'public-services').ingestable).toBe(false)
    // Parked is deliberately not ingested.
    expect(find(groups, 'music').ingestable).toBe(false)
    // The core slate has no markdown corpus — the DB is canon for it.
    expect(find(groups, 'pod-1').ingestable).toBe(false)
  })
})

describe('the measured facts the registry does not carry', () => {
  it('gives the parked pair their real size, travel-situations at ONE scene', () => {
    const groups = buildGroups(CORPORA, { dbPods: DB_AFTER })
    expect(find(groups, 'music').facts).toMatchObject({ turns: 749, scenes: 8, targetClips: 585, knownClips: 491 })
    // One scene, not eight — and one known clip, which is not "no audio".
    expect(find(groups, 'travel-situations').facts).toMatchObject({ turns: 72, scenes: 1, targetClips: 0, knownClips: 1 })
  })

  it('attaches the Welsh overlay to health as a pair overlay, not as target text', () => {
    const groups = buildGroups(CORPORA, { dbPods: DB_AFTER })
    const health = find(groups, 'health')
    expect(health.overlay.status).toBe('DRAFT-FOR-ARAN')
    expect(health.overlay.pair).toBe('eng → cym_n')
    expect(health.draftOverlay).toBe(true)
    // It is on the seed set, NOT on the conversation corpus the walk is made of.
    expect(health.overlay.scope).toMatch(/seed set/)
    expect(health.overlay.notOn).toMatch(/438-turn/)
    // And it is not target text: the canonical store's only target language is
    // Italian, so health must still report none.
    expect(health.target).toBeNull()
  })

  it('gives no other walk an overlay or measured facts', () => {
    const groups = buildGroups(CORPORA, { dbPods: DB_AFTER })
    for (const slug of ['pod-1', 'retail', 'trades', 'hospitality', 'learning-flagship']) {
      expect(find(groups, slug).overlay).toBeNull()
      expect(find(groups, slug).facts).toBeNull()
    }
  })
})

describe('registry-vs-database drift', () => {
  // The store moved WHILE this page was being built: five themed walks were
  // ingested on 2026-09-01 at 11:29, and care-work landed in the store while
  // the registry still recorded it as a mapping. The page must show that
  // contradiction, not resolve it silently in either direction.
  const DB_WITH_THEMED = [
    ...DB_AFTER,
    { slug: 'health', lines: 438, scenes: 23 },
    { slug: 'retail', lines: 330, scenes: 25 },
    { slug: 'trades', lines: 414, scenes: 23 },
    { slug: 'hospitality', lines: 330, scenes: 21 },
    { slug: 'care-work', lines: 306, scenes: 20 },
  ]

  it('flags a mapping-only walk that is nonetheless in the store', () => {
    const groups = buildGroups(CORPORA, { dbPods: DB_WITH_THEMED })
    const careWork = find(groups, 'care-work')
    expect(careWork.status).toBe('mapping-only')
    expect(careWork.inStore).toBe(true)
    expect(careWork.lines).toBe(306)
    expect(careWork.drift).toBe(true)
  })

  it('does not flag an authored walk that is in the store — that is the normal case', () => {
    const groups = buildGroups(CORPORA, { dbPods: DB_WITH_THEMED })
    for (const slug of ['health', 'retail', 'trades', 'hospitality', 'pod-1']) {
      expect(find(groups, slug).drift).toBe(false)
    }
  })

  it('flags a parked walk if one is ever ingested — parked means not canon', () => {
    const groups = buildGroups(CORPORA, { dbPods: [...DB_AFTER, { slug: 'music', lines: 749, scenes: 8 }] })
    expect(find(groups, 'music').drift).toBe(true)
  })

  it('stops offering INGESTABLE once a walk has actually landed', () => {
    const before = buildGroups(CORPORA, { dbPods: DB_AFTER })
    const after = buildGroups(CORPORA, { dbPods: DB_WITH_THEMED })
    expect(find(before, 'health').ingestable && !find(before, 'health').inStore).toBe(true)
    expect(find(after, 'health').ingestable && !find(after, 'health').inStore).toBe(false)
    // And it gains a script to open, which it did not have before.
    expect(find(before, 'health').to).toBeNull()
    expect(find(after, 'health').to).toBe('/canonical/scripts/health')
  })
})
