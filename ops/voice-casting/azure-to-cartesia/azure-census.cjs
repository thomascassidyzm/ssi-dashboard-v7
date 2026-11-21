#!/usr/bin/env node
'use strict';
/**
 * READ-ONLY census: live course slots whose linked clip is an AZURE TTS voice, in a role whose resolved cast voice is
 * CARTESIA (cs #35, Kai 19 Nov: "Only azure to cartesia is needed - cartesia voices mismatches are super low priority").
 * Cartesia-to-other-Cartesia slots are deliberately NOT counted. Human clips are never counted. Human-voice courses
 * (services/shared/human-voice-courses.cjs) are skipped: the render route refuses them.
 *
 * Reads: the resolved cast from Popty's own route (GET /api/courses/:c/voice-config/resolved, one course at a time) and
 * the content pointers + their clips through services/shared/agent-db.cjs — run it against the nightly QA copy:
 *   set -a; . ~/ssi-restore/qa-copy.env; set +a; node ops/voice-casting/azure-to-cartesia/azure-census.cjs [--courses a,b] [--out file]
 * Writes one JSON file (default: ~/ssi-evidence/... via tools/lib/evidence-path.cjs). Never renders, never writes the DB.
 *
 * Slots: course_seeds / course_legos / course_practice_phrases (phrase_role <> 'component': the player never plays those)
 * for roles known / target1 / target2, and course_legos.presentation_audio_id for role presentation.
 * An ASK is one (role, words, cast voice) per course — what one render call would be. `xKey` = (language, words, voice)
 * is the cross-course key the route's library-first lookup would collapse (English known prompts recur in every course).
 */
const path = require('path');
const fs = require('fs');
const db = require('../../../services/shared/agent-db.cjs');
const { isHumanVoiceCourse } = require('../../../services/shared/human-voice-courses.cjs');
const { evidencePath } = require('../../../tools/lib/evidence-path.cjs');

const URL = process.env.POPTY_URL || 'http://localhost:3470';
const ROLES = ['known', 'target1', 'target2', 'presentation'];
const AZURE_NAME = /^[a-z]{2,3}-[A-Za-z]{2,4}(-[A-Za-z0-9]+)?-[A-Za-z0-9]+(Neural|Multilingual\w*)$/i;
const bare = (v) => String(v || '').replace(/^(cartesia|elevenlabs|azure|xai)_/, '');
/** A clip voice is Azure when it carries the azure_ prefix or is a bare Azure neural name. */
const isAzureVoice = (v) => /^azure_/.test(String(v || '')) || AZURE_NAME.test(String(v || ''));
const pause = () => new Promise((r) => setTimeout(r, 50));

/** Cast per role from the resolved config: { voiceId, provider, name, byGender? }. */
function castOf(vc) {
  const voices = (vc && vc.resolved && vc.resolved.voices) || {};
  const out = {};
  for (const role of ROLES) {
    const v = voices[role];
    if (!v || !v.voiceId) { out[role] = null; continue; }
    const byGender = v.byGender ? Object.fromEntries(Object.entries(v.byGender).map(([g, x]) => [g, { voiceId: x.voiceId, provider: x.provider, name: x.name }])) : null;
    out[role] = { voiceId: v.voiceId, provider: v.provider || null, name: v.name || null, language: v.language || null, ...(byGender ? { byGender } : {}) };
  }
  return out;
}
const castIsCartesia = (c) => !!c && c.provider === 'cartesia' && (!c.byGender || Object.values(c.byGender).every((x) => x.provider === 'cartesia'));

async function main() {
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
  const only = arg('courses') ? new Set(arg('courses').split(',')) : null;
  const OUT = arg('out', evidencePath(`ops/voice-casting/azure-to-cartesia/azure-census-${new Date().toISOString().slice(0, 10)}.json`));
  const pg = await db.connect({ app: 'agent:azure-census' });
  await pg.query('SET default_transaction_read_only = on');
  const courses = (await pg.query('SELECT course_code, known_lang, target_lang, new_app_status, pricing_tier, is_community FROM courses ORDER BY course_code')).rows
    .filter((c) => !only || only.has(c.course_code));
  const result = { generatedAt: new Date().toISOString(), db: process.env.QA_COPY_DB || null, courses: [] };
  for (const c of courses) {
    const code = c.course_code;
    const entry = { course: code, known_lang: c.known_lang, target_lang: c.target_lang, new_app_status: c.new_app_status, pricing_tier: c.pricing_tier, is_community: c.is_community };
    if (isHumanVoiceCourse(code)) { result.courses.push({ ...entry, skipped: 'HUMAN_VOICE_COURSE' }); continue; }
    const vc = await fetch(`${URL}/api/courses/${code}/voice-config/resolved`).then((r) => r.json()).catch((e) => ({ error: String(e) }));
    const cast = castOf(vc);
    entry.cast = cast;
    const sel = 'seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id';
    const S = (await pg.query(`SELECT ${sel} FROM course_seeds WHERE course_code = $1`, [code])).rows.map((r) => ({ ...r, slot: { seedNumber: r.seed_number } }));
    const L = (await pg.query(`SELECT lego_id, presentation_audio_id, ${sel} FROM course_legos WHERE course_code = $1`, [code])).rows.map((r) => ({ ...r, slot: { legoId: r.lego_id } }));
    const P = (await pg.query(`SELECT id, ${sel} FROM course_practice_phrases WHERE course_code = $1 AND phrase_role <> 'component'`, [code])).rows.map((r) => ({ ...r, slot: { phraseId: r.id } }));
    const rows = [...S, ...L, ...P];
    const ids = rows.flatMap((r) => [r.known_audio_id, r.target1_audio_id, r.target2_audio_id, r.presentation_audio_id]);
    const clips = await db.clipMap(pg, ids, { cols: 'id::text AS id, text, voice_id, origin, language' });
    const roleStats = {};
    const asks = new Map();
    // Words the cast voice already says in THIS course (any slot): a render ask for them is a free library link.
    const castSays = new Set();
    for (const r of rows) for (const role of ROLES) {
      const id = r[`${role === 'presentation' ? 'presentation' : role}_audio_id`];
      const cl = id && clips.get(String(id));
      const ca = cast[role];
      if (cl && ca && cl.origin === 'tts' && bare(cl.voice_id) === bare(ca.voiceId)) castSays.add(`${role}\u0000${cl.text}`);
    }
    for (const r of rows) for (const role of ROLES) {
      const id = r[`${role}_audio_id`];
      if (!id) continue;
      const cl = clips.get(String(id));
      if (!cl || cl.origin !== 'tts' || !isAzureVoice(cl.voice_id)) continue;
      const ca = cast[role];
      const inScope = castIsCartesia(ca);
      const text = role === 'presentation' ? cl.text : role === 'known' ? r.known_text : r.target_text;
      if (!text) continue;
      const st = roleStats[role] || (roleStats[role] = { cast: ca ? `${ca.provider}:${ca.name}` : null, inScope, slots: 0, asks: 0, chars: 0, freeInCourse: 0, byGender: !!(ca && ca.byGender), azureVoices: {} });
      st.slots++;
      st.azureVoices[cl.voice_id] = (st.azureVoices[cl.voice_id] || 0) + 1;
      const k = `${role}\u0000${text}`;
      if (!asks.has(k)) {
        const free = castSays.has(k);
        asks.set(k, { role, text, chars: text.length, firstSeed: r.seed_number, freeInCourse: free, inScope, slots: [] });
        st.asks++; st.chars += text.length; if (free) st.freeInCourse++;
      }
      const a = asks.get(k);
      a.firstSeed = Math.min(a.firstSeed, r.seed_number);
      a.slots.push({ ...r.slot, role, current: String(id), oldVoice: cl.voice_id });
    }
    entry.rows = rows.length;
    entry.roles = roleStats;
    entry.asks = [...asks.values()].filter((a) => a.inScope).sort((a, b) => a.firstSeed - b.firstSeed || (a.role < b.role ? -1 : 1))
      .map((a) => ({ ...a, voiceId: cast[a.role].voiceId, language: a.role === 'known' || a.role === 'presentation' ? c.known_lang : c.target_lang }));
    result.courses.push(entry);
    console.log(`${code}: ${rows.length} rows; ${Object.entries(roleStats).map(([k, v]) => `${k} ${v.inScope ? 'IN' : 'out'} ${v.asks}a/${v.slots}s/${v.chars}c`).join(', ') || 'no azure slots'}`);
    await pause();
  }
  await pg.end();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result));
  console.log(`wrote ${OUT}`);
}
module.exports = { isAzureVoice, castOf, castIsCartesia };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
