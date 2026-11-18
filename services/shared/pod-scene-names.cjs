// services/shared/pod-scene-names.cjs
//
// Learner-facing SCENE NAMES (Tom, 2026-11-02: "we should name the scenes rather
// than just number them / Scene 8 - Ordering Food"). ONE source of truth: the
// committed files in ./pod-scene-names/<cut>.json, one per pod cut, holding every
// scene's name in every known language we have translated. Each course's pod gets
// the names in ITS known language copied into listening_pods.metadata.scene_names
// ({"1": "...", ...}) by tools/pods/write-scene-names.cjs; the learner app reads
// that field and never holds a list of its own.
//
// A pod is matched to a cut by its SHAPE (sentence count per scene, scenes 1..N),
// not by slug: the same 231-line cut is served as pod-1 on some courses and staged
// as pod-1-231 on others. A known language with no names in the cut is SKIPPED,
// never filled with English (an English name in front of a Spanish-known learner is
// the failure this exists to prevent); the app then shows "Scene N" alone.
//
// Why not canonical_pod_scenarios.scene_title: that field is the authoring title
// ("A Day of Greetings (iii) - 3 pm"), English-only, repeated on every line, and it
// keys the frame-layer register codex (tools/frame-layer/extract-dialogue-patterns)
// — rewriting it would invalidate that codex. See docs/DECISIONS.md 2026-11-02.
'use strict'
const fs = require('fs')
const path = require('path')

const DIR = path.join(__dirname, 'pod-scene-names')

function loadCuts(dir = DIR) {
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
}

/** Sentence count per scene, scenes 1..N in order; null when the numbering has a gap. */
function sceneShape(rows) {
  const counts = new Map()
  for (const r of rows || []) {
    const n = Number(r.scene_number)
    if (!Number.isInteger(n) || n < 1) return null
    counts.set(n, (counts.get(n) || 0) + 1)
  }
  if (!counts.size) return null
  const max = Math.max(...counts.keys())
  if (counts.size !== max) return null
  return Array.from({ length: max }, (_, i) => counts.get(i + 1))
}

/** 'cym_n' → 'cym'; 'eng' → 'eng'. Names are per language, not per dialect. */
const baseLang = (code) => String(code || '').toLowerCase().split('_')[0]

/**
 * Which names a pod should carry. Returns { cut, names } or { skip: reason }.
 * `names` is { "1": "...", ... } in the known language, every scene present.
 */
function planSceneNames({ shape, knownLang, cuts = loadCuts() }) {
  if (!shape) return { skip: 'no scene shape' }
  const key = shape.join(',')
  // A cut matches on its own shape, or on a VARIANT's: an older or longer cut of
  // the same scenes (Pod 1's 142-line cut, a 232-line course), whose sceneMap
  // names the base scene each of its scenes is, so the names stay in one place.
  let cut = null, sceneMap = null
  for (const c of cuts) {
    if (Array.isArray(c.shape) && c.shape.join(',') === key) { cut = c; break }
    const v = (c.variants || []).find(x => Array.isArray(x.shape) && x.shape.join(',') === key)
    if (v) { cut = c; sceneMap = v.sceneMap || null; break }
  }
  if (!cut) return { skip: 'shape matches no named cut' }
  const lang = baseLang(knownLang)
  const names = {}
  for (let n = 1; n <= shape.length; n++) {
    const base = sceneMap ? sceneMap[n - 1] : n
    const name = cut.scenes && cut.scenes[String(base)] && cut.scenes[String(base)][lang]
    if (typeof name !== 'string' || !name.trim()) return { skip: `cut ${cut.cut} has no ${lang} name for scene ${n}` }
    names[String(n)] = name.trim()
  }
  return { cut: cut.cut, names }
}

/** metadata with scene_names set; the same object back (=== input) when nothing changes. */
function withSceneNames(metadata, names) {
  const md = metadata && typeof metadata === 'object' ? metadata : {}
  if (JSON.stringify(md.scene_names || null) === JSON.stringify(names)) return metadata
  return { ...md, scene_names: names }
}

module.exports = { loadCuts, sceneShape, baseLang, planSceneNames, withSceneNames, DIR }
