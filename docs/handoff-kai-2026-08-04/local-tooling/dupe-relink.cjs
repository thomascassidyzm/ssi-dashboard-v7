#!/usr/bin/env node
/**
 * Duplicate straggler relink: a non-xAI core clip whose (role|lang|normtext)
 * already has an xAI twin is redundant. Repoint every consumer (phrase/lego FK,
 * lego_introductions) from the non-xAI dupe to the xAI twin, unflag it, and
 * (with --execute) delete the now-orphan dupe row. NO TTS. Single-course scoped.
 * Backup written always. Dry-run unless --execute.
 *
 *   node scripts/deepening/dupe-relink.cjs <course> [--execute]
 */
require('dotenv').config({ path: '/Users/kaisaraceno/Documents/GitHub/ssi-dashboard-v7/.env' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const C = process.argv[2];
const EXEC = process.argv.includes('--execute');
if (!C) { console.error('usage: dupe-relink.cjs <course> [--execute]'); process.exit(1); }
const isXai = v => /^xai/.test(v || '') || /^(eve|ara|leo|rex|sal|comp:)/.test(v || '');
const norm = s => (s || '').toLowerCase().replace(/[.,¿?¡!;:"'`«»…]/g, '').replace(/\s+/g, ' ').trim();
const CORE = ['known', 'target1', 'target2', 'presentation'];
const FK = { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id' };
const page = async (tbl, cols) => { let o = [], f = 0; for (;;) { const { data, error } = await sb.from(tbl).select(cols).eq('course_code', C).range(f, f + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break; f += 1000; } return o; };

(async () => {
  const audio = await page('course_audio', 'id, role, voice_id, s3_key, text, language');
  const live = audio.filter(a => a.s3_key && !a.s3_key.startsWith('pending/'));
  // xai twin map: role|lang|normtext -> xai id
  const twin = new Map();
  for (const a of live) if (isXai(a.voice_id)) { const k = `${a.role}|${a.language}|${norm(a.text)}`; if (!twin.has(k)) twin.set(k, a.id); }
  // pod-referenced audio is cast per-character (managed via /generate-pods) — never touch it here
  const podIds = new Set();
  { let pods = [], f = 0; for (;;) { const { data, error } = await sb.from('listening_pod_sentences').select('target_audio_id, known_audio_id').like('pod_id', `${C}:%`).range(f, f + 999); if (error) break; pods.push(...data); if (data.length < 1000) break; f += 1000; } for (const p of pods) { if (p.target_audio_id) podIds.add(p.target_audio_id); if (p.known_audio_id) podIds.add(p.known_audio_id); } }
  // dupes = non-xai core clips with a twin, excluding pod-linked
  const dupes = live.filter(a => CORE.includes(a.role) && !isXai(a.voice_id) && !podIds.has(a.id) && twin.has(`${a.role}|${a.language}|${norm(a.text)}`));
  const dupeMap = new Map(dupes.map(d => [d.id, twin.get(`${d.role}|${d.language}|${norm(d.text)}`)]));

  // load consumers
  const phrases = await page('course_practice_phrases', 'id, known_audio_id, target1_audio_id, target2_audio_id');
  const legos = await page('course_legos', 'seed_number, lego_index, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id');
  const intros = await page('lego_introductions', 'lego_id, presentation_audio_id');
  const plan = { phrase: [], lego: [], intro: [] };
  for (const p of phrases) for (const col of ['known_audio_id', 'target1_audio_id', 'target2_audio_id']) if (dupeMap.has(p[col])) plan.phrase.push({ id: p.id, col, to: dupeMap.get(p[col]) });
  for (const l of legos) { for (const col of ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id']) if (dupeMap.has(l[col])) plan.lego.push({ seed: l.seed_number, idx: l.lego_index, col, to: dupeMap.get(l[col]) }); }
  for (const it of intros) if (dupeMap.has(it.presentation_audio_id)) plan.intro.push({ lego_id: it.lego_id, to: dupeMap.get(it.presentation_audio_id) });

  const bpath = `scripts/deepening/dupe-relink-backup-${C}.json`;
  fs.writeFileSync(bpath, JSON.stringify({ course: C, dupes, plan }, null, 2));
  console.log(`${C}: ${dupes.length} dupe clips | repoints: phrase ${plan.phrase.length}, lego ${plan.lego.length}, intro ${plan.intro.length}`);
  console.log(`backup: ${bpath}`);
  if (!EXEC) { console.log('DRY RUN — no writes. --execute to apply.'); return; }

  let n = 0;
  for (const r of plan.phrase) { const { error } = await sb.from('course_practice_phrases').update({ [r.col]: r.to }).eq('id', r.id); if (!error) n++; else console.error('phrase', r.id, error.message); }
  for (const r of plan.lego) { const { error } = await sb.from('course_legos').update({ [r.col]: r.to }).eq('course_code', C).eq('seed_number', r.seed).eq('lego_index', r.idx); if (!error) n++; else console.error('lego', r.seed, error.message); }
  for (const r of plan.intro) { const { error } = await sb.from('lego_introductions').update({ presentation_audio_id: r.to, audio_uuid: r.to }).eq('course_code', C).eq('lego_id', r.lego_id); if (!error) n++; else console.error('intro', r.lego_id, error.message); }
  // unflag + delete orphan dupes
  const ids = dupes.map(d => d.id);
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    await sb.from('audio_flags').delete().eq('course_code', C).in('audio_uuid', batch);
    await sb.from('course_audio').delete().eq('course_code', C).in('id', batch);
  }
  console.log(`EXECUTED: ${n} repoints, unflagged + deleted ${ids.length} dupe rows`);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
