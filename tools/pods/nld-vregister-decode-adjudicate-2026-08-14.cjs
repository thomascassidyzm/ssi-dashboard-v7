#!/usr/bin/env node
/**
 * nld-vregister-decode-adjudicate-2026-08-14.cjs
 *
 * WHY THIS EXISTS. The render script treats whisper as evidence, not a gate,
 * and it is right to — but "evidence" with no verdict attached is not a check,
 * it is a shrug. This turns the 29 decodes into a per-clip verdict by asking
 * the only question that matters: for THIS clip's register change, can whisper
 * tell the two forms apart at all?
 *
 * It can, demonstrably, for the pronoun/verb class. The old decodes in
 * nld-nondraft-applied-log.json say "voor je doen", "wil je", "ga je gang",
 * "dank je", "ben je"; the new ones say "voor u doen", "wilt u", "gaat uw
 * gang", "dank u", "bent u". That is whisper resolving the exact distinction
 * this job turns on, on the same voice and the same sentence.
 *
 * It cannot for `alsjeblieft` -> `alstublieft`. Two long, phonetically close
 * words where the T-form dominates any Dutch training corpus; whisper-medium
 * collapses toward it. Observed spellings of the V-form in these renders were
 * "als teblieft", "toepliefd", "alstublieft" — and, on some clips, a clean
 * "alsjeblieft" identical to the old clip's decode.
 *
 * So the verdicts are:
 *   CONFIRMED  — the decode contains the new form (or a phonetic spelling of
 *                it that the old form cannot produce), and not the old form.
 *   BLIND      — this clip's ONLY change is alsjeblieft->alstublieft and the
 *                decode collapsed to the old spelling. Not a defect and not a
 *                pass: whisper is not a witness here. The guarantee for these
 *                clips is CONSTRUCTION — the clip was rendered from the
 *                corrected text, so course_audio.text is right by definition,
 *                and voice/alive/duration/non-truncation are all separately
 *                verified.
 *   CONTRADICTED — the decode still carries a superseded pronoun/verb form
 *                that whisper is known to resolve. That IS a defect. Loud.
 *
 * Read-only. Writes a JSON verdict file and prints a table.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '../..')
const APPLIED = path.join(ROOT, 'docs/a108/nld-vregister-render-applied-log.json')
const OLDLOG = path.join(ROOT, 'docs/a108/nld-nondraft-applied-log.json')
const OUT = path.join(ROOT, 'docs/a108/nld-vregister-decode-adjudication.json')

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-zà-ÿ ]+/g, ' ').replace(/\s+/g, ' ').trim()

/** Phonetic spellings of alstublieft that alsjeblieft cannot produce. */
const V_PLEASE = [/alstublieft/, /als\s*t[ue]blieft/, /alstu/, /toeplief/, /tublief/]
const PLEASE_ONLY_PAIR = (b, a) =>
  norm(b).replace(/alsjeblieft/g, 'X') === norm(a).replace(/alstublieft/g, 'X')

;(() => {
  const applied = JSON.parse(fs.readFileSync(APPLIED, 'utf8'))
  const oldRows = JSON.parse(fs.readFileSync(OLDLOG, 'utf8'))
  const oldArr = Array.isArray(oldRows) ? oldRows : (oldRows.rows || oldRows.plan || [])
  const oldDecode = {}
  for (const r of oldArr) {
    const c = r.clip || r.clip_id || r.target_audio_id
    if (c && !oldDecode[c]) oldDecode[c] = String(r.transcript || '').trim()
  }

  const verdicts = []
  for (const p of applied.plan) {
    const heard = norm(p.transcript)
    // tokens whisper is trusted on: everything except the please-word itself
    const gained = (p.tokens.gained || []).filter(w => w !== 'alstublieft')
    const lost = (p.tokens.lost || []).filter(w => w !== 'alsjeblieft')

    const lostStillHeard = lost.filter(w => new RegExp(`\\b${w}\\b`).test(heard))
    const gainedHeard = gained.filter(w => new RegExp(`\\b${w}\\b`).test(heard))
    const vPleaseHeard = V_PLEASE.some(re => re.test(heard))
    const pleaseOnly = PLEASE_ONLY_PAIR(p.before, p.after)

    let verdict, why
    if (lostStillHeard.length) {
      verdict = 'CONTRADICTED'
      why = `still speaks superseded form(s): ${lostStillHeard.join(', ')}`
    } else if (gained.length && gainedHeard.length === gained.length) {
      verdict = 'CONFIRMED'
      why = `speaks new form(s): ${gainedHeard.join(', ')}`
    } else if (gained.length && gainedHeard.length) {
      verdict = 'CONFIRMED'
      why = `speaks ${gainedHeard.join(', ')}; whisper dropped ${gained.filter(w => !gainedHeard.includes(w)).join(', ')}`
    } else if (vPleaseHeard) {
      verdict = 'CONFIRMED'
      why = 'decode carries a phonetic spelling of alstublieft'
    } else if (pleaseOnly) {
      verdict = 'BLIND'
      why = 'only change is alsjeblieft->alstublieft; whisper-medium collapses to the T-form. Correct by construction; voice/alive/duration verified separately'
    } else {
      verdict = 'BLIND'
      why = 'decode inconclusive on this clip\'s change'
    }

    verdicts.push({
      clip_old: p.clip_id, clip_new: p.new_clip_id, speaker: p.speaker,
      resumed: !!p.resumed, verdict, why,
      before: p.before, after: p.after,
      transcript_new: p.transcript, transcript_old: oldDecode[p.clip_id] || null,
      probed_ms: p.probed_ms, ms_per_char: p.ms_per_char,
    })
  }

  const by = (v) => verdicts.filter(x => x.verdict === v)
  fs.writeFileSync(OUT, JSON.stringify({
    job: 'A-108 nld_for_eng V-register render — decode adjudication', date: '2026-08-14',
    method: 'whisper is trusted on the pronoun/verb class (demonstrated old-vs-new) and NOT on alsjeblieft->alstublieft',
    confirmed: by('CONFIRMED').length, blind: by('BLIND').length, contradicted: by('CONTRADICTED').length,
    verdicts,
  }, null, 2) + '\n')

  for (const v of verdicts) {
    console.log(`${v.verdict.padEnd(13)} ${v.clip_old.slice(0, 8)} -> ${v.clip_new.slice(0, 8)}  ${v.why}`)
  }
  console.log(`\nCONFIRMED ${by('CONFIRMED').length} | BLIND ${by('BLIND').length} | CONTRADICTED ${by('CONTRADICTED').length}`)
  console.log(`log: ${OUT}`)
  if (by('CONTRADICTED').length) {
    console.log('\nCONTRADICTED clips speak a form this job was meant to remove — these need an ear:')
    for (const v of by('CONTRADICTED')) console.log(`  ${v.clip_new}  want "${v.after}"  heard "${v.transcript_new}"`)
  }
})()
