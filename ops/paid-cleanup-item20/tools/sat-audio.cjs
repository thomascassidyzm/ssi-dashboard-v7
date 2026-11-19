#!/usr/bin/env node
// @db-live-write: Kai-approved item 20 audio (19 Nov ~17:05Z), Popty routes only: POST /api/audio/render + link-clip fill-only
// cs #79·AJ: audio for the rows an item-20 changeset ACTUALLY changed on live, run by sat-run.sh straight after that
// course's text applies (Kai: text and audio on the same day, Sat 21 Nov). Popty routes only:
//   POST :3470/api/audio/render (tools/audio/render.cjs: library first, spend guard, ONE render, no retries), then
//   POST :3470/api/production/<course>/link-clip FILL-ONLY (never `replace`: a slot someone else filled is never overwritten).
// Slots come from item 9's ledger-state.cjs slotsFor(): only ops the ledger marks "applied" (never already/drift/refused):
// an insert needs known + target1 + target2; a rewrite the side(s) whose words changed.
// APPROVAL. Every ask carries Kai's approval token (x-cs-conv = CS_CONV_TOKEN, this job's own Kai-seat conversation). It
// only matters for EXISTS_IN_LANGUAGE: the words exist in English in another voice (e.g. Azure Sonia, *_for_eng known),
// link-clip's voice check will not put that clip in a Charlotte/Tom-006 slot, so the slot would stay SILENT. Library-first
// still links any clip already in the cast voice for free. (Measured 19 Nov: 37 of 97 live English answers were this.)
// CAPS, checked before EVERY ask that may spend Cartesia (own tally + other logs; Popty's guard is the backstop):
//   UTC day:   a2c runner logs dated today + item-9 reserve (52k while its timer is armed) + item-20 Cartesia today + next ≤ 600,000
//   four days: all a2c logs + item-9 reserve + item-20 Cartesia total + next ≤ 2,000,000
//   item 20:   item-20 Cartesia total + next ≤ ITEM20_CAP (default 230,000: the cast-voice price 215,941 + 6%)
// STOP (exit 3, the runner stops ALL audio) at the first: HTTP 402, a limit code, a limit-shaped error, a 5xx other than 503,
// APPROVAL_UNVERIFIED: surface down → wait 2 min and send that ask once more (as a2c's run-day.cjs); surface UP → the grant
// is not honoured, so the rest of this run asks WITHOUT it (cast-voice library links and brand-new words still get audio; only
// EXISTS_IN_LANGUAGE lines are refused and logged) — stopping would leave every remaining slot silent.
// Any other refusal (VOICE_POLICY, REPEAT, …) is logged and that slot is left; never retried. No transcription of any kind.
// Writes ~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item20/cartesia-spend.json {done,total,byDay} after every paid
// render, which a2c's run-day.cjs reads as item 20's reserve (fixes.json spend_file).
// usage: node sat-audio.cjs <file.changeset.jsonl> [--dry]      log: <file>.audio.jsonl (resumable: an answered slot is skipped)
//        node sat-audio.cjs --mark-done                            spend file done:true (end of the whole run)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const ITEM = path.resolve(__dirname, '..');
const EVID = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/ops');
const SPEND = path.join(EVID, 'paid-cleanup-item20/cartesia-spend.json');
const A2C = path.join(EVID, 'voice-casting/azure-to-cartesia');
const DAY_CAP = 600_000, TOTAL_CAP = 2_000_000, ITEM9_RESERVE = 52_000;
const CAP = Number(process.env.ITEM20_CAP || 230_000);
const AGENT = process.env.AGENT_ID || 'kai-79-item20';
const APPROVAL = 'kai:2026-11-19:paid-cleanup item 20 thin Indic baskets, Kai approved apply incl. audio 19 Nov ~17:05Z (cs #79)';
const PURPOSE = 'cs #79 paid cleanup item 20 (thin Indic baskets): new/rewritten build row, Kai approved 19 Nov ~17:05Z';
// Known side provider per course (GET /api/courses/<c>/voice-config/resolved, 19 Nov after the #998·AI cast): urd Azure
// (Uzma/Asad), the rest Cartesia. English target1/target2 (Charlotte / Tom-006) are Cartesia everywhere.
const KNOWN_AZURE = new Set(['eng_for_urd']);
const STOP_CODES = new Set(['DAILY_TOTAL_CAP', 'DAILY_CAP', 'POOL_SHARE', 'POOL_OVERAGE', 'PROVIDER_POOL', 'USAGE_UNREADABLE', 'LEDGER',
  'TRIPPED', 'STOPPED_BY_TOM', 'NOT_IN_CHAIN', 'RATE_CAPPED', 'IDENTITY_REQUIRED']);
const LIMIT_TEXT = /quota|credit|insufficient|payment|\b402\b|limit (reached|exceeded)|exceed/i;
const readLog = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
const utcDay = (t) => new Date(t).toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function spendFile() { try { return JSON.parse(fs.readFileSync(SPEND, 'utf8')); } catch { return { done: false, total: 0, byDay: {} }; } }
function writeSpend(s) { fs.mkdirSync(path.dirname(SPEND), { recursive: true }); fs.writeFileSync(SPEND + '.tmp', JSON.stringify({ ...s, at: new Date().toISOString() })); fs.renameSync(SPEND + '.tmp', SPEND); }
if (process.argv[2] === '--mark-done') { writeSpend({ ...spendFile(), done: true }); console.log('item 20 spend file marked done'); process.exit(0); }

const [file, ...rest] = process.argv.slice(2);
const DRY = rest.includes('--dry');
const { header, slots } = require(path.join(ITEM, '../paid-cleanup-item9/tools/ledger-state.cjs')).slotsFor(file);
const course = header.course;
const log = `${file}.audio${DRY ? '.dry' : ''}.jsonl`;
const done = new Set(readLog(log).map((r) => r.key));
const cartesiaSlot = (role) => role !== 'known' || !KNOWN_AZURE.has(course);

function a2c() {
  const rows = fs.existsSync(A2C) ? fs.readdirSync(A2C).filter((f) => /^day\d-results\.jsonl$/.test(f)).flatMap((f) => readLog(path.join(A2C, f))).filter((r) => r.kind === 'render') : [];
  const today = utcDay(Date.now()), sum = (rs) => rs.reduce((s, r) => s + (Number(r.charsSpent) || 0), 0);
  return { today: sum(rows.filter((r) => utcDay(r.at) === today)), total: sum(rows) };
}
function item9Armed() { try { return execFileSync('systemctl', ['--user', 'is-active', 'cs-long-keep-item9-night.timer'], { encoding: 'utf8' }).trim() === 'active'; } catch { return false; } }
function capStop(want) {
  const s = spendFile(), a = a2c(), r9 = item9Armed() ? ITEM9_RESERVE : 0, today = utcDay(Date.now());
  const mineToday = Number((s.byDay || {})[today]) || 0, mine = Number(s.total) || 0;
  if (a.today + r9 + mineToday + want > DAY_CAP) return `day cap: a2c today ${a.today} + item-9 reserve ${r9} + item 20 today ${mineToday} + next ${want} > ${DAY_CAP}`;
  if (a.total + r9 + mine + want > TOTAL_CAP) return `four-day cap: a2c ${a.total} + item-9 reserve ${r9} + item 20 ${mine} + next ${want} > ${TOTAL_CAP}`;
  if (mine + want > CAP) return `item-20 cap: ${mine} + next ${want} > ${CAP}`;
  return null;
}
function stopReason(http, j) {
  if (http === 402) return `HTTP 402: ${j.error || j.code}`;
  if (j && STOP_CODES.has(j.code)) return `${j.code}: ${String(j.error || '').slice(0, 200)}`;
  if (j && j.ok === false && LIMIT_TEXT.test(String(j.error || ''))) return `limit-shaped error (${j.code || http}): ${String(j.error).slice(0, 200)}`;
  if (http >= 500 && http !== 503) return `HTTP ${http}: ${j.error || j.code || ''}`;
  return null;
}
async function surfaceDown(error) {
  if (/could not be reached|ECONNREFUSED|ECONNRESET|socket hang up/i.test(String(error || ''))) return true;
  try { const r = await fetch('http://localhost:4317/api/version', { signal: AbortSignal.timeout(5000) }); return !r.ok; } catch { return true; }
}
async function post(url, body, headers, ms) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT, ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(ms) });
    return { http: r.status, json: await r.json().catch(() => ({ ok: false, error: `HTTP ${r.status} (no JSON)` })) };
  } catch (e) { return { http: 0, json: { ok: false, error: e.name === 'TimeoutError' ? 'TIMEOUT' : e.message } }; }
}

(async () => {
  if (!DRY && !process.env.CS_CONV_TOKEN) { console.error('CS_CONV_TOKEN not set: Kai approval cannot be verified; refusing'); process.exit(1); }
  const tally = {}; const bump = (k) => { tally[k] = (tally[k] || 0) + 1; };
  let stop = null, timeouts = 0, noApproval = false;
  for (const s of slots) {
    if (done.has(s.key)) { bump('already_answered'); continue; }
    const want = Math.ceil([...s.text].length * 1.25) + 5;
    if (!DRY && cartesiaSlot(s.role)) { const c = capStop(want); if (c) { stop = c; break; } }
    const grant = !DRY && !noApproval;
    const body = { courseCode: course, role: s.role, text: s.text, purpose: PURPOSE, job: '#79', dryRun: DRY, ...(s.legoId ? { legoId: s.legoId } : {}), ...(grant ? { approval: APPROVAL } : {}) };
    const hdr = grant ? { 'x-cs-conv': process.env.CS_CONV_TOKEN } : {};
    let r = await post('http://localhost:3470/api/audio/render', body, hdr, 120_000);
    if (grant && r.json && r.json.code === 'APPROVAL_UNVERIFIED') {
      if (await surfaceDown(r.json.error)) { await sleep(120_000); r = await post('http://localhost:3470/api/audio/render', body, hdr, 120_000); }
      if (r.json && r.json.code === 'APPROVAL_UNVERIFIED') {
        noApproval = true; bump('approval_dropped');
        console.log(`APPROVAL_UNVERIFIED with the surface up at ${s.key}: the rest of this run asks without Kai's grant`);
        const { approval, ...plain } = body; r = await post('http://localhost:3470/api/audio/render', plain, {}, 120_000);
      }
    }
    const j = r.json || {};
    const rec = { at: new Date().toISOString(), key: s.key, id: s.id, role: s.role, text: s.text, dry: DRY, http: r.http, ok: !!j.ok, source: j.source, code: j.code,
      audioId: j.audioId, voiceId: j.voiceId || null, charsSpent: Number(j.charsSpent) || 0, wouldSpend: j.wouldSpendChars, cartesia: cartesiaSlot(s.role),
      error: j.ok ? undefined : String(j.error || '').slice(0, 300) };
    if (!DRY && j.ok && j.source === 'rendered' && !(rec.charsSpent > 0)) rec.charsSpent = [...s.text].length; // never under-count a paid render
    const timedOut = r.http === 0 || r.http === 503 || r.http === 504;
    if (timedOut) { timeouts++; bump('timeout'); console.log(s.key, 'timeout/no answer: not logged, sent on the next run'); if (timeouts >= 5) { stop = '5 timeouts in a row'; break; } continue; }
    timeouts = 0;
    if (!DRY && j.ok && j.audioId) {
      const l = await post(`http://localhost:3470/api/production/${course}/link-clip`, { links: [{ ...(s.phraseId ? { phraseId: s.phraseId } : { legoId: s.legoId }), role: s.role, audioId: j.audioId }] }, {}, 60_000);
      const one = (l.json.results && l.json.results[0]) || l.json;
      rec.link = { status: l.http, ok: !!(l.json.ok && one.ok !== false), changed: one.changed, code: one.code || l.json.code, error: (one.error || l.json.error) && String(one.error || l.json.error).slice(0, 300) };
    }
    if (!DRY && rec.charsSpent && rec.cartesia) {
      const sp = spendFile(), d = utcDay(rec.at);
      writeSpend({ done: false, total: (Number(sp.total) || 0) + rec.charsSpent, byDay: { ...(sp.byDay || {}), [d]: (Number((sp.byDay || {})[d]) || 0) + rec.charsSpent }, azure: Number(sp.azure) || 0 });
    } else if (!DRY && rec.charsSpent) { const sp = spendFile(); writeSpend({ ...sp, azure: (Number(sp.azure) || 0) + rec.charsSpent }); }
    bump(DRY ? (j.ok ? `dry_${j.source}` : `refused_${j.code}`) : (j.ok ? (rec.link && rec.link.ok ? `linked_${j.source}` : `link_failed_${rec.link && rec.link.code}`) : `refused_${j.code || r.http}`));
    fs.appendFileSync(log, JSON.stringify(rec) + '\n');
    const why = DRY ? null : stopReason(r.http, j);
    if (why) { stop = `${s.key}: ${why}`; break; }
    if (!DRY && rec.link && (rec.link.status === 401 || rec.link.status === 403)) { stop = `link-clip refused identity (HTTP ${rec.link.status})`; break; }
  }
  const sp = spendFile();
  console.log(`sat-audio ${header.id}${DRY ? ' DRY' : ''}: ${slots.length} slot(s) ${JSON.stringify(tally)}; item-20 Cartesia total ${sp.total || 0}/${CAP}, Azure ${sp.azure || 0}${stop ? `; STOPPED: ${stop}` : ''}`);
  process.exit(stop ? 3 : 0);
})();
