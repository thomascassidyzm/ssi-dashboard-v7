// Independent post-apply verification. Reads the LIVE database only — no fixtures,
// no writes of any kind.
const fs=require('fs');const {Client}=require('pg');
const m=fs.readFileSync('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql','utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
(async()=>{const c=new Client({connectionString:m[1],ssl:{rejectUnauthorized:false}});await c.connect();
const q=async(s,p=[])=>(await c.query(s,p)).rows;
await c.query("SET statement_timeout='180s'");
let ok=0,bad=0; const say=(n,v,d)=>{v?ok++:bad++;console.log(`  ${v?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`)};

console.log('=== the three triggers, live ===');
const trg=await q(`SELECT c.relname t, pg_get_triggerdef(g.oid) def FROM pg_trigger g JOIN pg_class c ON c.oid=g.tgrelid
  WHERE g.tgname IN ('trg_null_lego_audio_on_text_change','trg_null_seed_audio_on_text_change','trg_null_phrase_audio_on_text_change') ORDER BY 1`);
for(const r of trg) console.log(' ',r.t,'->',r.def.replace(/\s+/g,' ').slice(0,150));
say('all three text-edit triggers exist', trg.length===3, `${trg.length}/3`);
say('all three carry a WHEN clause', trg.every(r=>/WHEN/.test(r.def)));

console.log('\n=== the lego function is the NEW one ===');
const fn=(await q(`SELECT pg_get_functiondef(p.oid) d FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='null_lego_audio_on_text_change'`))[0].d;
say('it is SECURITY DEFINER', /SECURITY DEFINER/.test(fn));
say('it pins search_path', /SET search_path/.test(fn));
say('it uses the same-voice matcher', /audio_id_for_text_same_voice/.test(fn));
say('it no longer uses the voice-blind matcher', !/[^_]audio_id_for_text\(/.test(fn));
say('it writes to content_audio_link_drops', /INSERT INTO content_audio_link_drops/.test(fn));
say('it never writes course_audio', !/\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+course_audio\b/i.test(fn));
// Rule 0 is THREE statements covering four columns: one for known, one for
// presentation, and one CASE covering target1 and target2. An earlier version of
// this verifier demanded four literal matches and failed on a correct function —
// the check was wrong, not the code.
say('rule 0 (writer wins) — known', /CONTINUE WHEN NEW\.known_audio_id IS DISTINCT FROM OLD\.known_audio_id/.test(fn));
say('rule 0 (writer wins) — presentation', /CONTINUE WHEN NEW\.presentation_audio_id IS DISTINCT FROM OLD\.presentation_audio_id/.test(fn));
say('rule 0 (writer wins) — target1 and target2',
  /CONTINUE WHEN CASE v_role WHEN 'target1' THEN NEW\.target1_audio_id[\s\S]{0,200}?IS DISTINCT FROM v_cur/.test(fn));
say('presentation rule-2 is skipped',
  /IF v_found AND v_role = 'presentation' THEN[\s\S]*?\n\s*v_sub := NULL;/.test(fn));
say('presentation drops carry their own reason',
  /v_reason := 'nulled-presentation-not-text-addressable'/.test(fn));

console.log('\n=== schema bits ===');
const col=await q(`SELECT column_name,data_type,is_nullable FROM information_schema.columns
  WHERE table_name='content_audio_link_drops' AND column_name IN ('row_id','old_link_raw') ORDER BY 1`);
console.table(col);
say('old_link_raw exists and is nullable', col.some(r=>r.column_name==='old_link_raw'&&r.is_nullable==='YES'));
say('row_id is text', col.some(r=>r.column_name==='row_id'&&r.data_type==='text'));

console.log('\n=== the canary left NO fixture behind ===');
for(const t of ['courses','course_seeds','course_legos','course_practice_phrases','course_audio']){
  const n=(await q(`SELECT count(*)::int n FROM ${t} WHERE course_code='zzz_lcanary_for_zzz'`))[0].n;
  say(`no fixture rows in ${t}`, n===0, `${n}`);
}
const fixDrops=(await q(`SELECT count(*)::int n FROM content_audio_link_drops WHERE course_code LIKE 'zzz_%'`))[0].n;
say('no fixture rows in content_audio_link_drops', fixDrops===0, `${fixDrops}`);

console.log('\n=== the probed production lego is pristine ===');
const lg=(await q(`SELECT known_text, version, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id
  FROM course_legos WHERE id='ba9c16c9-ae7c-4ee4-bc57-7659d3a04430'`))[0];
console.log(' ', JSON.stringify(lg));
say('known_text has no trailing space', lg && lg.known_text===lg.known_text.trim(), JSON.stringify(lg?.known_text));
say('version is still 34 (savepoint undid the probe)', lg && lg.version===34, String(lg?.version));
say('all four links still set', lg && !!lg.known_audio_id && !!lg.target1_audio_id && !!lg.target2_audio_id && !!lg.presentation_audio_id);

console.log('\n=== drops recorded, all three tables ===');
console.table(await q(`SELECT table_name, reason, count(*)::int n, min(dropped_at) first_at, max(dropped_at) last_at
  FROM content_audio_link_drops GROUP BY 1,2 ORDER BY 1,2`));
console.table(await q(`SELECT count(*)::int total, min(dropped_at) since, max(dropped_at) latest FROM content_audio_link_drops`));

console.log(`\n  ${ok}/${ok+bad} green`);
if(bad) process.exitCode=1;
await c.end();})().catch(e=>{console.error(e.message);process.exit(1)});
