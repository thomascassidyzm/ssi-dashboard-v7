#!/usr/bin/env node
/**
 * cross-pod-duplication — which sentences appear in more than one pod.
 *
 * Tom's ruling, 2026-08-30: TOPIC overlap between pods is fine and expected;
 * VERBATIM overlap is a defect. Both the Learning flagship and the two Method Pod
 * cuts were built from the same corpus (Talk Bollocks) and the same canon within
 * hours of each other, so collision was near-guaranteed and will recur every time
 * another sector pod is built off the same material.
 *
 * DETECT ONLY. This tool rewrites nothing and proposes no edit. The rule for the
 * later rewrite, recorded here so it is not relitigated: WHERE TWO PODS COLLIDE
 * VERBATIM, THE LEARNING POD YIELDS — the Method Pod is the older artefact and the
 * more tightly measured of the two.
 *
 *   node tools/pods/cross-pod-duplication.cjs [--floor=6] [--near=0.75] [--json=out.json]
 *
 * ── Normalisation, and only this ────────────────────────────────────────────
 * Whitespace is collapsed, and punctuation and quote marks surrounding the whole
 * sentence are stripped. NOTHING ELSE. No lowercasing, no stemming, no stripping
 * of internal punctuation: "Do some cool shit." and "do some cool shit" would be
 * one match (surrounding punctuation only), but "The web." and "the web" would NOT
 * be — case is a meaningful distinction and is kept.
 */

const fs = require('fs')
const path = require('path')
require('dotenv').config()

const REPO = path.resolve(__dirname, '../..')
const arg = (n, d) => { const h = process.argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d }
const FLOOR = Number(arg('floor', 6))     // minimum words for a sentence to be a finding
const NEAR = Number(arg('near', 0.75))    // word-set Jaccard for a near-duplicate
const JSON_OUT = arg('json', '')

const SLUGS = ['learning-flagship', 'method-pod-chapters', 'method-pod-43-scene']

// ── the only normalisation applied ──────────────────────────────────────────
const OUTER = /^[\s"'“”„«»‘’()\[\]—–\-.,;:!?…]+|[\s"'“”„«»‘’()\[\]—–\-.,;:!?…]+$/g
const norm = s => String(s).replace(/\s+/g, ' ').trim().replace(OUTER, '').replace(/\s+/g, ' ').trim()
const words = s => norm(s).split(' ').filter(Boolean)

/**
 * A turn may carry several sentences, and Tom's finding is about SENTENCES, so a
 * turn is split before comparison. The split is conservative: a sentence ends at
 * . ! ? or … followed by whitespace. Em dashes and internal ellipses do not split.
 */
function sentences (text) {
  return String(text).split(/(?<=[.!?…])\s+/).map(norm).filter(Boolean)
}

async function fetchRows (slug) {
  const URL = (process.env.SUPABASE_URL || '').trim(), KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim()
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
  const out = []
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${URL}/rest/v1/canonical_pod_scenarios?pod_slug=eq.${encodeURIComponent(slug)}&select=id,scene_number,scene_label,scene_title,sentence_number,speaker,english_text&order=global_order.asc`,
      { headers: { ...H, Range: `${from}-${from + 999}` } })
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
    const d = await r.json()
    out.push(...d)
    if (d.length < 1000) break
  }
  return out
}

function jaccard (a, b) {
  const A = new Set(a), B = new Set(b)
  let i = 0
  for (const x of A) if (B.has(x)) i++
  return i / (A.size + B.size - i)
}

;(async () => {
  // ── index every sentence of every pod, with where it sits ─────────────────
  const units = []   // { slug, sceneLabel, sceneTitle, lineId, speaker, text, wordCount }
  const counts = {}
  for (const slug of SLUGS) {
    const rows = await fetchRows(slug)
    counts[slug] = { lines: rows.length, sentences: 0 }
    for (const row of rows) {
      for (const s of sentences(row.english_text)) {
        units.push({
          slug,
          sceneLabel: row.scene_label,
          sceneTitle: row.scene_title,
          lineId: row.id,
          line: row.sentence_number,
          speaker: row.speaker,
          text: s,
          wc: s.split(' ').filter(Boolean).length
        })
        counts[slug].sentences++
      }
    }
  }

  // ── exact duplication, cross-pod only ─────────────────────────────────────
  const byText = new Map()
  for (const u of units) {
    if (!byText.has(u.text)) byText.set(u.text, [])
    byText.get(u.text).push(u)
  }
  const allGroups = []
  for (const [text, occ] of byText) {
    const slugs = new Set(occ.map(o => o.slug))
    if (slugs.size < 2) continue                       // within one pod is not a cross-pod finding
    allGroups.push({ text, wc: occ[0].wc, slugs: [...slugs].sort(), occurrences: occ })
  }
  allGroups.sort((a, b) => b.wc - a.wc || a.text.localeCompare(b.text))
  const groups = allGroups.filter(g => g.wc >= FLOOR)

  // the floor curve, so the floor is a choice Tom can see rather than a number
  const FLOORS = [1, 2, 3, 4, 5, 6, 8, 10, 15]
  const curve = {}
  for (const f of FLOORS) curve[f] = allGroups.filter(g => g.wc >= f).length

  // The same curve PER PAIR, because the two Method Pod arms are two cuts of ONE
  // artefact — the chapter cut's §1 map has an "Absorbs (scene #)" column — so
  // their overlap is by design, and pooling it with the Learning flagship's would
  // hide the only number that is actually a finding.
  const pairCurves = {}
  for (let i = 0; i < SLUGS.length; i++) {
    for (let k = i + 1; k < SLUGS.length; k++) {
      const key = [SLUGS[i], SLUGS[k]].sort().join('  \u2194  ')
      const gs = allGroups.filter(g => g.slugs.includes(SLUGS[i]) && g.slugs.includes(SLUGS[k]))
      pairCurves[key] = Object.fromEntries(FLOORS.map(f => [f, gs.filter(g => g.wc >= f).length]))
    }
  }

  // pairwise counts, at the chosen floor
  const pairKey = (a, b) => [a, b].sort().join('  ↔  ')
  const pairs = {}
  for (let i = 0; i < SLUGS.length; i++) {
    for (let k = i + 1; k < SLUGS.length; k++) pairs[pairKey(SLUGS[i], SLUGS[k])] = 0
  }
  for (const g of groups) {
    for (let i = 0; i < g.slugs.length; i++) {
      for (let k = i + 1; k < g.slugs.length; k++) pairs[pairKey(g.slugs[i], g.slugs[k])]++
    }
  }

  // ── near-duplicates, SEPARATE, never conflated with exact ─────────────────
  // Word-set Jaccard over the normalised sentence. A length prefilter keeps this
  // to a few hundred thousand comparisons — cheap, no library, one pass.
  const exact = new Set(allGroups.map(g => g.text))
  const cand = units.filter(u => u.wc >= FLOOR && !exact.has(u.text))
  const bySlug = {}
  for (const u of cand) (bySlug[u.slug] = bySlug[u.slug] || []).push({ ...u, ws: words(u.text) })
  const near = []
  const seen = new Set()
  let comparisons = 0
  for (let i = 0; i < SLUGS.length; i++) {
    for (let k = i + 1; k < SLUGS.length; k++) {
      for (const a of bySlug[SLUGS[i]] || []) {
        for (const b of bySlug[SLUGS[k]] || []) {
          if (Math.min(a.wc, b.wc) / Math.max(a.wc, b.wc) < NEAR) continue   // length prefilter
          comparisons++
          const j = jaccard(a.ws, b.ws)
          if (j < NEAR) continue
          const key = [a.lineId + '|' + a.text, b.lineId + '|' + b.text].sort().join('##')
          if (seen.has(key)) continue
          seen.add(key)
          near.push({ jaccard: Number(j.toFixed(3)), a, b })
        }
      }
    }
  }
  near.sort((x, y) => y.jaccard - x.jaccard)

  // ── report ────────────────────────────────────────────────────────────────
  const L = console.log
  L(`\nCROSS-POD VERBATIM DUPLICATION — detect only, nothing rewritten`)
  L(`Normalisation: whitespace collapsed; punctuation and quote marks surrounding the WHOLE sentence stripped. Nothing else — no lowercasing, no stemming.`)
  L(`Minimum-length floor: ${FLOOR} words. Near-duplicate threshold: word-set Jaccard >= ${NEAR}, reported separately.`)
  L(`\nCorpus:`)
  for (const s of SLUGS) L(`  ${s.padEnd(21)} ${String(counts[s].lines).padStart(4)} lines → ${String(counts[s].sentences).padStart(4)} sentences`)

  L(`\n── EXACT duplicates shared by two or more pods`)
  L(`  ${groups.length} distinct sentences at the ${FLOOR}-word floor (${allGroups.length} at any length)`)
  L(`  floor curve — sentences at >= N words:`)
  L(`    ` + Object.entries(curve).map(([f, n]) => `${f}w:${n}`).join('  '))
  L(`\n  pairwise floor curves — distinct shared sentences at >= N words:`)
  L(`    ${'pair'.padEnd(46)}` + Object.keys(curve).map(f => `${f}w`.padStart(6)).join(''))
  for (const [k, c] of Object.entries(pairCurves)) {
    L(`    ${k.padEnd(46)}` + Object.values(c).map(v => String(v).padStart(6)).join(''))
  }
  L(`\n  NOTE: method-pod-chapters and method-pod-43-scene are TWO CUTS OF ONE ARTEFACT — the`)
  L(`  chapter cut's chapter map carries an "Absorbs (scene #)" column and its §4b measures itself`)
  L(`  against the scene cut as a control arm. Their overlap is by design, not a defect.`)

  L(`\n── THE LIST — every exact cross-pod duplicate at >= ${FLOOR} words`)
  groups.forEach((g, n) => {
    L(`\n  ${String(n + 1).padStart(3)}. (${g.wc}w) "${g.text}"`)
    for (const o of g.occurrences) L(`       ${o.slug.padEnd(21)} ${String(o.sceneLabel || '').padEnd(11)} line ${String(o.line).padStart(3)}  ${o.speaker.padEnd(5)}  ${o.lineId}`)
  })

  L(`\n── NEAR-duplicates (NOT exact; counted separately, never conflated)`)
  L(`  ${near.length} pairs at Jaccard >= ${NEAR} over ${comparisons.toLocaleString()} compared pairs`)
  near.slice(0, 60).forEach((p, n) => {
    L(`\n  ${String(n + 1).padStart(3)}. J=${p.jaccard}`)
    L(`       ${p.a.slug.padEnd(21)} ${String(p.a.sceneLabel || '').padEnd(11)} "${p.a.text}"`)
    L(`       ${p.b.slug.padEnd(21)} ${String(p.b.sceneLabel || '').padEnd(11)} "${p.b.text}"`)
  })
  if (near.length > 60) L(`\n  … ${near.length - 60} more near-duplicate pairs (full list in the JSON)`)

  if (JSON_OUT) {
    fs.writeFileSync(path.join(REPO, JSON_OUT), JSON.stringify({
      ran: new Date().toISOString(),
      normalisation: 'whitespace collapsed; punctuation/quotes surrounding the whole sentence stripped; no lowercasing, no stemming',
      floorWords: FLOOR, nearThreshold: NEAR, nearMetric: 'word-set Jaccard',
      counts, floorCurve: curve, pairwiseExact: pairs, pairwiseFloorCurves: pairCurves,
      exactGroups: groups, nearPairs: near
    }, null, 2))
    L(`\njson → ${JSON_OUT}`)
  }
})().catch(e => { console.error(e.message); process.exit(1) })
