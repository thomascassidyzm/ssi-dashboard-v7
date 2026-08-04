require('dotenv').config({ path: '/Users/kaisaraceno/Documents/GitHub/ssi-dashboard-v7/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const prov = v => { if(!v) return 'null'; if(/^xai/.test(v)||/^(eve|ara|leo|rex|sal|comp:)/.test(v)) return 'xai'; if(/azure|Neural/.test(v)) return 'azure'; return 'EL/other'; };
const CORE = ['known','target1','target2','presentation'];
const norm = s => (s||'').toLowerCase().replace(/[.,¿?¡!;:"'`«»…]/g,'').replace(/\s+/g,' ').trim();
(async () => {
  for (const C of ['deu_for_eng','fra_for_eng']) {
    let rows=[],f=0; for(;;){ const {data,error}=await sb.from('course_audio').select('id, role, voice_id, s3_key, text, language').eq('course_code',C).range(f,f+999); if(error)throw error; rows.push(...data); if(data.length<1000)break; f+=1000; }
    const core = rows.filter(r=>CORE.includes(r.role) && r.s3_key && !r.s3_key.startsWith('pending/'));
    // xai twins keyed by role|lang|normtext
    const xaiKeys = new Set(core.filter(r=>prov(r.voice_id)==='xai').map(r=>`${r.role}|${r.language}|${norm(r.text)}`));
    const nonxai = core.filter(r=>prov(r.voice_id)!=='xai');
    let dupes=0, needGen=0;
    for(const r of nonxai){ if(xaiKeys.has(`${r.role}|${r.language}|${norm(r.text)}`)) dupes++; else needGen++; }
    console.log(`${C}: non-xAI ${nonxai.length} => DUPLICATE-of-existing-xAI (relink,no TTS): ${dupes} | GENUINELY need xAI gen: ${needGen}`);
  }
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
