#!/usr/bin/env node
/**
 * The standing intro-reuse step for ANY English-known course (job #294, Tom 2026-10-31: "This needs to be IN POPTY AS A
 * PROCESS So that we don't spank credits on recording 1000 new intros on every course").
 *
 *   node tools/audio/intro-reuse/plan-course.cjs --course fin_for_eng [--lang Finnish] [--concurrency 4]
 *
 * PLAN ONLY. It reads through Popty's own routes (course-builder :3471 seeds + LEGOs, production :3470 presentation per
 * LEGO, and the render door with dryRun:true for the one shared frame clip) — no SQL, no writes, no audio, no TTS.
 * For each LEGO with an intro it looks the English prompt up in as-in-store.json and plans
 *   [ONE "The <Lang> for" Tom-006 clip, recorded once per language] + [the existing clean second half of that prompt]
 * or marks it TTS-needed (as-in-store.cjs planIntro has the recipes). Output: plan + match report to
 * ~/ssi-evidence/ssi-dashboard-v7/tools/audio/intro-reuse/<course>-plan.json.
 *
 * A later APPLY stage is deliberately not here. When Kai/Tom approve it, it must: splice with the cut recipe already in
 * ssi-learning-app tools/intro-bank/afr-remake/remake.mjs (frame + donor body cut after "for:" by word timings); file each
 * new clip as a NEW course_audio row (make-before-break); and point the slot only through
 * POST /api/production/:courseCode/link-clip with replace + expectCurrent. Any render (the frame, the TTS-needed second
 * halves) goes through POST /api/audio/render, never tts-service.
 */
const fs = require('fs'), path = require('path')
const { planIntro, summarise, T6 } = require('./as-in-store.cjs')
const { evidencePath } = require('../../lib/evidence-path.cjs')
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const course = opt('--course'); if (!course) { console.error('--course required'); process.exit(1) }
const CB = (process.env.COURSE_BUILDER_URL || 'http://localhost:3471').replace(/\/$/, '')
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
const H = { 'x-agent-id': 'intro-reuse-plan', 'Content-Type': 'application/json' }

async function get(url) {
  for (let a = 0; ; a++) {
    try { const r = await fetch(url, { headers: H }); const j = await r.json().catch(() => ({})); return { status: r.status, j } }
    catch (e) { if (a >= 3) throw e; await new Promise(r => setTimeout(r, 3000)) }
  }
}
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k) } })) }

;(async () => {
  const store = JSON.parse(fs.readFileSync(path.join(__dirname, 'as-in-store.json'), 'utf8'))
  const seeds = []
  for (let off = 0; ; off += 300) { const { j } = await get(`${CB}/api/seeds/${course}?limit=300&offset=${off}`); seeds.push(...(j.seeds || [])); if (!j.seeds || j.seeds.length < 300) break }
  const seedText = Object.fromEntries(seeds.map(s => [s.seed_number, s.known_text]))
  const legos = []
  await pool(seeds.map(s => s.seed_number), 4, async n => { const { j } = await get(`${CB}/api/legos/${course}?seed=${n}`); legos.push(...(j.legos || [])) })
  legos.sort((a, b) => a.lego_id < b.lego_id ? -1 : 1)
  const errors = []
  await pool(legos, Number(opt('--concurrency', 4)), async l => {
    const { status, j } = await get(`${POPTY}/api/production/${course}/presentation/${l.lego_id}`)
    if (status !== 200) { errors.push({ lego_id: l.lego_id, status, error: j.error }); return }
    l.intro = j.exists ? { text: j.text, audioId: j.audio_id } : null
  })
  const withIntro = legos.filter(l => l.intro)
  const lang = opt('--lang') || ((withIntro.map(l => /^The (.+?) for\b/.exec(l.intro.text)).find(Boolean) || [])[1])
  if (!lang) throw new Error('cannot read the language name from the intros of ' + course + ' (pass --lang)')
  // the one possible spend: the shared frame, library-first, asked through the render door in dryRun (never renders)
  const fr = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: H, body: JSON.stringify({ courseCode: course, role: 'known', text: `The ${lang} for`, voiceId: T6, language: 'eng', dryRun: true, purpose: `intro-reuse plan (#294): is the shared "The ${lang} for" frame in the library?` }) })
  const frame = await fr.json().catch(() => ({}))
  const plans = withIntro.map(l => ({ ...planIntro(store, { lego_id: l.lego_id, known_text: l.known_text, ctx: seedText[l.seed_number], currentText: l.intro.text, currentAudioId: l.intro.audioId }, lang), currentAsIn: /as in/.test(l.intro.text) }))
  const report = summarise(plans, { lang, frameInLibrary: frame.source === 'library' })
  report.frame.door = { status: fr.status, source: frame.source || null, audioId: frame.audioId || null, wouldSpendChars: frame.wouldSpendChars ?? null, code: frame.code || null }
  report.course = course; report.legos = legos.length; report.readErrors = errors.length
  report.currentAsIn = plans.filter(p => p.currentAsIn).length
  report.currentAsInMatched = plans.filter(p => p.currentAsIn && p.match).length
  const out = evidencePath(`tools/audio/intro-reuse/${course}-plan.json`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify({ report, plans, errors }, null, 1))
  const { ttsNeeded, ...head } = report
  console.log(JSON.stringify(head, null, 1)); console.log('tts-needed', ttsNeeded.length, '| written', out)
})().catch(e => { console.error(e); process.exit(1) })
