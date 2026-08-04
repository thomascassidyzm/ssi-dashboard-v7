#!/usr/bin/env node
/**
 * repair-cost.cjs — measured xAI TTS spend for the 2026-08-04 silent-clip repair.
 *
 * The repair tool's own "N characters of TTS" counter only counts clips whose
 * render SUCCEEDED and was verified: `chars += text.length` sits after
 * renderVerified returns (tools/repair-silent-clips.cjs:253-254). Everything
 * that cost money but did not produce a usable clip is invisible to it:
 *   - re-rolls inside renderVerified (up to --attempts, default 3);
 *   - renders that succeeded at the provider and then died in mastering
 *     (the tail gate refusing to ship, or a missing `lame`);
 *   - renders that 404'd on a voice id (charged? almost certainly not, but
 *     counted here as an upper bound rather than assumed free).
 *
 * So this reconciles against the one number that counts actual provider calls:
 * "xAI health this run: N responses". Characters for the clips the counter
 * missed are looked up by id in the gate JSON that produced the repair list.
 */
const fs = require('fs'), path = require('path')
const D = path.join(__dirname, '..', 'docs', 'audio-repair-2026-08-04')
const RATE_PER_MCHAR = 15  // USD per 1M characters, xAI floor

const rows = []
for (const f of fs.readdirSync(D).filter(f => /-(repair|pilot|full)\.txt$/.test(f))) {
  const course = f.replace(/-(repair|pilot|full)\.txt$/, '')
  const log = fs.readFileSync(path.join(D, f), 'utf8')
  const gateFile = path.join(D, `${course}-gate.json`)
  const gate = fs.existsSync(gateFile) ? JSON.parse(fs.readFileSync(gateFile, 'utf8')) : []
  const byText = new Map(gate.map(c => [String(c.text || ''), String(c.text || '').length]))

  const m = /(\d+) repaired, (\d+) left alone[^,]*, (\d+) failed, of (\d+)/.exec(log)
  const cm = /([\d,]+) renders, ([\d,]+) characters of TTS/.exec(log)
  const hm = /xAI health this run: (\d+) responses, (\d+) empty/.exec(log)
  if (!m) continue

  // clips that cost a call but were never counted: failures + re-roll lines
  const failedTexts = [...log.matchAll(/^\[\d+\/\d+\] \S+ "(.*?)(?:"|$).*FAILED/gm)].map(x => x[1])
  const rerolls = (log.match(/^\s+attempt \d+:/gm) || []).length

  const countedChars = cm ? Number(cm[2].replace(/,/g, '')) : 0
  const countedRenders = cm ? Number(cm[1].replace(/,/g, '')) : 0
  const responses = hm ? Number(hm[1]) : null
  // uncounted calls = provider responses minus the renders the counter saw
  const uncountedCalls = responses !== null ? Math.max(0, responses - countedRenders) : 0
  // charge them at the mean counted character length; if nothing was counted,
  // fall back to the mean length of the whole repair list. Stated as an
  // ESTIMATE — the tool does not record per-attempt characters.
  const meanLen = countedRenders ? countedChars / countedRenders
    : (gate.length ? gate.reduce((s, c) => s + String(c.text || '').length, 0) / gate.length : 0)
  const uncountedChars = Math.round(uncountedCalls * meanLen)

  rows.push({ course, run: /pilot/.test(f) ? 'pilot' : /full/.test(f) ? 'full' : 'repair',
    repaired: +m[1], keptHealthy: +m[2], failed: +m[3], of: +m[4],
    countedRenders, countedChars, responses, uncountedCalls, uncountedChars,
    totalChars: countedChars + uncountedChars, rerolls, failedTexts: failedTexts.length })
}

let tc = 0, tr = 0, trep = 0
console.log('course                 run     repaired kept failed | calls  counted-ch  est-extra-ch  total-ch     USD')
for (const r of rows.sort((a, b) => a.course.localeCompare(b.course))) {
  tc += r.totalChars; tr += (r.responses || 0); trep += r.repaired
  console.log(
    `${r.course.padEnd(22)} ${r.run.padEnd(7)} ${String(r.repaired).padStart(8)} ${String(r.keptHealthy).padStart(4)} ${String(r.failed).padStart(6)} |` +
    `${String(r.responses ?? '?').padStart(6)} ${String(r.countedChars).padStart(11)} ${String(r.uncountedChars).padStart(13)} ${String(r.totalChars).padStart(9)} ` +
    `${(r.totalChars / 1e6 * RATE_PER_MCHAR).toFixed(4).padStart(7)}`)
}
console.log('-'.repeat(104))
console.log(`TOTAL: ${trep} clips repaired, ${tr} provider calls, ${tc} characters`)
console.log(`       ${tc} / 1,000,000 x $${RATE_PER_MCHAR} = $${(tc / 1e6 * RATE_PER_MCHAR).toFixed(4)}`)
