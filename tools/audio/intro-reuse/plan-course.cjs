#!/usr/bin/env node
/**
 * The standing intro-reuse step for ANY English-known course (job #294; reworked job #299 onto Tom's two-part model,
 * r-2026-10-31 "intros are TWO separate audio files": "Language specific + {known lego} is...").
 *
 *   node tools/audio/intro-reuse/plan-course.cjs --course fin_for_eng [--lang Finnish] [--concurrency 4]
 *
 * PLAN ONLY, POINTERS ONLY. Reads through Popty's own routes (course-builder :3471 seeds + LEGOs, production :3470
 * presentation per LEGO, and the render door with dryRun:true as the library lookup) — no SQL, no writes, no audio, no TTS.
 * Per LEGO it plans part 2 (the English second half "'X', is:") as a pointer: an existing standalone clip, a one-time CUT
 * of an existing whole intro (zero TTS), or a new recording. Per course it plans part 1, ONE "The <Lang> for" cut from
 * an existing intro of that course. No splice: the app plays the two files in sequence.
 * Output: ~/ssi-evidence/ssi-dashboard-v7/tools/audio/intro-reuse/<course>-plan.json.
 *
 * GAPS the apply stage must close first (found job #299, read from live code):
 *  - course_legos has ONE presentation_audio_id and the player's resolveIntroAudioUrl resolves ONE url; the only
 *    multi-clip playback is introAssembly.ts (client-side, piece bank + the LEGO's known_audio, gated ?introAssemble=tom,
 *    Tom bank covers afr/nld/pol/ell/eus only). A second-part pointer therefore needs a column/role + player read.
 *  - cutting needs course_audio.word_timings (words[2] ends "for"); this tool cannot read it through Popty routes.
 * Any render goes through POST /api/audio/render, never tts-service; any slot change only via link-clip, make-before-break.
 */
const fs = require('fs'), path = require('path')
const { planTwoPart, summariseTwoPart, parseIntro, norm, secondHalfText, T6 } = require('./as-in-store.cjs')
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
    l.intro = j.exists ? { text: j.text, audioId: j.audio_id, ms: j.duration_ms } : null
  })
  const withIntro = legos.filter(l => l.intro)
  const lang = opt('--lang') || ((withIntro.map(l => /^The (.+?) for\b/.exec(l.intro.text)).find(Boolean) || [])[1])
  if (!lang) throw new Error('cannot read the language name from the intros of ' + course + ' (pass --lang)')
  const render = (role, text, purpose) => fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: H, body: JSON.stringify({ courseCode: course, role, text, voiceId: T6, language: 'eng', dryRun: true, purpose }) }).then(r => r.json().catch(() => ({})))
  // part 1: is "The <Lang> for" already a clip in the Tom-006 voice? else cut it from the cleanest existing intro of this course
  const pf = await render('known', `The ${lang} for`, `intro-reuse plan (#299): is the per-course prefix "The ${lang} for" already in the library?`)
  const bareOwn = withIntro.filter(l => { const p = parseIntro(l.intro.text); return p && !p.ctx && l.intro.ms }).sort((a, b) => a.intro.ms - b.intro.ms)
  const donorL = bareOwn[0] || withIntro.filter(l => l.intro.ms).sort((a, b) => a.intro.ms - b.intro.ms)[0] || null
  const prefix = { inLibrary: pf.source === 'library', libraryClip: pf.audioId || null, wouldRenderChars: pf.source === 'library' ? 0 : (pf.wouldSpendChars ?? null),
    cutFrom: donorL ? { lego_id: donorL.lego_id, clip: donorL.intro.audioId, text: donorL.intro.text, ms: donorL.intro.ms, why: bareOwn[0] ? 'shortest bare (no as-in) intro of the course' : 'shortest intro of the course' } : null,
    cut: 'words[0..2] of course_audio.word_timings ("The <Lang> for"); voice of the donor NOT verified here (no Popty route returns voice_id)' }
  // part 2: which second halves already exist as their own clip? (library lookup per distinct text; zero spend)
  const first = withIntro.map(l => ({ lego_id: l.lego_id, known_text: l.known_text, ctx: seedText[l.seed_number], currentText: l.intro.text, currentAudioId: l.intro.audioId }))
  const standalone = {}
  const texts = [...new Set(first.flatMap(l => { const c = parseIntro(l.currentText); const cx = l.ctx || (c && c.ctx); return [secondHalfText(l.known_text, null), cx ? secondHalfText(l.known_text, cx) : null].filter(Boolean) }))]
  await pool(texts, Number(opt('--concurrency', 4)), async t => { const j = await render('known', t, 'intro-reuse plan (#299): does this second half already exist as its own clip?'); if (j.source === 'library') standalone[norm(t)] = j.audioId })
  const plans = first.map((l, i) => ({ ...planTwoPart(store, l, standalone), currentAsIn: /as in/.test(withIntro[i].intro.text) }))
  const report = summariseTwoPart(plans, { lang, prefix })
  report.course = course; report.legos = legos.length; report.readErrors = errors.length
  report.standaloneFound = Object.keys(standalone).length; report.standaloneChecked = texts.length
  report.currentAsIn = plans.filter(p => p.currentAsIn).length
  report.currentAsInMatched = plans.filter(p => p.currentAsIn && p.match).length
  report.priorRun = { note: 'first design (full-intro splice), same course', intros: 1397, matched: 1105, currentAsIn: 934, currentAsInMatched: 786 }
  const out = evidencePath(`tools/audio/intro-reuse/${course}-plan.json`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify({ report, plans, errors }, null, 1))
  const { ttsNeeded, ...head } = report
  console.log(JSON.stringify(head, null, 1)); console.log('tts-needed', ttsNeeded.length, '| written', out)
})().catch(e => { console.error(e); process.exit(1) })
