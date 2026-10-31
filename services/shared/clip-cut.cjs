/**
 * EDIT AN EXISTING RECORDING: cut one clip into pieces, zero TTS (job #410). Route: POST /api/production/:courseCode/clip-cut;
 * button: the Pod Lab sentence row ("✂ Cut"); CLI for agents and sample runs: tools/audio/clip-cut.cjs.
 *
 * Tom, 2026-10-31 (r-2026-10-31-removing-as-in-context-from-recorded): "We don't need to re-record anything. We just edit
 * out ..." — and on storage: "the player did actually play multiple clips as a presentation ... Popty must have the
 * capacity to store it somewhere". It does, and this tool writes NO new storage:
 *
 *   A PIECE IS A SPAN OF THE SOURCE CLIP, never a new clip. The answer's `drillCut` is exactly the learner app's existing
 *   verified-cut record (packages/player-vue/src/data/podDrillCuts/<course>.json, format 2: { clip, knownClip, lines:
 *   [{ t:[text,startMs,endMs], k, chunks:[[text,startMs,endMs,gloss]] }] }, read by core/pods/fusionDrill.ts
 *   verifiedCutGroup on staging). So the cast voice is preserved by construction (the pieces ARE the source's bytes), no
 *   course_audio row is written, no S3 object, and nothing can ever be deleted — there is nothing to tombstone.
 *   (Sentence-level pieces of a several-sentence turn already have their own store, listening_pod_sentences
 *   .sentence_audio_ids — pod-english-split-cuts.cjs writes it; this tool does not.)
 *
 * HOW A CUT IS FOUND (the #913/#937 cutter needed a quiet run at every seam and refused ~560 cards whose words run
 * together): local whisper's word timings place each seam between the last word of one piece and the first word of the
 * next. Those times run early or late by up to ~200 ms (measured on ita SC10-S004: "controllare" cut to "controllo"), so
 * the seam is SEARCHED: up to four quiet points near the gap are each tried, and the one where this piece and the rest of
 * the clip are both heard back best wins. A caller (the button) may instead give the seams itself (`cutsMs`).
 * WHAT VERIFIES A PIECE: whisper hears the piece back as its own words (similarity >= MATCH_MIN, heard WITH the player's
 * ~30 ms stop overrun) and it is at least MIN_PIECE_MS long. The cut verifies only when every piece does.
 *
 * Apply (dryRun:false) refuses an unverified cut, then files ONE content-edit event (the edit log, content-edit-log.cjs;
 * method 'clip-cut', the drillCut + verdicts in detail) and appends the same line to the cut ledger. That ledger is what a
 * bulk run exports to the learner app's podDrillCuts file — after Tom's sample gate (r-2026-10-31-sample-gate-for-bulk-
 * course-content), never before.
 *
 * Pure decisions here; every outside-world step (bytes, decode, whisper) is a dep, so the decision is testable offline.
 */
'use strict'

const MATCH_MIN = 0.75
const MIN_PIECE_MS = 200
const OVERRUN_MS = 30
const SEAM = Object.freeze({ frameMs: 10, slackMs: 60, searchMs: 220, candidates: 4, spacingMs: 60 })
const WHISPER_LANG = Object.freeze({ ita: 'it', spa: 'es', deu: 'de', zho: 'zh', hin: 'hi', fra: 'fr', por: 'pt', cym: 'cy', jpn: 'ja', eng: 'en', nld: 'nl', fin: 'fi' })

/** Letters and digits only, lower-cased, accents kept (Unicode-aware: every script we ship). */
const bare = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '')

/** Levenshtein similarity of two bare strings, 0..1. */
function similarity(a, b) {
  a = bare(a); b = bare(b)
  if (!a && !b) return 1
  if (!a || !b) return 0
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]; prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = up
    }
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length)
}

/**
 * Pure. Where each seam falls, from whisper's word timings. `words` = [{ text, startMs, endMs }] for the WHOLE clip,
 * `pieces` = the texts the clip is to be cut into, in order. A seam is placed at the word boundary whose share of the
 * transcript's letters is closest to the pieces' share of theirs — robust to whisper spelling a word differently, or
 * splitting/merging words, because it compares letter mass, not word identity.
 * Returns { seams: [{ afterWord, gapFromMs, gapToMs }] } or { refusal } when the transcript cannot carry the cut.
 */
function placeSeams(words, pieces) {
  const ws = (words || []).filter((w) => bare(w.text))
  if (pieces.length < 2) return { refusal: ['ONE_PIECE', 'a cut needs at least two pieces'] }
  if (ws.length < pieces.length) return { refusal: ['TOO_FEW_WORDS', `whisper heard ${ws.length} word(s) for ${pieces.length} pieces`] }
  const total = ws.reduce((n, w) => n + bare(w.text).length, 0)
  const pieceLen = pieces.map((p) => bare(p).length)
  const pieceTotal = pieceLen.reduce((a, b) => a + b, 0)
  if (!pieceTotal) return { refusal: ['NO_TEXT', 'the pieces have no letters'] }
  const cum = []; let run = 0
  for (const w of ws) { run += bare(w.text).length; cum.push(run / total) }
  const seams = []; let want = 0; let floor = 0
  for (let p = 0; p < pieces.length - 1; p++) {
    want += pieceLen[p] / pieceTotal
    // the boundary after word i, i in [floor, ws.length - (pieces left) - 1] so every piece keeps at least one word
    const ceil = ws.length - (pieces.length - 1 - p) - 1
    let best = floor, bestD = Infinity
    for (let i = floor; i <= ceil; i++) { const d = Math.abs(cum[i] - want); if (d < bestD) { bestD = d; best = i } }
    seams.push({ afterWord: best, gapFromMs: ws[best].endMs, gapToMs: ws[best + 1].startMs })
    floor = best + 1
  }
  return { seams, words: ws }
}

/**
 * Pure. The quietest frame near a word gap. `energy` = per-frame RMS (frameMs each) of the whole clip. Searches
 * [min(gapFrom,gapTo) - slack, max(gapFrom,gapTo) + slack] and returns the centre of the quietest frame, in ms.
 */
function quietestNear(energy, gapFromMs, gapToMs, { frameMs = SEAM.frameMs, slackMs = SEAM.slackMs } = {}) {
  const lo = Math.max(0, Math.floor((Math.min(gapFromMs, gapToMs) - slackMs) / frameMs))
  const hi = Math.min(energy.length - 1, Math.ceil((Math.max(gapFromMs, gapToMs) + slackMs) / frameMs))
  if (hi < lo) return Math.round((gapFromMs + gapToMs) / 2)
  let best = lo
  for (let i = lo; i <= hi; i++) if (energy[i] < energy[best]) best = i
  return best * frameMs + Math.round(frameMs / 2)
}

/**
 * Pure. Up to SEAM.candidates seam points near a word gap: the quietest frame within the gap (± slack) first, then the
 * deepest local energy minima within ± SEAM.searchMs, at least SEAM.spacingMs apart.
 */
function seamCandidates(energy, gapFromMs, gapToMs, { frameMs = SEAM.frameMs, searchMs = SEAM.searchMs, max = SEAM.candidates, spacingMs = SEAM.spacingMs } = {}) {
  const first = quietestNear(energy, gapFromMs, gapToMs, { frameMs })
  const lo = Math.max(1, Math.floor((Math.min(gapFromMs, gapToMs) - searchMs) / frameMs))
  const hi = Math.min(energy.length - 2, Math.ceil((Math.max(gapFromMs, gapToMs) + searchMs) / frameMs))
  const minima = []
  for (let i = lo; i <= hi; i++) if (energy[i] <= energy[i - 1] && energy[i] <= energy[i + 1]) minima.push(i)
  minima.sort((a, b) => energy[a] - energy[b])
  const out = [first]
  for (const i of minima) {
    const ms = i * frameMs + Math.round(frameMs / 2)
    if (out.every((o) => Math.abs(o - ms) >= spacingMs)) out.push(ms)
    if (out.length >= max) break
  }
  return out.sort((a, b) => a - b)
}

/** Pure. Per-frame RMS of 16 kHz mono s16le PCM. */
function frameEnergy(pcm, frameMs = SEAM.frameMs) {
  const per = Math.round(16 * frameMs)
  const n = Math.floor(pcm.length / 2 / per)
  const out = new Array(n)
  for (let f = 0; f < n; f++) {
    let s = 0
    for (let k = 0; k < per; k++) { const v = pcm.readInt16LE((f * per + k) * 2); s += v * v }
    out[f] = Math.sqrt(s / per)
  }
  return out
}

/** Pure. Spans [startMs, endMs] from seams, covering the clip from its first word to its last. */
function spansFrom(cutsMs, durationMs) {
  const edges = [0, ...cutsMs, durationMs]
  return edges.slice(0, -1).map((s, i) => [Math.round(s), Math.round(edges[i + 1])])
}

/** Pure. Why this request may not be cut, or null. Run before any byte is fetched. */
function refuseRequest(d) {
  if (!d || typeof d !== 'object') return ['BAD_REQUEST', 'body must be an object']
  if (!String(d.sourceAudioId || '').trim()) return ['BAD_SOURCE', 'sourceAudioId (a course_audio id, revision suffix allowed) is required']
  if (!Array.isArray(d.pieces) || d.pieces.length < 2 || d.pieces.some((p) => !bare(p))) return ['BAD_PIECES', 'pieces must be two or more non-empty texts, in order']
  if (d.cutsMs != null) {
    const c = d.cutsMs
    if (!Array.isArray(c) || c.length !== d.pieces.length - 1 || c.some((x) => !Number.isFinite(Number(x)))) return ['BAD_CUTS', `cutsMs must be ${d.pieces.length - 1} numbers (one seam between each pair of pieces)`]
    for (let i = 1; i < c.length; i++) if (Number(c[i]) <= Number(c[i - 1])) return ['BAD_CUTS', 'cutsMs must increase']
  }
  if (d.glosses != null && (!Array.isArray(d.glosses) || d.glosses.length !== d.pieces.length)) return ['BAD_GLOSSES', 'glosses, when given, has one entry per piece']
  return null
}

/**
 * Cut one clip. Returns { ok, verified, durationMs, pieces:[{ text, startMs, endMs, heard, sim, verified, why? }],
 * drillCut, seamsFrom: 'whisper'|'caller' } or { ok:false, code, error }.
 * deps: { clipBytes(sourceAudioId) -> mp3 Buffer, decode(mp3) -> 16 kHz mono s16le Buffer,
 *         words(pcm, lang) -> [{text,startMs,endMs}], hear(pcm, lang) -> string }
 */
async function cutClip(req, deps) {
  const why = refuseRequest(req)
  if (why) return { ok: false, code: why[0], error: why[1] }
  const prefix = String(req.courseCode || '').split('_')[0]
  const lang = req.lang || WHISPER_LANG[prefix] || null
  if (!lang) return { ok: false, code: 'NO_LANG', error: `no whisper language for ${req.courseCode}; pass lang` }
  const mp3 = await deps.clipBytes(req.sourceAudioId)
  if (!mp3 || !mp3.length) return { ok: false, code: 'NO_BYTES', error: `clip ${req.sourceAudioId} has no bytes` }
  const pcm = await deps.decode(mp3)
  const durationMs = Math.round((pcm.length / 2 / 16000) * 1000)
  const msToByte = (ms) => Math.max(0, Math.round((ms / 1000) * 16000)) * 2
  // heard as the learner hears it: the player's stop poll runs ~30 ms past endMs
  const hearSpan = async (a, z) => deps.hear(pcm.subarray(msToByte(a), Math.min(pcm.length, msToByte(z + OVERRUN_MS))), lang)
  let cuts, seamsFrom
  if (req.cutsMs) {
    cuts = req.cutsMs.map(Number); seamsFrom = 'caller'
    if (cuts[0] <= 0 || cuts[cuts.length - 1] >= durationMs) return { ok: false, code: 'BAD_CUTS', error: `cutsMs must fall inside the clip (0-${durationMs} ms)` }
  } else {
    const placed = placeSeams(await deps.words(pcm, lang), req.pieces)
    if (placed.refusal) return { ok: false, code: placed.refusal[0], error: placed.refusal[1] }
    const energy = frameEnergy(pcm)
    // Whisper's word times run early or late by up to ~200 ms, so a seam is SEARCHED, not trusted: the quiet points near
    // each word gap are tried left to right, and the one where this piece AND everything after it are heard back best wins.
    cuts = []; seamsFrom = 'whisper+search'
    let start = 0
    for (let i = 0; i < placed.seams.length; i++) {
      const s = placed.seams[i]
      const rest = req.pieces.slice(i + 1).join(' ')
      let best = null
      for (const c of seamCandidates(energy, s.gapFromMs, s.gapToMs)) {
        if (c - start < MIN_PIECE_MS || durationMs - c < MIN_PIECE_MS) continue
        const score = similarity(await hearSpan(start, c), req.pieces[i]) + similarity(await hearSpan(c, durationMs), rest)
        if (!best || score > best.score) best = { c, score }
      }
      const c = best ? best.c : quietestNear(energy, s.gapFromMs, s.gapToMs)
      cuts.push(c); start = c
    }
  }
  const spans = spansFrom(cuts, durationMs)
  const pieces = []
  for (let i = 0; i < spans.length; i++) {
    const [startMs, endMs] = spans[i]
    const text = req.pieces[i]
    if (endMs - startMs < MIN_PIECE_MS) { pieces.push({ text, startMs, endMs, heard: null, sim: 0, verified: false, why: `shorter than ${MIN_PIECE_MS} ms` }); continue }
    const heard = await hearSpan(startMs, endMs)
    const sim = Math.round(similarity(heard, text) * 100) / 100
    pieces.push({ text, startMs, endMs, heard, sim, verified: sim >= MATCH_MIN, ...(sim < MATCH_MIN ? { why: `heard "${heard}" (${sim})` } : {}) })
  }
  const verified = pieces.every((p) => p.verified)
  const glosses = req.glosses || req.pieces.map(() => null)
  const drillCut = {
    clip: req.sourceAudioId,
    knownClip: req.knownAudioId || null,
    lines: [{ t: [req.pieces.join(' '), 0, durationMs], k: req.knownText ? [req.knownText] : null,
      chunks: pieces.map((p, i) => [p.text, p.startMs, p.endMs, glosses[i] || null]) }],
  }
  return { ok: true, verified, durationMs, seamsFrom, lang, pieces, drillCut }
}

/**
 * The route's whole act. dryRun (default) cuts and verifies, writes nothing. dryRun:false additionally refuses an
 * unverified cut (UNVERIFIED), then files one edit event (deps.recordEdit) and appends the ledger line (deps.ledger).
 * deps also takes clipRow(id) -> { id, course_code, voice_id, text, role } so the edit names the voice the pieces keep.
 */
async function clipCut(req, deps) {
  const row = deps.clipRow ? await deps.clipRow(String(req.sourceAudioId).replace(/\.v\d+$/, '')) : null
  if (deps.clipRow && !row) return { ok: false, code: 'NO_SOURCE', error: `no course_audio row ${req.sourceAudioId}` }
  if (row && row.course_code && req.courseCode && row.course_code !== req.courseCode) return { ok: false, code: 'FOREIGN_SOURCE', error: `clip belongs to ${row.course_code}` }
  const out = await cutClip(req, deps)
  if (!out.ok) return out
  const voiceId = row ? row.voice_id || null : null
  const answer = { ...out, source: { id: req.sourceAudioId, voiceId, text: row ? row.text : null }, dryRun: req.dryRun !== false }
  if (req.dryRun !== false) return answer
  if (!out.verified) return { ...answer, ok: false, code: 'UNVERIFIED', error: 'every piece must be heard back as its own words before the cut is filed' }
  if (!deps.recordEdit) return { ...answer, ok: false, code: 'IDENTITY_REQUIRED', error: 'an applied cut is filed under an editor identity' }
  const line = { at: new Date().toISOString(), courseCode: req.courseCode, podSentenceId: req.podSentenceId || null, method: 'clip-cut', voiceId, drillCut: out.drillCut, pieces: out.pieces, seamsFrom: out.seamsFrom }
  const eventId = await deps.recordEdit({ scope: { podSentenceId: req.podSentenceId || null, sourceAudioId: req.sourceAudioId }, detail: line })
  if (deps.ledger) await deps.ledger({ ...line, eventId })
  return { ...answer, eventId }
}

module.exports = { cutClip, clipCut, placeSeams, quietestNear, seamCandidates, frameEnergy, spansFrom, refuseRequest, similarity, bare, MATCH_MIN, MIN_PIECE_MS, OVERRUN_MS, SEAM, WHISPER_LANG }
