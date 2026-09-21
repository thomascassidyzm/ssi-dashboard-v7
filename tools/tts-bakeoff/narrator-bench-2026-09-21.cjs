#!/usr/bin/env node
/**
 * English narrator (presentation-slot) listening bench, 2026-09-21 (job #512·H, for Kai).
 *
 * Kai asked to hear Cartesia FEMALE English voices for the presentation slot — the voice
 * that says "The German for: … is:" and reads the human-written explanation lines — because
 * the retired xAI narrator clone was replaced by tom_001 by default rather than by casting,
 * and a male narrator on top of a male known-side clone pushes the whole English side male.
 *
 * Nine Cartesia female voices + tom_001 (the reference, cast today) each read the SAME three
 * live deu_for_eng presentation rows (template / seed-83 explanation / seed-92 aside).
 * Clips are standalone files: never written to course_audio, never ingested.
 *
 * Picks (chosen from the 213 English female voices in the catalogue for spread of accent,
 * age, warmth and pace; rejected: the ~150 call-centre/support voices, meditation/ASMR,
 * children's/character voices, digital-assistant voices, and the Lori/Madison/Samantha
 * duplicate families):
 *   Courtney (GB, warm measured), Charlotte (GB, young elegant narration), Julia (GB, soft
 *   composed), Siobhan (IE, approachable), Marian (US, mature calm authority), Lauren (US,
 *   expressive narration), Tamsin (NZ, e-learning), Suzanne (AU, mature conversational),
 *   Kate (US, direct instructional).
 *
 * Usage: CS_SCRATCH=<dir> node tools/tts-bakeoff/narrator-bench-2026-09-21.cjs <outdir>
 * Reads CARTESIA_API_KEY from env. Letters are a seeded shuffle, so a rebuild is identical.
 * Served copy: ~/command-surface/public/evidence/512-narrator-bench-2026-09-21/ (index.html).
 */
const fs=require('fs'); const {execFileSync}=require('child_process');
const OUT=process.argv[2]; const picks=[{"name":"Courtney","id":"16a4052e-1f11-47ac-95f5-9330bee062f9","country":"GB","locale":"en-GB","desc":"Warm, professional, measured delivery, perfect for complex information and professional guidance."},{"name":"Charlotte","id":"71a7ad14-091c-4e8e-a314-022ece01c121","country":"GB","locale":"en-GB","desc":"Elegant, young adult female for narrations"},{"name":"Julia","id":"273f9ef7-9fc2-4def-88bb-ab108c6249ca","country":"GB","locale":"en-GB","desc":"Soft, graceful tone with a composed rhythm for polished guidance and reassurance."},{"name":"Siobhan","id":"d79d2b77-9192-4e10-9407-5d43ca034803","country":"IE","locale":"en-IE","desc":"Approachable Irish female for friendly, everyday dialogue."},{"name":"Marian","id":"26403c37-80c1-4a1a-8692-540551ca2ae5","country":"US","locale":"en-US","desc":"Matured female voice with calm authority and smooth pacing, perfect for narrations and storytelling"},{"name":"Lauren","id":"a33f7a4c-100f-41cf-a1fd-5822e8fc253f","country":"US","locale":"en-US","desc":"Expressive female voice for narration, storytelling, and creative content"},{"name":"Tamsin","id":"24894159-1d4e-4b7c-80ca-4ae37dce9400","country":"NZ","locale":"en-NZ","desc":"Delivers content with a pleasant, mid-pitched delivery, making e-learning and informational narratives accessible."},{"name":"Suzanne","id":"8634bd27-0acf-4056-b014-4fea0385ed9e","country":"AU","locale":"en-AU","desc":"Matured voice with a natural, conversational tone that feels warm, relatable, and approachable"},{"name":"Kate","id":"489b647b-5662-408f-8c95-82e26ef8d29e","country":"US","locale":"en-US","desc":"Direct, no-nonsense female voice for instructions and clear explanations"},{"name":"tom_001","id":"8fef4d59-0a7e-4ad2-a261-6a3bb50734d2","country":"GB","locale":"en-GB","desc":"Tom Cassidy's own Cartesia clone — the voice cast today for deu_for_eng and fra_for_eng presentation (reference)"}];
const LINES={
 a:"The German for: 'I agree with', as in — 'I agree with that and I think it is very important to understand it well', is:",
 b:"Often in German, you will hear some kinds of words split into two pieces in sentences. Listen out for that. The German for 'to agree' is:",
 c:"As it happens, you already know quite a few words that can be split, so we will start throwing those into the mix from now on."
};
// blind letters: seeded shuffle so the assignment is reproducible
let t=512; const rnd=()=>{t+=0x6D2B79F5;let r=Math.imul(t^(t>>>15),1|t);r^=r+Math.imul(r^(r>>>7),61|r);return((r^(r>>>14))>>>0)/4294967296};
const order=picks.map((p,i)=>i); for(let i=order.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
const letters='ABCDEFGHIJKLMN'; const key=order.map((pi,li)=>({letter:letters[li],...picks[pi]}));
(async()=>{
 const manifest={generated:new Date().toISOString(),model:'sonic-3.6',speed:1.0,cartesiaVersion:'2026-08-14',output:'mp3 24kHz 128kbps then ffmpeg loudnorm I=-18 TP=-1.5 LRA=11',lines:LINES,voices:[]};
 for(const v of key){
  const rec={letter:v.letter,name:v.name,id:v.id,country:v.country,locale:v.locale,desc:v.desc,clips:{}};
  for(const [k,text] of Object.entries(LINES)){
   const raw=`${OUT}/raw/${k}_${v.letter}.mp3`, clip=`${OUT}/clips/${k}_${v.letter}.mp3`;
   if(!fs.existsSync(raw)){
    const r=await fetch('https://api.cartesia.ai/tts/bytes',{method:'POST',headers:{Authorization:'Bearer '+process.env.CARTESIA_API_KEY,'Cartesia-Version':'2026-08-14','Content-Type':'application/json'},
     body:JSON.stringify({model_id:'sonic-3.6',transcript:text,voice:{mode:'id',id:v.id},locale:v.locale,generation_config:{speed:1.0},output_format:{container:'mp3',sample_rate:24000,bit_rate:128000}})});
    if(!r.ok){console.error('FAIL',v.name,k,r.status,await r.text());rec.clips[k]={error:r.status};continue;}
    fs.writeFileSync(raw,Buffer.from(await r.arrayBuffer()));
   }
   execFileSync('ffmpeg',['-y','-loglevel','error','-i',raw,'-af','loudnorm=I=-18:TP=-1.5:LRA=11','-ar','24000','-b:a','128k',clip]);
   const dur=execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',clip]).toString().trim();
   rec.clips[k]={file:`clips/${k}_${v.letter}.mp3`,durationS:+(+dur).toFixed(2),bytes:fs.statSync(clip).size};
   console.log(v.letter,v.name,k,dur+'s');
  }
  manifest.voices.push(rec);
 }
 fs.writeFileSync(`${OUT}/manifest.json`,JSON.stringify(manifest,null,1));
 console.log('done',manifest.voices.length,'voices');
})();
