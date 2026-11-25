#!/usr/bin/env node
// cs #234·AL: the English (known) clip for every jpn_for_eng row the open-end census apply re-worded, through Popty's ONE route.
// Same two calls as item 4's night-audio (#358): node tools/audio/render.cjs (POST /api/audio/render: library first, spend guard,
// ONE render, no retries) then POST /api/production/jpn_for_eng/link-clip FILL-ONLY (never `replace`; a slot the text-change
// trigger already re-pointed to a same-voice clip, or someone else filled, is left alone and logged). Evidence = the audioId.
// Slots: the known side of every op the probe/rewords/addend ledgers mark "applied" (ops/paid-cleanup-item9/tools/ledger-state.cjs),
// in seed order. Japanese (target1/target2) is never asked for: the census changes only English.
// Refusals are the answer: logged verbatim, never retried; a spend/quota/stop refusal (402, CAP, QUOTA, STOP, NOT_IN_CHAIN,
// BUDGET) stops the whole run. Cap: 20,000 charsSpent (the census sums 16,697 en_chars). Runs only in the UK night window.
//   node night-audio.cjs            render + link (log: audio.jsonl here, resumable: a logged slot is never asked again)
//   node night-audio.cjs --price    dry run of every slot whose op is in a changeset (applied or not): library vs render, no link
'use strict'
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const ROOT = path.resolve(__dirname, '../../..')
const { slotsFor } = require('../../paid-cleanup-item9/tools/ledger-state.cjs')
const cs = require('../../../services/shared/changeset.cjs')
const { postUntilAnswered } = require('../../../services/shared/popty-try-later.cjs')

const COURSE = 'jpn_for_eng'
const CAP = 20000
const AGENT = process.env.AGENT_ID || 'kai-234-jpn-open-end'
const PURPOSE = 'cs #225 open-end census apply'
const STOP_RE = /402|CAP|QUOTA|STOP|NOT_IN_CHAIN|BUDGET|LIMIT/i
const FILES = ['probe', 'rewords', 'addend'].map((k) => path.join(__dirname, `${k}.changeset.jsonl`))
const LOG = path.join(__dirname, 'audio.jsonl')
const PRICE = process.argv.includes('--price')
const seedOf = (id) => Number(String(id).replace(/^.*:/, '').slice(1, 5))
const night = () => { const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' }).format(new Date())); return h >= 22 || h < 7 }
const render = (text, dry) => {
  const args = [path.join(ROOT, 'tools/audio/render.cjs'), '--course', COURSE, '--role', 'known', '--text', text, '--purpose', PURPOSE, '--job', '#234']
  if (dry) args.push('--dry-run')
  let out; try { out = execFileSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: AGENT } }) } catch (e) { out = String(e.stdout || '') }
  try { return JSON.parse(out) } catch { return { ok: false, code: 'NO_ANSWER', error: String(out).slice(0, 300) } }
}

;(async () => {
  if (PRICE) {
    const texts = new Map()
    for (const f of FILES) for (const o of cs.read(f).ops) if (o.set && o.set.known_text) texts.set(o.set.known_text, (texts.get(o.set.known_text) || 0) + 1)
    const tally = {}; let chars = 0, renderChars = 0; const recs = []
    for (const [t, n] of texts) {
      const r = render(t, true)
      const k = r.ok ? `ok_${r.source}` : `refused_${r.code}`
      tally[k] = (tally[k] || 0) + 1; chars += t.length
      if (r.ok && r.source !== 'library') renderChars += t.length
      recs.push({ text: t, rows: n, ok: !!r.ok, source: r.source, code: r.code, voiceId: r.voiceId || null, error: r.error && String(r.error).slice(0, 200) })
    }
    fs.writeFileSync(path.join(__dirname, 'price.json'), JSON.stringify({ at: new Date().toISOString(), unique_texts: texts.size, chars, render_chars: renderChars, tally, recs }, null, 1) + '\n')
    console.log(JSON.stringify({ unique_texts: texts.size, chars, render_chars: renderChars, tally }))
    return
  }
  const logged = new Set(fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).key) : [])
  const queue = FILES.flatMap((f) => slotsFor(f).slots).filter((s) => s.role === 'known').sort((a, b) => seedOf(a.id) - seedOf(b.id) || a.id.localeCompare(b.id))
  let spent = (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []).reduce((a, r) => a + (Number(r.charsSpent) || 0), 0)
  const tally = {}; const bump = (k) => { tally[k] = (tally[k] || 0) + 1 }
  let stop = null
  for (const s of queue) {
    if (logged.has(s.key)) { bump('already_logged'); continue }
    if (!night()) { stop = 'UK night window closed'; break }
    if (spent + s.text.length > CAP) { stop = `cap: ${spent} + ${s.text.length} > ${CAP}`; break }
    const r = render(s.text, false)
    if (r.tryLater || r.code === 'APPROVAL_CHECK_UNAVAILABLE' || r.code === 'NO_ANSWER') { bump('try_later'); stop = `${r.code}: left unanswered, asked next run`; break }
    const rec = { at: new Date().toISOString(), key: s.key, id: s.id, seed: seedOf(s.id), text: s.text, ok: !!r.ok, source: r.source, code: r.code,
      audioId: r.audioId, voiceId: r.voiceId || null, charsSpent: r.charsSpent || 0, error: r.error && String(r.error).slice(0, 400) }
    if (r.ok && r.audioId) {
      const lr = await postUntilAnswered(`http://localhost:3470/api/production/${COURSE}/link-clip`, { headers: { 'x-agent-id': AGENT },
        body: { links: [{ phraseId: s.id, role: 'known', audioId: r.audioId }] } })
      if (lr.tryLater) { bump('try_later'); stop = 'Popty down past the link-clip back-off: left unanswered'; break }
      const l = lr.body || {}, one = (l.results && l.results[0]) || l
      rec.link = { status: lr.status, ok: !!(l.ok && one.ok !== false), code: one.code || l.code, current: one.current || one.previous || null, error: (one.error || l.error) && String(one.error || l.error).slice(0, 300) }
    }
    fs.appendFileSync(LOG, JSON.stringify(rec) + '\n'); logged.add(s.key)
    spent += Number(rec.charsSpent) || 0
    bump(r.ok ? (rec.link && rec.link.ok ? `linked_${r.source}` : `link_${rec.link && rec.link.code}`) : `refused_${r.code}`)
    if (!r.ok && STOP_RE.test(`${r.code} ${r.error || ''}`)) { stop = `STOPPED on a spend refusal: ${r.code} ${String(r.error || '').slice(0, 300)}`; break }
  }
  const left = queue.filter((s) => !logged.has(s.key)).length
  console.log(`night-audio cs234: ${queue.length} slot(s) ${JSON.stringify(tally)}; charsSpent total ${spent}/${CAP}; ${left} unanswered${stop ? `; ${stop}` : ''}`)
  process.exit(stop && /STOPPED/.test(stop) ? 3 : 0)
})()
