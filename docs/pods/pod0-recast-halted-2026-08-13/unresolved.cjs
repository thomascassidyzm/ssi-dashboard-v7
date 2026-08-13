const { Client } = require('pg'); require('dotenv').config({ path: '.env.psql' });
const canon=s=>String(s||'').replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+/g,' ').trim();
function resolve(m,sp,t){m=m||{};const e=m[canon(sp)]||m[sp]||m._default;if(!e)return null;
 if(e[t]&&e[t].voice_id)return e[t].voice_id; if(t==='target'&&e.voice_id)return e.voice_id; return null;}
(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();
 const pods=(await c.query("SELECT id,course_code,slug,speakers FROM listening_pods WHERE slug LIKE 'pod-0%'")).rows;
 const pm=new Map(pods.map(p=>[p.id,p]));
 const s=(await c.query("SELECT pod_id,speaker FROM listening_pod_sentences WHERE pod_id=ANY($1)",[pods.map(p=>p.id)])).rows;
 const isEng=x=>x==='eng'||x.startsWith('eng_');
 const agg=new Map();
 for(const r of s){const p=pm.get(r.pod_id);const m=p.course_code.match(/^(.+)_for_(.+)$/);if(!m)continue;
  for(const t of ['target','known']){const lang=t==='target'?m[1]:m[2];
   if(resolve(p.speakers,r.speaker,t))continue;
   const k=`${p.course_code}/${p.slug} ${t}(${lang})${isEng(lang)?' <-ENGLISH':''} speaker="${r.speaker}"`;
   agg.set(k,(agg.get(k)||0)+1);}}
 console.log('SLOTS WITH NO CAST ENTRY (before any ctx.knownVoice fallback):');
 let tot=0,eng=0;
 for(const [k,v] of [...agg].sort((a,b)=>b[1]-a[1])){console.log(String(v).padStart(5),k);tot+=v;if(k.includes('<-ENGLISH'))eng+=v;}
 console.log('total uncast slots:',tot,' of which on the ENGLISH track:',eng);
 await c.end();})();
