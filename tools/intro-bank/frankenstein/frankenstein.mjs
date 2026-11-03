#!/usr/bin/env node
// MOVED to Popty from ssi-learning-app/tools/intro-bank/frankenstein/frankenstein.mjs (job #699, Tom 2026-11-03: "we need everything that touches course content to be a popty tool"); behaviour unchanged, app paths via tools/lib/learning-app.mjs.
// NOTE: reads the database with psql (read-only session) by hand. Under the 2026-10-14 HARD RULE (job #384) a run needs this
// moved onto services/shared/agent-db.cjs or a Popty read route first; moved as-is in #699 (keep behaviour identical).
/**
 * Frankenstein LEGO intros (job #755, ruling r-2026-10-18-frankenstein-lego-intros-where-a-premi).
 * Where a premium course already has a COMPLETE recorded LEGO intro ("The Spanish for: 'I'm trying to', is:"), split it ONCE right after
 * "The <Language> for", swap in a recorded "The Greek for" / "The Bulgarian for"..., keep the whole rest of the recording. Same house
 * splice maths as ../afr-remake (ruling r-2026-10-13-spliced-tom-voice-intro-house-setting). NO TTS, NO WRITES to the DB or to any course:
 * every query runs in a read-only session.
 *
 *   node frankenstein.mjs census --out DIR              inventory: complete recorded intros per premium course/voice + "The <Lang> for" frame gaps
 *   node frankenstein.mjs pilot --course ell_for_eng --out DIR [--n 10]
 *                                                       10 LEGOs, current vs old stitched vs new Frankenstein, mp3s + index.html in DIR
 * Never Welsh (cym*): refused.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import os from 'node:os'
import { keyOf, parseIntro, bodyCut } from './lib.mjs'
import * as D from './dsp.mjs'

const [stage, ...rest] = process.argv.slice(2)
const opt = (n, d) => { const i = rest.indexOf('--' + n); return i >= 0 ? rest[i + 1] : d }
const OUT = opt('out')
if (!OUT) { console.error('usage: frankenstein.mjs <census|pilot> --out DIR [--course C] [--n 10]'); process.exit(1) }
mkdirSync(OUT, { recursive: true })
const COURSE = opt('course', 'ell_for_eng')
if (/^cym/i.test(COURSE)) { console.error('refusing: Welsh (Tom clone never used in Welsh)'); process.exit(4) }
const TOM = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const PIECE = { is: '2e12b859-911c-4ef3-b9b7-1cdc81703243', asIn: 'fd867f14-4469-4460-8a2e-2f95aafa62cb', isSaidLikeThis: 'acc15e10-d1f2-41cc-a926-721e5bac6790' }
const H = { g1: 0, g2: -60, em: 1.5, inGap: 120 }   // house setting: gap frame->LEGO 0, LEGO->tail -60, LEGO +1.5 dB
const SR = 48000

const home = os.homedir()
const env = (f) => Object.fromEntries(readFileSync(f, 'utf8').split('\n').map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const POPTY = join(home, 'SSi/ssi-dashboard-v7-clean')
const E = env(join(POPTY, '.env')), DB = env(join(POPTY, '.env.psql')).DATABASE_URL
const AWS = createRequire(join(POPTY, 'package.json'))('aws-sdk')
const BUCKET = E.S3_AUDIO_BUCKET || 'ssi-audio-stage'
const s3 = new AWS.S3({ accessKeyId: E.AWS_ACCESS_KEY_ID, secretAccessKey: E.AWS_SECRET_ACCESS_KEY, region: E.AWS_REGION || 'eu-west-1' })
// the connection goes in PG* env, never argv: execFileSync errors echo argv, and argv shows in ps (#759)
const U = new URL(DB)
const PGENV = { PGHOST: U.hostname, PGPORT: U.port || '5432', PGUSER: decodeURIComponent(U.username), PGPASSWORD: decodeURIComponent(U.password), PGDATABASE: U.pathname.slice(1), PGOPTIONS: '-c default_transaction_read_only=on' }
const psql = (sql) => {
  try { return execFileSync('psql', ['-At', '-F', '\t', '-v', 'ON_ERROR_STOP=1', '-c', sql], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...PGENV } }).toString().split('\n').filter(Boolean).map((l) => l.split('\t')) }
  catch (e) { throw new Error('psql failed: ' + String(e.stderr || e.message).replace(/[a-z]+:\/\/\S+/gi, '[redacted]').slice(0, 600)) }
}
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'"
const PRES = `l.presentation_audio_id`   // a uuid column

async function premiumCodes() {
  const r = await fetch('https://staging.saysomethingin.app/api/courses/available'); const j = await r.json()
  return j.filter((c) => c.pricing_tier === 'premium' && !/^cym/i.test(c.course_code)).map((c) => c.course_code)
}

// ── census ───────────────────────────────────────────────────────────────
async function census() {
  const premium = new Set(await premiumCodes())
  const courses = Object.fromEntries(psql(`select course_code, coalesce(display_name,''), coalesce(target_lang,''), coalesce(known_lang,'') from courses`).map(([c, n, t, k]) => [c, { name: n, target: t, known: k }]))
  // the agent login is capped at 5 s a statement: one query per premium course, not one over the estate
  const rows = [...premium].flatMap((cc) => psql(`select l.course_code, coalesce(pv.voice_id,''), pv.text, (pv.spliced_from is not null)::text, coalesce(jsonb_array_length(pv.word_timings::jsonb->'words'),0), coalesce(jsonb_array_length(pv.word_timings::jsonb->'starts'),0)
    from course_legos l join course_audio pv on pv.id=${PRES} where l.course_code=${q(cc)} and pv.text ~ '^The .+ for'`))
  const per = {}
  for (const [c, v, text, spliced, nw, ns] of rows) {
    const p = parseIntro(text); const k = c + '|' + v
    const r = (per[k] ||= { course: c, voice: v, premium: premium.has(c), intros: 0, complete: 0, completeAsIn: 0, continuous: 0, stitched: 0, splittable: 0 })
    r.intros++
    if (!p) continue
    r.complete++; if (p.c) r.completeAsIn++
    if (spliced === 'true') { r.stitched++; continue }
    r.continuous++
    if (nw > 3 && nw === ns) r.splittable++
  }
  const langOf = (code) => { const m = /^(.+?) for /i.exec(courses[code]?.name || ''); return m ? m[1] : null }
  const langs = [...new Set(Object.keys(courses).filter((c) => courses[c].known === 'eng' && !/^cym|^zzz/i.test(c)).map(langOf).filter(Boolean))]
  // clip_index (language, text_key) is the indexed door; course_audio has no text index, so a text scan hits the 5 s cap
  const frames = psql(`select voice_id, text_key, audio_id::text from clip_index where language='eng' and text_key in (${langs.map((l) => q('the ' + l.toLowerCase() + ' for')).join(',')}) order by 2`).map(([v, t, id]) => ({ voice: v, lang: /^the (.+) for$/.exec(t)[1], id }))
  const frameLangsTom = new Set(frames.filter((f) => f.voice === TOM || f.voice.includes(TOM.slice(-36))).map((f) => f.lang.toLowerCase()))
  const targets = Object.entries(courses).filter(([c, v]) => v.known === 'eng' && !/^cym|^zzz/i.test(c)).map(([c]) => ({ course: c, lang: langOf(c), premium: premium.has(c), tomFrame: frameLangsTom.has((langOf(c) || '').toLowerCase()) }))
  const out = { when: new Date().toISOString(), premiumCourses: [...premium], perCourseVoice: Object.values(per).sort((a, b) => b.continuous - a.continuous), framesByVoice: frames, targets }
  writeFileSync(join(OUT, 'census.json'), JSON.stringify(out, null, 1))
  console.log('premium courses:', premium.size)
  console.log('course | voice | intros | complete | asIn | continuous(recorded) | stitched | splittable')
  for (const r of out.perCourseVoice.filter((r) => r.premium)) console.log([r.course, r.voice.slice(0, 18), r.intros, r.complete, r.completeAsIn, r.continuous, r.stitched, r.splittable].join(' | '))
  const gaps = targets.filter((t) => !t.tomFrame)
  console.log('English-known target languages WITHOUT a Tom-006 "The <Lang> for" frame:', gaps.map((g) => `${g.course}(${g.lang})`).join(', '))
  console.log('English-known target languages WITH one:', targets.filter((t) => t.tomFrame).length)
}

// ── audio io ─────────────────────────────────────────────────────────────
const pcmCache = new Map(), keyCache = new Map()
function s3Key(id) { if (!keyCache.has(id)) keyCache.set(id, psql(`select s3_key from course_audio where id=${q(id)}`)[0][0]); return keyCache.get(id) }
async function srcFile(id) {
  const f = join(OUT, 'src', id + '.mp3')
  if (!existsSync(f)) { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, (await s3.getObject({ Bucket: BUCKET, Key: s3Key(id) }).promise()).Body) }
  return f
}
async function pcm(id) {
  if (pcmCache.has(id)) return pcmCache.get(id)
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', await srcFile(id), '-f', 'f32le', '-ac', '1', '-ar', String(SR), 'pipe:1'], { maxBuffer: 1 << 28 })
  const a = Float32Array.from(new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4)); pcmCache.set(id, a); return a
}
const toMp3 = (x, file) => {
  const b = Buffer.alloc(x.length * 2); for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), i * 2)
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 's16le', '-ar', String(SR), '-ac', '1', '-i', 'pipe:0', '-b:a', '96k', file], { input: b })
}
function finish(parts, gaps) {   // the house chain (remake.mjs buildOne): level-match (LEGO/body +1.5 dB), overlay, -14 dBFS, 80 ms fade, 250 ms silence
  const gn = D.matchGains(parts.map((p) => D.voicedRms(p, SR)), H.em, 1)
  return D.tomEnding(D.normaliseIntro(D.overlay(parts.map((p, k) => D.scale(p, gn[k])), gaps, SR), SR), SR, 80)
}

// ── pilot ────────────────────────────────────────────────────────────────
async function pilot() {
  const N = +opt('n', 10), premium = await premiumCodes()
  const [[display]] = psql(`select display_name from courses where course_code=${q(COURSE)}`)
  const lang = /^(.+?) for /.exec(display)[1]
  const frame = psql(`select voice_id, audio_id::text from clip_index where language='eng' and text_key=${q('the ' + lang.toLowerCase() + ' for')}`).find(([v]) => v === TOM || v.includes(TOM.slice(-36)))?.[1]
  if (!frame) throw new Error(`no Tom-006 "The ${lang} for" frame: nothing to swap in (a gap; no TTS spent here)`)
  // donors: COMPLETE continuous Tom-006 recordings of premium courses (never a stitched one: spliced_from is null), keyed by LEGO | as-in context
  const donors = new Map()
  for (const [id, course, text, wtj] of premium.flatMap((cc) => psql(`select id::text, course_code, text, word_timings::text from course_audio where voice_id=${q(TOM)} and role='presentation' and spliced_from is null and word_timings is not null and text ~ '^The .+ for' and course_code=${q(cc)} order by duration_ms`))) {
    const p = parseIntro(text); if (!p || p.tail !== 'is' || p.lang.toLowerCase() === lang.toLowerCase()) continue
    const wt = JSON.parse(wtj); if (!bodyCut(wt)) continue
    const k = keyOf(p.x) + '|' + keyOf(p.c || ''); if (!donors.has(k)) donors.set(k, { id, course, text, wt })
  }
  // the pilot course's LEGOs: Tom-006 LEGO prompt, a current intro, and (for as-in) a Tom-006 seed prompt
  const rows = psql(`select l.lego_id, l.known_text, coalesce(k.voice_id,''), coalesce(l.known_audio_id::text,''), coalesce(pv.id::text,''), coalesce(pv.text,''), l.seed_number, coalesce(sv.voice_id,''), coalesce(s.known_audio_id::text,''), coalesce(s.known_text,'')
    from course_legos l left join course_audio k on k.id=l.known_audio_id left join course_audio pv on pv.id=${PRES}
    left join course_seeds s on s.course_code=l.course_code and s.seed_number=l.seed_number left join course_audio sv on sv.id=s.known_audio_id
    where l.course_code=${q(COURSE)} and l.seed_number between 2 and 80 order by l.seed_number, l.lego_index`)
  const cands = []
  for (const [lego_id, known, kv, kid, pid, ptext, , sv, sid, seedText] of rows) {
    if (kv !== TOM || !kid || !pid) continue
    const p = parseIntro(ptext); if (!p) continue
    const d = donors.get(keyOf(p.x) + '|' + keyOf(p.c || '')); if (!d) continue
    if (p.c && (sv !== TOM || !sid)) continue
    cands.push({ lego_id, known, kid, pid, ptext, asin: !!p.c, ctx: p.c, sid, seedText, donor: d })
  }
  const seen = new Set(), bare = [], asin = []
  for (const c of cands) { const k = c.lego_id.slice(0, 5); if (seen.has(k)) continue; seen.add(k); (c.asin ? asin : bare).push(c) }
  const nAsin = Math.min(asin.length, Math.round(N * 0.3))
  const pick = [...bare.slice(0, N - nAsin), ...asin.slice(0, nAsin)].slice(0, N).sort((a, b) => a.lego_id.localeCompare(b.lego_id))
  console.log(`${COURSE}: ${donors.size} distinct donors; ${cands.length} LEGOs have a complete donor; pilot picks ${pick.length} (${nAsin} as-in)`)
  const fr = await pcm(frame), isP = await pcm(PIECE.is), sayP = await pcm(PIECE.isSaidLikeThis), asInP = await pcm(PIECE.asIn)
  const items = []
  for (const c of pick) {
    const base = c.lego_id
    // OLD: stitched house recipe (bare: frame + LEGO + "is said like this"; as-in: frame + LEGO + "as in" + seed sentence + "is")
    const lego = await pcm(c.kid)
    const old = c.asin ? finish([fr, lego, asInP, await pcm(c.sid), isP], [H.g1, H.inGap, H.inGap, H.inGap]) : finish([fr, lego, sayP], [H.g1, H.g2])
    // NEW: frame + the donor recording from the first word after "for" to its end
    const dpcm = await pcm(c.donor.id), cut = bodyCut(c.donor.wt)
    const a = D.snapOnset(dpcm, Math.round(cut.start * SR), SR), b = Math.min(dpcm.length, Math.round((cut.end + 0.03) * SR))
    const neu = finish([fr, dpcm.subarray(a, b)], [H.g1])
    toMp3(old, join(OUT, base + '_old.mp3')); toMp3(neu, join(OUT, base + '_new.mp3'))
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', await srcFile(c.pid), '-b:a', '96k', join(OUT, base + '_current.mp3')])
    items.push({ lego: base, known: c.known, asin: c.asin, ctx: c.ctx, current: c.ptext, donorText: c.donor.text, donorCourse: c.donor.course, donorId: c.donor.id, oldMs: Math.round(old.length / SR * 1000), newMs: Math.round(neu.length / SR * 1000) })
    console.log(base, JSON.stringify(c.known), c.asin ? 'as-in' : 'bare', 'donor', c.donor.course)
  }
  writeFileSync(join(OUT, 'pilot.json'), JSON.stringify({ course: COURSE, lang, frame, items }, null, 1))
  const esc = (s) => String(s).replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))
  const html = `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>Frankenstein intros pilot: ${esc(lang)}</title>
<style>body{font:16px system-ui;max-width:760px;margin:1em auto;padding:0 1em}h1{font-size:1.3em}.row{border-top:1px solid #ccc;padding:.8em 0}.k{font-weight:600}small{color:#555}audio{width:100%;margin:.15em 0}label{display:block;font-size:.85em;color:#333;margin-top:.4em}</style>
<h1>Frankenstein intros, pilot: ${esc(lang)} (${esc(COURSE)})</h1>
<p>Per LEGO, three clips. <b>Current</b> = what the course plays now. <b>Old</b> = stitched frame + LEGO + tail. <b>New</b> = recorded "The ${esc(lang)} for" + the rest of a complete recorded intro from a premium course. Nothing is repointed.</p>
${items.map((i) => `<div class=row><div class=k>${esc(i.lego)}: ${esc(i.known)}${i.asin ? ` <small>as in "${esc(i.ctx)}"</small>` : ''}</div><small>new = ${esc(lang)} frame + body of ${esc(i.donorCourse)}: ${esc(i.donorText)}</small>
<label>Current (${esc(i.current)})</label><audio controls preload=none src="${i.lego}_current.mp3"></audio>
<label>Old (stitched, ${i.oldMs} ms)</label><audio controls preload=none src="${i.lego}_old.mp3"></audio>
<label>New (Frankenstein, ${i.newMs} ms)</label><audio controls preload=none src="${i.lego}_new.mp3"></audio></div>`).join('\n')}`
  writeFileSync(join(OUT, 'index.html'), html)
}

await ({ census, pilot }[stage] || (() => { console.error('stage: census | pilot'); process.exit(1) }))()
