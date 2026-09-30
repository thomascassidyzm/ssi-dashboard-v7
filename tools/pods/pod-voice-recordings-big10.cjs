'use strict';
// READ-ONLY: DISTINCT RECORDINGS on the big-10 live pod-1 lines, by voice and speaker gender (job #950, Tom 2026-09-30).
// SCOPE (so no count here can leak ordinary course audio — bedd6226 etc. are also used across course audio): only ids REFERENCED
// BY a live core pod-1's rows count: target_audio_id (whole turn), sentence_audio_ids (the Drill cuts), takeg_audio_ids.
// Each id is counted once (count(distinct course_audio.id)); voice identity merges 'xai_x' and bare 'x'. Gender = the row speaker's.
// Arabic is omitted (Aran's hold) and English is settled. Renders nothing, writes nothing.
const path=require('path');require('dotenv').config({path:path.resolve('.env.psql'),quiet:true});
const {Client}=require('pg');
(async()=>{const pg=new Client({connectionString:process.env.DATABASE_URL});await pg.connect();
const r=await pg.query(`
with pods as (select id, course_code, speakers from listening_pods where slug='pod-1' and pod_type='core' and visibility='live' and split_part(split_part(course_code,'_for_',1),'_',1) in ('spa','fra','deu','ita','por','zho','jpn','kor')),
refs as (
 select p.course_code, s.speaker, p.speakers->s.speaker->>'gender' g, s.target_audio_id aid, 'whole' k from pods p join listening_pod_sentences s on s.pod_id=p.id where s.target_audio_id is not null
 union select p.course_code, s.speaker, p.speakers->s.speaker->>'gender', x, 'cut' from pods p join listening_pod_sentences s on s.pod_id=p.id, unnest(coalesce(s.sentence_audio_ids,'{}')) x
 union select p.course_code, s.speaker, p.speakers->s.speaker->>'gender', x, 'takeg' from pods p join listening_pod_sentences s on s.pod_id=p.id, unnest(coalesce(s.takeg_audio_ids,'{}')) x)
select refs.course_code, coalesce(g,'?')||' '||k g, a.voice_id, count(distinct a.id) recs from refs join course_audio a on a.id=refs.aid group by 1,2,3 order by 1,2,4 desc`);
const vn=new Map((await pg.query(`select voice_id, coalesce(display_name,tts_voice_name) n, tts_engine e from voices`)).rows.map(v=>[v.voice_id.replace(/^(xai|azure|cartesia)_/,''),v]));
const m={};for(const x of r.rows){const b=x.voice_id.replace(/^(xai|azure|cartesia)_/,'');const v=vn.get(b);const lab=(v?v.n:b.slice(0,8))+'('+(v?v.e:(/^(\w+)_/.exec(x.voice_id)||[])[1]||'?')+')';const k=x.course_code;m[k]=m[k]||{};const key=(x.g||'?')+' '+lab;m[k][key]=(m[k][key]||0)+Number(x.recs)}
for(const k in m)console.log(k,JSON.stringify(m[k]));
const c=await pg.query(`select tts_engine, coalesce(display_name,tts_voice_name) n, gender, languages, voice_id, notes from voices where tts_engine='cartesia' and is_active and languages && array['it','ita','es','spa','fr','fra','de','deu','pt','por','zh','zho','ja','jpn','ko','kor','ar','ara']`);
for(const x of c.rows)console.log('CAND',x.gender,x.n,x.languages.join(','),(x.notes||'').slice(0,60));
await pg.end()})()
