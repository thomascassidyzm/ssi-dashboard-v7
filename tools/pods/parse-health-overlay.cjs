/**
 * parse-health-overlay — the Welsh health pair overlay, as canonical pod rows.
 *
 * A SEPARATE parser from parse-pod-markdown.cjs on purpose. That one reads
 * three-column speaker/english/target dialogue tables and three live pods
 * depend on it; this document is a different shape entirely — seed blocks, each
 * with a canonical English sentence, a drafted Welsh line, and a chunk-mapping
 * table under it. Bending the dialogue parser to cover both would put the
 * Method Pod one regex away from breaking.
 *
 * The shape it reads (docs/sector-pods/health-welsh-pair-overlay-2026-09-01.md):
 *
 *   ### Block A — the contract, on the ward
 *
 *   **HG01** — "If I say anything that isn't clear, please stop me."
 *   > **Draft:** "Os dw i'n deud rhywbeth sydd ddim yn glir, stopiwch fi."
 *
 *   | chunk | Welsh | class | note |
 *   |---|---|---|---|
 *   | if I say | os dw i'n deud | D | Welsh present in the if-clause |
 *
 * Both the English and the Draft may wrap across lines; the Draft's continuation
 * lines are blockquoted. Blocks A–H become scenes 1–8, seeds become rows in
 * document order, and the chunk table is carried on the row's author_notes —
 * NOT thrown away, and not invented into a row shape of its own.
 *
 * NOTHING IN HERE AUTHORS OR NORMALISES WELSH. Every target string is the
 * document's own bytes with the blockquote markers and the wrapping removed.
 * Every Welsh line in that document is DRAFT-FOR-ARAN.
 */

const BLOCK_RE = /^###\s+Block\s+([A-Z])\s+—\s+(.+?)\s*$/
const SEED_RE  = /^\*\*(HG\d{2})\*\*\s+—\s+(.*)$/
const DRAFT_RE = /^>\s*\*\*Draft:\*\*\s*(.*)$/
const CONT_RE  = /^>\s*(.*)$/
const TABLE_RE = /^\|(.*)\|\s*$/

/** The document quotes its sentences. Strip ONE matched pair, nothing else. */
function unquote (s) {
  const t = s.trim()
  const m = t.match(/^"([\s\S]*)"$/)
  return (m ? m[1] : t).trim()
}

/** Join wrapped lines the way a reader does: one space, no re-punctuation. */
function join (parts) {
  return parts.map(p => p.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

function cells (line) {
  const m = line.match(TABLE_RE)
  if (!m) return null
  return m[1].split('|').map(c => c.trim())
}

const isSeparator = row => row.every(c => /^:?-{2,}:?$/.test(c))

/**
 * @param {string} md      the overlay markdown
 * @param {object} opts    { slug, targetLang }
 * @returns {{ scenarios: object[], steps: object[], seeds: object[] }}
 */
function parseHealthOverlay (md, opts = {}) {
  const slug = opts.slug || 'health-general-welsh'
  const targetLang = opts.targetLang || 'cym_n'
  const lines = String(md).split('\n')

  const seeds = []
  let block = null, blockNo = 0
  let cur = null
  // Which multi-line thing are we still reading: the English, or the Draft?
  let mode = null

  const closeSeed = () => { if (cur) { seeds.push(cur); cur = null; mode = null } }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.replace(/\s+$/, '')

    const b = line.match(BLOCK_RE)
    if (b) { closeSeed(); blockNo++; block = { letter: b[1], title: b[2], number: blockNo }; continue }

    // A new top-level section ends the run of seeds.
    if (/^##\s/.test(line)) { closeSeed(); block = null; continue }
    if (!block) continue

    const s = line.match(SEED_RE)
    if (s) {
      closeSeed()
      cur = {
        ref: s[1], block,
        englishParts: [s[2]],
        draftParts: [],
        chunks: []
      }
      // "…" closed on this very line? then the English is complete.
      mode = /"[\s\S]*"\s*$/.test(s[2].trim()) ? null : 'english'
      continue
    }
    if (!cur) continue

    const d = line.match(DRAFT_RE)
    if (d) {
      cur.draftParts.push(d[1])
      mode = /"\s*$/.test(d[1].trim()) ? null : 'draft'
      continue
    }

    if (mode === 'draft') {
      const c = line.match(CONT_RE)
      if (c) {
        cur.draftParts.push(c[1])
        if (/"\s*$/.test(c[1].trim())) mode = null
        continue
      }
      mode = null
    }

    if (mode === 'english' && line.trim() && !TABLE_RE.test(line)) {
      cur.englishParts.push(line)
      if (/"\s*$/.test(line.trim())) mode = null
      continue
    }

    const row = cells(line)
    if (row) {
      if (isSeparator(row)) continue
      // The header row names the columns; skip it, keep everything else.
      if (/^chunk$/i.test(row[0]) && /^welsh$/i.test(row[1] || '')) continue
      cur.chunks.push({ chunk: row[0], welsh: row[1] ?? '', klass: row[2] ?? '', note: row[3] ?? '' })
    }
  }
  closeSeed()

  const scenarios = seeds.map((seed, idx) => {
    const english = unquote(join(seed.englishParts))
    const welsh = unquote(join(seed.draftParts))
    return {
      id: `${slug}:${seed.ref}`,
      pod_slug: slug,
      scene_number: seed.block.number,
      scene_label: `Block ${seed.block.letter}`,
      scene_title: seed.block.title,
      scene_subtitle: null,
      sentence_number: idx + 1,
      global_order: idx + 1,
      speaker: seed.ref,
      english_text: english,
      target_text: welsh || null,
      target_lang: welsh ? targetLang : null,
      author_notes: chunkNote(seed.chunks),
      variant_key: null
    }
  })

  // steps is always empty and that is the honest answer: a pair overlay makes no
  // claim about the metagraph, so no walk step is invented on its behalf.
  return { scenarios, steps: [], seeds }
}

/**
 * The chunk mapping, carried on the row rather than dropped. It is the author's
 * working note about THIS line — which is what author_notes is — so it rides
 * along, versioned and editable, until the Script Lab grows a place to render
 * it properly.
 */
function chunkNote (chunks) {
  if (!chunks || !chunks.length) return null
  return ['Chunk mapping (D deterministic · S split · I inversion · E erasure):']
    .concat(chunks.map(c => `${c.chunk} → ${c.welsh}${c.klass ? ` [${c.klass}]` : ''}${c.note ? ` — ${c.note}` : ''}`))
    .join('\n')
}

module.exports = { parseHealthOverlay, chunkNote, unquote, join }
