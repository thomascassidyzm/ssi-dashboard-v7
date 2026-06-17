/**
 * manifest-diff-service.cjs
 *
 * Compares a pending manifest against a published manifest and categorizes
 * all changes into MAJOR/MINOR/PATCH per the agreed semver rules.
 *
 * Versioning rules (agreed with Wimansha & Ivan, Feb 2026):
 *
 * MAJOR (X.0.0): Seed/intro-item/slice add/remove/reorder/ID change, language pair change
 * MINOR (0.X.0): Canonical text, seed sentence text, presentation text, intro-item node text, node added to nodes array
 * PATCH (0.0.X): Node remove/reorder/text in nodes array, sample changes, duration updates, encouragement changes, role/cadence changes
 *
 * @version 1.0.0 - Feb 2026
 */

const { cleanTrailingPeriods } = require('./publish-manifest-service.cjs')

/**
 * Compare two manifests and categorize all changes.
 *
 * @param {Object} published - The currently published manifest (from course-configs)
 * @param {Object} pending - The pending manifest (about to be published)
 * @returns {Object} Structured diff result
 */
function compareManifests(published, pending) {
  const major = []
  const minor = []
  const patch = []
  const stats = {
    seedsAdded: 0, seedsRemoved: 0, seedsReordered: 0,
    introItemsAdded: 0, introItemsRemoved: 0, introItemsReordered: 0,
    canonicalsChanged: 0,
    presentationsChanged: 0,
    seedTextChanged: 0,
    introNodeTextChanged: 0,
    nodesAdded: 0, nodesRemoved: 0, nodesReordered: 0, nodesTextChanged: 0,
    samplesAdded: 0, samplesRemoved: 0, sampleUuidChanged: 0,
    durationsChanged: 0,
    encouragementsChanged: 0,
    introductionChanged: false
  }

  // Pre-process: strip trailing periods from pending only (matching publish behavior)
  cleanTrailingPeriods(pending)

  // 1. Root level: language pair
  if (published.known !== pending.known || published.target !== pending.target) {
    major.push({
      type: 'language_changed',
      detail: `Language pair changed: ${published.known}-${published.target} → ${pending.known}-${pending.target}`
    })
  }

  // 2. Introduction object
  compareIntroduction(published.introduction, pending.introduction, patch, stats)

  // 3. Slices
  const pubSlices = published.slices || []
  const penSlices = pending.slices || []

  if (pubSlices.length !== penSlices.length) {
    major.push({
      type: 'slice_count_changed',
      detail: `Slice count changed: ${pubSlices.length} → ${penSlices.length}`
    })
  }

  // Compare main slice (slices[0])
  if (pubSlices.length > 0 && penSlices.length > 0) {
    compareSlice(pubSlices[0], penSlices[0], major, minor, patch, stats)
  }

  // Build suggested version
  const existingVersion = published.version || '1.0.0'

  return {
    suggestedBump: major.length > 0 ? 'major' : minor.length > 0 ? 'minor' : patch.length > 0 ? 'patch' : 'none',
    suggestedVersion: suggestVersionFromDiff(existingVersion, { major, minor, patch }),
    existingVersion,
    isNewCourse: false,
    major,
    minor,
    patch,
    stats,
    progressPreservation: computeProgressPreservation(published, pending)
  }
}

/**
 * Estimate how much learner progress would survive this publish.
 *
 * The learning app tracks progress against seed IDs and introduction-item
 * (LEGO) IDs in the manifest. A published ID that disappears from pending
 * means anyone who'd progressed past it is reset; a pending ID not in
 * published is brand-new structure with no prior progress to lose.
 *
 * Pure indicator — does not block publish.
 */
function computeProgressPreservation(published, pending) {
  const pubSeeds = (published.slices?.[0]?.seeds) || []
  const penSeedIds = new Set(((pending.slices?.[0]?.seeds) || []).map(s => s.id))

  let pubSeedCount = 0
  let seedsPreserved = 0
  let pubLegoCount = 0
  let legosPreserved = 0

  // Collect pending lego IDs across all seeds (a lego could in theory move seed)
  const penLegoIds = new Set()
  for (const seed of (pending.slices?.[0]?.seeds) || []) {
    for (const item of (seed.introduction_items || [])) penLegoIds.add(item.id)
  }

  for (const seed of pubSeeds) {
    pubSeedCount++
    if (penSeedIds.has(seed.id)) seedsPreserved++
    for (const item of (seed.introduction_items || [])) {
      pubLegoCount++
      if (penLegoIds.has(item.id)) legosPreserved++
    }
  }

  const totalPub = pubSeedCount + pubLegoCount
  const totalPreserved = seedsPreserved + legosPreserved
  const pct = totalPub === 0 ? 1 : totalPreserved / totalPub

  return {
    seedsPreserved,
    seedsPublished: pubSeedCount,
    legosPreserved,
    legosPublished: pubLegoCount,
    overallPct: pct,
    overallPercent: Math.round(pct * 1000) / 10  // one decimal place
  }
}

/**
 * Compare the top-level introduction object (welcome audio).
 */
function compareIntroduction(pubIntro, penIntro, patch, stats) {
  if (!pubIntro && !penIntro) return
  if (!pubIntro || !penIntro) {
    patch.push({ type: 'introduction_changed', detail: pubIntro ? 'Introduction removed' : 'Introduction added' })
    stats.introductionChanged = true
    return
  }
  if (pubIntro.id !== penIntro.id) {
    patch.push({ type: 'introduction_changed', detail: `Introduction ID changed: ${pubIntro.id} → ${penIntro.id}` })
    stats.introductionChanged = true
  }
  if (pubIntro.duration !== penIntro.duration) {
    patch.push({ type: 'introduction_duration_changed', detail: `Introduction duration: ${pubIntro.duration} → ${penIntro.duration}` })
    stats.introductionChanged = true
  }
}

/**
 * Compare two slices (seeds, samples, encouragements).
 */
function compareSlice(pubSlice, penSlice, major, minor, patch, stats) {
  // Seeds
  compareSeeds(pubSlice.seeds || [], penSlice.seeds || [], major, minor, patch, stats)

  // Samples
  compareSamples(pubSlice.samples || {}, penSlice.samples || {}, patch, stats)

  // Encouragements
  compareEncouragements('orderedEncouragements', pubSlice.orderedEncouragements || [], penSlice.orderedEncouragements || [], patch, stats)
  compareEncouragements('pooledEncouragements', pubSlice.pooledEncouragements || [], penSlice.pooledEncouragements || [], patch, stats)
  compareEncouragements('paywallEncouragements', pubSlice.paywallEncouragements || [], penSlice.paywallEncouragements || [], patch, stats)
}

/**
 * Compare seeds arrays. Match by seed ID.
 */
function compareSeeds(pubSeeds, penSeeds, major, minor, patch, stats) {
  const pubById = new Map()
  const penById = new Map()

  pubSeeds.forEach((seed, idx) => pubById.set(seed.id, { seed, idx }))
  penSeeds.forEach((seed, idx) => penById.set(seed.id, { seed, idx }))

  // Seeds added (in pending but not published)
  for (const [id, { seed, idx }] of penById) {
    if (!pubById.has(id)) {
      stats.seedsAdded++
      const canonical = seed.seed_sentence?.canonical || ''
      major.push({ type: 'seed_added', id, detail: `Seed added at position ${idx + 1}: "${truncate(canonical, 60)}"` })
    }
  }

  // Seeds removed (in published but not pending)
  for (const [id, { seed, idx }] of pubById) {
    if (!penById.has(id)) {
      stats.seedsRemoved++
      const canonical = seed.seed_sentence?.canonical || ''
      major.push({ type: 'seed_removed', id, detail: `Seed removed from position ${idx + 1}: "${truncate(canonical, 60)}"` })
    }
  }

  // Seeds in both — check for reordering and content changes
  for (const [id, pubEntry] of pubById) {
    const penEntry = penById.get(id)
    if (!penEntry) continue

    // Reordered?
    if (pubEntry.idx !== penEntry.idx) {
      stats.seedsReordered++
      major.push({ type: 'seed_reordered', id, detail: `Seed moved from position ${pubEntry.idx + 1} → ${penEntry.idx + 1}` })
    }

    // Content changes
    compareSeedContent(pubEntry.seed, penEntry.seed, major, minor, patch, stats)
  }
}

/**
 * Compare content of two matched seeds.
 */
function compareSeedContent(pubSeed, penSeed, major, minor, patch, stats) {
  const seedId = pubSeed.id

  // Canonical text
  const pubCanonical = pubSeed.seed_sentence?.canonical || ''
  const penCanonical = penSeed.seed_sentence?.canonical || ''
  if (pubCanonical !== penCanonical) {
    stats.canonicalsChanged++
    minor.push({
      type: 'canonical_changed', seedId,
      old: truncate(pubCanonical, 80),
      new: truncate(penCanonical, 80),
      detail: `Canonical changed: "${truncate(pubCanonical, 50)}" → "${truncate(penCanonical, 50)}"`
    })
  }

  // Seed node text (the actual sentence translation)
  const pubKnown = pubSeed.node?.known?.text || ''
  const penKnown = penSeed.node?.known?.text || ''
  const pubTarget = pubSeed.node?.target?.text || ''
  const penTarget = penSeed.node?.target?.text || ''

  if (pubKnown !== penKnown || pubTarget !== penTarget) {
    stats.seedTextChanged++
    const changes = []
    if (pubKnown !== penKnown) changes.push(`known: "${truncate(pubKnown, 40)}" → "${truncate(penKnown, 40)}"`)
    if (pubTarget !== penTarget) changes.push(`target: "${truncate(pubTarget, 40)}" → "${truncate(penTarget, 40)}"`)
    minor.push({
      type: 'seed_text_changed', seedId,
      detail: `Seed text changed: ${changes.join(', ')}`
    })
  }

  // Introduction items
  compareIntroItems(
    pubSeed.introduction_items || [],
    penSeed.introduction_items || [],
    seedId, major, minor, patch, stats
  )
}

/**
 * Compare introduction_items arrays within a seed. Match by ID.
 */
function compareIntroItems(pubItems, penItems, seedId, major, minor, patch, stats) {
  const pubById = new Map()
  const penById = new Map()

  pubItems.forEach((item, idx) => pubById.set(item.id, { item, idx }))
  penItems.forEach((item, idx) => penById.set(item.id, { item, idx }))

  // Intro items added
  for (const [id, { item, idx }] of penById) {
    if (!pubById.has(id)) {
      stats.introItemsAdded++
      const text = item.node?.known?.text || ''
      major.push({ type: 'intro_item_added', seedId, id, detail: `Intro item added at position ${idx + 1}: "${truncate(text, 50)}"` })
    }
  }

  // Intro items removed
  for (const [id, { item, idx }] of pubById) {
    if (!penById.has(id)) {
      stats.introItemsRemoved++
      const text = item.node?.known?.text || ''
      major.push({ type: 'intro_item_removed', seedId, id, detail: `Intro item removed from position ${idx + 1}: "${truncate(text, 50)}"` })
    }
  }

  // Intro items in both — check reordering and content
  for (const [id, pubEntry] of pubById) {
    const penEntry = penById.get(id)
    if (!penEntry) continue

    if (pubEntry.idx !== penEntry.idx) {
      stats.introItemsReordered++
      major.push({ type: 'intro_item_reordered', seedId, id, detail: `Intro item moved from position ${pubEntry.idx + 1} → ${penEntry.idx + 1}` })
    }

    compareIntroItemContent(pubEntry.item, penEntry.item, seedId, minor, patch, stats)
  }
}

/**
 * Compare content of two matched introduction items.
 */
function compareIntroItemContent(pubItem, penItem, seedId, minor, patch, stats) {
  const itemId = pubItem.id

  // Main node text (.node.known.text / .node.target.text) → MINOR
  const pubKnown = pubItem.node?.known?.text || ''
  const penKnown = penItem.node?.known?.text || ''
  const pubTarget = pubItem.node?.target?.text || ''
  const penTarget = penItem.node?.target?.text || ''

  if (pubKnown !== penKnown || pubTarget !== penTarget) {
    stats.introNodeTextChanged++
    minor.push({
      type: 'intro_node_text_changed', seedId, introItemId: itemId,
      detail: `Intro item node text changed: "${truncate(pubKnown, 30)}" / "${truncate(pubTarget, 30)}" → "${truncate(penKnown, 30)}" / "${truncate(penTarget, 30)}"`
    })
  }

  // Presentation text → MINOR
  const pubPres = pubItem.presentation || ''
  const penPres = penItem.presentation || ''
  if (pubPres !== penPres) {
    stats.presentationsChanged++
    minor.push({
      type: 'presentation_changed', seedId, introItemId: itemId,
      detail: `Presentation text changed for "${truncate(pubKnown || penKnown, 40)}"`
    })
  }

  // Nodes array → MINOR for added, PATCH for removed/reordered/text changed
  compareNodesArray(pubItem.nodes || [], penItem.nodes || [], seedId, itemId, minor, patch, stats)
}

/**
 * Compare nodes arrays within an introduction item. Match by ID.
 */
function compareNodesArray(pubNodes, penNodes, seedId, introItemId, minor, patch, stats) {
  const pubById = new Map()
  const penById = new Map()

  pubNodes.forEach((node, idx) => pubById.set(node.id, { node, idx }))
  penNodes.forEach((node, idx) => penById.set(node.id, { node, idx }))

  // Nodes added → MINOR (creates new gap per Ivan)
  for (const [id] of penById) {
    if (!pubById.has(id)) {
      stats.nodesAdded++
      minor.push({ type: 'node_added', seedId, introItemId, id, detail: 'Node added to nodes array' })
    }
  }

  // Nodes removed → PATCH
  for (const [id] of pubById) {
    if (!penById.has(id)) {
      stats.nodesRemoved++
    }
  }

  // Nodes in both — reorder or text change → PATCH
  for (const [id, pubEntry] of pubById) {
    const penEntry = penById.get(id)
    if (!penEntry) continue

    if (pubEntry.idx !== penEntry.idx) {
      stats.nodesReordered++
    }

    const pubKnown = pubEntry.node.known?.text || ''
    const penKnown = penEntry.node.known?.text || ''
    const pubTarget = pubEntry.node.target?.text || ''
    const penTarget = penEntry.node.target?.text || ''

    if (pubKnown !== penKnown || pubTarget !== penTarget) {
      stats.nodesTextChanged++
    }
  }

  // Aggregate PATCH-level node changes (don't list individually)
  // These are added once at the end in the caller via stats
}

/**
 * Compare samples dictionaries. Aggregate counts.
 */
function compareSamples(pubSamples, penSamples, patch, stats) {
  const pubKeys = new Set(Object.keys(pubSamples))
  const penKeys = new Set(Object.keys(penSamples))

  for (const key of penKeys) {
    if (!pubKeys.has(key)) stats.samplesAdded++
  }
  for (const key of pubKeys) {
    if (!penKeys.has(key)) stats.samplesRemoved++
  }

  // For matched keys, compare audio entries
  for (const key of pubKeys) {
    if (!penKeys.has(key)) continue

    const pubEntries = pubSamples[key] || []
    const penEntries = penSamples[key] || []

    // Build UUID sets
    const pubUuids = new Map()
    for (const e of pubEntries) pubUuids.set(e.id, e)
    const penUuids = new Map()
    for (const e of penEntries) penUuids.set(e.id, e)

    // New UUIDs in this key
    for (const [uuid] of penUuids) {
      if (!pubUuids.has(uuid)) stats.sampleUuidChanged++
    }

    // Duration changes for matching UUIDs
    for (const [uuid, pubEntry] of pubUuids) {
      const penEntry = penUuids.get(uuid)
      if (penEntry && pubEntry.duration !== penEntry.duration) {
        stats.durationsChanged++
      }
    }
  }
}

/**
 * Compare encouragement arrays (ordered, pooled, or paywall).
 */
function compareEncouragements(type, pubEnc, penEnc, patch, stats) {
  const pubById = new Map()
  const penById = new Map()

  for (const e of pubEnc) pubById.set(e.id, e)
  for (const e of penEnc) penById.set(e.id, e)

  let changed = 0

  // Added
  for (const [id] of penById) {
    if (!pubById.has(id)) changed++
  }
  // Removed
  for (const [id] of pubById) {
    if (!penById.has(id)) changed++
  }
  // Text changed
  for (const [id, pubE] of pubById) {
    const penE = penById.get(id)
    if (penE && pubE.text !== penE.text) changed++
  }

  stats.encouragementsChanged += changed
}

/**
 * Suggest version based on diff result.
 */
function suggestVersionFromDiff(existingVersion, diff) {
  if (!existingVersion) return '1.0.0'
  const [major, minor, patchNum] = existingVersion.split('.').map(Number)
  if (diff.major.length > 0) return `${major + 1}.0.0`
  if (diff.minor.length > 0) return `${major}.${minor + 1}.0`
  if (diff.patch.length > 0) return `${major}.${minor}.${patchNum + 1}`
  return existingVersion
}

/**
 * Build aggregated patch entries from stats (called after all comparisons).
 */
function buildPatchEntries(patch, stats) {
  if (stats.nodesRemoved > 0) patch.push({ type: 'nodes_removed', count: stats.nodesRemoved })
  if (stats.nodesReordered > 0) patch.push({ type: 'nodes_reordered', count: stats.nodesReordered })
  if (stats.nodesTextChanged > 0) patch.push({ type: 'node_text_changed', count: stats.nodesTextChanged })
  if (stats.samplesAdded > 0) patch.push({ type: 'samples_added', count: stats.samplesAdded })
  if (stats.samplesRemoved > 0) patch.push({ type: 'samples_removed', count: stats.samplesRemoved })
  if (stats.sampleUuidChanged > 0) patch.push({ type: 'sample_uuid_changed', count: stats.sampleUuidChanged })
  if (stats.durationsChanged > 0) patch.push({ type: 'duration_updated', count: stats.durationsChanged })
  if (stats.encouragementsChanged > 0) patch.push({ type: 'encouragements_changed', count: stats.encouragementsChanged })
}

/**
 * Truncate a string for display.
 */
function truncate(str, maxLen) {
  if (!str) return ''
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str
}

/**
 * Main entry point: compare and return full diff result.
 */
function diffManifests(published, pending) {
  // Deep clone pending so cleanTrailingPeriods doesn't mutate the original
  const pendingClone = JSON.parse(JSON.stringify(pending))

  const result = compareManifests(published, pendingClone)

  // Build aggregated patch entries from stats
  buildPatchEntries(result.patch, result.stats)

  // Re-evaluate suggestedBump after patch entries are built
  result.suggestedBump = result.major.length > 0 ? 'major'
    : result.minor.length > 0 ? 'minor'
    : result.patch.length > 0 ? 'patch'
    : 'none'

  return result
}

module.exports = {
  diffManifests,
  compareManifests,
  suggestVersionFromDiff
}
