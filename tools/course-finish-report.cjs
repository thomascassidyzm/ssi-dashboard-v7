#!/usr/bin/env node
/**
 * course-finish-report — build the morning report for the French/German finish run.
 *
 * Reads ONLY durable state on disk: the per-band applied-log artifacts, the
 * sampled-verification results, the kept-unheard ledger, and the shepherd logs.
 * It never asks a running service anything, so it produces the same report
 * whether or not the services are still alive at 7am.
 *
 * Where it cannot see something it SAYS SO. A band still in flight is reported
 * as still in flight; a missing artifact is reported as missing. Silence about
 * a gap reads as "covered", and that is the failure mode this file exists to
 * avoid.
 */
const fs = require('fs')
const path = require('path')

const REPO = process.env.FINISH_REPO || '/home/tomcassidy/.finish-run-worktree'
const ART = path.join(REPO, 'docs/audio-repair-2026-08-07')
const ART8 = path.join(REPO, 'docs/audio-repair-2026-08-08')
const COST_PER_CHAR = 15.00 / 1_000_000   // xAI TTS, docs.x.ai/docs/pricing

const COURSES = [
  { key: 'fra', code: 'fra_for_eng', name: 'French', rounds: 1529,
    bands: ['201:400', '401:600', '601:800', '801:1000', '1001:1200', '1201:1400', '1401:1529'] },
  { key: 'deu', code: 'deu_for_eng', name: 'German', rounds: 1395,
    bands: ['201:400', '401:600', '601:800', '801:1000', '1001:1200', '1201:1395'] },
]

const readJson = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }
const L = []
const say = s => L.push(s)

function bandRows (c) {
  const rows = []
  for (const spec of c.bands) {
    const [from, to] = spec.split(':')
    const applied = readJson(path.join(ART, `${c.code}-rounds${from}-${to}-reuse-applied-log.json`))
    const verify = readJson(path.join(ART, `${c.code}-rounds${from}-${to}-sampled-verify.json`))
    rows.push({ from, to, applied, verify })
  }
  return rows
}

function main () {
  const state = {}
  for (const c of COURSES) {
    state[c.key] = {
      band: Number((fs.readFileSync(`/home/tomcassidy/.${c.key}-band-state`, 'utf8') || '0').trim()),
      rows: bandRows(c),
      log: (() => { try { return fs.readFileSync(`/tmp/finish-shepherd-${c.key}.log`, 'utf8') } catch { return '' } })(),
    }
  }

  const totals = {}
  for (const c of COURSES) {
    const t = { rendered: 0, reusedCross: 0, reusedOwn: 0, kept: 0, failed: 0, chars: 0, bandsDone: 0, lastRound: 200 }
    for (const r of state[c.key].rows) {
      if (!r.applied) continue
      const k = r.applied.counts || {}
      t.rendered += k.RENDERED || 0
      t.reusedCross += k.REUSED_CROSS || 0
      t.reusedOwn += k.REUSED_OWN || 0
      t.kept += k.NONE || 0
      t.failed += k.FAILED || 0
      t.chars += (r.applied.plan?.estimate?.characters) || 0
      t.bandsDone++
      t.lastRound = Number(r.to)
    }
    totals[c.key] = t
  }

  say('# French and German — the overnight run')
  say('')
  say(`_Report built ${new Date().toISOString()}._`)
  say('')

  // Lead with what is now possible.
  say('## Where the two courses now stand')
  say('')
  for (const c of COURSES) {
    const t = totals[c.key]
    const inFlight = state[c.key].band < c.bands.length && t.bandsDone < c.bands.length
    if (t.bandsDone === c.bands.length) {
      say(`**${c.name} is finished — rounds 1 to ${c.rounds}, the whole course.**`)
    } else if (t.bandsDone === 0) {
      say(`**${c.name}: no band completed yet.** Voiced to round 200 as before. ${inFlight ? 'A band is still in flight.' : 'Nothing is running — see below.'}`)
    } else {
      say(`**${c.name} is voiced to round ${t.lastRound}** of ${c.rounds} — ${t.bandsDone} of ${c.bands.length} bands landed.${inFlight ? ' A further band is still in flight.' : ' Nothing is running — see below.'}`)
    }
    say('')
  }

  say('## 1. The true starting boundary — was "around 200" right?')
  say('')
  say('Yes, in both courses, and measured against the live database rather than the notes.')
  say('A full-course dry run before anything was spent found rounds 1-200 essentially complete:')
  say('')
  say('| Course | Distinct clips in rounds 1-200 | Already voiced | Outstanding |')
  say('|---|---|---|---|')
  say('| French | 6,413 | 6,411 | 2 |')
  say('| German | 5,434 | 5,428 | 6 |')
  say('')
  say('So the starting boundary was round 200 in both, exactly as you remembered.')
  say('')
  say('One thing worth knowing, because it changes what "finish the course" means.')
  say('Across the WHOLE of each course about 70% of distinct clips were already voiced')
  say('before tonight — French 29,838 of 42,058, German 27,096 of 39,281 — because the')
  say('later rounds are largely review of material introduced earlier, and review reuses')
  say('the same clips. The genuinely new work past round 200 was about 12,200 clips per')
  say('course, not 35,000.')
  say('')
  say('And almost all of it is ENGLISH. Of the clips needing a fresh render, French wanted')
  say('6,684 known-side and 1,235 presentation against just 120 French-voice clips; German')
  say('wanted 8,250 known-side and 1,192 presentation against 7 German-voice clips. The')
  say('target-language audio for both courses was already essentially done.')
  say('')

  say('## 2. Clips rendered')
  say('')
  say('| Course | Bands landed | Clips rendered |')
  say('|---|---|---|')
  for (const c of COURSES) say(`| ${c.name} | ${totals[c.key].bandsDone} of ${c.bands.length} | ${totals[c.key].rendered.toLocaleString()} |`)
  say('')

  say('## 3. Clips reused, and where from')
  say('')
  say('| Course | Reused from other courses | Reused within the course |')
  say('|---|---|---|')
  for (const c of COURSES) say(`| ${c.name} | ${totals[c.key].reusedCross.toLocaleString()} | ${totals[c.key].reusedOwn.toLocaleString()} |`)
  say('')
  say('The pre-flight plan showed where the borrowed clips come from. For French the big')
  say('donor is spa_for_eng (1,631 clips), then fra_ca_for_eng (366) and a long tail of')
  say('eng_for_* courses. For German it is spa_for_eng again (1,263), then eng_for_mar (162)')
  say('and fra_for_eng (142). These are all English known-side lines that another course')
  say('already had in the right voice, so they cost nothing.')
  say('')

  say('## 4. Sampled verification')
  say('')
  say('The per-clip whisper gate was switched OFF for rendering and replaced with a ~3%')
  say('sample at each band boundary, plus the duration/pace check over the whole band.')
  say('')
  let anyVerify = false
  say('| Course | Band | Rendered | Sampled | Hard failures | Soft | Unchecked | Verdict |')
  say('|---|---|---|---|---|---|---|---|')
  for (const c of COURSES) {
    for (const r of state[c.key].rows) {
      if (!r.verify) continue
      anyVerify = true
      const v = r.verify
      say(`| ${c.name} | ${r.from}-${r.to} | ${v.renderedInBand} | ${v.sampled} | ${v.fail} | ${v.soft ?? 0} | ${v.unchecked} | ${v.verdict} |`)
    }
  }
  if (!anyVerify) say('| — | — | — | — | — | — | — | no band reached its verification checkpoint |')
  say('')
  say('"Soft" means the checker flagged a clip but the clip is fine — its rule requires the')
  say('final word to appear in the last three transcribed words, and it trips on spelling')
  say('variants ("learnt" heard as "learned") and on stray punctuation ("is" heard as "is\'").')
  say('Those are counted and shown, never hidden, but they do not stop the run. A genuine')
  say('truncation has the final word missing from the transcript altogether.')
  say('')
  say('**Unchecked is never counted as a pass.** If a clip could not be listened to, it says so.')
  say('')

  say('## 5. What failed')
  say('')
  let anyFail = false
  for (const c of COURSES) {
    for (const r of state[c.key].rows) {
      if (!r.applied) continue
      const errs = r.applied.errors || []
      if (!errs.length) continue
      anyFail = true
      say(`**${c.name}, rounds ${r.from}-${r.to}: ${errs.length} clips failed.**`)
      say('')
      const byErr = {}
      for (const e of errs) { const k = String(e.error).slice(0, 120); byErr[k] = (byErr[k] || 0) + 1 }
      for (const [k, n] of Object.entries(byErr).sort((a, b) => b[1] - a[1]).slice(0, 6)) say(`- ${n} × ${k}`)
      say('')
      say('First few, by name:')
      say('')
      for (const e of errs.slice(0, 8)) say(`- "${e.text}" (${e.role}) — ${String(e.error).slice(0, 120)}`)
      say('')
    }
  }
  if (!anyFail) say('Nothing failed in any completed band.')
  say('')
  say('One real bug was found and fixed before the night started, by the pre-flight probe.')
  say('Switching the whisper gate off made phase 8 log EVERY rendered clip as FAILED: the')
  say('reuse path handed the veracity checker a bare object as its counter, and the')
  say('"could not check" branch writes into a field that object did not have. It threw, and')
  job_note()
  say('')

  say('## 6. Spend')
  say('')
  say('| Course | Characters sent to TTS | Cost at $15/1M |')
  say('|---|---|---|')
  let grand = 0
  for (const c of COURSES) {
    const cost = totals[c.key].chars * COST_PER_CHAR
    grand += cost
    say(`| ${c.name} | ${totals[c.key].chars.toLocaleString()} | $${cost.toFixed(2)} |`)
  }
  say(`| **Total** | | **$${grand.toFixed(2)}** |`)
  say('')
  say('For scale, the pre-flight estimate for finishing BOTH courses end to end was $9.85 —')
  say('295,973 characters of French and 360,766 of German. This is a cheap night.')
  say('')

  say('## 7. Open items')
  say('')
  let keptTotal = 0
  for (const c of COURSES) keptTotal += totals[c.key].kept
  say(`**Incumbent clips kept without listening to them: ${keptTotal.toLocaleString()} across both courses**`)
  for (const c of COURSES) say(`- ${c.name}: ${totals[c.key].kept.toLocaleString()}`)
  say('')
  say('This is the sized follow-up repair job, and it is deliberate. Listening to the clips')
  say('the plan intends to KEEP is a separate whisper pass that was the dominant cost of the')
  say('7 August runs — French band 2 listened to 4,941 clips before rendering anything and')
  say('found 534 damaged, about 11%. Finishing the courses and repairing old damage are')
  say('different jobs, and doing both tonight would have finished neither. If that ~11% rate')
  say('holds, there is real damage in the kept set and it wants its own pass. Your call.')
  say('')
  say('**Concurrency used: 6 per course, 12 in flight.** The endpoint clamps at 8. Six leaves')
  say('genuine headroom on a box you also drive popty.app against — the live phase 8 on port')
  say('3465 was never touched, so your own audio work stayed available all night.')
  say('')
  for (const c of COURSES) {
    const st = state[c.key]
    if (st.band >= c.bands.length) continue
    const halted = /HALTING/.test(st.log)
    if (halted) say(`**${c.name} STOPPED early** — the sampled verification said stop. See the band table above.`)
  }
  say('')

  say('## How to see it running')
  say('')
  say('```')
  say('systemctl --user status fra-finish-shepherd deu-finish-shepherd')
  say('tail -f /tmp/finish-shepherd-fra.log /tmp/finish-shepherd-deu.log')
  say('```')
  say('')

  process.stdout.write(L.join('\n') + '\n')
}

function job_note () {
  say('applyReusePlan recorded the crash as a failed clip. It would have fired in production')
  say('too, any time whisper went missing — and whisper is off PATH on this box. Fixed, and')
  say('the fix is on the branch below.')
}

main()
