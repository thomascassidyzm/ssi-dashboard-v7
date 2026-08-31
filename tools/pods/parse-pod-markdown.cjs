/**
 * parse-pod-markdown — the three 2026-08-30 pods, markdown → rows.
 *
 * This is an IMPORT FORMAT parser and nothing else. Once the rows are in
 * `canonical_pod_scenarios` and `canonical_pod_walk_steps`, the DATABASE IS CANON
 * and this file has no further authority: Tom edits in the Script Lab, and a
 * re-import is an explicit, destructive, named action (`--reimport-destructive`
 * on the ingest tool), never an implicit sync. Nothing calls this at runtime.
 *
 * Two document shapes:
 *   chapters — `### Chapter N — *Title* — subtitle`, a `**Shapes traversed:**`
 *              line, then one dialogue table.
 *   scenes   — `### Scene N — *Title* — …`, a `**Shape witnessed:**` line, then
 *              one dialogue table; per-scene shape ids also come from the §1f
 *              scene ledger's "Clears" column, which is the authoritative
 *              declaration for the new scenes 17–43.
 *
 * The walk it produces is NODE REFERENCES (Watson's ruling, 2026-08-30, and
 * `src/lib/metagraph/walk.js`): a step names a shape and the chapter it is
 * traversed in. The dialogue text hangs off the scenario rows; it is never
 * bolted onto the step.
 *
 * Pure: takes markdown text, returns plain objects. No network, no DB.
 */

const { matchAlias, matchCrosswalk, isSummitShape } = require('./pod-shape-aliases.cjs')

const pad = n => String(n).padStart(2, '0')

/** Split a `| a | b | c |` line into its cells. */
function cells (line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
}

const SPEAKERS = /^(TOM|ARAN)$/

// ---------------------------------------------------------------------------
// Shape declarations
// ---------------------------------------------------------------------------

/**
 * Pull the declared shapes out of a `Shapes traversed:` / `Shape witnessed:` /
 * `Clears` line. Segments are separated by ` · ` or `,` in the ledger column.
 * Each segment yields either store ids (N/O/P/F, and the control arm's own m)
 * or, when it names no id at all, one named-shape declaration.
 */
function declaredShapes (line, mode) {
  const out = []
  let text = String(line || '')
    .replace(/^\*\*Shapes? (traversed|witnessed):\*\*/i, '')
    .trim()
  // A `Shape witnessed:` line is ONE shape, named in caps, followed by its
  // definition in prose. Splitting the prose would manufacture declarations out
  // of a description, so only the name before the first em dash is read.
  if (mode === 'witnessed') text = text.split(' — ')[0].trim()
  // A scene heading's decorations — ZERO-ADMISSION, MINT, MINT on 1:396–400 —
  // are production flags, not shapes.
  if (mode === 'heading') {
    text = text
      .replace(/\*\*/g, '')
      .split(' — ')
      .map(t => t.trim())
      .filter(t => t && !/^(zero-admission|mint\b.*|.*\bmint\b.*\(.*\)|half-attested)$/i.test(t))
      .filter(t => !/^mint\b/i.test(t))
      .join(' — ')
  }
  if (!text) return out

  for (let seg of text.split(/\s·\s|;\s/)) {
    seg = seg.trim().replace(/\.$/, '')
    if (!seg) continue
    // A "planted for Chapter N" segment is a long-arc plant, not a shape.
    if (/^\*{0,2}planted for/i.test(seg)) continue
    const ids = []
    for (const m of seg.matchAll(/\b(N\d{1,2}|O\d|P\d|F\d{1,2})\b/g)) ids.push(m[1])
    for (const m of seg.matchAll(/(?:^|[^A-Za-z])m(\d{1,2})\b/g)) ids.push(`m${m[1]}`)
    // "move 7" / "move 23" is the ledger's spelling of the same m register.
    for (const m of seg.matchAll(/\bmoves?\s+(\d{1,2})\b/g)) ids.push(`m${m[1]}`)
    if (ids.length) {
      for (const id of [...new Set(ids)]) out.push({ declaredAs: id, phrase: seg })
      continue
    }
    // No id: a shape named by phrase. Prefer the bolded phrase when there is one.
    const bold = seg.match(/\*\*(.+?)\*\*/)
    const phrase = (bold ? bold[1] : seg).replace(/\([^)]*\)/g, '').replace(/[*_]/g, '').trim()
    if (!phrase || phrase.length > 90) continue
    out.push({ declaredAs: phrase, phrase: seg })
  }
  return out
}

/** The register a store id belongs to, from its prefix. */
function registerOf (id) {
  if (/^O\d+$/.test(id)) return 'outcome'
  if (/^F\d+$/.test(id)) return 'move-F'
  return 'node'
}

/** Whether the store actually holds this id, in its own register. */
function storeHas (store, id) {
  return store.nodeIds.has(id) || store.moveIds.has(id) || store.outcomeIds.has(id)
}

/** Resolve one declared shape against the store. Never guesses: every mapping is
 * an id the store holds, reached by id, by declared alias, or by the declared
 * m→store crosswalk (M_CROSSWALK, ruled landings only). */
function resolveShape (decl, store) {
  const raw = decl.declaredAs
  if (/^m\d{1,2}$/.test(raw)) {
    const cw = matchCrosswalk(raw)
    if (cw && cw.id && storeHas(store, cw.id)) {
      return { nodeId: cw.id, register: 'corpus-move-m', resolution: 'crosswalk', note: `m→store crosswalk (declared, tools/pods/pod-shape-aliases.cjs): ${cw.why}` }
    }
    return {
      nodeId: null, register: 'corpus-move-m', resolution: 'unresolved',
      note: cw && cw.why
        ? `unresolved by ruling: ${cw.why}`
        : "the control arm's own 23-move numbering (method-pod-full-2026-08-30.md §1c); no crosswalk entry"
    }
  }
  if (/^[NP]\d{1,3}$/.test(raw)) {
    return store.nodeIds.has(raw)
      ? { nodeId: raw, register: 'node', resolution: 'id', note: null }
      : { nodeId: null, register: 'node', resolution: 'unresolved', note: `no node ${raw} in the store` }
  }
  if (/^O\d$/.test(raw)) {
    return store.outcomeIds.has(raw)
      ? { nodeId: raw, register: 'outcome', resolution: 'id', note: null }
      : { nodeId: null, register: 'outcome', resolution: 'unresolved', note: `no outcome ${raw} in the store` }
  }
  if (/^F\d{1,3}$/.test(raw)) {
    return store.moveIds.has(raw)
      ? { nodeId: raw, register: 'move-F', resolution: 'id', note: null }
      : { nodeId: null, register: 'move-F', resolution: 'unresolved', note: `no move ${raw} in the store` }
  }
  const alias = matchAlias(raw)
  if (alias && storeHas(store, alias.nodeId)) {
    return { nodeId: alias.nodeId, register: registerOf(alias.nodeId), resolution: 'alias', note: alias.why }
  }
  if (isSummitShape(raw)) {
    return {
      nodeId: null, register: 'summit-shape', resolution: 'unresolved',
      note: 'one of the eight summit shapes the re-read named; its ratified id is not in this store build'
    }
  }
  return { nodeId: null, register: 'named-shape', resolution: 'unresolved', note: 'named by phrase; no declared alias matches' }
}

// ---------------------------------------------------------------------------
// The document parser
// ---------------------------------------------------------------------------

/**
 * @param markdown  the document text
 * @param opts      { slug, unit: 'Chapter'|'Scene', targetLang, store }
 */
function parsePod (markdown, opts) {
  const { slug, unit, targetLang, store } = opts
  const lines = String(markdown).split('\n')
  const headingRe = new RegExp(`^###\\s+${unit}\\s+(\\d+)\\s+—\\s+(.*)$`)

  // §1f "Clears" ledger (43-scene arm only): scene number → declaration text.
  const ledger = parseSceneLedger(lines)

  const scenarios = []
  const steps = []
  let current = null
  let globalOrder = 0
  let inDialogue = false
  let dialogueDone = false
  let cols = 2

  const closeSection = () => { current = null; inDialogue = false; dialogueDone = false }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const h = raw.match(headingRe)
    if (h) {
      const rest = h[2]
      const titleMatch = rest.match(/\*(.+?)\*/)
      const subtitle = rest.replace(/\*(.+?)\*/, '').replace(/^\s*—\s*/, '').replace(/\s*—\s*$/, '').replace(/\*\*/g, '').trim()
      current = {
        number: Number(h[1]),
        label: `${unit} ${h[1]}`,
        title: titleMatch ? titleMatch[1] : rest.replace(/\*\*/g, '').trim(),
        subtitle: subtitle || null,
        sentence: 0,
        declared: [],
        firstRowId: null
      }
      // The heading's own subtitle names the shape in the 43-scene arm
      // ("the parked clash", "the precision haggle") — the same door
      // the retired markdown parser went through, and it is declared, not inferred.
      if (unit === 'Scene' && subtitle) current.declared.push(...declaredShapes(subtitle, 'heading'))
      if (ledger[current.number]) current.declared.push(...declaredShapes(ledger[current.number]))
      inDialogue = false
      dialogueDone = false
      continue
    }
    if (/^##\s/.test(raw)) { closeSection(); continue }
    if (!current) continue

    if (/^\*\*Shapes? (traversed|witnessed):\*\*/i.test(raw.trim())) {
      // The witnessed line can run onto following lines until a blank line.
      let block = raw.trim()
      for (let j = i + 1; j < lines.length && lines[j].trim() !== ''; j++) block += ' ' + lines[j].trim()
      current.declared.push(...declaredShapes(block, /witnessed/i.test(raw) ? 'witnessed' : null))
      continue
    }

    if (dialogueDone) continue
    // The dialogue table's own header: `| | |` or `| | English | Italiano |`.
    if (/^\s*\|/.test(raw) && !inDialogue) {
      const c = cells(raw)
      const isHeader = c[0] === '' && (c.length === 2 || (c.length === 3 && /english/i.test(c[1])))
      if (isHeader) { inDialogue = true; cols = c.length; continue }
      continue
    }
    if (!inDialogue) continue
    if (/^\s*\|[\s|:\-]+\|\s*$/.test(raw)) continue          // separator
    if (!/^\s*\|/.test(raw)) { inDialogue = false; dialogueDone = true; continue }

    const c = cells(raw)
    const speaker = c[0].replace(/\*\*/g, '').trim()
    if (!SPEAKERS.test(speaker)) continue
    const english = (c[1] || '').trim()
    if (!english) continue
    const target = cols === 3 ? (c[2] || '').trim() : ''
    current.sentence += 1
    globalOrder += 1
    const id = `${slug}:SC${pad(current.number)}-S${pad(current.sentence)}`
    if (!current.firstRowId) current.firstRowId = id
    scenarios.push({
      id,
      pod_slug: slug,
      scene_number: current.number,
      scene_label: current.label,
      scene_title: current.title,
      scene_subtitle: current.subtitle,
      sentence_number: current.sentence,
      global_order: globalOrder,
      speaker,
      english_text: english,
      target_text: target || null,
      target_lang: target ? targetLang : null,
      author_notes: null
    })
  }

  // ---- the walk: one step per DECLARED shape, per chapter, in declaration order.
  const bySection = new Map()
  for (const s of scenarios) {
    if (!bySection.has(s.scene_number)) bySection.set(s.scene_number, s)
  }
  // Re-walk the headings to emit steps in document order with their sections.
  const sections = collectSections(lines, headingRe, unit, ledger)
  for (const sec of sections) {
    const seen = new Set()
    let order = 0
    for (const decl of sec.declared) {
      const key = decl.declaredAs.toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim()
      if (seen.has(key)) continue
      seen.add(key)
      const r = resolveShape(decl, store)
      order += 1
      steps.push({
        id: `${slug}:${sec.label.replace(/\s+/g, '')}-W${pad(order)}`,
        pod_slug: slug,
        walk_id: sec.label.replace(/\s+/g, ''),
        walk_name: sec.title,
        scene_number: sec.number,
        step_order: order,
        kind: r.nodeId ? 'move' : 'unmapped',
        node_id: r.nodeId,
        declared_as: decl.declaredAs,
        register: r.register,
        resolution: r.resolution,
        scenario_id: bySection.get(sec.number)?.id || null,
        note: r.note
      })
    }
  }

  return { scenarios, steps }
}

/** Collect section headings + their declarations, without the dialogue. */
function collectSections (lines, headingRe, unit, ledger) {
  const out = []
  let cur = null
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(headingRe)
    if (h) {
      const rest = h[2]
      const titleMatch = rest.match(/\*(.+?)\*/)
      const subtitle = rest.replace(/\*(.+?)\*/, '').replace(/^\s*—\s*/, '').replace(/\s*—\s*$/, '').replace(/\*\*/g, '').trim()
      cur = { number: Number(h[1]), label: `${unit} ${h[1]}`, title: titleMatch ? titleMatch[1] : rest, declared: [] }
      if (unit === 'Scene' && subtitle) cur.declared.push(...declaredShapes(subtitle, 'heading'))
      if (ledger[cur.number]) cur.declared.push(...declaredShapes(ledger[cur.number]))
      out.push(cur)
      continue
    }
    if (/^##\s/.test(lines[i])) { cur = null; continue }
    if (!cur) continue
    if (/^\*\*Shapes? (traversed|witnessed):\*\*/i.test(lines[i].trim())) {
      let block = lines[i].trim()
      for (let j = i + 1; j < lines.length && lines[j].trim() !== ''; j++) block += ' ' + lines[j].trim()
      cur.declared.push(...declaredShapes(block, /witnessed/i.test(lines[i]) ? 'witnessed' : null))
    }
  }
  return out
}

/**
 * §1f "The scene ledger" — `| # | Title | Clears | …`. The Clears column is the
 * per-scene shape declaration for the new scenes, in the store's own registers.
 */
function parseSceneLedger (lines) {
  const out = {}
  let inLedger = false
  for (const raw of lines) {
    if (/^###\s+1f\./.test(raw)) { inLedger = true; continue }
    if (inLedger && /^#{2,3}\s/.test(raw)) break
    if (!inLedger || !/^\s*\|/.test(raw)) continue
    const c = cells(raw)
    if (c.length < 3) continue
    const n = Number(c[0])
    if (!Number.isInteger(n)) continue
    if (c[2] && c[2] !== '—') out[n] = c[2]
  }
  return out
}

module.exports = { parsePod, declaredShapes, resolveShape, parseSceneLedger, cells }
