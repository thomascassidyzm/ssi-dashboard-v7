#!/usr/bin/env node
'use strict';
// Re-voice a course's TARGET slots for seeds 1..N onto the course's cast voices (job #863, re-dispatch of #641/#669:
// Tom 2026-10-12 01:22Z "seeds 1-100 in the NEW target voices for Spanish, French and Mexican Spanish; the app should
// point to each new clip as soon as it is recorded").
// The sanctioned shape since #388 (2026-10-14, courses change only through Popty): the one render route
// (library-first, spend guard, one render, no retries) naming the course's cast voice from its voice-config, a live check that the learner proxy serves
// the new clip, then Popty's link-clip with replace + expectCurrent (which bumps content_version). Nothing here writes the
// DB itself and no clip is ever deleted — make-before-break by construction.
// A slot is OLD when its clip is a TTS clip on any voice other than the cast voice for its role. Human takes are never touched.
// Component rows are skipped (the player never plays them). Presentation and known slots are out of scope.
//   node tools/audio/revoice-seeds-to-cast.cjs --course spa_for_eng [--seeds 100]              # census + cast voices, nothing rendered
//   RENDER=1 MAX_CHARS=40000 node tools/audio/revoice-seeds-to-cast.cjs --course spa_for_eng    # real: renders in course order, links in batches
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });

const URL = process.env.POPTY_URL || 'http://localhost:3470';
const AUDIO_BASE = process.env.LEARNER_AUDIO_BASE || 'https://saysomethingin.app/api/audio';
const AGENT = 'revoice-seeds-to-cast (job #863)';
const ROLES = ['target1', 'target2'];
const LINK_EVERY = 25; // asks per link-clip request: new clips go live within a minute, without a content_version bump per clip
const LINK_MAX = 500;  // link-clip refuses more per request (TOO_MANY)
// Rollback record (Tom 2026-10-17): every link is appended here BEFORE it is posted, with the old pointer (expectCurrent), so any
// course can be put back by linking each row's `old` audioId over `new` (replace + expectCurrent: new). JSONL, one link per line.
const fs = require('fs');
const { evidencePath } = require('../lib/evidence-path.cjs');
const bare = (v) => String(v || '').replace(/^cartesia_/, '');

/** One JSONL line per link, carrying the OLD pointer: the whole rollback is linking `old` back over `new`. */
function rollbackLines(course, links, at) {
  return links.map((l) => JSON.stringify({ at, course, ...(l.seedNumber ? { seedNumber: l.seedNumber } : l.legoId ? { legoId: l.legoId } : { phraseId: l.phraseId }), role: l.role, old: l.expectCurrent, new: l.audioId })).join('\n') + '\n';
}

/** Slots whose clip is TTS on a voice other than the cast voice for the role, grouped into one ask per (role, words), course order. */
function staleAsks(rows, clips, castByRole) {
  const asks = new Map();
  for (const r of rows) {
    for (const role of ROLES) {
      const cur = r[`${role}_audio_id`] ? String(r[`${role}_audio_id`]) : null;
      const c = cur && clips.get(cur);
      if (!c || c.origin !== 'tts' || bare(c.voice_id) === bare(castByRole[role])) continue;
      const k = `${role}\u0000${r.target_text}`;
      if (!asks.has(k)) asks.set(k, { role, text: r.target_text, firstSeed: r.seed_number, chars: r.target_text.length, slots: [] });
      const a = asks.get(k);
      a.firstSeed = Math.min(a.firstSeed, r.seed_number);
      a.slots.push({ ...r.slot, role, current: cur, oldVoice: c.voice_id });
    }
  }
  return [...asks.values()].sort((a, b) => a.firstSeed - b.firstSeed || (a.role < b.role ? -1 : 1));
}

/**
 * The cast voice per target role. RESOLVED first (job #864, por_for_eng): a course whose row still stores its old Azure voices
 * (Raquel/Duarte) but whose language cast resolves to Cartesia (Mariana/Matias) renders in the cast, so the cast is what slots move
 * to. Copying the cast into the course row instead is the per-course duplication voice-config-service refuses (updateVoiceRole).
 * Stored is the fallback for an answer without a resolution. Anything not Cartesia is no cast: stop and report, never invent one.
 */
function castFromVoiceConfig(vc) {
  const castByRole = {};
  for (const role of ROLES) {
    const v = (vc && vc.resolved && vc.resolved.voices && vc.resolved.voices[role]) || (vc && vc.stored && vc.stored.voices && vc.stored.voices[role]) || null;
    if (!v || v.provider !== 'cartesia' || !v.voiceId) return { castByRole, missing: { role, voice: v } };
    castByRole[role] = `cartesia_${bare(v.voiceId)}`;
  }
  return { castByRole, missing: null };
}

/** A route answer that means stop for today: the refusal is the answer, never retried. */
const isStop = (r) => r.status === 402 || ['DAILY_TOTAL_CAP', 'REPEAT', 'NOT_IN_CHAIN'].includes(r.body && r.body.code);

// A DROPPED CONNECTION is not an answer (job #864): every push to main makes ssi-auto-deploy restart production-api, and the
// 2026-10-15 por_for_eng run died on five ECONNREFUSED in one second with 3,761 asks left. A drop is waited out (8 × 15 s);
// an answer — a refusal included — is never retried. Repeating a dropped ask is safe: render is library-first and link-clip
// answers changed:false for a slot that already holds the clip.
const DROPPED = new Set(['ECONNREFUSED', 'ECONNRESET', 'UND_ERR_SOCKET', 'EPIPE']);
const isDropped = (r) => r.status === 0 && DROPPED.has(r.body && r.body.error);
async function postWith(fetchFn, wait, p, body, tries = 8) {
  for (let a = 1; ; a++) {
    let r;
    try {
      const res = await fetchFn(`${URL}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
      r = { status: res.status, body: await res.json().catch(() => ({})) };
    } catch (e) { r = { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.code || e.name) } }; }
    if (!isDropped(r) || a >= tries) return r;
    console.log(`  DROPPED ${r.body.error} on ${p}; Popty restarting? waiting (${a}/${tries})`);
    await wait(15000);
  }
}
const post = (p, body) => postWith(fetch, (ms) => new Promise((res) => setTimeout(res, ms)), p, body);

async function alive(audioId) {
  try {
    const res = await fetch(`${AUDIO_BASE}/${audioId}`, { headers: { 'User-Agent': AGENT }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) return `proxy HTTP ${res.status}`;
    const n = (await res.arrayBuffer()).byteLength;
    return n > 2000 ? null : `only ${n} bytes`;
  } catch (e) { return `proxy ${e.name}`; }
}

/** The line clip-tail-audit.py prints for one clip → null when clean, else why not (a click, or an unmeasurable clip: "cannot measure" refuses). */
function tailVerdict(line) {
  let o; try { o = JSON.parse(line); } catch { return 'tail audit printed nothing'; }
  if (o.error) return `tail audit error ${o.error}`;
  return o.click ? `tail click (spike ${Number(o.tail_spike).toFixed(1)}, end_abs ${Number(o.end_abs).toFixed(3)})` : null;
}
/** AUDIT=1 (job #366): a new clip is audited for tail clicks BEFORE its pointer is swapped in; failing clips stay in the library, the old pointer stays. */
function tailAudit(audioId, revision) {
  const r = require('child_process').spawnSync('python3', [path.join(__dirname, 'clip-tail-audit.py')], { input: `x,${audioId},${revision || 1}\n`, encoding: 'utf8', timeout: 120000 });
  return tailVerdict((r.stdout || '').split('\n').find((l) => l.startsWith('{')) || '');
}

async function main() {
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
  const COURSE = arg('course'); const SEEDS = +arg('seeds', 100); const FROM = +arg('from', 1); // --from N: a second run takes seeds N.. while another owns the lower ones (job #366 beside #339)
  if (!COURSE) throw new Error('--course required');
  const RENDER = process.env.RENDER === '1', MAX = +(process.env.MAX_CHARS || 0);
  const PURPOSE = `job #863: ${COURSE} seeds 1-${SEEDS} target slots onto the course cast voices (Tom 2026-10-12)`;
  const db = require('../../services/shared/agent-db.cjs');

  // The cast is what a render will use, from Popty's own read route; the voice is named on every render so a clip can never land off-cast.
  const vc = await fetch(`${URL}/api/courses/${COURSE}/voice-config/resolved`).then((r) => r.json()).catch(() => ({}));
  const { castByRole, missing } = castFromVoiceConfig(vc);
  if (missing) { console.log(`NO CAST for ${missing.role}: ${JSON.stringify(missing.voice).slice(0, 300)}`); return; }
  console.log(`${COURSE} cast: target1 ${castByRole.target1}, target2 ${castByRole.target2}`);

  const pg = await db.connect();
  const sel = 'seed_number, target_text, target1_audio_id, target2_audio_id';
  const S = (await pg.query(`SELECT ${sel} FROM course_seeds WHERE course_code=$1 AND seed_number <= $2 AND seed_number >= $3`, [COURSE, SEEDS, FROM])).rows.map((r) => ({ ...r, slot: { seedNumber: r.seed_number } }));
  const L = (await pg.query(`SELECT lego_id, ${sel} FROM course_legos WHERE course_code=$1 AND seed_number <= $2 AND seed_number >= $3`, [COURSE, SEEDS, FROM])).rows.map((r) => ({ ...r, slot: { legoId: r.lego_id } }));
  const P = (await pg.query(`SELECT id, ${sel} FROM course_practice_phrases WHERE course_code=$1 AND seed_number <= $2 AND phrase_role <> 'component'`, [COURSE, SEEDS])).rows.map((r) => ({ ...r, slot: { phraseId: r.id } }));
  const rows = [...S, ...L, ...P];
  const clips = await db.clipMap(pg, rows.flatMap((r) => [r.target1_audio_id, r.target2_audio_id]), { cols: 'id::text AS id, text, voice_id, origin' });
  await pg.end();

  const asks = staleAsks(rows, clips, castByRole);
  const slots = asks.reduce((n, a) => n + a.slots.length, 0);
  const chars = asks.reduce((n, a) => n + a.chars, 0);
  const byRole = {}; for (const a of asks) byRole[a.role] = (byRole[a.role] || 0) + 1;
  console.log(`CENSUS ${COURSE} seeds 1-${SEEDS}: ${rows.length} rows; OUTSTANDING ${asks.length} asks (${JSON.stringify(byRole)}), ${slots} slots, <= ${chars} chars if none is in the library`);
  if (!RENDER) return;

  const ROLLBACK = process.env.ROLLBACK_FILE || evidencePath(`audio/revoice-rollback/${COURSE}-${new Date().toISOString().slice(0, 10)}.jsonl`);
  console.log(`rollback record: ${ROLLBACK}`);
  const out = { library: 0, rendered: 0, spent: 0, linked: 0, linkRefused: 0, failed: 0, auditFailed: 0, needsGrant: 0, versions: new Set() };
  let pending = [], stopped = null;
  const flush = async () => {
    const links = pending.splice(0);
    if (links.length) fs.appendFileSync(ROLLBACK, rollbackLines(COURSE, links, new Date().toISOString()));
    for (let k = 0; k < links.length; k += LINK_MAX) {
      const l = await post(`/api/production/${COURSE}/link-clip`, { links: links.slice(k, k + LINK_MAX) });
      out.linked += l.body.linked || 0;
      if (l.body.contentVersion) out.versions.add(l.body.contentVersion);
      for (const x of l.body.results || []) if (!x.ok) { out.linkRefused++; console.log('  LINK-REFUSED', JSON.stringify(x).slice(0, 250)); }
      if (l.status !== 200 && !(l.body.results || []).length) console.log('  LINK-HTTP', l.status, JSON.stringify(l.body).slice(0, 250));
    }
    console.log(`  [${new Date().toISOString()}] linked so far ${out.linked}; rendered ${out.rendered} (${out.spent} chars), library ${out.library}`);
  };
  let n = 0;
  for (const a of asks) {
    if (MAX && out.spent + a.chars > MAX) { stopped = `MAX_CHARS ${MAX} reached`; break; }
    const r = await post('/api/audio/render', { courseCode: COURSE, role: a.role, text: a.text, voiceId: castByRole[a.role], purpose: PURPOSE });
    if (isStop(r)) { stopped = `REFUSED ${r.status} ${r.body.code || ''} ${r.body.error || ''}`; break; }
    // The re-record gate (Tom 2026-10-11) refuses a render that would replace a working clip when no Tom-signed grant covers the course:
    // no library clip of the cast voice exists for these words, so there is nothing to reuse. Zero characters were spent; the ask is
    // counted and skipped (not a failure), so the reusable asks behind it still switch on.
    if (r.body && r.body.code === 'RERECORD_NOT_PERMITTED') { out.needsGrant++; continue; }
    if (r.status !== 200 || !r.body.ok) { console.log('  FAIL', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body).slice(0, 200)); if (++out.failed >= 5) { stopped = '5 failures'; break; } continue; }
    if (r.body.source === 'rendered') { out.rendered++; out.spent += r.body.charsSpent || 0; } else out.library++;
    const bad = await alive(r.body.audioId);
    if (bad) { console.log('  VERIFY-FAIL', a.role, JSON.stringify(a.text), r.body.audioId, bad, '— old pointer kept'); continue; }
    if (process.env.AUDIT === '1') {
      const why = tailAudit(r.body.audioId, r.body.revision);
      if (why) { out.auditFailed++; console.log('  AUDIT-FAIL', a.role, JSON.stringify(a.text), r.body.audioId, why, '— old pointer kept'); continue; }
    }
    for (const s of a.slots) pending.push({ ...(s.seedNumber ? { seedNumber: s.seedNumber } : s.legoId ? { legoId: s.legoId } : { phraseId: s.phraseId }), role: s.role, audioId: r.body.audioId, replace: true, expectCurrent: s.current });
    if (++n % LINK_EVERY === 0) await flush();
  }
  await flush();
  const left = asks.length - n;
  console.log(`DONE ${COURSE}: rendered ${out.rendered} (${out.spent} chars spent), library ${out.library}, slots linked ${out.linked}, link-refused ${out.linkRefused}, failed ${out.failed}, tail-audit failed ${out.auditFailed}, needing a re-record grant (skipped, 0 chars) ${out.needsGrant}; content_version now ${[...out.versions].pop() || 'unchanged'}; REMAINING ${left} asks${stopped ? `; STOPPED: ${stopped}` : ''}`);
}
module.exports = { tailVerdict, rollbackLines, staleAsks, isStop, castFromVoiceConfig, postWith };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
