#!/usr/bin/env node
/**
 * eng-sample-pack-page — a phone-listenable sample pack of the two-voice English cast,
 * built ONLY from clips that already exist. It generates no audio, ever: it selects from a
 * TSV dump of the pod-0 English pool, HEADs every candidate through the real player URL,
 * and writes one self-contained HTML page.
 *
 * URL PATH. Reused verbatim from tools/audio-qc-listening-page.cjs:
 *
 *     https://<host>/api/audio/<audioId>.v<revision>
 *
 * i.e. the per-clip versioned URL the app itself requests, not a bucket link. A bucket link
 * proves bytes exist and proves nothing about what a learner is served. The page styling and
 * the "sampling is stated, never silent" footer convention come from the same tool.
 *
 * CHARACTERISATION IS THE POINT, NOT THE SAMPLE. The header prints the whole pool's length
 * histogram and sentence-type mix per voice, so a spread that the pool cannot supply is
 * visible rather than quietly absent.
 *
 *   node tools/eng-sample-pack-page.cjs --pool <pool.tsv> --out docs/audio/<page>.html
 *
 * Pool TSV columns: id, voice, text, s3_key, duration_ms, course_code, audio_revision. Produce it
 * with (psql -At -F $'\t'):
 *
 *   WITH pod AS (SELECT p.id,p.course_code,c.known_lang,c.target_lang FROM listening_pods p
 *                JOIN courses c ON c.course_code=p.course_code WHERE p.slug LIKE 'pod-0%'),
 *   slot AS (SELECT pod.*, s.known_audio_id AS aid FROM pod
 *              JOIN listening_pod_sentences s ON s.pod_id=pod.id WHERE pod.known_lang='eng'
 *            UNION ALL
 *            SELECT pod.*, s.target_audio_id FROM pod
 *              JOIN listening_pod_sentences s ON s.pod_id=pod.id WHERE pod.target_lang='eng')
 *   SELECT DISTINCT a.id, regexp_replace(a.voice_id,'^(xai_|azure_)','') AS voice,
 *          replace(a.text, E'\t', ' '), a.s3_key, a.duration_ms, a.course_code,
 *          coalesce(a.audio_revision,1)
 *   FROM slot JOIN course_audio a ON a.id=slot.aid
 *   WHERE regexp_replace(a.voice_id,'^(xai_|azure_)','') IN ('bedd6226','gfzdpspr5fdp');
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const args = process.argv.slice(2)
const flag = (n, d = null) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1] }
const die = (m) => { console.error(m); process.exit(1) }

const HOST = flag('host', 'https://staging.saysomethingin.app')
const POOL = flag('pool') || die('need --pool <pool.tsv>')
const OUT = flag('out') || die('need --out <file.html>')

const S3_BUCKET = 'ssi-audio-stage'
const S3_REGION = 'eu-west-1'
const MD_OUT = flag('md')
const CLONE = 'gfzdpspr5fdp'
const OLIVIA = 'bedd6226'
const VOICE_LABEL = { [CLONE]: "Tom's clone", [OLIVIA]: 'Olivia' }

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const url = (r) => `${HOST}/api/audio/${r.id}.v${r.rev}`
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const words = (t) => t.split(/\s+/).filter(Boolean).length

// Length bands. Chosen to match the brief's ask (short 1-4, medium, long 12+) with a
// 9-11 band in between so "long" is not silently doing two jobs.
const BANDS = [
  { key: 's', label: '1–4 words', test: n => n <= 4 },
  { key: 'm', label: '5–8 words', test: n => n >= 5 && n <= 8 },
  { key: 'l', label: '9–11 words', test: n => n >= 9 && n <= 11 },
  { key: 'xl', label: '12+ words', test: n => n >= 12 }
]
const bandOf = (n) => BANDS.find(b => b.test(n)).key
const typeOf = (t) => /\?/.test(t) ? 'question' : /!/.test(t) ? 'exclamation' : 'statement'

function loadPool () {
  return fs.readFileSync(POOL, 'utf8').trim().split('\n').map(line => {
    const [id, voice, text, s3Key, durationMs, courseCode, rev] = line.split('\t')
    return { id, voice, text, s3Key, durationMs: Number(durationMs), courseCode, rev: Number(rev) || 1 }
  })
}

/** One representative row per (voice, normalized text) — the pool repeats the same line across courses. */
function dedupe (rows) {
  const byVoice = { [CLONE]: new Map(), [OLIVIA]: new Map() }
  for (const r of rows) {
    const m = byVoice[r.voice]
    if (!m) continue
    const k = norm(r.text)
    // Prefer the longest-duration take of a text: the shortest is usually a clipped variant.
    if (!m.has(k) || m.get(k).durationMs < r.durationMs) m.set(k, { ...r, key: k })
  }
  return byVoice
}

function characterise (byVoice) {
  const out = {}
  for (const [voice, m] of Object.entries(byVoice)) {
    const bands = Object.fromEntries(BANDS.map(b => [b.key, 0]))
    const types = { statement: 0, question: 0, exclamation: 0 }
    for (const r of m.values()) { bands[bandOf(words(r.text))]++; types[typeOf(r.text)]++ }
    out[voice] = { texts: m.size, bands, types }
  }
  return out
}

/**
 * Selection. A/B pairs first and by construction — a pair is worth more than two solos,
 * because the question is "which voice", not "does this clip work". Within pairs, walk the
 * (band × type) grid so no cell of the spread is missing by accident; then top up with solo
 * lines from whichever voice has coverage the pairs cannot give.
 */
function select (byVoice, { pairsWanted = 15, solosPerVoice = 3 } = {}) {
  const pairKeys = [...byVoice[OLIVIA].keys()].filter(k => byVoice[CLONE].has(k))
  const cells = []
  for (const b of BANDS) for (const t of ['statement', 'question', 'exclamation']) cells.push(b.key + ':' + t)

  const byCell = new Map(cells.map(c => [c, []]))
  for (const k of pairKeys) {
    const r = byVoice[OLIVIA].get(k)
    byCell.get(bandOf(words(r.text)) + ':' + typeOf(r.text)).push(k)
  }
  // Deterministic order, but drill lines ("30. 40. 50. Friday. Saturday.") sink to the bottom of
  // every cell: they are real pool content and count in the characterisation, yet a list of
  // numbers tells you almost nothing about how a voice handles English prosody.
  const drillish = (t) => {
    const toks = t.split(/\s+/).filter(Boolean)
    const NUMWORD = /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)$/
    return toks.filter(w => /\d/.test(w) || NUMWORD.test(w.toLowerCase().replace(/[^a-z]/g, ''))).length / Math.max(1, toks.length) >= 0.4
  }
  for (const list of byCell.values()) {
    list.sort((a, b) => (drillish(a) - drillish(b)) || a.localeCompare(b))
  }

  const chosenPairs = []
  const used = new Set()
  // Round-robin the grid so every populated cell contributes before any cell contributes twice.
  let progress = true
  while (chosenPairs.length < pairsWanted && progress) {
    progress = false
    for (const c of cells) {
      if (chosenPairs.length >= pairsWanted) break
      const list = byCell.get(c)
      const k = list.find(x => !used.has(x))
      if (!k) continue
      used.add(k); progress = true
      chosenPairs.push({ cell: c, key: k, olivia: byVoice[OLIVIA].get(k), clone: byVoice[CLONE].get(k) })
    }
  }

  const solos = []
  for (const voice of [CLONE, OLIVIA]) {
    const only = [...byVoice[voice].entries()]
      .filter(([k]) => !byVoice[voice === CLONE ? OLIVIA : CLONE].has(k))
      .map(([, r]) => r)
      .sort((a, b) => words(b.text) - words(a.text))
    // Longest, a mid-length question, and a short one — the three shapes a pair grid may thin out.
    const picks = [only[0], only.find(r => typeOf(r.text) === 'question' && words(r.text) >= 5 && words(r.text) <= 11), only.filter(r => words(r.text) <= 4).pop()]
    for (const p of picks.slice(0, solosPerVoice)) if (p && !solos.includes(p)) solos.push(p)
  }
  return { chosenPairs, solos, pairKeyCount: pairKeys.length }
}

const s3url = (r) => `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${r.s3Key}`

function probe (u) {
  try {
    const out = execFileSync('curl', ['-s', '-o', '/dev/null', '-L', '--max-time', '25',
      '-w', '%{http_code} %{content_type} %{size_download}', u], { encoding: 'utf8' })
    const [code, ctype, size] = out.trim().split(' ')
    return { ok: code === '200' && /audio/.test(ctype || '') && Number(size) > 1000, detail: out.trim() }
  } catch (e) { return { ok: false, detail: 'curl failed: ' + e.message } }
}

/**
 * A clip must be alive on BOTH URLs to be included, because two artefacts ship from one run:
 * the HTML page links the app's versioned player path, and the published markdown links the
 * S3 object directly — the doc surface only turns a URL ending `.mp3` into a real player, and
 * the versioned path has no extension. Verifying only the one you happen to render would let
 * the other artefact ship a dead link.
 */
function alive (r) {
  const a = probe(url(r))
  const b = probe(s3url(r))
  return { ok: a.ok && b.ok, detail: `player ${a.detail} | s3 ${b.detail}` }
}

function main () {
  const rows = loadPool()
  const byVoice = dedupe(rows)
  const stats = characterise(byVoice)
  const { chosenPairs, solos, pairKeyCount } = select(byVoice)

  const dead = []
  const livePairs = []
  for (const p of chosenPairs) {
    const a = alive(p.olivia); const b = alive(p.clone)
    if (!a.ok) dead.push({ ...p.olivia, detail: a.detail })
    if (!b.ok) dead.push({ ...p.clone, detail: b.detail })
    if (a.ok && b.ok) livePairs.push(p)
    else if (a.ok || b.ok) solos.push(a.ok ? p.olivia : p.clone) // half a pair is still a clip worth hearing
  }
  const liveSolos = []
  for (const s of solos) {
    const v = alive(s)
    if (v.ok) liveSolos.push(s); else dead.push({ ...s, detail: v.detail })
  }
  const clipCount = livePairs.length * 2 + liveSolos.length

  const player = (r) => `<div class="side"><div class="lbl">${esc(VOICE_LABEL[r.voice])}</div>
      <audio controls preload="none" src="${url(r)}"></audio>
      <div class="sub2">${(r.durationMs / 1000).toFixed(1)}s · ${esc(r.courseCode)}</div></div>`

  const pairCard = (p, i) => `
  <div class="clip">
    <div class="n">A/B ${i + 1} / ${livePairs.length} · ${esc(BANDS.find(b => b.key === p.cell.split(':')[0]).label)} · ${esc(p.cell.split(':')[1])}</div>
    <div class="text">${esc(p.olivia.text)}</div>
    <div class="ab">${player(p.clone)}${player(p.olivia)}</div>
  </div>`

  const soloCard = (r, i) => `
  <div class="clip">
    <div class="n">solo ${i + 1} / ${liveSolos.length} · ${words(r.text)} words · ${esc(typeOf(r.text))}</div>
    <div class="text">${esc(r.text)}</div>
    <div class="ab">${player(r)}</div>
  </div>`

  const statTable = (voice) => {
    const s = stats[voice]
    return `<tr><td><b>${esc(VOICE_LABEL[voice])}</b></td><td>${s.texts}</td>${
      BANDS.map(b => `<td>${s.bands[b.key]}</td>`).join('')}<td>${s.types.statement}</td><td>${s.types.question}</td><td>${s.types.exclamation}</td></tr>`
  }

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>English two-voice sample pack — existing clips only</title>
<style>
 :root{color-scheme:light dark}
 body{font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;padding:16px 14px 64px;max-width:760px;margin-inline:auto}
 h1{font-size:22px;margin:0 0 4px} h2{font-size:17px;margin:30px 0 10px}
 .sub{opacity:.72;margin:0 0 20px;font-size:14px}
 .nums{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin:0 0 20px}
 .num{border:1px solid #8883;border-radius:10px;padding:10px 12px}
 .num b{display:block;font-size:24px;line-height:1.1} .num span{font-size:12px;opacity:.7}
 .note{border-left:3px solid #f5a623;padding:8px 12px;margin:0 0 20px;font-size:14px;background:#f5a62312}
 .good{border-left-color:#1e8449;background:#1e844912}
 table{border-collapse:collapse;width:100%;font-size:13px;margin:0 0 18px}
 th,td{border:1px solid #8883;padding:5px 7px;text-align:right} th:first-child,td:first-child{text-align:left}
 .clip{border:1px solid #8883;border-radius:12px;padding:14px;margin:0 0 14px}
 .n{font-size:11px;opacity:.55;letter-spacing:.06em}
 .text{font-size:17px;font-weight:600;margin:5px 0 10px}
 .ab{display:grid;gap:12px}
 .lbl{font-size:11px;letter-spacing:.06em;opacity:.75;margin-bottom:3px}
 .sub2{font-size:11px;opacity:.5;margin-top:2px}
 audio{width:100%}
 footer{margin-top:34px;font-size:13px;opacity:.75;border-top:1px solid #8883;padding-top:14px}
</style></head><body>
<h1>English two-voice sample pack</h1>
<p class="sub">Tom's clone (<code>gfzdpspr5fdp</code>) against Olivia (<code>bedd6226</code>), on English lines
that <b>already exist</b> in the database. Nothing here was rendered for this page — no TTS was run.
Every clip plays through the app's own versioned URL (<code>/api/audio/&lt;id&gt;.v&lt;rev&gt;</code>), not a
bucket link, so what you hear is what a learner is served.</p>

<div class="nums">
  <div class="num"><b>${clipCount}</b><span>clips on this page</span></div>
  <div class="num"><b>${livePairs.length}</b><span>true A/B pairs</span></div>
  <div class="num"><b>${pairKeyCount}</b><span>A/B pairs available in the pool</span></div>
  <div class="num"><b>${dead.length}</b><span>candidates dropped as dead</span></div>
</div>

<div class="note good"><b>The pool does give you enough to judge.</b> Of ${stats[OLIVIA].texts + stats[CLONE].texts}
distinct texts across the two voices, <b>${pairKeyCount}</b> exist in <i>both</i> voices — so the clone-vs-Olivia
comparison is on identical sentences, not on vibes. Both voices carry all four length bands and plenty of
questions. Two honest limits: this is <b>pod-0 conversational English only</b> (greetings, class-talk, numbers
and colours drills — no narration, no course prompts), and <b>exclamations are thin</b>
(${stats[CLONE].types.exclamation} clone / ${stats[OLIVIA].types.exclamation} Olivia distinct texts), so the
exclamation cells below may repeat a band. Nothing was rendered to fill either gap.</div>

<h2>The whole pool, characterised</h2>
<table>
<tr><th>voice</th><th>distinct texts</th>${BANDS.map(b => `<th>${b.label}</th>`).join('')}<th>stmt</th><th>?</th><th>!</th></tr>
${statTable(CLONE)}
${statTable(OLIVIA)}
</table>
<p class="sub">Counts are distinct <i>texts</i> after de-duplication; the raw pool is ${rows.length.toLocaleString()} clip
rows, because the same English line is re-used across many <code>*_for_eng</code> courses.</p>

<h2>A/B — same sentence, both voices</h2>
<p class="sub">Clone first, Olivia second, every time.</p>
${livePairs.map(pairCard).join('\n')}

<h2>Solo — lines that exist in one voice only</h2>
${liveSolos.map(soloCard).join('\n')}

<footer>Selection is stated, not silent: A/B pairs were chosen by walking a
${BANDS.length}&times;3 grid of length band &times; sentence type, one pair per cell per pass, so no populated
cell of the spread is missing by accident; solos are the longest line, a mid-length question and a short line
unique to each voice. Every clip was verified alive by an HTTP request on both URL forms — the app player path
used above, and the S3 object used by the published markdown twin — before being included${
dead.length ? `; ${dead.length} candidate${dead.length === 1 ? ' was' : 's were'} dropped for failing that check` : ''}.
No audio was generated at any point.<br><br>
Generated ${esc(new Date().toISOString().slice(0, 16).replace('T', ' '))} UTC by
<code>tools/eng-sample-pack-page.cjs</code>.</footer>
</body></html>`

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, html)

  // Markdown twin, for the doc surface. It renders a bare URL ending `.mp3` as a real inline
  // player and strips <audio> tags, so this artefact links the S3 object rather than the app's
  // extensionless versioned path. Both were verified for every clip above.
  if (MD_OUT) {
    const mdPlayer = (r) => `**${VOICE_LABEL[r.voice]}** — ${(r.durationMs / 1000).toFixed(1)}s · ${r.courseCode}\n\n${s3url(r)}\n`
    const md = [
      '# English two-voice sample pack — existing clips only',
      '',
      `**Tom's clone (\`${CLONE}\`) against Olivia (\`${OLIVIA}\`), on English lines that already exist in the database. Nothing here was rendered for this page — no TTS was run.**`,
      '',
      `${clipCount} clips · **${livePairs.length} true A/B pairs** on the page · ${pairKeyCount} A/B pairs available in the pool · ${dead.length} candidates dropped as dead.`,
      '',
      '## Does the pool let you judge the voices? Yes — with two stated limits',
      '',
      `Of ${stats[OLIVIA].texts + stats[CLONE].texts} distinct texts across the two voices, **${pairKeyCount} exist in both voices**, so the comparison is on identical sentences rather than on vibes. Both voices carry all four length bands and plenty of questions.`,
      '',
      `The limits: this is **pod-0 conversational English only** — greetings, class-talk, restaurant and ticket lines, plus numbers-and-colours drills. No narration, no course prompts, no read-aloud register. And **exclamations are thin**: ${stats[CLONE].types.exclamation} distinct texts for the clone, ${stats[OLIVIA].types.exclamation} for Olivia. Nothing was rendered to fill either gap.`,
      '',
      '## The whole pool, characterised',
      '',
      `| voice | distinct texts | ${BANDS.map(b => b.label).join(' | ')} | stmt | ? | ! |`,
      `|---|---|${BANDS.map(() => '---|').join('')}---|---|---|`,
      ...[CLONE, OLIVIA].map(v => {
        const s = stats[v]
        return `| ${VOICE_LABEL[v]} | ${s.texts} | ${BANDS.map(b => s.bands[b.key]).join(' | ')} | ${s.types.statement} | ${s.types.question} | ${s.types.exclamation} |`
      }),
      '',
      `Counts are distinct texts after de-duplication; the raw pool is ${rows.length.toLocaleString()} clip rows, because the same English line is re-used across many \`*_for_eng\` courses.`,
      '',
      '## A/B — same sentence, both voices',
      '',
      'Clone first, Olivia second, every time.',
      '',
      ...livePairs.flatMap((p, i) => [
        `### ${i + 1}. ${p.olivia.text}`,
        '',
        `*${BANDS.find(b => b.key === p.cell.split(':')[0]).label} · ${p.cell.split(':')[1]}*`,
        '',
        mdPlayer(p.clone),
        mdPlayer(p.olivia),
        '---',
        ''
      ]),
      '## Solo — lines that exist in one voice only',
      '',
      ...liveSolos.flatMap((r, i) => [
        `### ${i + 1}. ${r.text}`,
        '',
        `*${words(r.text)} words · ${typeOf(r.text)}*`,
        '',
        mdPlayer(r),
        '---',
        ''
      ]),
      '## How these were chosen, and what was checked',
      '',
      `A/B pairs were chosen by walking a ${BANDS.length}×3 grid of length band × sentence type, one pair per cell per pass, so no populated cell of the spread is missing by accident; number-drill lines sink to the bottom of each cell. Solos are the longest line, a mid-length question and a short line unique to each voice.`,
      '',
      'Every clip was verified alive by an HTTP request on **both** URL forms before inclusion: the app\'s own versioned player path (`/api/audio/<id>.v<rev>`) and the S3 object. The players above use the S3 URL because this doc surface only renders a bare URL ending `.mp3` as a player — the versioned path has no extension. The committed HTML twin uses the app path.',
      '',
      'No audio was generated at any point.',
      ''
    ].join('\n')
    fs.writeFileSync(MD_OUT, md)
  }

  console.log(JSON.stringify({
    poolRows: rows.length,
    distinctTexts: { clone: stats[CLONE].texts, olivia: stats[OLIVIA].texts },
    stats,
    pairsAvailable: pairKeyCount,
    pairsOnPage: livePairs.length,
    solosOnPage: liveSolos.length,
    clipCount,
    dead: dead.map(d => ({ id: d.id, voice: d.voice, text: d.text, detail: d.detail })),
    out: OUT
  }, null, 2))
}
main()
