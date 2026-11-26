#!/usr/bin/env node
// cs #346·AL: English (known) clip for every jpn_for_eng row this job re-worded (seeds 1-450), through Popty's ONE route.
// Daytime variant of #234's night-audio.cjs (its night() gate lifted per Kai's daytime brief; same two calls):
//   node tools/audio/render.cjs (POST /api/audio/render: library first, spend guard, ONE render, no retries), then
//   POST /api/production/jpn_for_eng/link-clip FILL-ONLY (never `replace`).
//   node audio.cjs --price               dry run for every op in ops-rewords.json + ops-addend.json (spends nothing)
//   node audio.cjs <live.json>           render + link the slots whose LIVE row reads the new English and whose
//                                        known_audio_id is null (log: audio.jsonl; a logged slot is never asked again)
// Any refusal (402, CAP, QUOTA, STOP, NOT_IN_CHAIN, REPEAT, …) STOPS the run: logged verbatim, never retried. Cap 20,000 charsSpent.
// Japanese is never asked for. Talks only to Popty HTTP; no DB.
'use strict'
const fs = require('fs'), path = require('path')
const { execFileSync } = require('child_process')
const ROOT = path.resolve(__dirname, '../../..')
const { postUntilAnswered } = require('../../../services/shared/popty-try-later.cjs')
const COURSE = 'jpn_for_eng', CAP = 20000, AGENT = 'kai-346-jpn-open-end', PURPOSE = 'cs #346 jpn open-end census apply, seeds 1-450 (Kai Y 25 Nov)'
const LOG = path.join(__dirname, 'audio.jsonl')
const ops = ['rewords', 'addend'].flatMap((k) => JSON.parse(fs.readFileSync(path.join(__dirname, `ops-${k}.json`), 'utf8')))
  .sort((a, b) => a.phrase_id.localeCompare(b.phrase_id))
const render = (text, dry) => {
  const args = [path.join(ROOT, 'tools/audio/render.cjs'), '--course', COURSE, '--role', 'known', '--text', text, '--purpose', PURPOSE, '--job', '#346']
  if (dry) args.push('--dry-run')
  let out; try { out = execFileSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: AGENT } }) } catch (e) { out = String(e.stdout || '') + String(e.stderr || '') }
  try { return JSON.parse(out) } catch { return { ok: false, code: 'NO_ANSWER', error: String(out).slice(0, 400) } }
}
;(async () => {
  if (process.argv[2] === '--price') {
    const recs = []; let chars = 0, renderChars = 0; const tally = {}
    for (const o of ops) {
      const t = o.set.known_text, r = render(t, true)
      const k = r.ok ? `ok_${r.source}` : `refused_${r.code}`; tally[k] = (tally[k] || 0) + 1; chars += t.length
      if (r.ok && r.source !== 'library') renderChars += t.length
      recs.push({ id: o.phrase_id, text: t, ok: !!r.ok, source: r.source, code: r.code, voiceId: r.voiceId || null, error: r.error && String(r.error).slice(0, 200) })
    }
    fs.writeFileSync(path.join(__dirname, 'price.json'), JSON.stringify({ at: new Date().toISOString(), slots: ops.length, chars, render_chars: renderChars, tally, recs }, null, 1) + '\n')
    console.log(JSON.stringify({ slots: ops.length, chars, render_chars: renderChars, tally })); return
  }
  const live = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const P = new Map()
  for (const s of live.seeds) for (const l of s.legos) for (const p of l.basket_phrases) P.set(p.id, p)
  const prior = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []
  const logged = new Set(prior.map((r) => r.id)); let spent = prior.reduce((a, r) => a + (Number(r.charsSpent) || 0), 0)
  const tally = {}; const bump = (k) => { tally[k] = (tally[k] || 0) + 1 }; let stop = null
  for (const o of ops) {
    const p = P.get(o.phrase_id), t = o.set.known_text
    if (logged.has(o.phrase_id)) { bump('already_logged'); continue }
    if (!p || p.known_text !== t) { bump('not_applied_live'); continue }
    if (p.known_audio_id) { bump('already_has_clip'); continue }
    if (spent + t.length > CAP) { stop = `cap: ${spent} + ${t.length} > ${CAP}`; break }
    const r = render(t, false)
    const rec = { at: new Date().toISOString(), id: o.phrase_id, text: t, japanese: o.expect.target_text, ok: !!r.ok, source: r.source, code: r.code,
      audioId: r.audioId, voiceId: r.voiceId || null, charsSpent: r.charsSpent || 0, error: r.error && String(r.error).slice(0, 400) }
    if (r.ok && r.audioId) {
      const lr = await postUntilAnswered(`http://localhost:3470/api/production/${COURSE}/link-clip`, { headers: { 'x-agent-id': AGENT },
        body: { links: [{ phraseId: o.phrase_id, role: 'known', audioId: r.audioId }] } })
      const l = lr.body || {}, one = (l.results && l.results[0]) || l
      rec.link = { status: lr.status, ok: !!(l.ok && one.ok !== false), code: one.code || l.code, error: (one.error || l.error) && String(one.error || l.error).slice(0, 300) }
    }
    fs.appendFileSync(LOG, JSON.stringify(rec) + '\n'); spent += Number(rec.charsSpent) || 0
    bump(r.ok ? (rec.link && rec.link.ok ? `linked_${r.source}` : `link_${rec.link && rec.link.code}`) : `refused_${r.code}`)
    if (!r.ok) { stop = `STOPPED on refusal: ${r.code} ${String(r.error || '').slice(0, 300)}`; break }
  }
  console.log(`audio cs346: ${ops.length} slot(s) ${JSON.stringify(tally)}; charsSpent total ${spent}/${CAP}${stop ? `; ${stop}` : ''}`)
  process.exit(stop && /STOPPED/.test(stop) ? 3 : 0)
})()
