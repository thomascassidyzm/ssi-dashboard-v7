// services/display-tiler.cjs
//
// Build-time DISPLAY TILING for course_practice_phrases.
//
// See new_vision/PHRASE_DECOMPOSITION_SPEC.md (decomposition) for the sibling
// concept. This module is DISPLAY-ONLY and additive: it never touches audio,
// the audio<->text matching (whole-phrase, by id), `target_text_roman`, or the
// pedagogical `decomposition`.
//
// What it does:
//   Given a phrase's native text AND its already-correct romanisation, split
//   BOTH into aligned tiles — one { n: native, r: roman } pair per display
//   word. The LLM's only job is drawing matching boundaries between two strings
//   it's handed (it does NOT re-romanise), so the romaji stays exactly as
//   accurate as `target_text_roman` already is. Validated on both sides:
//     concat(tiles.n)            === target_text         (whitespace-normalised)
//     concat(tiles.r, no spaces) === target_text_roman   (whitespace-normalised)
//   Tiles inside the phrase's salient LEGO are flagged `salient` for emphasis.
//
// Primary use: scripts without whitespace word boundaries (Japanese, Thai,
// Chinese) where the runtime can't align romanisation to native characters.
//
// Exports:
//   tilePhrasesBatch(rows)        — LLM batch → Map(idx -> tiles[]|null)
//   markSalient(tiles, salient)   — flag tiles inside a salient native span
//   validateTiles(tiles, t, r)    — both-side reassembly check

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const { HAIKU_MODEL } = require('./shared/claude-cli.cjs')

const stripWs = (s) => (s || '').replace(/\s+/g, '')

// =============================================================================
// Prompt
// =============================================================================

function buildPrompt(rows) {
  return `You are segmenting sentences into DISPLAY TILES for a language-learning app.

You are given each sentence in its native script AND its already-correct romanisation. Do NOT re-romanise. Your ONLY job is to split BOTH strings into aligned tiles.

Each tile is a pair {"n": <native piece>, "r": <roman piece>} where:
- the native pieces, concatenated in order, EQUAL the native sentence exactly (every character, including punctuation);
- the roman pieces, concatenated in order (one space between them), EQUAL the given romanisation;
- each native piece corresponds to its roman piece.

Segment at natural word boundaries:
- content words stay whole (e.g. a multi-character noun is ONE tile, never split per character);
- grammatical particles get their own tile;
- punctuation attaches to the PREVIOUS tile (its roman piece is "" if the romanisation has no token there);
- never invent, drop, reorder, or alter characters on either side.

## Sentences
${rows.map((r, i) => `${i + 1}. NATIVE: ${r.target_text}\n   ROMAN: ${r.target_text_roman}`).join('\n')}

## Output
Output ONLY a raw JSON array — no markdown, no commentary:
[{"idx":1,"tiles":[{"n":"…","r":"…"}, ...]}, ...]
- idx matches the number above; every sentence MUST appear.`
}

// =============================================================================
// LLM batch (Claude CLI — never the SDK; see CLAUDE.md)
// =============================================================================

function runHaikuBatch(prompt) {
  return new Promise((resolve) => {
    const tmp = path.resolve(__dirname, '..', 'temp', 'display-tiling')
    fs.mkdirSync(tmp, { recursive: true })
    const id = `tiling-${Date.now()}-${Math.round(process.hrtime()[1] / 1e3)}`
    const briefFile = path.join(tmp, `${id}.txt`)
    const outFile = path.join(tmp, `${id}.json`)
    fs.writeFileSync(briefFile, prompt, 'utf8')
    const cmd = `unset CLAUDECODE && cat '${briefFile}' | claude --print --model ${HAIKU_MODEL} > '${outFile}' 2>&1`
    const env = { ...process.env }; delete env.CLAUDECODE
    const proc = spawn('bash', ['-c', cmd], { cwd: path.resolve(__dirname, '..'), stdio: 'pipe', env })
    proc.on('close', (code) => {
      let raw = ''
      try { raw = fs.readFileSync(outFile, 'utf8') } catch {}
      try { fs.unlinkSync(briefFile); fs.unlinkSync(outFile) } catch {}
      if (code !== 0 || /^API Error/i.test(raw.trim())) {
        console.error(`[display-tiler] claude --print --model ${HAIKU_MODEL} failed (exit ${code}): ${raw.slice(0, 300)}`)
      }
      resolve(raw)
    })
    proc.on('error', (e) => {
      console.error(`[display-tiler] failed to spawn claude --model ${HAIKU_MODEL}: ${e.message}`)
      resolve('')
    })
  })
}

function parseBatchOutput(raw) {
  if (!raw) return null
  let s = raw.trim()
  // tolerate accidental markdown fences
  s = s.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '')
  // grab the outermost array if the model added stray prose
  const start = s.indexOf('[')
  const end = s.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) return null
  try { return JSON.parse(s.slice(start, end + 1)) } catch { return null }
}

// =============================================================================
// Validation + salient marking
// =============================================================================

// Both-side reassembly check. Returns null if valid, else an error string.
function validateTiles(tiles, targetText, targetTextRoman) {
  if (!Array.isArray(tiles) || tiles.length === 0) return 'no tiles'
  if (tiles.some((t) => typeof t.n !== 'string')) return 'tile missing native'
  const n = stripWs(tiles.map((t) => t.n).join(''))
  if (n !== stripWs(targetText)) return `native mismatch: "${n}" != "${stripWs(targetText)}"`
  const r = stripWs(tiles.map((t) => t.r || '').join(''))
  if (r !== stripWs(targetTextRoman)) return `roman mismatch: "${r}" != "${stripWs(targetTextRoman)}"`
  return null
}

// Flag tiles whose native characters fall inside the salient LEGO's native
// text. Located by character offset within the concatenated native (the salient
// text is itself unsegmented). No-op when no salient text is given.
function markSalient(tiles, salientNativeText) {
  const salient = stripWs(salientNativeText || '')
  if (!salient) return tiles.map((t) => ({ ...t, salient: false }))
  const concat = tiles.map((t) => stripWs(t.n)).join('')
  const idx = concat.indexOf(salient)
  if (idx === -1) return tiles.map((t) => ({ ...t, salient: false }))
  const lo = idx, hi = idx + salient.length
  let pos = 0
  return tiles.map((t) => {
    const len = stripWs(t.n).length
    const a = pos, b = pos + len
    pos = b
    return { ...t, salient: a < hi && b > lo }
  })
}

// =============================================================================
// Batch entry point
// =============================================================================

// rows: [{ idx, target_text, target_text_roman }]
// Returns Map(idx -> { tiles, error }). tiles is validated (both sides) or null.
async function tilePhrasesBatch(rows) {
  const out = new Map()
  if (rows.length === 0) return out
  const raw = await runHaikuBatch(buildPrompt(rows))
  const parsed = parseBatchOutput(raw)
  if (!Array.isArray(parsed)) {
    for (const r of rows) out.set(r.idx, { tiles: null, error: 'LLM output unparseable' })
    return out
  }
  for (const r of rows) {
    const entry = parsed.find((p) => p.idx === r.idx)
    if (!entry || !Array.isArray(entry.tiles)) { out.set(r.idx, { tiles: null, error: 'missing in output' }); continue }
    const err = validateTiles(entry.tiles, r.target_text, r.target_text_roman)
    out.set(r.idx, err ? { tiles: null, error: err } : { tiles: entry.tiles.map((t) => ({ n: t.n, r: t.r || '' })) })
  }
  return out
}

module.exports = { tilePhrasesBatch, markSalient, validateTiles, buildPrompt }
