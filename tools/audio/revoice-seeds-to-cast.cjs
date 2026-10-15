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
const bare = (v) => String(v || '').replace(/^cartesia_/, '');

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

const post = async (p, body) => {
  try {
    const r = await fetch(`${URL}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
};

async function alive(audioId) {
  try {
    const res = await fetch(`${AUDIO_BASE}/${audioId}`, { headers: { 'User-Agent': AGENT }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) return `proxy HTTP ${res.status}`;
    const n = (await res.arrayBuffer()).byteLength;
    return n > 2000 ? null : `only ${n} bytes`;
  } catch (e) { return `proxy ${e.name}`; }
}

async function main() {
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
  const COURSE = arg('course'); const SEEDS = +arg('seeds', 100);
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
  const S = (await pg.query(`SELECT ${sel} FROM course_seeds WHERE course_code=$1 AND seed_number <= $2`, [COURSE, SEEDS])).rows.map((r) => ({ ...r, slot: { seedNumber: r.seed_number } }));
  const L = (await pg.query(`SELECT lego_id, ${sel} FROM course_legos WHERE course_code=$1 AND seed_number <= $2`, [COURSE, SEEDS])).rows.map((r) => ({ ...r, slot: { legoId: r.lego_id } }));
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

  const out = { library: 0, rendered: 0, spent: 0, linked: 0, linkRefused: 0, failed: 0, versions: new Set() };
  let pending = [], stopped = null;
  const flush = async () => {
    const links = pending.splice(0);
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
    if (r.status !== 200 || !r.body.ok) { console.log('  FAIL', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body).slice(0, 200)); if (++out.failed >= 5) { stopped = '5 failures'; break; } continue; }
    if (r.body.source === 'rendered') { out.rendered++; out.spent += r.body.charsSpent || 0; } else out.library++;
    const bad = await alive(r.body.audioId);
    if (bad) { console.log('  VERIFY-FAIL', a.role, JSON.stringify(a.text), r.body.audioId, bad, '— old pointer kept'); continue; }
    for (const s of a.slots) pending.push({ ...(s.seedNumber ? { seedNumber: s.seedNumber } : s.legoId ? { legoId: s.legoId } : { phraseId: s.phraseId }), role: s.role, audioId: r.body.audioId, replace: true, expectCurrent: s.current });
    if (++n % LINK_EVERY === 0) await flush();
  }
  await flush();
  const left = asks.length - n;
  console.log(`DONE ${COURSE}: rendered ${out.rendered} (${out.spent} chars spent), library ${out.library}, slots linked ${out.linked}, link-refused ${out.linkRefused}, failed ${out.failed}; content_version now ${[...out.versions].pop() || 'unchanged'}; REMAINING ${left} asks${stopped ? `; STOPPED: ${stopped}` : ''}`);
}
module.exports = { staleAsks, isStop, castFromVoiceConfig };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
