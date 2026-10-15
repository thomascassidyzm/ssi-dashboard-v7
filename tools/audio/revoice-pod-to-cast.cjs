#!/usr/bin/env node
'use strict';
// Re-voice one listening pod's TARGET lines onto the course's cast voices (job #864, re-dispatch of #287/#590/#607:
// Tom 2026-10-13 01:42 "Portuguese yes - to go" — European Portuguese Pod 1 + seeds 1-100 in Mariana/Matias).
// The pod twin of revoice-seeds-to-cast.cjs, in the sanctioned shape since #388 (courses change only through Popty):
// the one render route (library-first, spend guard, one render, no retries) naming the cast voice of the line's speaker's sex,
// a live check that the learner proxy serves the new clip, then Popty's link-clip — role 'target' for the line's clip,
// 'segment' / 'takeg' for its per-sentence arrays (replace + expectCurrent; the new clip must say the old clip's words) —
// which bumps content_version. Nothing here writes the DB itself and no clip is ever deleted: make-before-break by construction.
// It replaces the #287 pod-revoice.cjs driver, which wrote the pod rows over SQL and never landed.
// Known (English) lines are out of scope. Human takes are never touched.
//   node tools/audio/revoice-pod-to-cast.cjs --pod por_for_eng:pod-1                      # census + cast, nothing rendered
//   RENDER=1 MAX_CHARS=20000 node tools/audio/revoice-pod-to-cast.cjs --pod por_for_eng:pod-1
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const { castFromVoiceConfig, isStop } = require('./revoice-seeds-to-cast.cjs');

const URL = process.env.POPTY_URL || 'http://localhost:3470';
const AUDIO_BASE = process.env.LEARNER_AUDIO_BASE || 'https://saysomethingin.app/api/audio';
const AGENT = 'revoice-pod-to-cast (job #864)';
const LINK_EVERY = 25;
const bare = (v) => String(v || '').replace(/^cartesia_/, '');
// Old Azure/xAI speaker names -> sex, for a line whose speaker has no gender in the pod's speakers map; neither = skipped, never guessed.
const FEMALE = /(carlota|dalia|elvira|paloma|raquel|brenda|eve|ara|nova|sonia|olivia|fernanda|francisca)/i;
const MALE = /(luciano|jorge|alvaro|marcos|duarte|julio|leo|rex|sal|ryan|tom|antonio)/i;
const sexOf = (v) => (FEMALE.test(v) ? 'f' : MALE.test(v) ? 'm' : null);

/**
 * One ask per (render role, cast voice, words), pod order. A pod line's target clip and its sentence/take-G arrays all move;
 * the render role follows the speaker's sex (target1 = the female cast voice, target2 = the male one) except a take-G clip,
 * which keeps pod_take_g. Returns { asks, skipped }.
 */
function podAsks(rows, clips, genderBySpeaker, castByRole) {
  const castVoices = new Set([bare(castByRole.target1), bare(castByRole.target2)]);
  const asks = new Map();
  const skipped = [];
  for (const r of rows) {
    const refs = [];
    if (r.target_audio_id) refs.push(['target', String(r.target_audio_id)]);
    for (const id of r.sentence_audio_ids || []) if (id) refs.push(['segment', String(id)]);
    for (const id of r.takeg_audio_ids || []) if (id) refs.push(['takeg', String(id)]);
    for (const [kind, cur] of refs) {
      const c = clips.get(cur);
      if (!c || c.origin !== 'tts' || castVoices.has(bare(c.voice_id))) continue;
      const g = genderBySpeaker[r.speaker] === 'f' || genderBySpeaker[r.speaker] === 'm' ? genderBySpeaker[r.speaker] : sexOf(c.voice_id);
      if (!g) { skipped.push(`${r.id} ${kind} ${cur} ${c.voice_id}`); continue; }
      const voice = g === 'm' ? castByRole.target2 : castByRole.target1;
      const role = c.role === 'pod_take_g' ? 'pod_take_g' : g === 'm' ? 'target2' : 'target1';
      const k = `${role}\u0000${voice}\u0000${c.text}`;
      if (!asks.has(k)) asks.set(k, { role, voice, text: c.text, chars: c.text.length, order: r.global_order, slots: [] });
      asks.get(k).slots.push({ podSentenceId: r.id, role: kind, current: cur });
    }
  }
  return { asks: [...asks.values()].sort((a, b) => a.order - b.order), skipped };
}

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
  const POD = arg('pod');
  if (!POD || !POD.includes(':')) throw new Error('--pod <course>:<slug> required');
  const COURSE = POD.split(':')[0];
  const RENDER = process.env.RENDER === '1', MAX = +(process.env.MAX_CHARS || 0);
  const PURPOSE = `job #864: ${POD} target lines onto the course cast voices (Tom 2026-10-13 "Portuguese yes - to go")`;
  const db = require('../../services/shared/agent-db.cjs');

  const vc = await fetch(`${URL}/api/courses/${COURSE}/voice-config/resolved`).then((r) => r.json()).catch(() => ({}));
  const { castByRole, missing } = castFromVoiceConfig(vc);
  if (missing) { console.log(`NO CAST for ${missing.role}: ${JSON.stringify(missing.voice).slice(0, 300)}`); return; }
  console.log(`${POD} cast: f ${castByRole.target1}, m ${castByRole.target2}`);

  const pg = await db.connect();
  const rows = (await pg.query('SELECT id, speaker, global_order, target_audio_id, sentence_audio_ids, takeg_audio_ids FROM listening_pod_sentences WHERE pod_id = $1 ORDER BY global_order', [POD])).rows;
  const pod = (await pg.query('SELECT speakers FROM listening_pods WHERE id = $1', [POD])).rows[0];
  const ids = rows.flatMap((r) => [r.target_audio_id, ...(r.sentence_audio_ids || []), ...(r.takeg_audio_ids || [])]).filter(Boolean);
  const clips = await db.clipMap(pg, ids, { cols: 'id::text AS id, text, voice_id, origin, role' });
  await pg.end();
  const genderBySpeaker = {};
  for (const [name, s] of Object.entries((pod && pod.speakers) || {})) genderBySpeaker[name] = s && s.gender;

  const { asks, skipped } = podAsks(rows, clips, genderBySpeaker, castByRole);
  const slots = asks.reduce((n, a) => n + a.slots.length, 0);
  console.log(`CENSUS ${POD}: ${rows.length} lines; OUTSTANDING ${asks.length} asks, ${slots} slots, <= ${asks.reduce((n, a) => n + a.chars, 0)} chars if none is in the library; SKIPPED ${skipped.length}${skipped.length ? ' ' + skipped.slice(0, 3).join('; ') : ''}`);
  if (!RENDER) return;

  const out = { library: 0, rendered: 0, spent: 0, linked: 0, linkRefused: 0, failed: 0, versions: new Set() };
  let pending = [], stopped = null, n = 0;
  const flush = async () => {
    const links = pending.splice(0);
    if (!links.length) return;
    const l = await post(`/api/production/${COURSE}/link-clip`, { links });
    out.linked += l.body.linked || 0;
    if (l.body.contentVersion) out.versions.add(l.body.contentVersion);
    for (const x of l.body.results || []) if (!x.ok) { out.linkRefused++; console.log('  LINK-REFUSED', JSON.stringify(x).slice(0, 250)); }
    if (l.status !== 200 && !(l.body.results || []).length) console.log('  LINK-HTTP', l.status, JSON.stringify(l.body).slice(0, 250));
    console.log(`  [${new Date().toISOString()}] linked so far ${out.linked}; rendered ${out.rendered} (${out.spent} chars), library ${out.library}`);
  };
  for (const a of asks) {
    if (MAX && out.spent + a.chars > MAX) { stopped = `MAX_CHARS ${MAX} reached`; break; }
    const r = await post('/api/audio/render', { courseCode: COURSE, role: a.role, text: a.text, voiceId: a.voice, purpose: PURPOSE });
    if (isStop(r)) { stopped = `REFUSED ${r.status} ${r.body.code || ''} ${r.body.error || ''}`; break; }
    if (r.status !== 200 || !r.body.ok) { console.log('  FAIL', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body).slice(0, 200)); if (++out.failed >= 5) { stopped = '5 failures'; break; } continue; }
    n++;
    if (r.body.source === 'rendered') { out.rendered++; out.spent += r.body.charsSpent || 0; } else out.library++;
    const bad = await alive(r.body.audioId);
    if (bad) { console.log('  VERIFY-FAIL', a.role, JSON.stringify(a.text), r.body.audioId, bad, '— old pointer kept'); continue; }
    for (const s of a.slots) pending.push({ podSentenceId: s.podSentenceId, role: s.role, audioId: r.body.audioId, replace: true, expectCurrent: s.current });
    if (n % LINK_EVERY === 0) await flush();
  }
  await flush();
  console.log(`DONE ${POD}: rendered ${out.rendered} (${out.spent} chars spent), library ${out.library}, slots linked ${out.linked}, link-refused ${out.linkRefused}, failed ${out.failed}; content_version now ${[...out.versions].pop() || 'unchanged'}; ANSWERED ${n} of ${asks.length} asks${stopped ? `; STOPPED: ${stopped}` : ''}`);
}
module.exports = { podAsks };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
