'use strict'
/**
 * Speakability layers × Q/R/S × the metagraph's shapes — the grid, GENERATED.
 *
 * Tom, 2026-10-21: the Layers-and-shapes doc "should be published and updated on popty as we
 * develop more pods". So nothing here is authored prose: `buildGrid` is a pure function of
 *   (live seeds, live pod lines, the stored tags, the metagraph store)
 * and `loadGrid` reads the live inputs fresh on every call. A line is counted in a cell only if a
 * stored tag exists for it AND the tag's recorded text still equals the line's live text. A new
 * line, or a line whose text was edited, has no valid tag and is reported as UNTAGGED — never
 * guessed. So every path that writes seed or pod text changes this page without being wired to it;
 * `invalidate()` (called from the write routes) only drops the short cache.
 *
 * TAGS live in services/shared/metagraph/speakability/tags.json, keyed `seeds#S0001`,
 * `<podSlug>#<global_order>`, `<podId>#<global_order>`:
 *   { layer: '0'..'6', layer2?, qrs: 'Q'|'R'|'S', text: <the line as tagged>, move?, shape?, fmove?, note? }
 * Codebook (what each layer / Q-R-S / move means): the tag job's codebook — see tags.json provenance.
 * pod-1 shapes and response moves are read LIVE off the store's pod-1 walk; `shape`/`fmove` on a tag
 * only cover lines the store leaves unplaced (and every non-pod-1 line).
 */
const fs = require('fs')
const path = require('path')

const STORE = path.join(__dirname, 'metagraph')
const TAGS_FILE = path.join(STORE, 'speakability', 'tags.json')
const LAYERS = ['0', '1', '2', '3', '4', '5', '6']
const QRS = ['Q', 'R', 'S']
// the listening pod that carries the environment conversation (a course pod, not a canonical one)
const LISTENING_SOURCES = [
  { id: 'ita_for_eng:environment-conversation', label: 'Environment conversation', prefix: 'E' },
]
// pod-1's drill scenes (colours/numbers) are counted in the grid but are not conversations
const POD1_DRILL_SCENES = [15, 21]
const POD_LABELS = { 'pod-1': "pod-1 (Sarah's day)" }

const norm = (s) => String(s == null ? '' : s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

function loadStore() {
  const nodes = readJson(path.join(STORE, 'nodes.json'))
  const moves = readJson(path.join(STORE, 'moves.json'))
  const walk = readJson(path.join(STORE, 'walks', 'pod-1.json'))
  return { nodes, moves, walk }
}

/** pod-1 placement from the store: global_order -> { shapes:Set, fmoves:Set, coda } */
function pod1Placement(store) {
  const shape = new Map(), fm = new Map()
  const add = (m, g, v) => { if (!m.has(g)) m.set(g, new Set()); m.get(g).add(v) }
  const gnum = (r) => parseInt(String(r).replace(/\D/g, ''), 10)
  const step = (st) => {
    const rows = (st.row ? [st.row] : []).concat((st.surface_variants || []).map((v) => v.row))
    for (const r of rows) {
      const g = gnum(r)
      if (st.node) add(shape, g, `${st.node}.${st.position}`)
      if (st.composed_in) add(shape, g, `${st.composed_in.node}.${st.composed_in.position}`)
      if (st.move) add(fm, g, st.move)
    }
    for (const b of st.branches || []) {
      if (!b.row) continue
      const g = gnum(b.row)
      add(shape, g, `${st.node}.${st.position}`)
      if (b.move) add(fm, g, b.move)
    }
  }
  for (const wk of store.walk.walks || []) for (const st of wk.steps || []) step(st)
  for (const x of store.nodes.nodes.concat(store.nodes.bound_pairs || [])) {
    for (const a of (x.attestations && x.attestations.corpus) || []) {
      const gs = [...String(a).matchAll(/g(\d+)/g)].map((m) => parseInt(m[1], 10))
      gs.forEach((g, i) => add(shape, g, gs.length === (x.positions || []).length ? `${x.id}.${i + 1}` : `${x.id}.?`))
    }
  }
  for (const x of store.moves.moves) for (const g of x.rows) add(fm, gnum(g), x.id)
  const codas = new Set((store.walk.codas || []).map((c) => gnum(c.row)))
  return { shape, fm, codas }
}

const nodesOf = (shapes) => {
  const out = [...new Set(shapes.map((s) => s.split('.')[0]))].sort()
  if (out.length > 1 && out.includes('none')) out.splice(out.indexOf('none'), 1)
  return out
}
const splitList = (v) => String(v || '').split(/[,+/\s]+/).filter(Boolean)

/**
 * @param {{seeds:{id,text}[], pods:{id,label,kind,prefix?,rows:{order,scene,speaker,text}[]}[]}} live
 * @param {{tags:object}} tagFile
 */
function buildGrid(live, tagFile, store, now = new Date()) {
  const tags = tagFile.tags || {}
  const NODE = {}
  for (const x of store.nodes.nodes.concat(store.nodes.bound_pairs || [])) NODE[x.id] = x
  const FAM = {}
  for (const x of store.moves.moves) FAM[x.id] = x
  const place = pod1Placement(store)
  const sname = (n) => (n === 'none' ? 'no shape' : NODE[n] ? `${n} ${NODE[n].name}` : n)

  // ---- resolve every live line against its stored tag ----
  const resolve = (key, text) => {
    const t = tags[key]
    if (!t) return { reason: 'new' }
    if (norm(t.text) !== norm(text)) return { reason: 'changed' }
    if (!LAYERS.includes(String(t.layer)) || !QRS.includes(t.qrs)) return { reason: 'malformed' }
    return { tag: t }
  }

  const sources = []
  const seedRows = []
  const seedSrc = { id: 'seeds', label: 'Seeds', kind: 'seeds', total: live.seeds.length, tagged: 0, untagged: [] }
  for (const s of live.seeds) {
    const r = resolve(`seeds#${s.id}`, s.text)
    if (r.tag) {
      seedSrc.tagged++
      seedRows.push({ id: s.id, text: s.text, layer: String(r.tag.layer), layer2: r.tag.layer2 || '', qrs: r.tag.qrs })
    } else seedSrc.untagged.push({ id: s.id, text: s.text, reason: r.reason })
  }
  sources.push(seedSrc)

  const podRows = [] // every tagged pod line, all pods
  for (const pod of live.pods) {
    const src = { id: pod.id, label: pod.label, kind: pod.kind, total: pod.rows.length, tagged: 0, untagged: [] }
    const isStore = pod.kind === 'canonical' && pod.id === 'pod-1'
    for (const row of pod.rows) {
      const id = `${pod.prefix || 'g'}${pod.prefix === 'E' ? String(row.order).padStart(3, '0') : row.order}`
      const r = resolve(`${pod.id}#${row.order}`, row.text)
      if (!r.tag) { src.untagged.push({ id, text: row.text, reason: r.reason }); continue }
      src.tagged++
      const t = r.tag
      let shapes = [], pos = [], fmove = []
      if (isStore) {
        const sh = new Set(place.shape.get(row.order) || [])
        for (const x of splitList(t.shape)) if (x !== 'none') sh.add(x)
        if (place.codas.has(row.order)) sh.add('coda')
        pos = sh.size ? [...sh].sort() : ['none']
        shapes = nodesOf(pos)
        const fs_ = new Set(place.fm.get(row.order) || [])
        for (const x of splitList(t.fmove)) if (x !== 'none') fs_.add(x)
        fmove = [...fs_].sort()
      } else if (t.shape != null || t.fmove != null) {
        pos = splitList(t.shape || 'none')
        shapes = nodesOf(pos.length ? pos : ['none'])
        fmove = splitList(t.fmove).filter((x) => x !== 'none')
      }
      podRows.push({
        src: pod.id, id, scene: row.scene, speaker: row.speaker, text: row.text, layer: String(t.layer),
        layer2: t.layer2 || '', qrs: t.qrs, move: t.move || '', shapes, pos, fmove,
      })
    }
    sources.push(src)
  }

  // ---- 1. the grid ----
  const countsBy = (rows, key) => rows.reduce((m, r) => { const k = key(r); m.set(k, (m.get(k) || 0) + 1); return m }, new Map())
  const seedCount = countsBy(seedRows, (r) => r.layer + r.qrs)
  const podCount = countsBy(podRows, (r) => r.src + '|' + r.layer + r.qrs)
  const thinLimit = Math.max(2, Math.round(seedRows.length * 0.01))
  const grid = LAYERS.map((l) => ({
    layer: l,
    cells: QRS.map((q) => {
      const seeds = seedCount.get(l + q) || 0
      const pods = {}
      for (const pod of live.pods) pods[pod.id] = podCount.get(pod.id + '|' + l + q) || 0
      return { qrs: q, seeds, pods, thin: seedRows.length > 0 && seeds <= thinLimit }
    }),
  }))
  const totals = QRS.map((q) => ({
    qrs: q,
    seeds: seedRows.filter((r) => r.qrs === q).length,
    pods: Object.fromEntries(live.pods.map((p) => [p.id, podRows.filter((r) => r.src === p.id && r.qrs === q).length])),
  }))

  // empty/thin cells with verbatim examples
  const gaps = []
  for (const l of LAYERS) for (const q of QRS) {
    const cell = grid[+l].cells[QRS.indexOf(q)]
    if (!cell.thin) continue
    gaps.push({
      layer: l, qrs: q, seeds: cell.seeds, pods: cell.pods,
      seedExamples: seedRows.filter((r) => r.layer === l && r.qrs === q).slice(0, 3).map((r) => ({ id: r.id, text: r.text })),
      podExamples: podRows.filter((r) => r.layer === l && r.qrs === q).slice(0, 3).map((r) => ({ id: r.id, src: r.src, text: r.text })),
    })
  }

  // first seed that opens each cell
  const firstOpen = LAYERS.map((l) => ({
    layer: l,
    cells: QRS.map((q) => {
      const hit = seedRows.filter((r) => r.layer === l && r.qrs === q).sort((a, b) => (a.id < b.id ? -1 : 1))
      return hit.length ? { first: hit[0].id, more: hit.length - 1 } : null
    }),
  }))
  const bands = [[1, 30], [31, 100], [101, 200], [201, 400], [401, 668]].map(([lo, hi]) => {
    const b = seedRows.filter((r) => { const n = parseInt(r.id.slice(1), 10); return n >= lo && n <= hi })
    return { band: `S${String(lo).padStart(4, '0')}–S${String(hi).padStart(4, '0')}`, Q: b.filter((r) => r.qrs === 'Q').length, R: b.filter((r) => r.qrs === 'R').length, S: b.filter((r) => r.qrs === 'S').length }
  })

  // ---- 2. layer × shape (pod lines that carry shape information) ----
  const shaped = podRows.filter((r) => r.shapes.length)
  const ls = new Map(), shapeTot = new Map()
  for (const r of shaped) for (const n of r.shapes) {
    if (n === 'coda') continue
    ls.set(n + '|' + r.layer, (ls.get(n + '|' + r.layer) || 0) + 1)
    shapeTot.set(n, (shapeTot.get(n) || 0) + 1)
  }
  const shapeRows = [...shapeTot.entries()].sort((a, b) => b[1] - a[1]).map(([n, lines]) => {
    const counts = LAYERS.map((l) => ls.get(n + '|' + l) || 0)
    return { id: n, name: sname(n), counts, lines, span: counts.filter(Boolean).length }
  })
  const unusedShapes = Object.keys(NODE).filter((n) => !shapeTot.has(n)).map((n) => ({ id: n, name: sname(n) }))
  const layerNoShape = LAYERS.map((l) => {
    const rs = shaped.filter((r) => r.layer === l)
    const none = rs.filter((r) => r.shapes.length === 1 && r.shapes[0] === 'none')
    return { layer: l, total: rs.length, unshaped: none.length, examples: none.slice(0, 3).map((r) => ({ id: r.id, text: r.text })) }
  })
  const shapeIsLayer = []
  for (const s of shapeRows) {
    if (s.id === 'none' || s.lines < 3) continue
    const best = LAYERS.reduce((a, l) => (s.counts[+l] > s.counts[+a] ? l : a), '0')
    if (s.counts[+best] / s.lines >= 0.8) shapeIsLayer.push({ shape: s.name, layer: best, n: s.counts[+best], of: s.lines })
  }
  const fl = new Map(), ftot = new Map()
  for (const r of shaped) for (const f of r.fmove) {
    fl.set(f + '|' + r.layer, (fl.get(f + '|' + r.layer) || 0) + 1)
    ftot.set(f, (ftot.get(f) || 0) + 1)
  }
  const fmoveRows = [...ftot.entries()].sort((a, b) => b[1] - a[1]).map(([f, lines]) => ({
    id: f, name: FAM[f] ? FAM[f].name : f, counts: LAYERS.map((l) => fl.get(f + '|' + l) || 0), lines,
  }))
  const unusedFmoves = Object.keys(FAM).filter((f) => !ftot.has(f)).map((f) => ({ id: f, name: FAM[f].name }))

  // ---- 3. flows ----
  const inDrill = (r) => r.src === 'pod-1' && r.scene >= POD1_DRILL_SCENES[0] && r.scene <= POD1_DRILL_SCENES[1]
  const groupsOf = (pod) => {
    const rows = podRows.filter((r) => r.src === pod.id && !r.shapes.includes('coda') && !inDrill(r))
    const by = new Map()
    for (const r of rows) { const k = r.scene; if (!by.has(k)) by.set(k, []); by.get(k).push(r) }
    // a pod that is one long scene is windowed by 40 lines so a "flow" stays local
    if (by.size === 1) { const only = [...by.values()][0]; return Array.from({ length: Math.ceil(only.length / 40) }, (_, i) => only.slice(i * 40, i * 40 + 40)) }
    return [...by.values()]
  }
  const trans = new Map()
  for (const pod of live.pods) {
    for (const g of groupsOf(pod)) {
      const seq = []
      for (const r of g.filter((x) => x.shapes.length)) {
        const n = r.shapes[0]
        if (!seq.length || seq[seq.length - 1].n !== n) seq.push({ n, rs: [r] }); else seq[seq.length - 1].rs.push(r)
      }
      for (let i = 0; i + 1 < seq.length; i++) {
        const a = seq[i], b = seq[i + 1]
        if (a.n === 'none' && b.n === 'none') continue
        const k = a.n + '>' + b.n
        if (!trans.has(k)) trans.set(k, { from: a.n, to: b.n, n: 0, srcs: new Set(), hinge: [a.rs[a.rs.length - 1], b.rs[0]] })
        const t = trans.get(k); t.n++; t.srcs.add(pod.id)
      }
    }
  }
  const transitions = [...trans.values()].filter((t) => t.n >= 2).sort((a, b) => b.n - a.n).map((t) => ({
    from: sname(t.from), to: sname(t.to), n: t.n, srcs: [...t.srcs], hinge: t.hinge.map((r) => ({ id: r.id, text: r.text })),
  }))
  const storeWalks = (store.walk.walks || []).map((wk) => {
    const ns = []
    for (const st of wk.steps || []) if (st.node && ns[ns.length - 1] !== st.node) ns.push(st.node)
    const first = (wk.steps || []).find((st) => st.surface)
    return { id: wk.id, name: wk.name || '', nodes: ns, opens: first ? first.surface : '' }
  })
  const tri = new Map()
  for (const pod of live.pods) {
    for (const g0 of groupsOf(pod)) {
      const ms = [], gg = []
      for (const r of g0) {
        const m = r.move ? r.move.split('+').pop() : ''
        if (ms.length && ms[ms.length - 1] === m) continue
        ms.push(m); gg.push(r)
      }
      for (let i = 0; i + 2 < gg.length; i++) {
        const k = ms.slice(i, i + 3)
        if (k.includes('')) continue
        const key = k.join(' → ')
        if (!tri.has(key)) tri.set(key, { n: 0, ex: gg.slice(i, i + 3) })
        tri.get(key).n++
      }
    }
  }
  const moveSeqs = [...tri.entries()].filter(([, v]) => v.n >= 3).sort((a, b) => b[1].n - a[1].n).slice(0, 25)
    .map(([k, v]) => ({ seq: k, n: v.n, lines: v.ex.map((r) => ({ id: r.id, text: r.text })) }))
  const mc = new Map()
  for (const r of podRows) {
    if (r.shapes.includes('coda')) continue
    for (const m of r.move.split('+')) if (m) mc.set(r.src + '|' + m, (mc.get(r.src + '|' + m) || 0) + 1)
  }
  const moveNames = [...new Set(podRows.flatMap((r) => r.move.split('+')).filter(Boolean))]
  const moveTable = moveNames.map((m) => ({ move: m, byPod: Object.fromEntries(live.pods.map((p) => [p.id, mc.get(p.id + '|' + m) || 0])) }))
    .sort((a, b) => Object.values(b.byPod).reduce((x, y) => x + y, 0) - Object.values(a.byPod).reduce((x, y) => x + y, 0))

  // ---- the honest gaps, computed ----
  const untaggedTotal = sources.reduce((n, s) => n + s.untagged.length, 0)
  const emptyLayers = LAYERS.filter((l) => !podRows.some((r) => r.layer === l))
  return {
    generatedAt: now.toISOString(),
    layers: tagFile.layers || {},
    provenance: tagFile.provenance || '',
    sources: sources.map((s) => ({ ...s, untaggedCount: s.untagged.length, untagged: s.untagged.slice(0, 60) })),
    untaggedTotal,
    thinLimit,
    grid, totals, gaps, firstOpen, bands,
    layerShape: { shapes: shapeRows, unusedShapes, layerNoShape, shapeIsLayer, fmoves: fmoveRows, unusedFmoves },
    flows: { transitions, storeWalks, moveSeqs, moveTable },
    namedGaps: { emptyPodLayers: emptyLayers },
  }
}

// ---------------------------------------------------------------- loading the live lines
async function fetchAll(q) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q().range(from, from + 999)
    if (error) throw error
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

async function loadLive(sb) {
  const seeds = (await fetchAll(() => sb.from('canonical_seeds').select('seed_id, seed_number, source_text').order('seed_number', { ascending: true })))
    .map((r) => ({ id: r.seed_id, text: r.source_text }))
  const scen = await fetchAll(() => sb.from('canonical_pod_scenarios')
    .select('pod_slug, scene_number, global_order, speaker, english_text').order('pod_slug').order('global_order'))
  const bySlug = new Map()
  for (const r of scen) {
    if (!bySlug.has(r.pod_slug)) bySlug.set(r.pod_slug, [])
    bySlug.get(r.pod_slug).push({ order: r.global_order, scene: r.scene_number, speaker: r.speaker, text: r.english_text })
  }
  const pods = [...bySlug.entries()].sort(([a], [b]) => (a === 'pod-1' ? -1 : b === 'pod-1' ? 1 : a.localeCompare(b)))
    .map(([slug, rows]) => ({ id: slug, label: POD_LABELS[slug] || slug, kind: 'canonical', prefix: 'g', rows }))
  for (const ls_ of LISTENING_SOURCES) {
    const rows = await fetchAll(() => sb.from('listening_pod_sentences')
      .select('global_order, scene_number, speaker, known_text').eq('pod_id', ls_.id).order('global_order'))
    if (rows.length) pods.push({ id: ls_.id, label: ls_.label, kind: 'listening', prefix: ls_.prefix,
      rows: rows.map((r) => ({ order: r.global_order, scene: r.scene_number, speaker: r.speaker, text: r.known_text })) })
  }
  return { seeds, pods }
}

let cache = null
const CACHE_MS = 30 * 1000
const invalidate = () => { cache = null }

async function loadGrid(sb, { fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value
  const live = await loadLive(sb)
  const value = buildGrid(live, readJson(TAGS_FILE), loadStore())
  cache = { at: Date.now(), value }
  return value
}

module.exports = { buildGrid, loadGrid, loadLive, loadStore, invalidate, norm, TAGS_FILE }
