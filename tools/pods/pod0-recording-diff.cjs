#!/usr/bin/env node
/**
 * pod0-recording-diff.cjs — three-way diff between the text a human recorder is
 * served TODAY for a pod (listening_pod_sentences) and the canonical English
 * (canonical_pod_scenarios).
 *
 * Buckets, per Tom's brief 2026-08-06:
 *   SURVIVES_UNCHANGED — English identical after conservative normalisation.
 *                        Any take already recorded stays valid.
 *   REWORDED           — same intent, different words. Sub-typed:
 *                          numerals_only — English differs only in how numbers
 *                            are written ("One. Two." → "1. 2."); the target line
 *                            and its take are untouched, only the English guide
 *                            line needs re-recording.
 *                          placeholder   — canonical carries the literal
 *                            "[target language]" token; needs a per-course
 *                            substitution ruling before anyone reads it aloud.
 *                          wording       — genuine rewrite; target text needs review.
 *   NEW                — canonical line with no counterpart at all.
 *   STALE              — served line that is in no canonical line at all.
 *
 * Normalisation is deliberately conservative — whitespace, quote/dash/ellipsis
 * glyphs and case only. Numeral folding is used for SIMILARITY SCORING ONLY,
 * never to declare two lines identical.
 *
 * Pure module (no DB, no I/O) plus a thin CLI. Vocabulary: known / target / seed.
 */
'use strict'

// ---------------------------------------------------------------- normalisation

function norm(t) {
  return String(t == null ? '' : t)
    .normalize('NFC')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// Number words <-> digits, for SIMILARITY ONLY. Aran's canonical writes the drill
// tails as numerals ("1. 2. 3.") where the served text spells them ("One. Two.
// Three."). On raw token overlap that scores zero and would read as a stale line
// plus a brand-new line, which is exactly backwards: the Welsh is unchanged.
const NUMWORDS = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7',
  eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12', thirteen: '13',
  fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18',
  nineteen: '19', twenty: '20', thirty: '30', forty: '40', fifty: '50',
  sixty: '60', seventy: '70', eighty: '80', ninety: '90',
  hundred: '100', thousand: '1000',
}

function toks(t) {
  return norm(t).replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean)
    .map(w => NUMWORDS[w] || w)
}

function dice(a, b) {
  const A = toks(a), B = toks(b)
  if (!A.length || !B.length) return 0
  const bag = new Map()
  for (const w of A) bag.set(w, (bag.get(w) || 0) + 1)
  let hit = 0
  for (const w of B) {
    const c = bag.get(w) || 0
    if (c > 0) { hit++; bag.set(w, c - 1) }
  }
  return (2 * hit) / (A.length + B.length)
}

const PLACEHOLDER_RE = /\[target language\]/i

// ------------------------------------------------------------------- alignment

/** Longest common subsequence over exactly-equal normalised English, order-preserving. */
function lcsPairs(servedText, canonText) {
  const m = servedText.length, n = canonText.length
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = servedText[i] === canonText[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const pairs = []
  let i = 0, j = 0
  while (i < m && j < n) {
    if (servedText[i] === canonText[j]) { pairs.push([i, j]); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  return pairs
}

/** Below this token-Dice score a canonical line is called brand-new, not reworded. */
const REWORD_THRESHOLD = 0.5

/**
 * @param {Array} served  listening_pod_sentences rows (known_text, target_text, *_audio_id, …)
 * @param {Array} canon   canonical_pod_scenarios rows (english_text, speaker, …)
 */
function diffPod(served, canon) {
  const S = served.map(r => norm(r.known_text))
  const C = canon.map(r => norm(r.english_text))
  const pairs = lcsPairs(S, C)
  const matchedS = new Set(pairs.map(p => p[0]))
  const matchedC = new Set(pairs.map(p => p[1]))

  const leftS = served.map((_, i) => i).filter(i => !matchedS.has(i))
  const leftC = canon.map((_, j) => j).filter(j => !matchedC.has(j))

  const cands = []
  for (const i of leftS) {
    for (const j of leftC) {
      const sc = dice(served[i].known_text, canon[j].english_text)
      if (sc >= REWORD_THRESHOLD) cands.push({ i, j, sc })
    }
  }
  // Best score first; ties broken toward the pairing that moves least.
  cands.sort((a, b) => b.sc - a.sc || Math.abs(a.i - a.j) - Math.abs(b.i - b.j))
  const usedS = new Set(), usedC = new Set(), picked = []
  for (const c of cands) {
    if (usedS.has(c.i) || usedC.has(c.j)) continue
    usedS.add(c.i); usedC.add(c.j); picked.push(c)
  }

  const survives = pairs.map(([i, j]) => ({ served: served[i], canon: canon[j] }))
  const reworded = picked.map(c => {
    const s = served[c.i], n = canon[c.j]
    const numeralsOnly = toks(s.known_text).join(' ') === toks(n.english_text).join(' ')
    const placeholder = PLACEHOLDER_RE.test(n.english_text)
    return {
      served: s,
      canon: n,
      similarity: Math.round(c.sc * 1000) / 1000,
      subtype: numeralsOnly ? 'numerals_only' : (placeholder ? 'placeholder' : 'wording'),
      placeholder,
    }
  })
  const stale = leftS.filter(i => !usedS.has(i)).map(i => served[i])
  const brandNew = leftC.filter(j => !usedC.has(j)).map(j => canon[j])

  // A carried-forward take stays valid only when the target text is untouched,
  // which is true for survivors and for numerals_only rewords.
  const targetSafe = new Set([
    ...survives.map(p => p.served.id),
    ...reworded.filter(r => r.subtype === 'numerals_only').map(r => r.served.id),
  ])
  const knownSafe = new Set(survives.map(p => p.served.id))

  const count = (rows, f) => rows.filter(f).length
  const movedPosition = survives.filter(p =>
    p.served.global_order !== p.canon.global_order ||
    p.served.scene_number !== p.canon.scene_number ||
    p.served.sentence_number !== p.canon.sentence_number)
  const speakerChanged = survives.filter(p => norm(p.served.speaker) !== norm(p.canon.speaker))

  return {
    served_total: served.length,
    canonical_total: canon.length,
    buckets: {
      survives_unchanged: survives.length,
      reworded: reworded.length,
      new: brandNew.length,
      stale: stale.length,
    },
    reworded_subtypes: {
      numerals_only: count(reworded, r => r.subtype === 'numerals_only'),
      wording: count(reworded, r => r.subtype === 'wording'),
      placeholder: count(reworded, r => r.subtype === 'placeholder'),
    },
    survivors_moved_position: movedPosition.length,
    survivors_speaker_changed: speakerChanged.length,
    canonical_placeholder_lines: count(canon, r => PLACEHOLDER_RE.test(r.english_text)),
    target_text_gap: {
      // canonical lines with no target text anywhere — a translation task, not a recording task
      no_target_text_at_all: brandNew.length,
      // target text exists but was written against the old English
      target_needs_review: count(reworded, r => r.subtype !== 'numerals_only'),
      target_unaffected: count(reworded, r => r.subtype === 'numerals_only'),
    },
    takes: {
      existing_target: count(served, r => r.target_audio_id),
      existing_known: count(served, r => r.known_audio_id),
      target_still_valid: count(served, r => r.target_audio_id && targetSafe.has(r.id)),
      known_still_valid: count(served, r => r.known_audio_id && knownSafe.has(r.id)),
      target_invalidated: count(served, r => r.target_audio_id && !targetSafe.has(r.id)),
      known_invalidated: count(served, r => r.known_audio_id && !knownSafe.has(r.id)),
    },
    detail: { survives, reworded, stale, brandNew, movedPosition, speakerChanged },
    // id sets the aligner uses to decide what may be carried forward
    carry: { targetSafe: [...targetSafe], knownSafe: [...knownSafe] },
  }
}

module.exports = { norm, toks, dice, diffPod, PLACEHOLDER_RE, REWORD_THRESHOLD }

// ------------------------------------------------------------------------- CLI

if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
  const { createClient } = require('@supabase/supabase-js')
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const courses = process.argv.slice(2).filter(a => !a.startsWith('-'))
  const podSlug = 'pod-0'          // the per-course LISTENING pod served today
  const canonicalSlug = 'pod-1'    // the canonical slate, renamed from 'pod-0' on 2026-09-01
  ;(async () => {
    const { data: canon, error: ce } = await db.from('canonical_pod_scenarios')
      .select('*').eq('pod_slug', canonicalSlug).order('global_order')
    if (ce) throw ce
    const out = {}
    for (const code of (courses.length ? courses : ['cym_n_for_eng', 'cym_s_for_eng'])) {
      const { data: served, error: se } = await db.from('listening_pod_sentences')
        .select('*').eq('pod_id', `${code}:${podSlug}`).order('global_order')
      if (se) throw se
      const d = diffPod(served, canon)
      delete d.detail
      delete d.carry
      out[code] = d
    }
    console.log(JSON.stringify(out, null, 2))
  })().catch(e => { console.error(e); process.exit(1) })
}
