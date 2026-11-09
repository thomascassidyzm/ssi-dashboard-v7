#!/usr/bin/env node
/**
 * ABAIR IRISH VOICE AUDITION — job #525, Kai 2026-11-09.
 *
 * Renders the same 8 real gle_for_eng items in every ABAIR voice (Trinity College Dublin's Irish TTS), through the ONE
 * audio route (POST /api/audio/render, trial:true — the Voice Lab trial lane, job #748: clips stored under trial/, never
 * linkable to a course), then builds a blind tap-to-mark listening page with the live gle_for_eng clips mixed in.
 *
 * ABAIR's terms (api.abair.ie/v4/docs): prototyping is fine; NO load testing; NEVER send the same request twice. So:
 *   - one request per item per voice, sequential, a pause between, NO retries — a failure is recorded and never re-sent;
 *   - every answer (clip or refusal) is cached in the ledger below BEFORE the next request, and a cached pair is skipped
 *     forever, so a re-run (after a crash, or on a later day) only asks for what was never asked.
 * The key lives only in phase8's environment (ABAIR_API_KEY); this tool never sees it.
 *
 *   node tools/audio/abair-audition.cjs plan              # voices + characters/tokens, no synthesis
 *   node tools/audio/abair-audition.cjs render            # one trial render per (voice, item) not yet asked
 *   CS_CONV_TOKEN=… CS_CONV_ID=… node tools/audio/abair-audition.cjs page   # publish clips, build the blind page, print the key
 *
 * Env: POPTY_URL (default http://localhost:3470), SURFACE_URL (default http://localhost:4317).
 * Ledger + key + downloaded clips: ~/ssi-evidence/ssi-dashboard-v7/tools/audio/abair-audition/ (tools/lib/evidence-path.cjs).
 */
const fs = require('fs')
const path = require('path')
const { evidencePath } = require('../lib/evidence-path.cjs')

const POPTY = process.env.POPTY_URL || 'http://localhost:3470'
const SURFACE = process.env.SURFACE_URL || 'http://localhost:4317'
const COURSE = 'gle_for_eng'
const WHO = 'job-525-abair-audition'
const DIR = evidencePath('tools/audio/abair-audition')
const LEDGER = path.join(DIR, 'ledger.json')
const PAUSE_MS = 1500

/**
 * THE ITEMS — real gle_for_eng rows (Kai: auditions use real seeds + LEGOs, the same items for every voice), read from
 * GET /api/production/gle_for_eng/seeds on 2026-11-09. Text exactly as stored. liveTarget1/2 are the course rows'
 * current clips (Azure Orla / Colm), heard blind beside ABAIR for comparison.
 */
const ITEMS = [
  { kind: 'seed', ref: 'S0001', known: 'I want to speak Irish with you now', target: 'Tá mé ag iarraidh Gaeilge a labhairt leat anois', liveTarget1: '3d589038-37a2-4bf3-90bd-af439da97cdc', liveTarget2: 'f14d2eb8-cd59-4db6-bed5-d588cbd4aac3' },
  { kind: 'seed', ref: 'S0557', known: "I wish they wouldn't play such loud music", target: 'is mian liom nach seinneadh siad ceol chomh hard sin', liveTarget1: 'c1205b49-7861-407f-b138-fb052903cee9', liveTarget2: '4e349e0c-1d49-4fba-9e1c-b312a4e9ec63' },
  { kind: 'seed', ref: 'S0014', known: 'do you speak Irish all day?', target: 'an labhraíonn tú Gaeilge an lá ar fad?', liveTarget1: '495fb17e-ec54-4987-a117-1c9ca4dbee7c', liveTarget2: '196ce530-92f7-4321-bca0-111d590ca024' },
  { kind: 'LEGO', ref: 'S0010L01', known: "I'm not sure", target: 'níl mé cinnte', liveTarget1: '33bea678-2047-41f4-abf8-d3881a0af773', liveTarget2: 'f87dba4c-3faa-473d-b710-ccde2da77aaf' },
  { kind: 'LEGO', ref: 'S0018L03', known: "at six o'clock", target: 'ar a sé a chlog', liveTarget1: 'f916322a-2731-4be0-9537-fa926a216e78', liveTarget2: '59c468a1-5d16-42bc-8a0a-84dc85f9e050' },
  { kind: 'LEGO', ref: 'S0004L03', known: 'in Irish', target: 'i nGaeilge', liveTarget1: 'eea46cf4-647c-44f9-b386-dfdf3bd7049e', liveTarget2: 'a2920f51-bbd6-46f7-95a8-812e235295a8' },
  { kind: 'phrase', ref: 'S0008L02B02', known: 'to say what I mean', target: 'a rá cad atá i gceist agam', liveTarget1: 'cb3a4c66-2da3-4b91-bc01-7038d566ae2c', liveTarget2: '798d6fff-acad-44d5-8cbf-b35179e24f1a' },
  { kind: 'phrase', ref: 'S0011L01B06', known: "I'd like to learn", target: 'ba mhaith liom foghlaim', liveTarget1: '4ff44c8d-a3f2-4205-b31c-dd3e72b81b45', liveTarget2: '7678a66b-3bfd-487a-84ab-163384740778' },
]
const LIVE = [
  { key: 'live:target1', label: 'LIVE gle_for_eng target1 (Azure ga-IE-OrlaNeural, rendered at 0.8)', field: 'liveTarget1' },
  { key: 'live:target2', label: 'LIVE gle_for_eng target2 (Azure ga-IE-ColmNeural, rendered at 0.85)', field: 'liveTarget2' },
]

const loadLedger = () => (fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : { renders: {} })
const saveLedger = (l) => { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(LEDGER, JSON.stringify(l, null, 2)) }
const pairKey = (voice, item) => `${voice}|${item.ref}`
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function voices() {
  const r = await fetch(`${POPTY}/api/audio/abair/voices`, { headers: { 'x-agent-id': WHO } })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.ok) throw new Error(`ABAIR voice list refused (${r.status}): ${j.error || 'no answer'}`)
  // One request per voice NAME (the synthesis endpoint's `voice`); a name listed twice is asked once.
  const seen = new Set()
  return j.voices.filter(v => v.name && !seen.has(v.name) && seen.add(v.name))
}

async function plan() {
  const vs = await voices()
  const chars = ITEMS.reduce((n, i) => n + i.target.length, 0)
  console.log(`${vs.length} ABAIR voices:`)
  for (const v of vs) console.log(`  abair_${v.name}  (${v.id}, ${v.sex || '?'}, ${v.province || '?'}${v.location ? ' / ' + v.location : ''})`)
  console.log(`${ITEMS.length} items, ${chars} characters per voice → ${chars * vs.length} characters, ${chars * vs.length * 8} ABAIR tokens (8/char; basic cap 500,000/day)`)
}

async function render() {
  const vs = await voices()
  const ledger = loadLedger()
  ledger.voices = vs
  saveLedger(ledger)
  let asked = 0, skipped = 0
  for (const v of vs) {
    for (const item of ITEMS) {
      const k = pairKey(v.name, item)
      if (ledger.renders[k]) { skipped++; continue }            // asked before — answer or refusal — never asked again
      const body = { courseCode: COURSE, role: 'target1', text: item.target, trial: true, voiceId: `abair_${v.name}`,
        purpose: `ABAIR Irish voice audition (Kai) — ${item.kind} ${item.ref}`, startedBy: 'Kai', job: '#525' }
      let status = 0, answer
      try {
        const r = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': WHO }, body: JSON.stringify(body) })
        status = r.status; answer = await r.json().catch(() => ({ error: 'unreadable answer' }))
      } catch (e) { answer = { error: e.message } }
      ledger.renders[k] = { voice: v.name, ref: item.ref, at: new Date().toISOString(), status, ok: !!(answer && answer.ok), audioId: answer && answer.audioId, s3Key: answer && answer.s3Key, charsSpent: answer && answer.charsSpent, source: answer && answer.source, code: answer && answer.code, error: answer && !answer.ok ? String(answer.error || '').slice(0, 300) : undefined }
      saveLedger(ledger); asked++
      console.log(`${ledger.renders[k].ok ? 'OK  ' : 'FAIL'} abair_${v.name} ${item.ref} ${ledger.renders[k].ok ? ledger.renders[k].audioId : `${status} ${ledger.renders[k].code || ''} ${ledger.renders[k].error}`}`)
      // STOP AT THE FIRST FAILURE (job #525: a malformed request was refused 96 times in a row because the run only stopped on
      // quota codes). The one exception is a tier refusal of ONE voice (VOICE_RESTRICTED): skip that voice, keep the others.
      if (!ledger.renders[k].ok) {
        if (/VOICE_RESTRICTED/.test(ledger.renders[k].error || '')) { console.log(`abair_${v.name} is not on this tier — skipping its other items`); break }
        console.log('Stopping at the first failure. Nothing is retried; fix the cause, then re-run (asked pairs are skipped).'); return
      }
      await sleep(PAUSE_MS)
    }
  }
  console.log(`asked ${asked}, already in ledger ${skipped}. Ledger: ${LEDGER}`)
}

/** Seeded shuffle, so the letters are the same on every run of the page step (the key does not move). */
function shuffled(list, seed = 525) {
  const a = list.slice(); let s = seed
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) % 2147483648; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

async function download(url, file, headers = {}) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return file
  const r = await fetch(url, { headers })
  if (!r.ok) throw new Error(`download ${r.status} ${url.split('?')[0]}`)
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()))
  return file
}

async function page() {
  const token = process.env.CS_CONV_TOKEN, conv = process.env.CS_CONV_ID
  if (!token || !conv) throw new Error('page needs CS_CONV_TOKEN and CS_CONV_ID (the room the answers return to)')
  const ledger = loadLedger()
  // The surface publishes only from the caller's own workspace or $CS_SCRATCH, so a worker points ABAIR_CLIPS_DIR there (job #525).
  const clipsDir = process.env.ABAIR_CLIPS_DIR || path.join(DIR, 'clips'); fs.mkdirSync(clipsDir, { recursive: true })
  const voicesHeard = [...new Set(Object.values(ledger.renders).filter(r => r.ok).map(r => r.voice))]
  const meta = Object.fromEntries((ledger.voices || []).map(v => [v.name, v]))
  const sources = shuffled([...voicesHeard.map(n => ({ key: `abair:${n}`, label: `ABAIR ${n} (${meta[n] ? `${meta[n].id}, ${meta[n].sex}, ${meta[n].province}` : '?'})` })), ...LIVE])
  const letters = sources.map((s, i) => ({ ...s, letter: String.fromCharCode(65 + i) }))
  ledger.published = ledger.published || {}
  const publish = async (file, title) => {
    if (ledger.published[file]) return ledger.published[file]
    const r = await fetch(`${SURFACE}/api/publish-doc`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cs-conv': token }, body: JSON.stringify({ file, title, conv_id: conv, internal: true }) })
    const j = await r.json()
    if (!j.url) throw new Error(`publish refused for ${path.basename(file)}: ${JSON.stringify(j).slice(0, 200)}`)
    const m = /\/d\/[0-9a-f]{8}/.exec(new URL(j.url, SURFACE).pathname)   // the file url already ends /file; the page wants /d/<id>/file
    if (!m) throw new Error(`publish answered an unexpected url for ${path.basename(file)}: ${j.url}`)
    const p = `${m[0]}/file`
    ledger.published[file] = p; saveLedger(ledger); return p
  }
  const items = [], gaps = []
  for (const [n, item] of ITEMS.entries()) {
    for (const s of letters) {
      let file
      try {
        if (s.key.startsWith('abair:')) {
          const r = ledger.renders[pairKey(s.key.slice(6), item)]
          if (!r || !r.ok) { gaps.push(`${item.ref} voice ${s.letter}: ${r ? `${r.status} ${r.code || ''} ${r.error || ''}` : 'never rendered'}`); continue }
          file = await download(`${POPTY}/api/audio/trial/${r.audioId}`, path.join(clipsDir, `${r.audioId}.mp3`), { 'x-agent-id': WHO })
        } else {
          const id = item[LIVE.find(l => l.key === s.key).field]
          if (!id) { gaps.push(`${item.ref} voice ${s.letter}: no live clip`); continue }
          const u = await (await fetch(`${POPTY}/api/production/${COURSE}/audio/${id}/url`, { headers: { 'x-agent-id': WHO } })).json()
          file = await download(u.url, path.join(clipsDir, `live-${id}.mp3`))
        }
        const audio = await publish(file, `ABAIR audition ${item.ref} voice ${s.letter}`)
        items.push({ id: `${n + 1}${s.letter}`, source: `${n + 1}. ${item.kind} ${item.ref} — "${item.known}" · Voice ${s.letter}`, proposed: item.target, note: 'Accept = would use this voice for this line · Reject = would not. Own wording = say why.', options: ['natural', 'usable', 'not usable'], audio })
      } catch (e) { gaps.push(`${item.ref} voice ${s.letter}: ${e.message}`) }
    }
  }
  if (!items.length) { console.log('No clip could be published — no page built.'); for (const g of gaps.slice(0, 5)) console.log(`  ${g}`); process.exit(2) }
  const r = await fetch(`${SURFACE}/api/review-page`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cs-conv': token }, body: JSON.stringify({ title: `ABAIR Irish audition — ${ITEMS.length} gle_for_eng items, voices ${letters[0].letter}–${letters[letters.length - 1].letter} (blind)`, conv_id: conv, items }) })
  const j = await r.json()
  ledger.page = { url: j.url || null, at: new Date().toISOString(), key: letters.map(l => ({ letter: l.letter, source: l.label })), gaps }
  saveLedger(ledger)
  console.log(`page: ${j.url || JSON.stringify(j)}`)
  console.log('KEY:'); for (const l of letters) console.log(`  ${l.letter} = ${l.label}`)
  if (gaps.length) { console.log('GAPS:'); for (const g of gaps) console.log(`  ${g}`) }
}

const cmd = process.argv[2]
const run = { plan, render, page }[cmd]
if (!run) { console.error('usage: abair-audition.cjs plan | render | page'); process.exit(1) }
run().catch(e => { console.error(e.message); process.exit(2) })
