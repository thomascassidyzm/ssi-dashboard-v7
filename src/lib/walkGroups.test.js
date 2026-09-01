import { describe, it, expect } from 'vitest'
import { buildGroups, decorateWalk, isIngestable } from './walkGroups.js'
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
    // In the store: linked. Not in the store: no link, rather than a link to a
    // 404. Asserted against the fixture, not against which walks are ingested
    // today, because that changes hourly.
    const inStore = new Set(DB_AFTER.map(p => p.slug))
    for (const w of flat(groups)) {
      expect(w.to).toBe(inStore.has(w.slug) ? `/canonical/scripts/${w.slug}` : null)
    }
    // And whatever is still mapping-only is a mapping, not a walk.
    for (const w of CORPORA.walks.filter(x => x.status === 'mapping-only')) {
      expect(find(groups, w.slug).corpus).toBeFalsy()
    }
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
    // Derived from the registry, never from a list of slugs: statuses move.
    // care-work was mapping-only at 11:29 on 2026-09-01 and authored by 11:40,
    // and a test naming it would have gone red for the work going right.
    for (const w of [...CORPORA.walks, ...CORPORA.parked]) {
      expect(find(groups, w.slug).ingestable)
        .toBe(w.status === 'authored' && !!w.corpus && !!w.format)
    }
    // Parked is deliberately never ingested, whatever else it carries.
    for (const p of CORPORA.parked) expect(find(groups, p.slug).ingestable).toBe(false)
    // And the core slate has no markdown corpus at all — the DB is canon for it.
    expect(find(groups, 'pod-1').corpus).toBeFalsy()
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
  // THE RULE IS TESTED, NOT A WALK. This drift was found live on 2026-09-01,
  // when care-work was ingested while still recorded as mapping-only — and it
  // was then RESOLVED, within the hour, by correcting the registry entry. A test
  // naming care-work would now be red for the best possible reason. So the
  // contradiction is CONSTRUCTED here, and the live registry is asserted
  // separately to be free of it.
  const CONTRADICTION = {
    walks: [
      { slug: 'ghost', name: 'Ghost', category: 'themed', status: 'mapping-only', corpus: null, format: 'sector-flows' },
      { slug: 'real', name: 'Real', category: 'themed', status: 'authored', corpus: 'x.md', format: 'sector-flows' },
    ],
    parked: [{ slug: 'sleeper', name: 'Sleeper', category: 'themed', status: 'parked' }],
  }
  const DB = [
    { slug: 'ghost', lines: 306, scenes: 20 },
    { slug: 'real', lines: 330, scenes: 25 },
    { slug: 'sleeper', lines: 749, scenes: 8 },
  ]

  it('flags a walk whose status claims it is absent while the store holds it', () => {
    const groups = buildGroups(CONTRADICTION, { dbPods: DB })
    expect(find(groups, 'ghost').drift).toBe(true)
    expect(find(groups, 'ghost').lines).toBe(306)
    // Parked means "deliberately not canon", so an ingested parked walk is the
    // same contradiction wearing a different word.
    expect(find(groups, 'sleeper').drift).toBe(true)
  })

  it('does not flag an authored walk that is in the store — that is the normal case', () => {
    const groups = buildGroups(CONTRADICTION, { dbPods: DB })
    expect(find(groups, 'real').drift).toBe(false)
  })

  it('does not flag anything when the store is empty — absence is not drift', () => {
    const groups = buildGroups(CONTRADICTION, { dbPods: [] })
    for (const slug of ['ghost', 'real', 'sleeper']) expect(find(groups, slug).drift).toBe(false)
  })

  it('the live registry currently agrees with the live store', () => {
    // Nine canonical walks as of 2026-09-01; public-services is still authoring.
    const live = [
      'pod-1', 'learning-flagship', 'method-pod-43-scene', 'method-pod-chapters',
      'health', 'retail', 'trades', 'hospitality', 'care-work',
    ].map(slug => ({ slug, lines: 1, scenes: 1 }))
    const groups = buildGroups(CORPORA, { dbPods: live })
    for (const w of flat(groups)) expect(w.drift).toBe(false)
  })

  it('stops offering INGESTABLE once a walk has actually landed', () => {
    const before = buildGroups(CONTRADICTION, { dbPods: [] })
    const after = buildGroups(CONTRADICTION, { dbPods: DB })
    expect(find(before, 'real').ingestable && !find(before, 'real').inStore).toBe(true)
    expect(find(after, 'real').ingestable && !find(after, 'real').inStore).toBe(false)
    expect(find(before, 'real').to).toBeNull()
    expect(find(after, 'real').to).toBe('/canonical/scripts/real')
  })
})

describe('the ingestable rule has ONE home', () => {
  it('implements exactly the predicate the registry states', () => {
    // The registry is the authority; this function is one of its two
    // implementations. If the field is reworded, this fails and someone has to
    // look — which is the entire point of hoisting the rule out of both readers.
    expect(CORPORA.ingestableRule).toBeTruthy()
    expect(CORPORA.ingestableRule.split(' — ')[0])
      .toBe("status === 'authored' && corpus && format")
  })

  it('agrees with the registry rule on every entry in the registry', () => {
    for (const w of [...CORPORA.walks, ...CORPORA.parked]) {
      const byRule = w.status === 'authored' && !!w.corpus && !!w.format
      expect(isIngestable(w)).toBe(byRule)
    }
  })
})

describe('the parked size comes from the registry, not from us', () => {
  it('reads parked[].size through, with its measurement provenance', () => {
    const groups = buildGroups(CORPORA, { dbPods: [] })
    const music = find(groups, 'music')
    expect(music.facts).toMatchObject({ turns: 749, scenes: 8, targetClips: 585, knownClips: 491 })
    expect(music.facts.measured).toMatch(/2026-09-01/)
    // ONE scene, and one known clip — not eight, and not "no audio".
    const travel = find(groups, 'travel-situations')
    expect(travel.facts).toMatchObject({ turns: 72, scenes: 1, targetClips: 0, knownClips: 1 })
  })

  it('gives an unsized walk no facts rather than inventing them', () => {
    const groups = buildGroups(CORPORA, { dbPods: [] })
    expect(find(groups, 'health').facts).toBeNull()
  })
})
