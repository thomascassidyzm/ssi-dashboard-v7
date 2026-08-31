/**
 * WHICH CAST VOICES HAVE NO VALID CONSENT — read-only, writes nothing.
 *
 * Tom, 2026-08-31: "we are never going to use a voice without consent." The
 * block that enforces that from now on is services/shared/voice-consent-gate.cjs;
 * this answers the other question, the one only the database can: what is
 * ALREADY cast without one. It reads courses.voice_config (roles and podCast),
 * voice_language_roles and listening_pods.speakers, applies exactly the gate's
 * own test for "is this a person, and did they say yes", and prints every place
 * each failing voice is cast.
 *
 * Needs .env.psql in the repo root. Findings of the 2026-08-31 run:
 * docs/voice/consent-hard-block-2026-08-31.md.
 */
const {Client}=require('pg');const fs=require('fs');
const url=fs.readFileSync('.env.psql','utf8').match(/DATABASE_URL=(.*)/)[1].trim();
const c=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});
// ONE ANSWER, shared with the gate: services/shared/voice-personhood.cjs.
// The inline copy this replaced was the census half of the category error Tom
// caught on 2026-08-31 — it made any voice with a consent state written on it
// into a person, and it could not see a clone whose only provenance is its
// display name. It also prints WHICH KIND each blocked voice is, because
// 'a clone of a real person' and 'a recordist with no row' are different jobs.
const personhood=require('../../services/shared/voice-personhood.cjs');
// requiresConsent, NOT isAboutAPerson (2026-08-31, Tom's second ruling of the
// day): this census is 'what the block refuses', and a recordist's own
// recordings are about a real person AND are not gated — the recording
// session is the consent. Listing them here re-created the noise the first
// ruling cleared: 17 rows nobody is being asked about, next to the 5 real ones.
const person=(vid,row)=>personhood.requiresConsent(vid,row);
(async()=>{await c.connect();
const vrows=(await c.query('select * from voices')).rows;const V=new Map(vrows.map(r=>[r.voice_id,r]));
const spell=id=>{const out=new Set([id]);const m=/^(azure|xai|elevenlabs|google|narakeet|human|cartesia)_(.+)$/.exec(id);if(m)out.add(m[2]);else for(const p of ['azure','xai','elevenlabs','google','narakeet','human','cartesia'])out.add(p+'_'+id);return [...out]};
const find=id=>{for(const s of spell(id))if(V.has(s))return V.get(s);return null};
const hits=new Map();
const add=(vid,where)=>{if(!vid)return;const row=find(vid);if(!person(vid,row))return;if(row&&row.consent_status==='authorised')return;const k=vid;if(!hits.has(k))hits.set(k,{vid,row,where:[]});hits.get(k).where.push(where)};
for(const r of (await c.query("select course_code, voice_config, updated_at from courses where voice_config is not null")).rows){
  const vc=r.voice_config||{};
  for(const [role,cfg] of Object.entries(vc.voices||{})) add(cfg&&(cfg.voiceId||cfg.voice_id), `courses.voice_config ${r.course_code}/${role}`);
  const pc=vc.podCast; if(pc&&typeof pc==='object'&&!Array.isArray(pc)) for(const [sp,cfg] of Object.entries(pc)) add(cfg&&cfg.voiceId, `courses.voice_config.podCast ${r.course_code}/${sp}`);
}
for(const r of (await c.query("select language,gender,rank,slot,voice_id,updated_at from voice_language_roles")).rows) add(r.voice_id,`voice_language_roles ${r.slot}/${r.language}/${r.gender}/rank${r.rank}`);
for(const r of (await c.query("select id,course_code,speakers,updated_at from listening_pods where jsonb_typeof(speakers)='object'")).rows){
  for(const [sp,v] of Object.entries(r.speakers||{})){for(const leg of ['known','target']){const vid=v&&v[leg]&&(v[leg].voice_id||v[leg].voiceId);add(vid,`listening_pods ${r.course_code}/${r.id}/${sp}.${leg}`)}
    add(v&&(v.voice_id||v.voiceId),`listening_pods ${r.course_code}/${r.id}/${sp}`)}}
const out=[...hits.values()].sort((a,b)=>b.where.length-a.where.length);
console.log('VOICES CAST WITH NO VALID CONSENT:',out.length);
for(const h of out){console.log('\n### '+h.vid+'  ['+personhood.classify(h.vid,h.row)+']');console.log('  row:', h.row?`${h.row.type} | ${h.row.consent_status} | ${h.row.metadata_source||'no metadata_source'} | display=${h.row.display_name||h.row.human_name||'-'} | created=${h.row.created_at?String(h.row.created_at).slice(0,10):'?'}`:'NO voices ROW AT ALL');
console.log('  cast in '+h.where.length+' place(s):');for(const w of h.where.slice(0,40))console.log('    - '+w);if(h.where.length>40)console.log('    … and '+(h.where.length-40)+' more')}
await c.end()})().catch(e=>{console.error(e);process.exit(1)});
