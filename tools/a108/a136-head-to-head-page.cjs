// A-136 — build the blind listening page for the Femke/Lieke head-to-head.
//
// One page, eight rows, two players a row, both playing IN PLACE — Tom's
// standing rule is no link with no return, because he listens from a phone and
// a navigate-away link loses him the page. The surface's markdown renderer
// rebuilds <audio controls src="https://….mp3"> into a real player, so that tag
// is what we emit; inline playback is verified on the served page before this
// is reported, never assumed.
//
// BLIND BY POSITION. Each row labels its two clips A and B; which voice sits in
// A flips on the fixed pattern recorded in the render tool, so a name never
// appears next to a player. The key is at the very bottom, under a heading Tom
// has to scroll past to reach. Clip FILENAMES are neutral too (L3-A.mp3) —
// a filename with a voice name in it would leak the answer to anyone who long-
// presses a player.
//
// Numbers are reported per row but deliberately NOT aggregated into a verdict.
// The winner is Tom's ear; this page hands him the measurements and shuts up.
const fs = require('fs'), path = require('path')
const { AB_PATTERN, LINES } = require('./a136-femke-lieke-head-to-head.cjs')

const SLUG = 'a136-femke-lieke-2026-08-17'
const EVIDENCE = `/home/tomcassidy/command-surface/public/evidence/${SLUG}`
const BASE = `https://watson-1.tail4968cb.ts.net/evidence/${SLUG}`
const SRC = process.argv[2] || '/tmp/a136-femke-lieke'
const DOC = process.argv[3] || path.resolve(__dirname, `../../docs/a108/${SLUG}.md`)

const rows = JSON.parse(fs.readFileSync(path.join(SRC, 'results.json'), 'utf8'))
fs.mkdirSync(EVIDENCE, { recursive: true })

const player = u => `<audio controls src="${u}"></audio>`
const s = ms => (ms / 1000).toFixed(2) + 's'
const byKey = Object.fromEntries(rows.map(r => [r.key, r]))

// ── Copy clips out under NEUTRAL names ───────────────────────────────────────
const missing = []
const plan = LINES.map((line, i) => {
  const femkeFirst = AB_PATTERN[i]
  const A = byKey[`${line.id}-${femkeFirst ? 'femke' : 'lieke'}`]
  const B = byKey[`${line.id}-${femkeFirst ? 'lieke' : 'femke'}`]
  for (const [slot, r] of [['A', A], ['B', B]]) {
    if (!r || r.error) { missing.push(`${line.id}-${slot}: ${r ? r.error : 'no row'}`); continue }
    const from = path.join(SRC, r.key, `${r.key}.mp3`)
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(EVIDENCE, `${line.id}-${slot}.mp3`))
    else missing.push(`missing clip file ${from}`)
  }
  return { line, A, B, femkeFirst }
})

const out = []
out.push(`# Femke or Lieke — eight lines, blind, both through the new chain`)
out.push('')
out.push(`Two xAI Dutch female voices read the **same eight lines**. Every clip is a **fresh TTS call** rendered through the full new audio chain — \`phase8.masterAudio()\` on \`feat/a133-tail-pad-in-chain-2026-08-17\`, trailing-artefact rule live. Nothing here is a re-processed archive take, so the chain is a constant and the **voice is the only variable**.`)
out.push('')
out.push(`**Listen blind.** Each row gives you A and B. Which voice is A **changes from row to row**, and the filenames give nothing away. The key is at the bottom of the page — scroll past the last row when you want it, not before.`)
out.push('')
out.push(`The lines are course-shaped, not tongue-twisters: two short prompts, two longer sentences, a question with a tag, a polite question, and two with the hard endings the screening tool now favours — the quiet unstressed schwa with no consonant to mark the end, and Dutch final devoicing where a /d/ surfaces as a weak /t/. Those are the endings that separate voices; an easy line makes anyone sound fine.`)
out.push('')
out.push(`**No pool was changed, nothing was merged, no \`course_audio\` row, pod or S3 object was touched.**`)
out.push('')
out.push(`---`)
out.push('')

// ── The eight rows ───────────────────────────────────────────────────────────
for (const { line, A, B } of plan) {
  out.push(`## ${line.id} — ${line.shape}`)
  out.push('')
  out.push(`> ${line.text}`)
  out.push('')
  out.push(`*Ending under test: ${line.tail}*`)
  out.push('')
  for (const [slot, r] of [['A', A], ['B', B]]) {
    out.push(`**${slot}**`)
    out.push('')
    if (!r || r.error) { out.push(`*render failed: ${r ? r.error : 'no row'}*`); out.push(''); continue }
    out.push(player(`${BASE}/${line.id}-${slot}.mp3`))
    out.push('')
    out.push(`${s(r.measured.durationMs)} · ${r.measured.lufs} LUFS · ${r.measured.impulses.length} post-speech impulse${r.measured.impulses.length === 1 ? '' : 's'} · tail ${r.measured.postEosMs}ms past last phonation · chain ${r.guard.refused ? `refused (${r.guard.refused})` : `trimmed ${r.guard.removedMs || 0}ms`}`)
    out.push('')
  }
  out.push('---')
  out.push('')
}

// ── Objective differences ────────────────────────────────────────────────────
out.push(`# What the instruments measured`)
out.push('')
out.push(`Stated so you can set it aside if your ear disagrees — none of this picks a voice.`)
out.push('')
const ok = rows.filter(r => !r.error)
const per = k => ok.filter(r => r.voiceKey === k)
const avg = (a, f) => a.length ? a.reduce((s, r) => s + f(r), 0) / a.length : NaN
out.push(`| | Femke | Lieke |`)
out.push(`|---|---|---|`)
for (const [label, f, fmt] of [
  ['clips rendered', () => 1, a => String(a.length)],
  ['mean length', r => r.measured.durationMs, a => s(avg(a, r => r.measured.durationMs))],
  ['mean loudness', r => r.measured.lufs, a => avg(a, r => r.measured.lufs).toFixed(1) + ' LUFS'],
  ['loudness spread', r => r.measured.lufs, a => (Math.max(...a.map(r => r.measured.lufs)) - Math.min(...a.map(r => r.measured.lufs))).toFixed(1) + ' LUFS'],
  ['post-speech impulses (clicks) total', r => r.measured.impulses.length, a => String(a.reduce((s, r) => s + r.measured.impulses.length, 0))],
  ['mean tail past last phonation', r => r.measured.postEosMs, a => Math.round(avg(a, r => r.measured.postEosMs)) + 'ms'],
  ['chain refusals', () => 0, a => String(a.filter(r => r.guard.refused).length)],
  ['mean trimmed by the chain', r => r.guard.removedMs || 0, a => Math.round(avg(a, r => r.guard.removedMs || 0)) + 'ms'],
]) {
  out.push(`| ${label} | ${fmt(per('femke'))} | ${fmt(per('lieke'))} |`)
}
out.push('')

const clicky = ok.filter(r => r.measured.impulses.length)
if (clicky.length) {
  out.push(`**Where the surviving impulses are.** The chain keeps 250ms past the detected end of speech, so anything closer in than that it cannot remove by construction — and a word-final plosive burst can be shorter than the detector's 40ms sustained-speech rule and read as an impulse. Distance past end of speech is what tells a release burst from a click; the A-133 tail click lives 380–500ms out.`)
  out.push('')
  out.push(`| clip | last word | lands | over room floor |`)
  out.push(`|---|---|---|---|`)
  for (const r of clicky) {
    const i0 = plan.findIndex(p => p.line.id === r.lineId)
    const slot = (plan[i0].femkeFirst === (r.voiceKey === 'femke')) ? 'A' : 'B'
    const last = r.text.replace(/[.?!]$/, '').split(/\s+/).pop()
    for (const i of r.measured.impulses) {
      out.push(`| ${r.lineId} ${slot} | *${last}* | ${i.startMs - r.measured.eosMs}ms past end of speech | ${i.overFloorDb}dB |`)
    }
  }
  out.push('')
} else {
  out.push(`**No post-speech impulse survived on any of the ${ok.length} clips** — no clicks to report on either voice through this chain.`)
  out.push('')
}

// ASR is reported as information about wording, never as a score.
const asrNotes = ok.filter(r => r.asr && r.asr.text && normalise(r.asr.text) !== normalise(r.text))
function normalise(t) { return t.toLowerCase().replace(/[.,!?;:'"«»]/g, '').replace(/\s+/g, ' ').trim() }
out.push(`**Wording check.** Local whisper read every clip, to catch the one thing the chain could do wrong — eat a word off the end. ${ok.filter(r => r.asr && r.asr.gap).length ? `Not run on ${ok.filter(r => r.asr && r.asr.gap).length} clip(s): ${[...new Set(ok.filter(r => r.asr && r.asr.gap).map(r => r.asr.gap))].join('; ')}.` : `Every clip transcribed.`} Whisper is **not** a referee of Dutch register — it flips *alstublieft*/*alsjeblieft* between model sizes on the same clip — so a transcript that differs from the script is reported here and never scored.`)
out.push('')
if (asrNotes.length) {
  out.push(`| clip | script | whisper heard |`)
  out.push(`|---|---|---|`)
  for (const r of asrNotes) {
    const i0 = plan.findIndex(p => p.line.id === r.lineId)
    const slot = (plan[i0].femkeFirst === (r.voiceKey === 'femke')) ? 'A' : 'B'
    out.push(`| ${r.lineId} ${slot} | ${r.text} | ${r.asr.text} |`)
  }
  out.push('')
} else {
  out.push(`Every transcript matched its script. Nothing was truncated.`)
  out.push('')
}

if (missing.length) {
  out.push(`**Gaps:** ${missing.join('; ')}`)
  out.push('')
}
const errs = rows.filter(r => r.error)
out.push(errs.length
  ? `**${errs.length} render(s) failed:** ${errs.map(r => `${r.key} — ${r.error}`).join('; ')}`
  : `**No render failed.** All ${ok.length} clips came back from live xAI calls.`)
out.push('')

// ── The key, last ────────────────────────────────────────────────────────────
out.push(`---`)
out.push('')
out.push(`# The key — read after you have listened`)
out.push('')
out.push(`| row | A is | B is |`)
out.push(`|---|---|---|`)
for (const { line, femkeFirst } of plan) {
  out.push(`| ${line.id} | ${femkeFirst ? 'Femke' : 'Lieke'} | ${femkeFirst ? 'Lieke' : 'Femke'} |`)
}
out.push('')
out.push(`Femke is xAI \`58d27475085e\` — 159 clips already in \`nld_for_eng\`. Lieke is xAI \`cdb1cec8\` — currently index 0 of the female side of \`app_config.pod_voice_pools.nld\`, which is the slot that decides who speaks as the Dutch female voice.`)
out.push('')

fs.writeFileSync(DOC, out.join('\n'))
console.log(`wrote ${DOC}`)
console.log(`clips in ${EVIDENCE}: ${fs.readdirSync(EVIDENCE).length}`)
if (missing.length) console.error(`GAPS: ${missing.join('; ')}`)
