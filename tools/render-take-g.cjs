#!/usr/bin/env node
/**
 * render-take-g.cjs — render Take G: the gapped per-sentence TARGET take the
 * unified ladder slices every fusion chunk from.
 *
 * Take G = the sentence spoken by its turn's cast voice with a pause forced
 * at every chunk seam. Encoding is PER-PROVIDER (pause-encoding pilot,
 * 2026-07-09, Tom listen-checked and approved):
 *   - xAI voices: seams become ', [pause] ' — the expressive-markup marker is
 *     the only cue that reliably yields >=500ms gaps (punctuation alone gave
 *     ~100-300ms). The marker is inserted HERE, gated on voice.provider ===
 *     'xai' — never a config default — because Azure voices SPEAK "[pause]"
 *     aloud; it must never reach a non-xAI voice. (generatePodAudio's
 *     xAI→Azure fallback can't fire either: it needs a ctx we don't pass.)
 *   - Azure voices: unchanged punctuation seams — word_boundaries already
 *     give the slicer exact spans, no audible gap needed.
 * Any fusion window is then a contiguous slice of this ONE take, internal
 * gaps and all — chunks at every rung come from ms spans, not thousands of
 * per-chunk files. slice-take-g.cjs detects the gaps afterwards and writes
 * target_start_ms/target_end_ms into atom_map_fine.
 *
 * GATE-AND-RETRY (xAI only — pilot first-pass rate was ~52%): each render is
 * measured with ffmpeg silencedetect; it passes when the (units-1) seams all
 * gap >=500ms and NO spurious 200-499ms gap appears inside a chunk. On fail:
 * re-roll (force re-synthesis, same course_audio row), cap 3 attempts; after
 * 3 the best take is kept and the group is marked for sensitive-tier slicing
 * (slice-take-g's detection ladder picks it up; logged + reported).
 *
 * PHONOLOGY GATE (xAI only, same retry loop): xAI's multilingual voices are
 * English-dominant and STOCHASTICALLY read cross-language words with English
 * phonology even with language:'it' sent ('Come stai' → English 'come';
 * language-steering pilot 2026-07-10 — the param is necessary but not
 * sufficient). Each take is whisper auto-detected; a take whose detected
 * language is the course's KNOWN language (or English) instead of the target
 * fails the attempt and re-rolls. Runs only when whisper-cli + model exist
 * locally (else logged once and skipped); a phonology-failed take is never
 * kept as "best" while a passing one exists.
 *
 * The cued text is rebuilt by walking the ORIGINAL sentence text (unit
 * surfaces were punctuation-stripped at authoring): internal punctuation
 * stays with the unit it follows, the terminal mark stays on the last unit —
 * a question renders with question intonation.
 *
 * One render per multi-unit GLUED sentence group (leading interjections glue
 * forward, same as the Lab); single-unit groups keep null (their unit IS the
 * real sentence take). Links land in listening_pod_sentences.takeg_audio_ids
 * (uuid[] aligned to glued groups). Dedup is on the cued text ('[pause]'
 * survives normalizeForAudio), so re-renders never collide with old takes.
 * When a group's link moves to a new clip, its old atom_map_fine spans are
 * CLEARED — they were measured on the replaced audio; the slicer must re-earn
 * every span, so a slice failure reads as null spans, never stale offsets.
 *
 *   PHASE8_NO_LISTEN=1 node tools/render-take-g.cjs <course> [orders] [--dry]
 *
 * TTS costs money — run only under an approved plan.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const { GetObjectCommand } = require('@aws-sdk/client-s3')
const { execFile } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const p8 = require('../services/phases/phase8-audio-v13.cjs')
const { toBcp47 } = require('../services/voice-discovery-service.cjs')

const COURSE = process.argv[2]
const ORDERS = (process.argv[3] || '').split(',').map(Number).filter(Boolean)
const dry = process.argv.includes('--dry')
// --force-azure: re-synthesise azure takes even when the row exists — same
// conflict key so the row id (and links) survive, but the row gains
// word_boundaries, which the slicer prefers over silence detection.
const forceAzure = process.argv.includes('--force-azure')
if (!COURSE) { console.error('usage: render-take-g.cjs <course> [orders] [--dry|--force-azure]'); process.exit(1) }
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ROLE = 'pod_take_g'
const SENTENCE_PUNCT = /[.!?…。！？؟]/
// A seam whose left side already ends in ANY pause-forcing punctuation
// (comma-class or sentence-terminal — a glued interjection ends in ! or .)
// needs no comma added; xAI seams gain the [pause] marker either way.
const PAUSE_PUNCT_END = /[,;:、，；：…—–.!?。！？؟،؛]["”』」)]*$/
const CJK_RE = /[぀-ヿ㐀-䶿一-鿿가-힯]/

// ---- gate parameters (mirror the pilot's measurement exactly) ----
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const GATE_ATTEMPTS = Number(process.env.TAKEG_GATE_ATTEMPTS || 3)
const GATE_BIG_MS = 500   // a real seam gap
const GATE_MID_MS = 200   // a spurious intra-chunk gap the strict slicer could mistake for a seam

// ---- phonology gate (whisper language auto-detect, see header) ----
const WHISPER = process.env.WHISPER || '/opt/homebrew/bin/whisper-cli'
const WHISPER_MODEL = process.env.WHISPER_MODEL || '/tmp/whisper-models/ggml-small.bin'
const PHONO_GATE = fs.existsSync(WHISPER) && fs.existsSync(WHISPER_MODEL)

// ---- same grouping as the Lab / author-window-knowns ----
function atomGroups(targetText, atoms) {
  const text = targetText || ''
  const lower = text.toLowerCase()
  const groups = [[]]
  let cursor = 0
  for (let i = 0; i < atoms.length; i++) {
    const idx = lower.indexOf(atoms[i].target_surface.toLowerCase(), cursor)
    if (i > 0 && idx !== -1 && SENTENCE_PUNCT.test(text.slice(cursor, idx))) groups.push([])
    groups[groups.length - 1].push(atoms[i])
    if (idx !== -1) cursor = idx + atoms[i].target_surface.length
  }
  return groups.filter((g) => g.length)
}
function glueGroups(rawGroups) {
  const groups = []
  let carry = []
  rawGroups.forEach((g, i) => {
    // Only TURN-INITIAL one-unit groups (leading "Ciao!" interjections) glue
    // forward; a mid-turn one-unit group is a real sentence ("Impresioniran
    // sam.") and must stand alone — gluing it swallowed its known take.
    if (groups.length === 0 && g.length === 1 && i < rawGroups.length - 1) { carry.push(...g); return }
    groups.push([...carry, ...g])
    carry = []
  })
  if (carry.length) groups.push(carry)
  return groups
}

/**
 * Rebuild the group's text with a pause forced at every chunk seam, walking
 * the original turn text so existing punctuation survives. Each chunk's
 * slice runs from its own match to just before the NEXT chunk's match (so
 * ", " after a chunk stays with it); the last chunk keeps trailing text
 * through its terminal mark.
 * xAI: every seam gains ' [pause] ' (with a comma first when the seam is
 * bare) — the per-provider guard lives here, see header. Other providers:
 * a bare seam gains a comma (，between CJK); punctuated seams are left alone.
 * Returns null when a chunk can't be located (caller skips + reports).
 */
function cuedGroupText(turnText, group, provider) {
  const lower = turnText.toLowerCase()
  const marks = []
  let cursor = 0
  for (const a of group) {
    const idx = lower.indexOf(a.target_surface.toLowerCase(), cursor)
    if (idx === -1) return null
    marks.push({ start: idx, end: idx + a.target_surface.length })
    cursor = idx + a.target_surface.length
  }
  const pieces = marks.map((m, i) => {
    if (i < marks.length - 1) return turnText.slice(m.start, marks[i + 1].start).trim()
    // last unit: keep trailing punctuation up to (and incl.) the terminal mark
    const tail = turnText.slice(m.start)
    const stop = tail.search(/(?<=[.!?…。！？؟])/)
    return (stop === -1 ? tail : tail.slice(0, stop)).trim()
  })
  let out = ''
  pieces.forEach((piece, i) => {
    if (i === 0) { out = piece; return }
    const cjkSeam = CJK_RE.test(out[out.length - 1] || '') && CJK_RE.test(piece[0] || '')
    if (provider === 'xai') {
      out += (PAUSE_PUNCT_END.test(out) ? ' [pause] ' : cjkSeam ? '，[pause] ' : ', [pause] ') + piece
      return
    }
    if (PAUSE_PUNCT_END.test(out)) out += cjkSeam ? piece : ' ' + piece
    else out += cjkSeam ? '，' + piece : ', ' + piece
  })
  return out
}

/** Interior gaps of a clip, pilot-identical: silencedetect -30dB d=0.08,
 *  lead-in/tail hush (150ms edges) excluded. */
function ffGaps(file) {
  return new Promise((res, rej) => {
    execFile(FFMPEG, ['-i', file, '-af', 'silencedetect=noise=-30dB:d=0.08', '-f', 'null', '-'],
      { maxBuffer: 1 << 22 }, (err, _o, stderr) => {
        if (err && !/silencedetect/.test(stderr || '')) return rej(err)
        const sil = []
        const re = /silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g
        let m
        while ((m = re.exec(stderr))) sil.push({ start: +m[1] * 1000, end: +m[2] * 1000 })
        const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(stderr)
        const durMs = d ? (+d[1] * 3600 + +d[2] * 60 + +d[3]) * 1000 : null
        const gaps = sil.filter((x) => x.start > 150 && (!durMs || x.end < durMs - 150))
          .map((x) => Math.round(x.end - x.start))
        res({
          gaps,
          big: gaps.filter((l) => l >= GATE_BIG_MS).length,
          mid: gaps.filter((l) => l >= GATE_MID_MS && l < GATE_BIG_MS).length,
        })
      })
  })
}

/** Download the freshly-stored clip and measure its gaps. Null = clip row or
 *  audio unreachable (keep the take; the slicer will pass its own judgment). */
async function measureClip(audioId, tmp, attempt) {
  const { data: clip } = await supabase.from('course_audio').select('s3_key, duration_ms').eq('id', audioId).single()
  if (!clip || !clip.s3_key) return null
  const f = path.join(tmp, `${audioId}-a${attempt}.mp3`)
  try {
    const res = await p8.s3.send(new GetObjectCommand({ Bucket: p8.S3_BUCKET, Key: clip.s3_key }))
    await fs.promises.writeFile(f, Buffer.from(await res.Body.transformToByteArray()))
    return { ...(await ffGaps(f)), s3Key: clip.s3_key, durationMs: clip.duration_ms, file: f }
  } catch (e) {
    console.log(`  gate measure ${audioId}: ✗ ${e.message.slice(0, 80)}`)
    return null
  }
}

/** Whisper auto-detect the clip's language. Null = detection unavailable
 *  (whisper error / no match) — treated as unchecked, never as a fail. */
function detectClipLang(mp3) {
  return new Promise((res) => {
    const wav = mp3.replace(/\.mp3$/, '.wav')
    execFile(FFMPEG, ['-y', '-i', mp3, '-ar', '16000', '-ac', '1', wav], (err) => {
      if (err) return res(null)
      execFile(WHISPER, ['-m', WHISPER_MODEL, '-l', 'auto', '-nt', '-t', String(process.env.WHISPER_THREADS || 4), '-f', wav],
        { encoding: 'utf8', maxBuffer: 1 << 22 }, (e, _o, stderr) => {
          const m = /auto-detected language: (\w+)/.exec(stderr || '')
          res(m ? m[1] : null)
        })
    })
  })
}

// closest to the exact seam count wins; spurious mid gaps break ties; a
// phonology fail loses to ANY gap outcome (a wrong-language take is unusable)
const gateScore = (m, need) => (m.phonoFail ? -1000 : 0) - (Math.abs(m.big - need) * 10 + m.mid)

;(async () => {
  const { data: pod } = await supabase.from('listening_pods').select('speakers').eq('id', `${COURSE}:pod-0`).single()
  if (!pod || !pod.speakers) { console.error(`ERR: no speakers cast on ${COURSE}:pod-0`); process.exit(1) }
  const { data: course } = await supabase.from('courses').select('voice_config').eq('course_code', COURSE).single()
  const targetLang = (((course || {}).voice_config || {}).voices || {}).target1?.language || COURSE.split('_')[0]

  // Phonology gate: a take is suspect when whisper detects the course's KNOWN
  // language (or English, the voices' dominant language) instead of the target.
  const targetBase = toBcp47(targetLang).split('-')[0]
  const knownBase = toBcp47(COURSE.split('_for_')[1] || 'eng').split('-')[0]
  const SUSPECT_LANGS = new Set(['en', knownBase].filter((l) => l && l !== targetBase))
  console.log(PHONO_GATE && SUSPECT_LANGS.size
    ? `phonology gate ON: re-roll when whisper detects ${[...SUSPECT_LANGS].join('/')} instead of ${targetBase}`
    : `phonology gate OFF (${SUSPECT_LANGS.size ? 'whisper-cli or model missing — takes unchecked for language drift' : 'target is the known language'})`)

  let q = supabase.from('listening_pod_sentences')
    .select('id, global_order, speaker, target_text, atom_map_fine, takeg_audio_ids')
    .eq('pod_id', `${COURSE}:pod-0`).order('global_order')
  if (ORDERS.length) q = q.in('global_order', ORDERS)
  const { data: sents, error } = await q
  if (error) { console.error(error.message); process.exit(1) }

  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'takeg-gate-'))
  let rendered = 0, reused = 0, singles = 0, failed = 0, turnsLinked = 0
  let gatePassed = 0, gateSensitive = 0, gateUnmeasured = 0, phonoRerolls = 0
  const gateLog = []

  async function processTurn(s) {
    const atoms = (s.atom_map_fine || []).filter((a) => a.kind !== 'note')
    if (!atoms.length) return
    const groups = glueGroups(atomGroups(s.target_text, atoms))
    const voice = p8.resolvePodSpeakerVoice(pod.speakers, s.speaker, 'target')
    if (!voice) { console.log(`S${s.global_order}: ✗ no target voice for speaker "${s.speaker}"`); failed++; return }

    const ids = []
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      if (g.length < 2) { ids.push(null); singles++; continue }
      const cued = cuedGroupText(s.target_text, g, voice.provider)
      if (!cued) { console.log(`S${s.global_order}: ✗ unit not found in turn text — group skipped`); failed++; ids.push(null); continue }
      if (dry) { console.log(`S${s.global_order} [${s.speaker}→${voice.voice_id}]: "${cued}"`); ids.push(null); continue }
      const need = g.length - 1
      try {
        let id = null
        if (voice.provider !== 'xai') {
          // Azure & friends: word boundaries are the exactness guarantee — no gap gate.
          const force = forceAzure && voice.provider === 'azure'
          const res = await p8.generatePodAudio({ courseCode: COURSE, text: cued, language: targetLang, role: ROLE, voice, force })
          res.reused ? reused++ : rendered++
          id = res.id
        } else {
          let best = null
          for (let attempt = 1; attempt <= GATE_ATTEMPTS; attempt++) {
            // attempt 1 may reuse an existing (already-gated) row — measuring a
            // reused clip is free; re-rolls force fresh synthesis on the same row.
            const res = await p8.generatePodAudio({ courseCode: COURSE, text: cued, language: targetLang, role: ROLE, voice, force: attempt > 1 })
            res.reused ? reused++ : rendered++
            id = res.id
            const m = await measureClip(id, tmp, attempt)
            if (!m) {
              gateUnmeasured++
              gateLog.push({ turn: s.global_order, group: gi, id, units: g.length, verdict: 'unmeasured', attempts: attempt })
              break
            }
            const detected = PHONO_GATE && SUSPECT_LANGS.size ? await detectClipLang(m.file) : null
            const phonoFail = !!(detected && SUSPECT_LANGS.has(detected))
            if (phonoFail) {
              phonoRerolls++
              console.log(`S${s.global_order} g${gi} attempt ${attempt}: phonology FAIL — whisper detected '${detected}' for "${cued.slice(0, 40)}" → re-roll`)
            }
            const cand = { ...m, attempt, phonoFail, detected }
            if (!best || gateScore(cand, need) > gateScore(best, need)) best = cand
            if (m.big === need && m.mid === 0 && !phonoFail) {
              gatePassed++
              gateLog.push({ turn: s.global_order, group: gi, id, units: g.length, verdict: 'pass', attempts: attempt, gaps: m.gaps, detected })
              break
            }
            if (attempt === GATE_ATTEMPTS) {
              gateSensitive++
              // keep the BEST take, not the last: point the row back at it
              if (best.attempt !== attempt) {
                const { error: rerr } = await supabase.from('course_audio')
                  .update({ s3_key: best.s3Key, duration_ms: best.durationMs }).eq('id', id)
                if (rerr) console.log(`S${s.global_order} g${gi}: best-take restore failed — ${rerr.message}`)
              }
              console.log(`S${s.global_order} g${gi}: gate FAIL after ${GATE_ATTEMPTS} takes — kept attempt ${best.attempt} (${best.big}/${need} seam gaps, ${best.mid} spurious${best.phonoFail ? `, phonology '${best.detected}'` : ''}) → sensitive-tier slicing`)
              gateLog.push({ turn: s.global_order, group: gi, id, units: g.length, verdict: best.phonoFail ? 'phonology-fail' : 'sensitive-tier', attempts: GATE_ATTEMPTS, kept: best.attempt, gaps: best.gaps, detected: best.detected })
            }
          }
        }
        ids.push(id)
      } catch (e) {
        console.log(`S${s.global_order} g${gi} [${voice.provider}/${voice.voice_id}] "${cued.slice(0, 50)}": ✗ ${e.message.slice(0, 140)}`)
        failed++; ids.push(null)
      }
    }
    if (!dry && ids.some(Boolean)) {
      const prev = s.takeg_audio_ids || []
      const update = { takeg_audio_ids: ids }
      // A group whose link moved to a NEW clip carries spans measured on the
      // old audio — clear them so the slicer must re-earn every span.
      const moved = groups.map((g, gi) => g.length >= 2 && ids[gi] && ids[gi] !== prev[gi])
      if (moved.some(Boolean)) {
        const map = s.atom_map_fine.slice()
        const mapIdx = []
        s.atom_map_fine.forEach((a, i) => { if (a.kind !== 'note') mapIdx.push(i) })
        let off = 0
        groups.forEach((g, gi) => {
          if (moved[gi]) for (let ui = 0; ui < g.length; ui++) {
            const mi = mapIdx[off + ui]
            map[mi] = { ...map[mi], target_start_ms: null, target_end_ms: null }
          }
          off += g.length
        })
        update.atom_map_fine = map
      }
      const { error: werr } = await supabase.from('listening_pod_sentences').update(update).eq('id', s.id)
      if (werr) { console.log(`S${s.global_order}: LINK FAIL ${werr.message}`); failed++; return }
      turnsLinked++
    }
  }

  const CONC = Number(process.env.RENDER_CONC || 6)
  let next = 0
  const worker = async () => { while (next < (sents || []).length) await processTurn(sents[next++]) }
  await Promise.all(Array.from({ length: Math.min(CONC, (sents || []).length) }, worker))
  await fs.promises.rm(tmp, { recursive: true, force: true })
  if (!dry && gateLog.length) {
    const logFile = path.join(__dirname, '..', 'scripts', `takeg-gate-${COURSE}.json`)
    fs.writeFileSync(logFile, JSON.stringify({
      course: COURSE, gatePassed, gateSensitive, gateUnmeasured, phonoRerolls, rendered, reused, groups: gateLog,
    }, null, 2))
    console.log(`gate log → ${logFile}`)
  }
  console.log(`\n${dry ? '[DRY] ' : ''}${COURSE}: ${rendered} rendered, ${reused} reused, ${singles} single-unit groups (no Take G), ${failed} failed; ` +
    `gate: ${gatePassed} passed, ${gateSensitive} sensitive-tier, ${gateUnmeasured} unmeasured, ${phonoRerolls} phonology re-rolls; ${turnsLinked} turns linked.`)
  process.exit(failed ? 2 : 0)
})().catch((e) => { console.error('ERR:', e.message); console.error(e.stack); process.exit(1) })
