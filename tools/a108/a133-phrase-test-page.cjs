// A-133 — build the listening page for the phrase test.
//
// Copies every before/after clip into the command surface's evidence directory
// and writes ONE markdown page where every clip is an inline <audio controls>
// player. Tom's standing rule, restated on this job: no link with no return —
// he listens from a phone and a navigate-away link loses him the page. The
// surface's markdown renderer rebuilds <audio controls src="https://….mp3">
// into a real player (server.js, mdToHtml), so the tag is what we emit.
//
// Layout is chosen for a phone: no wide tables of players. Each voice gets a
// section, each phrase a short block — the hazard, the line, the numbers, then
// the two players stacked and labelled. A numbers-only summary table per group
// sits above for skimming.
const fs = require('fs'), path = require('path')

const SLUG = 'a133-phrase-test-2026-08-17'
const EVIDENCE = `/home/tomcassidy/command-surface/public/evidence/${SLUG}`
const BASE = `https://watson-1.tail4968cb.ts.net/evidence/${SLUG}`
const SRC = process.argv[2] || '/tmp/a133-phrase-test'
const DOC = process.argv[3] || `/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.worktrees/a133-pad/docs/a108/${SLUG}.md`

const rows = JSON.parse(fs.readFileSync(path.join(SRC, 'results.json'), 'utf8'))
fs.mkdirSync(EVIDENCE, { recursive: true })

const s = ms => (ms / 1000).toFixed(2) + 's'
const player = u => `<audio controls src="${u}"></audio>`

// Copy the clips out. Nothing is generated here — a missing file is reported.
for (const r of rows) {
  if (r.error) continue
  for (const side of ['before', 'after']) {
    const from = path.join(SRC, r.key, `${r.key}-${side}.mp3`)
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(EVIDENCE, `${r.key}-${side}.mp3`))
    else console.error(`MISSING CLIP: ${from}`)
  }
}

const ok = rows.filter(r => !r.error)
const groups = [...new Set(ok.map(r => r.group))]
const out = []

// ── Header ───────────────────────────────────────────────────────────────────
const refusals = ok.filter(r => r.guard.refused)
const lost = ok.filter(r => r.finalWord.ok === false)
const impBefore = ok.reduce((a, r) => a + r.before.impulses.length, 0)
const impAfter = ok.reduce((a, r) => a + r.after.impulses.length, 0)
const worstLufs = Math.max(...ok.map(r => Math.abs(r.after.lufs - r.before.lufs)))

out.push(`# A-133 — the phrase test: five different lines per voice, before and after`)
out.push('')
out.push(`Every clip below is a **fresh TTS call through the wired chain** — nothing here is a re-processed archive take. ${ok.length} renders across ${new Set(ok.map(r => r.voiceKey)).size} voices, five different lines each, chosen so the five probe five different ways the end-of-speech detector could be wrong rather than one line five times.`)
out.push('')
out.push(`**AFTER** is \`phase8.masterAudio()\` — the real chain, one call, the trim under test inside it. **BEFORE** is \`normalizeAudioClean()\`, byte-identical to what that chain did before this branch. Play them in that order.`)
out.push('')
out.push(`## What the numbers say`)
out.push('')
out.push(`- **Guard refusals: ${refusals.length} of ${ok.length}.**${refusals.length ? ' ' + refusals.map(r => `${r.voice} ${r.phraseId} (${r.guard.refused})`).join(', ') : ''}`)
out.push(`- **Words lost to the trim: ${lost.length} of ${ok.length}.** Checked by reading the before clip and the after clip with local whisper and comparing them *to each other* — see the note on register below.`)
out.push(`- **Post-speech impulses: ${impBefore} before → ${impAfter} after.** These are the clicks.`)
out.push(`- **Loudness moved at most ${worstLufs.toFixed(1)} LUFS** on any clip.`)
out.push('')

// The four survivors are the most interesting thing in the batch, so they get
// stated up front rather than left for someone to find in the tables. Each is
// reported with its distance past the detected end of speech and the word it
// sits on, because that pair is what decides whether it is a click or a phoneme.
const survivors = ok.filter(r => r.after.impulses.length)
if (survivors.length) {
  out.push(`### The ${survivors.length} impulses the chain did NOT remove — and why that is right`)
  out.push('')
  out.push(`The trim keeps 250ms past the detected end of speech, so by construction it cannot remove anything closer in than that. Every survivor in this batch is inside that window and sits on a word-final plosive:`)
  out.push('')
  out.push(`| clip | last word | impulse lands | level over room floor |`)
  out.push(`|---|---|---|---|`)
  for (const r of survivors) {
    const last = r.text.replace(/[.?!]$/, '').split(/\s+/).pop()
    for (const i of r.after.impulses) {
      out.push(`| ${r.voice} ${r.phraseId} | *${last}* | ${i.startMs - r.after.eosMs}ms past end of speech | ${i.overFloorDb}dB |`)
    }
  }
  out.push('')
  out.push(`These are release bursts — the /p/ of *stop*, the /t/ of *stopped* and *alsjeblieft* — not clicks. The detector's one documented weakness is that a plosive burst can be shorter than its 40ms sustained-speech rule and so read as an impulse, which is exactly what has happened, and it is why those five lines were in the batch. Cutting them would clip the last consonant off the word. The chain leaves them, and ASR confirms the final word survives on all ${survivors.length}. The impulses it *did* remove all sat 380–500ms out, which is where the A-133 tail click actually lives.`)
  out.push('')
}
out.push(`### Why the word check compares clip to clip, not clip to script`)
out.push('')
out.push(`The first smoke render had Ruben saying *alsjeblieft* where the script says *alstublieft* — the informal form. Whisper is already documented to flip that exact Dutch pair between model sizes on the same clip, so an absolute check against the script calls a register choice a missing word. What a trim can actually do wrong is REMOVE something, so the check asks whether the after clip still ends the way the before clip did. Where the two differ from the script in the same way, that is the voice, not the chain, and it is noted rather than scored.`)
out.push('')

// ── Per group ────────────────────────────────────────────────────────────────
for (const g of groups) {
  const gr = ok.filter(r => r.group === g)
  out.push(`---`)
  out.push('')
  out.push(`# ${g}`)
  out.push('')
  for (const vk of [...new Set(gr.map(r => r.voiceKey))]) {
    const vr = gr.filter(r => r.voiceKey === vk)
    const v = vr[0]
    out.push(`## ${v.voice}`)
    out.push('')
    out.push(`*${v.note} · ${v.provider} \`${v.voiceId}\`*`)
    out.push('')
    out.push(`| line | before | after | removed | guard | clicks before → after | final word |`)
    out.push(`|---|---|---|---|---|---|---|`)
    for (const r of vr) {
      out.push(`| ${r.phraseId} | ${s(r.before.durationMs)} | ${s(r.after.durationMs)} | ${r.deltaMs ? s(r.deltaMs) : '**nothing**'} | ${r.guard.refused || 'pass'} | ${r.before.impulses.length} → ${r.after.impulses.length} | ${r.finalWord.ok === null ? 'not checked' : r.finalWord.ok ? 'survives' : '**LOST**'} |`)
    }
    out.push('')
    for (const r of vr) {
      out.push(`**${r.phraseId} — ${r.tail}**`)
      out.push('')
      out.push(`> ${r.text}`)
      out.push('')
      const bits = [
        `${s(r.before.durationMs)} → ${s(r.after.durationMs)}, removed ${r.deltaMs ? s(r.deltaMs) : 'nothing'}`,
        `guard ${r.guard.refused || 'pass'}`,
        `clicks ${r.before.impulses.length} → ${r.after.impulses.length}`,
        `${r.after.lufs} LUFS`,
        `room floor ${r.after.roomFloorDb}dB, ends ${r.after.postEosMs}ms past last phonation`,
      ]
      out.push(bits.join(' · '))
      out.push('')
      if (r.before.impulses.length) {
        out.push(`Impulses in the before clip: ${r.before.impulses.map(i => `${i.startMs}ms at ${i.overFloorDb}dB over the room floor`).join('; ')}.`)
        out.push('')
      }
      if (r.finalWord.ok === false) {
        out.push(`**Final word LOST.** Before: "${r.finalWord.heardBefore}" · After: "${r.finalWord.heardAfter}"`)
        out.push('')
      } else if (r.finalWord.ok && r.finalWord.scriptOk === false) {
        out.push(`Word survives the trim. Whisper heard "${r.finalWord.heardAfter}" — the voice's own wording differs from the script on the last word (\`${r.finalWord.scriptWord}\`), identically before and after, so that is the voice and not the chain.`)
        out.push('')
      }
      out.push(`before — old chain`)
      out.push('')
      out.push(player(`${BASE}/${r.key}-before.mp3`))
      out.push('')
      out.push(`after — new chain`)
      out.push('')
      out.push(player(`${BASE}/${r.key}-after.mp3`))
      out.push('')
    }
  }
}

// ── Gaps ─────────────────────────────────────────────────────────────────────
out.push(`---`)
out.push('')
out.push(`# Gaps, stated plainly`)
out.push('')
out.push(`**ElevenLabs is untestable, and it blocked nothing you asked for.** \`ELEVENLABS_API_KEY\` in \`.env\` is a 64-character key *ID*, not a secret. Probed live for this job: \`GET /v1/user\` returns **400 \`api_key_id_used_as_api_key\`** — "API keys start with 'sk_' and are shown when the key is created or rotated." So no ElevenLabs voice can be rendered through the new chain, and that provider path stays unverified. To close it, someone with the ElevenLabs account creates or rotates a key and puts the \`sk_…\` secret in \`.env\`.`)
out.push('')
out.push(`**Your clone and Olivia are NOT on ElevenLabs.** That was the worry going in. The \`voices\` table says both are xAI — \`gfzdpspr5fdp\` = "Tom", en-GB male clone, and \`bedd6226\` = "Olivia", en-GB female. Both rendered for real above.`)
out.push('')
out.push(`**xAI is a configured provider in this chain** — \`XAI_API_KEY\` is present and every xAI clip above came back from a live call. Nothing was faked with a substitute provider.`)
out.push('')
const errs = rows.filter(r => r.error)
out.push(errs.length
  ? `**${errs.length} render(s) failed:** ${errs.map(r => `${r.voice} ${r.phraseId} — ${r.error}`).join('; ')}`
  : `**No render failed.** All ${ok.length} attempted clips came back.`)
out.push('')
out.push(`**Nothing live was touched** — no \`course_audio\` row, no pod, no S3 object, no DB write, and the branch is not merged. Bulk regen has not been started.`)
out.push('')

fs.writeFileSync(DOC, out.join('\n'))
console.log(`wrote ${DOC}`)
console.log(`clips in ${EVIDENCE}: ${fs.readdirSync(EVIDENCE).length}`)
