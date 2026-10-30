#!/usr/bin/env node
/**
 * Walks the English-known "no Tom-006 / Charlotte clip" queue (ssi-learning-app tools/audio/english-default-audit.mjs,
 * Tom r-2026-10-30-sonia-azure-en-gb-is-never) through Popty's ONE render route, up to a daily character cap.
 * It never renders itself: each pair is POST /api/audio/render (role 'known'; resolveVoice answers Tom-006 for English known),
 * so library-first, the spend guard and the audio stop all apply. A refusal is the answer: it is recorded and the pair is not
 * retried; a DAILY_TOTAL_CAP refusal ends the day. Nothing is ever deleted (the old Sonia clip stays: make-before-break).
 *
 *   node tools/audio/english-default-rerender.cjs --queue q.csv [--cap 100000] [--dry-run] [--only ita_for_eng,spa_for_eng]
 * Queue: CSV `english_text_key,courses` (courses ';'-separated), in priority order. Resume: rerun the same command daily;
 * pairs with a ledger row are skipped. Ledger: ~/ssi-evidence/ssi-dashboard-v7/english-default-rerender/ledger.jsonl.
 */
const fs = require('fs'), path = require('path'), os = require('os')
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
const PURPOSE = 'Sonia-never: missing Tom-006 English known clip (job 951, r-2026-10-30)'
const DEFAULT_LEDGER = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/english-default-rerender/ledger.jsonl')

function parseQueue(csv) {
  const pairs = []
  for (const line of csv.split('\n').slice(1)) {
    const i = line.lastIndexOf(','); if (i < 1) continue
    const text = line.slice(0, i).replace(/^"|"$/g, '')
    for (const c of line.slice(i + 1).split(';')) if (c.trim()) pairs.push({ course: c.trim(), text })
  }
  return pairs
}
const pairKey = p => `${p.course}\u001f${p.text}`

/** Premium first (Italian, Spanish, Chinese, German), then the rest in queue order. Stable. */
const PREMIUM = ['ita_for_eng', 'spa_for_eng', 'zho_for_eng', 'deu_for_eng']
function order(pairs) {
  const rank = c => { const i = PREMIUM.indexOf(c); return i < 0 ? PREMIUM.length : i }
  return pairs.map((p, n) => [p, n]).sort((a, b) => rank(a[0].course) - rank(b[0].course) || a[1] - b[1]).map(x => x[0])
}

async function run({ pairs, done, cap, dryRun, post, record }) {
  let spent = 0, rendered = 0, linked = 0, refused = 0, ended = null
  for (const p of order(pairs)) {
    if (done.has(pairKey(p))) continue
    if (spent + p.text.length > cap) { ended = 'cap'; break }
    const { status, body } = await post({ courseCode: p.course, role: 'known', text: p.text, purpose: PURPOSE, dryRun })
    const code = body && (body.code || body.error)
    if (status === 200 && body.ok) {
      spent += dryRun ? (body.wouldSpendChars || 0) : (body.charsSpent || 0)
      if (body.source === 'library') linked++; else rendered++
      if (!dryRun) record({ ...p, result: body.source, chars: body.charsSpent, audioId: body.audioId })
    } else {
      refused++
      if (!dryRun) record({ ...p, result: 'refused', status, code })
      if (status === 402 || /DAILY_TOTAL_CAP|AUDIO_STOP/.test(String(code))) { ended = String(code || status); break }
    }
  }
  return { spent, rendered, linked, refused, ended }
}

async function main() {
  const a = process.argv.slice(2), opt = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d }
  const queue = opt('--queue'); if (!queue) throw new Error('--queue required')
  const only = opt('--only') ? new Set(opt('--only').split(',')) : null
  const ledger = opt('--ledger', DEFAULT_LEDGER); fs.mkdirSync(path.dirname(ledger), { recursive: true })
  const rows = fs.existsSync(ledger) ? fs.readFileSync(ledger, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : []
  const done = new Set(rows.map(pairKey))
  const day = new Date().toISOString().slice(0, 10)
  const spentToday = rows.filter(r => (r.at || '').startsWith(day)).reduce((s, r) => s + (r.chars || 0), 0)
  const pairs = parseQueue(fs.readFileSync(queue, 'utf8')).filter(p => !only || only.has(p.course))
  const cap = Number(opt('--cap', 100000)) - spentToday
  const post = async body => { const r = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'sonia-default-951' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) } }
  const record = r => fs.appendFileSync(ledger, JSON.stringify({ ...r, at: new Date().toISOString() }) + '\n')
  const res = await run({ pairs, done, cap, dryRun: a.includes('--dry-run'), post, record })
  const remaining = pairs.filter(p => !done.has(pairKey(p))).length
  console.log(JSON.stringify({ ...res, spentTodayBefore: spentToday, pairsInQueue: pairs.length, pairsWithoutLedgerRowBefore: remaining }))
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1) })
module.exports = { parseQueue, order, run, pairKey }
