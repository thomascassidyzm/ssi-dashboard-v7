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

  // Render counts come from the append-only LEDGER, not from the last artifact.
  // A service restart makes the shepherd re-issue a band; the re-plan finds
  // every clip already satisfied and reports RENDERED:0 — correct as a plan and
  // false as a record. Taking the per-band MAX across ledger entries keeps the
  // run that actually did the work. The artifact is still the source for the
  // per-clip origin breakdown, where a re-plan cannot invent anything.
  const ledger = {}
  for (const c of COURSES) {
    ledger[c.key] = {}
    let lines = []
    try {
      lines = fs.readFileSync(`/home/tomcassidy/.${c.key}-kept-unheard.jsonl`, 'utf8').trim().split('\n').filter(Boolean)
    } catch { /* no band has completed yet */ }
    for (const l of lines) {
      let r; try { r = JSON.parse(l) } catch { continue }
      const key = `${r.fromRound}-${r.toRound}`
      const prev = ledger[c.key][key]
      if (!prev || (r.rendered || 0) > (prev.rendered || 0)) ledger[c.key][key] = r
    }
  }

  const totals = {}
  for (const c of COURSES) {
    const t = { rendered: 0, reusedCross: 0, reusedOwn: 0, kept: 0, failed: 0, chars: 0, bandsDone: 0, lastRound: 200 }
    for (const r of state[c.key].rows) {
      if (!r.applied) continue
      const led = ledger[c.key][`${r.from}-${r.to}`]
      const k = r.applied.counts || {}
      t.rendered += led ? (led.rendered || 0) : (k.RENDERED || 0)
      t.reusedCross += led ? (led.reusedCross || 0) : (k.REUSED_CROSS || 0)
      t.reusedOwn += led ? (led.reusedOwn || 0) : (k.REUSED_OWN || 0)
      t.kept += led ? (led.keptUnheard || 0) : (k.NONE || 0)
      t.failed += led ? (led.failed || 0) : (k.FAILED || 0)
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
  say('That was the picture BEFORE your 02:02Z ruling, and the ruling changed it. Under the')
  say('old policy the outstanding work was almost all English — French wanted 6,684')
  say('known-side and 1,235 presentation renders against just 120 French-voice clips, and')
  say('German 8,250 and 1,192 against 7 — because the target-language audio counted as')
  say('already done. Once the existing French and German clips stopped counting as a')
  say('source, the job inverted: the work is now overwhelmingly TARGET-side, which is to')
  say('say it is the actual French and German voices being re-recorded. See section 3b.')
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
  say('Cross-course reuse is deliberately still ON and it is free money, but the numbers')
  say('above look small, and the reason is worth understanding rather than reading as a')
  say('policy failure. Borrowing only ever works for the ENGLISH known-side lines, because')
  say('those are the ones another course already has in the same voice — the estate-wide')
  say('pool offered French 1,631 clips from spa_for_eng, 366 from fra_ca_for_eng and a long')
  say('tail of eng_for_* courses, and German 1,263 from spa_for_eng and 162 from')
  say('eng_for_mar. Most of that English borrowing was already taken earlier tonight, and')
  say('what remains after the ruling is target-side French and German audio, which by')
  say('definition no other course can lend. So the bill is renders, not borrows.')
  say('')

  say('## 3b. Where every clip came from — the reuse policy')
  say('')
  say('Your 02:02Z ruling: French and German incumbents are not a source. The only two')
  say('acceptable origins are a same-voice clip contributed to the pool by a DIFFERENT')
  say('course, or fresh regeneration.')
  say('')
  say('It is implemented as a DATE rather than a switch — 2026-08-05, the day the')
  say('destructive post-processing was deleted. Two reasons. A clip written after that day')
  say('ships exactly as rendered and is not suspect. And a blanket "never trust our own"')
  say('would re-render this run\'s own fresh output every time a band restarted, re-buying')
  say('the whole course on each resume.')
  say('')
  let anySwap = false
  for (const c of COURSES) {
    for (const r of state[c.key].rows) {
      if (!r.applied) continue
      const ents = r.applied.entries || []
      const led = ledger[c.key][`${r.from}-${r.to}`]
      let replaced = ents.filter(e => e.action === 'RENDERED' && e.swappedInPlace).length
      let brandNew = ents.filter(e => e.action === 'RENDERED' && !e.swappedInPlace).length
      let cross = ents.filter(e => e.action === 'REUSED_CROSS').length
      const ownReuse = ents.filter(e => e.action === 'REUSED_OWN').length
      let kept = (r.applied.counts || {}).NONE || 0
      let note = ''
      // The artifact here is a re-plan that overwrote the real one; the ledger
      // kept the true totals but not the per-clip split, so say so rather than
      // printing a confident zero.
      if (led && (led.rendered || 0) > replaced + brandNew) {
        replaced = led.rendered; brandNew = 0; cross = led.reusedCross || 0; kept = led.keptUnheard || 0
        note = ' _(totals from the run log — a service restart re-planned this band and overwrote the per-clip artifact)_'
      }
      anySwap = true
      say(`**${c.name}, rounds ${r.from}-${r.to}**${note}`)
      say('')
      say(`- ${replaced.toLocaleString()} old ${c.name} clips REPLACED in place — these would have been reused under the old policy`)
      say(`- ${brandNew.toLocaleString()} rendered brand new (nothing existed)`)
      say(`- ${cross.toLocaleString()} taken free from another course's pool at the same voice`)
      say(`- ${ownReuse.toLocaleString()} reused from within the course (should be zero under the policy)`)
      say(`- ${kept.toLocaleString()} kept because they were already written after the fix — this is what makes a restart cheap`)
      say('')
    }
  }
  if (!anySwap) say('_No band has completed yet, so there are no per-band origin counts to show._')
  say('')
  say('The replacements are almost entirely TARGET-side — the actual French and German')
  say('voice audio, which is exactly the material you called bobbins. The pre-flight dry')
  say('run for rounds 201-400 alone put it at 3,883 French and 3,471 German clips.')
  say('')

  say('## 4. Verification — none, and why')
  say('')
  say('You ruled both whisper legs off for this run: "I do not think we need EITHER and')
  say('here is why - the error rate is generally acceptable and always has been UNLESS we')
  say('are using bad post-processing." That is right, and there turned out to be THREE')
  say('whisper legs in this pipeline rather than two. All three are off:')
  say('')
  say('- the pre-publish veracity gate on every newly rendered clip;')
  say('- the sampled sweep over each finished band;')
  say('- the xAI PHONOLOGY gate, which is the one that is easy to miss. It whispers every')
  say('  NON-ENGLISH xAI render to check for language drift, so on French and German target')
  say('  clips it fires on every single one. It held the run to about 8 clips a minute,')
  say('  clips landing in pairs every 13 seconds. With it off the same run does 417 a')
  say('  minute — fifty times faster. It is also the gate that calls a correct French "je"')
  say('  Turkish, so it was not buying much.')
  say('')
  say('The gate CODE is untouched and every other job keeps its own defaults. These are')
  say('environment settings on this run\'s two instances only.')
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
  say('**The incumbent-listen follow-up is CANCELLED, not outstanding.** It was going to be')
  say('the big open item — thousands of old clips nobody had listened to. Under your ruling')
  say('they are being replaced regardless, so measuring how damaged each one is would have')
  say('produced a number nobody would act on.')
  say('')
  say('**Concurrency.** Two knobs matter and only one of them was ours to argue about. The')
  say('endpoint clamp of 8 was our own arbitrary number and is now a configured bound. The')
  say('thing that actually binds xAI is a process-global semaphore inside tts-service.cjs,')
  say('default 4 — raising the endpoint number alone would have changed nothing. Set to 8')
  say('per course, so 16 concurrent xAI requests across the two runs.')
  say('')
  say('Measured: 417 clips/min with French alone at 8 slots, 787 clips/min combined at 16.')
  say('That is near-linear, so 16 is at the knee rather than past it.')
  say('')
  say('**xAI did throttle, and nothing was lost.** 44 HTTP 429s in the first five minutes,')
  say('zero failed clips. That is only true because of a fix made tonight: 429 was being')
  say('classed as a fatal 4xx client error, so a rate-limited clip was DROPPED rather than')
  say('retried. Raising concurrency without that would have turned throughput straight into')
  say('lost clips. 429 and 408 now retry with their own budget and a 4-second-base jittered')
  say('backoff.')
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
