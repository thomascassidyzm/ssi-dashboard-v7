/**
 * parse-sector-walk — the themed-walk corpora, markdown → rows.
 *
 * A second IMPORT FORMAT parser, beside parse-pod-markdown.cjs. That one reads the
 * `pod-table` shape ('### Chapter N — *Title*' + a dialogue table); this one reads
 * the `sector-flows` shape the four themed walks are authored in:
 *
 *   # Part 1 — ...                                  <- a GROUP heading
 *   ## R0. The contract at the counter *(prologue)*  <- a SCENE
 *   ### Flow 1 *(happy path — the offer)*            <- a FLOW
 *   - **W:** "Morning! Before we start — ..."        <- a TURN
 *
 * THE DEFINING RULE (Tom, 2026-09-01): a `##` section is a SCENE only if it holds at
 * least one `###` flow that holds at least one dialogue turn. Doc subtitles,
 * appendices and accounting sections fail that test, so they are not scenes and
 * their `###` headings are not flows. Nothing is special-cased by title.
 *
 * THE MAPPING (Tom's ruling, same day): A FLOW IS A variant_key. One scene, several
 * flows, each flow a full 1..N run of sentence_number; global_order is 1-based
 * across the whole document. The scenarios table needs no new columns and this
 * parser runs no DDL.
 *
 * Row ids extend the existing `:SC01-S01` shape with the variant it now has to
 * carry: `<slug>:SC<scene>-F<flow>-S<sentence>`, all zero-padded to two digits and
 * all 1-based in document order. Scene and flow indices are POSITIONAL, not read
 * off the heading — 'R0.' and '1.0' and 'Scene 1' are all the first scene of their
 * document — so the id is stable across runs and collision-free across the
 * scene × flow × turn space. Walk steps keep the tool's `<slug>:SC01-W01`.
 *
 * Pure: text in, plain objects out. No network, no DB.
 */

const { resolveShape } = require('./parse-pod-markdown.cjs')

const pad = n => String(n).padStart(2, '0')

// Slugify for a variant_key. 'version' is dropped as a noise word so health's
// '### Welsh version - flow 1' keys as `welsh-flow-01` rather than
// `welsh-version-flow-01`; nothing else is removed.
const NOISE = new Set(['version'])
const slugify = s => String(s).toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
  .filter(w => w && !NOISE.has(w)).join('-')

/** A `- **W:** "line"` turn bullet, with an optional ⚠ safety marker either side
 *  of the text. The speaker is any short all-caps token: HW, P, W, C, R, M, K, J,
 *  T, A, O, TEN, G — the corpora each invent their own. */
const TURN_RE = /^-\s+\*\*([A-Z][A-Z0-9]{0,4}):\*\*\s*(.*)$/

/** Split a heading into its authored label, its title, and its italic tag.
 *  '## R0. The contract *(prologue — …)*'  → R0. / The contract / prologue — …
 *  '## Scene 1 — The call-out'             → Scene 1 / The call-out / null
 *  '## 1.0 Linguistic situation opener'    → 1.0 / Linguistic situation opener / null
 *  A trailing *(…)* italic tag is the subtitle; a bare '(…)' stays in the title,
 *  because in these corpora it is part of what the scene is called. */
function splitHeading (text) {
  let rest = String(text).trim()
  let tag = null
  const t = rest.match(/\*\(([\s\S]+)\)\*\s*$/)
  if (t) { tag = t[1].trim(); rest = rest.slice(0, t.index).trim() }
  const m = rest.match(/^((?:Scene|Chapter|Context|Situation)\s+\d+|[A-Za-z]{0,3}\d+(?:\.\d+)*\.?)\s*(?:[—–-]\s*)?([\s\S]*)$/)
  if (m && m[2].trim()) return { label: m[1].replace(/\s+/g, ' ').trim(), title: m[2].trim(), subtitle: tag }
  return { label: null, title: rest.replace(/\*\*/g, '').trim(), subtitle: tag }
}

/** A flow heading → a stable variant_key. 'Flow 1' → flow-01;
 *  'Welsh version - flow 2' → welsh-flow-02. The number is read off the heading,
 *  not off position, so a corpus that renumbers its flows keeps its keys. */
function flowKey (label) {
  const m = String(label).match(/^([\s\S]*?)\bflows?\b\s*[-–—.]?\s*(\d+)/i)
  if (m) {
    const prefix = slugify(m[1].replace(/[-–—]+\s*$/, ''))
    return `${prefix ? prefix + '-' : ''}flow-${pad(Number(m[2]))}`
  }
  const s = slugify(label)
  return s || 'flow'
}

/** Explicit store ids declared for a scene. ONLY the store's own registers are
 *  read — N/P nodes, O outcomes, F moves — so the mapping's encounter ids (E1),
 *  survivability ids (S701), pressure ids (K4) and the core walk files (W1201) are
 *  left alone rather than manufactured into declarations. No aliases are invented:
 *  each id goes through resolveShape and unresolved stays unresolved. */
function declaredIds (text) {
  const out = []
  const seen = new Set()
  for (const m of String(text || '').matchAll(/\b([NPOF]\d{1,4})\b/g)) {
    if (seen.has(m[1])) continue
    seen.add(m[1])
    out.push(m[1])
  }
  return out
}

/**
 * @param markdown  the document text
 * @param opts      { slug, store }
 * @returns { scenarios, steps, stats }
 */
function parseSectorWalk (markdown, opts) {
  const { slug, store } = opts
  const lines = String(markdown).split('\n')

  // ---- pass 1: the document as a tree, believing nothing about which ## is a scene
  const sections = []
  let group = null
  let seenFirstH1 = false
  let sec = null
  let flow = null

  for (const raw of lines) {
    const h1 = raw.match(/^#\s+(.+?)\s*$/)
    if (h1) {
      // The first H1 is the document's own title, not a group of scenes.
      group = seenFirstH1 ? h1[1].trim() : null
      seenFirstH1 = true
      sec = null; flow = null
      continue
    }
    const h2 = raw.match(/^##\s+(.+?)\s*$/)
    if (h2) {
      sec = { heading: h2[1].trim(), group, flows: [], preamble: [] }
      sections.push(sec)
      flow = null
      continue
    }
    const h3 = raw.match(/^###\s+(.+?)\s*$/)
    if (h3) {
      if (!sec) continue
      flow = { heading: h3[1].trim(), turns: [] }
      sec.flows.push(flow)
      continue
    }
    if (!sec) continue
    if (!flow) { sec.preamble.push(raw); continue }

    const t = raw.match(TURN_RE)
    if (!t) continue                                   // prose, notes, *Walks:*, blanks
    let text = t[2].trim()
    // The ⚠ safety marker. Health puts it OUTSIDE the quotes, where it is
    // unambiguously a marker and is stripped; retail puts it inside them, where it
    // is authored text and is left exactly where the author put it. Either way the
    // line is FLAGGED, because a boolean is what the flag is for — the text is
    // never edited to make the flag work.
    let warn = /⚠/.test(text)
    text = text.replace(/^⚠\s*/, '').replace(/\s*⚠$/, '')
    // Strip only the wrapping double quotes, straight or curly. Nothing else — a
    // line that opens on a stage direction keeps its inner quotes as authored.
    text = text.replace(/^["“]([\s\S]*)["”]$/, '$1').trim()
    if (!text) continue
    flow.turns.push({ speaker: t[1], text, warn })
  }

  // ---- the defining rule
  for (const s of sections) s.flows = s.flows.filter(f => f.turns.length > 0)
  const scenes = sections.filter(s => s.flows.length > 0)

  // ---- pass 2: rows
  const scenarios = []
  const steps = []
  let globalOrder = 0
  let scenesWithoutDeclaration = 0
  const keyCollisions = []

  scenes.forEach((s, si) => {
    const sceneNumber = si + 1
    const head = splitHeading(s.heading)
    const usedKeys = new Map()

    s.flows.forEach((f, fi) => {
      const fh = splitHeading(f.heading)
      let key = flowKey(f.heading.replace(/\*\([\s\S]+\)\*\s*$/, '').trim() || f.heading)
      if (usedKeys.has(key)) {
        const n = usedKeys.get(key) + 1
        usedKeys.set(key, n)
        keyCollisions.push({ scene: sceneNumber, key, resolvedAs: `${key}-${n}` })
        key = `${key}-${n}`
      } else usedKeys.set(key, 1)

      const notes = []
      if (s.group) notes.push(s.group)
      if (fh.subtitle) notes.push(`flow: ${fh.subtitle}`)

      f.turns.forEach((t, ti) => {
        globalOrder += 1
        const n = []
        if (notes.length) n.push(...notes)
        if (t.warn) n.push('⚠ safety-critical line')
        scenarios.push({
          id: `${slug}:SC${pad(sceneNumber)}-F${pad(fi + 1)}-S${pad(ti + 1)}`,
          pod_slug: slug,
          scene_number: sceneNumber,
          scene_label: head.label,
          scene_title: head.title,
          scene_subtitle: head.subtitle,
          sentence_number: ti + 1,
          global_order: globalOrder,
          speaker: t.speaker,
          english_text: t.text,
          target_text: null,
          target_lang: null,
          variant_key: key,
          author_notes: n.length ? n.join(' · ') : null
        })
      })
    })

    // ---- the walk, where the scene actually declares one.
    // Two doors, both authored: the scene heading's own italic tag (retail names
    // its admitted position there) and the `*Walks:*` / `*Admits:*` lines under the
    // heading (trades). `*Branch set:*` names branches, not shapes, so it is not read.
    let declText = ''
    let taking = false
    for (const l of s.preamble) {
      if (/^\*(Walks|Admits):\*/i.test(l.trim())) { taking = true; declText += ' ' + l; continue }
      if (/^\*[A-Za-z][^*]*:\*/.test(l.trim())) { taking = false; continue }   // *Branch set:* and friends
      if (l.trim() === '') { taking = false; continue }
      if (taking) declText += ' ' + l
    }
    if (head.subtitle) declText += ' ' + head.subtitle

    const ids = declaredIds(declText)
    if (ids.length === 0) { scenesWithoutDeclaration += 1; return }

    const walkId = slugify(head.label || head.title) || `scene-${sceneNumber}`
    ids.forEach((id, i) => {
      const r = resolveShape({ declaredAs: id }, store)
      steps.push({
        id: `${slug}:SC${pad(sceneNumber)}-W${pad(i + 1)}`,
        pod_slug: slug,
        walk_id: walkId,
        walk_name: head.title,
        scene_number: sceneNumber,
        step_order: i + 1,
        kind: r.nodeId ? 'move' : 'unmapped',
        node_id: r.nodeId,
        declared_as: id,
        register: r.register,
        resolution: r.resolution,
        scenario_id: scenarios.find(x => x.scene_number === sceneNumber)?.id || null,
        note: r.note
      })
    })
  })

  return {
    scenarios,
    steps,
    stats: {
      scenes: scenes.length,
      flows: scenes.reduce((a, s) => a + s.flows.length, 0),
      turns: scenarios.length,
      sectionsSeen: sections.length,
      sectionsRejected: sections.length - scenes.length,
      headingsRejected: sections.filter(s => s.flows.length === 0).length,
      scenesWithoutDeclaration,
      keyCollisions
    }
  }
}

module.exports = { parseSectorWalk, splitHeading, flowKey, declaredIds, slugify }
