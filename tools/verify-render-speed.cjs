#!/usr/bin/env node
/**
 * verify-render-speed.cjs — what voice and speed is a course ACTUALLY rendered at?
 *
 * WHY THIS EXISTS. `courses.voice_config` is not reliable evidence. Two failures on
 * 2026-08-18 alone:
 *   - a worker rendered por_for_eng presentation clips at default speed for a course
 *     configured at 0.95, and had to redo them;
 *   - ita_for_eng's voice_config names xAI 'eve' at speed 1.0 for presentation, but
 *     2,504 of its 2,532 presentation clips are azure_en-GB-SoniaNeural, and the real
 *     speed is 0.95. Rendering from config would have dropped one xAI clip at the
 *     wrong speed into an otherwise-Azure course.
 *
 * THE METHOD. Don't read config and don't guess from chars/sec (text length and
 * leading/trailing silence make that far too noisy to separate 0.95 from 1.0). Instead
 * take real incumbent clips, re-render their EXACT text at each candidate speed, and
 * compare duration against the real clip. The correct speed lands within ~1%; a wrong
 * one is 4-6% out. That gap is unambiguous on a sample of three.
 *
 *   node tools/verify-render-speed.cjs <course_code> [--role presentation]
 *                                      [--voice en-GB-SoniaNeural] [--samples 3]
 *                                      [--speeds 1.0,0.95,0.9]
 *
 * COSTS A SMALL AMOUNT OF TTS (samples x speeds short clips; ~1,500 chars for the
 * default 3x3). It writes nothing — no DB, no S3.
 */
const path=require('path');const REPO=path.join(__dirname,'..');
require('dotenv').config({path:path.join(REPO,'.env')});
require('dotenv').config({path:path.join(REPO,'.env.psql')});
const fs=require('fs'),os=require('os');
const {execFile}=require('child_process');const run=require('util').promisify(execFile);
const {Client}=require('pg');
const tts=require(path.join(REPO,'services/tts-service.cjs'));

const argv=process.argv.slice(2);
const arg=(f,d=null)=>{const i=argv.indexOf(f);return i!==-1&&argv[i+1]?argv[i+1]:d};
const COURSE=argv.find(a=>!a.startsWith('--'));
const ROLE=arg('--role','presentation');
const SAMPLES=Number(arg('--samples',3));
const SPEEDS=String(arg('--speeds','1.0,0.95,0.9')).split(',').map(Number);
let VOICE=arg('--voice',null);
if(!COURSE){console.error('usage: verify-render-speed.cjs <course_code> [--role R] [--voice V] [--samples N] [--speeds a,b,c]');process.exit(2);}
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'vrs-'));

async function durMs(buf){
  const f=path.join(TMP,'c'+Math.random().toString(36).slice(2)+'.mp3');
  fs.writeFileSync(f,buf);
  const {stdout}=await run('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',f]);
  fs.unlinkSync(f);
  return Math.round(parseFloat(stdout)*1000);
}
(async()=>{
const cl=new Client({connectionString:process.env.DATABASE_URL});await cl.connect();
const census=(await cl.query(
  `select voice_id, count(*)::int n from course_audio
     where course_code=$1 and role=$2 group by 1 order by 2 desc`,[COURSE,ROLE])).rows;
if(!census.length){console.error(`no ${ROLE} clips for ${COURSE}`);process.exit(1);}
console.log(`${COURSE} — ${ROLE} voice census (what the estate ACTUALLY holds):`);
for(const r of census) console.log(`   ${String(r.voice_id).padEnd(28)} ${r.n}`);
// Only Azure takes a speed parameter — xAI's /v1/tts documents none, and its pace is
// set downstream at mastering. So calibrate against the most common AZURE voice, not
// simply the most common voice: a course can hold more xAI clips than Azure ones
// (zho_for_eng presentation is 956 xai vs 573 azure) and calibrating xAI is meaningless.
if(!VOICE){
  const azure=census.find(r=>/^azure_|Neural$/.test(String(r.voice_id)));
  if(!azure){
    console.log(`\nNo Azure ${ROLE} voice in this course — every voice here is a provider `+
                `with no speed parameter (xAI sets pace at mastering). Nothing to calibrate.`);
    process.exit(0);
  }
  VOICE=String(azure.voice_id).replace(/^azure_/,'');
  if(azure.n<census[0].n)
    console.log(`\nnote: ${census[0].voice_id} is more common (${census[0].n}) but is not Azure; `+
                `calibrating the Azure population instead.`);
}
console.log(`\ncalibrating voice: ${VOICE}  (override with --voice)`);

// Bare clips of one shape, so duration differences are the speed and nothing else.
const pool=(await cl.query(
  `select text, duration_ms from course_audio
     where course_code=$1 and role=$2 and duration_ms > 1500
       and text ~ '^The [A-Za-z]+ for: ''[^'']+'', is:$'
       and (voice_id = $3 or voice_id = 'azure_'||$3 or voice_id = 'xai_'||$3)
     order by id limit $4`,[COURSE,ROLE,VOICE,SAMPLES])).rows;
await cl.end();
if(!pool.length){console.error('no comparable bare incumbent clips to calibrate against');process.exit(1);}

const errs={};let chars=0;
for(const clip of pool){
  const row=[`  real=${String(clip.duration_ms).padStart(5)}ms  ${JSON.stringify(clip.text.slice(0,40))}`];
  for(const sp of SPEEDS){
    const res=await tts.generateWithRetry(clip.text,'azure',
      {subscriptionKey:process.env.AZURE_SPEECH_KEY,region:process.env.AZURE_SPEECH_REGION,
       voiceName:VOICE,speed:sp,courseCode:COURSE});
    chars+=clip.text.length;
    const d=await durMs(res.audioBuffer||res);
    const e=Math.abs(d-clip.duration_ms)/clip.duration_ms;
    (errs[sp]||(errs[sp]=[])).push(e);
    row.push(`${sp}=${(e*100).toFixed(1)}%`);
  }
  console.log(row.join('  '));
}
const mean=s=>errs[s].reduce((a,b)=>a+b,0)/errs[s].length;
const best=SPEEDS.slice().sort((a,b)=>mean(a)-mean(b))[0];
console.log(`\nmean abs duration error: ${SPEEDS.map(s=>`${s}:${(mean(s)*100).toFixed(1)}%`).join('  ')}`);
console.log(`RENDER ${COURSE} ${ROLE} AT: voice=${VOICE} speed=${best}`);
if(mean(best)>0.02) console.log('⚠️  best match is still >2% out — treat this as INCONCLUSIVE, not an answer.');
console.log(`(calibration cost: ${chars} chars)`);
})().catch(e=>{console.error(e);process.exit(1)});
