#!/usr/bin/env node
/**
 * cym-n-health-recast — the Welsh NORTH health pod, rewritten for a MALE ward
 * patient, split into four named characters, and cast by speaker.
 *
 * Tom's ruling, 2026-09-16 ("Yes, rewrite — it's a BSC"), on job #990's casting
 * report: scenes 1–12 of `cym_n_for_eng:health` put two women — Nurse Siân and
 * ward patient Margaret "Peggy" Hughes — in every one of 234 exchanges, and no
 * assignment of the four Welsh voices can make that a male/female pairing. The
 * fix is to the SCRIPT, not the casting: the ward patient becomes William "Wil"
 * Hughes, his three "my husband" references become "my wife", and every Welsh
 * form the change touches is corrected with him.
 *
 * WHAT MAKES THIS FOUR CHARACTERS AND NOT TWO. The stored script carries two
 * speaker labels, HW and P, and they mean different people either side of the
 * Part 1 / Part 2 seam: HW is the nurse in scenes 1–12 and the doctor in 13–23,
 * P is the ward patient then the GP patient. voice_config.podCast is keyed by
 * SPEAKER NAME (services/voice-engine/pods-registration.cjs), so two labels can
 * only ever carry two voices — casting HW→Catrin would have handed Aran the
 * ward patient. Splitting the labels is what makes per-character casting
 * expressible at all.
 *
 * THE WELSH EDITS ARE MACHINE-MADE AND SAY SO. Every line this tool rewrites is
 * marked in two places a human actually looks: the canonical row's author_notes
 * carries a MACHINE-EDITED stamp (Script Lab renders it, and the version history
 * puts an "edited" chip on exactly these lines), and the registered pod line is
 * born `target_text_draft = true`, which is the DRAFT — AWAITING PROOFREAD badge
 * in Pod Detail and in the booth autocue. Aran reads them with attention because
 * the surfaces tell him to.
 *
 * WHAT IT DOES NOT DO: no TTS, no audio of any kind, no invitation sent. The pod
 * is registered `visibility='held'` — invisible to learners (RLS), visible to
 * the recordist queue, which does not filter on visibility. That is the
 * "cast, awaiting booth" state. The South layer `cym_s_for_eng:health` is never
 * read for write and never touched.
 *
 * DRY RUN BY DEFAULT. --apply writes inside one transaction and refuses on any
 * before-state drift: every text edit names the exact words it expects to find.
 *
 *   node tools/pods/cym-n-health-recast.cjs
 *   node tools/pods/cym-n-health-recast.cjs --apply
 */
'use strict'

const ENG_SLUG = 'health'
const CYM_SLUG = 'cym_n_for_eng:health'
const POD_ID = 'cym_n_for_eng:health'
const COURSE = 'cym_n_for_eng'
const SAVED_BY = 'job-992-machine-rewrite'
const STAMP = 'MACHINE-EDITED 2026-09-16 (job #992) — ward patient rewritten male; Aran please read with attention'

// ── The four characters ────────────────────────────────────────────────────
// Part 1 (scenes 1–12) is the nurse sequence; Part 2 (13–23) the doctor's.
// The seam is a fact of the authored script (author_notes says "Part 1:" /
// "Part 2:" on every row), not a guess.
const PART2_FIRST_SCENE = 13

const NURSE = 'Nurse Siân'
const WARD_PATIENT = 'Wil Hughes'
const DOCTOR = 'Doctor'
const GP_PATIENT = 'GP Patient'

/** Which of the four people is speaking, from the stored label and the scene. */
function speakerFor(sceneNumber, label) {
  const part2 = sceneNumber >= PART2_FIRST_SCENE
  if (label === 'HW') return part2 ? DOCTOR : NURSE
  if (label === 'P') return part2 ? GP_PATIENT : WARD_PATIENT
  return null
}

const ARAN = { name: 'Aran', email: 'aran@hey.com', gender: 'm', voiceId: 'human_aran_cym_n' }
const CATRIN = { name: 'Catrin', email: 'catrinlliar@gmail.com', gender: 'f', voiceId: 'human_catrinlliar_cym_n' }

// Aran voices both men, Catrin Lliar both women — Tom's ruling, step 3.
const CAST = {
  [NURSE]: CATRIN,
  [DOCTOR]: CATRIN,
  [WARD_PATIENT]: ARAN,
  [GP_PATIENT]: ARAN,
}

/**
 * Every adjacent pair of turns within a scene where both speakers are the same
 * sex. The thing Tom asked to be verified as zero, computed from the rows the
 * booth will actually serve rather than from the intention behind them.
 * Rows must be ordered by global_order.
 */
function sameSexExchanges(rows, cast = CAST) {
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i]
    if (a.scene_number !== b.scene_number) continue
    if (a.variant_key !== b.variant_key) continue
    if (a.speaker === b.speaker) continue           // same person twice is not an exchange
    const ga = cast[a.speaker] && cast[a.speaker].gender
    const gb = cast[b.speaker] && cast[b.speaker].gender
    if (!ga || !gb) { out.push({ a: a.id, b: b.id, reason: 'uncast speaker' }); continue }
    if (ga === gb) out.push({ a: a.id, b: b.id, reason: `both ${ga}: ${a.speaker} / ${b.speaker}` })
  }
  return out
}

// ── The edits ───────────────────────────────────────────────────────────────
// [global_order, exact text expected in the DB, the replacement]. The `from` is
// the drift guard: a row whose words have moved on since this table was written
// aborts the run rather than being overwritten from a stale premise.

// Margaret "Peggy" Hughes → William "Wil" Hughes; three husbands → wives.
const ENGLISH_EDITS = [
  [38, 'Margaret. But everyone calls me Peggy.',
       'William. But everyone calls me Wil.'],
  [39, "Lovely to meet you, Peggy. I've got a few little jobs to do with you this morning, if that's alright.",
       "Lovely to meet you, Wil. I've got a few little jobs to do with you this morning, if that's alright."],
  [40, "Peggy's fine, everyone calls me Peggy. Right then, what's first?",
       "Wil's fine, everyone calls me Wil. Right then, what's first?"],
  [62, "What time's visiting? My husband wants to come this evening.",
       "What time's visiting? My wife wants to come this evening."],
  [76, "That's not so bad. Tighter than my husband's handshake, mind.",
       "That's not so bad. Tighter than my wife's handshake, mind."],
  [124, "Margaret Hughes, third of March, forty-one. It's the tablets I don't recognise, see.",
        "William Hughes, third of March, forty-one. It's the tablets I don't recognise, see."],
  [221, 'Right then, Mrs Hughes, you take care of yourself. And nothing heavier than the kettle for two weeks.',
        'Right then, Mr Hughes, you take care of yourself. And nothing heavier than the kettle for two weeks.'],
  [232, "999, no hesitating. My husband will remember that even if I don't.",
        "999, no hesitating. My wife will remember that even if I don't."],
]

// The same eight, plus ONE the English does not carry: scene 1 sentence 5 counts
// the patient and her daughter as "chi'ch dwy" — two females. A male patient and
// his daughter are a mixed pair, which North Welsh counts "chi'ch dau". English
// says "you both" and needs no edit, which is exactly why a line-for-line
// translation check would have missed it.
// gŵr → gwraig keeps the nasal mutation after `fy`: fy ngŵr → fy ngwraig.
const WELSH_EDITS = [
  [35, "Dyna i be mae teulu. Reit — efo chi'ch dwy yma, dewch i ni ddechra.",
       "Dyna i be mae teulu. Reit — efo chi'ch dau yma, dewch i ni ddechra."],
  [38, 'Margaret. Ond Peggy mae pawb yn fy ngalw i.',
       'William. Ond Wil mae pawb yn fy ngalw i.'],
  [39, "Braf eich cyfarfod chi, Peggy. Mae gen i chydig o jobsys bach i'w gneud efo chi bore 'ma, os ydy hynny'n iawn.",
       "Braf eich cyfarfod chi, Wil. Mae gen i chydig o jobsys bach i'w gneud efo chi bore 'ma, os ydy hynny'n iawn."],
  [40, "Mae Peggy'n iawn — Peggy mae pawb yn fy ngalw i. Reit 'ta, be sy gynta?",
       "Mae Wil yn iawn — Wil mae pawb yn fy ngalw i. Reit 'ta, be sy gynta?"],
  [62, "Faint o'r gloch ydy'r oriau ymweld? Mae fy ngŵr i isio dod heno.",
       "Faint o'r gloch ydy'r oriau ymweld? Mae fy ngwraig i isio dod heno."],
  [76, "Dydy hynna ddim mor ddrwg. Tynnach nag ysgwyd llaw fy ngŵr i, cofiwch.",
       "Dydy hynna ddim mor ddrwg. Tynnach nag ysgwyd llaw fy ngwraig i, cofiwch."],
  [124, "Margaret Hughes, y trydydd o Fawrth, pedwar deg un. Y tabledi dw i ddim yn eu nabod, ylwch.",
        "William Hughes, y trydydd o Fawrth, pedwar deg un. Y tabledi dw i ddim yn eu nabod, ylwch."],
  [221, "Reit 'ta, Mrs Hughes — cymrwch ofal ohonoch chi'ch hun. A dim byd trymach na'r tegell am bythefnos.",
        "Reit 'ta, Mr Hughes — cymrwch ofal ohonoch chi'ch hun. A dim byd trymach na'r tegell am bythefnos."],
  [232, "999, dim oedi. Mi fydd fy ngŵr i'n cofio hynna hyd yn oed os na fydda i.",
        "999, dim oedi. Mi fydd fy ngwraig i'n cofio hynna hyd yn oed os na fydda i."],
]

/**
 * No female-marked reference to the ward patient may survive. Run over the
 * POST-edit text of scenes 1–12, so it convicts the result rather than the plan.
 * "del" and "bach" are the patient addressing the NURSE and are governed by HER
 * sex, not his — they stay, deliberately.
 */
const FEMALE_RESIDUE = [
  /\bPeggy\b/i, /\bMargaret\b/i, /\bMrs\b/i, /\bhusband\b/i,
  /\bfy ngŵr\b/i, /\bchi'ch dwy\b/i,
]

function femaleResidue(rows) {
  return rows
    .filter(r => r.scene_number < PART2_FIRST_SCENE)
    .flatMap(r => FEMALE_RESIDUE
      .filter(re => re.test(r.target_text || '') || re.test(r.english_text || ''))
      .map(re => ({ id: r.id, pattern: String(re) })))
}

module.exports = {
  ENG_SLUG, CYM_SLUG, POD_ID, COURSE, SAVED_BY, STAMP, PART2_FIRST_SCENE,
  NURSE, WARD_PATIENT, DOCTOR, GP_PATIENT, ARAN, CATRIN, CAST,
  ENGLISH_EDITS, WELSH_EDITS,
  speakerFor, sameSexExchanges, femaleResidue,
}

if (require.main === module) require('./cym-n-health-recast.run.cjs')
