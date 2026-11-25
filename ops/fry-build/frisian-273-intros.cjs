#!/usr/bin/env node
/**
 * cs #273·AL (Kai 24 Nov, pick F, d/b1989450; amendment 19:04Z "fix ALL of them"): re-splice every fry_for_eng LEGO intro so
 * Charlotte says "Frisian" FREE-zhən. POPTY HTTP ONLY — no database access of any kind:
 *   read   GET  /api/production/fry_for_eng/seeds                      (live LEGO rows; re-read before every batch = pre-check)
 *   read   GET  /api/production/fry_for_eng/audio-preview/clips        (the intro rows' own text, role presentation)
 *   read   GET  /api/production/fry_for_eng/audio/:id/url              (S3 key before and after: undo ledger)
 *   audio  POST /api/audio/render {role:'presentation', legoId, text}  (library first → splice → store → bind)
 * Why this re-splices: every intro holds "Frisian" ("The Frisian for: …"), so under the English word rule (a6738c2ec) the
 * reuse guard refuses the existing pre-rule intro AND the old "The Frisian for" fragment; the splice renders one new fragment
 * (IPA via the TTS door), reuses or renders each second half, and the store swaps the bytes onto the SAME row with
 * audio_revision + 1 (76ad3e5bc), the old object kept in S3 and named in course_audio_revisions.
 * PRE-CHECK: a LEGO whose presentation pointer, or whose known text, no longer matches the plan is HELD, never forced. An intro
 * whose quoted LEGO words differ from the LEGO's known text is HELD too (re-splicing it would re-voice a wrong intro).
 * Quiet window: no writes 22:15–23:30Z (the cym_for_kor band apply). A cap/stop refusal ends the run.
 *   node ops/fry-build/frisian-273-intros.cjs [--limit N] [--only S0001L03,…] [--batch 50] [--stop-at 120000]
 */
const fs = require('fs'), path = require('path')
const COURSE = 'fry_for_eng', POPTY = 'http://localhost:3470', WHO = 'kai-273'
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const LIMIT = Number(opt('--limit', 1e9)), BATCH = Number(opt('--batch', 50)), STOP_AT = Number(opt('--stop-at', 120000))
const ONLY = opt('--only', null) ? new Set(opt('--only').split(',')) : null
const LEDGER = path.join(__dirname, 'frisian-273', 'intros-ledger.jsonl')
fs.mkdirSync(path.dirname(LEDGER), { recursive: true })
const PURPOSE = 'fry_for_eng intro: Frisian said FREE-zhən, re-spliced (cs #273·AL, Kai pick F 24 Nov, d/b1989450)'
const STOP_CODES = ['DAILY_TOTAL_CAP', 'DAILY_CAP', 'POOL_SHARE', 'STOPPED_BY_TOM', 'TRIPPED', 'REPEAT', 'NOT_IN_CHAIN']
const INTRO = /^\s*The\s+(.+?)\s+for:?\s+'([\s\S]*)',?\s+is:?\s*$/i, AS_IN = /',?\s+as in\s*[—–-]?\s*'/i
const hdr = { 'Content-Type': 'application/json', 'x-agent-id': WHO, 'x-agent-role': 'audio-render' }
const log = (e) => fs.appendFileSync(LEDGER, JSON.stringify({ ...e, at: new Date().toISOString() }) + '\n')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const get = async (p) => { const r = await fetch(POPTY + p, { headers: { 'x-agent-id': WHO } }); if (!r.ok) throw new Error(`${p} ${r.status}`); return r.json() }
const fold = (t) => String(t || '').replace(/[’‘]/g, "'").trim().replace(/[\s.?!,;:]+$/u, '').toLowerCase()

async function liveLegos() {
  const m = new Map()
  for (const s of (await get(`/api/production/${COURSE}/seeds`)).seeds) for (const l of s.legos) m.set(l.lego_id, { pres: l.presentation_audio_id, known: l.known_text })
  return m
}
async function introTexts() {
  const m = new Map()
  for (let o = 0; ; o += 200) {
    const j = await get(`/api/production/${COURSE}/audio-preview/clips?filter=all&role=presentation&limit=200&offset=${o}`)
    for (const c of j.clips) m.set(c.id, c.text)
    if (j.clips.length < 200) break
    await sleep(300)
  }
  return m
}
async function keyOf(id) {
  const j = await get(`/api/production/${COURSE}/audio/${id}/url`).catch(() => ({}))
  const m = /amazonaws\.com\/([^?]+)/.exec(j.url || '')
  return m ? decodeURIComponent(m[1]) : null
}
async function quietWindow() {
  for (;;) {
    const d = new Date(), mins = d.getUTCHours() * 60 + d.getUTCMinutes()
    if (mins < 22 * 60 + 15 || mins >= 23 * 60 + 30) return
    console.log('quiet window (22:15–23:30Z), waiting'); await sleep(5 * 60 * 1000)
  }
}

;(async () => {
  const done = new Set(); let spent = 0
  if (fs.existsSync(LEDGER)) for (const l of fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean)) {
    const e = JSON.parse(l); if (['spliced', 'rendered', 'library', 'held', 'refused'].includes(e.kind)) done.add(e.lego); spent += e.charsSpent || 0
  }
  const plan0 = await liveLegos(), texts = await introTexts()
  const todo = [...plan0.keys()].filter((id) => plan0.get(id).pres && !done.has(id) && (!ONLY || ONLY.has(id))).slice(0, LIMIT)
  console.log(`live: ${[...plan0.values()].filter((l) => l.pres).length} intros; ledger done ${done.size}; this run ${todo.length}; spent so far ${spent}`)
  for (let b = 0; b < todo.length; b += BATCH) {
    await quietWindow()
    const live = b === 0 ? plan0 : await liveLegos()
    for (const lego of todo.slice(b, b + BATCH)) {
      await quietWindow()
      const p = plan0.get(lego), n = live.get(lego), text = texts.get(p.pres)
      const m = text && INTRO.exec(text), x = m ? m[2].split(AS_IN)[0].trim() : null
      let why = null
      if (!n || n.pres !== p.pres || n.known !== p.known) why = 'LEGO pointer or known text changed since plan'
      else if (!text) why = 'intro clip text unreadable'
      else if (m && fold(x) !== fold(p.known)) why = `intro quotes '${x}' but the LEGO known text is '${p.known}'`
      if (why) { log({ kind: 'held', lego, why, audioId: p.pres, text: text || null, known: p.known }); console.log('HELD', lego, why); continue }
      if (spent >= STOP_AT) { log({ kind: 'hard-stop', spent, next: lego }); console.log('HARD STOP', spent); return }
      const oldKey = await keyOf(p.pres)
      const r = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: hdr, body: JSON.stringify({ courseCode: COURSE, role: 'presentation', legoId: lego, text, purpose: PURPOSE }) })
      const out = await r.json().catch(() => ({ ok: false, error: `non-JSON ${r.status}` }))
      if (!out.ok) {
        const stop = STOP_CODES.find((c) => out.code === c || String(out.error || '').includes(c))
        log({ kind: 'refused', lego, status: r.status, code: out.code || null, error: String(out.error || '').slice(0, 400), audioId: p.pres })
        console.log('REFUSED', lego, r.status, out.code, String(out.error || '').slice(0, 160))
        if (stop || r.status === 402) { console.log('STOPPED by', stop || 402); return }
        continue
      }
      const newKey = await keyOf(out.audioId || p.pres)
      spent += out.charsSpent || 0
      log({ kind: out.source, lego, oldAudioId: p.pres, audioId: out.audioId, sameRow: out.audioId === p.pres, revision: out.revision ?? null, legoLinked: out.legoLinked ?? null, oldKey, newKey, charsSpent: out.charsSpent || 0, pieces: out.pieces || null, text })
      console.log(out.source, out.charsSpent, lego, out.audioId === p.pres ? 'same row' : 'NEW ROW', 'rev', out.revision, oldKey === newKey ? 'KEY UNCHANGED?' : '')
      await sleep(300)
    }
  }
  console.log(`done; spent ${spent}`)
})().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
