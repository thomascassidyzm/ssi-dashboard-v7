#!/usr/bin/env node
/**
 * cs #241·AI — re-record in place the fra_for_eng female (target1) clips #175·AI heard saying the male form (Kai approved
 * 16 Nov 17:37Z: "Sure, rerecord the French ... check that the text that is sent is the female form").
 * Shape of ops/female-gender-gap-142/render-142.cjs. Input: plan-241.tsv, ONLY status=ok rows.
 * text = the clip's label (the slot text, male form, left as it is: the target2 male voice shares it), spokenText = the
 * female form from the course's gender expansion. spokenText is what the provider speaks; the route also writes the
 * clip_spoken_text verdict for it (cs #160·AI). The clip keeps its own voice (the route refuses anything else).
 * FEMALE CHECK BEFORE EVERY SEND: each word pair's female word must be in the text sent and the male word count must drop;
 * a failing row is not sent. Carries Kai's approval token with this conversation's x-cs-conv (env CS_CONV_TOKEN, never logged).
 * HTTP only (POST /api/audio/render). Sequential. Never retries: a clip refused once is never sent again. A VOICE_POLICY refusal
 * (the clip is voiced by a non-cast voice; refused before any spend) is recorded and the run moves to the next clip; any other
 * refusal stops the run. Stops at a character ceiling too.
 *   node ops/female-gender-gap-241/render-241.cjs [--real] [--limit N] [--only <clipId>] [--ceiling CHARS]
 */
const fs = require('fs'); const path = require('path')
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null }
const course = 'fra_for_eng'
const inF = path.join(__dirname, 'plan-241.tsv'); const outF = path.join(__dirname, 'result-241.tsv')
const real = process.argv.includes('--real'); const limit = arg('--limit') ? Number(arg('--limit')) : Infinity
const only = arg('--only'); const ceiling = Number(arg('--ceiling') || 9800)
const conv = process.env.CS_CONV_TOKEN || ''
const APPROVAL = 'kai:2026-11-16:fra_for_eng female target1 re-record of the #175 male-form list (cs #241)'
const HEAD = 'clip\tstored_text\tfemale_text\tslots\tmode\tsource\taudioId\trevision\ts3Key\tcharsSpent\twouldSpendChars\tspokenVerdict\tcode\terror\tat\n'
const lines = fs.readFileSync(inF, 'utf8').trim().split('\n'); const cols = lines[0].split('\t')
const rows = lines.slice(1).map((l) => Object.fromEntries(l.split('\t').map((v, i) => [cols[i], v])))
const tok = (t) => (t.toLowerCase().replace(/’/g, "'").match(/[\p{L}\p{N}'-]+/gu) || [])
const count = (ws, w) => ws.filter((x) => x === w || x.split("'").pop() === w).length
function femaleCheck(label, send, pairs) {
  const a = tok(label), b = tok(send), bad = []
  for (const p of pairs.split(',')) {
    const [m, f] = p.split('/').map((x) => x.trim().toLowerCase())
    if (count(b, f) < 1) bad.push(`no ${f}`)
    if (count(b, m) >= Math.max(1, count(a, m))) bad.push(`still ${m}`)
  }
  return bad
}
const done = new Set(); const voiceRefused = new Set(); let spent = 0
if (fs.existsSync(outF)) for (const l of fs.readFileSync(outF, 'utf8').trim().split('\n').slice(1)) {
  const c = l.split('\t'); if (c[4] === 'real' && /^(library|rendered|already-rerecorded)$/.test(c[5])) done.add(c[0]); if (c[12] === 'VOICE_POLICY') voiceRefused.add(c[0]); spent += Number(c[9]) || 0
} else fs.writeFileSync(outF, HEAD)
const todo = rows.filter((r) => r.status === 'ok' && !done.has(r.clip) && !voiceRefused.has(r.clip) && (!only || r.clip === only)).slice(0, limit)
;(async () => {
  let n = 0
  for (const r of todo) {
    const bad = femaleCheck(r.label, r.send, r.word_pair)
    const row = (o, src, code, err) => [r.clip, r.label, r.send, r.live_t1_slots, real ? 'real' : 'dry', src, o.audioId || '', o.revision ?? '', o.s3Key || '',
      o.charsSpent ?? '', o.wouldSpendChars ?? '', o.spokenVerdict || '', code, String(err || '').replace(/\s+/g, ' ').slice(0, 300), new Date().toISOString()].join('\t') + '\n'
    if (bad.length) { fs.appendFileSync(outF, row({}, 'NOT-SENT', 'FEMALE_CHECK', bad.join('; '))); console.log(`NOT SENT ${r.clip}: ${bad.join('; ')}`); continue }
    const body = { courseCode: course, role: 'target1', text: r.label, spokenText: r.send, replaceAudioId: r.clip,
      purpose: `${course} female re-record of the #175 male-form list, Kai approved 16 Nov (#241)`, job: '#241', approval: APPROVAL, dryRun: !real }
    let res, o
    try {
      res = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'cs-241-female-rerecord', 'x-cs-conv': conv }, body: JSON.stringify(body) })
      o = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
    } catch (e) { res = { status: 'NETWORK' }; o = { ok: false, error: String(e.message || e) } }
    spent += Number(o.charsSpent) || 0
    fs.appendFileSync(outF, row(o, o.ok ? o.source : 'REFUSED', o.code || (o.ok ? '' : res.status), o.ok ? '' : o.error))
    n++
    if (!o.ok) { console.log(`STOPPED: refusal on ${r.clip}: ${res.status} ${o.code || ''} ${String(o.error || '').slice(0, 200)}`); process.exitCode = 3; if (real && o.code !== 'VOICE_POLICY') break }
    if (spent > ceiling) { console.log(`STOPPED: ${spent} chars spent, over the ${ceiling} ceiling`); process.exitCode = 4; break }
  }
  console.log(`${course} ${real ? 'real' : 'dry'}: ${n} of ${todo.length} sent, ${spent} chars spent in this result file`)
})()
