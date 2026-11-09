#!/usr/bin/env node
'use strict'
// tools/course-copy/copy-course-text.cjs
//
// COPY A COURSE'S TEXT INTO AN EMPTY DRAFT COURSE — through Popty's own routes, never SQL.
//
// Why it exists (Kai, 2026-11-09, job #519): Eoghan's Irish fixes go into a DRAFT COPY of
// gle_for_eng, not the beta course learners are on. Kai creates an empty course in Popty; this
// tool fills it with the source's seeds, LEGOs (is_new, type, components, order) and practice
// phrases; fixes and audio are then made in the copy, and only later carried back together.
// Popty had no course-copy route; the 7 Oct cym_nv2/cym_sv2 copies were hand-run SQL, which the
// database refuses from agents since 14 Oct (job #388). So this rides the doors that exist:
//
//   read   GET  :3470 /api/production/:src/seeds?status=all   (seeds → legos → phrases, nested)
//          GET  :3470 /api/production/:code/info               (course row + exact row counts)
//   seeds  GET  :3471 /api/course/:dst/seed-editor             (record-only door: lays the canonical
//          skeleton, seeds 1..N with empty target text, on a course that has none — --init-seeds)
//   write  POST :3470 /api/production/:dst/edit-batch          (seed.update + lego.insert +
//          phrase.insert, ONE transaction per chunk, dry run unless --apply)
//
// WHAT IS DELIBERATELY NOT COPIED:
//   - audio links (known/target1/target2/presentation_audio_id) and clip durations: audio is made
//     in the copy later (Kai's ruling). Nothing is rendered here.
//   - introductions: an intro's words live only in course_audio.text and lego_introductions only
//     links clips (services/shared/intro-mirror.cjs header), so an intro IS audio. The copy's
//     intros are authored when its audio is made.
//   - QA flags, content_edit_events, row uuids, version/timestamps: they belong to the source rows.
//   - seed.decomposed_at: not settable through the edit door (UPDATABLE in course-edit-ops.cjs).
//
// SAFETY: the target must exist, be status 'draft', and hold no LEGOs and no phrases (so a re-run
// can never clobber fixes already made in the copy); its seeds must be exactly the source's seed
// numbers. The source read is checked against the exact row counts, so a truncated read refuses.
// Chunks are cut on seed boundaries (a seed's LEGOs and their phrases travel together) so each
// dry run is self-contained.
//
// Usage (from a Popty checkout on the Popty host):
//   node tools/course-copy/copy-course-text.cjs --from gle_for_eng --to gle_v2_for_eng --plan
//        offline: read source, build every op, validate with the edit engine's own planner
//   node tools/course-copy/copy-course-text.cjs --from gle_for_eng --to gle_v2_for_eng --init-seeds
//        lay the 668-seed skeleton in the empty draft (the seed editor's own first-open step)
//   node tools/course-copy/copy-course-text.cjs --from gle_for_eng --to gle_v2_for_eng
//        DRY RUN every chunk through edit-batch (transaction run and rolled back)
//   ... --apply      commit, chunk by chunk; prints each chunk's event id and undo file

const { planOps, MAX_OPS } = require('../../services/shared/course-edit-ops.cjs')

const AGENT = 'course-copy-text'
const PROD = process.env.POPTY_API || 'http://localhost:3470'
const BUILDER = process.env.COURSE_BUILDER_API || 'http://localhost:3471'
const CHUNK_OPS = 400 // each insert costs ~4 round trips to the remote DB; small chunks keep one request well inside fetch's 300 s header timeout

// Columns copied verbatim. Everything else (ids, audio, durations, bookkeeping) is left behind.
const SEED_COLS = ['known_text', 'target_text', 'target_text_roman', 'status', 'approved_at']
const LEGO_COLS = ['seed_number', 'lego_index', 'type', 'is_new', 'known_text', 'target_text', 'components',
  'status', 'release_batch', 'target_text_roman', 'target_lego_id', 'known_gloss_segments']
const PHRASE_COLS = ['seed_number', 'lego_index', 'lego_id', 'known_text', 'target_text', 'phrase_role', 'position',
  'introduce', 'status', 'register', 'difficulty', 'connected_lego_ids', 'lego_position', 'target_text_roman',
  'metadata', 'known_gloss_segments', 'word_count', 'lego_count', 'target_syllable_count', 'target_phrase_id',
  'decomposition', 'decomposition_course_version', 'qa_checked', 'release_batch', 'display_tiling',
  'display_tiling_version']

const pick = (row, cols) => {
  const out = {}
  for (const c of cols) if (row[c] !== undefined && row[c] !== null) out[c] = row[c]
  return out
}

/** Re-key a phrase id from the source course to the draft: "gle_for_eng:S0001L01B01" → "gle_v2_for_eng:…". */
function rekeyPhraseId(id, from, to) {
  const s = String(id)
  if (!s.startsWith(`${from}:`)) throw new Error(`phrase id ${s} does not start "${from}:"`)
  return `${to}:${s.slice(from.length + 1)}`
}

/**
 * The ops for ONE source seed (nested as GET /seeds returns it). Pure.
 * seed.update first (the skeleton row exists), then its LEGOs in lego_index order, then their phrases.
 */
function opsForSeed(seed, { from, to }) {
  const ops = [{ op: 'seed.update', seed_number: seed.seed_number, set: pick(seed, SEED_COLS) }]
  const legos = [...(seed.legos || [])].sort((a, b) => a.lego_index - b.lego_index)
  // copy_of: the engine proves each LEGO is verbatim before exempting it from the new-LEGO shape
  // rules (legacy M LEGOs without components exist on gle_for_eng and must travel as they are).
  for (const l of legos) ops.push({ op: 'lego.insert', row: pick(l, LEGO_COLS), copy_of: { course: from, id: l.id } })
  for (const l of legos) {
    const phrases = [...(l.basket_phrases || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.id).localeCompare(String(b.id)))
    for (const p of phrases) ops.push({ op: 'phrase.insert', row: { id: rekeyPhraseId(p.id, from, to), ...pick(p, PHRASE_COLS) }, copy_of: { course: from, id: p.id } })
  }
  return ops
}

/** Cut per-seed op lists into chunks on seed boundaries. Pure. */
function chunkBySeed(perSeed, max = CHUNK_OPS) {
  const chunks = []
  let cur = { seeds: [], ops: [] }
  for (const { seed_number, ops } of perSeed) {
    if (ops.length > MAX_OPS) throw new Error(`seed ${seed_number} alone needs ${ops.length} ops (> ${MAX_OPS})`)
    if (cur.ops.length && cur.ops.length + ops.length > max) { chunks.push(cur); cur = { seeds: [], ops: [] } }
    cur.seeds.push(seed_number); cur.ops.push(...ops)
  }
  if (cur.ops.length) chunks.push(cur)
  return chunks
}

async function getJson(url) {
  const r = await fetch(url, { headers: { 'x-agent-id': AGENT } })
  const text = await r.text()
  let body; try { body = JSON.parse(text) } catch { body = { raw: text.slice(0, 300) } }
  if (!r.ok) throw Object.assign(new Error(`GET ${url} → ${r.status}: ${body.error || body.raw || ''}`), { status: r.status })
  return body
}

async function postBatch(code, ops, apply) {
  const r = await fetch(`${PROD}/api/production/${code}/edit-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT, 'x-agent-role': 'course-copy' },
    body: JSON.stringify({ ops, apply }),
  })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}

function parseArgs(argv) {
  const a = { from: null, to: null, plan: false, initSeeds: false, apply: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from') a.from = argv[++i]
    else if (argv[i] === '--to') a.to = argv[++i]
    else if (argv[i] === '--plan') a.plan = true
    else if (argv[i] === '--init-seeds') a.initSeeds = true
    else if (argv[i] === '--apply') a.apply = true
    else throw new Error(`unknown argument ${argv[i]}`)
  }
  if (!a.from || !a.to) throw new Error('--from <source course> and --to <empty draft course> are required')
  if (a.from === a.to) throw new Error('--from and --to are the same course')
  if ([a.plan, a.initSeeds, a.apply].filter(Boolean).length > 1) throw new Error('give at most one of --plan, --init-seeds, --apply')
  return a
}

async function readSource(from) {
  const [info, dump] = await Promise.all([
    getJson(`${PROD}/api/production/${from}/info`),
    getJson(`${PROD}/api/production/${from}/seeds?status=all`),
  ])
  const seeds = dump.seeds || []
  let legos = 0, phrases = 0
  for (const s of seeds) for (const l of s.legos || []) { legos++; phrases += (l.basket_phrases || []).length }
  const want = info.course.stats
  if (seeds.length !== want.seeds || legos !== want.legos || phrases !== want.phrases) {
    throw new Error(`source read is not whole: read ${seeds.length} seeds / ${legos} LEGOs / ${phrases} phrases, `
      + `the table counts are ${want.seeds} / ${want.legos} / ${want.phrases}; refusing to copy a partial course`)
  }
  return { info: info.course, seeds, counts: { seeds: seeds.length, legos, phrases } }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const src = await readSource(args.from)
  console.log(`source ${args.from}: ${src.counts.seeds} seeds, ${src.counts.legos} LEGOs, ${src.counts.phrases} phrases (status ${src.info.status}) — audio links and intros NOT copied`)

  const perSeed = [...src.seeds].sort((a, b) => a.seed_number - b.seed_number)
    .map(s => ({ seed_number: s.seed_number, ops: opsForSeed(s, { from: args.from, to: args.to }) }))
  const chunks = chunkBySeed(perSeed)
  const total = chunks.reduce((n, c) => n + c.ops.length, 0)

  // The engine's own planner validates every op (shape, plain-speakable text, id prefix) before any I/O.
  const refused = []
  for (const c of chunks) {
    try { planOps(c.ops, args.to) } catch (e) {
      refused.push({ seeds: `${c.seeds[0]}-${c.seeds.at(-1)}`, error: e.message, op: c.ops[e.index] })
    }
  }
  console.log(`planned ${total} ops in ${chunks.length} chunk(s); planner refusals: ${refused.length}`)
  for (const r of refused) console.log(`  REFUSED seeds ${r.seeds}: ${r.error}\n    ${JSON.stringify(r.op)}`)
  if (args.plan) process.exit(refused.length ? 1 : 0)
  if (refused.length) throw new Error('planner refused ops; fix the source rows (or this tool) first')

  // The target: exists, draft, empty of LEGOs and phrases.
  let tgt
  try { tgt = (await getJson(`${PROD}/api/production/${args.to}/info`)).course }
  catch (e) { throw new Error(`target ${args.to} not found — Kai creates it first in Popty (${e.message})`) }
  if (tgt.status !== 'draft') throw new Error(`target ${args.to} is "${tgt.status}", not draft; refusing`)
  if (tgt.stats.legos || tgt.stats.phrases) throw new Error(`target ${args.to} already holds ${tgt.stats.legos} LEGOs / ${tgt.stats.phrases} phrases; this tool only fills an EMPTY draft`)

  if (args.initSeeds) {
    if (tgt.stats.seeds) { console.log(`target already has ${tgt.stats.seeds} seeds; nothing to initialise`); return }
    await getJson(`${BUILDER}/api/course/${args.to}/seed-editor?limit=1`)
    const after = (await getJson(`${PROD}/api/production/${args.to}/info`)).course.stats
    console.log(`skeleton laid: ${args.to} now has ${after.seeds} seeds`)
    return
  }

  const tgtSeeds = (await getJson(`${PROD}/api/production/${args.to}/seeds?status=all`)).seeds || []
  const have = new Set(tgtSeeds.map(s => s.seed_number))
  const missing = src.seeds.map(s => s.seed_number).filter(n => !have.has(n))
  const extra = [...have].filter(n => !src.seeds.some(s => s.seed_number === n))
  if (missing.length) throw new Error(`target lacks ${missing.length} source seed(s) (e.g. ${missing.slice(0, 5).join(', ')}); run --init-seeds first`)
  if (extra.length) console.log(`note: target has ${extra.length} seed(s) the source lacks (${extra.slice(0, 5).join(', ')}…); left as they are`)

  let ok = 0
  for (const [i, c] of chunks.entries()) {
    const { status, body } = await postBatch(args.to, c.ops, args.apply)
    const tag = `chunk ${i + 1}/${chunks.length} seeds ${c.seeds[0]}-${c.seeds.at(-1)} (${c.ops.length} ops)`
    if (status !== 200 || !body.ok) {
      console.log(`${tag}: REFUSED ${status} ${body.code || ''} ${body.error || ''}`)
      if (body.index !== undefined) console.log(`  op: ${JSON.stringify(c.ops[body.index])}`)
      if (args.apply) throw new Error(`stopped at ${tag}; earlier chunks are committed (their undo files are named above)`)
      continue
    }
    ok++
    console.log(`${tag}: ${body.applied ? `APPLIED event ${body.event_id} undo ${body.undo_file}` : 'dry run OK (rolled back)'}`)
  }
  console.log(`${ok}/${chunks.length} chunk(s) ${args.apply ? 'applied' : 'passed the dry run'}`)
  if (ok !== chunks.length) process.exit(1)
}

module.exports = { opsForSeed, chunkBySeed, rekeyPhraseId, SEED_COLS, LEGO_COLS, PHRASE_COLS }

if (require.main === module) {
  main().catch(e => { console.error(`copy-course-text: ${e.message}`); process.exit(1) })
}
