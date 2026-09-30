#!/usr/bin/env node
'use strict';
// READ-ONLY census: which voices the big-10 live pod-1 TARGET clips carry, per speaker gender, against Voice Lab's cast (job #950, 2026-09-30).
//
// WHY. Pod voice picks are Kai's and Deborah's (Tom, r-2026-09-23 / r-2026-09-28) and apply to NEW recordings only — a voice
// change never re-renders existing audio (r-2026-09-20). Before anyone picks, they need the truth of what is on the clips:
// provider, how many distinct voices per gender (one voice per language is the rule), a male voice on a female line, and whether
// Voice Lab's cast row for the language was ever picked by a person or was seeded by the e2e test. Renders nothing, writes nothing.
//
//   node tools/pods/pod-voice-census-big10.cjs [--json out.json]
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });

const BIG_10 = ['spa', 'fra', 'deu', 'ita', 'por', 'zho', 'jpn', 'ara', 'kor']; // eng is settled (Tom 2026-09-30: no new English)
const targetLang = (course) => String(course).split('_for_')[0].split('_')[0];
const bare = (id) => String(id || '').replace(/^(xai|cartesia|azure|elevenlabs)_/, '');
const providerOf = (id, row) => (row && row.tts_engine) || (/^(xai|cartesia|azure|elevenlabs)_/.exec(String(id || '')) || [])[1] || 'xai?';

/** Pure: summarise one pod's target clips → { byGender, genderMismatch }. rows = [{ speaker, voice_id, n }], voices = Map(bareId → {name, engine, gender}). */
function summarise(rows, speakers, voices) {
  const byGender = { f: {}, m: {} };
  let mismatch = 0;
  for (const r of rows) {
    const g = (speakers[r.speaker] || {}).gender;
    if (g !== 'f' && g !== 'm') continue;
    const v = voices.get(bare(r.voice_id));
    const label = `${v ? v.name : bare(r.voice_id).slice(0, 8)} (${providerOf(r.voice_id, v)})`;
    byGender[g][label] = (byGender[g][label] || 0) + Number(r.n);
    if (v && (v.gender === 'f' || v.gender === 'm') && v.gender !== g) mismatch += Number(r.n);
  }
  return { byGender, genderMismatch: mismatch };
}

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const voices = new Map();
  for (const v of (await pg.query(`select voice_id, tts_engine, coalesce(display_name, tts_voice_name) as name, gender from voices`)).rows) {
    if (!voices.has(bare(v.voice_id)) || v.tts_engine) voices.set(bare(v.voice_id), v);
  }
  const cast = {};
  for (const r of (await pg.query(`select r.language, r.gender, r.rank, coalesce(v.display_name, v.tts_voice_name) as name, v.tts_engine, r.assigned_by
                                     from voice_language_roles r join voices v using(voice_id) where r.slot='phrase' and r.rank=0`)).rows) {
    (cast[r.language] = cast[r.language] || {})[r.gender] = `${r.name} (${r.tts_engine})${/e2e-pod-recording-test/.test(r.assigned_by || '') ? ' [seeded by e2e test, never picked]' : ` [picked by ${r.assigned_by}]`}`;
  }
  const picks = JSON.parse((await pg.query(`select value::text v from app_config where key='pod_voice_picks'`)).rows[0]?.v || '{}');
  const pods = (await pg.query(`select id, course_code, speakers from listening_pods where slug='pod-1' and pod_type='core' and visibility='live' order by course_code`)).rows
    .filter((p) => BIG_10.includes(targetLang(p.course_code)));
  const out = [];
  for (const p of pods) {
    const rows = (await pg.query(`select s.speaker, a.voice_id, count(*) n from listening_pod_sentences s join course_audio a on a.id = s.target_audio_id where s.pod_id = $1 group by 1, 2`, [p.id])).rows;
    out.push({ course: p.course_code, ...summarise(rows, p.speakers || {}, voices) });
  }
  await pg.end();
  const result = { cast, picks: Object.keys(picks), pods: out };
  const j = process.argv.indexOf('--json');
  if (j > -1) fs.writeFileSync(process.argv[j + 1], JSON.stringify(result, null, 1));
  for (const o of out) console.log(o.course, 'F', JSON.stringify(o.byGender.f), 'M', JSON.stringify(o.byGender.m), 'genderMismatch', o.genderMismatch);
}

module.exports = { summarise, bare, targetLang };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
