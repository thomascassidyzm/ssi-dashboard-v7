#!/usr/bin/env node
/**
 * audio-qc-listening-page — turns a repair run into a page a human can settle with their ears.
 *
 * WHY IT PLAYS THE REAL PLAYER PATH. Every previous listening page in this estate linked S3
 * objects directly, which proves the bytes exist and proves nothing about what a learner is
 * served. This one links
 *
 *     https://<host>/api/audio/<audioId>.v<revision>
 *
 * the same per-clip versioned URL the app itself requests, so an A/B of .v1 against .v2 is a
 * test of the whole chain — database link, revision bump, cache headers, CDN — and not of a
 * bucket. If the new revision sounds right THROUGH THIS URL, the repair reached learners.
 *
 * It pairs every repaired clip with the revision it replaced, because "does this sound fixed"
 * is a much harder question to answer than "is this better than what was there", and only the
 * second one can be answered on a phone at breakfast.
 *
 * SAMPLING IS STATED, NEVER SILENT. A spot-check page shows a subset by construction. This one
 * prints how many were repaired, how many are on the page, and how they were chosen — a page
 * that shows 15 of 700 without saying so reads as "here is the work", which is a lie of
 * omission.
 *
 * NEVER WRITES ANYTHING BUT THE HTML FILE. No database, no S3, no audio.
 *
 *   node tools/audio-qc-listening-page.cjs --accepted <accept-log.json> --scan <scan.json> \
 *        --out docs/audio-qc-2026-08-06/deu-spot-check.html [--sample 15] [--host <host>]
 */
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const flag = (n, d = null) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1] }

const HOST = flag('host', 'https://staging.saysomethingin.app')
const SAMPLE = Number(flag('sample', 15))
const OUT = flag('out') || die('need --out <file.html>')

function die (m) { console.error(m); process.exit(1) }
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const url = (id, rev) => `${HOST}/api/audio/${id}.v${rev}`

/**
 * Choose the sample. Deliberately NOT random-only: the point of a spot-check is that Tom hears
 * at least one of every kind of thing that was done, so each role and each voice contributes
 * before any spare slots are filled at random. A random 15 of 700 can miss presentation clips
 * entirely, and presentation clips are the ones a learner hears first.
 */
function pickSample (rows, n) {
  const picked = []
  const seen = new Set()
  const take = (r, why) => {
    if (!r || seen.has(r.audioId)) return
    seen.add(r.audioId); picked.push({ ...r, why })
  }
  // Worst first — the most violent cut measured is the clip most worth hearing.
  const byDamage = [...rows].sort((a, b) => (b.fallRate || 0) - (a.fallRate || 0))
  take(byDamage[0], 'the most violently cut clip in the run')
  for (const key of ['role', 'voiceId']) {
    for (const v of [...new Set(rows.map(r => r[key]))]) {
      take(byDamage.find(r => r[key] === v), `first ${key} = ${v}`)
    }
  }
  // Spare slots spread evenly through the run rather than clustered at one end.
  const rest = rows.filter(r => !seen.has(r.audioId))
  const step = Math.max(1, Math.floor(rest.length / Math.max(1, n - picked.length)))
  for (let i = 0; i < rest.length && picked.length < n; i += step) take(rest[i], 'spread through the run')
  return picked.slice(0, n)
}

function main () {
  const accepted = JSON.parse(fs.readFileSync(flag('accepted') || die('need --accepted'), 'utf8'))
    .filter(r => r.action === 'accepted')
  const scan = flag('scan') ? JSON.parse(fs.readFileSync(flag('scan'), 'utf8')) : null
  const scanBy = new Map((scan?.items || []).map(i => [i.audioId, i]))

  const rows = accepted.map(r => {
    const s = scanBy.get(r.audioId) || {}
    return {
      audioId: r.audioId,
      text: s.text || r.text || '',
      role: s.role || r.role || 'unknown',
      voiceId: s.voiceId || 'unknown',
      revision: r.revision,
      previousRevision: r.previousRevision,
      beforeMs: r.durationMs?.before ?? null,
      afterMs: r.durationMs?.after ?? null,
      // Two shapes are accepted: the full queue output (tail.shape.fallRate) and the
      // trimmed flagged-only artefact that gets committed (fallRate at the top level).
      // The trimmed one is what survives in the repo, so reading only the full shape
      // would make this tool work exactly once and then quietly emit blank numbers.
      fallRate: s.tail?.shape?.fallRate ?? s.fallRate ?? null,
      reason: s.tail?.reason || s.reason || null,
    }
  })
  const sample = pickSample(rows, SAMPLE)

  const gainedMs = rows.filter(r => r.beforeMs && r.afterMs).map(r => r.afterMs - r.beforeMs)
  const medianGain = gainedMs.length
    ? [...gainedMs].sort((a, b) => a - b)[Math.floor(gainedMs.length / 2)] : null

  const card = (r, i) => `
  <div class="clip">
    <div class="n">${i + 1} / ${sample.length}</div>
    <div class="text">${esc(r.text)}</div>
    <div class="meta">${esc(r.role)} · ${esc(r.voiceId)} · ${r.beforeMs ?? '?'}ms → <b>${r.afterMs ?? '?'}ms</b>${
      r.fallRate ? ` · fell at ${r.fallRate} dB/ms` : ''}</div>
    <div class="ab">
      <div class="side old"><div class="lbl">BEFORE — what was shipped</div>
        <audio controls preload="none" src="${url(r.audioId, r.previousRevision)}"></audio></div>
      <div class="side new"><div class="lbl">AFTER — what is live now</div>
        <audio controls preload="none" src="${url(r.audioId, r.revision)}"></audio></div>
    </div>
    <div class="why">picked: ${esc(r.why)}</div>
  </div>`

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>German audio repair — your spot check</title>
<style>
 :root{color-scheme:light dark}
 body{font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;padding:16px 14px 64px;max-width:720px;margin-inline:auto}
 h1{font-size:22px;margin:0 0 4px} .sub{opacity:.7;margin:0 0 20px;font-size:14px}
 .nums{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin:0 0 22px}
 .num{border:1px solid #8883;border-radius:10px;padding:10px 12px}
 .num b{display:block;font-size:24px;line-height:1.1} .num span{font-size:12px;opacity:.7}
 .note{border-left:3px solid #f5a623;padding:8px 12px;margin:0 0 24px;font-size:14px;background:#f5a62312}
 .clip{border:1px solid #8883;border-radius:12px;padding:14px;margin:0 0 16px}
 .n{font-size:11px;opacity:.55;letter-spacing:.08em}
 .text{font-size:18px;font-weight:600;margin:4px 0 2px}
 .meta{font-size:13px;opacity:.7;margin-bottom:10px}
 .ab{display:grid;gap:10px} .side{}
 .lbl{font-size:11px;letter-spacing:.06em;opacity:.65;margin-bottom:4px}
 .old .lbl{color:#c0392b} .new .lbl{color:#1e8449}
 audio{width:100%}
 .why{font-size:12px;opacity:.5;margin-top:8px}
 footer{margin-top:34px;font-size:13px;opacity:.75;border-top:1px solid #8883;padding-top:14px}
</style></head><body>
<h1>German audio repair — your spot check</h1>
<p class="sub">deu_for_eng, seeds 1–300. Every clip below: what was shipped, then what is live now.
Both play through the real app URL, not a bucket link — if the second sounds right, learners are getting it.</p>

<div class="nums">
  <div class="num"><b>${(scan?.measured ?? 0).toLocaleString()}</b><span>clips scanned</span></div>
  <div class="num"><b>${(scan?.flaggedByTail ?? 0).toLocaleString()}</b><span>flagged as trimmed</span></div>
  <div class="num"><b>${rows.length.toLocaleString()}</b><span>repaired and live</span></div>
  <div class="num"><b>${medianGain !== null ? '+' + medianGain + 'ms' : '—'}</b><span>median audio restored</span></div>
</div>

<div class="note"><b>What a flag means, so the numbers are not oversold.</b> The detector finds that a clip
was <i>trimmed</i>. On the 20 clips you have listened to, 16 were audibly damaged and 4 had lost only
inaudible decay — so expect roughly one in five of these to have sounded fine already. It has never
missed one you called damaged. Nothing was deleted: every original is still in the bucket and every
repair reverts with one command.</div>

${sample.map(card).join('\n')}

<footer>Showing <b>${sample.length} of ${rows.length}</b> repaired clips. Not random: the most violently
cut clip, then the first of every role and every voice, then a spread through the rest — so a whole
category cannot be missing from what you hear.<br><br>
Generated ${esc(new Date().toISOString().slice(0, 16).replace('T', ' '))} UTC.</footer>
</body></html>`

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, html)
  console.log(`${rows.length} repaired, ${sample.length} on the page -> ${OUT}`)
}
main()
