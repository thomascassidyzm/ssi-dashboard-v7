require('dotenv').config({path:require('path').resolve(__dirname,'../../.env.psql')});
const {Client}=require('pg');const fs=require('fs');
const course=process.argv[2]||'spa_for_eng';const out=process.argv[3];
(async()=>{
const c=new Client({connectionString:process.env.DATABASE_URL});
await c.connect();
const p=await c.query(`select id,seed_number,position,lego_index,lego_id,known_text,target_text,phrase_role,status,target1_audio_id,target2_audio_id,known_audio_id from course_practice_phrases where course_code=$1 order by seed_number,lego_index,position`,[course]);
const l=await c.query(`select lego_id,seed_number,lego_index,type,known_text,target_text,presentation_audio_id from course_legos where course_code=$1 order by seed_number,lego_index`,[course]);
const s=await c.query(`select seed_number,known_text,target_text,status from course_seeds where course_code=$1 order by seed_number`,[course]);
fs.writeFileSync(out,JSON.stringify({course,phrases:p.rows,legos:l.rows,seeds:s.rows}));
console.log('phrases',p.rows.length,'legos',l.rows.length,'seeds',s.rows.length);
await c.end();
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
