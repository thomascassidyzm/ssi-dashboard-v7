/**
 * pod-cast-gate.cjs — is this pod CAST CORRECTLY? (2026-08-23, extended 2026-08-24)
 *
 * Tom's ruling of 2026-08-23, verbatim: "there's always male talking to female,
 * so that two voices can actually do the whole thing, rather than per character,
 * which was the problem previously." Casting is PER CONVERSATION, and the estate's
 * acceptance criterion is two numbers:
 *
 *     ZERO same-voice exchange pairs, and EXACTLY TWO voices in the cast.
 *
 * All 21 staged Group 2 pods measure zero today. This module is the ONE place
 * that measures it, so the flip path and the recast path cannot drift apart on
 * what "cast" means.
 *
 * IT IS A MEASUREMENT, NOT A SOLVER. The solver is
 * tools/pods/pod1-percall-recast.cjs; this file re-uses its exchange-edge
 * definition (buildExchangeWeights, which drops the enumerated NON_EXCHANGE
 * pairs where two customers order in turn at a shared hub rather than talk to
 * each other) so a pod judged cast-correct here is cast-correct by exactly the
 * rule the recast solved to.
 *
 * The known track is deliberately NOT gated FOR THE TWO-VOICE RULE: the eng_for_*
 * shape is one narrator reading every character's known line, which is a single
 * voice by design and would fail a two-voice rule that has no business being
 * applied to it. The learner hears the CONVERSATION on the target track.
 * Known-side CLIPS are gated — see below.
 *
 * ---------------------------------------------------------------------------
 * 2026-08-24 — THE SIX COLUMNS (ita_for_eng pod-1 scene 15)
 *
 * A listening_pod_sentences row has SIX audio slots:
 *
 *   target_audio_id  known_audio_id                    (whole turn)
 *   sentence_audio_ids  sentence_known_audio_ids  takeg_audio_ids   (split arrays)
 *   explainer_audio_id                                 (explainer)
 *
 * Until today this module measured the STORED CAST MAP plus the two whole-turn
 * columns — two of the six. ita_for_eng pod-1 was staged with its split arrays
 * copied POSITIONALLY from the retired pod-0, whose scene order was different:
 * the whole-turn clips were recast to Ara, the split clips were still pod-0's
 * Eve, and they spoke — and, because podSentenceSplit reads targetText from the
 * split clip's own course_audio.text, PRINTED — a different conversation. The
 * gate counted two voices and went green. Tom: "the gate was looking at the
 * wrong columns." 113 ita rows shipped like that. Root cause:
 * docs/pods/ita-pod1-scene15-two-female-voices-rootcause-2026-08-24.md
 *
 * So when the caller supplies `clips` (id → {text, voice_id}), EVERY id in ALL
 * SIX slots on EVERY row is checked for three things:
 *
 *   (a) ON CAST      — the clip's real voice_id is in the pod's cast for its
 *                      track. Off-cast = FAIL, named by scene/sentence/slot/voice.
 *   (b) OWN ROW      — the clip's real text belongs to THIS row's own text: a
 *                      whole-turn clip must match it, a split clip must be a
 *                      contiguous piece of it, an explainer must quote at least
 *                      one chunk of it.
 *   (c) COHERENT     — a split array's pieces appear IN ORDER and tile enough of
 *                      the row to be that row's split, not another row's.
 *
 * SCRIPT SAFETY IS LOAD-BEARING. The first blast-radius table in the root-cause
 * doc used a Latin-only strip and so reported a false 0% for jpn_for_eng and
 * zho_for_eng — every Japanese and Chinese character fell out of the comparison
 * and everything "matched". `normText` below is Unicode-aware: it folds Latin
 * combining marks only, keeps every other script's letters, marks and numbers
 * intact, and compares on a SPACE-FREE form so scripts that do not put spaces
 * between words compare exactly as well as the ones that do.
 *
 * Legitimate sharing is NOT a failure: two rows (or a seed and a use phrase)
 * pointing at the SAME clip is normal — clips are matched to the row by TEXT,
 * never by exclusive ownership, so sharing passes on both rows.
 *
 * SEVERITY, and why it is not uniform. The five ROW-TEXT slots — both whole-turn
 * columns and all three split arrays — are BLOCKING: what they hold is what the
 * learner hears and, for a split row, reads. `explainer_audio_id` is checked the
 * same way but REPORTED AS A WARNING by default (`explainerBlocking: true` makes
 * it blocking), for two measured reasons, both from the read-only sweep of the
 * 22 live pod-1 courses on 2026-08-24:
 *   - the explainer is a COMPOSITE clip whose voice is `comp:<chunk>+<gloss>`,
 *     and on 5 of 22 courses the gloss half is a legacy narrator
 *     (en-GB-SoniaNeural) that is deliberately not in the pod cast. Cast
 *     membership is not the explainer track's contract.
 *   - its text is not the row's text but a gloss quoting chunks of it, so the
 *     check is quote-membership; ~200 clips fleet-wide quote a SUPERSEDED
 *     wording of their row (spa_mx s6/1 explains "¿Cómo se llama usted?" for a
 *     row that now reads "¿Cómo te llamas?"). That is a real, separate defect —
 *     a stale explainer backlog — and it is reported, but it is not the
 *     split-array defect and must not be able to mask it by making every flip
 *     fail on day one.
 *
 * BACKWARD COMPATIBLE: a caller that passes only {rows, speakers} gets exactly
 * the old behaviour, and `clipCheck: 'skipped'` in the result says so out loud.
 * loadPodForCastCheck now returns `clips` as well, so any caller already going
 * through it gets the six-column check for free.
 *
 * Pure: no DB, no env, no I/O. Callers hand it rows + the pod's stored cast.
 */

'use strict'

const { canonicalSpeakerName } = require('../pod-voice-colour-n.cjs')
const { buildExchangeWeights, norm } = require('./pod1-percall-recast.cjs')

/**
 * A voice id appears both bare and provider-prefixed, in the SAME course and
 * sometimes on the same track (`ara`/`xai_ara`, `es-ES-ElviraNeural`/
 * `azure_es-ES-ElviraNeural`). The cast map stores one form, course_audio often
 * the other, so both prefixes come off before any comparison — stripping only
 * `xai_` made the repair tool's gate call 155 correct Spanish clips off-cast.
 */
const bareVoice = (v) => norm(String(v || '')).replace(/^(xai_|azure_)/, '')

/**
 * A composite clip (the explainer track — services/pod-explainer-composite.cjs)
 * stores its voice as `comp:<chunk voice>+<gloss voice>`. Judging that string
 * against a cast set would call every composite off-cast, so it is split into
 * its real component voices and each is judged on its own.
 */
function voicesOf (voiceId) {
  const raw = String(voiceId || '')
  const body = raw.startsWith('comp:') ? raw.slice(5) : raw
  return body.split('+').map(bareVoice).filter(Boolean)
}

/**
 * Script-safe text normalisation.
 *
 * NFKC first (so half-width kana, presentation forms and compatibility digits
 * compare equal to their canonical selves), then Latin combining marks are
 * folded via NFD — and ONLY the Latin range U+0300–U+036F, because stripping
 * every combining mark would destroy Devanagari, Hebrew and Arabic words. All
 * remaining letters/numbers/marks survive; everything else becomes a space.
 */
function normText (s) {
  return String(s == null ? '' : s)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\[pause\]/gi, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The comparison form. Japanese, Chinese, Thai and friends do not put spaces
 * between words, and a TTS clip's text and a pod row's text disagree about
 * spacing far more often than they disagree about content, so membership is
 * decided on the space-free string. A contiguous piece of a sentence is still a
 * contiguous substring once the spaces are gone, in every script.
 */
const dense = (s) => normText(s).replace(/ /g, '')

/** The six audio slots on a listening_pod_sentences row. */
const SLOTS = [
  { field: 'target_audio_id', side: 'target', kind: 'whole', textField: 'target_text' },
  { field: 'known_audio_id', side: 'known', kind: 'whole', textField: 'known_text' },
  { field: 'sentence_audio_ids', side: 'target', kind: 'split', textField: 'target_text' },
  { field: 'sentence_known_audio_ids', side: 'known', kind: 'split', textField: 'known_text' },
  // takeg_audio_ids are the glued-group takes rendered by tools/render-take-g.cjs:
  // target-side, aligned to glued groups, and legitimately sparse — single-unit
  // groups keep null, so the array does not have to tile the sentence.
  { field: 'takeg_audio_ids', side: 'target', kind: 'split', textField: 'target_text', sparse: true },
  // The explainer is the known-language gloss track: `"chunk". means gloss.` It
  // is not the row's text, so it is checked by the chunks it QUOTES.
  { field: 'explainer_audio_id', side: 'explainer', kind: 'explainer', textField: 'target_text' },
]

/**
 * A split array must tile enough of its own row to be that row's split. Below
 * this fraction the array is reporting on a different sentence even if each
 * piece happens to appear somewhere in this one.
 */
const COVERAGE_FLOOR = 0.6

/** Quoted target chunks inside an explainer text, straight or curly quotes. */
function explainerChunks (text) {
  const out = []
  const re = /["“”„«»]([^"“”„«»]{1,200})["“”„«»]/g
  let m
  while ((m = re.exec(String(text || ''))) !== null) {
    const d = dense(m[1])
    if (d) out.push({ raw: m[1], dense: d })
  }
  return out
}

/**
 * Walk the pieces of a split array through the row's own text, in order.
 * Returns membership + ordering + coverage evidence. Cursor-based, so a piece
 * that only appears EARLIER than a previous piece is an ordering failure rather
 * than a silent pass — that is what an inherited array looks like when the two
 * conversations happen to share a word.
 */
function walkSplit (pieceTexts, rowText) {
  const want = dense(rowText)
  const missing = []
  const outOfOrder = []
  let cursor = 0
  let covered = 0
  for (let i = 0; i < pieceTexts.length; i++) {
    const piece = dense(pieceTexts[i])
    if (!piece) continue // nothing to prove against; counted as unverifiable by the caller
    const at = want.indexOf(piece, cursor)
    if (at >= 0) {
      cursor = at + piece.length
      covered += piece.length
      continue
    }
    // Present, but not after the cursor: the pieces are not in this row's order.
    if (want.includes(piece)) { outOfOrder.push({ index: i, text: pieceTexts[i] }); covered += piece.length; continue }
    missing.push({ index: i, text: pieceTexts[i] })
  }
  return { missing, outOfOrder, coverage: want.length ? covered / want.length : 0, wantLength: want.length }
}

/**
 * The exchange graph's EDGES, positioned — the same adjacencies
 * `buildExchangeWeights` counts, but returned one by one with the row indices
 * they join and the two voices they land on.
 *
 * Added 2026-08-24 for the pod script viewer, which has to draw a violation
 * against a LINE on screen and so needs to know *where* a same-voice exchange
 * is, not just that the pod has one. It deliberately re-uses
 * `buildExchangeWeights` rather than re-walking the rows with its own rule:
 * the NON_EXCHANGE list (two customers ordering in turn at a shared hub, who
 * are not talking to each other) is not exported, so the dropped adjacencies
 * are read back out of that function's own `dropped` report and marked
 * `nonExchange: true` here. One definition of "an exchange", one place.
 *
 * NOTE what this does NOT cover, because the rule does not: a run of
 * consecutive lines by the SAME character is not an exchange edge at all
 * (`a === b` is skipped), so a drill scene where one character speaks ten
 * times in a row on one voice produces zero edges and passes the gate. That
 * is by design for drama — a character may take two turns — but it is exactly
 * the shape Tom heard in ita_for_eng scene 18. The viewer flags same-voice
 * RUNS separately, on top of this; it is a display finding, not a gate rule.
 *
 * @returns {Array<{fromIndex:number,toIndex:number,scene:number|null,a:string,b:string,
 *                  voiceA:string|null,voiceB:string|null,sameVoice:boolean,nonExchange:boolean}>}
 */
function exchangeEdges ({ rows, speakers, track = 'target' }) {
  const cast = speakers || {}
  const cRows = rows || []
  const nameOf = (r) => canonicalSpeakerName(r.speaker)
  const voiceOf = (name) => {
    const e = cast[name] || cast._default
    const t = e && (track === 'target' ? e.target : e.known)
    return t && t.voice_id ? norm(t.voice_id) : null
  }

  const { dropped } = buildExchangeWeights(cRows, nameOf)
  const droppedTags = new Set(dropped.map(d => d.tag))

  const edges = []
  for (let i = 1; i < cRows.length; i++) {
    const prev = cRows[i - 1], cur = cRows[i]
    if (prev.scene_number !== cur.scene_number) continue
    const a = nameOf(prev), b = nameOf(cur)
    if (!a || !b || a === b) continue
    const tag = `${prev.scene_number}:${prev.sentence_number}->${cur.scene_number}:${cur.sentence_number}`
    const voiceA = voiceOf(a), voiceB = voiceOf(b)
    edges.push({
      fromIndex: i - 1,
      toIndex: i,
      scene: cur.scene_number,
      a,
      b,
      voiceA,
      voiceB,
      sameVoice: Boolean(voiceA && voiceB && voiceA === voiceB),
      nonExchange: droppedTags.has(tag),
    })
  }
  return edges
}

/** "s15/1 Diner 1 sentence_audio_ids" — where an issue is, in one readable string. */
const whereIssue = (i) => `s${i.scene}/${i.sentence}${i.speaker ? ` ${canonicalSpeakerName(i.speaker) || i.speaker}` : ''} ${i.slot}`

/**
 * THE ADDRESSING RULE (Tom, 2026-08-24). A same-voice collision is a property of
 * (script × CAST), not of the script. Report one as a bare scene number and it
 * reads as a property of the script alone, so it travels to a course with a
 * different cast and fires on scenes that are perfectly alternated.
 *
 * That is not hypothetical. `docs/pods/cym-n-pod0-aran-self-dialogue-audit-2026-08-23.md`
 * published its findings as a list of scene numbers. Scenes 13 and 14 were on
 * that list, truthfully, because Welsh pod-0 was read by ONE human who voiced
 * both Tourist and Local. Carried to Italian — where Tourist is Ara and Local is
 * Enzo — the same "finding" pointed at two scenes that alternate perfectly.
 * Tom's verdict on those scenes: "this is completely fine - not a problem", and
 * on the tool: "the model that flagged these is clearly not very smart".
 *
 * The rule, verbatim: **any same-voice finding must be reported as
 * (course, scene, speaker-pair, voice), never as a bare scene number.**
 *
 * This is a rule about REPORTING, not about which findings fire. Nothing here
 * changes a verdict; it changes what a verdict says about itself, so that a
 * finding cannot be re-used against a pod it was never measured on.
 *
 * @param {{course:string|null, a:string, b:string, voice:string, turns:number, scenes:number[]}} p
 */
function sameVoiceAddress (p) {
  const where = p.scenes && p.scenes.length
    ? `scene${p.scenes.length === 1 ? '' : 's'} ${p.scenes.join(', ')}`
    : 'scene unknown'
  return `${p.course || 'course unknown'} ${where}: ${p.a}↔${p.b} both on ${p.voice} ` +
    `(${p.turns} turn${p.turns === 1 ? '' : 's'})`
}

/**
 * @param {object} o
 * @param {Array<object>} o.rows the pod's sentence rows, in turn order (global_order).
 *        Needs speaker/scene_number/sentence_number always; for the clip checks
 *        also target_text/known_text and the six audio columns.
 * @param {object|null} o.speakers  listening_pods.speakers — the stored cast.
 * @param {'target'|'known'} [o.track] which track the two-voice rule judges.
 * @param {Object<string,{text:string,voice_id:string}>|null} [o.clips]
 *        every course_audio row referenced by any of the six slots. Omit it and
 *        the clip checks are SKIPPED (old behaviour, reported as such).
 * @param {string|null} [o.course] the course this pod belongs to. REPORTING ONLY —
 *        it changes no verdict. See the addressing rule above; pass it.
 * @returns {{ok:boolean, failures:string[], ...evidence}}
 */
function checkPodCast ({ rows, speakers, track = 'target', clips = null, explainerBlocking = false, course = null }) {
  const cast = speakers || {}
  const nameOf = (r) => canonicalSpeakerName(r.speaker)
  const voiceOf = (name) => {
    const e = cast[name] || cast._default
    const t = e && (track === 'target' ? e.target : e.known)
    return t && t.voice_id ? norm(t.voice_id) : null
  }

  const cRows = rows || []
  const speakersInScript = [...new Set(cRows.map(nameOf).filter(Boolean))].sort()
  const uncast = speakersInScript.filter(n => !voiceOf(n))
  const voicesInUse = [...new Set(speakersInScript.map(voiceOf).filter(Boolean))].sort()

  const { weights } = buildExchangeWeights(cRows, nameOf)

  // Which scenes each exchange pair actually occurs in. Walked separately from
  // buildExchangeWeights, whose return shape belongs to the solver and is left
  // alone — this adds ADDRESSING to a finding, it does not change which pairs
  // fire. Same adjacency rule, so the scene list can never disagree with the
  // pair list.
  const scenesByPair = new Map()
  for (let i = 1; i < cRows.length; i++) {
    const prev = cRows[i - 1], cur = cRows[i]
    if (prev.scene_number !== cur.scene_number) continue
    const a = nameOf(prev), b = nameOf(cur)
    if (!a || !b || a === b) continue
    const key = a < b ? `${a}|${b}` : `${b}|${a}`
    if (!weights.has(key)) continue // a NON_EXCHANGE-dropped adjacency
    if (!scenesByPair.has(key)) scenesByPair.set(key, new Set())
    scenesByPair.get(key).add(cur.scene_number)
  }

  const sameVoicePairs = []
  for (const [key, turns] of weights) {
    const [a, b] = key.split('|')
    const va = voiceOf(a), vb = voiceOf(b)
    if (va && vb && va === vb) {
      sameVoicePairs.push({
        course, a, b, voice: va, turns,
        scenes: [...(scenesByPair.get(key) || [])].sort((x, y) => x - y),
      })
    }
  }

  const failures = []
  if (!cRows.length) failures.push('pod has no sentence rows — nothing to cast')
  if (uncast.length) {
    failures.push(`${uncast.length} speaking character(s) have no ${track} voice in the pod cast: ${uncast.join(', ')}`)
  }
  if (voicesInUse.length !== 2) {
    failures.push(`cast uses ${voicesInUse.length} ${track} voice(s), not 2: [${voicesInUse.join(', ')}] ` +
      '— casting is per conversation (one male, one female), not per character')
  }
  if (sameVoicePairs.length) {
    // ADDRESSED, per the 2026-08-24 rule: course, scene, speaker-pair, voice.
    failures.push(`${sameVoicePairs.length} same-voice exchange pair(s) — a character answering themselves: ` +
      sameVoicePairs.map(sameVoiceAddress).join('; '))
  }

  const { failures: clipFailures, ...clipReport } =
    checkPodClips({ rows: cRows, speakers: cast, clips, explainerBlocking })
  for (const f of clipFailures) failures.push(f)

  return {
    ok: failures.length === 0,
    failures,
    track,
    speakers: speakersInScript,
    voicesInUse,
    uncast,
    sameVoicePairs,
    exchangePairs: weights.size,
    castKeys: Object.keys(cast).sort(),
    ...clipReport,
    // The clip check's own failure lines, kept separate so a caller can report
    // "cast is fine, the clips are not" without re-parsing strings. `failures`
    // above is the merged list `ok` is computed from.
    clipFailures,
  }
}

/**
 * The six-column clip check, on its own so a caller can run (and report) it
 * without the two-voice rule. Same purity contract: rows + cast + clips in,
 * verdict out.
 *
 * @returns {{clipCheck:'skipped'|'ran', failures:string[], clipIssues:Array, clipsSeen:number, slotsSeen:number, unverifiableClips:number, offCastClips:number, wrongRowClips:number, danglingClips:number}}
 */
function checkPodClips ({ rows, speakers, clips, explainerBlocking = false }) {
  const empty = {
    clipCheck: 'skipped',
    failures: [],
    clipWarnings: [],
    clipIssues: [],
    clipsSeen: 0,
    slotsSeen: 0,
    unverifiableClips: 0,
    offCastClips: 0,
    wrongRowClips: 0,
    incoherentSplits: 0,
    danglingClips: 0,
    explainerIssues: 0,
    explainerBlocking,
  }
  if (!clips) return empty

  const cast = { target: new Set(), known: new Set() }
  for (const entry of Object.values(speakers || {})) {
    for (const side of ['target', 'known']) {
      const v = entry && entry[side] && entry[side].voice_id
      if (v) cast[side].add(bareVoice(v))
    }
  }
  // The explainer is one narrator reading the gloss track; it is cast from the
  // pod's own voices but not tied to a track, so it is judged against the union.
  const castAny = new Set([...cast.target, ...cast.known])

  const issues = []
  let clipsSeen = 0, slotsSeen = 0, unverifiable = 0
  const push = (row, field, kind, detail, extra = {}) =>
    issues.push({
      kind,
      scene: row.scene_number,
      sentence: row.sentence_number,
      speaker: row.speaker,
      slot: field,
      detail,
      ...extra,
    })

  for (const row of rows || []) {
    for (const slot of SLOTS) {
      if (!(slot.field in row)) continue // caller did not select this column
      const raw = row[slot.field]
      const ids = slot.kind === 'split'
        ? (Array.isArray(raw) ? raw : []).filter(Boolean)
        : (raw ? [raw] : [])
      if (!ids.length) continue
      slotsSeen++

      const dangling = ids.filter(id => !clips[id])
      for (const id of dangling) {
        push(row, slot.field, 'dangling', `clip ${id} has no course_audio row`, { audio_id: id })
      }
      const present = ids.filter(id => clips[id])
      clipsSeen += present.length

      // ---- (a) on cast -----------------------------------------------------
      const castSet = slot.side === 'explainer' ? castAny : cast[slot.side]
      if (castSet.size) {
        for (const id of present) {
          const vs = voicesOf(clips[id].voice_id)
          if (!vs.length) { unverifiable++; continue }
          const off = vs.filter(v => !castSet.has(v))
          if (off.length) {
            push(row, slot.field, 'off-cast',
              `voice ${off.join('+')} is not in the pod's ${slot.side} cast [${[...castSet].join(', ')}]`,
              { audio_id: id, voice: off.join('+') })
          }
        }
      }

      // ---- (b)/(c) belongs to its own row ----------------------------------
      const rowText = row[slot.textField]
      if (rowText == null) continue // column not selected — cannot judge, do not guess
      const want = dense(rowText)
      if (!want) { unverifiable += present.length; continue }

      if (slot.kind === 'whole') {
        for (const id of present) {
          const got = dense(clips[id].text)
          if (!got) { unverifiable++; continue }
          // Equality is the rule; containment is allowed because a whole-turn
          // clip is sometimes rendered without a trailing vocative or with the
          // punctuation folded differently, and a clip that IS this row's
          // sentence, entire, cannot be another row's conversation.
          if (got !== want && !want.includes(got) && !got.includes(want)) {
            push(row, slot.field, 'wrong-row',
              `clip says ${JSON.stringify(String(clips[id].text).slice(0, 80))} but the row says ${JSON.stringify(String(rowText).slice(0, 80))}`,
              { audio_id: id })
          }
        }
      } else if (slot.kind === 'split') {
        const texts = present.map(id => clips[id].text)
        if (texts.every(t => !dense(t))) { unverifiable += present.length; continue }
        const walk = walkSplit(texts, rowText)
        for (const m of walk.missing) {
          push(row, slot.field, 'wrong-row',
            `piece ${m.index + 1}/${texts.length} ${JSON.stringify(String(m.text).slice(0, 80))} is not part of this row's text ${JSON.stringify(String(rowText).slice(0, 80))}`,
            { audio_id: present[m.index] })
        }
        for (const o of walk.outOfOrder) {
          push(row, slot.field, 'incoherent',
            `piece ${o.index + 1}/${texts.length} ${JSON.stringify(String(o.text).slice(0, 80))} appears out of order in this row`,
            { audio_id: present[o.index] })
        }
        // Coverage only judges the dense split tracks. takeg is legitimately
        // sparse (single-unit groups keep null), so it is exempt.
        if (!slot.sparse && !walk.missing.length && !walk.outOfOrder.length &&
            walk.coverage < COVERAGE_FLOOR) {
          push(row, slot.field, 'incoherent',
            `${texts.length} piece(s) tile only ${Math.round(walk.coverage * 100)}% of this row — ` +
            'a split array that does not cover its own sentence is another row\'s split',
            { coverage: walk.coverage })
        }
      } else if (slot.kind === 'explainer') {
        for (const id of present) {
          const chunks = explainerChunks(clips[id].text)
          if (!chunks.length) { unverifiable++; continue }
          if (!chunks.some(c => want.includes(c.dense))) {
            push(row, slot.field, 'wrong-row',
              `explainer quotes [${chunks.map(c => c.raw).slice(0, 4).join(' | ')}], none of which is in this row's text ${JSON.stringify(String(rowText).slice(0, 80))}`,
              { audio_id: id })
          }
        }
      }
    }
  }

  const count = (k) => issues.filter(i => i.kind === k).length
  const isExplainer = (i) => i.slot === 'explainer_audio_id'
  const blocking = issues.filter(i => explainerBlocking || !isExplainer(i))
  const warned = issues.filter(i => !explainerBlocking && isExplainer(i))

  const lines = (pool) => {
    const out = []
    const summarise = (kind, label) => {
      const hits = pool.filter(i => i.kind === kind)
      if (!hits.length) return
      out.push(`${hits.length} ${label}: ` +
        hits.slice(0, 5).map(h => `${whereIssue(h)} — ${h.detail}`).join('; ') +
        (hits.length > 5 ? `; …and ${hits.length - 5} more` : ''))
    }
    summarise('off-cast', 'clip(s) voiced off the pod cast')
    summarise('wrong-row', 'clip(s) whose text does not belong to their own row')
    summarise('incoherent', 'split array piece(s) incoherent with their own row')
    summarise('dangling', 'audio id(s) with no course_audio row')
    return out
  }

  return {
    clipCheck: 'ran',
    failures: lines(blocking),
    clipWarnings: lines(warned),
    clipIssues: issues,
    clipsSeen,
    slotsSeen,
    unverifiableClips: unverifiable,
    offCastClips: count('off-cast'),
    wrongRowClips: count('wrong-row'),
    incoherentSplits: count('incoherent'),
    danglingClips: count('dangling'),
    explainerIssues: issues.filter(isExplainer).length,
    explainerBlocking,
  }
}

/**
 * Fetch every course_audio row referenced by any of the six slots on `rows`.
 *
 * Chunked `where id = any($1)` with NO ORDER BY, deliberately: ordered
 * course_audio reads have been observed to time out at 8s on this estate, and
 * offset paging would need an ORDER BY to be stable. The result is a map, so
 * the read order is irrelevant.
 */
async function loadClipsForRows (db, rows, chunkSize = 500) {
  const ids = new Set()
  for (const row of rows || []) {
    for (const slot of SLOTS) {
      const raw = row[slot.field]
      if (!raw) continue
      if (Array.isArray(raw)) { for (const id of raw) if (id) ids.add(id) } else ids.add(raw)
    }
  }
  const clips = {}
  const all = [...ids]
  for (let i = 0; i < all.length; i += chunkSize) {
    const chunk = all.slice(i, i + chunkSize)
    const q = await db.query('select id, text, voice_id from course_audio where id = any($1)', [chunk])
    for (const c of q.rows) clips[c.id] = { text: c.text, voice_id: c.voice_id }
  }
  return clips
}

/**
 * Load the rows + cast + clips a check needs, for callers that have a pg client.
 * Callers that already do `checkPodCast(await loadPodForCastCheck(db, id))` get
 * the six-column clip check for free — the extra key rides through the spread.
 */
async function loadPodForCastCheck (db, podId, { withClips = true } = {}) {
  // course_code is selected so that callers doing the idiomatic
  // `checkPodCast(await loadPodForCastCheck(db, id))` get the addressing rule
  // satisfied for free — every same-voice finding names its own course.
  const pod = (await db.query(
    'select id, course_code, speakers from listening_pods where id = $1', [podId])).rows[0]
  if (!pod) return null
  const rows = (await db.query(
    `select id, scene_number, sentence_number, global_order, speaker, known_text, target_text,
            target_audio_id, known_audio_id, sentence_audio_ids, sentence_known_audio_ids,
            takeg_audio_ids, explainer_audio_id
       from listening_pod_sentences where pod_id = $1
      order by global_order, scene_number, sentence_number`, [podId])).rows
  const clips = withClips ? await loadClipsForRows(db, rows) : null
  return { rows, speakers: pod.speakers, clips, course: pod.course_code }
}

module.exports = {
  checkPodCast,
  checkPodClips,
  exchangeEdges,
  sameVoiceAddress,
  loadPodForCastCheck,
  loadClipsForRows,
  normText,
  dense,
  SLOTS,
}
