#!/usr/bin/env node
'use strict'
// Nightly course scan (cs #237·AL): the runner's ONE door to the surface. Builds every JSON body itself (never a hand-spliced
// curl -d, #323) and reads the conversation token from a 0600 FILE, never argv (job #801).
//   node ops/nightly-course-scan/dispatch.cjs worker <night-label> <course> [<course> ...]   the night hand-check worker
//   node ops/nightly-course-scan/dispatch.cjs notice "<text>"                               a short relay of a skip/failure
// Both are dispatched with parent = Kai's room, so the report lands there. Token: $SCAN_TOK_FILE or ~/.cs-long/nightly-course-scan/.tok
// If the dispatch itself is refused, falls back to waking the arming job (cs-wake-send.cjs) so a failure is never silent.
const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const { spawnSync } = require('child_process')

const KAI_ROOM = '9ee96cbd-470d-4215-97d1-7f60b527a03f'
const ARMING_JOB = '78276ec4-3d92-4870-b145-de7d178ce00e' // cs #237·AL, which armed this; its token is the one in the file
const POPTY = '/home/tomcassidy/SSi/ssi-dashboard-v7-clean'
const D = path.join(os.homedir(), '.cs-long/nightly-course-scan')
const tok = fs.readFileSync(process.env.SCAN_TOK_FILE || path.join(D, '.tok'), 'utf8').trim()

function post(body) {
  return new Promise((resolve) => {
    const b = JSON.stringify(body)
    const r = http.request({ host: 'localhost', port: 4317, path: '/api/dispatch', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cs-conv': tok, 'Content-Length': Buffer.byteLength(b) } },
    (res) => { let t = ''; res.on('data', (c) => { t += c }); res.on('end', () => resolve({ code: res.statusCode, text: t.slice(0, 600) })) })
    r.on('error', (e) => resolve({ code: 0, text: String(e.message) })); r.setTimeout(30000, () => r.destroy()); r.end(b)
  })
}

function fallbackWake(text) {
  spawnSync(process.execPath, [path.join(os.homedir(), 'command-surface/tools/cs-wake-send.cjs'), ARMING_JOB, tok, text], { stdio: 'inherit' })
}

async function main() {
  const [mode, ...a] = process.argv.slice(2)
  let body
  if (mode === 'worker') {
    const [night, ...courses] = a
    const st = JSON.parse(fs.readFileSync(path.join(os.homedir(), 'ssi-restore/copy-state.json'), 'utf8'))
    const dir = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/ops/nightly-course-scan', st.db)
    const Q = JSON.parse(fs.readFileSync(path.join(__dirname, 'queue.json'), 'utf8'))
    const fold = courses.map((c) => Q.queue.find((q) => q.course === c)).filter((q) => q && (q.fold_in || q.note)).map((q) => `- ${q.course}: ${[q.fold_in, q.note].filter(Boolean).join(' ')}`)
    const first = !fs.existsSync(path.join(D, 'scanned.txt')) || !fs.readFileSync(path.join(D, 'scanned.txt'), 'utf8').trim()
    const night1 = first ? ['', 'NIGHT 1 ONLY — the 16 Nov items, whatever their queue position. For each: first look for Kai\'s answer (his memory ~/.cs-colleague-memory/kai, DIARY.md, and anything newer than 24 Nov 17:00Z); if he answered, carry it forward and do not re-check; if not, check it as DATA ONLY and leave the ruling to him:',
      ...Object.entries(Q.not_fold_in).map(([k, v]) => `- ${k}: ${v}`),
      ...Q.queue.filter((q) => q.fold_in && !courses.includes(q.course)).map((q) => `- ${q.course}: ${q.fold_in}`)] : []
    const brief = fs.readFileSync(path.join(__dirname, 'worker-brief.md'), 'utf8')
      .replaceAll('{{NIGHT}}', night).replaceAll('{{COURSES}}', courses.join(', ')).replaceAll('{{DIR}}', dir)
      .replaceAll('{{COPY}}', `${st.db} (built ${st.built})`)
      .replaceAll('{{FOLD}}', [...fold, ...night1].join('\n') || '(none tonight)')
    body = { cwd: POPTY, label: `nightly course scan ${night}: ${courses.join(' ')}`, prompt: brief, parent: KAI_ROOM,
      when: 'night', kind: 'judgement', needs: ['db-copy'] }
  } else if (mode === 'notice') {
    body = { cwd: POPTY, label: 'nightly course scan: notice for Kai', parent: KAI_ROOM, kind: 'check',
      prompt: `Relay this notice from the nightly read-only course scan (cs #237·AL) to Kai in ONE short plain-English paragraph, then stop. Do not fix, re-run or investigate anything beyond reading the log it names, and do not dispatch anything. Notice: ${a.join(' ')}` }
  } else { console.error('usage: dispatch.cjs worker <night> <course>... | notice "<text>"'); process.exit(2) }
  const r = await post(body)
  console.log(`dispatch ${mode}: ${r.code} ${r.text}`)
  if (r.code < 200 || r.code >= 300) { fallbackWake(`[nightly course scan] dispatch of ${mode} REFUSED (${r.code}): ${r.text.slice(0, 200)} — ${mode === 'notice' ? a.join(' ') : 'courses ' + a.slice(1).join(' ')}`); process.exit(1) }
}
main()
