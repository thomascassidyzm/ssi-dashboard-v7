/**
 * POD DRILL CUTS BY MEANING CHUNK (job #381). Cuts every pod card the load rule says needs cutting,
 * by the method Tom approved on the Italian page (d/b5b63cd3): WHERE = the pod's own LEGOs, WHEN =
 * the recording's own word timings, both sides cut from their WHOLE clips, each piece once.
 * Where the LEGO map gives no usable split, a Sonnet call pairs MEANING CHUNKS, each one unbroken
 * stretch in both languages (ruling r-2026-11-03-pod-drill-splits-where-the-pod); a second Sonnet
 * call checks every proposed split, LEGO-map ones included. Several-line turns split at their
 * sentences, each line whole. Nothing is ever recorded: it slices clips that already exist.
 *
 *   node tools/pods/pod-drill/pair.mjs <course> [--write] [--sonnet] [--lines] [--allow-replace=id,id] [--redo-pair] [--early=6]
 *   --lines (job #836): cut only several-line turns, at their sentence ends, including the turns whole-turns.mjs lists
 *   (normally run through tools/pods/pod-drill/stage.mjs, which also lists re-records and exports the cut file)
 *
 * WHEN = the render's own Cartesia word timings, both sides (Tom r-2026-11-03: "no Whisper or
 * transcription for timings"): the Italian clip's stored timings and the English clip's, which the
 * dump carries as knownWordTimings (tools/pod-chunk-sizes.mjs --known-timings). A seam sits at the
 * quietest 10 ms frame within 60 ms of the Cartesia boundary between the two words. A card whose
 * clip has no Cartesia timings plays whole. Nothing transcribes anything.
 *
 * Reads ops/pod-drill-cuts/<course>.dump.json + .report.json and the player's cut file. Writes (with
 * --write) the cut file, the report (each card's verdict, its source lego|sonnet|lines, and why a
 * card stayed whole) and ops/pod-drill-cuts/<course>.pairing.json (every Sonnet answer, so a rerun
 * replays them for free).
 * The cut file never shrinks (lib.noShrink): it refuses, exit 2, unless --allow-replace names ids.
 * --redo-pair rebuilds the cuts an earlier pair.mjs run made (report round 'pair (#381)') and is the
 * explicit override for exactly those ids; every one it changes or drops is printed.
 * Language-neutral apart from the per-language word splitter.
 *
 * --lego-only (job #669, Tom r-2026-11-03: "we just cut the pieces out of the known side's full
 * sentence"): NO Sonnet call of any kind. Only the pieces the pod's own LEGO map already gives, whose
 * English glosses are an unbroken run of the card's English sentence in target order (the "cuttable"
 * pieces of known-rerecord.mjs), are cut: both sides by Cartesia timings, quietest-frame seams.
 * Every other card is left exactly as it was (no report row touched). It also FILLS the English span
 * of every chunk in an EXISTING cut that has none, leaving the target side byte-identical; noShrink
 * admits exactly those entries, after checking that nothing but the English spans was added.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { OPS, cutsPath } from './paths.mjs'
import { podSplit, knownSpans, knownLangOf, langName, wordsIn, alignTimes, splitLines, splitKnownLines, tileWords, spansAtSeams, quietestBetween, frameDb, noShrink, segmentZh, normT, cartesiaSegs } from './lib.mjs'

const argv = process.argv.slice(2)
const opt = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
const course = argv.find((a) => !a.startsWith('--'))
const EARLY = Number(opt.early || 99) // scenes that get the retry-with-critique effort
const BASE = 'https://staging.saysomethingin.app'
const SONNET_WORKERS = Number(opt['sonnet-workers'] || 8)
const CLAUDE = process.env.CLAUDE_BIN || 'claude'
// the course's two languages, from its code <target>_for_<known> (r-2026-11-03-say-known-language:
// the known side may not be English, so nothing below assumes it is)
const KNOWN = knownLangOf(course)
const LANG_NAME = langName(course.split('_for_')[0])
const KNOWN_NAME = langName(KNOWN)
// --lego-only is the DEFAULT in Popty (job #692): Sonnet pairing runs only when --sonnet is named.
const LEGO_ONLY = !opt.sonnet
const root = path.join(process.env.CS_SCRATCH || os.tmpdir(), 'pod-drill-pair', course)
const audioDir = path.join(root, 'audio'); mkdirSync(audioDir, { recursive: true })

const CUTF = cutsPath(course)
const dump = JSON.parse(readFileSync(path.join(OPS, `${course}.dump.json`), 'utf8'))
// --lines (job #836, Tom 2026-11-05: drill sentence by sentence): the several-sentence turns the player plays as ONE
// clip (whole-turns.mjs) join the dump, and every several-line card is cut at its sentence ends, each line whole,
// both sides by the render's Cartesia timings. No Sonnet. Nothing else is cut.
const LINES = !!opt.lines
if (LINES) {
  const wf = path.join(OPS, `${course}.whole-turns.json`)
  const extra = existsSync(wf) ? JSON.parse(readFileSync(wf, 'utf8')).cards : []
  const have = new Set(extra.map((c) => c.id))
  dump.cards = [...dump.cards.filter((c) => !have.has(c.id)), ...extra]
}
const rep = JSON.parse(readFileSync(path.join(OPS, `${course}.report.json`), 'utf8'))
const cutFile = JSON.parse(readFileSync(CUTF, 'utf8'))
const prevSentences = JSON.parse(JSON.stringify(cutFile.sentences))
const pairF = path.join(OPS, `${course}.pairing.json`)
const pairing = existsSync(pairF) ? JSON.parse(readFileSync(pairF, 'utf8')) : { pair: {}, check: {} }
const repById = new Map(rep.cards.map((c) => [c.id, c]))

/** The KNOWN side's words. zho_for_eng has always split its English with the Chinese segmenter
 *  (the switch keyed on the target); kept so its approved cut file does not move. Every other course
 *  splits its known side by the known language's own rule, and an unspaced known language with no
 *  segmenter (Japanese) stops here, before any card is cut. */
const wordsOf = course === 'zho_for_eng' ? segmentZh : (t) => wordsIn(t, KNOWN)
wordsOf('') // refuse an unsegmentable known language up front, not card by card
const tag = (id) => id.split(':').slice(2).join('-')

// ---- which cards: every card the load rule said needs cutting that does not already cut
const isCut = (e) => e && (e.lines.length > 1 || e.lines.some((l) => l.chunks.length))
const REDO = new Set(opt['redo-pair'] ? rep.cards.filter((c) => c.round === 'pair (#381)').map((c) => c.id) : [])
for (const id of REDO) delete cutFile.sentences[id]
const todo = dump.cards.filter((d) => (LINES || repById.get(d.id)?.status !== 'short') && !isCut(cutFile.sentences[d.id]))
process.stderr.write(`${course}: ${todo.length} cards to cut (${dump.cards.length} in the pod)\n`)

// ---- word times: the render's own Cartesia timings, stored with each clip (r-2026-11-03)
/** {words, starts, ends} in seconds for `text` from a clip's stored timings, or null when they do
 *  not say the text. Pause marks ("…") between sentences are not words. */
function storedTimes(raw, text) {
  if (!raw || !raw.words?.length) return null
  const keep = raw.words.map((w, i) => (/[\p{L}\p{N}]/u.test(w) ? i : -1)).filter((i) => i >= 0)
  const tm = { words: keep.map((i) => raw.words[i]), starts: keep.map((i) => raw.starts[i]), ends: keep.map((i) => raw.ends[i]) }
  const letters = (t) => normT(t).replace(/[^\p{L}\p{N}' ]/gu, '').replace(/\s+/g, ' ').trim()
  return letters(tm.words.join(' ')) === letters(text) ? tm : null
}
const targetTimes = (d) => storedTimes(d.wordTimings, d.target)
/** The known-side clip's Cartesia timings, aligned onto the card's known words. */
function knownTimes(d) {
  const segs = cartesiaSegs(d.knownWordTimings)
  return segs ? alignTimes(wordsOf(d.known), segs, KNOWN) : null
}
const dbCache = new Map()
function dbOf(ref) {
  if (!dbCache.has(ref)) {
    const f = path.join(audioDir, `${ref}.mp3`)
    const o = existsSync(f) ? spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', f, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], { maxBuffer: 1 << 28 }) : null
    dbCache.set(ref, o?.status === 0 && o.stdout?.length ? frameDb(o.stdout) : null)
  }
  return dbCache.get(ref)
}
/** Seam instants (ms) between consecutive ranges: the quietest 10 ms frame within 60 ms of the
 *  Cartesia boundary (midway between one word's end and the next word's start). */
function seamsAt(ranges, tm, ref) {
  const db = dbOf(ref)
  return ranges.slice(0, -1).map((_, i) => {
    const mid = ((tm.ends[ranges[i][1]] + tm.starts[ranges[i + 1][0]]) / 2) * 1000
    return db ? quietestBetween(db, [mid], 60) : Math.round(mid)
  })
}

// ---- the clips themselves (for the quiet-frame search only), fetched from staging's audio proxy
async function fetchClip(ref) {
  const f = path.join(audioDir, `${ref}.mp3`)
  if (existsSync(f)) return f
  const r = await fetch(`${BASE}/api/audio/${ref}`)
  if (!r.ok) return null
  writeFileSync(f, Buffer.from(await r.arrayBuffer()))
  return f
}
const run = (cmd, args, input) => new Promise((resolve) => {
  const p = spawn(cmd, args, { stdio: [input == null ? 'ignore' : 'pipe', 'pipe', 'pipe'] })
  let out = '', err = ''
  p.stdout.on('data', (b) => { out += b }); p.stderr.on('data', (b) => { err += b })
  p.on('close', (code) => resolve({ code, out, err }))
  if (input != null) { p.stdin.end(input) }
})

// ---- Sonnet, one batched call at a time, 8 in parallel, every answer kept
const PAIR_RULES = `You split ${LANG_NAME}/${KNOWN_NAME} sentence pairs from a spoken language course into MEANING CHUNKS for a listen-and-repeat drill. The learner hears each ${LANG_NAME} piece, then its ${KNOWN_NAME} piece, then says it. Both pieces are cut out of the whole recorded sentence, so:
- Each chunk is ONE UNBROKEN STRETCH of the ${LANG_NAME} sentence and ONE UNBROKEN STRETCH of the ${KNOWN_NAME} sentence, and the two mean the same thing on their own.
- Chunks run in order and together use every word of both sentences exactly once. Copy words EXACTLY as given, punctuation included. No rewording, no reordering.
- Never split a set phrase or idiom (per favore, mi dispiace, come stai, a presto...), and never split where the ${KNOWN_NAME} of one piece would be broken across the ${KNOWN_NAME} sentence: if word order differs (an adjective after its noun, a pronoun before the verb), keep that stretch together in one chunk.
- Every piece must be a sensible thing to say on its own: never a piece that is only an article, preposition, conjunction or clitic. A single meaningful word is fine (Sì / Yes, grazie / thank you). A name can stay with its greeting.
- Aim for 2 or 3 chunks; 4 only for a long sentence. Fewer, fuller chunks beat many tiny ones.
- The pod's own LEGOs are given as hints (they may be out of date): prefer their boundaries where they line up with the sentence.
- If there is no clean split by these rules, say so: a card left whole is better than a bad split.`
const PAIR_ASK = `Answer with JSON only, an array with one object per card: {"id": "...", "chunks": [["${LANG_NAME} piece", "${KNOWN_NAME} piece"], ...]} or {"id": "...", "whole": "one short reason"}.`
const CHECK_ASK = `You are checking proposed splits of ${LANG_NAME}/${KNOWN_NAME} sentence pairs into drill pieces, made by another model or by the course's own map. The learner hears each ${LANG_NAME} piece then its ${KNOWN_NAME} piece, both cut from the whole recorded sentence. A split PASSES only if, for every piece: (1) the ${LANG_NAME} piece and its ${KNOWN_NAME} piece mean the same thing, nothing missing or extra on either side; (2) each is one sensible unit to say on its own, never cut inside a phrase or idiom, never a bare article/preposition/clitic, never an ${KNOWN_NAME} piece that only makes sense with words that live in another piece; (3) together the pieces cover both sentences in order. Be strict but fair: a natural, slightly loose gloss is fine (Scusi = Excuse me); a piece whose meaning lives elsewhere is not.
Answer with JSON only, one object per card: {"id": "...", "ok": true} or {"id": "...", "ok": false, "why": "one short reason"}.`

function extractJson(text) {
  const s = text.indexOf('['), e = text.lastIndexOf(']')
  if (s < 0 || e < s) return null
  try { return JSON.parse(text.slice(s, e + 1)) } catch { return null }
}
async function sonnet(prompt) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await run(CLAUDE, ['-p', '--model', 'sonnet', '--output-format', 'json', '--max-turns', '1', '--tools', ''], prompt)
    try { const j = JSON.parse(r.out); const arr = extractJson(j.result || ''); if (arr) return arr } catch { /* retry once */ }
  }
  return null
}
async function sonnetBatches(items, build, size = 8) {
  const batches = []; for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size))
  const out = new Map(); let next = 0, done = 0
  await Promise.all(Array.from({ length: SONNET_WORKERS }, async () => {
    while (next < batches.length) {
      const b = batches[next++]
      const ans = await sonnet(build(b))
      for (const a of ans || []) if (a?.id) out.set(a.id, a)
      done += b.length; process.stderr.write(`\r  sonnet ${done}/${items.length}`)
    }
  }))
  process.stderr.write('\n')
  return out
}
const cardBlock = (d) => ({ id: d.id, [LANG_NAME]: d.target, [KNOWN_NAME]: d.known, pod_LEGOs: d.chunks.map((c) => [c.text, c.gloss || null]) })

// ---- known twins: every whole-turn card of every course's whole-turns list (job #836)
let twinCache = null
function knownTwins() {
  if (twinCache) return twinCache
  twinCache = []
  for (const f of readdirSync(OPS).filter((n) => n.endsWith('.whole-turns.json'))) {
    const w = JSON.parse(readFileSync(path.join(OPS, f), 'utf8'))
    if (knownLangOf(w.course) !== KNOWN) continue
    for (const c of w.cards) twinCache.push({ ...c, course: w.course })
  }
  return twinCache
}

// ---- turn a pairing into a cut entry, or say why not
function buildSplit(d, pieces) {
  const tm = targetTimes(d); if (!tm) return { err: `the ${LANG_NAME} clip has no Cartesia word timings that say its text` }
  const en = knownTimes(d); if (!en) return { err: `the ${KNOWN_NAME} clip has no Cartesia word timings that say its text` }
  const tr = tileWords(tm.words, pieces.map((p) => p[0])); if (!tr) return { err: `${LANG_NAME} pieces do not tile the sentence` }
  const er = tileWords(wordsOf(d.known), pieces.map((p) => p[1])); if (!er) return { err: `${KNOWN_NAME} pieces do not tile the ${KNOWN_NAME} sentence` }
  const ts = spansAtSeams(tr, tm, seamsAt(tr, tm, d.targetAudioId)), es = spansAtSeams(er, en, seamsAt(er, en, d.knownAudioId))
  if ([...ts, ...es].some(([a, b]) => b - a < 180)) return { err: 'a piece is shorter than 180 ms' }
  const strip = (s) => String(s).replace(/[,.;:!?¡¿…]+$/u, '').replace(/^[¡¿]+/u, '').trim()
  const chunks = pieces.map((p, i) => [strip(tm.words.slice(tr[i][0], tr[i][1] + 1).join(' ')), ts[i][0], ts[i][1], wordsOf(d.known).slice(er[i][0], er[i][1] + 1).join(KNOWN === 'zho' ? '' : ' '), es[i][0], es[i][1]])
  return { entry: { clip: d.targetAudioId, knownClip: d.knownAudioId, lines: [{ t: [d.target, ts[0][0], ts.at(-1)[1]], k: null, chunks }] } }
}
function buildLines(d) {
  const tm = targetTimes(d); if (!tm) return { err: `the ${LANG_NAME} clip has no Cartesia word timings that say its text` }
  const lines = splitLines(tm.words)
  const kl = splitKnownLines(d.known, lines.length); if (!kl) return { err: `the ${KNOWN_NAME} has a different number of sentences` }
  const en = knownTimes(d); if (!en) return { err: `the ${KNOWN_NAME} clip has no Cartesia word timings that say its text` }
  const er = tileWords(wordsOf(d.known), kl); if (!er) return { err: `${KNOWN_NAME} sentences do not tile the ${KNOWN_NAME} line` }
  const lr = lines.map((l) => [l.from, l.to])
  const ts = spansAtSeams(lr, tm, seamsAt(lr, tm, d.targetAudioId)), es = spansAtSeams(er, en, seamsAt(er, en, d.knownAudioId))
  return { entry: { clip: d.targetAudioId, knownClip: d.knownAudioId, lines: lines.map((l, i) => ({ t: [tm.words.slice(l.from, l.to + 1).join(' '), ts[i][0], ts[i][1]], k: [kl[i], es[i][0], es[i][1]], chunks: [] })) } }
}

// ================================================================================================
{ const refs = [...new Set([...todo.flatMap((d) => [d.targetAudioId, d.knownAudioId]), ...(LEGO_ONLY ? dump.cards.filter((d) => cutFile.sentences[d.id]).map((d) => d.knownAudioId) : [])].filter(Boolean))]; for (const r of refs) await fetchClip(r) }
const result = new Map() // id -> {status, source, entry?, why, pieces?}
const proposals = new Map() // id -> {source, pieces}

for (const d of todo) {
  if (LEGO_ONLY) {
    // only the cuttable pieces: a single-line card whose LEGO glosses tile its English sentence in order
    const pieces = (d.chunks || []).map((c) => [c.text, c.gloss || ''])
    const tmL = targetTimes(d)
    if (LINES) {
      if (!tmL && d.kind === 'whole-turn') { result.set(d.id, { status: 'whole', why: `several-line turn: the ${LANG_NAME} clip has no Cartesia word timings that say its text` }); continue }
      if (!tmL || splitLines(tmL.words).length < 2) continue
      if (!d.knownAudioId) { result.set(d.id, { status: 'whole', why: `several-line turn: no ${KNOWN_NAME} clip` }); continue }
      let b = buildLines(d)
      // KNOWN TWIN (job #836): the known take carries no Cartesia timings, but another course's pod has a take of the
      // SAME words in the SAME voice that does (the shared English Pod 1 lines were rendered once per course). Its
      // sentence spans stand in; the entry names the card's own known clip (knownTwinOf), so the player uses the twin
      // only while the card still plays that clip.
      if (!b.entry && d.knownVoice && !knownTimes(d)) {
        const twin = knownTwins().find((c) => c.knownVoice === d.knownVoice && normT(c.known) === normT(d.known) && c.knownAudioId !== d.knownAudioId && c.knownWordTimings)
        if (twin && await fetchClip(twin.knownAudioId)) {
          const t2 = buildLines({ ...d, knownAudioId: twin.knownAudioId, knownWordTimings: twin.knownWordTimings })
          if (t2.entry) b = { entry: { ...t2.entry, knownTwinOf: d.knownAudioId, knownTwinCourse: twin.course } }
        }
      }
      result.set(d.id, b.entry ? { status: 'cut', source: 'lines', entry: b.entry } : { status: 'whole', why: `several-line turn: ${b.err}` })
      continue
    }
    if (!d.knownAudioId || pieces.length < 2 || (tmL && splitLines(tmL.words).length > 1)) continue
    if (!tileWords(wordsOf(d.known), pieces.map((p) => p[1]))) continue // needs-pairing / re-record: not this run
    proposals.set(d.id, { source: 'lego', pieces })
    continue
  }
  if (!d.knownAudioId) { result.set(d.id, { status: 'whole', why: `no ${KNOWN_NAME} clip` }); continue }
  const tm = targetTimes(d)
  if (tm && splitLines(tm.words).length > 1) {
    const b = buildLines(d)
    result.set(d.id, b.entry ? { status: 'cut', source: 'lines', entry: b.entry } : { status: 'whole', why: `several-line turn: ${b.err}` })
    continue
  }
  // LEGO map first
  const parts = podSplit(d, d.targetAudioId)
  if (parts) {
    const en = knownTimes(d)
    const segs = cartesiaSegs(d.knownWordTimings)
    const sp = en && segs ? knownSpans(d.known, parts.map((p) => p.en), segs, KNOWN) : { err: 'untimed' }
    if (sp.spans && sp.words.every((w) => w.trim())) { proposals.set(d.id, { source: 'lego', pieces: parts.map((p, i) => [p.it, sp.words[i]]) }); continue }
  }
  proposals.set(d.id, { source: 'sonnet', pieces: null })
}

// Sonnet pairing for the cards the LEGO map cannot split
const keyOf = (d) => `${d.target}|${d.known}`
async function pairPass(cards, critique = null) {
  const ask = cards.filter((d) => critique || !pairing.pair[d.id] || pairing.pair[d.id].key !== keyOf(d))
  if (ask.length) {
    const got = await sonnetBatches(ask, (b) => `${PAIR_RULES}\n\n${critique ? 'An earlier attempt at these cards was REJECTED or gave up; the reason is given as "rejected_because". Find a clean split, or say whole.\n\n' : ''}Cards:\n${JSON.stringify(b.map((d) => ({ ...cardBlock(d), ...(critique ? { rejected_split: critique.get(d.id)?.pieces, rejected_because: critique.get(d.id)?.why } : {}) })), null, 1)}\n\n${PAIR_ASK}`)
    for (const d of ask) { const a = got.get(d.id); if (a) pairing.pair[d.id] = { key: keyOf(d), ...(critique ? { retry: true } : {}), answer: a } }
  }
}
async function checkPass(ids) {
  const items = ids.map((id) => ({ id, d: dump.cards.find((c) => c.id === id), pieces: proposals.get(id).pieces }))
  const ask = items.filter((x) => { const c = pairing.check[x.id]; return !c || JSON.stringify(c.pieces) !== JSON.stringify(x.pieces) })
  if (ask.length) {
    const got = await sonnetBatches(ask, (b) => `${CHECK_ASK}\n\nCards:\n${JSON.stringify(b.map((x) => ({ id: x.id, [LANG_NAME]: x.d.target, [KNOWN_NAME]: x.d.known, pieces: x.pieces })), null, 1)}`)
    for (const x of ask) { const a = got.get(x.id); if (a) pairing.check[x.id] = { pieces: x.pieces, ok: a.ok === true, why: a.why || null } }
  }
}
const byId = new Map(dump.cards.map((d) => [d.id, d]))
const sonnetIds = [...proposals].filter(([, p]) => p.source === 'sonnet').map(([id]) => id)
process.stderr.write(`LEGO map splits ${proposals.size - sonnetIds.length}; Sonnet pairing ${sonnetIds.length}\n`)
if (!LEGO_ONLY) await pairPass(sonnetIds.map((id) => byId.get(id)))
const applyPair = (id) => {
  const a = pairing.pair[id]?.answer
  const p = proposals.get(id)
  if (!a) { p.pieces = null; p.why = 'Sonnet gave no answer' } else if (a.whole || !Array.isArray(a.chunks) || a.chunks.length < 2) { p.pieces = null; p.why = `no clean pairing: ${a.whole || 'one chunk'}` } else { p.pieces = a.chunks.map((c) => [String(c[0]), String(c[1])]); p.why = null }
  if (p.pieces && !buildSplit(byId.get(id), p.pieces).entry) { p.why = `pairing rejected by the timings: ${buildSplit(byId.get(id), p.pieces).err}`; p.pieces = null }
}
for (const id of sonnetIds) applyPair(id)
// a card Sonnet called whole is asked once more, with the rule restated: work hard before giving up
const gaveUp = sonnetIds.filter((id) => !proposals.get(id).pieces && pairing.pair[id]?.answer?.whole && !pairing.pair[id]?.retry)
if (gaveUp.length && !opt['no-retry'] && !LEGO_ONLY) {
  process.stderr.write(`asking again for ${gaveUp.length} cards Sonnet left whole\n`)
  const crit = new Map(gaveUp.map((id) => [id, { pieces: null, why: `${pairing.pair[id].answer.whole}. LOOK AGAIN: word order only blocks a split when it breaks a stretch on one side. "Hai avuto / una giornata lunga?" = "Did you have / a long day?" splits cleanly: each side of each chunk is one unbroken stretch even though "Hai avuto" and "Did you have" order their words differently. "Quanto è lontano / il centro?" = "How far is it / into town?" is clean too. Say whole only if no such split exists.` }]))
  await pairPass(gaveUp.map((id) => byId.get(id)), crit)
  for (const id of gaveUp) { proposals.get(id).retried = true; applyPair(id) }
}

// second check on every proposed split; early scenes get one retry with the checker's reason
const checkable = () => [...proposals].filter(([, p]) => p.pieces).map(([id]) => id)
if (!LEGO_ONLY) await checkPass(checkable())
const rejected = LEGO_ONLY ? [] : checkable().filter((id) => pairing.check[id] && !pairing.check[id].ok)
const retry = rejected.filter((id) => byId.get(id).scene <= EARLY)
if (retry.length && !opt['no-retry']) {
  process.stderr.write(`retrying ${retry.length} early-scene splits the checker rejected\n`)
  const crit = new Map(retry.map((id) => [id, { pieces: proposals.get(id).pieces, why: pairing.check[id].why }]))
  if (retry.some((id) => !pairing.pair[id]?.retry)) await pairPass(retry.filter((id) => !pairing.pair[id]?.retry).map((id) => byId.get(id)), crit)
  for (const id of retry) { proposals.get(id).source = 'sonnet'; proposals.get(id).retried = true; applyPair(id) }
  await checkPass(retry.filter((id) => proposals.get(id).pieces))
}

for (const [id, p] of proposals) {
  const d = byId.get(id)
  const chk = p.pieces ? (LEGO_ONLY ? { ok: true } : pairing.check[id]) : null
  if (!p.pieces) { result.set(id, { status: 'whole', why: p.why, source: p.source }); continue }
  if (!chk) { result.set(id, { status: 'whole', why: 'second check gave no answer', source: p.source, pieces: p.pieces }); continue }
  if (!chk.ok) { result.set(id, { status: 'whole', why: `second check rejected the split: ${chk.why}`, source: p.source, pieces: p.pieces }); continue }
  const b = buildSplit(d, p.pieces)
  result.set(id, b.entry ? { status: 'cut', source: p.source, entry: b.entry, pieces: p.pieces, retried: !!p.retried } : { status: 'whole', why: b.err, source: p.source, pieces: p.pieces })
}

// ---- merge, guard, report
const next = { ...cutFile.sentences }
for (const [id, r] of result) if (r.status === 'cut') next[id] = r.entry
// --lego-only: fill the English span of each chunk of an existing cut that has none (target untouched)
const filled = new Map() // id -> 'filled' | why not
if (LEGO_ONLY && !LINES) {
  for (const d of dump.cards) {
    const e = next[d.id]
    if (!e || !e.lines.some((l) => l.chunks.length >= 2 && l.chunks.some((c) => c[4] == null))) continue
    if (e.lines.some((l) => l.chunks.some((c) => c[6]))) continue // a standalone known piece is wired (#707, render.mjs): never re-cut over it
    const why = (() => {
      if (!d.knownAudioId || e.knownClip !== d.knownAudioId) return 'the cut was made against a different English clip from the one the card plays now'
      const en = knownTimes(d); if (!en) return 'the English clip has no Cartesia word timings that say its text'
      const multi = e.lines.length > 1
      // every line's English pieces, in order: its chunks' English, or the line's whole English
      const linePieces = e.lines.map((l) => (l.chunks.length >= 2 ? l.chunks.map((c) => c[3]) : [multi ? l.k?.[0] : d.known]))
      const er = tileWords(wordsOf(d.known), linePieces.flat()); if (!er) return 'the chunks\' English is not an unbroken run of the English sentence in target order'
      const out = JSON.parse(JSON.stringify(e)); let at = 0
      for (const [li, l] of out.lines.entries()) {
        const rs = er.slice(at, at + linePieces[li].length); at += linePieces[li].length
        if (l.chunks.length < 2) continue
        const es = spansAtSeams(rs, en, seamsAt(rs, en, d.knownAudioId))
        if (multi) { if (!l.k || l.k.length !== 3) return 'a line has no English span to cut inside'; es[0][0] = l.k[1]; es.at(-1)[1] = l.k[2] }
        if (es.some(([a, b]) => b - a < 180)) return 'an English piece is shorter than 180 ms'
        l.chunks = l.chunks.map((c, i) => [c[0], c[1], c[2], c[3], es[i][0], es[i][1]])
      }
      next[d.id] = out
      return 'filled'
    })()
    filled.set(d.id, why)
  }
  const nf = [...filled.values()].filter((w) => w === 'filled').length
  process.stderr.write(`existing cuts given English spans: ${nf} of ${filled.size}\n`)
  for (const [id, w] of filled) if (w !== 'filled') process.stderr.write(`  not filled ${id}: ${w}\n`)
}
// --lego-only taste-safe default (#669 brief: "if a piece cuts by timings but the slice sounds clipped,
// leave it uncut"): a known seam whose frame sits less than KNOWN_MIN_DIP_DB below the clip's speech
// level (90th-percentile frame) is in the middle of connected sound. 5 dB is shallower than ~90% of
// the Italian seams Tom approved by ear (their p10 is ~6.8 dB). That line keeps no English spans
// (Drill plays the whole known clip after each piece, as before) and the re-record list carries it.
const KNOWN_MIN_DIP_DB = 5
const shallow = new Map() // id -> [seam descriptions]
if (LEGO_ONLY) {
  const touched = [...[...result].filter(([, r]) => r.status === 'cut').map(([id]) => id), ...[...filled].filter(([, w]) => w === 'filled').map(([id]) => id)]
  for (const id of touched) {
    const e = next[id], db = dbOf(e.knownClip)
    if (!db) continue
    const speech = [...db].sort((x, y) => x - y)[Math.floor(db.length * 0.9)]
    const out = JSON.parse(JSON.stringify(e)); const bad = []
    for (const l of out.lines) {
      if (l.chunks.length < 2 || l.chunks[0][4] == null) continue
      const weak = l.chunks.slice(0, -1).map((c, i) => [c, l.chunks[i + 1], speech - db[Math.round(c[5] / 10)]]).filter(([, , dip]) => !(dip >= KNOWN_MIN_DIP_DB))
      if (!weak.length) continue
      bad.push(...weak.map(([c, n, dip]) => `"${c[3]} | ${n[3]}" ${Number.isFinite(dip) ? dip.toFixed(1) : '?'} dB below speech`))
      l.chunks = l.chunks.map((c) => c.slice(0, 4))
    }
    if (!bad.length) continue
    shallow.set(id, bad)
    if (filled.get(id) === 'filled') { next[id] = prevSentences[id]; filled.set(id, `known seam too shallow to cut cleanly: ${bad.join('; ')}`) } else next[id] = out
    process.stderr.write(`  English left whole ${id}: ${bad.join('; ')}\n`)
  }
}
/** True when `now` differs from `old` only by English spans added to chunks that had none. */
const onlyKnownAdded = (old, now) => now && old.clip === now.clip && old.knownClip === now.knownClip && old.lines.length === now.lines.length &&
  old.lines.every((l, i) => JSON.stringify(l.t) === JSON.stringify(now.lines[i].t) && JSON.stringify(l.k) === JSON.stringify(now.lines[i].k) && l.chunks.length === now.lines[i].chunks.length &&
    l.chunks.every((c, j) => { const n = now.lines[i].chunks[j]; return JSON.stringify(n) === JSON.stringify(c) || (c.length === 4 && n.length === 6 && JSON.stringify(n.slice(0, 4)) === JSON.stringify(c)) }))
const knownFillIds = [...filled].filter(([, w]) => w === 'filled').map(([id]) => id).filter((id) => onlyKnownAdded(prevSentences[id], next[id]))
const allow = new Set([...String(opt['allow-replace'] || '').split(',').filter(Boolean), ...REDO, ...knownFillIds])
for (const id of REDO) process.stderr.write(`redo ${id}: ${!next[id] ? 'DROPPED, now plays whole' : JSON.stringify(next[id]) === JSON.stringify(prevSentences[id]) ? 'unchanged' : 're-cut'}\n`)
const guard = noShrink(prevSentences, next, allow)
const scenes = {}
for (const d of dump.cards) {
  const s = scenes[`SC${String(d.scene).padStart(2, '0')}`] ??= { cards: 0, fitsWhole: 0, alreadyCut: 0, newLego: 0, newSonnet: 0, newLines: 0, whole: 0 }
  s.cards++
  const r = result.get(d.id)
  if (!r) { if (isCut(prevSentences[d.id])) s.alreadyCut++; else s.fitsWhole++; continue }
  if (r.status !== 'cut') s.whole++; else s[{ lego: 'newLego', sonnet: 'newSonnet', lines: 'newLines' }[r.source]]++
}
const tot = Object.values(scenes).reduce((a, s) => { for (const k in s) a[k] = (a[k] || 0) + s[k]; return a }, {})
const newCuts = [...result].filter(([, r]) => r.status === 'cut').map(([id, r]) => ({ id, scene: byId.get(id).scene, source: r.source, seams: 'cartesia', retried: r.retried || false }))
const pairReport = {
  tool: `tools/pods/pod-drill/pair.mjs (#381, Popty #692)${LEGO_ONLY ? ' --lego-only (#669)' : ''}`, totals: tot, scenes, newCuts,
  knownFill: Object.fromEntries(filled),
  knownTooShallow: Object.fromEntries(shallow), knownMinDipDb: LEGO_ONLY ? KNOWN_MIN_DIP_DB : undefined,
  cards: [...result].map(([id, r]) => ({ id, scene: byId.get(id).scene, target: byId.get(id).target, known: byId.get(id).known, status: r.status, source: r.source || null, seams: r.status === 'cut' ? 'cartesia' : null, why: r.why || null, pieces: r.pieces || null, retried: r.retried || false })),
}
process.stderr.write(`${JSON.stringify(tot)}\n`)
for (const [k, s] of Object.entries(scenes)) process.stderr.write(`${k} ${JSON.stringify(s)}\n`)
writeFileSync(path.join(root, 'pair-report.json'), JSON.stringify(pairReport, null, 1))
if (!guard.ok) { process.stderr.write(`REFUSED: the cut file would shrink; nothing written.\n${guard.problems.join('\n')}\nPass --allow-replace=<ids> to override.\n`); process.exit(2) }
if (opt.write) {
  for (const [id, r] of result) {
    const old = repById.get(id)
    const row = { ...(old || { id, scene: byId.get(id).scene, target: byId.get(id).target, known: byId.get(id).known }), status: r.status === 'cut' ? 'verified' : 'whole', source: r.source || null, why: r.why || null, pairing: r.pieces || null }
    if (r.status === 'cut') { delete row.why; row.round = LINES ? 'pair --lines (#836)' : LEGO_ONLY ? 'pair --lego-only (#669)' : 'pair (#381)' }
    if (old) rep.cards[rep.cards.indexOf(old)] = row; else rep.cards.push(row) // a card the pod gained since the last report
  }
  for (const id of knownFillIds) { const row = repById.get(id); if (row) row.knownSpans = 'lego-only (#669)' }
  for (const [id, bad] of shallow) { const row = rep.cards.find((c) => c.id === id); if (row) row.knownWhole = `known seam too shallow to cut cleanly (#669): ${bad.join('; ')}` }
  const vs = Object.values(next)
  rep.summary = { ...rep.summary, verified: rep.cards.filter((c) => c.status === 'verified').length, pairing: { totals: tot, scenes } }
  cutFile.sentences = next
  cutFile.summary = { cards: dump.cards.length, verified: vs.length, needCutting: rep.summary.needCutting }
  cutFile.tool = 'Popty tools/pods/pod-drill (#692; cuts first made by ssi-learning-app run.mjs + apply-pod-seams.mjs + pair.mjs)'
  writeFileSync(CUTF, JSON.stringify(cutFile) + '\n')
  writeFileSync(path.join(OPS, `${course}.report.json`), JSON.stringify(rep, null, 1) + '\n')
  if (!LEGO_ONLY) writeFileSync(path.join(OPS, `${course}.pairing.json`), JSON.stringify(pairing, null, 1) + '\n')
  writeFileSync(path.join(OPS, `${course}.pair-report.json`), JSON.stringify(pairReport, null, 1) + '\n')
  process.stderr.write(`written: ${newCuts.length} new cuts\n`)
} else if (!LEGO_ONLY) {
  // keep the paid-for answers even on a dry run
  writeFileSync(path.join(OPS, `${course}.pairing.json`), JSON.stringify(pairing, null, 1) + '\n')
}
