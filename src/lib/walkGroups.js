/**
 * THE JOIN: the walk registry (tools/pods/pod-corpora.json) against whatever
 * the canonical store actually returns.
 *
 * Its own module so it can be tested without a browser, and because the two
 * properties that matter are properties of the JOIN, not of the page:
 *
 *   1. NO SLUG IS HARDCODED. The canonical pod slugs were renamed on
 *      2026-09-01 (`pod-0` → `pod-1`, two slates sacked). A page that keyed on
 *      slugs would have needed editing that day. This one does not, and will
 *      not the next time.
 *   2. A DB SLUG WITH NO REGISTRY ENTRY IS SHOWN, NOT HIDDEN — as UNREGISTERED,
 *      with its real counts. That is how a slate awaiting deletion, or a
 *      registry that has fallen behind the database, stays visible instead of
 *      quietly vanishing from the one page meant to show everything.
 */

export const CATEGORY_GROUPS = [
  {
    id: 'core',
    category: 'core',
    title: 'Core — the default chain',
    accent: '#ef4444',
    blurb: 'Compulsory. The ladder a learner descends by NOT choosing. Numbers name this chain and nothing else.',
  },
  {
    id: 'flagship',
    category: 'flagship',
    title: 'Flagship',
    accent: '#a78bfa',
    blurb: 'The Learning flagship.',
  },
  {
    id: 'method',
    category: 'method-cut',
    title: 'Method Pod — awaiting a choice',
    accent: '#f59e0b',
    // ONE decision, TWO realisations — rendered inside a single frame so the
    // page cannot be read as offering two walks.
    paired: true,
    blurb: 'Two cuts of the same material, held against each other.',
  },
  {
    id: 'themed',
    category: 'themed',
    title: 'Themed — chosen',
    accent: '#10b981',
    // THE SELECTOR IS INTEREST, NOT OCCUPATION. A sector is one reason among
    // several. This category is never called "sector pods", here or anywhere.
    blurb: 'A learner picks these. The selector is INTEREST, not occupation — a sector is one reason among several, never the category.',
  },
]

export const PARKED_GROUP = {
  id: 'parked',
  title: 'Parked — real content, deliberately not canon',
  accent: '#94a3b8',
  blurb: 'Pre-metagraph proofs of concept, living only in listening_pods. Visible so they stop being invisible, not so they can be treated as canon. Never ingested into the canonical store.',
}

export const UNREGISTERED_GROUP = {
  id: 'unregistered',
  title: 'Unregistered — in the database, not in the registry',
  accent: '#ef4444',
  blurb: 'Slugs the canonical store returns that the registry does not name. Shown with their real counts rather than hidden.',
}

const UNREGISTERED_NOTE =
  'In the canonical store but not in the walk registry. Either it is a slate awaiting deletion, '
  + 'or the registry has fallen behind the database. Find out which before editing it.'

/** One registry entry, joined to the database and the async read-outs. */
export function decorateWalk (entry, { dbPods = [], targets = {}, coverage = {}, registered = true } = {}) {
  const db = dbPods.find(p => p.slug === entry.slug) || null
  return {
    ...entry,
    registered,
    inStore: !!db,
    lines: db?.lines ?? null,
    scenes: db?.scenes ?? null,
    target: targets[entry.slug] || null,
    cov: coverage[entry.slug] || null,
    // Only a slug that exists in the store has a script page to open. A
    // mapping-only or parked walk gets no link rather than a link to a 404.
    to: db ? `/canonical/scripts/${entry.slug}` : null,
    // The registry carries no dedicated overlay field, so the flag is read out
    // of the note it is actually written in. A worker never signs off
    // target-language text, so wherever it appears it appears labelled.
    draftOverlay: /DRAFT-FOR-ARAN/i.test(entry.note || ''),
  }
}

/**
 * Every walk in the estate, grouped for display. Empty groups are dropped —
 * the page is a list of walks, not of headings.
 */
export function buildGroups (corpora, { dbPods = [], targets = {}, coverage = {} } = {}) {
  const ctx = { dbPods, targets, coverage }
  const walks = (corpora.walks || []).map(w => decorateWalk(w, ctx))

  const known = new Set((corpora.walks || []).map(w => w.slug))
  const unregistered = dbPods
    .filter(p => !known.has(p.slug))
    .map(p => decorateWalk(
      { slug: p.slug, name: p.slug, category: null, status: 'unregistered', note: UNREGISTERED_NOTE },
      { ...ctx, registered: false },
    ))

  return [
    ...CATEGORY_GROUPS.map(g => ({ ...g, walks: walks.filter(w => w.category === g.category) })),
    { ...PARKED_GROUP, walks: (corpora.parked || []).map(p => decorateWalk(p, ctx)) },
    { ...UNREGISTERED_GROUP, walks: unregistered },
  ].filter(g => g.walks.length)
}
