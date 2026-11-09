/**
 * POD TEXT SWAPS, MAKE-BEFORE-BREAK — a pod line whose words are to change, swapped only once the new take exists
 * (Aran, 2026-10-29, job #551: "put the two Siân lines in my booth now, and swap them into the pods only once I have
 * recorded them", so live North never loses audio).
 *
 * A swap names one pod row, one side, the words it has now (`from`) and the words it is to have (`to`), and the voice
 * that must read them. While the row still says `from`, the swap is PENDING:
 *   - the pod keeps its words AND its audio, untouched, so learners hear exactly what they heard before;
 *   - the booth offers the `to` words to that voice — Welsh as a "Pod 1 · new words" line (wire kind 'podswap',
 *     line id `podswap:<sentenceId>`), English on the Pod 1 English card (pod-english-lines reads a pending row's
 *     `to` words, so North's line collapses with South's, which already says Siân).
 * When a take of the `to` words by that voice is filed, the swap is APPLIED by ONE conditional UPDATE per row —
 * `{side}_text = to, {side}_audio_id = <the new take>` WHERE id = row AND `{side}_text = from` — so the words and the
 * audio change in the same statement: there is no moment at which the row has new words and no audio, or old audio
 * under new words. A row that no longer says `from` (somebody already changed it) is left alone and reported, never
 * forced. Nothing is deleted: the old clip keeps its row and its file, just no longer linked from this slot.
 *
 * The applying is recordist-queue applyPodTextSwaps (called from fillSameWordsSlots, i.e. after every booth take of
 * these words is filed) and the admin fallback POST /api/admin/pod-text-swaps. This file is pure: no I/O.
 *
 * HELD FOR A SWITCH (Kai, 2026-11-09, job #512): a swap marked `waitForSwitch: true` is offered in the booth exactly as
 * any other, but a filed take does NOT apply it. The new take sits in the library; the pod keeps its old words and old
 * audio until a person switches it — POST /api/admin/pod-text-swaps {"apply":true,"switch":[<sentenceId>, …]} (or
 * "switch":true for every held swap whose take exists). Why: South Welsh local forms (fi'n hapus, sa i'n gwbod) were
 * approved by Aran on 2026-11-09 as "record first, then swap in", and Kai wants to hear the takes before learners do.
 * The switch is the same one-statement, still-says-`from` write as the automatic path; nothing else differs.
 *
 * LEARNER PROGRESS IS NOT TOUCHED. Progress is filed under the row's slot, and a name change is the same line — the
 * standing rule for booth edits (Tom, 2026-09-12: "the sense of the line will be the same. So I think we keep learner
 * progress"; recordist-router PATCH …/text).
 *
 * The Speaker label 'Sarah' on 13 lines per pod is a cast name, not words anyone says to her — it is NOT a swap.
 */
'use strict'

const { spokenWordsKey } = require('../shared/spoken-words.cjs')

const POD_SWAP_PREFIX = 'podswap:'
const TEXT_COL = { target: 'target_text', known: 'known_text' }
const AUDIO_COL = { target: 'target_audio_id', known: 'known_audio_id' }

const ARAN_CYM = 'human_aran_cym_n' // his Welsh policy voice; human_aran_cym_s (South's cast) is an alias of it
const ARAN_ENG = 'human_aran_eng'
const DAN_CYM_S = 'human_dan_cym_s' // South Pod 1's Welsh is Dan's (job #834·AB), so South's swaps are his, not Aran's
const SIAN_RULING = 'Aran 2026-10-29 (job #551): the Neighbour greets Siân, not Sarah'

const ELERI_CYM_S = 'human_eleri_cym_s' // South Pod 1's women's Welsh (Learner, Anna, Customer …): her 141 takes
const LOCAL_FORMS_RULING = "Kai 2026-11-09 (job #530, after #512's forum report): South Pod 1 says the South's own forms — record, then Kai switches"

/**
 * South Welsh local forms (jobs #512, #530). HELD: each is applied only by Kai's switch, never by the take alone.
 * Kai's ruling, 9 Nov 2026 (fluent Welsh), spelling fi'n, POD ONLY — the cym_s course seeds/LEGOs/phrases are not
 * touched by this (they have no staged route, and the course register is a whole-course call):
 *   SC22-S011: option C, fully local (Fi'n hapus… bo' fi'n… A fi'n gobeithio…);
 *   every Pod 1 line: dych/ydych chi → ŷch chi; hefyd → 'fyd; ry'n ni → ŷn ni;
 *   mae/bod angen i fi → ma/bod ishe arna i (SC22-S003, SC22-S007; SC21-S001's "i ni" → "arnon ni");
 *   edrych → dishgwl (SC10-S004 "rhaid i chi ddishgwl", soft-mutated as edrych would be; SC11-S006);
 *   cyflym → clou (SC22-S007);
 * and, added by Kai the same day (job #564): (yn/rhy) gyflym → glou in SC15-S010, SC16-S002, SC19-S003; and
 *   ma ishe i fi → ma ishe arna i (SC10-S005 "arna i gael", mutation kept as in SC22-S003; SC10-S009).
 * Only those words change; each line is one swap (several changes on a line ride together), assigned to the voice
 * whose take the line plays today (her 141 lines / his 90, read from their booths on 9 Nov).
 * A function, not a literal, so the frozen list below stays the one list.
 */
function CYM_S_LOCAL_FORMS() {
  const sw = (line, voiceId, from, to) => ({ sentenceId: `cym_s_for_eng:pod-1:${line}`, side: 'target', voiceId, from, to })
  return [
    sw("SC06-S004", ELERI_CYM_S, // Anna
      "Neis cwrdd â chi 'fyd. O ble dych chi'n dod?",
      "Neis cwrdd â chi 'fyd. O ble ŷch chi'n dod?"),
    sw("SC06-S007", DAN_CYM_S, // James
      "Mae hon yn ddinas hyfryd. Beth dych chi'n neud?",
      "Mae hon yn ddinas hyfryd. Beth ŷch chi'n neud?"),
    sw("SC06-S010", ELERI_CYM_S, // Anna
      "Galla, wrth gwrs. Nyrs dw i. Dw i'n gweithio… yn yr ysbyty. Mae e'n agos 'ma. A beth dych chi'n neud?",
      "Galla, wrth gwrs. Nyrs dw i. Dw i'n gweithio… yn yr ysbyty. Mae e'n agos 'ma. A beth ŷch chi'n neud?"),
    sw("SC06-S011", DAN_CYM_S, // James
      "Dw i'n dysgu Saesneg,… ond ddim mewn ysgol. Dw i'n gweithio… gydag oedolion. Dw i ar wyliau 'ma… gyda fy ngwraig a'r plant. Ry'n ni'n cael… amser hyfryd.",
      "Dw i'n dysgu Saesneg,… ond ddim mewn ysgol. Dw i'n gweithio… gydag oedolion. Dw i ar wyliau 'ma… gyda fy ngwraig a'r plant. Ŷn ni'n cael… amser hyfryd."),
    sw("SC07-S003", ELERI_CYM_S, // Cafe Barista
      "Ydych chi moyn maint arferol… neu fawr?",
      "Ŷch chi moyn maint arferol… neu fawr?"),
    sw("SC07-S005", ELERI_CYM_S, // Cafe Barista
      "Wrth gwrs. Ydych chi moyn eistedd i mewn… neu fynd â fe?",
      "Wrth gwrs. Ŷch chi moyn eistedd i mewn… neu fynd â fe?"),
    sw("SC07-S008", ELERI_CYM_S, // Cafe Barista
      "Ar unwaith. Ydych chi moyn rhywbeth arall?",
      "Ar unwaith. Ŷch chi moyn rhywbeth arall?"),
    sw("SC07-S009", DAN_CYM_S, // Cafe Customer 2
      "Ydw,… alla i gael gwydraid o ddŵr… hefyd, os gwelwch yn dda.",
      "Ydw,… alla i gael gwydraid o ddŵr… 'fyd, os gwelwch yn dda."),
    sw("SC07-S014", ELERI_CYM_S, // Cafe Barista
      "Ydych chi moyn eistedd i mewn? Ma'r bwrdd wrth y… ffenest yn rhydd.",
      "Ŷch chi moyn eistedd i mewn? Ma'r bwrdd wrth y… ffenest yn rhydd."),
    sw("SC08-S011", DAN_CYM_S, // Bartender
      "Ydych chi'n byta heno?",
      "Ŷch chi'n byta heno?"),
    sw("SC09-S006", DAN_CYM_S, // Waiter
      "Oes… ma'r eog a'r risotto… yn rhydd o glwten. Ma gyda ni rai saladau… hefyd.",
      "Oes… ma'r eog a'r risotto… yn rhydd o glwten. Ma gyda ni rai saladau… 'fyd."),
    sw("SC10-S004", DAN_CYM_S, // Assistant
      "Dw i'n meddwl… bod rhai 'da ni,… ond bydd rhaid i chi edrych… i fod yn siŵr.",
      "Dw i'n meddwl… bod rhai 'da ni,… ond bydd rhaid i chi ddishgwl… i fod yn siŵr."),
    sw("SC10-S005", ELERI_CYM_S, // Customer
      "Ma ishe i fi gael… rhywfaint o eli haul… a phast dannedd hefyd.",
      "Ma ishe arna i gael… rhywfaint o eli haul… a phast dannedd 'fyd."),
    sw("SC10-S007", ELERI_CYM_S, // Customer
      "Diolch,… dych chi wedi bod yn help mawr. Dw i'n ddiolchgar iawn.",
      "Diolch,… ŷch chi wedi bod yn help mawr. Dw i'n ddiolchgar iawn."),
    sw("SC10-S008", DAN_CYM_S, // Assistant
      "Croeso. Ydych chi yma ar wyliau? Dych chi'n siarad… Cymraeg da iawn.",
      "Croeso. Ŷch chi yma ar wyliau? Ŷch chi'n siarad… Cymraeg da iawn."),
    sw("SC10-S009", ELERI_CYM_S, // Customer
      "Dych chi'n garedig iawn! Ydw, dw i ar wyliau,… ac ma ishe… i fi ymarfer mwy… i siarad Cymraeg yn well. Diolch yn fawr iawn, a hwyl.",
      "Ŷch chi'n garedig iawn! Ydw, dw i ar wyliau,… ac ma ishe… arna i ymarfer mwy… i siarad Cymraeg yn well. Diolch yn fawr iawn, a hwyl."),
    sw("SC11-S006", ELERI_CYM_S, // Receptionist
      "Oes… ma hi'n edrych dros yr ardd.",
      "Oes… ma hi'n dishgwl dros yr ardd."),
    sw("SC12-S009", ELERI_CYM_S, // Customer
      "Diolch. Alla i gael pecyn… o blasters hefyd?",
      "Diolch. Alla i gael pecyn… o blasters 'fyd?"),
    sw("SC13-S001", ELERI_CYM_S, // Tourist
      "Esgusodwch fi,… ydych chi'n gwybod… sut i gyrraedd… yr archfarchnad agosaf?",
      "Esgusodwch fi,… ŷch chi'n gwybod… sut i gyrraedd… yr archfarchnad agosaf?"),
    sw("SC13-S010", ELERI_CYM_S, // Tourist
      "Diolch yn fawr iawn. Dych chi wedi bod yn help mawr.",
      "Diolch yn fawr iawn. Ŷch chi wedi bod yn help mawr."),
    sw("SC14-S003", DAN_CYM_S, // Passenger
      "Faint o amser… ydych chi'n meddwl… bydd hi'n cymryd, fwy neu lai?",
      "Faint o amser… ŷch chi'n meddwl… bydd hi'n cymryd, fwy neu lai?"),
    sw("SC14-S005", DAN_CYM_S, // Passenger
      "Ydych chi'n gwbod… ble alla i gael tocyn… yn yr orsaf?",
      "Ŷch chi'n gwbod… ble alla i gael tocyn… yn yr orsaf?"),
    sw("SC15-S010", ELERI_CYM_S, // Learner (#564)
      "Mae'n ddrwg 'da fi… alla i ddim siarad… yn gyflym iawn.",
      "Mae'n ddrwg 'da fi… alla i ddim siarad… yn glou iawn."),
    sw("SC16-S002", ELERI_CYM_S, // Learner (#564): rhy + clou soft-mutates, as rhy gyflym did
      "Fe wnaethoch chi siarad… ychydig bach yn rhy gyflym,… felly dw i ddim yn siŵr… os wnes i ddeall.",
      "Fe wnaethoch chi siarad… ychydig bach yn rhy glou,… felly dw i ddim yn siŵr… os wnes i ddeall."),
    sw("SC16-S005", ELERI_CYM_S, // Learner
      "Allwn ni weld… y fwydlen bwdin hefyd?",
      "Allwn ni weld… y fwydlen bwdin 'fyd?"),
    sw("SC16-S009", DAN_CYM_S, // Local
      "Na,… dim ond arian parod… ry'n ni'n ei gymryd.",
      "Na,… dim ond arian parod… ŷn ni'n ei gymryd."),
    sw("SC17-S002", DAN_CYM_S, // Local
      "Ydych chi moyn talu… gydag arian parod neu gerdyn,… neu ei roi e ar y stafell?",
      "Ŷch chi moyn talu… gydag arian parod neu gerdyn,… neu ei roi e ar y stafell?"),
    sw("SC18-S010", ELERI_CYM_S, // Learner
      "Ry'n ni wedi talu,… ond ma fy merch i… wedi colli ei thocyn.",
      "Ŷn ni wedi talu,… ond ma fy merch i… wedi colli ei thocyn."),
    sw("SC19-S003", ELERI_CYM_S, // Learner
      "Pan dych chi'n siarad… yn gyflym,… ma fe'n gwneud i fi… deimlo'n dwp.",
      "Pan ŷch chi'n siarad… yn glou,… ma fe'n gwneud i fi… deimlo'n dwp."),
    sw("SC19-S005", ELERI_CYM_S, // Learner
      "Ydy hi'n iawn… os ry'n ni'n rhoi hwn fan hyn?",
      "Ydy hi'n iawn… os ŷn ni'n rhoi hwn fan hyn?"),
    sw("SC20-S009", ELERI_CYM_S, // Learner
      "Dych chi'n garedig iawn.",
      "Ŷch chi'n garedig iawn."),
    sw("SC21-S001", ELERI_CYM_S, // Learner
      "Ma hynny'n swnio fel… bod angen i ni adael… yn fuan.",
      "Ma hynny'n swnio fel… bod ishe arnon ni adael… yn fuan."),
    sw("SC21-S002", ELERI_CYM_S, // Learner
      "Ma hynny'n swnio fel… dych chi moyn i ni… beidio gwneud hynny.",
      "Ma hynny'n swnio fel… ŷch chi moyn i ni… beidio gwneud hynny."),
    sw("SC21-S012", DAN_CYM_S, // Local
      "Ydych chi moyn archebu… rhyw ddiodydd yn gyntaf?",
      "Ŷch chi moyn archebu… rhyw ddiodydd yn gyntaf?"),
    sw("SC22-S003", ELERI_CYM_S, // Learner
      "Diolch, mae'n braf gwybod hynny. Mae angen i fi ddysgu… mwy o eiriau,… ac mae angen i fi… ymarfer gwrando. Dw i ddim yn deall pobl… yn dda iawn… pan nad ydyn nhw'n siarad… yn araf.",
      "Diolch, mae'n braf gwybod hynny. Ma ishe arna i ddysgu… mwy o eiriau,… ac ma ishe arna i… ymarfer gwrando. Dw i ddim yn deall pobl… yn dda iawn… pan nad ydyn nhw'n siarad… yn araf."),
    sw("SC22-S007", ELERI_CYM_S, // Learner
      "Mae'n ychydig bach… yn rhwystredig… pan alla i ddim meddwl… yn ddigon cyflym… i fynegi fy hun yn iawn. Ond dw i'n gwybod… bod angen i fi… barhau i ymarfer… os dw i moyn siarad… yn fwy hyderus.",
      "Mae'n ychydig bach… yn rhwystredig… pan alla i ddim meddwl… yn ddigon clou… i fynegi fy hun yn iawn. Ond dw i'n gwybod… bod ishe arna i… barhau i ymarfer… os dw i moyn siarad… yn fwy hyderus."),
    sw("SC22-S011", ELERI_CYM_S, // Learner
      "Ydy, wir. Dw i'n hapus iawn… fy mod i'n gallu cael… cymaint â hyn o sgwrs. A dw i'n gobeithio… y byddwn ni'n gallu cael… mwy o sgyrsiau… yn y dyfodol… wrth i fi barhau i wella.",
      "Ydy, wir. Fi'n hapus iawn… bo' fi'n gallu cael… cymaint â hyn o sgwrs. A fi'n gobeithio… y byddwn ni'n gallu cael… mwy o sgyrsiau… yn y dyfodol… wrth i fi barhau i wella."),
  ].map((s) => Object.freeze({ ...s, waitForSwitch: true, ruling: LOCAL_FORMS_RULING }))
}

/**
 * The swaps. North (cym_n_for_eng:pod-1, LIVE) says Sarah on both sides; South (cym_s_for_eng:pod-1, HELD) says Siân
 * in English already and Sarah in Welsh. Each pod keeps its own pause-marker form ("…" in North's English).
 */
const POD_TEXT_SWAPS = Object.freeze([
  { sentenceId: 'cym_n_for_eng:pod-1:SC01-S001', side: 'target', voiceId: ARAN_CYM, from: 'Bore da, Sarah!', to: 'Bore da, Siân!' },
  { sentenceId: 'cym_s_for_eng:pod-1:SC01-S001', side: 'target', voiceId: DAN_CYM_S, from: 'Bore da, Sarah!', to: 'Bore da, Siân!' },
  { sentenceId: 'cym_n_for_eng:pod-1:SC01-S001', side: 'known', voiceId: ARAN_ENG, from: 'Good morning, Sarah!', to: 'Good morning, Siân!' },
  { sentenceId: 'cym_n_for_eng:pod-1:SC05-S001', side: 'target', voiceId: ARAN_CYM, from: 'Noswaith dda, Sarah. Gest ti ddiwrnod hir?', to: 'Noswaith dda, Siân. Gest ti ddiwrnod hir?' },
  { sentenceId: 'cym_s_for_eng:pod-1:SC05-S001', side: 'target', voiceId: DAN_CYM_S, from: 'Noswaith dda, Sarah. Gest ti ddiwrnod hir?', to: 'Noswaith dda, Siân. Gest ti ddiwrnod hir?' },
  { sentenceId: 'cym_n_for_eng:pod-1:SC05-S001', side: 'known', voiceId: ARAN_ENG, from: 'Good evening, Sarah. … Did you have a long day?', to: 'Good evening, Siân. … Did you have a long day?' },
].map((s) => Object.freeze({ ...s, ruling: SIAN_RULING })).concat(CYM_S_LOCAL_FORMS()))

const courseOfSentence = (sentenceId) => String(sentenceId).split(':')[0]
const podOfSentence = (sentenceId) => String(sentenceId).split(':').slice(0, 2).join(':')
const trimmed = (t) => String(t == null ? '' : t).trim()

/** The swaps that touch these sentence ids (all of them by default). */
function swapSentenceIds(swaps = POD_TEXT_SWAPS) { return [...new Set(swaps.map((s) => s.sentenceId))] }

/** Does this swap wait for a person's switch rather than applying on its take? (job #512) */
function isHeldForSwitch(swap) { return !!(swap && swap.waitForSwitch) }

/** Is this voice the one a swap asks for? Spellings are the recordist's own voice id and its aliases. */
function isSwapVoice(swap, spellings) { return (spellings || []).includes(swap.voiceId) }

/**
 * Where a swap stands against the row as read now:
 *   'pending' — the row still says `from`: offer the `to` words, keep the pod as it is;
 *   'applied' — the row says `to` (spoken words): done;
 *   'drifted' — the row says something else: leave it, say so.
 */
function swapState(swap, row) {
  const now = trimmed(row && row[TEXT_COL[swap.side]])
  if (now === trimmed(swap.from)) return 'pending'
  if (spokenWordsKey(now) === spokenWordsKey(swap.to)) return 'applied'
  return 'drifted'
}

/** A sentence row with each PENDING swap's `to` words in place of its `from` words — what the booth shows. */
function withPendingText(row, swaps = POD_TEXT_SWAPS) {
  if (!row) return row
  let out = row
  for (const s of swaps) {
    if (s.sentenceId !== row.id || swapState(s, row) !== 'pending') continue
    out = { ...out, [TEXT_COL[s.side]]: s.to }
  }
  return out
}

/**
 * The swaps a filed take applies: pending, this voice's, this side, the take's spoken words — and NOT held for a
 * switch, unless this call IS the switch and names the swap (`switched`: a Set of sentence ids, or true for all).
 * @param {object} args {spellings, side: 'target'|'known', text, rowsById: Map(sentenceId → row), switched?}
 */
function swapsForTake({ spellings, side, text, rowsById, switched = null }, swaps = POD_TEXT_SWAPS) {
  const key = spokenWordsKey(text)
  if (!key) return []
  const switchedOn = (s) => !isHeldForSwitch(s) || switched === true || (switched instanceof Set && switched.has(s.sentenceId))
  return swaps.filter((s) => s.side === side && isSwapVoice(s, spellings) && switchedOn(s) && spokenWordsKey(s.to) === key &&
    rowsById.has(s.sentenceId) && swapState(s, rowsById.get(s.sentenceId)) === 'pending')
}

/** The one UPDATE that applies a swap: new words and the new take together, only while the row still says `from`. */
function swapWrite(swap, audioId) {
  return {
    id: swap.sentenceId,
    set: { [TEXT_COL[swap.side]]: swap.to, [AUDIO_COL[swap.side]]: audioId },
    where: { [TEXT_COL[swap.side]]: swap.from },
  }
}

function podSwapLineId(sentenceId) { return `${POD_SWAP_PREFIX}${sentenceId}` }

/** `podswap:<sentenceId>` → {sentenceId}; null for anything else. A sentence id carries colons of its own. */
function parsePodSwapLineId(lineId) {
  const raw = String(lineId || '')
  if (!raw.startsWith(POD_SWAP_PREFIX)) return null
  const sentenceId = raw.slice(POD_SWAP_PREFIX.length)
  return sentenceId ? { sentenceId } : null
}

/**
 * This recordist's pending TARGET swaps as booth lines, one per spoken words (North and South Welsh are the same
 * words, so one take serves both: the line keeps North's place and South rides in duplicateOf). English swaps are not
 * lines here — they are on the Pod 1 English card (pod-english-lines withPendingText).
 *
 * @param {object} recordist {voiceId, spellings}
 * @param {object} input {rows: listening_pod_sentences rows {id, pod_id, global_order, speaker, target_text, known_text}, pods: {id, slug, title}[]}
 */
function podSwapLinesFor(recordist, { rows = [], pods = [] } = {}, swaps = POD_TEXT_SWAPS) {
  const spellings = recordist.spellings || [recordist.voiceId]
  const rowsById = new Map(rows.map((r) => [r.id, r]))
  const podById = new Map(pods.map((p) => [p.id, p]))
  const seen = new Map()
  const out = []
  for (const s of swaps) {
    if (s.side !== 'target' || !isSwapVoice(s, spellings)) continue
    const row = rowsById.get(s.sentenceId)
    if (!row || swapState(s, row) !== 'pending') continue
    const key = spokenWordsKey(s.to)
    if (seen.has(key)) {
      seen.get(key).duplicateOf.push({ sentenceId: s.sentenceId, courseCode: courseOfSentence(s.sentenceId) })
      continue
    }
    const shown = withPendingText(row, swaps)
    const pod = podById.get(row.pod_id) || {}
    const line = {
      id: podSwapLineId(s.sentenceId),
      podId: row.pod_id,
      podSlug: pod.slug || null,
      podTitle: pod.title || null,
      order: row.global_order,
      seedOrder: 0,
      text: s.to,
      // The crib: what the line says in English (its new words when the English is changing too).
      knownText: trimmed(shown.known_text) || null,
      speaker: row.speaker || null,
      courseCode: courseOfSentence(s.sentenceId),
      voiceId: recordist.voiceId,
      duplicateOf: [],
      kind: 'podswap',
      role: 'target1',
      filledBy: [],
      readStyle: 'natural',
      rerecordWanted: false,
      // Shown on the line: the words it replaces, which stay live until this take lands.
      replacesText: s.from,
    }
    seen.set(key, line)
    out.push(line)
  }
  return out
}

/** The words a parsed `podswap:` line stands for, if it is a pending target swap of this reader's. Null = not theirs. */
function resolvePodSwap(parsed, recordist, row, swaps = POD_TEXT_SWAPS) {
  if (!parsed || !recordist || !row) return null
  const s = swaps.find((x) => x.sentenceId === parsed.sentenceId && x.side === 'target' && isSwapVoice(x, recordist.spellings || [recordist.voiceId]))
  if (!s) return null
  return { courseCode: courseOfSentence(s.sentenceId), sentenceId: s.sentenceId, text: s.to, state: swapState(s, row) }
}

module.exports = {
  POD_TEXT_SWAPS, POD_SWAP_PREFIX, TEXT_COL, AUDIO_COL,
  swapSentenceIds, swapState, withPendingText, swapsForTake, swapWrite, isSwapVoice, isHeldForSwitch,
  podSwapLineId, parsePodSwapLineId, podSwapLinesFor, resolvePodSwap, courseOfSentence, podOfSentence,
}
