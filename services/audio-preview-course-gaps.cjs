/**
 * audio-preview-course-gaps.cjs — the whole course's missing clips, in one list.
 *
 * WHY THIS EXISTS
 * Script Viewer's "Missing audio only" toggle filters `learningJourneyData.rounds`
 * — the rounds currently LOADED in the page window, which is 20 LEGOs per page
 * (ScriptViewer.vue: `journeyPageSize = 20`). So the filter can only ever show
 * the gaps inside the block you happen to be looking at; finding every gap in a
 * 1,529-round course means paging through it 20 rounds at a time. This module
 * does the same test over the WHOLE journey, server-side, once.
 *
 * The gap test is deliberately the SAME one the page uses — an item is missing
 * audio when `hasAudio` is false — so the two surfaces can never disagree.
 * `hasAudio` is set by learning-script-generator.cjs and means: presentation +
 * target1 for an intro, known + target1 for everything else. target2 is NOT in
 * that gate, so a row whose only gap is target2 is not "missing" by the page's
 * definition — it is still counted here, separately and visibly, because a
 * number nobody prints is indistinguishable from a check nobody ran.
 *
 * DEDUPLICATION IS THE POINT
 * The journey replays the same USE phrase in review and consolidate rounds at
 * the Fibonacci offsets, so one phrase with no audio produces many missing
 * ITEMS. Counting items would report 3,214 gaps for fra_for_eng where there are
 * 1,600-odd actual rows to fix. Rows are therefore deduplicated by the thing a
 * repair would touch — the phrase row, or the LEGO's intro/debut — and each
 * carries `occurrences` so the replay cost of a single gap is still visible.
 *
 * Pure functions, no I/O: the router hands in an already-generated journey.
 */

'use strict'

// The audio roles a row can be missing. Order is the order they are reported in.
const ROLES = ['presentation', 'known', 'target1', 'target2']

/**
 * Which audio roles this journey item has no clip for.
 * Intro items play presentation audio; every other item type plays known audio.
 */
function missingRolesFor (item) {
  const gaps = []
  if (item.type === 'intro') {
    if (!item.presentation_audio) gaps.push('presentation')
  } else if (!item.known_audio_uuid) {
    gaps.push('known')
  }
  if (!item.target1_audio_uuid) gaps.push('target1')
  if (!item.target2_audio_uuid) gaps.push('target2')
  return gaps
}

/**
 * The identity of the ROW a repair would touch, not of the playback slot.
 * A phrase is its phrase_id; a LEGO's intro and its debut are separate repairs
 * (different audio roles) so they key separately.
 */
function rowKeyFor (item) {
  if (item.phrase_id) return `phrase:${item.phrase_id}`
  if (item.type === 'intro') return `lego-intro:${item.legoId}`
  if (item.type === 'debut') return `lego-debut:${item.legoId}`
  // Seed sentences and anything else the journey grows later: key on what
  // identifies it, never on the round it happened to appear in.
  return `${item.type}:${item.legoId}:${item.known_text}`
}

function kindFor (item) {
  if (item.phrase_id) return 'phrase'
  if (item.type === 'intro') return 'lego-intro'
  if (item.type === 'debut') return 'lego-debut'
  return item.type
}

/**
 * Fold a whole-course journey into the missing-clip list.
 *
 * @param {object[]} allItems  every journey item, in round order
 * @param {number}   roundCount total rounds in the journey (for the denominator)
 * @returns {{ totals, groups }}
 */
function computeCourseGaps ({ allItems = [], roundCount = 0 } = {}) {
  const rows = new Map()

  for (const item of allItems) {
    const gaps = missingRolesFor(item)
    if (gaps.length === 0) continue

    const key = rowKeyFor(item)
    const existing = rows.get(key)
    if (existing) {
      existing.occurrences += 1
      if (!existing.playedAs.includes(item.type)) existing.playedAs.push(item.type)
      // Keep the earliest round: that is where a person goes to hear the gap.
      if (item.roundNumber < existing.roundNumber) existing.roundNumber = item.roundNumber
      continue
    }

    rows.set(key, {
      key,
      kind: kindFor(item),
      // `blocking` mirrors the Script Viewer filter exactly: hasAudio false.
      // A row that only lacks target2 is a gap, but not one that stops the
      // learner hearing the item — the two are never merged into one number.
      blocking: item.hasAudio === false,
      missing: gaps,
      roundNumber: item.roundNumber,
      legoId: item.legoId,
      seedNumber: item.seedNumber,
      phraseId: item.phrase_id || null,
      knownText: item.known_text || null,
      targetText: item.target_text || null,
      playedAs: [item.type],
      occurrences: 1,
    })
  }

  const all = [...rows.values()].sort((a, b) =>
    a.roundNumber - b.roundNumber ||
    String(a.legoId).localeCompare(String(b.legoId)) ||
    a.key.localeCompare(b.key))

  // Grouped by the round the gap first appears in, so a cluster of gaps in one
  // round reads as a cluster rather than as a flat wall of rows.
  const groups = []
  const groupIndex = new Map()
  for (const row of all) {
    let group = groupIndex.get(row.roundNumber)
    if (!group) {
      group = {
        roundNumber: row.roundNumber,
        legoId: row.legoId,
        seedNumber: row.seedNumber,
        rows: [],
        blocking: 0,
      }
      groupIndex.set(row.roundNumber, group)
      groups.push(group)
    }
    group.rows.push(row)
    if (row.blocking) group.blocking += 1
  }

  const byRole = Object.fromEntries(ROLES.map(r => [r, 0]))
  const byKind = {}
  let blocking = 0
  let occurrences = 0
  for (const row of all) {
    for (const role of row.missing) byRole[role] += 1
    byKind[row.kind] = (byKind[row.kind] || 0) + 1
    if (row.blocking) blocking += 1
    occurrences += row.occurrences
  }

  return {
    totals: {
      // The headline: rows a person would have to fix.
      rows: all.length,
      // Of those, the ones the learner cannot hear at all.
      blocking,
      // Gaps that do NOT stop playback (target2 only) — printed, never folded in.
      nonBlocking: all.length - blocking,
      // How many playback slots those rows account for across the journey,
      // review replays included.
      occurrences,
      byRole,
      byKind,
      roundsAffected: groups.length,
      roundsTotal: roundCount,
      itemsScanned: allItems.length,
    },
    groups,
  }
}

module.exports = { computeCourseGaps, missingRolesFor, rowKeyFor, ROLES }
