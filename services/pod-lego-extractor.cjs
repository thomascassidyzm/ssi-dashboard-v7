/**
 * Pod-LEGO extractor — corpus-first inventory + per-clause atom maps.
 *
 * Implements the Popty (pipeline) half of the Atom-Fusion Introduction design
 * (docs/architecture/atom-fusion-introduction.md). The listening pods are a
 * SEPARATE corpus from the speaking course, so they have no shared LEGO
 * inventory to snap explainer atoms to — we build one from the pod corpus
 * itself, the course-builder methodology re-pointed at listening_pod_sentences.
 *
 * Two passes:
 *
 *   Pass 1 (fold)  — read every sentence's existing explainer_decomposition
 *                    (the chunk_target/chunk_known pairs the explainer generator
 *                    already produced) and fold them into a canonical inventory:
 *                    one unit per recurring known<->target pair, ZUT-resolved to
 *                    a single canonical gloss, ordered by first appearance.
 *
 *   Pass 2 (build) — emit a per-sentence atom_map citing inventory units by
 *                    lego_key, with kind (atom | passthrough | note) decided by
 *                    first-encounter discipline, plus notes lifted from the
 *                    chunk `literal` field. Validates total tiling.
 *
 * SOURCE CORPUS IS NOW FROZEN. The pod explainer track was deprecated on
 * 2026-08-24 and its generator deleted, so explainer_decomposition is a
 * read-only corpus: the 13,993 rows that have one are all there will ever be,
 * and this extractor no longer has a way to make more. It is left running
 * against them because the Stage-0 atom ladder it feeds is live and is NOT
 * part of that deprecation.
 *
 * This is the COST-FREE data layer: it consumes decompositions that already
 * exist and writes only
 * text/JSON. Audio (the inventory's canonical explainer clips, per-clause
 * note_audio) and forced-aligned offsets are a downstream, cost-gated pass and
 * are deliberately NOT generated here — atom/note offsets are left null.
 *
 * The pure functions (fold/build/validate) are exported for unit testing
 * without a database or the CLI; the run() orchestration defaults to DRY-RUN.
 */

const path = require('path')
// dotenv is only needed for live (IO) runs; guard it so the pure core stays
// importable for unit tests in a bare checkout (no node_modules).
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
} catch (_) {
  /* no dotenv — fine for the pure functions; getSupabase() will still error */
}

// =============================================================================
// PURE CORE — normalisation + keys
// =============================================================================

/** Canonical comparison form for a surface string (case/diacritic-aware NFC,
 *  punctuation-trimmed at the edges, inner apostrophes/hyphens kept). Used to
 *  decide whether two chunks are "the same unit". */
function normSurface(s) {
  return String(s == null ? '' : s)
    .normalize('NFC')
    .toLowerCase()
    .replace(/^[\s\p{P}\p{S}]+/u, '')
    .replace(/[\s\p{P}\p{S}]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Punctuation/space-insensitive form, for tiling-totality checks (does the
 *  concatenation of chunk targets reconstruct the clause?). */
function bareForm(s) {
  return String(s == null ? '' : s)
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '')
}

/** Slug for the inventory key, derived from the canonical target surface.
 *  Collisions between distinct surfaces are resolved by the caller (foldInventory)
 *  with a numeric suffix, so this stays a pure, deterministic function. */
function slugKey(targetSurface) {
  const base = normSurface(targetSurface)
    .replace(/[\s\p{P}\p{S}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return base || 'x'
}

/** A chunk is an identity (untranslated proper noun the generator failed to
 *  drop, e.g. "Sarah" -> "Sarah") when target and known normalise equal. These
 *  are names: spoken (so they fuse) but never taught. */
function isIdentityChunk(target, known) {
  const t = normSurface(target)
  const k = normSurface(known)
  return t.length > 0 && t === k
}

// =============================================================================
// PURE CORE — Pass 1: fold the corpus into an inventory
// =============================================================================

/**
 * Fold per-sentence decompositions into a canonical pod-LEGO inventory.
 *
 * @param {string} courseCode
 * @param {Array} sentences  ordered list (any order accepted; sorted here by
 *   global_order) of { id, global_order, target_text, known_text, decomposition }
 *   where decomposition is [{ chunk_target, chunk_known, literal?, primitives? }]
 * @returns {{ units: Map<string,Unit>, keyOf: (chunk)=>string|null }}
 *   Unit = { lego_key, course_code, target, known, first_seen_order,
 *            first_seen_sentence, occurrence_count, is_name, zut_alternates,
 *            needs_review, review_note }
 */
function foldInventory(courseCode, sentences) {
  const ordered = [...sentences].sort(
    (a, b) => (a.global_order ?? 0) - (b.global_order ?? 0),
  )

  // Map normalised target surface -> working aggregate.
  const byTarget = new Map()
  // Reserve slugs so distinct surfaces never collide on lego_key.
  const slugTaken = new Map() // slug -> normTarget that owns it

  for (const s of ordered) {
    const decomp = Array.isArray(s.decomposition) ? s.decomposition : []
    for (const c of decomp) {
      if (!c || typeof c.chunk_target !== 'string') continue
      const target = c.chunk_target
      const known = typeof c.chunk_known === 'string' ? c.chunk_known : ''
      const nt = normSurface(target)
      if (!nt) continue

      let agg = byTarget.get(nt)
      if (!agg) {
        // Assign a collision-free slug.
        let slug = slugKey(target)
        if (slugTaken.has(slug) && slugTaken.get(slug) !== nt) {
          let n = 2
          while (slugTaken.has(`${slug}-${n}`)) n++
          slug = `${slug}-${n}`
        }
        slugTaken.set(slug, nt)
        agg = {
          lego_key: slug,
          course_code: courseCode,
          target, // first-seen surface form is the canonical display form
          knownCounts: new Map(),
          first_seen_order: s.global_order ?? 0,
          first_seen_sentence: s.id,
          occurrence_count: 0,
          is_name: false,
        }
        byTarget.set(nt, agg)
      }
      agg.occurrence_count += 1
      if (isIdentityChunk(target, known)) {
        agg.is_name = true
      } else if (known) {
        agg.knownCounts.set(known, (agg.knownCounts.get(known) || 0) + 1)
      }
    }
  }

  // Resolve ZUT: canonical known = most frequent gloss; alternates parked.
  const units = new Map()
  for (const agg of byTarget.values()) {
    const sorted = [...agg.knownCounts.entries()].sort((a, b) => b[1] - a[1])
    const canonicalKnown = agg.is_name ? agg.target : sorted.length ? sorted[0][0] : ''
    const alternates = sorted.slice(1).map(([known, count]) => ({ known, count }))
    let needsReview = false
    let reviewNote = null
    if (alternates.length > 0) {
      needsReview = true
      reviewNote = `ZUT: ${alternates.length} alternate gloss(es) seen; confirm canonical`
    }
    if (!agg.is_name && !canonicalKnown) {
      needsReview = true
      reviewNote = 'no gloss captured for this unit'
    }
    units.set(agg.lego_key, {
      lego_key: agg.lego_key,
      course_code: agg.course_code,
      target: agg.target,
      known: canonicalKnown,
      first_seen_order: agg.first_seen_order,
      first_seen_sentence: agg.first_seen_sentence,
      occurrence_count: agg.occurrence_count,
      is_name: agg.is_name,
      zut_alternates: alternates,
      needs_review: needsReview,
      review_note: reviewNote,
    })
  }

  // Index from a chunk's normalised target -> lego_key, for Pass 2 lookups.
  const keyByNormTarget = new Map()
  for (const u of units.values()) keyByNormTarget.set(normSurface(u.target), u.lego_key)
  const keyOf = (chunk) => {
    if (!chunk || typeof chunk.chunk_target !== 'string') return null
    return keyByNormTarget.get(normSurface(chunk.chunk_target)) || null
  }

  return { units, keyOf }
}

// =============================================================================
// PURE CORE — Pass 2: per-clause atom map
// =============================================================================

/**
 * Does the concatenation of chunk targets reconstruct the clause? (the
 * course-builder "total tiling" gate, applied to the pod clause). Punctuation-
 * and whitespace-insensitive, since chunk boundaries drop spaces.
 */
function validateTiling(targetText, decomposition) {
  const clause = bareForm(targetText)
  const tiled = bareForm(
    (decomposition || []).map((c) => (c && c.chunk_target) || '').join(''),
  )
  if (!clause) return { ok: true, coverage: 1 }
  if (tiled === clause) return { ok: true, coverage: 1 }
  // Partial coverage: how much of the clause the chunks account for. Names the
  // generator dropped (proper nouns per rule 6) legitimately leave residue, so
  // a shortfall is a flag for review, not a hard failure.
  const coverage = clause.length ? Math.min(1, tiled.length / clause.length) : 1
  return { ok: false, coverage }
}

/**
 * Build the per-sentence atom maps. Iterates sentences in global_order and
 * chunks in order, maintaining a corpus-wide `taught` set so the FIRST time a
 * unit is met it is kind='atom' and every later appearance is 'passthrough'
 * (first-encounter discipline). Names are always 'passthrough'.
 *
 * Notes: a chunk's `literal` (present only when word-by-word would mislead) is
 * lifted into a note entry spanning that chunk's atom — the data shape supports
 * multi-atom junction notes (spans range), which a later generation pass can
 * populate; here we emit the single-atom case the existing decomposition gives.
 *
 * @returns {Map<sentenceId, { atom_map, needs_review, review_note }>}
 */
function buildAtomMaps(courseCode, sentences, fold) {
  const { units, keyOf } = fold
  const ordered = [...sentences].sort(
    (a, b) => (a.global_order ?? 0) - (b.global_order ?? 0),
  )
  const taught = new Set()
  const out = new Map()

  for (const s of ordered) {
    const decomp = Array.isArray(s.decomposition) ? s.decomposition : []
    const atomMap = []
    let atomIndex = -1 // index among spoken (atom/passthrough) entries, for note spans
    const reviewNotes = []

    for (const c of decomp) {
      const key = keyOf(c)
      if (!key) {
        reviewNotes.push(`unmatched chunk target: ${JSON.stringify(c && c.chunk_target)}`)
        continue
      }
      const unit = units.get(key)
      let kind
      if (unit.is_name) {
        kind = 'passthrough'
      } else if (taught.has(key)) {
        kind = 'passthrough'
      } else {
        kind = 'atom'
        taught.add(key)
      }
      atomIndex += 1
      atomMap.push({
        lego_key: key,
        kind,
        gloss: unit.known,
        target_surface: c.chunk_target,
        // offsets land in the downstream forced-align/audio pass:
        target_start_ms: null,
        target_end_ms: null,
      })
      // Lift a misleading-order literal into a single-atom note. Notes carry no
      // target audio; explainer offsets point into note_audio (audio pass).
      if (typeof c.literal === 'string' && c.literal.trim()) {
        atomMap.push({
          kind: 'note',
          gloss: c.literal.trim(),
          spans: [atomIndex, atomIndex],
          explainer_start_ms: null,
          explainer_end_ms: null,
        })
      }
    }

    const tiling = validateTiling(s.target_text, decomp)
    let needsReview = reviewNotes.length > 0
    let reviewNote = reviewNotes.join('; ') || null
    if (!tiling.ok && tiling.coverage < 0.6) {
      // Below 0.6 the clause is mostly un-tiled — more than dropped names.
      needsReview = true
      reviewNote = [reviewNote, `low tiling coverage ${tiling.coverage.toFixed(2)}`]
        .filter(Boolean)
        .join('; ')
    }

    out.set(s.id, { atom_map: atomMap, needs_review: needsReview, review_note: reviewNote })
  }

  return out
}

/** End-to-end pure extraction: corpus in, inventory + atom maps out. No IO. */
function extract(courseCode, sentences) {
  const fold = foldInventory(courseCode, sentences)
  const atomMaps = buildAtomMaps(courseCode, sentences, fold)
  return { units: fold.units, atomMaps }
}

// =============================================================================
// IO ORCHESTRATION (dry-run by default — no writes without --commit)
// =============================================================================

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js')
  const url = (process.env.SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_KEY || '').trim()
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY required for a live run')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// NO LITERAL SLUG. This read used to keep `pod-0` as a constant, which since Tom's
// 1-based ruling of 2026-08-22 silently extracts NOTHING for the 22 courses that
// moved to `pod-1`. The serving slug is a per-course fact; the rule lives once, in
// tools/pods/serving-slug.cjs.
const { fetchServingSlug } = require('../tools/pods/serving-slug.cjs')

/** Load pod sentences + their existing explainer_decomposition for a course. */
async function loadSentences(supabase, courseCode, { allPods = false } = {}) {
  let q = supabase
    .from('listening_pod_sentences')
    .select('id, pod_id, global_order, speaker, target_text, known_text, explainer_decomposition')
    .like('pod_id', `${courseCode}:%`)
  const { data, error } = await q
  if (error) throw new Error(`load sentences: ${error.message}`)
  const servingPodId = allPods ? null : `${courseCode}:${await fetchServingSlug(supabase, courseCode)}`
  const rows = (data || []).filter((r) =>
    allPods ? true : String(r.pod_id || '') === servingPodId,
  )
  return rows.map((r) => ({
    id: r.id,
    global_order: r.global_order,
    target_text: r.target_text,
    known_text: r.known_text,
    decomposition: Array.isArray(r.explainer_decomposition) ? r.explainer_decomposition : [],
  }))
}

async function run({ courseCode, commit = false, allPods = false } = {}) {
  if (!courseCode) throw new Error('courseCode required')
  const supabase = getSupabase()
  const sentences = await loadSentences(supabase, courseCode, { allPods })
  const withDecomp = sentences.filter((s) => s.decomposition.length > 0)

  const { units, atomMaps } = extract(courseCode, sentences)

  const flagged = [...units.values()].filter((u) => u.needs_review)
  const summary = {
    course_code: courseCode,
    sentences: sentences.length,
    sentences_with_decomposition: withDecomp.length,
    inventory_units: units.size,
    names: [...units.values()].filter((u) => u.is_name).length,
    flagged_for_review: flagged.length,
    atom_maps: atomMaps.size,
    committed: false,
  }

  if (!commit) {
    return { summary, units, atomMaps, dryRun: true }
  }

  // Persist inventory (upsert by id = course:lego_key) ...
  const legoRows = [...units.values()].map((u) => ({
    id: `${u.course_code}:${u.lego_key}`,
    course_code: u.course_code,
    lego_key: u.lego_key,
    target: u.target,
    known: u.known,
    first_seen_order: u.first_seen_order,
    first_seen_sentence: u.first_seen_sentence,
    occurrence_count: u.occurrence_count,
    is_name: u.is_name,
    zut_alternates: u.zut_alternates,
    needs_review: u.needs_review,
    review_note: u.review_note,
    updated_at: new Date().toISOString(),
  }))
  const { error: legoErr } = await supabase
    .from('pod_legos')
    .upsert(legoRows, { onConflict: 'id' })
  if (legoErr) throw new Error(`upsert pod_legos: ${legoErr.message}`)

  // ... and each sentence's atom_map.
  for (const [sentenceId, m] of atomMaps) {
    const { error } = await supabase
      .from('listening_pod_sentences')
      .update({ atom_map: m.atom_map })
      .eq('id', sentenceId)
    if (error) throw new Error(`update atom_map ${sentenceId}: ${error.message}`)
  }

  summary.committed = true
  return { summary, units, atomMaps, dryRun: false }
}

module.exports = {
  run,
  extract,
  foldInventory,
  buildAtomMaps,
  validateTiling,
  // exported for tests / reuse
  _internal: { normSurface, bareForm, slugKey, isIdentityChunk },
}

// CLI: dry-run by default; --commit writes. Never generates audio.
if (require.main === module) {
  const args = process.argv.slice(2)
  const commit = args.includes('--commit')
  const allPods = args.includes('--all-pods')
  const courseCode = args.find((a) => !a.startsWith('--'))
  run({ courseCode, commit, allPods })
    .then(({ summary }) => {
      console.log(JSON.stringify(summary, null, 2))
      if (!commit) console.log('\n(dry run — pass --commit to persist; audio is a separate cost-gated pass)')
    })
    .catch((e) => {
      console.error('pod-lego-extractor failed:', e.message)
      process.exit(1)
    })
}
