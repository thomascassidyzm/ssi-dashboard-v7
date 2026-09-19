#!/usr/bin/env node
/**
 * draft-pod-known-side.cjs — produce the learner's-own-language side of the canonical
 * 231-sentence listening pod as a JSON file, for build-canonical-231-pod.cjs to apply.
 *
 * TWO MODES, because the canonical-231 build has exactly two kinds of gap.
 *
 *   --mode=translate  The estate has never rendered this language. Every line is
 *                     translated from the canonical English. This is the expensive one
 *                     and it is needed for six languages only (ben, guj, pan, sin, tam,
 *                     urd); every other side of every other course in the build already
 *                     exists in a sibling course and is COPIED, never drafted.
 *
 *   --mode=relabel    The line already exists, correctly, in a sibling course — it just
 *                     names the WRONG LANGUAGE, because the sibling was a course for
 *                     learning that language. spa_for_eng's Spanish says "Estoy
 *                     aprendiendo español"; eng_for_spa needs "Estoy aprendiendo inglés".
 *                     Five lines per course, one word each, and the reason it is a model
 *                     call rather than a find-and-replace is inflection: the language
 *                     name declines, and a wrong case in a line a learner hears is the
 *                     defect this whole build exists to avoid.
 *
 * NEVER the Anthropic SDK — every LLM call goes through the Claude CLI (`claude --print`),
 * the pattern in services/gender-prep-coordinator.cjs and tools/pods/verify-pod-text.cjs.
 * A past SDK module silently billed ~$38/day.
 *
 * WRITES NOTHING TO THE DATABASE. Output is a JSON file; applying it is a separate,
 * separately-reviewable step, exactly as write-pod-drafts.cjs is separate from
 * align-pod-to-canonical.cjs. The drafts it produces are machine text and must be read
 * by an INDEPENDENT verifier before anything is rendered from them.
 *
 *   node tools/pods/draft-pod-known-side.cjs --mode=relabel --lang=Spanish \
 *     --target-lang=English --existing=spa_for_eng:pod-1:target --script=latin \
 *     --lines=33,94,95,221,226 --out=$CS_SCRATCH/eng_for_spa-names.json
 *
 *   node tools/pods/draft-pod-known-side.cjs --mode=translate --lang=Bengali \
 *     --target-lang=English --script=bengali --out=$CS_SCRATCH/eng_for_ben-known.json
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const { Client } = require('pg')
const { claudeEnv, claudeConfigExport } = require('../../services/shared/claude-config.cjs')
const { SCRIPTS, inScript } = require('./expected-script.cjs')

const REPO = path.join(__dirname, '..', '..')
const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}

const MODE = (arg('mode') || '').toLowerCase()
const LANG = arg('lang')                       // the language being WRITTEN (the known side)
const TARGET_LANG = arg('target-lang')         // the language the learner is learning, named in English
const REFERENCE = arg('reference') || 'deu_for_eng:pod-1'
const EXISTING = arg('existing')               // <podId>:<known|target> — relabel mode's source
const SCRIPT = (arg('script') || 'latin').toLowerCase()
const LINES = (arg('lines') || '').split(',').map(Number).filter(Boolean)
const OUT = arg('out')
const BATCH_SIZE = Number(arg('batch') || 20)
const MODEL = arg('model') || 'opus'

if (!['translate', 'relabel'].includes(MODE) || !LANG || !TARGET_LANG || !OUT) {
  console.error('FAILED: --mode=translate|relabel, --lang, --target-lang and --out are all required')
  process.exit(1)
}
if (MODE === 'relabel' && (!EXISTING || !LINES.length)) {
  console.error('FAILED: --mode=relabel needs --existing=<podId>:<side> and --lines=<global_orders>')
  process.exit(1)
}
if (!SCRIPTS[SCRIPT]) {
  console.error(`FAILED: --script=${SCRIPT} unknown; one of ${Object.keys(SCRIPTS).join(', ')}`)
  process.exit(1)
}

/**
 * The canonical English names the language being learnt in five sentences, and the
 * reference pod is a GERMAN course, so its English says "German". Every other course's
 * canonical English differs from the reference in these five lines and nowhere else
 * (measured across all 24 canonical courses, 2026-09-19).
 */
const englishForCourse = (t) => t.replace(/\bGerman\b/g, TARGET_LANG)

const REGISTER = `Register: informal by default — the second-person form a friend would use — unless the scene itself insists otherwise, in which case mark the formality naturally inside the sentence. NEVER use parentheses, brackets, glosses, notes or alternatives: this estate bans them outright in text a learner hears.`

function translateBrief (lines) {
  return `You are translating a listening-pod dialogue into ${LANG}. A learner whose own language is ${LANG} hears these lines as the meaning of an ${TARGET_LANG} conversation they are learning to follow.

Translate each English line into natural, idiomatic ${LANG} that a real speaker would actually say in that situation. Keep the meaning complete — nothing added, nothing dropped. Keep proper names as they are. Write in the ${LANG} script only.

${REGISTER}

Return STRICT JSON and nothing else — no prose, no markdown fence:
{"lines":[{"n":<the n given>,"text":"<the ${LANG} line>"}]}

Lines:
${lines.map(l => JSON.stringify({ n: l.n, speaker: l.speaker, english: l.english })).join('\n')}
`
}

function relabelBrief (lines) {
  return `Below are ${LANG} sentences from a listening-pod dialogue. Each one currently names a language — and it names the WRONG one, because it was written for a different course.

For each line, return the SAME ${LANG} sentence with the language it names changed to ${TARGET_LANG}, correctly inflected for its grammatical position in that sentence. Change NOTHING ELSE: not the wording, not the register, not the punctuation, not the word order — unless the grammar of ${LANG} genuinely forces a change to accommodate the new language name.

The English line each one renders is given so you can see which word is the language name.

${REGISTER}

Return STRICT JSON and nothing else — no prose, no markdown fence:
{"lines":[{"n":<the n given>,"text":"<the corrected ${LANG} line>"}]}

Lines:
${lines.map(l => JSON.stringify({ n: l.n, english: l.english, current_text: l.current })).join('\n')}
`
}

function runClaude (brief, tag) {
  return new Promise((resolve, reject) => {
    const dir = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.homedir(), '.draft-pod-known-'))
    const briefFile = path.join(dir, `${tag}-brief.txt`)
    const outFile = path.join(dir, `${tag}-out.json`)
    fs.writeFileSync(briefFile, brief, 'utf8')
    const cmd = `export PATH="$HOME/.local/bin:$PATH" && ${claudeConfigExport()} && cat '${briefFile}' | claude --print --model ${MODEL} > '${outFile}' 2>&1`
    const proc = spawn('bash', ['-c', cmd], { stdio: 'pipe', env: claudeEnv({ ...process.env }), cwd: REPO })
    let stderr = ''
    proc.stderr.on('data', d => { stderr += d.toString() })
    proc.on('close', (code) => {
      let raw = ''
      try { raw = fs.readFileSync(outFile, 'utf8') } catch { /* nothing written */ }
      try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* best effort */ }
      if (code !== 0 && !raw) return reject(new Error(`claude exited ${code}: ${stderr.slice(0, 300)}`))
      resolve(raw)
    })
  })
}

function parseLines (raw) {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error(`no JSON object in output: ${raw.slice(0, 200)}`)
  const obj = JSON.parse(raw.slice(start, end + 1))
  if (!Array.isArray(obj.lines)) throw new Error('output has no lines array')
  return obj.lines
}

const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))
const norm = (t) => String(t == null ? '' : t).normalize('NFC').replace(/\s+/g, ' ').trim()

;(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  const { rows: ref } = await db.query(
    `SELECT global_order, speaker, known_text FROM listening_pod_sentences WHERE pod_id = $1 ORDER BY global_order`, [REFERENCE])
  if (ref.length !== 231) throw new Error(`reference ${REFERENCE} has ${ref.length} rows, expected 231`)

  let existing = new Map()
  if (EXISTING) {
    const bits = EXISTING.split(':'); const side = bits.pop(); const podId = bits.join(':')
    const { rows } = await db.query(`SELECT global_order, known_text, target_text FROM listening_pod_sentences WHERE pod_id = $1`, [podId])
    if (!rows.length) throw new Error(`no rows in ${podId}`)
    for (const r of rows) existing.set(r.global_order, side === 'known' ? r.known_text : r.target_text)
  }
  await db.end()

  const wanted = LINES.length ? ref.filter(r => LINES.includes(r.global_order)) : ref
  const items = wanted.map(r => ({
    n: r.global_order,
    speaker: r.speaker,
    english: englishForCourse(r.known_text),
    current: existing.get(r.global_order),
  }))
  if (MODE === 'relabel') {
    const missing = items.filter(i => !norm(i.current)).map(i => i.n)
    if (missing.length) throw new Error(`no existing ${LANG} text for line(s) ${missing.join(', ')} in ${EXISTING}`)
  }

  const out = {}
  const problems = []
  const batches = chunk(items, BATCH_SIZE)
  console.error(`[draft-pod-known-side] ${MODE} ${LANG} ← ${TARGET_LANG}: ${items.length} line(s) in ${batches.length} batch(es)`)

  for (const [i, batch] of batches.entries()) {
    const brief = MODE === 'translate' ? translateBrief(batch) : relabelBrief(batch)
    let got
    try { got = parseLines(await runClaude(brief, `b${i + 1}`)) }
    catch (e) { problems.push(`batch ${i + 1}: ${e.message}`); continue }
    const byN = new Map(batch.map(b => [b.n, b]))
    const seen = new Set()
    for (const g of got) {
      const item = byN.get(Number(g.n))
      if (!item || seen.has(item.n)) continue
      seen.add(item.n)
      const text = norm(g.text)
      if (!text) { problems.push(`${item.n}: empty`); continue }
      if (!inScript(SCRIPT, text)) { problems.push(`${item.n}: not ${SCRIPT} script — "${text.slice(0, 60)}"`); continue }
      if (/[()（）\[\]]/.test(text)) { problems.push(`${item.n}: parentheses or brackets, banned in learner-facing text`); continue }
      if (MODE === 'relabel' && text === norm(item.current)) { problems.push(`${item.n}: unchanged — still names the wrong language`); continue }
      out[item.n] = text
    }
    for (const b of batch) if (!seen.has(b.n)) problems.push(`${b.n}: no line returned`)
    console.error(`[draft-pod-known-side] batch ${i + 1}/${batches.length}: ${seen.size}/${batch.length}`)
  }

  const summary = { mode: MODE, lang: LANG, target_lang: TARGET_LANG, script: SCRIPT, wanted: items.length, drafted: Object.keys(out).length, problems: problems.length }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2))
  const meta = OUT.replace(/\.json$/, '') + '-meta.json'
  fs.writeFileSync(meta, JSON.stringify({ summary, problems, reference: REFERENCE, existing: EXISTING || null }, null, 2))
  console.log(JSON.stringify({ summary, problems: problems.slice(0, 20), out: OUT, meta }, null, 2))
  if (problems.length) process.exit(1)
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
