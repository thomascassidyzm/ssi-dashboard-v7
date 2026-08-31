/**
 * The same census as census-unconsented-cast-voices.cjs, one markdown row per
 * voice instead of every call site. This is what produced the table in
 * docs/voice/consent-hard-block-2026-08-31.md. Read-only; needs .env.psql.
 */
const {Client}=require('pg');const fs=require('fs');
const url=fs.readFileSync('.env.psql','utf8').match(/DATABASE_URL=(.*)/)[1].trim();
const c=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});
(async()=>{await c.connect();
const vrows=(await c.query('select * from voices')).rows;const V=new Map(vrows.map(r=>[r.voice_id,r]));
const spell=id=>{const out=new Set([id]);const m=/^(azure|xai|elevenlabs|google|narakeet|human|cartesia)_(.+)$/.exec(id);if(m)out.add(m[2]);else for(const p of ['azure','xai','elevenlabs','google','narakeet','human','cartesia'])out.add(p+'_'+id);return [...out]};
const find=id=>{for(const s of spell(id))if(V.has(s))return V.get(s);return null};
const person=(vid,row)=>row?(row.type==='human'||/clone/i.test(row.metadata_source||'')||row.consent_status!=='not_recorded'||/^human[_-]/i.test(vid)):/^human[_-]/i.test(vid);
const H=new Map();
const add=(vid,kind,key,when)=>{if(!vid)return;const row=find(vid);if(!person(vid,row))return;if(row&&row.consent_status==='authorised')return;
 if(!H.has(vid))H.set(vid,{row,surfaces:{},courses:new Set(),last:null});const h=H.get(vid);h.surfaces[kind]=(h.surfaces[kind]||0)+1;h.courses.add(key);if(when&&(!h.last||when>h.last))h.last=when};
for(const r of (await c.query("select course_code, voice_config, updated_at from courses where voice_config is not null")).rows){
  const vc=r.voice_config||{};
  for(const [role,cfg] of Object.entries(vc.voices||{})) add(cfg&&(cfg.voiceId||cfg.voice_id),'course voice_config role',r.course_code+'/'+role,vc.updatedAt||r.updated_at);
  const pc=vc.podCast; if(pc&&typeof pc==='object'&&!Array.isArray(pc)) for(const [sp,cfg] of Object.entries(pc)) add(cfg&&cfg.voiceId,'course podCast speaker',r.course_code,vc.updatedAt||r.updated_at);
}
for(const r of (await c.query("select language,gender,rank,slot,voice_id,updated_at from voice_language_roles")).rows) add(r.voice_id,'voice_language_roles',r.language,r.updated_at);
for(const r of (await c.query("select id,course_code,speakers,updated_at from listening_pods where jsonb_typeof(speakers)='object'")).rows){
  for(const [sp,v] of Object.entries(r.speakers||{})) for(const leg of ['known','target']){const vid=v&&v[leg]&&(v[leg].voice_id||v[leg].voiceId);add(vid,'listening_pods speaker '+leg,r.course_code,r.updated_at)}}
for(const [vid,h] of [...H].sort((a,b)=>Object.values(b[1].surfaces).reduce((x,y)=>x+y,0)-Object.values(a[1].surfaces).reduce((x,y)=>x+y,0))){
 const total=Object.values(h.surfaces).reduce((x,y)=>x+y,0);
 console.log('| `'+vid+'` | '+(h.row?h.row.consent_status:'no voices row')+' | '+(h.row?(/clone/i.test(h.row.metadata_source||'')?'clone':h.row.type):'human recordist (no row)')+' | '+total+' | '+Object.entries(h.surfaces).map(([k,n])=>k+' ×'+n).join('; ')+' | '+[...h.courses].slice(0,6).join(', ')+([...h.courses].length>6?' +'+([...h.courses].length-6)+' more':'')+' | '+(h.last?String(new Date(h.last).toISOString().slice(0,10)):'unknown')+' |')}
await c.end()})().catch(e=>{console.error(e);process.exit(1)});
