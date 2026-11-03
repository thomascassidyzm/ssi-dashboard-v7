/**
 * POD DRILL CUTS, pure half (job #913). No I/O. run.mjs does the fetching, ffmpeg and whisper.
 *
 * Tom's rulings this implements:
 *  - r-2026-10-29-drill-mode-chunk-size-is-measured: chunks of at most 4 syllables, split at word
 *    boundaries; each chunk drilled target, known, target, target, then the whole line.
 *  - r-2026-10-29-drill-chunks-are-measured-in-syllables: aim 2-3 in the first scenes; 4-5 only
 *    when the meaning will not split; hard ceiling 6; idioms that only mean something whole stay whole.
 *  - r-2026-10-24-ssi-audio-a-drill-clip-is: a chunk is CUT from the sentence's own recording.
 *
 * A seam is VERIFIED only when the recording itself has a low-energy run there wide enough to
 * absorb the player's stop latency, AND every chunk sliced at those seams transcribes back to its
 * own words. A sentence slices only when every one of its seams and chunks verifies; anything
 * less plays whole, as it does today.
 */

/**
 * Cognitive LOAD, not syllables (r-2026-10-30-pod-drill-chunk-size-is-a, Tom: "relax the rule of
 * the syllables ... make it more of a heuristic. We want to keep the cognitive load down ... if
 * it's a cognate ... you could have a five or six syllable word there, and it's fine ... in
 * Chinese, a syllable carries a lot more information ... imparando ... four syllables, but it's
 * really one thing"). Decided HERE, at build time, and stored; the player never re-judges.
 *
 * A word's load: a cognate of a word in its own English line, or a name, is 1 (the learner already
 * owns it); any other word is its syllables up to 2, then a quarter per syllable beyond (one word
 * is one meaning however long it runs: imparando = 2.5). Chinese: 1.25 per syllable, because each
 * one carries a word's worth of meaning. A piece fits when its load is within the scene's budget;
 * a single word or kept-whole idiom always fits. Lines (sentences) are never joined.
 */
export const LOAD = { earlyScenes: 3, budgetEarly: 6, budgetLater: 7, mergeSlack: 1.5, zhoPerSyllable: 1.25 }
export const RULE = LOAD
export const limitsFor = (scene) => {
  const budget = scene <= LOAD.earlyScenes ? LOAD.budgetEarly : LOAD.budgetLater
  return { aim: budget, ceiling: budget + LOAD.mergeSlack }
}

const foldWord = (w) => String(w || '').toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/^[a-z]{1,3}['\u2019]/u, '').replace(/[^a-z]/g, '')

/** Is `word` a cognate of any word in `knownWords` (its own English line)? Letters folded, an
 *  elided article dropped ("l'italiano" -> italiano ~ Italian, Londra ~ London). */
export function isCognate(word, knownWords) {
  const w = foldWord(word)
  if (w.length < 4) return false
  for (const k of knownWords || []) {
    const e = foldWord(k)
    if (e.length < 4) continue
    let p = 0
    while (p < w.length && p < e.length && w[p] === e[p]) p++
    if (p >= 5 || similarity(w, e) >= 0.6) return true
  }
  return false
}

/** Load of one word (see LOAD). `first` = sentence-initial, where a capital proves nothing. */
export function wordLoad(word, syl, lang, knownWords, first = false) {
  if (lang === 'zho') return Math.max(1, syl) * LOAD.zhoPerSyllable
  const bare = String(word || '').replace(/^[^\p{L}]+/u, '')
  const name = !first && /^\p{Lu}/u.test(bare)
  if (name || isCognate(word, knownWords)) return 1
  const n = Math.max(1, syl)
  return n <= 2 ? n : 2 + (n - 2) * 0.25
}

/** Word indices split into LINES at sentence-final punctuation ("Sì, certo." | "Sono infermiera."). */
export const SENTENCE_END = /[.!?…。！？؟]["'”»)]*$/u
export function splitLines(words) {
  const lines = []
  let from = 0
  words.forEach((w, i) => { if (SENTENCE_END.test(w) || i === words.length - 1) { lines.push({ from, to: i }); from = i + 1 } })
  return lines.filter((l) => l.to >= l.from)
}

/** A line's English: the known text split into sentences, one per target line, or null when the
 *  counts disagree (then no English is cut for the lines). */
export function splitKnownLines(known, n) {
  // CJK full stops (。！？) end a sentence with no space after them; they never occur in a
  // space-delimited known side, so an English split is unchanged (r-2026-11-03-say-known-language)
  const parts = String(known || '').split(/(?<=[.!?…])\s+|(?<=[。！？])\s*/u).map((x) => x.trim()).filter(Boolean)
  return parts.length === n ? parts : null
}

/** Kept-whole idioms: a starting list (the #657 Italian list plus the obvious set phrases). */
export const IDIOMS = {
  ita: ['per favore', 'come stai', 'come sta', 'molto piacere', 'piacere di conoscerti', 'piacere di conoscerla', 'a presto', 'ci vediamo dopo', 'di niente', 'mi dispiace', "non c'è problema", 'grazie mille', 'buon appetito', 'a dopo'],
  spa: ['por favor', 'de nada', 'lo siento', 'mucho gusto', 'hasta luego', 'hasta pronto', 'buenos días', 'buenas tardes', 'buenas noches', 'qué tal', 'muchas gracias', 'buen provecho', 'no pasa nada'],
  deu: ['guten morgen', 'guten tag', 'guten abend', 'gute nacht', 'bis später', 'bis bald', 'vielen dank', 'danke schön', 'bitte schön', 'wie geht', 'es tut mir leid', 'kein problem', 'guten appetit', 'na ja'],
  zho: [],
}

/** Words a chunk should not END on: articles, prepositions, clitics, conjunctions, auxiliaries. */
const WEAK_END = {
  ita: 'il lo la le i gli un uno una di a da in con su per tra fra e ed o ma che non mi ti si ci vi ne l dell dello della dei degli delle al allo alla ai agli alle col nel nello nella sul sulla sono è ho hai ha',
  spa: 'el la los las un una unos unas de a en con por para y e o u que no me te se nos os lo le les del al su sus mi tu es he ha has',
  deu: 'der die das den dem des ein eine einen einem einer und oder aber zu in im an am auf mit von vom für bei nach ich du er sie es wir ihr nicht ist bin bist hat habe hast sind kein keine',
  zho: '的 了 在 和 是 我 你 他 她 很 也 都 不 这 那 一',
}
const weakEnd = (lang) => new Set((WEAK_END[lang] || '').split(' '))
/** The weakest endings of all: an article or preposition left hanging ("Questa è una |"). */
const DANGLING = {
  ita: 'il lo la le i gli un uno una l di a da in con su per tra fra dell dello della dei degli delle al allo alla ai agli alle nel nello nella sul sulla due tre quattro cinque mio mia miei mie tuo tua suo sua questo questa questi queste quel quella molto più',
  spa: 'el la los las un una unos unas de a en con por para del al dos tres cuatro cinco mi tu su mis tus sus este esta estos estas ese esa otro otra muy justo más',
  deu: 'der die das den dem des ein eine einen einem einer zu in im an am auf mit von vom für bei nach zwei drei vier fünf mein meine dein deine sein seine sehr',
  zho: '',
}
/** Words a piece should not START on (Chinese particles that belong to what precedes them). */
const NO_START = { zho: '的 了 吗 呢 吧 得 地 过 着 里 们' }
const noStart = (lang) => new Set((NO_START[lang] || '').split(' ').filter(Boolean))
const dangling = (lang) => new Set((DANGLING[lang] || '').split(' '))

export const norm = (w) => String(w || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}']/gu, '')

/** Glue idiom words into one token so they cannot be cut. */
export function tokenise(words, idioms = []) {
  const toks = []
  const n = words.map(norm)
  for (let i = 0; i < words.length;) {
    let hit = 0
    for (const idm of idioms) {
      const iw = idm.split(' ')
      if (iw.length > hit && iw.every((w, k) => n[i + k] === w)) hit = iw.length
    }
    const len = hit || 1
    toks.push({ from: i, len })
    i += len
  }
  return toks
}

/**
 * Split a run of words (inside one line) at word boundaries by LOAD (see LOAD). A piece fits when
 * it is one token (a word or a kept-whole idiom) or its load is within `lim.aim`. Fewer, fuller
 * pieces win (a line that fits stays whole: chunks too small bore the learner); a piece should not
 * end on a weak word (article, preposition, clitic) and prefers to end at a comma. Returns
 * [{from, to (inclusive word indices), syl, load, reason}]; reason is set on a piece over budget.
 */
export function splitRun(words, sylOf, lim, lang, knownWords = [], firstIsInitial = true, prefer = new Set()) {
  const toks = tokenise(words, IDIOMS[lang] || [])
  const weak = weakEnd(lang)
  const dang = dangling(lang)
  const nost = noStart(lang)
  const n = toks.length
  const tokWords = (t) => words.slice(t.from, t.from + t.len)
  const s = toks.map((t) => tokWords(t).reduce((a, w) => a + sylOf(w), 0))
  const ld = toks.map((t) => tokWords(t).reduce((a, w, k) => a + wordLoad(w, sylOf(w), lang, knownWords, firstIsInitial && t.from + k === 0), 0))
  const sum = (arr, j, i) => arr.slice(j, i).reduce((a, b) => a + b, 0)
  const best = Array(n + 1).fill(null)
  best[0] = { cost: 0, prev: -1 }
  for (let i = 1; i <= n; i++) {
    for (let j = i - 1; j >= 0; j--) {
      const cnt = i - j, load = sum(ld, j, i)
      if (!(cnt === 1 || load <= lim.aim)) break
      if (!best[j]) continue
      let cost = best[j].cost + 100 + Math.max(0, lim.aim - 1 - load) ** 2
      if (load <= 1 && n > 1) cost += 45
      const lastTok = toks[i - 1]
      const last = words[lastTok.from + lastTok.len - 1]
      if (i < n && weak.has(norm(last))) cost += 90
      if (i < n && dang.has(norm(last))) cost += 60
      if (i < n && nost.size && [...nost].some((p) => String(words[toks[i].from]).startsWith(p))) cost += 120
      if (i < n && /[,;:，、；：]$/.test(last)) cost -= 40
      if (i < n && prefer.has(lastTok.from + lastTok.len - 1)) cost -= 50
      if (!best[i] || cost < best[i].cost) best[i] = { cost, prev: j }
    }
  }
  const cuts = []
  for (let i = n; i > 0; i = best[i].prev) cuts.unshift(i)
  const out = []
  let from = 0
  for (const c of cuts) {
    const syl = sum(s, from, c), load = Math.round(sum(ld, from, c) * 100) / 100
    const reason = load <= lim.aim ? null : toks[from].len > 1 ? 'idiom kept whole' : 'one word, cannot be cut'
    out.push({ from: toks[from].from, to: toks[c - 1].from + toks[c - 1].len - 1, syl, load, reason })
    from = c
  }
  return out
}

/** Align authored chunk texts onto the timing words, in order: [firstIdx, lastIdx] per chunk, or null. */
export function alignChunks(chunkWordLists, timingWords) {
  const tw = timingWords.map(norm)
  let at = 0
  return chunkWordLists.map((ws) => {
    const nw = ws.map(norm).filter(Boolean)
    if (!nw.length) return null
    for (let start = at; start < tw.length; start++) {
      if (tw[start] !== nw[0]) continue
      let k = 0
      while (k < nw.length && tw[start + k] === nw[k]) k++
      if (k === nw.length) { at = start + nw.length; return [start, start + nw.length - 1] }
    }
    return null
  })
}

/** Join word tokens for display: no spaces in Chinese. */
export const joinWords = (ws, lang) => (lang === 'zho' ? ws.join('') : ws.join(' '))

/**
 * The pieces one card is cut into, LINE BY LINE: every sentence of a turn is its own line (drilled
 * on its own, r-2026-10-30 spec), and inside a line the load rule decides whether it splits.
 * Authored chunk boundaries are kept where they still match the clip's words (only a run over
 * budget is re-split); a chunk that survives whole keeps its authored gloss. `words` are the
 * timing words of the sentence's own clip. Returns [{line, from, to, text, syl, load, reason,
 * gloss, origin}] in order; `line` indexes splitLines(words).
 */
export function planCard(card, words, sylOf, lang) {
  const lim = limitsFor(card.scene)
  const lines = splitLines(words)
  const knownLines = splitKnownLines(card.known, lines.length)
  let runs = [{ from: 0, to: words.length - 1, gloss: null }]
  if (card.kind === 'fusion' && card.chunks.length > 1) {
    const lists = card.chunks.map((c) => (lang === 'zho' ? segmentZh(c.text) : c.text.trim().split(/\s+/)).filter((w) => norm(w)))
    const sp = alignChunks(lists, words)
    if (sp.every(Boolean)) {
      runs = sp.map((x, k) => ({ from: k === 0 ? 0 : sp[k - 1][1] + 1, to: k === sp.length - 1 ? words.length - 1 : x[1], gloss: card.chunks[k].gloss || null }))
    }
  }
  const out = []
  lines.forEach((ln, li) => {
    const knownWords = String(knownLines ? knownLines[li] : card.known || '').split(/\s+/)
    // Authored chunk ends are PREFERRED cut points, never forced: a line that fits the budget stays
    // whole however finely it was authored (tiny chunks bore the learner).
    const prefer = new Set(runs.filter((r) => r.to >= ln.from && r.to < ln.to).map((r) => r.to - ln.from))
    const ws = words.slice(ln.from, ln.to + 1)
    const pieces = splitRun(ws, sylOf, lim, lang, knownWords, true, prefer)
    for (const p of pieces) {
      const from = ln.from + p.from, to = ln.from + p.to
      const authored = runs.find((r) => r.from === from && r.to === to)
      out.push({
        line: li, from, to, syl: p.syl, load: p.load, reason: p.reason,
        text: joinWords(words.slice(from, to + 1), lang).replace(/[,.;:!?¡¿，。！？、；：…]+$/u, '').replace(/^[¡¿]+/u, ''),
        gloss: authored ? authored.gloss : null,
        origin: pieces.length === 1 ? 'whole' : authored && runs.length > 1 ? 'authored' : 'new-cut',
      })
    }
  })
  return out
}

/** Does this plan cut anything? Two or more lines, or a line in two or more pieces. */
export const planCuts = (pieces) => pieces.length >= 2

/** The course's KNOWN language, from its code <target>_for_<known> (ita_for_eng → eng,
 *  eng_for_jpn → jpn). Tom r-2026-11-03-say-known-language: "not English - known, it may not be
 *  English". Every known-side call in these tools takes this, never a hard-coded 'eng'. */
export function knownLangOf(course) {
  const k = String(course || '').split('_for_')[1]
  if (!k) throw new Error(`course code "${course}" has no _for_<known> part, so its known language is unknown`)
  return k
}
/** Display names for prompts and logs; an unlisted code is shown as itself. */
export const LANG_NAMES = { eng: 'English', ita: 'Italian', spa: 'Spanish', deu: 'German', fra: 'French', zho: 'Chinese', jpn: 'Japanese', kor: 'Korean', hin: 'Hindi', cym: 'Welsh', por: 'Portuguese', nld: 'Dutch', ara: 'Arabic', gle: 'Irish', eus: 'Basque', bre: 'Breton', cor: 'Cornish', gla: 'Scottish Gaelic' }
export const langName = (lang) => LANG_NAMES[lang] || lang
/** whisper-cli -l codes, for the tools that still transcribe (run.mjs, page.mjs, apply-pod-seams.mjs). */
export const WHISPER_LANG = { eng: 'en', ita: 'it', spa: 'es', deu: 'de', zho: 'zh', fra: 'fr', jpn: 'ja', kor: 'ko', hin: 'hi', cym: 'cy', por: 'pt', nld: 'nl', ara: 'ar', gle: 'ga', eus: 'eu', bre: 'br' }
/** Scripts written without spaces between words and with no segmenter vetted here. Splitting
 *  them on spaces gives one "word" per sentence and cuts nonsense, so wordsIn refuses them. */
const UNSPACED = new Set(['jpn', 'tha', 'lao', 'khm', 'mya', 'bod'])
/** A sentence's words in `lang`: ICU segmentation for Chinese, whitespace for spaced scripts.
 *  Throws for an unspaced script with no segmenter (Japanese): stop loudly, never cut nonsense. */
export function wordsIn(text, lang) {
  if (lang === 'zho') return segmentZh(text)
  if (UNSPACED.has(lang)) throw new Error(`no word segmenter for ${langName(lang)} (${lang}): these tools cannot find word boundaries in it, so they refuse rather than cut every sentence as one word`)
  return String(text || '').trim().split(/\s+/).filter(Boolean)
}

/** Chinese word segmentation (ICU), punctuation folded onto the previous word. */
export function segmentZh(text) {
  const seg = new Intl.Segmenter('zh', { granularity: 'word' })
  const out = []
  for (const s of seg.segment(text || '')) {
    if (s.isWordLike) out.push(s.segment)
    else if (out.length && s.segment.trim()) out[out.length - 1] += s.segment.trim()
  }
  return out
}

/** 10 ms frame energies in dBFS (3-frame max-smoothed, so one quiet frame inside a word is not a
 *  gap) from 16 kHz mono s16le PCM. `zcr` rides on the array: zero crossings per sample, high for
 *  a hissing /s/ or /f/ that is quiet by energy alone but is still a sound. */
export function frameDb(pcm, rate = 16000, frameMs = 10) {
  const n = Math.floor((rate * frameMs) / 1000)
  const view = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2))
  const raw = [], zcr = []
  for (let i = 0; i + n <= view.length; i += n) {
    let acc = 0, z = 0
    for (let k = i; k < i + n; k++) { acc += view[k] * view[k]; if (k > i && (view[k] >= 0) !== (view[k - 1] >= 0)) z++ }
    const rms = Math.sqrt(acc / n) / 32768
    raw.push(rms > 0 ? 20 * Math.log10(rms) : -120)
    zcr.push(z / n)
  }
  const out = raw.map((_, i) => Math.max(raw[Math.max(0, i - 1)], raw[i], raw[Math.min(raw.length - 1, i + 1)]))
  out.zcr = zcr.map((_, i) => Math.max(zcr[Math.max(0, i - 1)], zcr[i], zcr[Math.min(zcr.length - 1, i + 1)]))
  return out
}

export const percentile = (a, p) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor((b.length - 1) * p)] }

/** Seam test thresholds.
 *  QUIET_BELOW: dB below the clip's speech level (its 90th percentile frame) that counts as quiet.
 *  MIN_GAP_MS: a quiet run must be at least this wide, so the player's stop latency stays silent.
 *  TOUCH_MS: the quiet run must touch the timing words' own boundary within this much. Tight on
 *    purpose: an Italian double consonant ("latte") is a silent closure INSIDE a word, and a wider
 *    search picked one in testing ("Con la|tte").
 *  SILENT_BELOW / HISS_ZCR: a frame only SILENT_BELOW under speech counts as quiet whatever it
 *    sounds like; a frame between QUIET_BELOW and that must also not hiss (zero-crossing rate), so
 *    the /s/ of "stanca" is never taken for a gap (it was, in testing: "Tanka adesso").
 *  SPEECH_SIDE_MS: a seam needs at least this much speech on each side, so the silence before
 *    the first word or after the last is never taken for one ("Ma parliamo sabato | [silence]").
 *  DIP_BELOW / DIP_MS: connected speech has no silence between words; there a seam is allowed
 *    only at an energy dip this far below speech level within DIP_MS of the timing boundary, and
 *    it then rests entirely on both neighbouring chunks transcribing exactly. */
export const SEAM = { QUIET_BELOW: 20, SILENT_BELOW: 35, HISS_ZCR: 0.3, MIN_GAP_MS: 40, TOUCH_MS: 30, EDGE_MS: 10, DIP_BELOW: 15, DIP_MS: 30, SPEECH_SIDE_MS: 150, LINE_TOUCH_MS: 350 }

/**
 * Find the cut for one seam. `estimates` are candidate boundary times in seconds from independent
 * sources (stored word timings, whisper's words, syllable share); none is trusted alone — in
 * testing each was 100-200 ms off on some clips. Tier 'gap': the quiet run touching any estimate
 * (within TOUCH_MS) closest to their median. Tier 'dip': failing that, the deepest energy minimum
 * within DIP_MS of an estimate, when deep enough. The transcript check decides either way.
 * Returns {ok, endMs, startMs, gapMs, tier, why}.
 */
export function findSeam(db, estimates, frameMs = 10, opts = {}) {
  const ests = estimates.filter((x) => Number.isFinite(x)).map((x) => (x * 1000) / frameMs)
  if (!ests.length) return { ok: false, why: 'no boundary estimate' }
  const mid = [...ests].sort((p, q) => p - q)[ests.length >> 1]
  const speech = percentile(db, 0.9)
  const thr = speech - SEAM.QUIET_BELOW
  // quiet = low energy AND not a hiss (a fricative is quiet by energy, but it is still a sound)
  const zc = db.zcr || []
  const quiet = (i) => db[i] <= thr && (db[i] <= speech - SEAM.SILENT_BELOW || (zc[i] ?? 0) < SEAM.HISS_ZCR)
  // A sentence end (opts.line) is a real pause: search wider and take the WIDEST quiet run near
  // the estimates, so the comma pause inside "Sì, certo." is never taken for the full stop.
  const touch = (opts.line ? SEAM.LINE_TOUCH_MS : SEAM.TOUCH_MS) / frameMs
  // loud frames strictly before i / strictly after i
  const loud = new Array(db.length + 1).fill(0), loudAfter = new Array(db.length + 1).fill(0)
  for (let i = 0; i < db.length; i++) loud[i + 1] = loud[i] + (db[i] > thr ? 1 : 0)
  for (let i = db.length - 1; i >= 0; i--) loudAfter[i] = (i + 1 < db.length ? loudAfter[i + 1] + (db[i + 1] > thr ? 1 : 0) : 0)
  let best = null
  for (let i = 1; i < db.length - 1; i++) {
    if (!quiet(i)) continue
    let a = i, b = i
    while (a > 0 && quiet(a - 1)) a--
    while (b < db.length - 1 && quiet(b + 1)) b++
    const w = (b - a + 1) * frameMs
    const touches = ests.some((e) => e >= a - touch && e <= b + touch)
    const dist = Math.abs((a + b) / 2 - mid)
    // a seam sits BETWEEN speech: real speech on both sides, never the lead-in or tail silence
    const inside = loud[a] >= SEAM.SPEECH_SIDE_MS / frameMs && loudAfter[b] >= SEAM.SPEECH_SIDE_MS / frameMs
    const better = !best || (opts.line ? w > best.w || (w === best.w && dist < best.dist) : dist < best.dist)
    if (inside && touches && w >= SEAM.MIN_GAP_MS && better) best = { a, b, w, dist }
    i = b
  }
  if (best) return { ok: true, tier: 'gap', endMs: best.a * frameMs + SEAM.EDGE_MS, startMs: (best.b + 1) * frameMs - SEAM.EDGE_MS, gapMs: best.w }
  const dip = SEAM.DIP_MS / frameMs
  let m = -1
  for (const e of ests) for (let i = Math.max(1, Math.floor(e - dip)); i <= Math.min(db.length - 2, Math.ceil(e + dip)); i++) if (m < 0 || db[i] < db[m]) m = i
  const side = SEAM.SPEECH_SIDE_MS / frameMs
  if (m >= 0 && loud[m] >= side && loudAfter[m] >= side && db[m] <= speech - SEAM.DIP_BELOW) return { ok: true, tier: 'dip', endMs: m * frameMs, startMs: m * frameMs, gapMs: 0 }
  return { ok: false, why: `no quiet run or dip at the word boundary (deepest ${m >= 0 ? Math.round(speech - db[m]) : 0} dB below speech)` }
}

/** Syllable-share estimate of every word's start/end across the clip's speech span. */
export function shareTimes(words, sylOf, db, frameMs = 10) {
  const thr = percentile(db, 0.9) - SEAM.QUIET_BELOW
  const first = db.findIndex((x) => x > thr)
  const last = db.length - 1 - [...db].reverse().findIndex((x) => x > thr)
  if (first < 0 || last <= first) return null
  const syl = words.map((w) => Math.max(1, sylOf(w)))
  const total = syl.reduce((a, b) => a + b, 0)
  const t0 = (first * frameMs) / 1000, span = ((last - first) * frameMs) / 1000
  const starts = [], ends = []
  let acc = 0
  for (const n of syl) { starts.push(t0 + (acc / total) * span); acc += n; ends.push(t0 + (acc / total) * span) }
  return { starts, ends }
}

/** Levenshtein similarity in [0,1]. */
export function similarity(a, b) {
  if (a === b) return 1
  if (!a.length || !b.length) return 0
  const d = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]
    d[0] = i
    for (let j = 1; j <= b.length; j++) {
      const t = d[j]
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = t
    }
  }
  return 1 - d[b.length] / Math.max(a.length, b.length)
}

const fold = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '')

/** Comparable form of a transcript or chunk text: letters/digits only, accents folded, repeated
 *  words collapsed (whisper's "Sara Sara" loop on a short clip). */
export function comparable(text, lang, asWords = false) {
  if (lang === 'zho') return (String(text || '').match(/\p{Script=Han}/gu) || []).join('')
  const ws = fold(text).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  const out = ws.filter((w, i) => i === 0 || w !== ws[i - 1])
  return asWords ? out : out.join('')
}

export const MATCH_MIN = 0.75

/** Does a slice's transcript say exactly its chunk, no more and no less? Same number of words,
 *  every word close, and the whole close: a cut that carries a neighbour's sound shows up as an
 *  extra or changed edge word ("tema senza zucchero" for "ma senza zucchero"). */
export function transcriptMatches(chunkText, transcript, lang) {
  const words = (t) => (lang === 'zho' ? [comparable(t, lang)] : comparable(t, lang, true))
  const cw = words(chunkText)
  let tw = words(transcript)
  // whisper loops a short clip ("And you? And you?"): a transcript that is one phrase said twice
  // is heard as the phrase once
  if (lang !== 'zho') {
    for (let n = 6; n >= 2; n--) {
      if (!tw.length || tw.length % n) continue
      const k = tw.length / n, first = tw.slice(0, k).join(' ')
      if (Array.from({ length: n }, (_, i) => tw.slice(i * k, (i + 1) * k).join(' ')).every((x) => x === first)) { tw = tw.slice(0, k); break }
    }
  }
  const sim = similarity(cw.join(''), tw.join(''))
  const sameLen = lang === 'zho' ? cw[0].length === tw[0].length : cw.length === tw.length
  const each = sameLen && (lang === 'zho'
    ? cw[0][0] === tw[0][0] && cw[0].at(-1) === tw[0].at(-1)
    : cw.every((w, i) => similarity(w, tw[i]) >= ((i === 0 || i === cw.length - 1) ? 0.75 : 0.6)) && cw[0][0] === tw[0][0])
  return { ok: sim >= MATCH_MIN && sameLen && each, sim: Math.round(sim * 100) / 100 }
}

/**
 * Word times for the TEXT's words from whisper's own word segments of the clip. Whisper's words
 * and the text's words need not split alike (elision, numbers, Chinese multi-character tokens),
 * so the match is made letter by letter: both sides reduced to comparable letters, aligned by edit
 * distance, and each text word takes the time of its first and last letter (a letter's time is
 * interpolated across its whisper word). Null when the clip does not say the text (similarity
 * under 0.8): a clip that does not say its sentence is never cut.
 * `segs` = [{text, from, to}] in ms. Returns {words, starts, ends (s), sim} or null.
 */
export function alignTimes(words, segs, lang) {
  const letters = (t) => [...comparable(t, lang)]
  const tw = words.map(letters)
  const T = tw.flat()
  const W = [], wt = []
  for (const s of segs) {
    const ls = letters(s.text)
    ls.forEach((l, i) => { W.push(l); wt.push([s.from + ((s.to - s.from) * i) / ls.length, s.from + ((s.to - s.from) * (i + 1)) / ls.length]) })
  }
  if (!T.length || !W.length) return null
  const n = T.length, m = W.length
  const D = Array.from({ length: n + 1 }, (_, i) => { const r = new Int32Array(m + 1); r[0] = i; return r })
  for (let j = 0; j <= m; j++) D[0][j] = j
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (T[i - 1] === W[j - 1] ? 0 : 1))
  const sim = 1 - D[n][m] / Math.max(n, m)
  if (sim < 0.8) return null
  const map = new Array(n).fill(-1)
  for (let i = n, j = m; i > 0 && j > 0;) {
    if (D[i][j] === D[i - 1][j - 1] + (T[i - 1] === W[j - 1] ? 0 : 1)) { map[i - 1] = j - 1; i--; j-- } else if (D[i][j] === D[i - 1][j] + 1) i--; else j--
  }
  for (let i = 0; i < n; i++) if (map[i] < 0) map[i] = i > 0 ? map[i - 1] : 0
  const starts = [], ends = []
  let at = 0
  for (const w of tw) {
    if (!w.length) { starts.push(ends.at(-1) ?? 0); ends.push(ends.at(-1) ?? 0); continue }
    starts.push(wt[map[at]][0] / 1000); ends.push(wt[map[at + w.length - 1]][1] / 1000); at += w.length
  }
  return { words, starts, ends, sim: Math.round(sim * 100) / 100 }
}

/** A KNOWN-side line cut at a verified seam (job #937): it passes the exact rule, or it has the
 *  same number of words, the same first word, and is close as a whole (whisper mishears a short
 *  line: "I'm a nurse." as "I'm a Ness."). The known side is never what is being learnt; the seam
 *  is what must be clean, and the seam test already passed. `lang` = the course's known language
 *  (knownLangOf), never assumed English (r-2026-11-03-say-known-language). */
export function knownMatches(text, transcript, lang) {
  const t = transcriptMatches(text, transcript, lang)
  if (t.ok) return t
  const cw = comparable(text, lang, true), tw = comparable(transcript, lang, true)
  const ok = t.sim >= 0.95 || (cw.length === tw.length && cw[0] === tw[0] && t.sim >= 0.6)
  return { ok, sim: t.sim, loose: ok }
}

// ---- #362/#369 pod-LEGO seams, the cuts Tom approved on the Italian listening page (d/b5b63cd3).
// Moved here unchanged from page.mjs (#378) so the page and the app's cut file share one truth.
export const normT = (s) => String(s).toLowerCase().normalize('NFC').replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ').trim()
/** A card's split at its pod LEGOs (dump `chunks`), placed with the clip's own word timings:
 *  [{it, en, a, b}] in ms of `srcClip`, or null when the pod gives no usable split. */
export function podSplit(d, srcClip) {
  const units = d.chunks.map((x) => x.text); if (units.length < 2) return null
  if (normT(units.join(' ')) !== normT(d.target)) return null
  const tm = srcClip === d.targetAudioId ? d.wordTimings : d.clipTimings?.[srcClip]
  const counts = units.map((u) => u.trim().split(/\s+/).length)
  if (!tm || tm.words.length !== counts.reduce((a, b) => a + b, 0)) return null
  let w = 0; const spans = counts.map((n) => { const a = tm.starts[w], b = tm.ends[w + n - 1]; w += n; return [a * 1000, b * 1000] })
  return units.map((u, i) => {
    const lo = i ? (spans[i - 1][1] + spans[i][0]) / 2 : Math.max(0, spans[i][0] - 60)
    const hi = i < units.length - 1 ? (spans[i][1] + spans[i + 1][0]) / 2 : spans[i][1] + 80
    return { it: u, en: d.chunks[i].gloss, a: Math.round(lo), b: Math.round(hi) }
  })
}
const nw = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '')
/** Word index range [from,to] of each piece's gloss in the known words, in order; null + reason if impossible. */
export function placeGlosses(knownWords, glosses, lang) {
  const kn = knownWords.map(nw); const out = []; let at = 0
  for (const [i, g] of glosses.entries()) {
    if (!g) { out.push(null); continue }
    const gw = wordsIn(g, lang).map(nw); let hit = -1
    for (let s = at; s + gw.length <= kn.length; s++) if (gw.every((w, j) => kn[s + j] === w)) { hit = s; break }
    if (hit < 0) { out.push(null); continue } // pod gloss is worded differently from the clip: this piece takes the words left between its anchored neighbours
    out.push([hit, hit + gw.length - 1]); at = hit + gw.length
  }
  for (let i = 0; i < out.length; i++) if (!out[i]) {
    let lo = 0; for (let j = i - 1; j >= 0; j--) if (out[j]) { lo = out[j][1] + 1; break }
    let hi = knownWords.length - 1; for (let j = i + 1; j < out.length; j++) if (out[j]) { hi = out[j][0] - 1; break }
    if (hi < lo) return { err: `piece ${i + 1} has no gloss and no ${langName(lang)} words are left for it` }
    out[i] = [lo, hi]
    if (out.filter((x, j) => j !== i && x === null).length) return { err: `piece ${i + 1} cannot be placed: neighbouring pieces are unanchored too` }
  }
  return { ranges: out }
}
/** Spans (ms of the whole known-side clip) of each piece's known text, cut at the pod LEGO
 *  boundaries, from word segments of that clip: {spans:[[lo,hi]], words:[text]} or {err}.
 *  `lang` = the course's known language (knownLangOf), never assumed English. */
export function knownSpans(known, glosses, segs, lang) {
  const kw = wordsIn(known, lang)
  const tm = alignTimes(kw, segs, lang); if (!tm) return { err: `the whole ${langName(lang)} clip does not say its text closely enough to time it` }
  const pl = placeGlosses(kw, glosses, lang); if (pl.err) return pl
  const r = pl.ranges
  for (let i = 1; i < r.length; i++) if (r[i][0] !== r[i - 1][1] + 1 && r[i][0] <= r[i - 1][1]) return { err: 'glosses overlap' }
  const sp = r.map(([a, b]) => [tm.starts[a] * 1000, tm.ends[b] * 1000])
  return { spans: sp.map((x, i) => {
    const lo = i ? (sp[i - 1][1] + x[0]) / 2 : Math.max(0, x[0] - 60)
    const hi = i < sp.length - 1 ? (x[1] + sp[i + 1][0]) / 2 : x[1] + 80
    return [Math.round(lo), Math.round(hi)]
  }), words: r.map(([a, b]) => kw.slice(a, b + 1).join(lang === 'zho' ? '' : ' ')) }
}

// ---- #381 meaning-chunk pairing (r-2026-11-03-pod-drill-splits-where-the-pod). Language-neutral:
// a pairing is a list of [target piece, English piece], each one unbroken stretch of its sentence.
const tileNorm = (w) => String(w || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}']/gu, '')
/** Word ranges [from,to] of `pieces` (texts) tiling `words` exactly, in order, every word once;
 *  null when they do not (a piece reworded, reordered, or a word missed or repeated). */
export function tileWords(words, pieces) {
  const w = words.map(tileNorm).filter((x, i) => x || words[i])
  const out = []; let at = 0
  for (const p of pieces) {
    const pw = String(p || '').trim().split(/\s+/).map(tileNorm).filter(Boolean)
    if (!pw.length) return null
    // punctuation-only tokens in `words` (a dash, an ellipsis) belong to the piece they sit in
    const from = at
    for (const x of pw) {
      while (at < w.length && !w[at]) at++
      if (w[at] !== x) return null
      at++
    }
    out.push([from, at - 1])
  }
  while (at < w.length && !w[at]) at++
  if (at !== w.length) return null
  if (out.length) out[out.length - 1][1] = w.length - 1
  return out
}
/** Ms spans of word ranges from word times (seconds): each seam at the midpoint between the last
 *  word of one piece and the first of the next, the first piece led in 60 ms, the last tailed
 *  80 ms (the same math as podSplit / englishSpans, which Tom approved by ear). */
export function rangesToSpans(ranges, tm) {
  const sp = ranges.map(([a, b]) => [tm.starts[a] * 1000, tm.ends[b] * 1000])
  return sp.map((x, i) => {
    const lo = i ? (sp[i - 1][1] + x[0]) / 2 : Math.max(0, x[0] - 60)
    const hi = i < sp.length - 1 ? (x[1] + sp[i + 1][0]) / 2 : x[1] + 80
    return [Math.round(lo), Math.round(hi)]
  })
}
/** English number words for whisper's digits ("12 euro" -> "twelve euro"), 0-99. */
const ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ')
const TENS = 'x x twenty thirty forty fifty sixty seventy eighty ninety'.split(' ')
export const numberWordsEn = (t) => String(t).replace(/\d+/g, (d) => { const n = Number(d); if (n < 20) return ONES[n]; if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ''); return d })

/** A clip's stored Cartesia word timings {words, starts, ends} (seconds) as timed segments
 *  [{text, from, to}] in ms, the shape alignTimes / englishSpans take (job #381, Tom r-2026-11-03:
 *  split timings come from the render's own voice timings, never a transcription). Pause marks
 *  ("…") are not words. Null when the clip has no usable timings. */
export function cartesiaSegs(raw) {
  if (!raw || !Array.isArray(raw.words) || !raw.words.length) return null
  const segs = raw.words.map((w, i) => ({ text: String(w), from: Number(raw.starts?.[i]) * 1000, to: Number(raw.ends?.[i]) * 1000 }))
    .filter((s) => /[\p{L}\p{N}]/u.test(s.text) && Number.isFinite(s.from) && Number.isFinite(s.to))
  return segs.length ? segs : null
}
/**
 * The shared-data guard (#381 brief rule 4): a regenerated cut file may grow, never shrink. Every
 * sentence in `prev` must still be there, and every entry that already CUTS something (chunks, or
 * several lines) must be unchanged, unless its id is in `allow`. An entry that played whole may be
 * replaced by a cut. Returns {ok, problems: [string]}.
 */
export function noShrink(prev, next, allow = new Set()) {
  const problems = []
  for (const [id, old] of Object.entries(prev || {})) {
    if (allow.has(id)) continue
    const now = next[id]
    if (!now) { problems.push(`${id}: dropped`); continue }
    const cuts = old.lines.length > 1 || old.lines.some((l) => l.chunks.length)
    if (cuts && JSON.stringify(now) !== JSON.stringify(old)) problems.push(`${id}: an existing cut would change`)
  }
  return { ok: !problems.length, problems }
}
/** The WHEN of one seam, already placed at a word boundary by the pairing (#381): the timing
 *  estimates of that boundary disagree by up to ~250 ms in connected speech (stored TTS times run
 *  late, whisper's early), so the seam goes at the quietest 10 ms frame between them, widened by
 *  `padMs` each side. `db` = frameDb of the clip. Never moves the seam to another word boundary. */
export function quietestBetween(db, estimatesMs, padMs = 40, frameMs = 10) {
  const lo = Math.max(1, Math.floor((Math.min(...estimatesMs) - padMs) / frameMs))
  const hi = Math.min(db.length - 2, Math.ceil((Math.max(...estimatesMs) + padMs) / frameMs))
  let m = lo
  for (let i = lo; i <= hi; i++) if (db[i] < db[m]) m = i
  return m * frameMs
}
/** rangesToSpans with the seams given (ms): piece i runs seams[i-1]..seams[i]. */
export function spansAtSeams(ranges, tm, seams) {
  const base = rangesToSpans(ranges, tm)
  return base.map(([a, b], i) => [i ? seams[i - 1] : a, i < base.length - 1 ? seams[i] : b])
}
/** Did a piece's cut bleed (#381)? Judged only at the edges that touch a neighbour piece, from
 *  whisper's transcript of the piece alone: an extra word after its last word (it carries the next
 *  piece's onset), an extra word before its first, or a lost first/last word. A misheard middle
 *  ("Collatte davena") is not a bleed. Returns null when clean, else a short reason. */
export function bleed(text, heard, { first, last }, lang = 'ita') {
  const pw = comparable(text, lang, true), hw = comparable(heard, lang, true)
  if (!pw.length) return null
  if (!hw.length) return 'heard nothing'
  const like = (a, b) => !!a && !!b && similarity(a, b) >= 0.6
  if (!last && hw.length > pw.length && like(hw.at(-2), pw.at(-1)) && !like(hw.at(-1), pw.at(-1))) return `carries the next word ("${hw.at(-1)}")`
  if (!first && hw.length > pw.length && like(hw[1], pw[0]) && !like(hw[0], pw[0])) return `carries the previous word ("${hw[0]}")`
  if (!first && pw.length > 1 && hw.length < pw.length && like(hw[0], pw[1]) && !like(hw[0], pw[0])) return `loses its first word ("${pw[0]}")`
  if (!last && pw.length > 1 && hw.length < pw.length && like(hw.at(-1), pw.at(-2)) && !like(hw.at(-1), pw.at(-1))) return `loses its last word ("${pw.at(-1)}")`
  return null
}
