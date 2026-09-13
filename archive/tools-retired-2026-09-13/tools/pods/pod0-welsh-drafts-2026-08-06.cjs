/**
 * pod0-welsh-drafts-2026-08-06.cjs — the hand-written DRAFT Welsh for every pod-0
 * canonical slot that had none after the 2026-08-06 canonical alignment.
 *
 * Tom's ruling 2026-08-06: "opus drafts, Aran proofreads." These lines are drafts.
 * They go into listening_pod_sentences.target_text with target_text_draft = true, so
 * the record room renders them, badges them DRAFT — AWAITING ARAN, and lets Aran
 * amend any of them inline (PATCH /api/pods/:course/sentence/:id clears the flag).
 * Nothing here is final course content until Aran has read it.
 *
 * HOW THEY WERE WRITTEN
 *   Style corpus = the 114 Northern / 118 Southern surviving human-written pod-0
 *   lines (docs/pods/pod0-welsh-prealign-archive-2026-08-06/*-pod0-sentences-prealign.json),
 *   plus the two courses' own ~5,000 human-authored practice phrases for grammar
 *   the pod corpus does not cover ("it sounds as though", "makes me", "stupid",
 *   "I said", "would you like to", "I prefer"). Each course was drafted from ITS
 *   OWN corpus — never translated once and dialect-swapped.
 *
 * DIALECT SPINE HELD THROUGHOUT (all attested in the pod corpus)
 *   possession   N mae gen i / mae gynnon ni / oes gynnoch chi   S ma 'da fi / ma 'da ni / oes … 'da chi
 *   want, need   N isio, angen                                    S moyn, ishe / angen
 *   can          N fedra i, fedrwch chi, fedrwn ni, ga i          S alla i, allwch chi, allwn ni
 *   would like   N liciwn i, fasech chi'n licio                   S licen i, licech chi
 *   with / now   N efo, rŵan                                      S gyda, nawr
 *   say, hear    N deud, dallt                                    S gweud/dweud, deall
 *   what, that   N be, hynna                                      S beth, hynny
 *   it (m), yes  N fo / o, ia                                     S fe / e, ie
 *   a little     N chydig bach                                    S ychydig bach
 *   again, hot   N eto, poeth                                     S 'to, twym
 *
 * CONVENTIONS
 *   - `…` marks a breath / chunk break for the recorder, at the same sort of phrase
 *     boundaries and the same rough density as the surviving lines. Short lines
 *     carry none, exactly as the corpus does.
 *   - Numbers, days and times are always WORDS: the Welsh is spoken aloud, and the
 *     corpus spells them out even where the new canonical writes numerals.
 *   - Register follows the corpus scene by scene: `chi` in service encounters and
 *     with strangers, `ti`/`chdi` between friends. Scenes 15-21 are the learner out
 *     in the world — shops, stations, restaurants — so they are `chi` throughout,
 *     matching every comparable scene in the corpus. See the report's judgement calls.
 *   - "[target language]" resolves to Cymraeg, per the accepted plain-"Welsh"
 *     substitution on both courses.
 *
 * TWO KINDS OF ENTRY
 *   kind:'new'      — nothing existed; written from scratch against the corpus.
 *   kind:'reworded' — human Welsh existed but was written against English that has
 *                     since changed. `from` is that Welsh verbatim. Adapted MINIMALLY
 *                     — many needed no change at all (the English change was numerals
 *                     or a synonym the Welsh already covered), and those are still
 *                     marked draft because "it still fits" is my assertion, not Aran's.
 */
'use strict'

// ── Northern — cym_n_for_eng ────────────────────────────────────────────────
const NORTH = {
  // Scene 2 — on the bus, with a stranger: chi.
  'SC02-S002': { kind: 'new', cy: "Nac ydy, mae hi'n rhydd. Croeso i chi eistedd." },
  'SC02-S003': { kind: 'new', cy: "Pa mor bell ydy hi i'r dre?" },
  'SC02-S004': { kind: 'new', cy: "Fedrwch chi ddeud wrtha i… pa mor bell ydy hi i'r dre?" },
  'SC02-S005': { kind: 'new', cy: "Dydy hi ddim yn bell iawn. Falla tair neu bedair milltir." },

  // Scene 3 — the café.
  'SC03-S003': { kind: 'new', cy: "Oes gynnoch chi fwyd?" },
  'SC03-S004': { kind: 'new', cy: "Oes gynnoch chi fyrbrydau?" },
  'SC03-S005': { kind: 'new', cy: "Oes gynnoch chi greision,… neu gnau,… neu rwbath?" },
  'SC03-S006': { kind: 'new', cy: "Nag oes, dim ond diodydd… sy gynnon ni." },
  'SC03-S007': { kind: 'new', cy: "Oes,… fasech chi'n licio'r fwydlen?" },
  'SC03-S008': { kind: 'new', cy: "Ia, os gwelwch yn dda." },
  'SC03-S009': { kind: 'new', cy: "Dyma'ch coffi chi." },

  // Scene 5 — the neighbour again: ti/chdi. "I'll see you" → "See you": Welsh covers both.
  'SC05-S002': {
    kind: 'reworded',
    from: "Do, hir iawn. Dw i wedi… blino'n ofnadwy rŵan. Nos da. Wela i chdi fory.",
    cy: "Do, hir iawn. Dw i wedi… blino'n ofnadwy rŵan. Nos da. Wela i chdi fory.",
    note: 'no change — "Wela i chdi fory" already reads as both "I\'ll see you tomorrow" and "See you tomorrow".',
  },

  // Scene 6 — "Northern Welsh" → "Welsh". The Welsh already said Cymraeg.
  'SC06-S009': {
    kind: 'reworded',
    from: "Mae'n ddrwg gen i,… wnes i ddim eich dallt chi. Dw i'n dysgu Cymraeg. Fedrwch chi ddeud hynna… eto'n arafach?",
    cy: "Mae'n ddrwg gen i,… wnes i ddim eich dallt chi. Dw i'n dysgu Cymraeg. Fedrwch chi ddeud hynna… eto'n arafach?",
    note: 'no change — the Welsh always said "Cymraeg"; it is the English that has stopped saying "Northern".',
  },

  // Scene 8 — "Can I see" → "Could I see". "Ga i" carries both.
  'SC08-S006': {
    kind: 'reworded',
    from: "Ga i weld y rhestr win? Dw i isio gwydraid o win.",
    cy: "Ga i weld y rhestr win? Dw i isio gwydraid o win.",
    note: 'no change — "Ga i" is the corpus\'s form for both "can I" and "could I" (cf. "Ga i ddau goffi gwyn").',
  },

  // Scene 9 — "a table booked for two" → "a booking for two".
  'SC09-S001': {
    kind: 'reworded',
    from: "Noswaith dda. Mae gynnon ni fwrdd… wedi'i archebu i ddau,… dan yr enw Davies.",
    cy: "Noswaith dda. Mae gynnon ni fwcin i ddau,… dan yr enw Davies.",
    note: 'the table is gone from the English, so "fwrdd wedi\'i archebu" becomes plain "fwcin" — the word the Southern corpus already uses at this exact line.',
  },

  // Scene 10 — the shop.
  'SC10-S007': {
    kind: 'reworded',
    from: "Diolch yn fawr,… dach chi wedi bod yn help mawr. Dw i'n ddiolchgar iawn.",
    cy: "Diolch,… dach chi wedi bod yn help mawr. Dw i'n ddiolchgar iawn.",
    note: '"Thank you very much" → "Thank you": "yn fawr" comes off, nothing else moves.',
  },
  'SC10-S009': {
    kind: 'reworded',
    from: "Mae hynna'n garedig iawn! Ydw,… dw i yma ar wyliau,… a dw i angen ymarfer… mwy i siarad Cymraeg yn well. Diolch yn fawr, a hwyl.",
    cy: "Mae hynna'n garedig iawn! Ydw,… dw i yma ar wyliau,… a dw i angen ymarfer… mwy i siarad Cymraeg yn well. Diolch yn fawr, a hwyl.",
    note: 'no change — the English gained "of you" and swapped practise/practice spelling; "Mae hynna\'n garedig iawn" covers both readings.',
  },

  // Scene 11 — the hotel desk.
  'SC11-S001': {
    kind: 'reworded',
    from: "Prynhawn da. Mae gen i stafell… wedi'i bwcio… dan yr enw Jones.",
    cy: "Prynhawn da. Mae gen i fwcin… dan yr enw Jones.",
    note: 'the room is gone from the English, as at scene 9 — same fix, same word.',
  },
  'SC11-S002': {
    kind: 'reworded',
    from: "Croeso. Oes,… mae gynnoch chi stafell ddwbwl… am dair noson. Ga i weld rhywfaint o ID,… os gwelwch yn dda?",
    cy: "Croeso. Oes,… mae gynnoch chi stafell ddwbwl… am dair noson. Ga i weld rhywfaint o ID,… os gwelwch yn dda?",
    note: 'no change — "Can I see" → "Could I see" is already "Ga i weld".',
  },
  'SC11-S004': {
    kind: 'reworded',
    from: "Grêt. Mae'r stafell ar… y trydydd llawr,… stafell saith cant a naw.",
    cy: "Hyfryd. Mae'r stafell ar… y trydydd llawr,… stafell saith cant a naw.",
    note: '"Great" → "Lovely": "Grêt" becomes "Hyfryd", the corpus\'s word for lovely. 709 stays spelled out — it is spoken aloud.',
  },

  // Scene 12 — the pharmacy.
  'SC12-S001': {
    kind: 'reworded',
    from: "Bore da. Dw i ddim yn… teimlo'n dda iawn —… fedrwch chi argymell rhywbeth?",
    cy: "Bore da. Dw i ddim yn… teimlo'n grêt —… fedrwch chi argymell rhywbeth?",
    note: '"not feeling very well" → "not feeling great": "dda iawn" becomes "grêt".',
  },
  'SC12-S007': {
    kind: 'reworded',
    from: "Ydi hi'n iawn… i'w cymryd efo bwyd?",
    cy: "Ydi hi'n iawn… i'w cymryd efo bwyd?",
    note: 'no change — English moved from "is it all right to take them" to "are they all right to take"; the Welsh says the same thing either way.',
  },
  'SC12-S008': {
    kind: 'reworded',
    from: "Ydi, efo bwyd… neu ar ôl bwyd sydd orau.",
    cy: "Ydi, efo bwyd… neu ar ôl bwyd sydd orau.",
    note: 'no change — the Welsh already reads "with or after food".',
  },
  'SC12-S009': {
    kind: 'reworded',
    from: "Diolch yn fawr. Fedra i gael… paced o blasters hefyd?",
    cy: "Diolch. Fedra i gael… paced o blasters hefyd?",
    note: '"Thank you very much" → "Thank you", as at scene 10.',
  },
  'SC12-S010': {
    kind: 'reworded',
    from: "Un deg naw. Dau ddeg. Dau ddeg un. Dydd Mercher. Dydd Iau.",
    cy: "Un deg naw. Dau ddeg. Dau ddeg un. Dydd Mercher. Dydd Iau.",
    note: 'no change — the English switched to numerals; Welsh numbers are always words.',
  },

  // Scene 14 — the taxi.
  'SC14-S002': {
    kind: 'reworded',
    from: "Medra, wrth gwrs. Falla bydd o'n cymryd… dipyn o amser,… mae 'na lot o draffig… ar hyn o bryd.",
    cy: "Medra, wrth gwrs. Falla bydd o'n cymryd… dipyn o amser,… mae 'na lot o draffig… ar hyn o bryd.",
    note: 'no change — "Perhaps it will take" → "It may take" is "Falla bydd o\'n cymryd" either way.',
  },
  'SC14-S006': {
    kind: 'reworded',
    from: "Yndw, mi adawa i chi… reit wrth y swyddfa docynnau.",
    cy: "Yndw, mi wna i'ch gollwng chi… reit wrth y swyddfa docynnau.",
    note: '"I\'ll leave you" → "I\'ll drop you": "gollwng" is the drop-off verb, and it is what the Southern corpus uses at this line.',
  },
  'SC14-S009': {
    kind: 'reworded',
    from: "Medrwch, wrth gwrs. Mae'r peiriant reit fan hyn.",
    cy: "Medrwch, wrth gwrs. Mae'r peiriant yn fan hyn.",
    note: '"right here" → "just here": "reit" comes off.',
  },
  'SC14-S010': {
    kind: 'reworded',
    from: "Cant. Dau gant. Mil. Dydd Sul. Deuddeg o'r gloch.",
    cy: "Cant. Dau gant. Mil. Dydd Sul. Deuddeg o'r gloch.",
    note: 'no change — numerals in the English, words in the Welsh.',
  },

  // Scene 15 — the learner out in the world. Single voice, chunk drills. chi.
  'SC15-S001': { kind: 'new', cy: "Faint ydy hwnna?" },
  'SC15-S002': { kind: 'new', cy: "Fedrwch chi ddeud wrtha i… faint ydy hwnna?" },
  'SC15-S003': { kind: 'new', cy: "Faint mae'n gostio… i gael tacsi i'r dre?" },
  'SC15-S004': { kind: 'new', cy: "Faint mae'n gostio… i gael bws i'r dre?" },
  'SC15-S005': { kind: 'new', cy: "Ble fedrwn ni gael bws?" },
  'SC15-S006': { kind: 'new', cy: "Ble fedrwn ni gael tacsi?" },
  'SC15-S007': { kind: 'new', cy: "Pedwar tocyn unffordd i'r dre,… os gwelwch yn dda." },
  'SC15-S008': { kind: 'new', cy: "Dau docyn dwyffordd i'r dre,… os gwelwch yn dda." },
  'SC15-S009': { kind: 'new', cy: "Well gen i drio siarad… eich iaith chi,… dw i'n meddwl bod hynna'n gwrtais." },
  'SC15-S010': { kind: 'new', cy: "Mae'n ddrwg gen i… fedra i ddim siarad… yn gyflym iawn." },
  'SC15-S011': {
    kind: 'reworded',
    from: "Can mil. Chwe deg. Saith deg. Un o'r gloch. Un ar ddeg o'r gloch.",
    cy: "Can mil. Chwe deg. Saith deg. Un o'r gloch. Un ar ddeg o'r gloch.",
    note: 'no change — the numerals moved, the Welsh words did not.',
  },

  // Scene 16.
  'SC16-S001': { kind: 'new', cy: "Ond os fedrwch chi siarad… yn araf,… dw i'n meddwl… y byddwn ni'n gallu ymdopi." },
  'SC16-S002': { kind: 'new', cy: "Mi wnaethoch chi siarad… chydig bach yn rhy gyflym,… felly dw i ddim yn siŵr… os wnes i ddallt." },
  'SC16-S003': { kind: 'new', cy: "Fedrwn ni drio eto?" },
  'SC16-S004': { kind: 'new', cy: "Fedrwn ni weld y fwydlen?" },
  'SC16-S005': { kind: 'new', cy: "Fedrwn ni weld… y fwydlen bwdin hefyd?" },
  'SC16-S006': { kind: 'new', cy: "Oes gynnoch chi rwbath i'w fwyta?" },
  'SC16-S007': { kind: 'new', cy: "Fedrwn ni dalu?" },
  'SC16-S008': { kind: 'new', cy: "Fedrwn ni dalu efo cerdyn?" },
  'SC16-S009': { kind: 'new', cy: "Na,… dim ond arian parod… dan ni'n ei gymryd." },
  'SC16-S010': { kind: 'new', cy: "Mae'n ddrwg gen i,… does gen i ddim arian parod." },
  'SC16-S011': { kind: 'new', cy: "Miliwn. Wyth deg. Naw deg. Dau o'r gloch. Deg o'r gloch." },

  // Scene 17.
  'SC17-S001': { kind: 'new', cy: "Oes 'na beiriant arian… yn agos i fan hyn?" },
  'SC17-S002': { kind: 'new', cy: "Dach chi isio talu… efo arian parod neu gerdyn,… neu ei roi o ar y stafell?" },
  'SC17-S003': { kind: 'new', cy: "Fedrwn ni ei roi o ar y stafell,… os gwelwch yn dda?" },
  'SC17-S004': { kind: 'new', cy: "Fasech chi'n licio talu… efo arian parod neu gerdyn,… neu ar y stafell?" },
  'SC17-S005': { kind: 'new', cy: "Oeddech chi isio talu… efo arian parod neu gerdyn?" },
  'SC17-S006': { kind: 'new', cy: "Mi dalwn ni efo cerdyn eto,… os gwelwch yn dda." },
  'SC17-S007': { kind: 'new', cy: "Mae hi'n boeth heddiw, eto." },
  'SC17-S008': { kind: 'new', cy: "Ydy'r dŵr yn gynnes?" },
  'SC17-S009': { kind: 'new', cy: "Nac ydy,… mae hi chydig bach yn oer heddiw." },
  'SC17-S010': { kind: 'new', cy: "Dydy o ddim yn ddrwg." },
  'SC17-S011': { kind: 'new', cy: "Tri o'r gloch. Naw o'r gloch. Ionawr. Chwefror." },

  // Scene 18.
  'SC18-S001': { kind: 'new', cy: "Mae hwnna'n syniad drwg." },
  'SC18-S002': { kind: 'new', cy: "Oes gynnoch chi sudd oren?" },
  'SC18-S003': { kind: 'new', cy: "Oes gynnoch chi sudd afal?" },
  'SC18-S004': { kind: 'new', cy: "Ydy'r cwch yn gadael o fan hyn?" },
  'SC18-S005': { kind: 'new', cy: "Ydy'r bws yn gadael o fan hyn?" },
  'SC18-S006': { kind: 'new', cy: "O ble mae'r bws yn gadael?" },
  'SC18-S007': { kind: 'new', cy: "Ydy hynna'n gywir? Ydw i'n gywir?" },
  'SC18-S008': { kind: 'new', cy: "Ydw i'n anghywir am hynna?" },
  'SC18-S009': { kind: 'new', cy: "Mae'n ddrwg gen i,… mae fy mab i… wedi colli ei docyn." },
  'SC18-S010': { kind: 'new', cy: "Dan ni wedi talu,… ond mae fy merch i… wedi colli ei thocyn." },
  'SC18-S011': { kind: 'new', cy: "Pedwar o'r gloch. Wyth o'r gloch. Mawrth. Ebrill." },

  // Scene 19.
  'SC19-S001': { kind: 'new', cy: "Mae hynna'n gwneud fi'n hapus." },
  'SC19-S002': { kind: 'new', cy: "Mae hynna'n gwneud i mi deimlo… chydig bach yn bryderus." },
  'SC19-S003': { kind: 'new', cy: "Pan dach chi'n siarad… yn gyflym,… mae o'n gwneud i mi… deimlo'n ddwl." },
  'SC19-S004': { kind: 'new', cy: "Ydy hi'n iawn… os dw i'n eistedd yn fan hyn?" },
  'SC19-S005': { kind: 'new', cy: "Ydy hi'n iawn… os dan ni'n rhoi hwn yn fan hyn?" },
  'SC19-S006': { kind: 'new', cy: "Dw i ddim isio bod yn hwyr." },
  'SC19-S007': { kind: 'new', cy: "Ydan ni'n mynd i fod yn hwyr?" },
  'SC19-S008': { kind: 'new', cy: "Dw i'n addo… fydda i ddim yn hwyr." },
  'SC19-S009': { kind: 'new', cy: "Dw i'n addo… fyddwn ni ddim yn hwyr." },
  'SC19-S010': { kind: 'new', cy: "Liciwn i ddau sgŵp o hufen iâ,… os gwelwch yn dda." },
  'SC19-S011': { kind: 'new', cy: "Pump o'r gloch. Saith o'r gloch. Mai. Mehefin." },

  // Scene 20.
  'SC20-S001': { kind: 'new', cy: "Ga i un sgŵp o siocled… ac un o fefus?" },
  'SC20-S002': { kind: 'new', cy: "A wedyn côn arall… efo un sgŵp o lemon… ac un o lus." },
  'SC20-S003': { kind: 'new', cy: "Oes gynnoch chi hufen iâ?" },
  'SC20-S004': { kind: 'new', cy: "Diolch am eich holl waith chi." },
  'SC20-S005': { kind: 'new', cy: "Dw i'n dymuno pob lwc i chi… efo popeth." },
  'SC20-S006': { kind: 'new', cy: "Diolch am fy helpu i." },
  'SC20-S007': { kind: 'new', cy: "Pob lwc efo hynna!" },
  'SC20-S008': { kind: 'new', cy: "Mae hynna'n garedig iawn." },
  'SC20-S009': { kind: 'new', cy: "Dach chi'n garedig iawn." },
  'SC20-S010': { kind: 'new', cy: "Diolch am fod mor gyfeillgar." },
  'SC20-S011': { kind: 'new', cy: "Chwech o'r gloch. Gorffennaf. Awst. Medi." },

  // Scene 21.
  'SC21-S001': { kind: 'new', cy: "Mae hynna'n swnio fel… bod angen i ni adael… yn fuan." },
  'SC21-S002': { kind: 'new', cy: "Mae hynna'n swnio fel… dach chi isio i ni… beidio gwneud hynna." },
  'SC21-S003': { kind: 'new', cy: "Oes 'na dŷ bach yma?" },
  'SC21-S004': { kind: 'new', cy: "Fedrwch chi ddeud wrtha i… ble mae'r tŷ bach?" },
  'SC21-S005': { kind: 'new', cy: "Mae o i lawr fanna… ar y chwith." },
  'SC21-S006': { kind: 'new', cy: "Mae o i lawr fanna… ar y dde." },
  'SC21-S007': { kind: 'new', cy: "Fedrwch chi ddeud hynna eto?" },
  'SC21-S008': { kind: 'new', cy: "Medra,… mi ddudes i… ei fod o draw acw." },
  'SC21-S009': { kind: 'new', cy: "Be ydy hwnna?" },
  'SC21-S010': { kind: 'new', cy: "Be ydy hwnna draw acw?" },
  'SC21-S011': { kind: 'new', cy: "Fasech chi'n licio archebu… rhyw ddiodydd?" },
  'SC21-S012': { kind: 'new', cy: "Dach chi isio archebu… rhyw ddiodydd yn gynta?" },
  'SC21-S013': { kind: 'new', cy: "Oeddech chi isio rwbath… i'w yfed yn gynta?" },
  'SC21-S014': { kind: 'new', cy: "Hydref. Tachwedd. Rhagfyr." },
}

// ── Southern — cym_s_for_eng ────────────────────────────────────────────────
const SOUTH = {
  // Scene 2 — S002 already has human Welsh and is not touched.
  'SC02-S003': { kind: 'new', cy: "Pa mor bell yw hi i'r dre?" },
  'SC02-S004': { kind: 'new', cy: "Allwch chi weud wrtha i… pa mor bell yw hi i'r dre?" },
  'SC02-S005': { kind: 'new', cy: "Dyw hi ddim yn bell iawn. Falle tair neu bedair milltir." },

  // Scene 3 — the café.
  'SC03-S003': { kind: 'new', cy: "Oes bwyd 'da chi?" },
  'SC03-S004': { kind: 'new', cy: "Oes byrbrydau 'da chi?" },
  'SC03-S005': { kind: 'new', cy: "Oes creision 'da chi,… neu gnau,… neu rywbeth?" },
  'SC03-S006': { kind: 'new', cy: "Nag oes, dim ond diodydd… sy 'da ni." },
  'SC03-S007': { kind: 'new', cy: "Oes,… licech chi'r fwydlen?" },
  'SC03-S008': { kind: 'new', cy: "Ie, os gwelwch yn dda." },
  'SC03-S009': { kind: 'new', cy: "Dyma'ch coffi chi." },

  // Scene 5 — "absolutely exhausted" → "very tired".
  'SC05-S002': {
    kind: 'reworded',
    from: "Do, hir iawn. Dw i wedi… blino'n lân nawr. Nos da. Wela i di fory.",
    cy: "Do, hir iawn. Dw i wedi… blino'n ofnadwy nawr. Nos da. Wela i di fory.",
    note: '"absolutely exhausted" → "very tired": "blino\'n lân" is exhausted, so it steps down to "blino\'n ofnadwy" — the word the Northern corpus uses at this same line.',
  },

  // Scene 7 — the coffee counter.
  'SC07-S003': {
    kind: 'reworded',
    from: "Ydych chi moyn un arferol… neu un mawr?",
    cy: "Ydych chi moyn maint arferol… neu fawr?",
    note: '"a regular one or a large one" → "regular or large": the "one" drops out, matching the Northern corpus\'s "maint arferol… neu fawr".',
  },
  'SC07-S004': {
    kind: 'reworded',
    from: "Licen i un mawr,… os gwelwch yn dda. Gyda llaeth ceirch… os yw e 'da chi.",
    cy: "Licen i un mawr,… os gwelwch yn dda. Gyda llaeth ceirch… os yw e 'da chi.",
    note: 'no change — "I\'d like a large one" → "I\'d like large" is still "Licen i un mawr", exactly as the Northern corpus has it.',
  },
  'SC07-S005': {
    kind: 'reworded',
    from: "Wrth gwrs. Ydych chi moyn eistedd i mewn… neu fynd â fe mas?",
    cy: "Wrth gwrs. Ydych chi moyn eistedd i mewn… neu fynd â fe?",
    note: '"take it away" → "takeaway": "mas" comes off, leaving the same shape as the Northern corpus\'s "neu fynd â fo?".',
  },
  'SC07-S006': {
    kind: 'reworded',
    from: "Licen i fynd â fe mas,… os gwelwch yn dda.",
    cy: "Licen i fynd â fe,… os gwelwch yn dda.",
    note: 'same edit as the line above, kept in step with it.',
  },

  // Scene 8.
  'SC08-S006': {
    kind: 'reworded',
    from: "Alla i weld y rhestr win? Dw i moyn gwydraid o win.",
    cy: "Alla i weld y rhestr win? Dw i moyn gwydraid o win.",
    note: 'no change — "Alla i" carries both "can I" and "could I".',
  },

  // Scene 10 — practise/practice spelling only.
  'SC10-S009': {
    kind: 'reworded',
    from: "Dych chi'n garedig iawn! Ydw, dw i ar wyliau,… ac ma ishe… i fi ymarfer mwy… i siarad Cymraeg yn well. Diolch yn fawr iawn, a hwyl.",
    cy: "Dych chi'n garedig iawn! Ydw, dw i ar wyliau,… ac ma ishe… i fi ymarfer mwy… i siarad Cymraeg yn well. Diolch yn fawr iawn, a hwyl.",
    note: 'no change — only the English spelling of "practise" moved.',
  },

  // Scene 11 — room number written as a numeral in the new English.
  'SC11-S004': {
    kind: 'reworded',
    from: "Bendigedig. Ma'r stafell ar… y trydydd llawr,… stafell saith cant a naw.",
    cy: "Bendigedig. Ma'r stafell ar… y trydydd llawr,… stafell saith cant a naw.",
    note: 'no change — 709 is spoken aloud, so it stays "saith cant a naw".',
  },

  // Scene 12 — the pharmacy.
  'SC12-S001': {
    kind: 'reworded',
    from: "Bore da. Dw i ddim yn… teimlo'n dda iawn… — allwch chi argymell rhywbeth?",
    cy: "Bore da. Dw i ddim yn… teimlo'n grêt… — allwch chi argymell rhywbeth?",
    note: '"not feeling very well" → "not feeling great", as on the Northern course.',
  },
  'SC12-S010': {
    kind: 'reworded',
    from: "Un deg naw. Dau ddeg. Dau ddeg un. Dydd Mercher. Dydd Iau.",
    cy: "Un deg naw. Dau ddeg. Dau ddeg un. Dydd Mercher. Dydd Iau.",
    note: 'no change — numerals in the English, words in the Welsh.',
  },

  // Scene 14 — the taxi.
  'SC14-S002': {
    kind: 'reworded',
    from: "Galla, wrth gwrs. Falle bydd hi'n cymryd… tipyn o amser —… ma lot o draffig… ar hyn o bryd.",
    cy: "Galla, wrth gwrs. Falle bydd hi'n cymryd… tipyn o amser,… ma 'na lot o draffig… ar hyn o bryd.",
    note: 'the English dash became a comma, so the Welsh dash follows it; "ma \'na lot" restores the existential the corpus uses elsewhere.',
  },
  'SC14-S007': {
    kind: 'reworded',
    from: "Dyma ni. Deuddeg punt a hanner yw hi.",
    cy: "Dyma ni. Deuddeg punt a hanner yw hi.",
    note: 'no change — "twelve pounds fifty" → "twelve pound fifty" is the same amount, and "punt a hanner" is how it is said.',
  },
  'SC14-S009': {
    kind: 'reworded',
    from: "Gallwch, wrth gwrs. Ma'r peiriant reit fan hyn.",
    cy: "Gallwch, wrth gwrs. Ma'r peiriant… jyst fan hyn.",
    note: '"right here" → "just here": "reit" becomes "jyst", the corpus\'s Southern word.',
  },
  'SC14-S010': {
    kind: 'reworded',
    from: "Cant. Dau gant. Mil. Dydd Sul. Deuddeg o'r gloch.",
    cy: "Cant. Dau gant. Mil. Dydd Sul. Deuddeg o'r gloch.",
    note: 'no change — numerals in the English, words in the Welsh.',
  },

  // Scene 15.
  'SC15-S001': { kind: 'new', cy: "Faint yw hwnna?" },
  'SC15-S002': { kind: 'new', cy: "Allwch chi weud wrtha i… faint yw hwnna?" },
  'SC15-S003': { kind: 'new', cy: "Faint ma'n gostio… i gael tacsi i'r dre?" },
  'SC15-S004': { kind: 'new', cy: "Faint ma'n gostio… i gael bws i'r dre?" },
  'SC15-S005': { kind: 'new', cy: "Ble allwn ni gael bws?" },
  'SC15-S006': { kind: 'new', cy: "Ble allwn ni gael tacsi?" },
  'SC15-S007': { kind: 'new', cy: "Pedwar tocyn unffordd i'r dre,… os gwelwch yn dda." },
  'SC15-S008': { kind: 'new', cy: "Dau docyn dwyffordd i'r dre,… os gwelwch yn dda." },
  'SC15-S009': { kind: 'new', cy: "Mae'n well 'da fi drio siarad… eich iaith chi,… dw i'n meddwl bod hynny'n gwrtais." },
  'SC15-S010': { kind: 'new', cy: "Mae'n ddrwg 'da fi… alla i ddim siarad… yn gyflym iawn." },
  'SC15-S011': {
    kind: 'reworded',
    from: "Can mil. Chwe deg. Saith deg. Un o'r gloch. Un ar ddeg o'r gloch.",
    cy: "Can mil. Chwe deg. Saith deg. Un o'r gloch. Un ar ddeg o'r gloch.",
    note: 'no change — the numerals moved, the Welsh words did not.',
  },

  // Scene 16.
  'SC16-S001': { kind: 'new', cy: "Ond os allwch chi siarad… yn araf,… dw i'n meddwl… y byddwn ni'n gallu ymdopi." },
  'SC16-S002': { kind: 'new', cy: "Fe wnaethoch chi siarad… ychydig bach yn rhy gyflym,… felly dw i ddim yn siŵr… os wnes i ddeall." },
  'SC16-S003': { kind: 'new', cy: "Allwn ni drio 'to?" },
  'SC16-S004': { kind: 'new', cy: "Allwn ni weld y fwydlen?" },
  'SC16-S005': { kind: 'new', cy: "Allwn ni weld… y fwydlen bwdin hefyd?" },
  'SC16-S006': { kind: 'new', cy: "Oes rhywbeth i'w fwyta 'da chi?" },
  'SC16-S007': { kind: 'new', cy: "Allwn ni dalu?" },
  'SC16-S008': { kind: 'new', cy: "Allwn ni dalu gyda cherdyn?" },
  'SC16-S009': { kind: 'new', cy: "Na,… dim ond arian parod… ry'n ni'n ei gymryd." },
  'SC16-S010': { kind: 'new', cy: "Mae'n ddrwg 'da fi,… does dim arian parod 'da fi." },
  'SC16-S011': { kind: 'new', cy: "Miliwn. Wyth deg. Naw deg. Dau o'r gloch. Deg o'r gloch." },

  // Scene 17.
  'SC17-S001': { kind: 'new', cy: "Oes 'na beiriant arian… yn agos 'ma?" },
  'SC17-S002': { kind: 'new', cy: "Ydych chi moyn talu… gydag arian parod neu gerdyn,… neu ei roi e ar y stafell?" },
  'SC17-S003': { kind: 'new', cy: "Allwn ni ei roi e ar y stafell,… os gwelwch yn dda?" },
  'SC17-S004': { kind: 'new', cy: "Licech chi dalu… gydag arian parod neu gerdyn,… neu ar y stafell?" },
  'SC17-S005': { kind: 'new', cy: "Oeddech chi moyn talu… gydag arian parod neu gerdyn?" },
  'SC17-S006': { kind: 'new', cy: "Fe dalwn ni gyda cherdyn 'to,… os gwelwch yn dda." },
  'SC17-S007': { kind: 'new', cy: "Ma hi'n dwym heddiw, 'to." },
  'SC17-S008': { kind: 'new', cy: "Ydy'r dŵr yn gynnes?" },
  'SC17-S009': { kind: 'new', cy: "Nac ydy,… ma hi ychydig bach yn oer heddiw." },
  'SC17-S010': { kind: 'new', cy: "Dyw e ddim yn ddrwg." },
  'SC17-S011': { kind: 'new', cy: "Tri o'r gloch. Naw o'r gloch. Ionawr. Chwefror." },

  // Scene 18.
  'SC18-S001': { kind: 'new', cy: "Ma hwnna'n syniad drwg." },
  'SC18-S002': { kind: 'new', cy: "Oes sudd oren 'da chi?" },
  'SC18-S003': { kind: 'new', cy: "Oes sudd afal 'da chi?" },
  'SC18-S004': { kind: 'new', cy: "Ydy'r cwch yn gadael o fan hyn?" },
  'SC18-S005': { kind: 'new', cy: "Ydy'r bws yn gadael o fan hyn?" },
  'SC18-S006': { kind: 'new', cy: "O ble ma'r bws yn gadael?" },
  'SC18-S007': { kind: 'new', cy: "Ydy hynny'n gywir? Ydw i'n gywir?" },
  'SC18-S008': { kind: 'new', cy: "Ydw i'n anghywir am hynny?" },
  'SC18-S009': { kind: 'new', cy: "Mae'n ddrwg 'da fi,… ma fy mab i… wedi colli ei docyn." },
  'SC18-S010': { kind: 'new', cy: "Ry'n ni wedi talu,… ond ma fy merch i… wedi colli ei thocyn." },
  'SC18-S011': { kind: 'new', cy: "Pedwar o'r gloch. Wyth o'r gloch. Mawrth. Ebrill." },

  // Scene 19.
  'SC19-S001': { kind: 'new', cy: "Ma hynny'n fy ngwneud i'n hapus." },
  'SC19-S002': { kind: 'new', cy: "Ma hynny'n gwneud i fi deimlo… ychydig bach yn bryderus." },
  'SC19-S003': { kind: 'new', cy: "Pan dych chi'n siarad… yn gyflym,… ma fe'n gwneud i fi… deimlo'n dwp." },
  'SC19-S004': { kind: 'new', cy: "Ydy hi'n iawn… os dw i'n eistedd fan hyn?" },
  'SC19-S005': { kind: 'new', cy: "Ydy hi'n iawn… os ry'n ni'n rhoi hwn fan hyn?" },
  'SC19-S006': { kind: 'new', cy: "Dw i ddim moyn bod yn hwyr." },
  'SC19-S007': { kind: 'new', cy: "Ydyn ni'n mynd i fod yn hwyr?" },
  'SC19-S008': { kind: 'new', cy: "Dw i'n addo… fydda i ddim yn hwyr." },
  'SC19-S009': { kind: 'new', cy: "Dw i'n addo… fyddwn ni ddim yn hwyr." },
  'SC19-S010': { kind: 'new', cy: "Licen i ddau sgŵp o hufen iâ,… os gwelwch yn dda." },
  'SC19-S011': { kind: 'new', cy: "Pump o'r gloch. Saith o'r gloch. Mai. Mehefin." },

  // Scene 20.
  'SC20-S001': { kind: 'new', cy: "Alla i gael un sgŵp o siocled… ac un o fefus?" },
  'SC20-S002': { kind: 'new', cy: "A wedyn côn arall… gydag un sgŵp o lemon… ac un o lus." },
  'SC20-S003': { kind: 'new', cy: "Oes hufen iâ 'da chi?" },
  'SC20-S004': { kind: 'new', cy: "Diolch am eich holl waith chi." },
  'SC20-S005': { kind: 'new', cy: "Dw i'n dymuno pob lwc i chi… gyda phopeth." },
  'SC20-S006': { kind: 'new', cy: "Diolch am fy helpu i." },
  'SC20-S007': { kind: 'new', cy: "Pob lwc gyda hynny!" },
  'SC20-S008': { kind: 'new', cy: "Ma hynny'n garedig iawn." },
  'SC20-S009': { kind: 'new', cy: "Dych chi'n garedig iawn." },
  'SC20-S010': { kind: 'new', cy: "Diolch am fod mor gyfeillgar." },
  'SC20-S011': { kind: 'new', cy: "Chwech o'r gloch. Gorffennaf. Awst. Medi." },

  // Scene 21.
  'SC21-S001': { kind: 'new', cy: "Ma hynny'n swnio fel… bod angen i ni adael… yn fuan." },
  'SC21-S002': { kind: 'new', cy: "Ma hynny'n swnio fel… dych chi moyn i ni… beidio gwneud hynny." },
  'SC21-S003': { kind: 'new', cy: "Oes 'na dŷ bach 'ma?" },
  'SC21-S004': { kind: 'new', cy: "Allwch chi weud wrtha i… ble ma'r tŷ bach?" },
  'SC21-S005': { kind: 'new', cy: "Ma fe lawr fan'na… ar y chwith." },
  'SC21-S006': { kind: 'new', cy: "Ma fe lawr fan'na… ar y dde." },
  'SC21-S007': { kind: 'new', cy: "Allwch chi weud 'na 'to?" },
  'SC21-S008': { kind: 'new', cy: "Galla,… fe ddwedes i… ei fod e draw fan'na." },
  'SC21-S009': { kind: 'new', cy: "Beth yw hwnna?" },
  'SC21-S010': { kind: 'new', cy: "Beth yw hwnna draw fan'na?" },
  'SC21-S011': { kind: 'new', cy: "Licech chi archebu… rhyw ddiodydd?" },
  'SC21-S012': { kind: 'new', cy: "Ydych chi moyn archebu… rhyw ddiodydd yn gyntaf?" },
  'SC21-S013': { kind: 'new', cy: "Oeddech chi moyn rhywbeth… i'w yfed yn gyntaf?" },
  'SC21-S014': { kind: 'new', cy: "Hydref. Tachwedd. Rhagfyr." },
}

const DRAFTS = { cym_n_for_eng: NORTH, cym_s_for_eng: SOUTH }

/** Slot id → draft entry, for one course. Keys are the bare "SC07-S003" form. */
function draftsFor(course) {
  const d = DRAFTS[course]
  if (!d) throw new Error(`no pod-0 drafts for course ${course}`)
  return d
}

module.exports = { DRAFTS, draftsFor, POD_SLUG: 'pod-0' }
